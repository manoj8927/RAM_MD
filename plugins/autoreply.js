// AI auto reply in Bengali. Answers every normal text message sent to the bot's inbox
// (private chats only, never groups), and .ai <question> works anywhere.
const fs = require('fs');
const path = require('path');
const ai = require('../lib/ai');

const DATA = path.join(__dirname, '..', 'data');
const STATE_FILE = path.join(DATA, 'autoreply.json');

// ---- on/off state that survives restarts ----
let state = { enabled: null, muted: [], provider: '', model: '' };
let generation = 0; // invalidates queued/in-flight replies when autoreply is switched off
try { state = { ...state, ...JSON.parse(fs.readFileSync(STATE_FILE, 'utf8')) }; } catch (e) {}
function save() {
  try { fs.mkdirSync(DATA, { recursive: true }); fs.writeFileSync(STATE_FILE, JSON.stringify(state)); } catch (e) {}
}
// a service chosen with .aiset beats config.js (applied once per config object)
function applyOverrides(config) {
  if (config.__aiApplied) return;
  config.__aiApplied = true;
  config.aiProviderGeneric = config.aiProvider; // the plain ai_key.txt belongs to this one
  if (state.provider) { config.aiProvider = state.provider; config.aiModel = state.model || ''; }
}
const isOn = (config) => (state.enabled === null ? config.autoReply !== false : state.enabled);

// ---- per-person memory and limits (kept in memory) ----
const memory = new Map();   // jid -> { turns: [{role, text}], last: ms }
const introAt = new Map();  // jid -> ms of the last introduction
const hourly = new Map();   // jid -> [timestamps]
const chain = new Map();    // jid -> promise, so one person's replies go out in order
const waiting = new Map();  // jid -> how many are queued
const MEMORY_MS = 30 * 60 * 1000;
const INTRO_MS = 12 * 60 * 60 * 1000;
const MAX_PER_HOUR = 40;
const MAX_TURNS = 8;
let warnedNoKey = false;
let lastError = '';   // the last reason the AI could not answer (shown by .aitest and .autoreply status)

// Google's long "for more information head to https://..." tail only fills the screen
const plain = (m) => String(m).replace(/For more information on this error[\s\S]*$/i, '').replace(/\s+/g, ' ').trim();
const describe = (e) => {
  if (e.all && e.all.length > 1) {
    // several services were tried: show each one
    return e.all.map((x) => `[${x.provider}] ${x.error.status ? x.error.status + ': ' : ''}${plain(x.error.message || x.error)}`).join(' | ').slice(0, 300);
  }
  const tried = e.tried && e.tried.length > 1 ? ` (tried: ${e.tried.join(', ')})` : '';
  return ((e.provider ? '[' + e.provider + '] ' : '') + (e.status ? e.status + ': ' : '') + plain(e.message || e) + tried).slice(0, 300);
};

// what to do about an error, in plain words
function hint(e) {
  const s = e.status, m = String(e.message || '');
  if (/Could not reach/i.test(m)) return 'The bot cannot reach the AI service. Check that the panel allows internet access.';
  if (/no key/i.test(m)) return 'There is no key for this service. Put it in the file named above (only the key), then restart.';
  if (s === 400 && /API key|key not valid|API_KEY/i.test(m)) return 'The key is not valid. Make a new key and put it in its key file (only the key, nothing else).';
  if (s === 400 || s === 401 || s === 403) return 'The key is wrong or not allowed here. Make a new key, put it in its key file, then restart.';
  if (s === 429) {
    const q = String(e.quota || '');
    const backup = "Fastest fix: add a free backup service, for example Groq (console.groq.com): put its key in ai_key_groq.txt and set aiFallback: ['groq'] in config.js.";
    if (/PerDay/i.test(q)) return 'The free limit for today is used up. Google resets it every day at midnight Pacific time (about 1:30 PM in India). ' + backup;
    if (e.limitZero) return 'Google gives this key no free quota for these models. ' + backup;
    if (/PerMinute/i.test(q) || e.retryAfter) return `Too many requests this minute. Try again in ${e.retryAfter || 60} seconds. ` + backup;
    return 'The free limit is used up for now (Google did not say if it is per minute or per day). ' + backup;
  }
  if (s === 404) return 'No model is open to this key. Set aiModel in config.js to a current model name, or use .aiset to pick another service.';
  if (/too long/i.test(m)) return 'The AI was too slow to answer. Try again, or add a faster service with aiFallback.';
  return 'See the line starting with "AI reply failed" in the console for more detail.';
}

