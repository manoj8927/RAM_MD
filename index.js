const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  jidNormalizedUser,
  fetchLatestBaileysVersion,
} = require('@whiskeysockets/baileys');
const pino = require('pino');
const fs = require('fs');
const path = require('path');
const config = require('./config');
require('./lib/store').applySaved(config); // settings changed from WhatsApp survive a restart

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const plugins = new Map();
let starting = false;
let reconnectTimer = null;
let reconnectDelay = 5000;
let connectionNoticeSent = false;

// ---------- Plugin loader ----------
function loadPlugins() {
  plugins.clear();
  const dir = path.join(__dirname, 'plugins');
  for (const file of fs.readdirSync(dir).filter((f) => f.endsWith('.js'))) {
    const full = path.join(dir, file);
    try {
      delete require.cache[require.resolve(full)];
      const plugin = require(full);
      for (const cmd of [].concat(plugin.command || [])) {
        plugins.set(cmd.toLowerCase(), plugin);
      }
      console.log('Plugin loaded:', file);
    } catch (e) {
      console.error('Plugin error in', file, '-', e.message);
    }
  }
}
const uniquePlugins = () => [...new Set(plugins.values())];

// ---------- Helpers ----------
function getText(msg) {
  const m = msg.message || {};
  // a tap on a button or list row arrives as a reply that carries the command we put in its id
  let tapped = '';
  const flow = m.interactiveResponseMessage?.nativeFlowResponseMessage?.paramsJson;
  if (flow) {
    try { tapped = JSON.parse(flow).id || ''; } catch (e) {}
  }
  return (
    m.conversation ||
    m.extendedTextMessage?.text ||
    m.imageMessage?.caption ||
    m.videoMessage?.caption ||
    tapped ||
    m.buttonsResponseMessage?.selectedButtonId ||
    m.templateButtonReplyMessage?.selectedId ||
    m.listResponseMessage?.singleSelectReply?.selectedRowId ||
    ''
  );
}

const isOwner = (msg) => {
  if (msg.key.fromMe) return true;
  const jid = msg.key.participant || msg.key.remoteJid;
  const num = jidNormalizedUser(jid).split('@')[0];
  return config.owners.includes(num);
};

// ---------- Main ----------
// React to a status. WhatsApp changed how people are addressed (@lid), so we try
// a few ways in turn. Sending the same reaction twice is harmless: the last one wins.
async function reactToStatus(sock, msg, emoji) {
  const k = msg.key;
  const norm = (j) => jidNormalizedUser(j);
  const ids = [k.participantPn, k.participantAlt, k.participant, msg.participant].filter(Boolean).map(norm);
  const pn = [...new Set(ids.filter((j) => j.endsWith('@s.whatsapp.net')))];
  const lid = [...new Set(ids.filter((j) => j.endsWith('@lid')))];
  const mePn = norm(sock.user.id);
  const meLid = sock.user.lid ? norm(sock.user.lid) : null;

  const attempts = [
    { name: 'status+number', to: 'status@broadcast', list: [...pn, mePn] },
    { name: 'status+lid', to: 'status@broadcast', list: [...lid, meLid].filter(Boolean), need: lid.length },
    { name: 'direct', to: pn[0] || lid[0], list: [...pn, ...lid, mePn, meLid].filter(Boolean) },
  ];

  let sent = 0;
  for (const a of attempts) {
    if (!a.to || !a.list.length || a.need === 0) continue;
    try {
      await sock.sendMessage(a.to, { react: { text: emoji, key: k } }, { statusJidList: [...new Set(a.list)] });
      sent++;
      console.log('React sent via', a.name, emoji, 'to', a.list.join(', '));
    } catch (e) {
      console.log('React failed via', a.name + ':', e.message);
    }
    await sleep(700);
  }
  if (!sent) console.log('React: every method failed for', JSON.stringify(k));
}

