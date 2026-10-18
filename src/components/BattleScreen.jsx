"use client";

import AnimatedCosmeticImage from "./AnimatedCosmeticImage";
import ArenaConnectionNotice from "./ArenaConnectionNotice";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  Activity,
  ArrowLeft,
  BookOpen,
  Check,
  Clock3,
  Copy,
  Eye,
  Flag,
  Gem,
  Hourglass,
  Home,
  Info,
  LockKeyhole,
  MessageCircle,
  Pause,
  Shield,
  Snowflake,
  Sparkles,
  Swords,
  Target,
  Trophy,
  VolumeX,
  Wifi,
  WifiOff,
  X,
  Zap,
} from "lucide-react";
import { GameButton, GameFrame, Modal } from "./ui";
import {
  CosmeticArrival,
  CosmeticFrame,
  CosmeticMark,
  CosmeticMotif,
} from "./CosmeticAppearance";
import {
  cosmeticAsset,
  cosmeticEmotes,
  cosmeticStyle,
  cosmeticTheme,
} from "../lib/cosmetic-collection";
import { boardSizeOf } from "../lib/game-engine/geometry";
import { POWER_INFO } from "./PowerPresentation";
import { ATTACKS, CastSequence, TurnSweep } from "./BattleJuice";
import VersusIntro, { versusDetail } from "./VersusIntro";
import { pingLabel, pingQuality } from "../lib/ping";
import AscendantFx, { fxTheme } from "./AscendantFx";
import PlayerTitle from "./PlayerTitle";
import { useClock } from "../lib/use-clock";
import PowerEffects from "./PowerEffects";
import PowerTargetControls, {
  CellStatuses,
  effectLabel,
  targetHint,
} from "./PowerTargetControls";
import EndMatchSummary from "./EndMatchSummary";
import styles from "./BattleScreen.module.css";
import { displayName } from "../lib/display-name";

const RANKS = [
  [3300, "Mythic"],
  [2500, "Legend"],
  [1900, "Grandmaster"],
  [1400, "Master"],
  [1000, "Diamond"],
  [700, "Platinum"],
  [450, "Gold"],
  [250, "Silver"],
  [100, "Bronze"],
  [0, "Rookie"],
];
const rank = (cups = 0) =>
  RANKS.find(([threshold]) => cups >= threshold)?.[1] || "Rookie";
const pretty = (value) => Number(value || 0).toLocaleString();
const EMOTE_LABELS = {
  star: "Star play!",
  snow: "Cool move!",
  sun: "Shine on!",
  crown: "Royal move!",
  wavecrest: "Ride the wave!",
  pearl: "Hidden gem!",
  leaf: "Stay rooted!",
  bloom: "Beautiful play!",
  bolt: "Lightning fast!",
  spark: "Great spark!",
  rose: "Graceful move!",
  heart: "Much love!",
  gear: "Perfect timing!",
  hourglass: "Take your time!",
  moon: "Moonlight magic!",
  lotus: "Find your calm!",
  flame: "Keep blazing!",
  anvil: "Well forged!",
  crystal: "Crystal clear!",
  aurora: "Brilliant play!",
  planet: "Out of this world!",
  comet: "Star streak!",
  supernova: "Supernova play!",
  infinity: "Beyond the stars!",
};

function BattleAvatar({
  player,
  profile,
  active,
  seconds,
  fraction,
  urgent,
  reducedMotion,
}) {
  const skin = player?.profile?.avatar || profile?.avatar || "avatar-void";
  const frame = player?.profile?.equippedFrame || profile?.equippedFrame;
  const effect = player?.profile?.equippedEffect || profile?.equippedEffect;
  const asset =
    cosmeticAsset(skin) ||
    `/assets/${{ "avatar-ember": "avatar-fire", "avatar-frost": "avatar-ice" }[skin] || skin}.webp`;
  return (
    <div
      className={`${styles.avatarRing} ${active ? styles.activeRing : ""} ${urgent && active ? styles.urgentRing : ""}`}
    >
      <svg className={styles.timerRing} viewBox="0 0 64 64" aria-hidden="true">
        <circle className={styles.timerTrack} cx="32" cy="32" r="29" />
        <circle
          className={styles.timerDrain}
          cx="32"
          cy="32"
          r="29"
          pathLength="100"
          strokeDasharray={`${active ? fraction * 100 : 0} 100`}
        />
      </svg>
      <div
        className={`avatar ${styles.avatar} ${cosmeticTheme(skin) ? "collection-avatar" : ""}`}
        style={{ ...cosmeticStyle(skin), ...cosmeticStyle(frame) }}
      >
        <span>{(player?.name || "Opponent").slice(0, 2).toUpperCase()}</span>
        <AnimatedCosmeticImage
          cosmeticId={skin}
          src={asset}
          alt=""
          onError={(event) => {
            event.currentTarget.style.display = "none";
          }}
        />
        <CosmeticFrame cosmeticId={frame} />
        <CosmeticArrival cosmeticId={effect} />
        {fxTheme(skin) && <AscendantFx theme={fxTheme(skin)} stars={3} className="asc-fx-small" />}
      </div>
      {active && (
        <span
          className={`${styles.avatarTimer} ${!reducedMotion && urgent ? styles.ticking : ""}`}
          aria-label={`${seconds} seconds remaining`}
        >
          {seconds}
        </span>
      )}
    </div>
  );
}

