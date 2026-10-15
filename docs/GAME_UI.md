# Elemental Arena game UI

## Ascendant animated collection

The new [Astral Ascendancy collection](ASCENDANT_COLLECTION.md) adds the Ascendant rarity above Legendary, with nine coordinated cosmetic styles. `AnimatedCosmeticImage` and `CosmeticMotionProvider` preserve the existing image markup while choosing optimized WebP for equipped art, actual GIF for opened artwork previews and static posters for saved or system reduced-motion preferences. System preference changes subscribe through `useSyncExternalStore`; media does not start before hydration. Missing animated media falls back to its still poster.

`cosmeticMotion(id)` keeps GIF/WebP/poster metadata separate from the database catalog fields. New cosmetic ownership and bundle purchases use the existing validation and payment flows. `ascendant-theme.css` contains the new cosmetic ornaments; board marks remain recognizable X/O. Full artwork prompts, animation specifications, pricing and offline encoding instructions are documented with the collection.

## Compact density update — 15 October 2026

The compact pass changes CSS presentation only. On phones the HUD is 58px (previously 66px), the dock is 56px (previously 64px), the battlefield controls are 48px (previously 70px) and the main Battle button is 56px. Guardian artwork is capped at 200px. Cards, portraits, offer banners, tabs, dialogs and internal panel spacing are smaller throughout Armory, Collection, battle, progression, profiles, social screens and training. Desktop framing is slightly tighter too.

Interactive targets retain a 48px minimum and visible text stays at least 12px. Board cells remain usable; measured 6×6 battle cells exceed 50px on both 360px and 390px phones. No page zoom, transform-based screen scaling or gameplay/data changes are used. Smaller artwork and padding create the denser layout.

The production build passed. All nine targeted browser flows passed, including real cosmetic purchases/equipping and all 22 powers, plus an actual 6×6 battle, emotes, drawers and surrender. A separate check covered eight core screens at six viewport sizes (48 combinations) with no body/horizontal overflow, undersized visible text or browser errors. The normal GitHub release gate reruns the full backend and browser suites before automatic deployment. Current compact captures and measurements are in [screenshots/compact-ui](screenshots/compact-ui/README.md) and [compact-ui-verification.json](compact-ui-verification.json).

The compact release `677d00d` subsequently passed the full CI gate: 273 backend/unit tests with no skips, all 19 browser flows, production builds and Linux coordinator takeover. Railway deployed it successfully. A read-only public-site check verified 24 screen/viewport combinations without overflow or page errors and confirmed the expected release with an active coordinator. The Settings capture waits for both dialog and backdrop opacity to reach 1.

The October 2026 presentation refresh turns the existing application into a screen-based game interface. It does not add or rebalance game mechanics. All 22 powers, three equipped slots, 3×3–6×6 rules, ranked matchmaking, rewards, cosmetic ownership and payment validation continue to use the existing engine and services. Food, health, morale, survival events and other examples in the visual references are not game mechanics.

## Screen layout and navigation

`GameShell` owns a `100dvh` grid: a fixed player HUD, a `minmax(0,1fr)` stage and a dock with the five destinations Battle, Armory, Collection, Journey and Social. Active battles use their own opponent/player HUDs in the stage. The stage does not grow the document; grids, tracks, drawers and lists scroll within their own panels. Core destinations retain readable controls at desktop and phone sizes.

The backdrop uses the equipped arena art, with a dark vignette and CSS atmosphere. Existing `/assets/arena.png`, `/assets/arena-aurora.png`, avatar images, the elemental atlas and collection WEBP art are reused. Frames and treasure chests use CSS or small SVGs. No raster frame collection or new artwork download is required.

The HUD exposes the avatar and level progress, trophy and coin resource pills, mailbox, sound and Settings. The resource pills use real session values and announce the full number. Account identity keys prevent an initial account load from pretending to be a currency reward. The dock keeps its full accessible destination names even when inactive phone labels are hidden. Toasts sit above the dock.

Route changes animate inside the shared stage. The large back control, Escape outside an open modal and existing browser/Android back behavior keep navigation reversible. An active battle uses a pause menu and a confirmation before surrender. The Battle dock resumes an active match instead of opening a second battle.

## Shared presentation components

