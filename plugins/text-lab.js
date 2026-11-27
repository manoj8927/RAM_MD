'use strict';
// Offline text & formatting tools, no third-party APIs or network access.
const crypto = require('crypto');
const MAX_INPUT = 4500;
const MAX_REPLY = 2900;
const MORSE = {
  A:'.-', B:'-...', C:'-.-.', D:'-..', E:'.', F:'..-.', G:'--.', H:'....',
  I:'..', J:'.---', K:'-.-', L:'.-..', M:'--', N:'-.', O:'---', P:'.--.',
  Q:'--.-', R:'.-.', S:'...', T:'-', U:'..-', V:'...-', W:'.--', X:'-..-',
  Y:'-.--', Z:'--..', 0:'-----', 1:'.----', 2:'..---', 3:'...--',
  4:'....-', 5:'.....', 6:'-....', 7:'--...', 8:'---..', 9:'----.',
  '.':'.-.-.-', ',':'--..--', '?':'..--..', '!':'-.-.--'
};
const UNMORSE = Object.fromEntries(Object.entries(MORSE).map(([k,v])=>[v,k]));
function rawText(msg) {
  const m=msg?.message||{};
  return m.conversation||m.extendedTextMessage?.text||m.imageMessage?.caption||m.videoMessage?.caption||'';
}
function inputFrom(ctx) {
  const full=rawText(ctx.msg);
  const prefix=ctx.config?.prefix||'.';
  if (full.startsWith(prefix)) {
    const match=/^\S+\s*/.exec(full);
    if (match) return full.slice(match[0].length).trim();
  }
  return String(ctx.text||'').trim();
}
function limit(text) {
  const t=String(text||'');
  return t.length <= MAX_REPLY ? t : t.slice(0,MAX_REPLY)+'\n…truncated to keep WhatsApp readable.';
}
function linesOf(input) {
  const entries=input.includes('\n')?input.split(/\r?\n/):input.split('|');
  return entries.map(v=>v.trim()).filter(Boolean);
}
const COMMANDS = [
  'textstats','slug','titlecase','dedupe','sortlines','rot13','hexencode',
  'hexdecode','morse','demorse','extractlinks','wordfreq','randomcolor','caseflip'
];
function apply(command, input) {
  if (command==='randomcolor') return '🎨 Random HEX color: *#'+crypto.randomBytes(3).toString('hex').toUpperCase()+'*';
  if (!input) throw new Error('Please provide text after the command.');
  if (input.length>MAX_INPUT) throw new Error('Text too long (maximum '+MAX_INPUT+' characters).');
  if (command==='textstats') {
    const words=input.match(/[\p{L}\p{N}]+(?:['’-][\p{L}\p{N}]+)*/gu)||[];
    const letters=input.match(/\p{L}/gu)||[];
    const digits=input.match(/\p{N}/gu)||[];
    return ['📊 *TEXT STATS*',
      'Characters: '+[...input].length,
      'Without spaces: '+[...input.replace(/\s/gu,'')].length,
      'Words: '+words.length,
      'Letters: '+letters.length,
      'Digits: '+digits.length,
      'Lines: '+input.split(/\r?\n/).length,
      'UTF-8 bytes: '+Buffer.byteLength(input)].join('\n');
  }
  if (command==='slug') {
    return '🔗 '+input.normalize('NFKC').toLowerCase()
      .replace(/[^\p{L}\p{N}]+/gu,'-').replace(/^-+|-+$/g,'').slice(0,250);
  }
  if (command==='titlecase') return limit('🔠 '+input.toLocaleLowerCase().replace(/(^|[^\p{L}])(\p{L})/gu,(_,sep,c)=>sep+c.toLocaleUpperCase()));
  if (command==='dedupe'||command==='sortlines') {
    const lines=linesOf(input);
    if (lines.length<2) throw new Error('Provide at least two lines (or separate items with |).');
    const result=command==='sortlines'
      ? [...lines].sort((a,b)=>a.localeCompare(b,'en',{sensitivity:'base',numeric:true}))
      : lines.filter((value,index,all)=>all.findIndex(item=>item.toLocaleLowerCase()===value.toLocaleLowerCase())===index);
    return limit((command==='dedupe'?'🧹 *DUPLICATES REMOVED*':'🔤 *SORTED LINES*')+
      '\n'+result.join('\n')+'\n\nTotal: '+result.length);
  }
  if (command==='rot13') return limit('🔄 '+input.replace(/[a-zA-Z]/g,c=>String.fromCharCode(c.charCodeAt(0)+(c.toLowerCase()<='m'?13:-13))));
  if (command==='hexencode') {
    if (Buffer.byteLength(input)>1200) throw new Error('Hex input limit: 1200 UTF-8 bytes.');
    return '🔐 '+Buffer.from(input,'utf8').toString('hex');
  }
  if (command==='hexdecode') {
    const hex=input.replace(/\s+/g,'');
    if (!hex||hex.length%2||hex.length>4000||!/^[a-f\d]+$/i.test(hex))
      throw new Error('Enter an even-length hexadecimal string (maximum 4000 digits).');
    const buf=Buffer.from(hex,'hex');
    const decoded=buf.toString('utf8');
    if (!Buffer.from(decoded,'utf8').equals(buf)) throw new Error('Hex is not valid UTF-8 text.');
    return limit('🔓 '+decoded);
  }
  if (command==='morse') {
    if (input.length>400) throw new Error('Morse input limit: 400 characters.');
    const normalized=input.toUpperCase().normalize('NFKD');
    const unknown=[...normalized].filter(c=>!MORSE[c]&&!/\s/.test(c));
    if (unknown.length) throw new Error('Morse supports A–Z, 0–9 and . , ? ! only.');
    return limit('📡 '+normalized.trim().split(/\s+/).map(word=>[...word].map(c=>MORSE[c]).join(' ')).join(' / '));
  }
  if (command==='demorse') {
    const tokens=input.trim().split(/\s+/);
    if (tokens.some(token=>token!=='/'&&!UNMORSE[token]))
      throw new Error('Unknown Morse sequence. Separate letters with spaces and words with /.');
    return limit('📡 '+tokens.map(t=>t==='/'?' ':UNMORSE[t]).join(''));
  }
  if (command==='extractlinks') {
    const matches=input.match(/https?:\/\/[^\s<>]+/gi)||[];
    const links=[...new Set(matches.map(x=>x.replace(/[),.!?;]+$/g,'')))];
    return links.length?limit('🔗 *FOUND LINKS ('+links.length+')*\n'+links.map((v,i)=>(i+1)+'. '+v).join('\n')):'No HTTP/HTTPS links found.';
  }
  if (command==='wordfreq') {
    const words=(input.toLocaleLowerCase().match(/[\p{L}\p{N}]+/gu)||[]);
    const map=new Map();
    for(const word of words) map.set(word,(map.get(word)||0)+1);
    const top=[...map.entries()].sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0])).slice(0,15);
    return '📚 *TOP WORD FREQUENCY*\n'+(top.length?top.map(([word,n],i)=>(i+1)+'. '+word+' — '+n).join('\n'):'No words found.');
  }
  if (command==='caseflip') {
    return limit('🔡 '+[...input].map(c=>c.toUpperCase()===c?c.toLowerCase():c.toUpperCase()).join(''));
  }
  throw new Error('Unsupported text command.');
}
module.exports = {
  name:'text-lab',
  command:COMMANDS,
  menu:COMMANDS,
  category:'Tools',
  desc:'Offline text analysis, formatting, hex, Morse, lines and URL extraction',
  apply, inputFrom,
  async run(ctx) {
    const p=ctx.config?.prefix||'.';
    const input=inputFrom(ctx);
    try {
      if (!input&&ctx.command!=='randomcolor') return ctx.reply('Usage: '+p+ctx.command+
        ' <text>\nFor dedupe/sortlines, separate entries using new lines or |.');
      return ctx.reply(apply(ctx.command,input));
    } catch(e) {
      return ctx.reply('❌ '+e.message);
    }
  }
};
