import {createGame,applyAction,POWER_CATALOG,DEFAULT_LOADOUT,legalActions} from './game-engine/index.js';

export const TRAINING_PLAYER='training-x';
/** Fixed educational setup: prerequisites are created with real legal transitions.
 * The starting energy is topped up for a single demonstration; no rewards persist. */
export function createPowerTraining(powerId){
 if(!POWER_CATALOG.some(power=>power.id===powerId))throw Error('Unknown training power.');
 const loadout=[powerId,...DEFAULT_LOADOUT.filter(id=>id!==powerId)].slice(0,3);
 let game=createGame({mode:'elemental',rounds:1,now:0,players:[{id:TRAINING_PLAYER,name:'You',loadout},{id:'training-o',name:'Training opponent',loadout:['fire','crystal','poison']}]});
 const step=action=>{game=applyAction(game,game.currentPlayerId,{...action,revision:game.revision},game.turnStartedAt+200);};
 step({type:'place',cell:powerId==='wind'?4:0});step({type:'place',cell:powerId==='wind'?0:4});
 if(['tide','bloom','echo','purify','eclipse'].includes(powerId)){
  step({type:'place',cell:1});
  if(powerId==='tide')step({type:'power',powerId:'crystal',cell:8});
  else if(['bloom','echo'].includes(powerId))step({type:'power',powerId:'fire',cell:1});
  else if(powerId==='purify')step({type:'power',powerId:'poison',cell:0});
  else step({type:'place',cell:3});
 }
 game.energy[TRAINING_PLAYER]=powerId==='surge'?3:6;
 return game;
}
export function trainingChoices(game,powerId){return legalActions(game,TRAINING_PLAYER).filter(action=>action.type==='power'&&action.powerId===powerId);}
