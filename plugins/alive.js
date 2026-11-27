const os = require('os');
const pkg = (() => { try { return require('../package.json'); } catch (e) { return {}; } })();

function rawUrl(u) {
  const m = /^https?:\/\/github\.com\/([^/]+)\/([^/]+)\/blob\/([^/]+)\/(.+)$/.exec(u || '');
  return m ? `https://raw.githubusercontent.com/${m[1]}/${m[2]}/${m[3]}/${m[4]}` : u;
}

function formatUptime(seconds) {
  let s = Math.max(0, Math.floor(Number(seconds) || 0));
  const d = Math.floor(s / 86400); s %= 86400;
  const h = Math.floor(s / 3600); s %= 3600;
  const m = Math.floor(s / 60); s %= 60;
  return [d ? `${d}d` : '', h ? `${h}h` : '', m ? `${m}m` : '', `${s}s`].filter(Boolean).join(' ');
}

function indiaTime() {
  return new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'medium',
  }).format(new Date());
}

function details(config) {
  const mem = process.memoryUsage();
  const lines = [
    `*${config.botName || 'RAM-MD'}*`,
    '',
    '✅ *Status:* Online / Running',
    `⏱️ *Uptime:* ${formatUptime(process.uptime())}`,
    `🕒 *India Time:* ${indiaTime()}`,
    `📦 *Version:* ${config.version || pkg.version || 'unknown'}`,
  ];
  if (config.aliveShowSystemStats !== false) {
    lines.push(
      `🟢 *Node.js:* ${process.version}`,
      `💾 *Memory:* ${(mem.rss / 1024 / 1024).toFixed(1)} MB RSS`,
      `🖥️ *Platform:* ${process.platform} ${process.arch}`,
      `⚙️ *CPU:* ${os.cpus().length} cores`
    );
  }
  lines.push(
    `🌐 *Website:* ${config.websiteUrl || 'https://ram-md.blogspot.com/'}`,
    `💬 *Support:* ${config.supportUrl || 'https://t.me/Ramboss67'}`
  );
  return lines.join('\\n');
}

module.exports = {
  name: 'alive',
  command: ['alive', 'runtime'],
  menu: ['alive', 'runtime'],
  category: 'General',
  desc: '.alive status image | .runtime bot uptime and runtime details',
  formatUptime,
  indiaTime,
  async run({ sock, msg, from, command, config, reply }) {
    const text = details(config);
    if (command === 'runtime') return reply(text);
    const image = config.aliveImageEnabled === false ? '' : rawUrl(config.aliveImage || config.menuImage || '');
    const caption = String(config.aliveCaption || 'BOT IS ALIVE').replace(/[\r\n]/g, ' ').slice(0, 180);
    if (image) {
      try {
        await sock.sendMessage(from, {
          image: { url: image },
          caption: `✅ *${caption}*\n\n${text}`,
        }, { quoted: msg });
        return;
      } catch (e) {
        if (config.debug) console.log('Alive image failed:', e.message);
      }
    }
    return reply(`✅ *${caption}*\n\n${text}`);
  },
};
