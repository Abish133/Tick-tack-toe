'use client';
import {cosmeticTheme,cosmeticStyle} from '../lib/cosmetic-collection';
import styles from './CosmeticAppearance.module.css';
import AnimatedCosmeticImage from './AnimatedCosmeticImage';

// All of these ornaments are presentation only. The board still exposes plain X/O marks.
export function CosmeticMotif({name='sun',className=''}){
 const art={
  dominion:<><path d="m24 4 5 8 9-5-3 12H13L10 7l9 5Z"/><path d="M14 21c-7-3-11 0-11 7l8-4 4 11 9 9 9-9 4-11 8 4c0-7-4-10-11-7"/><path d="m17 24 7 4 7-4-3 10-4 4-4-4Z"/><path d="m21 24 3-4 3 4M16 15h16"/></>,
  'dominion-crown':<><path d="m5 13 10 6L24 5l9 14 10-6-5 24H10Z"/><path d="M11 31h26m-13-8 4 4-4 4-4-4Z"/><path d="M15 42h18M5 5l2 3m36-3-2 3"/><circle cx="24" cy="5" r="2" fill="currentColor"/></>,
  'dominion-eclipse':<><circle cx="24" cy="24" r="13"/><path d="M30 12a13 13 0 0 0 0 24 13 13 0 1 1 0-24Z" fill="currentColor" fillOpacity=".18"/><path d="m24 2 2 6m-2 32-2 6M2 24l6-2m32 2 6 2M8 8l5 4m22 24 5 4M40 8l-5 4M13 36l-5 4"/><path d="m23 16 7 8-7 8"/></>,
  ascendant:<><path d="m24 3 5 13 14 8-14 5-5 16-5-16L5 24l14-8Z"/><circle cx="24" cy="24" r="7"/><path d="m7 7 7 7m20 20 7 7M41 7l-7 7M14 34l-7 7"/></>,
  supernova:<><path d="m24 2 4 15 14-9-9 14 13 2-13 5 9 12-14-8-4 13-5-13-12 8 8-14-13-3 14-5-9-12 13 9Z"/><circle cx="24" cy="24" r="5"/></>,
  infinity:<><path d="M24 24c-6-15-20-13-20 0s14 15 20 0 20-13 20 0-14 15-20 0Z"/><path d="m24 5 2 5 5 2-5 2-2 5-2-5-5-2 5-2Z"/></>,
  sun:<><circle cx="24" cy="24" r="9"/><path d="M24 2v6m0 32v6M2 24h6m32 0h6M8.5 8.5l4.2 4.2m22.6 22.6 4.2 4.2m0-31-4.2 4.2M12.7 35.3l-4.2 4.2"/></>,
  crown:<><path d="m6 13 8 7 10-13 10 13 8-7-5 24H11Z"/><path d="M12 30h24M20 24h8"/></>,
  waves:<><path d="M4 32c8 0 6-18 16-18 7 0 9 7 5 11-3 3-7 0-5-3m-16 14c6-6 11 6 17 0s11 6 17 0m-8-5c8 0 7-15 14-15"/></>,
  wavecrest:<><path d="M6 35c16 2 13-29 28-25 9 2 7 17-2 13 5 0 5-7 0-7-6 0-8 16 9 19"/><path d="M4 40h40"/></>,
  pearl:<><path d="M7 32c3-18 31-18 34 0l-17 9Z"/><circle cx="24" cy="24" r="8"/><path d="M24 7v4M7 13l4 3m30-3-4 3"/></>,
  leaf:<><path d="M10 38C2 16 22 7 40 7c-1 17-7 36-28 31Zm1 0L34 14M16 31v-9m8 0 10 1"/></>,
  bloom:<><path d="M24 9c11-10 18 4 9 11 15 3 10 17-2 14-4 13-17 13-16 0C1 38-3 23 13 20 3 10 15 0 24 9Z"/><circle cx="23" cy="24" r="5"/></>,
  bolt:<path d="m28 3-17 24h11l-3 18 19-27H27Z"/>,
  spark:<><path d="m24 4 4 14 15-5-9 12 9 10-15-2-4 13-5-13-14 2 10-10-9-12 14 5Z"/><path d="m21 20 7 8"/></>,
  rose:<><path d="M24 7c9-5 16 3 13 10 12 5 9 17-2 18-4 13-20 11-22 1C0 35-1 22 9 17 9 6 16 3 24 7Z"/><path d="m17 17 12-1 5 9-10 10-12-11Z M18 20l10 3-5 6-5-9"/></>,
  heart:<><path d="M24 40C10 31 3 23 6 14c4-11 16-8 18 0 3-8 15-11 18 0 3 9-5 18-18 26Z"/><path d="M10 16c1-4 5-5 8-3"/></>,
  gear:<><path d="m20 4 8 0 2 7 6 3 7-2 4 7-5 5v6l5 5-4 7-7-2-6 3-2 7h-8l-2-7-6-3-7 2-4-7 5-5v-6l-5-5 4-7 7 2 6-3Z" transform="translate(0 -3) scale(1 .95)"/><circle cx="24" cy="23" r="8"/></>,
  hourglass:<><path d="M10 5h28M10 43h28M13 5v8c0 6 11 7 11 11s-11 5-11 11v8m22-38v8c0 6-11 7-11 11s11 5 11 11v8"/><path d="m17 12 7 7 7-7M17 37l7-7 7 7"/></>,
  moon:<><path d="M33 5a20 20 0 1 0 9 29C22 38 15 17 33 5Z"/><path d="m36 13 2 4 4 2-4 2-2 4-2-4-4-2 4-2Z"/></>,
  lotus:<><path d="M24 37C8 27 11 14 24 4c13 10 16 23 0 33Zm0 0C8 40 3 27 5 17c12 0 19 8 19 20Zm0 0c16 3 21-10 19-20-12 0-19 8-19 20Z"/><path d="M11 43h26"/></>,
  flame:<><path d="M26 3C12 18 33 17 21 29c-7-1-5-8-7-12C0 34 16 45 25 45c15 0 23-21 7-30 4 8-5 9-6-12Z"/><path d="M24 44c-8-8-3-14 3-19 6 10 8 14-3 19Z"/></>,
  anvil:<><path d="M6 12h38l-8 10H21l-4 9h16l4 11H10l4-11 1-10C9 21 4 19 6 12Z"/><path d="M29 4h11m-4-3v6M6 7l4-4"/></>,
  crystal:<><path d="m24 3 17 13-8 26H15L7 16Z M24 3l-7 13 7 26 7-26-7-13M7 16h34"/></>,
  aurora:<><path d="M3 32c8-35 13 8 21-17 9-25 8 19 21-5M3 39c8-31 13 7 21-13 9-20 8 14 21-3"/><path d="m29 5 1 3 3 1-3 1-1 3-1-3-3-1 3-1Z"/></>,
  orbit:<><circle cx="24" cy="24" r="10"/><ellipse cx="24" cy="24" rx="23" ry="9" transform="rotate(-35 24 24)"/><path d="m12 4 2 4 4 2-4 2-2 4-2-4-4-2 4-2Z"/></>,
  planet:<><circle cx="24" cy="24" r="14"/><path d="M12 15c-14 7-12 15 2 16s33-14 30-20c-2-4-9-3-13-2"/><path d="M17 14a11 11 0 0 1 12-1"/></>,
  comet:<><circle cx="14" cy="34" r="8"/><path d="m20 28 21-23M26 32l18-19M16 22 31 5"/><path d="m33 31 2 5 5 2-5 2-2 5-2-5-5-2 5-2Z"/></>,
 };
 return <svg className={className} viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">{art[name]||art.sun}</svg>;
}

