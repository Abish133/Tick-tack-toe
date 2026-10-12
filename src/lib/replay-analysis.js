import {WIN_LINES,POWER_CATALOG} from './game-engine/index.js';

export const replayCellLabel=cell=>Number.isInteger(cell)&&cell>=0&&cell<9?`${'ABC'[cell%3]}${Math.floor(cell/3)+1}`:'the selected cell';
const powerName=id=>POWER_CATALOG.find(power=>power.id===id)?.name||id||'Power';
const placementThreats=(board,owner,effects=[])=>[...new Set(WIN_LINES.flatMap(line=>{const own=line.filter(cell=>board[cell]===owner),empty=line.filter(cell=>board[cell]==null);return own.length===2&&empty.length===1&&!effects[empty[0]]?.locked?[empty[0]]:[];}))];

/** Observed facts from saved server states, never an invented AI evaluation. */
export function analyzeReplay(replay){
 const actions=replay?.actions||replay?.match?.actions||[],initial=replay?.initialState||{},players=initial.players||[],name=id=>players.find(player=>player.id===id)?.name||'Challenger';
 const totals=Object.fromEntries(players.map(player=>[player.id,{placements:0,powers:0,thinkingMs:0,timedActions:0,powerCounts:{}}]));
 const timeline=actions.map((record,index)=>{
  const before=index?actions[index-1]?.state||initial:initial,after=record.state||{},action=record.action||{},event=record.event||after.lastEvent||{},actorId=record.actorId||event.playerId||action.playerId||before.currentPlayerId,type=action.type||event.type;
  const stat=totals[actorId]||(totals[actorId]={placements:0,powers:0,thinkingMs:0,timedActions:0,powerCounts:{}}),round=before.round||1,notes=[];
  let title='Board update',description='The server recorded a state transition.',kind='move';
  if(type==='place'){
   stat.placements++;title=`Mark placed at ${replayCellLabel(action.cell)}`;description=`${name(actorId)} occupied ${replayCellLabel(action.cell)}.`;
   if(before.mode!=='classic')description+=' A placement restores one energy, up to six.';
  }else if(type==='power'){
   stat.powers++;stat.powerCounts[action.powerId]=(stat.powerCounts[action.powerId]||0)+1;kind='power';title=powerName(action.powerId);const target=replayCellLabel(action.cell??action.target);
   const shieldBroken=Boolean(event.shieldBroken)||Boolean(before.effects?.[action.cell]?.shield&&!after.effects?.[action.cell]?.shield&&before.board?.[action.cell]===after.board?.[action.cell]);
   description=action.powerId==='fire'?shieldBroken?`${name(actorId)} broke the shield at ${target}. The protected mark remained.`:`${name(actorId)} removed the enemy mark at ${target}.`:action.powerId==='shield'?`${name(actorId)} protected the mark at ${target} against one destructive attack.`:action.powerId==='portal'?`${name(actorId)} moved a mark from ${replayCellLabel(action.from)} to ${replayCellLabel(action.to)}.`:action.powerId==='ice'?`${name(actorId)} anchored the enemy mark at ${target}. Its symbol still counted toward lines.`:action.powerId==='crystal'?`${name(actorId)} temporarily locked ${target}. The restriction expired after the opponent's action.`:action.powerId==='surge'?`${name(actorId)} spent an action restoring up to three energy.`:`${name(actorId)} activated ${powerName(action.powerId)}.`;
   if(shieldBroken)notes.push({kind:'counter',text:'Shield counterplay: the attack consumed the shield instead of destroying the mark.'});
  }else if(type==='surrender'||after.finishReason==='surrender'&&index===actions.length-1){kind='ending';title='Match surrendered';description=`${name(actorId)} ended the match by surrendering.`;}
  else if(type==='timeout'||['turn-timeout','match-clock-expired'].includes(event.reason)||event.result?.reason==='turn-timeout'){kind='ending';title=after.finishReason==='match-clock-expired'?'Thinking bank expired':'Turn clock expired';description=`${name(actorId)} ran out of thinking time. The server applied the timeout result.`;}
  const finishedRound=!(before.roundHistory||[]).some(item=>item.round===round)?(after.roundHistory||[]).find(item=>item.round===round):null;
  if(finishedRound){kind='round';notes.push({kind:'round',text:finishedRound.winnerId?`${name(finishedRound.winnerId)} won round ${round}${finishedRound.reason==='line'?' with three in a row':''}.`:`Round ${round} ended in a draw (${String(finishedRound.reason||'draw').replaceAll('-',' ')}).`});}
  const board=finishedRound?.board||after.board||[],effects=finishedRound?.effects||after.effects||[];
  if(board.length===9&&!finishedRound&&['place','power'].includes(type)){
   const enemy=players.find(player=>player.id!==actorId)?.id,beforeThreats=placementThreats(before.board||[],actorId,before.effects),afterThreats=placementThreats(board,actorId,effects),enemyBefore=placementThreats(before.board||[],enemy,before.effects),enemyAfter=placementThreats(board,enemy,effects);
   const added=afterThreats.filter(cell=>!beforeThreats.includes(cell));
   if(afterThreats.length>=2&&added.length)notes.push({kind:'threat',text:`Two or more immediate placement threats appeared at ${afterThreats.map(replayCellLabel).join(', ')}. Elemental powers could still provide counterplay.`});
   else if(added.length)notes.push({kind:'threat',text:`A three-in-a-row placement threat appeared at ${added.map(replayCellLabel).join(', ')}.`});
   const removed=enemyBefore.filter(cell=>!enemyAfter.includes(cell));if(removed.length)notes.push({kind:'counter',text:`The opponent's immediate placement threat at ${removed.map(replayCellLabel).join(', ')} was removed.`});
  }
  if(event.restrictionsExpiredEarly)notes.push({kind:'counter',text:'Temporary restrictions expired early so the incoming player retained a legal action.'});
  const recordedAt=Number(event.at??after.lastEvent?.at??new Date(record.createdAt).getTime()),thinkingMs=['place','power'].includes(type)&&Number.isFinite(recordedAt)&&Number.isFinite(before.turnStartedAt)?Math.max(0,Math.min(recordedAt-before.turnStartedAt,(before.turnSeconds||30)*1000)):null;
  if(thinkingMs!=null){stat.thinkingMs+=thinkingMs;stat.timedActions++;}
  return {index:index+1,sequence:record.sequence??index+1,actorId,actorName:name(actorId),round,title,description,kind,notes,powerId:action.powerId,thinkingMs,board};
 });
 return {players:players.map(player=>({...player,...totals[player.id],averageThinkingMs:totals[player.id]?.timedActions?totals[player.id].thinkingMs/totals[player.id].timedActions:null})),timeline,highlights:timeline.filter(item=>item.notes.length||item.kind==='ending'),rounds:actions.at(-1)?.state?.roundHistory||[],powerCount:timeline.filter(item=>item.kind==='power'||item.powerId).length};
}
