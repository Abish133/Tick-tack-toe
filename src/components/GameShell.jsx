'use client';

import {useEffect, useRef, useState} from 'react';
import {Swords, WandSparkles, ShoppingBag, Users, Trophy, Coins, Mail, Volume2, VolumeX, Settings, Compass, Layers3, History, Gift, Medal, BookOpen, Crown, Target, X, Shield, ChevronRight, Sparkles} from 'lucide-react';
import styles from './GameShell.module.css';

const secondaryRoutes = [
  {path:'/inventory',label:'Inventory',hint:'Inspect and equip your treasures',icon:Layers3},
  {path:'/season-pass',label:'Season journey',hint:'Follow this season’s reward track',icon:Crown},
  {path:'/missions',label:'Missions & rewards',hint:'Daily rewards and battle objectives',icon:Gift},
  {path:'/achievements',label:'Achievements',hint:'Your arena milestones',icon:Medal},
  {path:'/leaderboard',label:'Leaderboards',hint:'Meet the arena’s strongest rivals',icon:Trophy},
  {path:'/tournaments',label:'Tournaments',hint:'Enter a knockout competition',icon:Swords},
  {path:'/history',label:'Match history',hint:'Revisit your recorded battles',icon:History},
  {path:'/daily-puzzle',label:'Daily puzzle',hint:'Find today’s winning move',icon:Target},
  {path:'/local-play',label:'Local & offline play',hint:'Play together on this device',icon:Layers3},
  {path:'/tutorial',label:'Learn the arena',hint:'Three short interactive lessons',icon:BookOpen},
  {path:'/rules',label:'Arena rules',hint:'The complete power field guide',icon:BookOpen},
];

function Resource({value=0,icon:Icon,label,className='',onClick}) {
  const previous=useRef(Number(value)||0),timer=useRef(null);
  const [delta,setDelta]=useState(0);
  useEffect(()=>{
    const next=Number(value)||0;
    if(next!==previous.current){setDelta(next-previous.current);clearTimeout(timer.current);timer.current=setTimeout(()=>setDelta(0),1700);previous.current=next;}
    return()=>clearTimeout(timer.current);
  },[value]);
  return <button className={`${styles.resource} ${className} ${delta?styles.resourceChanged:''}`} onClick={onClick} aria-label={`${label}: ${Number(value||0).toLocaleString()}`}><Icon size={17}/><span>{Number(value||0).toLocaleString()}</span>{delta!==0&&<i key={`${value}-${delta}`} className={`${styles.resourceDelta} ${delta<0?styles.loss:''}`} aria-hidden="true">{delta>0?'+':''}{delta}</i>}</button>;
}

