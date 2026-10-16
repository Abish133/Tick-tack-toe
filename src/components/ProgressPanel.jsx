"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Medal,
  Bell,
  Check,
  Trophy,
  Gift,
  LockKeyhole,
  LoaderCircle,
  Crown,
  Coins,
  Swords,
} from "lucide-react";
import CosmeticArt from "./CosmeticArt";
import { GameFrame, GameButton, ProgressBar, StateBadge } from "./ui";
import { formatCountdown } from "../lib/time-format";
import styles from "./SeasonJourney.module.css";
import panels from "./JourneyPanels.module.css";

const ago = (date) => {
  const ms = Date.now() - new Date(date).getTime();
  return ms < 60000 ? "just now" : `${formatCountdown(ms)} ago`;
};
const achievementState = (a) =>
  a.unlocked ? "completed" : (a.progress || 0) > 0 ? "progress" : "locked";

export default function ProgressPanel({
  kind,
  api,
  user,
  refresh,
  onError,
  onNotice,
  navigate,
}) {
  const [data, setData] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const sequence = useRef(0);
  const load = useCallback(async () => {
    const current = ++sequence.current;
    setError("");
    try {
      const result = await api(`/${kind}`);
      if (current === sequence.current) setData(result);
      return result;
    } catch (problem) {
      if (current === sequence.current) {
        setError(problem.message);
        onError?.(problem.message);
      }
      return null;
    }
  }, [api, kind, onError]);

  useEffect(() => {
    setData(null);
    setError("");
    if (user) load();
    return () => {
      sequence.current++;
    };
  }, [kind, user?.id, load]);

  if (!user)
    return (
      <GameFrame className={panels.empty}>
        <Medal size={36} />
        <h3>Your progress starts with a player</h3>
        <p>Continue as a guest or sign in to begin your journey.</p>
      </GameFrame>
    );
  if (!data && error)
    return (
      <GameFrame className={panels.empty}>
        <h3>Your journey could not load</h3>
        <p>{error}</p>
        <GameButton variant="secondary" onClick={load}>
          Try again
        </GameButton>
      </GameFrame>
    );
  if (!data)
    return (
      <div className="loading-state">
        <LoaderCircle className="spin" />
        Loading your journey…
      </div>
    );
  if (kind === "achievements") {
    const list = [...(data.achievements || [])].sort((a, b) => {
      if (a.unlocked !== b.unlocked) return a.unlocked ? 1 : -1;
      return (
        (b.progress || 0) / Math.max(1, b.target) -
        (a.progress || 0) / Math.max(1, a.target)
      );
    });
    const unlocked = list.filter((a) => a.unlocked).length;
    return (
      <div className={panels.screen}>
        <GameFrame className={panels.achievementSummary}>
          <Medal size={22} />
          <strong>
            {unlocked} / {list.length} unlocked
          </strong>
          <ProgressBar
            value={unlocked}
            max={Math.max(1, list.length)}
            label="Achievements unlocked"
          />
        </GameFrame>
        <div
          className={`${panels.scroll} ${panels.achievementGrid}`}
          aria-label="Achievement badge wall"
        >
          {list.map((a) => {
            const state = achievementState(a),
              progress = Math.min(a.target, a.progress || 0);
            return (
              <GameFrame
                variant="card"
                className={`reward-card ${panels.achievement} ${a.unlocked ? panels.unlocked : ""}`}
                data-state={state}
                key={a.id}
              >
                <div className={panels.achievementIcon}>
                  <Medal size={state === "completed" ? 40 : 34} />
                  {state === "completed" && (
                    <Check size={16} className={panels.achievementCheck} />
                  )}
                </div>
                <StateBadge state={state === "progress" ? "ready" : state}>
                  {state === "completed"
                    ? "Unlocked"
                    : state === "progress"
                      ? "In progress"
                      : "Not started"}
                </StateBadge>
                <h3>{a.name}</h3>
                <p>{a.description}</p>
                {state !== "completed" && (
                  <ProgressBar
                    value={progress}
                    max={a.target}
                    label={`${a.name} progress`}
                  />
                )}
                <small>
                  {state === "completed"
                    ? `Reward earned · ${a.coins} coins`
                    : `${progress.toLocaleString()} / ${a.target.toLocaleString()} · +${a.coins} coins`}
                </small>
              </GameFrame>
            );
          })}
        </div>
      </div>
    );
  }
  if (kind === "notifications") {
    const notes = data.notifications || [],
      unread = notes.filter((n) => !n.readAt).length;
    return (
      <div className={panels.screen}>
        <div className={panels.topActions}>
          <h3>
            {unread ? `${unread} unread update${unread === 1 ? "" : "s"}` : "All caught up"}
          </h3>
          {unread > 0 && (
            <GameButton
              variant="secondary"
              onClick={async () => {
                try {
                  await api("/notifications/read", "POST", {});
                  load();
                } catch (e) {
                  onError(e.message);
                }
              }}
            >
              Mark all read <Check size={16} />
            </GameButton>
          )}
        </div>
        <div className={`${panels.scroll} ${panels.notifications}`}>
          {notes.length ? (
            notes.map((n) => (
              <article
                className={`notification-row ${panels.notificationRow} ${n.readAt ? panels.read : panels.unread}`}
                key={n.id}
              >
                <Bell size={22} />
                <div>
                  <p>{n.message}</p>
                  <small>{ago(n.createdAt)}</small>
                </div>
                {!n.readAt && (
                  <span
                    className={panels.notificationDot}
                    aria-label="Unread"
                  />
                )}
              </article>
            ))
          ) : (
            <GameFrame className={panels.empty}>
              <Bell size={32} />
              <h3>A quiet moment before battle</h3>
              <p>
                Match results, friend requests, and achievement updates appear
                here.
              </p>
              {navigate && (
                <GameButton onClick={() => navigate("/")}>
                  <Swords size={16} /> Battle
                </GameButton>
              )}
            </GameFrame>
          )}
        </div>
      </div>
    );
  }
  if (kind === "season-pass")
    return (
      <SeasonJourney
        data={data}
        busy={busy}
        setBusy={setBusy}
        api={api}
        user={user}
        refresh={refresh}
        load={load}
        onError={onError}
        onNotice={onNotice}
        navigate={navigate}
      />
    );
  return null;
}

