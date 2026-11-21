const fs = require('fs');
const path = require('path');
const dl = require('../lib/dl');

const SITES = {
  xnxx: /^(?:www\.|m\.)?xnxx\.com$/i,
  xvideos: /^(?:www\.|m\.)?xvideos\.com$/i,
};

module.exports = {
  name: 'adult-video-download',
  command: ['xnxx', 'xvideos'],
  menu: [], // deliberately excluded from the public menu
  category: 'Download',
  desc: 'Private-chat only: .xnxx <url> | .xvideos <url>',
  async run({ sock, msg, from, reply, text, command, config }) {
    if (from.endsWith('@g.us') || from === 'status@broadcast') {
      return reply('🔒 This command is available in private chat only.');
    }
    const url = String(text || '').trim().split(/\s+/)[0];
    let valid = false;
    try {
      const parsed = new URL(url);
      valid = parsed.protocol === 'https:' && SITES[command].test(parsed.hostname);
    } catch (_) {}
    if (!valid) return reply('Usage: ' + (config.prefix || '.') + command + ' <https video URL>\nOnly use legal, consensual adult content you are authorized to download.');

    await reply('⏳ Downloading video, please wait...');
    try {
      await dl.limited(async () => {
        const job = dl.newJob();
        try {
          const bin = await dl.ytdlp();
          const ff = dl.ffmpegPath();
          await dl.run(bin, [
            '--no-playlist', '--no-warnings', '--max-filesize', '75M',
            '--match-filter', 'duration<=1500',
            '-o', path.join(job.dir, '%(id)s.%(ext)s'),
            '-f', ff ? 'bv*+ba/b' : 'b[ext=mp4]/b',
            ...(ff ? ['--ffmpeg-location', ff, '--merge-output-format', 'mp4'] : []),
            ...dl.cookiesArgs(command), '--', url,
          ], 240000);
          const files = job.files().filter(f => /\.(mp4|webm|mkv|mov)$/i.test(f));
          if (!files.length) return reply('No downloadable video found.');
          let file = files[0];
          try {
            const converted = await dl.makePlayable(file, job.dir, {
              crf: config.videoCrf, maxSide: config.videoMaxSide || 720,
            });
            if (converted) file = converted;
          } catch (e) { console.log('Video conversion failed:', e.message); }
          const buf = fs.readFileSync(file);
          if (buf.length > 80 * 1024 * 1024) return reply('Video exceeds the 80 MB send limit.');
          if (path.extname(file).toLowerCase() === '.mp4') {
            await sock.sendMessage(from, { video: buf, mimetype: 'video/mp4', caption: '📥 Download complete' }, { quoted: msg });
          } else {
            await sock.sendMessage(from, { document: buf, mimetype: 'application/octet-stream', fileName: 'video' + path.extname(file) }, { quoted: msg });
          }
        } finally { job.clean(); }
      });
    } catch (e) {
      console.log('Adult downloader error:', String(e.message).slice(0, 180));
      return reply('❌ Download unavailable. Check the link, site restrictions and hosting support.');
    }
  },
};
