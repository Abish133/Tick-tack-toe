import {WIN_LINES,POWER_CATALOG} from './game-engine/index.js';

export const replayCellLabel=cell=>Number.isInteger(cell)&&cell>=0&&cell<9?`${'ABC'[cell%3]}${Math.floor(cell/3)+1}`:'the selected cell';
const powerName=id=>POWER_CATALOG.find(power=>power.id===id)?.name||id||'Power';
const placementThreats=(board,owner,effects=[])=>[...new Set(WIN_LINES.flatMap(line=>{const own=line.filter(cell=>board[cell]===owner),empty=line.filter(cell=>board[cell]==null);return own.length===2&&empty.length===1&&!effects[empty[0]]?.locked?[empty[0]]:[];}))];

export function describeReplayPower({action,event,before,after,actorName}){
 const cell=action.cell??action.target??event.resolvedCell,target=replayCellLabel(cell),actor=actorName;
 const shieldBroken=event.shieldCells?.includes(cell)||Boolean(before.effects?.[cell]?.shield&&!after.effects?.[cell]?.shield&&before.board?.[cell]===after.board?.[cell]);
 if(['fire','lightning','meteor','eclipse','dragon'].includes(action.powerId)){
  const line=action.powerId==='dragon'?` in ${action.axis} ${action.index+1}`:'';
  if(event.reflected)return event.reflectionCell!=null?`${actor}'s attack at ${target} was reflected. The attacker’s mark at ${replayCellLabel(event.reflectionCell)} was destroyed.`:`${actor}'s attack at ${target} was blocked by Mirror Reflect. No eligible reflection target existed.`;
  if(shieldBroken)return `${actor} broke the shield at ${target}${line}. The protected mark remained.`;
  return `${actor} removed the enemy mark at ${target}${line}.${after.effects?.[cell]?.locked?` ${String(after.effects[cell].terrain||'Restricted').replace(/^./,letter=>letter.toUpperCase())} terrain temporarily blocked that cell.`:''}`;
 }
 switch(action.powerId){
  case'shield':return `${actor} protected the mark at ${target} against one destructive attack.`;
  case'portal':case'wind':return `${actor} moved a mark from ${replayCellLabel(action.from)} to ${replayCellLabel(action.to)}${action.powerId==='wind'?' with a one-square diagonal step':''}.`;
  case'ice':return `${actor} anchored the enemy mark at ${target}. Its symbol still counted toward lines.`;
  case'crystal':return `${actor} temporarily locked ${target}. The restriction expired after the opponent's action.`;
  case'surge':return `${actor} spent an action restoring up to three energy.`;
  case'time':return `${actor} extended the current turn deadline by ${Math.max(0,Number(event.addedTimeMs??after.turnDeadline-before.turnDeadline))/1000} seconds. The same player retained the main action.`;
  case'shadow':return `${actor} exchanged the friendly mark at ${replayCellLabel(action.from)} with the enemy mark at ${replayCellLabel(action.to)}. Both players' lines were checked.`;
  case'bloom':return `${actor} spent a genuine lost-mark restoration charge to grow a mark at ${target}.`;
  case'mirror':return `${actor} applied a reflective defense at ${target}, lasting through two completed owner turns or the next eligible hit.`;
  case'phantom':return `${actor} created a labelled illusion at ${target}. It did not count toward a winning line or block a real placement.`;
  case'gravity':return `${actor} shifted eligible marks ${action.direction}. ${(event.movements||[]).map(move=>`${replayCellLabel(move.from)} → ${replayCellLabel(move.to)}`).join(', ')}.`;
  case'poison':return `${actor} cursed the mark at ${target}. Its owner had one action to cleanse or protect it before delayed destruction.`;
  case'purify':return `${actor} cleansed removable negative effects at ${target}. Ownership and beneficial shields remained.`;
  case'tide':return `${actor} transferred enemy-created terrain from ${replayCellLabel(action.from)} to ${replayCellLabel(action.to)} for one opponent action.`;
  case'root':return `${actor} anchored the mark at ${target} against displacement for two completed owner turns. It remained vulnerable to destruction.`;
  case'echo':return `${actor} restored the most recent destroyed basic placement at ${target}, consuming that exact mark's restoration charge.`;
  default:return `${actor} activated ${powerName(action.powerId)}.`;
 }
}

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
   stat.powers++;stat.powerCounts[action.powerId]=(stat.powerCounts[action.powerId]||0)+1;kind='power';title=powerName(action.powerId);const targetCell=action.cell??action.target??event.resolvedCell;
   const shieldBroken=event.shieldCells?.includes(targetCell)||Boolean(before.effects?.[targetCell]?.shield&&!after.effects?.[targetCell]?.shield&&before.board?.[targetCell]===after.board?.[targetCell]);
   description=describeReplayPower({action,event,before,after,actorName:name(actorId)});
   if(shieldBroken)notes.push({kind:'counter',text:'Shield counterplay: the attack consumed the shield instead of destroying the mark.'});
   if(event.reflected)notes.push({kind:'counter',text:event.reflectionCell!=null?`Mirror reflected the attack to ${replayCellLabel(event.reflectionCell)} without another reflection.`:'Mirror blocked the attack because no eligible reflection target existed.'});
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
  for(const item of event.expired?.filter(item=>item.effect==='poison')||[]){
   const destroyed=event.destroyed?.some(loss=>loss.cell===item.cell),shieldAbsorbed=event.shieldCells?.includes(item.cell);
   notes.push({kind:'counter',text:`Poison resolved at ${replayCellLabel(item.cell)} before winning lines were checked. ${destroyed?'The cursed mark was destroyed.':shieldAbsorbed?'Its shield absorbed the delayed hit.':'The mark was preserved; no destruction was recorded.'}`});
  }
  const recordedAt=Number(event.at??after.lastEvent?.at??new Date(record.createdAt).getTime()),thinkingMs=['place','power'].includes(type)&&Number.isFinite(recordedAt)&&Number.isFinite(before.turnStartedAt)?Math.max(0,Math.min(recordedAt-before.turnStartedAt,Number.isFinite(before.turnDeadline)?before.turnDeadline-before.turnStartedAt:(before.turnSeconds||30)*1000)):null;
  if(thinkingMs!=null){stat.thinkingMs+=thinkingMs;stat.timedActions++;}
  return {index:index+1,sequence:record.sequence??index+1,actorId,actorName:name(actorId),round,title,description,kind,notes,powerId:action.powerId,thinkingMs,board};
 });
 return {players:players.map(player=>({...player,...totals[player.id],averageThinkingMs:totals[player.id]?.timedActions?totals[player.id].thinkingMs/totals[player.id].timedActions:null})),timeline,highlights:timeline.filter(item=>item.notes.length||item.kind==='ending'),rounds:actions.at(-1)?.state?.roundHistory||[],powerCount:timeline.filter(item=>item.kind==='power'||item.powerId).length};
}
