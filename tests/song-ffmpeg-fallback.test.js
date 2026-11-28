'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const vm = require('node:vm');
const cp = require('node:child_process');

const dlSource = fs.readFileSync(path.join(__dirname,'../lib/dl.js'),'utf8');
const ytSource = fs.readFileSync(path.join(__dirname,'../plugins/yt.js'),'utf8');

function loadDownloadHelpers({systemTools=false}={}) {
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'ram-ffmpeg-'));
  const module={exports:{}};
  const fsWrapper={...fs,mkdirSync:fs.mkdirSync.bind(fs)};
  const cpMock={execFile:cp.execFile, execFileSync:(bin,args)=>{
    if (['ffmpeg','ffprobe'].includes(bin)) {
      if (!systemTools)throw new Error('ENOENT');
      return Buffer.from('version');
    }
    return cp.execFileSync(bin,args);
  }};
  const modRequire=(name)=>{
    if(name==='fs')return fsWrapper;
    if(name==='path')return path;
    if(name==='child_process')return cpMock;
    if(name==='ffmpeg-static')return null;
    throw Error('unexpected '+name);
  };
  new Function('require','module','__dirname','process','fetch',dlSource)(
    modRequire,module,path.join(root,'lib'),{arch:'x64',platform:'linux',env:{},pid:1},global.fetch
  );
  return {dl:module.exports,root,dispose:()=>fs.rmSync(root,{force:true,recursive:true})};
}

function loadYt(dl) {
  const module={exports:{}};
  const load=(name)=>{
    if(name==='fs')return fs;
    if(name==='path')return path;
    if(name==='../lib/dl')return dl;
    if(name==='../lib/buttons')return {sendQuickReplies:async()=>null};
    if(name==='../lib/choice')return {senderOf:()=>'',numbered:()=>'',offer:()=>{}};
    throw Error('unexpected '+name);
  };
  new Function('require','module',ytSource)(load,module);
  return module.exports;
}

function runFixture(audioTools) {
  const args=[],sent=[],messages=[];
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'ram-song-'));
  const dl={
    ytdlp:async()=>'/fake/yt-dlp',
    ffmpegPath:()=> '/fake/ffmpeg',
    audioPostprocessor:()=>audioTools,
    limited:async(fn)=>fn(),
    newJob:()=>{
      const dir=path.join(root,'job');
      fs.mkdirSync(dir,{recursive:true});
      return {
        dir,
        files:()=>[path.join(dir,audioTools?'track.mp3':'track.m4a')],
        clean:()=>{}
      };
    },
    cookiesArgs:()=>[],
    run:async (_bin, argv)=>{
      args.push(argv);
      const dir=path.join(root,'job');
      const ext=audioTools?'mp3':'m4a';
      fs.writeFileSync(path.join(dir,'track.'+ext),'fake-media');
      fs.writeFileSync(path.join(dir,'title.txt'),'Test Song');
    },
  };
  const plugin=loadYt(dl);
  const ctx={
    sock:{sendMessage:async(_jid,payload)=>sent.push(payload)},
    msg:{key:{id:'abc'}},from:'123@s.whatsapp.net',
    reply:async(s)=>messages.push(s),
    command:'song',text:'Test Song',config:{ytMaxHeight:720,videoCrf:20},
  };
  return {plugin,ctx,args,sent,messages,dispose:()=>fs.rmSync(root,{force:true,recursive:true})};
}

test('without ffprobe, .song uses ready-made M4A without audio postprocessing',async t=>{
  const f=runFixture(null);
  t.after(f.dispose);
  await f.plugin.run(f.ctx);
  const args=f.args[0];
  assert.ok(args.includes('bestaudio[ext=m4a]/bestaudio[acodec^=mp4a]/bestaudio'));
  assert.ok(!args.includes('-x'));
  assert.ok(!args.includes('--ffmpeg-location'));
  assert.equal(f.sent.length,1);
  assert.equal(f.sent[0].mimetype,'audio/mp4');
  assert.match(f.sent[0].fileName,/\.m4a$/);
});

test('with complete ffmpeg+ffprobe, .song converts MP3',async t=>{
  const f=runFixture({format:'mp3',location:null});
  t.after(f.dispose);
  await f.plugin.run(f.ctx);
  const args=f.args[0];
  assert.ok(args.includes('-x'));
  assert.ok(args.includes('--audio-format'));
  assert.ok(args.includes('mp3'));
  assert.ok(!args.includes('--ffmpeg-location'));
  assert.equal(f.sent[0].mimetype,'audio/mpeg');
});

test('ffmpeg toolchain requires both system tools',t=>{
  const no=loadDownloadHelpers();
  t.after(no.dispose);
  assert.equal(no.dl.audioPostprocessor(),null);
  const yes=loadDownloadHelpers({systemTools:true});
  t.after(yes.dispose);
  assert.deepEqual(yes.dl.audioPostprocessor(),{location:null,format:'mp3'});
});

test('fallback error clearly tells how to install full toolchain',async t=>{
  const f=runFixture(null);
  t.after(f.dispose);
  f.ctx.reply=async text=>f.messages.push(text);
  const dl=f.plugin.run;
  assert.equal(typeof dl,'function');
  assert.match(ytSource,/For MP3, install both ffmpeg and ffprobe/);
});
