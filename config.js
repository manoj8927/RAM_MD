module.exports = {
  phoneNumber: '8801XXXXXXXXX', // country code + number, digits only
  owners: ['8801XXXXXXXXX'],    // owner numbers (can use owner-only commands)
  prefix: '.',
  botName: '『ＲＡＭ－ＭＤ』⚡',
  ownerName: 'Sanjoy Mahato',
  version: '1.0.0',

  // Menu look: picture on top, and the channel it appears to be forwarded from
  menuImage: 'https://raw.githubusercontent.com/manoj8927/IMG-url/main/manu.jpg',
  aliveImage: '', // blank = use menuImage; set a direct image URL for .alive
  newsletterJid: '120363413703815929@newsletter',
  newsletterName: 'ＲＡＭ－ＭＤ',

  autoStatusView: true,
  autoStatusReact: true,
  emojis: ['❤️', '🔥', '😂', '👍', '😍', '🙌'],
  minDelay: 2000, // ms, delay before viewing/reacting
  maxDelay: 5000,
  // Games: where the game pages are hosted (the dp-web site serves /games), and how to send them
  gameBaseUrl: '', // Set an HTTPS game host URL if you want link mode; file mode works without hosting // set '' to disable the link
  gameMode: 'both', // 'file', 'link' or 'both'

  // Video quality for downloads: crf 18 (best, big files) to 28 (small files); maxSide = limit for the shorter side in px
  videoCrf: 20,
  videoMaxSide: 1440,
  ytMaxHeight: 1080,
  qualityButtons: false, // true = also try tap buttons (many WhatsApp versions do not show them); the numbered list always works
  askQuality: true,     // false = .ytmp4 / .video download right away at ytMaxHeight

  // AI auto reply (Bengali). Get a free key at aistudio.google.com, then put it in ai_key.txt (not here)
  autoReply: true,        // .autoreply on/off changes this from WhatsApp
  aiProvider: 'openai',   // gemini | chatgpt | claude | groq | openrouter | deepseek | mistral | grok | custom
  aiFallback: ['groq'],   // use Groq when OpenAI fails or has no credits
  aiModel: '',            // blank = a good default for the provider
  aiBaseUrl: '',          // only for openai-compatible services (Groq, OpenRouter...)
  aiSearch: false,        // true = the AI may look things up on Google (news, today's facts); Gemini only
  aiName: 'RAM-MD',       // the name the AI uses for itself
  aiPersona: 'friend',    // 'friend' = fun chat and time pass | 'assistant' = answers for the owner
  aiPrompt: '',           // or write the whole personality yourself here
  aiIntro: true,
  aiReplyLanguage: 'English', // English | same | Bengali | Banglish; change this to customize replies
  // Exact greeting rules are checked before AI. Edit the replies to customize them.
  autoReplyRules: [
    { match: '^(hi|hello|hey|h[ei]llo|how are you|how r u|kemon acho|kasa ho|kaisa ho)[!?., ]*$', replies: ['Hi! I am RAM-MD, your AI friend. How are you?', 'Hello! I am doing great. How can I help you today?'] },
  ],          // first reply says it is an AI assistant
  aiReplyOwner: false,    // true = also answer your own numbers (for testing)
  aiIgnore: [],           // numbers to never answer, e.g. ['8801XXXXXXXXX']

  debug: false, // enable only while diagnosing a problem
};
