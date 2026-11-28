'use strict';
// Persist owner-controlled bot settings safely across restarts.
const fs = require('fs');
const path = require('path');

const FILE = path.join(__dirname, '..', 'data', 'settings.json');

const BOOL_KEYS = [
  'autoStatusView', 'autoStatusReact', 'askQuality', 'qualityButtons',
  'connectionMessage', 'aiIntro', 'aiSearch', 'aiReplyOwner',
  'debug', 'menuButtons', 'menuImageEnabled', 'aliveImageEnabled', 'menuShowUptime',
  'menuShowWebsite', 'menuShowSupport', 'menuShowFooter', 'aliveShowSystemStats'
];
const TEXT_LIMITS = {
  botName: 48,
  ownerName: 48,
  menuImage: 400,
  aliveImage: 400,
  menuFooter: 100,
  aliveCaption: 180,
  supportUrl: 200,
  websiteUrl: 200,
  youtubeUrl: 200,
  githubUrl: 200,
};
const LANGUAGES = new Set([
  'same','bn','en','hi','ur','ar','ta','te','ml','kn','gu','pa','ne',
  'es','fr','pt','id','ja','ko','zh','ru','bn-latn','hi-latn'
]);
const VIDEO_HEIGHTS = [360,480,720,1080,1440];
const ENUMS = {
  mode: ['public','private'],
  menuStyle: ['royal','classic','compact','neon','minimal'],
  aiReplyLanguage: [...LANGUAGES],
  ytMaxHeight: VIDEO_HEIGHTS,
};
const KEYS = [...BOOL_KEYS, ...Object.keys(TEXT_LIMITS), ...Object.keys(ENUMS), 'prefix', 'videoCrf'];

function publicHTTPS(value) {
  if (!value) return true;
  let url;
  try { url = new URL(value); } catch (_) { return false; }
  if (url.protocol !== 'https:' || url.username || url.password || url.port) return false;
  const host = url.hostname.toLowerCase();
  // URLs are fetched by the media sender; do not allow local/internal addresses.
  if (!host || host === 'localhost' || host.endsWith('.localhost') || host.endsWith('.local') ||
      host.endsWith('.internal') || !host.includes('.') || /^[0-9.]+$/.test(host) ||
      host.startsWith('[')) return false;
  return true;
}

function validate(key, value) {
  if (!KEYS.includes(key)) throw new Error('Unknown setting: ' + key);
  if (BOOL_KEYS.includes(key)) {
    if (typeof value !== 'boolean') throw new Error(key + ' must be on or off.');
    return value;
  }
  if (Object.hasOwn(ENUMS, key)) {
    if (!ENUMS[key].includes(value)) throw new Error('Invalid ' + key + '. Allowed: ' + ENUMS[key].join(', '));
    return value;
  }
  if (key === 'videoCrf') {
    if (!Number.isInteger(value) || value < 18 || value > 28) throw new Error('Video CRF must be an integer from 18 to 28.');
    return value;
  }
  if (key === 'prefix') {
    if (typeof value !== 'string' || !/^[.!?#/$%]$/.test(value)) throw new Error('Prefix must be one of . ! ? # / $ %');
    return value;
  }
  if (Object.hasOwn(TEXT_LIMITS, key)) {
    if (typeof value !== 'string' || value.length > TEXT_LIMITS[key] || /[\x00-\x08\x0B\x0C\x0E-\x1F]/.test(value))
      throw new Error('Invalid length or characters for ' + key + '.');
    const text = value.trim();
    if ((key === 'botName' || key === 'ownerName') && !text) throw new Error(key + ' cannot be empty.');
    if (/^(menuImage|aliveImage|supportUrl|websiteUrl|youtubeUrl|githubUrl)$/.test(key) && !publicHTTPS(text))
      throw new Error(key + ' must be a public HTTPS URL (or blank).');
    if (/\r|\n/.test(text)) throw new Error('Use a single line for ' + key + '.');
    return text;
  }
  throw new Error('Unsupported setting type.');
}
function read() {
  try {
    const parsed = JSON.parse(fs.readFileSync(FILE, 'utf8'));
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch (_) {
    return {};
  }
}
function applySaved(config) {
  const saved = read();
  for (const key of KEYS) {
    if (!Object.hasOwn(saved, key)) continue;
    try { config[key] = validate(key, saved[key]); }
    catch (_) { /* Ignore invalid/obsolete persisted entries. */ }
  }
}
function set(config, key, value) {
  const checked = validate(key, value);
  const current = read();
  current[key] = checked;
  fs.mkdirSync(path.dirname(FILE), { recursive: true });
  const tmp = FILE + '.' + process.pid + '.' + require('crypto').randomBytes(4).toString('hex') + '.tmp';
  try {
    fs.writeFileSync(tmp, JSON.stringify(current, null, 2) + '\n', { mode: 0o600, flag: 'wx' });
    fs.renameSync(tmp, FILE);
  } catch (err) {
    try { fs.rmSync(tmp, { force: true }); } catch (_) {}
    throw new Error('Could not save settings to data/settings.json: ' + err.message);
  }
  config[key] = checked;
  return checked;
}
module.exports = { applySaved, set, read, validate, KEYS, BOOL_KEYS, FILE };
