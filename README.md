## 🎵 Fix: .song / .play — FFmpeg and FFprobe missing

The music downloader now checks whether **both** `ffmpeg` and `ffprobe` are usable before requesting yt-dlp MP3 postprocessing. A bundled `ffmpeg-static` alone is not a complete MP3 conversion toolchain.

- **Both installed:** `.song`, `.play` and `.ytmp3` extract and send MP3 audio.
- **Missing FFprobe or FFmpeg:** The bot skips conversion and downloads ready-made M4A audio, which WhatsApp can receive as an audio message. Other available audio formats may be delivered as documents.
- **Video downloading:** Existing behaviour is unchanged.

For Linux VPS, install the full package (the package includes ffprobe):

```bash
sudo apt-get update
sudo apt-get install -y ffmpeg
ffmpeg -version
ffprobe -version
```

For **OptikLink/Pterodactyl**, if no sudo/root or `apt-get` is available, deploy the latest `main` and restart your bot. The M4A fallback is designed to work without installing system FFmpeg; the host still needs a working yt-dlp binary, Node.js and enough memory/storage. Check your egg's container image for FFmpeg if MP3 is required. Optionally set `FFMPEG_LOCATION` to a directory containing **both** executable files named `ffmpeg` and `ffprobe`.

Test with `.song <name>` or `.ytmp3 <YouTube link>`. A file or media request may still fail due to YouTube anti-bot blocks, cookies, country restrictions or deleted videos.

---

<div align="center">

# ⚡ 『ＲＡＭ－ＭＤ』

### WhatsApp Automation • AI Assistant • Media Downloader • Group Management

**A modular Node.js WhatsApp bot built with Baileys, designed for extensibility and practical deployment.**

