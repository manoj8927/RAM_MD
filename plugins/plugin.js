const fs = require('fs');
const path = require('path');
const vm = require('vm');

const DIR = __dirname;
// Built-in files shipped with RAM_MD must never be overwritten or removed via remote Gists.
// Only additional, uniquely named user plugins may be managed with .plugin remove.
const PROTECTED = new Set(["adult-download.js","ai-creative-pack.js","ai-utility-pack.js","alive.js","areact.js","autoreply.js","bot-mode.js","calc.js","car.js","challenge-games.js","choice.js","ffinfo.js","fullpp.js","fun-extra.js","fun-pack.js","games.js","group-extras.js","group.js","hack.js","hangman.js","insta.js","jid.js","menu.js","mini-game-pack.js","more-utilities.js","movie.js","offline-social-pack.js","offline-text-tools.js","ping.js","plugin.js","reload.js","safe-prank-pack.js","settings.js","snake.js","social-download.js","sticker.js","tx.js","utility-pack.js","yt.js"]);
const MAX_SIZE = 200 * 1024; // 200 KB
const MAX_FILES = 10;
const FETCH_TIMEOUT = 20000;
const ALLOWED_HOSTS = ['gist.github.com', 'gist.githubusercontent.com'];
// Remote plugin installation executes Node.js code; keep it off unless explicitly enabled.
const REMOTE_INSTALL_ENABLED = process.env.ALLOW_REMOTE_PLUGINS === '1';
// Owner can review and explicitly approve each downloaded Gist without changing hosting env.
const pending = new Map();
const TRUSTED_ADAPTERS = {
  '3703ac9d4e896bc4ddf5a1117f91fa83': 'tx.js',
};

// Download only a bounded, supported amount of code to avoid exhausting a small VPS.
async function fetchText(url, headers = {}) {
  const res = await fetch(url, {
    headers,
    signal: AbortSignal.timeout(FETCH_TIMEOUT),
    redirect: 'follow',
  });
  if (!res.ok) throw new Error('Download failed: HTTP ' + res.status);
  if (Number(res.headers.get('content-length')) > MAX_SIZE) throw new Error('Plugin is too large.');
  const reader = res.body?.getReader();
  if (!reader) throw new Error('Empty plugin download response.');
  let total = 0;
  const chunks = [];
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > MAX_SIZE) throw new Error('Plugin exceeds 200 KB limit.');
      chunks.push(Buffer.from(value));
    }
  } finally {
    try { await reader.cancel(); } catch (_) {}
  }
  return Buffer.concat(chunks).toString('utf8');
}

// Only HTTPS GitHub Gists are supported, and only JavaScript files can be installed.
async function fetchFromGist(urlStr) {
  const url = new URL(urlStr);
  if (url.protocol !== 'https:' || !ALLOWED_HOSTS.includes(url.hostname)) {
    throw new Error('Only HTTPS gist.github.com links are allowed.');
  }

  if (url.hostname === 'gist.githubusercontent.com') {
    const name = path.basename(url.pathname);
    if (!name.endsWith('.js')) throw new Error('A raw Gist URL must point to a .js file.');
    return [{ name, code: await fetchText(url.href) }];
  }

  const parts = url.pathname.split('/').filter(Boolean);
  const id = parts.length >= 2 ? parts[1] : '';
  if (!/^[a-f0-9]{16,64}$/i.test(id)) throw new Error('Invalid Gist URL.');
  const data = JSON.parse(await fetchText('https://api.github.com/gists/' + id, GH_HEADERS));
  const files = Object.values(data.files || {}).filter(f => f.filename?.endsWith('.js'));
  if (!files.length) throw new Error('No .js file found in this Gist.');
  if (files.length > MAX_FILES) throw new Error('Too many files (maximum 10).');

  const out = [];
  for (const file of files) {
    const u = new URL(file.raw_url);
    if (u.protocol !== 'https:' || u.hostname !== 'gist.githubusercontent.com') {
      throw new Error('Unexpected Gist content URL.');
    }
    out.push({ name: file.filename, code: await fetchText(u.href) });
  }
  return out;
}
const GH_HEADERS = { 'User-Agent': 'ram-md', Accept: 'application/vnd.github+json' };

