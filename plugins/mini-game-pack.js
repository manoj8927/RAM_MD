// RAM-MD mini games: no API or extra dependencies.
const crypto = require('crypto');
const pick = arr => arr[crypto.randomInt(arr.length)];
const sessions = new Map();
const TTL = 10 * 60 * 1000;
const words = ['banana', 'planet', 'tiger', 'rocket', 'orange', 'castle', 'monkey', 'puzzle', 'dragon', 'garden'];
const riddles = [
  ['What has keys but cannot open locks?', 'piano'],
  ['What gets wetter as it dries?', 'towel'],
  ['What has hands but cannot clap?', 'clock'],
  ['What has a neck but no head?', 'bottle'],
  ['What has many teeth but cannot bite?', 'comb'],
];
const trivia = [
  { q: 'Which planet is known as the Red Planet?', a: ['Earth','Mars','Venus','Jupiter'], right: 2 },
  { q: 'What is 9 × 7?', a: ['54','63','72','81'], right: 2 },
  { q: 'Which ocean is the largest?', a: ['Atlantic','Pacific','Indian','Arctic'], right: 2 },
  { q: 'What is the capital of Japan?', a: ['Seoul','Tokyo','Osaka','Kyoto'], right: 2 },
  { q: 'How many sides does a hexagon have?', a: ['5','6','7','8'], right: 2 },
];
const clean = x => String(x || '').trim().toLowerCase();
function current(from, type) {
  const item = sessions.get(from);
  if (!item) return null;
  if (Date.now() - item.at > TTL) { sessions.delete(from); return null; }
  return item.type === type ? item : null;
}
function put(from, item) {
  if (sessions.size > 500) for (const [k,v] of sessions) if (Date.now()-v.at > TTL) sessions.delete(k);
  sessions.set(from, { ...item, at: Date.now() });
}
module.exports = {
  name: 'mini-game-pack',
  command: ['coinflip', 'roll', 'eightball', 'scramble', 'unscramble', 'riddle', 'riddleanswer', 'trivia', 'triviaanswer', 'mathgame', 'mathanswer', 'gamestop'],
  menu: ['coinflip', 'roll', 'eightball', 'scramble', 'unscramble', 'riddle', 'riddleanswer', 'trivia', 'triviaanswer', 'mathgame', 'mathanswer', 'gamestop'],
  category: 'Games',
  desc: 'Mini games: trivia, riddles, word scramble, math, magic 8-ball and dice',
  async run({ command, text, from, reply, config }) {
    const p = config.prefix || '.';
    const input = clean(text);
    if (command === 'coinflip') return reply('🪙 Coin flip: *' + pick(['Heads','Tails']) + '*');
    if (command === 'roll') {
      const sides = input ? Number(input) : 6;
      if (!Number.isInteger(sides) || sides < 2 || sides > 1000) return reply('🎲 Usage: ' + p + 'roll 20 (2–1000 sides)');
      return reply('🎲 D' + sides + ': *' + crypto.randomInt(1, sides + 1) + '*');
    }
    if (command === 'eightball') return reply(input ? '🎱 Magic 8-ball: *' + pick(['Yes','No','Maybe','Very likely','Ask again later','Not today','Absolutely','Unclear']) + '*\n🎮 Just for fun.' : '🎱 Usage: ' + p + 'eightball Will I win?');
    if (command === 'gamestop') { sessions.delete(from); return reply('🛑 Current mini-game cleared.'); }
    if (command === 'scramble') {
      const answer = pick(words);
      let shuffled = answer;
      for (let n=0; n<8 && shuffled===answer; n++) {
        const chars = [...answer];
        for (let i=chars.length-1; i>0; i--) { const j=crypto.randomInt(i+1); [chars[i],chars[j]]=[chars[j],chars[i]]; }
        shuffled=chars.join('');
      }
      put(from, {type:'scramble', answer});
      return reply('🔤 *WORD SCRAMBLE*\nUnscramble: *' + shuffled.toUpperCase() + '*\nReply: ' + p + 'unscramble youranswer');
    }
    if (command === 'riddle') {
      const [q,answer]=pick(riddles);
      put(from,{type:'riddle',answer});
      return reply('🧩 *RIDDLE*\n' + q + '\nReply: ' + p + 'riddleanswer youranswer');
    }
    if (command === 'trivia') {
      const q=pick(trivia);
      put(from,{type:'trivia',answer:String(q.right)});
      return reply('🧠 *TRIVIA*\n' + q.q + '\n' + q.a.map((x,i)=>(i+1)+'. '+x).join('\n') + '\nReply: ' + p + 'triviaanswer 1-4');
    }
    if (command === 'mathgame') {
      const a=crypto.randomInt(1,31), b=crypto.randomInt(1,21), op=pick(['+','-','×']);
      const answer=op==='+'?a+b:op==='-'?a-b:a*b;
      put(from,{type:'math',answer:String(answer)});
      return reply('➗ *MATH CHALLENGE*\n' + a + ' ' + op + ' ' + b + ' = ?\nReply: ' + p + 'mathanswer number');
    }
    const types={unscramble:'scramble',riddleanswer:'riddle',triviaanswer:'trivia',mathanswer:'math'};
    const type=types[command];
    if (!type) return;
    const game=current(from,type);
    if (!game) return reply('⌛ No active ' + type + ' game. Start with ' + p + (type==='math'?'mathgame':type) + '.');
    if (!input) return reply('✏️ Send an answer after ' + p + command + '.');
    if (input===game.answer) {
      sessions.delete(from);
      return reply('🎉 *Correct!* Great job!\nPlay again with ' + p + (type==='math'?'mathgame':type) + '.');
    }
    game.tries=(game.tries||0)+1;
    if (game.tries>=3) { sessions.delete(from); return reply('❌ Three tries used. Correct answer: *' + game.answer + '*'); }
    return reply('❌ Not quite! Try again. (' + (3-game.tries) + ' attempts left)');
  },
};