export default function GameShell({children,user,connected,pathname,navigate,settings,onToggleSound,onSettings,onAccount,avatar,rankLabel='Rookie',rankProgress=0,battleActive=false,background='/assets/arena.png'}) {
  const [journeyOpen,setJourneyOpen]=useState(false);
  const panelRef=useRef(null),triggerRef=useRef(null);
  useEffect(()=>{setJourneyOpen(false);},[pathname]);
  useEffect(()=>{
    if(!journeyOpen)return;
    const before=document.activeElement;
    panelRef.current?.focus();
    const handler=e=>{
      if(e.key==='Escape'){setJourneyOpen(false);triggerRef.current?.focus();}
      if(e.key==='Tab'){
        const buttons=panelRef.current?.querySelectorAll('button:not([disabled]),[tabindex="0"]');
        if(!buttons?.length)return;
        const first=buttons[0],last=buttons[buttons.length-1];
        if(e.shiftKey&&(document.activeElement===first||document.activeElement===panelRef.current)){e.preventDefault();last.focus();}
        else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}
      }
    };
    document.addEventListener('keydown',handler);
    return()=>{document.removeEventListener('keydown',handler);if(before?.isConnected)before.focus?.();};
  },[journeyOpen]);
  const go=path=>{setJourneyOpen(false);navigate(path);};
  const dock=[
    {path:'/',label:'Arena',title:'Battle',icon:Swords,active:pathname==='/'||pathname==='/battle'},
    {path:'/powers',label:'Powers & loadout',title:'Armory',icon:WandSparkles,active:pathname==='/powers'},
    {path:'/shop',label:'Cosmetic shop',title:'Collection',icon:ShoppingBag,active:pathname==='/shop'||pathname==='/inventory'},
    {label:'Journey',title:'Journey',icon:Compass,active:secondaryRoutes.some(route=>route.path===pathname)},
    {path:'/friends',label:'Friends',title:'Social',icon:Users,active:pathname==='/friends'},
  ];
  return <div className={`${styles.world} ${battleActive?styles.inBattle:''}`} style={{'--world-art':`url("${background}")`}}>
    <div className={styles.environment} aria-hidden="true"><div className={styles.worldLight}/><div className={styles.atmosphere}/><div className={styles.vignette}/></div>
    <header className={styles.hud} aria-label="Player HUD">
      <button className={styles.crest} onClick={()=>go('/')} aria-label="Elemental Arena home"><Sparkles size={22}/><span>ELEMENTAL<small>ARENA</small></span></button>
      <button className={styles.rank} onClick={()=>go('/leaderboard')} aria-label={`${rankLabel} rank, level ${user?.level||1}`}><Trophy size={18}/><span><strong>{rankLabel}</strong><small>LEVEL {user?.level||1}</small><i><b style={{width:`${Math.max(0,Math.min(100,rankProgress))}%`}}/></i></span></button>
      <div className={styles.resources}><Resource value={user?.cups} icon={Trophy} label="Trophies" onClick={()=>go('/leaderboard')}/><Resource value={user?.coins} icon={Coins} label="Cosmetic coins" className={styles.gold} onClick={()=>go('/shop')}/></div>
      <span className={`connection ${connected?'online':''} ${styles.connection}`}><i/>{connected?'Arena connected':user?'Connecting':'Welcome, challenger'}</span>
      <div className={styles.hudTools}><button className={styles.iconButton} onClick={()=>go('/notifications')} aria-label="Notifications" title="Notifications"><Mail size={18}/></button><button className={styles.iconButton} onClick={onToggleSound} aria-label={settings?.sound?'Mute sound':'Unmute sound'} title={settings?.sound?'Mute sound':'Unmute sound'}>{settings?.sound?<Volume2 size={18}/>:<VolumeX size={18}/>}</button><button className={styles.iconButton} onClick={onSettings} aria-label="Settings" title="Settings"><Settings size={18}/></button><button className={styles.account} onClick={onAccount} aria-label="Player account" title={user?.name||'Player account'}>{avatar||<span>{(user?.name||'EA').slice(0,2).toUpperCase()}</span>}</button></div>
    </header>
    <main className={styles.content}>{children}</main>
    <nav className={styles.dock} aria-label="Game destinations">{dock.map(({path,label,title,icon:Icon,active})=><button key={label} ref={label==='Journey'?triggerRef:undefined} className={`${styles.dockButton} ${active?styles.active:''} ${label==='Arena'?styles.battleButton:''}`} aria-label={label} aria-current={active?'page':undefined} aria-expanded={label==='Journey'?journeyOpen:undefined} aria-controls={label==='Journey'?'arena-journey-panel':undefined} onClick={()=>path?go(path):setJourneyOpen(v=>!v)}><span className={styles.dockIcon}><Icon size={21}/></span><span>{title}</span></button>)}</nav>
    {journeyOpen&&<div className={styles.panelBackdrop} onMouseDown={e=>{if(e.target===e.currentTarget)setJourneyOpen(false);}}><section id="arena-journey-panel" className={styles.journeyPanel} ref={panelRef} tabIndex={-1} role="dialog" aria-modal="true" aria-label="Your arena journey"><div className={styles.panelHeading}><span><small>BEYOND THE BATTLE</small><h2>Your journey</h2></span><button className={styles.iconButton} aria-label="Close journey" onClick={()=>setJourneyOpen(false)}><X size={21}/></button></div><div className={styles.journeyRoutes}>{secondaryRoutes.map(({path,label,hint,icon:Icon})=><button key={path} className={`${styles.journeyRoute} ${pathname===path?styles.currentRoute:''}`} onClick={()=>go(path)} aria-label={label}><span><Icon size={21}/></span><div><strong>{label}</strong><small>{hint}</small></div><ChevronRight size={15}/></button>)}{user?.role==='ADMIN'&&<button className={styles.journeyRoute} onClick={()=>go('/admin')}><span><Shield size={21}/></span><div><strong>Administration</strong><small>Arena moderation tools</small></div><ChevronRight size={15}/></button>}</div></section></div>}
  </div>;
}
