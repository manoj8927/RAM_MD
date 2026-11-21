// Offline group role games and friendly action messages. No API keys.
const crypto=require('crypto');
const roles=["dad","mom","son","daughter","boyfriend","girlfriend","twin","partner","bodyguard","boss","employee","pet","servant","idol","fan","ghost","angel","devil","king","queen","master","genius","fool","rich","poor","bhai","bahan","wife","husband","chacha","chachi","nana","nani","mama","mami","bestfriend","enemy","crush","teacher","student","rival","chad","npc","maincharacter","delulu","redflag","greenflag","sigma","rizz","simp","vibe"];
const actions=["shoot","sleep","clap","shrug","stare","wave","poke","confused","smile","peck","wink","sip","blush","smug","tickle","yeet","think","highfive","feed","bite","shocked","bleh","bored","nom","nya","yawn","facepalm","cuddle","kick","happy","carry","hug","kabedon","baka","bonk","angry","spin","shake","run","nod","nope","kiss","dance","punch","handshake","slap","cry","pout","blowkiss","handhold","salute","thumbsup","laugh","tableflip","yes","no","stop","sorry","sad","scared","surprised","tired","sigh","shy","nuzzle","cool","celebrate","yay","headbang","nosebleed","cringe","awoo","glomp","repeat"];
const pick=a=>a[crypto.randomInt(a.length)];
const safe=s=>String(s||'').replace(/[\r\n]/g,' ').trim().slice(0,70);
const emojis={hug:'🤗',kiss:'😘',slap:'🖐️',punch:'🥊',dance:'💃',cry:'😭',laugh:'😂',happy:'😄',sad:'😢',wave:'👋',angry:'😠',sleep:'😴',blush:'😊',wink:'😉',highfive:'🙌',salute:'🫡',thumbsup:'👍',cool:'😎',shy:'☺️',surprised:'😲',scared:'😱',tired:'🥱',smile:'🙂',stop:'✋',yes:'✅',no:'❌'};
const label=x=>x.replace(/([a-z])([A-Z])/g,'$1 $2');
module.exports={
 name:'offline-social-pack',
 command:[...roles,...actions,'aura','rate','compatibility','lovetest','shipname','compliment','pickup','coin','8ball','uptime','owner'],
 menu:[...roles,...actions,'aura','rate','compatibility','lovetest','shipname','compliment','pickup','coin','8ball','uptime','owner'],
 category:'Games',
 desc:'Offline role selection, action roleplay and party games',
 async run({command,text,from,msg,sock,config,reply}){
  const input=safe(text),prefix=config.prefix||'.';
  const members=async()=>{
   if(!from.endsWith('@g.us'))return [];
   const meta=await sock.groupMetadata(from);
   return meta.participants.map(x=>x.id).filter(Boolean).slice(0,1024);
  };
  if(roles.includes(command)){
   if(!from.endsWith('@g.us'))return reply('👥 Use .'+command+' in a group to pick a random member.');
   const ids=await members();
   if(!ids.length)return reply('No members available.');
   const target=pick(ids);
   return sock.sendMessage(from,{text:'🎲 *RAM-MD FUN ROLE*\n👑 Today’s *'+label(command)+'* is @'+target.split('@')[0]+'!\n\n🎭 Random game only.',mentions:[target]},{quoted:msg});
  }
  if(actions.includes(command)){
   const target=msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0]||msg.message?.extendedTextMessage?.contextInfo?.participant;
   const who=target?'@'+target.split('@')[0]:input||'everyone';
   return sock.sendMessage(from,{text:(emojis[command]||'✨')+' *'+command.toUpperCase()+'*\n'+(msg.pushName||'Someone')+' → '+who+'\n🎭 Just for fun!',mentions:target?[target]:[]},{quoted:msg});
  }
  if(command==='owner')return reply('👑 *BOT OWNER*\n'+(config.ownerName||'Owner')+'\n💬 https://t.me/Ramboss67');
  if(command==='uptime')return reply('⏱️ *RAM-MD UPTIME*\n'+Math.floor(process.uptime()/3600)+'h '+Math.floor(process.uptime()%3600/60)+'m '+Math.floor(process.uptime()%60)+'s');
  if(command==='coin')return reply('🪙 '+pick(['Heads','Tails']));
  if(command==='8ball')return reply(input?'🎱 '+pick(['Yes!','Probably','Ask again later','Not likely','Absolutely','Uncertain']):'Usage: '+prefix+'8ball Will I win?');
  if(command==='compliment')return reply('💐 '+pick(['You bring good energy!','You are creative and thoughtful.','Keep being curious!','You make the chat brighter.']));
  if(command==='pickup')return reply('💘 '+pick(['Are you Wi-Fi? Because I feel a connection.','Are you a keyboard? You are just my type.','Are you a star? You light up the chat.']));
  if(['aura','rate'].includes(command))return reply('✨ *'+command.toUpperCase()+'*\n'+(input||'You')+': '+crypto.randomInt(1,101)+'/100\n🎲 Random fun rating.');
  if(['compatibility','lovetest','shipname'].includes(command)){
   const names=input.split(/\s*[,|&]\s*/).filter(Boolean).slice(0,2);
   if(names.length!==2)return reply('Usage: '+prefix+command+' Alex, Sam');
   if(command==='shipname'){const a=names[0],b=names[1];return reply('💞 Ship name: *'+a.slice(0,Math.ceil(a.length/2))+b.slice(Math.floor(b.length/2))+'*');}
   return reply('💞 '+names.join(' ❤️ ')+'\nMatch: '+crypto.randomInt(101)+'%\n🎲 Entertainment only.');
  }
 }
};
