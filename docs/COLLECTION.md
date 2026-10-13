# The cosmetic collection

The expanded catalog has **108 cosmetics**: 103 styles in the coin shop and five exclusive season-pass rewards. Ten new themed collections add **90 styles**. Every new style is available individually with earned cosmetic coins; a complete nine-style collection is also listed for Razorpay checkout at **₹149** by default.

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

The server variable `RAZORPAY_COLLECTION_PAISE=14900` controls the full-collection price for all ten worlds. Cash checkout requires a registered player account and Razorpay merchant keys configured by the operator. See [COMMERCE.md](COMMERCE.md) for activation and refund rules. A partly owned collection uses the full displayed price; owned styles are retained without duplicate compensation. A fully owned collection cannot be purchased again.

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

Shop previews show the themed artwork and coordinated styles. Owned styles equip from Inventory or the profile editor. Equipped avatars, frames, banners and titles personalize player identity; arenas, boards and marks appear in battles; arrival effects and signals provide visual expression. The 20 new signals require both the matching equipped emote pack and owned inventory. Six base signals remain free.

## Artwork files

Twenty original images were generated with the built-in image generation tool: ten transparent avatar cutouts and ten opaque arena backgrounds. Optimized WebP files are included in `public/assets/collection/` and served at `/assets/collection/`. Avatar alpha transparency is preserved. Boards and banners reuse their themed arena artwork, while frames, marks, arrival effects, signal icons and titles use coordinated code-rendered treatments.

The original PNGs are maintained locally in `artwork/collection/`, which is ignored by Git to keep deployment downloads small. Exact prompts, source names, dimensions, alpha measurements and optimized asset hashes are recorded in [collection-art-prompts.json](collection-art-prompts.json).
