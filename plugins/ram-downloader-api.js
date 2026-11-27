'use strict';

// RAM Downloader API integration for the RAM_MD plugin loader.
// Existing YouTube/Instagram/Facebook/TikTok commands are deliberately untouched.
// Requires Node.js 18+ (built-in fetch).

const DEFAULT_BASE = 'https://api.smp-tech.eu.cc';
const SUPPORTED = [
  ['youtube', ['youtube.com', 'youtu.be']],
  ['instagram', ['instagram.com', 'instagr.am']],
  ['facebook', ['facebook.com', 'fb.com', 'fb.watch']],
  ['tiktok', ['tiktok.com']],
  ['twitter', ['twitter.com', 'x.com']],
  ['pinterest', ['pinterest.com', 'pin.it']],
  ['soundcloud', ['soundcloud.com']],
];

function platformFromURL(input) {
  let parsed;
  try { parsed = new URL(input); } catch (_) { return null; }
  if (parsed.protocol !== 'https:') return null;
  if (parsed.username || parsed.password || parsed.port) return null;
  const host = parsed.hostname.toLowerCase();
  for (const [platform, domains] of SUPPORTED) {
    if (domains.some(domain => host === domain || host.endsWith('.' + domain))) return platform;
  }
  return null;
}

function bestFormat(data, platform) {
  const list = Array.isArray(data?.formats) ? data.formats : [];
  const https = f => f && typeof f.url === 'string' && /^https:\/\//i.test(f.url);
  const hasAudio = f => f.audio && f.audio !== 'none';
  const hasVideo = f => f.video && f.video !== 'none';
  const ext = f => String(f.extension || '').toLowerCase();
  // WhatsApp video needs video and audio in a *single* MP4.
  const video = list.filter(f => https(f) && ext(f) === 'mp4' && hasAudio(f) && hasVideo(f));
  const cap = Math.max(144, Math.min(1080, Number(process.env.RAM_DOWNLOADER_MAX_HEIGHT) || 720));
  video.sort((a, b) => {
    const score = f => {
      const h = Number(f.height) || 0;
      return (h <= cap ? 10000 : 0) + Math.min(h, cap);
    };
    return score(b) - score(a);
  });
  if (video.length) return { type: 'video', url: video[0].url, ext: 'mp4' };

  // SoundCloud commonly exposes only audio formats.
  if (platform === 'soundcloud') {
    const audio = list.find(f => https(f) && hasAudio(f) && !hasVideo(f) && ['mp3', 'm4a'].includes(ext(f)));
    if (audio) return { type: 'audio', url: audio.url, ext: ext(audio) };
  }
  return null;
}

async function apiJSON(route, key, source) {
  const base = (process.env.RAM_DOWNLOADER_API_URL || DEFAULT_BASE).replace(/\/+$/, '');
  const baseURL = new URL(base);
  if (baseURL.protocol !== 'https:') throw new Error('API_URL must use https');
  const endpoint = new URL(route, baseURL.origin);
  if (source) endpoint.searchParams.set('url', source);
  const response = await fetch(endpoint, {
    headers: {
      Accept: 'application/json',
      ...(key ? { 'x-api-key': key } : {}),
    },
    signal: AbortSignal.timeout(source ? 75000 : 12000),
  });
  if (!response.ok) {
    const error = new Error('HTTP ' + response.status);
    error.status = response.status;
    throw error;
  }
  return response.json();
}

module.exports = {
  name: 'RAM Downloader API',
  command: ['ramapi', 'ramdl'],
  menu: ['ramapi', 'ramdl'],
  category: 'Download',
  desc: '.ramapi (status) | .ramdl <public video or SoundCloud link>',
  async run({ sock, msg, from, command, text, reply, config }) {
    if (command === 'ramapi') {
      try {
        const info = await apiJSON('/api/status');
        return reply(info?.status === true
          ? '✅ RAM Downloader API is online\n🌐 ' + (process.env.RAM_DOWNLOADER_API_URL || DEFAULT_BASE)
          : '⚠️ RAM Downloader API returned an unexpected status.');
      } catch (error) {
        return reply('❌ RAM Downloader API is unreachable (' + (error.status || error.name || 'network error') + ').');
      }
    }

    const source = String(text || '').trim().split(/\s+/)[0];
    const platform = platformFromURL(source);
    const prefix = config.prefix || '.';
    if (!platform) {
      return reply('📥 *RAM DOWNLOADER API*\nUsage: ' + prefix +
        'ramdl https://www.facebook.com/...\n\nSupported public links: YouTube, Instagram, Facebook, TikTok, Twitter/X, Pinterest, SoundCloud.');
    }

    const key = process.env.RAM_DOWNLOADER_API_KEY;
    if (!key) return reply('⚠️ RAM Downloader API key is not set on this bot host. Configure RAM_DOWNLOADER_API_KEY privately.');

    try {
      await reply('⏳ Extracting public ' + platform + ' media with RAM API...');
      const data = await apiJSON('/api/' + platform, key, source);
      if (data?.status !== true) return reply('❌ This link could not be extracted (private, unavailable or blocked media).');
      if (Number(data.duration) > 1500) return reply('❌ Media is longer than 25 minutes. Please use a shorter clip.');
      const media = bestFormat(data, platform);
      if (!media) {
        return reply('⚠️ The API returned metadata, but no ready-to-send video with audio (or supported SoundCloud audio). ' +
          'Try the existing ' + prefix + 'video / ' + prefix + 'fb / ' + prefix + 'ig / ' + prefix + 'tiktok commands.');
      }
      if (media.type === 'audio') {
        return sock.sendMessage(from, {
          audio: { url: media.url },
          mimetype: media.ext === 'mp3' ? 'audio/mpeg' : 'audio/mp4',
          fileName: 'ram-audio.' + media.ext,
        }, { quoted: msg });
      }
      return sock.sendMessage(from, {
        video: { url: media.url },
        mimetype: 'video/mp4',
        caption: '🎬 *RAM DOWNLOADER API*\n📝 ' +
          String(data.title || platform + ' video').slice(0, 180) +
          '\n⚡ ' + (config.botName || 'RAM-MD'),
      }, { quoted: msg });
    } catch (error) {
      // Do not log secret API keys or short-lived signed media URLs.
      console.log('[ramdl] error:', error.status || error.code || error.name);
      if (error.status === 401) return reply('❌ Invalid RAM API key. Verify RAM_DOWNLOADER_API_KEY on the bot host.');
      if (error.status === 429) return reply('❌ API busy or rate-limited. Try later.');
      if (error.status === 502) return reply('❌ The source could not be extracted by the RAM API (HTTP 502).');
      return reply('❌ RAM Downloader failed. The link may have expired or require media headers. Existing download commands remain available.');
    }
  },
};
