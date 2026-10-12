import {db} from './db.mjs';
import {arena} from './arena.mjs';
import {fail,cleanText} from './security.mjs';

export async function operationsMetrics(){
  const [duration,powers,currency,total,active24,suspicious]=await Promise.all([
    db.$queryRaw`SELECT AVG(TIMESTAMPDIFF(MICROSECOND,createdAt,finishedAt)/1000) averageDurationMs FROM \`Match\` WHERE status='finished' AND finishedAt IS NOT NULL`,
    db.$queryRaw`SELECT JSON_UNQUOTE(JSON_EXTRACT(action,'$.powerId')) powerId,COUNT(*) uses FROM MatchAction WHERE JSON_UNQUOTE(JSON_EXTRACT(action,'$.type'))='power' GROUP BY JSON_UNQUOTE(JSON_EXTRACT(action,'$.powerId')) ORDER BY uses DESC`,
    db.currencyTransaction.groupBy({by:['reason'],_sum:{amount:true},_count:{_all:true}}),
    db.match.count(),
    db.session.findMany({where:{expiresAt:{gt:new Date()},createdAt:{gte:new Date(Date.now()-86400000)}},distinct:['userId'],select:{userId:true}}),
    db.auditLog.findMany({where:{action:{in:['ranked_repeat_pair_cap','human_repeat_pair_coin_cap']}},orderBy:{createdAt:'desc'},take:30}),
  ]);
  const completed=await db.match.count({where:{status:'finished'}});
  const queued=[...arena().queue.values()];
  return {averageDurationMs:Number(duration[0]?.averageDurationMs||0),powerUsage:powers.map(p=>({powerId:p.powerId,uses:Number(p.uses)})),completionRate:total?completed/total:0,totalMatches:total,activePlayers24h:active24.length,economy:currency.map(r=>({reason:r.reason,amount:r._sum.amount||0,transactions:r._count._all})),queueHealth:{waiting:queued.length,longestWaitMs:queued.length?Date.now()-Math.min(...queued.map(q=>q.joinedAt)):0},suspicious};
}
export async function configureMission(actorId,body){
  const id=cleanText(body.id,3,40),name=cleanText(body.name,3,80),description=cleanText(body.description,3,200);
  fail(id&&name&&description&&['daily','weekly'].includes(body.period)&&['played','wins','powersUsed'].includes(body.metric)&&Number.isInteger(body.target)&&body.target>=1&&body.target<=1000&&Number.isInteger(body.coins)&&body.coins>=0&&body.coins<=10000&&typeof body.active==='boolean','VALIDATION','Provide a valid mission, period, metric, target, reward and active state.');
  const data={name,description,period:body.period,metric:body.metric,target:body.target,coins:body.coins,active:body.active};
  return db.$transaction(async tx=>{const old=await tx.dailyMission.findUnique({where:{id}});if(old)fail(old.period===data.period&&old.metric===data.metric,'MISSION_IDENTITY','Use a new mission ID to change its period or metric, preserving existing progress.',409);const mission=await tx.dailyMission.upsert({where:{id},create:{id,...data},update:data});await tx.auditLog.create({data:{userId:actorId,action:'mission_configuration',details:{id,...data}}});return {mission};});
}
export async function announce(actorId,body){const message=cleanText(body.message,5,250);fail(message,'VALIDATION','Write an announcement between 5 and 250 characters.');const users=await db.user.findMany({where:{suspended:false,settings:{notifications:true}},select:{id:true}});await db.$transaction(async tx=>{if(users.length)await tx.notification.createMany({data:users.map(u=>({userId:u.id,type:'announcement',message,metadata:{authorId:actorId}}))});await tx.auditLog.create({data:{userId:actorId,action:'announcement_published',details:{message,recipients:users.length}}});});return {ok:true,recipients:users.length};}