[![Node.js](https://img.shields.io/badge/Node.js-18%2B-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![Baileys](https://img.shields.io/badge/Powered%20by-Baileys-25D366?logo=whatsapp&logoColor=white)](https://github.com/WhiskeySockets/Baileys)
[![GitHub stars](https://img.shields.io/github/stars/manoj8927/RAM_MD?style=flat&logo=github)](https://github.com/manoj8927/RAM_MD/stargazers)
[![GitHub issues](https://img.shields.io/github/issues/manoj8927/RAM_MD?logo=github)](https://github.com/manoj8927/RAM_MD/issues)
[![Last commit](https://img.shields.io/github/last-commit/manoj8927/RAM_MD?logo=github)](https://github.com/manoj8927/RAM_MD/commits/main)

**[🌐 Website](https://ram-md.blogspot.com/)** · **[📦 Plugins](plugins/)** · **[🚀 Deploy](#-deployment)** · **[💬 Telegram](https://t.me/Ramboss67)** · **[⬇️ ZIP](https://github.com/manoj8927/RAM_MD/archive/refs/heads/main.zip)**

**Maintained by SANJOY MAHATO**

</div>

---

> [!IMPORTANT]
> **RAM_MD is a long-running WhatsApp bot, not a conventional website.** Pairing data (`auth/`) must be kept private and persistent. Free hosting, sleeping instances and external APIs are **not guaranteed** to be online 24/7.

## 🧭 Documentation

| Get started | Features & commands | Deploy & maintain |
| --- | --- | --- |
| [Quick start](#-quick-start) | [Features](#-features) | [Deployment](#-deployment) |
| [WhatsApp pairing](#-whatsapp-pairing) | [Command reference](#-commands) | [Troubleshooting](#troubleshooting) |
| [AI setup](#-ai-setup--groq-and-openai) | [Plugin packs](#-new-plugin-packs) | [Security](#-security) |
| [TMDB movie API](#-movie-api--tmdb) | [Additional commands](#-additional-command-packs--30-commands) | [Support](#-support) |
| [Modes](#-public--private-bot-modes) | [Downloader API (optional)](#-ram-downloader-api-integration) | [Project layout](#-project-structure) |

---

## 🚀 At a glance

| Capability | What RAM_MD includes |
| --- | --- |
| 🤖 **AI** | Provider selection, fallback and task-based AI plugins (requires a configured provider) |
| 🎬 **Media** | YouTube, Instagram, Facebook, TikTok and sticker utilities (platform access varies) |
| 👥 **Groups** | Tags, welcome/goodbye, anti-link, polls and warnings, subject to permissions |
| 🎮 **Games** | Quizzes, challenges, mini-games and text-based entertainment |
| ⚙️ **Owner tools** | Public/private mode, status automation, settings and plugin reloading |
| ☁️ **Deployment** | Railway, Render, Replit, Pterodactyl/Node panels and VPS (plan requirements apply) |

> [!NOTE]
> Commands shown below describe repository implementations; features requiring internet services, media tools, provider credentials or WhatsApp permissions may fail on unsupported hosting environments. Send `.menu` in WhatsApp for the currently loaded commands.

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

### 🌍 AI auto-reply: match the user's language

The default in `config.js` is now `aiReplyLanguage: 'same'`. The AI is instructed to respond in the **same language and writing script** as the latest incoming message, including Bengali (বাংলা), Banglish (romanized Bengali), English, Hindi, Hinglish, Urdu, Arabic, Tamil, Telugu, Malayalam, Kannada, Gujarati, Punjabi, Nepali, Spanish, French, Portuguese, Indonesian, Japanese, Korean, Chinese and Russian.

Examples: `তুমি কেমন আছো?` → Bengali script; `Tumi kemon acho?` → Banglish; `How are you?` → English; `आप कैसे हैं?` → Hindi. For mixed or very short messages, language detection can be uncertain; the AI uses context. Explicit requests to switch languages take precedence.

The previous fixed English greeting shortcuts are bypassed in `same` mode so they cannot force English responses to Bengali/Banglish messages. This is **prompt-guided language matching**, not a translation API or a guarantee that every AI provider always follows the instruction. An existing custom `aiPrompt` overrides the default prompt; update that custom prompt too if needed. Requires a configured AI provider/key and restart after pulling changes.

## 🔑 Configuration reference

| Setting | Where to configure | Purpose |
| --- | --- | --- |
| `PHONE_NUMBER` | Hosting environment (or `config.js` `phoneNumber`) | Pairing number with country code, digits only |
| `owners` | `config.js` | Owner-only commands and admin access |
| `BOT_STORAGE_DIR` | Hosting environment | Persistent directory for `auth/` and `data/`, used by `deploy/start.js` |
| `AI_KEY_GROQ` / `AI_KEY_OPENAI` | Private hosting environment | AI features and provider fallback |
| `TMDB_API_KEY` | Private hosting environment | `.movie` / `.film` metadata lookup |
| `FF_COMMUNITY_API_KEY` | Private hosting environment (optional) | Additional Free Fire community lookup |
| `OCR_SPACE_API_KEY` | Private hosting environment (optional) | `.ocr` image text recognition |

> [!WARNING]
> Never commit keys, WhatsApp pairing codes, `auth/` files or browser cookies. The project deliberately ignores common private runtime files in `.gitignore`.

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

### 📱 OptiLink Node.js Panel — Groq AI setup (Android File Manager)

If your panel shows `deploy/`, `lib/`, `plugins/`, `node_modules/`, `config.js`, `index.js` and `ai_key.txt`, you are in the project root.

1. Open **Files → Create File** and name it `ai_key_groq.txt` in the **same directory as `config.js`**.
2. Paste **only your private Groq API key** on one line; save. Do not paste it in GitHub, README, screenshots or chat. An environment variable named `AI_KEY_GROQ` is safer if the panel supports it.
3. Open `config.js` and use:

```js
aiProvider: 'groq',
aiFallback: [],
```

4. Restart the server. In WhatsApp send `.aitest` and `.ai Hello`.

**Which key file?** `ai_key_groq.txt` is the unambiguous Groq-specific file. The existing `ai_key.txt` is a generic key file whose provider depends on the bot configuration. Do not rename or delete it without checking which service currently uses it. `node_modules/` is installed dependencies, not the location for keys.

**README.md** is documentation only and does not start the bot. The startup command is `npm start` (or `node deploy/start.js` if the panel needs the script directly). Never run multiple bot processes with the same WhatsApp session.

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

## 🌐 RAM Downloader API integration

**Public API endpoint:** [api.smp-tech.eu.cc](https://api.smp-tech.eu.cc) · **Integration status:** Merged into [`main`](https://github.com/manoj8927/RAM_MD/tree/main) in [PR #1](https://github.com/manoj8927/RAM_MD/pull/1).

> [!NOTE]
> The API plugin is included in **`main`**. It now supports **public API endpoints without a key** as well as **private endpoints with a key**. Whether a key is required is determined by the API server. The standard download commands remain separate and unchanged.

After deploying the latest `main` branch, the new commands are:

```text
.ramapi
.ramdl https://www.facebook.com/...
.ramdl https://www.instagram.com/reel/...
```

Set these variables **on the WhatsApp bot host**, not in GitHub source. **Only add the key when the API server enforces authentication**:

```dotenv
RAM_DOWNLOADER_API_URL=https://api.smp-tech.eu.cc
RAM_DOWNLOADER_MAX_HEIGHT=720
# Optional — private API servers only:
# RAM_DOWNLOADER_API_KEY=YOUR_PRIVATE_API_KEY
```

- **Public API:** `.ramdl` now attempts the extraction even when `RAM_DOWNLOADER_API_KEY` is absent. The API must support public `/api/youtube`, `/api/instagram`, etc.
- **Private API:** configure the same secret in your API server's `API_KEY` and in the bot host's `RAM_DOWNLOADER_API_KEY` variable. Do not publish either secret.
- **HTTP 401/403:** if unkeyed, the API requires a key; if keyed, verify the secrets match. HTTP 404 indicates a missing download route; HTTP 503 means the API is unavailable.
- **Test:** redeploy or `git pull origin main`, restart the bot, then send `.ramapi` and `.ramdl https://www.youtube.com/shorts/...` in WhatsApp.

 The API currently returns **metadata and temporary media format URLs**, not guaranteed ready-to-send video files. Some services return separate audio/video streams, require cookies or block cloud IPs; `.ramdl` is not a guaranteed downloader. See [PR #1](https://github.com/manoj8927/RAM_MD/pull/1) for implementation details and testing status.

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
| 🤖 Bot Hosting dashboard | [bot-hosting.net/dash](https://bot-hosting.net/dash) | Check Node.js process, persistent storage and uptime |

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

### 🤖 Bot Hosting dashboard

Open the [Bot Hosting dashboard](https://bot-hosting.net/dash) to manage your hosting account. For RAM_MD, confirm Node.js support, a persistent background process and durable `auth/` / `data/` storage before deploying. This link is user-provided; hosting compatibility and 24/7 availability have not been independently verified.

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

To enable boot startup, run `pm2 startup` and follow its printed instructions, then `pm2 save`. The PM2 config **now runs `deploy/start.js`**, the same bootstrap used by `npm start`. If `BOT_STORAGE_DIR` is configured on a mounted persistent disk, the bootstrap links `auth/` and `data/` into that directory. **If local `auth/` or `data/` already exist, back up and migrate them first**: for safety, the bootstrap will refuse to overwrite an existing paired session. On an already-running bot, restart its existing PM2 app rather than starting a duplicate WhatsApp session. PM2 does not prevent a hosting provider from suspending or deleting a server.

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

## 🔐 Public & Private bot modes

Owner-only commands: `.private`, `.public`, `.mode`, `.mode private`, `.mode public`.

- **Public** (default): everyone can use non-owner commands in private chats and groups.
- **Private**: only the owner can use bot commands and ordinary-message hooks (including AI auto-replies) in private chats or groups.
- The mode is stored in `data/settings.json` and survives restart when the data directory is persistent.
- Owner numbers must be correctly set in `config.js` (`owners`); otherwise use the paired bot's own account to recover access.
- Existing group-participant welcome/goodbye events and status automation are separate background features and are not disabled by private mode.
- `.public` does not override individual owner-only command restrictions or group admin permissions.

## 🧭 Interactive Menu & quick navigation

RAM-MD now supports a compact photo menu with optional tap buttons, and **typed navigation** that also works when WhatsApp hides interactive buttons.

| Send in WhatsApp | Result |
| --- | --- |
| `.menu` / `.help` | Menu picture, categories and a short system overview |
| `.menu 1` | Open the first numbered category shown in the main menu |
| `.menu download` | List download commands |
| `.menu games` | List games |
| `.menu settings` | Owner-only settings commands (visible to owner) |
| `.menu all` | Full command reference, split into WhatsApp-sized messages |
| `.menu search song` | Find commands by name |
| `.settings 11 on` / `.settings 11 off` | Owner can enable/disable tap buttons |

The main menu displays the **current Public/Private mode**, not a hard-coded value. The image uses a short caption when the command list is long. If the image link fails, a text menu is shown. WhatsApp quick replies are not supported on every client; **all options can be typed instead**.

Configure the menu picture through the direct HTTPS URL in `config.js` (`menuImage`). A GitHub `blob/` image URL will also be converted to a raw image link. You can disable optional buttons by setting `menuButtons: false` in `config.js`, or by sending `.settings 11 off` as the bot owner; the setting is saved in `data/settings.json`.

For maintainers, run the menu regression tests with:

```bash
npm test
```

## 🎨 New customization panel & text utilities

**Owner-only customizable settings:** `.settings` now has **18 toggles** in categories. The original 1–14 numbers remain the same; four more display options were added:

| Setting | Owner command | Purpose |
| --- | --- | --- |
| 12. Menu Picture | `.settings 12 off` | Use a text-only menu |
| 13. Alive Picture | `.settings 13 off` | Send text status rather than an image |
| 14. Menu Uptime | `.settings 14 off` | Hide uptime in menu |
| 15. Menu Website | `.settings 15 off` | Hide website link from Menu |
| 16. Menu Support | `.settings 16 off` | Hide Telegram support from Menu |
| 17. Menu Footer | `.settings 17 off` | Hide custom footer from Menu |
| 18. Alive System Stats | `.settings 18 off` | Hide Node.js, CPU, memory and platform in Alive status |
| Categories | `.settings menu`, `.settings ai`, `.settings media`, `.settings status`, `.settings system` | View smaller panels |

The first `.settings` reply also attempts three quick buttons (Menu / AI / Media) when `menuButtons` is enabled. WhatsApp may hide interactive buttons; all typed commands still work. After opening settings, send `12 on` or `12 off` within 10 minutes, or use the full command at any time.

**Personalize RAM-MD without editing JavaScript:**

```text
.custom
.custom botname RAM-MD PRO
.custom ownername SANJOY MAHATO
.custom prefix !
.custom style neon
.custom preview
.custom footer Powered by RAM-MD
.custom menuimage https://example.com/menu.jpg
.custom aliveimage https://example.com/alive.jpg
.custom alivecaption RAM-MD is Online
.custom website https://example.com
.custom support https://t.me/yourchannel
.custom ytquality 720
.custom videocfr 22
.custom language bn
.custom reset footer
```

Changes persist in `data/settings.json` when storage is writable. `custom style` accepts `royal`, `classic`, `compact`, `neon`, and `minimal`. `ytquality` accepts 360, 480, 720, 1080 or 1440; `videocfr` is 18–28 (lower is higher quality). For images, use a **public HTTPS URL**. To revert the image URLs or other options, use `.custom reset <field>`. Use `.custom style classic|compact|neon|minimal` to change the text layout, and `.custom preview` to preview the current Menu without sending a picture. After changing the prefix, **all commands use the new prefix** immediately (for example, `!menu`, `!custom`).

**14 extra offline text tools** (no API key required):

| Command | Example |
| --- | --- |
| `.textstats` | `.textstats Hello World` — characters, words, UTF-8 bytes |
| `.slug` | `.slug My New Post` — clean Unicode-friendly URL slug |
| `.titlecase` | `.titlecase hello world` |
| `.dedupe` | `.dedupe apple | apple | mango` |
| `.sortlines` | `.sortlines Zebra | apple | mango` |
| `.rot13` | `.rot13 Hello World` |
| `.hexencode` | `.hexencode Hello` |
| `.hexdecode` | `.hexdecode 48656c6c6f` |
| `.morse` | `.morse HELLO 123` |
| `.demorse` | `.demorse .... . .-.. .-.. ---` |
| `.extractlinks` | `.extractlinks https://example.com` |
| `.wordfreq` | `.wordfreq hello hello world` |
| `.randomcolor` | `.randomcolor` |
| `.caseflip` | `.caseflip Hello World` |

To test new commands and settings: `npm test`. Private credentials must never be pasted into WhatsApp commands or committed to the repository.

## 🧮 More useful commands — math, budgeting and word puzzles

The `plugins/math-plus.js` plugin adds **14 more offline commands**. They do not need an AI API key, network access or an extra npm dependency.

| Command | Usage | Result |
| --- | --- | --- |
| `.percent` | `.percent 15 200` | 15% of 200 = 30 |
| `.discount` | `.discount 1500 20` | ₹1,200 payable after 20% discount |
| `.splitbill` | `.splitbill 1200 4 10` | ₹330 each, including 10% tip |
| `.gstcalc` | `.gstcalc 1000 18` | ₹1,180 including 18% GST added to base |
| `.average` | `.average 2 4 6` | Average = 4 |
| `.median` | `.median 3 50 4` | Median = 4 |
| `.factorial` | `.factorial 10` | 3,628,800 |
| `.prime` | `.prime 97` | Prime number check |
| `.roman` | `.roman 2026` | MMXXVI |
| `.deroman` | `.deroman MMXXVI` | 2026 |
| `.palindrome` | `.palindrome Never odd or even` | Palindrome check |
| `.anagram` | `.anagram listen \| silent` | Anagram check |
| `.agecalc` | `.agecalc 2000-01-15` | Age as of current UTC date |
| `.daysbetween` | `.daysbetween 2024-02-28 2024-03-01` | 2 days |

**Valid ranges:** factorial 0–100, prime up to 1,000,000,000, Roman numerals 1–3,999, date input `YYYY-MM-DD`. `.gstcalc` only calculates a provided GST percentage on top of the base amount; it does not determine applicable tax rates. All cost results are illustrative arithmetic.

**More owner display controls:** `.settings 15 off`, `.settings 16 off`, `.settings 17 off`, `.settings 18 off`. Restore with `on`. Existing setting numbers remain unchanged.

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
| `.ffinfo <UID>` | Public Free Fire player profile (unofficial API) |
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

### 🎮 Free Fire player info — [ffinfo.js](plugins/ffinfo.js)

Get public Free Fire profile, banner metadata, guild details, and guild leader details from community services.

**WhatsApp usage**

```text
.ffinfo 123456789
.ffinfo 123456789 ind
.ffinfo 123456789 sg
.ffinfo 123456789 br
```

Replace `123456789` with a real **5–15 digit UID**. The optional region is `ind`, `sg`, or `br`; it is passed to providers that support a region parameter.

| Section | Information shown when returned |
| --- | --- |
| 👤 Player | Nickname, UID, region, level, likes, EXP, badges, creation and last-login dates |
| 🖼️ Profile | Banner ID, avatar ID, profile ID, Elite Pass |
| 🏆 Ranks | BR/CS rank codes and points, maximum rank, season ID |
| 👥 Guild | Guild name, ID, region, level, EXP, member count, capacity and leader UID |
| 👑 Guild leader | Name, UID, level, likes, BR/CS rank codes, banner ID |
| 🐾 Other | Pet name and level, signature, credit score |

**Note:** Banner/avatar IDs are *not* actual banner/profile images. Missing API fields display `Not available`; rank codes are raw API values.

**Automatic fallback / HTTP 503 handling**

1. Primary: `https://api2.nftoken.info/player-info?uid=...`
2. Backup: `https://api2.nftoken.info/get?uid=...`
3. Optional independent provider: `https://developers.freefirecommunity.com/api/v1/info` (requires `FF_COMMUNITY_API_KEY`).

The bot retries HTTP 429/500/502/503/504 once before trying the next source. Requests have a 10-second timeout per attempt. **The two no-key URLs use the same host** and may both return HTTP 503; a backup URL does not guarantee success.

To enable the optional keyed provider, add this to your Node.js panel's **Environment Variables** (never commit the real value):

```dotenv
FF_COMMUNITY_API_KEY=YOUR_PRIVATE_API_KEY
```

Then restart the bot. If all sources fail, check the Node.js console for `[ffinfo] All APIs failed:` and the individual HTTP error codes. Use a real UID when testing.

These are **unofficial third-party APIs**, not Garena services. Their routes, response fields, access requirements, uptime and accuracy may change. The fallback integrations have not been verified against a live player response. The command never needs a Free Fire password or account login.

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

### 🔄 Updating the bot

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

### ⚙️ Advanced WhatsApp settings panel

The owner can send `.settings` to view a categorized control panel with **11 toggles**: status seen, status react, AI auto reply, video quality selection, tap buttons, connection notification, AI introduction, AI web search, AI reply to owner, debug logs, menu tap buttons, menu picture, alive picture, and optional menu uptime.

Reply within 10 minutes with `6 off` or send `.settings 6 off` directly. Use `.settings` to see the current numbered options. The settings are owner-only. Most settings persist in `data/settings.json`; AI auto-reply uses its own existing persistence mechanism. `AI Web Search` only has an effect with a supported provider/configuration, and the connection notice setting applies to future startup notifications.

### 🎉 API-free commands from the JAWAD-MD-style menu

These RAM-MD commands work **without third-party API keys**. They are implemented locally in Node.js; group roles use WhatsApp group metadata and require the bot to be in that group.

| Plugin | Commands | What they do |
| --- | --- | --- |
| [Offline social pack](plugins/offline-social-pack.js) | `.dad`, `.mom`, `.king`, `.queen`, `.crush`, `.teacher`, `.student`, `.boss`, `.bestfriend`, `.chad`, `.npc`, `.sigma` and more | Pick a random group member for a playful role |
| [Offline social pack](plugins/offline-social-pack.js) | `.hug`, `.wave`, `.slap`, `.kiss`, `.dance`, `.cry`, `.laugh`, `.salute`, `.thumbsup` and more | Send a text-based action, optionally mentioning or replying to someone |
| [Offline social pack](plugins/offline-social-pack.js) | `.aura`, `.rate`, `.compatibility`, `.lovetest`, `.shipname`, `.compliment`, `.pickup`, `.coin`, `.8ball`, `.uptime`, `.owner` | Party games, uptime and owner information |
| [Offline text tools](plugins/offline-text-tools.js) | `.font`, `.fancy`, `.font1`–`.font10` | Local Unicode text effects; not external font rendering |
| [Offline text tools](plugins/offline-text-tools.js) | `.type`, `.loading`, `.spinner`, `.heart`, `.moon`, `.rocket`, `.clock` | Text/emoji effects and UTC clock |
| [Offline text tools](plugins/offline-text-tools.js) | `.npm`, `.gitclone` | Generate an NPM package link or a Git clone command; does not execute downloads |

**Examples**

```text
.king
.hug @friend
.shipname Naruto, Hinata
.compatibility Alex, Sam
.font RAM MD
.font3 Hello
.loading Deploying bot
.gitclone manoj8927/RAM_MD
.npm express
```

Existing API-free features are kept: `.joke`, `.fact`, `.quote`, `.roast`, `.hangman`, `.dice`, `.flip`, `.rps`, `.truth`, `.dare`, `.binary`, `.poll`, `.welcome`, `.goodbye`, `.warn`, and more. No duplicate plugin aliases were intentionally added for those commands.

**Limitations:** Role choices, ratings and predictions are random entertainment, not real facts. Action commands send text/emoji, not animated GIFs. `.npm` and `.gitclone` are helpers, not installations. Commands that genuinely require an AI provider, online lookup, image generation, image hosting, or real audio/video processing are not claimed to work offline. Large model-name lists (GPT/Claude/Gemini/Grok variants) do **not** mean the bot has access to those models. Restart/redeploy your Node.js panel after updating the source. Live WhatsApp behavior has not yet been verified.

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

<a id="troubleshooting"></a>

## 🔐 WhatsApp session logout recovery (OptiLink / hosted panels)

If the console says `Logged out. Delete the auth folder and pair again.`, followed by `Exit code: 1` and `Out of memory: false`, **the problem is a revoked WhatsApp linked-device session, not a RAM shortage**. WhatsApp/Baileys reports this as `DisconnectReason.loggedOut` (401). An expired/revoked session cannot be repaired by retrying the same credentials: the phone must approve a **new pairing**.

### Automatic safe recovery (enabled by default)

Since this update, `config.js` contains:

```js
autoRecoverLoggedOut: true,
```

On the first confirmed 401 logout, RAM_MD:

1. Stops the old credential writer and **renames** `auth/` into a timestamped `auth-loggedout-...` backup. No session files are deleted.
2. Creates a fresh `auth/` folder; if `BOT_STORAGE_DIR` is in use, it keeps the existing `auth` symlink and backs up the **real target folder** on the volume.
3. Starts a new connection and requests a fresh pairing code using `PHONE_NUMBER` or the `phoneNumber` configured for the bot.
4. Prints the pairing code in the hosting console. On the phone, open **WhatsApp → Linked devices → Link a device → Link with phone number instead** and enter the code.

**Do not share pairing codes or `auth/` backups.** A new link still needs phone-side approval. If the session logs out again immediately, RAM_MD **stops automatic recovery after one attempt per process** to avoid an endless crash/re-pair loop. Check whether another bot instance is using the same WhatsApp account, whether the hosting storage is persistent, and whether you unlinked the device.

To disable automatic session backup/re-pair and recover manually, set the **hosting environment variable** `WA_AUTO_REPAIR_LOGOUT=0`, or edit `autoRecoverLoggedOut: false` in `config.js`.

### Manual recovery if the server is already offline

1. **Stop** the Bot in OptiLink. Do not run two copies simultaneously.
2. Open **Files / File Manager** and find the Bot folder containing `index.js`, `config.js` and `auth/`. Rename `auth` to `auth-loggedout-backup` instead of deleting it. If `auth` is a symlink into `BOT_STORAGE_DIR`, rename/back up its **target directory**, not merely the link.
3. Start the Bot again. The updated code will create a new `auth/` and request a new pairing code.
4. On your phone, visit **WhatsApp → Linked devices** and pair the bot using the code shown in the console.
5. Check `.ping`, `.alive`, and `.menu` in WhatsApp.

**Important:** Keep `data/` and all AI API keys intact. A new WhatsApp pairing does not require replacing `config.js` or resetting your settings. If you cannot see a pairing code, verify the phone number in hosting startup variables, check startup logs and confirm that the server is actually running.

---

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
cookies-youtube.txt     # YouTube-specific cookies
cookies-instagram.txt   # Instagram-specific cookies
cookies.txt             # Shared fallback cookies
```

The repository's `.gitignore` already excludes `cookies*.txt`. That protects against ordinary Git commits, **not** against disclosure in logs, backups or an exposed web directory.

### Railway / VPS / Pterodactyl

- **VPS/Pterodactyl:** Upload private cookie files through your server's secure file manager or SSH, outside any public web root. Restrict file permissions (for example, `chmod 600 cookies*.txt` on Linux).
- **Railway:** Do **not** commit cookie files. Use a secure, supported secret-file provisioning method and a persistent volume; Railway Variables are strings, not automatically mounted files. Check that the downloader actually reads the intended file path.
- **Render/Replit/Heroku:** Verify how private files are provisioned and whether they survive restarts. Ephemeral filesystems can erase cookie files.

**Compatibility note:** The repository’s `lib/dl.js` checks `cookies-<platform>.txt` first and then `cookies.txt` in the project root. A valid Netscape cookie file and permission to access the content are still required. Do not place these files in `node_modules/` or share them.

**Troubleshooting:** If downloads fail, check the downloader logs, cookie expiry, required login/verification, access permissions and platform terms. Re-export your own cookies only when necessary; never use someone else's session or try to bypass access restrictions.

### 🧩 Plugin manager and reaction commands

The owner can manage **additional** GitHub Gist plugins with `.plugin <gist URL>`, review the source, then send the displayed `.plugin approve <code>`. New Gists must be HTTPS, JavaScript-only, within the size limit and use a filename that is **not already installed**. Existing/bundled commands cannot be overwritten or deleted via the plugin manager. To update a user-added plugin, first review and explicitly remove its old file.

- `.plugin list` — lists bundled (core) and additional plugin files.
- `.plugin remove <name.js>` — deletes **only user-installed** plugin files.
- `.areact on/off` — controls reactions to incoming chat messages.
- `.autoreact on/off` — controls **WhatsApp status/story reactions**, not chat reactions.

> [!WARNING]
> A JavaScript plugin executes with the bot's filesystem and environment access after installation. Only approve Gists you have inspected and trust. Review the exact source before installing; syntax checks do **not** make arbitrary JavaScript safe.

## 🔒 Security

- Never publish API keys, WhatsApp `auth/`, cookies, pairing codes or personal session data.
- Use hosting Secrets/Variables for keys where possible.
- Keep `auth/` and `data/` on persistent storage and protect backups.
- Do not run duplicate instances with the same WhatsApp credentials.
- Review external plugins before installing them.
- Respect WhatsApp and third-party service terms. Avoid spam and unsolicited automation.
- Hosting prices, free plans and quotas can change; verify before deploying.

## 🤝 Contributing

Pull requests, reproducible bug reports and documentation improvements are welcome.

1. Fork the repository and create a focused feature branch.
2. Make changes in the relevant `plugins/`, `lib/` or deployment file.
3. Check JavaScript syntax and test on a private WhatsApp session before opening a pull request.
4. Describe expected behavior, limitations and required environment variables.
5. Never attach real pairing codes, session files, passwords or cookies to a GitHub issue.

For a minimal command template, see [`plugins/_template.js.txt`](plugins/_template.js.txt).

## ⚖️ Disclaimer

RAM_MD is an independent, unofficial project; it is not affiliated with WhatsApp, Meta, Garena or any media platform. Use it responsibly, respect platform terms and only save content you own or are authorized to access. API/hosting availability and software compatibility can change.

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

**Maintained by SANJOY MAHATO • SANJOY X TECH**

**⚡ 『ＲＡＭ－ＭＤ』 • Built for learning, automation & community**

</div>

