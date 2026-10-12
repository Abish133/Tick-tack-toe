import {createHash} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import path from 'node:path';

export const historicalMigrations=Object.freeze([
  {name:'202610080001_initial',lf:'1b5410c98662d461a7fa07ddf601b05ca20d6cc6539558e594b7a12a3b3e3bce',crlf:'1fd989601f5f0235098759f0a56646de5d04ee611bc2bb989b69a8505eb8ae30'},
  {name:'202610080002_active_match',lf:'bbf998cb058a2533ee15bb4cef71782c8225aa36423112b6b9efae88c6b3b57c',crlf:'391a31f9482d21cfb725d6421b016a2e87b1afc69819bb8ce30ab83988829d57'},
  {name:'202610080003_unique_names_streaks',lf:'a9c84211d53086a95c06f91f49f11aa59502d85161fbbf01669d8354cbefd541',crlf:'04249c9d909e6ad51e4d27b3730f8f3211c1de6fc3988c5951ed1864e285b1d7'},
]);
const [initial,active,streaks]=historicalMigrations;
const check=(condition,message)=>{if(!condition)throw new Error('Migration case compatibility refused: '+message);};
const completed=(rows,name)=>rows.some(row=>row.name===name&&row.finishedAt&&!row.rolledBackAt);
const unresolved=row=>!row.finishedAt&&!row.rolledBackAt;
const failureMatches=(row,table)=>/\b1146\b/.test(row.logs||'')&&new RegExp("Table ['`][^'`]+\\."+table+"['`] doesn't exist",'i').test(row.logs||'');

export async function historicalSourceDigests(root){
  return Object.fromEntries(await Promise.all(historicalMigrations.map(async migration=>{
    const source=await readFile(path.join(root,'prisma','migrations',migration.name,'migration.sql'),'utf8');
    return [migration.name,createHash('sha256').update(source.replace(/\r\n/g,'\n')).digest('hex')];
  })));
}

// This pure plan is deliberately limited to the empty-database Linux bootstrap.
// Original migration files remain unchanged so existing Windows history and
// Prisma's recorded checksums are preserved.
export function planMigrationCaseRepair(snapshot,sourceDigests){
  if(snapshot.caseMode!==0)return {needed:false,reason:'case-insensitive-server',steps:[]};
  const rows=snapshot.migrations||[];
  for(const migration of historicalMigrations){
    check(sourceDigests[migration.name]===migration.lf,'historical source changed for '+migration.name);
    for(const row of rows.filter(row=>row.name===migration.name))check([migration.lf,migration.crlf].includes(row.checksum),'unexpected history checksum for '+migration.name);
  }
  if(completed(rows,active.name)&&completed(rows,streaks.name))return {needed:false,reason:'already-applied',steps:[]};
  check(completed(rows,initial.name),'the initial migration is not complete');
  check(snapshot.userCount===0&&snapshot.matchCount===0,'database contains player or match data');
  for(const table of ['User','Match','PlayerProfile','PlayerStats'])check(snapshot.tables?.includes(table),'canonical table is missing: '+table);
  for(const row of rows.filter(unresolved)){
    const expected=row.name===active.name?'playerprofile':row.name===streaks.name?'playerstats':null;
    check(expected&&failureMatches(row,expected),'failure is not the known missing-table error');
  }
  check(completed(rows,active.name)||rows.some(row=>row.name===active.name&&unresolved(row)&&failureMatches(row,'playerprofile')),'active-match migration has not failed in the expected way');

  const activeSQL=[],streakSQL=[];
  function column(table,name,type,length,nullable,defaultValue,sql,target){
    const found=(snapshot.columns||[]).filter(row=>row.table===table&&row.name===name);
    if(!found.length){target.push(sql);return;}
    const row=found[0];
    check(found.length===1&&row.type===type&&(length==null||Number(row.length)===length)&&row.nullable===nullable&&(defaultValue==null?row.defaultValue==null:String(row.defaultValue)===String(defaultValue))&&!/unsigned|auto_increment/i.test((row.columnType||'')+' '+(row.extra||'')),'incompatible column '+table+'.'+name);
  }
  column('PlayerProfile','equippedEffect','varchar',80,true,null,'ALTER TABLE `PlayerProfile` ADD COLUMN `equippedEffect` VARCHAR(80) NULL',activeSQL);
  column('User','activeMatchId','varchar',191,true,null,'ALTER TABLE `User` ADD COLUMN `activeMatchId` VARCHAR(191) NULL',activeSQL);
  const foreignKeys=(snapshot.foreignKeys||[]).filter(row=>row.table==='User'&&(row.name==='User_activeMatchId_fkey'||row.column==='activeMatchId'));
  if(!foreignKeys.length)activeSQL.push('ALTER TABLE `User` ADD CONSTRAINT `User_activeMatchId_fkey` FOREIGN KEY (`activeMatchId`) REFERENCES `Match`(`id`) ON DELETE SET NULL ON UPDATE CASCADE');
  else check(foreignKeys.length===1&&foreignKeys[0].name==='User_activeMatchId_fkey'&&foreignKeys[0].column==='activeMatchId'&&foreignKeys[0].targetTable==='Match'&&foreignKeys[0].targetColumn==='id'&&foreignKeys[0].deleteRule==='SET NULL'&&foreignKeys[0].updateRule==='CASCADE','incompatible active-match foreign key');
  column('PlayerStats','bestStreak','int',null,false,0,'ALTER TABLE `PlayerStats` ADD COLUMN `bestStreak` INTEGER NOT NULL DEFAULT 0',streakSQL);
  column('PlayerStats','streak','int',null,false,0,'ALTER TABLE `PlayerStats` ADD COLUMN `streak` INTEGER NOT NULL DEFAULT 0',streakSQL);
  const index=(snapshot.indexes||[]).filter(row=>row.table==='User'&&row.name==='User_name_key');
  if(!index.length)streakSQL.push('CREATE UNIQUE INDEX `User_name_key` ON `User`(`name`)');
  else check(index.length===1&&index[0].column==='name'&&index[0].sequence===1&&index[0].unique&&index[0].prefix==null,'incompatible unique player-name index');
  const steps=[];
  if(!completed(rows,active.name))steps.push({name:active.name,sql:activeSQL});
  else check(!activeSQL.length,'completed active-match migration is missing its schema');
  if(!completed(rows,streaks.name))steps.push({name:streaks.name,sql:streakSQL});
  return {needed:true,reason:'empty-linux-bootstrap',steps};
}

