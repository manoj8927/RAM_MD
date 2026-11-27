'use strict';

const pkg = (() => { try { return require('../package.json'); } catch (_) { return {}; } })();
const { sendQuickReplies } = require('../lib/buttons');

const ORDER = ['Download', 'Games', 'Tools', 'Media', 'Group', 'Profile', 'Settings', 'General'];
const EMOJI = {
  Download: '📥', Games: '🎮', Tools: '🛠️', Media: '🎬', Group: '👥',
  Profile: '👤', Settings: '⚙️', General: '✨', AI: '🤖', Fun: '🎉'
};
const PAGE_LIMIT = 3200;
const ALIASES = {
  downloads: 'download', downloader: 'download', dl: 'download',
  game: 'games', gaming: 'games', fun: 'fun',
  tool: 'tools', utility: 'tools', utilities: 'tools',
  admin: 'settings', setting: 'settings',
  groups: 'group', media: 'media', profile: 'profile',
  ai: 'ai', general: 'general', all: 'all'
};

function clean(value) {
  return String(value ?? '').replace(/[\r\n\t*~`]/g, ' ').trim().slice(0, 120);
}
function runtime(sec) {
  let s = Math.max(0, Math.floor(Number(sec) || 0));
  const d = Math.floor(s / 86400); s %= 86400;
  const h = Math.floor(s / 3600); s %= 3600;
  const m = Math.floor(s / 60); s %= 60;
  return [d && d + 'd', h && h + 'h', m && m + 'm', s + 's'].filter(Boolean).join(' ');
}

// Convert GitHub blob URLs to their raw-image URL. Regular direct image URLs remain intact.
function rawUrl(value) {
  const raw = String(value || '').trim();
  const match = /^https?:\/\/github\.com\/([^/]+)\/([^/]+)\/blob\/([^/]+)\/(.+?)(?:\?.*)?$/.exec(raw);
  return match ? 'https://raw.githubusercontent.com/' + match.slice(1).join('/') : raw;
}

function collect(plugins, isOwner) {
  const groups = new Map();
  const globalSeen = new Set();
  for (const pl of Array.isArray(plugins) ? plugins : []) {
    if (!pl || (pl.owner && !isOwner)) continue;
    // An explicit empty menu hides an internal/choice plugin.
    const shown = pl.menu !== undefined ? pl.menu : pl.command;
    const names = Array.isArray(shown) ? shown : (typeof shown === 'string' ? [shown] : []);
    const category = clean(pl.category || 'Other') || 'Other';
    if (!groups.has(category)) groups.set(category, []);
    const entries = groups.get(category);
    for (const name of names) {
      const cmd = clean(name).toLowerCase();
      if (!/^[a-z0-9][a-z0-9_-]*$/.test(cmd) || globalSeen.has(cmd)) continue;
      globalSeen.add(cmd);
      entries.push(cmd);
    }
  }
  return [...groups.entries()]
    .filter(([, commands]) => commands.length)
    .sort(([a], [b]) => {
      const x = ORDER.indexOf(a), y = ORDER.indexOf(b);
      if (x !== y) return (x < 0 ? 99 : x) - (y < 0 ? 99 : y);
      return a.localeCompare(b);
    })
    .map(([category, commands]) => ({ category, commands }));
}

function pageParts(lines, max = PAGE_LIMIT) {
  const pages = [];
  let part = '';
  for (const line of lines) {
    if (part && part.length + line.length + 1 > max) {
      pages.push(part.trim());
      part = '';
    }
    part += (part ? '\n' : '') + line;
  }
  if (part) pages.push(part.trim());
  return pages;
}

function overview(groups, config) {
  const prefix = clean(config.prefix || '.');
  const name = clean(config.botName || 'RAM-MD');
  const count = groups.reduce((n, g) => n + g.commands.length, 0);
  const mode = config.mode === 'private' ? 'PRIVATE 🔒' : 'PUBLIC 🌍';
  const base = [
    '╭━━━〔 ⚡ *RAM-MD MENU* 〕━━━╮',
    '┃ 🤖 ' + name,
    '┃ 👑 ' + clean(config.ownerName || 'Owner'),
    '┃ 🧩 ' + count + ' visible commands',
    '┃ ⏱️ ' + runtime(process.uptime()),
    '┃ 🔐 ' + mode,
    '┃ 🏷️ v' + clean(config.version || pkg.version || '1.0.0'),
    '╰━━━━━━━━━━━━━━━━━━━━╯',
    '',
    '*📂 SELECT A CATEGORY*',
  ];
  for (const [i, g] of groups.entries()) {
    base.push((i + 1) + '. ' + (EMOJI[g.category] || '📁') + ' *' + clean(g.category) + '* (' + g.commands.length + ')');
  }
  base.push('', '📌 *' + prefix + 'menu 1* · *' + prefix + 'menu download*',
    '📚 *' + prefix + 'menu all* · 🔎 *' + prefix + 'menu search song*',
    '⚙️ *' + prefix + 'settings* (owner)', '',
    '🌐 ram-md.blogspot.com  •  SANJOY X TECH');
  return base.join('\n');
}

function findCategory(groups, query) {
  const q = String(query || '').toLowerCase().trim();
  const numbered = Number(q);
  if (/^\d+$/.test(q) && numbered >= 1 && numbered <= groups.length) return groups[numbered - 1];
  const key = ALIASES[q] || q;
  return groups.find(g => g.category.toLowerCase() === key) ||
    groups.find(g => g.category.toLowerCase().startsWith(key));
}

function commandLines(groups, config) {
  const prefix = clean(config.prefix || '.');
  const lines = [];
  for (const g of groups) {
    lines.push('╭─「 ' + (EMOJI[g.category] || '📁') + ' *' + clean(g.category).toUpperCase() + '* 」');
    for (const cmd of g.commands) lines.push('│ ◈ ' + prefix + cmd);
    lines.push('╰━━━━━━━━━━━━━━━━━━━━', '');
  }
  return lines;
}

// Exported for tests and callers that need the full command reference.
function buildMenu(plugins, config, opts = {}) {
  const groups = collect(plugins, opts.isOwner !== false);
  if (opts.category) {
    const category = findCategory(groups, opts.category);
    return category ? commandLines([category], config).join('\n').trim() : overview(groups, config);
  }
  if (opts.all) return commandLines(groups, config).join('\n').trim();
  return overview(groups, config);
}

module.exports = {
  name: 'menu',
  command: ['menu', 'help'],
  menu: ['menu', 'help'],
  category: 'General',
  desc: '.menu | .menu all | .menu download | .menu 1 | .menu search <name>',
  buildMenu, rawUrl, collect, pageParts,
  async run({ sock, msg, from, plugins, config, reply, text, args, isOwner }) {
    const groups = collect(plugins, isOwner);
    const prefix = clean(config.prefix || '.');
    const query = (Array.isArray(args) ? args.join(' ') : String(text || '')).trim().toLowerCase();
    if (query === 'all') {
      const pages = pageParts(commandLines(groups, config));
      if (!pages.length) return reply('No available commands.');
      for (let i = 0; i < pages.length; i++) {
        await reply('📚 *RAM-MD COMMANDS (' + (i + 1) + '/' + pages.length + ')*\n\n' + pages[i]);
      }
      return;
    }

    if (query.startsWith('search ')) {
      const term = query.slice(7).trim().replace(/[^a-z0-9_-]/g, '');
      if (!term) return reply('Usage: ' + prefix + 'menu search song');
      const matches = groups.flatMap(g => g.commands.filter(cmd => cmd.includes(term)).map(cmd => ({ category: g.category, cmd })));
      if (!matches.length) return reply('❌ No matching command. Try ' + prefix + 'menu for categories.');
      const rows = matches.slice(0, 50).map(e => '◈ ' + prefix + e.cmd + '  (' + e.category + ')');
      return reply('🔎 *SEARCH: ' + term + '*\n\n' + rows.join('\n') +
        (matches.length > 50 ? '\n…and ' + (matches.length - 50) + ' more.' : ''));
    }

    if (query && query !== 'home') {
      const group = findCategory(groups, query);
      if (!group) return reply('❌ Unknown menu category.\n\n' + overview(groups, config));
      const pages = pageParts(commandLines([group], config));
      for (const page of pages) await reply(page + '\n\n↩️ ' + prefix + 'menu  |  📚 ' + prefix + 'menu all');
      return;
    }

    const cover = overview(groups, config);
    const image = rawUrl(config.menuImage);
    let coverSent = false;
    if (image) {
      try {
        // WhatsApp image captions have a lower text limit than ordinary text messages.
        // Keep navigation readable and always send the complete overview separately if needed.
        const caption = cover.length <= 900 ? cover : [
          '⚡ *RAM-MD MENU*', '🤖 ' + clean(config.botName || 'RAM-MD'),
          '🔐 ' + (config.mode === 'private' ? 'PRIVATE' : 'PUBLIC'),
          '📂 Categories: ' + groups.length,
          '🧩 Commands: ' + groups.reduce((n, g) => n + g.commands.length, 0),
          '', 'Send ' + prefix + 'menu to browse, ' + prefix + 'menu all for all commands.',
        ].join('\n');
        await sock.sendMessage(from, { image: { url: image }, caption }, { quoted: msg });
        coverSent = true;
      } catch (error) {
        if (config.debug) console.log('[menu] cover unavailable:', error.message);
      }
    }

    if (!coverSent || cover.length > 900) await reply(cover);

    // Optional tap navigation; typed equivalents in the overview always work.
    if (config.menuButtons === true && typeof sock.relayMessage === 'function') {
      const choices = [
        { text: '📥 DOWNLOAD', id: prefix + 'menu download' },
        { text: '🎮 GAMES', id: prefix + 'menu games' },
        { text: isOwner ? '⚙️ SETTINGS' : '📚 ALL', id: prefix + (isOwner ? 'menu settings' : 'menu all') },
      ];
      try {
        await sendQuickReplies(sock, from, msg, {
          caption: '⚡ *RAM-MD Quick Menu*\nTap a category or type ' + prefix + 'menu <category>.',
          footer: 'SANJOY X TECH', buttons: choices,
        });
      } catch (error) {
        if (config.debug) console.log('[menu] quick buttons unavailable:', error.message);
      }
    }
  },
};
