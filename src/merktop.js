import paymentLinks from "./payment-links.json" with { type: "json" };

const MERKTOP_BUSINESS_ID = "aaeee082-a486-4bee-a1f2-c736d45e6a10";
const CONFIG_URL = "https://merktop-payments.odd-forest-9504.workers.dev/pub/site-config";
const PAYMENT_ORIGIN = "https://payments.merktop.com";

export function paymentDescription(service, option) {
  return `${service.name.es}${option ? ` · ${option.name.es}` : ""}`;
}

export function paymentLinkKey(service, option) {
  return option ? `${service.id}/${option.id}` : service.id;
}

export function eligibleForDeposit(selected) {
  return selected.price == null || selected.from ||
    (Number.isInteger(selected.price) && selected.price >= 40);
}

export async function findDepositLink(env, description, priceCents, reservationMode = false, catalogKey = null) {
  if (!env.MERKTOP_SITE_READ_KEY) throw new Error("merktop_not_configured");
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);
  let response;
  try {
    response = await fetch(CONFIG_URL, {
      headers: { Authorization: `Bearer ${env.MERKTOP_SITE_READ_KEY}` },
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }
  if (!response.ok) throw new Error("merktop_config_unavailable");
  const config = await response.json();
  if (config.business?.id !== MERKTOP_BUSINESS_ID ||
      !config.business.merchant_ready || config.business.bookings_paused)
    throw new Error("merktop_merchant_unavailable");
  const matchesAmount = (entry) =>
    entry.deposit_amount === 4000 &&
    entry.total_amount === (reservationMode ? 4000 : priceCents) &&
    entry.currency === "usd" &&
    entry.reservation_mode === reservationMode;
  const services = config.catalog?.services || [];
  const savedLinkId = catalogKey && paymentLinks[catalogKey];
  const link = (savedLinkId && services.find((entry) =>
    entry.link_id === savedLinkId && matchesAmount(entry))) ||
    services.find((entry) => entry.description === description && matchesAmount(entry));
  if (!link) throw new Error("merktop_link_unavailable");
  const payUrl = new URL(link.pay_url);
  if (payUrl.origin !== PAYMENT_ORIGIN ||
      payUrl.pathname !== `/pay/d/${link.link_id}` || payUrl.search || payUrl.hash)
    throw new Error("merktop_link_invalid");
  return { id: link.link_id, url: payUrl };
}

function equalHex(a, b) {
  if (a.length !== b.length) return false;
  let difference = 0;
  for (let i = 0; i < a.length; i++) difference |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return difference === 0;
}

export async function verifyMerktopEvent(request, secret) {
  if (!secret) return null;
  const signature = request.headers.get("merktop-signature") || "";
  const match = /^t=(\d{10,}),v1=([0-9a-f]{64})$/.exec(signature);
  if (!match) return null;
  const timestamp = Number(match[1]);
  if (!Number.isSafeInteger(timestamp) || Math.abs(Date.now() / 1000 - timestamp) > 300) return null;
  if (Number(request.headers.get("content-length")) > 16384 || !request.body) return null;
  const reader = request.body.getReader();
  const chunks = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > 16384) {
      await reader.cancel();
      return null;
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  const body = new TextDecoder().decode(bytes);
  const key = await crypto.subtle.importKey(
    "raw", new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" }, false, ["sign"],
  );
  const digest = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`${timestamp}.${body}`));
  const expected = [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
  if (!equalHex(expected, match[2])) return null;
  let event;
  try { event = JSON.parse(body); } catch { return null; }
  if (!event || typeof event !== "object" ||
      event.id !== request.headers.get("merktop-event-id") ||
      !/^evt_[0-9a-f]{32}$/.test(event.id) ||
      !Number.isSafeInteger(event.created) ||
      typeof event.type !== "string" || !event.data || typeof event.data !== "object") return null;
  return event;
}
