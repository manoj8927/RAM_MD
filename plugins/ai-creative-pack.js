const ai=require('../lib/ai');
const tasks={
aiscript:['Write a concise original video script with scene directions, dialogue and a hook.','YouTube video about anime'],
aidebate:['Present balanced arguments for and against the topic, then a fair conclusion.','Online learning vs classroom'],
aistory:['Write an original short story with a beginning, middle and ending.','A mysterious robot'],
aiprompt:['Create a detailed reusable AI prompt for the stated task, with context, constraints and output format.','Logo for my gaming channel'],
aivoice:['Write a short, natural voiceover script (plain text only). Do not claim to produce audio.','Intro for my movie review']};
module.exports={name:'ai-creative-pack',command:Object.keys(tasks),menu:Object.keys(tasks),category:'Tools',desc:'AI scripts, debates, stories, prompts and voiceover text',async run({command,text,reply,config}){
const item=tasks[command],input=String(text||'').trim();
if(!input)return reply('Usage: '+(config.prefix||'.')+command+' '+item[1]);
if(input.length>4000)return reply('Limit: 4000 characters.');
if(!ai.hasKey(config))return reply('Configure your AI provider key first, then use .aitest.');
try{const result=await ai.ask(config,{system:'You are RAM-MD. '+item[0]+' Be helpful, accurate, and concise. Respond in the user\'s language when possible.',history:[],text:input});return reply('🤖 *'+command.toUpperCase()+'*\n\n'+String(result).slice(0,3500));}
catch(e){console.error('AI creative:',e.message);return reply('AI request failed. Check .aitest, quota and provider settings.');}
}};
