const crypto=require('crypto');const pick=a=>a[crypto.randomInt(a.length)];
const jokes=['Why did the computer go to the doctor? It had a virus!','Why was the math book sad? It had too many problems.','Why do programmers prefer dark mode? Because light attracts bugs.'];
const facts=['Octopuses have three hearts.','Honey bees communicate through a waggle dance.','Venus rotates more slowly than it orbits the Sun.','A group of flamingos is called a flamboyance.'];
const quotes=['Small steps every day add up.','Progress matters more than perfection.','Stay curious and keep learning.','Kindness is a strength.'];
const roasts=['You are the human version of a loading screen. 😄','Your Wi-Fi signal has more confidence than your plans. 😂','Even autocorrect needs a break after your messages. 😆'];
module.exports={name:'fun-extra',command:['joke','fact','quote','roast','ship','meme'],menu:['joke','fact','quote','roast','ship','meme'],category:'Games',desc:'Friendly jokes, facts, quotes, memes and ship games',async run({command,text,reply}){
if(command==='joke')return reply('😂 '+pick(jokes));
if(command==='fact')return reply('🧠 '+pick(facts));
if(command==='quote')return reply('✨ '+pick(quotes));
if(command==='roast')return reply('😜 *Friendly joke only:* '+pick(roasts));
if(command==='ship'){const names=String(text||'').split(',').map(x=>x.trim().slice(0,40)).filter(Boolean);if(names.length!==2)return reply('Usage: .ship Alice, Bob');return reply('💞 '+names[0]+' + '+names[1]+' = '+crypto.randomInt(1,101)+'% match\n🎲 Random game, not a real compatibility score.');}
if(command==='meme')return reply('😂 *RAM-MD MEME*\n'+pick(['Me: Just one more episode.\nAlso me at 4 AM: 👀','When code works on the first try: Suspicious. 🤨','Wi-Fi: Connected.\nInternet: Not today. 💀']));
}};
