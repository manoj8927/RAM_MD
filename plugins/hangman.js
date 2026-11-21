const crypto=require('crypto');const words=['planet','banana','rocket','garden','puzzle','tiger','castle','dragon'];const games=new Map();
module.exports={name:'hangman',command:['hangman'],menu:['hangman'],category:'Games',desc:'Guess letters in a word in up to 7 misses',async run({text,from,msg,reply,config}){
const p=config.prefix||'.',user=msg.key.participant||from,key=from+'|'+user,letter=String(text||'').trim().toLowerCase();let g=games.get(key);
if(g&&Date.now()-g.at>600000){games.delete(key);g=null;}
if(!g||letter==='new'){const word=words[crypto.randomInt(words.length)];g={word,guessed:[],miss:0,at:Date.now()};games.set(key,g);}
else if(letter){if(!/^[a-z]$/.test(letter))return reply('Guess one letter: '+p+'hangman a\nNew game: '+p+'hangman new');if(g.guessed.includes(letter))return reply('Already guessed: '+letter);g.guessed.push(letter);if(!g.word.includes(letter))g.miss++;}
const display=[...g.word].map(c=>g.guessed.includes(c)?c:'_').join(' '),won=!display.includes('_'),lost=g.miss>=7;
if(won||lost)games.delete(key);
return reply('🎮 *HANGMAN*\n'+display+'\n❌ Misses: '+g.miss+'/7\nGuessed: '+(g.guessed.join(', ')||'none')+'\n'+(won?'🎉 You win!':lost?'💀 Game over. Word: '+g.word:'Guess: '+p+'hangman a'));
}};
