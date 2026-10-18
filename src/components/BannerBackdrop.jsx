"use client";

import { cosmeticAsset, cosmeticStyle, cosmeticTheme } from "../lib/cosmetic-collection";
import AnimatedCosmeticImage from "./AnimatedCosmeticImage";

/**
 * An equipped profile banner drawn as a backdrop (profile card, battle panel, versus plate).
 * Collection banners show their own art; the two original banners keep their colour washes.
 * A shade over it keeps names and numbers readable. Renders nothing when no banner is equipped.
 */
export default function BannerBackdrop({ bannerId, className = "" }) {
  if (!bannerId) return null;
  const theme = cosmeticTheme(bannerId);
  const art = theme && cosmeticAsset(bannerId);
  return (
    <span
      className={`banner-backdrop ${theme ? `collection-theme-${theme.id}` : `cosmetic-${bannerId}`} ${className}`}
      style={cosmeticStyle(bannerId)}
      data-banner={bannerId}
      aria-hidden="true"
    >
      {art && <AnimatedCosmeticImage cosmeticId={bannerId} src={art} alt="" loading="lazy" />}
    </span>
  );
}
