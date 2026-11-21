// Talks to AI services. Supported: Gemini (free key from Google AI Studio), Claude (Anthropic),
// ChatGPT (OpenAI) and anything that speaks the same language as OpenAI: Groq, OpenRouter, DeepSeek,
// Mistral, Grok (xAI) or your own address ("custom" + aiBaseUrl).
// config.aiProvider can be one name or a list ("gemini,groq"): if the first one fails
// (no free quota left, down, wrong key) the next one answers.
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

const PRESETS = {
  gemini: { type: 'gemini', label: 'Gemini' },
  anthropic: { type: 'anthropic', label: 'Claude', model: 'claude-haiku-5-5' },
  openai: { type: 'openai', label: 'ChatGPT', base: 'https://api.openai.com/v1', model: '' },
  groq: { type: 'openai', label: 'Groq', base: 'https://api.groq.com/openai/v1', model: 'llama-3.3-70b-versatile' },
  openrouter: { type: 'openai', label: 'OpenRouter', base: 'https://openrouter.ai/api/v1', model: 'openrouter/auto' },
  deepseek: { type: 'openai', label: 'DeepSeek', base: 'https://api.deepseek.com', model: 'deepseek-chat' },
  mistral: { type: 'openai', label: 'Mistral', base: 'https://api.mistral.ai/v1', model: 'mistral-small-latest' },
  xai: { type: 'openai', label: 'Grok', base: 'https://api.x.ai/v1', model: '' },
  custom: { type: 'openai', label: 'Custom', base: '', model: '' },
};
const ALIASES = { chatgpt: 'openai', gpt: 'openai', claude: 'anthropic', google: 'gemini', grok: 'xai' };
const normName = (n) => { const s = String(n || '').trim().toLowerCase(); return ALIASES[s] || s; };

// ---------- which providers, which keys, which models ----------
// The services to use, in order: config.aiProvider (one name or "a,b"), then config.aiFallback.
function chain(config) {
  const list = (v) => (Array.isArray(v) ? v : String(v || '').split(','));
  const all = [...new Set([...list(config.aiProvider || 'gemini'), ...list(config.aiFallback)].map(normName).filter(Boolean))];
  return all.length ? all : ['gemini'];
}
const names = () => Object.keys(PRESETS);

function readFile(name) {
  try { return fs.readFileSync(path.join(ROOT, name), 'utf8').trim(); } catch (e) { return ''; }
}

// The plain key (config.aiKey, env AI_KEY, ai_key.txt) belongs to the service named in config.js
// (kept in aiProviderGeneric when the owner switches service from WhatsApp with .aiset).
const genericOwner = (config) => normName(config.aiProviderGeneric || chain(config)[0]);

// the file where a service's key goes
function keyFile(config, provider) {
  const p = normName(provider);
  return p === genericOwner(config) ? 'ai_key.txt' : 'ai_key_' + p + '.txt';
}

// Key for a service: config.aiKeys.<name>, env AI_KEY_<NAME>, file ai_key_<name>.txt,
// and, for the service named in config.js, also aiKey / env AI_KEY / ai_key.txt.
function getKey(config, provider) {
  const p = normName(provider || chain(config)[0]);
  if (config.aiKeys && config.aiKeys[p]) return String(config.aiKeys[p]).trim();
  if (process.env['AI_KEY_' + p.toUpperCase()]) return process.env['AI_KEY_' + p.toUpperCase()].trim();
  const f = readFile('ai_key_' + p + '.txt');
  if (f) return f;
  if (p === genericOwner(config)) {
    if (config.aiKey) return String(config.aiKey).trim();
    if (process.env.AI_KEY) return process.env.AI_KEY.trim();
    return readFile('ai_key.txt');
  }
  return '';
}
const hasKey = (config) => chain(config).some((p) => !!getKey(config, p));

// the model set in config.js (or with .aiset) applies to the first service; aiModels sets one per service
const modelFor = (config, p) => (config.aiModels && config.aiModels[p]) || (p === chain(config)[0] && config.aiModel) || '';

