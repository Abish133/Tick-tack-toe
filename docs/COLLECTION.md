# The cosmetic collection

The expanded catalog has **126 cosmetics**: 112 coin-eligible styles, nine real-money-only Eternal Dominion styles, and five exclusive season-pass rewards. The ten original themed collections and Astral Ascendancy are available individually with earned coins or as matching cash collections. Eternal Dominion is sold only as its complete nine-slot set through Razorpay.

Each collection contains an avatar, board, X/O mark set, arena background, frame, banner, arrival effect, two-signal emote pack and title. Cosmetic ownership does not change combat powers, cups, energy or turn limits.

| Collection | Transparent avatar | Arena background | Full collection |
| --- | --- | --- | --- |
| Solar Dynasty | Sunfire Phoenix | Palace of the Sun | ₹149 |
| Abyssal Crown | Abyssal Sentinel | Leviathan Throne | ₹149 |
| Jade Sanctuary | Verdant Guardian | Temple of the Wild | ₹149 |
| Storm Circuit | Volt Ronin | Thunder District | ₹149 |
| Rose Eclipse | Thorn Empress | Crimson Moon Garden | ₹149 |
| Clockwork Citadel | Brass Lion | Celestial Observatory | ₹149 |
| Lunar Lotus | Moonlit Kitsune | Lotus Moonlake | ₹149 |
| Emberglass Forge | Obsidian Drake | Emberglass Foundry | ₹149 |
| Arctic Prism | Prism Owl | Frozen Sky Cathedral | ₹149 |
| Nebula Voyager | Starborn Voyager | Nebula Spaceport | ₹149 |
| Astral Ascendancy | Astral Sovereign | Empyrean Throne | ₹499 |
| Eternal Dominion · Sovereign | Eclipse Dragon Sovereign | Citadel of Eternity | ₹2,499 · real-money only |

The server variable `RAZORPAY_COLLECTION_PAISE=14900` controls the full-collection price for all ten worlds. Cash checkout requires a registered player account and Razorpay merchant keys configured by the operator. See [COMMERCE.md](COMMERCE.md) for activation and refund rules. A partly owned collection uses the full displayed price; owned styles are retained without duplicate compensation. A fully owned collection cannot be purchased again.

`RAZORPAY_ASCENDANT_PAISE=49900` controls Astral Ascendancy independently. `RAZORPAY_DOMINION_PAISE=249900` controls Eternal Dominion independently. All values are integer INR paise, validated on the server.

## Eternal Dominion

The Sovereign set coordinates obsidian dragon artwork, imperial gold and violet light across every cosmetic slot:

| Slot | Included style |
| --- | --- |
| Avatar | Eclipse Dragon Sovereign |
| Board | Eternal Dominion Board |
| X/O marks | Eternal Dominion Sigils |
| Arena | Citadel of Eternity |
| Frame | Eternal Dominion Halo |
| Banner | Eternal Dominion Horizon |
| Arrival effect | Eternal Dominion Arrival |
| Emote pack | Eternal Dominion Signals · Crown and Eclipse |
| Title | The Eternal Sovereign |

The set is available only through the `bundle-dominion` real-money purchase. No individual style can be bought with coins or obtained from reward tracks or ads. Every slot can be previewed before purchase and equipped from owned inventory after captured payment. Motion artwork has static poster fallbacks for reduced motion. Premium artwork lives in `public/assets/collection/dominion/`.

## Original individual coin prices

| Individual style | Earned coins |
| --- | --- |
| Avatar | 500 |
| Board | 450 |
| X/O marks | 350 |
| Arena | 750 |
| Frame | 400 |
| Banner | 350 |
| Arrival effect | 500 |
| Two-signal emote pack | 250 |
| Title | 200 |

Shop previews show the themed artwork and coordinated styles. Owned styles equip from Inventory or the profile editor. Equipped avatars, frames, banners and titles personalize player identity; arenas, boards and marks appear in battles; arrival effects and signals provide visual expression. Collection signals require both the matching equipped emote pack and owned inventory. Six base signals remain free.

## Artwork files

Twenty original images were generated with the built-in image generation tool: ten transparent avatar cutouts and ten opaque arena backgrounds. Optimized WebP files are included in `public/assets/collection/` and served at `/assets/collection/`. Avatar alpha transparency is preserved. Boards and banners reuse their themed arena artwork, while frames, marks, arrival effects, signal icons and titles use coordinated code-rendered treatments.

The original PNGs are maintained locally in `artwork/collection/`, which is ignored by Git to keep deployment downloads small. Exact prompts, source names, dimensions, alpha measurements and optimized asset hashes are recorded in [collection-art-prompts.json](collection-art-prompts.json).
