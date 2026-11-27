'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const tool=require('../plugins/math-plus');
const store=require('../lib/store');
const menu=require('../plugins/menu');
const alive=require('../plugins/alive');
const settings=require('../plugins/settings');
const custom=require('../plugins/custom');

test('all 14 extra math and word commands are registered and unique',()=>{
  assert.equal(tool.command.length,14);
  assert.equal(new Set(tool.command).size,14);
  assert.ok(tool.command.includes('daysbetween'));
});

test('percentage, discount, GST and split bill are computed correctly',()=>{
  assert.match(tool.execute('percent','15 200'),/30/);
  assert.match(tool.execute('discount','1500 20'),/1,200/);
  assert.match(tool.execute('gstcalc','1000 18'),/1,180/);
  assert.match(tool.execute('splitbill','1200 4 10'),/330/);
  assert.throws(()=>tool.execute('discount','100 120'),/out of range/);
  assert.throws(()=>tool.execute('splitbill','1200 0'),/People/);
});

test('statistical tools use numeric sorting and bounded input',()=>{
  assert.match(tool.execute('average','2,4,6'),/4/);
  assert.match(tool.execute('median','3 50 4'),/4/);
  assert.match(tool.execute('median','1 3 9 11'),/6/);
  assert.throws(()=>tool.execute('median',new Array(51).fill('1').join(' ')),/1 to 50/);
});

test('factorial, primality and Roman numeral operations',()=>{
  assert.match(tool.execute('factorial','10'),/3628800/);
  assert.match(tool.execute('prime','97'),/PRIME/);
  assert.match(tool.execute('prime','1'),/not prime/);
  assert.match(tool.execute('roman','2026'),/MMXXVI/);
  assert.match(tool.execute('deroman','MMXXVI'),/2026/);
  assert.throws(()=>tool.execute('deroman','IIII'),/Invalid/);
  assert.throws(()=>tool.execute('factorial','101'),/range/);
});

test('word puzzles handle punctuation and unicode',()=>{
  assert.match(tool.execute('palindrome','Never odd or even'),/Palindrome!/);
  assert.match(tool.execute('anagram','listen | silent'),/anagrams!/);
  assert.match(tool.execute('anagram','apple | pineapple'),/Not anagrams/);
  assert.throws(()=>tool.execute('anagram','listen silent'),/Usage/);
});

test('date utilities validate real leap days and use UTC',()=>{
  assert.match(tool.execute('daysbetween','2024-02-28 2024-03-01'),/2/);
  assert.match(tool.execute('agecalc','2000-12-30',new Date('2026-11-27T12:00:00Z')),/25 years/);
  assert.throws(()=>tool.execute('daysbetween','2023-02-29 2023-03-01'),/Invalid calendar/);
  assert.throws(()=>tool.execute('agecalc','2099-01-01',new Date('2026-11-27T12:00:00Z')),/future/);
});

test('new settings 15 through 18 have stable indexes',()=>{
  const s=settings.panel({menuShowWebsite:false,menuShowSupport:true,menuShowFooter:false,aliveShowSystemStats:false});
  assert.match(s,/15\. 🌐 Menu Website/);
  assert.match(s,/16\. 💬 Menu Support/);
  assert.match(s,/17\. ✍️ Menu Footer/);
  assert.match(s,/18\. 🖥️ Alive System Stats/);
  assert.equal(store.validate('menuStyle','neon'),'neon');
  assert.equal(store.validate('menuStyle','minimal'),'minimal');
  assert.throws(()=>store.validate('menuStyle','pink'),/Invalid menuStyle/);
});

test('minimal and neon styles honor link/footer toggles',()=>{
  const plugins=[{command:['menu','help'],category:'General'}];
  const base={prefix:'.',botName:'RAM-MD',menuStyle:'neon',menuShowWebsite:false,
    menuShowSupport:false,menuShowFooter:false,websiteUrl:'https://example.com',
    supportUrl:'https://t.me/example',menuFooter:'HIDDEN'};
  let display=menu.buildMenu(plugins,base);
  assert.match(display,/NEON/);
  assert.doesNotMatch(display,/https:\/\/example.com/);
  assert.doesNotMatch(display,/HIDDEN/);
  display=menu.buildMenu(plugins,{...base,menuStyle:'minimal'});
  assert.match(display,/Categories:/);
  assert.doesNotMatch(display,/NEON/);
  display=menu.buildMenu(plugins,{...base,menuShowWebsite:true,menuShowFooter:true});
  assert.match(display,/https:\/\/example.com/);
  assert.match(display,/HIDDEN/);
});

test('Alive system diagnostics can be hidden',async()=>{
  const msgs=[];
  await alive.run({command:'runtime',msg:{key:{}},from:'test@s.whatsapp.net',
    config:{aliveShowSystemStats:false,botName:'RAM-MD'},reply:async s=>msgs.push(s)});
  assert.equal(msgs.length,1);
  assert.doesNotMatch(msgs[0],/Memory:/);
  assert.doesNotMatch(msgs[0],/Node.js:/);
  assert.match(msgs[0],/Status:/);
});

test('owner can preview current custom style without sending a media URL',async()=>{
  const sent=[];
  await custom.run({isOwner:true,args:['preview'],
    config:{prefix:'.',botName:'Preview Bot',menuStyle:'neon'},plugins:[{command:['menu'],category:'General'}],
    reply:async s=>sent.push(s)});
  assert.equal(sent.length,1);
  assert.match(sent[0],/CURRENT MENU PREVIEW/);
  assert.match(sent[0],/NEON/);
});
