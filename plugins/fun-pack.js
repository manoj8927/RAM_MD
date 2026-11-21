const crypto = require('crypto');
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const pick = arr => arr[crypto.randomInt(arr.length)];
const clean = s => String(s || '').trim().slice(0, 250);
const truths = [
  'What is your funniest childhood memory?',
  'What is one skill you wish you had?',
  'What is the most embarrassing song you love?',
  'What is the nicest surprise someone gave you?',
  'What is your dream travel destination?',
];
const dares = [
  'Send your best emoji-only story.',
  'Write a four-line poem about your day.',
  'Talk like a robot for your next three messages.',
  'Share your funniest clean joke.',
  'Describe yourself using only three emojis.',
];
module.exports = {
  name: 'ram-fun-pack',
  command: ['fakevirus', 'matrix', 'lovepercent', 'truth', 'dare', 'reverse', 'choose', 'randomnum'],
  menu: ['fakevirus', 'matrix', 'lovepercent', 'truth', 'dare', 'reverse', 'choose', 'randomnum'],
  category: 'Games',
  desc: 'Prank simulation and mini games: fakevirus, matrix, lovepercent, truth, dare, reverse, choose, randomnum',
  async run({ command, text, reply, config }) {
    const p = config.prefix || '.';
    const input = clean(text);
    if (command === 'fakevirus') {
      await reply('🧪 *RAM-MD FAKE VIRUS PRANK*\n⚠️ SIMULATION ONLY — no files or devices are affected.');
      for (const n of [10, 35, 65, 90, 100]) {
        await sleep(650);
        await reply('💻 Fictional scan: [' + '█'.repeat(n / 10 | 0) + '░'.repeat(10 - (n / 10 | 0)) + '] ' + n + '%');
      }
      return reply('😂 *PRANK COMPLETE!* Nothing was scanned, installed or changed.');
    }
    if (command === 'matrix') {
      const lines = Array.from({ length: 7 }, () => Array.from({ length: 24 }, () => pick(['0','1'])).join(''));
      return reply('🟢 *RAM-MD MATRIX SIMULATION*\n\n`' + lines.join('\n') + '`\n\n🎮 Decorative random digits only.');
    }
    if (command === 'lovepercent') {
      const people = input.split(/\s*[,|&]\s*/).filter(Boolean);
      if (people.length !== 2) return reply('❤️ Usage: ' + p + 'lovepercent Alex, Sam');
      const names = people.map(x => x.slice(0, 35));
      const percent = crypto.randomInt(101);
      return reply('💞 *JUST FOR FUN*\n' + names[0] + ' ❤️ ' + names[1] + '\n💗 Match: *' + percent + '%*\n🎲 Random entertainment result, not a real compatibility test.');
    }
    if (command === 'truth') return reply('🎤 *TRUTH*\n' + pick(truths));
    if (command === 'dare') return reply('🔥 *DARE*\n' + pick(dares));
    if (command === 'reverse') return reply(input ? '🔁 ' + [...input].reverse().join('') : 'Usage: ' + p + 'reverse hello');
    if (command === 'choose') {
      const opts = input.split(/\s*[,|]\s*/).filter(Boolean).slice(0, 20);
      return reply(opts.length >= 2 ? '🎯 RAM-MD chooses: *' + pick(opts) + '*' : 'Usage: ' + p + 'choose pizza, burger, noodles');
    }
    if (command === 'randomnum') {
      const parts = input.split(/\s+/).filter(Boolean);
      let lo = 1, hi = 100;
      if (parts.length) {
        if (parts.length !== 2 || !parts.every(x => /^-?\d+$/.test(x))) return reply('Usage: ' + p + 'randomnum 1 100');
        [lo, hi] = parts.map(Number);
      }
      if (!Number.isSafeInteger(lo) || !Number.isSafeInteger(hi) || lo >= hi || hi - lo > 1000000) return reply('Choose a valid increasing range of up to 1,000,000 numbers.');
      return reply('🎲 Random number: *' + crypto.randomInt(lo, hi + 1) + '*');
    }
  },
};
