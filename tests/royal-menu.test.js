'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const menu = require('../plugins/menu');
const store = require('../lib/store');
const custom = require('../plugins/custom');

const plugins = [
  {command:['menu','help'],category:'General'},
  {command:['song','ytmp4'],category:'Download'},
  {command:['snake'],category:'Games'},
  {command:['settings'],category:'Settings',owner:true},
  {command:['hidden'],menu:[],category:'General'}
];
const cfg = {
  botName:'『ＲＡＭ－ＭＤ』⚡',
  ownerName:'SANJOY MAHATO',
  owners:['917047294917'],
  youtubeUrl:'https://youtu.be/WlPkFgc6FRw',
  githubUrl:'https://github.com/manoj8927/RAM_MD',
  websiteUrl:'https://ram-md.blogspot.com/',
  supportUrl:'https://t.me/Ramboss67',
  version:'1.0.0',
  menuStyle:'royal',
  mode:'public',
  prefix:'.',
  menuImage:'https://example.com/cover.jpg',
  menuImageEnabled:true,
  menuButtons:false,
  menuFooter:'RAM-MD',
};
const chat='919876543210@s.whatsapp.net';
const message={pushName:'ram bhai',key:{remoteJid:chat,fromMe:false,id:'testing'}};

test('Royal style validates while other menu styles remain available',()=>{
  for(const style of ['royal','classic','compact','neon','minimal'])
    assert.equal(store.validate('menuStyle',style),style);
  assert.throws(()=>store.validate('menuStyle','fake'),/Invalid menuStyle/);
  assert.equal(store.validate('youtubeUrl','https://youtu.be/WlPkFgc6FRw'),'https://youtu.be/WlPkFgc6FRw');
  assert.equal(store.validate('githubUrl','https://github.com/manoj8927/RAM_MD'),'https://github.com/manoj8927/RAM_MD');
  assert.throws(()=>store.validate('youtubeUrl','http://127.0.0.1/'),/public HTTPS/);
  assert.equal(custom.owner,true);
  assert.match(custom.info({...cfg}),/royal/);
});

test('Royal card resembles requested layout using real values, never screenshot numbers',()=>{
  const groups=menu.collect(plugins,false);
  const card=menu.royalCard(groups,cfg,{msg:message,from:chat});
  assert.match(card,/👑/);
  assert.match(card,/Developer/);
  assert.match(card,/SANJOY MAHATO/);
  assert.match(card,/wa\.me\/917047294917/);
  assert.match(card,/YouTube/);
  assert.match(card,/youtu\.be\/WlPkFgc6FRw/);
  assert.match(card,/GitHub/);
  assert.match(card,/github\.com\/manoj8927\/RAM_MD/);
  assert.match(card,/User:\* ram bhai/);
  assert.match(card,/Number:\* \+919876543210/);
  assert.match(card,/Version:\* v1\.0\.0/);
  assert.match(card,/Prefix:\* \[ \. \]/);
  assert.match(card,/Cmds:\* 5 available/);
  assert.match(card,/RAM:\* \d+ MB/);
  assert.match(card,/Uptime:\*/);
  assert.match(card,/Date:\* \d{4}-\d{2}-\d{2}/);
  assert.match(card,/Time:\* \d{2}:\d{2}:\d{2} IST/);
  assert.doesNotMatch(card,/254 Total|KING TEAM/);
  assert.ok(card.length <= 900,'Royal card stays within safe caption budget');
});

test('Royal date uses India timezone rather than hosting timezone',()=>{
  const d=menu.currentIndiaTime(new Date('2026-11-28T15:00:00.000Z'));
  assert.deepEqual(d,{date:'2026-11-28',time:'20:30:00'});
});

test('Group menu uses requester name but does not expose synthetic @lid values',()=>{
  const group='120363999999999@g.us';
  const msg={pushName:'Group User',key:{remoteJid:group,participant:'987654321@lid'}};
  const card=menu.royalCard(menu.collect(plugins,false),cfg,{msg,from:group});
  assert.match(card,/Group User/);
  assert.doesNotMatch(card,/987654321/);
  assert.doesNotMatch(card,/Number:\*/);
});

test('Royal Menu sends image profile with separately readable categories',async()=>{
  const sent=[];
  const sock={sendMessage:async(_jid,body)=>{sent.push(body);return {key:{id:'reply'}}}};
  const ctx={sock,from:chat,msg:message,plugins,config:cfg,
    isOwner:false,args:[],reply:async t=>sent.push({text:t})};
  await menu.run(ctx);
  assert.ok(sent[0].image);
  assert.match(sent[0].caption,/Developer/);
  assert.match(sent[1].text,/COMMAND CATEGORIES/);
  assert.match(sent[1].text,/Download/);
  assert.doesNotMatch(sent[1].text,/Settings/);
});

test('Image failure safely falls back to full Royal menu text',async()=>{
  const sent=[];
  const sock={sendMessage:async(_jid,body)=>{if(body.image)throw Error('image blocked');sent.push(body)}};
  await menu.run({sock,from:chat,msg:message,plugins,config:cfg,
    isOwner:true,args:[],reply:async t=>sent.push({text:t})});
  assert.equal(sent.length,1);
  assert.match(sent[0].text,/Developer/);
  assert.match(sent[0].text,/COMMAND CATEGORIES/);
  assert.match(sent[0].text,/Settings/);
});

test('Existing command list and search work with Royal style',async()=>{
  const out=[];
  const ctx={sock:{},from:chat,msg:message,plugins,config:cfg,
    isOwner:false,args:['search','song'],reply:async text=>out.push(text)};
  await menu.run(ctx);
  assert.match(out[0],/\.song/);
  const all=menu.buildMenu(plugins,cfg,{all:true,isOwner:false});
  assert.match(all,/\.ytmp4/);
  assert.doesNotMatch(all,/\.settings/);
});

test('Owner toggles still control links and uptime',()=>{
  const card=menu.royalCard(menu.collect(plugins,false),
    {...cfg,menuShowUptime:false,menuShowSupport:false},{msg:message,from:chat});
  assert.doesNotMatch(card,/Uptime:\*/);
  assert.doesNotMatch(card,/wa\.me/);
  const cats=menu.royalCategories(menu.collect(plugins,false),
    {...cfg,menuShowSupport:false,menuShowWebsite:false,menuShowFooter:false});
  assert.doesNotMatch(cats,/https:\/\//);
});
