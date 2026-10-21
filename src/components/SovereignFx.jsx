"use client";

import { useEffect } from "react";
import { Crown } from "lucide-react";
import { effectCellPosition } from "../lib/power-effect-layout";
import styles from "./SovereignFx.module.css";

/* Eternal Dominion's signatures. Presentation only: none of this reads or changes game state. */

/** A gold shockwave and crown that burst from a cell when a Dominion Sigil lands. */
export function SovereignStrike({ cell, size = 3, reduced = false }) {
  const position = effectCellPosition(cell, size);
  return (
    <span
      className={`${styles.strike} ${reduced ? styles.calm : ""}`}
      style={{ left: position.left, top: position.top, width: `${100 / size}%` }}
      data-sovereign-strike={cell}
      aria-hidden="true"
    >
      <i className={styles.wave} />
      <i className={`${styles.wave} ${styles.late}`} />
      {Array.from({ length: 8 }, (_, index) => (
        <i key={index} className={styles.ray} style={{ "--ray": index }} />
      ))}
      <Crown className={styles.strikeCrown} />
    </span>
  );
}

/**
 * The finisher a Dominion Arrival owner earns on winning: an eclipse opens, a crown
 * descends and the win is proclaimed. Tap to skip; it also ends on its own.
 */
export function EclipseVictory({ name, own = false, onDone, reduced = false, contained = false }) {
  useEffect(() => {
    const timer = setTimeout(() => onDone?.(), reduced ? 1600 : 3400);
    return () => clearTimeout(timer);
  }, [onDone, reduced]);
  return (
    <button
      type="button"
      className={`${styles.victory} ${contained ? styles.contained : ""} ${reduced ? styles.calm : ""}`}
      onClick={() => onDone?.()}
      aria-label="Sovereign victory. Tap to continue"
      data-sovereign-victory
    >
      <span className={styles.veil} aria-hidden="true" />
      <span className={styles.corona} aria-hidden="true" />
      <span className={styles.eclipse} aria-hidden="true" />
      <span className={styles.sparks} aria-hidden="true">
        {Array.from({ length: 16 }, (_, index) => (
          <i key={index} style={{ "--spark": index }} />
        ))}
      </span>
      <Crown className={styles.victoryCrown} aria-hidden="true" />
      <span className={styles.proclaim}>
        <strong>SOVEREIGN VICTORY</strong>
        <small>{own ? "Your reign continues" : `${name || "The Sovereign"} claims the crown`}</small>
      </span>
    </button>
  );
}