async function start() {
  if (starting) return;
  starting = true;
  loadPlugins();
  const { state, saveCreds } = await useMultiFileAuthState('auth');
  const { version } = await fetchLatestBaileysVersion();

  const sock = makeWASocket({
    version,
    auth: state,
    logger: pino({ level: 'silent' }),
    printQRInTerminal: false,
    markOnlineOnConnect: false,
  });

  starting = false;
  if (!sock.authState.creds.registered) {
    setTimeout(async () => {
      try {
        const code = await sock.requestPairingCode(config.phoneNumber);
        console.log('Pairing code:', code);
      } catch (e) {
        console.error('Pairing failed:', e.message);
      }
    }, 3000);
  }

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', async ({ connection, lastDisconnect }) => {
    if (connection === 'open') {
      reconnectDelay = 5000;
      console.log('Connected as', sock.user.id);
      if (config.connectionMessage !== false && !connectionNoticeSent) {
        connectionNoticeSent = true;
        const botJid = jidNormalizedUser(sock.user.id);
        const ownerNumber = (config.owners || []).find(n => /^\d{7,15}$/.test(String(n)));
        const destination = ownerNumber ? ownerNumber + '@s.whatsapp.net' : botJid;
        const started = new Date().toLocaleString('en-GB', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'short' });
        const notice = [
          '╭━━━〔 ⚡ RAM-MD ONLINE 〕━━━╮',
          '┃ ✅ *BOT CONNECTED SUCCESSFULLY*',
          '╰━━━━━━━━━━━━━━━━━━━━╯',
          '',
          '🤖 *Bot Name:* ' + (config.botName || 'RAM-MD'),
          '👑 *Owner:* ' + (config.ownerName || 'Not set'),
          '📱 *Bot Number:* ' + botJid.split('@')[0].split(':')[0],
          '🏷️ *Version:* ' + (config.version || '1.0.0'),
          '🔰 *Prefix:* ' + (config.prefix || '.'),
          '📦 *Loaded Commands:* ' + plugins.size,
          '🟢 *Status:* Online',
          '🕒 *Connected (IST):* ' + started,
          '',
          '📜 *Menu:* ' + (config.prefix || '.') + 'menu',
          '🌐 *Website:* https://ram-md.blogspot.com/',
          '💬 *Support:* https://t.me/Ramboss67',
          '',
          '✨ RAM-MD is ready to use!'
        ].join('\n');
        try {
          if (config.menuImage) {
            try {
              await sock.sendMessage(destination, { image: { url: config.menuImage }, caption: notice });
            } catch (imageError) {
              console.log('Startup image unavailable; sending text:', imageError.message);
              await sock.sendMessage(destination, { text: notice });
            }
          } else {
            await sock.sendMessage(destination, { text: notice });
          }
          console.log('Startup confirmation sent to', destination);
        } catch (noticeError) {
          console.error('Startup confirmation failed:', noticeError.message);
        }
      }
    }
    if (connection === 'close') {
      const code = lastDisconnect?.error?.output?.statusCode;
      if (code === DisconnectReason.loggedOut) {
        console.log('Logged out. Delete the auth folder and pair again.');
        process.exit(1);
      }
      if (!reconnectTimer) {
        const wait = reconnectDelay;
        reconnectDelay = Math.min(reconnectDelay * 2, 120000);
        console.log('Connection closed; reconnecting in', wait, 'ms');
        reconnectTimer = setTimeout(() => { reconnectTimer = null; start(); }, wait);
      }
    }
  });

  // Group join/leave hooks used by welcome/goodbye plugins.
  sock.ev.on('group-participants.update', async (update) => {
    for (const pl of uniquePlugins()) {
      if (typeof pl.onParticipants !== 'function') continue;
      try { await pl.onParticipants({ sock, update, config }); }
      catch (e) { console.error('Participant hook error (' + pl.name + '):', e.message); }
    }
  });

  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    if (type !== 'notify') return;

    for (const msg of messages) {
      try {
        if (!msg.message) continue;
        const from = msg.key.remoteJid;

        // ----- Auto status view + react -----
        if (from === 'status@broadcast') {
          if (msg.key.fromMe) continue;
          if (!config.autoStatusView && !config.autoStatusReact) continue;

          // Poster can come as @lid; the phone-number JID may be in participantPn/participantAlt
          const k = msg.key;
          const rawList = [k.participantPn, k.participantAlt, k.participant, msg.participant].filter(Boolean);
          const posters = [...new Set(rawList.map((j) => jidNormalizedUser(j)))];
          const mine = [sock.user.id, sock.user.lid].filter(Boolean).map((j) => jidNormalizedUser(j));
          const statusJidList = [...new Set([...posters, ...mine])];

          if (config.debug) console.log('status key:', JSON.stringify(k));

          await sleep(config.minDelay + Math.random() * (config.maxDelay - config.minDelay));

          if (config.autoStatusView) await sock.readMessages([msg.key]);

          if (config.autoStatusReact && config.emojis.length) {
            const emoji = config.emojis[Math.floor(Math.random() * config.emojis.length)];
            await reactToStatus(sock, msg, emoji);
          }
          continue;
        }

        // ----- Commands -----
        const text = getText(msg).trim();
        if (!text.startsWith(config.prefix)) {
          // Not a command: let plugins react to ordinary messages (number replies, AI auto reply).
          // Runs in the background, in order, and stops at the first plugin that handled it.
          {
            const hooks = uniquePlugins()
              .filter((pl) => typeof pl.onMessage === 'function')
              .sort((a, b) => (a.hookPriority || 0) - (b.hookPriority || 0));
            if (hooks.length) {
              const hookCtx = {
                sock, msg, from, text, config,
                isOwner: isOwner(msg),
                reply: (t) => sock.sendMessage(from, { text: t }, { quoted: msg }),
              };
              (async () => {
                for (const pl of hooks) {
                  try {
                    if (await pl.onMessage(hookCtx)) break;
                  } catch (e) {
                    console.log('Plugin hook error (' + pl.name + '):', e.message);
                  }
                }
              })();
            }
          }
          continue;
        }

        const [cmdRaw, ...args] = text.slice(config.prefix.length).split(/\s+/);
        const plugin = plugins.get(cmdRaw.toLowerCase());
        if (!plugin) continue;

        const owner = isOwner(msg);
        if (plugin.owner && !owner) {
          await sock.sendMessage(from, { text: 'Owner only command.' }, { quoted: msg });
          continue;
        }

        await plugin.run({
          sock,
          msg,
          from,
          args,
          text: args.join(' '),
          command: cmdRaw.toLowerCase(),
          config,
          isOwner: owner,
          plugins: uniquePlugins(),
          reloadPlugins: loadPlugins,
          reply: (t) => sock.sendMessage(from, { text: t }, { quoted: msg }),
        });
      } catch (e) {
        console.error('Handler error:', e);
      }
    }
  });
}

start();
