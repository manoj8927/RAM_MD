const fs=require('fs'),path=require('path');const {jidNormalizedUser}=require('@whiskeysockets/baileys');
const file=path.join(__dirname,'..','data','group-extras.json');let state={};try{state=JSON.parse(fs.readFileSync(file,'utf8'));}catch{}
const save=()=>{try{fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,JSON.stringify(state));}catch(e){console.error('Group state save:',e.message);}};
const settings=id=>state[id]||(state[id]={welcome:false,goodbye:false,antilink:false,warnings:{}});
const norm=x=>jidNormalizedUser(x||'');
async function adminCtx(sock,msg,from){const m=await sock.groupMetadata(from);const sender=norm(msg.key.participant||sock.user.id);return {sender,admin:m.participants.some(p=>norm(p.id)===sender&&p.admin),botAdmin:m.participants.some(p=>norm(p.id)===norm(sock.user.id)&&p.admin)};}
module.exports={name:'group-extras',command:['welcome','goodbye','antilink','warn','warnings','poll'],menu:['welcome','goodbye','antilink','warn','warnings','poll'],category:'Group',desc:'Welcome/goodbye, anti-link, warnings and polls',hookPriority:-20,
async run({sock,msg,from,command,text,reply,isOwner}){
if(!from.endsWith('@g.us'))return reply('Group only.');
const {admin}=await adminCtx(sock,msg,from),s=settings(from);
if(command==='warnings'){const target=msg.message?.extendedTextMessage?.contextInfo?.participant||msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0];if(target)return reply('⚠️ Warnings: '+(s.warnings[norm(target)]||0));return reply('⚠️ *Warnings*\n'+(Object.entries(s.warnings).filter(([,n])=>n>0).map(([u,n])=>u.split('@')[0]+': '+n).join('\n')||'No warnings.'));}
if(!admin&&!isOwner)return reply('Group admin only.');
if(['welcome','goodbye','antilink'].includes(command)){const v=String(text||'').toLowerCase().trim();if(!['on','off'].includes(v))return reply('Usage: .'+command+' on/off\nCurrently: '+(s[command]?'on':'off'));s[command]=v==='on';save();return reply('✅ '+command+' '+v);}
if(command==='warn'){const ctx=msg.message?.extendedTextMessage?.contextInfo;const target=ctx?.mentionedJid?.[0]||ctx?.participant;if(!target)return reply('Mention a member or reply to their message with .warn');const id=norm(target);s.warnings[id]=Math.min(999,(s.warnings[id]||0)+1);save();return reply('⚠️ Warning for '+id.split('@')[0]+': '+s.warnings[id]+'\nNo automatic removal.');}
if(command==='poll'){const parts=String(text||'').split('|').map(x=>x.trim()).filter(Boolean);if(parts.length<3||parts.length>13)return reply('Usage: .poll Best anime? | Naruto | One Piece\n2–12 options.');if(parts.some(x=>x.length>100))return reply('Each poll field must be under 100 characters.');try{return await sock.sendMessage(from,{poll:{name:parts[0],values:parts.slice(1),selectableCount:1}},{quoted:msg});}catch(e){return reply('Poll could not be sent: '+e.message);}}
},
async onMessage({sock,msg,from,text,reply}){if(!from.endsWith('@g.us')||msg.key.fromMe)return false;const s=settings(from);if(!s.antilink||!/(?:https?:\/\/|www\.|chat\.whatsapp\.com\/)/i.test(text))return false;
try{const {sender,admin,botAdmin}=await adminCtx(sock,msg,from);if(admin)return false;if(botAdmin){try{await sock.sendMessage(from,{delete:msg.key});}catch(e){console.error('Delete failed:',e.message);}}await reply('🔗 Links are disabled in this group.');return true;}catch(e){console.error('Anti-link:',e.message);return false;}},
async onParticipants({sock,update}){const {id,participants,action}=update;if(!id||!Array.isArray(participants))return;const s=settings(id);const enabled=action==='add'?s.welcome:action==='remove'?s.goodbye:false;if(!enabled)return;for(const participant of participants.slice(0,10)){const user=typeof participant==='string'?participant:participant.id||participant.phoneNumber||'';try{await sock.sendMessage(id,{text:(action==='add'?'👋 Welcome':'👋 Goodbye')+' @'+user.split('@')[0],mentions:user?[user]:[]});}catch(e){console.error('Group greeting:',e.message);}}}
};
