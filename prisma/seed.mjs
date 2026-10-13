import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import {POWER_CATALOG} from '../src/lib/game-engine/powers.js';
import {COLLECTION_COSMETICS} from '../src/lib/cosmetic-collection.js';

const db = new PrismaClient();
const cosmetics = [
  ...COLLECTION_COSMETICS,
  {id:'frame-eclipse',name:'Eclipse Halo',type:'frame',rarity:'legendary',description:'Premium season reward: an obsidian halo with a violet eclipse rim. Cosmetic only.',price:0,asset:''},
  {id:'banner-solar',name:'Solar Horizon',type:'banner',rarity:'epic',description:'Premium season reward: a luminous amber and indigo profile horizon. Cosmetic only.',price:0,asset:''},
  {id:'marks-galaxy',name:'Galaxy Sigils',type:'marks',rarity:'legendary',description:'Premium season reward: starlit violet and cyan marks. Cosmetic only.',price:0,asset:'/assets/elements.png'},
  {id:'effect-dragon',name:'Dragon Arrival',type:'effect',rarity:'legendary',description:'Premium season reward: a warm dragon-fire glow around your identity. Cosmetic only.',price:0,asset:''},
  {id:'arena-starlight',name:'Starlight Sanctuary',type:'arena',rarity:'legendary',description:'Premium season reward: a violet and cyan starfield arena. Cosmetic only.',price:0,asset:'/assets/arena-aurora.png'},
  {id:'frame-astral',name:'Astral Halo',type:'frame',rarity:'epic',description:'A violet and gold portrait frame. Cosmetic only.',price:300,asset:''},
  {id:'banner-convergence',name:'Elemental Convergence',type:'banner',rarity:'rare',description:'A flowing cyan and violet profile banner.',price:300,asset:''},
  {id:'arena-aurora',name:'Aurora Nexus',type:'arena',rarity:'legendary',description:'An aurora-lit arena environment. Cosmetic only.',price:650,asset:'/assets/arena-aurora.png'},
  {id:'emote-celestial',name:'Celestial Signals',type:'emote',rarity:'rare',description:'Unlocks Star and Snow emotes when equipped.',price:200,asset:''},
  {id:'avatar-void',name:'Void Warden',type:'avatar',rarity:'starter',description:'The original guardian of the arena.',price:0,asset:'/assets/avatar-void.png'},
  {id:'board-void',name:'Elemental Nexus',type:'board',rarity:'starter',description:'Midnight stone with violet energy.',price:0,asset:'/assets/arena-background.png'},
  {id:'marks-neon',name:'Neon Sigils',type:'marks',rarity:'starter',description:'Electric cyan and blazing violet marks.',price:0,asset:'/assets/marks.png'},
  {id:'avatar-ember',name:'Ember Sovereign',type:'avatar',rarity:'epic',description:'Wear the fire champion portrait. Purely cosmetic.',price:350,asset:'/assets/avatar-fire.png'},
  {id:'avatar-frost',name:'Frost Oracle',type:'avatar',rarity:'epic',description:'A glacial aura for your profile. Purely cosmetic.',price:350,asset:'/assets/avatar-ice.png'},
  {id:'board-cosmic',name:'Cosmic Void',type:'board',rarity:'legendary',description:'A distant starscape board treatment. Purely cosmetic.',price:700,asset:'/assets/arena-background.png'},
  {id:'marks-gold',name:'Solar Gold',type:'marks',rarity:'rare',description:'Golden sigils and a warm trail. Purely cosmetic.',price:500,asset:'/assets/marks.png'},
  {id:'title-strategist',name:'The Strategist',type:'title',rarity:'rare',description:'A profile title earned with play coins.',price:250,asset:''},
  {id:'effect-astral',name:'Astral Arrival',type:'effect',rarity:'epic',description:'Violet particles around your profile. Purely cosmetic.',price:450,asset:''},
];

