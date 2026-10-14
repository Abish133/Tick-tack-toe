"use client";

import { useEffect, useState } from "react";
import {
  X,
  Circle,
  Shield,
  Orbit,
  ArrowRight,
  RefreshCw,
  Check,
  BookOpen,
  Info,
} from "lucide-react";
import { createGame, applyAction } from "../lib/game-engine/index";
import PowerEffects from "./PowerEffects";
import { GameFrame, GameButton, Modal } from "./ui";
import styles from "./TutorialArena.module.css";

const chapters = [
  {
    name: "Find the line",
    title: "One familiar idea.",
    description:
      "Three marks in a row win. Place X in the highlighted cell to complete the top row.",
    mode: "classic",
    placements: [0, 3, 1, 4],
    target: 2,
  },
  {
    name: "Protect your plan",
    title: "A shield buys a decision.",
    description:
      "Shield your mark in the top-left cell. The practice opponent will cast Fire Blast so you can see the counterplay.",
    mode: "elemental",
    placements: [0, 4],
    target: 0,
    power: "shield",
  },
  {
    name: "Change the geometry",
    title: "A move can become a winning line.",
    description:
      "Portal Shift spends your whole turn. Move your bottom-right X into the empty top-right cell to win.",
    mode: "elemental",
    placements: [0, 3, 1, 4, 8, 6],
    target: 2,
    from: 8,
    power: "portal",
  },
];
function scenario(chapter) {
  let game = createGame({
    mode: chapter.mode,
    rounds: 1,
    now: 0,
    players: [
      { id: "training-x", name: "You", loadout: ["fire", "shield", "portal"] },
      {
        id: "training-o",
        name: "Practice opponent",
        loadout: ["fire", "shield", "portal"],
      },
    ],
  });
  for (const cell of chapter.placements)
    game = applyAction(
      game,
      game.currentPlayerId,
      { type: "place", cell, revision: game.revision },
      game.turnStartedAt + 500,
    );
  return game;
}

