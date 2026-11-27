// Settings switched from WhatsApp (.settings, .autoview ...) are saved here so they survive a restart
const fs = require('fs');
const path = require('path');

const FILE = path.join(__dirname, '..', 'data', 'settings.json');
const KEYS = ['autoStatusView', 'autoStatusReact', 'askQuality', 'qualityButtons', 'connectionMessage', 'aiIntro', 'aiSearch', 'aiReplyOwner', 'debug', 'mode', 'menuButtons'];

function read() {
  try { return JSON.parse(fs.readFileSync(FILE, 'utf8')); } catch (e) { return {}; }
}

function applySaved(config) {
  const saved = read();
  for (const k of KEYS) if (k === 'mode') { if (['public', 'private'].includes(saved[k])) config[k] = saved[k]; }
    else if (typeof saved[k] === 'boolean') config[k] = saved[k];
}

function set(config, key, value) {
  if (!KEYS.includes(key)) throw new Error('Unknown setting: ' + key);
  if (key === 'mode' && !['public', 'private'].includes(value)) throw new Error('Invalid mode');
  config[key] = value;
  const saved = read();
  saved[key] = value;
  try {
    fs.mkdirSync(path.dirname(FILE), { recursive: true });
    fs.writeFileSync(FILE, JSON.stringify(saved));
  } catch (e) {}
}

module.exports = { applySaved, set, KEYS };
