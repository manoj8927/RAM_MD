// Helpers for the download plugins: tools (yt-dlp, gallery-dl, ffmpeg), temp folders, limits
const fs = require('fs');
const path = require('path');
const { execFile, execFileSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const BIN = path.join(ROOT, 'bin');
const TMP = path.join(ROOT, 'tmp');
fs.mkdirSync(BIN, { recursive: true });
fs.mkdirSync(TMP, { recursive: true });

const LINUX_ARM = process.arch === 'arm64';
const YTDLP_FILE = LINUX_ARM ? 'yt-dlp_linux_aarch64' : 'yt-dlp_linux';
const YTDLP_URLS = [
  'https://github.com/yt-dlp/yt-dlp/releases/latest/download/' + YTDLP_FILE,
  'https://github.com/yt-dlp/yt-dlp-nightly-builds/releases/latest/download/' + YTDLP_FILE,
];
const GH = { 'User-Agent': 'status-bot', Accept: 'application/vnd.github+json' };

// gallery-dl: the "latest" link is not always valid (a release can lack the Linux file), so look
// for a release that really has it, then the daily builds, then one known version.
async function galleryUrls() {
  const urls = [];
  try {
    const res = await fetch('https://api.github.com/repos/mikf/gallery-dl/releases?per_page=8', { headers: GH });
    if (res.ok) {
      for (const r of await res.json()) {
        const a = (r.assets || []).find((x) => x.name === 'gallery-dl.bin');
        if (a) urls.push(a.browser_download_url);
      }
    }
  } catch (e) {}
  try {
    const res = await fetch('https://api.github.com/repos/gdl-org/builds/releases/latest', { headers: GH });
    if (res.ok) {
      const r = await res.json();
      const a = (r.assets || []).find((x) => x.name === 'gallery-dl_linux');
      if (a) urls.push(a.browser_download_url);
    }
  } catch (e) {}
  urls.push('https://github.com/mikf/gallery-dl/releases/download/v1.31.10/gallery-dl.bin');
  return [...new Set(urls)];
}

const pending = {};

async function fetchTo(url, dest) {
  const res = await fetch(url, { redirect: 'follow' });
  if (!res.ok) throw new Error('HTTP ' + res.status);
  fs.writeFileSync(dest, Buffer.from(await res.arrayBuffer()));
  fs.chmodSync(dest, 0o755);
}

// urls: a string, a list, or a function that returns a list. Tries each until one works.
function ensureBinary(name, urls) {
  const file = path.join(BIN, name);
  if (fs.existsSync(file) && fs.statSync(file).size > 1e6) return Promise.resolve(file);
  if (!pending[name]) {
    pending[name] = (async () => {
      const list = [].concat(typeof urls === 'function' ? await urls() : urls);
      const part = file + '.part';
      const errors = [];
      for (const u of list) {
        try {
          await fetchTo(u, part);
          fs.renameSync(part, file);
          return file;
        } catch (e) {
          errors.push(e.message);
        }
      }
      fs.rmSync(part, { force: true });
      throw new Error('Could not download ' + name + ' (' + errors.join(', ') + '). Check that the bot can reach github.com.');
    })().finally(() => delete pending[name]);
  }
  return pending[name];
}

let updateChecked = false;
function maybeUpdate(file) {
  if (updateChecked) return;
  updateChecked = true;
  try {
    const ageDays = (Date.now() - fs.statSync(file).mtimeMs) / 86400000;
    if (ageDays > 3) {
      // YouTube and Instagram change often, so keep yt-dlp fresh
      execFile(file, ['-U'], { timeout: 90000 }, () => {
        try { fs.utimesSync(file, new Date(), new Date()); } catch (e) {}
      });
    }
  } catch (e) {}
}

async function ytdlp() {
  if (process.env.YTDLP_PATH) return process.env.YTDLP_PATH;
  if (process.platform !== 'linux') return 'yt-dlp'; // must be installed on PATH
  const file = await ensureBinary('yt-dlp', YTDLP_URLS);
  maybeUpdate(file);
  return file;
}

async function gallerydl() {
  if (process.env.GALLERYDL_PATH) return process.env.GALLERYDL_PATH;
  if (process.platform !== 'linux' || process.arch !== 'x64') return 'gallery-dl'; // the ready-made file is for x86-64 Linux only
  return ensureBinary('gallery-dl', galleryUrls);
}

let ffmpegCache;
function ffmpegPath() {
  if (ffmpegCache !== undefined) return ffmpegCache;
  ffmpegCache = null;
  try {
    const p = require('ffmpeg-static');
    if (p && fs.existsSync(p)) return (ffmpegCache = p);
  } catch (e) {}
  try {
    execFileSync('ffmpeg', ['-version'], { stdio: 'ignore' });
    ffmpegCache = 'ffmpeg';
  } catch (e) {}
  return ffmpegCache;
}


// yt-dlp MP3 extraction needs both ffmpeg AND ffprobe. A bundled
// ffmpeg-static binary alone is not sufficient for postprocessing.
function audioPostprocessor() {
  // Prefer a complete system installation when both tools are on PATH.
  try {
    execFileSync('ffmpeg', ['-version'], {stdio:'ignore', timeout:10000});
    execFileSync('ffprobe', ['-version'], {stdio:'ignore', timeout:10000});
    return {location: null, format:'mp3'};
  } catch (_) {}

  // Alternatively use a folder holding both executable files.
  // Useful for hosts where PATH cannot be configured.
  const dir = process.env.FFMPEG_LOCATION || path.join(BIN, 'ffmpeg-tools');
  try {
    const ff = path.join(dir, process.platform === 'win32' ? 'ffmpeg.exe' : 'ffmpeg');
    const fp = path.join(dir, process.platform === 'win32' ? 'ffprobe.exe' : 'ffprobe');
    if (fs.existsSync(ff) && fs.existsSync(fp)) {
      execFileSync(ff, ['-version'], {stdio:'ignore', timeout:10000});
      execFileSync(fp, ['-version'], {stdio:'ignore', timeout:10000});
      return {location:dir, format:'mp3'};
    }
  } catch (_) {}

  // No safe conversion available. yt-dlp can download a ready-to-play M4A.
  return null;
}

// Optional cookies (Netscape format), next to index.js:
//   cookies-youtube.txt / cookies-instagram.txt  (one per site), or
//   cookies.txt                                  (used when no site file exists)
function cookiesArgs(site) {
  const names = [site ? 'cookies-' + site + '.txt' : null, 'cookies.txt'].filter(Boolean);
  for (const n of names) {
    const f = path.join(ROOT, n);
    if (fs.existsSync(f)) return ['--cookies', f];
  }
  return [];
}

function run(bin, args, timeout = 240000) {
  return new Promise((resolve, reject) => {
    execFile(bin, args, { timeout, maxBuffer: 20 * 1024 * 1024 }, (err, stdout, stderr) => {
      if (err) {
        const text = String(stderr || err.message || '').trim();
        const last = text.split('\n').filter(Boolean).pop() || 'failed';
        const e = new Error(last.replace(/^ERROR:\s*/, ''));
        e.full = text;
        return reject(e);
      }
      resolve({ stdout, stderr });
    });
  });
}


// Instagram reels often come in codecs WhatsApp cannot play ("something is wrong with the
// video file"). Re-encode to H.264 + AAC, which every phone plays. Needs ffmpeg.
async function toWhatsAppVideo(file, dir, opts = {}) {
  const ff = ffmpegPath();
  if (!ff) return null;
  const crf = String(opts.crf ?? 20);            // lower = better quality and bigger file (18 to 28)
  const side = Math.max(144, Math.min(2160, opts.maxSide ?? 1440)); // limit for the shorter side
  const out = path.join(dir, 'wa-' + path.basename(file, path.extname(file)) + '.mp4');
  // never enlarge; only shrink when the shorter side is above the limit
  const scale = `scale=w='if(gte(iw,ih),-2,min(iw,${side}))':h='if(gte(iw,ih),min(ih,${side}),-2)'`;
  await run(
    ff,
    [
      '-y', '-i', file,
      '-vf', scale,
      '-c:v', 'libx264', '-preset', 'veryfast', '-crf', crf, '-pix_fmt', 'yuv420p',
      '-c:a', 'aac', '-b:a', '160k',
      '-movflags', '+faststart', '-max_muxing_queue_size', '1024',
      out,
    ],
    480000
  );
  return out;
}


// ---- quality option: ".ig <link> 480", ".ytmp4 <name> 2k" ----
const SIDES = [144, 240, 360, 480, 720, 1080, 1440];
function parseQuality(text) {
  const parts = (text || '').trim().split(/\s+/).filter(Boolean);
  const last = (parts[parts.length - 1] || '').toLowerCase();
  let side = null;
  if (last === '2k') side = 1440;
  else {
    const m = /^(\d{3,4})p?$/.exec(last);
    if (m && SIDES.includes(Number(m[1]))) side = Number(m[1]);
  }
  if (side) parts.pop();
  return { text: parts.join(' '), side };
}

// What is inside a video file (codecs, size), read from ffmpeg's own report
function probe(ff, file) {
  return new Promise((resolve) => {
    execFile(ff, ['-hide_banner', '-i', file], { timeout: 30000, maxBuffer: 5 * 1024 * 1024 }, (err, so, se) => {
      const t = String(se || '');
      const v = /Video: (\w+)/.exec(t);
      const a = /Audio: (\w+)/.exec(t);
      const px = /Video: [^\n]*?, (yuv\w+)/.exec(t);
      const dim = /Video: [^\n]*?, (\d{2,5})x(\d{2,5})/.exec(t);
      resolve({ v: v && v[1], a: a && a[1], pix: px && px[1], w: dim ? +dim[1] : 0, h: dim ? +dim[2] : 0 });
    });
  });
}

// Returns a file WhatsApp can play. Keeps the original when it already is H.264/AAC and
// within the size limit (no quality loss); otherwise re-encodes. null = ffmpeg missing.
async function makePlayable(file, dir, opts = {}) {
  const ff = ffmpegPath();
  if (!ff) return null;
  const info = await probe(ff, file);
  const side = opts.maxSide ?? 1440;
  const shorter = Math.min(info.w || 0, info.h || 0);
  const fine =
    info.v === 'h264' && (!info.a || info.a === 'aac') && /^yuv420p/.test(info.pix || '') &&
    (!shorter || shorter <= side) && /\.mp4$/i.test(file);
  return fine ? file : toWhatsAppVideo(file, dir, opts);
}

function newJob() {
  const dir = path.join(TMP, Date.now() + '-' + Math.random().toString(36).slice(2, 8));
  fs.mkdirSync(dir, { recursive: true });
  return {
    dir,
    files() {
      return fs
        .readdirSync(dir)
        .filter((f) => !/\.(txt|part|json|ytdl)$/i.test(f))
        .map((f) => path.join(dir, f))
        .filter((f) => fs.statSync(f).size > 0)
        .sort();
    },
    clean() { fs.rmSync(dir, { recursive: true, force: true }); },
  };
}

// At most 2 downloads at once so a small panel does not run out of memory
let active = 0;
async function limited(fn) {
  if (active >= 2) throw new Error('The downloader is busy. Try again in a minute.');
  active++;
  try { return await fn(); } finally { active--; }
}

module.exports = { galleryUrls, ytdlp, gallerydl, ffmpegPath, audioPostprocessor, cookiesArgs, run, newJob, limited, toWhatsAppVideo, makePlayable, parseQuality };
