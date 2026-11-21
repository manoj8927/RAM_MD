const { downloadMediaMessage, jidNormalizedUser } = require('@whiskeysockets/baileys');
const sharp = require('sharp');

module.exports = {
  name: 'fullpp',
  command: ['fullpp'],
  category: 'Profile',
  desc: 'Set full (uncropped) profile picture - reply to an image with .fullpp',
  owner: true,
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
    if (!target) return reply('Reply to an image with .fullpp');

    const buffer = await downloadMediaMessage(target, 'buffer', {});

    // Fit the whole image into a square so WhatsApp does not crop it
    const img = sharp(buffer);
    const { width, height } = await img.metadata();
    const size = Math.max(width, height);
    const square = await sharp(buffer)
      .resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 1 } })
      .jpeg({ quality: 95 })
      .toBuffer();

    await sock.updateProfilePicture(jidNormalizedUser(sock.user.id), square);
    await reply('Profile picture updated.');
  },
};
