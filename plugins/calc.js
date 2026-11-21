// Safe calculator: a small parser, no eval()
const FUNCS = {
  sqrt: Math.sqrt, abs: Math.abs, round: Math.round, floor: Math.floor, ceil: Math.ceil,
  sin: (x) => Math.sin((x * Math.PI) / 180), cos: (x) => Math.cos((x * Math.PI) / 180),
  tan: (x) => Math.tan((x * Math.PI) / 180), log: Math.log10, ln: Math.log,
  pow: Math.pow, max: Math.max, min: Math.min,
};
const CONSTS = { pi: Math.PI, e: Math.E };

function tokenize(src) {
  const tokens = [];
  const re = /\s*(\d+\.?\d*|\.\d+|[A-Za-z_]+|[-+*/%^(),])/y;
  let pos = 0;
  while (pos < src.length) {
    re.lastIndex = pos;
    const m = re.exec(src);
    if (!m) {
      if (/^\s*$/.test(src.slice(pos))) break;
      throw new Error('Unexpected character: "' + src.slice(pos).trim()[0] + '"');
    }
    tokens.push(m[1]);
    pos = re.lastIndex;
  }
  return tokens;
}

function evaluate(src) {
  const t = tokenize(src);
  let i = 0;
  let depth = 0;
  const peek = () => t[i];
  const next = () => t[i++];

  function expr() {
    let v = term();
    while (peek() === '+' || peek() === '-') v = next() === '+' ? v + term() : v - term();
    return v;
  }
  function term() {
    let v = unary();
    while (peek() === '*' || peek() === '/' || peek() === '%') {
      const op = next();
      const r = unary();
      if ((op === '/' || op === '%') && r === 0) throw new Error('Cannot divide by zero');
      v = op === '*' ? v * r : op === '/' ? v / r : v % r;
    }
    return v;
  }
  function unary() {
    if (peek() === '-') { next(); return -unary(); }
    if (peek() === '+') { next(); return unary(); }
    return power();
  }
  function power() {
    const base = primary();
    if (peek() === '^') { next(); return Math.pow(base, unary()); }
    return base;
  }
  function primary() {
    if (++depth > 50) throw new Error('Expression too deep');
    const tok = next();
    let v;
    if (tok === undefined) throw new Error('Expression ended unexpectedly');
    if (tok === '(') {
      v = expr();
      if (next() !== ')') throw new Error('Missing )');
    } else if (/^[\d.]/.test(tok)) {
      v = parseFloat(tok);
    } else if (/^[A-Za-z_]+$/.test(tok)) {
      const name = tok.toLowerCase();
      if (peek() === '(') {
        next();
        const args = [];
        if (peek() !== ')') { args.push(expr()); while (peek() === ',') { next(); args.push(expr()); } }
        if (next() !== ')') throw new Error('Missing )');
        if (!Object.prototype.hasOwnProperty.call(FUNCS, name)) throw new Error('Unknown function: ' + tok);
        v = FUNCS[name](...args);
      } else if (Object.prototype.hasOwnProperty.call(CONSTS, name)) {
        v = CONSTS[name];
      } else {
        throw new Error('Unknown name: ' + tok);
      }
    } else {
      throw new Error('Unexpected "' + tok + '"');
    }
    depth--;
    return v;
  }

  if (!t.length) throw new Error('Nothing to calculate');
  const result = expr();
  if (i < t.length) throw new Error('Unexpected "' + t[i] + '"');
  return result;
}

function format(n) {
  if (!Number.isFinite(n)) throw new Error('Math error');
  const r = Number(n.toPrecision(12));
  return Math.abs(r) >= 1e15 || (Math.abs(r) < 1e-9 && r !== 0) ? r.toExponential(6) : String(r);
}

module.exports = {
  name: 'calc',
  command: ['calc', 'cal', 'calculate'],
  menu: ['calc'],
  category: 'Tools',
  desc: 'Calculator: .calc 25*4+10',
  evaluate, // exported for testing
  async run({ text, reply, config }) {
    const p = config.prefix;
    if (!text) {
      return reply(
        `*Calculator*\nExample: ${p}calc 25*4+10\n\n` +
          'Operators: + - * / % ^ ( )\n' +
          'Functions: sqrt, abs, round, floor, ceil, sin, cos, tan, log, ln, pow, max, min\n' +
          'Constants: pi, e'
      );
    }
    const input = text.replace(/×|x(?=\s*[\d(.])/gi, '*').replace(/÷/g, '/').slice(0, 200);
    try {
      await reply(`${text.trim()}\n= *${format(evaluate(input))}*`);
    } catch (e) {
      await reply('Error: ' + e.message);
    }
  },
};
