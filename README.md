<div align="center">

# ⚡ 『ＲＡＭ－ＭＤ』 — WhatsApp Bot

**Automation • AI Chat • Media Tools • Group Management • Games**

A Node.js WhatsApp bot powered by Baileys, with owner controls, AI fallback, status automation and deployment options.

[![Website](https://img.shields.io/badge/Website-RAM__MD-14b8a6?style=for-the-badge)](https://ram-md.blogspot.com/)
[![Telegram](https://img.shields.io/badge/Telegram-Support-229ED9?style=for-the-badge)](https://t.me/Ramboss67)
[![Stars](https://img.shields.io/github/stars/manoj8927/RAM_MD?style=for-the-badge)](https://github.com/manoj8927/RAM_MD/stargazers)

[🌐 Website](https://ram-md.blogspot.com/) · [📦 Plugins](https://github.com/manoj8927/RAM_MD/tree/main/plugins) · [⬇️ Download ZIP](https://github.com/manoj8927/RAM_MD/archive/refs/heads/main.zip) · [🐛 Issues](https://github.com/manoj8927/RAM_MD/issues)

</div>

---

## 📑 Contents

- [✨ Features](#-features)
- [⚡ Quick start](#-quick-start)
- [🤖 AI setup — Groq and OpenAI](#-ai-setup--groq-and-openai)
- [🎬 Movie API — TMDB](#-movie-api--tmdb)
- [🚀 Deployment](#-deployment)
- [📱 WhatsApp pairing](#-whatsapp-pairing)
- [📚 Commands](#-commands)
- [🧩 New plugin packs](#-new-plugin-packs)
- [🆕 Additional command packs](#-additional-command-packs--31-commands)
- [📁 Project structure](#-project-structure)
- [🛠️ Troubleshooting](#️-troubleshooting)
- [🔒 Security](#-security)
- [🔗 Support](#-support)

## ✨ Features

| Category | Included functionality |
| --- | --- |
| 🤖 AI | AI chat, automatic replies, provider fallback, `.aitest`, translation (`.trt`), summaries, captions, grammar, quizzes, stories, scripts and debates |
| 💬 WhatsApp | Pairing-code login, reconnect handling, owner commands |
| ❤️ Status | Automatic status view and reactions |
| 🎬 Media | YouTube, Instagram, Facebook and TikTok tools; movie details via TMDB; audio/video handling and stickers |
| 👥 Groups | Group information, tagging, welcome/goodbye, anti-link, warnings and polls |
| 🎮 Games | RPS, dice, tic-tac-toe, car, snake, trivia, riddles, word scramble, math challenges, challenge leaderboard and safe prank simulations |
| 🛠️ Utilities | Runtime, settings, font converter, calculator, passwords, UUID, text stats, Base64, URL encoding, SHA-256 and JSON formatting |
| 🧩 Plugins | Local plugin-based command system |

Features can depend on external services, platform permissions and installed tools. Review third-party plugins before use.

## ⚡ Quick start

**Requirements:** A compatible current Node.js LTS release, npm, Git and an internet connection. Some media features need ffmpeg and additional tools.

```bash
git clone https://github.com/manoj8927/RAM_MD.git
cd RAM_MD
npm install --omit=dev
```

Edit `config.js`:

```js
phoneNumber: '91XXXXXXXXXX', // example: country code + number, digits only
owners: ['91XXXXXXXXXX'],
prefix: '.',
aiProvider: 'openai',
aiFallback: ['groq'],
```

Replace the example phone number with your own number, including its country code, without `+`, spaces or dashes.

Start the bot:

```bash
npm start
```

The current `npm start` command runs `deploy/start.js`, which then starts `index.js`. If `BOT_STORAGE_DIR` is not set, `auth/` and `data/` use local storage.

## 🤖 AI setup — Groq and OpenAI

### Option A — Groq API (alternative when OpenAI credits run out)

1. Visit [Groq Console](https://console.groq.com/) and create an API key.
2. On your **hosting platform**, add the secret environment variable `AI_KEY_GROQ` containing the key. Alternatively, privately create `ai_key_groq.txt` in the project root, with the key alone on one line.
3. Keep this configuration in `config.js`:

```js
aiProvider: 'openai',
aiFallback: ['groq'],
```

OpenAI is tried first, and Groq is used if OpenAI fails. To try **Groq first**, set:

```js
aiProvider: 'groq',
aiFallback: [],
```

4. Restart the bot and test `.aitest` and `.ai hello`.

Groq free-tier access, quotas and model availability can change. The model default is configured in `lib/ai.js`.

### Option B — OpenAI API

Create a key at [OpenAI API Keys](https://platform.openai.com/api-keys). Set `AI_KEY_OPENAI` privately or create `ai_key.txt` in the project root. Set `aiProvider: 'openai'` in `config.js`.

If you see `[openai] 429: You have no credits remaining`, check API billing/quota or use the Groq fallback. A ChatGPT subscription does not itself supply API credits.

**Never add a real API key to GitHub, README, config.js or screenshots.** The repository ignores `ai_key*.txt`.

## 🎬 Movie API — TMDB

The `.movie` command shows a movie's **poster, title, release date, rating, genres, runtime, original language, director, cast, and story** using [The Movie Database (TMDB)](https://www.themoviedb.org/).

### 🔑 Get a TMDB API token

1. Create or sign in to your TMDB account at [themoviedb.org](https://www.themoviedb.org/).
2. Open [TMDB API Settings](https://www.themoviedb.org/settings/api) and complete the API access setup.
3. Copy the **API Read Access Token** (the longer bearer token), **not** the short v3 API key.
4. In your hosting provider's **Secrets / Environment Variables**, add:

```dotenv
TMDB_API_KEY=YOUR_TMDB_API_READ_ACCESS_TOKEN
```

5. Save the variable and **restart or redeploy** RAM_MD.

| Hosting | Where to add `TMDB_API_KEY` |
| --- | --- |
| Railway | Project → Bot Service → Variables |
| Render | Service → Environment |
| Replit | Secrets |
| Heroku | App → Settings → Config Vars |
| VPS / Pterodactyl | Secure process environment / panel environment settings |

### 💬 WhatsApp commands

```text
.movie Pushpa 2
.movie Jawan
.movie Avengers Endgame
.film Interstellar
```

The bot searches for a matching movie and sends the poster with details. It only provides **movie information**, not a movie download or streaming link. Results depend on TMDB's catalog and the selected title.

**Troubleshooting:** If the bot says `Movie lookup is not configured yet`, check the `TMDB_API_KEY` variable and restart. If it reports invalid credentials, use the **API Read Access Token**. For missing titles, try a more precise movie name. Keep tokens private; never commit them to GitHub.

## 🚀 Deployment

| Platform | Deployment file | Session persistence |
| --- | --- | --- |
| 🚄 Railway | [railway.json](railway.json) | Attach a volume and set `BOT_STORAGE_DIR` |
| 🟢 Render | [render.yaml](render.yaml) | Blueprint declares a worker and disk; check paid-plan requirements |
| 🟣 Heroku | [Procfile](Procfile) | Ephemeral dyno: external session storage needed |
| 🟠 Replit | [.replit](.replit) | Verify persistent storage for your deployment |
| 🔵 Koyeb | Manual Node.js setup | Verify worker and storage support |
| 🖥️ Pterodactyl | Node.js egg | Use persistent server files |
| 💻 VPS | [PM2 config](ecosystem.config.cjs) | Use persistent VPS disk |
| ⚙️ OptiLink / Node.js panel | Manual setup | Check panel's storage and uptime |

> **Important:** RAM_MD is a long-running WhatsApp process, not an HTTP website. A web-only or serverless host may require changes. Sleeping instances and ephemeral disks can interrupt the bot or erase pairing files. No platform is guaranteed to run free 24/7.

### 🚄 Railway — step by step

1. Open [Railway](https://railway.com/) → **New Project** → **Deploy from GitHub Repo**.
2. Choose `manoj8927/RAM_MD` and allow repository access.
3. In the service **Variables**, set:

| Name | Value |
| --- | --- |
| `NODE_ENV` | `production` |
| `BOT_STORAGE_DIR` | `/data` |
| `AI_KEY_GROQ` | Your private Groq key |
| `TMDB_API_KEY` | Your private TMDB API Read Access Token (for `.movie`) |

4. Attach a **persistent volume** to the service and set its mount path to `/data`.
5. Check that the start command is `npm start` (already specified in `railway.json`).
6. Deploy, then open the deployment logs to read the pairing code.
7. Pair WhatsApp and test `.ping`, `.aitest` and `.alive`.

**Existing users:** Back up your current `auth/` and `data/` before moving to a new volume. The storage bootstrap deliberately refuses to overwrite an existing local session directory. A volume must be mounted at the exact configured path. Check Railway's current trial, billing and volume availability.

### 🟢 Render

1. Connect the GitHub repository in [Render](https://render.com/).
2. Use the included `render.yaml` Blueprint for a **background worker**.
3. Supply `AI_KEY_GROQ` securely when prompted.
4. The Blueprint specifies `npm ci --omit=dev` for build, `npm start` for startup, and persistent storage mounted at `/opt/render/project/src/storage`.
5. Deploy, inspect logs and pair WhatsApp.

A worker with a persistent disk may require a paid plan. A free sleeping Web Service is not equivalent to a continuously running worker.

### 🟣 Heroku

1. Connect the repository to a [Heroku](https://www.heroku.com/) app.
2. The included `Procfile` declares `worker: npm start`.
3. Add `AI_KEY_GROQ` in Config Vars.
4. Enable the worker process and inspect logs.

**Not production-ready for session persistence as-is:** Heroku dynos have ephemeral local storage. The existing local-file WhatsApp authentication needs a separate durable session-storage solution.

### 🟠 Replit

1. Import this GitHub repository into [Replit](https://replit.com/).
2. Add `AI_KEY_GROQ` in **Secrets**.
3. Install dependencies and run `npm start` (the included `.replit` supplies the run command).
4. Pair using the console.
5. Before relying on a deployment, verify its background-process and persistent-storage behavior.

### 🔵 Koyeb

Create a Node.js service from GitHub in [Koyeb](https://www.koyeb.com/). Use `npm install --omit=dev` for installation, `npm start` to run and `AI_KEY_GROQ` as a secret. Check current support for continuous workers and durable session files before production use.

### 🖥️ Pterodactyl / OptiLink / other Node.js panels

1. Create a server with a compatible Node.js egg/runtime.
2. Upload the repository or clone it into the directory containing `package.json`.
3. Install: `npm install --omit=dev`.
4. Start: `npm start`.
5. Add `AI_KEY_GROQ` as a secret or privately create `ai_key_groq.txt`.
6. Preserve `auth/` and `data/` on disk. Use the console for pairing.

### 💻 VPS with PM2

```bash
git clone https://github.com/manoj8927/RAM_MD.git
cd RAM_MD
npm install --omit=dev
npm install -g pm2
pm2 start ecosystem.config.cjs
pm2 save
pm2 logs status-bot
```

To enable boot startup, run `pm2 startup` and follow its printed instructions. The PM2 config starts `index.js` directly; keep its working directory on persistent disk.

**Updating the bot:**

```bash
git pull origin main
npm install --omit=dev
pm2 restart status-bot
```

Back up your private keys, `auth/` and `data/` before updates. Never run two bot instances with the same WhatsApp session.

## 📱 WhatsApp pairing

1. Start the bot and open its console/logs.
2. Look for `Pairing code:` followed by a code.
3. On your phone, open WhatsApp → **Linked devices** → **Link a device**.
4. Choose the phone-number pairing option if offered and enter the code.
5. Wait for a `Connected as` log message.

The bot uses the number configured in `config.js`. Keep `auth/` private and persistent. Do not share pairing codes or session files.

## 📚 Commands

| Command | Purpose |
| --- | --- |
| `.menu` | List available commands |
| `.ping` | Check bot response |
| `.alive` | Bot status |
| `.runtime` | Runtime information |
| `.settings` | Bot settings |
| `.ai hello` | Ask AI a question |
| `.aitest` | Test AI providers |
| `.movie <name>` | Movie poster, rating, cast and story |
| `.autoreply on` / `.autoreply off` | Toggle automatic AI replies |
| `.autoreply status` | Check AI auto-reply |
| `.areact on` / `.areact off` | Toggle automatic reactions |
| `.areact status` | Reaction settings |
| `.ytmp4 <link>` | YouTube video tool |
| `.song <name>` | Music search/tool |
| `.ig <link>` | Instagram media tool |
| `.sticker` | Sticker creation |
| `.groupinfo` | Group information |
| `.tagall` | Mention group members |
| `.rps rock` | Rock-paper-scissors |
| `.dice` | Dice game |
| `.ttt new` | Tic-tac-toe |
| `.car` / `.snake` | Game tools |
| `.tx list` | Font list |

Commands depend on loaded plugins, permissions and supported media/services.

## 🧩 New plugin packs

These plugins load from `plugins/` automatically when the bot starts. Run `.menu` for the current command list. Examples below use the default prefix `.`.

### 🤖 AI utility pack — [ai-utility-pack.js](plugins/ai-utility-pack.js)

Uses the existing `lib/ai.js` AI provider and fallback settings. Configure at least one supported AI key (for example `AI_KEY_GROQ` or `AI_KEY_OPENAI`) in hosting Secrets/Variables. No separate translation API is required.

| Command | Example / purpose |
| --- | --- |
| `.summarize` | `.summarize Paste a long article here` — concise summary |
| `.translate` | `.translate to Bengali: Hello friend` |
| `.trt` | `.trt to Hindi: How are you?` — short translate alias |
| `.grammar` | `.grammar i has a new phone` — spelling and grammar |
| `.rewrite` | `.rewrite Please reply quickly` — professional rewrite |
| `.explain` | `.explain What is Node.js?` |
| `.caption` | `.caption Anime review` — social captions |
| `.hashtags` | `.hashtags Action anime` |
| `.email` | `.email Ask for a meeting next week` |
| `.codehelp` | `.codehelp Explain async await` |
| `.quiz` | `.quiz JavaScript basics` — five MCQs |

For `.trt` / `.translate`, specify `to <language>:` to select the target language; without it the command defaults to English. AI requests have input and rate limits and may fail when provider credits or quotas are exhausted. Test provider connectivity with `.aitest`.

### 🎬 Movie details — [movie.js](plugins/movie.js)

```text
.movie Pushpa 2
.movie Jawan
.film Interstellar
```

Returns a matching movie's poster (when available), rating, genres, runtime, release date, director, cast and synopsis. Requires the `TMDB_API_KEY` **API Read Access Token**; see [Movie API — TMDB](#-movie-api--tmdb). This is movie information, **not** a streaming or download command.

### 📥 Social video downloads — [social-download.js](plugins/social-download.js)

```text
.facebook https://www.facebook.com/.../videos/...
.fb https://www.facebook.com/.../videos/...
.tiktok https://www.tiktok.com/@creator/video/...
.tt https://www.tiktok.com/@creator/video/...
```

Uses the existing yt-dlp / ffmpeg download helpers for supported, accessible videos. Download success depends on URL format, platform restrictions, hosting tools and file-size limits. Download only content you have permission to access and follow platform rules.

The separate [adult-download.js](plugins/adult-download.js) contains `.xnxx <URL>` and `.xvideos <URL>` for private-chat use and intentionally omits these from the public menu. These commands are not an age-verification system.

### 🛠️ Utility pack — [utility-pack.js](plugins/utility-pack.js)

No extra API key or npm dependency is required.

| Command | Purpose |
| --- | --- |
| `.password 16` | Generate a random password (8–64 characters) |
| `.uuid` | Generate a UUID v4 |
| `.wordcount Hello World` | Count words, characters, bytes and lines |
| `.base64 Hello` | Encode text as Base64 |
| `.unbase64 SGVsbG8=` | Decode UTF-8 Base64 |
| `.urlencode hello world` | URL-encode text |
| `.urldecode hello%20world` | URL-decode text |
| `.hash hello` | SHA-256 text hash (not encryption) |
| `.jsonfmt {"name":"RAM-MD"}` | Pretty-print JSON |
| `.timestamp` | UTC ISO time and Unix timestamps |

**Privacy:** Avoid posting real passwords, secrets or confidential text in group chats or sending them to third-party AI services.

### 🎮 Fun pack — [fun-pack.js](plugins/fun-pack.js)

| Command | Purpose |
| --- | --- |
| `.fakevirus` | Clearly labeled fake-virus progress simulation |
| `.matrix` | Random binary-code display |
| `.lovepercent Alex, Sam` | Random love-match joke |
| `.truth` | Truth question |
| `.dare` | Lighthearted dare |
| `.reverse hello` | Reverse text |
| `.choose pizza, burger` | Pick a random option |
| `.randomnum 1 100` | Random number in a range |

### 🎭 Safe prank pack — [safe-prank-pack.js](plugins/safe-prank-pack.js)

| Command | Simulation |
| --- | --- |
| `.fakeupdate` | Imaginary software update |
| `.fakewifi` | Pretend Wi-Fi scan |
| `.fakebattery` | Fictional battery booster |
| `.fakesystem` | Pretend system diagnostics |
| `.faketeleport` | Cartoon teleportation |
| `.fakeai` | Silly mind-reading prediction |
| `.fakecall Friend` | Fake incoming-call text |
| `.fakefortune` | Random funny fortune |

The separate [hack.js](plugins/hack.js) provides an owner-only `.hack` simulation. **All prank features are labeled fictional**; they do not hack accounts, scan networks, place calls, install updates, access files or modify devices. Progress simulations send multiple messages, so use them responsibly.

### 🧠 Mini-game pack — [mini-game-pack.js](plugins/mini-game-pack.js)

| Command | Purpose |
| --- | --- |
| `.coinflip` | Heads or tails |
| `.roll 20` | Roll a 20-sided die (default: 6) |
| `.eightball Will I win?` | Random magic 8-ball answer |
| `.scramble` | Start word scramble |
| `.unscramble banana` | Submit scramble answer |
| `.riddle` | Start a riddle |
| `.riddleanswer piano` | Submit riddle answer |
| `.trivia` | Start a multiple-choice question |
| `.triviaanswer 2` | Submit answer number (1–4) |
| `.mathgame` | Start math challenge |
| `.mathanswer 42` | Submit math answer |
| `.gamestop` | Clear the active mini-game |

Mini-games keep one active session per chat for up to 10 minutes and allow three wrong attempts. Sessions are in memory and reset when the bot restarts. No API key is required.

### 🔄 Updating after new commands

```bash
git pull origin main
npm install --omit=dev
npm start
```

For an already-running process, restart or redeploy it through your hosting panel instead of starting a second bot instance. The plugins were committed to GitHub, but successful live execution depends on your deployment and has not been verified here.

## 🆕 Additional command packs — 30 commands

These plugins are included in `plugins/` and load when the bot starts. The default prefix is `.`.

### 🤖 AI creative — [ai-creative-pack.js](plugins/ai-creative-pack.js)

| Command | Example |
| --- | --- |
| `.aiscript` | `.aiscript Short video about anime` — video script |
| `.aidebate` | `.aidebate Online learning vs classroom` — balanced arguments |
| `.aistory` | `.aistory A mysterious robot` — original story |
| `.aiprompt` | `.aiprompt Gaming logo` — structured prompt |
| `.aivoice` | `.aivoice Movie review intro` — **voiceover script text**, not generated audio |

These commands reuse the existing AI provider setup and need an active AI key. Provider quotas apply.

### 🛠️ More utilities — [more-utilities.js](plugins/more-utilities.js)

| Command | Example / requirement |
| --- | --- |
| `.qr` | `.qr https://example.com` — QR image via QRServer; sends content to external QR service |
| `.github` | `.github manoj8927/RAM_MD` — public GitHub repository details |
| `.ocr` | Reply to an image with `.ocr`; requires `OCR_SPACE_API_KEY` and sends image to OCR.space |
| `.remind` | `.remind 10m Drink water` — reminder in current chat (1 minute–24 hours) |
| `.binary` | `.binary Hello` — UTF-8 binary bytes |
| `.weather` | `.weather Kolkata` — current Open-Meteo weather |
| `.shorturl` | `.shorturl https://example.com` — TinyURL short link |

`.remind` stores one active reminder per user/chat **in memory**: reminders are lost on restart/redeploy, and only work while the bot stays online. `.ocr` currently supports English recognition and images up to 3 MB. External API availability and limits may change. Do not submit private images or secrets to external services.

### 👥 Group management — [group-extras.js](plugins/group-extras.js)

| Command | Example / purpose |
| --- | --- |
| `.welcome` | `.welcome on` / `.welcome off` — greet new members |
| `.goodbye` | `.goodbye on` / `.goodbye off` — goodbye messages |
| `.antilink` | `.antilink on` / `.antilink off` — detect links in ordinary group messages |
| `.warn` | Reply to a member or mention them with `.warn` |
| `.warnings` | View saved warning counts; reply/mention for one member |
| `.poll` | `.poll Best anime? | Naruto | One Piece` — native WhatsApp poll |

Changes to group settings and warning counts are saved in `data/group-extras.json`. Only group admins or the configured bot owner can modify settings, issue warnings or create polls. Warning counts do **not** automatically remove members. For anti-link message deletion the bot must be a group admin; if deletion is unavailable it may still send a warning. Welcome/goodbye depend on WhatsApp group participant events. Keep `data/` persistent.

### 🎮 Challenge games — [challenge-games.js](plugins/challenge-games.js) and [hangman.js](plugins/hangman.js)

| Command | Example |
| --- | --- |
| `.hangman` | Start word game; guess `.hangman a`; restart `.hangman new` |
| `.emojiquiz` | Start emoji category quiz; answer `.emojiquiz fruits` |
| `.fasttype` | Start exact-text typing challenge; answer with `.fasttype <phrase>` |
| `.numberbattle` | Guess 1–20; answer `.numberbattle 10` |
| `.quizbattle` | Multiple-choice trivia; answer `.quizbattle 2` |
| `.leaderboard` | Show in-memory session scores |

Challenges allow three attempts and expire after 10 minutes. Leaderboard points reset when the bot restarts and are not separated by group. `.fasttype` checks exact text; it does **not** measure typing speed.

### 😂 Fun commands — [fun-extra.js](plugins/fun-extra.js)

| Command | Purpose |
| --- | --- |
| `.meme` | Random text meme |
| `.joke` | Random joke |
| `.ship Alice, Bob` | Random fictional match percentage |
| `.fact` | Random general-knowledge fact |
| `.quote` | Motivational quote |
| `.roast` | Lighthearted, non-targeted roast |

### 🔐 Optional OCR key

Get an OCR.space API key from [OCR.space](https://ocr.space/ocrapi) and configure the hosting environment:

```dotenv
OCR_SPACE_API_KEY=YOUR_PRIVATE_OCR_KEY
```

Do not commit keys or private images. Restart the bot after adding the key.

### 🚀 Deploy new commands

```bash
git pull origin main
npm install --omit=dev
npm start
```

If the bot is already running, restart it from your hosting panel or PM2 instead of starting a duplicate process. Test `.menu`, `.github manoj8927/RAM_MD`, `.weather Kolkata`, `.quizbattle`, and `.poll Test | Yes | No` in a test group. These plugins have been committed but have **not been live-tested on a connected WhatsApp session**.

## 📁 Project structure

```text
RAM_MD/
├── assets/                 Images and media
├── lib/                    Shared helpers, AI and settings
├── plugins/                WhatsApp bot commands, including AI/game/prank/utility packs
├── deploy/
│   └── start.js            Optional persistent-storage bootstrap
├── config.js               Bot settings (no secrets!)
├── index.js                Main bot entry point
├── package.json            Dependencies and npm start
├── package-lock.json       Dependency lockfile
├── ecosystem.config.cjs    PM2 config
├── railway.json            Railway deployment
├── render.yaml             Render worker Blueprint
├── Procfile                Heroku worker
├── .replit                 Replit run command
└── .gitignore              Private files excluded from Git
```

**Private runtime files** (create only on your host): `auth/`, `data/`, `ai_key*.txt`, and any private cookies. Do not commit these.

## 🛠️ Troubleshooting

| Problem | What to check |
| --- | --- |
| Bot won't start | Node.js version, install logs, `npm start`, working directory |
| Pairing fails | Phone number format, WhatsApp linked devices, pairing logs |
| Pairing lost after deploy | Persistent volume and `BOT_STORAGE_DIR` mount path |
| `auth/` already exists error | Back up and migrate local files to the persistent storage directory |
| OpenAI 429 / no credits | API quota/billing; configure Groq fallback |
| Groq fails | `AI_KEY_GROQ`, provider quota, model and network |
| Bot sleeps or stops | Hosting plan, worker type, process logs |
| Media command fails | ffmpeg, external service limits, permissions |
| Plugins missing | Plugin load errors in console; pull latest commits and restart |
| OCR not configured | Set `OCR_SPACE_API_KEY`; reply to an image with `.ocr` |
| Welcome/goodbye missing | Enable with `.welcome on` / `.goodbye on`; check participant events |
| Anti-link cannot delete | Give the bot group admin rights; test with a non-admin account |
| Reminders disappear | They are in memory and reset when the process restarts |
| AI utilities fail | Check `AI_KEY_GROQ` / `AI_KEY_OPENAI`, provider quota and `.aitest` |
| Movie command fails | Check `TMDB_API_KEY` is the API Read Access Token |
| Mini-game answer rejected | Use the matching answer command within 10 minutes; one active game per chat |

## 🍪 YouTube & Instagram cookies (optional)

Some YouTube or Instagram media tools may need authenticated browser cookies for content **you are authorized to access**. Cookies are sensitive login credentials: **never upload them to GitHub, paste them in chat, or share them with anyone**. Use a separate account where appropriate and follow each service's terms.

### Private cookie files

If the specific downloader/plugin supports a Netscape-format cookie file, export cookies **from your own logged-in browser session** using a trusted local tool and store them privately on your hosting server:

```text
cookies.txt             # example: YouTube cookies
cookies_instagram.txt   # example: Instagram cookies
```

The repository's `.gitignore` already excludes `cookies*.txt`. That protects against ordinary Git commits, **not** against disclosure in logs, backups or an exposed web directory.

### Railway / VPS / Pterodactyl

- **VPS/Pterodactyl:** Upload private cookie files through your server's secure file manager or SSH, outside any public web root. Restrict file permissions (for example, `chmod 600 cookies*.txt` on Linux).
- **Railway:** Do **not** commit cookie files. Use a secure, supported secret-file provisioning method and a persistent volume; Railway Variables are strings, not automatically mounted files. Check that the downloader actually reads the intended file path.
- **Render/Replit/Heroku:** Verify how private files are provisioned and whether they survive restarts. Ephemeral filesystems can erase cookie files.

**Compatibility note:** File names alone do not enable cookies. The actual YouTube/Instagram downloader code must be configured to pass its cookie-file path (for example, a `--cookies /private/path/cookies.txt` argument for yt-dlp). Different plugins may use different tools and formats. Confirm support in the relevant plugin before relying on these files.

**Troubleshooting:** If downloads fail, check the downloader logs, cookie expiry, required login/verification, access permissions and platform terms. Re-export your own cookies only when necessary; never use someone else's session or try to bypass access restrictions.

## 🔒 Security

- Never publish API keys, WhatsApp `auth/`, cookies, pairing codes or personal session data.
- Use hosting Secrets/Variables for keys where possible.
- Keep `auth/` and `data/` on persistent storage and protect backups.
- Do not run duplicate instances with the same WhatsApp credentials.
- Review external plugins before installing them.
- Respect WhatsApp and third-party service terms. Avoid spam and unsolicited automation.
- Hosting prices, free plans and quotas can change; verify before deploying.

## 🔗 Support

| Resource | Link |
| --- | --- |
| 🌐 Official website | [RAM_MD](https://ram-md.blogspot.com/) |
| 🧩 Plugins | [GitHub plugins](https://github.com/manoj8927/RAM_MD/tree/main/plugins) |
| 💬 Telegram | [@Ramboss67](https://t.me/Ramboss67) |
| 📺 YouTube | [S Music Purulia](https://youtube.com/@smusicpurulia) |
| 🐛 Issues | [Report a bug](https://github.com/manoj8927/RAM_MD/issues) |
| 📦 Source | [GitHub repository](https://github.com/manoj8927/RAM_MD) |

---

<div align="center">

**❤️ MADE WITH LOVE BY SANJOY X TECH**

**『ＲＡＭ_ＭＤ』⚡**

</div>
