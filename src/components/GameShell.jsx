"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  ArrowLeft,
  Swords,
  WandSparkles,
  ShoppingBag,
  Users,
  Trophy,
  Coins,
  Mail,
  Volume2,
  VolumeX,
  Settings,
  Compass,
  Layers3,
  History,
  Gift,
  Medal,
  BookOpen,
  Crown,
  Target,
  Shield,
  Wifi,
  WifiOff,
} from "lucide-react";
import {
  GameButton,
  Modal,
  ResourcePill,
  ProgressBar,
  IconBadge,
  NotificationDot,
} from "./ui";
import { displayName } from "../lib/display-name";
import styles from "./GameShell.module.css";
import { useCosmeticAnimation } from "./AnimatedCosmeticImage";

const destinations = [
  { path: "/notifications", label: "Notifications", icon: Mail },
  { path: "/inventory", label: "Inventory", icon: Layers3 },
  { path: "/season-pass", label: "Season journey", icon: Crown },
  { path: "/missions", label: "Missions & rewards", icon: Gift },
  { path: "/achievements", label: "Achievements", icon: Medal },
  { path: "/leaderboard", label: "Leaderboards", icon: Trophy },
  { path: "/tournaments", label: "Tournaments", icon: Swords },
  { path: "/history", label: "Match history", icon: History },
  { path: "/daily-puzzle", label: "Daily puzzle", icon: Target },
  { path: "/local-play", label: "Local & offline play", icon: Layers3 },
  { path: "/tutorial", label: "Learn the arena", icon: BookOpen },
  { path: "/profile", label: "Profile", icon: Users },
];

