const { jidNormalizedUser } = require('@whiskeysockets/baileys');

module.exports = {
  name: 'group',
  command: ['tag', 'tagall', 'hidetag', 'kick', 'promote', 'demote', 'groupinfo'],
  category: 'Group',
  desc: 'Group tools: tag, tagall, hidetag, kick, promote, demote, groupinfo',
  async run({ sock, msg, from, command, text, reply, isOwner }) {
    if (!from.endsWith('@g.us')) return reply('This command works in groups only.');

    const meta = await sock.groupMetadata(from);
    const sender = jidNormalizedUser(msg.key.participant || sock.user.id);
    const senderIsAdmin = meta.participants.some(
      (p) => jidNormalizedUser(p.id) === sender && p.admin
    );

    if (command === 'groupinfo') {
      const admins = meta.participants.filter((p) => p.admin).length;
      return reply(
        `*${meta.subject}*\nMembers: ${meta.participants.length}\nAdmins: ${admins}\n` +
          `Description: ${meta.desc || 'none'}`
      );
    }

    if (!['tag', 'tagall'].includes(command) && !senderIsAdmin && !isOwner) return reply('Admins only.');

    const ids = meta.participants.map((p) => p.id);

    if (command === 'tag' || command === 'tagall') {
      const list = ids.map((id) => `@${id.split('@')[0]}`).join('\n');
      return sock.sendMessage(
        from,
        { text: `*${text || 'Attention everyone'}*\n\n${list}`, mentions: ids },
        { quoted: msg }
      );
    }

    if (command === 'hidetag') {
      return sock.sendMessage(from, { text: text || '.', mentions: ids });
    }

    // kick / promote / demote need a target
    const ctx = msg.message?.extendedTextMessage?.contextInfo;
    const targets = ctx?.mentionedJid?.length
      ? ctx.mentionedJid
      : ctx?.participant
      ? [ctx.participant]
      : [];
    if (!targets.length) return reply('Mention a user or reply to their message.');

    const action = { kick: 'remove', promote: 'promote', demote: 'demote' }[command];
    try {
      await sock.groupParticipantsUpdate(from, targets, action);
      await reply(`Done: ${command}`);
    } catch (e) {
      await reply('Failed. Make sure the bot is a group admin.');
    }
  },
};