Components live in `src/components/ui/index.jsx`; the individually named files re-export the same implementations. `src/app/game-theme.css` contains the shared typography, gold/element/rarity colors, screen spacing and HUD/dock tokens. Cinzel is the display face, Rajdhani the UI/number face and Inter the small-help face, loaded through `next/font`.

| Component           | Contract and purpose                                                                                                                                      |
| ------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `GameFrame`         | `variant="panel\|card\|banner\|modal\|tooltip"`, `as`, `className`, children and DOM props. Bevelled panel with a dark fill and small corner ornaments.   |
| `GameButton`        | `variant="primary\|secondary\|danger\|ghost\|icon"`, `size`, normal button props. Glossy raised controls, clear disabled state and shared click feedback. |
| `ResourcePill`      | `value`, `icon`, `label`, `onClick`. Compact visible numbers, full accessible values and real-change animation.                                           |
| `IconBadge`         | `icon`, `count` and children. Count badges for attention-bearing controls.                                                                                |
| `ProgressBar`       | `value`, `max`, `label`, `radial`, `size`. Accessible linear bars and circular level/timer rings.                                                         |
| `Tabs`              | `items: [{id,label,icon?}]`, `value`, `onChange`, `label`. Scrollable tab lists with roving keyboard focus.                                               |
| `Modal`             | `title`, `subtitle`, `open`, `onClose`, `closeLabel`, `fullScreen`. Focus-managed game dialogs with Escape and backdrop close.                            |
| `Tooltip`           | `label`, children. Longer help behind an information control.                                                                                             |
| `Toggle` / `Slider` | Labelled switch and slider controls backed by the existing settings values.                                                                               |
| `CustomSelect`      | `label`, `value`, `onChange`, `options: [{value,label}]`. Keyboard-accessible button/listbox replacement for native dropdowns.                            |
| `RarityTile`        | `rarity`, `as`, children and DOM props. Common, rare, epic and legendary frames with ownership or lock overlays supplied by the screen.                   |
| `PowerCard`         | `power`, `equipped`, button props and children. Shared compact card presentation for equipped powers.                                                     |
| `Banner` / `Toast`  | Framed callouts and transient feedback using the same theme.                                                                                              |
| `GameUIProvider`    | Supplies UI feedback through the current synthesized sound preferences.                                                                                   |

Screen-specific layouts remain in their CSS Modules. API calls, prices, ownership checks, request IDs, Razorpay verification and native rewarded-ad verification remain in the original flows; presentation components never grant rewards.

## Screen map

Every route from `src/lib/routes.js` remains available. Admin remains functional and outside the visual redesign scope.

