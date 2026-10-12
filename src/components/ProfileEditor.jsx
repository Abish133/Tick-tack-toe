'use client';
import {useEffect,useState} from 'react';
import {ArrowRight,Check,Globe2,LoaderCircle,Shield,Sparkles,Trophy,UserRound} from 'lucide-react';
import {POWER_CATALOG} from '../lib/game-engine/powers';
import styles from './ProfileEditor.module.css';

const divisions=[[3300,'Mythic'],[2500,'Legend'],[1900,'Grandmaster'],[1400,'Master'],[1000,'Diamond'],[700,'Platinum'],[450,'Gold'],[250,'Silver'],[100,'Bronze'],[0,'Rookie']];
const cosmeticFields={avatar:'avatar',board:'equippedBoard',marks:'equippedMark',title:'title',effect:'equippedEffect',frame:'equippedFrame',banner:'equippedBanner',arena:'equippedArena',emote:'equippedEmote'};
const cosmeticLabels={avatar:'Avatar',board:'Arena board',marks:'Marks',title:'Player title',effect:'Arrival effect',frame:'Avatar frame',banner:'Profile banner',arena:'Arena background',emote:'Signature emote'};
const avatarAsset=id=>({'avatar-ember':'avatar-fire','avatar-frost':'avatar-ice'}[id]||id||'avatar-void');
const number=value=>Number(value||0).toLocaleString();
const identity=user=>({name:user?.name||'',bio:user?.profile?.bio||'',region:user?.profile?.region||'GLOBAL'});

function FavoritePower({player}){const favorite=[...(player.powerUsage||[])].sort((a,b)=>b.count-a.count)[0];return favorite&&Number(favorite.count)>0?<div className={styles.favorite}><Sparkles size={18}/><div><span>Most used power</span><strong>{POWER_CATALOG.find(power=>power.id===favorite.powerId)?.name||favorite.powerId}</strong></div><small>{Number(favorite.count).toLocaleString()} recorded casts</small></div>:null;}
const peakCups=player=>player.rating?.peakCups??player.peakCups;
function PeakRank({player}){const cups=peakCups(player);return cups!=null?<div className={styles.peak}><Trophy size={14}/><span>Best division</span><strong>{divisions.find(([threshold])=>Number(cups)>=threshold)?.[1]||'Rookie'}</strong><small>{number(cups)} peak cups</small></div>:null;}

export default function ProfileEditor(props){return props.publicPlayerId?<PublicProfile {...props}/>:<OwnProfile {...props}/>;}

function PublicProfile({api,user,publicPlayerId,onError,onNotice,navigate}){
 const [player,setPlayer]=useState(null),[loading,setLoading]=useState(true),[error,setError]=useState(''),[busy,setBusy]=useState(false);
 useEffect(()=>{let current=true;setLoading(true);setError('');api(`/players/${encodeURIComponent(publicPlayerId)}`).then(data=>{if(current){const found=data.player||data.user;setPlayer(found?{...found,canAddFriend:data.canAddFriend??found.canAddFriend}:null);}}).catch(problem=>{if(current){setError(problem.message);onError?.(problem.message);}}).finally(()=>{if(current)setLoading(false);});return()=>{current=false;};},[api,publicPlayerId]);
 if(loading)return <section className="panel loading-state"><LoaderCircle className="spin" size={23}/>Opening player profile…</section>;
 if(!player)return <section className="panel empty"><UserRound size={36}/><h3>Player profile unavailable</h3><p>{error||'This player could not be found.'}</p></section>;
 const stats=player.stats||{},played=Number(stats.played||0),winRate=played?Math.round(Number(stats.wins||0)/played*100):0;
 async function requestFriend(){setBusy(true);try{await api('/friends/request','POST',{userId:player.id});onNotice?.('Friend request sent.');}catch(problem){onError?.(problem.message);}finally{setBusy(false);}}
 return <div className={styles.layout}><section className={`panel ${styles.identity} ${player.profile?.equippedBanner||''} ${player.profile?.equippedEffect||''}`}><div className={`${styles.portrait} ${player.profile?.equippedFrame||''}`}><img src={`/assets/${avatarAsset(player.profile?.avatar)}.png`} alt={`${player.name}'s avatar`}/><span className={styles.level}>{player.level||player.profile?.level||1}</span></div><span className={styles.title}>{player.profile?.title||'Rookie Strategist'}</span><h2>{player.name}</h2><span className="badge violet"><Trophy size={12}/>{divisions.find(([threshold])=>Number(player.cups||0)>=threshold)?.[1]||'Rookie'}</span>{player.profile?.bio&&<p className={styles.bio}>{player.profile.bio}</p>}<span className={styles.region}><Globe2 size={14}/>{player.profile?.region||'GLOBAL'}</span><div className={styles.numbers}><div><strong>{number(player.cups)}</strong><span>Cups</span></div><div><strong>{number(player.xp??player.profile?.xp)}</strong><span>Total XP</span></div><div><strong>{winRate}%</strong><span>Win rate</span></div></div>{user?.id===player.id?<button className="button secondary" onClick={()=>navigate?.('/profile')}>Edit my profile <ArrowRight size={15}/></button>:user&&<button className="button primary" disabled={busy||player.canAddFriend===false} onClick={requestFriend}>{busy?<LoaderCircle className="spin" size={15}/>:<UserRound size={15}/>}Send friend request</button>}<button className="text-button" onClick={()=>navigate?.('/leaderboard')}>Return to standings <ArrowRight size={15}/></button></section><section className={`panel ${styles.section}`}><header><Trophy size={20}/><div><h3>Recorded performance</h3><p>Completed battles and earned progress.</p></div></header><div className={styles.performance}>{[['Matches',played],['Wins',stats.wins],['Losses',stats.losses],['Draws',stats.draws],['Ranked matches',stats.rankedPlayed],['Current streak',stats.streak],['Best streak',stats.bestStreak],['Powers cast',stats.powersUsed]].map(([label,value])=><div key={label}><strong>{number(value)}</strong><span>{label}</span></div>)}</div><PeakRank player={player}/><FavoritePower player={player}/>{player.createdAt&&<p className={styles.muted}>Joined {new Date(player.createdAt).toLocaleDateString()}</p>}<div className={styles.fairPlay}><Shield size={15}/>Every player has access to the same released competitive powers.</div></section></div>;
}

