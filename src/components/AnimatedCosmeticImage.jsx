"use client";

import { createContext, useContext, useEffect, useState, useSyncExternalStore } from "react";
import { cosmeticAsset, cosmeticMotion } from "../lib/cosmetic-collection";

const MotionPreference = createContext(false);
let motionQuery;
function mediaQuery() {
  return typeof window === "undefined" ? null : (motionQuery ||= window.matchMedia("(prefers-reduced-motion: reduce)"));
}
function subscribeMotion(listener) {
  const query = mediaQuery();
  query?.addEventListener("change", listener);
  return () => query?.removeEventListener("change", listener);
}
const reducedMotionSnapshot = () => mediaQuery()?.matches || false;

export function CosmeticMotionProvider({ reducedMotion = false, children }) {
  return <MotionPreference.Provider value={reducedMotion}>{children}</MotionPreference.Provider>;
}

export function useCosmeticAnimation(cosmeticId, fallback, format = "webp") {
  const preference = useContext(MotionPreference);
  const system = useSyncExternalStore(subscribeMotion, reducedMotionSnapshot, () => false);
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);
  const art = cosmeticMotion(cosmeticId);
  const still = art?.posterAsset || fallback || cosmeticAsset(cosmeticId);
  return {
    src: art && ready && !preference && !system ? (format === "gif" ? art.animatedAsset : art.motionAsset) : still,
    poster: still,
    gif: art?.animatedAsset,
    animated: Boolean(art && ready && !preference && !system),
  };
}

/** Actual looping media, with static art for system or in-game reduced motion. */
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
