'use strict';
const https = require('https');
function fetchJSON(url, apiKey) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, {timeout: 12000, headers: apiKey ? {Authorization:'Bearer '+apiKey} : {}}, res => {
      let body='';
      res.on('data', chunk => {body+=chunk;if(body.length>1500000)req.destroy(new Error('Response too large'));});
      res.on('end', () => {
        if(res.statusCode!==200)return reject(new Error('API HTTP '+res.statusCode));
        try {resolve(JSON.parse(body));}catch {reject(new Error('Invalid JSON'));}
      });
    });
    req.on('timeout',()=>req.destroy(new Error('API timeout')));
    req.on('error',reject);
  });
}
const val=(v)=>v===null||v===undefined||v===''?'N/A':typeof v==='boolean'?(v?'Yes':'No'):String(v);
const num=(v)=>v===null||v===undefined?'N/A':Number.isFinite(Number(v))?Number(v).toLocaleString('en-IN'):val(v);
const date=(v)=>{
  if(v===null||v===undefined||v==='')return 'N/A';
  if(!/^\d{10}(\d{3})?$/.test(String(v)))return val(v);
  const d=new Date(Number(v)*(String(v).length===10?1000:1));
  return Number.isNaN(d.getTime())?'N/A':new Intl.DateTimeFormat('en-IN',{timeZone:'Asia/Kolkata',day:'numeric',month:'long',year:'numeric',hour:'2-digit',minute:'2-digit',hour12:true}).format(d);
};
const list=(v)=>Array.isArray(v)&&v.length?v.map(String).join(', '):'N/A';
const line=(label,v)=>label+': '+val(v);
module.exports={
  name:'ffinfo',command:['ffinfo','uid','id'],category:'Games',
  desc:'Complete Free Fire player, guild, captain, pet, equipment and activity information',
  async run({args,reply}){
    const uid=String(args[0]||'').trim();
    if(!/^\d{5,15}$/.test(uid))return reply('🎮 Usage: .ffinfo 4754221141');
    try{
      const url=new URL(process.env.FFINFO_API_URL||'https://ff-info-api-iota.vercel.app/api/ffinfo');
      if(url.protocol!=='https:')return reply('⚠️ FFINFO_API_URL must use HTTPS');
      url.searchParams.set('uid',uid);
      const json=await fetchJSON(url,process.env.FFINFO_API_KEY);
      if(json.success===false||json.error)return reply('❌ FF API: '+String(json.error||json.message||'No data').slice(0,180));
      const data=json.data||json.player||json;
      const b=data.basicInfo||json.basicInfo||{};
      const s=data.socialInfo||json.socialInfo||{};
      const g=data.clanBasicInfo||json.clanBasicInfo||{};
      const captain=data.captainBasicInfo||json.captainBasicInfo||{};
      const credit=data.creditScoreInfo||json.creditScoreInfo||{};
      const pet=data.petInfo||json.petInfo||{};
      const p=data.profileInfo||json.profileInfo||{};
      const media=data.mediaInfo||{};
      if(!b.nickname&&!b.level)return reply('⚠️ No recognized player data for this UID.');
      const chunks=[
        ['🎮 *RAM-MD | FREE FIRE FULL INFO*',
         '📡 Source: '+(json.realtime===false?'Saved record (not live)':'Live provider'),
         '',
         '👤 *PLAYER INFO*',
         line('UID',b.accountId||uid),line('Name',b.nickname),line('Region',b.region),
         line('Level',b.level),line('Likes',num(b.liked)),line('Account Type',b.accountType),
         line('Created At',date(b.createAt)),line('Last Login',date(b.lastLoginAt)),
         '',
         '📊 *ACCOUNT INFO*',
         line('Season ID',b.seasonId),line('Credit Score',credit.creditScore),
         line('Title ID',b.title),line('Bio',s.signature),line('Gender',s.gender),
         line('Language',s.language),line('Time Active',s.timeActive),
         line('Time Online',s.timeOnline),line('Rank Show',s.rankShow),
         '',
         '🏆 *RANK & ACTIVITY*',
         line('Release Version',b.releaseVersion),
         line('BR Rank',b.rank),line('BR Points',num(b.rankingPoints)),
         line('BR Max Rank',b.maxRank),line('CS Rank',b.csRank),
         line('CS Points',num(b.csRankingPoints)),line('CS Max Rank',b.csMaxRank),
         line('EXP',num(b.exp)),line('Elite Pass',b.hasElitePass),
         line('Show BR Rank',b.showBrRank),line('Show CS Rank',b.showCsRank),
         line('Show Rank',b.showRank)],
        ['🎒 *EQUIPPED ITEMS*',
         line('Head Picture ID',b.headPic),line('Avatar ID',p.avatarId),
         line('Banner ID',b.bannerId),line('Badge ID',b.badgeId),
         line('Badge Count',b.badgeCnt),line('Pin ID',b.pinId),
         line('Skin Color',p.skinColor),
         line('Selected',p.isSelected),line('Awaken Selected',p.isSelectedAwaken),
         line('BR Pregame Choices',list(b.accountPrefers?.brPregameShowChoices)),
         '',
         '👕 *OUTFIT IDS*',list(p.clothes),
         '',
         '🔫 *WEAPON SKIN IDS*',list(b.weaponSkinShows),
         '',
         '✨ *EQUIPPED SKILL IDS*',list(p.equipedSkills),
         '',
         '🐾 *PET DETAILS*',
         line('Pet ID',pet.id),line('Name',pet.name),line('Level',pet.level),
         line('EXP',num(pet.exp)),line('Selected',pet.isSelected),
         line('Skill ID',pet.selectedSkillId),line('Skin ID',pet.skinId),
         '',
         '🏰 *GUILD INFO*',
         line('Guild Name',g.clanName),line('Guild ID',g.clanId),
         line('Guild Level',g.clanLevel),
         line('Guild Members',g.memberNum===undefined?'N/A':g.memberNum+'/'+val(g.capacity)),
         line('Guild Owner UID',g.captainId)],
        ['👑 *GUILD LEADER*',
         line('UID',captain.accountId||g.captainId),
         line('Name',captain.nickname),line('Region',captain.region),
         line('Level',captain.level),line('Likes',num(captain.liked)),
         line('BR Rank',captain.rank),line('BR Points',num(captain.rankingPoints)),
         line('BR Max Rank',captain.maxRank),
         line('CS Rank',captain.csRank),line('CS Points',num(captain.csRankingPoints)),
         line('CS Max Rank',captain.csMaxRank),
         line('EXP',num(captain.exp)),line('Season',captain.seasonId),
         line('Version',captain.releaseVersion),line('Title ID',captain.title),
         line('Head Picture ID',captain.headPic),
         line('Badge ID',captain.badgeId),
         line('Weapon Skin IDs',list(captain.weaponSkinShows)),
         line('Created At',date(captain.createAt)),line('Last Login',date(captain.lastLoginAt)),
         '',
         '🎨 *MEDIA & EXTRAS*',
         line('Avatar Path',media.avatarUrl),
         line('Banner Path',media.bannerUrl),
         line('Diamond Cost',data.diamondCostRes?.diamondCost),
         line('Credit Reward State',credit.rewardState),
         line('Credit Summary End',date(credit.periodicSummaryEndTime)),
         line('External Icon Type',b.externalIconInfo?.showType),
         line('External Icon Status',b.externalIconInfo?.status),
         '',
         '⚡ Powered by RAM-MD']
      ];
      for(const lines of chunks)await reply(lines.join('\n'));
    }catch(e){
      console.error('ffinfo:',e.message);
      return reply('❌ Free Fire API request failed: '+String(e.message).slice(0,130));
    }
  }
};