function OwnProfile({api,user,refresh,onError,onNotice,navigate,onUpgrade}){
 const [draft,setDraft]=useState(()=>identity(user)),[inventory,setInventory]=useState([]),[records,setRecords]=useState(null),[loading,setLoading]=useState(true),[saving,setSaving]=useState(false),[equipping,setEquipping]=useState(null);
 useEffect(()=>{setDraft(identity(user));},[user?.id,user?.name,user?.profile?.bio,user?.profile?.region]);
 useEffect(()=>{let current=true;if(!user){setInventory([]);setLoading(false);return;}setLoading(true);api('/inventory').then(data=>{if(current)setInventory((data.inventory||[]).map(entry=>entry.cosmetic).filter(Boolean));}).catch(error=>{if(current)onError?.(error.message);}).finally(()=>{if(current)setLoading(false);});return()=>{current=false;};},[api,user?.id]);
 useEffect(()=>{let current=true;setRecords(null);if(user?.id)api(`/players/${encodeURIComponent(user.id)}`).then(data=>{if(current)setRecords(data.player||null);}).catch(error=>{if(current)onError?.(error.message);});return()=>{current=false;};},[api,user?.id,user?.stats?.powersUsed]);
 if(!user)return <section className="panel empty"><UserRound size={36}/><h3>Your identity in the arena</h3><p>Create a player to customize your profile.</p></section>;
 const stats=user.stats||{},played=Number(stats.played||0),winRate=played?Math.round(Number(stats.wins||0)/played*100):0;
 const groups=Object.entries(cosmeticFields).filter(([type])=>inventory.some(item=>item.type===type));
 const selectedItem=type=>inventory.find(item=>item.type===type&&(type==='title'?item.name===user.profile?.title:item.id===user.profile?.[cosmeticFields[type]]));
 async function save(event){event.preventDefault();setSaving(true);try{await api('/profile','PATCH',{name:draft.name.trim(),bio:draft.bio.trim(),region:draft.region.trim().toUpperCase()||'GLOBAL'});await refresh();onNotice?.('Your player identity is saved.');}catch(error){onError?.(error.message);}finally{setSaving(false);}}
 async function equip(itemId){if(!itemId)return;setEquipping(itemId);try{await api('/inventory/equip','POST',{cosmeticId:itemId});await refresh();onNotice?.('Your cosmetic is equipped.');}catch(error){onError?.(error.message);}finally{setEquipping(null);}}
 return <div className={styles.layout}>
  <aside className={`panel ${styles.identity} ${user.profile?.equippedBanner||''} ${user.profile?.equippedEffect||''}`}>
   <div className={`${styles.portrait} ${user.profile?.equippedFrame||''}`}><img src={`/assets/${avatarAsset(user.profile?.avatar)}.png`} alt={`${user.name}'s equipped avatar`}/><span className={styles.level}>{user.level||1}</span></div>
   <span className={styles.title}>{user.profile?.title||'Rookie Strategist'}</span><h2>{user.name}</h2><span className="badge violet"><Trophy size={12}/>{divisions.find(([threshold])=>Number(user.cups||0)>=threshold)?.[1]||'Rookie'}</span>
   {user.profile?.bio&&<p className={styles.bio}>{user.profile.bio}</p>}
   <span className={styles.region}><Globe2 size={14}/>{user.profile?.region||'GLOBAL'}</span>
   <div className={styles.numbers}><div><strong>{number(user.cups)}</strong><span>Cups</span></div><div><strong>{number(user.xp)}</strong><span>Total XP</span></div><div><strong>{number(user.coins)}</strong><span>Coins</span></div></div>
   <p className={styles.account}>{user.guest?'Guest progress belongs to this saved browser session. Register to keep it across devices.':`Registered challenger · ${user.email}`}</p>
   {user.guest&&onUpgrade&&<button className="button primary" onClick={onUpgrade}>Keep my progress <ArrowRight size={15}/></button>}
   <button className="text-button" onClick={()=>navigate?.('/inventory')}><Sparkles size={15}/>Open cosmetic collection</button>
  </aside>
  <div className={styles.content}>
   <section className={`panel ${styles.section}`}><header><UserRound size={20}/><div><h3>Your player identity</h3><p>A unique name, a little personality, and your home leaderboard.</p></div></header>
    <form onSubmit={save} className={styles.form}><label htmlFor="profile-player-name">Player name<input id="profile-player-name" aria-label="Player name" aria-describedby="profile-name-help" minLength={2} maxLength={20} autoComplete="nickname" value={draft.name} onChange={event=>setDraft(value=>({...value,name:event.target.value}))} required/><small id="profile-name-help">2–20 characters. Your name must be unique.</small></label>
     <label htmlFor="profile-bio">Player bio<textarea id="profile-bio" aria-label="Player bio" aria-describedby="profile-bio-count" maxLength={200} rows={3} value={draft.bio} placeholder="What kind of challenger are you?" onChange={event=>setDraft(value=>({...value,bio:event.target.value}))}/><small id="profile-bio-count" className={styles.counter}>{draft.bio.length} / 200</small></label>
     <label htmlFor="profile-region">Country or region<input id="profile-region" aria-label="Country or region" aria-describedby="profile-region-help" maxLength={20} pattern="[A-Z][A-Z0-9-]{1,19}" value={draft.region} onChange={event=>setDraft(value=>({...value,region:event.target.value.toUpperCase()}))} placeholder="GLOBAL" required/><small id="profile-region-help">Use a country code such as IN or US, a region such as EU, or GLOBAL.</small></label>
     <button className="button primary" disabled={saving}>{saving?<LoaderCircle className="spin" size={16}/>:<Check size={16}/>}Save profile</button>
    </form>
   </section>
   <section className={`panel ${styles.section}`}><header><Sparkles size={20}/><div><h3>Your equipped style</h3><p>Every selection comes from your owned collection.</p></div></header>
    {loading?<p className={styles.muted}><LoaderCircle className="spin" size={16}/>Loading cosmetics…</p>:<div className={styles.equipment}>{groups.map(([type])=>{const selected=selectedItem(type);return <label key={type}>{cosmeticLabels[type]}<select aria-label={`Equipped ${cosmeticLabels[type].toLowerCase()}`} value={selected?.id||''} disabled={Boolean(equipping)} onChange={event=>equip(event.target.value)}>{!selected&&<option value="">{type==='title'?user.profile?.title||'Default title':'Default / none'}</option>}{inventory.filter(item=>item.type===type).map(item=><option key={item.id} value={item.id}>{item.name}</option>)}</select></label>;})}</div>}
    <div className={styles.fairPlay}><Shield size={15}/>Style changes never increase power strength.</div>
   </section>
   <section className={`panel ${styles.section}`}><header><Trophy size={20}/><div><h3>Recorded performance</h3><p>Completed matches, counted by the server.</p></div></header>
    <div className={styles.performance}>{[['Matches',played],['Wins',stats.wins],['Losses',stats.losses],['Draws',stats.draws],['Win rate',`${winRate}%`],['Current streak',stats.streak],['Best streak',stats.bestStreak],['Powers cast',stats.powersUsed]].map(([label,value])=><div key={label}><strong>{typeof value==='string'?value:number(value)}</strong><span>{label}</span></div>)}</div>
    <PeakRank player={user}/><FavoritePower player={records||user}/><button className="text-button" onClick={()=>navigate?.('/history')}>Explore match history <ArrowRight size={15}/></button>
   </section>
  </div>
 </div>;
}
