import test from "node:test";
import assert from "node:assert/strict";
import { eligibleForDeposit, findDepositLink, paymentDescription, verifyMerktopEvent } from "../src/merktop.js";

const businessId = "aaeee082-a486-4bee-a1f2-c736d45e6a10";
const payUrl = "https://payments.merktop.com/pay/d/example-link";

test("fixed and unpriced services request a deposit, but prices below $40 do not", () => {
  assert.equal(eligibleForDeposit({ price: 85 }), true);
  assert.equal(eligibleForDeposit({ price: 30 }), false);
  assert.equal(eligibleForDeposit({ price: 300, from: true }), true);
  assert.equal(eligibleForDeposit({ price: null }), true);
  assert.equal(paymentDescription({ name: { es: "Fibroblast" } }, { name: { es: "Frente" } }), "Fibroblast · Frente");
});

test("payment link must belong to María, match the treatment and charge $40", async () => {
  const previous = globalThis.fetch;
  try {
    globalThis.fetch = async () => Response.json({
      business: { id: businessId, merchant_ready: true, bookings_paused: false },
      catalog: { services: [{ link_id: "example-link", description: "Drenaje Linfático",
        deposit_amount: 4000, total_amount: 8500, currency: "usd",
        reservation_mode: false, pay_url: payUrl },
      { link_id: "reservation-link", description: "Salmon DNA",
        deposit_amount: 4000, total_amount: 4000, currency: "usd",
        reservation_mode: true, pay_url: "https://payments.merktop.com/pay/d/reservation-link" }] },
    });
    const env = { MERKTOP_SITE_READ_KEY: "test-read-key" };
    assert.equal((await findDepositLink(env, "Drenaje Linfático", 8500)).url.toString(), payUrl);
    assert.equal((await findDepositLink(env, "Salmon DNA", null, true)).id, "reservation-link");
    await assert.rejects(findDepositLink(env, "Drenaje Linfático", 7500), /merktop_link_unavailable/);
    globalThis.fetch = async () => Response.json({
      business: { id: "another-business", merchant_ready: true, bookings_paused: false },
      catalog: { services: [] },
    });
    await assert.rejects(findDepositLink(env, "Drenaje Linfático", 8500), /merktop_merchant_unavailable/);
  } finally {
    globalThis.fetch = previous;
  }
});

test("webhook accepts only a fresh, correctly signed Merktop event", async () => {
  const secret = "test-webhook-secret";
  const timestamp = Math.floor(Date.now() / 1000);
  const event = { id: `evt_${"a".repeat(32)}`, type: "deposit.paid", created: timestamp,
    data: { ref: "123e4567-e89b-12d3-a456-426614174000", amount_paid: 4000 } };
  const body = JSON.stringify(event);
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const digest = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`${timestamp}.${body}`));
  const signature = Buffer.from(digest).toString("hex");
  const request = (text, sig = signature, time = timestamp) => new Request("https://mariahesed.com/api/merktop/webhook", {
    method: "POST", headers: { "merktop-event-id": event.id, "merktop-signature": `t=${time},v1=${sig}` }, body: text,
  });
  assert.deepEqual(await verifyMerktopEvent(request(body), secret), event);
  assert.equal(await verifyMerktopEvent(request(body + " "), secret), null);
  assert.equal(await verifyMerktopEvent(request(body, signature, timestamp - 301), secret), null);
});
