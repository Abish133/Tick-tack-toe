"use client";
import { useEffect, useState } from "react";
import {
  X,
  Circle,
  Users,
  Bot,
  RefreshCw,
  WifiOff,
  Trophy,
  Sparkles,
  Settings2,
  Info,
} from "lucide-react";
import {
  createGame,
  applyAction,
  chooseAIAction,
} from "@/lib/game-engine/index";
import { boardSizeOf, scoresForBoard } from "@/lib/game-engine/geometry";
import BoardSizePicker from "./BoardSizePicker";
import { GameFrame, GameButton, CustomSelect, Modal } from "./ui";
import styles from "./OfflineArena.module.css";

const LEVELS = [
  "Beginner",
  "Easy",
  "Medium",
  "Hard",
  "Expert",
  "Extreme",
  "Nightmare",
];
const STORAGE = "elemental-arena-local-classic-v1";
const DEFAULT_CONFIG = {
  opponent: "human",
  difficulty: "Hard",
  humanMark: "X",
  boardSize: 3,
};
function fresh(config) {
  return createGame({
    mode: "classic",
    boardSize: config.boardSize || 3,
    rounds: 1,
    now: 0,
    players: ["X", "O"].map((mark) => ({
      id: `local-${mark.toLowerCase()}`,
      name:
        config.opponent === "human"
          ? `Player ${mark}`
          : config.humanMark === mark
            ? "You"
            : `${config.difficulty} AI`,
    })),
  });
}
function restore() {
  try {
    const data = JSON.parse(localStorage.getItem(STORAGE));
    const game = data?.game;
    const size = boardSizeOf(game);
    if (game) {
      game.boardSize ??= size;
      game.scoringMode ??= size === 3 ? "line" : "triplet-score";
      game.roundScores ??= scoresForBoard(
        game.board || [],
        ["local-x", "local-o"],
        size,
      );
      game.matchBankMs ??=
        size === 3 ? 120000 : { 4: 240000, 5: 360000, 6: 480000 }[size];
    }
    if (data?.config) data.config.boardSize ??= size;
    const ids = ["local-x", "local-o"];
    const shapeValid =
      game &&
      Object.keys(fresh(DEFAULT_CONFIG)).every((key) => key in game) &&
      [
        "revision",
        "round",
        "turnNumber",
        "roundTurns",
        "maxRoundActions",
      ].every((key) => Number.isInteger(game[key]) && game[key] >= 0) &&
      Array.isArray(game.history) &&
      Array.isArray(game.roundHistory) &&
      ids.every(
        (id) =>
          Number.isFinite(game.remainingMs?.[id]) &&
          Number.isFinite(game.roundWins?.[id]) &&
          Number.isFinite(game.energy?.[id]),
      );
    if (
      shapeValid &&
      game.version === 1 &&
      game.mode === "classic" &&
      game.maxRounds === 1 &&
      ["active", "finished"].includes(game.status) &&
      game.board?.length === size * size &&
      game.board.every((cell) => cell === null || ids.includes(cell)) &&
      game.players?.length === 2 &&
      game.players.every(
        (player, index) =>
          player.id === ids[index] && player.mark === ["X", "O"][index],
      ) &&
      ids.includes(game.currentPlayerId) &&
      Number.isFinite(game.turnStartedAt) &&
      game.effects?.length === size * size &&
      game.effects.every((effect) => effect && typeof effect === "object") &&
      Array.isArray(game.winningLines) &&
      ["human", "ai"].includes(data.config?.opponent) &&
      LEVELS.includes(data.config?.difficulty) &&
      ["X", "O"].includes(data.config?.humanMark) &&
      data.config.boardSize === size &&
      ["X", "O", "draws"].every(
        (key) => Number.isInteger(data.score?.[key]) && data.score[key] >= 0,
      )
    )
      return data;
  } catch {}
  return {
    config: DEFAULT_CONFIG,
    game: fresh(DEFAULT_CONFIG),
    score: { X: 0, O: 0, draws: 0 },
  };
}

async function prepareOffline() {
  if (!("serviceWorker" in navigator)) return false;
  const registration = await navigator.serviceWorker.register(
    "/local-play-sw.js",
    { scope: "/" },
  );
  await navigator.serviceWorker.ready;
  const worker = registration.active || registration.waiting;
  if (!worker) return false;
  const resources = [
    ...document.querySelectorAll('script[src],link[rel="stylesheet"]'),
  ].map((element) => element.src || element.href);
  resources.push(
    ...performance.getEntriesByType("resource").map((entry) => entry.name),
  );
  return new Promise((resolve) => {
    const channel = new MessageChannel();
    const timer = setTimeout(() => resolve(false), 15000);
    channel.port1.onmessage = (event) => {
      clearTimeout(timer);
      resolve(event.data?.ready === true);
    };
    worker.postMessage({ type: "CACHE_LOCAL_PLAY", resources }, [
      channel.port2,
    ]);
  });
}

