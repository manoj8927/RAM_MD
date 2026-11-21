// Lets people answer a list with a number. Runs before every other message hook.
const choice = require('../lib/choice');

module.exports = {
  name: 'choice',
  command: ['choice'],
  menu: [],            // not shown in the menu
  category: 'General',
  desc: 'Reply-with-a-number menus',
  hookPriority: -100,  // before the AI auto reply
  async onMessage(ctx) {
    return choice.handle(ctx);
  },
  async run({ reply }) {
    await reply('Reply to a list with its number, for example 3.');
  },
};
