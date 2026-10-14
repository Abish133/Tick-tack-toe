"use client";
import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { usePathname, useRouter } from "next/navigation";
import CosmeticShop from "./CosmeticShop";
import GameShell from "./GameShell";
import ScreenHeading from "./ScreenHeading";
import { GameUIProvider, Modal as GameModal, Tabs } from "./ui";
import GameEntrance from "./GameEntrance";
import BattleHub, { ModeSelect } from "./BattleHub";
import BoardSizePicker from "./BoardSizePicker";
import { boardSizeOf } from "../lib/game-engine/geometry";
import {
  CosmeticMark,
  CosmeticFrame,
  CosmeticArrival,
} from "./CosmeticAppearance";
import {
  cosmeticAsset,
  cosmeticStyle,
  cosmeticTheme,
  cosmeticEmotes,
} from "../lib/cosmetic-collection";
import PowerEffects from "./PowerEffects";
import { POWER_INFO, POWER_TONES } from "./PowerPresentation";
import PowerTargetControls, {
  CellStatuses,
  effectLabel,
  targetHint,
} from "./PowerTargetControls";
import PowerCollection from "./PowerCollection";
import PowerLab from "./PowerLab";
import PowerRules from "./PowerRules";
import { legalActions } from "../lib/game-engine/index";
import InventoryPanel from "./InventoryPanel";
import AdminPanel from "./AdminPanel";
import TournamentView from "./TournamentView";
import AuthHelp from "./AuthHelp";
import DailyPuzzle from "./DailyPuzzle";
import ProgressPanel from "./ProgressPanel";
import MissionsPanel from "./MissionsPanel";
import HistoryPanel from "./HistoryPanel";
import SocialPanel from "./SocialPanel";
import BattleScreen from "./BattleScreen";
import ProfileEditor from "./ProfileEditor";
import LeaderboardPanel from "./LeaderboardPanel";
import ReplayAnalysis from "./ReplayAnalysis";
import OfflineArena from "./OfflineArena";
import TutorialArena from "./TutorialArena";
import { isArenaRoute } from "../lib/routes";
import extraStyles from "./ArenaExtras.module.css";
import { io } from "socket.io-client";
import { AnimatePresence, motion } from "motion/react";
import {
  Link,
  Swords,
  Sparkles,
  Trophy,
  ShoppingBag,
  Users,
  Settings,
  ChevronRight,
  ArrowRight,
  ArrowLeft,
  Play,
  X,
  Circle,
  Flame,
  Shield,
  Orbit,
  Snowflake,
  Gem,
  Zap,
  LockKeyhole,
  Check,
  CheckCircle2,
  Volume2,
  VolumeX,
  LogOut,
  BookOpen,
  Clock3,
  Target,
  Crown,
  Coins,
  Radio,
  Eye,
  RefreshCw,
  Flag,
  Send,
  Search,
  LoaderCircle,
  Gift,
  History,
  UserRound,
  Menu,
  Mail,
  Activity,
  Layers3,
  Compass,
  Heart,
  Copy,
  ExternalLink,
  Pause,
  SkipForward,
  SkipBack,
  Medal,
  WandSparkles,
} from "lucide-react";

