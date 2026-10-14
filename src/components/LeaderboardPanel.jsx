"use client";

import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Crown,
  Globe2,
  LoaderCircle,
  RefreshCw,
  Trophy,
  Users,
  Info,
} from "lucide-react";
import { cosmeticAsset } from "../lib/cosmetic-collection";
import { GameFrame, GameButton, CustomSelect, Modal, Tabs } from "./ui";
import styles from "./LeaderboardPanel.module.css";

const categories = [
  ["cups", "Ranked cups"],
  ["weekly", "Weekly victories"],
  ["wins", "Lifetime wins"],
  ["streak", "Win streak"],
  ["tournaments", "Tournament victories"],
];
const scopes = [
  ["global", "Global", Globe2],
  ["regional", "Country / region", Globe2],
  ["season", "Season", Crown],
  ["friends", "Friends", Users],
];
const number = (value) => Number(value || 0).toLocaleString();
const portrait = (profile) =>
  cosmeticAsset(profile?.avatar) ||
  `/assets/${{ "avatar-ember": "avatar-fire", "avatar-frost": "avatar-ice" }[profile?.avatar] || profile?.avatar || "avatar-void"}.png`;
const metric = (entry, category) =>
  category === "weekly"
    ? (entry.weeklyWins ?? entry.score ?? entry.value ?? entry.wins)
    : category === "tournaments"
      ? (entry.tournamentWins ?? entry.score ?? entry.value ?? entry.wins)
      : category === "streak"
        ? entry.streak
        : category === "wins"
          ? entry.wins
          : entry.cups;

