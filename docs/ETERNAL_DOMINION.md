# Eternal Dominion — Sovereign collection

A complete nine-slot premium cosmetic collection. The one-time bundle is **INR 2,499** by default (`249900` paise), independently configurable with `RAZORPAY_DOMINION_PAISE`. It grants no coins, powers, XP or ranked advantage.

| Slot | Included style |
| --- | --- |
| Avatar | Eclipse Dragon Sovereign |
| Board | Eternal Dominion Board |
| X / O marks | Eternal Dominion Sigils |
| Arena | Citadel of Eternity |
| Frame | Eternal Dominion Halo |
| Banner | Eternal Dominion Horizon |
| Arrival effect | Eternal Dominion Arrival |
| Emotes | Crown and Eclipse match signals |
| Title | The Eternal Sovereign |

## Acquisition and activation

All nine canonical `*-collection-dominion` IDs are **real-money only**, sold together as `bundle-dominion`. They cannot be bought with coins or earned through rewards. The catalog's zero coin-price sentinel is not a free offer: the coin endpoint rejects them before database/wallet access, independent of editable catalog prices.

Existing Razorpay order verification, captured-payment fulfillment, idempotent grants and full collection refund/revocation apply. Prices and bundle contents come from the server. Complete ownership disables repurchase; partial ownership keeps the full bundle price with a visible policy.

Run normal migrations/seeding for a new installation (`npm run db:migrate`, `npm run db:seed`). No schema migration is required for this collection. Configure existing `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET` and provider capture/webhooks as described in [COMMERCE.md](COMMERCE.md). Until merchant configuration is complete, the UI shows previews and **Checkout unavailable**. Test fixtures do not constitute a live payment.

## Artwork and motion

Original artwork was generated with the **built-in imagegen tool**. Avatar and crest preserve genuine transparent alpha. Sources, optimized static posters, animated WebP and GIF deliverables are all stored in [public/assets/collection/dominion](../public/assets/collection/dominion/).

Four original sources: `avatar.png`, `arena.png`, `crest.png`, `banner.png`. Each has a `-poster.webp`, looping `.webp` and looping `.gif` counterpart. WebP is used by default; GIF is available in previews. Native SVG ornaments provide the marks and open frame, while CSS applies matching board, banner, emote and title effects.

Rebuild with `node scripts/build-dominion-motion.mjs`. The offline encoder preserves the original art and adds deterministic decorative light, orbital stars and shimmer: **32 frames / 2,880 ms / infinite loop**. [motion-manifest.json](../public/assets/collection/dominion/motion-manifest.json) records dimensions, alpha validation, sampled frame differences and hashes. The in-game Reduced motion setting uses static posters; decorative board effects preserve gameplay state highlights.

## Validation

Validation on 21 October 2026: the production build passed, the full serial Node/MySQL suite passed **301 tests with zero skips**, and **six browser flows** passed (three Dominion flows plus three existing collection/commerce regressions). Browser coverage includes all nine previews, cash-only checkout routing, captured-payment fixture ownership, real API equipment and a 4×4 match, emotes, reduced motion, high contrast and image loading. Provider fixtures are isolated and do not charge real money. Test servers were stopped after validation; production was not changed.

## Exact generation prompts

### Avatar (Transparent cutout)

Use case: stylized-concept. Asset type: premium fantasy strategy game avatar, transparent cutout PNG, square composition. Create an original lavish premium cosmetic portrait for 'Eternal Dominion': the Eclipse Dragon Sovereign, a regal obsidian-black dragon with a sculptural imperial gold crown, exquisite brushed-gold armor filigree and a glowing violet eclipse gemstone, magnificent curved horns. Head and upper chest only, centered symmetrical three-quarter near-frontal portrait. Highly polished collectible game art, painterly 3D material realism, exceptionally beautiful gold edges, deep velvety obsidian, champagne highlights, restrained violet light, sharp readable silhouette at 64px. Regal, powerful, sophisticated, premium quality. Isolated on genuinely transparent background. Full crown and horns within safe margins; no cropping of horns. No scenery, no text, no logos, no watermark, no checkerboard. This is a cosmetic avatar only.

### Arena (Widescreen environment)

Use case: stylized-concept. Asset type: cinematic widescreen premium fantasy strategy game arena background for the Eternal Dominion collection. An impossibly majestic obsidian citadel floating above a velvet violet nebula, architectural imperial gold ribs, a monumental eclipsed sun with a thin luminous golden corona above the central throne platform, distant winged dragon stone statues guarding each side, luxurious polished black marble with fine gold inlays and subtle violet gemstone lighting. Moody, regal, richly detailed high-end fantasy game environment, elegant and coherent with an obsidian-black dragon sovereign with gold crown and violet eclipse gems. Landscape 16:9, strong depth, visually readable central foreground with spacious dark open marble platform where a game board will overlay, dramatic architecture framing rather than obscuring center, controlled warm gold and violet lights. Crisp premium painterly 3D game key art, no characters, no UI, no text, no lettering, no logos, no watermark.

### Crest (Transparent cutout)

Use case: stylized-concept. Asset type: transparent premium fantasy game cosmetic emblem, square cutout. Create the Eternal Dominion imperial eclipse crest: a beautifully sculpted solid black obsidian disk surrounded by a thick, exquisite gold eclipse corona; an elegant five-point imperial crown rises above, two stylized curling dragon wings embrace the sides, an elongated faceted violet amethyst gem hangs below. Lavish high-end collectible game emblem, precious warm gold metal with precise engraved filigree, tiny violet gems, volumetric dramatic edge lighting, strong coherent readable silhouette, sophisticated rather than busy. Centered symmetrical isolated product-like game render on genuinely transparent background, entire emblem fits with 12% empty margins all round. Polished but deep color, black obsidian gold violet palette. No text, no letters, no logos, no watermark, no checkerboard, no scenery.

### Banner (Wide profile artwork)

Use case: stylized-concept. Asset type: very wide fantasy game profile banner background for the luxury Eternal Dominion cosmetic collection. Create an opulent obsidian-black and imperial gold dragon-wing crest design: a sculpted crowned black eclipse medallion with a glowing violet gemstone centered horizontally, gold dragon wings extend symmetrically outwards across a deep black marble background, intricate engraved gold filigree border, subtle violet nebula dust, regal restrained lighting. Ultra-wide 3:1 image, elegant negative space behind overlay player name, richly detailed yet readable at small profile banner size. Coordinated precious-metal collectible fantasy game render, polished gold bevels, amethyst glints, beautiful realistic material depth, sophisticated luxurious imperial style. Keep all ornament inside frame with margin; no letters, no text, no watermark, no UI, no logos.
