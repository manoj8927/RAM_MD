const state = { guess: new Map(), ttt: new Map() };

// ---------- Tic Tac Toe helpers ----------
const LINES = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
const NUMS = ['1️⃣','2️⃣','3️⃣','4️⃣','5️⃣','6️⃣','7️⃣','8️⃣','9️⃣'];

function result(b) {
  for (const [a, c, d] of LINES) if (b[a] && b[a] === b[c] && b[a] === b[d]) return b[a];
  return b.every(Boolean) ? 'draw' : null;
}
function render(b) {
  const cell = (i) => (b[i] === 'X' ? '❌' : b[i] === 'O' ? '⭕' : NUMS[i]);
  return [0, 3, 6].map((r) => cell(r) + cell(r + 1) + cell(r + 2)).join('\n');
}
function aiMove(b) {
  const empty = b.map((v, i) => (v ? null : i)).filter((i) => i !== null);
  for (const who of ['O', 'X']) { // win first, then block
    for (const i of empty) {
      b[i] = who;
      const r = result(b);
      b[i] = null;
      if (r === who) return i;
    }
  }
  if (!b[4]) return 4;
  return empty[Math.floor(Math.random() * empty.length)];
}

module.exports = {
  name: 'games',
  command: ['rps', 'dice', 'flip', 'guess', 'ttt'],
  category: 'Games',
  desc: '.rps, .dice, .flip, .guess, .ttt',
  async run({ command, args, from, reply, config }) {
    const p = config.prefix;

    // ----- Rock Paper Scissors -----
    if (command === 'rps') {
      const opts = { rock: '🪨', paper: '📄', scissors: '✂️' };
      const me = (args[0] || '').toLowerCase();
      if (!opts[me]) return reply(`Usage: ${p}rps rock/paper/scissors`);
      const names = Object.keys(opts);
      const bot = names[Math.floor(Math.random() * 3)];
      const beats = { rock: 'scissors', paper: 'rock', scissors: 'paper' };
      const out = me === bot ? 'Draw!' : beats[me] === bot ? 'You win! 🎉' : 'I win! 😎';
      return reply(`You: ${opts[me]}\nBot: ${opts[bot]}\n\n${out}`);
    }

    // ----- Dice / Coin -----
    if (command === 'dice') return reply(`🎲 You rolled *${1 + Math.floor(Math.random() * 6)}*`);
    if (command === 'flip') return reply(`🪙 *${Math.random() < 0.5 ? 'Heads' : 'Tails'}*`);

    // ----- Number guessing -----
    if (command === 'guess') {
      const n = parseInt(args[0], 10);
      let g = state.guess.get(from);

      if (isNaN(n)) {
        state.guess.set(from, { number: 1 + Math.floor(Math.random() * 100), tries: 0 });
        return reply(`🔢 I picked a number from 1 to 100.\nGuess with: ${p}guess <number>`);
      }
      if (!g) return reply(`Start a game first: ${p}guess`);

      g.tries++;
      if (n === g.number) {
        state.guess.delete(from);
        return reply(`🎉 Correct! The number was *${g.number}*. Tries: ${g.tries}`);
      }
      return reply(n < g.number ? '⬆️ Higher!' : '⬇️ Lower!');
    }

    // ----- Tic Tac Toe (you = ❌, bot = ⭕) -----
    if (command === 'ttt') {
      const pos = parseInt(args[0], 10);
      let b = state.ttt.get(from);

      if (!b || args[0] === 'new' || args[0] === 'reset') {
        b = Array(9).fill(null);
        state.ttt.set(from, b);
        return reply(`❌ You   ⭕ Bot\n\n${render(b)}\n\nPlay: ${p}ttt <1-9>`);
      }
      if (!(pos >= 1 && pos <= 9)) return reply(`Play: ${p}ttt <1-9>   |   New game: ${p}ttt new`);
      if (b[pos - 1]) return reply('That spot is taken. Pick another.');

      b[pos - 1] = 'X';
      let r = result(b);
      if (!r) {
        b[aiMove(b)] = 'O';
        r = result(b);
      }

      let msg = render(b);
      if (r) {
        state.ttt.delete(from);
        msg += r === 'draw' ? '\n\n🤝 Draw!' : r === 'X' ? '\n\n🎉 You win!' : '\n\n😎 Bot wins!';
      }
      return reply(msg);
    }
  },
};
