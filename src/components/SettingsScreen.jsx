"use client";

import { useEffect, useRef, useState } from "react";
import {
  Volume2,
  Monitor,
  Gamepad2,
  UserRound,
  Shield,
  Info,
  Check,
  LogOut,
  ScrollText,
  BookOpen,
  Mail,
} from "lucide-react";
import {
  Modal,
  Tabs,
  Toggle,
  Slider,
  GameButton,
  GameFrame,
  CustomSelect,
} from "./ui";
import styles from "./SettingsScreen.module.css";

const tabs = [
  { id: "audio", label: "Audio", icon: Volume2 },
  { id: "graphics", label: "Graphics/Motion", icon: Monitor },
  { id: "gameplay", label: "Gameplay", icon: Gamepad2 },
  { id: "account", label: "Account", icon: UserRound },
  { id: "privacy", label: "Privacy", icon: Shield },
  { id: "about", label: "About", icon: Info },
];
const options = {
  sound: [
    "Sound effects",
    "Synthesized game sounds after your first interaction.",
  ],
  reducedMotion: [
    "Reduced motion",
    "Keep transitions and board effects gentle.",
  ],
  highContrast: [
    "High contrast",
    "Stronger borders and clearer interactive states.",
  ],
  screenShake: ["Screen shake", "Optional. Disabled by default."],
  allowFriendRequests: [
    "Friend requests",
    "Allow other players to invite you to their friends list.",
  ],
  showOnline: [
    "Show online status",
    "Let friends know when you are connected.",
  ],
  allowSpectators: [
    "Spectators",
    "Allow viewing when you create a public match.",
  ],
  notifications: [
    "Arena announcements",
    "Receive arena news in your inbox.",
  ],
};

/** Presentation only: saving, session teardown, and navigation remain owned by ArenaApp. */
export default function SettingsScreen({
  settings,
  setSettings,
  user,
  onSave,
  onSignOut,
  navigate,
  onClose,
  onUpgrade,
}) {
  const [tab, setTab] = useState("audio");
  // Settings save themselves shortly after the last change.
  const saved = useRef(JSON.stringify(settings)),
    saveRef = useRef(onSave);
  saveRef.current = onSave;
  useEffect(() => {
    const current = JSON.stringify(settings);
    if (current === saved.current) return;
    const timer = setTimeout(() => {
      saved.current = current;
      saveRef.current?.();
    }, 600);
    return () => clearTimeout(timer);
  }, [settings]);
  const update = (key, value) =>
    setSettings((previous) => ({ ...previous, [key]: value }));
  const toggle = (key) => (
    <Toggle
      key={key}
      label={options[key][0]}
      description={options[key][1]}
      checked={Boolean(settings[key])}
      onChange={(value) => update(key, value)}
    />
  );
  const openAbout = (path) => {
    onClose?.();
    navigate?.(path);
  };

  return (
    <Modal
      title="Settings"
      subtitle="TUNE YOUR ARENA"
      onClose={onClose}
      className={styles.modal}
    >
      <div className={styles.settings}>
        <Tabs
          items={tabs}
          value={tab}
          onChange={setTab}
          label="Settings sections"
        />
        <div
          className={styles.content}
          role="tabpanel"
          aria-label={tabs.find((item) => item.id === tab)?.label}
        >
          {tab === "audio" && (
            <div className={styles.options}>
              {toggle("sound")}
              <Slider
                label="Effects volume"
                value={settings.volume}
                min={0}
                max={100}
                onChange={(value) => update("volume", Number(value))}
              />
            </div>
          )}
          {tab === "graphics" && (
            <div className={styles.options}>
              {toggle("reducedMotion")}
              {toggle("highContrast")}
              {toggle("screenShake")}
              <CustomSelect
                id="quality"
                label="Animation quality"
                value={settings.quality}
                onChange={(value) => update("quality", value)}
                options={["Low", "Medium", "High", "Ultra"].map((value) => ({
                  value,
                  label: value,
                }))}
              />
            </div>
          )}
          {tab === "gameplay" && (
            <div className={styles.options}>
              {toggle("allowSpectators")}
              {toggle("notifications")}
              <GameFrame variant="card" className={styles.tip}>
                <Gamepad2 size={26} />
                <div>
                  <h3>YOUR ARENA, YOUR PACE</h3>
                  <p>
                    Power strength and battle rules stay equal for every player.
                  </p>
                </div>
              </GameFrame>
            </div>
          )}
          {tab === "account" && (
            <div className={styles.account}>
              <GameFrame variant="card" className={styles.player}>
                <UserRound size={34} />
                <div>
                  <h3>{user?.name || "No player signed in"}</h3>
                  <p>
                    {user
                      ? user.guest
                        ? "Guest player"
                        : user.email
                      : "Continue as a guest or sign in to save your journey."}
                  </p>
                </div>
              </GameFrame>
              {user?.guest && onUpgrade && (
                <GameButton onClick={onUpgrade}>Keep my progress</GameButton>
              )}
              {user && (
                <GameButton
                  variant="secondary"
                  onClick={() => openAbout("/profile")}
                >
                  Player profile
                </GameButton>
              )}
              {user && (
                <GameButton variant="danger" onClick={onSignOut}>
                  <LogOut size={18} />
                  Sign out
                </GameButton>
              )}
            </div>
          )}
          {tab === "privacy" && (
            <div className={styles.options}>
              {toggle("allowFriendRequests")}
              {toggle("showOnline")}
              <CustomSelect
                id="profile-visibility"
                label="Profile visibility"
                value={settings.profileVisibility || "public"}
                onChange={(value) => update("profileVisibility", value)}
                options={[
                  { value: "public", label: "Everyone" },
                  { value: "friends", label: "Accepted friends" },
                  { value: "private", label: "Only me" },
                ]}
              />
            </div>
          )}
          {tab === "about" && (
            <div className={styles.about}>
              <div className={styles.crest}>
                <Gamepad2 size={46} />
              </div>
              <h3>ELEMENTAL ARENA</h3>
              <p>Think. Strike. Conquer.</p>
              <div className={styles.aboutLinks}>
                <GameButton
                  variant="secondary"
                  onClick={() => openAbout("/privacy")}
                >
                  <Shield size={20} />
                  Privacy
                </GameButton>
                <GameButton
                  variant="secondary"
                  onClick={() => openAbout("/terms")}
                >
                  <ScrollText size={20} />
                  Terms
                </GameButton>
                <GameButton
                  variant="secondary"
                  onClick={() => openAbout("/rules")}
                >
                  <BookOpen size={20} />
                  Rules
                </GameButton>
                <GameButton
                  variant="secondary"
                  onClick={() => openAbout("/notifications")}
                >
                  <Mail size={20} />
                  Notifications
                </GameButton>
              </div>
            </div>
          )}
        </div>
        <p className={styles.autosave}>
          <Check size={14} /> Changes save automatically
        </p>
      </div>
    </Modal>
  );
}
