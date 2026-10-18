"use client";

import { useEffect, useRef } from "react";
import { cosmeticTheme } from "../lib/cosmetic-collection";

// Particle positions (x%, y%), start delay (s) and size scale: spread so no two flare together.
const STARS = [
  [14, 18, 0, 1],
  [84, 14, 0.7, 0.8],
  [91, 60, 1.4, 1],
  [16, 76, 2.1, 0.75],
  [52, 7, 2.8, 0.65],
  [66, 90, 1.05, 0.9],
  [30, 44, 1.75, 0.55],
  [74, 38, 2.45, 0.7],
  [42, 82, 0.35, 0.6],
  [6, 46, 3.1, 0.7],
];

// How each collection's light moves: stars twinkle, embers and bubbles rise,
// petals, leaves and snow drift down, storm sparks flicker.
const MOTION = {
  ascendant: "twinkle",
  solar: "twinkle",
  clockwork: "twinkle",
  lunar: "twinkle",
  nebula: "twinkle",
  storm: "flicker",
  abyss: "rise",
  emberglass: "rise",
  jade: "fall",
  rose: "fall",
  arctic: "fall",
};

export const isAscendant = (id) => cosmeticTheme(id)?.id === "ascendant";
/** The collection theme id of an equipped cosmetic, or null for plain styles. */
export const fxTheme = (id) => cosmeticTheme(id)?.id || null;

/**
 * Live collection light over any host: particles in the collection's colours, a light
 * that runs around the host's edge and a breathing glow. Ascendant
 * gets the full show; other collections a lighter one. Presentation only; it never
 * takes clicks, and in-game reduced motion or low quality hide it.
 */
export default function AscendantFx({
  theme = "ascendant",
  edge = false,
  stars = 6,
  glow = false,
  className = "",
}) {
  const ref = useRef(null);
  // Off-screen effects (most shop cards) pause, so only what the player sees costs frames.
  useEffect(() => {
    const node = ref.current;
    if (!node || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(
      ([entry]) => node.toggleAttribute("data-offscreen", !entry.isIntersecting),
      { rootMargin: "80px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);
  const info = cosmeticTheme(`avatar-collection-${theme}`);
  const full = theme === "ascendant";
  const count = full ? stars : Math.min(stars, 6);
  return (
    <span
      ref={ref}
      className={`asc-fx ${full ? "" : "asc-fx-lite"} ${className}`}
      data-fx-motion={MOTION[theme] || "twinkle"}
      style={
        info && !full
          ? { "--fx-a": info.primary, "--fx-b": info.secondary }
          : undefined
      }
      aria-hidden="true"
    >
      {glow && <span className="asc-fx-glow" />}
      {count > 0 && full && <span className="asc-fx-dust" />}
      {edge && <span className="asc-fx-edge" />}
      {STARS.slice(0, count).map(([x, y, delay, size], index) => (
        <span
          key={index}
          className="asc-fx-star"
          style={{ left: `${x}%`, top: `${y}%`, "--asc-delay": `${delay}s`, "--asc-size": size }}
        />
      ))}
    </span>
  );
}
