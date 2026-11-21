// Settings changed from WhatsApp are saved here, so they survive a restart.
const fs = require('fs');
const path = require('path');

const DIR = path.join(__dirname, '..', 'data');
const FILE = path.join(DIR, 'settings.json');

function load() {
  try { return JSON.parse(fs.readFileSync(FILE, 'utf8')); } catch (e) { return {}; }
}

// At start: put the saved values over config.js
function apply(config) {
  Object.assign(config, load());
}

function set(config, key, value) {
  config[key] = value;
  try {
    fs.mkdirSync(DIR, { recursive: true });
    fs.writeFileSync(FILE, JSON.stringify({ ...load(), [key]: value }, null, 2));
  } catch (e) {
    console.log('Could not save settings:', e.message);
  }
}

module.exports = { apply, set, load };
