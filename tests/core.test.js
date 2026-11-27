'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');

const pm2 = require('../ecosystem.config.cjs');
const pluginManager = require('../plugins/plugin');
const areact = require('../plugins/areact');
const settings = require('../plugins/settings');

async function ownerCommand(args) {
  const replies = [];
  await pluginManager.run({
    args,
    config: { prefix: '.' },
    reply: async message => { replies.push(String(message)); },
    reloadPlugins: () => { throw new Error('Must not reload protected file'); },
  });
  return replies.join('\n');
}

test('PM2 runs the persistent-storage bootstrap, not index.js directly', () => {
  assert.equal(pm2.apps[0].script, 'deploy/start.js');
});

test('built-in plugins cannot be removed using .plugin remove', async () => {
  for (const file of ['menu.js', 'areact.js', 'autoreply.js', 'bot-mode.js', 'yt.js', 'settings.js', 'plugin.js']) {
    assert.match(await ownerCommand(['remove', file]), /Core plugins cannot be removed/);
  }
});

test('status auto-react and incoming-message auto-react use distinct commands', () => {
  assert.deepEqual(areact.command, ['areact']);
  assert.ok(settings.command.includes('autoreact'));
});

test('an invalid or non-HTTPS Gist URL is rejected without network access', async () => {
  assert.match(await ownerCommand(['http://gist.github.com/user/' + 'a'.repeat(32)]), /Only HTTPS gist.github.com links/);
});

test('reviewed Gist cannot silently overwrite a built-in plugin', async () => {
  const originalFetch = global.fetch;
  const id = 'a'.repeat(32);
  let count = 0;
  global.fetch = async url => {
    count++;
    if (String(url).endsWith('/gists/' + id)) {
      return new Response(JSON.stringify({
        files: {
          'areact.js': {
            filename: 'areact.js',
            raw_url: 'https://gist.githubusercontent.com/author/' + id + '/raw/areact.js',
          },
        },
      }), { status: 200 });
    }
    return new Response('module.exports = { name: "replacement" };', {status:200});
  };
  try {
    const preview = await ownerCommand(['https://gist.github.com/author/' + id]);
    assert.match(preview, /Waiting for owner approval/);
    const token = /plugin approve ([a-f0-9]{8})/.exec(preview)?.[1];
    assert.ok(token, 'approval code should be provided');
    const approved = await ownerCommand(['approve', token]);
    assert.match(approved, /Skipped areact.js: core plugin name/);
    assert.ok(count >= 2, 'Gist metadata and source should be downloaded');
  } finally {
    global.fetch = originalFetch;
  }
});

test('oversized Gist code is refused before the approval stage', async () => {
  const originalFetch = global.fetch;
  const id = 'b'.repeat(32);
  global.fetch = async url => {
    if (String(url).endsWith('/gists/' + id)) {
      return new Response(JSON.stringify({
        files: { 'too-big.js': {
          filename: 'too-big.js',
          raw_url: 'https://gist.githubusercontent.com/author/' + id + '/raw/too-big.js',
        } },
      }), { status: 200 });
    }
    return new Response('x'.repeat(205 * 1024), { status: 200 });
  };
  try {
    assert.match(await ownerCommand(['https://gist.github.com/author/' + id]), /Plugin exceeds 200 KB limit|Plugin is too large/);
  } finally {
    global.fetch = originalFetch;
  }
});
