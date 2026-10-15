"use client";
import { useEffect, useRef, useState } from "react";
import {
  Coins,
  ShieldCheck,
  Sparkles,
  Play,
  LoaderCircle,
  CreditCard,
  ArrowRight,
  Check,
  Layers3,
  LockKeyhole,
  Box,
  Crown,
} from "lucide-react";
import {
  cosmeticTheme,
  cosmeticById,
  cosmeticMotion,
  COLLECTION_BUNDLES,
  COSMETIC_THEMES,
} from "../lib/cosmetic-collection";
import styles from "./CommercePanel.module.css";
import { GameFrame, GameButton, RarityTile } from "./ui";
import CosmeticArt from "./CosmeticArt";

let checkoutScript;
function loadCheckout() {
  if (window.Razorpay) return Promise.resolve();
  if (!checkoutScript)
    checkoutScript = new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.async = true;
      script.onload = () => {
        if (window.Razorpay) resolve();
        else {
          checkoutScript = null;
          reject(new Error("Checkout could not load."));
        }
      };
      script.onerror = () => {
        checkoutScript = null;
        reject(new Error("Payment checkout is unavailable. Please retry."));
      };
      document.head.appendChild(script);
    });
  return checkoutScript;
}
const price = (p) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: p.currency,
    minimumFractionDigits: p.amount % 100 ? 2 : 0,
    maximumFractionDigits: 2,
  }).format(p.amount / 100);