// ---------- plain requests ----------
async function request(method, url, headers, body, timeoutMs = 30000) {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), timeoutMs);
  try {
    const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json', ...headers }, body: body ? JSON.stringify(body) : undefined, signal: ctl.signal });
    const raw = await res.text();
    let data = {};
    try { data = JSON.parse(raw); } catch (e) {}
    if (!res.ok) {
      const err = new Error((data.error && (data.error.message || data.error)) || raw.slice(0, 200) || 'HTTP ' + res.status);
      err.status = res.status;
      for (const d of (data.error && data.error.details) || []) {
        const kind = String(d['@type'] || '');
        if (/RetryInfo/.test(kind) && d.retryDelay) err.retryAfter = Math.ceil(parseFloat(d.retryDelay)) || undefined;
        if (/QuotaFailure/.test(kind)) err.quota = (d.violations || []).map((v) => v.quotaId || v.quotaMetric || '').join(' ');
      }
      if (/limit:\s*0\b/.test(String(err.message))) err.limitZero = true;
      throw err;
    }
    return data;
  } catch (e) {
    if (e.name === 'AbortError') {
      const t = new Error('The AI took too long to answer');
      t.timeout = true;
      throw t;
    }
    if (e.status === undefined) {
      // no answer came back at all: usually the bot cannot reach the internet or the address is blocked
      const code = (e.cause && (e.cause.code || e.cause.message)) || e.message;
      throw new Error('Could not reach the AI service (' + code + ')');
    }
    throw e;
  } finally {
    clearTimeout(timer);
  }
}
const post = (url, headers, body, t) => request('POST', url, headers, body, t);
const get = (url, headers, t) => request('GET', url, headers, null, t);

const retriable = (e) => e.timeout || [404, 429, 500, 502, 503].includes(e.status);

let lastModelUsed = '';
let lastProviderUsed = '';
const goodModel = {};  // provider -> the model that answered last time
const lastModel = () => lastModelUsed;
const lastProvider = () => lastProviderUsed;

