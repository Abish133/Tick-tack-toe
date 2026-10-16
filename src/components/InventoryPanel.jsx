"use client";
import { useEffect, useState } from "react";
import {
  Check,
  Sparkles,
  ArrowRight,
  LoaderCircle,
  ShoppingBag,
  Eye,
  Layers3,
} from "lucide-react";
import CosmeticArt from "./CosmeticArt";
import { CosmeticPreview } from "./CosmeticShop";
import { GameFrame, GameButton, RarityTile } from "./ui";
import { cosmeticTheme, cosmeticStyle } from "../lib/cosmetic-collection";
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
const fieldFor = {
  board: "equippedBoard",
  marks: "equippedMark",
  avatar: "avatar",
  effect: "equippedEffect",
  title: "title",
  frame: "equippedFrame",
  banner: "equippedBanner",
  arena: "equippedArena",
  emote: "equippedEmote",
};
export default function InventoryPanel({
  api,
  user,
  refresh,
  onError,
  onNotice,
  navigate,
}) {
  const [inventory, setInventory] = useState([]),
    [loading, setLoading] = useState(true),
    [busy, setBusy] = useState(null),
    [category, setCategory] = useState("all"),
    [preview, setPreview] = useState(null);
  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }
    api("/inventory")
      .then((d) => setInventory(d.inventory || []))
      .catch((e) => onError(e.message))
      .finally(() => setLoading(false));
  }, [user?.id]);
  function equipped(item) {
    return item.type === "title"
      ? user?.profile?.title === item.name
      : user?.profile?.[fieldFor[item.type]] === item.id;
  }
  async function equip(item) {
    setBusy(item.id);
    try {
      await api("/inventory/equip", "POST", { cosmeticId: item.id });
      await refresh();
      onNotice(`${item.name} equipped. Your gameplay rules stay the same.`);
    } catch (e) {
      onError(e.message);
    } finally {
      setBusy(null);
    }
  }
  if (loading)
    return (
      <GameFrame className="loading-state">
        <LoaderCircle className="spin" />
        Opening your collection…
      </GameFrame>
    );
  if (!user)
    return (
      <GameFrame className={styles.empty}>
        <ShoppingBag size={36} />
        <h3>A collection that is yours</h3>
        <p>Create a player to view your owned cosmetics.</p>
      </GameFrame>
    );
  const entries = inventory.filter(
    (entry) =>
      entry.cosmetic &&
      (category === "all" || entry.cosmetic.type === category),
  );
  return (
    <section className={styles.store} aria-label="Owned cosmetic collection">
      <div className={styles.heading}>
        <h2>
          <Layers3 size={22} /> {inventory.length} expressions of you
        </h2>
        <GameButton variant="secondary" onClick={() => navigate("/shop")}>
          Visit shop <ArrowRight size={18} />
        </GameButton>
      </div>
      <div
        className={`collection-inventory-filters ${styles.categories} scroll-row`}
        aria-label="Inventory categories"
      >
        {categories.map(([value, label]) => (
          <button
            key={value}
            className={category === value ? `selected ${styles.selected}` : ""}
            aria-pressed={category === value}
            onClick={() => setCategory(value)}
          >
            {label}
          </button>
        ))}
      </div>
      <div className={styles.catalogScroll}>
        <div className={`shop-grid ${styles.grid}`}>
          {entries.map((entry, i) => {
            const item = entry.cosmetic,
              theme = cosmeticTheme(item.id),
              active = equipped(item);
            return (
              <RarityTile
                as="article"
                rarity={item.rarity || "rare"}
                key={entry.id || item.id}
                className={`shop-card ${styles.card} ${theme ? `collection-owned-card collection-theme-${theme.id}` : `theme-${i % 4}`}`}
                style={{
                  ...cosmeticStyle(item.id),
                  "--collection-color": theme?.primary,
                }}
              >
                <button
                  className={`shop-art cosmetic-${item.id} ${styles.art}`}
                  aria-label={`Preview ${item.name}`}
                  onClick={() => setPreview(item)}
                >
                  <span className={styles.artHalo} />
                  <CosmeticArt item={item} />
                  <span className={styles.rarity} data-rarity={item.rarity}>
                    {item.rarity}
                  </span>
                  <span
                    className={`${styles.ownedCheck} ${active ? styles.equippedCheck : ""}`}
                    title={active ? "Equipped" : "Owned"}
                  >
                    <Check size={14} aria-hidden="true" />
                  </span>
                  <span className={styles.previewLabel} aria-hidden="true">
                    <Eye size={16} />
                  </span>
                </button>
                <div className={`shop-info ${styles.info}`}>
                  <span className={styles.itemType}>{item.type}</span>
                  <h3>{item.name}</h3>
                  {active ? (
                    <GameButton
                      variant="secondary"
                      disabled
                      className="claimed-button"
                    >
                      <Check size={18} />
                      Equipped
                    </GameButton>
                  ) : (
                    <GameButton
                      variant="primary"
                      aria-label="Equip cosmetic"
                      disabled={busy === item.id}
                      onClick={() => equip(item)}
                    >
                      <Sparkles size={18} />
                      Equip
                    </GameButton>
                  )}
                </div>
              </RarityTile>
            );
          })}
        </div>
        {!entries.length && (
          <GameFrame className={styles.empty}>
            <ShoppingBag size={32} />
            <h3>
              No {category === "all" ? "cosmetics" : category + " styles"} yet
            </h3>
            <p>Find your next style in The collection.</p>
            <GameButton variant="secondary" onClick={() => navigate("/shop")}>
              Browse collection <ArrowRight size={18} />
            </GameButton>
          </GameFrame>
        )}
      </div>
      {preview && (
        <CosmeticPreview
          item={preview}
          owned
          busy={busy === preview.id}
          onEquip={equip}
          onClose={() => setPreview(null)}
          user={user}
        />
      )}
    </section>
  );
}
