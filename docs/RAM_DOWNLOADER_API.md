# RAM Downloader API — RAM_MD plugin

This repository uses a dynamic `plugins/*.js` loader. `plugins/ram-downloader-api.js` integrates your separately hosted RAM Downloader API without changing the original `.fb`, `.ig`, `.video`, `.song` or `.tiktok` commands.

## Commands

| Command | What it does |
| --- | --- |
| `.ramapi` | Checks `GET https://api.smp-tech.eu.cc/api/status` |
| `.ramdl <public-link>` | Identifies the platform, calls `GET /api/:platform?url=...` using `x-api-key`, and attempts to send a ready-made MP4 with audio (or supported SoundCloud audio) |

Platforms recognized by URL: YouTube, Instagram, Facebook, TikTok, Twitter/X, Pinterest, and SoundCloud.

**Limitations:** The API uses yt-dlp `--skip-download` and returns metadata plus temporary media URLs, **not finished files**. Some websites return separate audio/video tracks, require cookies, block cloud hosts, or return URLs that expire or require request headers. When the API does not return a single combined MP4 with audio, `.ramdl` does not attempt to combine formats; use the existing download commands instead. Audio from YouTube is *not* converted to MP3 by this API integration.

## Private hosting environment settings

Set these on the **WhatsApp bot hosting platform**, not in a committed source file:

```dotenv
RAM_DOWNLOADER_API_URL=https://api.smp-tech.eu.cc
RAM_DOWNLOADER_API_KEY=PASTE_YOUR_PRIVATE_ALTARE_API_KEY_HERE
RAM_DOWNLOADER_MAX_HEIGHT=720
```

The bot's `RAM_DOWNLOADER_API_KEY` must equal the *server's* `API_KEY` in Altare's protected `/opt/ram-downloader-api/.env`. The server's key must stay private. Do not put it in GitHub source, PR text, screenshots or chats.

Use Node.js 18+ (the plugin uses native `fetch`).

## Deploy and verify

1. Merge this PR after reviewing the new file and tests.
2. Pull the updated `main` branch on the bot host and supply the private environment variables above. Restart the bot, or run the owner-only `.reload` after deployment if the process inherited the updated environment already.
3. In WhatsApp, send `.ramapi`. It should report an online API.
4. Test with a **public media link you have permission to download**: `.ramdl https://www.facebook.com/...`.
5. If download fails, check API status and logs on Altare. Do not share tokens or signed media URLs.

Altare diagnostic commands:

```bash
/opt/ram-api-env/bin/yt-dlp --version
pm2 status
curl --max-time 15 -fsS http://127.0.0.1:26161/api/status
```

The API's protected extraction endpoint can also be tested with `curl -G -H 'x-api-key: ...'` from Altare, but avoid placing secrets on shell command lines or showing them in screenshots. An invalid key returns 401; busy/rate-limited requests may return 429; extractor errors may return 502.

## Security notes

- Cloudflare Tunnel credentials are unrelated to the downloader API key. Tokens previously shared in chat should be rotated and the tunnel process configured with a secure token file.
- Never commit `.env`, cookies, sessions, or token files.
- Only HTTPS public links from the supported domains are accepted by this plugin.
- The plugin does **not** bypass private media/login checks, proxy media, or promise successful downloads from every website.