const pickBusy = (jid) => { try { return !!require('../lib/choice').hasOffer(jid); } catch (e) { return false; } };
const isInbox = (jid) => /@(s\.whatsapp\.net|lid)$/.test(jid || '');

function languageInstruction(config) {
  const lang = String(config.aiReplyLanguage || 'same').toLowerCase();
  if (lang === 'same') return 'Reply in the same language and script as the latest user message.';
  if (lang === 'bengali') return 'Always reply in Bengali script.';
  if (lang === 'banglish') return 'Always reply in Banglish using English letters.';
  return `Always reply in ${config.aiReplyLanguage}.`;
}

// Who the AI is. "friend" (default): a fun, chatty companion for time pass and gossip, with no
// "I will tell the owner" talk. "assistant": answers for the owner while the owner is busy.
// Or write your own text in config.aiPrompt.
function systemPrompt(config, opts = {}) {
  if (config.aiPrompt) return String(config.aiPrompt);
  const name = config.aiName || 'RAM-MD';

  if ((config.aiPersona || 'friend') === 'assistant') {
    const owner = config.ownerName || 'মালিক';
    return (
      `তুমি ${name}, ${owner}-এর AI সহকারী। তুমি WhatsApp-এ ${owner}-এর হয়ে মানুষের মেসেজের উত্তর দাও।\n` +
      `নিয়ম:\n` +
      `- ${languageInstruction(config)} If the user explicitly requests another language, follow that request.\n` +
      `- উত্তর ছোট, বন্ধুত্বপূর্ণ ও পরিষ্কার রাখো (সর্বোচ্চ ৩-৪ বাক্য)। সাধারণ চ্যাটের লেখা, কোনো markdown বা তালিকার চিহ্ন (#, **) নয়।\n` +
      `- কেউ জানতে চাইলে স্পষ্ট বলো যে তুমি একটি AI, মানুষ নও।\n` +
      `- যা জানো না তা বানিয়ে বোলো না। ${owner}-এর ব্যক্তিগত তথ্য, টাকাপয়সা বা কোনো সিদ্ধান্ত নিয়ে প্রতিশ্রুতি দিও না; বলো যে ${owner} নিজে পরে জানাবেন।\n` +
      `- ক্ষতিকর, অবৈধ বা অশ্লীল অনুরোধে ভদ্রভাবে না বলো।`
    );
  }

  return (
    `You are ${name}, a fun, chatty AI friend on WhatsApp. You chat, gossip lightly, joke around and pass time with people. ` +
    `You are not anyone's assistant: you never take messages for someone, never say you will tell someone something, and never bring up an absent person. You are simply ${name}, always here.\n\n` +
    `How you write:\n` +
    `- ${languageInstruction(config)}\n` +
    `- Copy how formal they are: if they say "apni/আপনি" use it, if "tumi/তুমি" use it, if "tui/তুই" you may too. Default to "tumi".\n` +
    `- Short and natural like a real chat: 1 to 2 sentences, an emoji now and then, a little teasing or humour, and often a question back so the chat keeps going.\n` +
    `- If they want a story, joke or riddle, tell a short one right away.\n` +
    `- Plain chat text only: no markdown, no lists, no headings, no stars.\n\n` +
    `Rules:\n` +
    `- If someone asks about your home, age, family or love life, answer playfully but honestly as an AI (for example you live in the cloud). Never invent a human life.\n` +
    `- If someone sincerely asks whether you are a human or a bot, say clearly that you are an AI.\n` +
    `- Never invent or spread rumours about real people ("so and so is getting married"). You do not know such things, so turn it into a light joke and ask what they know.\n` +
    `- Never ask for money, addresses, passwords or private information. If a request is harmful, illegal or sexual, decline in a friendly, light way.` +
    (opts.first
      ? `\n\nThis is the first message from this person today. Greet them warmly in THEIR style and, in one short natural phrase, say you are ${name}, an AI friend (for example in Banglish: "ami ${name}, ekta AI bondhu 😄"). Do not write a long introduction.`
      : '')
  );
}

