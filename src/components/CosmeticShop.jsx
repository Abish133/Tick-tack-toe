"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Check,
  Coins,
  Eye,
  Search,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  X,
  ArrowRight,
  Layers3,
  ChevronDown,
  Box,
  Crown,
} from "lucide-react";
import CosmeticArt from "./CosmeticArt";
import { CosmeticMark } from "./CosmeticAppearance";
import CommercePanel from "./CommercePanel";
import { GameFrame, GameButton, Modal, RarityTile } from "./ui";
import {
  COSMETIC_THEMES,
  cosmeticTheme,
  cosmeticStyle,
} from "../lib/cosmetic-collection";
import styles from "./CosmeticShop.module.css";

const categories = [
  ["all", "All styles"],
  ["avatar", "Avatars"],
  ["board", "Boards"],
  ["marks", "Marks"],
  ["arena", "Arenas"],
  ["frame", "Frames"],
  ["banner", "Banners"],
  ["effect", "Effects"],
  ["emote", "Emotes"],
  ["title", "Titles"],
];
const pretty = (n) => Number(n || 0).toLocaleString();
const fields = {
  board: "equippedBoard",
  marks: "equippedMark",
  avatar: "avatar",
  effect: "equippedEffect",
  frame: "equippedFrame",
  banner: "equippedBanner",
  arena: "equippedArena",
  emote: "equippedEmote",
};
const sortOptions = [
  ["featured", "Featured"],
  ["price-low", "Coins: low to high"],
  ["price-high", "Coins: high to low"],
  ["name", "Name"],
];
function isEquipped(item, user) {
  return item.type === "title"
    ? user?.profile?.title === item.name
    : user?.profile?.[fields[item.type]] === item.id;
}

export function CosmeticPreview({
  item,
  owned,
  busy,
  onPurchase,
  onEquip,
  onClose,
  user,
}) {
  const theme = cosmeticTheme(item.id),
    isBoard = ["board", "marks"].includes(item.type),
    equipped = isEquipped(item, user);
  return (
    <Modal
      title={item.name}
      onClose={onClose}
      closeLabel="Close preview"
      className={styles.dialog}
    >
      <span
        className={styles.previewRarity}
        data-rarity={item.rarity || "rare"}
      >
        {item.rarity || "rare"} · COSMETIC PREVIEW
      </span>
      <div className={styles.previewStage} style={cosmeticStyle(item.id)}>
        {isBoard ? (
          <div
            className={`preview-board ${item.type === "board" && theme ? "collection-board" : ""} ${styles.previewBoard}`}
            style={item.type === "board" ? cosmeticStyle(item.id) : {}}
            data-cosmetic-theme={item.type === "board" ? theme?.id : undefined}
          >
            {["X", null, "O", null, "X", null, "O", null, "X"].map(
              (mark, index) => (
                <div className="preview-cell" key={index}>
                  {mark && (
                    <span
                      className={`mark ${mark.toLowerCase()} ${theme && item.type === "marks" ? "collection-marks" : ""}`}
                      style={
                        item.type === "marks" ? cosmeticStyle(item.id) : {}
                      }
                    >
                      <CosmeticMark
                        mark={mark}
                        cosmeticId={item.type === "marks" ? item.id : ""}
                      />
                    </span>
                  )}
                </div>
              ),
            )}
          </div>
        ) : (
          <CosmeticArt item={item} />
        )}
      </div>
      {theme && <p className={styles.themeName}>{theme.name} collection</p>}
      <p className={styles.previewDescription}>{item.description}</p>
      <div className={styles.previewActions}>
        <span>
          <ShieldCheck size={16} /> Visual style only
        </span>
        {owned && onEquip ? (
          <GameButton disabled={busy || equipped} onClick={() => onEquip(item)}>
            {equipped ? (
              <>
                <Check size={18} />
                Equipped
              </>
            ) : (
              "EQUIP"
            )}
          </GameButton>
        ) : (
          <GameButton disabled={owned || busy} onClick={() => onPurchase(item)}>
            {owned ? (
              <>
                <Check size={18} />
                Owned
              </>
            ) : (
              <>
                <Coins size={18} />
                {pretty(item.price ?? item.cost)} coins
              </>
            )}
          </GameButton>
        )}
      </div>
    </Modal>
  );
}

