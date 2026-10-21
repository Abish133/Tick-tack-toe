# Eternal Dominion premium collection captures

Captured on 21 October 2026 from the local production build at `http://localhost:3100`. These views use the actual generated Dominion artwork and normal motion. A still screenshot records one frame of the looping media.

| View | 360 × 740 | 390 × 844 | 1440 × 900 |
| --- | --- | --- | --- |
| Nine-style catalog | [Phone](catalog-360x740.png) | [Phone](catalog-390x844.png) | [Desktop](catalog-1440x900.png) |
| Premium collection | [Phone](premium-360x740.png) | [Phone](premium-390x844.png) | [Desktop](premium-1440x900.png) |
| Price and checkout | [Phone](premium-checkout-360x740.png) | [Phone](premium-checkout-390x844.png) | [Desktop](premium-checkout-1440x900.png) |
| Dragon avatar preview | [Phone](preview-avatar-360x740.png) | [Phone](preview-avatar-390x844.png) | [Desktop](preview-avatar-1440x900.png) |
| Board preview | [Phone](preview-board-360x740.png) | [Phone](preview-board-390x844.png) | [Desktop](preview-board-1440x900.png) |
| Banner preview | [Phone](preview-banner-360x740.png) | [Phone](preview-banner-390x844.png) | [Desktop](preview-banner-1440x900.png) |
| Frame preview | [Phone](preview-frame-360x740.png) | [Phone](preview-frame-390x844.png) | [Desktop](preview-frame-1440x900.png) |

## What these captures verify

`tests/dominion-ui.spec.js` uses mocked session, catalog, inventory, commerce and socket responses. Its fake provider never sends money to Razorpay. It checks all nine previews, absence of coin-purchase offers even with a large coin balance, unavailable-checkout messaging, and the browser flow from buying `bundle-dominion` to displaying all nine styles as owned. The disabled checkout in these captures is deliberate fixture data; it does not describe the live payment configuration.

The separate `tests/dominion-appearance-ui.spec.js` uses a disposable account in an isolated local `ea_test_` or `ea_ci_` database. It preloads that account's inventory, then exercises the real equip and settings APIs and checks inventory, profile, battle, emotes and reduced motion. This proves equipped rendering and ownership behavior after a fixture grant; it does not prove a real-money payment. Server commerce tests separately cover acquisition policy and verified-payment fulfillment.

Equipped captures from that real-API fixture: [Inventory](equipped-inventory-mobile.png), [phone profile](equipped-profile-mobile.png), [desktop profile](equipped-profile-desktop.png), and [4×4 battle](equipped-battle-mobile.png).

The artwork prompts, saved asset paths, animation encoder and price configuration are documented in [ETERNAL_DOMINION.md](../../ETERNAL_DOMINION.md).

To regenerate the screenshot set in PowerShell while a local test server is running:

```powershell
$env:E2E_BASE_URL = 'http://localhost:3100'
$env:DOMINION_CAPTURE = '1'
npx playwright test tests/dominion-ui.spec.js --reporter=list
```
