'use client';
import {useState} from 'react';
import {Layers3,Zap,CheckCircle2,Circle,Search,Shield} from 'lucide-react';
import {POWER_INFO} from './PowerPresentation';
import styles from './PowerCollection.module.css';

export default function PowerCollection({loadout=[],setLoadout,disabled=false}){
 const [search,setSearch]=useState(''),[category,setCategory]=useState('all'),[selectionNotice,setSelectionNotice]=useState('');
 const categories=['all',...new Set(POWER_INFO.map(power=>power.role))];
 const powers=POWER_INFO.filter(power=>(category==='all'||power.role===category)&&`${power.name} ${power.element} ${power.description}`.toLowerCase().includes(search.toLowerCase()));
 function select(power){
  if(!loadout.includes(power.id)&&loadout.length===3){setSelectionNotice(`Unequip one of your three powers before equipping ${power.name}.`);return;}
  const equipped=loadout.includes(power.id);setSelectionNotice(`${power.name} ${equipped?'unequipped':'equipped'}. Save your loadout when you have three powers.`);
  setLoadout(current=>current.includes(power.id)?current.filter(id=>id!==power.id):current.length<3?[...current,power.id]:current);
 }
 return <>
  <div className="loadout-summary"><div><Layers3 size={20}/><strong>{loadout.length} / 3 equipped</strong></div><p>{loadout.map(id=>POWER_INFO.find(power=>power.id===id)?.role).join(' · ')}</p><span>One use per round · Eclipse once per match · Time Warp extends the clock</span></div>
  <div className={styles.filters}><label><Search size={17}/><input type="search" value={search} onChange={event=>setSearch(event.target.value)} placeholder="Find your next combination" aria-label="Search powers"/></label><div aria-label="Power roles">{categories.map(role=><button key={role} className={category===role?styles.active:''} onClick={()=>setCategory(role)}>{role==='all'?'All 22 powers':role}</button>)}</div></div>
  <p className={styles.selectionNotice} aria-live="polite">{selectionNotice||'Choose an equipped power to remove it, then select its replacement.'}</p>
  <div className="power-grid">{powers.map(power=><button key={power.id} className={`power-card panel ${loadout.includes(power.id)?'equipped':''}`} disabled={disabled} onClick={()=>select(power)} aria-pressed={loadout.includes(power.id)} style={{'--power-color':power.color}}>
   <div className="power-card-top"><span className="badge">{power.role}</span><span>{loadout.includes(power.id)?<CheckCircle2 size={20}/>:<Circle size={20}/>}</span></div>
   <div className={`power-art ${styles.art}`}><span className={styles.orbit}/>{power.sprite!==undefined?<span aria-hidden="true" className="sprite" style={{backgroundPosition:`${power.sprite*50}% 0%`}}/>:<power.icon size={65}/>}</div>
   <h3>{power.name}</h3><span className="power-element">{power.element} · Equal Ranked access</span><p>{power.description}</p><div className={styles.counter}><Shield size={12}/><span>{power.counterplay}</span></div><div className="power-meta"><span><Zap size={13}/>{power.cost} energy</span><span>{loadout.includes(power.id)?'Equipped':loadout.length===3?'Replace an equipped power':'Equip power'}</span></div>
  </button>)}</div>
  {!powers.length&&<p className={styles.noResults}>No powers match that search. Try another element or role.</p>}
 </>;
}
