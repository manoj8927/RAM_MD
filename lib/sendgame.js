const fs = require('fs');
const path = require('path');

// Sends a game: as an HTML file, as a link, or both (config.gameMode).
module.exports = async function sendGame({ sock, msg, from, reply, config, game }) {
  const file = path.join(__dirname, '..', 'assets', game.file);
  const base = (config.gameBaseUrl || '').replace(/\/+$/, '');
  const url = base ? base + '/' + game.file : null;
  const mode = config.gameMode || 'both'; // 'file' | 'link' | 'both'

  let caption = game.title + '\n' + game.desc;
  caption += url ? '\n\nPlay now: ' + url : '\nDownload and open the file to play.';

  if ((mode === 'link' || !fs.existsSync(file)) && url) {
    return sock.sendMessage(from, { text: caption }, { quoted: msg });
  }
  if (!fs.existsSync(file)) return reply('Game file missing: assets/' + game.file);

  await sock.sendMessage(
    from,
    {
      document: fs.readFileSync(file),
      mimetype: 'text/html',
      fileName: game.fileName,
      caption,
      contextInfo: { isForwarded: true, forwardingScore: 1 },
    },
    { quoted: msg }
  );
};
