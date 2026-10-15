# Compact mobile layout

Phone screens use a 52px header, a 50px navigation dock and 6px stage margins. Icons and control surfaces are smaller while button hit areas remain at least 48px high. Trophy and coin icons now participate in the counter's normal layout, rather than sitting outside its border. Mobile counters omit the decorative plus, abbreviate large balances to one decimal place, and retain the full number in accessible labels and tooltips.

The equipped Armory summary is 112px tall on 360px and 390px phones. Its three slots, power costs, replacement and unequip controls remain available. Power cards, artwork, borders, search field and collection tiles use less space; the search field no longer receives the global input's extra border and padding. Text remains at least 12px. Game rules, powers, equipment limits, scoring, payments and cosmetic ownership are unchanged.

Connection notices occupy a separate shell row, so they move the game stage and its back button together. Offline online-match actions remain locked until an authoritative snapshot arrives. Closing a tab does not surrender; the existing server turn clock and timeout rules continue. Explicit surrender still uses the existing confirmation and result flow. A returning player can restore a completed result missed during a connection loss. See [runtime recovery](RUNTIME_RECOVERY.md) for the production incident and server safeguards.

Local verification: production build; 292 unit/backend tests with real isolated MySQL, no failures or skips; header counter-content bounds at 320–1440px; Armory space and search checks. Captures at 360×740, 390×844 and 1440×900 had no page overflow or browser errors. The normal phone Armory has 336px/440px of catalog space at these phone heights. Full release CI additionally runs the multiplayer, reconnect, cosmetic and Linux runtime-recovery flows before Railway follows main.

Screenshots use one disposable local test account and real authentication, a three-power deck and a test wallet. No production player records were changed for screenshots.

- [Armory, phone](screenshots/dense-ui/armory-mobile.png)
- [Armory, small phone](screenshots/dense-ui/armory-small.png)
- [Collection, phone](screenshots/dense-ui/collection-mobile.png)
- [Battle hub, phone](screenshots/dense-ui/hub-mobile.png)