try {
  for (const [i,p] of POWER_CATALOG.entries()) {
    const {id,name,category,description,enabled}=p;
    const element={fire:'fire',shield:'light',portal:'void',ice:'ice',crystal:'crystal',surge:'energy'}[id]||category;
    const data = {id,name,element,category,description,cost:p.cost||0,cooldown:0,maxUses:p.implemented?1:0,enabled:Boolean(enabled),unlockLevel:p.implemented?1:99,sortOrder:i};
    await db.powerDefinition.upsert({where:{id},create:data,update:data});
  }
  await db.powerDefinition.deleteMany({where:{id:{notIn:POWER_CATALOG.map(p=>p.id)},owners:{none:{}},slots:{none:{}}}});
  // Release all powers to existing players as well as new accounts. Paged,
  // idempotent inserts preserve loadouts, purchases and the rest of player data.
  let cursor;
  while(true){
    const players=await db.user.findMany({select:{id:true},orderBy:{id:'asc'},take:100,...(cursor?{cursor:{id:cursor},skip:1}:{})});
    if(!players.length)break;
    await db.playerPower.createMany({data:players.flatMap(player=>POWER_CATALOG.map(power=>({userId:player.id,powerId:power.id}))),skipDuplicates:true});
    cursor=players.at(-1).id;
  }
  for (const item of cosmetics) {const avatarAsset={'avatar-void':'/assets/avatar-void.png','avatar-ember':'/assets/avatar-fire.png','avatar-frost':'/assets/avatar-ice.png'}[item.id];const generated=COLLECTION_COSMETICS.some(entry=>entry.id===item.id);const data={...item,asset:generated?item.asset:avatarAsset||(item.type==='board'?'/assets/arena.png':['title','effect','frame','banner','emote'].includes(item.type)?'':item.type==='arena'?item.asset:'/assets/elements.png')};await db.cosmeticItem.upsert({where:{id:item.id},create:data,update:{asset:data.asset}});}
  const divisions = [['rookie','Rookie',0,'#acb4d0'],['bronze','Bronze',100,'#c58c60'],['silver','Silver',250,'#d2def8'],['gold','Gold',450,'#ffd067'],['platinum','Platinum',700,'#89f2e8'],['diamond','Diamond',1000,'#77bcff'],['master','Master',1400,'#bd94ff'],['grandmaster','Grandmaster',1900,'#fa7dd7'],['legend','Legend',2500,'#ffb157'],['mythic','Mythic',3300,'#ff777b']];
  for(const [id,name,minCups,color] of divisions) await db.rankDivision.upsert({where:{id},create:{id,name,minCups,color},update:{name,minCups,color}});
  // Fixed dates describe the real local launch season; no artificial scarcity timer.
  const season = {id:'awakening-2026',name:'Season 01 · Awakening',startsAt:new Date('2026-10-01T00:00:00Z'),endsAt:new Date('2027-01-01T00:00:00Z'),active:true};
  await db.season.upsert({where:{id:season.id},create:season,update:{}});
  for (const mission of [
    {id:'play-three',name:'Enter the Arena',description:'Complete three human matches today.',metric:'played',target:3,coins:100},
    {id:'win-one',name:'A Decisive Victory',description:'Win one human match today.',metric:'wins',target:1,coins:60},
    {id:'weekly-play',name:'Weekly Arena Journey',description:'Complete fifteen human matches this week.',metric:'played',target:15,coins:350,period:'weekly'},
    {id:'weekly-win',name:'Weekly Victor',description:'Win five human matches this week.',metric:'wins',target:5,coins:250,period:'weekly'},
    {id:'weekly-powers',name:'Weekly Elementalist',description:'Use twenty powers in completed human matches this week.',metric:'powersUsed',target:20,coins:300,period:'weekly'},
    {id:'cast-five',name:'Elemental Mastery',description:'Use five powers in completed human matches.',metric:'powersUsed',target:5,coins:80},
  ]) await db.dailyMission.upsert({where:{id:mission.id},create:mission,update:{}});
  for (const achievement of [
    {id:'tournament-champion',name:'Tournament Champion',description:'Win a completed tournament. Champion coins are awarded separately.',metric:'tournamentWins',target:1,coins:0},
    {id:'win-ten',name:'Ten Victories',description:'Win ten human matches.',metric:'wins',target:10,coins:200},
    {id:'win-hundred',name:'Centurion',description:'Win one hundred human matches.',metric:'wins',target:100,coins:500},
    {id:'win-thousand',name:'Arena Veteran',description:'Win one thousand human matches.',metric:'wins',target:1000,coins:1000},
    {id:'streak-three',name:'Unstoppable',description:'Reach a three-match human win streak.',metric:'bestStreak',target:3,coins:100},
    {id:'bronze-reached',name:'Bronze Ascension',description:'Reach one hundred ranked cups.',metric:'cups',target:100,coins:150},
    {id:'diamond-reached',name:'Diamond Heart',description:'Reach one thousand ranked cups.',metric:'cups',target:1000,coins:500},
    {id:'legend-reached',name:'Arena Legend',description:'Reach two thousand five hundred ranked cups.',metric:'cups',target:2500,coins:1000},
    {id:'first-win',name:'First Spark',description:'Win your first human match.',metric:'wins',target:1,coins:50},
    {id:'ten-games',name:'Arena Regular',description:'Complete ten human matches.',metric:'played',target:10,coins:150},
    {id:'power-twenty',name:'Elemental Adept',description:'Use twenty powers in human matches.',metric:'powersUsed',target:20,coins:150},
    {id:'rank-ten',name:'Competitive Spirit',description:'Complete ten ranked matches.',metric:'rankedPlayed',target:10,coins:200},
  ]) await db.achievement.upsert({where:{id:achievement.id},create:achievement,update:achievement});
  console.log('Seed complete: all 22 powers granted equally, free and premium cosmetics, divisions, season, missions and achievements. No fake users or leaderboard entries.');
} finally { await db.$disconnect(); }