| Route or state                                                                | Game presentation and access                                                                                                                                                                                                                                                                                    |
| ----------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/` title/boot                                                                | Existing illustrated entrance, loading progress, tips, New game, Continue and Settings.                                                                                                                                                                                                                         |
| `/` hub                                                                       | Equipped guardian, rank plate, event tiles, three-card loadout fan, battlefield segments and large BATTLE control.                                                                                                                                                                                              |
| Mode select                                                                   | Full-screen illustrated carousel from Select battle mode; Ranked, Practice, private challenge, Classic, Quick Match, local/offline, Daily Puzzle, Tutorial, Tournaments and Spectate. Practice keeps the existing difficulty choices.                                                                           |
| Matchmaking / VS                                                              | Full-screen search, elapsed timer, rune animation, Cancel and ranked bot disclosure; matched-player entrance before the existing battle.                                                                                                                                                                        |
| `/battle`, `/watch/:id`                                                       | Opponent/player nameplates, energy orbs, active-turn ring, board pedestal, card hotbar, targeting controls and effect callouts. Pause, emotes, intel and timeline use modals/drawers.                                                                                                                           |
| Match result                                                                  | Victory/Defeat/Draw banner, actual trophies/coins/XP/progress and the existing replay, rematch, play-again and home actions.                                                                                                                                                                                    |
| `/powers`                                                                     | Deck and Power Lab tabs. Three equipped slots support desktop drop and touch swap; role-icon filters and search sit above an inner card grid. INSPECT opens complete rules/counterplay plus EQUIP and TRY IN POWER LAB. Lab uses the existing real training engine with a custom power picker.                  |
| `/shop`                                                                       | Featured shows illustrated collections and the earned-coin style grid. Category tabs cover avatars, boards, marks, arenas, frames, banners, effects, emotes and titles. Collections shows the ten existing cash bundles; Coins shows tiered treasure chests and the cosmetic pass. Theme/sort use game pickers. |
| `/inventory`                                                                  | Owned rarity tiles, category tabs, live cosmetic preview and original equip requests. Owned and equipped stamps reflect server state.                                                                                                                                                                           |
| `/season-pass`                                                                | Horizontal free/premium reward track, current progress, claim controls and existing premium unlock.                                                                                                                                                                                                             |
| `/missions`, `/achievements`, `/notifications`                                | Quest panels and progress bars, earned badge wall and mailbox cards through Journey or the HUD.                                                                                                                                                                                                                 |
| `/leaderboard`                                                                | Top-three podium, banner rows, segmented ranking controls and the player's highlighted ranking.                                                                                                                                                                                                                 |
| `/friends`, `/profile`, `/players/:id`                                        | Friend/player cards, online state, challenge/spectate actions, profile banner/avatar/title, stats and cosmetics.                                                                                                                                                                                                |
| `/history`, `/replay/:id`                                                     | Battle-log cards and the existing replay board, timeline and playback controls.                                                                                                                                                                                                                                 |
| `/daily-puzzle`, `/tournaments`, `/tournaments/:id`                           | Existing puzzle/tournament services in event panels; reachable through mode select and Journey.                                                                                                                                                                                                                 |
| `/local-play`, `/tutorial`                                                    | Same-device/offline board controls and the existing learning steps. Saved local progress remains resumable.                                                                                                                                                                                                     |
| `/settings`                                                                   | Centered modal with Audio, Graphics/Motion, Gameplay, Account, Privacy and About tabs. Privacy, Terms and Rules live in About/Privacy instead of a footer.                                                                                                                                                      |
| `/login`, `/register`, `/forgot-password`, `/reset-password`, `/verify-email` | Framed account dialogs over the arena, preserving authentication and recovery behavior.                                                                                                                                                                                                                         |
| `/rules`, `/privacy`, `/terms`                                                | Reachable reference panels through Settings.                                                                                                                                                                                                                                                                    |
| `/invite/:code`                                                               | Existing invitation resolution and private-room joining flow.                                                                                                                                                                                                                                                   |
| `/admin`                                                                      | Existing administration interface, unchanged in scope.                                                                                                                                                                                                                                                          |

## Accessibility and feedback

Core controls target at least 48px, with a minimum 12px phone text size and clear focus outlines. Action names, roles and existing test IDs are retained where possible; tests using replaced visual controls now exercise the corresponding tab, picker or pause menu. Modal focus stays inside the open dialog and returns to its trigger when closed. Tab controls support keyboard navigation; sliders and switches retain their accessible names.

The existing sound toggle, volume, quality, reduced-motion and high-contrast settings remain authoritative. UI taps use the synthesized sound path and brief supported-device haptics. Power casts, timer warnings and battle results use their existing sound settings. Reduced motion removes shakes, drift and particles while allowing short fades. High contrast strengthens dark fills, text and focus/border distinction.

Reward reveals are cosmetic feedback only. An earned-coin style reveal follows confirmed ownership after an initiated purchase; a cash treasure reveal follows successful server payment verification. They do not fire merely because an account or inventory loaded. Reveal feedback is short, skippable and does not block the dock. Unconfigured Razorpay checkout stays disabled and visibly locked. No invented discount, sale deadline or cash-provider availability is shown.

## Board rules — preserved

3×3 keeps first-line wins and the existing round rules. 4×4, 5×5 and 6×6 use one scored board. Each contiguous horizontal, vertical or diagonal run of three real marks counts as one point. Overlapping runs count: four marks in a row contain two triplets. Scores reflect the current board; moving or removing marks can change the score. Phantom illusions do not score. When the board fills, the higher score wins and equal scores draw. Existing timeout, surrender and stalemate protection continue to apply. Larger boards have proportionate thinking banks of 240, 360 and 480 seconds; turns remain 20 seconds.

Board size is selectable for online queues, practice and private rooms, and separately for same-device play. Matchmaking pairs identical board sizes and rulesets. Snapshots, reconnects and replays retain the chosen size; old saved games remain 3×3.

## Ranked fallback — preserved

The Ranked selection and queue retain the requested disclosure:

> If no real world players are found you'll play against a competitive bot

The queue searches human opponents first, then offers a competitive bot after 25 seconds. Difficulty is Hard below 450 trophies, Expert from 450, Extreme from 1,400 and Nightmare from 2,500. Bot names, opponent labels, snapshots and results identify the bot explicitly. No fake human account or leaderboard entry is created. Ranked cups use the existing rating formula against the disclosed opponent rating; existing AI coin, XP and human-only mission rules remain in effect.

## Screenshots and validation

The refreshed screenshot set lives in `docs/screenshots/game-ui/`, with `-desktop` (1440×900) and `-mobile` (390×844) pairs for title, hub, mode select, matchmaking/VS, 3×3 and 6×6 battles, targeting, victory/defeat, armory, shop, item preview, season track, leaderboard, profile and Settings. Additional 360×740 and 1280×720 checks cover smaller phones and laptops. Images should be captured after entry transitions settle and visible art loads.

Release acceptance includes `npm test`, `npm run test:e2e`, the production build, no body scroll/overlap on core screens, accessible controls, and Lighthouse accessibility of at least 90 on the hub and battle. Measured results belong in the release verification record; this document does not substitute a target for an actual test or audit result.

## Release pipeline

Pushes to `main` run the existing GitHub release gate: pure tests/build, isolated MySQL tests, Linux container startup/coordinator takeover and browser gameplay flows. Railway follows `main` automatically with Wait for CI enabled. The presentation changes require no database migration, reset or provider-key change.

### Measured accessibility snapshots

On 14 October 2026, Lighthouse 13.5.0 user-flow snapshots measured the actual entered hub and a real guest Practice match. The accessibility category used explicit desktop and phone viewport sizes with screen emulation disabled; API responses were not mocked. Snapshot mode audits the current UI state rather than reloading the title screen. See the [Lighthouse user-flow documentation](https://github.com/GoogleChrome/lighthouse/blob/main/docs/user-flows.md#snapshot).

| Screen        | 1440×900 | 390×844 | Reports                                             |
| ------------- | -------- | ------- | --------------------------------------------------- |
| Entered hub   | 100      | 100     | `lighthouse-hub-{desktop,mobile}.json` / `.html`    |
| Active battle | 100      | 100     | `lighthouse-battle-{desktop,mobile}.json` / `.html` |

These scores meet the requested accessibility threshold of 90. The reports retain unweighted visible-label/accessibility-name recommendations where the original accessible control names remain for compatibility. The battle gem/score labels now have valid ARIA group semantics. `lighthouse-summary.json` records the measured viewports, scores, method and remaining guidance; the unsuffixed hub/battle report files use the phone snapshot.

Final Armory, Shop and Item Preview captures at both requested sizes have no body or horizontal overflow and no browser page errors. The Power Lab board also fits its inner scroller at 390×844, 360×740, 1280×720 and 1440×900; the smallest measured cells are 50.33×50.33px. Boards adapt to their panel height without changing targets or training rules.

The final local production build passed, all 273 unit/backend tests passed with no skips, and all 19 browser flows passed in 10.3 minutes against an isolated MySQL database. The browser suite covers human ranked matches, all 22 powers, purchases/equipping, the premium reward track, reconnects, private scored boards, competitive ranked bots, invitations/spectating, offline saves, tutorials and compact viewport/modal behavior. `tests/game-screen-ui.spec.js` adds the four required viewport checks and nested-dialog/Settings navigation coverage. Actual local 6×6 cells are at least 48px at all four required sizes, including 1280×720 and 360×740.

Title, hub, matchmaking, battles, targeting, results, Armory, storefront and training captures use the real UI and existing engine/services. Rich Season, Leaderboard, Profile and Social captures include read-only visual fixtures to show populated layouts; these fixtures are not production player data and grant no rewards. The [screenshot index](screenshots/game-ui/README.md) identifies the required desktop/phone pairs. [game-ui-redesign-verification.json](game-ui-redesign-verification.json) records local verification; GitHub CI performs a fresh release gate before Railway makes the pushed commit live.