// ---------- Gemini ----------
// Ask Google which models this very key may use, so the bot never guesses an old name.
let geminiList = { names: null, at: 0 };
const versionOf = (name) => (/^gemini-(\d+(?:\.\d+)*)-flash/.exec(name) || [, '0'])[1].split('.').map(Number);
const newer = (a, b) => {
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const d = (b[i] || 0) - (a[i] || 0);
    if (d) return d;
  }
  return 0;
};
async function geminiModels(key) {
  const data = await get('https://generativelanguage.googleapis.com/v1beta/models?pageSize=200', { 'x-goog-api-key': key }, 10000);
  return (data.models || [])
    .filter((m) => (m.supportedGenerationMethods || []).includes('generateContent'))
    .map((m) => String(m.name).replace(/^models\//, ''));
}
// plain "gemini-X.Y-flash" / "-flash-lite" only (no preview, image, audio or live variants), newest first,
// the faster "lite" before the normal one of the same version. Gemma (open models Google also serves
// through the same key, often with a separate free limit) come last.
async function geminiChoices(key) {
  if (geminiList.names && Date.now() - geminiList.at < 10 * 60 * 1000) return geminiList.names;
  const all = await geminiModels(key);
  const flash = all.filter((n) => /^gemini-\d+(\.\d+)*-flash(-lite)?$/.test(n));
  flash.sort((x, y) => newer(versionOf(x), versionOf(y)) || (/lite$/.test(y) ? 1 : 0) - (/lite$/.test(x) ? 1 : 0));
  const size = (n) => Number((/-(\d+)b-/.exec(n) || [, 0])[1]);
  const gemma = all.filter((n) => /^gemma-[\d.]+-\d+b-it$/.test(n)).sort((x, y) => size(y) - size(x));
  geminiList = { names: { flash, gemma }, at: Date.now() };
  return geminiList.names;
}

async function askGemini(config, key, { system, history, text }, deadline) {
  const queue = [...new Set([goodModel.gemini, modelFor(config, 'gemini')].filter(Boolean))];
  const tried = new Set();
  let discovered = false;
  const addMore = async () => {
    if (discovered) return;
    discovered = true;
    try {
      const c = await geminiChoices(key);
      for (const n of [...c.flash.slice(0, 4), ...c.gemma.slice(0, 2)]) if (!queue.includes(n)) queue.push(n);
    } catch (e) { /* only a help */ }
    for (const n of ['gemini-3.8-flash', 'gemini-3.5-flash-lite', 'gemini-3.5-flash', 'gemini-3.6-flash']) if (!queue.includes(n)) queue.push(n);
  };
  if (!queue.length) await addMore();

  const perTry = Number(config.aiTimeoutMs) || 20000;
  let lastErr;
  const log = [];  // what happened with each model, for .aitest
  while (queue.length && tried.size < 6) { // at most 6 models, then let a backup service take over
    const model = queue.shift();
    if (tried.has(model)) continue;
    tried.add(model);
    const left = deadline - Date.now();
    if (left < 1500) break;
    const turns = [
      ...history.map((h) => ({ role: h.role === 'assistant' ? 'model' : 'user', parts: [{ text: h.text }] })),
      { role: 'user', parts: [{ text }] },
    ];
    // Gemma has no separate instruction slot: put the personality in front of the first message
    const gemma = /^gemma/.test(model);
    if (gemma) turns[0] = { role: 'user', parts: [{ text: system + '\n\n---\n' + turns[0].parts[0].text }] };
    const body = {
      ...(gemma ? {} : { systemInstruction: { parts: [{ text: system }] } }),
      contents: turns,
      generationConfig: { maxOutputTokens: 1024, temperature: 0.9 },
    };
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
    const send = (b) => post(url, { 'x-goog-api-key': key }, b, Math.min(perTry, left));
    try {
      let data;
      if (config.aiSearch === true) {
        // optional: let the model look things up on Google (news, today's facts); retried without if refused
        try { data = await send({ ...body, tools: [{ google_search: {} }] }); }
        catch (e) { if (e.status !== 400) throw e; data = await send(body); }
      } else {
        data = await send(body);
      }
      const out = (data.candidates?.[0]?.content?.parts || []).map((p) => p.text || '').join('').trim();
      if (!out) throw new Error('Empty answer (' + (data.candidates?.[0]?.finishReason || 'no reason') + ')');
      goodModel.gemini = lastModelUsed = model;
      return out;
    } catch (e) {
      lastErr = e;
      log.push(model + ' ' + (e.status || (e.timeout ? 'slow' : 'error')));
      e.tried = log;
      // Google often says "use models/gemini-X" in its error: try exactly that next
      const named = /use models\/([\w.\-]+)/i.exec(e.message || '');
      if (named && !tried.has(named[1])) queue.unshift(named[1]);
      if (!retriable(e)) throw e;
      if (!queue.length) await addMore();
    }
  }
  throw lastErr || new Error('The AI took too long to answer');
}

// ---------- Claude ----------
const claudeHeaders = (key) => ({ 'x-api-key': key, 'anthropic-version': '2023-06-01' });
async function claudeModels(key) {
  const data = await get('https://api.anthropic.com/v1/models?limit=50', claudeHeaders(key), 10000);
  return (data.data || []).map((m) => m.id); // newest first
}
async function askClaude(config, key, { system, history, text }, deadline) {
  const pick = async () => {
    const ids = await claudeModels(key);
    return ids.find((i) => /haiku/i.test(i)) || ids[0];
  };
  let model = goodModel.anthropic || modelFor(config, 'anthropic') || PRESETS.anthropic.model;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const data = await post(
        'https://api.anthropic.com/v1/messages',
        claudeHeaders(key),
        { model, max_tokens: 600, system, messages: [...history.map((h) => ({ role: h.role, content: h.text })), { role: 'user', content: text }] },
        Math.min(Number(config.aiTimeoutMs) || 20000, Math.max(1500, deadline - Date.now()))
      );
      const out = (data.content || []).map((b) => b.text || '').join('').trim();
      if (!out) throw new Error('Empty answer');
      goodModel.anthropic = lastModelUsed = model;
      return out;
    } catch (e) {
      if (e.status === 404 && attempt === 0) { // that model name does not exist (any more): ask which ones do
        const found = await pick().catch(() => null);
        if (found && found !== model) { model = found; continue; }
      }
      throw e;
    }
  }
}