export default function CommercePanel({
  api,
  user,
  features,
  refresh,
  onError,
  onNotice,
  onRegister,
  ownedIds = [],
  onCollection,
  focus = "featured",
}) {
  const [data, setData] = useState(null),
    [busy, setBusy] = useState(""),
    [native, setNative] = useState(false),
    [adState, setAdState] = useState(""),
    [reveal, setReveal] = useState(null);
  useEffect(() => {
    if (!reveal) return;
    const timer = setTimeout(() => setReveal(null), 2200);
    return () => clearTimeout(timer);
  }, [reveal]);
  const alive = useRef(true),
    adSession = useRef(null),
    timer = useRef(null),
    checkout = useRef(null);
  useEffect(() => {
    alive.current = true;
    setNative(Boolean(window.ElementalNative?.postMessage));
    api("/commerce/products")
      .then((d) => {
        if (alive.current) setData(d);
      })
      .catch((e) => onError(e.message));
    return () => {
      alive.current = false;
      clearTimeout(timer.current);
      adSession.current = null;
      checkout.current?.close();
    };
  }, [api, onError]);
  useEffect(() => {
    const event = (e) => {
      if (e.detail?.sessionId !== adSession.current?.sessionId) return;
      const state = e.detail.state;
      if (state === "error") {
        setAdState(
          e.detail.message || "The ad could not load. No coins were charged.",
        );
        setBusy("");
        adSession.current = null;
        clearTimeout(timer.current);
      } else if (state === "rewarded")
        setAdState("Ad completed. Waiting for verified reward…");
      else if (state === "closed")
        setAdState("Checking whether the reward was verified…");
    };
    window.addEventListener("elemental:admob", event);
    return () => window.removeEventListener("elemental:admob", event);
  }, []);
  async function payment(product) {
    if (!user || user.guest) {
      onRegister();
      return;
    }
    if (!data?.checkoutEnabled) {
      onNotice(
        "Payments not enabled yet. This collection can be earned with cosmetic coins.",
      );
      return;
    }
    setBusy(product.id);
    try {
      await loadCheckout();
      const order = await api("/commerce/orders", "POST", {
        sku: product.id,
        requestId: crypto.randomUUID(),
      });
      await new Promise((resolve, reject) => {
        let settled = false;
        const finish = (fn) => (value) => {
          if (!settled) {
            settled = true;
            fn(value);
          }
        };
        const popup = new window.Razorpay({
          key: order.keyId,
          order_id: order.providerOrderId,
          amount: order.amount,
          currency: order.currency,
          name: order.name,
          description: order.description,
          prefill: { name: user.name, email: user.email },
          theme: { color: "#8966ff" },
          handler: async (result) => {
            try {
              await api("/commerce/verify", "POST", {
                orderId: order.orderId,
                ...result,
              });
              await refresh();
              setReveal(product);
              onNotice(
                product.kind === "bundle"
                  ? `${product.name} purchased. Your nine styles are ready in Inventory.`
                  : "Payment captured. Your cosmetic purchase is ready.",
              );
              finish(resolve)();
            } catch (error) {
              // A webhook can settle even if the browser verification request is interrupted.
              try {
                const status = await api("/commerce/orders/" + order.orderId);
                if (status.status === "paid") {
                  await refresh();
                  setReveal(product);
                  onNotice(
                    "Payment verified. Your cosmetic purchase is ready.",
                  );
                  finish(resolve)();
                  return;
                }
              } catch {}
              finish(reject)(error);
            }
          },
          modal: { ondismiss: () => finish(resolve)(), confirm_close: true },
        });
        checkout.current = popup;
        popup.on("payment.failed", () =>
          finish(reject)(
            new Error("Payment did not complete. You can retry the purchase."),
          ),
        );
        popup.open();
      });
    } catch (error) {
      onError(error.message);
    } finally {
      if (alive.current) setBusy("");
      checkout.current = null;
    }
  }
  async function watchAd() {
    if (!user) {
      onRegister();
      return;
    }
    setBusy("ad");
    setAdState("Preparing optional rewarded ad…");
    try {
      const session = await api("/ads/session", "POST", {});
      adSession.current = session;
      window.ElementalNative.postMessage(
        JSON.stringify({ type: "rewarded", ...session }),
      );
      const deadline = Date.now() + 90000;
      const poll = async () => {
        if (
          !alive.current ||
          adSession.current?.sessionId !== session.sessionId
        )
          return;
        try {
          const status = await api("/ads/sessions/" + session.sessionId);
          if (status.status === "granted") {
            adSession.current = null;
            setBusy("");
            setAdState("Verified: " + status.coins + " cosmetic coins added.");
            await refresh();
            onNotice(
              "Rewarded ad verified: " + status.coins + " cosmetic coins.",
            );
            return;
          }
          if (status.status === "expired" || Date.now() > deadline) {
            adSession.current = null;
            setBusy("");
            setAdState(
              "Verification is still pending. Reopen your wallet later; completed rewards settle on the server.",
            );
            return;
          }
        } catch (error) {
          if (Date.now() > deadline) {
            adSession.current = null;
            setBusy("");
            setAdState(error.message);
            return;
          }
        }
        timer.current = setTimeout(poll, 4000);
      };
      timer.current = setTimeout(poll, 4000);
    } catch (error) {
      adSession.current = null;
      setBusy("");
      setAdState("");
      onError(error.message);
    }
  }
  const products = data?.products || [],
    bundles = products
      .filter((product) => product.kind === "bundle")
      .sort(
        (a, b) =>
          Number(b.themeId === "ascendant" || b.id === "bundle-ascendant") -
          Number(a.themeId === "ascendant" || a.id === "bundle-ascendant"),
      ),
    extras = products.filter((product) => product.kind !== "bundle");
  const bundleIds = (product) =>
    product.cosmeticIds ||
    COLLECTION_BUNDLES.find((bundle) => bundle.id === product.id)
      ?.cosmeticIds ||
    [];
  return (
    <GameFrame
      className={styles.panel}
      aria-label="Cosmetic purchases and optional rewards"
    >
      <div className={styles.heading}>
        <h2>{focus === "coins" ? "TREASURE VAULT" : "COLLECTIONS"}</h2>
        <span>
          <ShieldCheck size={18} />
          COSMETIC ONLY
        </span>
      </div>
      {!data ? (
        <p className={styles.info}>
          <LoaderCircle className="spin" size={20} />
          Loading cosmetic products…
        </p>
      ) : (
        <>
          {!data.checkoutEnabled && (
            <div className={styles.info}>
              <LockKeyhole size={22} />
              <span>
                <strong>Payments not enabled yet.</strong>
                <span>
                  Razorpay setup pending · Earn these styles with coins.
                </span>
              </span>
            </div>
          )}
          {focus !== "coins" && bundles.length > 0 && (
            <div
              className={styles.collections}
              aria-label="Cash cosmetic collections"
            >
              {bundles.map((product) => {
                const ids = bundleIds(product),
                  count = ids.filter((id) => ownedIds.includes(id)).length,
                  complete = ids.length > 0 && count === ids.length;
                const theme =
                    COSMETIC_THEMES.find(
                      (item) =>
                        item.id ===
                        (product.themeId || product.id.replace("bundle-", "")),
                    ) || cosmeticTheme(ids[0]),
                  avatar = ids
                    .map(cosmeticById)
                    .find((item) => item?.type === "avatar"),
                  ascendant = theme?.id === "ascendant",
                  animated = ids.some((id) => Boolean(cosmeticMotion(id)));
                return (
                  <article
                    className={`${styles.bundle} ${ascendant ? styles.ascendantBundle : ""} ${!data.checkoutEnabled ? styles.locked : ""}`}
                    key={product.id}
                    data-rarity={theme?.rarity || undefined}
                    aria-label={`${product.name}${animated ? ", animated Ascendant collection" : ""}`}
                    style={{ "--bundle-color": theme?.primary || "#c3a1ff" }}
                  >
                    <div className={styles.bundleArt}>
                      <img
                        className={styles.bundleBackground}
                        src={
                          product.asset ||
                          COLLECTION_BUNDLES.find(
                            (item) => item.id === product.id,
                          )?.asset
                        }
                        alt=""
                        loading="lazy"
                      />
                      <div className={styles.bundleShade} />
                      {avatar && ascendant ? (
                        <span className={styles.bundleAvatar} aria-hidden="true">
                          <CosmeticArt item={avatar} />
                        </span>
                      ) : avatar && (
                        <img
                          className={styles.bundleAvatar}
                          src={avatar.asset}
                          alt=""
                          loading="lazy"
                        />
                      )}
                      {ascendant && (
                        <span className={styles.premiumTier}>
                          <span><Crown size={13} aria-hidden="true" /> ASCENDANT</span>
                          {animated && <span><Sparkles size={12} aria-hidden="true" /> ANIMATED</span>}
                        </span>
                      )}
                      <span className={styles.bundleLabel}>
                        <Layers3 size={16} />9 MATCHING STYLES
                      </span>
                      {!data.checkoutEnabled && !complete && (
                        <span
                          className={styles.lockBadge}
                          aria-label="Cash checkout locked until Razorpay setup"
                        >
                          <LockKeyhole size={20} />
                        </span>
                      )}
                    </div>
                    <div className={styles.bundleInfo}>
                      <h3>{product.name}</h3>
                      <div className={styles.bundlePrice}>
                        <strong>{price(product)}</strong>
                        <span>
                          {complete
                            ? "Collection owned"
                            : `${count} of ${ids.length || 9} owned`}
                        </span>
                      </div>
                      <GameButton
                        disabled={
                          complete || !data.checkoutEnabled || Boolean(busy)
                        }
                        onClick={() => payment(product)}
                      >
                        {busy === product.id ? (
                          <LoaderCircle className="spin" size={18} />
                        ) : complete ? (
                          <Check size={18} />
                        ) : !data.checkoutEnabled ? (
                          <LockKeyhole size={18} />
                        ) : (
                          <CreditCard size={18} />
                        )}{" "}
                        {complete
                          ? "Owned"
                          : data.checkoutEnabled
                            ? "Buy collection"
                            : "Checkout opens after setup"}
                      </GameButton>
                      <GameButton
                        variant="secondary"
                        className={styles.explore}
                        onClick={() =>
                          onCollection?.(theme?.id || product.themeId)
                        }
                      >
                        Explore nine styles <EyeIcon />
                      </GameButton>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
          {focus !== "coins" && bundles.length > 0 && (
            <p className={styles.small}>
              The listed price covers all nine styles, including those you own.
            </p>
          )}
          {focus === "coins" && (
            <section
              className={styles.extras}
              aria-label="Coin packs and season pass"
            >
              <h3>
                <Coins size={22} />
                Coin packs & season pass
              </h3>
              <div className={styles.products}>
                {extras.map((product, index) => (
                  <RarityTile
                    as="article"
                    rarity={product.coins ? "rare" : "legendary"}
                    key={product.id}
                    className={`${styles.product} ${!data.checkoutEnabled ? styles.locked : ""}`}
                  >
                    <div
                      className={styles.treasure}
                      style={{ "--treasure-tier": index }}
                      aria-hidden="true"
                    >
                      {product.coins ? (
                        <>
                          <div className={styles.treasureGlow} />
                          <svg viewBox="0 0 180 140" className={styles.chest}>
                            <defs>
                              <linearGradient
                                id={`chest-gold-${product.id}`}
                                x2="0"
                                y2="1"
                              >
                                <stop stopColor="#fff0ad" />
                                <stop offset=".45" stopColor="#e7bb56" />
                                <stop offset="1" stopColor="#8b571c" />
                              </linearGradient>
                            </defs>
                            <g
                              fill={`url(#chest-gold-${product.id})`}
                              stroke="#7b511e"
                              strokeWidth="2"
                            >
                              <ellipse cx="53" cy="116" rx="26" ry="7" />
                              <ellipse cx="140" cy="111" rx="23" ry="7" />
                              <ellipse cx="43" cy="106" rx="23" ry="7" />
                              <ellipse cx="147" cy="101" rx="21" ry="7" />
                              <ellipse cx="46" cy="96" rx="20" ry="7" />
                              <path d="M48 62Q47 21 91 20Q135 21 135 62Z" />
                              <path d="M43 62H138L131 118H50Z" />
                              <path
                                d="M62 61V118M118 61V118"
                                fill="none"
                                stroke="#fff0ac"
                                strokeWidth="9"
                              />
                              <path
                                d="M43 64H138"
                                fill="none"
                                stroke="#fff0ac"
                                strokeWidth="7"
                              />
                              <rect
                                x="82"
                                y="59"
                                width="19"
                                height="32"
                                rx="5"
                              />
                              <path
                                d="M90 68v14"
                                stroke="#543519"
                                strokeWidth="4"
                              />
                              <path
                                d="M63 49Q69 32 88 31"
                                fill="none"
                                stroke="#fff8d5"
                                strokeWidth="5"
                                strokeLinecap="round"
                              />
                            </g>
                            <g fill="#ffe6a0">
                              <path d="M23 35l3 9 9 3-9 3-3 9-3-9-9-3 9-3Z" />
                              <path d="M149 24l3 9 9 3-9 3-3 9-3-9-9-3 9-3Z" />
                            </g>
                          </svg>
                        </>
                      ) : (
                        <>
                          <span className={styles.passCrest}>
                            <Crown size={68} />
                            <Sparkles size={28} />
                          </span>
                        </>
                      )}
                      {!data.checkoutEnabled && (
                        <span className={styles.lockBadge}>
                          <LockKeyhole size={20} />
                        </span>
                      )}
                    </div>
                    <h3>{product.name}</h3>
                    <p>
                      {product.coins ? (
                        <>
                          <strong>{product.coins.toLocaleString()}</strong>{" "}
                          cosmetic coins
                        </>
                      ) : (
                        "Five exclusive visual rewards through season XP"
                      )}
                    </p>
                    <strong className={styles.productPrice}>
                      {price(product)}
                    </strong>
                    <GameButton
                      variant="secondary"
                      disabled={!data.checkoutEnabled || Boolean(busy)}
                      onClick={() => payment(product)}
                    >
                      {busy === product.id ? (
                        <LoaderCircle className="spin" size={18} />
                      ) : !data.checkoutEnabled ? (
                        <LockKeyhole size={18} />
                      ) : (
                        <CreditCard size={18} />
                      )}{" "}
                      {data.checkoutEnabled
                        ? "Checkout"
                        : "Available after setup"}
                    </GameButton>
                  </RarityTile>
                ))}
              </div>
              <p className={styles.small}>
                The pass can also be unlocked with {data.passCoinPrice} earned
                coins in Season Journey.
              </p>
            </section>
          )}
        </>
      )}
      {native && features.rewardedAds && (
        <GameFrame className={styles.ad}>
          <div>
            <h3>Optional cosmetic reward</h3>
            <p>
              Watch an ad for 25 coins, up to five times a day. Available
              outside Ranked.
            </p>
          </div>
          <GameButton
            variant="secondary"
            disabled={Boolean(busy)}
            onClick={watchAd}
          >
            {busy === "ad" ? (
              <LoaderCircle className="spin" size={18} />
            ) : (
              <Play size={18} />
            )}
            Watch rewarded ad
          </GameButton>
          <GameButton
            variant="ghost"
            onClick={() =>
              window.ElementalNative.postMessage(
                JSON.stringify({ type: "privacy" }),
              )
            }
          >
            Ad privacy choices
          </GameButton>
        </GameFrame>
      )}
      {adState && (
        <p role="status" className={styles.info}>
          {adState}
        </p>
      )}
      {reveal && (
        <div
          className={styles.reveal}
          role="region"
          aria-live="polite"
          aria-label="Treasure unlocked"
        >
          <Box size={44} />
          <strong>TREASURE UNLOCKED</strong>
          <span>
            {reveal.coins
              ? `${reveal.coins.toLocaleString()} cosmetic coins`
              : reveal.name}
          </span>
          <button
            aria-label="Skip purchase reveal"
            onClick={() => setReveal(null)}
          >
            SKIP
          </button>
        </div>
      )}
    </GameFrame>
  );
}
function EyeIcon() {
  return <ArrowRight size={18} />;
}
