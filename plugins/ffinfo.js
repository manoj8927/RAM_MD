const https = require('https');

function fetchJSON(url, apiKey) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, {
      timeout: 10000,
      headers: apiKey ? { Authorization: 'Bearer ' + apiKey } : {}
    }, (res) => {
      let body = '';
      res.on('data', chunk => {
        body += chunk;
        if (body.length > 1000000) req.destroy(new Error('Response too large'));
      });
      res.on('end', () => {
        if (res.statusCode !== 200) return reject(new Error('API status ' + res.statusCode));
        try { resolve(JSON.parse(body)); } catch { reject(new Error('Invalid JSON')); }
      });
    });
    req.on('timeout', () => req.destroy(new Error('API timeout')));
    req.on('error', reject);
  });
}

module.exports = {
  name: 'ffinfo',
  command: ['ffinfo'],
  category: 'Games',
  desc: 'Show Free Fire player information by UID',
  async run({ args, reply }) {
    const uid = String(args[0] || '').trim();
    if (!/^\d{6,15}$/.test(uid)) return reply('🎮 Usage: .ffinfo 19191758817');
    // Public endpoint confirmed working by bot owner; optional environment override.
    const apiUrl = process.env.FFINFO_API_URL || 'https://api2.nftoken.info/player-info';
    try {
      const url = new URL(apiUrl);
      if (url.protocol !== 'https:') return reply('⚠️ FFINFO_API_URL must use HTTPS.');
      url.searchParams.set('uid', uid);
      const json = await fetchJSON(url, process.env.FFINFO_API_KEY);
      if (json.success === false || json.error) return reply('❌ Player not found or API error.');
      const data = json.data || json.player || json;
      if (!data || typeof data !== 'object') return reply('❌ No player information returned.');
      const value = (...keys) => {
        for (const key of keys) {
          const v = data[key];
          if (v !== null && v !== undefined && typeof v !== 'object' && String(v).trim()) return String(v);
        }
        return 'N/A';
      };
      return reply(
        '🎮 *RAM-MD | FREE FIRE INFO*\n\n' +
        '🆔 UID: ' + uid + '\n' +
        '👤 Name: ' + value('nickname', 'name', 'playerName') + '\n' +
        '🌍 Region: ' + value('region', 'server') + '\n' +
        '⭐ Level: ' + value('level', 'playerLevel') + '\n' +
        '❤️ Likes: ' + value('likes', 'liked') + '\n' +
        '🏆 BR Rank: ' + value('brRank', 'rank') + '\n' +
        '⚔️ CS Rank: ' + value('csRank') + '\n\n⚡ Powered by RAM-MD'
      );
    } catch (e) {
      console.error('ffinfo:', e.message);
      return reply('❌ Could not fetch Free Fire info. Check API settings.');
    }
  }
};
