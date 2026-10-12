'use client';
import {ArrowUp,ArrowDown,ArrowLeft,ArrowRight,Target} from 'lucide-react';
import {powerInfo} from './PowerPresentation';
import styles from './PowerTargetControls.module.css';

export function targetHint(id,source){
 const power=powerInfo(id);if(!power)return '';
 if(['portal','wind','tide','shadow'].includes(id))return source===null?`Choose ${id==='tide'?'enemy-created terrain to transfer':'your source mark'}.`:`Choose ${id==='shadow'?'an eligible enemy mark':id==='tide'?'an empty unlocked destination':id==='wind'?'an empty diagonal neighbor':'an empty unlocked destination'}.`;
 if(id==='gravity')return 'Choose a direction. All eligible marks shift one cell in a stable order.';
 if(id==='dragon')return 'Choose a row or column. Its first unfrozen enemy mark is attacked.';
 return `Select a target for ${power.name}.`;
}
export default function PowerTargetControls({id,actions=[],onAction,disabled=false}){
 if(!['gravity','dragon'].includes(id))return null;
 const directionIcons={up:ArrowUp,down:ArrowDown,left:ArrowLeft,right:ArrowRight};
 return <div className={styles.controls} aria-label={`${powerInfo(id)?.name} targets`}>
  <span><Target size={14}/>{id==='gravity'?'Shift direction':'Attack line'}</span>
  <div>{id==='gravity'?['up','left','down','right'].map(direction=>{const Icon=directionIcons[direction],action=actions.find(item=>item.direction===direction);return <button key={direction} disabled={disabled||!action} onClick={()=>onAction(action)} aria-label={`Shift ${direction}`}><Icon size={18}/><small>{direction}</small></button>;}):['row','column'].flatMap(axis=>Array.from({length:3},(_,index)=>{const action=actions.find(item=>item.axis===axis&&item.index===index);return <button key={`${axis}-${index}`} disabled={disabled||!action} onClick={()=>onAction(action)} aria-label={`Attack ${axis} ${index+1}`}><span>{axis==='row'?`${index+1} —`:`${'ABC'[index]} │`}</span><small>{axis} {index+1}</small></button>;}))}</div>
 </div>;
}
export function CellStatuses({effect={},turn=0,players=[]}){
 const active=value=>Number(value)>turn;
 return <>
  {active(effect.mirrorUntil)&&<span className={styles.mirror} title="Reflective defense">◇</span>}
  {active(effect.rootUntil)&&<span className={styles.root} title="Root anchored">⌁</span>}
  {active(effect.poisonUntil)&&<span className={styles.poison} title="Poison: delayed destruction">☠<small>{Math.max(1,Math.ceil((effect.poisonUntil-turn)/2))}</small></span>}
  {effect.phantomOwner&&active(effect.phantomUntil)&&<span className={styles.phantom} title="Phantom illusion: cannot complete a line">{players.find(player=>player.id===effect.phantomOwner)?.mark||'✧'}<small>ILLUSION</small></span>}
  {effect.locked&&effect.terrain&&effect.terrain!=='crystal'&&<span className={`${styles.terrain} ${styles[effect.terrain]||''}`}>{effect.terrain==='electricity'?'⚡':effect.terrain==='scorched'?'♨':effect.terrain==='darkness'?'☾':effect.terrain}</span>}
 </>;
}
export function effectLabel(effect={},turn=0){return [effect.shield?'shielded':'',effect.locked?`${effect.terrain||'crystal'} terrain locked`:'',effect.frozenUntil>turn?'frozen':'',effect.mirrorUntil>turn?'reflective defense':'',effect.rootUntil>turn?'root anchored':'',effect.poisonUntil>turn?'poisoned: delayed hit after the next owner action':'',effect.phantomOwner&&effect.phantomUntil>turn?'phantom illusion, not a real mark':''].filter(Boolean).join(', ');}