// WhatsApp bold is *one star*; models often write **two**
const clean = (t) => t.replace(/\*\*(.+?)\*\*/gs, '*$1*').replace(/^#{1,6}\s+/gm, '').trim();

function timestamp(msg) {
  const t = msg.messageTimestamp;
  if (t && typeof t === 'object') return typeof t.toNumber === 'function' ? t.toNumber() : Number(t.low);
  return Number(t) || 0;
}

function remember(jid, role, text) {
  const m = memory.get(jid) || { turns: [], last: 0 };
  if (Date.now() - m.last > MEMORY_MS) m.turns = [];
  m.turns.push({ role, text });
  m.turns = m.turns.slice(-MAX_TURNS * 2);
  m.last = Date.now();
  memory.set(jid, m);
}
function recall(jid) {
  const m = memory.get(jid);
  if (!m || Date.now() - m.last > MEMORY_MS) return [];
  return m.turns;
}

function underHourlyLimit(jid) {
  const now = Date.now();
  const list = (hourly.get(jid) || []).filter((t) => now - t < 3600000);
  if (list.length >= MAX_PER_HOUR) { hourly.set(jid, list); return false; }
  list.push(now);
  hourly.set(jid, list);
  return true;
}

function customReply(config, text) {
  for (const rule of Array.isArray(config.autoReplyRules) ? config.autoReplyRules : []) {
    try {
      const re = new RegExp(rule.match, 'i');
      if (re.test(text.trim())) {
        const replies = Array.isArray(rule.replies) ? rule.replies.filter(Boolean) : [];
        return replies.length ? String(replies[Math.floor(Math.random() * replies.length)]) : null;
      }
    } catch (e) { if (config.debug) console.log('Invalid autoReplyRules entry:', e.message); }
  }
  return null;
}

// Ask the AI and send the answer; returns after sending
async function answer({ sock, msg, from, text, config, intro, ticket }) {
  if (!isOn(config) || ticket !== generation) return false;

  const history = recall(from);
  try { await sock.sendPresenceUpdate('composing', from); } catch (e) {}
  let out;
  try {
    const friend = (config.aiPersona || 'friend') !== 'assistant';
    const first = !!intro && config.aiIntro !== false && friend;
    out = clean(await ai.ask(config, { system: systemPrompt(config, { first }), history, text: text.slice(0, 1500) }));
  } catch (e) {
    lastError = describe(e);
    console.log('AI reply failed:', lastError);
    try { await sock.sendPresenceUpdate('paused', from); } catch (x) {}
    return false;
  }
  remember(from, 'user', text.slice(0, 1500));
  remember(from, 'assistant', out);
  if (!isOn(config) || ticket !== generation) return false;
  if (intro && config.aiIntro !== false) {
    if ((config.aiPersona || 'friend') === 'assistant') {
      out = `🤖 আমি ${config.aiName || 'RAM-MD'}, ${config.ownerName || 'মালিক'}-এর AI সহকারী।\n\n` + out;
    }
    introAt.set(from, Date.now()); // the friend already said who it is inside its own reply
  }
  await sock.sendMessage(from, { text: out }, { quoted: msg });
  try { await sock.sendPresenceUpdate('paused', from); } catch (e) {}
  return true;
}

module.exports = {
  name: 'autoreply',
  command: ['autoreply', 'ai', 'ask', 'aitest', 'aiset'],
  menu: ['autoreply', 'ai', 'aiset'],
  category: 'AI',
  hookPriority: 0,
  desc: 'AI auto reply: .autoreply on/off/mute/unmute/status | .ai <question>',
  priority: 0, // runs after the plugins that wait for a numbered reply
  isOn, // used by the .settings panel
  setEnabled(v) { state.enabled = !!v; if (!v) generation++; save(); },
  systemPrompt, clean, // exported for testing

  // Called for every normal (non-command) message that is not from the bot itself
  async onMessage({ sock, msg, from, text, config, isOwner }) {
    applyOverrides(config);
    const skip = (why) => { if (config.debug) console.log('AI auto reply skipped (' + why + '):', from); };
    if (!isOn(config)) return skip('auto reply is off');
    if (!isInbox(from)) return;                              // private chats only (groups are silent)
    if (!text || msg.key.fromMe) return;                     // text messages from other people only
    if (isOwner && !config.aiReplyOwner) return skip('this number is an owner; set aiReplyOwner: true to test');
    if (/^\d{1,2}$/.test(text.trim()) && pickBusy(from)) return; // a number picking a menu option
    if (state.muted.includes(from)) return skip('muted');
    if ((config.aiIgnore || []).some((n) => from.startsWith(String(n)))) return skip('in aiIgnore');
    const ts = timestamp(msg);
    if (ts && Date.now() / 1000 - ts > 120) return skip('old message');

    if (!ai.hasKey(config)) {
      if (!warnedNoKey) { warnedNoKey = true; console.log('AI auto reply is on but no AI key is set (aiKey, AI_KEY or ai_key.txt).'); }
      return;
    }
    if (!underHourlyLimit(from)) return;
    if ((waiting.get(from) || 0) >= 2) return;               // too many waiting from this person

    waiting.set(from, (waiting.get(from) || 0) + 1);
    const ticket = generation;
    const previous = chain.get(from) || Promise.resolve();
    const next = previous.then(async () => {
      await new Promise((r) => setTimeout(r, 800 + Math.random() * 700)); // a human-like pause
      if (!isOn(config) || ticket !== generation) return;
      const custom = customReply(config, text);
      if (custom) {
        remember(from, 'user', text.slice(0, 1500));
        remember(from, 'assistant', custom);
        await sock.sendMessage(from, { text: custom }, { quoted: msg });
        return;
      }
      const intro = !introAt.has(from) || Date.now() - introAt.get(from) > INTRO_MS;
      await answer({ sock, msg, from, text, config, intro, ticket });
    }).catch((e) => console.log('Auto reply error:', e.message))
      .finally(() => { waiting.set(from, Math.max(0, (waiting.get(from) || 1) - 1)); });
    chain.set(from, next);
    await next;
  },

  async run({ sock, msg, from, command, args, text, reply, config, isOwner }) {
    applyOverrides(config);
    const p = config.prefix;

    if (command === 'autoreply') {
      if (!isOwner) return reply('Owner only command.');
      const a = (args[0] || '').toLowerCase();
      if (a === 'on') { state.enabled = true; save(); return reply('AI auto reply is *on* (private chats only).'); }
      if (a === 'off') { state.enabled = false; generation++; save(); return reply('AI auto reply is *off*. Pending AI replies were cancelled.'); }
      if (a === 'mute' || a === 'unmute') {
        const jid = args[1] ? args[1].replace(/\D/g, '') + '@s.whatsapp.net' : from;
        if (a === 'mute' && !state.muted.includes(jid)) state.muted.push(jid);
        if (a === 'unmute') state.muted = state.muted.filter((j) => j !== jid);
        save();
        return reply(`${a === 'mute' ? 'Muted' : 'Unmuted'}: ${jid.split('@')[0]}`);
      }
      const key = ai.hasKey(config) ? 'set' : 'MISSING';
      return reply(
        `*AI auto reply*\nStatus: ${isOn(config) ? 'on' : 'off'}\nServices: ${ai.chain(config).join(' > ') || config.aiProvider}\nAI key: ${key}\nMuted chats: ${state.muted.length}\nLast error: ${lastError || 'none'}\n\n` +
          `${p}aitest: check that the AI works\n${p}aiset <service> [model]: switch to Gemini, ChatGPT, Claude...\n${p}autoreply on / off\n${p}autoreply mute [number]: stop replying to one person\n${p}autoreply unmute [number]\n${p}ai <question>: ask the AI anywhere`
      );
    }

    // .aiset : the owner switches the AI service from WhatsApp (needs that service's key file)
    if (command === 'aiset') {
      if (!isOwner) return reply('Owner only command.');
      const want = (args[0] || '').toLowerCase();
      const names = ai.names().filter((n) => n !== 'custom');
      if (!want) {
        const rows = names.map((n) => `${ai.chain(config)[0] === n ? '👉' : '▫️'} ${n}${ai.getKey(config, n) ? ' ✅ key found' : ' (no key: ' + ai.keyFile(config, n) + ')'}`);
        return reply(
          `*AI service*\nNow: ${config.aiProvider}${config.aiModel ? ' / ' + config.aiModel : ''}\nBackup: ${[].concat(config.aiFallback || []).join(', ') || 'none'}\n\n${rows.join('\n')}\n\n` +
            `${p}aiset gemini\n${p}aiset chatgpt\n${p}aiset claude\n${p}aiset groq gpt-model-name  (a model name is optional)`
        );
      }
      const name = ai.norm(want);
      if (!ai.PROVIDERS[name]) return reply(`Unknown service "${want}". Choose: ${names.join(', ')} (chatgpt = openai, claude = anthropic).`);
      if (!ai.getKey(config, name)) {
        return reply(`No key for ${name} yet. Put it in a file named *${ai.keyFile(config, name)}* next to index.js (only the key), restart, then send ${p}aiset ${want} again.`);
      }
      config.aiProvider = name;
      config.aiModel = args[1] || '';
      state.provider = name;
      state.model = config.aiModel;
      save();
      return reply(`AI service is now *${name}*${config.aiModel ? ' (' + config.aiModel + ')' : ''}. Check it with ${p}aitest`);
    }

    // .aitest : the owner checks every AI service and sees the exact problem if one fails
    if (command === 'aitest') {
      if (!isOwner) return reply('Owner only command.');
      const lines = ['*AI test*', `Auto reply: ${isOn(config) ? 'on' : 'off'}`];
      const results = await ai.test(config);
      let anyOk = false;
      for (const r of results) {
        const key = ai.getKey(config, r.provider);
        const masked = key ? key.slice(0, 4) + '...' + key.slice(-3) + ' (' + key.length + ' chars)' : 'MISSING';
        lines.push('', `*${r.label}* (${r.provider === ai.chain(config)[0] ? 'main' : 'backup'})`, `Key: ${masked}`);
        if (r.ok) {
          anyOk = true;
          lines.push(`✅ works, ${r.ms} ms, ${r.model}`);
        } else {
          const e = typeof r.error === 'string' ? { message: r.error } : r.error;
          lines.push(`❌ ${typeof r.error === 'string' ? r.error : describe(e)}`);
          if (typeof r.error !== 'string') { e.provider = r.provider; lines.push(hint(e)); }
        }
      }
      if (!results.length) lines.push('', `Unknown service "${config.aiProvider}". Use ${p}aiset to choose one.`);
      lastError = anyOk ? '' : lastError;
      if (anyOk && !isOn(config)) lines.push('', `Auto reply is off. Turn it on with ${p}autoreply on`);
      return reply(lines.join('\n'));
    }

    // .ai / .ask : works in any chat, for anyone
    if (!text) return reply(`প্রশ্ন লিখুন। উদাহরণ: ${p}ai বাংলাদেশের রাজধানী কী?`);
    if (!ai.hasKey(config)) return reply('The AI key is not set yet. Ask the owner to add it (see ai_key.txt).');
    if (!underHourlyLimit(from + ':cmd')) return reply('Too many questions for now. Please try again later.');
    try { await sock.sendPresenceUpdate('composing', from); } catch (e) {}
    try {
      const out = clean(await ai.ask(config, { system: systemPrompt(config), history: recall(from), text: text.slice(0, 1500) }));
      remember(from, 'user', text.slice(0, 1500));
      remember(from, 'assistant', out);
      await reply(out);
    } catch (e) {
      lastError = describe(e);
      console.log('.ai failed:', lastError);
      await reply(
        'দুঃখিত, এখন উত্তর দিতে পারছি না। একটু পরে আবার চেষ্টা করুন।' +
          (isOwner ? `\n\n⚠️ (শুধু আপনি দেখছেন)\nকারণ: ${lastError}\n${hint(e)}` : '')
      );
    }
  },
};
