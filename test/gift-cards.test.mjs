import test from "node:test";
import assert from "node:assert/strict";
import { buildGiftCardPurchase, createGiftCardCheckout, giftAmountToCents, GIFT_CARD_BUSINESS_ID } from "../src/gift-cards.js";

const fields = {
  amount: "137.25",
  buyerName: " Compradora ",
  buyerEmail: " buyer@example.com ",
  sendToRecipient: true,
  recipientName: " Destinataria ",
  recipientEmail: "recipient@example.com",
  message: "Un momento para ti.",
};
const checkoutUrl = "https://checkout.stripe.com/c/pay/cs_test_example#client";

test("custom gift amounts preserve exact cents and enforce the platform limits", () => {
  for (const [input, cents] of [["5", 500], ["137.25", 13725], ["137,25", 13725],
    ["10.1", 1010], ["100000.00", 10000000]]) assert.equal(giftAmountToCents(input), cents);
  for (const input of ["", "4.99", "100000.01", "-10", "1e2", "10.001", "NaN", "50 USD", null])
    assert.equal(giftAmountToCents(input), null);
});

test("purchases belong to María, keep the full gift value and include the chosen recipient", () => {
  const payload = buildGiftCardPurchase({ ...fields, business_id: "another-merchant" });
  assert.deepEqual(payload, {
    business_id: GIFT_CARD_BUSINESS_ID, amount: 13725,
    buyer_name: "Compradora", buyer_email: "buyer@example.com",
    recipient_name: "Destinataria", recipient_email: "recipient@example.com",
    message: "Un momento para ti.",
  });
  assert.deepEqual(buildGiftCardPurchase({ ...fields, sendToRecipient: false }), {
    ...payload, recipient_name: null, recipient_email: null, message: null,
  });
  assert.throws(() => buildGiftCardPurchase({ ...fields, recipientEmail: "" }), /details/);
});

test("only a valid hosted checkout is returned; a pending gift code is not exposed", async () => {
  let sent;
  const url = await createGiftCardCheckout(fields, async (endpoint, options) => {
    sent = { endpoint, ...options, body: JSON.parse(options.body) };
    return Response.json({ url: checkoutUrl, code: "PENDING-NOT-ACTIVE" });
  });
  assert.equal(url, checkoutUrl);
  assert.equal(sent.endpoint, "https://merktop-payments.odd-forest-9504.workers.dev/pub/gift-cards/buy");
  assert.equal(sent.body.amount, 13725);
  assert.equal(sent.body.business_id, GIFT_CARD_BUSINESS_ID);
  assert.equal(sent.credentials, "omit");
  assert.equal(sent.redirect, "error");
  const newerCheckout = "https://checkout.stripe.com/g/pay/cs_live_example#client";
  assert.equal(await createGiftCardCheckout(fields,
    async () => Response.json({ url: newerCheckout })), newerCheckout);
  for (const target of ["https://example.com/c/pay/fake", "javascript:alert(1)",
    "https://checkout.stripe.com.example.com/c/pay/fake", "https://checkout.stripe.com/other"]) {
    await assert.rejects(createGiftCardCheckout(fields, async () => Response.json({ url: target })), /payment/);
  }
});

test("invalid requests never reach payment; unavailable and rate-limited purchases can be retried", async () => {
  let calls = 0;
  const fetcher = async () => { calls++; return Response.json({ url: checkoutUrl }); };
  await assert.rejects(createGiftCardCheckout({ ...fields, amount: "0" }, fetcher), /amount/);
  await assert.rejects(createGiftCardCheckout({ ...fields, buyerEmail: "" }, fetcher), /details/);
  assert.equal(calls, 0);
  for (const [status, code] of [[400, "details"], [409, "unavailable"], [429, "rateLimit"], [503, "payment"]]) {
    await assert.rejects(createGiftCardCheckout(fields, async () => Response.json({}, { status })), new RegExp(code));
  }
  await assert.rejects(createGiftCardCheckout(fields, async () => { throw new Error("offline"); }), /network/);
});
