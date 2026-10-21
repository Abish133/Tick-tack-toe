"use client";

import { useRef } from "react";
import { Crown, ShieldCheck, Sparkles, Swords } from "lucide-react";
import AnimatedCosmeticImage from "./AnimatedCosmeticImage";
import CosmeticArt from "./CosmeticArt";
import { cosmeticById } from "../lib/cosmetic-collection";
import styles from "./SovereignShowcase.module.css";

/**
 * Eternal Dominion's stage: animated citadel, gilded title, the dragon inside an
 * eclipse, the price and one crown button. The shop's featured offer and the premium
 * set page both open with it, so the set reads the same wherever players meet it.
 */
export default function SovereignShowcase({
  as: Tag = "section",
  heading: Heading = "h2",
  tagline,
  price,
  priceLabel = "COMPLETE SET",
  priceNote,
  action,
  className = "",
  ...props
}) {
  const avatar = cosmeticById("avatar-collection-dominion");
  const root = useRef(null);
  // The dragon turns toward the pointer: a tilt that follows the player, never an idle sweep.
  function tilt(event) {
    const element = root.current;
    if (!element || event.pointerType === "touch" || element.closest(".reduce-motion")) return;
    const box = element.getBoundingClientRect();
    element.style.setProperty("--tilt-x", ((event.clientX - box.left) / box.width - 0.5).toFixed(3));
    element.style.setProperty("--tilt-y", ((event.clientY - box.top) / box.height - 0.5).toFixed(3));
  }
  function settle() {
    root.current?.style.setProperty("--tilt-x", "0");
    root.current?.style.setProperty("--tilt-y", "0");
  }
  return (
    <Tag
      ref={root}
      className={`${styles.root} ${className}`}
      onPointerMove={tilt}
      onPointerLeave={settle}
      {...props}
    >
      <AnimatedCosmeticImage
        className={styles.backdrop}
        cosmeticId="arena-collection-dominion"
        src="/assets/collection/dominion/arena-poster.webp"
        alt=""
      />
      <span className={styles.shade} aria-hidden="true" />
      <span className={styles.motes} aria-hidden="true">
        {Array.from({ length: 9 }, (_, index) => <i key={index} />)}
      </span>
      <div className={styles.copy}>
        <span className={styles.seal}>
          <Crown size={14} aria-hidden="true" />
          SOVEREIGN · ULTRA PREMIUM
        </span>
        <Heading className={styles.title}>
          Eternal <span>Dominion</span>
        </Heading>
        {tagline && <p className={styles.tagline}>{tagline}</p>}
        <ul className={styles.perks}>
          <li><Swords size={13} aria-hidden="true" /> Sovereign Strike</li>
          <li><Crown size={13} aria-hidden="true" /> Eclipse Victory</li>
          <li><Sparkles size={13} aria-hidden="true" /> Royal Entrance</li>
          <li><ShieldCheck size={13} aria-hidden="true" /> Real money only</li>
        </ul>
        <div className={styles.buy}>
          <span className={styles.price}>
            <small>{priceLabel}</small>
            <strong>{price}</strong>
            {priceNote && <em>{priceNote}</em>}
          </span>
          {action}
        </div>
      </div>
      <div className={styles.art} aria-hidden="true">
        <span className={styles.eclipse} />
        <span className={styles.orbit} />
        {avatar && <CosmeticArt item={avatar} />}
      </div>
    </Tag>
  );
}