module.exports = {
  name: 'plugin',
  command: ['plugin'],
  category: 'Settings',
  desc: '.plugin <gist url> | .plugin approve <code> | .plugin list | .plugin remove <file.js>',
  owner: true,
  async run({ args, config, reply, reloadPlugins }) {
    const p = config.prefix;
    const sub = (args[0] || '').toLowerCase();

    if (!sub) {
      return reply(
        `*Plugin manager*\n${p}plugin <gist url>: preview and request approval\n${p}plugin approve <code>: approve reviewed Gist\n${p}plugin list: installed files\n${p}plugin remove <file.js>: remove user plugin only\nCore plugins cannot be overwritten or removed.`
      );
    }

    if (sub === 'list') {
      const files = fs.readdirSync(DIR).filter((f) => f.endsWith('.js'));
      return reply('*Installed plugins*\n' + files.map((f) => `• ${f}${PROTECTED.has(f) ? ' (core)' : ''}`).join('\n'));
    }

    if (sub === 'remove') {
      const file = path.basename(args[1] || '');
      if (!file.endsWith('.js')) return reply(`Usage: ${p}plugin remove <file.js>`);
      if (PROTECTED.has(file)) return reply('Core plugins cannot be removed.');
      const full = path.join(DIR, file);
      if (!fs.existsSync(full)) return reply('Plugin not found.');
      if (fs.lstatSync(full).isSymbolicLink()) return reply('Symlink plugins cannot be removed.');
      fs.unlinkSync(full);
      reloadPlugins();
      return reply(`Removed ${file}`);
    }

    // Install from URL. Known cross-framework plugins use a reviewed local adapter.
    let gistId = '';
    try {
      const u = new URL(args[0]);
      if (u.hostname === 'gist.github.com' || u.hostname === 'gist.githubusercontent.com') gistId = u.pathname.split('/').filter(Boolean).pop() || '';
    } catch (e) {}
    if (TRUSTED_ADAPTERS[gistId]) {
      const adapter = TRUSTED_ADAPTERS[gistId];
      const source = path.join(DIR, adapter);
      if (!fs.existsSync(source)) return reply(`Trusted adapter is missing: ${adapter}`);
      reloadPlugins();
      return reply(`Installed compatible adapter: ${adapter}\nThe original Gist targets another bot framework; this adapter provides the same TX font-converter behavior here.`);
    }
    if (sub === 'approve') {
      const id = String(args[1] || '').trim();
      const staged = pending.get(id);
      if (!staged || Date.now() - staged.at > 10 * 60 * 1000) return reply('No pending plugin approval. Send .plugin <gist URL> again.');
      pending.delete(id);
      return installFiles(staged.files, reply, reloadPlugins, p);
    }
    let files;
    try {
      files = await fetchFromGist(args[0]);
    } catch (e) {
      return reply('Error: ' + e.message);
    }

    if (!REMOTE_INSTALL_ENABLED) {
      const id = require('crypto').randomBytes(4).toString('hex');
      pending.set(id, {files, at:Date.now()});
      for (const [key, item] of pending) if(Date.now()-item.at>10*60*1000) pending.delete(key);
      const summary = files.map(f => f.name + ' (' + Math.ceil(Buffer.byteLength(f.code)/1024) + ' KB)').join(', ');
      return reply([
        '╭━━━〔 📦 RAM-MD PLUGIN 〕━━━╮',
        '┃ ✅ *Plugin Downloaded*',
        '╰━━━━━━━━━━━━━━━━━━━━╯',
        '',
        '📄 *File:* ' + summary,
        '🔐 *Status:* Waiting for owner approval',
        '',
        '⚠️ *Security Notice*',
        'This plugin contains JavaScript that may access bot files and credentials.',
        'Please review the Gist source before approving.',
        '',
        '📝 *Approve command:*',
        p + 'plugin approve ' + id,
        '',
        '⏳ *Valid for:* 10 minutes',
        '✨ *RAM-MD Plugin Manager*'
      ].join('\n'));
    }
    return installFiles(files, reply, reloadPlugins, p);
  },
};

async function installFiles(files, reply, reloadPlugins, p) {
    const installed = [];
    for (const { name, code } of files) {
      const file = path.basename(name);
      if (!/^[\w.-]+\.js$/.test(file)) { await reply(`Skipped ${file}: invalid file name.`); continue; }
      if (PROTECTED.has(file)) { await reply(`Skipped ${file}: core plugin name.`); continue; }
      if (Buffer.byteLength(code) > MAX_SIZE) { await reply(`Skipped ${file}: file too large.`); continue; }
      try { new vm.Script('(function(exports, require, module){' + code + '\n})'); }
      catch (e) { await reply(`Skipped ${file}: syntax error - ${e.message}`); continue; }
      const full = path.join(DIR, file);
      if (fs.existsSync(full)) {
        await reply('Skipped ' + file + ': already exists. Review it and remove a non-core plugin explicitly before reinstalling.');
        continue;
      }
      fs.writeFileSync(full, code, { flag: 'wx', mode: 0o600 });
      try {
        delete require.cache[require.resolve(full)];
        const adapter = require('../lib/levanter-adapter');
        const previousModule = global.Module;
        const before = adapter.registrations.length;
        let mod;
        try {
          global.Module = adapter.register;
          mod = require(full);
        } finally {
          if (previousModule === undefined) delete global.Module;
          else global.Module = previousModule;
        }
        const compatible = adapter.registrations.splice(before);
        if ((!mod || !mod.command || typeof mod.run !== 'function') && !compatible.length)
          throw new Error('No RAM_MD command/run or supported Levanter Module registration');
        installed.push(file + (compatible.length ? ' (Levanter: ' + compatible.map(x=>x.name).join(', ') + ')' : ''));
      } catch (e) {
        fs.rmSync(full, { force: true });
        await reply(`Skipped ${file}: ${e.message}`);
      }
    }
    reloadPlugins();
    if (installed.length) await reply('Installed: ' + installed.join(', ') + `\nSend ${p}menu to see it.`);
    else await reply('No compatible plugins installed. Supported: RAM_MD command/run or basic Levanter Module({pattern}, handler).');
}