// ---------- ChatGPT and everything that speaks the same way ----------
const baseOf = (config, p) => String(p === 'custom' ? config.aiBaseUrl || '' : PRESETS[p].base).replace(/\/+$/, '');
const authOf = (key) => ({ Authorization: 'Bearer ' + key });
async function openaiModels(config, p, key) {
  const data = await get(baseOf(config, p) + '/models', authOf(key), 10000);
  return (data.data || []).map((m) => ({ id: m.id, created: m.created || 0 }));
}
// a chat model by name: not speech, pictures, embeddings or moderation; for OpenAI the "mini" ones first
function chatChoice(list, p) {
  const skip = /whisper|tts|embed|moderation|guard|image|dall|audio|realtime|transcribe|rerank|search|codex|instruct$/i;
  const ok = list.filter((m) => !skip.test(m.id)).sort((a, b) => b.created - a.created);
  if (p === 'openai') return (ok.find((m) => /^gpt-[\w.\-]*mini$/.test(m.id)) || ok.find((m) => /^gpt-/.test(m.id)) || ok[0] || {}).id;
  return (ok[0] || {}).id;
}
async function askOpenAIish(config, p, key, { system, history, text }, deadline) {
  if (!baseOf(config, p)) throw new Error('Set aiBaseUrl in config.js for the custom provider');
  let model = goodModel[p] || modelFor(config, p) || PRESETS[p].model;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      if (!model) throw Object.assign(new Error('no model set'), { status: 404 });
      const data = await post(
        baseOf(config, p) + '/chat/completions',
        authOf(key),
        { model, max_tokens: 600, temperature: 0.9, messages: [{ role: 'system', content: system }, ...history.map((h) => ({ role: h.role, content: h.text })), { role: 'user', content: text }] },
        Math.min(Number(config.aiTimeoutMs) || 20000, Math.max(1500, deadline - Date.now()))
      );
      const out = (data.choices?.[0]?.message?.content || '').trim();
      if (!out) throw new Error('Empty answer');
      goodModel[p] = lastModelUsed = model;
      return out;
    } catch (e) {
      if ((e.status === 404 || e.status === 400) && attempt === 0) { // unknown model name: ask the service which ones exist
        const found = chatChoice(await openaiModels(config, p, key).catch(() => []), p);
        if (found && found !== model) { model = found; continue; }
      }
      throw e;
    }
  }
}

// ---------- the one function the bot uses ----------
// req: { system, history: [{ role: 'user' | 'assistant', text }], text }
async function askOne(config, p, key, req, deadline) {
  return PRESETS[p].type === 'gemini' ? askGemini(config, key, req, deadline)
    : PRESETS[p].type === 'anthropic' ? askClaude(config, key, req, deadline)
    : askOpenAIish(config, p, key, req, deadline);
}

async function ask(config, req) {
  const list = chain(config);
  const unknown = list.find((p) => !PRESETS[p]);
  if (unknown) throw new Error('Unknown aiProvider: ' + unknown + '. Use one of: ' + names().join(', '));

  const deadline = Date.now() + (Number(config.aiTotalMs) || 50000);
  const errors = [];
  for (const p of list) {
    const key = getKey(config, p);
    if (!key) continue;
    if (deadline - Date.now() < 2000) break;
    try {
      const out = await askOne(config, p, key, req, deadline);
      lastProviderUsed = p;
      return out;
    } catch (e) {
      e.provider = p;
      errors.push(e);
    }
  }
  if (!errors.length) throw new Error('No AI key set');
  const first = errors[0];
  if (errors.length > 1) first.all = errors.map((e) => ({ provider: e.provider, error: e })); // every service that failed
  throw first;
}

// Tries each service on its own with a tiny question (for .aitest): [{ provider, label, ok, ms, model, error }]
async function test(config) {
  const out = [];
  for (const p of chain(config)) {
    const label = PRESETS[p] ? PRESETS[p].label : p;
    if (!PRESETS[p]) { out.push({ provider: p, label, ok: false, error: 'Unknown service' }); continue; }
    const key = getKey(config, p);
    if (!key) { out.push({ provider: p, label, ok: false, error: 'no key (put it in ' + keyFile(config, p) + ')' }); continue; }
    const t0 = Date.now();
    try {
      await askOne(config, p, key, { system: 'Reply with the single word OK.', history: [], text: 'ping' }, Date.now() + 30000);
      out.push({ provider: p, label, ok: true, ms: Date.now() - t0, model: (goodModel[p] || lastModelUsed || '') });
    } catch (e) {
      e.provider = p;
      out.push({ provider: p, label, ok: false, error: e });
    }
  }
  return out;
}

// the models a provider offers this key (for .aimodels)
async function listModels(config, provider) {
  const p = normName(provider || chain(config)[0]);
  if (!PRESETS[p]) throw new Error('Unknown provider: ' + p);
  const key = getKey(config, p);
  if (!key) throw new Error('No key for ' + p);
  if (PRESETS[p].type === 'gemini') return geminiModels(key);
  if (PRESETS[p].type === 'anthropic') return claudeModels(key);
  return (await openaiModels(config, p, key)).map((m) => m.id);
}

module.exports = { ask, test, getKey, hasKey, chain, names, keyFile, listModels, lastModel, lastProvider, PROVIDERS: PRESETS, norm: normName };
