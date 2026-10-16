"use client";

import { cosmeticTheme } from "../lib/cosmetic-collection";

// Star positions (x%, y%), start delay (s) and size scale: spread so no two flare together.
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

export const isAscendant = (id) => cosmeticTheme(id)?.id === "ascendant";

/**
 * Live Ascendant light over any host: twinkling lens-flare stars, a light that runs
 * around the host's edge, a diagonal shine and a breathing glow. Presentation only;
 * it never takes clicks, and reduced motion or low quality hide it.
 */
export default function AscendantFx({ edge = false, stars = 6, sweep = false, glow = false, className = "" }) {
  return (
    <span className={`asc-fx ${className}`} aria-hidden="true">
      {glow && <span className="asc-fx-glow" />}
      {sweep && <span className="asc-fx-sweep" />}
      {stars > 0 && <span className="asc-fx-dust" />}
      {edge && <span className="asc-fx-edge" />}
      {STARS.slice(0, stars).map(([x, y, delay, size], index) => (
        <span
          key={index}
          className="asc-fx-star"
          style={{ left: `${x}%`, top: `${y}%`, "--asc-delay": `${delay}s`, "--asc-size": size }}
        />
      ))}
    </span>
  );
}
