'use client';

import styles from './PowerEffects.module.css';
import {PowerIcon} from './PowerPresentation';
import {POWER_CATALOG} from '../lib/game-engine/index';
import {effectCellPosition,effectLinePosition,isEffectCell} from '../lib/power-effect-layout';

const POWERS = new Set(POWER_CATALOG.map(power=>power.id));

function Particles({ count, variant }) {
  return Array.from({ length: count }, (_, index) => {
    const angle = (index / count) * Math.PI * 2;
    const reach = variant === 'ice' ? 40 : variant === 'surge' ? 65 : 57;
    return <i key={index} className={`${styles.particle} ${styles[`${variant}Particle`] || ''}`} style={{ '--dx': `${Math.cos(angle) * reach}px`, '--dy': `${Math.sin(angle) * reach}px`, '--angle': `${index * 360 / count}deg`, '--delay': `${(index % 4) * 25}ms` }} />;
  });
}

function Burst({ powerId, count, location, reversed = false }) {
  return <span className={`${styles.burst} ${styles[powerId]} ${reversed ? styles.reversed : ''}`} style={location}>
    {powerId === 'fire' && <><i className={styles.fireCore} /><i className={styles.wave} /><Particles count={count} variant="fire" /></>}
    {powerId === 'shield' && <><i className={styles.shieldRing} /><i className={styles.shieldInner} /><i className={styles.shieldGlyph}>◇</i></>}
    {powerId === 'portal' && <><i className={styles.portalRing} /><i className={styles.portalInner} /><Particles count={Math.max(4, Math.floor(count / 2))} variant="portal" /></>}
    {powerId === 'ice' && <><i className={styles.frostHalo} /><Particles count={Math.max(6, count)} variant="ice" /><i className={styles.iceStar}>✧</i></>}
    {powerId === 'crystal' && <><i className={styles.crystalHalo} /><i className={styles.crystalGem} /><i className={styles.crystalShard} /><i className={`${styles.crystalShard} ${styles.secondShard}`} /></>}
    {powerId === 'surge' && <><i className={styles.energyRing} /><i className={styles.energyArc} /><i className={`${styles.energyArc} ${styles.secondArc}`} /><Particles count={count} variant="surge" /></>}
    {!['fire','shield','portal','ice','crystal','surge'].includes(powerId)&&<>
      <i className={styles.elementHalo}/><i className={styles.elementRing}/><span className={styles.elementGlyph}><PowerIcon id={powerId} size={48}/></span>
      {['lightning','meteor','dragon','eclipse'].includes(powerId)&&<i className={styles.strikeTrail}/>}
      {['shadow','gravity','wind','tide','echo','time'].includes(powerId)&&<i className={styles.flowArc}/>}
      {['bloom','poison','root','purify','mirror','phantom'].includes(powerId)&&<i className={styles.runeRing}/>}
      <Particles count={count} variant={powerId}/>
    </>}
  </span>;
}

/** Presentation only: no input handlers, timers, board mutations or game authority. */
export default function PowerEffects({ event, revision, boardSize = 3, reducedMotion = false, quality = 'High' }) {
  const position=cell=>effectCellPosition(cell,boardSize),isCell=cell=>isEffectCell(cell,boardSize);
  const powerId = event?.powerId ?? event?.action?.powerId;
  const expirations=(event?.expired||[]).filter(item=>isCell(item.cell));
  if (!POWERS.has(powerId)&&!expirations.length) return null;
  const action = event?.action ?? event;
  const cell = action.cell ?? action.target ?? event?.resolvedCell;
  const effectKey = `${revision ?? event?.revision ?? event?.at ?? 0}:${powerId}:${event?.at ?? 0}`;
  const count = String(quality).toLowerCase() === 'low' ? 4 : String(quality).toLowerCase() === 'medium' ? 8 : 12;
  const location = isCell(cell) ? position(cell) : powerId==='dragon'?effectLinePosition(action.axis,action.index,boardSize):{ left: '50%', top: '50%' };

  return <span key={effectKey} className={`${styles.overlay} ${reducedMotion ? styles.reduced : ''}`} aria-hidden="true" data-power-effect={powerId}>
    {POWERS.has(powerId)&&(['portal','shadow','wind','tide'].includes(powerId) && isCell(action.from) && isCell(action.to) ? <>
      <Burst powerId={powerId} count={count} location={position(action.from)} reversed />
      <Burst powerId={powerId} count={count} location={position(action.to)} />
    </> : <Burst powerId={powerId} count={count} location={location} />)}
    {expirations.map((item,index)=><Burst key={`expired-${index}`} powerId={item.effect==='frozenUntil'?'ice':item.effect==='mirrorUntil'?'mirror':item.effect==='rootUntil'?'root':item.effect==='electricity'?'lightning':item.effect==='scorched'?'meteor':item.effect==='darkness'?'eclipse':POWERS.has(item.effect)?item.effect:'crystal'} count={Math.max(4,count/2)} location={position(item.cell)} reversed/>)}
    {event?.reflected&&isCell(event.reflectionCell)&&<Burst powerId="mirror" count={count} location={position(event.reflectionCell)}/>}
  </span>;
}
