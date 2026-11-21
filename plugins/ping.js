module.exports = {
  name: 'ping',
  command: ['ping'],
  category: 'General',
  desc: 'Check if bot is alive',
  async run({ reply }) {
    const start = Date.now();
    await reply(`Pong! ${Date.now() - start}ms`);
  },
};
