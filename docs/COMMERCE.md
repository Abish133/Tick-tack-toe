# Payment, email, Google and advertising setup

These integrations are implemented with server validation. Live merchant capture, email delivery, Google consent and ad delivery require your provider accounts. Add secrets only in Railway → Elemental Arena → Variables; never send them through chat or commit them. Redeploy after changing variables. The game, all 22 equal powers, earned coins and the 900-coin cosmetic pass work without these providers.

## Razorpay

1. Complete your Razorpay merchant onboarding. Start with **Test Mode**.
2. Add `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET`. Enable automatic capture in Razorpay; authorized payments alone never grant coins, styles or pass ownership.
3. Create a Razorpay webhook at `https://elemental-arena-production.up.railway.app/api/payments/razorpay/webhook`. Subscribe to `payment.captured`, `order.paid` and `payment.refunded`. Generate a separate webhook secret and set `RAZORPAY_WEBHOOK_SECRET` to the same value.
4. Register an account in the game and test each coin pack, pass and cosmetic collection. Confirm capture grants the expected wallet balance or nine styles once, replay the webhook and confirm it grants nothing extra, and test failed/abandoned checkout and a full refund. Test collection refunds with an equipped style and with a style already purchased using coins.
5. Replace test keys with live keys after completing the tests and merchant activation.

Default INR prices: 500 cosmetic coins ₹49, 1,200 coins ₹99, 3,000 coins ₹199, season pass ₹99, each of the ten original nine-style cosmetic collections ₹149, Astral Ascendancy ₹499, and Eternal Dominion ₹2,499. `RAZORPAY_COLLECTION_PAISE=14900` controls the ten original collections, `RAZORPAY_ASCENDANT_PAISE=49900` controls Astral Ascendancy, and `RAZORPAY_DOMINION_PAISE=249900` independently controls Eternal Dominion. Optional price variables contain **integer paise**, as shown in `.env.example`. Amounts and products come from the server; browser prices cannot determine rewards. The pass is also available with 900 earned coins.

The expanded collection contains **126 cosmetic items**: **112 coin-eligible styles**, **nine real-money-only Eternal Dominion styles**, and five exclusive season-pass rewards. Each cash collection includes one avatar, board, X/O mark set, arena, frame, banner, arrival effect, two-signal emote pack and title. Original collections and Astral Ascendancy can also be bought individually with earned cosmetic coins. See [COLLECTION.md](COLLECTION.md) for the names, artwork and individual coin prices.

**Eternal Dominion is a complete, real-money-only Sovereign set.** Its nine items are granted together by captured Razorpay checkout for `bundle-dominion`; none is sold for coins, granted by ads, or included in either season track. The catalog explicitly marks them `purchaseMode: real-money`. Their database `price: 0` is a non-purchasable sentinel, not a free price: the coin-purchase endpoint checks both the requested and database-returned canonical ID and rejects with `REAL_MONEY_ONLY` before any coin debit, regardless of editable database prices or case/accent/padding aliases. Checkout grants cosmetics only, with no coins, powers, energy, XP or ranked advantage.

Checkout rejects a collection when every style is already owned, and reuses an existing pending order for that collection. A partly owned collection still costs the full displayed price: the shop shows the ownership count and explains this policy. Already owned styles remain owned; duplicates never produce coin compensation. Checkout is available only to registered players and only when all nine listed styles are enabled in the server catalog.

Orders are tied to their player and persist in MySQL. The server validates checkout HMAC, fetches the actual payment from Razorpay, and checks captured status, order, amount and currency before an atomic grant. Webhooks validate the original bytes using a separate HMAC secret. Duplicate captures cannot grant twice.

Collection orders store an immutable snapshot of their exact nine cosmetic IDs at checkout. A verified capture atomically records all nine order entitlements and adds only missing inventory items. Later catalog changes do not substitute the promised styles. Collection purchases grant no coins, powers or account XP. Payment fulfillment, coin purchases, equipment changes and refunds use database locks to protect ownership and wallet balances.

Full coin-pack refunds remove remaining purchased coins without allowing a negative wallet. Coins already spent are flagged in the admin audit for operator review. Full pass refunds revoke the entitlement; previously claimed cosmetics remain for operator review. Partial refunds need manual review. Cash purchases have no effect on powers, cups, ranked timers or energy.

