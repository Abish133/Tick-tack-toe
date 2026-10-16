# Responsive polish captures — 16 October 2026

Captured from the local production build with a disposable guest account, at 360×640, 390×844, 740×360 (landscape phone) and 1280×720. JPEG at quality 72 keeps the set small.

- `hub-ready-*` and `missions-ready-*`: the daily reward before claiming (glowing tile, red dot on Journey, CLAIM).
- Every other screen (`hub-*`, `missions-*`, `season-pass-*`, `achievements-*`, `powers-*`, `shop-*`, `inventory-*`, `leaderboard-*`, `friends-*`, `profile-*`, `notifications-*`, `daily-puzzle-*`, `tutorial-*`, `tournaments-*`): captured after claiming from the hub, so they show the claimed state.
- `mode-select-*`, `practice-dialog-390x844`: battle setup with the compact board chip and sticky Enter button.
- `battle-*`: a live practice match. The dock is hidden and the board fills the space it is given, with a three-column layout in landscape.
- `result-390x844`: the result screen, with the dock back.

`tests/polish-ui.spec.js` checks the same screens at nine sizes for overflow, clipped text, small or covered controls and the reward states.
