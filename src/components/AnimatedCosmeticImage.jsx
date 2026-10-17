"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { cosmeticAsset, cosmeticMotion } from "../lib/cosmetic-collection";

const MotionPreference = createContext(false);
/** The in-game Reduced motion setting, the one switch for all game motion. */
export const useGameReducedMotion = () => useContext(MotionPreference);

export function CosmeticMotionProvider({ reducedMotion = false, children }) {
  return <MotionPreference.Provider value={reducedMotion}>{children}</MotionPreference.Provider>;
}

export function useCosmeticAnimation(cosmeticId, fallback, format = "webp") {
  const preference = useContext(MotionPreference);
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);
  const art = cosmeticMotion(cosmeticId);
  const still = art?.posterAsset || fallback || cosmeticAsset(cosmeticId);
  return {
    src: art && ready && !preference ? (format === "gif" ? art.animatedAsset : art.motionAsset) : still,
    poster: still,
    gif: art?.animatedAsset,
    animated: Boolean(art && ready && !preference),
  };
}

/** Actual looping media, with static art when in-game Reduced motion is on. */
export default function AnimatedCosmeticImage({ cosmeticId, src, format = "webp", alt = "", onError, ...props }) {
  const art = useCosmeticAnimation(cosmeticId, src, format);
  const [failedSource, setFailedSource] = useState(null);
  const failed = failedSource === art.src;
  return (
    <img
      {...props}
      src={failed ? art.poster : art.src}
      alt={alt}
      data-cosmetic-motion={art.gif ? (art.animated && !failed ? "animated" : "still") : undefined}
      data-cosmetic-gif={art.gif}
      onError={(event) => {
        if (!failed && art.src !== art.poster) setFailedSource(art.src);
        else onError?.(event);
      }}
    />
  );
}
