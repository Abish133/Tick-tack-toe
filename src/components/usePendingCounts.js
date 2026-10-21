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
    // Only the newest refresh may write counts: a slow older reply (sent before a claim)
    // must not bring a cleared dot back.
    latestRequest = useRef(0),
    currentUser = useRef(user?.id);
  currentUser.current = user?.id;
  const reload = useCallback(() => setTick((value) => value + 1), []);
  useEffect(() => {
    const focus = () => reload();
    window.addEventListener("focus", focus);
    // Reward panels announce claims so the dots update without polling.
    window.addEventListener("ea:rewards-changed", reload);
    return () => {
      window.removeEventListener("focus", focus);
      window.removeEventListener("ea:rewards-changed", reload);
    };
  }, [reload]);
  // Reward screens, XP changes and explicit claims refresh the counts.
  // Coin changes alone do not: purchases would otherwise multiply requests.
  const routeKey = REWARD_ROUTES.includes(pathname) ? pathname : "other";
  const balanceKey = `${routeKey}:${user?.xp}:${tick}`;
  useEffect(() => {
    const requestedFor = user?.id;
    if (!user?.id || !api) {
      setCounts(EMPTY);
      last.current = { at: 0, balance: "" };
      return;
    }
    // Other screens keep the last known counts; explicit claims (tick) still refresh.
    if (routeKey === "other" && !tick) return;
    const now = Date.now();
    if (
      last.current.balance === balanceKey &&
      now - last.current.at < 15000
    )
      return;
    last.current = { ...last.current, at: now, balance: balanceKey };
    // Social requests change rarely: refresh them at most once a minute.
    const withFriends =
      pathname === "/friends" || now - (last.current.friendsAt || 0) > 60000;
    if (withFriends) last.current.friendsAt = now;
    const request = ++latestRequest.current;
    Promise.allSettled([
      api("/missions"),
      api("/season-pass"),
      withFriends ? api("/friends") : Promise.resolve(null),
    ]).then(([missions, season, friends]) => {
      if (currentUser.current !== requestedFor || request !== latestRequest.current) return;
      const m = missions.status === "fulfilled" ? missions.value : null,
        s = season.status === "fulfilled" ? season.value : null,
        f = friends.status === "fulfilled" ? friends.value : null;
      const daily = m?.daily && !m.daily.claimedToday ? 1 : 0,
        missionCount = readyMissionCount(m),
        seasonCount = readySeasonTiers(s);
      setCounts((current) => {
        const requests = f
            ? (f.requests || []).filter((r) => r.receiverId === user.id)
                .length
            : current.requests,
          invites = f
            ? (f.challenges || []).filter(
                (c) =>
                  c.metadata?.status === "pending" &&
                  new Date(c.metadata.expiresAt) > new Date(),
              ).length
            : current.invites;
        return {
          daily,
          missions: missionCount,
          season: seasonCount,
          requests,
          invites,
          journey: daily + missionCount + seasonCount,
          social: requests + invites,
          data: { missions: m, season: s },
        };
      });
    });
  }, [api, user?.id, routeKey, balanceKey]);
  // Optimistic: clear a dot the moment its reward is claimed.
  const clear = useCallback(
    (key) => {
      latestRequest.current += 1;
      setCounts((current) => {
        const next = { ...current, [key]: 0 };
        next.journey = next.daily + next.missions + next.season;
        next.social = next.requests + next.invites;
        return next;
      });
    },
    [],
  );
  return { ...counts, reload, clear };
}
