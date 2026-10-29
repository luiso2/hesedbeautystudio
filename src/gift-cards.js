export const GIFT_CARD_BUSINESS_ID = "aaeee082-a486-4bee-a1f2-c736d45e6a10";
const GIFT_BUY_URL = "https://merktop-payments.odd-forest-9504.workers.dev/pub/gift-cards/buy";
const MIN_CENTS = 500;
const MAX_CENTS = 10_000_000;

export class GiftCardError extends Error {
  constructor(code) {
    super(code);
    this.code = code;
  }
}

// Parse decimal strings into integer cents without rounding the buyer's amount.
export function giftAmountToCents(value) {
  if (typeof value !== "string") return null;
  const normalized = value.trim().replace(",", ".");
  if (!/^\d{1,6}(?:\.\d{1,2})?$/.test(normalized)) return null;
  const [dollars, fraction = ""] = normalized.split(".");
  const cents = Number(dollars) * 100 + Number(fraction.padEnd(2, "0"));
  return cents >= MIN_CENTS && cents <= MAX_CENTS ? cents : null;
}

export function buildGiftCardPurchase(fields) {
  const amount = giftAmountToCents(fields.amount);
  if (amount == null) throw new GiftCardError("amount");
  const text = (value) => typeof value === "string" ? value.trim() : "";
  const buyerName = text(fields.buyerName);
  const buyerEmail = text(fields.buyerEmail);
  const recipientName = fields.sendToRecipient ? text(fields.recipientName) : "";
  const recipientEmail = fields.sendToRecipient ? text(fields.recipientEmail) : "";
  const message = fields.sendToRecipient ? text(fields.message) : "";
  const email = (value) => value.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  if (!buyerName || buyerName.length > 120 || !email(buyerEmail) ||
      recipientName.length > 120 || (fields.sendToRecipient && !email(recipientEmail)) ||
      message.length > 500) throw new GiftCardError("details");
  return {
    business_id: GIFT_CARD_BUSINESS_ID,
    amount,
    buyer_name: buyerName,
    buyer_email: buyerEmail,
    recipient_name: recipientName || null,
    recipient_email: recipientEmail || null,
    message: message || null,
  };
}

export async function createGiftCardCheckout(fields, fetcher = fetch) {
  const payload = buildGiftCardPurchase(fields);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20_000);
  let response;
  try {
    response = await fetcher(GIFT_BUY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "omit",
      cache: "no-store",
      redirect: "error",
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
  } catch {
    throw new GiftCardError("network");
  } finally {
    clearTimeout(timeout);
  }
  if (!response.ok) {
    const code = response.status === 429 ? "rateLimit"
      : response.status === 409 ? "unavailable"
      : response.status === 400 ? "details" : "payment";
    throw new GiftCardError(code);
  }
  const data = await response.json().catch(() => null);
  let url;
  try { url = new URL(data?.url); } catch { throw new GiftCardError("payment"); }
  if (url.origin !== "https://checkout.stripe.com" ||
      !/^\/(?:c|g)\/pay\/cs_(?:test|live)_[A-Za-z0-9_]+$/.test(url.pathname) ||
      url.username || url.password) throw new GiftCardError("payment");
  // A pending code is not a paid gift card. Only redirect to hosted payment;
  // Merktop's verified Stripe webhook activates the credit and sends its email.
  return url.href;
}