Full collection refunds use recorded ownership provenance. The server removes only styles created by cash fulfillment when there is no retained legacy or coin ownership and no other paid collection entitlement. It preserves unrelated styles and other players' inventories. An equipped slot resets to its starter value, or an optional slot clears, only when that exact equipped style is actually revoked; revoked equipped titles revert to Rookie Strategist. Refund audits record revoked and retained IDs. A full refund received before fulfillment permanently closes the order without granting inventory. Duplicate refunds do not revoke twice, and partial collection refunds retain inventory for manual review.

**Merchant activation is still required.** Listing prices and passing signed provider fixtures do not enable real-money capture. Until valid Razorpay merchant keys and webhook configuration are added, checkout remains disabled. Coin-eligible styles remain available through earned coins; Eternal Dominion remains available to preview and cannot be acquired until checkout is enabled.

See [Razorpay checkout integration](https://razorpay.com/docs/payments/payment-gateway/web-integration/standard/integration-steps/) and [webhook validation](https://razorpay.com/docs/webhooks/validate-test/).

## Google AdMob on Android

AdMob is a native mobile SDK. The website does not simulate an AdMob impression. Use the Android app documented in [ANDROID.md](ANDROID.md).

1. Create your AdMob Android app and rewarded ad unit. Configure its Android app ID in GitHub repository variable `ADMOB_ANDROID_APP_ID` for the APK build.
2. Set the game server variable `ADMOB_REWARDED_AD_UNIT_ID=ca-app-pub-PUBLISHER/UNIT`.
3. In the rewarded unit's server-side verification settings, set callback URL `https://elemental-arena-production.up.railway.app/api/ads/admob/ssv`.
4. Normally the callback's numeric ad-unit ID is inferred from `UNIT`. If AdMob provides a different numeric value, set `ADMOB_SSV_AD_UNIT_ID` to it.
5. Use test ads and a test device before activation. Verify consent and privacy choices, skipped/failed ads, the five-ad daily limit and an actual signed SSV callback.

Ads are optional and prohibited during Ranked matches and Ranked queues. Each request creates a player-bound 15-minute nonce. Google-signed ECDSA callbacks are verified against rotating Google public keys, the nonce, player and ad unit; a unique transaction grants exactly 25 cosmetic coins. A browser or native “rewarded” event only displays progress; it cannot credit coins. Five pending/completed sessions per UTC day are allowed. Google UMP consent is collected before requesting ads.

See [Google AdMob server-side verification](https://developers.google.com/admob/android/ssv).

## Google sign-in

Create a **Web application** OAuth client in Google Cloud. Add the exact HTTPS game origin to authorized JavaScript origins and `https://elemental-arena-production.up.railway.app/api/auth/google/callback` as an authorized redirect URI. Set `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`.

Configure the consent screen and test users, verify login and sign-out, then publish the consent application as appropriate. Existing password accounts with the same email must use password login; automatic provider linking is deliberately disabled to prevent account takeover.

The Android wrapper opens Google authentication in the system browser. Browser sessions and Android WebView sessions are separate: use password/guest login in the wrapper until a native account-linking flow is separately configured.

## Email verification and password reset

Set `EMAIL_FROM` to a sender you control. Choose one:

- Resend: set `RESEND_API_KEY` and verify your sending domain.
- SMTP: set `SMTP_HOST`, `SMTP_USER`, `SMTP_PASSWORD`, and `SMTP_PORT` (587 with STARTTLS or 465 with TLS).
- Existing HTTPS adapter: set `EMAIL_WEBHOOK_URL` and optional `EMAIL_WEBHOOK_TOKEN`. It receives JSON `{from,to,subject,text}`; return HTTP 2xx only after accepting delivery.

Verify actual delivery, the one-hour expiry, a consumed token, and revoked sessions after reset. Reset links use `APP_ORIGIN`, so keep it equal to your public game origin. Delivery failures never expose provider credentials.

## Validation boundary

Automated provider fixtures exercise cryptographic signatures, exact order matching, disabled-provider behavior and real MySQL grants. They do not constitute a live merchant payment, Google login, sent email or production ad impression. Complete the provider-console tests above when adding your accounts.