const titleCase = (text = "") =>
  String(text).replace(/^./, (letter) => letter.toUpperCase());

function EnergyOrbs({ amount = 0, opponent = false }) {
  return (
    <div
      className={`${styles.energy} ${opponent ? styles.enemyEnergy : ""}`}
      aria-label={`Energy: ${amount} of 6`}
    >
      <span>
        <Zap size={12} /> ENERGY <b>{amount}/6</b>
      </span>
      <div className="energy-pips">
        {Array.from({ length: 6 }, (_, index) => (
          <i
            key={index}
            className={index < amount ? "charged" : ""}
            aria-hidden="true"
          />
        ))}
      </div>
    </div>
  );
}

function PlayerHUD({
  player,
  profile,
  game,
  match,
  self,
  spectator,
  difficulty,
  active,
  seconds,
  fraction,
  urgent,
  bank,
  settings,
  disconnected = false,
}) {
  const scored = boardSizeOf(game) > 3;
  const participant = match.participants?.find(
    (item) => item.id === player?.id,
  );
  const subtitle = self
    ? match.mode === "ai"
      ? "Practice · No ranked cups"
      : `${rank(participant?.initialCups)} · ${pretty(participant?.initialCups)} cups`
    : match.rankedBot
      ? `${titleCase(match.difficulty)} · Competitive bot`
      : match.mode === "ai"
        ? `${titleCase(match.difficulty || difficulty)} AI · Practice`
        : `${rank(participant?.initialCups)} · ${player?.mark}`;
  return (
    <GameFrame
      variant="banner"
      className={`battle-player ${self ? "self" : "opponent"} ${styles.playerHUD} ${self ? styles.selfHUD : ""} ${active ? styles.activeHUD : ""}`}
    >
      {fxTheme(player?.profile?.equippedBanner || profile?.equippedBanner) && (
        <AscendantFx
          theme={fxTheme(player?.profile?.equippedBanner || profile?.equippedBanner)}
          edge
          stars={4}
          className="asc-fx-small asc-fx-thin"
        />
      )}
      <BattleAvatar
        player={player}
        profile={profile}
        active={active}
        seconds={seconds}
        fraction={fraction}
        urgent={urgent}
        reducedMotion={settings.reducedMotion}
      />
      <div className={styles.namePlate}>
        <strong>
          <span className={styles.playerName} data-ellipsis>
            {displayName(player?.name) || "Opponent"}
          </span>
          <PlayerTitle title={player?.profile?.title || (self ? profile?.title : null)} />
          {self && (
            <span className={styles.you}>
              {spectator ? "SPECTATING" : "YOU"} · {player?.mark}
            </span>
          )}
        </strong>
        <small className={disconnected ? styles.disconnectedPlayer : undefined} role={disconnected ? "status" : undefined}>
          {disconnected ? <WifiOff size={12} /> : <Trophy size={11} />}
          {disconnected ? "Opponent disconnected · clock continues" : subtitle}
        </small>
        <small
          className={`turn-bank ${styles.bank}`}
          aria-label={`Thinking bank: ${bank}s`}
        >
          <Hourglass size={11} />
          <span className={styles.bankPrefix}>Thinking bank:</span>{" "}
          <b>{bank}s</b>
        </small>
      </div>
      <div className={styles.hudRight}>
        {game.mode !== "classic" && (
          <EnergyOrbs
            amount={game.energy?.[player?.id] || 0}
            opponent={!self}
          />
        )}
        <div
          className={styles.roundGems}
          role="group"
          title={scored ? "Three-in-a-row points" : `Round wins: first to ${Math.ceil(game.maxRounds / 2)} wins the match`}
          aria-label={`${player?.name || "Opponent"}: ${scored ? game.roundScores?.[player?.id] || 0 : game.roundWins?.[player?.id] || 0} ${scored ? "points" : "round wins"}`}
        >
          {scored ? (
            <>
              <span>SCORE</span>
              <b>{game.roundScores?.[player?.id] || 0}</b>
            </>
          ) : (
            <>
            <span>WINS</span>
            {Array.from(
              { length: Math.ceil(game.maxRounds / 2) },
              (_, index) => (
                <Gem
                  key={index}
                  size={15}
                  className={
                    index < (game.roundWins?.[player?.id] || 0)
                      ? styles.wonGem
                      : ""
                  }
                  aria-hidden="true"
                />
              ),
            )}
            </>
          )}
        </div>
      </div>
      <span className={`player-turn-indicator ${active ? "active" : ""}`} />
    </GameFrame>
  );
}

