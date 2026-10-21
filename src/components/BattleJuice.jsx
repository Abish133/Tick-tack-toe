"use client";

import { AnimatePresence, motion } from "motion/react";
import { POWER_INFO } from "./PowerPresentation";
import {
  effectCellPosition,
  isEffectCell,
} from "../lib/power-effect-layout";
import styles from "./BattleJuice.module.css";

/* Presentation only: reads the last game event and never changes game state. */

const VERB = {
  fire: "Blast!",
  shield: "Shielded",
  portal: "Shifted",
  ice: "Frozen",
  crystal: "Locked",
  surge: "Energy +",
  lightning: "Zapped!",
  time: "Time +",
  shadow: "Swapped",
  meteor: "Crash!",
  bloom: "Restored",
  mirror: "Mirror up",
  phantom: "Illusion",
  gravity: "Pulled",
  poison: "Cursed",
  purify: "Cleansed",
  dragon: "Scorched!",
  eclipse: "Eclipse!",
  tide: "Reversed",
  wind: "Gust",
  root: "Rooted",
  echo: "Echoed",
};
export const ATTACKS = new Set([
  "fire",
  "lightning",
  "meteor",
  "dragon",
  "eclipse",
]);

const powerOf = (event) =>
  POWER_INFO.find(
    (power) => power.id === (event?.powerId || event?.action?.powerId),
  );

// What happened, cell by cell, for the floating outcome labels.
function outcomes(event, size) {
  const power = powerOf(event);
  if (!power) return [];
  const action = event.action || event,
    list = [];
  const at = (cell) => isEffectCell(cell, size);
  // The engine records each loss as { cell, playerId, ... }; older events used a bare index.
  for (const loss of event.destroyed || []) {
    const cell = typeof loss === "object" ? loss?.cell : loss;
    if (at(cell)) list.push({ cell, text: "Destroyed", tone: "hit" });
  }
  for (const cell of event.shieldCells || [])
    if (at(cell)) list.push({ cell, text: "Blocked!", tone: "block" });
  if (event.reflected && at(event.reflectionCell))
    list.push({ cell: event.reflectionCell, text: "Reflected!", tone: "block" });
  if (event.warning && at(event.warning.cell))
    list.push({ cell: event.warning.cell, text: "Cursed", tone: "warn" });
  if (!list.length) {
    const cell = [action.cell, action.target, event.resolvedCell, action.to].find(at);
    if (cell !== undefined)
      list.push({ cell, text: VERB[power.id] || power.name, tone: "buff" });
  }
  return list;
}

export function CastSequence({ event, revision, playerId, players = [], boardSize = 3, reduced = false }) {
  const power = powerOf(event);
  if (!power || !event) return null;
  const caster = players.find((player) => player.id === event.playerId);
  const mine = event.playerId === playerId;
  const Icon = power.icon;
  const marks = outcomes(event, boardSize);
  const moves = (event.movements || []).filter(
    (move) => isEffectCell(move.from, boardSize) && isEffectCell(move.to, boardSize),
  );
  const point = (cell) => {
    const p = effectCellPosition(cell, boardSize);
    return { x: parseFloat(p.left), y: parseFloat(p.top) };
  };
  return (
    <div
      key={`cast-${revision}`}
      className={`${styles.cast} ${reduced ? styles.reduced : ""} ${mine ? styles.mine : styles.theirs}`}
      style={{ "--fx": power.color }}
      aria-hidden="true"
    >
      <span className={styles.flash} />
      <span className={styles.vignette} />
      {moves.length > 0 && (
        <svg className={styles.trails} viewBox="0 0 100 100" preserveAspectRatio="none">
          {moves.map((move, index) => {
            const a = point(move.from),
              b = point(move.to);
            return (
              <line
                key={index}
                x1={a.x}
                y1={a.y}
                x2={b.x}
                y2={b.y}
                style={{ animationDelay: `${index * 90}ms` }}
              />
            );
          })}
        </svg>
      )}
      {marks.map(({ cell, text, tone }, index) => (
        <span
          key={`${cell}-${index}`}
          className={`${styles.impact} ${styles[tone]}`}
          style={{ ...effectCellPosition(cell, boardSize), "--size": `${100 / boardSize}%`, animationDelay: `${index * 80}ms` }}
        >
          <i className={styles.ring} />
          <i className={`${styles.ring} ${styles.ring2}`} />
          {tone === "hit" && <i className={styles.crack} />}
          <b className={styles.label}>{text}</b>
        </span>
      ))}
      <div className={styles.callout}>
        <span className={styles.calloutIcon}>
          <Icon size={30} />
        </span>
        <span className={styles.calloutText}>
          <small>{mine ? "You cast" : `${caster?.name || "Opponent"} casts`}</small>
          <strong>{power.name}</strong>
        </span>
      </div>
    </div>
  );
}

export function TurnSweep({ show, turnKey, reduced = false, text = "Your turn" }) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          key={turnKey}
          className={styles.turnSweep}
          initial={{ opacity: 0, x: reduced ? 0 : "-30%" }}
          animate={{ opacity: [0, 1, 1, 0], x: reduced ? 0 : ["-30%", "0%", "0%", "30%"] }}
          transition={{ duration: 1.1, times: [0, 0.2, 0.75, 1] }}
          aria-hidden="true"
        >
          <span>{text}</span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
