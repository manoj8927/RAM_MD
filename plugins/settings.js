'use strict';
// Owner settings panel. First 11 toggle positions stay backward-compatible.
const store = require('../lib/store');
const { senderOf } = require('../lib/choice');
const autoreply = require('./autoreply');
const { sendQuickReplies } = require('../lib/buttons');

const ITEMS = [
  { label: '👁️ Status Seen', group: 'status', get: c => c.autoStatusView !== false, set: (c,v) => store.set(c,'autoStatusView',v) },
  { label: '❤️ Status React', group: 'status', get: c => c.autoStatusReact !== false, set: (c,v) => store.set(c,'autoStatusReact',v) },
  { label: '🤖 AI Auto Reply', group: 'ai', get: c => autoreply.isOn(c), set: (c,v) => autoreply.setEnabled(v) },
  { label: '🎚️ Ask Video Quality', group: 'media', get: c => c.askQuality !== false, set: (c,v) => store.set(c,'askQuality',v) },
  { label: '🔘 Video Quality Buttons', group: 'media', get: c => c.qualityButtons === true, set: (c,v) => store.set(c,'qualityButtons',v) },
  { label: '📩 Connection Notice', group: 'system', get: c => c.connectionMessage !== false, set: (c,v) => store.set(c,'connectionMessage',v) },
  { label: '👋 AI Introduction', group: 'ai', get: c => c.aiIntro !== false, set: (c,v) => store.set(c,'aiIntro',v) },
  { label: '🔎 AI Web Search', group: 'ai', get: c => c.aiSearch === true, set: (c,v) => store.set(c,'aiSearch',v) },
  { label: '👑 AI Reply to Owner', group: 'ai', get: c => c.aiReplyOwner === true, set: (c,v) => store.set(c,'aiReplyOwner',v) },
  { label: '🛠️ Debug Logs', group: 'system', get: c => c.debug === true, set: (c,v) => store.set(c,'debug',v) },
  { label: '📱 Menu Tap Buttons', group: 'menu', get: c => c.menuButtons === true, set: (c,v) => store.set(c,'menuButtons',v) },
  { label: '🖼️ Menu Picture', group: 'menu', get: c => c.menuImageEnabled !== false, set: (c,v) => store.set(c,'menuImageEnabled',v) },
  { label: '🖼️ Alive Picture', group: 'menu', get: c => c.aliveImageEnabled !== false, set: (c,v) => store.set(c,'aliveImageEnabled',v) },
  { label: '⏱️ Menu Uptime', group: 'menu', get: c => c.menuShowUptime !== false, set: (c,v) => store.set(c,'menuShowUptime',v) },
  { label: '🌐 Menu Website', group: 'menu', get: c => c.menuShowWebsite !== false, set: (c,v) => store.set(c,'menuShowWebsite',v) },
  { label: '💬 Menu Support', group: 'menu', get: c => c.menuShowSupport !== false, set: (c,v) => store.set(c,'menuShowSupport',v) },
  { label: '✍️ Menu Footer', group: 'menu', get: c => c.menuShowFooter !== false, set: (c,v) => store.set(c,'menuShowFooter',v) },
  { label: '🖥️ Alive System Stats', group: 'system', get: c => c.aliveShowSystemStats !== false, set: (c,v) => store.set(c,'aliveShowSystemStats',v) },
];
const GROUPS = [
  ['status','📡 STATUS AUTOMATION'],
  ['ai','🤖 AI & CHAT'],
  ['media','🎬 MEDIA DOWNLOAD'],
  ['menu','🎨 MENU & APPEARANCE'],
  ['system','🔧 BOT SYSTEM'],
];
const pending = new Map();
const ttl = 10 * 60 * 1000;
const state = on => on ? '『✅ ON』' : '『❌ OFF』';

