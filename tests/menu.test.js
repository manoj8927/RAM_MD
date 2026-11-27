'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');

const menu = require('../plugins/menu');
const { panel } = require('../plugins/settings');

function makePlugins(count = 80) {
  return [
    { name: 'menu', command: ['menu', 'help'], menu: ['menu', 'help'], category: 'General' },
    { name: 'download', command: Array.from({length: count}, (_, i) => 'download' + (i + 1)), category: 'Download' },
    { name: 'games', command: ['snake', 'car'], category: 'Games' },
    { name: 'settings', owner: true, command: ['settings'], category: 'Settings' },
    { name: 'hidden', command: ['choice'], menu: [], category: 'General' },
  ];
}
const config = {
  prefix: '.', botName: 'RAM-MD', ownerName: 'SANJOY MAHATO',
  version: '1.0', menuImage: 'https://example.com/menu.jpg',
  mode: 'private', menuButtons: false,
};
function fixture() {
  const calls = [];
  return {
    calls,
    sock: {
      sendMessage: async (jid, content) => { calls.push(content); return { key: { id: 'fake' } }; },
    },
    msg: {key:{id:'x'}},
    from: 'test@s.whatsapp.net',
    plugins: makePlugins(),
    config,
    reply: async text => { calls.push({ text }); },
    isOwner: true,
    args: [],
  };
}

test('current mode and actual visible command counts are displayed', () => {
  const result = menu.buildMenu(makePlugins(), config, {isOwner: true});
  assert.match(result, /PRIVATE/);
  assert.match(result, /80 visible commands|85 visible commands/);
  assert.match(result, /Download/);
  assert.doesNotMatch(result, /choice/);
});

test('owner-only settings do not appear in other users menus', () => {
  const result = menu.buildMenu(makePlugins(), config, {isOwner: false});
  assert.doesNotMatch(result, /Settings/);
});

test('category list and numeric navigation show only the requested category', async () => {
  const one = fixture();
  one.args = ['2'];
  await menu.run(one);
  assert.match(one.calls[0].text, /snake/);
  assert.doesNotMatch(one.calls[0].text, /download1/);
  const two = fixture();
  two.args = ['download'];
  await menu.run(two);
  assert.match(two.calls[0].text, /download1/);
  assert.doesNotMatch(two.calls[0].text, /snake/);
});

test('image captions are short, while full overview remains accessible', async () => {
  const ctx = fixture();
  await menu.run(ctx);
  const img = ctx.calls.find(c => !!c.image);
  assert.ok(img, 'an image should be attempted');
  assert.ok(img.caption.length <= 900, 'must stay within safe caption size');
  const longOverview = menu.buildMenu(makePlugins(), config);
  if (longOverview.length > 900) {
    assert.ok(ctx.calls.some(c => c.text?.includes('*SELECT A CATEGORY*')));
  }
});

test('all-commands view fits WhatsApp-sized messages', async () => {
  const ctx = fixture();
  ctx.args = ['all'];
  await menu.run(ctx);
  assert.ok(ctx.calls.length > 1);
  assert.ok(ctx.calls.every(c => c.text.length < 3400));
  assert.ok(ctx.calls.some(c => c.text.includes('.download80')));
});

test('search works and ignores hidden commands', async () => {
  const ctx = fixture();
  ctx.args = ['search', 'snake'];
  await menu.run(ctx);
  assert.match(ctx.calls[0].text, /snake/);
});

test('image GitHub blob link converted to raw without keeping ?raw=1', () => {
  assert.equal(
    menu.rawUrl('https://github.com/owner/repo/blob/main/image.jpg?raw=1'),
    'https://raw.githubusercontent.com/owner/repo/main/image.jpg'
  );
});

test('settings panel includes toggle 11 for menu tap buttons', () => {
  const text = panel({ ...config, menuButtons: true });
  assert.match(text, /11\. 📱 Menu Tap Buttons/);
});