function SeasonJourney({
  data,
  busy,
  setBusy,
  api,
  user,
  refresh,
  load,
  onError,
  onNotice,
  navigate,
}) {
  const [track, setTrack] = useState("free");
  const trackScroll = useRef(null);
  const price = Number(data.passCoinPrice || 900),
    xp = Number(data.xp || 0),
    balance = Number(user.coins || 0);
  const free = data.tiers || [],
    premium = data.premiumTiers || [];
  const rows = track === "free" ? free : premium;
  const nextTier = free.find((tier) => xp < tier.requiredXp) || null,
    previousXp = nextTier
      ? Math.max(
          0,
          ...free
            .filter((tier) => tier.requiredXp <= xp)
            .map((tier) => tier.requiredXp),
        )
      : 0;
  // Bring the next reward (or the first claimable one) into view.
  useEffect(() => {
    const row = trackScroll.current;
    const target =
      row?.querySelector('[data-state="ready"]') ||
      row?.querySelector("[data-next]");
    if (!row || !target) return;
    const box = target.getBoundingClientRect(),
      frame = row.getBoundingClientRect();
    row.scrollLeft += box.left - frame.left - (frame.width - box.width) / 2;
  }, [track, data]);
  function selectTrack(value) {
    setTrack(value);
    trackScroll.current?.scrollTo({ left: 0, top: 0 });
  }
  async function claim(tier, rewardTrack) {
    setBusy(true);
    try {
      await api("/season-pass/claim", "POST", {
        level: tier.level,
        track: rewardTrack,
      });
      await refresh();
      await load();
      onNotice?.(
        rewardTrack === "premium"
          ? `${tier.cosmetic?.name || "Season cosmetic"} and ${tier.coins} cosmetic coins claimed!`
          : `+${tier.coins} season coins claimed!`,
      );
    } catch (error) {
      onError?.(error.message);
    } finally {
      setBusy(false);
    }
  }
  async function unlock() {
    setBusy(true);
    try {
      await api("/season-pass/purchase", "POST", {});
      await refresh();
      await load();
      setTrack("premium");
      onNotice?.("Your premium cosmetic journey is unlocked for this season.");
    } catch (error) {
      onError?.(error.message);
    } finally {
      setBusy(false);
    }
  }
  const renderReward = (tier, rewardTrack) => {
    const isPremium = rewardTrack === "premium";
    const lockedPass = isPremium && !data.premiumOwned;
    const state = tier.claimed
      ? "claimed"
      : lockedPass
        ? "locked"
        : xp >= tier.requiredXp
          ? "ready"
          : "progress";
    const isNext = !tier.claimed && nextTier?.level === tier.level;
    return (
      <GameFrame
        variant="card"
        className={`season-tier reward-card ${styles.tier} ${isPremium ? styles.premium : ""} ${state === "ready" ? styles.claimable : ""} ${isNext ? styles.nextTier : ""}`}
        data-state={state === "progress" && !isNext ? "locked" : state}
        data-next={isNext || undefined}
        key={`${rewardTrack}-${tier.level}`}
      >
        {isNext && <span className={styles.nextMarker}>NEXT</span>}
        {state === "claimed" && (
          <span className="reward-stamp">
            <Check size={12} /> Claimed
          </span>
        )}
        <span className={styles.tierNumber}>REWARD {tier.level}</span>
        <div className={styles.art}>
          {isPremium ? (
            <CosmeticArt
              item={tier.cosmetic || { id: tier.cosmeticId, type: "marks" }}
            />
          ) : (
            <div className={styles.coinReward}>
              <Gift size={30} className="reward-icon" />
              <strong>{tier.coins}</strong>
              <Coins size={20} />
            </div>
          )}
          {lockedPass && (
            <span className={styles.lockOverlay} aria-hidden="true">
              <LockKeyhole size={22} />
            </span>
          )}
        </div>
        <h3>
          {isPremium
            ? tier.cosmetic?.name || "Exclusive style"
            : `${tier.coins} coins`}
        </h3>
        {isPremium && (
          <span className={styles.rewardCoins}>
            <Coins size={14} />
            {tier.coins} cosmetic coins
          </span>
        )}
        <p className={styles.requirement}>
          {Number(tier.requiredXp).toLocaleString()} XP
        </p>
        {state === "progress" || state === "locked" ? (
          <ProgressBar
            value={Math.min(xp, tier.requiredXp)}
            max={tier.requiredXp}
            label={`${isPremium ? "Premium " : ""}Reward ${tier.level} progress`}
          />
        ) : null}
        {state === "claimed" ? (
          <GameButton
            variant="secondary"
            disabled
            aria-label="Claimed"
            className="claimed-button"
          >
            <Check size={16} />
            Claimed
          </GameButton>
        ) : lockedPass ? (
          <GameButton
            variant="secondary"
            disabled
            aria-label="Unlock pass"
            className={styles.lockedButton}
          >
            <LockKeyhole size={15} />
            Premium
          </GameButton>
        ) : state === "ready" ? (
          <GameButton
            disabled={!data.season || busy}
            onClick={() => claim(tier, rewardTrack)}
            className={styles.claimNow}
          >
            <Gift size={16} />
            Claim reward
          </GameButton>
        ) : (
          <span className={styles.needXp}>
            {(tier.requiredXp - xp).toLocaleString()} XP to go
          </span>
        )}
      </GameFrame>
    );
  };

  return (
    <div className={styles.screen}>
      <GameFrame
        variant="banner"
        className={styles.header}
        aria-label="Premium cosmetic season pass"
      >
        <div className={styles.headerInfo}>
          <span className={styles.kicker}>
            {data.season?.name || "Your next chapter"}
          </span>
          <ProgressBar
            value={nextTier ? xp - previousXp : 1}
            max={nextTier ? nextTier.requiredXp - previousXp : 1}
            label="Season progress"
          />
          <p>
            {nextTier
              ? `${xp.toLocaleString()} / ${nextTier.requiredXp.toLocaleString()} XP to Reward ${nextTier.level}`
              : `${xp.toLocaleString()} XP · every reward reached`}
          </p>
        </div>
        <div className={styles.purchase}>
          {data.premiumOwned ? (
            <span className={styles.owned}>
              <Crown size={18} />
              Owned for this season
            </span>
          ) : (
            <>
              <GameButton
                variant={balance < price ? "secondary" : "primary"}
                className={balance < price ? "cant-afford" : ""}
                disabled={!data.season || busy || balance < price}
                onClick={unlock}
                aria-label={`Unlock for ${price.toLocaleString()} coins`}
              >
                {busy ? (
                  <LoaderCircle className="spin" size={18} />
                ) : (
                  <Crown size={18} />
                )}
                Premium ·{" "}
                <span className="price">
                  <Coins size={15} /> {price.toLocaleString()}
                </span>
              </GameButton>
              {balance < price && (
                <small>
                  Need {Math.max(0, price - balance).toLocaleString()} more
                </small>
              )}
            </>
          )}
        </div>
      </GameFrame>
      <div
        className={styles.tabs}
        role="group"
        aria-label="Season reward tracks"
      >
        <GameButton
          variant={track === "free" ? "primary" : "secondary"}
          aria-pressed={track === "free"}
          onClick={() => selectTrack("free")}
        >
          <Gift size={18} />
          Free journey<span>5 coin rewards</span>
        </GameButton>
        <GameButton
          variant={track === "premium" ? "primary" : "secondary"}
          aria-pressed={track === "premium"}
          onClick={() => selectTrack("premium")}
        >
          <Crown size={18} />
          Premium journey<span>5 exclusive cosmetics</span>
        </GameButton>
      </div>
      <div
        ref={trackScroll}
        className={styles.trackScroll}
        aria-label="Season reward path"
      >
        <div className={styles.path}>
          <div
            key={track}
            className={`${styles.rewardRow} ${styles.focused}`}
            role="group"
            aria-label={
              track === "free" ? "Free season rewards" : "Premium season rewards"
            }
          >
            {rows.map((tier) => renderReward(tier, track))}
          </div>
        </div>
      </div>
      {!data.season && (
        <p className={styles.seasonNote}>
          A new season has not opened yet. Rewards become available when it
          starts.
        </p>
      )}
      {xp === 0 && navigate && (
        <p className={styles.seasonNote}>
          <Trophy size={14} /> Play matches to earn season XP.{" "}
          <button type="button" onClick={() => navigate("/")}>
            Battle now
          </button>
        </p>
      )}
    </div>
  );
}