function Intel({ game, opponent, scoredBattle }) {
  return (
    <div className={styles.intelContent}>
      {[
        [
          Shield,
          "Equal footing",
          game.mode === "classic"
            ? "Classic placements only. No powers."
            : "Three equipped powers. No paid advantages.",
        ],
        [
          Clock3,
          "Think, then strike",
          "One main action per turn. Time Warp extends only the clock.",
        ],
        [
          Zap,
          "Build your energy",
          game.mode === "classic"
            ? "Highest three-in-a-row score on larger boards. First line wins on 3×3."
            : "Each normal mark restores one energy. Capacity: six.",
        ],
      ].map(([Icon, title, description]) => (
        <div className={styles.intelItem} key={title}>
          <Icon size={23} />
          <div>
            <strong>{title}</strong>
            <p>{description}</p>
          </div>
        </div>
      ))}
      <h3>Opponent loadout</h3>
      <div className={styles.opponentPowers}>
        {opponent?.loadout?.map((id) => {
          const power = POWER_INFO.find((item) => item.id === id);
          return (
            power && (
              <div key={id} style={{ "--power-color": power.color }}>
                <power.icon size={27} />
                <div>
                  <strong>{power.name}</strong>
                  <p>{power.description}</p>
                </div>
                <b>
                  {power.cost}
                  <Zap size={12} />
                </b>
              </div>
            )
          );
        })}
      </div>
      <h3>{scoredBattle ? "Three-in-a-row points" : "Round score"}</h3>
      {game.players.map((player) => (
        <div className={styles.scoreRow} key={player.id}>
          <span>{player.name}</span>
          <strong>
            {(scoredBattle
              ? game.roundScores?.[player.id]
              : game.roundWins[player.id]) || 0}
          </strong>
        </div>
      ))}
    </div>
  );
}

function Timeline({ game }) {
  return (
    <div className={styles.timeline}>
      <div className={styles.timelineEntry}>
        <i />
        <div>
          <strong>Round {game.round}</strong>
          <p>
            {game.mode === "classic" ? "Classic rules" : "Elemental rules"} ·
            20-second turns
          </p>
        </div>
      </div>
      {game.roundHistory?.map((round, index) => (
        <div className={styles.timelineEntry} key={index}>
          <i />
          <div>
            <strong>Round {index + 1} complete</strong>
            <p>
              {round.winnerId
                ? `${game.players.find((player) => player.id === round.winnerId)?.name} won`
                : "Draw"}
            </p>
          </div>
        </div>
      ))}
      {game.lastEvent && (
        <div className={`${styles.timelineEntry} ${styles.currentEntry}`}>
          <i />
          <div>
            <strong>Last action</strong>
            <p>
              {game.lastEvent.type?.replaceAll("_", " ") || "Board updated"}
              {game.lastEvent.powerId
                ? ` · ${POWER_INFO.find((power) => power.id === game.lastEvent.powerId)?.name}`
                : ""}
            </p>
          </div>
        </div>
      )}
      <GameFrame variant="tooltip" className={styles.tip}>
        <Sparkles size={24} />
        <p>A shield can make an obvious line a much harder decision.</p>
      </GameFrame>
    </div>
  );
}

