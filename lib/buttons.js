// Picture + text + tap buttons ("quick reply"). Each button sends its id back as a normal message,
// so an id like ".vq 720" simply runs that command.
// WhatsApp changes how it shows these often, so callers should also put the typed commands in the text.
async function sendQuickReplies(sock, from, quoted, { image, caption, footer, buttons }) {
  const { generateWAMessageFromContent, prepareWAMessageMedia, proto } = require('@whiskeysockets/baileys');

  const header = { title: '', subtitle: '', hasMediaAttachment: false };
  if (image) {
    const media = await prepareWAMessageMedia({ image: { url: image } }, { upload: sock.waUploadToServer });
    header.hasMediaAttachment = true;
    header.imageMessage = media.imageMessage;
  }

  const content = {
    viewOnceMessage: {
      message: {
        messageContextInfo: { deviceListMetadata: {}, deviceListMetadataVersion: 2 },
        interactiveMessage: proto.Message.InteractiveMessage.create({
          body: { text: caption },
          footer: { text: footer || '' },
          header,
          nativeFlowMessage: {
            buttons: buttons.map((b) => ({
              name: 'quick_reply',
              buttonParamsJson: JSON.stringify({ display_text: b.text, id: b.id }),
            })),
          },
        }),
      },
    },
  };

  const m = generateWAMessageFromContent(from, content, { quoted, userJid: sock.user.id });
  const biz = {
    tag: 'biz',
    attrs: {},
    content: [{ tag: 'interactive', attrs: { type: 'native_flow', v: '1' }, content: [{ tag: 'native_flow', attrs: { v: '9', name: 'mixed' } }] }],
  };
  const extra = [biz];
  if (!from.endsWith('@g.us')) extra.push({ tag: 'bot', attrs: { biz_bot: '1' } }); // needed in private chats
  await sock.relayMessage(from, m.message, { messageId: m.key.id, additionalNodes: extra });
  return { key: { id: m.key.id } };
}

module.exports = { sendQuickReplies };
