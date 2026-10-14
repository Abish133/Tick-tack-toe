'use client';

import {useState} from 'react';
import {Swords, Play, Settings, Sparkles, ChevronRight, LoaderCircle, Shield, WandSparkles, Trophy, UserRound} from 'lucide-react';
import styles from './GameEntrance.module.css';

export default function GameEntrance({ready,continueAvailable=false,continueLabel='Resume your saved battle',onEnter,onNewGame,onContinue,onSettings,onAccount,reducedMotion=false}) {
  const [introOpen,setIntroOpen]=useState(false);
  return <section className={`${styles.entrance} ${reducedMotion?styles.reducedMotion:''}`} aria-label={ready?'Elemental Arena title screen':'Loading Elemental Arena'}>
    <div className={styles.landscape} aria-hidden="true"/><div className={styles.light} aria-hidden="true"/><div className={styles.sparks} aria-hidden="true"/>
    {ready&&<><img className={`${styles.guardian} ${styles.leftGuardian}`} src="/assets/collection/avatar-solar.webp" alt=""/><img className={`${styles.guardian} ${styles.rightGuardian}`} src="/assets/collection/avatar-abyss.webp" alt=""/></>}
    <div className={styles.toolbar}><button onClick={onSettings} aria-label="Settings"><Settings size={18}/><span>Settings</span></button>{onAccount&&<button onClick={onAccount} aria-label="Player account"><UserRound size={18}/><span>Player account</span></button>}</div>
    <div className={styles.titleContent}>
      <div className={styles.seal} aria-hidden="true"><div/><Swords size={39}/><i/><b/></div>
      <p className={styles.eyebrow}>A BATTLE OF WITS & ELEMENTS</p>
      <h1><span>ELEMENTAL</span><strong>ARENA</strong></h1>
      <div className={styles.titleRule} aria-hidden="true"><i/><Sparkles size={14}/><i/></div>
      <p className={styles.tagline}>Think. Strike. Conquer.</p>
      {!ready?<div className={styles.loading} role="status" aria-live="polite"><LoaderCircle size={22}/><span>Opening the arena…</span><small>Connecting to your saved progress</small></div>:<>
        <div className={styles.menu} aria-label="Title actions"><button className={styles.primary} onClick={onNewGame}><Swords size={19}/><span>New game</span><ChevronRight size={17}/></button><button className={styles.continue} onClick={onContinue} disabled={!continueAvailable} title={continueAvailable?continueLabel:'Your active online battle or saved local game appears here'}><Play size={17}/><span>Continue<small>{continueAvailable?continueLabel:'No active saved battle'}</small></span><ChevronRight size={15}/></button><button className={styles.enter} onClick={onEnter}>Enter the arena <ChevronRight size={15}/></button></div>
        <div className={styles.promise}><Shield size={14}/><span>Equal powers. Your strategy. Victory is yours to master.</span></div>
        <button className={styles.howButton} onClick={()=>setIntroOpen(v=>!v)} aria-expanded={introOpen}><WandSparkles size={14}/>{introOpen?'Close quick introduction':'Your first battle'}</button>
        {introOpen&&<div className={styles.intro}><div><WandSparkles size={18}/><span><strong>Equip three powers</strong>Build your strategy from the same fair power pool.</span></div><div><Swords size={18}/><span><strong>Make your move</strong>Place a mark or cast a power before the turn ends.</span></div><div><Trophy size={18}/><span><strong>Claim the arena</strong>Make a line on 3×3, or score more lines on larger boards.</span></div></div>}
      </>}
    </div>
    <span className={styles.footer}>TACTICAL BATTLES · COSMETIC COLLECTIONS · A FAIR ARENA</span>
  </section>;
}
