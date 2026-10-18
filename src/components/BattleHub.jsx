"use client";

import AnimatedCosmeticImage, { useGameReducedMotion } from "./AnimatedCosmeticImage";
import AscendantFx, { fxTheme } from "./AscendantFx";
import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
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
  Check,
  Coins,
} from "lucide-react";
import {
  GameFrame,
  GameButton,
  Modal,
  ProgressBar,
  NotificationDot,
} from "./ui";
import { readyMissionCount, readySeasonTiers } from "./usePendingCounts";
import { countdownTo, nextUtcMidnight } from "../lib/time-format";
import { useClock } from "../lib/use-clock";
import { displayName } from "../lib/display-name";
import BoardSizePicker from "./BoardSizePicker";
import { COSMETIC_THEMES, cosmeticAsset } from "../lib/cosmetic-collection";
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
  const [page, setPage] = useState(0);
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
          compact
        />
        <div
          className={styles.modeCarousel}
          aria-label="Battle modes"
          onScroll={(event) => {
            const row = event.currentTarget,
              card = row.firstElementChild;
            if (card)
              setPage(
                Math.round(row.scrollLeft / (card.getBoundingClientRect().width + 10)),
              );
          }}
        >
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
              {id === "ranked" && (
                <small className={styles.cardDisclosure}>
                  <Shield size={12} aria-hidden="true" />
                  {disclosure}
                </small>
              )}
            </GameFrame>
          ))}
        </div>
        <div className={styles.modeDots} aria-hidden="true">
          {modes.map(({ id }, index) => (
            <i key={id} data-active={index === page} />
          ))}
        </div>

      </div>
    </Modal>
  );
}

