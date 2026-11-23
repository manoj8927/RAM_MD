'use strict';
// Compatibility layer for basic Levanter Module({pattern,...}, handler) plugins.
// Not a sandbox: only install reviewed code. Unsupported Levanter APIs fail clearly.
const registrations=[];
function register(meta, handler) {
  if (!meta || typeof handler!=='function') throw new Error('Invalid Levanter Module registration');
  const pattern=meta.pattern||meta.command;
  if(!pattern)throw new Error('Levanter module has no pattern');
  const source=String(pattern);
  const name=source.replace(/^\^/,'').split(/[\\s(\[?*+|$]/)[0].replace(/[^\w-]/g,'').toLowerCase();
  if(!name)throw new Error('Unsupported Levanter command pattern: '+source);
  registrations.push({name,meta,handler});
}
function makeMessage(ctx) {
  const {sock,msg,from,reply}=ctx;
  return {
    jid:from, chat:from, from, id:msg.key?.id,
    sender:msg.key?.participant||from, participant:msg.key?.participant,
    isGroup:from.endsWith('@g.us'), isOwner:ctx.isOwner,
    message:msg, key:msg.key, client:sock,
    reply:async(text)=>reply(String(text)),
    send:async(text)=>reply(String(text)),
    sendMessage:async(content,options)=>sock.sendMessage(from,typeof content==='string'?{text:content}:content,{quoted:msg,...options}),
    react:async(emoji)=>sock.sendMessage(from,{react:{text:String(emoji),key:msg.key}}),
    delete:async()=>sock.sendMessage(from,{delete:msg.key}),
  };
}
function wrap(file,definitions){
  return definitions.map((entry)=>({
    name:'levanter-'+entry.name, command:[entry.name],
    category:entry.meta.type||'Levanter', desc:entry.meta.desc||'Levanter-compatible command',
    owner:Boolean(entry.meta.fromMe),
    async run(ctx) {
      const m=makeMessage(ctx);
      const match=ctx.args.join(' ');
      try {await entry.handler(m,match,ctx.msg,ctx.sock);}
      catch(e){console.error('Levanter adapter error ['+file+'/'+entry.name+']:',e.message);await ctx.reply('⚠️ This Levanter plugin uses unsupported APIs: '+e.message.slice(0,130));}
    }
  }));
}
module.exports={register,wrap,registrations};