function panel(config, section = 'all') {
  const lines = [
    '╭━━━〔 ⚙️ *RAM-MD SETTINGS* 〕━━━╮',
    '┃ 🤖 ' + (config.botName || 'RAM-MD'),
    '┃ 👑 ' + (config.ownerName || 'Owner'),
    '┃ 🔐 ' + (config.mode === 'private' ? 'PRIVATE' : 'PUBLIC'),
    '╰━━━━━━━━━━━━━━━━━━━━╯',
    ''
  ];
  let count = 0;
  for (const [group,label] of GROUPS) {
    if (section !== 'all' && section !== group) continue;
    lines.push('*' + label + '*');
    for (let i=0;i<ITEMS.length;i++) {
      const item = ITEMS[i];
      if (item.group !== group) continue;
      lines.push(String(i+1).padStart(2,'0') + '. ' + item.label + ': ' + state(item.get(config)));
      count++;
    }
    lines.push('');
  }
  if (!count) return 'Unknown settings category. Use .settings or .settings menu';
  lines.push('✏️ *Set:* ' + (config.prefix||'.') + 'settings 12 off',
    '💬 *Reply:* 12 on (within 10 minutes)',
    '📂 *Sections:* status · ai · media · menu · system',
    '🎨 *Customize:* ' + (config.prefix||'.') + 'custom',
    '💾 Changes persist when storage is writable.',
    '⚡ RAM-MD • ' + (config.menuFooter || 'SANJOY X TECH'));
  return lines.join('\n');
}
function applyItem(n, on, config) {
  const item = ITEMS[n-1];
  if (!item) throw new Error('Unknown setting number. Send .settings to see valid options.');
  item.set(config, on);
  return '✅ ' + item.label + ': ' + state(on);
}
module.exports = {
  name: 'settings',
  command: ['settings','setting','autoview','autoreact'],
  menu: ['settings','autoview','autoreact'],
  category: 'Settings',
  desc: '.settings [menu|status|ai|media|system] | .settings 12 off',
  owner: true,
  hookPriority: -50,
  panel,
  async onMessage({msg,from,text,config,isOwner,reply}) {
    const last=pending.get(from);
    if (!last) return false;
    if (last.expires < Date.now()) { pending.delete(from); return false; }
    if (!isOwner || last.asker !== senderOf(msg)) return false;
    const match=/^\s*(\d{1,2})\s+(on|off)\s*$/i.exec(text||'');
    if (!match) return false;
    try {
      await reply(applyItem(Number(match[1]),match[2].toLowerCase()==='on',config));
    } catch(e) {
      await reply('❌ ' + e.message);
    }
    pending.set(from,{asker:senderOf(msg),expires:Date.now()+ttl});
    return true;
  },
  async run({command,args=[],msg,from,config,reply,sock}) {
    const prefix=config.prefix||'.';
    if (command==='settings'||command==='setting') {
      const input=args.join(' ').trim().toLowerCase();
      const direct=/^(\d{1,2})\s+(on|off)$/.exec(input);
      if (direct) {
        try { return reply(applyItem(Number(direct[1]),direct[2]==='on',config)+'\n\n'+panel(config)); }
        catch(e) { return reply('❌ '+e.message); }
      }
      if (input && !['all','status','ai','media','menu','system','help'].includes(input)) {
        return reply('Usage: '+prefix+'settings [menu|status|ai|media|system]\n'+prefix+'settings 12 off');
      }
      pending.set(from,{asker:senderOf(msg),expires:Date.now()+ttl});
      await reply(panel(config,input==='help'?'all':input||'all'));
      if (!input && config.menuButtons === true && sock && typeof sock.relayMessage === 'function') {
        try {
          await sendQuickReplies(sock,from,msg,{
            caption:'⚙️ *RAM-MD SETTINGS*\nChoose a section or type '+prefix+'settings menu',
            footer:config.menuFooter||'RAM-MD',
            buttons:[
              {text:'🎨 MENU',id:prefix+'settings menu'},
              {text:'🤖 AI',id:prefix+'settings ai'},
              {text:'🎬 MEDIA',id:prefix+'settings media'},
            ],
          });
        } catch(error) {
          if(config.debug) console.log('Settings buttons unavailable:',error.message);
        }
      }
      return;
    }
    const item = ITEMS[command==='autoview'?0:1];
    const value=String(args[0]||'').toLowerCase();
    if (!['on','off'].includes(value)) return reply(prefix+command+' currently '+(item.get(config)?'ON':'OFF')+'. Usage: '+prefix+command+' on/off');
    try { return reply(applyItem(command==='autoview'?1:2,value==='on',config)); }
    catch(e) { return reply('❌ '+e.message); }
  },
};