export default function LeaderboardPanel({
  api,
  user,
  onError,
  onRegister,
  onProfile,
}) {
  const [category, setCategory] = useState("cups");
  const [scope, setScope] = useState("global");
  const [region, setRegion] = useState(
    user?.profile?.region === "GLOBAL" ? "" : user?.profile?.region || "",
  );
  const [season, setSeason] = useState("");
  const [offset, setOffset] = useState(0);
  const [data, setData] = useState(null);
  const [metadata, setMetadata] = useState({});
  const [loading, setLoading] = useState(true);
  const [failure, setFailure] = useState("");
  const [retry, setRetry] = useState(0);
  const [info, setInfo] = useState(false);
  const regionEdited = useRef(false);

  useEffect(() => {
    const saved = user?.profile?.region;
    if (!regionEdited.current && saved && saved !== "GLOBAL") setRegion(saved);
  }, [user?.id, user?.profile?.region]);
  const chooseRegion = (value) => {
    regionEdited.current = true;
    setRegion(value);
  };
  useEffect(() => {
    setOffset(0);
  }, [category, scope, region, season]);
  useEffect(() => {
    let current = true;
    if (
      (scope === "friends" && !user) ||
      (scope === "regional" && region.length < 2)
    ) {
      setLoading(false);
      setData(null);
      return;
    }
    setLoading(true);
    setFailure("");
    const params = new URLSearchParams({
      category,
      scope,
      limit: "25",
      offset: String(offset),
    });
    if (region && scope === "regional") params.set("region", region);
    if (season && scope === "season") params.set("season", season);
    api(`/leaderboard?${params}`)
      .then((result) => {
        if (!current) return;
        setData(result);
        setMetadata((previous) => ({
          ...previous,
          divisions: result.divisions || previous.divisions,
          seasons: result.seasons || previous.seasons,
          season: result.season || previous.season,
          regions: result.regions || previous.regions,
        }));
      })
      .catch((error) => {
        if (current) {
          setData(null);
          setFailure(error.message);
          onError?.(error.message);
        }
      })
      .finally(() => {
        if (current) setLoading(false);
      });
    return () => {
      current = false;
    };
  }, [api, user?.id, category, scope, region, season, offset, retry]);

  const entries = data?.entries || data?.leaderboard || [];
  const current =
    data?.currentPlayerRank || entries.find((entry) => entry.id === user?.id);
  const metricLabel = categories.find(([id]) => id === category)?.[1] || "Cups";
  const selectedSeason = (metadata.seasons || []).find(
    (item) => item.id === (season || metadata.season?.id),
  );
  const rankName = (entry) =>
    [...(metadata.divisions || [])]
      .sort((a, b) => b.minCups - a.minCups)
      .find((item) => Number(entry.cups || 0) >= item.minCups)?.name ||
    "Rookie";
  const selectCategory = (value) => {
    setCategory(value);
    setOffset(0);
    if (scope === "season" && value !== "cups") setScope("global");
  };
  const selectScope = (value) => {
    setScope(value);
    setOffset(0);
    if (value === "season") setCategory("cups");
  };

  function Player({ entry, compact = false }) {
    return (
      <button
        type="button"
        className={compact ? styles.compactPlayer : styles.player}
        onClick={() => onProfile?.(entry.id)}
        aria-label={`View ${entry.name}'s profile`}
        disabled={!onProfile}
      >
        <span className={styles.avatar}>
          <img src={portrait(entry.profile)} alt="" loading="lazy" />
        </span>
        <span>
          <strong>
            {entry.name}
            {entry.id === user?.id && <span className={styles.you}>YOU</span>}
          </strong>
          <small>
            {rankName(entry)} · Level {entry.level || entry.profile?.level || 1}
          </small>
        </span>
      </button>
    );
  }
  function Row({ entry, personal = false }) {
    const played = Number(entry.played ?? entry.stats?.played ?? 0),
      wins = Number(entry.wins ?? entry.stats?.wins ?? 0);
    const winRate =
      entry.winRate != null
        ? Math.round(Number(entry.winRate) * 100)
        : played
          ? Math.round((wins / played) * 100)
          : null;
    return (
      <article
        className={`${styles.row} ${entry.id === user?.id ? styles.isYou : ""} ${personal ? styles.personal : ""}`}
      >
        <span className={styles.position}>
          {entry.rank ?? entry.position ?? "—"}
        </span>
        <Player entry={entry} />
        <strong className={styles.score}>
          {category === "cups" && <Trophy size={18} />}
          {number(metric(entry, category))}
        </strong>
        <span className={styles.extra}>
          {winRate == null ? "—" : `${winRate}%`}
          <small>Win rate</small>
        </span>
        <span className={styles.extra}>
          {number(entry.streak ?? entry.stats?.streak)}
          <small>Streak</small>
        </span>
      </article>
    );
  }

  return (
    <div className={styles.leaderboard}>
      <div className={styles.controls}>
        <Tabs
          label="Leaderboard scope"
          value={scope}
          onChange={selectScope}
          items={scopes.map(([id, label, icon]) => ({ id, label, icon }))}
        />
        <div className={styles.ranking}>
          <Tabs
            label="Leaderboard category"
            value={category}
            onChange={selectCategory}
            className={styles.categories}
            items={categories.map(([id, label]) => ({
              id,
              label,
              disabled: scope === "season" && id !== "cups",
            }))}
          />
          <GameButton
            variant="icon"
            aria-label="Ranking information"
            onClick={() => setInfo(true)}
          >
            <Info size={22} />
          </GameButton>
        </div>
      </div>
      {scope === "regional" && (
        <div className={styles.filterRow}>
          <CustomSelect
            id="leaderboard-region"
            label="Country or region"
            value={region}
            onChange={chooseRegion}
            options={[
              { value: "", label: "Choose a region" },
              ...[
                ...new Set(
                  [user?.profile?.region, ...(metadata.regions || [])].filter(
                    (value) => value && value !== "GLOBAL",
                  ),
                ),
              ]
                .sort()
                .map((value) => ({ value, label: value })),
            ]}
          />
          <label htmlFor="leaderboard-region-code">
            Or enter a code
            <input
              id="leaderboard-region-code"
              maxLength={20}
              placeholder="IN, US, EU…"
              value={region}
              onChange={(event) =>
                chooseRegion(
                  event.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, ""),
                )
              }
            />
          </label>
        </div>
      )}
      {scope === "season" && (
        <div className={styles.filterRow}>
          <CustomSelect
            id="leaderboard-season"
            label="Competitive season"
            value={season || metadata.season?.id || ""}
            onChange={setSeason}
            options={
              (metadata.seasons || []).length
                ? metadata.seasons.map((item) => ({
                    value: item.id,
                    label: `${item.name}${item.active ? " · active" : ""}`,
                  }))
                : [{ value: "", label: "Current season" }]
            }
          />
          {selectedSeason && (
            <p>
              {new Date(selectedSeason.startsAt).toLocaleDateString()} –{" "}
              {new Date(selectedSeason.endsAt).toLocaleDateString()}
            </p>
          )}
        </div>
      )}
      <div className={styles.content}>
        {scope === "friends" && !user ? (
          <GameFrame className={styles.empty}>
            <Users size={34} />
            <h3>A friendly competition</h3>
            <p>Create a player to compare results with your friends.</p>
            {onRegister && (
              <GameButton onClick={onRegister}>
                Enter the arena <ArrowRight size={17} />
              </GameButton>
            )}
          </GameFrame>
        ) : scope === "regional" && region.length < 2 ? (
          <GameFrame className={styles.empty}>
            <Globe2 size={34} />
            <h3>Pick your corner of the arena</h3>
            <p>Choose or enter a country or region to see its players.</p>
          </GameFrame>
        ) : loading ? (
          <GameFrame className={styles.empty} aria-live="polite">
            <LoaderCircle className="spin" size={26} />
            <p>Gathering the standings…</p>
          </GameFrame>
        ) : failure ? (
          <GameFrame className={styles.empty}>
            <h3>Standings could not load</h3>
            <p>{failure}</p>
            <GameButton
              variant="secondary"
              onClick={() => setRetry((value) => value + 1)}
            >
              <RefreshCw size={17} />
              Try again
            </GameButton>
          </GameFrame>
        ) : (
          <>
            {offset === 0 && entries.length > 0 && (
              <section className={styles.podium} aria-label="Top challengers">
                {entries.slice(0, 3).map((entry, index) => (
                  <GameFrame
                    variant="card"
                    as="article"
                    key={entry.id}
                    className={`${styles.podiumCard} ${index === 0 ? styles.champion : ""}`}
                  >
                    <span className={styles.podiumRank}>
                      {index === 0 ? <Crown size={28} /> : <Trophy size={23} />}
                      #{entry.rank ?? index + 1}
                    </span>
                    <Player entry={entry} compact />
                    <strong className={styles.podiumScore}>
                      {number(metric(entry, category))}
                    </strong>
                    <span className={styles.metricName}>{metricLabel}</span>
                  </GameFrame>
                ))}
              </section>
            )}
            <div className={styles.rankScroll} aria-label="Ranked players">
              {entries.length ? (
                entries.map((entry) => <Row key={entry.id} entry={entry} />)
              ) : (
                <GameFrame className={styles.empty}>
                  <Trophy size={35} />
                  <h3>The next chapter starts with a match</h3>
                  <p>No eligible players have results in this ranking yet.</p>
                </GameFrame>
              )}
            </div>
            {Boolean(data?.hasMore || offset > 0) && (
              <div className={styles.pagination}>
                <GameButton
                  variant="secondary"
                  disabled={offset === 0}
                  onClick={() => setOffset(Math.max(0, offset - 25))}
                >
                  <ArrowLeft size={17} />
                  Previous
                </GameButton>
                <span>
                  {entries.length
                    ? `${offset + 1}–${offset + entries.length}`
                    : "0"}
                  {data?.total != null ? ` of ${number(data.total)}` : ""}
                </span>
                <GameButton
                  variant="secondary"
                  disabled={!data?.hasMore}
                  onClick={() => setOffset(data.nextOffset ?? offset + 25)}
                >
                  Next
                  <ArrowRight size={17} />
                </GameButton>
              </div>
            )}
            {current && (
              <section
                className={styles.yourPlace}
                aria-label="Your place in this ranking"
              >
                <h3>Your place in this ranking</h3>
                <Row entry={current} personal />
              </section>
            )}
          </>
        )}
      </div>
      {info && (
        <Modal title="Ranking information" onClose={() => setInfo(false)}>
          <p className={styles.caption}>
            {category === "cups"
              ? "Ranked human matches determine cup standings."
              : category === "weekly"
                ? "Human match victories since Monday at 00:00 UTC."
                : category === "streak"
                  ? "Consecutive completed human match victories."
                  : category === "tournaments"
                    ? "Championships from completed verified tournaments."
                    : "Wins from completed human matches."}{" "}
            {scope === "friends"
              ? "Your accepted friends and your own results."
              : null}
          </p>
        </Modal>
      )}
    </div>
  );
}
