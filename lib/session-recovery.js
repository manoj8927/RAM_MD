'use strict';

const fs = require('fs');
const path = require('path');

/**
 * Move a logged-out WhatsApp auth directory to a uniquely named backup.
 * A mounted BOT_STORAGE_DIR is exposed as an auth symlink: move its TARGET,
 * not the symlink, so the bootstrapping code keeps working.
 * Never remove or overwrite credentials. Data/settings are not touched.
 */
function backupLoggedOutAuth(authPath, {now = () => Date.now()} = {}) {
  const input = path.resolve(authPath);
  let stat;
  try { stat = fs.lstatSync(input); }
  catch (error) {
    if (error.code === 'ENOENT') {
      fs.mkdirSync(input, {recursive: true, mode: 0o700});
      return {backedUp: false, authPath: input, backupPath: null};
    }
    throw error;
  }

  const isLink = stat.isSymbolicLink();
  const target = isLink ? fs.realpathSync(input) : input;
  if (!fs.statSync(target).isDirectory())
    throw new Error('WhatsApp auth path is not a directory: ' + input);

  // Match normal filesystem naming and avoid conflicts from repeated logouts.
  const suffix = new Date(now()).toISOString().replace(/[:.]/g, '-');
  let backupPath = target + '-loggedout-' + suffix;
  for (let i = 1; fs.existsSync(backupPath); i++)
    backupPath = target + '-loggedout-' + suffix + '-' + i;

  fs.renameSync(target, backupPath);
  try {
    fs.mkdirSync(target, {recursive: true, mode: 0o700});
  } catch (error) {
    // Roll back the move if the replacement directory cannot be created.
    try {fs.renameSync(backupPath, target);} catch (rollbackError) {
      console.error('[auth] Could not restore original folder:', rollbackError.message);
    }
    throw error;
  }
  try {fs.chmodSync(backupPath, 0o700);} catch (_) {}
  return {backedUp: true, authPath: input, backupPath, persistent: isLink};
}

module.exports = {backupLoggedOutAuth};
