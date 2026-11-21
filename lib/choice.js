// "Reply with a number" menus.
// A plugin shows a numbered list and calls offer(); the next number from the same person in that
// chat runs the matching option. plugins/choice.js listens for those replies.
const offers = new Map(); // chat -> { asker, cardId, options, expires, plainUntil }

const TTL = 10 * 60 * 1000;       // a reply that quotes the card works for 10 minutes
const PLAIN_TTL = 3 * 60 * 1000;  // a bare number (no quote) only for 3 minutes, so a stray "2" later does nothing

// who is talking: the group member, "me" for your own messages (the self chat), else the chat itself
const senderOf = (msg) => msg.key.participant || (msg.key.fromMe ? 'me' : msg.key.remoteJid);

// the id of the message that was replied to
const quotedId = (msg) => {
  const m = msg.message || {};
  const ctx = m.extendedTextMessage?.contextInfo || m.conversation?.contextInfo;
  return ctx?.stanzaId || null;
};

// "3", "3.", "3)" -> 3 (only when it is within 1..max), else 0
function numberFrom(text, max) {
  const m = /^\s*(\d{1,2})\s*[.)]?\s*$/.exec(text || '');
  const n = m ? Number(m[1]) : 0;
  return n >= 1 && n <= max ? n : 0;
}

const numbered = (options) => options.map((o, i) => `${i + 1}. ${o.label}`).join('\n');

// options: [{ label, run(ctx) }]
function offer(chat, asker, cardId, options) {
  const now = Date.now();
  offers.set(chat, { asker, cardId: cardId || null, options, expires: now + TTL, plainUntil: now + PLAIN_TTL });
}

function hasOffer(chat) {
  const o = offers.get(chat);
  return !!o && o.expires > Date.now();
}

function clear(chat) {
  offers.delete(chat);
}

// Called for every ordinary message. Returns true when the message was an answer.
async function handle(ctx) {
  const { msg, from, text, reply } = ctx;
  const o = offers.get(from);
  if (!o) return false;
  if (o.expires < Date.now()) { offers.delete(from); return false; }
  if (senderOf(msg) !== o.asker) return false;               // someone else in the chat

  const quoted = o.cardId && quotedId(msg) === o.cardId;
  if (!quoted && Date.now() > o.plainUntil) return false;     // a bare number that came too late

  const typed = /^\s*(\d{1,2})\s*[.)]?\s*$/.exec(text || '');
  if (!typed) return false;                                   // not a number at all
  const n = numberFrom(text, o.options.length);
  if (!n) {
    if (quoted) await reply(`Please reply with a number from 1 to ${o.options.length}.`);
    return quoted;
  }

  try {
    await o.options[n - 1].run(ctx);
  } catch (e) {
    console.log('Choice error:', e.message);
  }
  return true;
}

module.exports = { senderOf, quotedId, numberFrom, numbered, offer, clear, hasOffer, handle };
