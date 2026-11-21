// RAM-MD offline utility commands. No third-party API or packages needed.
const crypto = require('crypto');
const LIMIT = 3500;
const safe = x => String(x || '').trim();
const usage = (p, cmd, example) => '🛠️ Usage: ' + p + cmd + ' ' + example;
const countWords = s => (s.match(/\S+/gu) || []).length;
const validBase64 = s => /^[A-Za-z0-9+/]*={0,2}$/.test(s) && s.length % 4 === 0;

module.exports = {
  name: 'utility-pack',
  command: ['password', 'uuid', 'wordcount', 'base64', 'unbase64', 'urlencode', 'urldecode', 'hash', 'jsonfmt', 'timestamp'],
  menu: ['password', 'uuid', 'wordcount', 'base64', 'unbase64', 'urlencode', 'urldecode', 'hash', 'jsonfmt', 'timestamp'],
  category: 'Tools',
  desc: 'Offline utilities: password, uuid, wordcount, base64, unbase64, urlencode, urldecode, hash, jsonfmt, timestamp',
  async run({ command, text, reply, config }) {
    const p = config.prefix || '.';
    const input = safe(text);
    try {
      if (command === 'password') {
        const length = input ? Number(input) : 16;
        if (!Number.isInteger(length) || length < 8 || length > 64) return reply(usage(p, 'password', '[length 8-64]'));
        const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%&*-_';
        const chars = Array.from({ length }, () => alphabet[crypto.randomInt(alphabet.length)]).join('');
        return reply('🔐 *Generated password*\n\n' + chars + '\n\n⚠️ Keep it private. Do not use shared group chats for sensitive passwords.');
      }
      if (command === 'uuid') return reply('🆔 *UUID v4*\n\n' + crypto.randomUUID());
      if (command === 'timestamp') {
        const now = new Date();
        return reply('🕒 *Current server time*\nISO UTC: ' + now.toISOString() + '\nUnix seconds: ' + Math.floor(now.getTime() / 1000) + '\nUnix milliseconds: ' + now.getTime());
      }
      if (!input) {
        const examples = {
          wordcount: 'Hello RAM MD', base64: 'Hello RAM MD', unbase64: 'SGVsbG8=',
          urlencode: 'hello world', urldecode: 'hello%20world', hash: 'hello',
          jsonfmt: '{"name":"RAM-MD"}',
        };
        return reply(usage(p, command, examples[command] || '<text>'));
      }
      if (input.length > LIMIT) return reply('❌ Input too long. Maximum ' + LIMIT + ' characters.');
      if (command === 'wordcount') {
        const words = countWords(input);
        const lines = input.split(/\r?\n/).length;
        const chars = Array.from(input).length;
        const bytes = Buffer.byteLength(input, 'utf8');
        return reply('📊 *Text statistics*\nWords: ' + words + '\nCharacters: ' + chars + '\nBytes: ' + bytes + '\nLines: ' + lines);
      }
      if (command === 'base64') return reply('🔡 *Base64 encoded*\n\n' + Buffer.from(input, 'utf8').toString('base64'));
      if (command === 'unbase64') {
        if (!validBase64(input)) return reply('❌ Invalid Base64 input.');
        const buf = Buffer.from(input, 'base64');
        const decoded = buf.toString('utf8');
        if (!Buffer.from(decoded, 'utf8').equals(buf)) return reply('❌ Base64 content is not valid UTF-8 text.');
        return reply('🔓 *Base64 decoded*\n\n' + decoded);
      }
      if (command === 'urlencode') return reply('🔗 *URL encoded*\n\n' + encodeURIComponent(input));
      if (command === 'urldecode') return reply('🔗 *URL decoded*\n\n' + decodeURIComponent(input));
      if (command === 'hash') return reply('🔏 *SHA-256 hash*\n\n' + crypto.createHash('sha256').update(input).digest('hex') + '\n\nNote: hashing is one-way, not encryption.');
      if (command === 'jsonfmt') {
        const formatted = JSON.stringify(JSON.parse(input), null, 2);
        if (formatted.length > 7000) return reply('❌ Formatted JSON too long to display.');
        return reply('🧩 *Formatted JSON*\n\n```\n' + formatted + '\n```');
      }
    } catch (e) {
      return reply('❌ Invalid input for .' + command + '. Check formatting and try again.');
    }
  },
};
