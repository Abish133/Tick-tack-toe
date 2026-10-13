package com.elementalarena.game;

import android.annotation.SuppressLint;
import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.graphics.Color;
import android.net.Uri;
import android.net.http.SslError;
import android.os.Build;
import android.os.Bundle;
import android.view.Gravity;
import android.view.View;
import android.view.ViewGroup;
import android.view.WindowInsets;
import android.webkit.CookieManager;
import android.webkit.PermissionRequest;
import android.webkit.SslErrorHandler;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.TextView;
import android.widget.Toast;

import androidx.activity.ComponentActivity;
import androidx.activity.OnBackPressedCallback;
import androidx.annotation.NonNull;
import androidx.webkit.WebViewCompat;
import androidx.webkit.WebViewFeature;

import com.google.android.gms.ads.AdError;
import com.google.android.gms.ads.AdRequest;
import com.google.android.gms.ads.FullScreenContentCallback;
import com.google.android.gms.ads.LoadAdError;
import com.google.android.gms.ads.MobileAds;
import com.google.android.gms.ads.rewarded.RewardedAd;
import com.google.android.gms.ads.rewarded.RewardedAdLoadCallback;
import com.google.android.gms.ads.rewarded.ServerSideVerificationOptions;
import com.google.android.ump.ConsentInformation;
import com.google.android.ump.ConsentRequestParameters;
import com.google.android.ump.UserMessagingPlatform;

import org.json.JSONException;
import org.json.JSONObject;

import java.util.Collections;

/** Platform glue only. Match authority, authentication and rewards remain on the JS server. */
public final class MainActivity extends ComponentActivity {
    private static final int MAX_MESSAGE_LENGTH = 8192;
    private final Uri trustedOrigin = Uri.parse(BuildConfig.GAME_ORIGIN);
    private WebView webView;
    private LinearLayout root;
    private LinearLayout errorPanel;
    private Button privacyButton;
    private ConsentInformation consentInformation;
    private boolean consentFinished;
    private boolean adsInitializing;
    private boolean adsInitialized;
    private RewardRequest pendingReward;
    private final OnBackPressedCallback webBackCallback = new OnBackPressedCallback(false) {
        @Override public void handleOnBackPressed() {
            if (webView != null && errorPanel == null && webView.canGoBack()) {
                webView.goBack();
            } else {
                // History may have changed since the gesture started. Let Android handle exit.
                setEnabled(false);
                getOnBackPressedDispatcher().onBackPressed();
            }
        }
    };

    private static final class RewardRequest {
        final String sessionId;
        final String userId;
        final String customData;
        final String adUnit;
        boolean rewarded;
        RewardRequest(JSONObject data) throws JSONException {
            sessionId = requireString(data, "sessionId", 256);
            userId = requireString(data, "userId", 128);
            customData = requireString(data, "customData", 4096);
            adUnit = requireString(data, "adUnit", 100);
            if (!adUnit.matches("ca-app-pub-[0-9]{16}/[0-9]{10}")) throw new JSONException("Invalid ad unit.");
        }
    }

    private static String requireString(JSONObject data, String key, int maxLength) throws JSONException {
        Object value = data.get(key);
        if (!(value instanceof String)) throw new JSONException("Invalid " + key);
        String text = (String) value;
        if (text.isEmpty() || text.length() > maxLength || text.indexOf('\n') >= 0 || text.indexOf('\r') >= 0 || text.indexOf('\u0000') >= 0) throw new JSONException("Invalid " + key);
        return text;
    }

