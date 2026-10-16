"use client";

import { useEffect, useState } from "react";
import {
  X,
  Circle,
  RefreshCw,
  CheckCircle2,
  Target,
} from "lucide-react";
import { detectOutcome } from "@/lib/game-engine/index";
import { GameFrame, GameButton } from "./ui";
import { countdownTo, nextUtcMidnight } from "../lib/time-format";
import styles from "./DailyPuzzle.module.css";

const PUZZLES = [
  ["X", "X", null, "O", "O", null, null, null, null],
  ["O", null, "X", null, "O", "X", null, null, null],
  ["X", "O", null, null, "X", "O", null, null, null],
  ["O", "X", "O", null, "X", null, null, null, null],
  ["X", "O", null, "X", null, "O", null, null, null],
  ["O", null, "X", "O", "X", null, null, null, null],
  ["O", "O", null, "X", null, "X", null, null, null],
];

export default function DailyPuzzle() {
  const [day, setDay] = useState(null);
  const [board, setBoard] = useState(Array(9).fill(null));
  const [solved, setSolved] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [missed, setMissed] = useState(null);
  useEffect(() => {
    const dayNumber = Math.floor(Date.now() / 86400000);
    setDay(dayNumber);
    setBoard([...PUZZLES[dayNumber % PUZZLES.length]]);
  }, []);
  function choose(index) {
    if (board[index] || solved || day === null) return;
    const next = [...board];
    next[index] = "X";
    if (detectOutcome(next).winnerId === "X") {
      setBoard(next);
      setSolved(true);
      setFeedback("A winning move. Well spotted.");
    } else {
      setMissed(index);
      setFeedback(
        "That move does not finish the line. Look for the immediate win.",
      );
    }
  }
  return (
    <GameFrame className={`puzzle-panel ${styles.root}`}>
      <div className={styles.heading}>
        <span>
          <Target size={24} />
          WIN IN ONE MOVE
        </span>
      </div>
      <p className={styles.help}>
        You are X. Place one mark to complete a winning line.
      </p>
      <div className={styles.boardStage}>
        <div
          className={`game-board ${styles.board}`}
          role="group"
          aria-label="Daily puzzle board"
        >
          {board.map((mark, index) => (
            <button
              className={`game-cell ${missed === index ? styles.missCell : ""}`}
              key={index}
              disabled={!!mark || solved}
              onClick={() => choose(index)}
              aria-label={`Puzzle row ${Math.floor(index / 3) + 1}, column ${(index % 3) + 1}: ${mark || "empty"}`}
            >
              {mark && (
                <span className={`mark ${mark.toLowerCase()}`}>
                  {mark === "X" ? <X /> : <Circle />}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>
      <div
        className={`puzzle-feedback ${styles.feedback} ${solved ? `solved ${styles.solved}` : ""} ${missed ? styles.missed : ""}`}
        aria-live="polite"
      >
        {solved && <CheckCircle2 size={21} />}
        {feedback || "One careful observation can change the whole board."}
      </div>
      {solved ? (
        <GameButton variant="secondary" disabled className="claimed-button">
          <CheckCircle2 size={18} />
          Solved · New puzzle in {countdownTo(nextUtcMidnight())}
        </GameButton>
      ) : missed ? (
        <GameButton
          variant="secondary"
          onClick={() => {
            setMissed(null);
            setFeedback("");
          }}
        >
          <RefreshCw size={18} />
          Try again
        </GameButton>
      ) : null}
    </GameFrame>
  );
}
