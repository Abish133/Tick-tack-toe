"use client";

import AscendantFx, { fxTheme } from "./AscendantFx";
import AnimatedCosmeticImage from "./AnimatedCosmeticImage";
import { useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  CheckCircle2,
  Coins,
  Crown,
  Play,
  RefreshCw,
  Shield,
  Trophy,
  Zap,
} from "lucide-react";
import { GameButton, GameFrame, Modal, ProgressBar } from "./ui";
import { CosmeticArrival, CosmeticFrame } from "./CosmeticAppearance";
import { cosmeticAsset, cosmeticStyle } from "../lib/cosmetic-collection";
import styles from "./BattleScreen.module.css";

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
const rank = (cups) =>
  RANKS.find(([threshold]) => cups >= threshold)?.[1] || "Rookie";
function roadProgress(cups) {
  const current =
    RANKS.find(([threshold]) => cups >= threshold) || RANKS.at(-1);
  const next = [...RANKS].reverse().find(([threshold]) => threshold > cups);
  return next
    ? Math.min(
        100,
        Math.max(0, ((cups - current[0]) / (next[0] - current[0])) * 100),
      )
    : 100;
}

function RewardNumber({ value = 0, reducedMotion, prefix = "" }) {
  const [display, setDisplay] = useState(reducedMotion ? value : 0);
  useEffect(() => {
    if (reducedMotion) {
      setDisplay(value);
      return;
    }
    const start = performance.now();
    let frame;
    const animate = (time) => {
      const progress = Math.min(1, (time - start) / 900);
      setDisplay(Math.round(value * (1 - (1 - progress) ** 3)));
      if (progress < 1) frame = requestAnimationFrame(animate);
    };
    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [value, reducedMotion]);
  return (
    <strong>
      {prefix}
      {display.toLocaleString()}
    </strong>
  );
}

/** Result numbers come only from the existing server settlement. */
export default function EndMatchSummary({
  match,
  playerId,
  spectator,
  onAgain,
  onArena,
  onReplay,
  rematchRequested,
  rematchOffer,
  busy,
  reducedMotion = false,
  profile,
  initialProgress,
  onSound,
}) {
  const own = match.participants?.find(
    (participant) => participant.id === playerId,
  );
  const state = match.state;
  const winner = state.players.find(
    (player) => player.id === state.matchWinnerId,
  );
  const ownPlayer = state.players.find((player) => player.id === playerId);
  const won = state.matchWinnerId === playerId;
  const draw = !winner;
  const before = own?.initialCups || 0;
  const delta = own?.cupChange || 0;
  const settled = match.settlement?.settled;
  const promotion =
    settled && delta > 0 && rank(before + delta) !== rank(before);
  const hasBaseline = initialProgress?.xp !== undefined;
  const hasProgress = hasBaseline || profile?.xp !== undefined;
  const initialLevel = initialProgress?.level ?? ownPlayer?.profile?.level ?? 1;
  const initialXp = initialProgress?.xp ?? ownPlayer?.profile?.xp ?? 0;
  const afterXp = hasBaseline
    ? initialXp + (settled ? own?.xp || 0 : 0)
    : (profile?.xp ?? 0);
  const level = hasBaseline
    ? 1 + Math.floor(afterXp / 500)
    : (profile?.level ?? 1 + Math.floor(afterXp / 500));
  const levelUp = settled && hasBaseline && level > initialLevel;
  const [celebrate, setCelebrate] = useState(!reducedMotion);
  const [milestone, setMilestone] = useState(null);
  const presented = useRef(new Set());
  const sounded = useRef(false);
  const portrait = spectator ? winner || state.players[0] : ownPlayer;
  const skin = portrait?.profile?.avatar || profile?.avatar || "avatar-void";
  const frame = portrait?.profile?.equippedFrame || profile?.equippedFrame;
  const effect = portrait?.profile?.equippedEffect || profile?.equippedEffect;
  const asset =
    cosmeticAsset(skin) ||
    `/assets/${{ "avatar-ember": "avatar-fire", "avatar-frost": "avatar-ice" }[skin] || skin}.webp`;

  useEffect(() => {
    if (!sounded.current) {
      sounded.current = true;
      onSound?.(won ? "win" : draw ? "click" : "lose");
    }
    const timer = setTimeout(() => setCelebrate(false), 2400);
    return () => clearTimeout(timer);
  }, [won, draw]);
  useEffect(() => {
    const type = hasBaseline && promotion ? "rank" : levelUp ? "level" : null;
    if (!type || spectator || presented.current.has(type)) return;
    const timer = setTimeout(
      () => {
        presented.current.add(type);
        setMilestone(type);
      },
      reducedMotion ? 0 : 1100,
    );
    return () => clearTimeout(timer);
  }, [promotion, levelUp, spectator, reducedMotion, hasBaseline]);

  return (
    <section
      className={`result-panel ${styles.resultScreen} ${won || (spectator && winner) ? styles.victory : draw ? styles.draw : styles.defeat} ${reducedMotion ? styles.reduced : ""}`}
      aria-label="Battle result"
    >
      {celebrate && !reducedMotion && (
        <div className={styles.resultParticles} aria-hidden="true">
          {Array.from({ length: 20 }, (_, index) => (
            <i
              key={index}
              style={{
                "--particle": index,
                "--x": `${(index * 17) % 100}%`,
                "--delay": `${(index % 5) * 80}ms`,
              }}
            />
          ))}
        </div>
      )}
      <div className={styles.resultHeading}>
        <span>BATTLE COMPLETE</span>
        <h2>
          {spectator
            ? winner
              ? `${winner.name} wins`
              : "A battle of equals"
            : won
              ? "VICTORY"
              : winner
                ? "DEFEAT"
                : "DRAW"}
        </h2>
        <p>
          {won
            ? "Your strategy earned this moment."
            : winner
              ? "A worthy battle"
              : "A battle of equals"}
        </p>
      </div>
      <button
        className={styles.resultPortrait}
        type="button"
        aria-label="Skip celebration"
        onClick={() => setCelebrate(false)}
        style={{ ...cosmeticStyle(skin), ...cosmeticStyle(frame) }}
      >
        <span className={styles.portraitAura} />
        <span className={styles.resultCrown}>
          {won ? (
            <Crown size={37} />
          ) : draw ? (
            <Shield size={35} />
          ) : (
            <Trophy size={35} />
          )}
        </span>
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
        {fxTheme(skin) && <AscendantFx theme={fxTheme(skin)} stars={8} glow />}
        <strong>{portrait?.name || "Challenger"}</strong>
      </button>

      {!spectator && (
        <GameFrame className={styles.rewardsFrame}>
          {settled ? (
            <>
              <div className={styles.resultRewards}>
                <div>
                  <Trophy size={23} />
                  <RewardNumber
                    value={delta}
                    prefix={delta > 0 ? "+" : ""}
                    reducedMotion={reducedMotion}
                  />
                  <span>
                    {match.mode === "ranked" ? "CUP CHANGE" : "UNRANKED CUPS"}
                  </span>
                </div>
                <div>
                  <Coins size={23} />
                  <RewardNumber
                    value={own?.coins || 0}
                    prefix="+"
                    reducedMotion={reducedMotion}
                  />
                  <span>COSMETIC COINS</span>
                </div>
                <div>
                  <Zap size={23} />
                  <RewardNumber
                    value={own?.xp || 0}
                    prefix="+"
                    reducedMotion={reducedMotion}
                  />
                  <span>ACCOUNT XP</span>
                </div>
              </div>
              <div className={styles.rewardRoad}>
                <span>
                  <Trophy size={15} />
                  {rank(before + delta)}
                  <b>{before + delta} cups</b>
                </span>
                <ProgressBar
                  value={roadProgress(before + delta)}
                  label="Trophy road progress"
                />
                {hasProgress && (
                  <div className={styles.xpRoad}>
                    <span>
                      LEVEL {level}
                      <b>{afterXp % 500} / 500 XP</b>
                    </span>
                    <ProgressBar
                      value={afterXp % 500}
                      max={500}
                      label="Account level progress"
                    />
                  </div>
                )}
              </div>
              {promotion && (
                <p className={styles.promotion}>
                  <Crown size={17} />
                  Promoted to {rank(before + delta)} · {before + delta} cups
                </p>
              )}
              <p className={styles.settlementNote}>
                <CheckCircle2 size={14} />
                {match.mode === "ranked"
                  ? `${before} → ${before + delta} cups. Rewards are recorded once by the server.`
                  : "Unranked battles do not change your cups."}
              </p>
            </>
          ) : (
            <p role="status">The server is recording your rewards…</p>
          )}
        </GameFrame>
      )}

      {state.boardSize > 3 && (
        <div
          className={`result-line-scores ${styles.resultScores}`}
          aria-label="Final three-in-a-row scores"
        >
          {state.players.map((player) => (
            <span key={player.id}>
              <b>
                {player.mark} · {player.name}
              </b>
              <strong>{state.roundScores?.[player.id] || 0} lines</strong>
            </span>
          ))}
        </div>
      )}
      {match.rankedBot && (
        <p className={`competitive-bot-label ${styles.botResult}`}>
          Opponent: {match.difficulty} competitive bot · Ranked matchmaking
        </p>
      )}
      <div className={styles.resultActions}>
        {!spectator && (
          <GameButton disabled={rematchRequested || busy} onClick={onAgain}>
            <RefreshCw size={18} />
            {rematchRequested
              ? "Waiting for your opponent…"
              : rematchOffer
                ? "Accept rematch"
                : "Play again"}
          </GameButton>
        )}
        <GameButton variant="secondary" onClick={onArena}>
          Return to Arena <ArrowRight size={17} />
        </GameButton>
        <GameButton variant="ghost" onClick={onReplay}>
          <Play size={17} />
          View replay
        </GameButton>
      </div>
      {milestone && (
        <Modal
          title={milestone === "rank" ? "RANK UP!" : "LEVEL UP!"}
          onClose={() => setMilestone(null)}
          className={styles.milestone}
        >
          <Crown size={68} />
          <h3>
            {milestone === "rank" ? rank(before + delta) : `LEVEL ${level}`}
          </h3>
          <p>
            {milestone === "rank"
              ? `${before + delta} cups`
              : `${afterXp.toLocaleString()} account XP`}
          </p>
          <GameButton onClick={() => setMilestone(null)}>Continue</GameButton>
        </Modal>
      )}
    </section>
  );
}
