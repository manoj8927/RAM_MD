const fs = require('fs');
const path = require('path');
const dl = require('../lib/dl');
const { sendQuickReplies } = require('../lib/buttons');
const choice = require('../lib/choice');
const { senderOf } = require('../lib/choice');

const YT_HOST = /^(www\.|m\.|music\.)?(youtube\.com|youtu\.be)$/i;
const AUDIO_CMDS = ['ytmp3', 'song', 'play'];
const CHOICES = [
  { text: '360P', side: 360 },
  { text: '480P', side: 480 },
  { text: '720P', side: 720 },
  { text: '1080P', side: 1080 },
  { text: '2K', side: 1440 },
];

// What each chat picked last: { target, expires }  (used by .vq after a quality card)
const pending = new Map();

function toTarget(input) {
  const t = input.trim();
  if (/^https?:\/\//i.test(t)) {
    let u;
    try { u = new URL(t); } catch (e) { return null; }
    return YT_HOST.test(u.hostname) ? t : null;
  }
  return 'ytsearch1:' + t; // a plain name = search, first result
}

function clock(sec) {
  sec = Math.round(sec || 0);
  const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60;
  const mm = h ? String(m).padStart(2, '0') : m;
  return (h ? h + ':' : '') + mm + ':' + String(s).padStart(2, '0');
}