export function CosmeticMark({mark='X',cosmeticId}){
 const theme=cosmeticTheme(cosmeticId),isX=mark==='X';
 if(!theme)return <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="3.3" strokeLinecap="round" aria-hidden="true">{isX?<path d="m10 10 28 28M38 10 10 38"/>:<circle cx="24" cy="24" r="16"/>}</svg>;
 const x={
  dominion:<><path d="m9 5 30 30 4 9-9-4L5 10ZM39 5 9 35l-4 9 9-4L43 10Z" fill="currentColor" fillOpacity=".12"/><path d="m11 7 28 31M37 7 9 38m-4-7 12 12m14 0 12-12"/><path d="m24 17 6 7-6 7-6-7Z" fill="var(--cosmetic-ink)"/><path d="m24 2 3 5 5-3-2 7H18l-2-7 5 3Z"/></>,
  ascendant:<><path d="m9 7 32 32-3 3L6 10ZM38 6 6 38l4 4L42 10Z"/><path d="m24 2 2 5 5 2-5 2-2 5-2-5-5-2 5-2ZM24 33l2 5 5 2-5 2-2 5-2-5-5-2 5-2Z"/></>,
  solar:<><path d="m9 6 33 33-3 3L6 9ZM39 6 6 39l3 3L42 9Z"/><path d="m17 5 2 5m12 28 2 5M5 17l5 2m28 12 5 2"/></>,
  abyss:<><path d="M7 7c2 14 32 20 34 34M41 7C39 21 9 27 7 41"/><path d="M8 17c8 0 6-10 12-9M28 40c6 1 4-10 12-9"/></>,
  jade:<><path d="m9 9 30 30M39 9 9 39"/><path d="M17 17c-9 2-8-5-10-9 7 0 11 0 10 9Zm14 0c-2-9 5-8 9-10 0 7 0 11-9 10ZM17 31c2 9-5 8-9 10 0-7 0-11 9-10Zm14 0c9-2 8 5 10 9-7 0-11 0-10-9Z"/></>,
  storm:<><path d="m9 5 10 14-3 4 8 1 4 9 11 10M39 5 29 19l3 4-8 1-4 9L9 43"/><path d="m11 4 4 1m18 38 4 1"/></>,
  rose:<><path d="M8 6c10 3 22 20 32 36M40 6C30 9 18 26 8 42"/><path d="m13 16-6 1 2 6m26 2 6 2-1 5m-13-20 1-6 6-1M15 35l-1 6-6 1"/></>,
  clockwork:<><path d="m9 5 34 34-4 4L5 9ZM39 5 5 39l4 4L43 9Z"/><circle cx="24" cy="24" r="5"/><path d="m9 15-3 3m9-9 3-3m15 33-3 3m9-9 3-3"/></>,
  lunar:<><path d="m10 10 28 28M38 10 10 38"/><path d="M7 16c-4-3-2-10 3-10M31 42c7 1 11-4 10-10"/><path d="m34 6 2-3 2 3 3 2-3 2-2 3-2-3-3-2Z"/></>,
  emberglass:<><path d="m11 4 30 37-5 3L6 7Zm26 0L7 41l5 3L42 7Z"/><path d="M5 21c5 1 4-4 6-7m26 21c-1 6 4 4 7 9"/></>,
  arctic:<><path d="m11 5 32 32-6 6L5 11ZM37 5 5 37l6 6L43 11Z"/><path d="m11 5 0 9-6-3m32 32 0-9 6 3M37 5v9l6-3M11 43v-9l-6 3"/></>,
  nebula:<><path d="m11 11 26 26M37 11 11 37"/><ellipse cx="24" cy="24" rx="23" ry="9" transform="rotate(-35 24 24)"/><circle cx="41" cy="11" r="2"/></>,
 };
 const o={
  dominion:<><circle cx="24" cy="25" r="15"/><circle cx="24" cy="25" r="11" strokeWidth="1"/><path d="M9 23 3 18l2 12 7 7m27-14 6-5-2 12-7 7M17 41l7 4 7-4"/><path d="m24 2 3 5 5-3-2 7H18l-2-7 5 3Z"/><path d="M29 16a10 10 0 0 0 0 18" strokeWidth="3"/></>,
  ascendant:<><circle cx="24" cy="24" r="12"/><ellipse cx="24" cy="24" rx="22" ry="8" transform="rotate(-35 24 24)"/><path d="m24 1 2 5 5 2-5 2-2 5-2-5-5-2 5-2ZM24 33l2 5 5 2-5 2-2 5-2-5-5-2 5-2Z"/></>,
  solar:<><circle cx="24" cy="24" r="13"/><path d="M24 3v5m0 32v5M3 24h5m32 0h5M9 9l3 3m24 24 3 3m0-30-3 3M12 36l-3 3"/></>,
  abyss:<><circle cx="24" cy="24" r="16"/><path d="M10 18c7-6 8 7 16 0s9 6 12 0M9 30c7-6 8 7 16 0s9 6 13 0"/></>,
  jade:<><circle cx="24" cy="24" r="15"/><path d="M10 15c-8-2-6-7-5-10 6 0 8 3 5 10Zm27 18c7 2 6 7 5 10-6 0-8-3-5-10M14 39l-5 1M35 9l5-1"/></>,
  storm:<><path d="m24 4 17 10v20L24 44 7 34V14Z"/><path d="m12 15 12-7 12 7m0 18-12 7-12-7"/></>,
  rose:<><circle cx="24" cy="24" r="13"/><path d="M18 10C8 1 4 9 11 18M30 10c10-9 14-1 7 8M11 30C2 40 10 44 18 37m19-7c9 10 1 14-7 7"/></>,
  clockwork:<><path d="m20 5 8 0 2 5 5 3 5-1 4 7-4 4v5l4 4-4 7-5-1-5 3-2 5h-8l-2-5-5-3-5 1-4-7 4-4v-5l-4-4 4-7 5 1 5-3Z" transform="translate(0 -1)"/><circle cx="24" cy="24" r="11"/></>,
  lunar:<><circle cx="24" cy="24" r="14"/><path d="M34 5a21 21 0 0 0 6 33M10 43a21 21 0 0 0-6-33"/><path d="m20 6 1 2 2 1-2 1-1 2-1-2-2-1 2-1Z"/></>,
  emberglass:<><path d="m24 5 18 11-4 23-14 5L10 39 6 16Z"/><path d="m24 10 13 9-3 15-10 5-10-5-3-15Z"/></>,
  arctic:<><path d="m24 3 15 6 6 15-6 15-15 6-15-6-6-15L9 9Z"/><path d="m24 10 10 4 4 10-4 10-10 4-10-4-4-10 4-10Z M9 9l5 5m20 20 5 5M39 9l-5 5M9 39l5-5"/></>,
  nebula:<><circle cx="24" cy="24" r="14"/><ellipse cx="24" cy="24" rx="23" ry="8" transform="rotate(-32 24 24)"/><circle cx="6" cy="10" r="2"/><circle cx="42" cy="38" r="1.5"/></>,
 };
 return <svg className={`${styles.mark} ${styles[theme.id]||''}`} data-mark={isX?'X':'O'} viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">{isX?x[theme.id]:o[theme.id]}</svg>;
}

