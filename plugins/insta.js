const fs = require('fs');
const path = require('path');
const dl = require('../lib/dl');
const { sendQuickReplies } = require('../lib/buttons');
const choice = require('../lib/choice');
const { senderOf } = require('../lib/choice');

const IG = /^https?:\/\/(www\.)?instagram\.com\/(reel|reels|p|tv|stories)\/[\w.\-\/]+/i;
const isStory = (u) => /instagram\.com\/stories\//i.test(u);
const hasCookies = () => dl.cookiesArgs('instagram').length > 0;
const IMAGE = /\.(jpe?g|png|webp)$/i;
const VIDEO = /\.(mp4|mov|webm)$/i;

// the options shown on the card: [button text, key used by .igq]
const OPTIONS = [
  ['🎥 HD VIDEO', 'hd'],
  ['480P', '480'],
  ['240P', '240'],
  ['🎵 AUDIO', 'audio'],
  ['🖼️ THUMBNAIL', 'thumb'],
];

// What each chat looked at last: { url, thumb, expires }
const pending = new Map();

function explain(e, reply) {
  const full = (e.full || e.message || '').toString();
  console.log('ig error:', full.slice(-500));
  if (/login|cookies|rate-limit|not available|empty media|redirect|401|403|unauthorized|forbidden|checkpoint|challenge|private/i.test(full)) {
    return reply(
      'Instagram asked for a login or blocked this request. Photo posts and private posts need a file named ' +
        'cookies-instagram.txt (exported from a logged-in browser) next to index.js. Public reels often work without it.'
    );
  }
  return reply('Failed: ' + String(e.message).slice(0, 200));
}

function clock(sec) {
  sec = Math.round(sec || 0);
  return Math.floor(sec / 60) + ':' + String(sec % 60).padStart(2, '0');
}

async function getInfo(url) {
  const bin = await dl.ytdlp();
  const { stdout } = await dl.run(bin, ['--no-warnings', '--no-playlist', ...dl.cookiesArgs('instagram'), '--dump-json', '--', url], 90000);
  return JSON.parse(stdout.trim().split('\n')[0]);
}

// Video (or photos for photo posts). side = the size picked, null = best available
async function deliverMedia(ctx, url, maxSide, side) {
  const { sock, msg, from, reply } = ctx;
  await reply('Downloading, please wait...');
  try {
    await dl.limited(async () => {
      const job = dl.newJob();
      try {
        let files = [];
        // 1) videos and reels
        try {
          const bin = await dl.ytdlp();
          const ff = dl.ffmpegPath();
          await dl.run(bin, [
            '--no-warnings', '--max-filesize', '80M', '--no-playlist',
            // with ffmpeg: join the best video and audio; without: a file that already has sound
            '-f', ff ? 'bv*+ba/b' : 'b[acodec!=none]/b',
            ...(ff && side ? ['-S', `res:${side}`] : []), // best available, or the chosen size
            ...(ff ? ['--ffmpeg-location', ff, '--merge-output-format', 'mp4'] : []),
            '-o', path.join(job.dir, '%(id)s.%(ext)s'),
            ...dl.cookiesArgs('instagram'), '--', url,
          ]);
          files = job.files();
        } catch (e) {
          // 2) photo posts and stories: yt-dlp cannot do most of those, so use gallery-dl
          const noVideo = /no video|unsupported url|unable to extract|no video formats/i.test((e.full || '') + e.message);
          if (!noVideo && !isStory(url)) throw e;
          const g = await dl.gallerydl();
          await dl.run(g, ['-D', job.dir, '--range', '1-10', ...dl.cookiesArgs('instagram'), url]);
          files = job.files();
        }

        if (!files.length) return reply('Nothing found at this link.');
        for (const f of files.slice(0, 10)) {
          const buf = fs.readFileSync(f);
          if (IMAGE.test(f)) await sock.sendMessage(from, { image: buf }, { quoted: msg });
          else if (VIDEO.test(f)) {
            let out = null;
            try { out = await dl.makePlayable(f, job.dir, { crf: ctx.config.videoCrf, maxSide }); } catch (e) { console.log('ffmpeg failed:', e.message); }
            if (out) {
              await sock.sendMessage(from, { video: fs.readFileSync(out), mimetype: 'video/mp4' }, { quoted: msg });
            } else {
              // no ffmpeg: a document always opens (in a video player app), unlike a broken video message
              await sock.sendMessage(
                from,
                { document: buf, mimetype: 'video/mp4', fileName: path.basename(f), caption: 'Open this file in a video player. (Install ffmpeg on the bot to get a playable video here.)' },
                { quoted: msg }
              );
            }
          }
        }
      } finally {
        job.clean();
      }
    });
  } catch (e) {
    return explain(e, reply);
  }
}

