"use client";

import { COSMETIC_THEMES } from "../lib/cosmetic-collection";

/** An equipped title as a small themed tag, so opponents see it in battle too. */
export default function PlayerTitle({ title, className = "" }) {
  if (!title) return null;
  const theme = COSMETIC_THEMES.find((item) => item.title === title);
  return (
    <span
      className={`player-title-tag ${theme ? "collection-profile-title" : ""} ${className}`}
      data-cosmetic-theme={theme?.id}
      title={title}
    >
      {title}
    </span>
  );
}
