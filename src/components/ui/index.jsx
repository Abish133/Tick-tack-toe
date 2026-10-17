"use client";

import {
  createContext,
  useContext,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";
import {
  AnimatePresence,
  motion,
  MotionConfig,
} from "motion/react";
import {
  Check,
  ChevronDown,
  Gift,
  Info,
  Lock,
  Plus,
  Sparkles,
  X,
  Zap,
} from "lucide-react";
import styles from "./GameUI.module.css";
import { CosmeticMotionProvider, useGameReducedMotion } from "../AnimatedCosmeticImage";

const Feedback = createContext(() => {});
const modalStack = [];
export function GameUIProvider({
  children,
  onFeedback,
  reducedMotion = false,
}) {
  return (
    <MotionConfig reducedMotion={reducedMotion ? "always" : "never"}>
      <CosmeticMotionProvider reducedMotion={reducedMotion}>
        <Feedback.Provider value={onFeedback || (() => {})}>
          {children}
        </Feedback.Provider>
      </CosmeticMotionProvider>
    </MotionConfig>
  );
}

export function GameFrame({
  variant = "panel",
  as: Tag = "section",
  className = "",
  children,
  ...props
}) {
  return (
    <Tag
      className={`${styles.frame} ${styles[variant] || ""} ${className}`}
      {...props}
    >
      {["northwest", "northeast", "southeast", "southwest"].map((corner) => (
        <svg
          key={corner}
          className={`${styles.corner} ${styles[corner]}`}
          viewBox="0 0 32 32"
          aria-hidden="true"
        >
          <path d="M2 24V2h22M5 18V5h13M7 2l5 5-5 5-5-5Zm10 0 5 5 5-5M2 17l5 5-5 5" />
        </svg>
      ))}
      {children}
    </Tag>
  );
}

export function GameButton({
  variant = "primary",
  size = "md",
  className = "",
  children,
  onClick,
  ...props
}) {
  const feedback = useContext(Feedback);
  return (
    <button
      type="button"
      className={`${styles.button} ${styles[variant] || ""} ${styles[size] || ""} ${className}`}
      data-game-ui="true"
      {...props}
      onClick={(event) => {
        feedback("click");
        onClick?.(event);
      }}
    >
      <span>{children}</span>
    </button>
  );
}

export function IconBadge({
  icon: Icon,
  count = 0,
  children,
  className = "",
  ...props
}) {
  return (
    <span className={`${styles.iconBadge} ${className}`} {...props}>
      {Icon && <Icon aria-hidden="true" />}
      {children}
      {count > 0 && (
        <b className={styles.count}>{count > 99 ? "99+" : count}</b>
      )}
    </span>
  );
}

export function ProgressBar({
  value = 0,
  max = 100,
  label = "Progress",
  radial = false,
  size = 56,
  className = "",
  children,
}) {
  const percent = Math.max(
    0,
    Math.min(100, (Number(value) / Math.max(1, Number(max))) * 100),
  );
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={Math.max(0, Math.min(max, value))}
      className={`${radial ? styles.radial : styles.progress} ${className}`}
      style={radial ? { width: size, height: size } : undefined}
    >
      {radial ? (
        <>
          <svg viewBox="0 0 100 100" aria-hidden="true">
            <circle cx="50" cy="50" r="46" />
            <circle
              cx="50"
              cy="50"
              r="46"
              pathLength="100"
              strokeDasharray={`${percent} 100`}
            />
          </svg>
          {children}
        </>
      ) : (
        <span style={{ width: `${percent}%` }} />
      )}
    </div>
  );
}

