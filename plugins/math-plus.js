'use strict';
// Additional offline math, budgeting, dates and word puzzles. No external API.
const COMMANDS = [
  'percent','discount','splitbill','gstcalc','average','median','factorial',
  'prime','roman','deroman','palindrome','anagram','agecalc','daysbetween'
];
const MAX_INPUT=450;
const fmt = n => new Intl.NumberFormat('en-IN',{maximumFractionDigits:4}).format(n);
const money = n => '₹' + fmt(n);
const usage = (cmd,p) => ({
  percent: '15 200', discount: '1500 20', splitbill: '1200 4 10',
  gstcalc: '1000 18', average: '2 4 6', median: '8 3 5',
  factorial: '10', prime: '97', roman: '2026', deroman: 'MMXXVI',
  palindrome: 'Never odd or even', anagram: 'listen | silent',
  agecalc: '2000-01-15', daysbetween: '2026-01-01 2026-12-31',
})[cmd] || '';
function parts(input) { return input.trim().split(/[\s,]+/).filter(Boolean); }
function number(v, label='Number', max=1e12) {
  if (typeof v!=='string'||!/^[+-]?(?:\d+\.?\d*|\.\d+)$/.test(v))
    throw new Error(label + ' must be a number.');
  const n=Number(v);
  if (!Number.isFinite(n)||Math.abs(n)>max) throw new Error(label + ' is out of range.');
  return n;
}
function nonnegative(v,label,max=1e12) {
  const n=number(v,label,max);
  if(n<0) throw new Error(label + ' cannot be negative.');
  return n;
}
function required(args,n) {
  if(args.length!==n) throw new Error('Expected exactly '+n+' value(s).');
}
function percent(v) {
  const n=nonnegative(v,'Percent',100);
  return n;
}
function roman(num) {
  const vals=[1000,900,500,400,100,90,50,40,10,9,5,4,1];
  const syms=['M','CM','D','CD','C','XC','L','XL','X','IX','V','IV','I'];
  let remaining=num,out='';
  for(let i=0;i<vals.length;i++)while(remaining>=vals[i]){out+=syms[i];remaining-=vals[i];}
  return out;
}
function deroman(input) {
  const s=input.toUpperCase();
  if(!/^[MDCLXVI]{1,15}$/.test(s))throw new Error('Use a Roman numeral such as MMXXVI.');
  const map={M:1000,D:500,C:100,L:50,X:10,V:5,I:1};
  let total=0;
  for(let i=0;i<s.length;i++){
    const val=map[s[i]];
    total+=i+1<s.length&&val<map[s[i+1]]?-val:val;
  }
  if(total<1||total>3999||roman(total)!==s)throw new Error('Invalid/non-standard Roman numeral (range 1–3999).');
  return total;
}
function parseDate(s) {
  if(!/^\d{4}-\d{2}-\d{2}$/.test(s))throw new Error('Date must be YYYY-MM-DD.');
  const [y,m,d]=s.split('-').map(Number);
  if(y<1000||y>9999||m<1||m>12||d<1||d>31)throw new Error('Invalid calendar date.');
  const time=Date.UTC(y,m-1,d);
  const x=new Date(time);
  if(x.getUTCFullYear()!==y||x.getUTCMonth()!==m-1||x.getUTCDate()!==d)throw new Error('Invalid calendar date.');
  return time;
}
function folded(s) {
  return [...s.normalize('NFKC').toLocaleLowerCase().replace(/[^\p{L}\p{M}\p{N}]/gu,'')];
}
function execute(command,input,now=new Date()) {
  const text=String(input||'').trim();
  if(text.length>MAX_INPUT)throw new Error('Input is too long (450 characters maximum).');
  if(!text)throw new Error('Enter a value. Example: '+command+' '+usage(command));
  const args=parts(text);
  if(command==='percent') {
    required(args,2);
    const p=number(args[0],'Percent',100000),base=number(args[1],'Base');
    return '🧮 '+fmt(p)+'% of '+fmt(base)+' = *'+fmt(p*base/100)+'*';
  }
  if(command==='discount') {
    required(args,2);
    const price=nonnegative(args[0],'Original amount');
    const p=percent(args[1]);
    const saving=price*p/100;
    return '🏷️ *DISCOUNT*\nOriginal: '+money(price)+'\nDiscount: '+fmt(p)+'%\nSavings: '+money(saving)+'\nPay: *'+money(price-saving)+'*';
  }
  if(command==='splitbill') {
    if(args.length<2||args.length>3)throw new Error('Usage: splitbill <amount> <people> [tip%]');
    const amount=nonnegative(args[0],'Bill');
    const people=number(args[1],'People',1000);
    if(!Number.isInteger(people)||people<1)throw new Error('People must be a whole number from 1 to 1000.');
    const tip=args[2]===undefined?0:percent(args[2]);
    const tipAmt=amount*tip/100,total=amount+tipAmt;
    return '👥 *SPLIT BILL*\nBill: '+money(amount)+'\nTip ('+fmt(tip)+'%): '+money(tipAmt)+'\nPeople: '+people+'\nTotal: '+money(total)+'\nEach: *'+money(total/people)+'*';
  }
  if(command==='gstcalc') {
    required(args,2);
    const amount=nonnegative(args[0],'Amount'),rate=percent(args[1]);
    const tax=amount*rate/100;
    return '🧾 *GST (added to base amount)*\nBase: '+money(amount)+'\nGST: '+fmt(rate)+'% = '+money(tax)+'\nTotal: *'+money(amount+tax)+'*';
  }
  if(command==='average'||command==='median') {
    if(args.length<1||args.length>50)throw new Error('Enter 1 to 50 numbers.');
    const n=args.map(x=>number(x,'Value',1e9));
    if(command==='average')return '📊 Average of '+n.length+' numbers: *'+fmt(n.reduce((a,b)=>a+b,0)/n.length)+'*';
    const sorted=[...n].sort((a,b)=>a-b);
    const mid=Math.floor(sorted.length/2);
    return '📊 Median: *'+fmt(sorted.length%2?sorted[mid]:(sorted[mid-1]+sorted[mid])/2)+'*';
  }
  if(command==='factorial') {
    required(args,1);const n=number(args[0],'n',100);
    if(!Number.isInteger(n)||n<0)throw new Error('Factorial requires a whole number 0–100.');
    let val=1n;for(let i=2n;i<=BigInt(n);i++)val*=i;
    return '🔢 '+n+'! = *'+val.toString()+'*';
  }
  if(command==='prime') {
    required(args,1);const n=number(args[0],'n',1e9);
    if(!Number.isInteger(n)||n<0)throw new Error('Enter an integer 0–1,000,000,000.');
    if(n<2)return '🔢 '+n+' is not prime.';
    let prime=true;
    for(let d=2;d*d<=n;d+=(d===2?1:2)){if(n%d===0){prime=false;break;}}
    return '🔢 '+n+(prime?' *is PRIME* ✅':' is *not prime* ❌');
  }
  if(command==='roman') {
    required(args,1);const n=number(args[0],'n',3999);
    if(!Number.isInteger(n)||n<1)throw new Error('Roman numerals support integers 1–3999.');
    return '🏛️ '+n+' = *'+roman(n)+'*';
  }
  if(command==='deroman') {
    required(args,1);
    return '🏛️ '+args[0].toUpperCase()+' = *'+deroman(args[0])+'*';
  }
  if(command==='palindrome') {
    const arr=folded(text);
    if(!arr.length)throw new Error('Enter letters or numbers.');
    const yes=arr.join('')===[...arr].reverse().join('');
    return '🔄 '+(yes?'✅ Palindrome!':'❌ Not a palindrome.')+'\nIgnoring punctuation, spaces and letter case.';
  }
  if(command==='anagram') {
    const two=text.split('|');
    if(two.length!==2||!two[0].trim()||!two[1].trim())throw new Error('Usage: anagram <word 1> | <word 2>');
    const a=folded(two[0]).sort().join(''),b=folded(two[1]).sort().join('');
    if(!a||!b)throw new Error('Enter two words containing letters/numbers.');
    return a===b?'🔤 ✅ They are anagrams!':'🔤 ❌ Not anagrams.';
  }
  if(command==='agecalc') {
    required(args,1);const date=parseDate(args[0]);
    const today=Date.UTC(now.getUTCFullYear(),now.getUTCMonth(),now.getUTCDate());
    if(date>today)throw new Error('Birth date is in the future.');
    const birth=new Date(date);
    let age=now.getUTCFullYear()-birth.getUTCFullYear();
    if(now.getUTCMonth()<birth.getUTCMonth()||
      (now.getUTCMonth()===birth.getUTCMonth()&&now.getUTCDate()<birth.getUTCDate()))age--;
    return '🎂 Age: *'+age+' years* (as of '+new Date(today).toISOString().slice(0,10)+' UTC)';
  }
  if(command==='daysbetween') {
    required(args,2);const a=parseDate(args[0]),b=parseDate(args[1]);
    const days=Math.round((b-a)/86400000);
    return '📅 Days between dates: *'+Math.abs(days)+'*'+(days<0?' (second date is earlier)':'');
  }
  throw new Error('Unknown utility command.');
}
module.exports={
  name:'math-plus',
  command:COMMANDS,
  menu:COMMANDS,
  category:'Tools',
  desc:'Offline math, budget splits, GST, calendar, and word puzzles',
  execute,
  async run({command,text,config,reply}) {
    try{return reply(execute(command,text));}
    catch(e){return reply('❌ '+e.message+'\nExample: '+(config?.prefix||'.')+command+' '+usage(command));}
  }
};
