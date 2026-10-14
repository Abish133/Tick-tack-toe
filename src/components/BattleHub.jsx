"use client";

import { useState, useEffect } from "react";
import { motion, useReducedMotion } from "motion/react";
import {
  Swords,
  Trophy,
  Gift,
  Crown,
  Target,
  Layers3,
  Orbit,
  Users,
  Eye,
  BookOpen,
  WandSparkles,
  ChevronDown,
  Shield,
  Info,
  Play,
  Clock3,
} from "lucide-react";
import { GameFrame, GameButton, Modal, ProgressBar } from "./ui";
import BoardSizePicker from "./BoardSizePicker";
import { cosmeticAsset } from "../lib/cosmetic-collection";
import { POWER_INFO } from "./PowerPresentation";
import styles from "./BattleHub.module.css";

const modes = [
  {
    id: "ranked",
    label: "Ranked Elemental",
    actionName: "Play Ranked",
    icon: Swords,
    art: "arena-solar",
    help: "Three powers. Every move matters.",
  },
  {
    id: "practice",
    label: "Practice Arena",
    actionName: "Practice Arena",
    icon: Orbit,
    art: "arena-lunar",
    help: "Seven AI difficulties.",
  },
  {
    id: "friend",
    label: "Challenge a Friend",
    actionName: "Challenge a Friend",
    icon: Users,
    art: "arena-jade",
    help: "Create a private room.",
  },
  {
    id: "classic",
    label: "Classic",
    actionName: "Play Classic",
    icon: Layers3,
    art: "arena-clockwork",
    help: "Pure marks. No powers.",
  },
  {
    id: "quick",
    label: "Quick Match",
    actionName: "Quick Match",
    icon: Play,
    art: "arena-storm",
    help: "Find a human opponent.",
  },
  {
    id: "local",
    label: "Local & offline play",
    actionName: "Play locally",
    icon: Layers3,
    art: "arena-arctic",
    help: "Same device or offline AI.",
  },
  {
    id: "puzzle",
    label: "Daily Puzzle",
    actionName: "Daily Puzzle",
    icon: Target,
    art: "arena-rose",
    help: "One puzzle. One winning move.",
  },
  {
    id: "tutorial",
    label: "Tutorial",
    actionName: "How to play",
    icon: BookOpen,
    art: "arena-emberglass",
    help: "Learn in three short lessons.",
  },
  {
    id: "tournaments",
    label: "Tournaments",
    actionName: "Tournaments",
    icon: Crown,
    art: "arena-nebula",
    help: "Enter a knockout competition.",
  },
  {
    id: "spectate",
    label: "Spectate",
    actionName: "Spectate",
    icon: Eye,
    art: "arena-abyss",
    help: "Watch a live battle.",
  },
];
const disclosure =
  "If no real world players are found you'll play against a competitive bot";

export function ModeSelect({
  open,
  onClose,
  onChoose,
  boardSize,
  onBoardSize,
  busy = false,
}) {
  return (
    <Modal
      open={open}
      title="Choose your battle"
      subtitle="SELECT MODE"
      fullScreen
      onClose={onClose}
      className={styles.modeModal}
    >
      <div className={styles.modeSelector}>
        <BoardSizePicker
          value={boardSize}
          onChange={onBoardSize}
          disabled={busy}
        />
        <div className={styles.modeCarousel} aria-label="Battle modes">
          {modes.map(({ id, label, icon: Icon, art, help }) => (
            <GameFrame
              variant="card"
              key={id}
              className={styles.modeCard}
              style={{ "--mode-art": `url('/assets/collection/${art}.webp')` }}
            >
              <button onClick={() => onChoose(id)} aria-label={label}>
                <Icon size={38} />
                <h3>{label}</h3>
                <p>{help}</p>
                <span>{id === "ranked" ? "RANKED" : "PLAY"}</span>
              </button>
            </GameFrame>
          ))}
        </div>
        <p className={styles.disclosure}>
          <Shield size={16} />
          {disclosure}
        </p>
      </div>
    </Modal>
  );
}

