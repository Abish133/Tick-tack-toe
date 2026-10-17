"use client";

import { motion } from "motion/react";
import { Trophy, Zap } from "lucide-react";
import { cosmeticAsset } from "../lib/cosmetic-collection";
import { useCosmeticAnimation } from "./AnimatedCosmeticImage";
import styles from "./VersusIntro.module.css";
import AscendantFx, { fxTheme } from "./AscendantFx";

const art = (skin = "avatar-void") =>
  cosmeticAsset(skin) ||
  `/assets/${{ "avatar-ember": "avatar-fire", "avatar-frost": "avatar-ice" }[skin] || skin}.webp`;

function Side({ side, name, detail, skin, reduced }) {
  const from = side === "left" ? -1 : 1;
  const media = useCosmeticAnimation(skin, art(skin));
  return (
    <motion.div
      className={`${styles.side} ${styles[side]}`}
      initial={reduced ? { opacity: 0 } : { x: `${from * 110}%`, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ type: "spring", stiffness: 140, damping: 18, delay: side === "left" ? 0.05 : 0.18 }}
    >
      <span className={styles.glow} />
      <motion.img
        className={styles.art}
        src={media.src}
        alt=""
        initial={reduced ? false : { scale: 1.25, filter: "brightness(2.2) blur(6px)" }}
        animate={{ scale: 1, filter: "brightness(1) blur(0px)" }}
        transition={{ duration: 0.7, delay: side === "left" ? 0.15 : 0.28 }}
      />
      {!reduced && fxTheme(skin) && <AscendantFx theme={fxTheme(skin)} stars={10} sweep glow />}
      <div className={styles.plate}>
        <strong data-ellipsis>{name}</strong>
        <span>{detail}</span>
      </div>
    </motion.div>
  );
}

/** Presentation only: the pre-battle showdown between both players. */
export default function VersusIntro({ me, opponent, countdown, onSkip, reduced = false }) {
  const fight = countdown === "FIGHT";
  return (
    <motion.div
      className={`${styles.intro} ${reduced ? styles.reduced : ""}`}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, scale: reduced ? 1 : 1.06 }}
      transition={{ duration: 0.3 }}
      aria-label="Battle introduction"
      role="dialog"
    >
      <button className={styles.skip} onClick={onSkip} aria-label="Skip battle introduction">
        Skip
      </button>
      <Side side="left" reduced={reduced} {...me} />
      <Side side="right" reduced={reduced} {...opponent} />
      <span className={styles.seam} aria-hidden="true" />
      <motion.div
        className={styles.vs}
        initial={reduced ? { opacity: 0 } : { scale: 3, opacity: 0, rotate: -12 }}
        animate={{ scale: 1, opacity: 1, rotate: 0 }}
        transition={{ type: "spring", stiffness: 260, damping: 14, delay: 0.45 }}
      >
        <Zap className={styles.bolt} aria-hidden="true" />
        <span>VS</span>
      </motion.div>
      <motion.strong
        key={countdown}
        className={`${styles.count} ${fight ? styles.fight : ""}`}
        initial={reduced ? { opacity: 0 } : { scale: 2.2, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 320, damping: 16 }}
      >
        {fight ? "FIGHT!" : countdown}
      </motion.strong>
    </motion.div>
  );
}

export const versusDetail = (match, player, difficulty, rank, pretty, self) => {
  const cups = match.participants?.find((p) => p.id === player?.id)?.initialCups;
  const cap = (t = "") => String(t).replace(/^./, (c) => c.toUpperCase());
  if (!self && match.rankedBot) return `${cap(match.difficulty)} · Competitive bot`;
  if (!self && match.mode === "ai") return `${cap(match.difficulty || difficulty)} AI · Practice`;
  return (
    <>
      <Trophy size={14} /> {rank(cups)} · {pretty(cups)}
    </>
  );
};
