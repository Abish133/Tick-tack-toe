"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
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
  Info,
} from "lucide-react";
import CosmeticArt from "./CosmeticArt";
import { GameFrame, GameButton, Modal, ProgressBar } from "./ui";
import styles from "./SeasonJourney.module.css";
import panels from "./JourneyPanels.module.css";

export default function ProgressPanel({
  kind,
  api,
  user,
  refresh,
  onError,
  onNotice,
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
  if (kind === "achievements")
    return (
      <div className={panels.screen}>
        <div
          className={`${panels.scroll} ${panels.achievementGrid}`}
          aria-label="Achievement badge wall"
        >
          {(data.achievements || []).map((a) => (
            <GameFrame
              variant="card"
              className={`${panels.achievement} ${a.unlocked ? panels.unlocked : ""}`}
              key={a.id}
            >
              <div className={panels.achievementIcon}>
                {a.unlocked ? <Medal size={40} /> : <LockKeyhole size={34} />}
              </div>
              <span className={panels.badge}>
                {a.unlocked ? "ACHIEVED" : "IN PROGRESS"}
              </span>
              <h3>{a.name}</h3>
              <p>{a.description}</p>
              <ProgressBar
                value={Math.min(a.target, a.progress)}
                max={a.target}
                label={`${a.name} progress`}
              />
              <small>
                {Math.min(a.target, a.progress)} / {a.target} · {a.coins}{" "}
                cosmetic coins
              </small>
            </GameFrame>
          ))}
        </div>
      </div>
    );
  if (kind === "notifications")
    return (
      <div className={panels.screen}>
        <div className={panels.topActions}>
          <h3>Your arena updates</h3>
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
        </div>
        <div className={`${panels.scroll} ${panels.notifications}`}>
          {(data.notifications || []).length ? (
            data.notifications.map((n) => (
              <article
                className={`notification-row ${panels.notificationRow} ${n.readAt ? panels.read : ""}`}
                key={n.id}
              >
                <Bell size={22} />
                <div>
                  <p>{n.message}</p>
                  <small>{new Date(n.createdAt).toLocaleString()}</small>
                </div>
                {!n.readAt && <span className={panels.notificationDot} />}
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
            </GameFrame>
          )}
        </div>
      </div>
    );
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
}) {
  const [track, setTrack] = useState("free");
  const [info, setInfo] = useState(false);
  const trackScroll = useRef(null);
  function selectTrack(value) {
    setTrack(value);
    trackScroll.current?.scrollTo({ left: 0, top: 0 });
  }
  const price = Number(data.passCoinPrice || 900),
    xp = Number(data.xp || 0),
    balance = Number(user.coins || 0);
  const free = data.tiers || [],
    premium = data.premiumTiers || [];
  const maxXp = Math.max(
    1,
    ...free.map((tier) => Number(tier.requiredXp)),
    ...premium.map((tier) => Number(tier.requiredXp)),
  );
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
          ? `${tier.cosmetic?.name || "Season cosmetic"} and ${tier.coins} cosmetic coins claimed.`
          : "Seasonal cosmetic coins claimed.",
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
    const available =
      xp >= tier.requiredXp &&
      (!isPremium || data.premiumOwned) &&
      !tier.claimed;
    return (
      <GameFrame
        variant="card"
        className={`season-tier ${styles.tier} ${isPremium ? styles.premium : ""} ${available ? styles.claimable : ""}`}
        key={`${rewardTrack}-${tier.level}`}
      >
        <span className={styles.tierNumber}>REWARD {tier.level}</span>
        <div className={styles.art}>
          {isPremium ? (
            <CosmeticArt
              item={tier.cosmetic || { id: tier.cosmeticId, type: "marks" }}
            />
          ) : (
            <div className={styles.coinReward}>
              <Gift size={34} />
              <strong>{tier.coins}</strong>
              <Coins size={22} />
            </div>
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
        <p>{Number(tier.requiredXp).toLocaleString()} season XP required</p>
        <ProgressBar
          value={Math.min(xp, tier.requiredXp)}
          max={tier.requiredXp}
          label={`${isPremium ? "Premium " : ""}Reward ${tier.level} progress`}
        />
        <GameButton
          variant={available ? "primary" : "secondary"}
          disabled={
            !data.season ||
            tier.claimed ||
            xp < tier.requiredXp ||
            busy ||
            (isPremium && !data.premiumOwned)
          }
          onClick={() => claim(tier, rewardTrack)}
        >
          {tier.claimed ? (
            <>
              <Check size={16} />
              Claimed
            </>
          ) : isPremium && !data.premiumOwned ? (
            <>
              <LockKeyhole size={16} />
              Unlock pass
            </>
          ) : xp >= tier.requiredXp ? (
            "Claim reward"
          ) : (
            "Keep playing"
          )}
        </GameButton>
      </GameFrame>
    );
  };

  return (
    <div className={styles.screen}>
      <GameFrame variant="banner" className={styles.banner}>
        <div>
          <span className={styles.kicker}>COSMETIC SEASON JOURNEY</span>
          <h2>{data.season?.name || "Your next chapter"}</h2>
          <p>
            Season XP: {xp.toLocaleString()} · Account level {data.level}
          </p>
        </div>
        <div className={styles.seasonProgress}>
          <Trophy size={26} />
          <ProgressBar value={xp} max={maxXp} label="Season progress" />
        </div>
        <GameButton
          variant="icon"
          aria-label="Season reward information"
          onClick={() => setInfo(true)}
        >
          <Info size={22} />
        </GameButton>
      </GameFrame>
      <GameFrame
        className={styles.pass}
        aria-label="Premium cosmetic season pass"
      >
        <div>
          <span className={styles.passTitle}>
            <Crown size={20} />
            {data.premiumOwned
              ? "PREMIUM UNLOCKED"
              : "PREMIUM COSMETIC JOURNEY"}
          </span>
          <h3>Five exclusive styles. One season.</h3>
        </div>
        <div className={styles.purchase}>
          {data.premiumOwned ? (
            <span className={styles.owned}>
              <Check size={20} />
              Owned for this season
            </span>
          ) : (
            <>
              <GameButton
                disabled={!data.season || busy || balance < price}
                onClick={unlock}
              >
                {busy ? (
                  <LoaderCircle className="spin" size={18} />
                ) : (
                  <Coins size={18} />
                )}
                Unlock for {price.toLocaleString()} coins
              </GameButton>
              <small>
                {balance < price
                  ? `${Math.max(0, price - balance).toLocaleString()} more earned coins needed`
                  : `Your balance: ${balance.toLocaleString()} coins`}
              </small>
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
      <div ref={trackScroll} className={styles.trackScroll} aria-label="Season reward path">
        <div className={styles.path}>
          <div
            key={track}
            className={`${styles.rewardRow} ${styles.focused}`}
            role="group"
            aria-label={track === "free" ? "Free season rewards" : "Premium season rewards"}
          >
            <span className={styles.rowLabel}>
              {track === "free" ? <Gift size={22} /> : <Crown size={22} />}
              {track === "free" ? "FREE" : "PREMIUM"}
            </span>
            {(track === "free" ? free : premium).map((tier) => renderReward(tier, track))}
          </div>
          <div
            className={styles.trackLine}
            aria-label={`Current season XP ${xp}`}
          >
            <span style={{ width: `${Math.min(100, (xp / maxXp) * 100)}%` }} />
            <i style={{ left: `${Math.min(100, (xp / maxXp) * 100)}%` }}>
              <Trophy size={18} />
            </i>
          </div>
        </div>
      </div>
      {info && (
        <Modal
          title="Fair play is always included"
          onClose={() => setInfo(false)}
        >
          <div className={styles.info}>
            <p>{data.message}</p>
            <p>
              Earn seasonal XP to claim a portrait frame, profile banner, galaxy
              marks, arrival effect and arena background.
            </p>
            <p>
              Free rewards remain available. No power, energy or clock
              advantage.
            </p>
            <p>
              Season XP and both reward tracks start fresh each season. Your
              claimed cosmetics, coins and account level stay with you.
              Unclaimed rewards require an active season.
            </p>
            <p>
              All 22 Ranked powers are available equally. There are no paid
              power upgrades, extra charges or timer advantages.
            </p>
            {data.season ? (
              <p>Season ends {new Date(data.season.endsAt).toLocaleString()}</p>
            ) : (
              <p>
                A new competitive season has not opened yet. Rewards become
                available when a season starts.
              </p>
            )}
            {data.paidPassAvailable && (
              <Link className={styles.checkout} href="/shop">
                Checkout options in the shop
              </Link>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}
