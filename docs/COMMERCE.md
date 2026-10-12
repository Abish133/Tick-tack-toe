# Payment, email, Google and advertising setup

These integrations are implemented with server validation. Live merchant capture, email delivery, Google consent and ad delivery require your provider accounts. Add secrets only in Railway → Elemental Arena → Variables; never send them through chat or commit them. Redeploy after changing variables. The game, all 22 equal powers, earned coins and the 900-coin cosmetic pass work without these providers.

## Razorpay

1. Complete your Razorpay merchant onboarding. Start with **Test Mode**.
2. Add `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET`. Enable automatic capture in Razorpay; authorized payments alone never grant coins.
3. Create a Razorpay webhook at `https://elemental-arena-production.up.railway.app/api/payments/razorpay/webhook`. Subscribe to `payment.captured`, `order.paid` and `payment.refunded`. Generate a separate webhook secret and set `RAZORPAY_WEBHOOK_SECRET` to the same value.
4. Register an account in the game and test each coin pack and pass. Confirm successful capture changes the wallet once, replay the webhook and confirm it grants nothing extra, and test failed/abandoned checkout and a full refund.
5. Replace test keys with live keys after completing the tests and merchant activation.

Default INR prices: 500 cosmetic coins ₹49, 1,200 coins ₹99, 3,000 coins ₹199, season pass ₹99. Optional price variables contain **integer paise**, as shown in `.env.example`. Amounts and products come from the server; browser prices cannot determine rewards. The pass is also available with 900 earned coins.

Orders are tied to their player and persist in MySQL. The server validates checkout HMAC, fetches the actual payment from Razorpay, and checks captured status, order, amount and currency before an atomic grant. Webhooks validate the original bytes using a separate HMAC secret. Duplicate captures cannot grant twice.

Full coin-pack refunds remove remaining purchased coins without allowing a negative wallet. Coins already spent are flagged in the admin audit for operator review. Full pass refunds revoke the entitlement; previously claimed cosmetics remain for operator review. Partial refunds need manual review. Cash purchases have no effect on powers, cups, ranked timers or energy.

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
