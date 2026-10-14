"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Users,
  Search,
  Send,
  Swords,
  ShieldBan,
  Flag,
  Check,
  X,
  Eye,
  RefreshCw,
  LoaderCircle,
} from "lucide-react";
import { cosmeticAsset } from "../lib/cosmetic-collection";
import { GameFrame, GameButton, Modal, CustomSelect } from "./ui";
import styles from "./JourneyPanels.module.css";

const portrait = (id) =>
  cosmeticAsset(id) ||
  `/assets/${{ "avatar-ember": "avatar-fire", "avatar-frost": "avatar-ice" }[id] || id || "avatar-void"}.png`;
const reportReasons = [
  "Unsporting behavior",
  "Suspected cheating",
  "Spam or harassment",
  "Other",
];

export default function SocialPanel({
  api,
  user,
  navigate,
  onError,
  onNotice,
  onChallenge,
  onAccept,
  onSpectate,
}) {
  const [data, setData] = useState(null);
  const [tab, setTab] = useState("friends");
  const [name, setName] = useState("");
  const [results, setResults] = useState([]);
  const [busy, setBusy] = useState("");
  const [report, setReport] = useState(null);
  const [reason, setReason] = useState(reportReasons[0]);
  const load = useCallback(
    () =>
      api("/friends")
        .then(setData)
        .catch((e) => onError(e.message)),
    [api, onError],
  );
  useEffect(() => {
    if (!user) return;
    load();
    const timer = setInterval(() => {
      if (!document.hidden) load();
    }, 15000);
    return () => clearInterval(timer);
  }, [user?.id, load]);

  async function perform(key, task, message) {
    setBusy(key);
    try {
      await task();
      if (message) onNotice(message);
      await load();
    } catch (e) {
      onError(e.message);
    } finally {
      setBusy("");
    }
  }
  async function search(event) {
    event.preventDefault();
    await perform(
      "search",
      async () => {
        const found = await api(
          `/players/search?q=${encodeURIComponent(name.trim())}`,
        );
        const exact = found.players?.find(
          (p) => p.name.toLowerCase() === name.trim().toLowerCase(),
        );
        if (exact) {
          await api("/friends/request", "POST", { userId: exact.id });
          setName("");
          setResults([]);
          onNotice("Friend request sent.");
        } else {
          setResults(found.players || []);
          if (!found.players?.length)
            onNotice("No matching players were found.");
        }
      },
      "",
    );
  }
  function identity(player) {
    return (
      <div className={styles.socialIdentity}>
        <img
          className={styles.socialAvatar}
          src={portrait(player.profile?.avatar)}
          alt=""
        />
        <button type="button" onClick={() => navigate(`/players/${player.id}`)}>
          <strong>{player.name}</strong>
          <small>
            {player.online ? (
              <>
                <i className={styles.onlineDot} />
                Online
              </>
            ) : (
              "Offline"
            )}
            {player.cups != null ? ` · ${player.cups} cups` : ""}
          </small>
        </button>
      </div>
    );
  }
  function tools(player) {
    return (
      <>
        <GameButton
          variant="ghost"
          disabled={!!busy}
          onClick={() =>
            perform(
              `block:${player.id}`,
              () => api("/friends/block", "POST", { userId: player.id }),
              `${player.name} blocked.`,
            )
          }
        >
          <ShieldBan size={16} />
          Block
        </GameButton>
        <GameButton
          variant="ghost"
          onClick={() => {
            setReason(reportReasons[0]);
            setReport(player);
          }}
        >
          <Flag size={16} />
          Report
        </GameButton>
      </>
    );
  }
  function card(player, children) {
    return (
      <GameFrame
        as="article"
        variant="card"
        className={styles.socialCard}
        key={player.id}
      >
        {identity(player)}
        <div className={styles.socialActions}>{children}</div>
      </GameFrame>
    );
  }
  if (!data)
    return (
      <div className="loading-state">
        <LoaderCircle className="spin" />
        Opening your rivals list…
      </div>
    );
  const incoming = (data.requests || []).filter(
      (r) => r.receiverId === user.id,
    ),
    outgoing = (data.requests || []).filter((r) => r.senderId === user.id);
  const challenges = (data.challenges || []).filter(
    (c) =>
      c.metadata?.status === "pending" &&
      new Date(c.metadata.expiresAt) > new Date(),
  );
  const blocks = data.blocks || data.blocked || [];
  const empty =
    (tab === "friends" && !data.friends?.length) ||
    (tab === "requests" && !incoming.length && !outgoing.length) ||
    (tab === "invites" && !challenges.length) ||
    (tab === "recent" && !data.recent?.length) ||
    (tab === "blocked" && !blocks.length);

  return (
    <div className={styles.screen}>
      <GameFrame as="form" className={styles.socialSearch} onSubmit={search}>
        <Search size={23} />
        <input
          aria-label="Player name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Exact player name, or search for a rival"
          minLength={2}
          maxLength={20}
          required
        />
        <GameButton type="submit" disabled={!!busy}>
          Send request <Send size={17} />
        </GameButton>
      </GameFrame>
      <nav className={styles.socialTabs} aria-label="Social sections">
        {[
          ["friends", `Friends (${data.friends?.length || 0})`],
          ["requests", `Requests (${incoming.length + outgoing.length})`],
          ["invites", `Invitations (${challenges.length})`],
          ["recent", "Recent opponents"],
          ["blocked", `Blocked (${blocks.length})`],
        ].map(([id, label]) => (
          <button
            type="button"
            aria-pressed={tab === id}
            className={tab === id ? styles.selected : ""}
            onClick={() => setTab(id)}
            key={id}
          >
            {label}
          </button>
        ))}
        <GameButton variant="icon" onClick={load} aria-label="Refresh friends">
          <RefreshCw size={19} />
        </GameButton>
      </nav>
      <div className={styles.scroll}>
        {results.length > 0 && (
          <section className={styles.searchResults}>
            <h3>Matching players</h3>
            <div className={styles.socialGrid}>
              {results.map((player) =>
                card(
                  player,
                  <>
                    <GameButton
                      disabled={!!busy}
                      onClick={() =>
                        perform(
                          `request:${player.id}`,
                          () =>
                            api("/friends/request", "POST", {
                              userId: player.id,
                            }),
                          "Friend request sent.",
                        )
                      }
                    >
                      <Send size={16} />
                      Add friend
                    </GameButton>
                    {tools(player)}
                  </>,
                ),
              )}
            </div>
          </section>
        )}
        <div className={styles.socialGrid}>
          {tab === "friends" &&
            (data.friends || []).map((player) =>
              card(
                player,
                <>
                  <GameButton
                    disabled={!!busy}
                    onClick={() =>
                      perform(`challenge:${player.id}`, () =>
                        onChallenge(player),
                      )
                    }
                  >
                    <Swords size={17} />
                    Challenge
                  </GameButton>
                  {player.spectatorMatchId && (
                    <GameButton
                      variant="secondary"
                      onClick={() => onSpectate(player.spectatorMatchId)}
                    >
                      <Eye size={17} />
                      Spectate
                    </GameButton>
                  )}
                  <GameButton
                    variant="ghost"
                    aria-label={`Remove ${player.name}`}
                    disabled={!!busy}
                    onClick={() =>
                      perform(
                        `remove:${player.id}`,
                        () => api(`/friends/${player.id}`, "DELETE"),
                        "Friend removed.",
                      )
                    }
                  >
                    <X size={16} />
                    Remove
                  </GameButton>
                  {tools(player)}
                </>,
              ),
            )}
          {tab === "requests" &&
            [...incoming, ...outgoing].map((request) => {
              const received = request.receiverId === user.id,
                player = received ? request.sender : request.receiver;
              return (
                <GameFrame
                  as="article"
                  variant="card"
                  className={styles.socialCard}
                  key={request.id}
                >
                  {identity(player)}
                  <p>
                    {received
                      ? `${player.name} wants to be friends`
                      : "Your request is waiting for a reply."}
                  </p>
                  {received && (
                    <div className={styles.socialActions}>
                      {["accept", "reject"].map((action) => (
                        <GameButton
                          variant={
                            action === "accept" ? "primary" : "secondary"
                          }
                          key={action}
                          disabled={!!busy}
                          onClick={() =>
                            perform(
                              `${action}:${request.id}`,
                              () =>
                                api("/friends/respond", "POST", {
                                  requestId: request.id,
                                  action,
                                }),
                              action === "accept"
                                ? "Friend request accepted."
                                : "Friend request declined.",
                            )
                          }
                        >
                          {action === "accept" ? (
                            <Check size={17} />
                          ) : (
                            <X size={17} />
                          )}
                          {action === "accept" ? "Accept" : "Reject"}
                        </GameButton>
                      ))}
                    </div>
                  )}
                </GameFrame>
              );
            })}
          {tab === "invites" &&
            challenges.map((challenge) => (
              <GameFrame
                as="article"
                variant="card"
                className={styles.socialCard}
                key={challenge.id}
              >
                <div className={styles.title}>
                  <Swords size={26} />
                  <h3>A rival is waiting</h3>
                </div>
                <p>{challenge.message}</p>
                <p>
                  Expires{" "}
                  {new Date(challenge.metadata.expiresAt).toLocaleTimeString()}
                </p>
                <GameButton
                  disabled={!!busy}
                  onClick={() =>
                    perform(`invite:${challenge.id}`, () =>
                      onAccept(challenge.id),
                    )
                  }
                >
                  <Swords size={17} />
                  Accept challenge
                </GameButton>
              </GameFrame>
            ))}
          {tab === "recent" &&
            (data.recent || []).map((player) =>
              card(
                player,
                <>
                  <GameButton
                    variant="secondary"
                    disabled={!!busy}
                    onClick={() =>
                      perform(
                        `request:${player.id}`,
                        () =>
                          api("/friends/request", "POST", {
                            userId: player.id,
                          }),
                        "Friend request sent.",
                      )
                    }
                  >
                    <Users size={17} />
                    Add friend
                  </GameButton>
                  {tools(player)}
                </>,
              ),
            )}
          {tab === "blocked" &&
            blocks.map((block) => {
              const player = block.blocked || block;
              return (
                <GameFrame
                  as="article"
                  variant="card"
                  className={styles.socialCard}
                  key={player.id}
                >
                  {identity(player)}
                  <p>Requests and challenges from this player are blocked.</p>
                  <GameButton
                    variant="secondary"
                    disabled={!!busy}
                    onClick={() =>
                      perform(
                        `unblock:${player.id}`,
                        () => api(`/friends/block/${player.id}`, "DELETE"),
                        `${player.name} unblocked.`,
                      )
                    }
                  >
                    Unblock player
                  </GameButton>
                </GameFrame>
              );
            })}
        </div>
        {empty && (
          <GameFrame className={styles.empty}>
            <Users size={35} />
            <h3>
              {tab === "friends"
                ? "A rivalry starts with hello"
                : tab === "requests"
                  ? "No pending requests"
                  : tab === "invites"
                    ? "No invitations waiting"
                    : tab === "recent"
                      ? "Your next rival is ahead"
                      : "Your block list is empty"}
            </h3>
            <p>
              Find a player by name, or share a private room link with a friend.
            </p>
          </GameFrame>
        )}
      </div>
      {report && (
        <Modal title={`Report ${report.name}`} onClose={() => setReport(null)}>
          <form
            className={styles.reportForm}
            onSubmit={(event) => {
              event.preventDefault();
              const fields = Object.fromEntries(
                new FormData(event.currentTarget),
              );
              perform(
                "report",
                async () => {
                  await api("/reports", "POST", {
                    userId: report.id,
                    reason: `${reason}: ${fields.details}`,
                  });
                  setReport(null);
                },
                "Report sent to the arena administrator.",
              );
            }}
          >
            <CustomSelect
              label="Reason"
              value={reason}
              onChange={setReason}
              options={reportReasons.map((value) => ({ value, label: value }))}
            />
            <label>
              What happened?
              <textarea
                name="details"
                minLength={3}
                maxLength={400}
                required
                placeholder="Describe the behavior for the moderator."
              />
            </label>
            <div className={styles.reportActions}>
              <GameButton type="submit" disabled={!!busy}>
                Submit report
              </GameButton>
              <GameButton variant="secondary" onClick={() => setReport(null)}>
                Cancel report
              </GameButton>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
