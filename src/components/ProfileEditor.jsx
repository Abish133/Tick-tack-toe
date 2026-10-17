"use client";

import AscendantFx, { fxTheme } from "./AscendantFx";
import AnimatedCosmeticImage from "./AnimatedCosmeticImage";
import { useEffect, useState } from "react";
import {
  ArrowRight,
  Check,
  Globe2,
  LoaderCircle,
  Shield,
  Sparkles,
  Trophy,
  UserRound,
  Swords,
  Target,
  Flame,
  Crown,
  Medal,
  Pencil,
} from "lucide-react";
import { POWER_CATALOG } from "../lib/game-engine/powers";
import {
  COSMETIC_THEMES,
  cosmeticAsset,
  cosmeticTheme,
  cosmeticStyle,
} from "../lib/cosmetic-collection";
import { CosmeticFrame, CosmeticArrival } from "./CosmeticAppearance";
import CosmeticArt from "./CosmeticArt";
import { GameFrame, GameButton, CustomSelect, Tabs } from "./ui";
import styles from "./ProfileEditor.module.css";
import { displayName } from "../lib/display-name";

const divisions = [
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
const cosmeticFields = {
  avatar: "avatar",
  board: "equippedBoard",
  marks: "equippedMark",
  title: "title",
  effect: "equippedEffect",
  frame: "equippedFrame",
  banner: "equippedBanner",
  arena: "equippedArena",
  emote: "equippedEmote",
};
const cosmeticLabels = {
  avatar: "Avatar",
  board: "Arena board",
  marks: "Marks",
  title: "Player title",
  effect: "Arrival effect",
  frame: "Avatar frame",
  banner: "Profile banner",
  arena: "Arena background",
  emote: "Signature emote",
};
const avatarAsset = (id) =>
  cosmeticAsset(id) ||
  `/assets/${{ "avatar-ember": "avatar-fire", "avatar-frost": "avatar-ice" }[id] || id || "avatar-void"}.png`;
const number = (value) => Number(value || 0).toLocaleString();
const identity = (user) => ({
  name: user?.name || "",
  bio: user?.profile?.bio || "",
  region: user?.profile?.region || "GLOBAL",
});
const rank = (player) =>
  divisions.find(([threshold]) => Number(player.cups || 0) >= threshold)?.[1] ||
  "Rookie";

function ProfilePortrait({ profile = {}, name, level }) {
  return (
    <div
      className={`${styles.portrait} collection-profile-portrait ${profile.equippedFrame || ""}`}
    >
      <AnimatedCosmeticImage
        cosmeticId={profile.avatar}
        src={avatarAsset(profile.avatar)}
        alt={`${name}'s equipped avatar`}
      />
      <CosmeticFrame cosmeticId={profile.equippedFrame} />
      <CosmeticArrival cosmeticId={profile.equippedEffect} />
      {fxTheme(profile.avatar) && (
        <AscendantFx theme={fxTheme(profile.avatar)} stars={5} className="asc-fx-small" />
      )}
      <span className={`${styles.level} collection-profile-level`}>
        {level || 1}
      </span>
    </div>
  );
}
function ProfileTitle({ profile = {} }) {
  const theme = COSMETIC_THEMES.find((entry) => entry.title === profile.title);
  return (
    <span
      className={`${styles.title} ${theme ? "collection-profile-title" : ""}`}
      data-cosmetic-theme={theme?.id}
      style={theme ? cosmeticStyle(`title-collection-${theme.id}`) : {}}
    >
      {profile.title || "Rookie Strategist"}
    </span>
  );
}
function FavoritePower({ player }) {
  const favorite = [...(player.powerUsage || [])].sort(
    (a, b) => b.count - a.count,
  )[0];
  return favorite && Number(favorite.count) > 0 ? (
    <div className={styles.favorite}>
      <Sparkles size={24} />
      <div>
        <span>Most used power</span>
        <strong>
          {POWER_CATALOG.find((power) => power.id === favorite.powerId)?.name ||
            favorite.powerId}
        </strong>
      </div>
      <small>{Number(favorite.count).toLocaleString()} recorded casts</small>
    </div>
  ) : null;
}
function PeakRank({ player }) {
  const cups = player.rating?.peakCups ?? player.peakCups;
  return cups != null ? (
    <div className={styles.peak}>
      <Crown size={23} />
      <span>Best division</span>
      <strong>
        {divisions.find(([threshold]) => Number(cups) >= threshold)?.[1] ||
          "Rookie"}
      </strong>
      <small>{number(cups)} peak cups</small>
    </div>
  ) : null;
}
function Stats({ player, records, own = false, navigate }) {
  const stats = player.stats || {},
    played = Number(stats.played || 0),
    winRate = played ? Math.round((Number(stats.wins || 0) / played) * 100) : 0;
  const values = [
    ["Matches", played, Swords],
    ["Wins", stats.wins, Trophy],
    ["Losses", stats.losses, Shield],
    ["Draws", stats.draws, Target],
    [
      own ? "Win rate" : "Ranked matches",
      own ? `${winRate}%` : stats.rankedPlayed,
      Medal,
    ],
    ["Current streak", stats.streak, Flame],
    ["Best streak", stats.bestStreak, Crown],
    ["Powers cast", stats.powersUsed, Sparkles],
  ];
  return (
    <GameFrame className={styles.section}>
      <header>
        <Trophy size={24} />
        <h3>Recorded performance</h3>
      </header>
      <div className={styles.performance}>
        {values.map(([label, value, Icon]) => (
          <div key={label}>
            <Icon size={25} />
            <strong>{typeof value === "string" ? value : number(value)}</strong>
            <span>{label}</span>
          </div>
        ))}
      </div>
      <PeakRank player={player} />
      <FavoritePower player={records || player} />
      {player.createdAt && (
        <p className={styles.muted}>
          Joined {new Date(player.createdAt).toLocaleDateString()}
        </p>
      )}
      {own && (
        <GameButton variant="secondary" onClick={() => navigate?.("/history")}>
          Explore match history <ArrowRight size={17} />
        </GameButton>
      )}
      <div className={styles.fairPlay}>
        <Shield size={17} />
        Every player has access to the same released competitive powers.
      </div>
    </GameFrame>
  );
}
function PlayerCard({ player, children, publicView = false }) {
  const played = Number(player.stats?.played || 0),
    winRate = played
      ? Math.round((Number(player.stats?.wins || 0) / played) * 100)
      : 0;
  return (
    <GameFrame
      variant="banner"
      className={`${styles.identity} ${cosmeticTheme(player.profile?.equippedBanner) ? "collection-profile-identity" : ""} ${player.profile?.equippedBanner || ""} ${player.profile?.equippedEffect || ""}`}
      style={cosmeticStyle(player.profile?.equippedBanner)}
    >
      {fxTheme(player.profile?.equippedBanner) && (
        <AscendantFx theme={fxTheme(player.profile?.equippedBanner)} edge stars={8} sweep />
      )}
      <ProfilePortrait
        profile={player.profile}
        name={player.name}
        level={player.level || player.profile?.level}
      />
      <div className={styles.nameplate}>
        <ProfileTitle profile={player.profile} />
        <h2>{displayName(player.name)}</h2>
        <span className={styles.rank}>
          <Trophy size={20} />
          {rank(player)}
        </span>
        <span className={styles.region}>
          <Globe2 size={15} />
          {player.profile?.region || "GLOBAL"}
        </span>
      </div>
      {player.profile?.bio && (
        <p className={styles.bio}>{player.profile.bio}</p>
      )}
      <div className={styles.numbers}>
        <div>
          <Trophy size={18} />
          <strong>{number(player.cups)}</strong>
          <span>Cups</span>
        </div>
        <div>
          <Sparkles size={18} />
          <strong>{number(player.xp ?? player.profile?.xp)}</strong>
          <span>Total XP</span>
        </div>
        <div>
          <Medal size={18} />
          <strong>{publicView ? `${winRate}%` : number(player.coins)}</strong>
          <span>{publicView ? "Win rate" : "Coins"}</span>
        </div>
      </div>
      <div className={styles.identityActions}>{children}</div>
    </GameFrame>
  );
}

export default function ProfileEditor(props) {
  return props.publicPlayerId ? (
    <PublicProfile {...props} />
  ) : (
    <OwnProfile {...props} />
  );
}

function PublicProfile({
  api,
  user,
  publicPlayerId,
  onError,
  onNotice,
  navigate,
}) {
  const [player, setPlayer] = useState(null),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  useEffect(() => {
    let current = true;
    setLoading(true);
    setError("");
    api(`/players/${encodeURIComponent(publicPlayerId)}`)
      .then((data) => {
        if (current) {
          const found = data.player || data.user;
          setPlayer(
            found
              ? {
                  ...found,
                  canAddFriend: data.canAddFriend ?? found.canAddFriend,
                }
              : null,
          );
        }
      })
      .catch((problem) => {
        if (current) {
          setError(problem.message);
          onError?.(problem.message);
        }
      })
      .finally(() => {
        if (current) setLoading(false);
      });
    return () => {
      current = false;
    };
  }, [api, publicPlayerId]);
  if (loading)
    return (
      <GameFrame className="loading-state">
        <LoaderCircle className="spin" size={25} />
        Opening player profile…
      </GameFrame>
    );
  if (!player)
    return (
      <GameFrame className={styles.empty}>
        <UserRound size={36} />
        <h3>Player profile unavailable</h3>
        <p>{error || "This player could not be found."}</p>
      </GameFrame>
    );
  async function requestFriend() {
    setBusy(true);
    try {
      await api("/friends/request", "POST", { userId: player.id });
      onNotice?.("Friend request sent.");
    } catch (problem) {
      onError?.(problem.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className={styles.layout}>
      <PlayerCard player={player} publicView>
        {user?.id === player.id ? (
          <GameButton
            variant="secondary"
            onClick={() => navigate?.("/profile")}
          >
            <Pencil size={17} />
            Edit my profile
          </GameButton>
        ) : (
          user && (
            <GameButton
              disabled={busy || player.canAddFriend === false}
              onClick={requestFriend}
            >
              {busy ? (
                <LoaderCircle className="spin" size={17} />
              ) : (
                <UserRound size={17} />
              )}
              Send friend request
            </GameButton>
          )
        )}
        <GameButton
          variant="secondary"
          onClick={() => navigate?.("/leaderboard")}
        >
          Return to standings <ArrowRight size={17} />
        </GameButton>
      </PlayerCard>
      <div className={styles.publicContent}>
        <Stats player={player} />
      </div>
    </div>
  );
}

function OwnProfile({
  api,
  user,
  refresh,
  onError,
  onNotice,
  navigate,
  onUpgrade,
}) {
  const [draft, setDraft] = useState(() => identity(user));
  const [inventory, setInventory] = useState([]),
    [records, setRecords] = useState(null),
    [loading, setLoading] = useState(true),
    [saving, setSaving] = useState(false),
    [equipping, setEquipping] = useState(null);
  const [tab, setTab] = useState("identity");
  useEffect(() => {
    setDraft(identity(user));
  }, [user?.id, user?.name, user?.profile?.bio, user?.profile?.region]);
  useEffect(() => {
    let current = true;
    if (!user) {
      setInventory([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    api("/inventory")
      .then((data) => {
        if (current)
          setInventory(
            (data.inventory || [])
              .map((entry) => entry.cosmetic)
              .filter(Boolean),
          );
      })
      .catch((error) => {
        if (current) onError?.(error.message);
      })
      .finally(() => {
        if (current) setLoading(false);
      });
    return () => {
      current = false;
    };
  }, [api, user?.id]);
  useEffect(() => {
    let current = true;
    setRecords(null);
    if (user?.id)
      api(`/players/${encodeURIComponent(user.id)}`)
        .then((data) => {
          if (current) setRecords(data.player || null);
        })
        .catch((error) => {
          if (current) onError?.(error.message);
        });
    return () => {
      current = false;
    };
  }, [api, user?.id, user?.stats?.powersUsed]);
  if (!user)
    return (
      <GameFrame className={styles.empty}>
        <UserRound size={36} />
        <h3>Your identity in the arena</h3>
        <p>Create a player to customize your profile.</p>
      </GameFrame>
    );
  const groups = Object.entries(cosmeticFields).filter(([type]) =>
    inventory.some((item) => item.type === type),
  );
  const selectedItem = (type) =>
    inventory.find(
      (item) =>
        item.type === type &&
        (type === "title"
          ? item.name === user.profile?.title
          : item.id === user.profile?.[cosmeticFields[type]]),
    );
  async function save(event) {
    event.preventDefault();
    setSaving(true);
    try {
      await api("/profile", "PATCH", {
        name: draft.name.trim(),
        bio: draft.bio.trim(),
        region: draft.region.trim().toUpperCase() || "GLOBAL",
      });
      await refresh();
      onNotice?.("Your player identity is saved.");
    } catch (error) {
      onError?.(error.message);
    } finally {
      setSaving(false);
    }
  }
  async function equip(itemId) {
    if (!itemId) return;
    setEquipping(itemId);
    try {
      await api("/inventory/equip", "POST", { cosmeticId: itemId });
      await refresh();
      onNotice?.("Your cosmetic is equipped.");
    } catch (error) {
      onError?.(error.message);
    } finally {
      setEquipping(null);
    }
  }

  return (
    <div className={styles.layout}>
      <PlayerCard player={user}>
        {user.guest && onUpgrade && (
          <GameButton onClick={onUpgrade}>
            Keep my progress <ArrowRight size={17} />
          </GameButton>
        )}
        <GameButton
          variant="secondary"
          onClick={() => navigate?.("/inventory")}
        >
          <Sparkles size={17} />
          Open cosmetic collection
        </GameButton>
      </PlayerCard>
      <div className={styles.content}>
        <Tabs
          label="Player profile sections"
          value={tab}
          onChange={setTab}
          items={[
            { id: "identity", label: "Edit profile", icon: Pencil },
            { id: "style", label: "Equipped style", icon: Sparkles },
            { id: "stats", label: "Performance", icon: Trophy },
          ]}
        />
        <div className={styles.scroll}>
          {tab === "identity" && (
            <GameFrame className={styles.section}>
              <header>
                <UserRound size={24} />
                <h3>Your player identity</h3>
              </header>
              <form onSubmit={save} className={styles.form}>
                <label htmlFor="profile-player-name">
                  Player name
                  <input
                    id="profile-player-name"
                    aria-label="Player name"
                    aria-describedby="profile-name-help"
                    minLength={2}
                    maxLength={20}
                    autoComplete="nickname"
                    value={draft.name}
                    onChange={(event) =>
                      setDraft((value) => ({
                        ...value,
                        name: event.target.value,
                      }))
                    }
                    required
                  />
                  <small id="profile-name-help">
                    2–20 characters. Your name must be unique.
                  </small>
                </label>
                <label htmlFor="profile-bio">
                  Player bio
                  <textarea
                    id="profile-bio"
                    aria-label="Player bio"
                    aria-describedby="profile-bio-count"
                    maxLength={200}
                    rows={3}
                    value={draft.bio}
                    placeholder="What kind of challenger are you?"
                    onChange={(event) =>
                      setDraft((value) => ({
                        ...value,
                        bio: event.target.value,
                      }))
                    }
                  />
                  <small id="profile-bio-count" className={styles.counter}>
                    {draft.bio.length} / 200
                  </small>
                </label>
                <label htmlFor="profile-region">
                  Country or region
                  <input
                    id="profile-region"
                    aria-label="Country or region"
                    aria-describedby="profile-region-help"
                    maxLength={20}
                    pattern="[A-Z][A-Z0-9-]{1,19}"
                    value={draft.region}
                    onChange={(event) =>
                      setDraft((value) => ({
                        ...value,
                        region: event.target.value.toUpperCase(),
                      }))
                    }
                    placeholder="GLOBAL"
                    required
                  />
                  <small id="profile-region-help">
                    Use a country code such as IN or US, a region such as EU, or
                    GLOBAL.
                  </small>
                </label>
                <GameButton type="submit" disabled={saving}>
                  {saving ? (
                    <LoaderCircle className="spin" size={18} />
                  ) : (
                    <Check size={18} />
                  )}
                  Save profile
                </GameButton>
              </form>
              <p className={styles.account}>
                {user.guest
                  ? "Guest progress belongs to this saved browser session. Register to keep it across devices."
                  : `Registered challenger · ${user.email}`}
              </p>
            </GameFrame>
          )}
          {tab === "style" && (
            <GameFrame className={styles.section}>
              <header>
                <Sparkles size={24} />
                <h3>Your equipped style</h3>
              </header>
              {loading ? (
                <p className={styles.muted}>
                  <LoaderCircle className="spin" size={18} />
                  Loading cosmetics…
                </p>
              ) : (
                <div className={styles.equipment}>
                  {groups.map(([type]) => {
                    const selected = selectedItem(type);
                    const available = inventory.filter(
                      (item) => item.type === type,
                    );
                    const choices = available.map((item) => ({
                      value: item.id,
                      label: item.name,
                    }));
                    if (!selected)
                      choices.unshift({
                        value: "",
                        label:
                          type === "title"
                            ? user.profile?.title || "Default title"
                            : "Default / none",
                      });
                    return (
                      <GameFrame
                        variant="card"
                        className={styles.equipmentCard}
                        key={type}
                      >
                        <span className={styles.cosmeticLabel}>
                          {cosmeticLabels[type]}
                        </span>
                        <span className={styles.equipmentPreview}>
                          {selected ? (
                            <CosmeticArt item={selected} />
                          ) : (
                            <Sparkles size={34} />
                          )}
                        </span>
                        <CustomSelect
                          label={`Equipped ${cosmeticLabels[type].toLowerCase()}`}
                          value={selected?.id || ""}
                          disabled={Boolean(equipping)}
                          onChange={equip}
                          options={choices}
                        />
                      </GameFrame>
                    );
                  })}
                </div>
              )}
              <div className={styles.fairPlay}>
                <Shield size={17} />
                Style changes never increase power strength.
              </div>
            </GameFrame>
          )}
          {tab === "stats" && (
            <Stats player={user} records={records} own navigate={navigate} />
          )}
        </div>
      </div>
    </div>
  );
}
