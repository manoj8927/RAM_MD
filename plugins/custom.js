'use strict';
// Owner-only branding and quality configuration, persisted by lib/store.
const store = require('../lib/store');
const FIELDS = {
  botname: { key:'botName', default:'『ＲＡＭ－ＭＤ』⚡', example:'RAM-MD PRO' },
  ownername: { key:'ownerName', default:'Sanjoy Mahato', example:'SANJOY MAHATO' },
  prefix: { key:'prefix', default:'.', example:'!' },
  style: { key:'menuStyle', default:'classic', example:'neon' },
  footer: { key:'menuFooter', default:'SANJOY X TECH', example:'Powered by RAM-MD' },
  menuimage: { key:'menuImage', default:'https://raw.githubusercontent.com/manoj8927/IMG-url/main/manu.jpg', example:'https://example.com/menu.jpg' },
  aliveimage: { key:'aliveImage', default:'', example:'https://example.com/alive.jpg' },
  alivecaption: { key:'aliveCaption', default:'RAM-MD is ready!', example:'System Online' },
  website: { key:'websiteUrl', default:'https://ram-md.blogspot.com/', example:'https://example.com' },
  support: { key:'supportUrl', default:'https://t.me/Ramboss67', example:'https://t.me/yourchannel' },
  ytquality: { key:'ytMaxHeight', default:1080, example:'720' },
  videocfr: { key:'videoCrf', default:20, example:'22' },
  language: { key:'aiReplyLanguage', default:'same', example:'bn' },
};
function info(config) {
  const p = config.prefix || '.';
  return [
    '╭━━━〔 🎨 *RAM-MD CUSTOMIZE* 〕━━━╮',
    '┃ 🤖 Name: ' + (config.botName || 'RAM-MD'),
    '┃ 👑 Owner: ' + (config.ownerName || 'Owner'),
    '┃ 🔰 Prefix: ' + p,
    '┃ 🖼️ Menu style: ' + (config.menuStyle || 'classic'),
    '┃ 🎬 YouTube max: ' + (config.ytMaxHeight || 1080) + 'p',
    '┃ 🎨 Video CRF: ' + (config.videoCrf || 20),
    '┃ 🌐 AI language: ' + (config.aiReplyLanguage || 'same'),
    '╰━━━━━━━━━━━━━━━━━━╯',
    '',
    '*🖌️ BRANDING*',
    p+'custom botname RAM-MD PRO',
    p+'custom ownername My Name',
    p+'custom footer Your footer',
    p+'custom prefix !',
    p+'custom style neon  (classic / compact / neon / minimal)',
    p+'custom preview',
    '',
    '*🖼️ IMAGES & LINKS*',
    p+'custom menuimage https://example.com/menu.jpg',
    p+'custom aliveimage https://example.com/alive.jpg',
    p+'custom alivecaption Bot is Online!',
    p+'custom website https://example.com',
    p+'custom support https://t.me/yourchannel',
    '',
    '*🎬 MEDIA & AI*',
    p+'custom ytquality 720',
    p+'custom videocfr 22',
    p+'custom language bn',
    '',
    '*🔄 RESET*',
    p+'custom reset footer',
    p+'settings menu   (picture and buttons ON/OFF)',
    '',
    'ℹ️ Send a value after the setting name. Public HTTPS links only.',
    '💾 Changes are saved in data/settings.json.',
  ].join('\n');
}
module.exports={
  name:'custom',
  command:['custom','customize'],
  menu:['custom'],
  category:'Settings',
  owner:true,
  desc:'.custom show | .custom botname <name> | .custom footer <text> | .custom style compact',
  info,
  async run({args=[],config,reply,isOwner,plugins=[]}) {
    if (!isOwner) return reply('❌ Owner-only command.');
    const p=config.prefix||'.';
    const field=String(args[0]||'show').toLowerCase();
    if (field==='show'||field==='help'||field==='list') return reply(info(config));
    if (field === 'preview') {
      const { buildMenu } = require('./menu');
      return reply('🎨 *CURRENT MENU PREVIEW*\n\n' + buildMenu(plugins, config, {isOwner:true}));
    }

    if (field==='reset') {
      const name=String(args[1]||'').toLowerCase();
      const entry=FIELDS[name];
      if (!entry) return reply('Usage: '+p+'custom reset <field>\nFields: '+Object.keys(FIELDS).join(', '));
      try {
        store.set(config,entry.key,entry.default);
        return reply('✅ Reset '+name+' to default.\n'+p+'custom show');
      } catch(error) { return reply('❌ '+error.message); }
    }

    const entry=FIELDS[field];
    if (!entry) return reply('❌ Unknown custom option. Use '+p+'custom');
    const raw=args.slice(1).join(' ').trim();
    if (!raw) {
      return reply('Usage: '+p+'custom '+field+' '+entry.example+
        '\nCurrent: '+(config[entry.key]??'(empty)')+
        '\nTo reset: '+p+'custom reset '+field);
    }
    let value=raw;
    if (['ytquality','videocfr'].includes(field)) {
      if (!/^\d+$/.test(raw)) return reply('❌ Enter a whole number.');
      value=Number(raw);
    }
    if (['style','language'].includes(field)) value=raw.toLowerCase();
    try {
      store.set(config,entry.key,value);
      const suffix=field==='prefix' ? '\n⚠️ Use the new prefix for your next command: '+value+'menu' : '';
      return reply('✅ '+field+' updated to: '+value+suffix+'\n💾 Saved across restarts.');
    } catch(error) {
      return reply('❌ '+error.message);
    }
  }
};
