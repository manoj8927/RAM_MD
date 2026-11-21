const pkg = (() => { try { return require('../package.json'); } catch (e) { return {}; } })();

const ORDER = ['Download', 'Games', 'Tools', 'Media', 'Group', 'Profile', 'Settings', 'General'];

function runtime(sec) {
  const d = Math.floor(sec / 86400), h = Math.floor((sec % 86400) / 3600);
  const m = Math.floor((sec % 3600) / 60), s = Math.floor(sec % 60);
  return [d && d + 'd', h && h + 'h', m && m + 'm', s + 's'].filter(Boolean).join(' ');
}

// A GitHub "blob" page link is not the image itself, so turn it into the raw file link
function rawUrl(u) {
  const m = /^https?:\/\/github\.com\/([^/]+)\/([^/]+)\/blob\/([^/]+)\/(.+)$/.exec(u || '');
  return m ? `https://raw.githubusercontent.com/${m[1]}/${m[2]}/${m[3]}/${m[4]}` : u;
}

function buildMenu(plugins, config) {
  const p = config.prefix;
  const groups = {};
  let total = 0;
  for (const pl of plugins) {
    const cmds = [].concat(pl.menu || pl.command || []);
    if (!cmds.length) continue;
    (groups[pl.category || 'Other'] = groups[pl.category || 'Other'] || []).push(...cmds);
    total += cmds.length;
  }
  const cats = Object.keys(groups).sort((a, b) => {
    const ia = ORDER.indexOf(a), ib = ORDER.indexOf(b);
    return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib);
  });

  const bot = config.botName || 'RAM-MD';
  const clean = (value) => String(value ?? '').replace(/[\r\n*]/g, ' ').trim();
  const prefix = clean(p || '.');
  const categories = {
    Download: ['📥', 'DOWNLOAD HUB'],
    Games: ['🎮', 'GAME ZONE'],
    Tools: ['🛠️', 'UTILITY TOOLS'],
    Media: ['🎬', 'MEDIA STUDIO'],
    Group: ['👥', 'GROUP CONTROL'],
    Profile: ['👤', 'PROFILE CENTER'],
    Settings: ['⚙️', 'BOT SETTINGS'],
    General: ['✨', 'GENERAL COMMANDS'],
  };
  const uniqueTotal = cats.reduce((n, cat) => n + new Set(groups[cat]).size, 0);
  const line = '━━━━━━━━━━━━━━━━━━';
  let out = [
    '╭' + line + '╮',
    '      ⚡ *『 ' + clean(bot) + ' 』* ⚡',
    '        ᴘʀᴇᴍɪᴜᴍ ᴇᴅɪᴛɪᴏɴ',
    '╰' + line + '╯',
    '',
    '╭─「 *SYSTEM OVERVIEW* 」',
    '│ 👑  *Owner*     : ' + clean(config.ownerName || 'Owner'),
    '│ 🧩  *Commands* : ' + uniqueTotal,
    '│ ⏱️  *Uptime*    : ' + (runtime(process.uptime()) || '0s'),
    '│ ⌨️  *Prefix*     : ' + prefix,
    '│ 🌐  *Mode*      : Public',
    '│ 🏷️  *Version*   : ' + clean(config.version || pkg.version || '1.0.0'),
    '╰' + line,
  ].join('\n');

  for (const cat of cats) {
    const [emoji, title] = categories[cat] || ['📁', clean(cat).toUpperCase()];
    const commands = [...new Set(groups[cat])].filter(Boolean);
    if (!commands.length) continue;
    out += '\n\n' + '╭─「 ' + emoji + ' *' + title + '* 」\n';
    out += '│  ' + commands.map(cmd => '◈ ' + prefix + clean(cmd).toLowerCase()).join('\n│  ') + '\n';
    out += '╰' + line;
  }

  out += '\n\n' +
    '✧ _Choose a command from the menu_\n' +
    '✧ _Example: ' + prefix + 'ping_\n\n' +
    '『 ⚡ *' + clean(bot) + '* ⚡ 』\n' +
    '♡ *SANJOY X TECH*\n' +
    '_Fast • Smart • Reliable_';
  return out.trim();
}

module.exports = {
  name: 'menu',
  command: ['menu', 'help'],
  menu: ['menu'],
  category: 'General',
  desc: 'Show all commands',
  buildMenu, rawUrl, // exported for testing
  async run({ sock, msg, from, plugins, config, reply }) {
    const caption = buildMenu(plugins, config);

    // Shows "Forwarded many times" and the channel name, like a post forwarded from a channel
    const contextInfo = { isForwarded: true, forwardingScore: 999 };
    const channel = config.newsletterJid;
    if (channel) {
      contextInfo.forwardedNewsletterMessageInfo = {
        newsletterJid: channel,
        newsletterName: config.newsletterName || config.botName || 'Channel',
        serverMessageId: 143,
      };
    }

    const image = rawUrl(config.menuImage);
    if (image) {
      try {
        return await sock.sendMessage(from, { image: { url: image }, caption, contextInfo }, { quoted: msg });
      } catch (e) {
        console.log('Menu image failed, sending text only:', e.message);
      }
    }
    await sock.sendMessage(from, { text: caption, contextInfo }, { quoted: msg });
  },
};
