const fs = require('fs');
const path = require('path');
const DATA = path.join(__dirname, '..', 'data');
const STATE_FILE = path.join(DATA, 'areact.json');
const EMOJIS = '😁,😆,😅,😂,🥹,🤣,🥲,☺️,😇,🙂,🙃,😘,😉,😙,🥸,🤓,😜,🙁,😞,☹️,😣,🥳,😫,😖,😒,😢,🤯,😤,🥵,🥶,🫢,😰,🤔,🫤,😑,🫨,🙄,🤫,🤥,😶,🫥,🫠,🫣,🤭,🤩,😍,🥱,🧐,🫡,😵‍💫,❤️,💖,🔥,👍,🙏'.split(',');
let state = { enabled: true, mode: 'all', allow: [], deny: [] };
try { state = { ...state, ...JSON.parse(fs.readFileSync(STATE_FILE, 'utf8')) }; } catch (e) {}

function save() {
  try { fs.mkdirSync(DATA, { recursive: true }); fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2)); } catch (e) {}
}
function isGroup(jid) { return /@g\.us$/.test(jid || ''); }
function normalizeJid(value) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  if (/@(?:g\.us|s\.whatsapp\.net|lid)$/.test(raw)) return raw;
  const digits = raw.replace(/\D/g, '');
  return digits ? digits + (raw.includes('-') ? '@g.us' : '@s.whatsapp.net') : '';
}
function pick() { return EMOJIS[Math.floor(Math.random() * EMOJIS.length)]; }
function status() {
  return [
    '*Auto React*',
    `Status: ${state.enabled ? 'on' : 'off'}`,
    `Scope: ${state.mode}`,
    `React only: ${state.allow.length ? state.allow.join(', ') : 'all chats'}`,
    `Ignore: ${state.deny.length ? state.deny.join(', ') : 'none'}`,
    '',
    'Commands:',
    '.areact on / off',
    '.areact only_pm',
    '.areact only_group',
    '.areact all',
    '.areact react_only <number or group JID>',
    '.areact not_react <number or group JID>',
    '.areact clear',
  ].join('\n');
}

module.exports = {
  name: 'areact',
  command: ['areact'],
  menu: ['areact'],
  category: 'Settings',
  desc: '.areact controls incoming-message reactions; .autoreact controls status reactions in Settings',
  hookPriority: -90,
  owner: true,
  async onMessage({ sock, msg, from, config }) {
    if (!state.enabled || !from || msg.key.fromMe || from === 'status@broadcast') return false;
    if (state.mode === 'only_pm' && isGroup(from)) return false;
    if (state.mode === 'only_group' && !isGroup(from)) return false;
    if (state.allow.length && !state.allow.includes(from)) return false;
    if (state.deny.includes(from)) return false;
    try {
      await sock.sendMessage(from, { react: { text: pick(), key: msg.key } });
    } catch (e) {
      if (config.debug) console.log('Auto react failed:', e.message);
    }
    return false; // allow choice/AI hooks to continue
  },
  async run({ args, reply, isOwner }) {
    if (!isOwner) return reply('Owner only command.');
    const action = String(args[0] || '').toLowerCase();
    if (!action || action === 'status') return reply(status());
    if (action === 'on') { state.enabled = true; save(); return reply('✅ Auto react is ON for incoming personal and group messages.'); }
    if (action === 'off') { state.enabled = false; save(); return reply('✅ Auto react is OFF.'); }
    if (action === 'only_pm' || action === 'only_group' || action === 'all') {
      state.mode = action; save(); return reply(`✅ Auto react scope: ${action}`);
    }
    if (action === 'clear') { state.allow = []; state.deny = []; save(); return reply('✅ Auto react allow/ignore lists cleared.'); }
    if (action === 'react_only' || action === 'not_react') {
      const jid = normalizeJid(args[1]);
      if (!jid) return reply(`Usage: .areact ${action} <number or group JID>`);
      if (action === 'react_only' && !state.allow.includes(jid)) state.allow.push(jid);
      if (action === 'not_react' && !state.deny.includes(jid)) state.deny.push(jid);
      save();
      return reply(`✅ ${action === 'react_only' ? 'React only' : 'Ignore'}: ${jid}`);
    }
    return reply(status());
  },
};
