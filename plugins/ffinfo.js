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
  command: ['ffinfo', 'uid', 'id'],
  category: 'Games',
  desc: 'Show Free Fire player information by UID',
  async run({ args, reply }) {
    const uid = String(args[0] || '').trim();
    if (!/^\d{5,15}$/.test(uid)) return reply('🎮 Usage: .ffinfo 19191758817');
    // Public endpoint confirmed working by bot owner; optional environment override.
    const apiUrl = process.env.FFINFO_API_URL || 'https://api2.nftoken.info/player-info';
    try {
      const url = new URL(apiUrl);
      if (url.protocol !== 'https:') return reply('⚠️ FFINFO_API_URL must use HTTPS.');
      url.searchParams.set('uid', uid);
      const json = await fetchJSON(url, process.env.FFINFO_API_KEY);
      if (json.success === false || json.error || json.status === 'error') return reply('❌ API error: ' + String(json.message || json.error || 'Player not found').slice(0,180));
      const data = json.data || json.player || json;
      const basic = data.basicInfo || data.BasicInfo || data.AccountInfo || data.accountInfo || data;
      const profile = data.profileInfo || data.AccountProfileInfo || data;
      if (!data || typeof data !== 'object') return reply('❌ No player information returned.');
      const value = (...keys) => {
        for (const key of keys) {
          const v = basic[key] ?? profile[key] ?? data[key];
          if (v !== null && v !== undefined && typeof v !== 'object' && String(v).trim()) return String(v);
        }
        return 'N/A';
      };
      if (value('nickname', 'name', 'playerName', 'AccountName') === 'N/A' && value('level', 'playerLevel', 'AccountLevel') === 'N/A') {
        return reply('⚠️ API responded but player data was not recognized. Check UID or server region.');
      }
      const sections = [
        '🎮 *RAM-MD | FREE FIRE PLAYER INFO*',
        '',
        '👤 *PLAYER PROFILE*',
        '🆔 UID: ' + uid,
        '👤 Name: ' + value('nickname', 'name', 'playerName', 'AccountName'),
        '🌍 Region: ' + value('region', 'server', 'AccountRegion'),
        '⭐ Level: ' + value('level', 'playerLevel', 'AccountLevel'),
        '❤️ Likes: ' + value('liked', 'likes', 'AccountLikes'),
        '📝 Bio: ' + value('signature', 'bio', 'description'),
        '',
        '🏆 *RANK DETAILS*',
        '🥇 BR Rank: ' + value('rank', 'brRank', 'BrMaxRank'),
        '🎯 BR Rank Points: ' + value('rankingPoints', 'brRankingPoints'),
        '⚔️ CS Rank: ' + value('csRank', 'CsMaxRank'),
        '🎯 CS Rank Points: ' + value('csRankingPoints'),
        '🏅 Max BR Rank: ' + value('maxRank', 'BrMaxRank'),
        '🏅 Max CS Rank: ' + value('csMaxRank', 'CsMaxRank'),
        '📅 Season: ' + value('seasonId', 'season'),
        '',
        '📊 *ACCOUNT DETAILS*',
        '🎖️ EXP: ' + value('exp', 'experience'),
        '🪪 Badge ID: ' + value('badgeId'),
        '🔖 Badge Count: ' + value('badgeCnt'),
        '🗓️ Created: ' + value('createAt', 'createdAt'),
        '🕒 Last Login: ' + value('lastLoginAt', 'lastLogin'),
        '🎮 Game Version: ' + value('releaseVersion'),
        '',
        '🛡️ *GUILD / CLAN*'
      ];
      const guild = data.clanBasicInfo || data.guildInfo || data.clanInfo || {};
      const guildValue = (...keys) => {
        for (const key of keys) {
          const v = guild[key];
          if (v !== null && v !== undefined && typeof v !== 'object' && String(v).trim()) return String(v);
        }
        return 'N/A';
      };
      sections.push('🏰 Guild: ' + guildValue('clanName', 'guildName', 'name'));
      sections.push('🆔 Guild ID: ' + guildValue('clanId', 'guildId', 'id'));
      sections.push('📈 Guild Level: ' + guildValue('clanLevel', 'guildLevel', 'level'));
      const pet = data.petInfo || data.PetInfo || {};
      sections.push('', '🐾 *PET INFO*');
      sections.push('🐕 Pet Name: ' + (pet.name || pet.petName || 'N/A'));
      sections.push('⭐ Pet Level: ' + (pet.level ?? pet.petLevel ?? 'N/A'));
      sections.push('', '⚡ Powered by RAM-MD');
      const formatTime = (raw) => {
        if (!/^\\d{10,13}$/.test(String(raw))) return raw;
        const number = Number(raw);
        const date = new Date(String(raw).length === 13 ? number : number * 1000);
        return Number.isNaN(date.getTime()) ? raw : date.toISOString().slice(0, 10);
      };
      sections.forEach((line, index) => {
        if (line.startsWith('🗓️ Created: ') || line.startsWith('🕒 Last Login: ')) {
          const pos = line.indexOf(': ');
          sections[index] = line.slice(0, pos + 2) + formatTime(line.slice(pos + 2));
        }
      });
      return reply(sections.join('\n'));

    } catch (e) {
      console.error('ffinfo:', e.message);
      return reply('❌ Free Fire API request failed: ' + String(e.message).slice(0,130));
    }
  }
};
