'use client';

import styles from './PowerEffects.module.css';

const POWERS = new Set(['fire', 'shield', 'portal', 'ice', 'crystal', 'surge']);
const position = cell => ({ left: `${((cell % 3) + 0.5) * 100 / 3}%`, top: `${(Math.floor(cell / 3) + 0.5) * 100 / 3}%` });
const isCell = cell => Number.isInteger(cell) && cell >= 0 && cell < 9;

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
  </span>;
}

/** Presentation only: no input handlers, timers, board mutations or game authority. */
export default function PowerEffects({ event, revision, reducedMotion = false, quality = 'High' }) {
  const powerId = event?.powerId ?? event?.action?.powerId;
  if (!POWERS.has(powerId)) return null;
  const action = event?.action ?? event;
  const cell = action.cell ?? action.target;
  const effectKey = `${revision ?? event?.revision ?? event?.at ?? 0}:${powerId}:${event?.at ?? 0}`;
  const count = String(quality).toLowerCase() === 'low' ? 4 : String(quality).toLowerCase() === 'medium' ? 8 : 12;
  const location = isCell(cell) ? position(cell) : { left: '50%', top: '50%' };

  return <span key={effectKey} className={`${styles.overlay} ${reducedMotion ? styles.reduced : ''}`} aria-hidden="true" data-power-effect={powerId}>
    {powerId === 'portal' && isCell(action.from) && isCell(action.to) ? <>
      <Burst powerId="portal" count={count} location={position(action.from)} reversed />
      <Burst powerId="portal" count={count} location={position(action.to)} />
    </> : <Burst powerId={powerId} count={count} location={location} />}
  </span>;
}
