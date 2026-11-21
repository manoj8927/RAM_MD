const crypto=require('crypto');
const fonts=[
 s=>s.toUpperCase(),s=>s.toLowerCase(),s=>[...s].join(' '),
 s=>[...s].reverse().join(''),s=>[...s].map(c=>c+'̲').join(''),
 s=>[...s].map(c=>c+'̶').join(''),s=>[...s].map(c=>c+'⃝').join(''),
 s=>[...s].map(c=>c+'✨').join(''),s=>[...s].join('·'),
 s=>[...s].map(c=>c+'̅').join('')];
module.exports={
 name:'offline-text-tools',
 command:['font','fancy','font1','font2','font3','font4','font5','font6','font7','font8','font9','font10','clock','type','loading','spinner','heart','moon','rocket','npm','gitclone'],
 menu:['font','fancy','font1','font2','font3','font4','font5','font6','font7','font8','font9','font10','clock','type','loading','spinner','heart','moon','rocket','npm','gitclone'],
 category:'Tools',
 desc:'Offline text fonts, visual effects and link helpers',
 async run({command,text,reply,config}){
  const p=config.prefix||'.',input=String(text||'').trim();
  if(command==='clock')return reply('🕒 '+new Date().toISOString()+' (UTC)');
  if(command==='npm')return reply(input&&/^[a-z0-9@/_-]{1,120}$/i.test(input)?'📦 NPM package page:\nhttps://www.npmjs.com/package/'+input:'Usage: '+p+'npm package-name\nLink only; no installation is performed.');
  if(command==='gitclone'){
   const m=/^(?:https:\/\/github\.com\/)?([a-z\d-]{1,39})\/([\w.-]{1,100})(?:\.git)?\/?$/i.exec(input);
   return reply(m?'📦 Git clone command:\ngit clone https://github.com/'+m[1]+'/'+m[2].replace(/\.git$/,'')+'.git\nReview code before running.':'Usage: '+p+'gitclone owner/repo');
  }
  if(['font','fancy',...Array.from({length:10},(_,i)=>'font'+(i+1))].includes(command)){
   if(!input)return reply('Usage: '+p+command+' Hello RAM-MD');
   if(input.length>150)return reply('Text must be 150 characters or less.');
   if(command==='font'||command==='fancy')return reply('🔤 *TEXT STYLES*\n\n'+fonts.map((f,i)=>(i+1)+'. '+f(input)).join('\n'));
   return reply('🔤 *STYLE '+command.slice(4)+'*\n'+fonts[Number(command.slice(4))-1](input));
  }
  const effects={
   type:s=>[...s].join(' '),loading:s=>'['+'█'.repeat(crypto.randomInt(1,11)).padEnd(10,'░')+'] '+(s||'Loading')+' (visual simulation)',
   spinner:s=>['◐','◓','◑','◒'].join(' → ')+' '+(s||'Spinning')+' (visual simulation)',
   heart:s=>'❤️ 💖 💗 '+(s||'RAM-MD')+' 💗 💖 ❤️',
   moon:s=>'🌙 ✨ '+(s||'Good night')+' ✨',
   rocket:s=>'🚀 💨 '+(s||'To the moon!')+' 🌕'};
  if(effects[command])return reply(effects[command](input.slice(0,250)));
 }
};