"use client";

import { useCallback, useEffect, useState } from "react";
import {
  History,
  Play,
  LoaderCircle,
  Coins,
  Trophy,
  ArrowDown,
  Clock3,
} from "lucide-react";
import { GameButton, GameFrame } from "./ui";
import styles from "./JourneyPanels.module.css";

const modes = {
  all: "All battles",
  ranked: "Ranked",
  friend: "Private",
  quick: "Quick",
  classic: "Classic",
  ai: "AI",
  tournament: "Tournament",
};

export default function HistoryPanel({ api, user, navigate, onError }) {
  const [matches, setMatches] = useState([]);
  const [cursor, setCursor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState("all");
  const load = useCallback(
    async (more = false, next = null) => {
      setLoading(true);
      try {
        const data = await api(
          `/history${more && next ? `?cursor=${encodeURIComponent(next)}` : ""}`,
        );
        setMatches((previous) =>
          more
            ? [
                ...previous,
                ...data.matches.filter(
                  (m) => !previous.some((p) => p.id === m.id),
                ),
              ]
            : data.matches || [],
        );
        setCursor(data.nextCursor || null);
      } catch (e) {
        onError(e.message);
      } finally {
        setLoading(false);
      }
    },
    [api, onError],
  );
  useEffect(() => {
    if (user) load();
  }, [user?.id, load]);
  const shown = matches.filter((m) => mode === "all" || m.mode === mode);

  return (
    <div className={styles.screen}>
      <nav className={`${styles.filters} scroll-row`} aria-label="Match history filters">
        {Object.entries(modes).map(([id, name]) => (
          <button
            type="button"
            aria-pressed={mode === id}
            className={mode === id ? styles.selected : ""}
            key={id}
            onClick={() => setMode(id)}
          >
            {name}
          </button>
        ))}
      </nav>
      <div className={styles.scroll}>
        <div className={styles.history}>
          {shown.map((m) => {
            const own = m.participants?.find((p) => p.userId === user.id),
              opponent = m.participants?.find((p) => p.userId !== user.id),
              outcome = m.outcome || own?.outcome || "draw";
            const seconds = m.finishedAt
              ? Math.max(
                  0,
                  Math.round(
                    (new Date(m.finishedAt) - new Date(m.createdAt)) / 1000,
                  ),
                )
              : 0;
            return (
              <button
                className={`${styles.historyRow} ${outcome === "win" ? styles.victory : outcome === "loss" ? styles.defeat : styles.drawn}`}
                key={m.id}
                onClick={() => navigate(`/replay/${m.id}`)}
              >
                <span className={`${styles.outcome} ${styles[outcome]}`}>
                  {outcome === "win" ? "W" : outcome === "loss" ? "L" : "D"}
                </span>
                <div className={styles.historyIdentity}>
                  <strong>vs {opponent?.name || "Opponent"}</strong>
                  <small>
                    {m.mode === "ai" ? "AI practice" : modes[m.mode] || m.mode}{" "}
                    · {m.ruleset} · {new Date(m.createdAt).toLocaleString()}
                  </small>
                </div>
                <span className={styles.historyScore}>
                  {outcome === "win"
                    ? "Victory"
                    : outcome === "loss"
                      ? "Defeat"
                      : "Draw"}
                  <small>
                    <Clock3 size={14} />
                    {Math.floor(seconds / 60)}m {seconds % 60}s ·{" "}
                    {m.turnCount || 0} turns
                  </small>
                </span>
                <span className={styles.historyReward}>
                  <span>
                    <Trophy size={17} />
                    {(own?.cupChange || 0) > 0 ? "+" : ""}
                    {own?.cupChange || 0}
                  </span>
                  <small>
                    <Coins size={14} />
                    {own?.coinReward || 0}
                  </small>
                </span>
                <Play size={22} aria-label="View replay" />
              </button>
            );
          })}
        </div>
        {!shown.length && !loading && (
          <GameFrame className={styles.empty}>
            <History size={35} />
            <h3>
              {matches.length
                ? "No matching battles loaded"
                : "Your first battle is ahead"}
            </h3>
            <p>
              {matches.length
                ? "Load more history or choose another filter."
                : "Completed battles, verified rewards, and replays appear here."}
            </p>
            <GameButton variant="secondary" onClick={() => navigate("/")}>
              Enter the Arena
            </GameButton>
          </GameFrame>
        )}
        {loading && (
          <div className="loading-state">
            <LoaderCircle className="spin" />
            Reading recorded battles…
          </div>
        )}
        {cursor && (
          <GameButton
            variant="secondary"
            className={styles.more}
            disabled={loading}
            onClick={() => load(true, cursor)}
          >
            <ArrowDown size={17} />
            Load older battles
          </GameButton>
        )}
      </div>
    </div>
  );
}
