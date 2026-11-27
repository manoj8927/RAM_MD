'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { backupLoggedOutAuth } = require('../lib/session-recovery');

function tempDirectory(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'ram-md-auth-test-'));
  t.after(() => fs.rmSync(root, {recursive:true, force:true}));
  return root;
}

test('logout preserves credentials and creates an empty new auth folder', t => {
  const root = tempDirectory(t);
  const auth = path.join(root, 'auth');
  fs.mkdirSync(auth);
  fs.writeFileSync(path.join(auth,'creds.json'), '{"key":"test-only"}');
  const result = backupLoggedOutAuth(auth, {now:()=>Date.UTC(2026,10,27,10)});
  assert.equal(result.backedUp, true);
  assert.equal(result.persistent, false);
  assert.ok(fs.existsSync(path.join(result.backupPath,'creds.json')));
  assert.equal(fs.readFileSync(path.join(result.backupPath,'creds.json'),'utf8'), '{"key":"test-only"}');
  assert.equal(fs.readdirSync(auth).length,0);
});

test('persistent BOT_STORAGE_DIR symlink remains functional after backup', t => {
  const root = tempDirectory(t);
  const volume = path.join(root,'volume');
  const target = path.join(volume,'auth');
  fs.mkdirSync(target,{recursive:true});
  fs.writeFileSync(path.join(target,'creds.json'),'prior-session');
  fs.writeFileSync(path.join(volume,'data.json'),'preserve-me');
  const auth = path.join(root,'auth');
  fs.symlinkSync(target,auth,'dir');
  const result = backupLoggedOutAuth(auth,{now:()=>Date.UTC(2026,10,27,10)});
  assert.equal(result.backedUp,true);
  assert.equal(result.persistent,true);
  assert.equal(fs.lstatSync(auth).isSymbolicLink(),true);
  assert.equal(fs.realpathSync(auth),target);
  assert.equal(fs.readdirSync(auth).length,0);
  assert.equal(fs.readFileSync(path.join(result.backupPath,'creds.json'),'utf8'),'prior-session');
  assert.equal(fs.readFileSync(path.join(volume,'data.json'),'utf8'),'preserve-me');
});

test('missing auth is created without a backup or destructive operation', t => {
  const root = tempDirectory(t);
  const auth = path.join(root,'auth');
  const result = backupLoggedOutAuth(auth);
  assert.equal(result.backedUp,false);
  assert.equal(result.backupPath,null);
  assert.equal(fs.statSync(auth).isDirectory(),true);
});

test('backup names never overwrite one another even within the same timestamp', t => {
  const root = tempDirectory(t);
  const auth = path.join(root,'auth');
  fs.mkdirSync(auth);
  fs.writeFileSync(path.join(auth,'creds.json'),'first');
  const first = backupLoggedOutAuth(auth,{now:()=>1234567890000});
  fs.writeFileSync(path.join(auth,'creds.json'),'second');
  const second = backupLoggedOutAuth(auth,{now:()=>1234567890000});
  assert.notEqual(first.backupPath,second.backupPath);
  assert.equal(fs.readFileSync(path.join(first.backupPath,'creds.json'),'utf8'),'first');
  assert.equal(fs.readFileSync(path.join(second.backupPath,'creds.json'),'utf8'),'second');
});

test('the main connection handler backs up a 401 session instead of deleting it', () => {
  const index = fs.readFileSync(path.join(__dirname,'..','index.js'),'utf8');
  assert.match(index,/code === DisconnectReason\.loggedOut/);
  assert.match(index,/backupLoggedOutAuth\(AUTH_DIR\)/);
  assert.match(index,/loggedOutRecoveryCount >= MAX_LOGOUT_RECOVERIES/);
  assert.match(index,/useMultiFileAuthState\(AUTH_DIR\)/);
  assert.doesNotMatch(index,/Logged out\. Delete the auth folder and pair again\./);
});
