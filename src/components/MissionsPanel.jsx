"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Gift,
  Coins,
  Check,
  Target,
  Clock3,
  LoaderCircle,
  CalendarDays,
} from "lucide-react";
import { GameFrame, GameButton, ProgressBar } from "./ui";
import styles from "./JourneyPanels.module.css";

export default function MissionsPanel({
  api,
  user,
  refresh,
  onError,
  onNotice,
}) {
  const [data, setData] = useState(null);
  const [busy, setBusy] = useState("");
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

  async function claim(endpoint, body, key) {
    setBusy(key);
    try {
      const result = await api(endpoint, "POST", body);
      await Promise.all([refresh(), load()]);
      onNotice(`${result.coins} cosmetic coins added to your wallet.`);
    } catch (e) {
      onError(e.message);
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
    day =
      data.daily?.todayDay ||
      (claimed
        ? ((Math.max(1, data.daily?.totalClaims || 1) - 1) % 7) + 1
        : data.daily?.day || 1);
  const groups = [
    ["Daily missions", data.missions || [], data.dailyResetAt],
    ["Weekly missions", data.weeklyMissions || [], data.weeklyResetAt],
  ];

  return (
    <div className={styles.screen}>
      <GameFrame className={styles.calendar}>
        <div className={styles.title}>
          <Gift size={28} />
          <h2>A gift for showing up</h2>
        </div>
        <p className={styles.help}>
          <CalendarDays size={15} />A new login reward becomes available at
          00:00 UTC.
        </p>
        <GameButton
          disabled={!!busy || claimed}
          onClick={() => claim("/rewards/daily", {}, "daily")}
        >
          <Gift size={19} />
          {claimed ? "Claimed today" : "Claim daily reward"}
        </GameButton>
        <div className={styles.days} aria-label="Seven day rewards">
          {(data.daily?.rewards || [40, 50, 60, 70, 80, 90, 120]).map(
            (coins, i) => (
              <div
                className={`${styles.day} ${i + 1 === day ? styles.today : ""}`}
                key={i}
              >
                <span>DAY {i + 1}</span>
                {i + 1 === day && claimed ? (
                  <Check size={23} />
                ) : (
                  <Coins size={23} />
                )}
                <strong>{coins}</strong>
                {i + 1 === day && (
                  <small>{claimed ? "CLAIMED" : "NEXT REWARD"}</small>
                )}
              </div>
            ),
          )}
        </div>
      </GameFrame>
      <div className={styles.scroll}>
        <div className={styles.missionGrid}>
          {groups.map(([title, missions, reset]) => (
            <section className={styles.missions} key={title}>
              <div className={styles.title}>
                <Target size={23} />
                <h2>{title}</h2>
                {reset && (
                  <small>
                    <Clock3 size={14} /> Resets{" "}
                    {new Date(reset).toLocaleString()}
                  </small>
                )}
              </div>
              {missions.length ? (
                missions.map((m) => (
                  <article className={styles.mission} key={m.id}>
                    <div className={styles.missionTop}>
                      <h3>{m.name}</h3>
                      <strong>
                        {Math.min(m.target, m.progress || 0)} / {m.target}
                      </strong>
                    </div>
                    <p>{m.description}</p>
                    <ProgressBar
                      value={Math.min(m.target, m.progress || 0)}
                      max={m.target}
                      label={`${m.name} progress`}
                    />
                    <div className={styles.missionFooter}>
                      <span>
                        <Coins size={17} />
                        {m.coins} coins
                      </span>
                      <GameButton
                        variant={
                          (m.progress || 0) >= m.target && !m.claimed
                            ? "primary"
                            : "secondary"
                        }
                        disabled={
                          !!busy || m.claimed || (m.progress || 0) < m.target
                        }
                        onClick={() =>
                          claim("/missions/claim", { missionId: m.id }, m.id)
                        }
                      >
                        {m.claimed ? (
                          <>
                            <Check size={16} />
                            Claimed
                          </>
                        ) : (m.progress || 0) >= m.target ? (
                          "Claim reward"
                        ) : (
                          "Keep playing"
                        )}
                      </GameButton>
                    </div>
                  </article>
                ))
              ) : (
                <p className={styles.help}>
                  No missions are active for this period.
                </p>
              )}
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
