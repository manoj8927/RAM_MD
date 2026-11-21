// Free Fire public player info lookup via third-party community API.
// No login, token harvesting, account access, or game modification.
const API='https://api2.nftoken.info/player-info';
const pick=(obj,...keys)=>{for(const k of keys)if(obj&&obj[k]!==undefined&&obj[k]!==null&&obj[k]!=='')return obj[k];return null;};
const fmt=(x)=>x===null||x===undefined||x===''?'Not available':String(x).replace(/[\r\n\t*]/g,' ').slice(0,100);
const when=x=>{if(x===null||x===undefined||x==='')return 'Not available';const n=Number(x);if(!Number.isFinite(n)||n<=0)return 'Not available';const d=new Date(n<1e12?n*1000:n);return Number.isNaN(d.getTime())?'Not available':d.toISOString().slice(0,10);};
module.exports={
 name:'ffinfo',
 command:['ffinfo'],
 menu:['ffinfo'],
 category:'Games',
 desc:'Look up public Free Fire player profile by UID',
 async run({text,reply}){
  const uid=String(text||'').trim();
  if(!/^\d{5,15}$/.test(uid))return reply('🎮 *FREE FIRE PLAYER INFO*\n\nUsage: .ffinfo 123456789\nEnter a valid 5–15 digit player UID.');
  const controller=new AbortController();
  const timeout=setTimeout(()=>controller.abort(),12000);
  try{
   const res=await fetch(API+'?uid='+encodeURIComponent(uid),{headers:{Accept:'application/json','User-Agent':'RAM-MD-Bot/1.0'},signal:controller.signal});
   if(!res.ok)throw Error('HTTP '+res.status);
   const data=await res.json();
   if(data.success===false||data.error||data.message&&/not found|invalid uid/i.test(data.message))return reply('❌ Player not found or the community API could not retrieve this UID.');
   const basic=pick(data,'basicInfo','basicinfo','AccountInfo')||data;
   const clan=pick(data,'clanBasicInfo','clanbasicinfo','GuildInfo','guildInfo')||{};
   const social=pick(data,'socialInfo','socialinfo')||{};
   const credit=pick(data,'creditScoreInfo','creditscoreinfo')||{};
   const leader=pick(data,'captainBasicInfo','captainbasicinfo','GuildLeaderInfo','guildLeaderInfo','leaderInfo')||{};
   const pet=pick(data,'petInfo','petinfo')||{};
   const profile=pick(data,'profileInfo','profileinfo')||{};
   const rank=pick(data,'rankInfo','rankinfo')||{};
   const playerId=pick(basic,'accountId','accountid','AccountID','AccountId','player_id','uid')||uid;
   const name=pick(basic,'nickname','AccountName','name')||pick(data,'nickname');
   if(!name&&!pick(basic,'level','AccountLevel'))return reply('❌ No player details returned. Try another UID later.');
   const lines=[
    '🎮 *『 RAM-MD 』 FREE FIRE INFO*','━━━━━━━━━━━━━━━━━━',
    '👤 *Player:* '+fmt(name),
    '🆔 *UID:* '+fmt(playerId),
    '🌍 *Region:* '+fmt(pick(basic,'region','AccountRegion')||pick(data,'region')),
    '⭐ *Level:* '+fmt(pick(basic,'level','AccountLevel')),
    '❤️ *Likes:* '+fmt(pick(basic,'liked','AccountLikes','likes')),
    '🏆 *BR Rank Code:* '+fmt(pick(basic,'rank','ranking')),
    '🎯 *BR Points:* '+fmt(pick(basic,'rankingPoints','rankingpoints')),
    '⚔️ *CS Rank Code:* '+fmt(pick(basic,'csRank','csrank')),
    '🎯 *CS Points:* '+fmt(pick(basic,'csRankingPoints','csrankingpoints')),
    '🎖️ *Badges:* '+fmt(pick(basic,'badgeCnt','badgecnt')),
    '🎮 *EXP:* '+fmt(pick(basic,'exp','experience')),
    '🖼️ *Banner ID:* '+fmt(pick(basic,'bannerId','bannerid','AccountBannerId')||pick(profile,'bannerId','bannerid')),
    '🧑‍🎨 *Avatar ID:* '+fmt(pick(basic,'headPic','headpic','avatarId','avatarid')||pick(profile,'avatarId','avatarid')),
    '🖼️ *Profile ID:* '+fmt(pick(basic,'profileId','profileid')||pick(profile,'profileId','profileid')),
    '🎟️ *Elite Pass:* '+fmt(pick(basic,'hasElitePass','haselitepass','elitePass')),
    '🏅 *BR Max Rank:* '+fmt(pick(basic,'maxRank','maxrank')||pick(rank,'maxRank')),
    '🥇 *CS Max Rank:* '+fmt(pick(basic,'csMaxRank','csmaxrank')),
    '🔥 *Season ID:* '+fmt(pick(basic,'seasonId','seasonid')),
    '📅 *Created:* '+when(pick(basic,'createAt','createat')),
    '🕒 *Last Login:* '+when(pick(basic,'lastLoginAt','lastloginat')),
    '━━━━━━━━━━━━━━━━━━',
    '👥 *GUILD INFORMATION*',
    '🏷️ *Guild Name:* '+fmt(pick(clan,'clanName','GuildName','guildName')),
    '🆔 *Guild ID:* '+fmt(pick(clan,'clanId','clanid','GuildID','guildId')),
    '🌍 *Guild Region:* '+fmt(pick(clan,'region','GuildRegion')),
    '📈 *Guild EXP:* '+fmt(pick(clan,'clanExp','clanexp','GuildExp')),
    '👑 *Guild Leader UID:* '+fmt(pick(clan,'captainId','captainid','leaderId','leaderid','GuildLeaderUID')),
    '🏰 *Guild Level:* '+fmt(pick(clan,'clanLevel','GuildLevel')),
    '👤 *Guild Members:* '+fmt(pick(clan,'memberNum','membernum')),
    '👥 *Max Members:* '+fmt(pick(clan,'capacity','maxMembers','maxmembers')),
    '━━━━━━━━━━━━━━━━━━',
    '👑 *GUILD LEADER INFORMATION*',
    '👤 *Leader Name:* '+fmt(pick(leader,'nickname','AccountName','name')),
    '🆔 *Leader UID:* '+fmt(pick(leader,'accountId','accountid','AccountID','uid')||pick(clan,'captainId','captainid','leaderId')),
    '⭐ *Leader Level:* '+fmt(pick(leader,'level','AccountLevel')),
    '❤️ *Leader Likes:* '+fmt(pick(leader,'liked','likes','AccountLikes')),
    '🏆 *Leader BR Rank:* '+fmt(pick(leader,'rank','ranking')),
    '⚔️ *Leader CS Rank:* '+fmt(pick(leader,'csRank','csrank')),
    '🖼️ *Leader Banner ID:* '+fmt(pick(leader,'bannerId','bannerid')),
    '━━━━━━━━━━━━━━━━━━',
    '🐾 *PET INFORMATION*',
    '🐶 *Pet Name:* '+fmt(pick(pet,'name','petName','petname')),
    '⭐ *Pet Level:* '+fmt(pick(pet,'level','petLevel','petlevel')),
    '📝 *Signature:* '+fmt(pick(social,'signature','Signature')),
    '🛡️ *Credit Score:* '+fmt(pick(credit,'creditScore','score')),
    '━━━━━━━━━━━━━━━━━━',
    'ℹ️ Banner/avatar IDs are not images. Unofficial API; missing data shows Not available.',
    '⚡ RAM-MD'
   ];
   return reply(lines.join('\n'));
  }catch(e){
   console.error('[ffinfo]',e.message);
   return reply('❌ Free Fire info service is unavailable or timed out. Try again later. No account login is required.');
  }finally{clearTimeout(timeout);}
 }
};
