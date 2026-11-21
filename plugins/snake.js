const sendGame = require('../lib/sendgame');

module.exports = {
  name: 'snake',
  command: ['snake'],
  category: 'Games',
  desc: 'Snake game',
  async run(ctx) {
    await sendGame({
      ...ctx,
      game: {
        file: 'snake.html',
        fileName: 'SNAKE.html',
        title: 'SNAKE',
        desc: 'Eat the apples, avoid the walls and yourself.',
      },
    });
  },
};
