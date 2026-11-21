// AI utilities built on the existing RAM-MD provider/fallback configuration.
const ai = require('../lib/ai');
const tasks = {
  trt: ['Translate the user text accurately. If the first line starts with "to <language>:", translate to that language; otherwise translate to English. Output only the translation.', 'to Bengali: How are you?'],
  summarize: ['Summarize the supplied text accurately in concise bullet points. Preserve important facts and uncertainty.', 'Paste the text to summarize'],
  translate: ['Translate the user text accurately. If the first line starts with "to <language>:", translate to that language; otherwise translate to English. Output only the translation.', 'to Bengali: How are you?'],
  grammar: ['Correct spelling, grammar, and punctuation while preserving meaning and language. Return only the corrected text.', 'i has a new phone'],
  rewrite: ['Rewrite the text clearly and professionally without adding facts. Return only the rewritten text.', 'Please send me the details soon'],
  explain: ['Explain the topic in simple language, with a short example where helpful. State uncertainty where needed.', 'What is an API?'],
  caption: ['Write 3 engaging, original social media captions for the given topic. Keep them suitable for general audiences.', 'Anime review'],
  hashtags: ['Suggest 12 relevant social media hashtags for the topic. Avoid unrelated or misleading tags.', 'Action anime'],
  email: ['Draft a concise professional email from the user request. Do not invent recipient names, addresses, or facts.', 'Ask for a meeting next week'],
  codehelp: ['Help explain or debug the provided code/question. Give safe practical examples and identify assumptions.', 'Explain async await in JavaScript'],
  quiz: ['Create 5 multiple-choice questions on the given topic, each with 4 options, followed by a separate answer key.', 'JavaScript basics'],
};
const perChat = new Map();
const MAX_CHATS = 500;
module.exports = {
  name: 'ai-utility-pack',
  command: Object.keys(tasks),
  menu: Object.keys(tasks),
  category: 'Tools',
  desc: 'AI summary, translation, grammar, rewrite, explain, captions, hashtags, email, coding and quizzes',
  async run({ command, text, from, config, reply }) {
    const task = tasks[command];
    if (!task) return;
    const input = String(text || '').trim();
    const prefix = config.prefix || '.';
    if (!input) return reply('🤖 *RAM-MD AI ' + command.toUpperCase() + '*\n\nUsage: ' + prefix + command + ' ' + task[1]);
    if (input.length > 5000) return reply('❌ Text too long. Maximum 5,000 characters.');
    if (!ai.hasKey(config)) return reply('⚙️ No AI API key configured. Set AI_KEY_GROQ, AI_KEY_OPENAI, or another supported AI provider key and restart the bot.');
    const now = Date.now();
    if (perChat.size > MAX_CHATS) for (const [k, v] of perChat) if (now - v > 120000) perChat.delete(k);
    const previous = perChat.get(from) || 0;
    if (now - previous < 4000) return reply('⏳ Please wait a few seconds before using another AI utility.');
    perChat.set(from, now);
    try {
      const output = await ai.ask(config, {
        system: 'You are RAM-MD, a helpful WhatsApp AI utility. ' + task[0] + ' Do not claim to have checked external sources. Keep the reply under 2200 characters, use plain readable text.',
        history: [],
        text: input,
      });
      const answer = String(output || '').trim();
      if (!answer) return reply('❌ The AI returned an empty response.');
      return reply('🤖 *RAM-MD AI ' + command.toUpperCase() + '*\n\n' + answer.slice(0, 3500));
    } catch (error) {
      console.error('[AI utility ' + command + ']', error.message);
      const status = error.status;
      const hint = status === 429 ? 'AI quota/rate limit reached. Try later or configure a fallback provider.'
        : /no key/i.test(error.message || '') ? 'Configure an AI API key.'
        : 'Check AI provider settings and try .aitest.';
      return reply('❌ AI request failed. ' + hint);
    }
  },
};