export default function TutorialArena({ navigate, reducedMotion = false }) {
  const [chapter, setChapter] = useState(0),
    [game, setGame] = useState(() => scenario(chapters[0])),
    [done, setDone] = useState(false),
    [source, setSource] = useState(false),
    [error, setError] = useState("");
  const [info, setInfo] = useState(false);
  const lesson = chapters[chapter];
  function select(index) {
    setChapter(index);
    setGame(scenario(chapters[index]));
    setDone(false);
    setSource(false);
    setError("");
  }
  function act(cell) {
    if (done) return;
    if (lesson.power === "portal" && !source) {
      if (cell === lesson.from) setSource(true);
      return;
    }
    if (cell !== lesson.target) return;
    try {
      const action = lesson.power
        ? {
            type: "power",
            powerId: lesson.power,
            ...(lesson.power === "portal"
              ? { from: lesson.from, to: cell }
              : { cell }),
          }
        : { type: "place", cell };
      const next = applyAction(
        game,
        "training-x",
        { ...action, revision: game.revision },
        game.turnStartedAt + 500,
      );
      setGame(next);
      if (lesson.power !== "shield") setDone(true);
    } catch (e) {
      setError(e.message);
    }
  }
  useEffect(() => {
    if (lesson.power !== "shield" || done || !game.effects[0].shield) return;
    const timer = setTimeout(
      () => {
        setGame((previous) =>
          applyAction(
            previous,
            "training-o",
            {
              type: "power",
              powerId: "fire",
              cell: 0,
              revision: previous.revision,
            },
            previous.turnStartedAt + 500,
          ),
        );
        setDone(true);
      },
      reducedMotion ? 50 : 850,
    );
    return () => clearTimeout(timer);
  }, [game, done, lesson.power, reducedMotion]);

  return (
    <GameFrame className={styles.root} aria-label="Interactive arena tutorial">
      <nav className={styles.steps} aria-label="Tutorial chapters">
        {chapters.map((entry, index) => (
          <button
            type="button"
            className={index === chapter ? styles.active : ""}
            aria-pressed={index === chapter}
            key={entry.name}
            onClick={() => select(index)}
          >
            <span>{index + 1}</span>
            {entry.name}
          </button>
        ))}
      </nav>
      <div className={styles.layout}>
        <div className={styles.lesson}>
          <span className={styles.label}>
            <BookOpen size={19} />
            GUIDED PRACTICE
          </span>
          <h2>{lesson.title}</h2>
          {lesson.power && (
            <GameFrame variant="card" className={styles.power}>
              {lesson.power === "shield" ? (
                <Shield size={31} />
              ) : (
                <Orbit size={31} />
              )}
              <div>
                <strong>
                  {lesson.power === "shield" ? "Shield Guard" : "Portal Shift"}
                </strong>
                <small>
                  {lesson.power === "shield"
                    ? "1 energy · absorbs one attack"
                    : "2 energy · moves one unprotected mark"}
                </small>
              </div>
            </GameFrame>
          )}
          <div className={styles.lessonActions}>
            <GameButton variant="secondary" onClick={() => select(chapter)}>
              <RefreshCw size={17} />
              <span className={styles.restartText}>Restart this lesson</span>
            </GameButton>
            <GameButton
              variant="icon"
              aria-label="Lesson information"
              onClick={() => setInfo(true)}
            >
              <Info size={22} />
            </GameButton>
          </div>
        </div>
        <div className={styles.arena}>
          <div className={styles.instruction} aria-live="polite">
            {done ? (
              <>
                <Check size={20} />
                {lesson.power === "shield"
                  ? "Fire broke the shield. Your X survived."
                  : "A winning line. You saw the next move."}
              </>
            ) : lesson.power === "portal" && !source ? (
              "Select your bottom-right X."
            ) : lesson.power === "shield" && game.effects[0].shield ? (
              "Practice opponent casts Fire Blast…"
            ) : lesson.power === "portal" ? (
              "Choose the top-right destination."
            ) : (
              "Choose the highlighted cell."
            )}
          </div>
          <div className={styles.boardStage}>
            <div
              className={`game-board ${styles.board}`}
              role="group"
              aria-label="Tutorial board"
            >
              {game.board.map((value, cell) => {
                const mark = game.players.find(
                    (player) => player.id === value,
                  )?.mark,
                  target =
                    lesson.power === "portal" && !source
                      ? lesson.from
                      : lesson.target;
                return (
                  <button
                    className={`game-cell ${mark?.toLowerCase() || ""} ${!done && cell === target ? styles.target : ""}`}
                    aria-label={`Tutorial row ${Math.floor(cell / 3) + 1}, column ${(cell % 3) + 1}: ${mark || "empty"}`}
                    key={cell}
                    disabled={
                      done ||
                      cell !== target ||
                      (lesson.power === "shield" && !!game.effects[0].shield)
                    }
                    onClick={() => act(cell)}
                  >
                    {mark && (
                      <span className={`mark ${mark.toLowerCase()}`}>
                        {mark === "X" ? <X /> : <Circle />}
                      </span>
                    )}
                    {game.effects[cell].shield && (
                      <Shield className="cell-effect" size={20} />
                    )}
                  </button>
                );
              })}
              <PowerEffects
                event={game.lastEvent}
                revision={game.revision}
                reducedMotion={reducedMotion}
              />
            </div>
          </div>
          {error && (
            <p role="alert" className={styles.error}>
              {error}
            </p>
          )}
          <GameButton
            disabled={!done}
            onClick={() => (chapter < 2 ? select(chapter + 1) : navigate("/"))}
          >
            <ArrowRight size={18} />
            {chapter < 2 ? "Next lesson" : "Enter the Arena"}
          </GameButton>
        </div>
      </div>
      <Modal
        open={info}
        title="Lesson information"
        onClose={() => setInfo(false)}
      >
        <div className={styles.info}>
          <h3>{lesson.name}</h3>
          <p>{lesson.description}</p>
          <p>
            This is a training scenario. It uses the real game rules and awards
            no cups, coins, or XP.
          </p>
          <p>
            Exactly three equipped powers. One action per turn. Every Ranked
            player has equal access.
          </p>
        </div>
      </Modal>
    </GameFrame>
  );
}
