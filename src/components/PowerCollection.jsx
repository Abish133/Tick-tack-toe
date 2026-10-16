"use client";
import { useEffect, useState } from "react";
import {
  Layers3,
  Zap,
  CheckCircle2,
  Search,
  Shield,
  Plus,
  X,
  Info,
  BookOpen,
} from "lucide-react";
import { POWER_INFO } from "./PowerPresentation";
import { GameFrame, GameButton, Modal } from "./ui";
import styles from "./PowerCollection.module.css";

function PowerArt({ power, small = false }) {
  return (
    <span
      className={`${styles.art} ${small ? styles.smallArt : ""}`}
      aria-hidden="true"
    >
      <span className={styles.orbit} />
      {power.sprite !== undefined ? (
        <span
          className="sprite"
          style={{ backgroundPosition: `${power.sprite * 50}% 0%` }}
        />
      ) : (
        <power.icon size={small ? 30 : 60} />
      )}
    </span>
  );
}

export default function PowerCollection({
  loadout = [],
  setLoadout,
  disabled = false,
}) {
  const [search, setSearch] = useState(""),
    [category, setCategory] = useState("all"),
    [selectionNotice, setSelectionNotice] = useState(""),
    [inspect, setInspect] = useState(null),
    [swapSlot, setSwapSlot] = useState(null),
    [dropSlot, setDropSlot] = useState(null),
    [hintSeen, setHintSeen] = useState(false);
  // The slot hint teaches once; after the first slot or card tap it stays hidden.
  useEffect(() => {
    try {
      setHintSeen(localStorage.getItem("ea:armory-hint") === "seen");
    } catch {}
  }, []);
  useEffect(() => {
    if (swapSlot === null && !selectionNotice) return;
    try {
      localStorage.setItem("ea:armory-hint", "seen");
    } catch {}
  }, [swapSlot, selectionNotice]);
  const categories = ["all", ...new Set(POWER_INFO.map((power) => power.role))];
  const powers = POWER_INFO.filter(
    (power) =>
      (category === "all" || power.role === category) &&
      `${power.name} ${power.element} ${power.description}`
        .toLowerCase()
        .includes(search.toLowerCase()),
  );
  function select(power, targetSlot = swapSlot) {
    if (disabled) return;
    const equipped = loadout.includes(power.id);
    if (Number.isInteger(targetSlot)) {
      setLoadout((current) => {
        const next = [...current];
        const destination = Math.min(
          targetSlot,
          equipped ? next.length - 1 : next.length,
        );
        if (equipped) {
          const source = next.indexOf(power.id);
          [next[source], next[destination]] = [next[destination], next[source]];
        } else {
          next[destination] = power.id;
        }
        return next;
      });
      setSwapSlot(null);
      setSelectionNotice(
        `${power.name} equipped. Save your loadout when you have three powers.`,
      );
      return;
    }
    if (!equipped && loadout.length === 3) {
      setSelectionNotice(
        `Unequip one of your three powers before equipping ${power.name}.`,
      );
      return;
    }
    setSelectionNotice(
      `${power.name} ${equipped ? "unequipped" : "equipped"}. Save your loadout when you have three powers.`,
    );
    setLoadout((current) =>
      current.includes(power.id)
        ? current.filter((id) => id !== power.id)
        : current.length < 3
          ? [...current, power.id]
          : current,
    );
    setSwapSlot(null);
  }
  function drop(event, index) {
    event.preventDefault();
    setDropSlot(null);
    const power = POWER_INFO.find(
      (item) =>
        item.id === event.dataTransfer.getData("application/x-elemental-power"),
    );
    if (power) select(power, index);
  }
  function tryPower(power) {
    setInspect(null);
    window.dispatchEvent(
      new CustomEvent("elemental:inspect-power", { detail: { id: power.id } }),
    );
  }
  return (
    <section className={styles.deck} aria-label="Power deck builder">
      <GameFrame
        className={`loadout-summary ${styles.summary}`}
        variant="panel"
      >
        <div className={styles.summaryTitle}>
          <Layers3 size={20} />
          <strong>{loadout.length} / 3 equipped</strong>
          <span>YOUR DECK</span>
        </div>
        <div className={styles.slots} aria-label="Three equipped power slots">
          {[0, 1, 2].map((index) => {
            const power = POWER_INFO.find((item) => item.id === loadout[index]);
            return (
              <div
                key={index}
                className={`${styles.slot} ${power ? styles.filled : styles.emptySlot} ${swapSlot === index || dropSlot === index ? styles.targetSlot : ""}`}
                style={{ "--power-color": power?.color || "#f2c86b" }}
                onDragOver={(event) => {
                  if (!disabled) {
                    event.preventDefault();
                    setDropSlot(index);
                  }
                }}
                onDragLeave={() => setDropSlot(null)}
                onDrop={(event) => drop(event, index)}
              >
                <button
                  className={styles.slotChoice}
                  disabled={disabled}
                  aria-label={
                    power
                      ? `Replace slot ${index + 1}: ${power.name}`
                      : `Equip slot ${index + 1}`
                  }
                  aria-pressed={swapSlot === index}
                  onClick={() =>
                    setSwapSlot((current) => (current === index ? null : index))
                  }
                >
                  <span className={styles.slotNumber}>{index + 1}</span>
                  {power ? (
                    <>
                      <PowerArt power={power} small />
                      <strong>{power.name}</strong>
                      <span>
                        <Zap size={13} />
                        {power.cost}
                      </span>
                    </>
                  ) : (
                    <>
                      <Plus size={28} />
                      <strong>CHOOSE POWER</strong>
                    </>
                  )}
                </button>
                {power && (
                  <button
                    className={styles.remove}
                    aria-label={`Unequip ${power.name}`}
                    disabled={disabled}
                    onClick={() => select(power, null)}
                  >
                    <X size={16} />
                  </button>
                )}
              </div>
            );
          })}
        </div>
        <span className={styles.deckHint}>
          One use per round · Eclipse once per match · Time Warp extends the
          clock
        </span>
      </GameFrame>
      <div className={styles.filters}>
        <label>
          <Search size={18} />
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Find power"
            aria-label="Search powers"
          />
        </label>
        <div className={`${styles.families} scroll-row`} aria-label="Power roles">
          {categories.map((role) => {
            const Icon =
              POWER_INFO.find((power) => power.role === role)?.icon || Layers3;
            return (
              <button
                key={role}
                className={category === role ? styles.active : ""}
                aria-pressed={category === role}
                onClick={() => setCategory(role)}
              >
                <Icon size={18} />
                <span>{role === "all" ? "All 22 powers" : role}</span>
              </button>
            );
          })}
        </div>
      </div>
      {(selectionNotice || swapSlot !== null || !hintSeen) && (
        <p className={styles.selectionNotice} aria-live="polite">
          {selectionNotice ||
            (swapSlot !== null
              ? `Choose a power for slot ${swapSlot + 1}.`
              : "Tap a slot, then choose its replacement.")}
        </p>
      )}
      <div className={`power-grid ${styles.grid}`}>
        {powers.map((power) => (
          <div
            key={power.id}
            className={styles.cardWrap}
            style={{ "--power-color": power.color }}
          >
            <button
              className={`power-card ${styles.card} ${loadout.includes(power.id) ? `equipped ${styles.equipped}` : ""}`}
              disabled={disabled}
              draggable={!disabled}
              onDragStart={(event) => {
                event.dataTransfer.setData(
                  "application/x-elemental-power",
                  power.id,
                );
                event.dataTransfer.effectAllowed = "copy";
              }}
              onClick={() => select(power)}
              aria-pressed={loadout.includes(power.id)}
            >
              <span className={styles.cost}>
                <Zap size={14} />
                {power.cost}
              </span>
              {loadout.includes(power.id) && (
                <span className={styles.equippedBadge}>
                  <CheckCircle2 size={20} />
                </span>
              )}
              <PowerArt power={power} />
              <span className={styles.family}>{power.role}</span>
              <h3>{power.name}</h3>
              <span className={styles.element}>{power.element}</span>
              <span className={styles.cardAction}>
                {loadout.includes(power.id)
                  ? "Equipped"
                  : loadout.length === 3
                    ? "Replace an equipped power"
                    : "Equip power"}
              </span>
            </button>
            <button
              className={styles.inspect}
              aria-label={`Inspect ${power.name}`}
              onClick={() => setInspect(power)}
            >
              <Info size={16} />
              INSPECT
            </button>
          </div>
        ))}
      </div>
      {!powers.length && (
        <p className={styles.noResults}>
          No powers match that search. Try another element or role.
        </p>
      )}
      {inspect && (
        <Modal
          title={inspect.name}
          onClose={() => setInspect(null)}
          className={styles.inspectModal}
        >
          <div
            className={styles.inspectBody}
            style={{ "--power-color": inspect.color }}
          >
            <GameFrame variant="card" className={styles.inspectCard}>
              <PowerArt power={inspect} />
              <strong>{inspect.element}</strong>
              <span>
                <Zap size={18} />
                {inspect.cost} energy · {inspect.role}
              </span>
            </GameFrame>
            <div className={styles.rules}>
              <h3>RULES</h3>
              <p>{inspect.description}</p>
              <span className={styles.access}>
                <Shield size={16} />
                Equal Ranked access
              </span>
              <h3>COUNTERPLAY</h3>
              <p>{inspect.counterplay}</p>
              <p className={styles.useLimit}>
                {inspect.maxUsesPerMatch
                  ? "Once per match."
                  : "One use per round."}{" "}
                {inspect.consumesTurn === false
                  ? "Extends the clock without another move."
                  : "Consumes one main action."}
              </p>
            </div>
          </div>
          <div className={styles.inspectActions}>
            <GameButton
              variant={loadout.includes(inspect.id) ? "secondary" : "primary"}
              disabled={disabled}
              onClick={() => select(inspect)}
            >
              {loadout.includes(inspect.id) ? "UNEQUIP" : "EQUIP"}
            </GameButton>
            <GameButton variant="secondary" onClick={() => tryPower(inspect)}>
              <BookOpen size={18} />
              TRY IN POWER LAB
            </GameButton>
          </div>
        </Modal>
      )}
    </section>
  );
}
