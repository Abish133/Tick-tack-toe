# Astral Ascendancy

Ascendant is the new cosmetic rarity above the existing Legendary catalog. Nine matching styles share pearl-gold, iridescent cyan and opal starlight: Astral Sovereign avatar, Empyrean Throne arena, board, X/O sigils, halo frame, banner, arrival effect, two signals and Beyond the Stars title. No power, timer, matchmaking or scoring rule changes.

## Media and animation

Original artwork was generated with the built-in imagegen tool. Avatar and frame use genuine transparency. Project assets live in `public/assets/collection/ascendant/`:

| Artwork | Actual GIF | Optimized animated WebP | Still preview |
| --- | --- | --- | --- |
| Guardian | `avatar.gif` | `avatar.webp` | `avatar-poster.webp` |
| Arena | `arena.gif` | `arena.webp` | `arena-poster.webp` |
| Halo | `crest.gif` | `crest.webp` | `crest-poster.webp` |

Each loop has 40 distinct source frames over 2.4 seconds, repeats indefinitely and uses localized orbiting starlight and glow over the unchanged generated illustration. Storefronts and equipped portraits use optimized WebP; opened artwork previews use real GIFs. `AnimatedCosmeticImage` switches to still posters for the saved in-game reduced-motion setting or the system setting, including changes while the page is open. Legacy cosmetics retain their original assets.

The reproducible offline encoder is `scripts/build-ascendant-motion.mjs`, using the project's existing Sharp dependency. Run `node scripts/build-ascendant-motion.mjs`. It records dimensions, transparency, duration, unique decoded samples, file sizes and SHA-256 hashes in `public/assets/collection/ascendant/motion-manifest.json`. Sources are preserved. Larger GIFs load on demand in previews.

## Ownership and pricing

Items use the existing server-validated coin purchase and equip flow. The matching nine-style bundle defaults to ₹499 and can be configured in paise using `RAZORPAY_ASCENDANT_PAISE=49900`. Other collection prices and existing ownership are preserved. Razorpay availability, capture verification, duplicate-payment protection and entitlement rules remain in the existing integration; the artwork never grants ownership.

## Generation prompts

Built-in imagegen was used for these three project-bound master images, followed by deterministic Node/Sharp animation encoding.

**Avatar — transparent output**

Use case: stylized-concept. Asset type: transparent premium strategy-game guardian avatar. Create a breathtaking, highly polished 3D fantasy guardian called Astral Sovereign for Elemental Arena, a cosmetic tier ABOVE Legendary. Distinctive pearl-white porcelain armor with finely engraved champagne-gold metal, luminous opal cyan and violet accents, a bright crystalline star core in the chest, a regal floating segmented crown and symmetrical swept celestial shoulder wings. Refined powerful silhouette, graceful upright shoulders-and-torso portrait with the complete crown, shoulders and halo visible inside a square canvas; center face looking directly at viewer, calm commanding expression, no weapon across face. Dramatic studio rim light, exquisitely detailed materials, attractive premium collectible-game art, crisp at small mobile-avatar sizes. Genuine transparent alpha background; no floor, no scenery, no opaque black rectangular backdrop. Keep margin around every edge, do not crop crown/wings. No text, no letters, no watermark, no UI. The artwork will receive subtle orbital starlight animation later, so clearly separate subject silhouette from empty transparent surroundings.

**Arena — opaque output**

Use case: stylized-concept. Asset type: premium game arena background illustration, wide landscape 16:9 composition. Create the Empyrean Throne, an extraordinarily beautiful celestial arena above every legendary realm: an obsidian and pearl circular dueling dais with delicate luminous gold inlays suspended above an ocean of deep navy cosmic clouds, monumental ivory-gold cathedral spires and three huge fractured orbital halos around a distant blazing opal star. Tasteful iridescent cyan, soft rose and violet nebula streams, tiny stars and floating crystalline fragments. Visually rich luxurious high-end 3D strategy game concept art, beautiful painterly realism, extremely polished, readable silhouette and atmospheric depth. Foreground dueling dais in lower third, open calm darker middle for game UI readability, brighter architectural spectacle toward top and edges. Fill the entire landscape canvas with the environment. No characters, no grid, no X/O symbols, no text or logos or watermarks, no UI borders.

**Crest — transparent output**

Use case: stylized-concept. Asset type: transparent premium animated-avatar frame master artwork. An exceptionally elegant and luxurious celestial coronet RING, champagne-gold and pearl-white filigree metal with opal cyan crystal shards, sculpted luminous gold wings at upper left and upper right, tiny diamond star crown at top, a single brilliant opal star pendant at bottom. Symmetrical circular frame facing straight toward the viewer, clean open circular center for an avatar face, transparent background BOTH outside the ring AND inside the central opening. The central empty opening should occupy about 62 percent of the canvas width; thin refined ring body, outer wings and ornaments occupy the remaining margin. Very high polish premium 3D strategy-game collectible, crisp reflective engraved surfaces, soft iridescent light, beautiful small jewel details. Square composition, all frame ornaments contained with generous empty margin; no cropping, no filled medallion, no character portrait, no letters, no text, no watermark, no UI.