export function ResourcePill({
  value = 0,
  icon: Icon,
  label,
  onClick,
  className = "",
  showPlus = true,
}) {
  const previous = useRef(Number(value) || 0),
    frame = useRef(),
    [display, setDisplay] = useState(Number(value) || 0),
    [delta, setDelta] = useState(0),
    reduced = useGameReducedMotion();
  useEffect(() => {
    const next = Number(value) || 0,
      start = previous.current;
    previous.current = next;
    if (next === start) {
      setDisplay(next);
      return;
    }
    setDelta(next - start);
    const begun = performance.now();
    const tick = (time) => {
      const p = Math.min(1, (time - begun) / 600);
      setDisplay(Math.round(start + (next - start) * (1 - (1 - p) ** 3)));
      if (p < 1) frame.current = requestAnimationFrame(tick);
    };
    if (reduced) setDisplay(next);
    else frame.current = requestAnimationFrame(tick);
    const timer = setTimeout(() => setDelta(0), 1500);
    return () => {
      cancelAnimationFrame(frame.current);
      clearTimeout(timer);
    };
  }, [value, reduced]);
  const full = Number(value || 0).toLocaleString(),
    shown =
      display >= 1000
        ? new Intl.NumberFormat("en", {
            notation: "compact",
            maximumFractionDigits: 1,
          }).format(display)
        : display.toLocaleString();
  return (
    <button
      className={`${styles.resource} ${className}`}
      type="button"
      onClick={onClick}
      aria-label={`${label}: ${full}`}
      title={`${label}: ${full}`}
    >
      <Icon aria-hidden="true" />
      <strong>{shown}</strong>
      {showPlus && <Plus size={13} aria-hidden="true" />}
      {delta !== 0 && (
        <motion.i
          className={`${styles.delta} ${delta < 0 ? styles.loss : ""}`}
          initial={{ opacity: 0, y: 0 }}
          animate={{ opacity: [0, 1, 0], y: reduced ? 0 : -28 }}
          transition={{ duration: 1.5 }}
          aria-hidden="true"
        >
          {delta > 0 ? "+" : ""}
          {delta}
        </motion.i>
      )}
    </button>
  );
}

export function Tabs({
  items = [],
  value,
  onChange,
  label = "Screen tabs",
  className = "",
}) {
  const refs = useRef({});
  return (
    <div
      className={`${styles.tabs} scroll-row ${className}`}
      role="tablist"
      aria-label={label}
    >
      {items.map(({ id, label: text, icon: Icon, disabled }) => (
        <button
          key={id}
          ref={(el) => (refs.current[id] = el)}
          type="button"
          role="tab"
          aria-selected={value === id}
          disabled={disabled}
          tabIndex={value === id ? 0 : -1}
          onClick={() => onChange(id)}
          onKeyDown={(event) => {
            if (!["ArrowRight", "ArrowLeft", "Home", "End"].includes(event.key))
              return;
            event.preventDefault();
            const available = items.filter((item) => !item.disabled),
              i = available.findIndex((item) => item.id === id),
              next =
                event.key === "Home"
                  ? 0
                  : event.key === "End"
                    ? available.length - 1
                    : (i +
                        (event.key === "ArrowRight" ? 1 : -1) +
                        available.length) %
                      available.length;
            onChange(available[next].id);
            refs.current[available[next].id]?.focus();
          }}
        >
          {Icon && <Icon size={18} aria-hidden="true" />}
          {text}
        </button>
      ))}
    </div>
  );
}

export function Modal({
  title,
  subtitle,
  open = true,
  onClose,
  children,
  className = "",
  fullScreen = false,
  closeLabel,
}) {
  const ref = useRef(null),
    closeRef = useRef(onClose),
    titleId = useId(),
    reduced = useGameReducedMotion();
  closeRef.current = onClose;
  useEffect(() => {
    if (!open) return;
    const before = document.activeElement;
    const panel = ref.current;
    modalStack.push(panel);
    ref.current?.focus();
    const key = (event) => {
      if (event.defaultPrevented || modalStack.at(-1) !== panel) return;
      if (event.key === "Escape") {
        event.preventDefault();
        closeRef.current?.();
      }
      if (event.key === "Tab") {
        const focusable = [
          ...(ref.current?.querySelectorAll(
            'button:not(:disabled),a[href],input:not(:disabled),textarea:not(:disabled),[tabindex="0"]',
          ) || []),
        ].filter((el) => el.getClientRects().length);
        const first = focusable[0],
          last = focusable.at(-1);
        if (
          event.shiftKey &&
          (document.activeElement === first ||
            document.activeElement === ref.current)
        ) {
          event.preventDefault();
          last?.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first?.focus();
        }
      }
    };
    document.addEventListener("keydown", key);
    return () => {
      document.removeEventListener("keydown", key);
      const index = modalStack.indexOf(panel);
      if (index >= 0) modalStack.splice(index, 1);
      if (before?.isConnected) before.focus?.();
    };
  }, [open]);
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className={`${styles.backdrop} ${fullScreen ? styles.fullBackdrop : ""}`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) onClose?.();
          }}
        >
          <motion.section
            ref={ref}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            tabIndex={-1}
            className={`${styles.frame} ${styles.modal} ${fullScreen ? styles.fullScreen : ""} ${className}`}
            initial={{ opacity: 0, scale: reduced ? 1 : 0.94 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22 }}
          >
            <header className={styles.modalHeader}>
              <div>
                <h2 id={titleId}>{title}</h2>
                {subtitle && <p>{subtitle}</p>}
              </div>
              {onClose && (
                <GameButton
                  variant="icon"
                  aria-label={closeLabel || `Close ${title}`}
                  onClick={onClose}
                >
                  <X size={22} />
                </GameButton>
              )}
            </header>
            <div className={styles.modalBody}>{children}</div>
          </motion.section>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function Tooltip({ label, children }) {
  const [open, setOpen] = useState(false),
    id = useId();
  return (
    <span className={styles.tooltipWrap}>
      {children || (
        <button
          type="button"
          aria-label="More information"
          aria-expanded={open}
          aria-describedby={open ? id : undefined}
          onClick={() => setOpen((v) => !v)}
          onBlur={() => setOpen(false)}
        >
          <Info size={18} />
        </button>
      )}
      {open && (
        <span
          id={id}
          role="tooltip"
          className={`${styles.frame} ${styles.tooltip}`}
        >
          {label}
        </span>
      )}
    </span>
  );
}

