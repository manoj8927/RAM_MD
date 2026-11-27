'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const plugin = require('../plugins/ram-downloader-api');

function fixture() {
  const sent = [];
  const replies = [];
  return {
    sent, replies,
    sock: {sendMessage: async (...args) => {sent.push(args); return {key:{id:'mock'}}}},
    msg: {key:{id:'incoming-1'}},
    from: '123456789@s.whatsapp.net',
    command: 'ramdl',
    text: 'https://www.youtube.com/shorts/abc123',
    config: {prefix:'.',botName:'RAM-MD'},
    reply: async message => {replies.push(message); return message;}
  };
}
function formatResponse() {
  return {
    status:true,
    title:'Test video',
    duration:20,
    formats:[{
      url:'https://media.example.com/test.mp4',
      extension:'mp4',
      height:720,
      audio:'aac',
      video:'h264'
    }]
  };
}
function mockFetch(t, fn) {
  const oldFetch = global.fetch;
  const oldKey = process.env.RAM_DOWNLOADER_API_KEY;
  global.fetch = fn;
  t.after(() => {
    global.fetch = oldFetch;
    if (oldKey === undefined) delete process.env.RAM_DOWNLOADER_API_KEY;
    else process.env.RAM_DOWNLOADER_API_KEY = oldKey;
  });
}

test('public RAM Downloader API works without a bot-side API key', async t => {
  delete process.env.RAM_DOWNLOADER_API_KEY;
  let request;
  mockFetch(t, async (url, opts) => {
    request = {url:String(url), opts};
    return {ok:true,json:async()=>formatResponse()};
  });
  const ctx=fixture();
  await plugin.run(ctx);
  assert.match(request.url, /^https:\/\/api\.smp-tech\.eu\.cc\/api\/youtube\?/);
  assert.match(request.url, /url=https%3A%2F%2Fwww\.youtube\.com/);
  assert.ok(!Object.hasOwn(request.opts.headers,'x-api-key'));
  assert.equal(ctx.sent.length,1);
  assert.equal(ctx.sent[0][1].video.url,'https://media.example.com/test.mp4');
  assert.doesNotMatch(ctx.replies.join('\n'),/key is not set/);
});

test('private API sends x-api-key only when securely configured',async t=>{
  process.env.RAM_DOWNLOADER_API_KEY='mock-secret-do-not-print';
  let headers;
  mockFetch(t,async(_url,opts)=>{
    headers=opts.headers;
    return {ok:true,json:async()=>formatResponse()};
  });
  const ctx=fixture();
  await plugin.run(ctx);
  assert.equal(headers['x-api-key'],'mock-secret-do-not-print');
  assert.equal(ctx.sent.length,1);
  assert.ok(!ctx.replies.join('\n').includes('mock-secret-do-not-print'));
});

test('auth rejection without key clearly instructs host configuration',async t=>{
  delete process.env.RAM_DOWNLOADER_API_KEY;
  mockFetch(t,async()=>({ok:false,status:401}));
  const ctx=fixture();
  await plugin.run(ctx);
  assert.match(ctx.replies.at(-1),/requires a private key/);
  assert.match(ctx.replies.at(-1),/RAM_DOWNLOADER_API_KEY/);
  assert.equal(ctx.sent.length,0);
});

test('auth rejection with incorrect key produces distinct message',async t=>{
  process.env.RAM_DOWNLOADER_API_KEY='invalid-secret';
  mockFetch(t,async()=>({ok:false,status:403}));
  const ctx=fixture();
  await plugin.run(ctx);
  assert.match(ctx.replies.at(-1),/rejected the configured key/);
  assert.ok(!ctx.replies.at(-1).includes('invalid-secret'));
});

test('unrecognized source never calls the API',async t=>{
  let called=false;
  mockFetch(t,async()=>{called=true;throw new Error('not expected')});
  const ctx={...fixture(),text:'http://127.0.0.1/private'};
  await plugin.run(ctx);
  assert.equal(called,false);
  assert.match(ctx.replies.at(-1),/Usage:/);
});

test('missing route and unavailable upstream have helpful error messages',async t=>{
  for(const [status,pattern] of [[404,/download endpoint was not found/],[503,/temporarily unavailable/]]){
    mockFetch(t,async()=>({ok:false,status}));
    const ctx=fixture();
    await plugin.run(ctx);
    assert.match(ctx.replies.at(-1),pattern);
  }
});