export default function CosmeticShop({
  items = [],
  ownedIds = [],
  user,
  api,
  features,
  refresh,
  onError,
  onNotice,
  onRegister,
  busy,
  onPurchase,
}) {
  const [category, setCategory] = useState("all"),
    [theme, setTheme] = useState("all"),
    [query, setQuery] = useState(""),
    [sort, setSort] = useState("featured"),
    [limit, setLimit] = useState(24),
    [preview, setPreview] = useState(null),
    [picker, setPicker] = useState(null),
    [equipBusy, setEquipBusy] = useState(false),
    [reveal, setReveal] = useState(null);
  const catalogRef = useRef(null),
    pendingPurchase = useRef(null),
    owned = useMemo(() => new Set(ownedIds), [ownedIds]);
  const counts = useMemo(
    () =>
      Object.fromEntries(
        categories.map(([id]) => [
          id,
          id === "all"
            ? items.length
            : items.filter((item) => item.type === id).length,
        ]),
      ),
    [items],
  );
  const filtered = useMemo(() => {
    const text = query.trim().toLowerCase();
    const list = items.filter((item) => {
      const collection = cosmeticTheme(item.id);
      return (
        (category === "all" || item.type === category) &&
        (theme === "all" || collection?.id === theme) &&
        (!text ||
          `${item.name} ${item.description || ""} ${item.type} ${collection?.name || ""}`
            .toLowerCase()
            .includes(text))
      );
    });
    if (sort === "featured")
      list.sort((a, b) => {
        const first = cosmeticTheme(a.id),
          second = cosmeticTheme(b.id);
        if (!first || !second)
          return Number(Boolean(first)) - Number(Boolean(second));
        const worlds =
          COSMETIC_THEMES.findIndex((theme) => theme.id === first.id) -
          COSMETIC_THEMES.findIndex((theme) => theme.id === second.id);
        return (
          worlds ||
          categories.findIndex(([id]) => id === a.type) -
            categories.findIndex(([id]) => id === b.type)
        );
      });
    if (sort === "price-low")
      list.sort((a, b) => (a.price ?? a.cost ?? 0) - (b.price ?? b.cost ?? 0));
    if (sort === "price-high")
      list.sort((a, b) => (b.price ?? b.cost ?? 0) - (a.price ?? a.cost ?? 0));
    if (sort === "name") list.sort((a, b) => a.name.localeCompare(b.name));
    return list;
  }, [items, category, theme, query, sort]);
  useEffect(() => setLimit(24), [category, theme, query, sort]);
  useEffect(() => {
    const purchased = pendingPurchase.current;
    if (purchased && ownedIds.includes(purchased.id)) {
      pendingPurchase.current = null;
      setReveal(purchased);
    }
  }, [ownedIds]);
  useEffect(() => {
    if (!reveal) return;
    const timer = setTimeout(() => setReveal(null), 2200);
    return () => clearTimeout(timer);
  }, [reveal]);
  function viewCollection(id) {
    setCategory("all");
    setQuery("");
    setTheme(id);
    catalogRef.current?.scrollTo({
      top: 0,
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "instant"
        : "smooth",
    });
  }
  function clear() {
    setCategory("all");
    setTheme("all");
    setQuery("");
  }
  function buy(item) {
    pendingPurchase.current = item;
    onPurchase(item);
  }
  async function equip(item) {
    setEquipBusy(true);
    try {
      await api("/inventory/equip", "POST", { cosmeticId: item.id });
      await refresh();
      onNotice(`${item.name} equipped. Your gameplay rules stay the same.`);
    } catch (error) {
      onError(error.message);
    } finally {
      setEquipBusy(false);
    }
  }
  const commerceProps = {
    api,
    user,
    features,
    refresh,
    onError,
    onNotice,
    onRegister,
    ownedIds,
    onCollection: viewCollection,
  };
  return (
    <section className={styles.store} aria-label="Cosmetic collection">
      <div className={styles.categories} aria-label="Cosmetic categories">
        {categories.map(([id, label]) => (
          <button
            key={id}
            aria-label={`${label} ${counts[id]}`}
            aria-pressed={category === id}
            className={category === id ? styles.selected : ""}
            onClick={() => setCategory(id)}
          >
            {id === "all" ? (
              <>
                <Crown size={18} />
                Featured
              </>
            ) : (
              label
            )}
            <span>{counts[id]}</span>
          </button>
        ))}
        <button
          className={category === "coins" ? styles.selected : ""}
          aria-pressed={category === "coins"}
          onClick={() => setCategory("coins")}
        >
          <Coins size={18} />
          Coins
        </button>
      </div>
      <div className={styles.tools}>
        <label className={styles.search}>
          <Search size={18} />
          <input
            aria-label="Search cosmetics"
            placeholder="Find a style…"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            maxLength={100}
          />
          {query && (
            <button aria-label="Clear search" onClick={() => setQuery("")}>
              <X size={18} />
            </button>
          )}
        </label>
        <button
          className={styles.pickerButton}
          aria-label="Collection theme"
          data-value={theme}
          onClick={() => setPicker("theme")}
        >
          {COSMETIC_THEMES.find((item) => item.id === theme)?.name ||
            "Every world"}
          <ChevronDown size={18} />
        </button>
        <button
          className={styles.pickerButton}
          aria-label="Sort cosmetics"
          data-value={sort}
          onClick={() => setPicker("sort")}
        >
          {sortOptions.find(([id]) => id === sort)?.[1]}
          <ChevronDown size={18} />
        </button>
      </div>
      <div ref={catalogRef} className={styles.catalogScroll}>
        {category === "all" && theme === "all" && !query && (
          <GameFrame
            variant="banner"
            className={styles.hero}
            aria-label="The elemental style collection"
          >
            <img
              className={styles.heroBackground}
              src="/assets/collection/arena-nebula.webp"
              alt=""
            />
            <div className={styles.heroShade} />
            <div className={styles.heroCopy}>
              <span className={styles.offerRibbon}>
                <Sparkles size={16} />
                TEN WORLDS
              </span>
              <h2>CHOOSE YOUR LEGEND</h2>
              <p>90 collection styles · Equal powers</p>
            </div>
            <div className={styles.heroArt} aria-hidden="true">
              <img src="/assets/collection/avatar-lunar.webp" alt="" />
              <img src="/assets/collection/avatar-solar.webp" alt="" />
            </div>
          </GameFrame>
        )}
        {(category === "all" || category === "coins") && (
          <CommercePanel
            {...commerceProps}
            focus={category === "coins" ? "coins" : "featured"}
          />
        )}
        {category !== "coins" && (
          <>
            <div className={styles.heading}>
              <h2>The collection</h2>
              <span className={styles.fairBadge}>
                <ShieldCheck size={16} />
                No power upgrades for sale
              </span>
            </div>
            <div className={styles.results}>
              <span aria-live="polite">
                {filtered.length} {filtered.length === 1 ? "style" : "styles"}
                {theme !== "all"
                  ? ` in ${COSMETIC_THEMES.find((item) => item.id === theme)?.name}`
                  : ""}
              </span>
              <span>
                <Layers3 size={16} />
                {ownedIds.length} owned
              </span>
            </div>
            {filtered.length ? (
              <div className={`shop-grid ${styles.grid}`}>
                {filtered.slice(0, limit).map((item) => {
                  const collection = cosmeticTheme(item.id),
                    isOwned = owned.has(item.id),
                    equipped = isEquipped(item, user);
                  return (
                    <RarityTile
                      as="article"
                      rarity={item.rarity || "rare"}
                      className={`shop-card ${styles.card}`}
                      key={item.id}
                      data-cosmetic-type={item.type}
                      data-cosmetic-id={item.id}
                      style={
                        collection
                          ? { "--collection-color": collection.primary }
                          : undefined
                      }
                    >
                      <button
                        className={`shop-art ${styles.art}`}
                        onClick={() => setPreview(item)}
                        aria-label={`Preview ${item.name}`}
                      >
                        <span className={styles.artHalo} />
                        <CosmeticArt item={item} />
                        <span
                          className={styles.rarity}
                          data-rarity={item.rarity}
                        >
                          {item.rarity || "rare"}
                        </span>
                        {isOwned && (
                          <span className={styles.owned}>
                            <Check size={14} />
                            {equipped ? "Equipped" : "Owned"}
                          </span>
                        )}
                        <span className={styles.previewLabel}>
                          <Eye size={16} /> Preview
                        </span>
                      </button>
                      <div className={`shop-info ${styles.info}`}>
                        <span className={styles.itemType}>
                          {categories.find(([id]) => id === item.type)?.[1] ||
                            item.type}
                        </span>
                        <h3>{item.name}</h3>
                        <GameButton
                          variant={isOwned ? "secondary" : "primary"}
                          disabled={busy || isOwned}
                          onClick={() => buy(item)}
                        >
                          {isOwned ? (
                            <>
                              <Check size={18} />
                              Owned
                            </>
                          ) : (
                            <>
                              <Coins size={18} />
                              {pretty(item.price ?? item.cost)} coins
                            </>
                          )}
                        </GameButton>
                      </div>
                    </RarityTile>
                  );
                })}
              </div>
            ) : (
              <GameFrame className={styles.empty}>
                <Search size={32} />
                <h3>
                  {items.length
                    ? "No styles match this search"
                    : "Opening the collection"}
                </h3>
                <p>
                  {items.length
                    ? "Try another name, category or world."
                    : "The cosmetic catalog is loading."}
                </p>
                {items.length > 0 && (
                  <GameButton variant="secondary" onClick={clear}>
                    Show all styles <ArrowRight size={18} />
                  </GameButton>
                )}
              </GameFrame>
            )}
            {filtered.length > limit && (
              <div className={styles.more}>
                <span>
                  Showing {limit} of {filtered.length} styles
                </span>
                <GameButton
                  variant="secondary"
                  onClick={() => setLimit((value) => value + 24)}
                >
                  Show {Math.min(24, filtered.length - limit)} more styles{" "}
                  <ArrowRight size={18} />
                </GameButton>
              </div>
            )}
            <p className={styles.fairplay}>
              <ShieldCheck size={16} />
              Earn coins through daily rewards and genuine completed battles.
            </p>
          </>
        )}
      </div>
      {preview && (
        <CosmeticPreview
          item={preview}
          owned={owned.has(preview.id)}
          busy={busy || equipBusy}
          onPurchase={buy}
          onEquip={equip}
          onClose={() => setPreview(null)}
          user={user}
        />
      )}
      {picker && (
        <Modal
          title={picker === "theme" ? "CHOOSE A WORLD" : "SORT STYLES"}
          onClose={() => setPicker(null)}
        >
          <div className={styles.pickerOptions}>
            {(picker === "theme"
              ? [
                  ["all", "Every world"],
                  ...COSMETIC_THEMES.map((item) => [item.id, item.name]),
                ]
              : sortOptions
            ).map(([id, label]) => (
              <GameButton
                key={id}
                variant={
                  (picker === "theme" ? theme : sort) === id
                    ? "primary"
                    : "secondary"
                }
                onClick={() => {
                  if (picker === "theme") setTheme(id);
                  else setSort(id);
                  setPicker(null);
                }}
              >
                {label}
              </GameButton>
            ))}
          </div>
        </Modal>
      )}
      {reveal && (
        <div
          className={styles.reveal}
          role="region"
          aria-live="polite"
          aria-label="Style unlocked"
        >
          <span className={styles.revealRays} />
          <Box size={34} />
          <strong>STYLE UNLOCKED</strong>
          <CosmeticArt item={reveal} />
          <span>{reveal.name}</span>
          <button
            aria-label="Skip cosmetic reveal"
            onClick={() => setReveal(null)}
          >
            <X size={18} />
          </button>
        </div>
      )}
    </section>
  );
}
