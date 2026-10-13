# Generated artwork

Project assets are copied into `public/assets` so this game does not depend on the Codex image cache.

The October collection expansion adds 20 separately generated assets: ten transparent avatars and ten arena backgrounds. Their optimized WebP files are in `public/assets/collection/`; original PNGs remain locally in `artwork/collection/`. The built-in imagegen tool created every new raster image. Avatar alpha was verified before and after optimization. Exact prompts, dimensions, file locations and hashes are recorded in [collection-art-prompts.json](collection-art-prompts.json), and [COLLECTION.md](COLLECTION.md) describes how the artwork appears in the shop and equipped game styles.

| Asset | Dimensions | Use | Source |
| --- | --- | --- | --- |
| `arena.png` | 1672 × 941 | Cinematic elemental arena background | `exec-e10dafb5-8f31-4409-aba4-5401459a12ab.png` |
| `elements.png` | 1536 × 1024 | Six-cell artwork sheet: flame, ice crystal, wind, X, O, rank crest | `exec-5eede4a1-4dbc-4ad7-97a7-b6e569051813.png` |
| `avatar-void.png` | 1254 × 1254 | Void Warden profile portrait, genuine alpha cutout | `exec-89326453-fdaa-45f3-9cf4-7ceeca1df1da.png` |
| `avatar-fire.png` | 1254 × 1254 | Ember Sovereign profile portrait, genuine alpha cutout | `exec-cb11ff67-89cc-4446-a263-c9660788b8b2.png` |
| `avatar-ice.png` | 1254 × 1254 | Frost Oracle profile portrait, genuine alpha cutout | `exec-991c0fe8-9e56-4cff-851f-e6b5f53f76cf.png` |

The arena and atlas were generated with the built-in image generation tool for this project in the Codex session. The creative brief requested a stylish, modern, premium elemental battle game, a cinematic arena background, coordinated power and rank artwork, and transparent game symbols. Those original generated files are under the session's `generated_images/01a11acb-91fa-7762-aab1-0ef5ab8ce06c` cache. Exact original tool prompts were not included in the available artifact metadata; this is a summary of the user brief, not a verbatim prompt record.

The atlas is a 3-column by 2-row layout with 512 × 512 cells. CSS can display one cell using `background-size: 300% 200%` and a matching `background-position`. The background image is opaque RGB. The atlas contains an RGBA alpha channel; inspection found a faint residual alpha in background pixels (for example, 12/255 at the top left, 29/255 inside the O) and 252/255 at sampled solid artwork pixels. It is not a perfectly clean alpha cutout. Preserve the original PNG alpha; no programmatic background removal has been applied.

Any additional generated variants should be saved in this directory and documented here with their source filename, dimensions, prompt brief, and intended placement.

The three character portraits were generated as separate assets with `transparent_background: true`, with fully transparent corner pixels confirmed by direct inspection. Their exact prompts and original filenames are recorded in [AVATAR-PROMPTS.md](AVATAR-PROMPTS.md). The original PNGs were copied into the project and their generated alpha was preserved. No programmatic background removal was used.


## Aurora Nexus arena

`public/assets/arena-aurora.png` was generated with the built-in image generation tool and copied into this project. It is a 16:9 opaque cosmetic arena background, used in live preview and the equipped game environment.

Prompt: Create a premium wide landscape background art asset for an original 3x3 strategy game, Tic Tac Toe Elemental Arena, cosmetic theme named Aurora Nexus. Stylized cinematic 3D fantasy environment, midnight indigo and luminous teal aurora ribbons, ancient floating obsidian platforms at far left and right, translucent crystal spires, delicate lavender magical constellations, polished reflective stone foreground, soft volumetric atmosphere. Keep the central 55 percent calm, dark and uncluttered so a bright readable tic tac toe board and player UI will be overlaid by code. Beautiful modern high-end mobile game quality, refined rather than noisy, crisp textures and restrained glow. Wide 16:9 composition. No people, no letters, no numbers, no logos, no interface, no pre-rendered tic tac toe grid or symbols. This is a full opaque background, not a mockup.
