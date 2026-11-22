// Owner-only mode control; persists in data/settings.json
const store = require('../lib/store');
const current = (config) => config.mode === 'private' ? 'private' : 'public';
module.exports = {
  name: 'bot-mode',
  command: ['private', 'public', 'mode'],
  menu: ['mode', 'private', 'public'],
  category: 'Settings',
  owner: true,
  desc: '.private = only owner can use bot; .public = everyone can use bot; .mode = show current mode',
  async run({command,args,config,reply}) {
    if (command === 'mode') {
      const next = String(args[0] || '').toLowerCase();
      if (!next) return reply('🤖 *RAM-MD MODE:* '+current(config).toUpperCase()+'\n\n.private — owner only\n.public — everyone (groups + private chats)\n.mode private / .mode public');
      if (!['private','public'].includes(next)) return reply('Usage: .mode private OR .mode public');
      store.set(config,'mode',next);
      return reply('✅ Bot mode changed to *'+next.toUpperCase()+'*.\n'+(next==='private'?'Only the owner can use bot commands and auto-replies.':'Everyone can use permitted commands in groups and DMs.'));
    }
    store.set(config,'mode',command);
    return reply('✅ Bot mode changed to *'+command.toUpperCase()+'*.\n'+(command==='private'?'Only the owner can use bot commands and auto-replies.':'Everyone can use permitted commands in groups and DMs.'));
  }
};
