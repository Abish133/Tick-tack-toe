import test from 'node:test';
import assert from 'node:assert/strict';
import {historicalMigrations,historicalSourceDigests,planMigrationCaseRepair} from '../scripts/migration-case-compat.mjs';
import {root} from '../scripts/local-utils.mjs';

const [initial,active,streaks]=historicalMigrations;
const digests=Object.fromEntries(historicalMigrations.map(m=>[m.name,m.lf]));
const applied=m=>({name:m.name,checksum:m.lf,finishedAt:new Date(),rolledBackAt:null});
const failure=(m,table)=>({name:m.name,checksum:m.lf,finishedAt:null,rolledBackAt:null,logs:"Database error code: 1146\nTable 'elemental_arena."+table+"' doesn't exist\nPlease check query number 1."});
const empty=()=>({caseMode:0,userCount:0,matchCount:0,tables:['User','Match','PlayerProfile','PlayerStats'],migrations:[applied(initial),failure(active,'playerprofile')],columns:[],foreignKeys:[],indexes:[]});
const completeSchema=()=>({columns:[
  {table:'PlayerProfile',name:'equippedEffect',type:'varchar',length:80,nullable:true,defaultValue:null},
  {table:'User',name:'activeMatchId',type:'varchar',length:191,nullable:true,defaultValue:null},
  ...['bestStreak','streak'].map(name=>({table:'PlayerStats',name,type:'int',nullable:false,defaultValue:'0'})),
],foreignKeys:[{table:'User',name:'User_activeMatchId_fkey',column:'activeMatchId',targetTable:'Match',targetColumn:'id',deleteRule:'SET NULL',updateRule:'CASCADE'}],indexes:[{table:'User',name:'User_name_key',column:'name',sequence:1,unique:true,prefix:null}]});

test('immutable historical sources retain their normalized checksums',async()=>{
  assert.deepEqual(await historicalSourceDigests(root),digests);
});
test('empty Linux bootstrap plans equivalent DDL with canonical table names',()=>{
  const plan=planMigrationCaseRepair(empty(),digests);
  assert.equal(plan.needed,true);assert.deepEqual(plan.steps.map(s=>s.name),[active.name,streaks.name]);
  assert.equal(plan.steps.flatMap(s=>s.sql).length,6);
  assert.ok(plan.steps.flatMap(s=>s.sql).every(sql=>!sql.includes('`playerprofile`')&&!sql.includes('`playerstats`')&&!sql.includes('`user`')));
});
test('case-insensitive servers and completed history skip repair before data guards',()=>{
  assert.equal(planMigrationCaseRepair({caseMode:1},{}).needed,false);
  assert.equal(planMigrationCaseRepair({caseMode:0,userCount:10,matchCount:5,migrations:historicalMigrations.map(applied)},digests).needed,false);
});
test('partial schema completion and partially resolved history are idempotent',()=>{
  let snapshot={...empty(),...completeSchema()};
  assert.ok(planMigrationCaseRepair(snapshot,digests).steps.every(step=>step.sql.length===0));
  snapshot.migrations=[applied(initial),applied(active)];
  assert.deepEqual(planMigrationCaseRepair(snapshot,digests).steps,[{name:streaks.name,sql:[]}]);
});
test('CRLF history checksums are accepted only for the exact immutable sources',()=>{
  const snapshot=empty();snapshot.migrations.forEach(row=>row.checksum=historicalMigrations.find(m=>m.name===row.name).crlf);
  assert.equal(planMigrationCaseRepair(snapshot,digests).needed,true);
  snapshot.migrations[1].checksum='0'.repeat(64);
  assert.throws(()=>planMigrationCaseRepair(snapshot,digests),/unexpected history checksum/);
  assert.throws(()=>planMigrationCaseRepair(empty(),{...digests,[active.name]:'0'.repeat(64)}),/historical source changed/);
});
test('player data, missing initial history and unrelated failures prevent every repair',()=>{
  for(const change of [{userCount:1},{matchCount:1},{migrations:[failure(active,'playerprofile')]},{tables:['User','Match','PlayerStats']}])assert.throws(()=>planMigrationCaseRepair({...empty(),...change},digests),/refused/);
  const wrong=empty();wrong.migrations[1].logs='Database error code: 1060 Duplicate column';
  assert.throws(()=>planMigrationCaseRepair(wrong,digests),/known missing-table error/);
  wrong.migrations[1]=failure(active,'unrelated');
  assert.throws(()=>planMigrationCaseRepair(wrong,digests),/known missing-table error/);
  wrong.migrations.push({name:'unknown_migration',finishedAt:null,rolledBackAt:null,logs:'1146'});
  assert.throws(()=>planMigrationCaseRepair(wrong,digests),/known missing-table error/);
});
test('incompatible column, foreign key and unique index definitions prevent repair',()=>{
  const column={...empty(),...completeSchema()};column.columns[0].length=40;
  assert.throws(()=>planMigrationCaseRepair(column,digests),/incompatible column/);
  const foreign={...empty(),...completeSchema()};foreign.foreignKeys[0].deleteRule='CASCADE';
  assert.throws(()=>planMigrationCaseRepair(foreign,digests),/incompatible active-match foreign key/);
  const index={...empty(),...completeSchema()};index.indexes[0].unique=false;
  assert.throws(()=>planMigrationCaseRepair(index,digests),/incompatible unique player-name index/);
});