export default function BattleHub({
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
  pending = {},
  onClaimDaily,
}) {
  // The daily countdown ticks here only, not across the whole app.
  const now = useClock(1000);
  const [mode, setMode] = useState("ranked"),
    [selector, setSelector] = useState(false),
    [policy, setPolicy] = useState(false),
    [claiming, setClaiming] = useState(false),
    [burst, setBurst] = useState(0),
    reduce = useGameReducedMotion() || reducedMotion;
  const events = pending.data || {};
  const daily = events.missions?.daily,
    dailyReady = !!daily && !daily.claimedToday,
    dailyClaimed = !!daily?.claimedToday,
    nextDaily = countdownTo(
      events.missions?.dailyResetAt || nextUtcMidnight(now),
      now,
    );
  const seasonXp = Number(events.season?.xp || 0),
    nextTier =
      events.season?.tiers?.find((tier) => tier.requiredXp > seasonXp) ||
      events.season?.tiers?.at(-1);
  const seasonReady = readySeasonTiers(events.season),
    readyMissions = readyMissionCount(events.missions);
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
  const claimDaily = async () => {
    if (claiming || !onClaimDaily) return;
    setClaiming(true);
    const result = await onClaimDaily();
    setClaiming(false);
    if (result) setBurst((value) => value + 1);
  };
  const avatar =
    cosmeticAsset(user?.profile?.avatar) ||
    `/assets/${{ "avatar-ember": "avatar-fire", "avatar-frost": "avatar-ice" }[user?.profile?.avatar] || user?.profile?.avatar || "avatar-void"}.webp`;
  const titleTheme = COSMETIC_THEMES.find(
    (theme) => theme.title === user?.profile?.title,
  );
  return (
    <section className={styles.hub} aria-label="Battle hub">
      <div className={styles.hubTop}>
        <div className={styles.season} title={events.season?.season?.name}>
          <Crown size={18} />
          <span data-ellipsis>ELEMENTAL AWAKENING</span>
        </div>
        <GameButton
          variant="secondary"
          onClick={() => setSelector(true)}
          aria-label="Select battle mode"
        >
          <Swords size={18} />
          <span data-ellipsis>{selected.label}</span>
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
          <b>{Number(user?.cups || 0).toLocaleString()}</b>
          <ProgressBar value={rankProgress} label="Division progress" />
          <small>{rankProgress > 0 ? "TROPHY ROAD" : "0 / 100"}</small>
        </button>
        <motion.div
          className={styles.guardian}
          animate={reduce ? { opacity: 1 } : { y: [0, -8, 0] }}
          transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
        >
          <span className={styles.aura} />
          <AnimatedCosmeticImage
            cosmeticId={user?.profile?.avatar}
            src={avatar}
            alt={`${user?.name || "Your"} equipped arena guardian`}
          />
          {fxTheme(user?.profile?.avatar) && (
            <AscendantFx theme={fxTheme(user?.profile?.avatar)} stars={10} sweep glow />
          )}
          <span className={styles.pedestal} />
          <div
            className={`${styles.nameplate} ${titleTheme ? "collection-profile-title" : ""}`}
            data-cosmetic-theme={titleTheme?.id}
            data-ellipsis
          >
            {user?.profile?.title || displayName(user?.name) || "CHALLENGER"}
          </div>
        </motion.div>
        <div className={styles.events}>
          <button
            className={`reward-card ${styles.eventTile}`}
            data-state={
              dailyReady ? "ready" : dailyClaimed ? "claimed" : "progress"
            }
            aria-label={
              dailyReady
                ? "Claim daily reward"
                : dailyClaimed
                  ? `Daily reward claimed. Next in ${nextDaily}`
                  : "View rewards"
            }
            disabled={claiming}
            onClick={() => (dailyReady ? claimDaily() : navigate("/missions"))}
          >
            <Gift size={24} className="reward-icon" />
            <span>
              <strong>DAILY</strong>
              {dailyReady ? (
                <small className={styles.claimReady}>CLAIM</small>
              ) : dailyClaimed ? (
                <small>Next in {nextDaily}</small>
              ) : null}
            </span>
            {dailyReady && (
              <NotificationDot count={1} label="Daily reward ready" />
            )}
            {dailyClaimed && (
              <span className={styles.tileCheck} aria-hidden="true">
                <Check size={12} />
              </span>
            )}
            <AnimatePresence>
              {burst > 0 && !reduce && (
                <motion.span
                  key={burst}
                  className={styles.coinBurst}
                  aria-hidden="true"
                  initial={{ opacity: 1 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  {Array.from({ length: 7 }, (_, i) => (
                    <motion.i
                      key={i}
                      initial={{ opacity: 1, x: 0, y: 0, scale: 0.6 }}
                      animate={{
                        opacity: 0,
                        x: Math.cos((i / 7) * Math.PI * 2) * 46,
                        y: Math.sin((i / 7) * Math.PI * 2) * 46 - 30,
                        scale: 1.1,
                      }}
                      transition={{ duration: 0.9, ease: "easeOut" }}
                    >
                      <Coins size={16} />
                    </motion.i>
                  ))}
                </motion.span>
              )}
            </AnimatePresence>
          </button>
          <button
            className={`reward-card ${styles.eventTile}`}
            data-state={seasonReady ? "ready" : "progress"}
            aria-label="Season pass"
            onClick={() => navigate("/season-pass")}
          >
            <Crown size={24} className="reward-icon" />
            <span>
              <strong>SEASON</strong>
              {seasonReady ? (
                <small className={styles.claimReady}>CLAIM</small>
              ) : nextTier ? (
                <small>
                  {Math.min(seasonXp, nextTier.requiredXp)}/
                  {nextTier.requiredXp} XP
                </small>
              ) : null}
            </span>
            <NotificationDot
              count={seasonReady}
              label={`${seasonReady} season rewards ready`}
            />
          </button>
          <button
            className={`reward-card ${styles.eventTile}`}
            data-state={readyMissions ? "ready" : "progress"}
            aria-label="Missions"
            onClick={() => navigate("/missions")}
          >
            <Target size={24} className="reward-icon" />
            <span>
              <strong>MISSIONS</strong>
              {readyMissions > 0 && (
                <small className={styles.claimReady}>CLAIM</small>
              )}
            </span>
            <NotificationDot
              count={readyMissions}
              label={`${readyMissions} missions ready`}
            />
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
          {loadout.map((id) => {
            const power = POWER_INFO.find((item) => item.id === id);
            if (!power) return null;
            const Icon = power.icon;
            return (
              <button
                key={id}
                style={{ "--power-color": power.color }}
                onClick={() => navigate("/powers")}
                aria-label={`Edit loadout: ${power.name}`}
              >
                <Icon size={22} />
                <strong data-ellipsis>{power.name}</strong>
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
        {mode === "ranked" && (
          <button
            type="button"
            className={styles.disclosureCopy}
            onClick={() => setPolicy(true)}
            aria-label="Ranked bot policy"
          >
            <Shield size={13} aria-hidden="true" />
            <span>{disclosure}</span>
          </button>
        )}
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
