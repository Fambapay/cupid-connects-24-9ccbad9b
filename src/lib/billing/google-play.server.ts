/**
 * Google Play Developer API helper — service-account JWT auth.
 *
 * Server-only (.server.ts). Used to validate purchase tokens and acknowledge
 * subscriptions after a successful in-app purchase, and to look up the current
 * state of a subscription when the Pub/Sub webhook fires.
 *
 * Required env (set via add_secret when you wire Play Console):
 *   GOOGLE_PLAY_PACKAGE_NAME           — com.hunie.app
 *   GOOGLE_PLAY_SERVICE_ACCOUNT_JSON   — full service-account JSON (string)
 *
 * Docs: https://developers.google.com/android-publisher/api-ref/rest/v3/purchases.subscriptionsv2/get
 */

type ServiceAccount = {
  client_email: string;
  private_key: string;
  token_uri?: string;
};

let cachedToken: { token: string; exp: number } | null = null;

function base64UrlEncode(buf: ArrayBuffer | Uint8Array): string {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  let s = "";
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return btoa(s).replace(/=+$/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}

function pemToPkcs8(pem: string): ArrayBuffer {
  const b64 = pem
    .replace(/-----BEGIN [^-]+-----/g, "")
    .replace(/-----END [^-]+-----/g, "")
    .replace(/\s+/g, "");
  const bin = atob(b64);
  const buf = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
  return buf.buffer;
}

function getServiceAccount(): ServiceAccount {
  const raw = process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_JSON;
  if (!raw) throw new Error("GOOGLE_PLAY_SERVICE_ACCOUNT_JSON not configured");
  return JSON.parse(raw) as ServiceAccount;
}

export function getPackageName(): string {
  const pkg = process.env.GOOGLE_PLAY_PACKAGE_NAME;
  if (!pkg) throw new Error("GOOGLE_PLAY_PACKAGE_NAME not configured");
  return pkg;
}

async function getAccessToken(): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  if (cachedToken && cachedToken.exp - 60 > now) return cachedToken.token;

  const sa = getServiceAccount();
  const tokenUri = sa.token_uri ?? "https://oauth2.googleapis.com/token";

  const header = { alg: "RS256", typ: "JWT" };
  const claim = {
    iss: sa.client_email,
    scope: "https://www.googleapis.com/auth/androidpublisher",
    aud: tokenUri,
    exp: now + 3600,
    iat: now,
  };
  const signingInput = `${base64UrlEncode(new TextEncoder().encode(JSON.stringify(header)))}.${base64UrlEncode(
    new TextEncoder().encode(JSON.stringify(claim)),
  )}`;

  const key = await crypto.subtle.importKey(
    "pkcs8",
    pemToPkcs8(sa.private_key),
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, new TextEncoder().encode(signingInput));
  const jwt = `${signingInput}.${base64UrlEncode(sig)}`;

  const res = await fetch(tokenUri, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });
  if (!res.ok) throw new Error(`Google OAuth failed: ${res.status} ${await res.text()}`);
  const json = (await res.json()) as { access_token: string; expires_in: number };
  cachedToken = { token: json.access_token, exp: now + json.expires_in };
  return cachedToken.token;
}

export type SubscriptionV2 = {
  kind?: string;
  regionCode?: string;
  lineItems?: Array<{
    productId: string;
    expiryTime?: string;
    autoRenewingPlan?: { autoRenewEnabled?: boolean };
  }>;
  subscriptionState?:
    | "SUBSCRIPTION_STATE_ACTIVE"
    | "SUBSCRIPTION_STATE_CANCELED"
    | "SUBSCRIPTION_STATE_IN_GRACE_PERIOD"
    | "SUBSCRIPTION_STATE_ON_HOLD"
    | "SUBSCRIPTION_STATE_PAUSED"
    | "SUBSCRIPTION_STATE_EXPIRED"
    | "SUBSCRIPTION_STATE_PENDING"
    | string;
  latestOrderId?: string;
  linkedPurchaseToken?: string;
  acknowledgementState?: "ACKNOWLEDGEMENT_STATE_ACKNOWLEDGED" | "ACKNOWLEDGEMENT_STATE_PENDING" | string;
  externalAccountIdentifiers?: { obfuscatedExternalAccountId?: string; obfuscatedExternalProfileId?: string };
};

/** Fetch the current state of a subscription purchase. */
export async function getSubscriptionV2(purchaseToken: string): Promise<SubscriptionV2> {
  const token = await getAccessToken();
  const pkg = getPackageName();
  const url = `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${encodeURIComponent(pkg)}/purchases/subscriptionsv2/tokens/${encodeURIComponent(purchaseToken)}`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) throw new Error(`subscriptionsv2.get failed: ${res.status} ${await res.text()}`);
  return (await res.json()) as SubscriptionV2;
}

/** Acknowledge a one-time subscription purchase so Google doesn't refund it. */
export async function acknowledgeSubscription(
  productId: string,
  purchaseToken: string,
): Promise<void> {
  const token = await getAccessToken();
  const pkg = getPackageName();
  const url = `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${encodeURIComponent(pkg)}/purchases/subscriptions/${encodeURIComponent(productId)}/tokens/${encodeURIComponent(purchaseToken)}:acknowledge`;
  const res = await fetch(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({}),
  });
  // 200 OK or 409 (already acknowledged) are both fine.
  if (!res.ok && res.status !== 409) {
    throw new Error(`acknowledge failed: ${res.status} ${await res.text()}`);
  }
}

/** Map Play Console product IDs → Hunie membership tiers. Keep in sync with Play Console. */
export const PLAY_PRODUCT_TIER: Record<string, "select" | "plus" | "elite"> = {
  "hunie_select_monthly": "select",
  "hunie_plus_monthly": "plus",
  "hunie_elite_monthly": "elite",
};

export function tierFromProductId(productId: string): "select" | "plus" | "elite" | null {
  return PLAY_PRODUCT_TIER[productId] ?? null;
}
