'use client';
import {useMemo,useState} from 'react';
import {X,Circle,Shield,Snowflake,LockKeyhole,RefreshCw,BookOpen,Zap,Check} from 'lucide-react';
import {applyAction} from '../lib/game-engine/index';
import {createPowerTraining,trainingChoices,TRAINING_PLAYER} from '../lib/power-training';
import {POWER_INFO,PowerIcon,powerInfo} from './PowerPresentation';
import PowerTargetControls,{CellStatuses,effectLabel,targetHint} from './PowerTargetControls';
import PowerEffects from './PowerEffects';
import styles from './PowerLab.module.css';

export default function PowerLab({reducedMotion=false,onSound=()=>{}}){
 const [powerId,setPowerId]=useState('fire'),[game,setGame]=useState(()=>createPowerTraining('fire')),[source,setSource]=useState(null),[done,setDone]=useState(false),[error,setError]=useState('');
 const power=powerInfo(powerId),choices=useMemo(()=>done?[]:trainingChoices(game,powerId),[game,powerId,done]);
 function select(id){setPowerId(id);setGame(createPowerTraining(id));setSource(null);setDone(false);setError('');}
 function canTarget(cell){return choices.some(action=>Number.isInteger(action.from)?source===null?action.from===cell:action.from===source&&action.to===cell:action.cell===cell);}
 function cast(action){if(!action)return;try{setGame(applyAction(game,TRAINING_PLAYER,action,game.turnStartedAt+200));setDone(true);setSource(null);onSound(powerId);}catch(error){setError(error.message);}}
 function click(cell){if(!canTarget(cell))return;if(source===null&&choices.some(action=>Number.isInteger(action.from))){setSource(cell);return;}cast(choices.find(action=>Number.isInteger(action.from)?action.from===source&&action.to===cell:action.cell===cell));}
 const self=['surge','time','echo'].includes(powerId);
 return <section className={`panel ${styles.root}`} aria-label="All power training laboratory">
  <div className={styles.header}><div><span className="badge violet"><BookOpen size={12}/>POWER LAB</span><h2>Try every element.</h2><p>Learn the target, see the effect, then build your combination.</p></div><label>Training power<select aria-label="Training power" value={powerId} onChange={event=>select(event.target.value)}>{POWER_INFO.map(power=><option key={power.id} value={power.id}>{power.name}</option>)}</select></label></div>
  <div className={styles.layout}><div className={styles.details} style={{'--power-color':power.color}}><PowerIcon id={powerId} size={38}/><h3>{power.name}</h3><span><Zap size={13}/>{power.cost} energy · {power.maxUsesPerMatch?'Once per match':power.consumesTurn===false?'Clock extension, no extra move':'Consumes one main action'}</span><p>{power.description}</p><h4>Counterplay</h4><p>{power.counterplay}</p>{['bloom','echo'].includes(powerId)&&<p className={styles.setup}>The opponent just destroyed your latest mark at B1. This creates a real restoration charge.</p>}{powerId==='tide'&&<p className={styles.setup}>The opponent locked C3. Transfer that terrain to another empty cell.</p>}{powerId==='purify'&&<p className={styles.setup}>The opponent cursed your A1 mark. Cleanse it before the poison expires.</p>}{powerId==='eclipse'&&<p className={styles.setup}>Four main actions have passed. The ultimate is now eligible.</p>}<button className="text-button" onClick={()=>select(powerId)}><RefreshCw size={14}/>Reset this scenario</button><small>This prepared training board uses the real engine. Starting energy is supplied for practice; it awards no rewards.</small></div>
  <div className={styles.arena}><div className={styles.hint} aria-live="polite">{done?<><Check size={16}/>{powerId==='time'?'The deadline extended. It is still your turn.':`${power.name} resolved. The opponent takes the next action.`}</>:self?'Activate the highlighted power.':targetHint(powerId,source)}</div>
   <div className="game-board" role="group" aria-label="Power laboratory board">{game.board.map((value,cell)=>{const player=game.players.find(player=>player.id===value),effect=game.effects[cell]||{};return <button key={cell} className={`game-cell ${player?.mark.toLowerCase()||''} ${canTarget(cell)?'valid-target':''} ${source===cell?'selected-source':''} ${effect.shield?'shielded':''} ${effect.locked?'locked':''} ${effect.frozenUntil>game.turnNumber?'frozen':''}`} disabled={!canTarget(cell)} aria-label={`Power lab row ${Math.floor(cell/3)+1}, column ${cell%3+1}: ${player?.mark||'empty'}${effectLabel(effect,game.turnNumber)?`, ${effectLabel(effect,game.turnNumber)}`:''}`} onClick={()=>click(cell)}>{player&&<span className={`mark ${player.mark.toLowerCase()}`}>{player.mark==='X'?<X/>:<Circle/>}</span>}{effect.shield&&<Shield className="cell-effect" size={15}/>} {effect.locked&&<LockKeyhole size={25}/>} {effect.frozenUntil>game.turnNumber&&<Snowflake className="cell-effect" size={15}/>}<CellStatuses effect={effect} turn={game.turnNumber} players={game.players}/></button>;})}<PowerEffects event={game.lastEvent} revision={game.revision} reducedMotion={reducedMotion}/></div>
   {self&&<button className={`button primary ${styles.cast}`} disabled={done||!choices.length} onClick={()=>cast(choices[0])}><PowerIcon id={powerId} size={18}/>{done?'Activated':`Activate ${power.name}`}</button>}
   <PowerTargetControls id={powerId} actions={choices} disabled={done} onAction={cast}/>
   <div className={styles.resources}><span>Energy <strong>{game.energy[TRAINING_PLAYER]} / 6</strong></span><span>Restoration charges <strong>{game.restorationCharges?.[TRAINING_PLAYER]?.length||0}</strong></span></div>{error&&<p role="alert">{error}</p>}
  </div></div>
 </section>;
}
