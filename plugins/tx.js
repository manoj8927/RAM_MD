// TX font converter adapted for this bot's plugin API.
// Owner-only, fixed allowlist of font pages, built-in fetch, timeout and in-memory cache.
const FONT_SOURCES = [
  ['luccastyle007', 'https://instafonts.io/font/luccastyle007'],
  ['lucca-style007', 'https://instafonts.io/font/lucca-style007'],
  ['luccastylex077', 'https://instafonts.io/font/luccastylex077'],
  ['styledbylucca007', 'https://instafonts.io/font/styledbylucca007'],
  ['luccastyle07', 'https://instafonts.io/font/luccastyle07'],
  ['theluccastyle007', 'https://instafonts.io/font/theluccastyle007'],
  ['Joseph Gabriel Goldberg005', 'https://share.google/YHWwyfhdxIBO9Ii4v'],
  ['Joseph Gabriel Goldberg03', 'https://share.google/opxhvsBJpQ40XZlew'],
  ['joseph-gabriel-goldberg01', 'https://instafonts.io/font/joseph-gabriel-goldberg01'],
  ['Joseph Gabriel Goldberg009', 'https://share.google/OPHxIQwi3TpjdDCf6'],
  ['Joseph Gabriel Goldberg004', 'https://share.google/AGBDwtCf8sJh1K3Bc'],
  ['joseph-gabriel-goldberg-', 'https://instafonts.io/font/joseph-gabriel-goldberg-'],
  ['Joseph Gabriel Goldberg006', 'https://share.google/YUn73gV5UimTJdXQp'],
  ['Joseph Gabriel Goldberg007', 'https://share.google/RiO8kUPeUyshGXZ51'],
  ['Joseph Gabriel Goldberg008', 'https://share.google/3xZgLm3QKMETuynJq'],
  ['bangtansonyeondan1234', 'https://instafonts.io/font/bangtansonyeondan1234'],
  ['ldv-owner', 'https://instafonts.io/font/ldv-owner'],
  ['yoongi-ldvowner', 'https://instafonts.io/font/yoongi-ldvowner'],
  ['lart-de-vivre', 'https://instafonts.io/font/lart-de-vivre'],
  ['createdbyluxe', 'https://instafonts.io/font/createdbyluxe'],
  ['xan-der', 'https://instafonts.io/font/xan-der'],
  ['xander98', 'https://instafonts.io/font/xander98'],
  ['xander99', 'https://instafonts.io/font/xander99'],
  ['xan-derr', 'https://instafonts.io/font/xan-derr'],
  ['selennafont31', 'https://instafonts.io/font/selennafont31'],
  ['royal-vinzel-95', 'https://instafonts.io/font/royal-vinzel-95'],
];
const fontCache = new Map();
const TTL = 6 * 60 * 60 * 1000;

function quotedText(msg) {
  const ctx = msg.message?.extendedTextMessage?.contextInfo;
  const q = ctx?.quotedMessage || {};
  return String(q.conversation || q.extendedTextMessage?.text || q.imageMessage?.caption || q.videoMessage?.caption || '').trim();
}

function parseEmbeddedFontData(html) {
  const match = html.match(/<script id="fontDataScript" type="text\/json">([\s\S]*?)<\/script>/i);
  if (!match) throw new Error('Font rules were not found on the source page.');
  try { return JSON.parse(decodeURIComponent(match[1])); }
  catch (e) { throw new Error('Font rules could not be decoded.'); }
}

function toRegex(input) {
  if (typeof input !== 'string' || !input.startsWith('/')) return null;
  const slash = input.lastIndexOf('/');
  if (slash <= 0) return null;
  try { return new RegExp(input.slice(1, slash), input.slice(slash + 1)); }
  catch (e) { return null; }
}

function applyRules(text, rules) {
  let output = text;
  for (const rule of rules) {
    if (!rule || typeof rule.in !== 'string' || typeof rule.out !== 'string' || !rule.in) continue;
    const re = toRegex(rule.in);
    output = re ? output.replace(re, rule.out) : output.split(rule.in).join(rule.out);
  }
  return output;
}

async function loadRules(font) {
  const cached = fontCache.get(font.url);
  if (cached && Date.now() - cached.at < TTL) return cached.rules;
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), 15000);
  try {
    const response = await fetch(font.url, { headers: { 'User-Agent': 'status-bot-tx-converter' }, signal: ctl.signal });
    if (!response.ok) throw new Error('HTTP ' + response.status);
    const data = parseEmbeddedFontData(await response.text());
    const rules = Array.isArray(data.rules) ? data.rules : [];
    if (!rules.length) throw new Error('No transformation rules found.');
    fontCache.set(font.url, { rules, at: Date.now() });
    return rules;
  } catch (e) {
    if (e.name === 'AbortError') throw new Error('Font source timed out.');
    throw e;
  } finally { clearTimeout(timer); }
}

function help(prefix) {
  return [
    '*TX Font Converter*',
    `Use: ${prefix}tx list`,
    `Use: ${prefix}tx info 3`,
    `Use: ${prefix}tx 3 hello`,
    `Reply to a message with ${prefix}tx 3 to convert replied text.`,
  ].join('\n');
}

module.exports = {
  name: 'tx',
  command: ['tx', 'font', 'fonts'],
  menu: ['tx'],
  category: 'Tools',
  desc: '.tx list | .tx <font number> <text> | reply to text with .tx <number>',
  owner: true,
  async run({ args, msg, reply, config }) {
    const p = config.prefix;
    const input = args.join(' ').trim();
    if (!input) return reply(help(p));
    if (/^list$/i.test(input)) return reply(FONT_SOURCES.map(([name], i) => `${i + 1}. ${name}`).join('\n'));
    const info = /^info\s+(\d+)$/i.exec(input);
    if (info) {
      const font = FONT_SOURCES[Number(info[1]) - 1];
      return reply(font ? `*${Number(info[1])}. ${font[0]}*\n${font[1]}` : `Invalid font number. Use ${p}tx list.`);
    }
    const m = /^(\d+)\s*([\s\S]*)$/.exec(input);
    if (!m) return reply(help(p));
    const index = Number(m[1]);
    const source = FONT_SOURCES[index - 1];
    if (!source) return reply(`Invalid font number. Use ${p}tx list.`);
    const text = m[2].trim() || quotedText(msg);
    if (!text) return reply(`Text missing. Example: ${p}tx 3 hello, or reply to text with ${p}tx 3.`);
    try {
      const rules = await loadRules({ index, name: source[0], url: source[1] });
      return reply(applyRules(text, rules));
    } catch (e) {
      return reply(`Failed to load font ${index}: ${e.message}`);
    }
  },
};
