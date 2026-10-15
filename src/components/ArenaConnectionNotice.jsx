"use client";

import { RefreshCw, WifiOff } from "lucide-react";
import styles from "./ArenaConnectionNotice.module.css";

export default function ArenaConnectionNotice({ phase, onRetry, inBattle = false }) {
  if (phase === "connected") return null;
  const offline = phase === "offline";
  const syncing = phase === "syncing";
  return (
    <div className={styles.notice} role="status" aria-live="polite" data-arena-connection={phase}>
      {offline ? <WifiOff size={18} aria-hidden="true" /> : <RefreshCw size={18} aria-hidden="true" />}
      <div>
        <strong>{offline ? "You’re offline" : syncing ? "Restoring your battle" : phase === "restarting" ? "Arena is restarting" : "Reconnecting to the arena"}</strong>
        <span>{inBattle ? "Moves are locked until the latest board arrives. The match clock continues." : offline ? "Check your internet. We’ll reconnect automatically." : "We’ll reconnect automatically. Matchmaking may need to be started again."}</span>
      </div>
      <button type="button" onClick={onRetry} aria-label="Retry arena connection">Retry</button>
    </div>
  );
}