async function inspectDatabase(db){
  const config=await db.$queryRaw`SELECT @@lower_case_table_names AS caseMode`;
  const caseMode=Number(config[0].caseMode);
  if(caseMode!==0)return {caseMode};
  const migrations=await db.$queryRaw`SELECT migration_name, checksum, finished_at, rolled_back_at, logs FROM _prisma_migrations ORDER BY started_at`;
  const base={caseMode,migrations:migrations.map(row=>({name:row.migration_name,checksum:row.checksum,finishedAt:row.finished_at,rolledBackAt:row.rolled_back_at,logs:row.logs}))};
  if(completed(base.migrations,active.name)&&completed(base.migrations,streaks.name))return base;
  const [tables,counts,columns,keys,indexes]=await Promise.all([
    db.$queryRaw`SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA=DATABASE()`,
    db.$queryRaw`SELECT (SELECT COUNT(*) FROM User) AS userCount, (SELECT COUNT(*) FROM \`Match\`) AS matchCount`,
    db.$queryRaw`SELECT TABLE_NAME,COLUMN_NAME,DATA_TYPE,CHARACTER_MAXIMUM_LENGTH,IS_NULLABLE,COLUMN_DEFAULT,COLUMN_TYPE,EXTRA FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME IN ('User','PlayerProfile','PlayerStats')`,
    db.$queryRaw`SELECT k.TABLE_NAME,k.CONSTRAINT_NAME,k.COLUMN_NAME,k.REFERENCED_TABLE_NAME,k.REFERENCED_COLUMN_NAME,r.DELETE_RULE,r.UPDATE_RULE FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE k JOIN INFORMATION_SCHEMA.REFERENTIAL_CONSTRAINTS r ON r.CONSTRAINT_SCHEMA=k.CONSTRAINT_SCHEMA AND r.CONSTRAINT_NAME=k.CONSTRAINT_NAME AND r.TABLE_NAME=k.TABLE_NAME WHERE k.TABLE_SCHEMA=DATABASE() AND k.TABLE_NAME='User'`,
    db.$queryRaw`SELECT TABLE_NAME,INDEX_NAME,COLUMN_NAME,SEQ_IN_INDEX,NON_UNIQUE,SUB_PART FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='User' AND INDEX_NAME='User_name_key'`,
  ]);
  return {...base,tables:tables.map(row=>row.TABLE_NAME),userCount:Number(counts[0].userCount),matchCount:Number(counts[0].matchCount),columns:columns.map(row=>({table:row.TABLE_NAME,name:row.COLUMN_NAME,type:row.DATA_TYPE,length:row.CHARACTER_MAXIMUM_LENGTH,nullable:row.IS_NULLABLE==='YES',defaultValue:row.COLUMN_DEFAULT,columnType:row.COLUMN_TYPE,extra:row.EXTRA})),foreignKeys:keys.map(row=>({table:row.TABLE_NAME,name:row.CONSTRAINT_NAME,column:row.COLUMN_NAME,targetTable:row.REFERENCED_TABLE_NAME,targetColumn:row.REFERENCED_COLUMN_NAME,deleteRule:row.DELETE_RULE,updateRule:row.UPDATE_RULE})),indexes:indexes.map(row=>({table:row.TABLE_NAME,name:row.INDEX_NAME,column:row.COLUMN_NAME,sequence:Number(row.SEQ_IN_INDEX),unique:Number(row.NON_UNIQUE)===0,prefix:row.SUB_PART}))};
}

export async function deployMigrationsWithCaseCompatibility({db,root,deploy,resolve,log=console.log}){
  try{await deploy();return {repaired:false};}
  catch(deployError){
    const sourceDigests=await historicalSourceDigests(root);
    const plan=planMigrationCaseRepair(await inspectDatabase(db),sourceDigests);
    if(!plan.needed)throw deployError;
    log(JSON.stringify({level:'info',event:'migration_case_compatibility',migrations:plan.steps.map(step=>step.name)}));
    for(const step of plan.steps)for(const sql of step.sql)await db.$executeRawUnsafe(sql);
    const verification=planMigrationCaseRepair(await inspectDatabase(db),sourceDigests);
    check(verification.steps.every(step=>step.sql.length===0),'canonical schema verification did not pass');
    for(const step of plan.steps)await resolve(step.name);
    const finished=planMigrationCaseRepair(await inspectDatabase(db),sourceDigests);
    check(!finished.needed&&finished.reason==='already-applied','migration history was not resolved completely');
    await deploy();
    return {repaired:true};
  }
}