// Download and send. audio = mp3/m4a, otherwise video at the chosen size.
async function deliver(ctx, target, audio, chosenSide) {
  const { sock, msg, from, reply, config, command } = ctx;
  await reply(audio ? 'Downloading audio, please wait...' : 'Downloading video, please wait...');

  try {
    await dl.limited(async () => {
      const job = dl.newJob();
      try {
        const bin = await dl.ytdlp();
        const ff = dl.ffmpegPath();
        const side = chosenSide || Math.min(1080, Number(config.ytMaxHeight) || 1080);
        const titleFile = path.join(job.dir, 'title.txt');
        const args = [
          '--no-playlist', '--no-warnings',
          '--js-runtimes', 'node', // YouTube now needs a JavaScript runtime
          '--max-filesize', '80M',
          '--match-filter', 'duration<=1500', // up to 25 minutes
          '--restrict-filenames',
          '--print-to-file', '%(title)s', titleFile,
          '-o', path.join(job.dir, '%(id)s.%(ext)s'),
          ...dl.cookiesArgs('youtube'),
        ];
        // An ffmpeg-static binary without ffprobe cannot convert to MP3.
        // Without both tools, download an already encoded M4A/other audio
        // instead of failing in yt-dlp's postprocessing phase.
        const audioTools = audio ? dl.audioPostprocessor() : null;
        if (audio) {
          if (audioTools) {
            if (audioTools.location) args.push('--ffmpeg-location', audioTools.location);
            args.push('-f', 'bestaudio', '-x', '--audio-format', 'mp3', '--audio-quality', '5');
          } else {
            args.push('-f', 'bestaudio[ext=m4a]/bestaudio[acodec^=mp4a]/bestaudio');
          }
        } else if (ff) {
          args.push('--ffmpeg-location', ff);
          // best picture up to the chosen size, H.264 preferred; res = the shorter side, so Shorts work too
          args.push('-f', 'bv*+ba/b', '-S', `res:${side},vcodec:h264,acodec:aac`, '--merge-output-format', 'mp4');
        } else {
          // without ffmpeg only ready-made single files exist (up to 720p)
          args.push('-f', 'b[ext=mp4]/b', '-S', `res:${Math.min(side, 720)}`);
        }
        args.push('--', target);

        await dl.run(bin, args);

        const files = job.files();
        if (!files.length) return reply('Nothing downloaded. The video may be too long (max 25 min), too big, or unavailable.');
        let file = files[0];
        if (!audio) {
          try {
            const fixed = await dl.makePlayable(file, job.dir, { crf: config.videoCrf, maxSide: side });
            if (fixed) file = fixed;
          } catch (e) { console.log('ffmpeg failed:', e.message); }
        }
        const ext = path.extname(file).slice(1).toLowerCase();
        let title = 'media';
        try { title = fs.readFileSync(titleFile, 'utf8').trim() || title; } catch (e) {}
        const safe = title.replace(/[\\/:*?"<>|]/g, '').slice(0, 80);
        const buf = fs.readFileSync(file);

        if (audio) {
          if (ext === 'mp3') await sock.sendMessage(from, { audio: buf, mimetype: 'audio/mpeg', fileName: safe + '.mp3' }, { quoted: msg });
          else if (ext === 'm4a') await sock.sendMessage(from, { audio: buf, mimetype: 'audio/mp4', fileName: safe + '.m4a' }, { quoted: msg });
          else await sock.sendMessage(from, { document: buf, mimetype: 'audio/' + ext, fileName: safe + '.' + ext }, { quoted: msg });
        } else if (ext === 'mp4') {
          await sock.sendMessage(from, { video: buf, mimetype: 'video/mp4', caption: title }, { quoted: msg });
        } else {
          await sock.sendMessage(from, { document: buf, mimetype: 'video/' + ext, fileName: safe + '.' + ext, caption: title }, { quoted: msg });
        }
      } finally {
        job.clean();
      }
    });
  } catch (e) {
    const full = (e.full || e.message || '').toString();
    if (/not a bot|sign in|confirm you/i.test(full)) {
      return reply('YouTube asked for a sign-in check. Add a file named cookies-youtube.txt (exported from a logged-in browser) next to index.js and try again.');
    }
    if (/ffprobe and ffmpeg not found|ffmpeg and ffprobe not found|Postprocessing: ffprobe/i.test(full)) {
      return reply('Audio conversion tools are unavailable. Restart the updated bot; it will fall back to M4A without FFmpeg. For MP3, install both ffmpeg and ffprobe.');
    }
    console.log('yt error:', full.slice(-500));
    return reply('Failed: ' + String(e.message).slice(0, 200));
  }
}

// Show the video card (picture, title, author, length) with a numbered list to pick from
async function showCard(ctx, target) {
  const { sock, msg, from, reply, config } = ctx;
  const p = config.prefix;
  await reply('🔎 Searching, please wait...');
  let info;
  try {
    const bin = await dl.ytdlp();
    const { stdout } = await dl.run(bin, [
      '--no-playlist', '--no-warnings', '--js-runtimes', 'node', ...dl.cookiesArgs('youtube'),
      '--dump-json', '--', target,
    ], 90000);
    info = JSON.parse(stdout.trim().split('\n')[0]);
  } catch (e) {
    console.log('yt info error:', (e.full || e.message || '').slice(-300));
    return reply('Could not find that video. ' + String(e.message).slice(0, 150));
  }

  if (info.duration && info.duration > 1500) return reply('This video is longer than 25 minutes, so it cannot be downloaded.');

  const url = info.webpage_url || target;
  pending.set(from, { target: url, expires: Date.now() + 10 * 60 * 1000 }); // for the typed .vq fallback

  const options = [
    ...CHOICES.map((c) => ({ label: c.text, run: (c2) => deliver(c2, url, false, c.side) })),
    { label: '🎵 AUDIO (MP3)', run: (c2) => deliver(c2, url, true, null) },
  ];

  const thumb = info.id ? `https://i.ytimg.com/vi/${info.id}/hqdefault.jpg` : info.thumbnail;
  const caption =
    `🎬 *YOUTUBE VIDEO DOWNLOADER*\n\n` +
    `📝 *Title:* ${info.title}\n` +
    `👤 *Author:* ${info.uploader || info.channel || 'unknown'}\n` +
    `⏱️ *Duration:* ${info.duration_string || clock(info.duration)}\n\n` +
    `🔽 *SELECT QUALITY:*\n${choice.numbered(options)}\n\n` +
    `↩️ *Reply to this message with a number.* Example: *3*\n\n` +
    `© Powered by ${config.botName || 'bot'}`;

  let sent = null;
  if (config.qualityButtons === true) { // tap buttons are optional: not every WhatsApp shows them
    try {
      sent = await sendQuickReplies(sock, from, msg, {
        image: thumb, caption, footer: '',
        buttons: CHOICES.map((c) => ({ text: c.text, id: `${p}vq ${c.text.toLowerCase()}` })),
      });
    } catch (e) {
      console.log('Buttons failed, sending a plain card:', e.message);
    }
  }
  if (!sent) {
    try { sent = await sock.sendMessage(from, { image: { url: thumb }, caption }, { quoted: msg }); }
    catch (e) { sent = await reply(caption); }
  }
  choice.offer(from, senderOf(msg), sent && sent.key && sent.key.id, options);
}

module.exports = {
  name: 'youtube',
  command: ['ytmp4', 'ytmp3', 'song', 'play', 'video', 'vq'],
  menu: ['ytmp4', 'ytmp3', 'song', 'video'],
  category: 'Download',
  desc: '.video <name> (reply a number) | .ytmp4 <link> [quality] | .ytmp3 | .song <name>',

  async run(ctx) {
    const { from, command, text, reply, config } = ctx;
    const p = config.prefix;

    // a quality was tapped (or typed) after the card
    if (command === 'vq') {
      const side = dl.parseQuality('x ' + (text || '')).side;
      const last = pending.get(from);
      if (!side) return reply(`Pick a quality: ${CHOICES.map((c) => p + 'vq ' + c.text.toLowerCase()).join(' ')}`);
      if (!last || last.expires < Date.now()) return reply(`Nothing selected yet. Search first, for example: ${p}video despacito`);
      return deliver(ctx, last.target, false, side);
    }

    if (!text) {
      return reply(
        `*YouTube downloader*\n${p}video <name>: shows the video, then reply with a number to pick the quality\n` +
          `${p}ytmp4 <link or name> [quality]: video\n${p}ytmp3 <link or name>: audio\n${p}song <name>: audio (searches YouTube)\n\n` +
          `Quality (optional, at the end): 144 240 360 480 720 1080 2k\nExample: ${p}ytmp4 https://youtu.be/xxxx 480`
      );
    }

    const audio = AUDIO_CMDS.includes(command);
    const q = audio ? { text, side: null } : dl.parseQuality(text);
    if (!q.text) return reply(`Add a link or name before the quality. Example: ${p}${command} despacito 720`);
    const target = toTarget(q.text);
    if (!target) return reply('Only YouTube links work here. Send a YouTube link or a song or video name.');

    if (audio) return deliver(ctx, target, true, null);
    // video: with a quality typed, download now; otherwise show the card to choose
    if (q.side || config.askQuality === false) return deliver(ctx, target, false, q.side);
    return showCard(ctx, target);
  },
};
