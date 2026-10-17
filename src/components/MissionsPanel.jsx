"use client";

import { useCallback, useEffect, useState } from "react";
import { motion } from "motion/react";
import { useGameReducedMotion } from "./AnimatedCosmeticImage";
import {
  Gift,
  Coins,
  Check,
  Target,
  Clock3,
  LoaderCircle,
  Lock,
  Info,
} from "lucide-react";
import { GameFrame, GameButton, ProgressBar, ClaimButton } from "./ui";
import { countdownTo, nextUtcMidnight } from "../lib/time-format";
import styles from "./JourneyPanels.module.css";

const missionState = (m) =>
  m.claimed ? "claimed" : (m.progress || 0) >= m.target ? "ready" : "progress";
const ORDER = { ready: 0, progress: 1, claimed: 2 };

export default function MissionsPanel({
  api,
  user,
  refresh,
  onError,
  onNotice,
  navigate,
}) {
  const [data, setData] = useState(null);
  const [busy, setBusy] = useState("");
  const [now, setNow] = useState(() => Date.now());
  const [burst, setBurst] = useState(0);
  const reduce = useGameReducedMotion();
  const load = useCallback(
    () =>
      api("/missions")
        .then(setData)
        .catch((e) => onError(e.message)),
    [api, onError],
  );
  useEffect(() => {
    if (user) load();
  }, [user?.id, load]);
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(timer);
  }, []);

  async function claim(endpoint, body, key) {
    setBusy(key);
    try {
      const result = await api(endpoint, "POST", body);
      if (key === "daily") setBurst((value) => value + 1);
      await Promise.all([refresh(), load()]);
      window.dispatchEvent(new Event("ea:rewards-changed"));
      onNotice(`+${result.coins} coins added to your wallet!`);
    } catch (e) {
      onError(e.message);
      load();
    } finally {
      setBusy("");
    }
  }
  if (!data)
    return (
      <div className="loading-state">
        <LoaderCircle className="spin" />
        Loading your rewards…
      </div>
    );
  const claimed = data.daily?.claimedToday,
    // `day` is the next claimable day; once today is claimed, today is the previous one.
    today =
      data.daily?.todayDay ||
      (claimed
        ? ((Math.max(1, data.daily?.totalClaims || 1) - 1) % 7) + 1
        : data.daily?.day || 1);
  const dailyReset = data.dailyResetAt || nextUtcMidnight(now),
    nextIn = countdownTo(dailyReset, now);
  const dayState = (day) =>
    day < today
      ? "claimed"
      : day === today
        ? claimed
          ? "claimed"
          : "ready"
        : day === today + 1 && claimed
          ? "tomorrow"
          : "locked";
  const groups = [
    ["Daily missions", data.missions || [], dailyReset],
    ["Weekly missions", data.weeklyMissions || [], data.weeklyResetAt],
  ];

  return (
    <div className={styles.screen}>
      <GameFrame className={styles.calendar}>
        <div className={styles.title}>
          <Gift size={26} />
          <h2>Daily login reward</h2>
        </div>
        <p className={styles.help}>
          <Clock3 size={14} />
          {claimed ? `Next reward in ${nextIn}` : "Today's reward is ready!"}
        </p>
        {claimed ? (
          <GameButton
            variant="secondary"
            disabled
            aria-label="Claimed today"
            className="claimed-button"
          >
            <Check size={18} />
            Claimed · Next in {nextIn}
          </GameButton>
        ) : (
          <GameButton
            className={styles.claimDaily}
            disabled={!!busy}
            onClick={() => claim("/rewards/daily", {}, "daily")}
          >
            <Gift size={19} />
            Claim daily reward
          </GameButton>
        )}
        <div
          className={`${styles.days} scroll-row`}
          aria-label="Seven day rewards"
        >
          {(data.daily?.rewards || [40, 50, 60, 70, 80, 90, 120]).map(
            (coins, i) => {
              const day = i + 1,
                state = dayState(day);
              return (
                <motion.div
                  className={`reward-card ${styles.day} ${day === today ? styles.today : ""} ${day === 7 ? styles.bigDay : ""}`}
                  data-state={state === "tomorrow" ? "progress" : state}
                  key={i}
                  animate={
                    day === today && burst && !reduce
                      ? { scale: [1, 1.12, 1] }
                      : undefined
                  }
                  transition={{ duration: 0.45 }}
                  aria-label={`Day ${day}: ${coins} coins, ${state === "ready" ? "ready to claim" : state}`}
                >
                  <span>DAY {day}</span>
                  {state === "claimed" ? (
                    <Check size={22} className={styles.dayCheck} />
                  ) : state === "locked" ? (
                    <Lock size={18} />
                  ) : day === 7 ? (
                    <Gift size={24} className="reward-icon" />
                  ) : (
                    <Coins size={22} className="reward-icon" />
                  )}
                  <strong>{coins}</strong>
                  <small>
                    {state === "claimed"
                      ? "CLAIMED"
                      : state === "ready"
                        ? "TODAY"
                        : state === "tomorrow"
                          ? "TOMORROW"
                          : day === 7
                            ? "BIG REWARD"
                            : " "}
                  </small>
                </motion.div>
              );
            },
          )}
        </div>
      </GameFrame>
      <div className={styles.scroll}>
        <div className={styles.missionGrid}>
          {groups.map(([title, missions, reset]) => {
            const sorted = [...missions].sort(
              (a, b) => ORDER[missionState(a)] - ORDER[missionState(b)],
            );
            const humanOnly = missions.some((m) =>
              /human/i.test(m.description || ""),
            );
            return (
              <section className={styles.missions} key={title}>
                <div className={styles.title}>
                  <Target size={22} />
                  <h2>{title}</h2>
                  {reset && (
                    <small>
                      <Clock3 size={14} /> Resets in {countdownTo(reset, now)}
                    </small>
                  )}
                </div>
                {humanOnly && (
                  <p className={styles.note}>
                    <Info size={13} /> Only human matches count — practice
                    doesn&apos;t.
                  </p>
                )}
                {sorted.length ? (
                  sorted.map((m) => {
                    const state = missionState(m),
                      progress = Math.min(m.target, m.progress || 0);
                    return (
                      <article
                        className={`reward-card ${styles.mission}`}
                        data-state={state}
                        key={m.id}
                      >
                        {state === "claimed" && (
                          <span className="reward-stamp">
                            <Check size={12} /> Claimed
                          </span>
                        )}
                        <div className={styles.missionTop}>
                          <h3>{m.name}</h3>
                          <strong>
                            {progress} / {m.target}
                          </strong>
                        </div>
                        <p>{m.description}</p>
                        <ProgressBar
                          value={progress}
                          max={m.target}
                          label={`${m.name} progress`}
                        />
                        <div className={styles.missionFooter}>
                          <span>
                            <Coins size={17} className="reward-icon" />
                            {m.coins} coins
                          </span>
                          <ClaimButton
                            state={state}
                            busy={!!busy}
                            claimLabel="Claim reward"
                            onClaim={() =>
                              claim(
                                "/missions/claim",
                                { missionId: m.id },
                                m.id,
                              )
                            }
                            goLabel="Play"
                            onGo={navigate ? () => navigate("/") : undefined}
                          />
                        </div>
                      </article>
                    );
                  })
                ) : (
                  <p className={styles.help}>
                    No missions are active for this period.
                  </p>
                )}
              </section>
            );
          })}
        </div>
      </div>
    </div>
  );
}