/** Presentation layer. All legal moves, clocks and results are supplied by ArenaApp. */
export default function BattleScreen({
  match,
  user,
  playerId,
  spectator,
  myTurn,
  busy,
  connected,
  connectionPhase = connected ? "connected" : "connecting",
  ping = null,
  pendingCell = null,
  onReconnect,
  opponentDisconnected = false,
  difficulty,
  settings,
  clockOffset = 0,
  me,
  opponent,
  selectedPower,
  source,
  emote,
  emoteSignal = null,
  muteEmotes,
  availableActions,
  selectedActions,
  effectAt,
  canTarget,
  clickCell,
  choosePower,
  castPower,
  setSelectedPower,
  setSource,
  setSurrender,
  setMuteEmotes,
  setEmote,
  emit,
  setError,
  setNotice,
  navigate,
  onAgain,
  rematchRequested,
  rematchOffer,
  onSound,
}) {
  const [drawer, setDrawer] = useState(null);
  const [roundBanner, setRoundBanner] = useState(null);
  const [intro, setIntro] = useState(match?.state?.status === "active");
  const [countdown, setCountdown] = useState("3");
  const game = match?.state;
  // The battle keeps its own clock: only this screen re-renders for the timers.
  const now = useClock(500, game?.status === "active");
  const bankSeconds = (id) => {
    const elapsed =
      game?.status === "active" && game.currentPlayerId === id
        ? Math.max(0, now + clockOffset - game.turnStartedAt)
        : 0;
    return Math.max(0, Math.ceil(((game?.remainingMs?.[id] || 0) - elapsed) / 1000));
  };
  const connectionReady = connected && connectionPhase === "connected";
  const previousRound = useRef(game?.round);
  const progressAtStart = useRef(null);
  const warnedSecond = useRef(null);
  const battleSize = boardSizeOf(game);
  const scoredBattle = battleSize > 3;
  const seconds =
    game?.status === "active"
      ? Math.max(0, Math.ceil((game.turnDeadline - (now + clockOffset)) / 1000))
      : 0;
  const turnDuration = Math.max(
    1,
    (game?.turnDeadline || 0) -
      (game?.turnClockStartedAt || game?.turnStartedAt || 0),
  );
  const fraction = Math.min(
    1,
    Math.max(
      0,
      ((game?.turnDeadline || 0) - (now + clockOffset)) / turnDuration,
    ),
  );
  const urgent = seconds <= 5;
  useEffect(() => {
    if (
      !spectator &&
      user?.id === playerId &&
      game?.status === "active" &&
      match?.matchId &&
      (progressAtStart.current?.matchId !== match.matchId ||
        progressAtStart.current?.playerId !== playerId)
    ) {
      progressAtStart.current = {
        matchId: match.matchId,
        playerId,
        xp: user?.xp ?? user?.profile?.xp ?? 0,
        level: user?.level ?? user?.profile?.level ?? 1,
      };
    }
  }, [match?.matchId, game?.status, user?.id, playerId, spectator]);
  useEffect(() => {
    if (!match?.matchId || game?.status !== "active") {
      setIntro(false);
      return;
    }
    try {
      const key = `ea:battle-intro:${match.matchId}`;
      if (sessionStorage.getItem(key) === "1") {
        setIntro(false);
        return;
      }
      sessionStorage.setItem(key, "1");
    } catch {}
    setIntro(true);
    setCountdown("3");
    let step = 0;
    const count = setInterval(() => {
      step += 1;
      setCountdown(["3", "2", "1", "FIGHT"][Math.min(step, 3)]);
    }, 480);
    const finish = setTimeout(() => {
      clearInterval(count);
      setIntro(false);
    }, 2000);
    return () => {
      clearInterval(count);
      clearTimeout(finish);
    };
  }, [match?.matchId]);
  const powerCast = POWER_INFO.find(
    (power) =>
      power.id ===
      (game?.lastEvent?.powerId || game?.lastEvent?.action?.powerId),
  );
  const reduced = Boolean(settings.reducedMotion);
  // Each new cast plays once: flash, callout, impacts and outcome labels.
  const [castShown, setCastShown] = useState(null);
  const [shake, setShake] = useState(false);
  const lastCast = useRef(game?.revision);
  useEffect(() => {
    if (!game || lastCast.current === game.revision) return;
    lastCast.current = game.revision;
    if (!powerCast) return;
    setCastShown(game.revision);
    const attack = ATTACKS.has(powerCast.id) && !reduced;
    if (attack) setShake(true);
    const clear = setTimeout(() => setCastShown(null), 1500),
      still = setTimeout(() => setShake(false), 700);
    return () => {
      clearTimeout(clear);
      clearTimeout(still);
    };
  }, [game?.revision]);
  // A gold sweep announces the start of your turn.
  const [turnSweep, setTurnSweep] = useState(null);
  const selectedPowerRef = useRef(selectedPower);
  const wasMyTurn = useRef(myTurn);
  useEffect(() => {
    const started = myTurn && !wasMyTurn.current;
    wasMyTurn.current = myTurn;
    if (!started || spectator || game?.status !== "active" || intro) return;
    if (selectedPowerRef.current) return;
    const key = `${game.round}:${game.turnNumber}`;
    const delay = castShown ? 1250 : 150;
    const timer = setTimeout(() => {
      if (!selectedPowerRef.current) setTurnSweep(key);
    }, delay);
    const clear = setTimeout(() => setTurnSweep(null), delay + 1100);
    return () => {
      clearTimeout(timer);
      clearTimeout(clear);
    };
  }, [myTurn]);
  const targeting = POWER_INFO.find((power) => power.id === selectedPower);
  // Choosing a power always wins over the turn sweep.
  useEffect(() => {
    selectedPowerRef.current = selectedPower;
    if (selectedPower) setTurnSweep(null);
  }, [selectedPower]);

  useEffect(() => {
    if (
      game?.status === "active" &&
      seconds > 0 &&
      seconds <= 5 &&
      warnedSecond.current !== `${game.turnNumber}:${seconds}`
    ) {
      warnedSecond.current = `${game.turnNumber}:${seconds}`;
      onSound?.("click");
    }
  }, [seconds, game?.status, game?.turnNumber, onSound]);

  useEffect(() => {
    if (!game?.round || previousRound.current === game.round) return;
    previousRound.current = game.round;
    setRoundBanner(game.round);
    const timer = setTimeout(() => setRoundBanner(null), 1500);
    return () => clearTimeout(timer);
  }, [game?.round]);

  const openDrawer = (id) => {
    onSound?.("click");
    setDrawer(id);
  };
  if (!game)
    return (
      <GameFrame className={styles.empty}>
        {user && <ArenaConnectionNotice phase={connectionPhase} onRetry={onReconnect} inBattle />}
        <Swords size={64} />
        <h2>Your next battle is waiting</h2>
        <p>Choose Ranked, Practice, or challenge a friend to begin.</p>
        <GameButton onClick={() => navigate("/")}>Back to Arena</GameButton>
      </GameFrame>
    );
  if (game.status === "finished")
    return (
      <div className={`${styles.resultContainer} ${!connectionReady ? styles.resultReconnecting : ""}`}>
        {!connectionReady && <ArenaConnectionNotice phase={connectionPhase} onRetry={onReconnect} />}
      <EndMatchSummary
        match={match}
        playerId={playerId}
        spectator={spectator}
        rematchRequested={rematchRequested}
        rematchOffer={rematchOffer}
        busy={busy || !connectionReady}
        onAgain={onAgain}
        onArena={() => navigate("/")}
        onReplay={() => navigate("/replay/" + match.matchId)}
        reducedMotion={settings.reducedMotion}
        initialProgress={
          progressAtStart.current?.matchId === match.matchId &&
          progressAtStart.current?.playerId === playerId
            ? progressAtStart.current
            : undefined
        }
        profile={user?.profile}
        onSound={onSound}
      />
      </div>
    );

  const mode =
    match.mode === "ai"
      ? "AI PRACTICE"
      : match.mode === "ranked"
        ? "RANKED ELEMENTAL"
        : match.mode === "classic"
          ? "CLASSIC BATTLE"
          : "FRIENDLY BATTLE";
  const cancelPower = () => {
    setSelectedPower(null);
    setSource(null);
  };
  const emoteChoices = [
    ["wave", "Good luck!"],
    ["wow", "Nice move!"],
    ["gg", "GG!"],
    ["think", "Thinking…"],
    ["fire", "What a play!"],
    ["shield", "Good defense!"],
    ...cosmeticEmotes(user?.profile?.equippedEmote).map((id) => [
      id,
      EMOTE_LABELS[id] || id,
    ]),
  ];
  // Collection emotes show their own signal art; Ascendant signals animate.
  const emoteTheme = cosmeticTheme(user?.profile?.equippedEmote);
  return (
    <section
      className={`${styles.screen} ${settings.reducedMotion ? styles.reduced : ""} battle-arena ${scoredBattle ? "scored-arena" : ""}`}
      style={{ "--board-size": battleSize }}
      aria-label="Elemental battle"
    >
      <header className={styles.battleTop}>
        <GameButton
          variant="icon"
          aria-label="Back to arena"
          onClick={() => (spectator ? navigate("/") : setSurrender(true))}
        >
          <ArrowLeft size={23} />
        </GameButton>
        <div className={styles.modePlate}>
          <span
            className={`connection ${styles.connectionSignal}`}
            data-quality={pingQuality(ping, connectionReady)}
            data-ping={pingLabel(ping, connectionReady)}
            title={connectionReady ? "Ping to the arena server" : "Connecting"}
            role="status"
            aria-label={
              connectionReady
                ? ping === null
                  ? "Arena connected, measuring ping"
                  : `Arena connected, ping ${ping} milliseconds`
                : "Connecting"
            }
          >
            {connectionReady ? (
              <Wifi size={13} aria-hidden="true" />
            ) : (
              <WifiOff size={13} aria-hidden="true" />
            )}
            {/* The text stays the connection status; the ping figure is drawn from data-ping. */}
            <span>{connectionReady ? "Arena connected" : "Connecting"}</span>
          </span>
          <strong>{mode}</strong>
          <span>
            {battleSize} × {battleSize} ·{" "}
            {scoredBattle
              ? "Most three-in-a-row points wins"
              : `Round ${game.round} of ${game.maxRounds}`}
            {match.rankedBot ? " · COMPETITIVE BOT" : ""}
          </span>
        </div>
        <div className={styles.topTools}>
          <GameButton
            variant="icon"
            aria-label="Battle intel"
            onClick={() => openDrawer("intel")}
          >
            <Info size={22} />
          </GameButton>
          <GameButton
            variant="icon"
            aria-label="Match timeline"
            onClick={() => openDrawer("timeline")}
          >
            <Activity size={22} />
          </GameButton>
          <GameButton
            variant="icon"
            aria-label="Battle menu"
            onClick={() => openDrawer("menu")}
          >
            <Pause size={22} />
          </GameButton>
        </div>
      </header>

      <PlayerHUD
        player={opponent}
        game={game}
        match={match}
        difficulty={difficulty}
        active={game.currentPlayerId === opponent?.id}
        seconds={seconds}
        fraction={fraction}
        urgent={urgent}
        bank={bankSeconds(opponent?.id)}
        settings={settings}
        disconnected={opponentDisconnected}
      />

      <div
        className={`turn-banner ${styles.turnBar} ${targeting && myTurn ? styles.turnTargeting : ""}`}
        style={{ "--target-color": targeting?.color }}
        aria-live="polite"
      >
        <motion.span
          key={`${game.currentPlayerId}:${game.turnNumber}:${selectedPower || ""}`}
          initial={
            settings.reducedMotion ? { opacity: 0 } : { opacity: 0, x: -20 }
          }
          animate={{ opacity: 1, x: 0 }}
          className={`${myTurn ? "your-turn" : ""} ${myTurn ? styles.yourTurn : ""}`}
        >
          {targeting && myTurn ? <targeting.icon size={17} /> : <Swords size={16} />}
          {spectator
            ? game.players.find((player) => player.id === game.currentPlayerId)
                ?.name + "’s turn"
            : myTurn && selectedPower
              ? targetHint(selectedPower, source)
              : myTurn
              ? "Your move, challenger"
              : match.mode === "ai"
                ? "Opponent is thinking…"
                : `${opponent?.name || "Opponent"}’s turn`}
        </motion.span>
        <span
          className={`turn-clock ${urgent ? "urgent" : ""} ${styles.clock}`}
        >
          <Clock3 size={16} />
          {seconds.toString().padStart(2, "0")}
          <small>s</small>
        </span>
      </div>

      <div className={styles.boardStage}>
        {!connectionReady && (
          <div className={styles.connectionOverlay}>
            <ArenaConnectionNotice phase={connectionPhase} onRetry={onReconnect} inBattle />
          </div>
        )}
        <div className={styles.pedestal}>
          <div
            className={`game-board board-size-${battleSize} ${styles.board} ${cosmeticTheme(user?.profile?.equippedBoard) ? "collection-board" : ""} ${targeting ? `targeting ${styles.targeting}` : ""} ${shake ? "board-shake" : ""} ${myTurn && !spectator ? styles.myTurnBoard : ""}`}
            style={{
              ...cosmeticStyle(user?.profile?.equippedBoard),
              gridTemplateColumns: `repeat(${battleSize}, minmax(0,1fr))`,
              "--board-size": battleSize,
              "--target-color": targeting?.color,
            }}
            data-cosmetic-theme={
              cosmeticTheme(user?.profile?.equippedBoard)?.id
            }
            role="group"
            aria-label={
              battleSize === 3
                ? "Three by three elemental game board"
                : `${battleSize} by ${battleSize} ${game.mode} game board`
            }
          >
            {game.board.map((value, index) => {
              // A just-tapped empty cell shows the player's own mark until the server confirms.
              const pending = !value && pendingCell === index;
              const player =
                game.players.find((item) => item.id === value) ||
                (pending ? game.players.find((item) => item.id === playerId) : undefined);
              const effect = effectAt(index);
              const markSkin =
                player?.profile?.equippedMark ||
                (player?.id === playerId ? user?.profile?.equippedMark : null);
              return (
                <motion.button
                  key={index}
                  layout={false}
                  className={`game-cell ${styles.cell} ${game.winningLines?.flat().includes(index) ? "winning" : ""} ${player?.mark?.toLowerCase() || ""} ${canTarget(index) && selectedPower ? "valid-target" : ""} ${source === index ? "selected-source" : ""} ${effect.shield ? "shielded" : ""} ${effect.locked ? "locked" : ""} ${effect.frozenUntil > game.turnNumber ? "frozen" : ""}`}
                  aria-label={`Row ${Math.floor(index / battleSize) + 1}, column ${(index % battleSize) + 1}: ${player?.mark || "empty"}${effectLabel(effect, game.turnNumber) ? `, ${effectLabel(effect, game.turnNumber)}` : ""}`}
                  disabled={!canTarget(index)}
                  onClick={() => clickCell(index)}
                  whileTap={settings.reducedMotion ? {} : { scale: 0.96 }}
                >
                  <span className={styles.tileRune} aria-hidden="true">
                    ✧
                  </span>
                  {player && (
                    <motion.span
                      key={`${player.id}-${index}`}
                      initial={
                        settings.reducedMotion
                          ? false
                          : { scale: 0.6, opacity: 0 }
                      }
                      animate={{ scale: 1, opacity: 1 }}
                      className={`mark ${player.mark.toLowerCase()} ${styles.mark} ${cosmeticTheme(markSkin) ? "collection-marks" : ""} ${pending ? styles.pendingMark : ""}`}
                      style={cosmeticStyle(markSkin)}
                    >
                      <CosmeticMark mark={player.mark} cosmeticId={markSkin} />
                    </motion.span>
                  )}
                  {effect.shield && (
                    <Shield className="cell-effect" size={15} />
                  )}
                  {effect.locked && <LockKeyhole size={27} />}
                  {effect.frozenUntil > game.turnNumber && (
                    <Snowflake className="cell-effect" size={16} />
                  )}
                  <CellStatuses
                    effect={effect}
                    turn={game.turnNumber}
                    players={game.players}
                  />
                  {!value && !effect.locked && canTarget(index) && (
                    <span className="cell-hover">
                      {selectedPower ? <Target size={23} /> : me?.mark}
                    </span>
                  )}
                </motion.button>
              );
            })}
            <PowerEffects
              boardSize={battleSize}
              event={game.lastEvent}
              revision={game.revision}
              reducedMotion={settings.reducedMotion}
              quality={settings.quality}
            />
            {castShown === game.revision && (
              <CastSequence
                event={game.lastEvent}
                revision={game.revision}
                playerId={playerId}
                players={game.players}
                boardSize={battleSize}
                reduced={reduced}
              />
            )}
            {fxTheme(user?.profile?.equippedBoard) && (
              <AscendantFx theme={fxTheme(user?.profile?.equippedBoard)} edge stars={8} />
            )}
            <TurnSweep
              show={Boolean(turnSweep)}
              turnKey={turnSweep}
              reduced={reduced}
            />
            {!!game.winningLines?.length && (
              <svg
                className={styles.winningBeams}
                viewBox={`0 0 ${battleSize * 100} ${battleSize * 100}`}
                aria-hidden="true"
              >
                {game.winningLines.map((line, index) => (
                  <line
                    key={index}
                    x1={(line[0] % battleSize) * 100 + 50}
                    y1={Math.floor(line[0] / battleSize) * 100 + 50}
                    x2={(line.at(-1) % battleSize) * 100 + 50}
                    y2={Math.floor(line.at(-1) / battleSize) * 100 + 50}
                  />
                ))}
              </svg>
            )}
          </div>
        </div>
        {scoredBattle && (
          <div
            className={`live-line-score ${styles.liveScore}`}
            aria-label="Three-in-a-row score"
            aria-live="polite"
          >
            {game.players.map((player) => (
              <span key={player.id} className={player.mark.toLowerCase()}>
                <b>{player.mark}</b>
                <strong>{game.roundScores?.[player.id] || 0}</strong>
                <small>lines</small>
                {game.lastEvent?.scoreChanges?.[player.id] !== undefined &&
                  game.lastEvent.scoreChanges[player.id] !== 0 && (
                    <i key={game.revision}>
                      {game.lastEvent.scoreChanges[player.id] > 0 ? "+" : ""}
                      {game.lastEvent.scoreChanges[player.id]}
                    </i>
                  )}
              </span>
            ))}
          </div>
        )}
        <AnimatePresence>
          {roundBanner && (
            <motion.div
              className={styles.roundBanner}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <Gem size={24} />
              ROUND {roundBanner}
            </motion.div>
          )}
        </AnimatePresence>
        {emote && (
          <motion.div
            key={emote}
            className={styles.emoteBubble}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            {cosmeticTheme(emoteSignal?.cosmeticId)?.emotes.includes(emoteSignal.id) ? (
              <span
                className={`emote-signal emote-signal-${cosmeticTheme(emoteSignal.cosmeticId).id}`}
                style={cosmeticStyle(emoteSignal.cosmeticId)}
                aria-hidden="true"
              >
                <CosmeticMotif name={emoteSignal.id} />
              </span>
            ) : (
              <MessageCircle size={19} />
            )}
            {emote}
          </motion.div>
        )}
        <div
          className={`battle-status ${styles.battleStatus}`}
          aria-live="polite"
        >
          <span>
            {emote ||
              (!connectionReady
                ? "Restoring your connection. The displayed board may be out of date."
                : opponentDisconnected
                  ? "Opponent disconnected. Keep playing; the server turn clock continues."
                : selectedPower
                ? targetHint(selectedPower, source)
                : myTurn
                  ? "Place your mark, or change the board with a power."
                  : "Watch the board. Your opportunity is coming.")}
          </span>
          {myTurn &&
            game.board.some(
              (owner, cell) =>
                owner === playerId &&
                game.effects[cell]?.poisonUntil > game.turnNumber,
            ) && (
              <button
                className={styles.curseInfo}
                aria-label="Your cursed mark will take a destructive hit after this action. Cleanse the curse or protect it with a shield."
                onClick={() => openDrawer("curse")}
              >
                <Info size={18} />
              </button>
            )}
        </div>
      </div>

      <PlayerHUD
        player={me}
        profile={user?.profile}
        game={game}
        match={match}
        self
        spectator={spectator}
        difficulty={difficulty}
        active={game.currentPlayerId === me?.id}
        seconds={seconds}
        fraction={fraction}
        urgent={urgent}
        bank={bankSeconds(me?.id)}
        settings={settings}
      />

      {game.mode !== "classic" && !spectator ? (
        <div className={`power-toolbar ${styles.hotbar}`}>
          {me?.loadout.map((id) => {
            const power = POWER_INFO.find((item) => item.id === id);
            if (!power) return null;
            const used =
              (game.uses?.[playerId]?.[id] || 0) > 0 ||
              (power.maxUsesPerMatch &&
                (game.matchUses?.[playerId]?.[id] || 0) >=
                  power.maxUsesPerMatch);
            return (
              <button
                key={id}
                className={`battle-power ${styles.powerCard} ${selectedPower === id ? "selected" : ""} ${used ? "used" : ""}`}
                disabled={
                  !myTurn ||
                  busy ||
                  !connectionReady ||
                  !availableActions.some(
                    (item) => item.type === "power" && item.powerId === id,
                  )
                }
                onClick={() => choosePower(id)}
                title={power.description}
                style={{ "--power-color": power.color }}
              >
                <span className={styles.powerArt}>
                  <power.icon size={32} />
                </span>
                <span className={styles.powerName}>
                  {power.name}
                  <small>
                    {used
                      ? power.maxUsesPerMatch
                        ? "Used this match"
                        : "Used this round"
                      : `${power.cost} energy · ${power.maxUsesPerMatch ? "1 / match" : power.consumesTurn === false ? "clock only" : "1 / round"}`}
                  </small>
                </span>
                <b className={styles.costGem}>
                  {used ? <Check size={15} /> : power.cost}
                </b>
                {used && (
                  <span className={styles.usedOverlay} aria-hidden="true">
                    <LockKeyhole size={19} />
                  </span>
                )}
              </button>
            );
          })}
          {selectedPower ? (
            <GameButton
              variant="secondary"
              onClick={cancelPower}
              className={styles.cancelTarget}
            >
              <X size={17} />
              Cancel
            </GameButton>
          ) : (
            <GameButton
              variant="icon"
              className={styles.emoteTrigger}
              aria-label="Match emotes"
              onClick={() => openDrawer("emotes")}
            >
              <MessageCircle size={24} />
            </GameButton>
          )}
        </div>
      ) : (
        <div className={styles.classicFooter}>
          <Shield size={18} />
          {spectator ? "Read-only spectator" : "Server-validated moves"}
          {!spectator && (
            <GameButton
              variant="icon"
              aria-label="Match emotes"
              onClick={() => openDrawer("emotes")}
            >
              <MessageCircle size={24} />
            </GameButton>
          )}
        </div>
      )}

      {selectedPower && ["gravity", "dragon"].includes(selectedPower) && (
        <Modal
          title={targetHint(selectedPower, source)}
          onClose={cancelPower}
          className={styles.targetModal}
        >
          <PowerTargetControls
            boardSize={battleSize}
            id={selectedPower}
            actions={selectedActions}
            onAction={castPower}
            disabled={!myTurn || busy || !connectionReady}
          />
          <GameButton variant="secondary" onClick={cancelPower}>
            Cancel
          </GameButton>
        </Modal>
      )}

      {drawer && (
        <Modal
          title={
            drawer === "intel"
              ? "Battle intel"
              : drawer === "timeline"
                ? "Match timeline"
                : drawer === "emotes"
                  ? "Match emotes"
                  : drawer === "curse"
                    ? "Cursed mark"
                    : "Battle menu"
          }
          onClose={() => setDrawer(null)}
          className={`${drawer === "intel" || drawer === "timeline" ? styles.drawer : styles.menuModal} ${drawer === "emotes" ? styles.emoteModal : ""}`}
        >
          {drawer === "intel" && (
            <Intel
              game={game}
              opponent={opponent}
              scoredBattle={scoredBattle}
            />
          )}
          {drawer === "timeline" && <Timeline game={game} />}
          {drawer === "curse" && (
            <p>
              Your cursed mark will take a destructive hit after this action.
              Cleanse the curse or protect it with a shield.
            </p>
          )}
          {drawer === "menu" && (
            <div className={`battle-controls ${styles.menuControls}`}>
              <GameButton
                variant="secondary"
                onClick={() => setDrawer("intel")}
              >
                <Info size={20} />
                Battle intel
              </GameButton>
              {!spectator && game.status === "active" && (
                <GameButton
                  variant="secondary"
                  aria-label="Arena hub, match continues"
                  onClick={() => {
                    setDrawer(null);
                    navigate("/");
                  }}
                >
                  <Home size={20} />
                  Arena hub · match continues
                </GameButton>
              )}
              <GameButton
                variant="secondary"
                onClick={() => {
                  setMuteEmotes((value) => !value);
                  setEmote("");
                }}
              >
                <VolumeX size={20} />
                {muteEmotes ? "Unmute emotes" : "Mute emotes"}
              </GameButton>
              <GameButton
                variant="secondary"
                aria-label="Game rules"
                onClick={() => navigate("/rules")}
              >
                <BookOpen size={20} />
                Game rules
              </GameButton>
              {match.allowSpectators && (
                <GameButton
                  variant="secondary"
                  onClick={() =>
                    navigator.clipboard
                      .writeText(
                        window.location.origin + "/watch/" + match.matchId,
                      )
                      .then(() => setNotice("Spectator link copied."))
                      .catch(() => setNotice("Match ID: " + match.matchId))
                  }
                >
                  <Eye size={20} />
                  Share spectator link
                </GameButton>
              )}
              <GameButton
                variant="danger"
                disabled={game.status !== "active" || spectator || !connectionReady}
                onClick={() => {
                  setDrawer(null);
                  setSurrender(true);
                }}
              >
                <Flag size={20} />
                Surrender
              </GameButton>
              <small>
                {spectator ? "Read-only spectator" : "Server-validated moves"}
              </small>
              {match.allowSpectators && (
                <small>
                  {spectator
                    ? "Read-only live view"
                    : "This match allows spectators."}
                </small>
              )}
            </div>
          )}
          {drawer === "emotes" && (
            <div
              className={`${styles.emoteWheel} ${emoteChoices.length > 6 ? styles.emoteGrid : ""}`}
              aria-label="Match emotes"
              style={{ "--emote-count": emoteChoices.length }}
            >
              <span className={styles.emoteWheelCenter} aria-hidden="true">
                <MessageCircle size={31} />
              </span>
              {emoteChoices.map(([id, label], index) => (
                <GameButton
                  key={id}
                  variant="secondary"
                  disabled={!connectionReady || game.status !== "active"}
                  style={{ "--emote-index": index }}
                  onClick={() => {
                    emit("match:emote", {
                      matchId: match.matchId,
                      emote: id,
                    }).catch((error) => setError(error.message));
                    setDrawer(null);
                  }}
                >
                  {emoteTheme?.emotes.includes(id) ? (
                    <span
                      className={`emote-signal emote-signal-${emoteTheme.id}`}
                      style={cosmeticStyle(user?.profile?.equippedEmote)}
                      aria-hidden="true"
                    >
                      <CosmeticMotif name={id} />
                    </span>
                  ) : (
                    <span aria-hidden="true">
                      {["✦", "✧", "◇", "⌁", "♨", "◈"][index % 6]}
                    </span>
                  )}
                  {label}
                </GameButton>
              ))}
            </div>
          )}
        </Modal>
      )}
      <AnimatePresence>
        {intro && connectionReady && (
          <VersusIntro
            key="versus"
            reduced={reduced}
            countdown={countdown}
            onSkip={() => setIntro(false)}
            me={{
              name: displayName(me?.name),
              skin: me?.profile?.avatar || user?.profile?.avatar,
              title: me?.profile?.title || user?.profile?.title,
              detail: versusDetail(match, me, difficulty, rank, pretty, true),
            }}
            opponent={{
              name: displayName(opponent?.name) || "Opponent",
              skin: opponent?.profile?.avatar,
              title: opponent?.profile?.title,
              detail: versusDetail(match, opponent, difficulty, rank, pretty, false),
            }}
          />
        )}
      </AnimatePresence>
    </section>
  );
}