async function deliverAudio(ctx, url) {
  const { sock, msg, from, reply } = ctx;
  await reply('Extracting audio, please wait...');
  try {
    await dl.limited(async () => {
      const job = dl.newJob();
      try {
        const bin = await dl.ytdlp();
        const ff = dl.ffmpegPath();
        await dl.run(bin, [
          '--no-warnings', '--max-filesize', '80M', '--no-playlist', '-f', 'ba/b',
          ...(ff ? ['--ffmpeg-location', ff, '-x', '--audio-format', 'mp3', '--audio-quality', '5'] : []),
          '-o', path.join(job.dir, '%(id)s.%(ext)s'),
          ...dl.cookiesArgs('instagram'), '--', url,
        ]);
        const files = job.files();
        if (!files.length) return reply('No audio found in this post.');
        const ext = path.extname(files[0]).slice(1).toLowerCase();
        const buf = fs.readFileSync(files[0]);
        if (ext === 'mp3') await sock.sendMessage(from, { audio: buf, mimetype: 'audio/mpeg', fileName: 'instagram.mp3' }, { quoted: msg });
        else if (ext === 'm4a' || ext === 'mp4') await sock.sendMessage(from, { audio: buf, mimetype: 'audio/mp4', fileName: 'instagram.m4a' }, { quoted: msg });
        else await sock.sendMessage(from, { document: buf, mimetype: 'audio/' + ext, fileName: 'instagram.' + ext }, { quoted: msg });
      } finally {
        job.clean();
      }
    });
  } catch (e) {
    return explain(e, reply);
  }
}

async function deliverThumb(ctx, url, knownThumb) {
  const { sock, msg, from, reply } = ctx;
  try {
    const thumb = knownThumb || (await getInfo(url)).thumbnail;
    if (!thumb) return reply('No picture found for this post.');
    await sock.sendMessage(from, { image: { url: thumb } }, { quoted: msg });
  } catch (e) {
    return explain(e, reply);
  }
}

