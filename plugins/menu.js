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
  const div = '━━━━━━━━━━━━━━━━━━━━';
  const labels = {
    Download: '📥 DOWNLOAD CENTER',
    Games: '🎮 GAME ZONE',
    Tools: '🛠️ SMART TOOLS',
    Media: '🎬 MEDIA STUDIO',
    Group: '👥 GROUP MANAGER',
    Profile: '👤 PROFILE',
    Settings: '⚙️ SETTINGS',
    General: '✨ GENERAL',
  };
  let out =
    `╭───〔 ⚡ *${clean(bot)}* 〕───╮\n` +
    `│  ✧ *PREMIUM BOT DASHBOARD*\n` +
    `╰${div}╯\n\n` +
    `╭─❖ *BOT INFORMATION*\n` +
    `│ 👑 *Owner*   : ${clean(config.ownerName || 'Owner')}\n` +
    `│ 📦 *Commands* : ${total}\n` +
    `│ ⏳ *Uptime*   : ${runtime(process.uptime())}\n` +
    `│ 🔑 *Prefix*   : ${clean(p)}\n` +
    `│ 🌐 *Mode*     : Public\n` +
    `│ 🚀 *Version*  : ${clean(config.version || pkg.version || '1.0.0')}\n` +
    `╰${div}╯\n`;

  for (const c of cats) {
    const commands = [...new Set(groups[c])];
    out += `\n╭─❖ *${labels[c] || '📂 ' + clean(c).toUpperCase()}*\n`;
    for (const cmd of commands) {
      out += `│  ◈ ${p}*${clean(cmd).toLowerCase()}*\n`;
    }
    out += `╰${div}╯\n`;
  }
  out += `\n✦ *Powered by ${clean(bot)}*\n` +
    `♡ *Made with love by SANJOY X TECH*\n` +
    `⚡ _Fast • Smart • Reliable_`;
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
