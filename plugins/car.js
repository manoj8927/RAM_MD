const sendGame = require('../lib/sendgame');

module.exports = {
  name: 'car',
  command: ['car', 'race'],
  menu: ['car'],
  category: 'Games',
  desc: 'Car Race game',
  async run(ctx) {
    await sendGame({
      ...ctx,
      game: {
        file: 'car.html',
        fileName: 'CAR-RACE.html',
        title: 'CAR RACE',
        desc: 'Dodge traffic, hit BOOST for speed.',
      },
    });
  },
};
