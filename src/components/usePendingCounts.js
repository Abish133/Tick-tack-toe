"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const REWARD_ROUTES = ["/", "/missions", "/season-pass", "/friends"];
const EMPTY = {
  daily: 0,
  missions: 0,
  season: 0,
  requests: 0,
  invites: 0,
  journey: 0,
  social: 0,
  data: {},
};

export function readySeasonTiers(season) {
  if (!season) return 0;
  const ready = (tiers = []) =>
    tiers.filter((tier) => tier.unlocked && !tier.claimed).length;
  return (
    ready(season.tiers) + (season.premiumOwned ? ready(season.premiumTiers) : 0)
  );
}

export function readyMissionCount(missions) {
  return [...(missions?.missions || []), ...(missions?.weeklyMissions || [])]
    .filter((m) => !m.claimed && (m.progress || 0) >= m.target).length;
}

// One source of truth for red dots: claimable rewards and social requests.
export default function usePendingCounts(api, user, pathname) {
  const [counts, setCounts] = useState(EMPTY),
    [tick, setTick] = useState(0),
    last = useRef({ at: 0, balance: "" }),
    currentUser = useRef(user?.id);
  currentUser.current = user?.id;
  const reload = useCallback(() => setTick((value) => value + 1), []);
  useEffect(() => {
    const focus = () => reload();
    window.addEventListener("focus", focus);
    return () => window.removeEventListener("focus", focus);
  }, [reload]);
  // Only reward screens (and real balance changes) refresh the counts.
  const routeKey = REWARD_ROUTES.includes(pathname) ? pathname : "other";
  const balanceKey = `${user?.coins}:${user?.xp}:${tick}`;
  useEffect(() => {
    const requestedFor = user?.id;
    if (!user?.id || !api) {
      setCounts(EMPTY);
      last.current = { at: 0, balance: "" };
      return;
    }
    const now = Date.now();
    if (
      last.current.balance === balanceKey &&
      now - last.current.at < 15000
    )
      return;
    last.current = { at: now, balance: balanceKey };
    Promise.allSettled([
      api("/missions"),
      api("/season-pass"),
      api("/friends"),
    ]).then(([missions, season, friends]) => {
      if (currentUser.current !== requestedFor) return;
      const m = missions.status === "fulfilled" ? missions.value : null,
        s = season.status === "fulfilled" ? season.value : null,
        f = friends.status === "fulfilled" ? friends.value : null;
      const daily = m?.daily && !m.daily.claimedToday ? 1 : 0,
        missionCount = readyMissionCount(m),
        seasonCount = readySeasonTiers(s),
        requests = (f?.requests || []).filter(
          (r) => r.receiverId === user.id,
        ).length,
        invites = (f?.challenges || []).filter(
          (c) =>
            c.metadata?.status === "pending" &&
            new Date(c.metadata.expiresAt) > new Date() &&
            c.senderId !== user.id,
        ).length;
      setCounts({
        daily,
        missions: missionCount,
        season: seasonCount,
        requests,
        invites,
        journey: daily + missionCount + seasonCount,
        social: requests + invites,
        data: { missions: m, season: s },
      });
    });
  }, [api, user?.id, routeKey, balanceKey]);
  // Optimistic: clear a dot the moment its reward is claimed.
  const clear = useCallback(
    (key) =>
      setCounts((current) => {
        const next = { ...current, [key]: 0 };
        next.journey = next.daily + next.missions + next.season;
        next.social = next.requests + next.invites;
        return next;
      }),
    [],
  );
  return { ...counts, reload, clear };
}
