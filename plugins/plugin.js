const fs = require('fs');
const path = require('path');
const vm = require('vm');

const DIR = __dirname;
const PROTECTED = ['menu.js', 'ping.js', 'settings.js', 'reload.js', 'sticker.js', 'group.js', 'plugin.js'];
const MAX_SIZE = 200 * 1024; // 200 KB
const ALLOWED_HOSTS = ['gist.github.com', 'gist.githubusercontent.com'];
// Remote plugin installation executes Node.js code; keep it off unless explicitly enabled.
const REMOTE_INSTALL_ENABLED = process.env.ALLOW_REMOTE_PLUGINS === '1';
// Owner can review and explicitly approve each downloaded Gist without changing hosting env.
const pending = new Map();
const TRUSTED_ADAPTERS = {
  '3703ac9d4e896bc4ddf5a1117f91fa83': 'tx.js',
};

// Get [{name, code}] from a gist page URL or a raw gist URL
async function fetchFromGist(urlStr) {
  const url = new URL(urlStr);
  if (!ALLOWED_HOSTS.includes(url.hostname)) {
    throw new Error('Only gist.github.com links are allowed.');
  }

  // Raw link: https://gist.githubusercontent.com/user/id/raw/.../file.js
  if (url.hostname === 'gist.githubusercontent.com') {
    const res = await fetch(url.href);
    if (!res.ok) throw new Error('Download failed: ' + res.status);
    return [{ name: path.basename(url.pathname), code: await res.text() }];
  }

  // Gist page: use the GitHub API to list files
  const id = url.pathname.split('/').filter(Boolean).pop();
  const res = await fetch('https://api.github.com/gists/' + id, {
    headers: { 'User-Agent': 'status-bot', Accept: 'application/vnd.github+json' },
  });
  if (!res.ok) throw new Error('Gist not found or rate limited: ' + res.status);
  const data = await res.json();

  const files = Object.values(data.files).filter((f) => f.filename.endsWith('.js'));
  if (!files.length) throw new Error('No .js file found in this gist.');

  const out = [];
  for (const f of files) {
    const r = await fetch(f.raw_url);
    if (!r.ok) throw new Error('Download failed: ' + f.filename);
    out.push({ name: f.filename, code: await r.text() });
  }
  return out;
}

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
        `*Plugin manager*\n${p}plugin <gist url>: install\n${p}plugin list: installed files\n${p}plugin remove <file.js>: delete`
      );
    }

    if (sub === 'list') {
      const files = fs.readdirSync(DIR).filter((f) => f.endsWith('.js'));
      return reply('*Installed plugins*\n' + files.map((f) => `• ${f}${PROTECTED.includes(f) ? ' (core)' : ''}`).join('\n'));
    }

    if (sub === 'remove') {
      const file = path.basename(args[1] || '');
      if (!file.endsWith('.js')) return reply(`Usage: ${p}plugin remove <file.js>`);
      if (PROTECTED.includes(file)) return reply('Core plugins cannot be removed.');
      const full = path.join(DIR, file);
      if (!fs.existsSync(full)) return reply('Plugin not found.');
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
      return reply('📦 Plugin downloaded: ' + summary +
        '\n⚠️ Remote JavaScript runs with bot permissions and may access credentials. Review the Gist before approving.' +
        '\nTo install, send: ' + p + 'plugin approve ' + id +
        '\nApproval expires in 10 minutes. No hosting setting needed.');
    }
    return installFiles(files, reply, reloadPlugins, p);
  },
};

async function installFiles(files, reply, reloadPlugins, p) {
    const installed = [];
    for (const { name, code } of files) {
      const file = path.basename(name);
      if (!/^[\\w.-]+\\.js$/.test(file)) { await reply(`Skipped ${file}: invalid file name.`); continue; }
      if (PROTECTED.includes(file)) { await reply(`Skipped ${file}: core plugin name.`); continue; }
      if (Buffer.byteLength(code) > MAX_SIZE) { await reply(`Skipped ${file}: file too large.`); continue; }
      try { new vm.Script('(function(exports, require, module){' + code + '\n})'); }
      catch (e) { await reply(`Skipped ${file}: syntax error - ${e.message}`); continue; }
      const full = path.join(DIR, file);
      const backup = fs.existsSync(full) ? fs.readFileSync(full) : null;
      fs.writeFileSync(full, code);
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
        if (backup) fs.writeFileSync(full, backup); else fs.unlinkSync(full);
        await reply(`Skipped ${file}: ${e.message}`);
      }
    }
    reloadPlugins();
    if (installed.length) await reply('Installed: ' + installed.join(', ') + `\nSend ${p}menu to see it.`);
    else await reply('No compatible plugins installed. Supported: RAM_MD command/run or basic Levanter Module({pattern}, handler).');
}
