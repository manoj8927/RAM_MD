// Start RAM_MD with optional persistent auth/data storage for hosted workers.
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const storage = process.env.BOT_STORAGE_DIR;
if (storage) {
  const base = path.resolve(storage);
  fs.mkdirSync(base, { recursive: true });
  for (const name of ['auth', 'data']) {
    const source = path.join(root, name);
    const target = path.join(base, name);
    fs.mkdirSync(target, { recursive: true });
    if (fs.existsSync(source)) {
      const stat = fs.lstatSync(source);
      if (stat.isSymbolicLink() && fs.realpathSync(source) === fs.realpathSync(target)) continue;
      // Never silently overwrite an existing paired WhatsApp session.
      throw new Error(source + ' already exists. Back it up and migrate it into ' + target + ' before deployment.');
    }
    fs.symlinkSync(target, source, 'dir');
  }
  console.log('Persistent auth/data storage:', base);
} else {
  console.warn('BOT_STORAGE_DIR not set: auth/data use local filesystem; check whether your host persists it.');
}
require(path.join(root, 'index.js'));