// The options card: picture, author, caption, length, and a numbered list to pick from
async function showCard(ctx, url) {
  const { sock, msg, from, reply, config } = ctx;
  const p = config.prefix;
  await reply('🔎 Getting the post, please wait...');
  let info;
  try {
    info = await getInfo(url);
  } catch (e) {
    // photo posts have no video to describe, so just fetch them
    if (/no video/i.test((e.full || '') + e.message)) return deliverMedia(ctx, url, config.videoMaxSide, null);
    return explain(e, reply);
  }

  pending.set(from, { url, thumb: info.thumbnail, expires: Date.now() + 10 * 60 * 1000 }); // for the typed .igq fallback

  const run = {
    hd: (c) => deliverMedia(c, url, config.videoMaxSide, null),
    '480': (c) => deliverMedia(c, url, 480, 480),
    '240': (c) => deliverMedia(c, url, 240, 240),
    audio: (c) => deliverAudio(c, url),
    thumb: (c) => deliverThumb(c, url, info.thumbnail),
  };
  const options = OPTIONS.map(([text, k]) => ({ label: text, run: run[k] }));

  const cap = String(info.title || info.description || '').replace(/\s+/g, ' ').trim();
  const caption =
    `📸 *INSTAGRAM DOWNLOADER*\n\n` +
    `👤 *Author:* ${info.uploader || info.channel || 'unknown'}\n` +
    (cap ? `📝 *Caption:* ${cap.slice(0, 80)}${cap.length > 80 ? '...' : ''}\n` : '') +
    (info.duration ? `⏱️ *Duration:* ${info.duration_string || clock(info.duration)}\n` : '') +
    `\n🔽 *SELECT OPTION:*\n${choice.numbered(options)}\n\n` +
    `↩️ *Reply to this message with a number.* Example: *1*\n\n` +
    `© Powered by ${config.botName || 'bot'}`;

  let sent = null;
  if (config.qualityButtons === true) { // tap buttons are optional: not every WhatsApp shows them
    const buttons = OPTIONS.map(([text, k]) => ({ text, id: `${p}igq ${k}` }));
    try { sent = await sendQuickReplies(sock, from, msg, { image: info.thumbnail, caption, footer: '', buttons }); }
    catch (e) { console.log('Buttons failed, sending a plain card:', e.message); }
  }
  if (!sent) {
    try { sent = await sock.sendMessage(from, { image: { url: info.thumbnail }, caption }, { quoted: msg }); }
    catch (e) { sent = await reply(caption); }
  }
  choice.offer(from, senderOf(msg), sent && sent.key && sent.key.id, options);
}

module.exports = {
  name: 'instagram',
  command: ['ig', 'insta', 'instagram', 'reel', 'igq'],
  menu: ['ig'],
  category: 'Download',
  desc: '.ig <reel/post/photo/story link> (reply a number) | .ig <link> 480 | .ig <link> audio',

  async run(ctx) {
    const { from, command, text, reply, config } = ctx;
    const p = config.prefix;

    // an option was tapped (or typed) after the card
    if (command === 'igq') {
      const opt = (text || '').trim().toLowerCase();
      const last = pending.get(from);
      if (!OPTIONS.some(([, k]) => k === opt)) return reply(`Pick one: ${OPTIONS.map(([, k]) => p + 'igq ' + k).join('  ')}`);
      if (!last || last.expires < Date.now()) return reply(`Nothing selected yet. Send a link first: ${p}ig <Instagram link>`);
      if (opt === 'audio') return deliverAudio(ctx, last.url);
      if (opt === 'thumb') return deliverThumb(ctx, last.url, last.thumb);
      if (opt === 'hd') return deliverMedia(ctx, last.url, config.videoMaxSide, null);
      return deliverMedia(ctx, last.url, Number(opt), Number(opt)); // 480 or 240
    }

    // optional words at the end: a size (144 ... 2k), "audio" or "thumb"
    const q = dl.parseQuality(text);
    const words = q.text.split(/\s+/);
    const url = words[0] || '';
    const rest = words.slice(1).map((w) => w.toLowerCase());
    if (!IG.test(url)) {
      return reply(
        `Send an Instagram link (reel, post, photo or story):\n${p}ig https://www.instagram.com/reel/XXXX/\n${p}ig https://www.instagram.com/stories/username/XXXX/  (needs cookies)\n\n` +
          `Extra (optional, at the end): 144 240 360 480 720 1080 2k | audio | thumb\nExample: ${p}ig <link> 480`
      );
    }

    if (isStory(url)) {
      if (!hasCookies()) {
        return reply(
          'Stories need a login. Put a file named cookies-instagram.txt (exported from a logged-in browser) ' +
            'next to index.js, then send the story link again.'
        );
      }
      return deliverMedia(ctx, url, config.videoMaxSide, null); // every item of the story is sent
    }

    if (rest.includes('audio') || rest.includes('mp3')) return deliverAudio(ctx, url);
    if (rest.includes('thumb') || rest.includes('thumbnail')) return deliverThumb(ctx, url);
    if (q.side) return deliverMedia(ctx, url, q.side, q.side);
    if (config.askQuality === false) return deliverMedia(ctx, url, config.videoMaxSide, null);
    return showCard(ctx, url);
  },
};
