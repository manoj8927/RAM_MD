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
];

const pending = new Map(); // chat -> { asker, expires }

const state = (on) => (on ? '『✅ ON 』' : '『❌ OFF 』');

function panel(config) {
  const lines = ITEMS.map((it, n) => `${String(n + 1).padStart(2, '0')}. ${it.label}: ${state(it.get(config))}`);
  return (
    `⚙️ *${config.botName || 'BOT'} SETTINGS*\n\n${lines.join('\n')}\n\n` +
    `──────────────────────\n💡 *EDIT SETTINGS:*\nReply with number + value.\n` +
    `Ex: Reply *2 on* or *2 off*\n\n© Powered by ${config.botName || 'bot'}`
  );
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
    if (!last || last.expires < Date.now() || !isOwner) return false;
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