export default function GameShell({
  children,
  user,
  connected,
  pathname,
  navigate,
  settings,
  onToggleSound,
  onSettings,
  onAccount,
  avatar,
  rankLabel = "Rookie",
  rankProgress = 0,
  battleActive = false,
  hasActiveMatch = false,
  background = "/assets/arena.png",
  backgroundCosmeticId,
  notificationCount = 0,
  pending = {},
  connectionNotice = null,
}) {
  const tileCount = {
    "/missions": (pending.daily || 0) + (pending.missions || 0),
    "/season-pass": pending.season || 0,
    "/notifications": notificationCount,
  };
  const [journeyOpen, setJourneyOpen] = useState(false),
    reduced = useReducedMotion();
  const arenaArt = useCosmeticAnimation(backgroundCosmeticId, background);
  useEffect(() => setJourneyOpen(false), [pathname]);
  useEffect(() => {
    const back = (event) => {
      if (event.defaultPrevented) return;
      if (
        event.key === "Escape" &&
        !document.querySelector('[role="dialog"]') &&
        pathname !== "/" &&
        !battleActive
      ) {
        event.preventDefault();
        navigate("/");
      }
    };
    document.addEventListener("keydown", back);
    return () => document.removeEventListener("keydown", back);
  }, [pathname, battleActive, navigate]);
  // Keep the selected chip of any horizontal scroll row in view.
  useEffect(() => {
    const reveal = (el) =>
      el?.scrollIntoView?.({ block: "nearest", inline: "nearest" });
    const selectedIn = (row) =>
      row.querySelector(
        '[aria-selected="true"],[aria-pressed="true"],[aria-current="true"],.active,.selected',
      );
    const timer = setTimeout(
      () => document.querySelectorAll(".scroll-row").forEach((row) => {
        const chip = selectedIn(row);
        if (chip && row.scrollWidth > row.clientWidth)
          {
          const box = chip.getBoundingClientRect(),
            frame = row.getBoundingClientRect();
          if (box.left < frame.left || box.right > frame.right)
            row.scrollLeft += box.left - frame.left - (frame.width - box.width) / 2;
        }
      }),
      350,
    );
    const click = (event) => {
      const chip = event.target.closest?.(".scroll-row > *");
      if (chip) reveal(chip);
    };
    document.addEventListener("click", click);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("click", click);
    };
  }, [pathname]);
  const go = (path) => {
    setJourneyOpen(false);
    navigate(path);
  };
  const dock = [
    {
      path: hasActiveMatch ? "/battle" : "/",
      label: "Arena",
      title: "Battle",
      icon: Swords,
      active: pathname === "/" || pathname === "/battle",
    },
    {
      path: "/powers",
      label: "Powers & loadout",
      title: "Armory",
      icon: WandSparkles,
      active: pathname === "/powers",
    },
    {
      path: "/shop",
      label: "Cosmetic shop",
      title: "Collection",
      icon: ShoppingBag,
      active: pathname === "/shop" || pathname === "/inventory",
    },
    {
      label: "Journey",
      title: "Journey",
      icon: Compass,
      active:
        destinations.some((route) => route.path === pathname) &&
        !["/inventory", "/friends", "/notifications"].includes(pathname),
      count: pending.journey || 0,
    },
    {
      path: "/friends",
      label: "Friends",
      title: "Social",
      icon: Users,
      active: pathname === "/friends",
      count: pending.social || 0,
    },
  ];
  return (
    <div
      className={`${styles.world} ${battleActive ? styles.inBattle : ""} ${connectionNotice ? styles.withNotice : ""}`}
      style={{ "--world-art": `url("${arenaArt.src}")` }}
    >
      <div className={styles.environment} aria-hidden="true">
        <div className={styles.worldLight} />
        <div className={styles.atmosphere} />
        <div className={styles.vignette} />
      </div>
      {!battleActive && (
        <header className={styles.hud} aria-label="Player HUD">
          <button
            className={styles.account}
            onClick={onAccount}
            aria-label="Player account"
            aria-description={`${displayName(user?.name) || "Challenger"}, level ${user?.level || 1}`}
            title={displayName(user?.name) || "Player account"}
          >
            <ProgressBar
              radial
              size={52}
              value={(Number(user?.xp) || 0) % 500}
              max={500}
              label="Account level progress"
            >
              {avatar || <span>EA</span>}
            </ProgressBar>
            <b className={styles.level}>
              {user?.level >= 1000 ? "1K+" : user?.level || 1}
            </b>
          </button>
          <button
            className={styles.crest}
            onClick={() => go("/")}
            aria-label="Elemental Arena home"
          >
            <Swords size={24} />
            <span>
              ELEMENTAL<small>ARENA</small>
            </span>
          </button>
          <button
            className={styles.rank}
            onClick={() => go("/leaderboard")}
            aria-label={`${rankLabel} rank, level ${user?.level || 1}`}
          >
            <Trophy size={20} />
            <span>
              <strong>{rankLabel}</strong>
              <ProgressBar value={rankProgress} label="Trophy road progress" />
            </span>
          </button>
          <div className={styles.resources}>
            <ResourcePill
              key={`${user?.id || "anonymous"}:cups`}
              value={user?.cups}
              icon={Trophy}
              label="Trophies"
              showPlus={false}
              onClick={() => go("/leaderboard")}
            />
            <ResourcePill
              key={`${user?.id || "anonymous"}:coins`}
              value={user?.coins}
              icon={Coins}
              label="Cosmetic coins"
              onClick={() => go("/shop")}
            />
          </div>
          <span
            className={`connection ${connected ? "online" : ""} ${styles.connection}`}
            aria-label={
              connected
                ? "Arena connected"
                : user
                  ? "Connecting"
                  : "Welcome, challenger"
            }
            title={connected ? "Arena connected" : "Connecting"}
          >
            {connected ? <Wifi size={16} /> : <WifiOff size={16} />}
            <span className={styles.srOnly}>
              {connected
                ? "Arena connected"
                : user
                  ? "Connecting"
                  : "Welcome, challenger"}
            </span>
          </span>
          <div className={styles.hudTools}>
            <GameButton
              variant="icon"
              onClick={() => go("/notifications")}
              aria-label="Notifications"
              title="Notifications"
            >
              <IconBadge icon={Mail} count={notificationCount} />
            </GameButton>
            <GameButton
              variant="icon"
              onClick={onSettings}
              aria-label="Settings"
              title="Settings"
            >
              <Settings size={21} />
            </GameButton>
            <GameButton
              variant="icon"
              onClick={onToggleSound}
              aria-label={settings?.sound ? "Mute sound" : "Unmute sound"}
              title={settings?.sound ? "Mute sound" : "Unmute sound"}
            >
              {settings?.sound ? <Volume2 size={21} /> : <VolumeX size={21} />}
            </GameButton>
          </div>
        </header>
      )}
      {connectionNotice}
      <main className={styles.stage} aria-label="Game screen">
        {!battleActive && pathname !== "/" && (
          <GameButton
            variant="icon"
            className={styles.back}
            onClick={() => go("/")}
            aria-label="Back to arena"
          >
            <ArrowLeft size={24} />
          </GameButton>
        )}
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={pathname}
            className={`${styles.screen} ${pathname !== "/" && !battleActive ? styles.withBack : ""}`}
            initial={{
              opacity: 0,
              x: reduced || settings?.reducedMotion ? 0 : 22,
            }}
            animate={{ opacity: 1, x: 0 }}
            exit={{
              opacity: 0,
              x: reduced || settings?.reducedMotion ? 0 : -22,
            }}
            transition={{ duration: 0.25 }}
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </main>
      {!battleActive && (
      <nav className={styles.dock} aria-label="Game destinations">
        {dock.map(({ path, label, title, icon: Icon, active, count }) => (
          <button
            key={label}
            className={`${styles.dockButton} ${active ? styles.active : ""}`}
            aria-label={label}
            aria-current={active ? "page" : undefined}
            aria-expanded={label === "Journey" ? journeyOpen : undefined}
            onClick={() => (path ? go(path) : setJourneyOpen((v) => !v))}
          >
            <span className={styles.dockIcon}>
              <Icon size={27} />
            </span>
            <span className={styles.dockLabel}>{title}</span>
            <NotificationDot
              count={count}
              className={styles.dockDot}
              label={`${count} ${label === "Journey" ? "rewards ready" : "requests waiting"}`}
            />
          </button>
        ))}
      </nav>
      )}
      <Modal
        open={journeyOpen}
        title="Your arena journey"
        onClose={() => setJourneyOpen(false)}
        className={styles.journeyModal}
      >
        <div className={styles.journeyGrid}>
          {destinations.map(({ path, label, icon: Icon }) => (
            <button
              key={path}
              className={`${styles.journeyTile} ${pathname === path ? styles.currentRoute : ""}`}
              onClick={() => go(path)}
              aria-label={label}
            >
              <Icon size={30} />
              <strong>{label}</strong>
              <NotificationDot count={tileCount[path] || 0} />
            </button>
          ))}
          {user?.role === "ADMIN" && (
            <button className={styles.journeyTile} onClick={() => go("/admin")}>
              <Shield size={28} />
              <strong>Administration</strong>
            </button>
          )}
        </div>
      </Modal>
    </div>
  );
}