export function Toggle({
  label,
  checked,
  onChange,
  description,
  disabled = false,
}) {
  return (
    <div className={styles.setting}>
      <span>
        <strong>{label}</strong>
        {description && <small>{description}</small>}
      </span>
      <button
        type="button"
        role="switch"
        aria-label={label}
        aria-checked={checked}
        disabled={disabled}
        className={`${styles.toggle} ${checked ? styles.on : ""}`}
        onClick={() => onChange(!checked)}
      >
        <span />
      </button>
    </div>
  );
}

export function Slider({
  label,
  value,
  onChange,
  min = 0,
  max = 100,
  step = 1,
}) {
  return (
    <label className={styles.slider}>
      <span>
        {label}
        <b>{value}</b>
      </span>
      <input
        type="range"
        aria-label={label}
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </label>
  );
}

export function CustomSelect({
  label,
  value,
  onChange,
  options = [],
  id,
  className = "",
  disabled = false,
}) {
  const [open, setOpen] = useState(false),
    [position, setPosition] = useState({}),
    root = useRef(null),
    listId = useId(),
    selected = options.find((item) => item.value === value);
  useEffect(() => {
    if (!open) return;
    const anchor = root.current?.querySelector('[role="combobox"]');
    const rect = anchor?.getBoundingClientRect();
    if (rect) {
      const available = window.innerHeight - rect.bottom - 12,
        above = rect.top - 12,
        height = Math.min(
          240,
          Math.max(96, available >= above ? available : above),
        );
      setPosition({
        position: "fixed",
        left: Math.min(rect.left, innerWidth - Math.max(rect.width, 180) - 12),
        top:
          available >= height
            ? rect.bottom + 4
            : Math.max(12, rect.top - height - 4),
        width: Math.max(rect.width, 180),
        maxHeight: height,
        zIndex: 150,
      });
    }
    const outside = (event) => {
      if (!root.current?.contains(event.target)) setOpen(false);
    };
    document.addEventListener("pointerdown", outside);
    return () => document.removeEventListener("pointerdown", outside);
  }, [open]);
  return (
    <div className={`${styles.select} ${className}`} ref={root}>
      <span className={styles.selectLabel}>{label}</span>
      <button
        id={id}
        type="button"
        role="combobox"
        aria-label={label}
        aria-expanded={open}
        data-value={value}
        aria-controls={listId}
        aria-haspopup="listbox"
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            event.stopPropagation();
            setOpen(false);
          }
          if (event.key === "ArrowDown" || event.key === "ArrowUp") {
            event.preventDefault();
            const choices = options.filter((item) => !item.disabled),
              i = choices.findIndex((item) => item.value === value),
              next =
                (i + (event.key === "ArrowDown" ? 1 : -1) + choices.length) %
                choices.length;
            if (choices[next]) onChange(choices[next].value);
          }
        }}
      >
        {selected?.label || "Choose"}
        <ChevronDown size={18} />
      </button>
      {open && (
        <div
          className={`${styles.frame} ${styles.selectList}`}
          style={position}
          id={listId}
          role="listbox"
          aria-label={label}
        >
          {options.map((item) => (
            <button
              key={item.value}
              type="button"
              role="option"
              data-value={item.value}
              aria-selected={value === item.value}
              disabled={item.disabled}
              onClick={() => {
                onChange(item.value);
                setOpen(false);
                root.current?.querySelector('[role="combobox"]')?.focus();
              }}
            >
              {item.label}
              {value === item.value && <Check size={18} />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function RarityTile({
  rarity = "common",
  as: Tag = "div",
  className = "",
  children,
  ...props
}) {
  return (
    <Tag
      className={`${styles.rarityTile} ${styles[rarity.toLowerCase()] || styles.common} ${className}`}
      data-rarity={rarity.toLowerCase()}
      {...props}
    >
      {children}
    </Tag>
  );
}
export function PowerCard({
  power,
  equipped = false,
  children,
  className = "",
  ...props
}) {
  const Icon = power.icon;
  return (
    <GameButton
      variant="secondary"
      className={`${styles.powerCard} ${className}`}
      aria-pressed={equipped}
      style={{ "--element": power.color }}
      {...props}
    >
      <span className={styles.powerCost}>
        <Zap size={14} />
        {power.cost}
      </span>
      <Icon size={42} />
      <strong>{power.name}</strong>
      <small>{power.element}</small>
      {equipped && <Check size={18} />} {children}
    </GameButton>
  );
}
export function Banner({ kind = "gold", className = "", children, ...props }) {
  return (
    <div
      className={`${styles.banner} ${styles[kind] || ""} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}
export function Toast({ children, error = false, onClose }) {
  return (
    <motion.div
      className={`${styles.toast} ${error ? styles.error : ""}`}
      role={error ? "alert" : "status"}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
    >
      {children}
      {onClose && (
        <GameButton
          variant="icon"
          aria-label="Dismiss notification"
          onClick={onClose}
        >
          <X size={18} />
        </GameButton>
      )}
    </motion.div>
  );
}

/* ---------- Reward / ownership states ----------
   locked · progress · ready · claimed · new · equipped · owned */
export function NotificationDot({ count = 0, className = "", label }) {
  if (!count) return null;
  return (
    <b
      className={`${styles.notificationDot} ${className}`}
      aria-label={label || `${count} ready`}
      data-notification-dot
    >
      {count > 9 ? "9+" : count}
    </b>
  );
}

const STATE_COPY = {
  locked: ["Locked", Lock],
  ready: ["Ready", Gift],
  claimed: ["Claimed", Check],
  completed: ["Completed", Check],
  new: ["New", Sparkles],
  equipped: ["Equipped", Check],
  owned: ["Owned", Check],
};
export function StateBadge({ state, children, className = "" }) {
  const [label, Icon] = STATE_COPY[state] || [state, null];
  return (
    <span
      className={`${styles.stateBadge} ${styles["state_" + state] || ""} ${className}`}
      data-state-badge={state}
    >
      {Icon && <Icon size={12} aria-hidden="true" />}
      {children || label}
    </span>
  );
}

// One button vocabulary for every reward: CLAIM when ready, a quiet label otherwise.
export function ClaimButton({
  state,
  onClaim,
  onGo,
  busy = false,
  claimLabel = "Claim",
  claimedLabel = "Claimed",
  lockedLabel = "Locked",
  goLabel = "Go",
  className = "",
  ...props
}) {
  if (state === "ready")
    return (
      <GameButton
        className={`${styles.claimReady} ${className}`}
        disabled={busy}
        onClick={onClaim}
        {...props}
      >
        <Gift size={17} />
        {claimLabel}
      </GameButton>
    );
  if (state === "progress" && onGo)
    return (
      <GameButton
        variant="secondary"
        size="sm"
        className={className}
        onClick={onGo}
        {...props}
      >
        {goLabel}
      </GameButton>
    );
  if (state === "claimed" || state === "completed")
    return (
      <span className={`${styles.stateLabel} ${styles.claimedLabel} ${className}`}>
        <Check size={16} aria-hidden="true" />
        {claimedLabel}
      </span>
    );
  if (state === "locked")
    return (
      <span className={`${styles.stateLabel} ${className}`}>
        <Lock size={15} aria-hidden="true" />
        {lockedLabel}
      </span>
    );
  return null;
}