export function CosmeticFrame({cosmeticId,format='webp'}){
 const theme=cosmeticTheme(cosmeticId);if(!theme)return null;
 if(theme.id==='dominion')return <span className={`${styles.frame} ${styles.dominion}`} style={cosmeticStyle(cosmeticId)} aria-hidden="true"><svg viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="50" cy="52" r="35"/><circle cx="50" cy="52" r="31" strokeWidth=".65" opacity=".65"/><path d="M20 33 6 25l5 20-7 13 13 13 8 13M80 33l14-8-5 20 7 13-13 13-8 13" fill="var(--cosmetic-ink)"/><path d="m8 35 9 8-4 15 9 10M92 35l-9 8 4 15-9 10" stroke="var(--cosmetic-secondary)"/><path d="m34 11 8 5L50 3l8 13 8-5-4 17H38Z" fill="var(--cosmetic-ink)"/><path d="M39 22h22m-11-9 3 5-3 4-3-4Z"/><path d="m41 87 9 9 9-9m-9-5 4 6-4 5-4-5Z" fill="var(--cosmetic-secondary)"/><circle cx="50" cy="52" r="40" strokeWidth="1.1" strokeDasharray="1.2 4.6" className={styles.dominionRunes}/><g className={styles.dominionGlint}><path d="M22 31a35 35 0 0 1 20-12M78 73a35 35 0 0 1-18 12" stroke="#fff6df" strokeWidth="2.4"/></g><circle cx="50" cy="13" r="2.2" fill="#fff6df" stroke="none" className={styles.dominionJewel}/></svg></span>;
 if(theme.id==='ascendant')return <span className={`${styles.frame} ${styles.ascendant}`} style={cosmeticStyle(cosmeticId)} aria-hidden="true"><AnimatedCosmeticImage cosmeticId={cosmeticId} format={format} alt=""/></span>;
 const outer={solar:'M50 3 61 13 76 10 79 25 93 31 87 46 97 59 84 67 83 83 67 84 59 97 46 87 31 93 25 79 10 76 13 61 3 50 13 39 10 24 25 21 31 7 46 13Z',abyss:'M50 5C68 0 80 18 85 30c19 3 11 27 5 40-5 15-27 20-40 25-17-2-30-13-35-25C-4 64 7 43 15 30 18 14 34 4 50 5Z',jade:'M50 7 64 12 77 23 87 36 93 50 87 64 77 77 64 87 50 93 36 87 23 77 13 64 7 50 13 36 23 23 36 13Z',storm:'M50 3 89 24 97 69 65 96 21 89 3 50 24 11Z',rose:'M50 7c12-12 29 0 27 12 17-3 30 15 16 31 14 15 0 34-16 30 2 17-18 26-27 13-10 13-29 4-27-13C6 84-7 65 7 50-7 34 6 17 23 19 22 3 40-5 50 7Z',clockwork:'M43 4h14l4 10 14 5 10-4 9 12-7 9 4 15 9 6-3 15-12 1-9 12-1 12-15 3-6-9-15-4-9 7-12-9 4-10-5-14L4 57V43l10-4 5-14-4-10 12-9 9 7 15-4Z',lunar:'M50 5C72 0 95 21 95 50S71 99 50 95C22 99 0 71 5 50 0 22 22 0 50 5Z',emberglass:'M50 3 87 15 97 50 87 87 50 97 15 87 3 50 15 15Z',arctic:'M50 2 80 10 91 35 98 50 91 65 80 90 50 98 20 90 9 65 2 50 9 35 20 10Z',nebula:'M50 7C79 7 94 31 94 50S80 94 50 94 6 79 6 50 20 7 50 7Z'};
 return <span className={`${styles.frame} ${styles[theme.id]||''}`} style={cosmeticStyle(cosmeticId)} aria-hidden="true"><svg viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="1.8"><path d={outer[theme.id]}/><circle cx="50" cy="50" r="37" strokeWidth=".7" opacity=".6"/><path d="M47 8h6M47 92h6M8 47v6M92 47v6" strokeWidth="2.8"/><circle cx="50" cy="8" r="3" fill="currentColor"/><circle cx="50" cy="92" r="3" fill="currentColor"/></svg><span className={styles.frameCrest}><CosmeticMotif name={theme.motif}/></span></span>;
}

export function CosmeticArrival({cosmeticId,compact=true,format='webp'}){
 const theme=cosmeticTheme(cosmeticId);if(!theme)return null;
 return <span className={`${styles.arrival} ${styles[theme.id]||''} ${compact?styles.compact:''}`} style={cosmeticStyle(cosmeticId)} aria-hidden="true">{theme.id==='ascendant'&&<AnimatedCosmeticImage cosmeticId={cosmeticId} format={format} className={styles.ascendantPortal} alt=""/>}{theme.id==='dominion'&&<><AnimatedCosmeticImage cosmeticId={cosmeticId} format={format} className={styles.dominionPortal} alt=""/><span className={styles.dominionOrbit}/><span className={styles.dominionGate}/></>}<span className={styles.arrivalRing}/>{[0,1,2,3,4,5].map(i=><span key={i} className={styles.particle} style={{'--particle-angle':`${i*60}deg`,'--particle-delay':`${i*.13}s`}}><CosmeticMotif name={i%2?theme.emotes[1]:theme.motif}/></span>)}{!compact&&<span className={styles.arrivalCore}><CosmeticMotif name={theme.motif}/></span>}</span>;
}
