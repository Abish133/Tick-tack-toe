"use client";

import { useEffect, useRef, useState } from "react";
import { Crown, RefreshCw, Sparkles, Swords } from "lucide-react";
import { CosmeticMark } from "./CosmeticAppearance";
import { EclipseVictory, SovereignStrike } from "./SovereignFx";
import { cosmeticStyle } from "../lib/cosmetic-collection";
import styles from "./SovereignTrial.module.css";

const LINES = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8],
  [0, 3, 6], [1, 4, 7], [2, 5, 8],
  [0, 4, 8], [2, 4, 6],
];
const winnerOf = (board) =>
  LINES.find(([a, b, c]) => board[a] && board[a] === board[b] && board[a] === board[c]);

// The trial rival wins when it can, blocks when it must, and otherwise plays loosely
// so a buyer can reach the Eclipse Victory.
function rivalMove(board) {
  const open = board.flatMap((value, cell) => (value ? [] : [cell]));
  const finishing = (mark) =>
    open.find((cell) => winnerOf(board.map((value, index) => (index === cell ? mark : value))));
  const win = finishing("O");
  if (win !== undefined) return win;
  const block = finishing("X");
  if (block !== undefined && Math.random() < 0.6) return block;
  return open[Math.floor(Math.random() * open.length)];
}

const SIGILS = "marks-collection-dominion",
  BOARD = "board-collection-dominion";

/**
 * A playable Dominion board in the shop: every sigil the player places strikes gold,
 * and a win unleashes the Eclipse Victory, exactly as owners see them in matches.
 */
export default function SovereignTrial({ reducedMotion: reducedSetting = false }) {
  const [reducedMotion, setReducedMotion] = useState(reducedSetting);
  useEffect(() => {
    setReducedMotion(
      reducedSetting ||
        document.documentElement.classList.contains("reduce-motion") ||
        window.matchMedia?.("(prefers-reduced-motion: reduce)").matches,
    );
  }, [reducedSetting]);
  const [board, setBoard] = useState(Array(9).fill(null)),
    [strike, setStrike] = useState(null),
    [victory, setVictory] = useState(false),
    [rivalTurn, setRivalTurn] = useState(false);
  const timer = useRef(null);
  const line = winnerOf(board);
  const full = board.every(Boolean);
  const over = Boolean(line) || full;
  useEffect(() => () => clearTimeout(timer.current), []);

  function play(cell) {
    if (board[cell] || over || rivalTurn) return;
    const next = board.map((value, index) => (index === cell ? "X" : value));
    setBoard(next);
    setStrike({ cell, key: Date.now() });
    if (winnerOf(next)) {
      timer.current = setTimeout(() => setVictory(true), reducedMotion ? 0 : 520);
      return;
    }
    if (next.every(Boolean)) return;
    setRivalTurn(true);
    timer.current = setTimeout(() => {
      const reply = rivalMove(next);
      setBoard((current) => current.map((value, index) => (index === reply ? "O" : value)));
      setRivalTurn(false);
    }, 480);
  }
  function reset() {
    clearTimeout(timer.current);
    setBoard(Array(9).fill(null));
    setStrike(null);
    setVictory(false);
    setRivalTurn(false);
  }
  const status = line
    ? board[line[0]] === "X"
      ? "Sovereign victory. This is how every win of yours will end."
      : "The rival took this one. Play again and claim the crown."
    : full
      ? "A draw. Play again and claim the crown."
      : rivalTurn
        ? "The rival is answering…"
        : "Your move. Place a sigil and watch it strike.";

  return (
    <section className={styles.trial} aria-label="Try the Sovereign signatures">
      <div className={styles.copy}>
        <span className={styles.kicker}>
          <Sparkles size={14} aria-hidden="true" /> TRY IT LIVE
        </span>
        <h4>Feel the Sovereign signatures</h4>
        <p>No other collection has these. Play a round right here with the Dominion board and sigils.</p>
        <ul className={styles.signatures}>
          <li>
            <Swords size={18} aria-hidden="true" />
            <span>
              <strong>Sovereign Strike</strong>
              <small>Every sigil you place bursts in gold, for both players to see. Dominion Sigils.</small>
            </span>
          </li>
          <li>
            <Crown size={18} aria-hidden="true" />
            <span>
              <strong>Eclipse Victory</strong>
              <small>Your wins open with an eclipse, a descending crown and a proclamation. Dominion Arrival.</small>
            </span>
          </li>
          <li>
            <Sparkles size={18} aria-hidden="true" />
            <span>
              <strong>Royal Entrance</strong>
              <small>The versus screen crowns you SOVEREIGN before the fight. Dominion Arrival.</small>
            </span>
          </li>
        </ul>
      </div>
      <div className={styles.play}>
        <div
          className={`collection-board ${styles.board}`}
          data-cosmetic-theme="dominion"
          style={cosmeticStyle(BOARD)}
          role="group"
          aria-label="Sovereign trial board"
        >
          {board.map((value, cell) => (
            <button
              key={cell}
              type="button"
              className={`collection-board-cell ${styles.cell} ${line?.includes(cell) ? styles.winning : ""}`}
              onClick={() => play(cell)}
              disabled={Boolean(value) || over || rivalTurn}
              aria-label={`Trial cell ${cell + 1}: ${value || "empty"}`}
            >
              {value && (
                <span
                  className={`mark ${value.toLowerCase()} collection-marks ${styles.mark}`}
                  style={cosmeticStyle(SIGILS)}
                >
                  <CosmeticMark mark={value} cosmeticId={SIGILS} />
                </span>
              )}
            </button>
          ))}
          {strike && <SovereignStrike key={strike.key} cell={strike.cell} size={3} reduced={reducedMotion} />}
          {victory && (
            <EclipseVictory own contained reduced={reducedMotion} onDone={() => setVictory(false)} />
          )}
        </div>
        <p className={styles.status} aria-live="polite">{status}</p>
        <button type="button" className={styles.again} onClick={reset}>
          <RefreshCw size={16} aria-hidden="true" /> Play again
        </button>
      </div>
    </section>
  );
}