export default function OfflineArena() {
  const [data, setData] = useState(null);
  const [offlineReady, setOfflineReady] = useState(false);
  const [error, setError] = useState("");
  const [options, setOptions] = useState(false);
  const [info, setInfo] = useState(false);
  const [pendingChange, setPendingChange] = useState(null);

  useEffect(() => {
    setData(restore());
    let alive = true;
    prepareOffline()
      .then((ready) => {
        if (alive) setOfflineReady(ready);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);
  useEffect(() => {
    if (data)
      try {
        localStorage.setItem(STORAGE, JSON.stringify(data));
      } catch {}
  }, [data]);
  const game = data?.game;
  const config = data?.config;
  const current = game?.players.find(
    (player) => player.id === game.currentPlayerId,
  );
  const aiTurn =
    game?.status === "active" &&
    config.opponent === "ai" &&
    current?.mark !== config.humanMark;

  function commit(cell, expectedRevision) {
    setData((previous) => {
      if (
        !previous ||
        previous.game.status !== "active" ||
        previous.game.revision !== expectedRevision
      )
        return previous;
      try {
        // Untimed local practice advances a logical clock, without server clocks or rewards.
        const next = applyAction(
          previous.game,
          previous.game.currentPlayerId,
          { type: "place", cell, revision: expectedRevision },
          previous.game.turnStartedAt + 1000,
        );
        const score = { ...previous.score };
        if (next.status === "finished") {
          const winner = next.players.find(
            (player) => player.id === next.matchWinnerId,
          );
          score[winner?.mark || "draws"] += 1;
        }
        return { ...previous, game: next, score };
      } catch (failure) {
        setError(failure.message);
        return previous;
      }
    });
  }
  useEffect(() => {
    if (!aiTurn) return;
    const timer = setTimeout(() => {
      const action = chooseAIAction(game, config.difficulty.toLowerCase());
      if (action?.type === "place") commit(action.cell, game.revision);
    }, 450);
    return () => clearTimeout(timer);
  }, [game?.revision, aiTurn, config?.difficulty]);

  function applyConfiguration(patch) {
    setError("");
    setData((previous) => {
      const next = { ...previous.config, ...patch };
      return {
        config: next,
        game: fresh(next),
        score: { X: 0, O: 0, draws: 0 },
      };
    });
  }
  function configure(patch) {
    if (game.status === "active" && game.board.some(Boolean)) {
      setPendingChange({ kind: "config", patch });
      return;
    }
    applyConfiguration(patch);
  }
  function restart() {
    if (game.status === "active" && game.board.some(Boolean)) {
      setPendingChange({ kind: "restart" });
      return;
    }
    setError("");
    setData((previous) => ({ ...previous, game: fresh(previous.config) }));
  }
  if (!game)
    return <div className="loading-state">Preparing your local board…</div>;
  const winner = game.players.find(
    (player) => player.id === game.matchWinnerId,
  );
  const finished = game.status === "finished";
  const winningCells = new Set(game.winningLines.flat());
  const size = boardSizeOf(game);

  return (
    <GameFrame className={styles.root} aria-label="Local classic arena">
      <div className={styles.heading}>
        <span className={styles.mode}>
          {config.opponent === "human" ? (
            <Users size={22} />
          ) : (
            <Bot size={22} />
          )}
          SAME DEVICE CLASSIC
        </span>
        <span className={styles.offline} role="status">
          <WifiOff size={17} />
          {offlineReady
            ? "Available offline on this browser"
            : "Local play · No account required"}
        </span>
        <GameButton
          variant="icon"
          aria-label="Local game information"
          onClick={() => setInfo(true)}
        >
          <Info size={22} />
        </GameButton>
        <GameButton variant="secondary" onClick={() => setOptions(true)}>
          <Settings2 size={20} />
          Local options
        </GameButton>
      </div>
      <div className={styles.arena}>
        <div className={styles.turn} aria-live="polite">
          {finished
            ? winner
              ? `${winner.name} wins as ${winner.mark}`
              : "A draw. Well played, both sides."
            : aiTurn
              ? `${current.name} is thinking…`
              : `${current.name} · ${current.mark} to move`}
        </div>
        {size > 3 && (
          <div
            className={styles.lineScore}
            aria-label="Three-in-a-row score"
            aria-live="polite"
          >
            {game.players.map((player) => (
              <span key={player.id} className={player.mark.toLowerCase()}>
                <b>{player.mark}</b>
                <strong>{game.roundScores?.[player.id] || 0}</strong>
                <small>lines</small>
              </span>
            ))}
          </div>
        )}
        <div className={styles.boardStage}>
          <div
            className={`game-board board-size-${size} ${styles.board}`}
            style={{
              gridTemplateColumns: `repeat(${size}, minmax(0,1fr))`,
              "--board-size": size,
            }}
            role="group"
            aria-label={
              size === 3
                ? "Local three by three classic board"
                : `Local ${size} by ${size} classic board`
            }
          >
            {game.board.map((owner, cell) => {
              const player = game.players.find((player) => player.id === owner);
              return (
                <button
                  className={`game-cell ${player?.mark?.toLowerCase() || ""} ${winningCells.has(cell) ? styles.winning : ""}`}
                  key={cell}
                  disabled={!!owner || finished || aiTurn}
                  aria-label={`Local row ${Math.floor(cell / size) + 1}, column ${(cell % size) + 1}: ${player?.mark || "empty"}`}
                  onClick={() => {
                    setError("");
                    commit(cell, game.revision);
                  }}
                >
                  {player && (
                    <span className={`mark ${player.mark.toLowerCase()}`}>
                      {player.mark === "X" ? <X /> : <Circle />}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
        {error && (
          <p role="alert" className={styles.error}>
            {error}
          </p>
        )}
        <div className={styles.bottom}>
          <div className={styles.score} aria-label="Local session score">
            <span>
              <X size={19} />
              {data.score.X}
              <small>X wins</small>
            </span>
            <span>
              <Sparkles size={19} />
              {data.score.draws}
              <small>Draws</small>
            </span>
            <span>
              <Circle size={19} />
              {data.score.O}
              <small>O wins</small>
            </span>
          </div>
          <GameButton onClick={restart}>
            <RefreshCw size={18} />
            New local game
          </GameButton>
        </div>
      </div>
      <Modal
        open={options}
        title="Your local arena"
        onClose={() => setOptions(false)}
      >
        <div className={styles.options}>
          <BoardSizePicker
            value={size}
            onChange={(boardSize) => configure({ boardSize })}
          />
          <CustomSelect
            label="Local game opponent"
            value={config.opponent}
            onChange={(opponent) => configure({ opponent })}
            options={[
              { value: "human", label: "Two players · same device" },
              { value: "ai", label: "Computer opponent" },
            ]}
          />
          {config.opponent === "ai" && (
            <>
              <CustomSelect
                label="AI difficulty"
                value={config.difficulty}
                onChange={(difficulty) => configure({ difficulty })}
                options={LEVELS.map((value) => ({ value, label: value }))}
              />
              <CustomSelect
                label="Play as mark"
                value={config.humanMark}
                onChange={(humanMark) => configure({ humanMark })}
                options={[
                  { value: "X", label: "X · Play first" },
                  { value: "O", label: "O · Play second" },
                ]}
              />
              <p>
                {size === 3
                  ? "Hard and above use complete classic search. Perfect play draws."
                  : "Larger boards use bounded competitive search. Complete as many lines of three as possible."}
              </p>
            </>
          )}
          <GameButton onClick={() => setOptions(false)}>PLAY</GameButton>
        </div>
      </Modal>
      <Modal
        open={info}
        title="Local game information"
        onClose={() => setInfo(false)}
      >
        <div className={styles.info}>
          <Trophy size={32} />
          <p>
            {size === 3
              ? "Three matching marks win. Nine cells. No powers. No timer."
              : "Every line of three scores. Highest score on a full board wins. No powers. No timer."}
          </p>
          <p>
            Two players on one device, or a computer opponent. Take your time.
          </p>
          <p>
            Settings start a fresh game and reset this local score. Your current
            game resumes after a reload.
          </p>
          <p>
            Local games award no cups, coins, XP, missions, or multiplayer
            results.
          </p>
        </div>
      </Modal>
      <Modal
        open={Boolean(pendingChange)}
        title="Start a new local game?"
        onClose={() => setPendingChange(null)}
      >
        <p className={styles.confirm}>
          {pendingChange?.kind === "config"
            ? "This replaces your saved board and resets the local session score."
            : "This replaces your saved board."}
        </p>
        <div className={styles.confirmActions}>
          <GameButton
            onClick={() => {
              if (pendingChange?.kind === "config")
                applyConfiguration(pendingChange.patch);
              else {
                setError("");
                setData((previous) => ({
                  ...previous,
                  game: fresh(previous.config),
                }));
              }
              setPendingChange(null);
            }}
          >
            New local game
          </GameButton>
          <GameButton
            variant="secondary"
            onClick={() => setPendingChange(null)}
          >
            Cancel
          </GameButton>
        </div>
      </Modal>
    </GameFrame>
  );
}
