'use client';
import {useMemo,useState} from 'react';
import {ArrowUpRight,Clock3,Flame,Lightbulb,Shield,Sparkles,Target,Trophy,Zap} from 'lucide-react';
import {analyzeReplay} from '../lib/replay-analysis';
import {boardSizeOf} from '../lib/game-engine/index';
import styles from './ReplayAnalysis.module.css';

export default function ReplayAnalysis({replay,index=0,onSeek,userId}){
 const [tab,setTab]=useState('highlights'),analysis=useMemo(()=>analyzeReplay(replay),[replay]);
 if(!replay)return null;
 const selected=analysis.timeline[Math.max(0,index-1)],rows=tab==='highlights'?analysis.highlights:analysis.timeline,boardSize=boardSizeOf(replay.initialState);
 const seek=step=>onSeek?.(step);
 return <div className={styles.analysis}>
  <section className={`panel ${styles.summary}`}><header><Sparkles size={19}/><div><h3>The battle, in focus</h3><p>{boardSize} × {boardSize} battlefield · {boardSize>3?'Every completed triplet counts.':'Three matching marks win a round.'}</p></div><span className="badge">{analysis.timeline.length} recorded actions</span></header>
   <div className={styles.players}>{analysis.players.map(player=><article key={player.id}><h4><span className={`${styles.mark} ${player.mark==='X'?styles.x:styles.o}`}>{player.mark}</span>{player.name}{player.id===userId&&<small>YOU</small>}</h4><div className={styles.stats}><div><Target size={13}/><strong>{player.placements}</strong><span>Placements</span></div><div><Zap size={13}/><strong>{player.powers}</strong><span>Powers cast</span></div><div><Clock3 size={13}/><strong>{player.averageThinkingMs==null?'—':`${(player.averageThinkingMs/1000).toFixed(1)}s`}</strong><span>Mean thinking</span></div></div></article>)}</div>
   {analysis.rounds.length>0&&<div className={styles.rounds}>{analysis.rounds.map(round=><span key={round.round}><Trophy size={12}/>Round {round.round}<strong>{analysis.players.find(player=>player.id===round.winnerId)?.name||'Draw'}</strong>{round.scoringMode==='triplet-score'&&<small>{analysis.players.map(player=>`${player.mark} ${round.scores?.[player.id]??0}`).join(' : ')} triplets</small>}</span>)}</div>}
  </section>
  {index>0&&selected&&<section className={`panel ${styles.inspection}`} aria-live="polite"><span className={styles.actionNumber}>ACTION {selected.index} · ROUND {selected.round}</span><h3>{selected.title}</h3><p>{selected.description}</p>{selected.notes.map((note,n)=><div key={n} className={styles.note}>{note.kind==='counter'?<Shield size={15}/>:['round','score'].includes(note.kind)?<Trophy size={15}/>:<Lightbulb size={15}/>}<span>{note.text}</span></div>)}</section>}
  <section className={`panel ${styles.timeline}`}><div className={styles.tabs} role="tablist" aria-label="Replay analysis view"><button role="tab" aria-selected={tab==='highlights'} className={tab==='highlights'?styles.active:''} onClick={()=>setTab('highlights')}><Lightbulb size={14}/>Tactical highlights</button><button role="tab" aria-selected={tab==='all'} className={tab==='all'?styles.active:''} onClick={()=>setTab('all')}>Every action</button></div>
   {rows.length?rows.map(item=><button key={item.index} className={`${styles.event} ${index===item.index?styles.selected:''}`} onClick={()=>seek(item.index)} disabled={!onSeek} aria-label={`Inspect action ${item.index}: ${item.title}`}><span className={`${styles.eventIcon} ${item.kind==='round'||item.kind==='ending'?styles.gold:item.kind==='power'?styles.violet:''}`}>{item.kind==='round'||item.kind==='ending'?<Trophy size={17}/>:item.powerId==='fire'?<Flame size={17}/>:item.kind==='power'?<Zap size={17}/>:<Target size={17}/>}</span><span className={styles.eventContent}><small>ACTION {item.index} · ROUND {item.round} · {item.actorName}</small><strong>{item.title}</strong><span>{item.notes[0]?.text||item.description}</span></span><ArrowUpRight size={16}/></button>):<div className={styles.empty}><Lightbulb size={25}/><p>No tactical highlights have been recorded. Choose Every action to inspect the full timeline.</p></div>}
   <p className={styles.footnote}>Threats describe legal placements in the recorded board. A power can change the next decision; these observations are not a claim that a move was optimal.</p>
  </section>
 </div>;
}
