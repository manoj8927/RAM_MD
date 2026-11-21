// Free Fire public player info lookup via third-party community API.
// No login, token harvesting, account access, or game modification.
const pick=(obj,...keys)=>{for(const k of keys)if(obj&&obj[k]!==undefined&&obj[k]!==null&&obj[k]!=='')return obj[k];return null;};
const fmt=(x)=>x===null||x===undefined||x===''?'Not available':String(x).replace(/[\r\n\t*]/g,' ').slice(0,100);
const when=x=>{if(x===null||x===undefined||x==='')return 'Not available';const n=Number(x);if(!Number.isFinite(n)||n<=0)return 'Not available';const d=new Date(n<1e12?n*1000:n);return Number.isNaN(d.getTime())?'Not available':d.toISOString().slice(0,10);};

const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function requestInfo(url,headers){
  const controller=new AbortController();
  const timeout=setTimeout(()=>controller.abort(),10000);
  try{
    const res=await fetch(url,{headers:{Accept:'application/json','User-Agent':'RAM-MD/1.0 (+https://github.com/manoj8927/RAM_MD)',...headers},signal:controller.signal});
    if(!res.ok){const err=new Error('HTTP '+res.status);err.status=res.status;throw err;}
    const data=await res.json();
    if(!data||typeof data!=='object'||data.error||data.success===false)throw Error('Invalid API response');
    const basic=pick(data,'basicInfo','basicinfo','AccountInfo')||data;
    if(!pick(basic,'nickname','AccountName','name')&&!pick(basic,'level','AccountLevel'))throw Error('No player profile in API response');
    return data;
  }finally{clearTimeout(timeout);}
}
async function lookup(uid,region){
  const encoded=encodeURIComponent(uid);
  const sources=[
    {name:'NFToken player-info',url:'https://api2.nftoken.info/player-info?uid='+encoded},
    {name:'NFToken get',url:'https://api2.nftoken.info/get?uid='+encoded+(region?'&region='+region.toUpperCase():'')}
  ];
  const key=process.env.FF_COMMUNITY_API_KEY;
  if(key){
    const regions=region?[region]:['ind','sg','br'];
    for(const r of regions)sources.push({name:'FreeFireCommunity '+r,url:'https://developers.freefirecommunity.com/api/v1/info?uid='+encoded+'&region='+r,headers:{'x-api-key':key}});
  }
  const errors=[];
  for(const source of sources){
    for(let attempt=0;attempt<2;attempt++){
      try{return {data:await requestInfo(source.url,source.headers),source:source.name};}
      catch(error){
        errors.push(source.name+': '+error.message);
        if(attempt===0&&[429,500,502,503,504].includes(error.status)){await wait(800);continue;}
        break;
      }
    }
  }
  console.error('[ffinfo] All APIs failed:',errors.join(' | '));
  throw Error('All Free Fire information providers unavailable');
}
module.exports={
 name:'ffinfo',
 command:['ffinfo'],
 menu:['ffinfo'],
 category:'Games',
 desc:'Look up public Free Fire player profile by UID',
 async run({text,reply}){
  const input=String(text||'').trim().split(/\s+/);
  const uid=input[0],region=(input[1]||'').toLowerCase();
  if(!/^\d{5,15}$/.test(uid)||region&&!['ind','sg','br'].includes(region))return reply('🎮 *FREE FIRE PLAYER INFO*\\nUsage: .ffinfo 123456789 [ind|sg|br]');
  try{
   const {data,source}=await lookup(uid,region);
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
    '🔌 *API:* '+source,
    '⚡ RAM-MD'
   ];
   return reply(lines.join('\n'));
  }catch(e){
   console.error('[ffinfo]',e.message);
   return reply('❌ Free Fire info service is unavailable or timed out. Try again later. No account login is required.');
  }
 }
};