export default function BattleHub({
  api,
  now = Date.now(),
  user,
  boardSize,
  setBoardSize,
  loadout,
  busy,
  queue,
  rankLabel,
  rankProgress,
  navigate,
  queueUp,
  onPractice,
  onFriend,
  onSpectate,
  activeMatch = false,
  reducedMotion = false,
}) {
  const [mode, setMode] = useState("ranked"),
    [selector, setSelector] = useState(false),
    [policy, setPolicy] = useState(false),
    reduce = useReducedMotion() || reducedMotion;
  const [events, setEvents] = useState({});
  useEffect(() => {
    let active = true;
    if (!user?.id || !api) {
      setEvents({});
      return;
    }
    Promise.allSettled([api("/missions"), api("/season-pass")]).then(
      ([missions, season]) => {
        if (active)
          setEvents({
            missions: missions.status === "fulfilled" ? missions.value : null,
            season: season.status === "fulfilled" ? season.value : null,
          });
      },
    );
    return () => {
      active = false;
    };
  }, [api, user?.id, user?.coins, user?.xp]);
  const seasonXp = Number(events.season?.xp || 0),
    nextTier =
      events.season?.tiers?.find((tier) => tier.requiredXp > seasonXp) ||
      events.season?.tiers?.at(-1);
  const readyMissions = [
    ...(events.missions?.missions || []),
    ...(events.missions?.weeklyMissions || []),
  ].filter(
    (mission) => !mission.claimed && mission.progress >= mission.target,
  ).length;
  const dailySeconds = Math.max(
      0,
      Math.ceil(
        (new Date(
          events.missions?.dailyResetAt || Math.ceil(now / 86400000) * 86400000,
        ).getTime() -
          now) /
          1000,
      ),
    ),
    dailyCountdown = `${Math.floor(dailySeconds / 3600)}:${String(Math.floor(dailySeconds / 60) % 60).padStart(2, "0")}:${String(dailySeconds % 60).padStart(2, "0")}`;
  const selected = modes.find((item) => item.id === mode) || modes[0];
  const launch = (id) => {
    if (["ranked", "classic", "quick"].includes(id)) queueUp(id);
    else if (id === "practice") onPractice();
    else if (id === "friend") onFriend();
    else if (id === "spectate") onSpectate();
    else
      navigate(
        {
          local: "/local-play",
          puzzle: "/daily-puzzle",
          tutorial: "/tutorial",
          tournaments: "/tournaments",
        }[id],
      );
  };
  const choose = (id) => {
    setMode(id);
    setSelector(false);
    if (!["ranked", "classic", "quick"].includes(id)) launch(id);
  };
  const avatar =
    cosmeticAsset(user?.profile?.avatar) ||
    `/assets/${{ "avatar-ember": "avatar-fire", "avatar-frost": "avatar-ice" }[user?.profile?.avatar] || user?.profile?.avatar || "avatar-void"}.png`;
  return (
    <section className={styles.hub} aria-label="Battle hub">
      <div className={styles.hubTop}>
        <div className={styles.season}>
          <Crown size={18} />
          <span>ELEMENTAL AWAKENING</span>
        </div>
        <GameButton
          variant="secondary"
          onClick={() => setSelector(true)}
          aria-label="Select battle mode"
        >
          <Swords size={18} />
          {selected.label}
          <ChevronDown size={16} />
        </GameButton>
      </div>
      <div className={styles.characterStage}>
        <button
          className={styles.rankPlate}
          aria-label="View leaderboards"
          onClick={() => navigate("/leaderboard")}
        >
          <Trophy size={44} />
          <strong>{rankLabel}</strong>
          <b>{Number(user?.cups || 0).toLocaleString()}</b>
          <ProgressBar value={rankProgress} label="Division progress" />
          <small>TROPHY ROAD</small>
        </button>
        <motion.div
          className={styles.guardian}
          animate={reduce ? { opacity: 1 } : { y: [0, -8, 0] }}
          transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
        >
          <span className={styles.aura} />
          <img
            src={avatar}
            alt={`${user?.name || "Your"} equipped arena guardian`}
          />
          <span className={styles.pedestal} />
          <div className={styles.nameplate}>
            {user?.profile?.title || user?.name || "CHALLENGER"}
          </div>
        </motion.div>
        <div className={styles.events}>
          <button
            aria-label="View rewards"
            onClick={() => navigate("/missions")}
          >
            <Gift size={28} />
            <span>
              DAILY REWARD
              {events.missions?.daily?.claimedToday ? (
                <small>{dailyCountdown}</small>
              ) : events.missions?.daily ? (
                <small className={styles.claimReady}>CLAIM</small>
              ) : null}
            </span>
          </button>
          <button
            aria-label="Season pass"
            onClick={() => navigate("/season-pass")}
          >
            <Crown size={28} />
            <span>
              SEASON PASS
              {nextTier && (
                <ProgressBar
                  value={Math.min(seasonXp, nextTier.requiredXp)}
                  max={nextTier.requiredXp}
                  label="Current season tier progress"
                />
              )}
            </span>
          </button>
          <button aria-label="Missions" onClick={() => navigate("/missions")}>
            <Target size={28} />
            <span>MISSIONS</span>
            {readyMissions > 0 && (
              <b className={styles.missionBadge}>{readyMissions}</b>
            )}
          </button>
        </div>
        {activeMatch && (
          <GameButton
            className={styles.resume}
            onClick={() => navigate("/battle")}
            aria-label="Resume battle"
          >
            <Play size={18} />
            RESUME BATTLE
          </GameButton>
        )}
      </div>
      <div className={styles.launchZone}>
        <div className={styles.loadoutFan} aria-label="Three equipped powers">
          {loadout.map((id, index) => {
            const power = POWER_INFO.find((item) => item.id === id);
            if (!power) return null;
            const Icon = power.icon;
            return (
              <button
                key={id}
                style={{
                  "--power-color": power.color,
                  "--card-rotate": `${(index - 1) * 7}deg`,
                }}
                onClick={() => navigate("/powers")}
                aria-label={`Edit loadout: ${power.name}`}
              >
                <Icon size={25} />
                <strong>{power.name}</strong>
                <span>
                  {power.cost}
                  <small> ENERGY</small>
                </span>
              </button>
            );
          })}
          <button
            className={styles.editLoadout}
            onClick={() => navigate("/powers")}
            aria-label="Edit loadout"
          >
            <WandSparkles size={20} />
          </button>
        </div>
        <BoardSizePicker
          value={boardSize}
          onChange={setBoardSize}
          disabled={busy || !!queue}
        />
        <GameButton
          size="lg"
          className={styles.battle}
          disabled={busy}
          onClick={() => launch(mode)}
          aria-label={selected.actionName}
        >
          <Swords size={26} />
          <span>
            BATTLE
            <small>
              {selected.label} · {boardSize} × {boardSize}
            </small>
          </span>
          <Swords size={26} />
        </GameButton>
        <div className={styles.policy}>
          <Shield size={14} />
          <span>
            {mode === "ranked"
              ? "Hard or above · ranked bot fallback"
              : "Choose your strategy"}
          </span>
          <GameButton
            variant="icon"
            onClick={() => setPolicy(true)}
            aria-label="Ranked bot policy"
          >
            <Info size={17} />
          </GameButton>
        </div>
        <span className={styles.disclosureCopy}>{disclosure}</span>
      </div>
      <ModeSelect
        open={selector}
        onClose={() => setSelector(false)}
        onChoose={choose}
        boardSize={boardSize}
        onBoardSize={setBoardSize}
        busy={busy}
      />
      <Modal
        open={policy}
        title="Ranked matchmaking"
        onClose={() => setPolicy(false)}
      >
        <p>{disclosure}</p>
        <p>Hard or above · difficulty scales with trophies</p>
        <p>
          <Clock3 size={16} /> 20 seconds per turn. Three equipped powers.
        </p>
      </Modal>
    </section>
  );
}
