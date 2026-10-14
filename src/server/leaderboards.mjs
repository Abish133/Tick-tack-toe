import {Prisma} from '@prisma/client';
import {db} from './db.mjs';
import {fail} from './security.mjs';
import {periodKey} from './players.mjs';

const categories=['cups','wins','streak','weekly','tournaments'];
const scopes=['global','regional','friends','season'];
export async function leaderboardPage({category='cups',scope,region,season,userId,offset=0,limit=50}={}){
  scope=scope||(season?'season':region&&region!=='GLOBAL'?'regional':'global');
  fail(categories.includes(category)&&scopes.includes(scope),'VALIDATION','Choose a valid leaderboard category and scope.');
  limit=Math.min(100,Math.max(1,Math.floor(Number(limit)||50)));
  offset=Math.min(100000,Math.max(0,Math.floor(Number(offset)||0)));
  const seasons=await db.season.findMany({orderBy:{startsAt:'desc'},take:50});
  const currentSeason=seasons.find(s=>s.active&&s.startsAt<=new Date()&&s.endsAt>new Date())||null;
  const selectedSeason=scope==='season'?(season||currentSeason?.id):null;
  if(scope==='season')fail(selectedSeason&&seasons.some(s=>s.id===selectedSeason),'NO_SEASON','Choose an available season.',400);
  const conditions=[Prisma.sql`u.suspended=false`];
  if(scope==='friends'){
    fail(userId,'UNAUTHENTICATED','Sign in to view your friends leaderboard.',401);
    const friendships=await db.friendship.findMany({where:{OR:[{userAId:userId},{userBId:userId}]},select:{userAId:true,userBId:true}});
    const ids=[userId,...friendships.map(f=>f.userAId===userId?f.userBId:f.userAId)];
    conditions.push(Prisma.sql`u.id IN (${Prisma.join(ids)})`);
  }
  if(scope==='regional'){
    fail(typeof region==='string'&&/^[A-Z][A-Z0-9-]{1,19}$/.test(region),'VALIDATION','Choose a valid region code.');
    conditions.push(Prisma.sql`p.region=${region}`);
  }
  if(scope==='season')conditions.push(Prisma.sql`sp.played>0`);
  const cups=scope==='season'?Prisma.sql`COALESCE(sp.cups,0)`:Prisma.sql`r.cups`;
  const wins=scope==='season'?Prisma.sql`COALESCE(sp.wins,0)`:Prisma.sql`st.wins`;
  const played=scope==='season'?Prisma.sql`COALESCE(sp.played,0)`:Prisma.sql`st.played`;
  const score={cups,wins,streak:Prisma.sql`st.streak`,weekly:Prisma.sql`COALESCE(ww.total,0)`,tournaments:Prisma.sql`COALESCE(tw.total,0)`}[category];
  // Parameters are bound by Prisma; only fixed column expressions enter this query.
  const query=Prisma.sql`WITH scores AS (
    SELECT u.id,u.name,u.createdAt,${cups} cups,${wins} wins,${played} played,st.streak,st.bestStreak,
      p.level,p.avatar,p.title,p.region,p.equippedBoard,p.equippedMark,p.equippedEffect,
      p.equippedFrame,p.equippedBanner,p.equippedArena,p.equippedEmote,
      COALESCE(ww.total,0) weeklyWins,COALESCE(tw.total,0) tournamentWins,${score} score
    FROM User u JOIN PlayerRating r ON r.userId=u.id JOIN PlayerStats st ON st.userId=u.id JOIN PlayerProfile p ON p.userId=u.id
    LEFT JOIN SeasonParticipation sp ON sp.userId=u.id AND sp.seasonId=${selectedSeason||''}
    LEFT JOIN (SELECT mp.userId,COUNT(*) total FROM MatchParticipant mp JOIN \`Match\` m ON m.id=mp.matchId
      WHERE mp.outcome='win' AND m.mode<>'ai' AND NOT EXISTS (SELECT 1 FROM MatchParticipant bot WHERE bot.matchId=m.id AND bot.isAI=true) AND m.settledAt>=${new Date(periodKey('weekly'))}
      GROUP BY mp.userId) ww ON ww.userId=u.id
    LEFT JOIN (SELECT tp.userId,COUNT(*) total FROM TournamentParticipant tp JOIN Tournament t ON t.id=tp.tournamentId
      WHERE t.status='finished' AND tp.eliminated=false GROUP BY tp.userId) tw ON tw.userId=u.id
    WHERE ${Prisma.join(conditions,' AND ')}
  ), ranked AS (SELECT scores.*,ROW_NUMBER() OVER (ORDER BY score DESC,cups DESC,wins DESC,id ASC) position FROM scores)`;
  const [rows,totalRows,self,regions]=await Promise.all([
    db.$queryRaw(Prisma.sql`${query} SELECT * FROM ranked ORDER BY position LIMIT ${limit} OFFSET ${offset}`),
    db.$queryRaw(Prisma.sql`${query} SELECT COUNT(*) total FROM ranked`),
    userId?db.$queryRaw(Prisma.sql`${query} SELECT * FROM ranked WHERE id=${userId}`):[],
    db.playerProfile.findMany({where:{user:{suspended:false}},distinct:['region'],select:{region:true},orderBy:{region:'asc'}}),
  ]);
  const map=r=>({id:r.id,name:r.name,rank:Number(r.position),cups:Number(r.cups),wins:Number(r.wins),played:Number(r.played),winRate:Number(r.played)>0?Number(r.wins)/Number(r.played):0,streak:Number(r.streak),bestStreak:Number(r.bestStreak),weeklyWins:Number(r.weeklyWins),tournamentWins:Number(r.tournamentWins),score:Number(r.score),level:r.level,profile:Object.fromEntries(['avatar','title','region','level','equippedBoard','equippedMark','equippedEffect','equippedFrame','equippedBanner','equippedArena','equippedEmote'].map(k=>[k,r[k]]))});
  const entries=rows.map(map),total=Number(totalRows[0]?.total||0),hasMore=offset+entries.length<total;
  return {entries,leaderboard:entries,currentPlayerRank:self[0]?map(self[0]):null,total,hasMore,nextOffset:hasMore?offset+entries.length:null,offset,limit,category,scope,season:currentSeason,selectedSeason,seasons,regions:regions.map(p=>p.region),weekStartsAt:new Date(periodKey('weekly')).toISOString()};
}
