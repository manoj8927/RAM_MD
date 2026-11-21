const crypto=require('crypto');const pick=a=>a[crypto.randomInt(a.length)];const state=new Map(),scores=new Map();const ttl=600000;
const emojis=[['🍎🍌🍇','fruits'],['🐱🐶🐰','animals'],['🚗🚕🚌','vehicles'],['⚽🏀🏐','sports']];
const trivia=[['Which gas do plants absorb?',['Oxygen','Carbon dioxide','Helium','Neon'],2],['Which is the largest planet?',['Mars','Earth','Jupiter','Venus'],3],['How many continents are there?',['5','6','7','8'],3]];
const get=(chat,type)=>{const s=state.get(chat);if(!s||Date.now()-s.at>ttl){state.delete(chat);return null;}return s.type===type?s:null;};
const start=(chat,type,answer)=>{if(state.size>500)for(const [k,v]of state)if(Date.now()-v.at>ttl)state.delete(k);state.set(chat,{type,answer,at:Date.now()});};
const credit=(user)=>scores.set(user,(scores.get(user)||0)+1);
module.exports={name:'challenge-games',command:['emojiquiz','fasttype','numberbattle','quizbattle','leaderboard'],menu:['emojiquiz','fasttype','numberbattle','quizbattle','leaderboard'],category:'Games',desc:'Emoji, typing, number and quiz challenges with in-memory scores',async run({command,text,from,msg,reply,config}){
const p=config.prefix||'.',raw=String(text||'').trim(),parts=raw.split(/\s+/),sender=msg.key.participant||msg.key.remoteJid||'unknown',key=from+'|'+sender;
if(command==='leaderboard'){const entries=[...scores.entries()].sort((a,b)=>b[1]-a[1]).slice(0,10);return reply(entries.length?'🏆 *SESSION LEADERBOARD*\n'+entries.map(([u,n],i)=>(i+1)+'. '+u.split('@')[0]+' — '+n).join('\n'):'No points yet. Play a challenge!');}
const types={emojiquiz:'emoji',fasttype:'type',numberbattle:'number',quizbattle:'quiz'},type=types[command],s=get(key,type);
if(raw&&s){let correct=false;if(type==='emoji')correct=raw.toLowerCase()===s.answer;if(type==='type')correct=raw===s.answer;if(type==='number')correct=Number(raw)===Number(s.answer);if(type==='quiz')correct=Number(raw)===s.answer;
if(correct){state.delete(key);credit(sender);return reply('🎉 Correct! +1 point. Check '+p+'leaderboard');}
s.tries=(s.tries||0)+1;if(s.tries>=3){state.delete(key);return reply('❌ Out of tries! Answer: '+s.answer);}return reply('❌ Try again ('+(3-s.tries)+' tries left).');}
if(type==='emoji'){const q=pick(emojis);start(key,type,q[1]);return reply('🎯 Guess the category: '+q[0]+'\nAnswer: '+p+'emojiquiz category');}
if(type==='type'){const phrase=pick(['RAM MD is awesome','Practice makes progress','Fast fingers win games']);start(key,type,phrase);return reply('⌨️ Type this exactly:\n'+phrase+'\nAnswer: '+p+'fasttype '+phrase+'\nNote: no real speed measurement.');}
if(type==='number'){const n=crypto.randomInt(1,21);start(key,type,n);return reply('🔢 Guess a number 1–20.\nAnswer: '+p+'numberbattle 10');}
const q=pick(trivia);start(key,type,q[2]);return reply('🧠 '+q[0]+'\n'+q[1].map((x,i)=>(i+1)+'. '+x).join('\n')+'\nAnswer: '+p+'quizbattle 1-4');
}};
