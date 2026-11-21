// Settings panel: send .settings, then reply with "number on" or "number off"
const store = require('../lib/store');
const { senderOf } = require('../lib/choice');
const autoreply = require('./autoreply');

const ITEMS = [
  { label: '👁️ Status Seen', get: (c) => c.autoStatusView !== false, set: (c, v) => store.set(c, 'autoStatusView', v) },
  { label: '❤️ Status React', get: (c) => c.autoStatusReact !== false, set: (c, v) => store.set(c, 'autoStatusReact', v) },
  { label: '🤖 AI Auto Reply', get: (c) => autoreply.isOn(c), set: (c, v) => autoreply.setEnabled(v) },
  { label: '🎚️ Ask Video Quality', get: (c) => c.askQuality !== false, set: (c, v) => store.set(c, 'askQuality', v) },
  { label: '🔘 Tap Buttons', get: (c) => c.qualityButtons === true, set: (c, v) => store.set(c, 'qualityButtons', v) },
  { label: '📩 Connection Notice', get: (c) => c.connectionMessage !== false, set: (c, v) => store.set(c, 'connectionMessage', v) },
  { label: '👋 AI Introduction', get: (c) => c.aiIntro !== false, set: (c, v) => store.set(c, 'aiIntro', v) },
  { label: '🔎 AI Web Search', get: (c) => c.aiSearch === true, set: (c, v) => store.set(c, 'aiSearch', v) },
  { label: '👑 AI Reply to Owner', get: (c) => c.aiReplyOwner === true, set: (c, v) => store.set(c, 'aiReplyOwner', v) },
  { label: '🛠️ Debug Logs', get: (c) => c.debug === true, set: (c, v) => store.set(c, 'debug', v) },
];

const pending = new Map(); // chat -> { asker, expires }

const state = (on) => (on ? '『✅ ON 』' : '『❌ OFF 』');

function panel(config) {
  const lines = ITEMS.map((it, n) => `${String(n + 1).padStart(2, '0')}. ${it.label}: ${state(it.get(config))}`);
  return [
    '╭━━━〔 ⚙️ RAM-MD CONTROL 〕━━━╮',
    '┃ 🤖 *' + (config.botName || 'RAM-MD') + '*',
    '┃ 👑 Owner: ' + (config.ownerName || 'Not set'),
    '┃ 🟢 Configuration Panel',
    '╰━━━━━━━━━━━━━━━━━━━━╯',
    '',
    '📡 *STATUS AUTOMATION*',
    ...lines.slice(0, 2),
    '',
    '🤖 *AI & CHAT*',
    lines[2], lines[6], lines[7], lines[8],
    '',
    '🎬 *MEDIA DOWNLOAD*',
    lines[3], lines[4],
    '',
    '🔧 *BOT SYSTEM*',
    lines[5], lines[9],
    '',
    '━━━━━━━━━━━━━━━━━━━━',
    '✏️ *HOW TO CHANGE*',
    'Reply with: *number on* or *number off*',
    'Example: *6 off*',
    'Or use: *.settings 6 off*',
    '',
    '💾 Changes are saved across restarts.',
    '⏳ Reply session expires after 10 minutes.',
    '⚠️ AI Web Search requires supported Gemini setup.',
    '⚡ Powered by RAM-MD'
  ].join('\n');
}

module.exports = {
  name: 'settings',
  command: ['settings', 'setting', 'autoview', 'autoreact'],
  menu: ['settings', 'autoview', 'autoreact'],
  category: 'Settings',
  hookPriority: -50, // before the AI auto reply
  desc: '.settings (reply "2 off") | .autoview on/off | .autoreact on/off',
  owner: true,
  panel, // exported for testing

  // The owner answered the panel with "2 on" / "2 off"
  async onMessage({ msg, from, text, config, isOwner, reply }) {
    const last = pending.get(from);
    if (!last || last.expires < Date.now() || !isOwner || last.asker !== senderOf(msg)) return false;
    const m = /^\s*(\d{1,2})\s+(on|off)\s*$/i.exec(text || '');
    if (!m) return false;
    const item = ITEMS[Number(m[1]) - 1];
    if (!item) return false;
    const value = m[2].toLowerCase() === 'on';
    item.set(config, value);
    pending.set(from, { asker: senderOf(msg), expires: Date.now() + 10 * 60 * 1000 });
    await reply(`✅ ${item.label}: ${state(value)}`);
    return true;
  },

  async run({ command, args, msg, from, config, reply }) {
    if (command === 'settings' || command === 'setting') {
      const direct = /^(\d{1,2})\s+(on|off)$/i.exec(args.join(' ').trim());
      if (direct) {
        const item = ITEMS[Number(direct[1]) - 1];
        if (!item) return reply('❌ Invalid setting number. Use .settings to view all options.');
        const enabled = direct[2].toLowerCase() === 'on';
        item.set(config, enabled);
        return reply('✅ ' + item.label + ': ' + state(enabled) + '\n\n' + panel(config));
      }
      pending.set(from, { asker: senderOf(msg), expires: Date.now() + 10 * 60 * 1000 });
      return reply(panel(config));
    }
    const item = ITEMS[command === 'autoview' ? 0 : 1];
    const val = (args[0] || '').toLowerCase();
    if (!['on', 'off'].includes(val)) {
      return reply(`${command} is currently *${item.get(config) ? 'on' : 'off'}*.\nUse: .${command} on/off`);
    }
    item.set(config, val === 'on');
    await reply(`${command} is now *${val}*`);
  },
};
