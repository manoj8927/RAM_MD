// Get the JID of a WhatsApp channel (from its link), or of the current chat
const CHANNEL_RE = /whatsapp\.com\/channel\/([A-Za-z0-9_-]+)/i;

module.exports = {
  name: 'jid',
  command: ['jid', 'cjid', 'channeljid'],
  menu: ['jid'],
  category: 'Tools',
  desc: 'Channel JID: .jid <channel link> | reply to a channel post | .jid (this chat)',
  async run({ sock, msg, from, text, reply, config }) {
    const p = config.prefix;
    const ctx = msg.message?.extendedTextMessage?.contextInfo;

    // 1) Channel link given
    const m = CHANNEL_RE.exec(text || '');
    if (m) {
      try {
        const meta = await sock.newsletterMetadata('invite', m[1]);
        const lines = [
          '*Channel info*',
          `Name: ${meta.name || 'unknown'}`,
          `JID: ${meta.id}`,
        ];
        if (meta.subscribers !== undefined) lines.push(`Followers: ${meta.subscribers}`);
        lines.push(`Link: https://whatsapp.com/channel/${m[1]}`);
        return reply(lines.join('\n'));
      } catch (e) {
        return reply('Could not read this channel. Check the link and try again.\n(' + e.message + ')');
      }
    }

    // 2) Replying to a post forwarded from a channel
    const fwd = ctx?.forwardedNewsletterMessageInfo;
    if (fwd?.newsletterJid) {
      return reply(
        `*Channel info*\nName: ${fwd.newsletterName || 'unknown'}\nJID: ${fwd.newsletterJid}`
      );
    }

    // 3) A link was given but it is not a channel link
    if (text) return reply(`Send a channel link like:\n${p}jid https://whatsapp.com/channel/XXXXXXXX`);

    // 4) No input: JID of this chat
    const sender = msg.key.participant || (msg.key.fromMe ? sock.user.id : from);
    return reply(
      `*JID*\nThis chat: ${from}\nYou: ${sender}\n\n` +
        `For a channel: ${p}jid <channel link>\nor reply to a forwarded channel post with ${p}jid`
    );
  },
};
