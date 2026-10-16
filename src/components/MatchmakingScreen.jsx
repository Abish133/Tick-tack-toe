"use client";

import { useEffect, useState } from "react";
import { Swords, Shield, X } from "lucide-react";
import styles from "./MatchmakingScreen.module.css";

const STATUS = [
  "Scanning the arena…",
  "Matching your board size…",
  "Weighing trophy ranks…",
  "Summoning a worthy rival…",
];
const TIPS = [
  "Shield Guard absorbs one destructive hit.",
  "Frozen marks still count toward lines.",
  "Save energy for a counter on your opponent’s big turn.",
  "Time Warp extends the clock without spending your move.",
];

/** Presentation only: the queue itself lives in ArenaApp and the server. */
export default function MatchmakingScreen({
  seconds = 0,
  ranked = false,
  boardSize = 3,
  fallbackSeconds = 25,
  botDifficulty = "Hard",
  disclosure,
  player,
  avatar,
  onCancel,
}) {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => setTick((value) => value + 1), 2200);
    return () => clearInterval(timer);
  }, []);
  const remaining = Math.max(0, fallbackSeconds - seconds);
  return (
    <div className={styles.screen}>
      <div className={styles.embers} aria-hidden="true" />
      <p className={styles.mode}>
        {ranked ? "Ranked Elemental" : "Online battle"} · {boardSize} × {boardSize}
      </p>
      <h2 className={`queue-heading ${styles.heading}`}>
        Searching for opponent<span className={styles.dots} aria-hidden="true"><i>.</i><i>.</i><i>.</i></span>
      </h2>
      <div className={`queue-visual ${styles.portal}`} aria-hidden="true">
        <span className={styles.radar} />
        <svg viewBox="0 0 200 200" className={styles.rings}>
          <circle cx="100" cy="100" r="94" className={styles.ringOuter} />
          <circle cx="100" cy="100" r="78" className={styles.ringMid} />
          <circle cx="100" cy="100" r="62" className={styles.ringInner} />
          {Array.from({ length: 12 }, (_, i) => (
            <text
              key={i}
              x="100"
              y="14"
              className={styles.rune}
              transform={`rotate(${i * 30} 100 100)`}
            >
              {"ᚠᚢᚦᚨᚱᚲᚷᚹᚺᚾᛁᛃ"[i]}
            </text>
          ))}
        </svg>
        <span className={styles.core}>
          <Swords size={30} />
          <b className="queue-time">{seconds}</b>
          <small>seconds</small>
        </span>
      </div>
      <div className={styles.versus}>
        <div className={`queue-player ${styles.card}`}>
          <span className={styles.avatar}>{avatar}</span>
          <strong data-ellipsis>{player?.name}</strong>
          <small>{player?.rank}</small>
        </div>
        <span className={styles.vs}>VS</span>
        <div className={`${styles.card} ${styles.mystery}`}>
          <span className={styles.avatar}>
            <i className={styles.silhouette} />
            <b>?</b>
          </span>
          <strong key={tick} className={styles.status}>
            {STATUS[tick % STATUS.length]}
          </strong>
          <small>Rival</small>
        </div>
      </div>
      {ranked ? (
        <div className={styles.fallback}>
          <div
            className={styles.fallbackBar}
            role="progressbar"
            aria-label="Competitive bot fallback"
            aria-valuemin={0}
            aria-valuemax={fallbackSeconds}
            aria-valuenow={Math.min(seconds, fallbackSeconds)}
          >
            <i style={{ width: `${Math.min(100, (seconds / fallbackSeconds) * 100)}%` }} />
          </div>
          <p className="queue-bot-policy">
            {remaining > 0
              ? `${botDifficulty} or above · competitive bot fallback in ${remaining}s`
              : `${botDifficulty} or above · bringing in a competitive bot`}
          </p>
          <p className={styles.disclosure}>
            <Shield size={13} aria-hidden="true" /> {disclosure}
          </p>
        </div>
      ) : (
        <p className={styles.disclosure}>Waiting for another real player.</p>
      )}
      <p key={`tip-${tick >> 1}`} className={styles.tip}>
        Tip: {TIPS[(tick >> 1) % TIPS.length]}
      </p>
      <button className={`button secondary wide ${styles.cancel}`} onClick={onCancel}>
        <X size={16} /> Cancel matchmaking
      </button>
    </div>
  );
}
