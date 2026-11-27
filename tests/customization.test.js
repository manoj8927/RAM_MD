'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const store = require('../lib/store');
const menu = require('../plugins/menu');
const settings = require('../plugins/settings');
const custom = require('../plugins/custom');
const lab = require('../plugins/text-lab');
const alive = require('../plugins/alive');

test('custom fields validate exact types, safe image URLs and bounded numbers', () => {
  assert.equal(store.validate('botName', 'RAM-MD PRO'), 'RAM-MD PRO');
  assert.equal(store.validate('prefix', '!'), '!');
  assert.equal(store.validate('ytMaxHeight',720),720);
  assert.equal(store.validate('menuStyle','compact'),'compact');
  assert.throws(()=>store.validate('prefix','abc'),/Prefix/);
  assert.throws(()=>store.validate('menuImage','http://example.com/pic.jpg'),/public HTTPS/);
  assert.throws(()=>store.validate('menuImage','https://127.0.0.1/a.jpg'),/public HTTPS/);
  assert.throws(()=>store.validate('videoCrf',40),/18 to 28/);
  assert.throws(()=>store.validate('botName',''),/empty/);
  assert.throws(()=>store.validate('menuImageEnabled','yes'),/on or off/);
});

test('settings preserve existing 11 options and add 12 to 14', () => {
  const p = settings.panel({botName:'RAM-MD',mode:'private',menuImageEnabled:true,aliveImageEnabled:false});
  assert.match(p,/11\. 📱 Menu Tap Buttons/);
  assert.match(p,/12\. 🖼️ Menu Picture/);
  assert.match(p,/13\. 🖼️ Alive Picture/);
  assert.match(p,/14\. ⏱️ Menu Uptime/);
  assert.match(settings.panel({},'menu'),/MENU & APPEARANCE/);
  assert.doesNotMatch(settings.panel({},'menu'),/AI Auto Reply/);
  assert.match(settings.panel({},'ai'),/AI Auto Reply/);
});

test('menu supports compact style and hides uptime when toggled off', () => {
  const plugins = [{command:['menu','help'],category:'General'},{command:['textstats','slug'],category:'Tools'}];
  const p={prefix:'!',botName:'Example Bot',ownerName:'Owner',mode:'public',menuStyle:'compact',
    menuFooter:'TEST FOOTER',supportUrl:'https://t.me/example',websiteUrl:'https://example.com',
    menuShowUptime:false};
  const out=menu.buildMenu(plugins,p);
  assert.match(out,/Example Bot/);
  assert.match(out,/TEST FOOTER/);
  assert.match(out,/https:\/\/example.com/);
  assert.doesNotMatch(out,/⏱️/);
  assert.match(out,/!menu 1/);
});

test('Alive picture toggle returns text only without image request', async () => {
  const sends=[];
  await alive.run({
    sock:{sendMessage:async (_jid, content)=>sends.push(content)},
    msg:{message:{conversation:'.alive'}},from:'test@s.whatsapp.net',command:'alive',
    config:{botName:'RAM-MD',aliveCaption:'System Ready',aliveImageEnabled:false,menuImage:'https://example.com/a.jpg'},
    reply:async text=>sends.push({text})
  });
  assert.equal(sends.length,1);
  assert.match(sends[0].text,/System Ready/);
});

test('text-lab handles Unicode stats, slash-preserving slugs, word counts and hex roundtrip', () => {
  assert.match(lab.apply('textstats','Hello বাংলা 123'),/Words: 3/);
  assert.match(lab.apply('slug','Hello বাংলা World!'),/hello-বাংলা-world/);
  assert.match(lab.apply('wordfreq','one two One'),/one — 2/);
  const encoded=lab.apply('hexencode','বাংলা');
  const decoded=lab.apply('hexdecode',encoded.replace('🔐 ',''));
  assert.equal(decoded,'🔓 বাংলা');
});

test('text-lab deduplicates and sorts list inputs, supports Morse and URL extraction', () => {
  assert.match(lab.apply('dedupe','Hi | hi | There'),/Total: 2/);
  assert.match(lab.apply('sortlines','z | a | B'),/a\nB\nz/);
  assert.equal(lab.apply('demorse',lab.apply('morse','HI 123').replace('📡 ','')),'📡 HI 123');
  assert.match(lab.apply('extractlinks','https://example.com/ and https://example.com/'),/FOUND LINKS \(1\)/);
});

test('text-lab enforces bounded output and input', () => {
  assert.throws(()=>lab.apply('hexdecode','BAD'),/even-length/);
  assert.throws(()=>lab.apply('hexencode','x'.repeat(1500)),/1200/);
  assert.throws(()=>lab.apply('morse','☃'),/Morse supports/);
  assert.match(lab.apply('randomcolor',''),/#[0-9A-F]{6}/);
  assert.equal(custom.owner,true);
});
