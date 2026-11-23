'use strict';
// Basic compatibility bridge for Levanter bot({pattern}, handler) plugins.
// Only load code you trust: this is not a security sandbox.
const registrations = [];
function register(meta, handler) {
  if (!meta || typeof handler !== 'function') throw new Error('Invalid Levanter bot registration');
  const source = String(meta.pattern || meta.command || '');
  const name = source.match(/^\\^?([a-z][a-z0-9_-]*)/i)?.[1]?.toLowerCase();
  if (!name) throw new Error('Unsupported Levanter command pattern: ' + source);
  registrations.push({ name, meta, handler });
}
function makeMessage(ctx) {
  const { sock, msg, from, reply } = ctx;
  return {
    jid: from, chat: from, from, id: msg.key?.id,
    sender: msg.key?.participant || from, participant: msg.key?.participant,
    isGroup: from.endsWith('@g.us'), isOwner: ctx.isOwner,
    message: msg, data: msg, key: msg.key, client: sock,
    reply_message: msg.message?.extendedTextMessage?.contextInfo?.quotedMessage
      ? { text: msg.message.extendedTextMessage.contextInfo.quotedMessage.conversation ||
          msg.message.extendedTextMessage.contextInfo.quotedMessage.extendedTextMessage?.text || '' }
      : null,
    reply: async (text) => reply(String(text)),
    send: async (content, opts = {}, category) => {
      if (Buffer.isBuffer(content)) {
        const type = ['video', 'image', 'audio', 'document'].includes(category) ? category : 'document';
        const payload = { [type]: content, mimetype: opts.mimetype || 'application/octet-stream' };
        if (opts.fileName) payload.fileName = opts.fileName;
        return sock.sendMessage(from, payload, { quoted: msg });
      }
      return sock.sendMessage(from, typeof content === 'string' ? { text: content } : content, { quoted: msg });
    },
    sendMessage: async (content, opts) => sock.sendMessage(from, typeof content === 'string' ? { text: content } : content, { quoted: msg, ...opts }),
    react: async (emoji) => sock.sendMessage(from, { react: { text: String(emoji), key: msg.key } }),
    delete: async () => sock.sendMessage(from, { delete: msg.key }),
  };
}
function wrap(file, definitions) {
  return definitions.map(entry => ({
    name: 'levanter-' + entry.name,
    command: [entry.name],
    category: entry.meta.type || 'Levanter',
    desc: entry.meta.desc || 'Levanter-compatible command',
    owner: Boolean(entry.meta.fromMe),
    async run(ctx) {
      const m = makeMessage(ctx);
      const match = ctx.args.join(' ');
      const levanterContext = { ...process.env, ...ctx.config, sock: ctx.sock };
      try { await entry.handler(m, match, levanterContext); }
      catch (e) {
        console.error('Levanter adapter error [' + file + '/' + entry.name + ']:', e);
        await ctx.reply('⚠️ Plugin error: ' + String(e.message || e).slice(0, 150));
      }
    }
  }));
}
module.exports = { register, wrap, registrations };
