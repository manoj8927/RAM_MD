const fs = require('fs');
const path = require('path');
const dl = require('../lib/dl');

const HOSTS = {
  facebook: /^(?:www\.|m\.|web\.|mbasic\.)?(?:facebook\.com|fb\.watch|fb\.com)$/i,
  tiktok: /^(?:www\.|m\.|vm\.|vt\.)?tiktok\.com$/i,
};

function validUrl(value, platform) {
  try {
    const u = new URL(value);
    return ['https:', 'http:'].includes(u.protocol) && HOSTS[platform].test(u.hostname);
  } catch (_) { return false; }
}

module.exports = {
  name: 'social-download',
  command: ['facebook', 'fb', 'tiktok', 'tt'],
  menu: ['facebook', 'tiktok'],
  category: 'Download',
  desc: '.facebook <public video URL> | .tiktok <public video URL>',
  async run({ sock, msg, from, reply, text, command, config }) {
    const platform = ['facebook', 'fb'].includes(command) ? 'facebook' : 'tiktok';
    const prefix = config.prefix || '.';
    const url = (text || '').trim().split(/\s+/)[0];
    if (!validUrl(url, platform)) {
      const sample = platform === 'facebook'
        ? 'https://www.facebook.com/watch/?v=VIDEO_ID'
        : 'https://www.tiktok.com/@creator/video/VIDEO_ID';
      return reply('📥 *' + platform.toUpperCase() + ' DOWNLOADER*\n\nUsage: ' +
        prefix + (platform === 'facebook' ? 'facebook' : 'tiktok') + ' ' + sample +
        '\n\nOnly download videos you own or have permission to save.');
    }

    await reply('⏳ Fetching ' + platform + ' video, please wait...');
    try {
      await dl.limited(async () => {
        const job = dl.newJob();
        try {
          const bin = await dl.ytdlp();
          const ff = dl.ffmpegPath();
          const args = [
            '--no-playlist', '--no-warnings',
            '--max-filesize', '75M',
            '--match-filter', 'duration<=1500',
            '-o', path.join(job.dir, '%(id)s.%(ext)s'),
            '-f', ff ? 'bv*+ba/b' : 'b[ext=mp4]/b',
            ...(ff ? ['--ffmpeg-location', ff, '--merge-output-format', 'mp4'] : []),
            ...dl.cookiesArgs(platform),
            '--', url,
          ];
          await dl.run(bin, args, 240000);
          const files = job.files().filter(f => /\.(mp4|webm|mkv|mov)$/i.test(f));
          if (!files.length) return reply('No downloadable video found at that link.');
          let file = files[0];
          try {
            const playable = await dl.makePlayable(file, job.dir, {
              crf: config.videoCrf,
              maxSide: config.videoMaxSide || 1080,
            });
            if (playable) file = playable;
          } catch (e) { console.log('Social video conversion:', e.message); }
          const buffer = fs.readFileSync(file);
          if (buffer.length > 80 * 1024 * 1024) return reply('This video is too large to send (80 MB limit).');
          if (path.extname(file).toLowerCase() === '.mp4') {
            await sock.sendMessage(from, {
              video: buffer, mimetype: 'video/mp4',
              caption: '🎬 *' + platform.toUpperCase() + ' VIDEO*\n⚡ ' + (config.botName || 'RAM-MD'),
            }, { quoted: msg });
          } else {
            await sock.sendMessage(from, {
              document: buffer, mimetype: 'application/octet-stream',
              fileName: platform + path.extname(file),
              caption: '📥 ' + platform.toUpperCase() + ' video',
            }, { quoted: msg });
          }
        } finally { job.clean(); }
      });
    } catch (e) {
      console.log(platform + ' download failed:', String(e.full || e.message).slice(-500));
      const error = String(e.full || e.message || '');
      if (/login|sign in|private|403|cookies|not available/i.test(error)) {
        return reply('This video may require login, be private, or be unavailable. Only use content you are allowed to access.');
      }
      return reply('❌ Download failed: ' + String(e.message).slice(0, 150));
    }
  },
};