const DIFFICULTIES = [
  "Beginner",
  "Easy",
  "Medium",
  "Hard",
  "Expert",
  "Extreme",
  "Nightmare",
];
const NAV = [
  { path: "/", label: "Arena", icon: Compass },
  { path: "/powers", label: "Powers & loadout", icon: WandSparkles },
  { path: "/leaderboard", label: "Leaderboards", icon: Trophy },
  { path: "/shop", label: "Cosmetic shop", icon: ShoppingBag },
  { path: "/inventory", label: "Inventory", icon: Layers3 },
  { path: "/friends", label: "Friends", icon: Users },
  { path: "/history", label: "Match history", icon: History },
  { path: "/local-play", label: "Local & offline play", icon: Layers3 },
];
const DIVISIONS = [
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
const rank = (n) =>
  DIVISIONS.find(([v]) => Number(n || 0) >= v)?.[1] || "Rookie";
const rankProgress = (n) => {
  const cups = Number(n || 0),
    ascending = [...DIVISIONS].reverse(),
    i = ascending.findLastIndex(([v]) => cups >= v);
  return i === ascending.length - 1
    ? 100
    : Math.max(
        0,
        Math.min(
          100,
          ((cups - ascending[i][0]) / (ascending[i + 1][0] - ascending[i][0])) *
            100,
        ),
      );
};
const pretty = (v) => Number(v || 0).toLocaleString();
const requestId = () =>
  globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}`;
const initials = (name) => (name || "Wanderer").slice(0, 2).toUpperCase();
const EMOTE_LABELS = {
  wow: "Nice move!",
  gg: "Well played!",
  wave: "Good luck!",
  think: "Thinking…",
  fire: "What a play!",
  shield: "Good defense!",
  star: "Star play!",
  snow: "Cool move!",
  sun: "Shine on!",
  crown: "Royal move!",
  wavecrest: "Ride the wave!",
  pearl: "Hidden gem!",
  leaf: "Stay rooted!",
  bloom: "Beautiful play!",
  bolt: "Lightning fast!",
  spark: "Great spark!",
  rose: "Graceful move!",
  heart: "Much love!",
  gear: "Perfect timing!",
  hourglass: "Take your time!",
  moon: "Moonlight magic!",
  lotus: "Find your calm!",
  flame: "Keep blazing!",
  anvil: "Well forged!",
  crystal: "Crystal clear!",
  aurora: "Brilliant play!",
  planet: "Out of this world!",
  comet: "Star streak!",
};
function Avatar({
  name,
  size = "normal",
  tone = "violet",
  skin = "avatar-void",
  frame = "",
  effect = "",
}) {
  const asset =
    cosmeticAsset(skin) ||
    `/assets/${{ "avatar-ember": "avatar-fire", "avatar-frost": "avatar-ice" }[skin] || skin}.png`;
  return (
    <div
      className={`avatar ${size} ${tone} ${frame} ${cosmeticTheme(skin) ? "collection-avatar" : ""} ${cosmeticTheme(frame) ? "collection-framed" : ""}`}
      style={{ ...cosmeticStyle(skin), ...cosmeticStyle(frame) }}
    >
      <span>{initials(name)}</span>
      <img
        src={asset}
        alt=""
        onError={(e) => {
          e.currentTarget.style.display = "none";
        }}
      />
      <i />
      <CosmeticFrame cosmeticId={frame} />
      <CosmeticArrival cosmeticId={effect} />
    </div>
  );
}
function Sprite({ index = 0, className = "" }) {
  return (
    <span
      aria-hidden="true"
      className={`sprite ${className}`}
      style={{
        backgroundPosition: `${(index % 3) * 50}% ${Math.floor(index / 3) * 100}%`,
      }}
    />
  );
}
function Badge({ children, kind = "" }) {
  return <span className={`badge ${kind}`}>{children}</span>;
}
function Empty({ icon: Icon = Orbit, title, children, action }) {
  return (
    <div className="empty">
      <Icon size={36} />
      <h3>{title}</h3>
      <p>{children}</p>
      {action}
    </div>
  );
}
function sound(type, settings) {
  if (!settings.sound || typeof window === "undefined") return;
  try {
    const ctx =
      window.eaAudio ||
      (window.eaAudio = new (window.AudioContext ||
        window.webkitAudioContext)());
    if (ctx.state === "suspended") ctx.resume();
    const osc = ctx.createOscillator(),
      gain = ctx.createGain();
    const tones = {
      ...POWER_TONES,
      win: [660, 990, "sine"],
      click: [430, 300, "sine"],
    };
    const tone = tones[type] || tones.click;
    osc.type = tone[2];
    osc.frequency.setValueAtTime(tone[0], ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(tone[1], ctx.currentTime + 0.15);
    gain.gain.setValueAtTime((settings.volume ?? 50) / 900, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.26);
  } catch {}
}

export default function ArenaApp() {
  const router = useRouter(),
    pathname = usePathname();
  const [armoryTab, setArmoryTab] = useState("deck");
  useEffect(() => {
    const lab = () => setArmoryTab("lab");
    window.addEventListener("elemental:inspect-power", lab);
    return () => window.removeEventListener("elemental:inspect-power", lab);
  }, []);
  const [entered, setEntered] = useState(false),
    [savedLocal, setSavedLocal] = useState(false),
    [boardSize, setBoardSize] = useState(3),
    [newGameModal, setNewGameModal] = useState(false);
  const enteredRef = useRef(false);
  enteredRef.current = entered;
  useEffect(() => {
    let hasEntered = false;
    try {
      hasEntered = sessionStorage.getItem("ea:entered") === "1";
      const saved = JSON.parse(
        localStorage.getItem("elemental-arena-local-classic-v1"),
      );
      setSavedLocal(
        saved?.game?.status === "active" && saved.game.board?.some(Boolean),
      );
    } catch {}
    if (pathname !== "/" || hasEntered) {
      enteredRef.current = true;
      setEntered(true);
    }
  }, []);
  function enterArena() {
    enteredRef.current = true;
    setEntered(true);
    try {
      sessionStorage.setItem("ea:entered", "1");
    } catch {}
  }
  function continueGame() {
    enterArena();
    navigate(
      matchRef.current?.state?.status === "active" ? "/battle" : "/local-play",
    );
  }
  const [user, setUser] = useState(null),
    [sessionReady, setSessionReady] = useState(false),
    [features, setFeatures] = useState({}),
    [connected, setConnected] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState("");
  const [auth, setAuth] = useState(null),
    [authBusy, setAuthBusy] = useState(false),
    [authError, setAuthError] = useState(""),
    [menu, setMenu] = useState(false),
    [busy, setBusy] = useState(false);
  const [match, setMatch] = useState(null),
    [queue, setQueue] = useState(null),
    [queueStarted, setQueueStarted] = useState(0),
    [room, setRoom] = useState(null),
    [roomModal, setRoomModal] = useState(false),
    [roomCode, setRoomCode] = useState(""),
    [practiceModal, setPracticeModal] = useState(false),
    [difficulty, setDifficulty] = useState("Hard"),
    [ruleset, setRuleset] = useState("elemental");
  const [selectedPower, setSelectedPower] = useState(null),
    [source, setSource] = useState(null),
    [now, setNow] = useState(Date.now()),
    [emote, setEmote] = useState(""),
    [surrender, setSurrender] = useState(false);
  const [loadout, setLoadout] = useState(["fire", "shield", "portal"]),
    [catalog, setCatalog] = useState({}),
    [pageData, setPageData] = useState(null),
    [loading, setLoading] = useState(false),
    [filter, setFilter] = useState("All"),
    [ownedIds, setOwnedIds] = useState([]);
  const [settings, setSettings] = useState({
      sound: true,
      volume: 50,
      reducedMotion: false,
      highContrast: false,
      quality: "High",
      screenShake: false,
      profileVisibility: "public",
      allowFriendRequests: true,
      showOnline: true,
      allowSpectators: true,
      notifications: true,
    }),
    [profileName, setProfileName] = useState(""),
    [friendName, setFriendName] = useState(""),
    [replay, setReplay] = useState(null),
    [replayIndex, setReplayIndex] = useState(0),
    [replayPlaying, setReplayPlaying] = useState(false);
  const [allowSpectators, setAllowSpectators] = useState(true),
    [watchModal, setWatchModal] = useState(false),
    [watchId, setWatchId] = useState(""),
    [muteEmotes, setMuteEmotes] = useState(false),
    [rematchRequested, setRematchRequested] = useState(false),
    [rematchOffer, setRematchOffer] = useState(false);
  const socketRef = useRef(null),
    pendingIntent = useRef(null),
    settingsRef = useRef(settings),
    matchRef = useRef(match),
    userRef = useRef(user),
    muteRef = useRef(false),
    clockOffset = useRef(0),
    pathnameRef = useRef(pathname),
    settingsOwner = useRef(null);
  settingsRef.current = settings;
  matchRef.current = match;
  userRef.current = user;
  muteRef.current = muteEmotes;
  pathnameRef.current = pathname;
  const api = useCallback(async (url, method = "GET", body) => {
    const res = await fetch(`/api${url}`, {
      method,
      headers: { "Content-Type": "application/json" },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    let data;
    try {
      data = await res.json();
    } catch {
      throw new Error("The arena server is unavailable. Please try again.");
    }
    if (!res.ok || data.ok === false)
      throw new Error(
        data.error?.message ||
          data.message ||
          "Request could not be completed.",
      );
    return data;
  }, []);
  const refresh = useCallback(async () => {
    try {
      const data = await api("/auth/session");
      setUser(data.user);
      setFeatures(data.features || {});
      if (data.user) {
        setLoadout(data.user.loadout || ["fire", "shield", "portal"]);
        setProfileName(data.user.name);
        if (data.user.settings && settingsOwner.current !== data.user.id) {
          settingsOwner.current = data.user.id;
          setSettings((s) => ({ ...s, ...data.user.settings }));
        }
      }
      return data.user;
    } catch (e) {
      if (navigator.onLine && window.location.pathname !== "/local-play")
        setError(e.message);
    } finally {
      setSessionReady(true);
    }
  }, [api]);
  useEffect(() => {
    refresh();
    api("/catalog")
      .then(setCatalog)
      .catch(() => {});
    try {
      const s = localStorage.getItem("ea:settings");
      if (s) setSettings((v) => ({ ...v, ...JSON.parse(s) }));
    } catch {}
  }, [refresh, api]);
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, []);
  useEffect(() => {
    if (!error && !notice) return;
    const id = setTimeout(() => {
      setError("");
      setNotice("");
    }, 5500);
    return () => clearTimeout(id);
  }, [error, notice]);
  useEffect(() => {
    setMenu(false);
    setFilter("All");
    if (pathname === "/login") setAuth("login");
    if (pathname === "/register") setAuth("register");
    if (pathname.startsWith("/watch/")) {
      setWatchId(pathname.split("/")[2]);
      setWatchModal(true);
    }
    if (pathname.startsWith("/invite/")) {
      const code = pathname.split("/")[2];
      if (/^[A-Z0-9]{6}$/i.test(code)) {
        setRoomCode(code.toUpperCase());
        setRoomModal(true);
      }
    }
  }, [pathname]);
  const navigate = (path) => {
    if (matchRef.current?.spectator && path !== "/battle") {
      emit("match:leave", { matchId: matchRef.current.matchId }).catch(
        () => {},
      );
      sessionStorage.removeItem("ea:spectating");
      setMatch(null);
    }
    router.push(path);
    setMenu(false);
  };
  useEffect(() => {
    if (!user) {
      socketRef.current?.disconnect();
      socketRef.current = null;
      setConnected(false);
      return;
    }
    const socket = io({
      transports: ["websocket", "polling"],
      withCredentials: true,
      reconnection: true,
    });
    socketRef.current = socket;
    socket.on("connect", () => {
      setConnected(true);
      if (matchRef.current?.matchId)
        socket.emit("match:reconnect", { matchId: matchRef.current.matchId });
      else if (pathnameRef.current === "/battle") {
        try {
          const saved = sessionStorage.getItem("ea:spectating");
          if (saved) socket.emit("match:join", { matchId: saved });
        } catch {}
      }
    });
    socket.on("disconnect", () => setConnected(false));
    socket.on("connect_error", (e) => {
      setConnected(false);
    });
    socket.on("server:restarting", () => {
      setQueue(null);
      setRoom(null);
      setNotice("Arena updating. Your match will reconnect automatically.");
    });
    const stateHandler = (payload) => {
      const previous = matchRef.current;
      clockOffset.current =
        Number(payload.serverTime || Date.now()) - Date.now();
      if (previous?.matchId !== payload.matchId) {
        setRematchRequested(false);
        setRematchOffer(false);
      }
      if (payload.state?.revision > (previous?.state?.revision ?? -1)) {
        const event = payload.state.lastEvent;
        sound(event?.powerId || "click", settingsRef.current);
      }
      try {
        if (payload.spectator)
          sessionStorage.setItem("ea:spectating", payload.matchId);
        else sessionStorage.removeItem("ea:spectating");
      } catch {}
      setMatch(payload);
      if (
        payload.state?.status === "finished" &&
        previous?.state?.status !== "finished"
      ) {
        sound("win", settingsRef.current);
        refresh();
      }
      setSelectedPower(null);
      setSource(null);
      setQueue(null);
      setRoom(null);
      if (
        (enteredRef.current || pathnameRef.current !== "/") &&
        pathnameRef.current !== "/battle" &&
        (payload.state?.status === "active" ||
          previous?.matchId !== payload.matchId ||
          previous?.state?.status === "active")
      )
        router.push("/battle");
    };
    socket.on("match:state", stateHandler);
    socket.on("match:started", stateHandler);
    socket.on("match:found", (payload) => {
      socket.emit("match:join", { matchId: payload.matchId });
      setQueue(null);
    });
    socket.on("queue:status", (payload) =>
      setQueue((q) => (q ? { ...q, ...payload } : q)),
    );
    socket.on("queue:cancelled", () => setQueue(null));
    socket.on("room:updated", (payload) => setRoom(payload.room || payload));
    socket.on("match:error", (payload) =>
      setError(payload.error?.message || payload.message || "Move rejected."),
    );
    socket.on("match:emote", (payload) => {
      if (muteRef.current) return;
      const label = EMOTE_LABELS[payload.emote] || payload.emote;
      setEmote(
        `${matchRef.current?.state?.players.find((p) => p.id === payload.playerId)?.name || "Challenger"}: ${label}`,
      );
      setTimeout(() => setEmote(""), 3500);
    });
    socket.on("match:playerDisconnected", () =>
      setNotice(
        "Opponent disconnected. The turn clock continues; reconnect to resume.",
      ),
    );
    socket.on("match:playerReconnected", () =>
      setNotice("Opponent reconnected."),
    );
    socket.on("match:rewardSettled", () => refresh());
    socket.on("match:rematchRequested", (p) => {
      setRematchRequested(p.players?.includes(userRef.current?.id) || false);
      setRematchOffer(
        p.players?.some((id) => id !== userRef.current?.id) || false,
      );
    });
    return () => {
      socket.disconnect();
      if (socketRef.current === socket) socketRef.current = null;
    };
  }, [user?.id, refresh, router]);
  const emit = useCallback(
    (event, data = {}) =>
      new Promise((resolve, reject) => {
        const socket = socketRef.current;
        if (!socket?.connected) {
          reject(new Error("Connecting to the arena. Try again in a moment."));
          return;
        }
        socket
          .timeout(12000)
          .emit(event, { requestId: requestId(), ...data }, (err, result) => {
            if (err)
              reject(new Error("The server did not respond. Please retry."));
            else if (result?.ok === false)
              reject(
                new Error(
                  result.error?.message || result.error || "Action rejected.",
                ),
              );
            else resolve(result || {});
          });
      }),
    [],
  );
  async function run(fn) {
    setBusy(true);
    try {
      return await fn();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  async function ensureUser(intent) {
    if (userRef.current) return true;
    pendingIntent.current = intent;
    setPracticeModal(false);
    setRoomModal(false);
    setAuth("guest");
    return false;
  }
  async function submitAuth(e) {
    e.preventDefault();
    setAuthBusy(true);
    setAuthError("");
    const fd = new FormData(e.currentTarget),
      body = Object.fromEntries(fd);
    try {
      await api(
        `/auth/${auth === "register" ? "register" : auth === "login" ? "login" : "guest"}`,
        "POST",
        body,
      );
      const u = await refresh();
      if (u) {
        setAuth(null);
        if (pendingIntent.current) {
          const intent = pendingIntent.current;
          pendingIntent.current = null;
          setTimeout(() => intent(), 500);
        }
      }
    } catch (e) {
      setAuthError(e.message);
    } finally {
      setAuthBusy(false);
    }
  }
  async function queueUp(mode = "ranked") {
    if (!(await ensureUser(() => queueUp(mode)))) return;
    await run(async () => {
      setQueue({ mode, boardSize });
      setQueueStarted(Date.now());
      try {
        await emit("queue:join", {
          mode,
          boardSize,
          ruleset: mode === "classic" ? "classic" : "elemental",
        });
      } catch (e) {
        setQueue(null);
        throw e;
      }
    });
  }
  async function startPractice() {
    if (!(await ensureUser(() => setPracticeModal(true)))) return;
    await run(async () => {
      const data = await api("/matches", "POST", {
        mode: "ai",
        ruleset,
        boardSize,
        difficulty: difficulty.toLowerCase(),
      });
      const snapshot = data.match || data;
      setMatch(snapshot);
      setPracticeModal(false);
      navigate("/battle");
      await emit("match:join", { matchId: snapshot.matchId });
    });
  }
  async function spectateMatch(id) {
    if (
      !(await ensureUser(() => {
        setWatchId(id);
        setWatchModal(true);
      }))
    )
      return;
    await run(async () => {
      await emit("match:join", { matchId: id.trim() });
      setWatchModal(false);
    });
  }
  async function challengeFriend(friend) {
    const result = await api("/friends/challenge", "POST", {
      userId: friend.id,
      ruleset,
      boardSize,
      allowSpectators,
    });
    setRoom(result.room);
    setRoomModal(false);
    setNotice("Challenge sent. Your friend can accept it from Invitations.");
  }
  async function acceptChallenge(id) {
    const result = await api("/challenges/" + id + "/accept", "POST", {});
    if (result.matchId) await emit("match:join", { matchId: result.matchId });
  }
  async function createRoom() {
    if (!(await ensureUser(() => setRoomModal(true)))) return;
    await run(async () => {
      const result = await emit("room:create", {
        ruleset,
        boardSize,
        allowSpectators,
      });
      setRoom(result.room || result);
      setRoomModal(false);
    });
  }
  async function joinRoom() {
    if (!(await ensureUser(() => setRoomModal(true)))) return;
    await run(async () => {
      const result = await emit("room:join", {
        code: roomCode.toUpperCase().trim(),
      });
      if (result.matchId) await emit("match:join", { matchId: result.matchId });
      setRoomModal(false);
    });
  }
  const playerId = match?.you || user?.id;
  const spectator =
    match?.spectator ||
    !!(match?.state && !match.state.players.some((p) => p.id === playerId));
  const game = match?.state;
  const battleSize = boardSizeOf(game);
  const scoredBattle = battleSize > 3;
  const me =
      game?.players?.find((p) => p.id === playerId) || game?.players?.[0],
    opponent = spectator
      ? game?.players?.[1]
      : game?.players?.find((p) => p.id !== playerId);
  const myTurn =
    game?.currentPlayerId === playerId && game?.status === "active";
  function bankSeconds(id) {
    const elapsed =
      game?.status === "active" && game.currentPlayerId === id
        ? Math.max(0, now + clockOffset.current - game.turnStartedAt)
        : 0;
    return Math.max(
      0,
      Math.ceil(((game?.remainingMs?.[id] || 0) - elapsed) / 1000),
    );
  }
  function effectAt(i) {
    return game?.effects?.[i] || {};
  }
  const availableActions = useMemo(
    () => (game && myTurn ? legalActions(game, playerId) : []),
    [game, playerId, myTurn],
  );
  const selectedActions = availableActions.filter(
    (item) => item.type === "power" && item.powerId === selectedPower,
  );
  function canTarget(i) {
    if (!myTurn || busy) return false;
    if (!selectedPower)
      return availableActions.some(
        (item) => item.type === "place" && item.cell === i,
      );
    return selectedActions.some((item) =>
      Number.isInteger(item.from)
        ? source === null
          ? item.from === i
          : item.from === source && item.to === i
        : item.cell === i,
    );
  }
  async function choosePower(id) {
    if (!myTurn || busy) return;
    setSource(null);
    if (selectedPower === id) {
      setSelectedPower(null);
      return;
    }
    const choices = availableActions.filter(
      (item) => item.type === "power" && item.powerId === id,
    );
    if (!choices.length) return;
    if (["surge", "time", "echo"].includes(id)) {
      await action("match:power", choices[0]);
      setSelectedPower(null);
      return;
    }
    setSelectedPower(id);
    sound("click", settings);
  }
  async function action(event, payload) {
    if (!match?.matchId) return;
    await run(async () => {
      const result = await emit(event, {
        matchId: match.matchId,
        revision: game.revision,
        sequence: game.revision,
        ...payload,
      });
      if (result.state) setMatch(result);
      if (settings.screenShake && !settings.reducedMotion)
        document
          .querySelector(".battle-arena")
          ?.animate(
            [
              { transform: "translateX(0)" },
              { transform: "translateX(-3px)" },
              { transform: "translateX(3px)" },
              { transform: "translateX(0)" },
            ],
            { duration: 170 },
          );
    });
  }
  async function castPower(chosen) {
    if (!chosen) return;
    await action("match:power", chosen);
    setSelectedPower(null);
    setSource(null);
  }
  async function clickCell(i) {
    if (!canTarget(i)) return;
    if (
      selectedPower &&
      selectedActions.some((item) => Number.isInteger(item.from)) &&
      source === null
    ) {
      setSource(i);
      return;
    }
    if (selectedPower) {
      await castPower(
        selectedActions.find((item) =>
          Number.isInteger(item.from)
            ? item.from === source && item.to === i
            : item.cell === i,
        ),
      );
    } else await action("match:move", { cell: i });
  }
  async function saveLoadout() {
    if (!(await ensureUser(() => navigate("/powers")))) return;
    if (loadout.length !== 3) {
      setError("Equip exactly three powers.");
      return;
    }
    await run(async () => {
      await api("/loadout", "PUT", { powers: loadout });
      await refresh();
      setNotice("Your three powers are equipped.");
    });
  }
  async function loadPage() {
    setLoading(true);
    setPageData(null);
    try {
      const endpoint =
        pathname === "/tournaments"
          ? "/tournaments"
          : pathname === "/shop"
            ? "/catalog"
            : null;
      if (endpoint) {
        if (
          !user &&
          !["/leaderboard", "/catalog", "/tournaments"].includes(endpoint)
        ) {
          setPageData(null);
          return;
        }
        setPageData(await api(endpoint));
      }
      if (pathname.startsWith("/replay/")) {
        const data = await api(`/replay/${pathname.split("/")[2]}`);
        setReplay(data);
        setReplayIndex(0);
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    loadPage();
  }, [pathname, user?.id]);
  useEffect(() => {
    if (!replayPlaying) return;
    const id = setInterval(
      () =>
        setReplayIndex((i) => {
          const max = (replay?.actions || replay?.match?.actions || []).length;
          if (i >= max) {
            setReplayPlaying(false);
            return i;
          }
          return i + 1;
        }),
      1000,
    );
    return () => clearInterval(id);
  }, [replayPlaying, replay]);
  useEffect(() => {
    let active = true;
    if (user)
      api("/inventory")
        .then((d) => {
          if (active) setOwnedIds((d.inventory || []).map((i) => i.cosmeticId));
        })
        .catch(() => {});
    else setOwnedIds([]);
    return () => {
      active = false;
    };
  }, [api, user]);
  const allItems = Array.isArray(catalog)
    ? catalog
    : catalog.cosmetics || catalog.items || [];
  const title =
    pathname === "/powers"
      ? "The power collection"
      : pathname === "/leaderboard"
        ? "Rise through the ranks"
        : pathname === "/shop"
          ? "Make the arena yours"
          : pathname === "/friends"
            ? "Better with a rival"
            : pathname === "/history"
              ? "Every move tells a story"
              : pathname === "/settings"
                ? "Your arena, your way"
                : pathname === "/profile"
                  ? "Player profile"
                  : pathname === "/missions"
                    ? "A little progress, every day"
                    : pathname === "/tournaments"
                      ? "The tournament arena"
                      : pathname.startsWith("/replay")
                        ? "Battle replay"
                        : "Enter the arena";
  const routeLabel =
    NAV.find((n) => n.path === pathname)?.label ||
    {
      "/battle": "Live battle",
      "/settings": "Settings",
      "/profile": "Profile",
      "/missions": "Missions",
      "/rules": "Game rules",
      "/tournaments": "Tournaments",
    }[pathname] ||
    "Arena";
  const pageIntro = (_eyebrow, heading, description, aside) => (
    <ScreenHeading title={heading} description={description} aside={aside} />
  );
  const needAccount = (
    <Empty
      icon={UserRound}
      title="Your story starts here"
      action={
        <button className="button primary" onClick={() => setAuth("guest")}>
          Create a player <ArrowRight size={16} />
        </button>
      }
    >
      Continue as a guest or create an account to keep your progress.
    </Empty>
  );
  const rows =
    pageData?.players ||
    pageData?.leaderboard ||
    pageData?.entries ||
    (Array.isArray(pageData) ? pageData : []);

  const feedback = (type) => {
    sound(type, settingsRef.current);
    if (
      type === "click" &&
      typeof navigator !== "undefined" &&
      window.matchMedia("(pointer: coarse)").matches
    )
      navigator.vibrate?.(10);
  };

  return (
    <GameUIProvider
      onFeedback={feedback}
      reducedMotion={settings.reducedMotion}
    >
      <div
        className={`app-shell ${settings.reducedMotion ? "reduce-motion" : ""} ${settings.highContrast ? "high-contrast" : ""} ${user?.profile?.equippedBoard || ""} ${user?.profile?.equippedMark || ""} ${user?.profile?.avatar || ""} ${user?.profile?.equippedEffect || ""} ${user?.profile?.equippedFrame || ""} ${user?.profile?.equippedBanner || ""} ${user?.profile?.equippedArena || ""} quality-${settings.quality.toLowerCase()}`}
        onClickCapture={(event) => {
          const button = event.target.closest?.("button");
          if (button && !button.disabled && !button.dataset.gameUi)
            feedback("click");
        }}
      >
        {pathname === "/" && !entered ? (
          <GameEntrance
            ready={sessionReady}
            continueAvailable={match?.state?.status === "active" || savedLocal}
            continueLabel={
              match?.state?.status === "active"
                ? "Resume your online battle"
                : "Resume your local battle"
            }
            reducedMotion={settings.reducedMotion}
            onEnter={enterArena}
            onNewGame={() => {
              enterArena();
              setNewGameModal(true);
            }}
            onContinue={continueGame}
            onSettings={() => {
              enterArena();
              navigate("/settings");
            }}
            onAccount={() => {
              if (user) {
                enterArena();
                navigate("/profile");
              } else setAuth("guest");
            }}
          />
        ) : (
          <GameShell
            user={user}
            connected={connected}
            pathname={pathname}
            navigate={navigate}
            settings={settings}
            onToggleSound={() =>
              setSettings((s) => ({ ...s, sound: !s.sound }))
            }
            onSettings={() => navigate("/settings")}
            onAccount={() => (user ? navigate("/profile") : setAuth("guest"))}
            avatar={
              <Avatar
                name={user?.name}
                skin={user?.profile?.avatar}
                frame={user?.profile?.equippedFrame}
                effect={user?.profile?.equippedEffect}
                size="small"
              />
            }
            rankLabel={rank(user?.cups)}
            rankProgress={rankProgress(user?.cups)}
            battleActive={pathname === "/battle"}
            hasActiveMatch={game?.status === "active" && !spectator}
            background={
              cosmeticAsset(user?.profile?.equippedArena) || "/assets/arena.png"
            }
          >
            <div
              className={`content route-${pathname.replaceAll("/", "-") || "hub"} ${pathname === "/battle" ? "battle-content" : ""}`}
            >
              {["/", "/login", "/register"].includes(pathname) && (
                <BattleHub
                  user={user}
                  boardSize={boardSize}
                  setBoardSize={setBoardSize}
                  loadout={loadout}
                  busy={busy}
                  queue={queue}
                  rankLabel={rank(user?.cups)}
                  rankProgress={rankProgress(user?.cups)}
                  navigate={navigate}
                  queueUp={queueUp}
                  onPractice={() => setPracticeModal(true)}
                  onFriend={() => setRoomModal(true)}
                  onSpectate={() => setWatchModal(true)}
                  activeMatch={game?.status === "active" && !spectator}
                  reducedMotion={settings.reducedMotion}
                />
              )}

              {pathname === "/powers" && (
                <>
                  {pageIntro(
                    "POWER IS A CHOICE",
                    title,
                    "All 22 powers are available equally. Equip three and build your own strategy.",
                    <button
                      className="button primary"
                      onClick={saveLoadout}
                      disabled={!sessionReady || busy || loadout.length !== 3}
                    >
                      Save loadout <Check size={16} />
                    </button>,
                  )}
                  <Tabs
                    items={[
                      { id: "deck", label: "Deck", icon: Layers3 },
                      { id: "lab", label: "Power Lab", icon: WandSparkles },
                    ]}
                    value={armoryTab}
                    onChange={setArmoryTab}
                    label="Armory sections"
                  />
                  <div className="armory-panel" hidden={armoryTab !== "deck"}>
                    <PowerCollection
                      loadout={loadout}
                      setLoadout={setLoadout}
                      disabled={!sessionReady || busy}
                    />
                  </div>
                  <div className="armory-panel" hidden={armoryTab !== "lab"}>
                    <PowerLab
                      reducedMotion={settings.reducedMotion}
                      onSound={(id) => sound(id, settings)}
                    />
                  </div>
                </>
              )}

              {pathname === "/battle" && (
                <BattleScreen
                  match={match}
                  user={user}
                  playerId={playerId}
                  spectator={spectator}
                  myTurn={myTurn}
                  busy={busy}
                  connected={connected}
                  difficulty={difficulty}
                  settings={settings}
                  now={now}
                  clockOffset={clockOffset.current}
                  me={me}
                  opponent={opponent}
                  selectedPower={selectedPower}
                  source={source}
                  emote={emote}
                  muteEmotes={muteEmotes}
                  availableActions={availableActions}
                  selectedActions={selectedActions}
                  bankSeconds={bankSeconds}
                  effectAt={effectAt}
                  canTarget={canTarget}
                  clickCell={clickCell}
                  choosePower={choosePower}
                  castPower={castPower}
                  setSelectedPower={setSelectedPower}
                  setSource={setSource}
                  setSurrender={setSurrender}
                  setMuteEmotes={setMuteEmotes}
                  setEmote={setEmote}
                  emit={emit}
                  setError={setError}
                  setNotice={setNotice}
                  navigate={navigate}
                  rematchRequested={rematchRequested}
                  rematchOffer={rematchOffer}
                  onSound={(id) => sound(id, settings)}
                  onAgain={() =>
                    run(async () => {
                      const result = await emit("match:rematchRequest", {
                        matchId: match.matchId,
                      });
                      if (result.waitingForOpponent) {
                        setRematchRequested(true);
                        setNotice(
                          "Rematch requested. Waiting for your opponent.",
                        );
                      }
                    })
                  }
                />
              )}

              {pathname === "/leaderboard" && (
                <>
                  {pageIntro(
                    "EARN YOUR PLACE",
                    title,
                    "Real players. Recorded results. Ranked opponents may include clearly labelled competitive bots.",
                    <button
                      className="button secondary"
                      onClick={() => queueUp("ranked")}
                    >
                      Play Ranked <Swords size={16} />
                    </button>,
                  )}
                  <LeaderboardPanel
                    api={api}
                    user={user}
                    onError={setError}
                    onRegister={() => setAuth("guest")}
                    onProfile={(id) => navigate("/players/" + id)}
                  />
                </>
              )}

              {pathname === "/shop" && (
                <>
                  {pageIntro(
                    "STYLE HAS NO STAT BOOST",
                    title,
                    "Express yourself with cosmetic collections, transparent avatars and extraordinary arenas.",
                    <div className="balance-pill">
                      <Coins size={20} />
                      {pretty(user?.coins)} <span>coins</span>
                    </div>,
                  )}
                  <CosmeticShop
                    items={allItems}
                    ownedIds={ownedIds}
                    user={user}
                    api={api}
                    features={features}
                    refresh={refresh}
                    onError={setError}
                    onNotice={setNotice}
                    onRegister={() =>
                      setAuth(user?.guest ? "register" : "guest")
                    }
                    busy={busy}
                    onPurchase={async (item) => {
                      if (!(await ensureUser(() => navigate("/shop")))) return;
                      await run(async () => {
                        await api("/purchases", "POST", {
                          cosmeticId: item.id,
                          requestId: requestId(),
                        });
                        await refresh();
                        setNotice(
                          item.name +
                            " added to your collection. Equip it from Inventory.",
                        );
                      });
                    }}
                  />
                </>
              )}

              {pathname === "/friends" && (
                <>
                  {pageIntro(
                    "GOOD RIVALS MAKE GREAT GAMES",
                    title,
                    "Find a friend, send a challenge, and make your next move together.",
                    <button
                      className="button primary"
                      onClick={() => setRoomModal(true)}
                    >
                      <Users size={16} />
                      Private challenge
                    </button>,
                  )}
                  {!user ? (
                    needAccount
                  ) : (
                    <SocialPanel
                      api={api}
                      user={user}
                      navigate={navigate}
                      onError={setError}
                      onNotice={setNotice}
                      onChallenge={challengeFriend}
                      onAccept={acceptChallenge}
                      onSpectate={spectateMatch}
                    />
                  )}
                </>
              )}

              {pathname === "/inventory" && (
                <>
                  {pageIntro(
                    "COLLECT A LITTLE OF YOURSELF",
                    "Your cosmetic collection",
                    "Make your marks, board, and player identity your own.",
                  )}
                  <InventoryPanel
                    api={api}
                    user={user}
                    refresh={refresh}
                    onError={setError}
                    onNotice={setNotice}
                    navigate={navigate}
                  />
                </>
              )}
              {["/achievements", "/notifications", "/season-pass"].includes(
                pathname,
              ) && (
                <>
                  {pageIntro(
                    "YOUR JOURNEY CONTINUES",
                    pathname === "/achievements"
                      ? "Earned, move by move"
                      : pathname === "/notifications"
                        ? "From around the arena"
                        : "A season of possibilities",
                    "Real progress. Cosmetic rewards. Equal competitive footing.",
                  )}
                  <ProgressPanel
                    kind={pathname.slice(1)}
                    api={api}
                    user={user}
                    refresh={refresh}
                    onError={setError}
                    onNotice={setNotice}
                  />
                </>
              )}
              {pathname === "/history" && (
                <>
                  {pageIntro(
                    "REVISIT YOUR BEST MOVES",
                    title,
                    "Recorded battles, verified rewards, and a closer look at every action.",
                  )}
                  {!user ? (
                    needAccount
                  ) : (
                    <HistoryPanel
                      api={api}
                      user={user}
                      navigate={navigate}
                      onError={setError}
                    />
                  )}
                </>
              )}

              {pathname === "/missions" && (
                <>
                  {pageIntro(
                    "MAKE EVERY MATCH COUNT",
                    title,
                    "Earn cosmetic coins and account XP through play.",
                  )}
                  {!user ? (
                    needAccount
                  ) : (
                    <MissionsPanel
                      api={api}
                      user={user}
                      refresh={refresh}
                      onError={setError}
                      onNotice={setNotice}
                    />
                  )}
                </>
              )}

              {(pathname === "/profile" ||
                pathname.startsWith("/players/")) && (
                <>
                  {pageIntro(
                    "THIS IS YOUR STORY",
                    "Player profile",
                    "Your identity, achievements, and competitive progress.",
                  )}
                  {!user && pathname === "/profile" ? (
                    needAccount
                  ) : (
                    <ProfileEditor
                      api={api}
                      user={user}
                      publicPlayerId={
                        pathname.startsWith("/players/")
                          ? pathname.split("/")[2]
                          : null
                      }
                      refresh={refresh}
                      onError={setError}
                      onNotice={setNotice}
                      navigate={navigate}
                      onUpgrade={() => setAuth("register")}
                    />
                  )}
                </>
              )}

              {pathname === "/settings" && (
                <>
                  {pageIntro(
                    "TUNED TO YOU",
                    title,
                    "Control sound, motion, accessibility, and your session.",
                  )}
                  <section className="panel settings-panel">
                    <h3>Sound & accessibility</h3>
                    {[
                      {
                        key: "sound",
                        label: "Sound effects",
                        hint: "Synthesized game sounds after your first interaction.",
                      },
                      {
                        key: "reducedMotion",
                        label: "Reduced motion",
                        hint: "Keep transitions and board effects gentle.",
                      },
                      {
                        key: "highContrast",
                        label: "High contrast",
                        hint: "Stronger borders and clearer interactive states.",
                      },
                      {
                        key: "screenShake",
                        label: "Screen shake",
                        hint: "Optional. Disabled by default.",
                      },
                      {
                        key: "allowFriendRequests",
                        label: "Friend requests",
                        hint: "Allow other players to invite you to their friends list.",
                      },
                      {
                        key: "showOnline",
                        label: "Show online status",
                        hint: "Let friends know when you are connected.",
                      },
                      {
                        key: "allowSpectators",
                        label: "Spectators",
                        hint: "Allow viewing when you create a public match.",
                      },
                      {
                        key: "notifications",
                        label: "Arena announcements",
                        hint: "Receive administrator updates in your inbox.",
                      },
                    ].map((s) => (
                      <div className="setting-row" key={s.key}>
                        <div>
                          <strong>{s.label}</strong>
                          <p>{s.hint}</p>
                        </div>
                        <button
                          role="switch"
                          aria-checked={settings[s.key]}
                          aria-label={s.label}
                          className={`toggle ${settings[s.key] ? "on" : ""}`}
                          onClick={() =>
                            setSettings((v) => ({ ...v, [s.key]: !v[s.key] }))
                          }
                        >
                          <i />
                        </button>
                      </div>
                    ))}
                    <div className="setting-row">
                      <label htmlFor="volume">
                        Effects volume <span>{settings.volume}%</span>
                      </label>
                      <input
                        id="volume"
                        type="range"
                        min="0"
                        max="100"
                        value={settings.volume}
                        onChange={(e) =>
                          setSettings((v) => ({
                            ...v,
                            volume: Number(e.target.value),
                          }))
                        }
                      />
                    </div>
                    <div className="setting-row">
                      <label htmlFor="quality">Animation quality</label>
                      <select
                        id="quality"
                        value={settings.quality}
                        onChange={(e) =>
                          setSettings((v) => ({
                            ...v,
                            quality: e.target.value,
                          }))
                        }
                      >
                        {["Low", "Medium", "High", "Ultra"].map((q) => (
                          <option key={q}>{q}</option>
                        ))}
                      </select>
                    </div>
                    <div className="setting-row">
                      <label htmlFor="profile-visibility">
                        Profile visibility
                      </label>
                      <select
                        id="profile-visibility"
                        value={settings.profileVisibility || "public"}
                        onChange={(e) =>
                          setSettings((s) => ({
                            ...s,
                            profileVisibility: e.target.value,
                          }))
                        }
                      >
                        <option value="public">Everyone</option>
                        <option value="friends">Accepted friends</option>
                        <option value="private">Only me</option>
                      </select>
                    </div>
                    <button
                      className="button primary"
                      onClick={() =>
                        run(async () => {
                          localStorage.setItem(
                            "ea:settings",
                            JSON.stringify(settings),
                          );
                          if (user) await api("/settings", "PATCH", settings);
                          setNotice("Settings saved.");
                        })
                      }
                    >
                      Save settings <Check size={15} />
                    </button>
                    {user && (
                      <>
                        <hr />
                        <button
                          className="button danger"
                          onClick={() =>
                            run(async () => {
                              await api("/auth/logout", "POST");
                              socketRef.current?.disconnect();
                              setUser(null);
                              settingsOwner.current = null;
                              setMatch(null);
                              sessionStorage.removeItem("ea:spectating");
                              navigate("/");
                            })
                          }
                        >
                          <LogOut size={16} /> Sign out
                        </button>
                      </>
                    )}
                  </section>
                </>
              )}

              {pathname === "/admin" && (
                <>
                  {pageIntro(
                    "THE ARENA CONTROL ROOM",
                    "Administration",
                    "Real operations, with role-protected actions and audit logs.",
                  )}
                  <AdminPanel
                    api={api}
                    user={user}
                    onError={setError}
                    onNotice={setNotice}
                  />
                </>
              )}
              {pathname.startsWith("/tournaments/") && (
                <>
                  {pageIntro(
                    "FOLLOW THE BRACKET",
                    "The road to the final",
                    "Single elimination. Human competitors. Server-verified results.",
                  )}
                  <TournamentView
                    api={api}
                    id={pathname.split("/")[2]}
                    user={user}
                    onError={setError}
                    onNotice={setNotice}
                  />
                </>
              )}
              {[
                "/forgot-password",
                "/reset-password",
                "/verify-email",
              ].includes(pathname) && (
                <AuthHelp
                  pathname={pathname}
                  api={api}
                  features={features}
                  navigate={navigate}
                  onNotice={setNotice}
                />
              )}
              {pathname === "/tutorial" && (
                <>
                  {pageIntro(
                    "LEARN THE NEXT MOVE",
                    "Welcome to your arena",
                    "Three short interactive lessons using the real game rules.",
                  )}
                  <TutorialArena
                    navigate={navigate}
                    reducedMotion={settings.reducedMotion}
                  />
                </>
              )}
              {pathname === "/local-play" && (
                <>
                  {pageIntro(
                    "ANYWHERE. YOUR PACE.",
                    "The local arena",
                    "Two players on one device, or a thoughtful computer rival.",
                  )}
                  <OfflineArena />
                </>
              )}
              {pathname === "/daily-puzzle" && (
                <>
                  {pageIntro(
                    "A NEW ANGLE, EVERY DAY",
                    "One move. One opportunity.",
                    "A shared daily practice puzzle. No ranked cups or paid advantages.",
                  )}
                  <DailyPuzzle />
                </>
              )}
              {pathname === "/tournaments" && (
                <>
                  {pageIntro(
                    "PLAY FOR THE MOMENT",
                    title,
                    "Single-elimination competitions with verified human results.",
                  )}
                  <section className="panel">
                    {(pageData?.tournaments || []).length ? (
                      pageData.tournaments.map((t) => (
                        <article className="tournament-row" key={t.id}>
                          <Trophy size={30} />
                          <div>
                            <h3>{t.name}</h3>
                            <p>
                              {new Date(t.startsAt).toLocaleString()} ·{" "}
                              {t.capacity} challengers
                            </p>
                            <Badge>{t.status}</Badge>
                          </div>
                          <button
                            className="button secondary"
                            onClick={() => navigate(`/tournaments/${t.id}`)}
                          >
                            View bracket <ArrowRight size={15} />
                          </button>
                          <button
                            className="button primary"
                            onClick={async () => {
                              if (
                                !(await ensureUser(() =>
                                  navigate("/tournaments"),
                                ))
                              )
                                return;
                              await run(async () => {
                                await api(
                                  `/tournaments/${t.id}/register`,
                                  "POST",
                                );
                                setNotice("Registration confirmed.");
                                loadPage();
                              });
                            }}
                          >
                            Register <ArrowRight size={15} />
                          </button>
                        </article>
                      ))
                    ) : (
                      <Empty icon={Trophy} title="No tournaments scheduled">
                        Scheduled competitions will appear here once an
                        administrator opens registration.
                      </Empty>
                    )}
                  </section>
                </>
              )}

              {pathname.startsWith("/replay/") && (
                <>
                  {pageIntro(
                    "LOOK ONE MOVE DEEPER",
                    title,
                    "Recorded server snapshots, one action at a time.",
                  )}
                  <Replay
                    replay={replay}
                    index={replayIndex}
                    setIndex={setReplayIndex}
                    playing={replayPlaying}
                    setPlaying={setReplayPlaying}
                  />
                  <ReplayAnalysis
                    replay={replay}
                    index={replayIndex}
                    onSeek={setReplayIndex}
                    userId={user?.id}
                  />
                </>
              )}

              {pathname === "/rules" && (
                <>
                  {pageIntro(
                    "KNOW THE BOARD. MASTER THE ELEMENTS.",
                    "The rules of the arena",
                    "Familiar at first glance. Tactical at every turn.",
                  )}
                  <div className="rules-grid">
                    {[
                      {
                        icon: Target,
                        title: "Three in a row",
                        text: "A horizontal, vertical, or diagonal line of your marks wins the round. On 3×3, the first line wins. On 4×4, 5×5 and 6×6, every contiguous three-in-a-row counts, including overlaps. The highest score when full wins; equal scores draw. Powers can change those lines.",
                      },
                      {
                        icon: Layers3,
                        title: "Exactly three powers",
                        text: "Equip exactly three of all 22 powers. Both loadouts are visible. Each power is usable once per round; Eclipse once per match. Time Warp extends the clock and leaves your main action available.",
                      },
                      {
                        icon: Clock3,
                        title: "A short, thoughtful battle",
                        text: "Turns last 20 seconds. Missing the deadline loses the round. 3×3 has a 120-second thinking bank and up to three Elemental rounds. Larger boards use one scoring round with a 240/360/480-second bank for 4×4/5×5/6×6. A tied score draws.",
                      },
                      {
                        icon: Zap,
                        title: "Energy is a resource",
                        text: "Start each round with three energy. A normal legal placement earns one, up to six. Power costs are shown before casting. Invalid actions consume nothing.",
                      },
                      {
                        icon: Shield,
                        title: "Predictable counterplay",
                        text: "Shields absorb one hit. Mirror reflects eligible single-cell attacks. Purify cleanses debuffs; Tide redirects terrain. Poison warns before destruction. Phantom illusions never count toward lines.",
                      },
                      {
                        icon: Trophy,
                        title: "Competitive integrity",
                        text: "Ranked searches for real players first. If no real world players are found you will play against a competitive bot. Bots start at Hard and scale with trophies. Practice and private matches award no cups. The server validates actions, runs clocks, settles rewards, and records replay events.",
                      },
                    ].map((r) => (
                      <section className="panel rule-card" key={r.title}>
                        <r.icon size={27} />
                        <h3>{r.title}</h3>
                        <p>{r.text}</p>
                      </section>
                    ))}
                  </div>
                  <section className="panel rule-footnote">
                    <h3>Build your strategy</h3>
                    <p>
                      All 22 powers are implemented with equal access. Choose
                      three for your loadout and experiment in the Power Lab.
                      Cosmetic rarity never changes competitive strength. Match
                      duration targets 2–5 minutes.
                    </p>
                    <button
                      className="text-button"
                      onClick={() => navigate("/powers")}
                    >
                      Inspect and practice all 22 powers{" "}
                      <ArrowRight size={15} />
                    </button>
                  </section>
                  <PowerRules />
                </>
              )}

              {!isArenaRoute(pathname) && (
                <Empty
                  icon={Compass}
                  title="A turn in the wrong direction"
                  action={
                    <button
                      className="button primary"
                      onClick={() => navigate("/")}
                    >
                      Return to the Arena <ArrowRight size={15} />
                    </button>
                  }
                >
                  That page could not be found. Your next battle is waiting in
                  the Arena.
                </Empty>
              )}
              {["/privacy", "/terms"].includes(pathname) && (
                <>
                  {pageIntro(
                    "ELEMENTAL ARENA",
                    pathname === "/privacy"
                      ? "Privacy overview"
                      : "Playtest information",
                    "Information about this game playtest.",
                  )}
                  <section className="panel legal-copy">
                    <p>
                      This application stores account data, hashed credentials,
                      match events, rankings, cosmetic ownership, and reward
                      transactions in the configured game database. Passwords
                      are stored as protected hashes.
                    </p>
                    <p>
                      Guest sessions use an HTTP-only session cookie. No
                      advertising, payment processing, or third-party analytics
                      are enabled. Multiplayer actions and preset emotes are
                      recorded for game operation.
                    </p>
                    <p>
                      This is a game playtest. Email delivery and Google sign-in
                      require provider setup. A commercial release also needs
                      ongoing moderation, backups, and release policies.
                    </p>
                  </section>
                </>
              )}
            </div>
          </GameShell>
        )}

        <AnimatePresence>
          {(error || notice) && (
            <motion.div
              role={error ? "alert" : "status"}
              className={`toast ${error ? "error" : "success"}`}
              initial={{ y: 30, opacity: 0, x: "-50%" }}
              animate={{ y: 0, opacity: 1, x: "-50%" }}
              exit={{ opacity: 0 }}
            >
              {error ? <Activity size={18} /> : <CheckCircle2 size={18} />}
              <span>{error || notice}</span>
              <button
                aria-label="Dismiss message"
                onClick={() => {
                  setError("");
                  setNotice("");
                }}
              >
                <X size={16} />
              </button>
            </motion.div>
          )}
        </AnimatePresence>
        {auth && (
          <Modal
            title={
              auth === "register"
                ? "Become a challenger"
                : auth === "login"
                  ? "Welcome back"
                  : "Your arena awaits"
            }
            subtitle="One familiar board. Your entirely new story."
            close={() => {
              setAuth(null);
              pendingIntent.current = null;
            }}
          >
            <div className="auth-tabs">
              {["guest", "login", "register"].map((a) => (
                <button
                  key={a}
                  className={auth === a ? "active" : ""}
                  onClick={() => {
                    setAuth(a);
                    setAuthError("");
                  }}
                >
                  {a === "guest"
                    ? "Play as guest"
                    : a === "login"
                      ? "Sign in"
                      : "Create account"}
                </button>
              ))}
            </div>
            <form className="auth-form" onSubmit={submitAuth}>
              {auth !== "login" && (
                <label>
                  Player name
                  <input
                    name="name"
                    placeholder="Choose your arena name"
                    minLength={3}
                    maxLength={20}
                    required
                    autoComplete="nickname"
                  />
                </label>
              )}
              {auth !== "guest" && (
                <>
                  <label>
                    Email address
                    <input
                      name="email"
                      type="email"
                      placeholder="you@example.com"
                      required
                      autoComplete="email"
                    />
                  </label>
                  <label>
                    Password
                    <input
                      name="password"
                      type="password"
                      placeholder="At least 10 characters"
                      minLength={10}
                      required
                      autoComplete={
                        auth === "login" ? "current-password" : "new-password"
                      }
                    />
                  </label>
                </>
              )}
              {authError && (
                <div className="form-error" role="alert">
                  {authError}
                </div>
              )}
              <button className="button primary wide" disabled={authBusy}>
                {authBusy ? (
                  <LoaderCircle className="spin" size={17} />
                ) : (
                  <Swords size={17} />
                )}{" "}
                {auth === "guest"
                  ? "Enter as a guest"
                  : auth === "login"
                    ? "Sign in to the arena"
                    : "Create your account"}{" "}
                <ArrowRight size={16} />
              </button>
            </form>
            {features.google && (
              <a className="button secondary wide" href="/api/auth/google">
                Continue with Google <ArrowRight size={15} />
              </a>
            )}
            {auth === "login" && (
              <button
                className="text-button forgot-link"
                onClick={() => {
                  setAuth(null);
                  navigate("/forgot-password");
                }}
              >
                Forgot your password?
              </button>
            )}
            <p className="auth-note">
              {auth === "guest"
                ? "Play immediately. Register later to keep your account across devices."
                : "Your progress belongs to you. Cosmetic purchases never affect Ranked powers."}
            </p>
            <div className="auth-links">
              <button
                onClick={() => {
                  setAuth(null);
                  navigate("/privacy");
                }}
              >
                Privacy
              </button>
              <span>·</span>
              <button
                onClick={() => {
                  setAuth(null);
                  navigate("/terms");
                }}
              >
                Terms
              </button>
            </div>
          </Modal>
        )}
        <ModeSelect
          open={newGameModal}
          onClose={() => setNewGameModal(false)}
          boardSize={boardSize}
          onBoardSize={setBoardSize}
          busy={busy}
          onChoose={(id) => {
            setNewGameModal(false);
            if (["ranked", "classic", "quick"].includes(id)) queueUp(id);
            else if (id === "practice") setPracticeModal(true);
            else if (id === "friend") setRoomModal(true);
            else if (id === "spectate") setWatchModal(true);
            else
              navigate(
                {
                  local: "/local-play",
                  puzzle: "/daily-puzzle",
                  tutorial: "/tutorial",
                  tournaments: "/tournaments",
                }[id],
              );
          }}
        />
        {practiceModal && (
          <Modal
            title="Sharpen your next move"
            subtitle="AI practice. No ranked cups at risk."
            close={() => setPracticeModal(false)}
          >
            <BoardSizePicker
              value={boardSize}
              onChange={setBoardSize}
              disabled={busy}
            />
            <div className="field-label">RULESET</div>
            <div className="segmented">
              <button
                className={ruleset === "elemental" ? "active" : ""}
                onClick={() => setRuleset("elemental")}
              >
                Elemental
              </button>
              <button
                className={ruleset === "classic" ? "active" : ""}
                onClick={() => setRuleset("classic")}
              >
                Classic
              </button>
            </div>
            <div className="field-label">YOUR CHALLENGE</div>
            <div className="difficulty-grid">
              {DIFFICULTIES.map((d, i) => (
                <button
                  key={d}
                  className={difficulty === d ? "active" : ""}
                  onClick={() => setDifficulty(d)}
                >
                  <span>{d}</span>
                  <span className="difficulty-bars">
                    {Array.from({ length: 7 }, (_, j) => (
                      <i key={j} className={j <= i ? "lit" : ""} />
                    ))}
                  </span>
                </button>
              ))}
            </div>
            <p className="muted small">
              {ruleset === "classic" && boardSize === 3
                ? "Classic is solvable. The strongest opponent draws against perfect play."
                : boardSize > 3
                  ? "Score as many lines of three as possible before the board fills."
                  : "Elemental opponents search legal placements and powers together."}
            </p>
            <button
              className="button primary wide"
              disabled={busy}
              onClick={startPractice}
            >
              <Play size={17} /> Enter Practice Arena <ArrowRight size={16} />
            </button>
          </Modal>
        )}
        {roomModal && (
          <Modal
            title="A friendly rivalry"
            subtitle="Create a private room or join with a code."
            close={() => setRoomModal(false)}
          >
            <BoardSizePicker
              value={boardSize}
              onChange={setBoardSize}
              disabled={busy}
            />
            <div className="segmented">
              <button
                className={ruleset === "elemental" ? "active" : ""}
                onClick={() => setRuleset("elemental")}
              >
                Elemental
              </button>
              <button
                className={ruleset === "classic" ? "active" : ""}
                onClick={() => setRuleset("classic")}
              >
                Classic
              </button>
            </div>
            <div className={extraStyles.roomOptions}>
              <label>
                <input
                  type="checkbox"
                  checked={allowSpectators}
                  onChange={(e) => setAllowSpectators(e.target.checked)}
                />
                Allow spectators
              </label>
            </div>
            <button
              className="button primary wide"
              disabled={busy}
              onClick={createRoom}
            >
              <Users size={17} />
              Create a room <ArrowRight size={16} />
            </button>
            <div className="or-line">OR JOIN A FRIEND</div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                joinRoom();
              }}
            >
              <label>
                Room code
                <input
                  aria-label="Room code"
                  placeholder="ENTER CODE"
                  value={roomCode}
                  onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                  minLength={6}
                  maxLength={6}
                  required
                />
              </label>
              <button className="button secondary wide" disabled={busy}>
                Join room <ArrowRight size={16} />
              </button>
            </form>
            <button
              className="text-button"
              onClick={() => {
                setRoomModal(false);
                setWatchModal(true);
              }}
            >
              <Eye size={15} />
              Watch a public match
            </button>
          </Modal>
        )}
        {room && !match?.state?.status?.includes("active") && (
          <Modal
            title="Your rival is one code away"
            subtitle="Share the code or invite link with a friend."
            close={() => {
              emit("room:leave", { code: room.code }).catch(() => {});
              setRoom(null);
            }}
          >
            <div className="room-code">{room.code || room.roomCode}</div>
            <button
              className="button secondary wide"
              onClick={() =>
                navigator.clipboard
                  .writeText(room.code || room.roomCode)
                  .then(() => setNotice("Room code copied."))
                  .catch(() => setNotice("Select the room code to copy it."))
              }
            >
              <Copy size={16} />
              Copy room code
            </button>
            <div className={extraStyles.inviteCode}>
              <label>
                Invite link
                <input
                  readOnly
                  value={
                    typeof window === "undefined"
                      ? ""
                      : window.location.origin +
                        "/invite/" +
                        (room.code || room.roomCode)
                  }
                  onFocus={(e) => e.target.select()}
                />
              </label>
              <button
                className="button secondary"
                onClick={() =>
                  navigator.clipboard
                    .writeText(
                      window.location.origin +
                        "/invite/" +
                        (room.code || room.roomCode),
                    )
                    .then(() => setNotice("Invite link copied."))
                    .catch(() =>
                      setNotice("Select the invite link to copy it."),
                    )
                }
              >
                <Link size={14} />
                Copy invite link
              </button>
            </div>
            <div className="search-animation">
              <LoaderCircle className="spin" />
              <p>Waiting for your friend to join…</p>
            </div>
            <p className="muted small">
              Private matches are unranked. Spectators{" "}
              {room.allowSpectators ? "are allowed" : "are disabled"}.
            </p>
          </Modal>
        )}
        {watchModal && (
          <Modal
            title="Watch the next great move"
            subtitle="Only matches that allow spectators can be viewed."
            close={() => setWatchModal(false)}
          >
            <form
              onSubmit={(e) => {
                e.preventDefault();
                spectateMatch(watchId);
              }}
            >
              <label>
                Match ID
                <input
                  value={watchId}
                  onChange={(e) => setWatchId(e.target.value)}
                  minLength={8}
                  maxLength={80}
                  required
                  placeholder="Paste a shared match ID"
                />
              </label>
              <button className="button primary wide" disabled={busy}>
                <Eye size={16} />
                Watch match
              </button>
            </form>
            <p className="muted small">
              Spectators cannot place marks, use powers, or receive rewards.
            </p>
          </Modal>
        )}
        {queue && (
          <Modal
            title="Finding your next rival"
            fullScreen
            subtitle={
              queue.mode === "ranked"
                ? `Ranked Elemental · ${queue.boardSize || boardSize} × ${queue.boardSize || boardSize}`
                : "Online battle · Human opponents only"
            }
            close={() =>
              run(async () => {
                await emit("queue:leave");
                setQueue(null);
              })
            }
          >
            <h2 className="queue-heading">SEARCHING FOR OPPONENT…</h2>
            <div className="queue-visual">
              <div className="queue-ring" />
              <Swords size={47} />
            </div>
            <div className="queue-player">
              <Avatar name={user?.name} skin={user?.profile?.avatar} />
              <div>
                <strong>{user?.name}</strong>
                <small>
                  {rank(user?.cups)} · {pretty(user?.cups)} cups
                </small>
              </div>
            </div>
            <div className="queue-time">
              {Math.floor((now - queueStarted) / 1000)}
              <span>SECONDS IN QUEUE</span>
            </div>
            <p className="muted small center">
              {queue.mode === "ranked"
                ? "If no real world players are found you'll play against a competitive bot"
                : "Waiting for another real player."}
            </p>
            {queue.mode === "ranked" && (
              <p className="queue-bot-policy">
                {queue.rankedBot?.difficulty || "Hard"} or above · competitive
                bot fallback in{" "}
                {Math.max(
                  0,
                  (queue.rankedBot?.fallbackSeconds || 25) -
                    Math.floor((now - queueStarted) / 1000),
                )}
                s
              </p>
            )}
            <button
              className="button secondary wide"
              onClick={() =>
                run(async () => {
                  await emit("queue:leave");
                  setQueue(null);
                })
              }
            >
              Cancel matchmaking
            </button>
          </Modal>
        )}
        {surrender && (
          <Modal
            title="Leave this battle?"
            subtitle="Surrendering records a loss for this match."
            close={() => setSurrender(false)}
          >
            <div className="modal-actions">
              <button
                className="button secondary"
                onClick={() => setSurrender(false)}
              >
                Keep playing
              </button>
              <button
                className="button danger"
                onClick={() =>
                  run(async () => {
                    await emit("match:surrender", { matchId: match.matchId });
                    setSurrender(false);
                  })
                }
              >
                <Flag size={15} /> Surrender
              </button>
            </div>
          </Modal>
        )}
      </div>
    </GameUIProvider>
  );
}

function Modal({ title, subtitle, children, close, fullScreen = false }) {
  return (
    <GameModal
      title={title}
      subtitle={subtitle}
      onClose={close}
      fullScreen={fullScreen}
      closeLabel="Close dialog"
      className="modal legacy-modal"
    >
      {children}
    </GameModal>
  );
}
function Replay({ replay, index, setIndex, playing, setPlaying }) {
  if (!replay)
    return (
      <div className="loading-state">
        <LoaderCircle className="spin" />
        Loading recorded match…
      </div>
    );
  const actions = replay.actions || replay.match?.actions || [];
  const action = actions[Math.max(0, index - 1)];
  const state =
    action?.state ||
    action?.snapshot ||
    action?.payload?.state ||
    replay.initialState ||
    replay.state;
  const board =
    index === 0
      ? replay.initialState?.board || Array(9).fill(null)
      : action?.event?.result?.board ||
        state?.lastEvent?.result?.board ||
        state?.board ||
        Array(9).fill(null);
  const players =
    state?.players || replay.players || replay.match?.players || [];
  const size = boardSizeOf(board);
  return (
    <section className="panel replay-panel">
      <Badge>
        AUTHORITATIVE EVENT REPLAY · {size} × {size}
      </Badge>
      {size > 3 && (
        <div
          className="live-line-score"
          aria-label="Replay three-in-a-row score"
        >
          {players.map((p) => (
            <span key={p.id}>
              <b>{p.mark}</b>
              <strong>{state?.roundScores?.[p.id] || 0}</strong>
              <small>lines</small>
            </span>
          ))}
        </div>
      )}
      <div
        className={`game-board board-size-${size}`}
        style={{ gridTemplateColumns: `repeat(${size}, minmax(0,1fr))` }}
        aria-label={`${size} by ${size} recorded board`}
      >
        {board.map((value, i) => {
          const p = players.find((p) => p.id === value);
          return (
            <div key={i} className="game-cell">
              {value && (
                <span className={`mark ${(p?.mark || "X").toLowerCase()}`}>
                  {(p?.mark || "X") === "X" ? <X /> : <Circle />}
                </span>
              )}
            </div>
          );
        })}
      </div>
      <div className="replay-caption">
        {index === 0
          ? "The board before the first move."
          : `Action ${index} of ${actions.length} · ${action?.type || action?.action?.type || "Board update"}`}
      </div>
      <div className="replay-controls">
        <button
          className="icon-button"
          aria-label="Previous action"
          onClick={() => setIndex(Math.max(0, index - 1))}
          disabled={index === 0}
        >
          <SkipBack size={20} />
        </button>
        <button className="button primary" onClick={() => setPlaying(!playing)}>
          {playing ? <Pause size={17} /> : <Play size={17} />}{" "}
          {playing ? "Pause" : "Play replay"}
        </button>
        <button
          className="icon-button"
          aria-label="Next action"
          onClick={() => setIndex(Math.min(actions.length, index + 1))}
          disabled={index >= actions.length}
        >
          <SkipForward size={20} />
        </button>
      </div>
      <input
        aria-label="Replay action"
        type="range"
        min="0"
        max={actions.length || 1}
        value={index}
        onChange={(e) => setIndex(Number(e.target.value))}
      />
    </section>
  );
}