    @Override public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        root = new LinearLayout(this);
        root.setOrientation(LinearLayout.VERTICAL);
        root.setBackgroundColor(Color.rgb(9, 14, 28));
        root.setOnApplyWindowInsetsListener((view, insets) -> {
            if (Build.VERSION.SDK_INT >= 30) {
                android.graphics.Insets bars = insets.getInsets(WindowInsets.Type.systemBars() | WindowInsets.Type.displayCutout());
                view.setPadding(bars.left, bars.top, bars.right, bars.bottom);
            } else {
                view.setPadding(insets.getSystemWindowInsetLeft(), insets.getSystemWindowInsetTop(), insets.getSystemWindowInsetRight(), insets.getSystemWindowInsetBottom());
            }
            return insets;
        });
        setContentView(root);
        privacyButton = new Button(this);
        privacyButton.setText(R.string.privacy_options);
        privacyButton.setTextSize(12);
        privacyButton.setContentDescription("Manage advertising privacy choices");
        privacyButton.setVisibility(View.GONE);
        privacyButton.setOnClickListener(view -> showPrivacyOptions());
        root.addView(privacyButton, new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT));

        webView = new WebView(this);
        webView.setBackgroundColor(Color.rgb(9, 14, 28));
        root.addView(webView, new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, 0, 1));
        configureWebView();
        // AndroidX bridges legacy buttons and modern predictive gestures with one lifecycle.
        getOnBackPressedDispatcher().addCallback(this, webBackCallback);
        if (!WebViewFeature.isFeatureSupported(WebViewFeature.WEB_MESSAGE_LISTENER)) {
            showError("Update Android System WebView to securely open Elemental Arena.", false);
            return;
        }
        // No wildcard, subdomain or third-party origins receive this native object.
        WebViewCompat.addWebMessageListener(webView, "ElementalNative", Collections.singleton(BuildConfig.GAME_ORIGIN),
            (view, message, sourceOrigin, isMainFrame, replyProxy) -> {
                if (!isMainFrame || !isTrusted(sourceOrigin) || !isTrusted(Uri.parse(view.getUrl() == null ? "" : view.getUrl()))) return;
                String text = message.getData();
                if (text == null || text.length() > MAX_MESSAGE_LENGTH) return;
                runOnUiThread(() -> handleMessage(text));
            });
        if (savedInstanceState == null || webView.restoreState(savedInstanceState) == null) {
            webView.loadUrl(BuildConfig.GAME_ORIGIN + "/");
        }
        updateBackNavigation();
        gatherConsent();
    }

    @SuppressLint("SetJavaScriptEnabled")
    private void configureWebView() {
        WebView.setWebContentsDebuggingEnabled(BuildConfig.DEBUG);
        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setAllowFileAccess(false);
        settings.setAllowContentAccess(false);
        settings.setAllowFileAccessFromFileURLs(false);
        settings.setAllowUniversalAccessFromFileURLs(false);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        settings.setJavaScriptCanOpenWindowsAutomatically(false);
        settings.setSupportMultipleWindows(false);
        settings.setMediaPlaybackRequiresUserGesture(true);
        if (Build.VERSION.SDK_INT >= 26) settings.setSafeBrowsingEnabled(true);
        CookieManager.getInstance().setAcceptCookie(true);
        CookieManager.getInstance().setAcceptThirdPartyCookies(webView, false);
        webView.setWebChromeClient(new WebChromeClient() {
            @Override public void onPermissionRequest(PermissionRequest request) { request.deny(); }
        });
        webView.setWebViewClient(new WebViewClient() {
            @Override public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                Uri url = request.getUrl();
                if (!request.isForMainFrame()) return false;
                if (isTrusted(url) && !"/api/auth/google".equals(url.getPath())) return false;
                openExternal(url);
                return true;
            }
            @Override public boolean shouldOverrideUrlLoading(WebView view, String url) {
                Uri uri = Uri.parse(url);
                if (isTrusted(uri) && !"/api/auth/google".equals(uri.getPath())) return false;
                openExternal(uri);
                return true;
            }
            @Override public void onReceivedSslError(WebView view, SslErrorHandler handler, SslError error) {
                handler.cancel();
                showError("A secure connection could not be verified. Please try again later.", true);
            }
            @Override public void onReceivedError(WebView view, WebResourceRequest request, WebResourceError error) {
                if (request.isForMainFrame()) showError("The arena could not connect. Check your connection, then retry.", true);
            }
            @Override public void onPageFinished(WebView view, String url) {
                if (!isTrusted(Uri.parse(url))) {
                    view.stopLoading();
                    view.loadUrl(BuildConfig.GAME_ORIGIN + "/");
                }
                updateBackNavigation();
            }
            @Override public void doUpdateVisitedHistory(WebView view, String url, boolean isReload) {
                updateBackNavigation();
            }
        });
    }

    private boolean isTrusted(Uri url) {
        return "https".equalsIgnoreCase(url.getScheme())
            && trustedOrigin.getHost() != null
            && trustedOrigin.getHost().equalsIgnoreCase(url.getHost())
            && (url.getPort() == -1 ? 443 : url.getPort()) == (trustedOrigin.getPort() == -1 ? 443 : trustedOrigin.getPort())
            && url.getUserInfo() == null;
    }

    private void openExternal(Uri uri) {
        // Never launch intent:, file:, javascript: or an arbitrary app intent.
        if (!"https".equalsIgnoreCase(uri.getScheme()) || uri.getHost() == null || uri.getUserInfo() != null) return;
        try { startActivity(new Intent(Intent.ACTION_VIEW, uri).addCategory(Intent.CATEGORY_BROWSABLE)); }
        catch (ActivityNotFoundException error) { Toast.makeText(this, "No browser is available for this link.", Toast.LENGTH_SHORT).show(); }
    }

    private void handleMessage(String message) {
        try {
            JSONObject data = new JSONObject(message);
            String type = requireString(data, "type", 30);
            if ("privacy".equals(type)) { showPrivacyOptions(); return; }
            if (!"rewarded".equals(type)) return;
            RewardRequest request = new RewardRequest(data);
            if (pendingReward != null) { emit(request, "error", "AD_BUSY", "An optional ad is already in progress."); return; }
            pendingReward = request;
            emit(request, "loading", null, null);
            // Ads are initialized and loaded only after this explicit opt-in message.
            if (consentFinished) beginRewardAfterConsent();
        } catch (JSONException error) {
            // Malformed client messages cannot create an ad or grant a reward.
            emit(null, "error", "INVALID_REQUEST", "The optional ad request was invalid.");
        }
    }

    private void gatherConsent() {
        consentInformation = UserMessagingPlatform.getConsentInformation(this);
        ConsentRequestParameters params = new ConsentRequestParameters.Builder().build();
        consentInformation.requestConsentInfoUpdate(this, params, () ->
            UserMessagingPlatform.loadAndShowConsentFormIfRequired(this, formError -> consentComplete()),
            requestError -> consentComplete());
    }

    private void consentComplete() {
        consentFinished = true;
        updatePrivacyEntry();
        if (pendingReward != null) beginRewardAfterConsent();
    }

    private void updatePrivacyEntry() {
        boolean required = consentInformation != null && consentInformation.getPrivacyOptionsRequirementStatus() == ConsentInformation.PrivacyOptionsRequirementStatus.REQUIRED;
        privacyButton.setVisibility(required ? View.VISIBLE : View.GONE);
    }

    private void showPrivacyOptions() {
        if (consentInformation == null || consentInformation.getPrivacyOptionsRequirementStatus() != ConsentInformation.PrivacyOptionsRequirementStatus.REQUIRED) return;
        if (pendingReward != null) { Toast.makeText(this, "Close the optional ad before changing privacy settings.", Toast.LENGTH_SHORT).show(); return; }
        UserMessagingPlatform.showPrivacyOptionsForm(this, error -> {
            updatePrivacyEntry();
            if (error != null) Toast.makeText(this, "Privacy options could not load. Please try again.", Toast.LENGTH_SHORT).show();
        });
    }

    private void beginRewardAfterConsent() {
        if (pendingReward == null || isFinishing() || isDestroyed()) return;
        if (consentInformation == null || !consentInformation.canRequestAds()) {
            failReward(pendingReward, "CONSENT_REQUIRED", "Your privacy settings currently do not allow this optional ad.");
            return;
        }
        if (adsInitialized) { loadReward(pendingReward); return; }
        if (adsInitializing) return;
        adsInitializing = true;
        new Thread(() -> MobileAds.initialize(this, status -> runOnUiThread(() -> {
            adsInitialized = true;
            adsInitializing = false;
            if (pendingReward != null) loadReward(pendingReward);
        })), "elemental-admob-init").start();
    }

    private void loadReward(RewardRequest request) {
        if (isFinishing() || isDestroyed()) return;
        RewardedAd.load(this, request.adUnit, new AdRequest.Builder().build(), new RewardedAdLoadCallback() {
            @Override public void onAdFailedToLoad(@NonNull LoadAdError error) {
                failReward(request, "AD_UNAVAILABLE", "No optional ad is available right now. Please try again later.");
            }
            @Override public void onAdLoaded(@NonNull RewardedAd ad) {
                if (pendingReward != request || isFinishing() || isDestroyed() || !isTrusted(Uri.parse(webView.getUrl() == null ? "" : webView.getUrl()))) return;
                ServerSideVerificationOptions verification = new ServerSideVerificationOptions.Builder()
                    .setUserId(request.userId).setCustomData(request.customData).build();
                ad.setServerSideVerificationOptions(verification);
                ad.setFullScreenContentCallback(new FullScreenContentCallback() {
                    @Override public void onAdFailedToShowFullScreenContent(@NonNull AdError error) {
                        failReward(request, "AD_SHOW_FAILED", "The optional ad could not open. Please try again.");
                    }
                    @Override public void onAdDismissedFullScreenContent() {
                        if (pendingReward == request) pendingReward = null;
                        emit(request, "closed", null, null);
                    }
                });
                ad.show(MainActivity.this, rewardItem -> {
                    request.rewarded = true;
                    // This is a display signal. Only the verified server SSV callback credits coins.
                    emit(request, "rewarded", null, null);
                });
            }
        });
    }

    private void failReward(RewardRequest request, String code, String message) {
        if (pendingReward == request) pendingReward = null;
        emit(request, "error", code, message);
    }

    private void emit(RewardRequest request, String state, String code, String message) {
        if (webView == null || isFinishing() || isDestroyed() || !isTrusted(Uri.parse(webView.getUrl() == null ? "" : webView.getUrl()))) return;
        try {
            JSONObject detail = new JSONObject().put("state", state);
            if (request != null) detail.put("sessionId", request.sessionId).put("rewarded", request.rewarded);
            if (code != null) detail.put("code", code);
            if (message != null) detail.put("message", message);
            String script = "window.dispatchEvent(new CustomEvent('elemental:admob',{detail:" + detail + "}));";
            webView.evaluateJavascript(script, null);
        } catch (JSONException ignored) { }
    }

    private void showError(String message, boolean retry) {
        if (errorPanel != null) root.removeView(errorPanel);
        webView.setVisibility(View.GONE);
        errorPanel = new LinearLayout(this);
        errorPanel.setOrientation(LinearLayout.VERTICAL);
        errorPanel.setGravity(Gravity.CENTER);
        int padding = (int) (28 * getResources().getDisplayMetrics().density);
        errorPanel.setPadding(padding, padding, padding, padding);
        TextView title = new TextView(this); title.setText("ELEMENTAL ARENA"); title.setTextColor(Color.rgb(159, 122, 255)); title.setTextSize(23); title.setGravity(Gravity.CENTER);
        TextView body = new TextView(this); body.setText(message); body.setTextColor(Color.WHITE); body.setTextSize(16); body.setGravity(Gravity.CENTER); body.setPadding(0, padding, 0, padding);
        errorPanel.addView(title); errorPanel.addView(body);
        if (retry) {
            Button retryButton = new Button(this); retryButton.setText("Retry connection");
            retryButton.setOnClickListener(view -> { root.removeView(errorPanel); errorPanel = null; webView.setVisibility(View.VISIBLE); webView.loadUrl(BuildConfig.GAME_ORIGIN + "/"); });
            errorPanel.addView(retryButton);
        }
        root.addView(errorPanel, new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, 0, 1));
        updateBackNavigation();
    }

    private void updateBackNavigation() {
        // With no web history, leave exit to Android so its back-to-home preview can run.
        webBackCallback.setEnabled(webView != null && errorPanel == null && webView.canGoBack());
    }
    @Override protected void onSaveInstanceState(@NonNull Bundle state) { super.onSaveInstanceState(state); if (webView != null) webView.saveState(state); }
    @Override protected void onPause() { if (webView != null) webView.onPause(); CookieManager.getInstance().flush(); super.onPause(); }
    @Override protected void onResume() { super.onResume(); if (webView != null) webView.onResume(); }
    @Override protected void onDestroy() {
        pendingReward = null;
        if (webView != null) { if (WebViewFeature.isFeatureSupported(WebViewFeature.WEB_MESSAGE_LISTENER)) WebViewCompat.removeWebMessageListener(webView, "ElementalNative"); root.removeView(webView); webView.destroy(); webView = null; }
        super.onDestroy();
    }
}
