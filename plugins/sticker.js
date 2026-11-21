const { downloadMediaMessage } = require('@whiskeysockets/baileys');
const sharp = require('sharp');

module.exports = {
  name: 'sticker',
  command: ['sticker', 's'],
  menu: ['sticker'],
  category: 'Media',
  desc: 'Image to sticker (send image with .s or reply to an image)',
  async run({ sock, msg, from, reply }) {
    const ctx = msg.message?.extendedTextMessage?.contextInfo;
    let target = null;

    if (msg.message?.imageMessage) {
      target = msg;
    } else if (ctx?.quotedMessage?.imageMessage) {
      target = {
        key: { remoteJid: from, id: ctx.stanzaId, participant: ctx.participant },
        message: ctx.quotedMessage,
      };
    }
    if (!target) return reply('Send an image with caption .s or reply to an image with .s');

    const buffer = await downloadMediaMessage(target, 'buffer', {});
    const webp = await sharp(buffer)
      .resize(512, 512, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .webp()
      .toBuffer();

    await sock.sendMessage(from, { sticker: webp }, { quoted: msg });
  },
};
