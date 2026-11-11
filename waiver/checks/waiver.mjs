import test from "node:test";
import assert from "node:assert/strict";
import { PDFDocument } from "pdf-lib";
import { studio } from "./runtime.mjs";
import { version } from "../shared/form.js";
test("Private invitations, consent, encrypted archive, PDF copies and idempotent replay", async (t) => {
  const { runtime, db, mail } = await studio();
  t.after(() => runtime.dispose());
  const call = (path, body, headers = {}, method = body ? "POST" : "GET") =>
    runtime.dispatchFetch("http://localhost/api/" + path, {
      method,
      headers: { "Content-Type": "application/json", ...headers },
      body: body && JSON.stringify(body),
    });
  const auth = { authorization: "Bearer test-access" };
  assert.equal((await call("admin/archive")).status, 401);
  const invited = await call(
    "admin/invite",
    { mode: "email", email: "client@example.org", lang: "en" },
    auth,
  );
  assert.equal(invited.status, 201);
  const {
    tickets: [ticket],
  } = await invited.json();
  const hdr = { "X-Waiver-Key": ticket.token };
  const d = {
    id: ticket.id,
    lang: "en",
    version,
    name: "Ana María",
    dob: "1990-05-14",
    email: "client@example.org",
    phone: "555-0100",
    emergency: "Emergency contact",
    provider: "María Hesed",
    date: "2026-11-10",
    serviceOther: "",
    healthOther: "",
    meds: "",
    notes: "",
    services: ["wood"],
    health: ["none"],
    ack: true,
    eSign: true,
    photo: "unset",
    method: "typed",
    typed: "Ana María",
    ink: [],
    signedAt: new Date().toISOString(),
  };
  assert.equal((await call("sign", d)).status, 403);
  assert.equal((await call("sign", { ...d, ack: false }, hdr)).status, 400);
  assert.equal(
    (await call("sign", { ...d, email: "other@example.org" }, hdr)).status,
    422,
  );
  assert.equal(
    (await call("sign", { ...d, health: ["none", "other"] }, hdr)).status,
    400,
  );
  const signed = await call("sign", d, hdr);
  assert.equal(signed.status, 201, await signed.text());
  assert.equal((await call("sign", d, hdr)).status, 200);
  assert.equal(
    (await call("sign", { ...d, name: "Changed" }, hdr)).status,
    409,
  );
  assert.equal((await call("ticket", null, hdr)).status, 409);
  assert.equal((await call("admin/record/" + ticket.id)).status, 401);
  const pdf = Buffer.from(
    await (await call("admin/record/" + ticket.id, null, auth)).arrayBuffer(),
  );
  assert.ok((await PDFDocument.load(pdf)).getPageCount() >= 2);
  for (let i = 0; i < 40 && mail.length < 3; i++)
    await new Promise((r) => setTimeout(r, 100));
  assert.equal(mail.length, 3);
  for (const addr of ["studio@example.org", "client@example.org"]) {
    const copy = mail.find((m) => m.attachments && m.to[0] === addr);
    assert.ok(copy);
    assert.deepEqual(Buffer.from(copy.attachments[0].content, "base64"), pdf);
  }
  const signedRow = await db
    .prepare("SELECT details,pdf FROM signed_forms")
    .first();
  assert.ok(!Buffer.from(signedRow.details).includes("Ana María"));
  assert.ok(!Buffer.from(signedRow.pdf).includes("%PDF"));
  assert.equal(
    (await (await call("admin/archive", null, auth)).json()).records[0].name,
    d.name,
  );
  assert.equal(
    (await call("admin/record/" + ticket.id, null, auth, "DELETE")).status,
    200,
  );
  assert.equal(
    (await call("admin/record/" + ticket.id, null, auth)).status,
    404,
  );
});

test("One-use studio email links, remembered devices and signed-out shared tablets", async t => {
  const { runtime, db, mail } = await studio();
  t.after(() => runtime.dispose());
  const post = (path, body, headers = {}) => runtime.dispatchFetch("http://localhost/api/access/" + path, {
    method: "POST", headers: { "Content-Type": "application/json", ...headers }, body: JSON.stringify(body),
  });
  const archive = (headers = {}) => runtime.dispatchFetch("http://localhost/api/admin/archive", { headers });
  assert.equal((await post("request", {}, { Origin: "https://other.example" })).status, 403);
  assert.equal((await post("request", { lang: "es", email: "other@example.org" })).status, 200);
  assert.equal((await post("request", {})).status, 429);
  assert.equal(mail.length, 1);
  assert.deepEqual(mail[0].to, ["studio@example.org"]);
  const token = mail[0].text.match(/#access=([a-f0-9]{64})/)[1];
  assert.equal((await archive({ "X-Waiver-Key": token })).status, 401);
  const responses = await Promise.all([post("redeem", { token }), post("redeem", { token })]);
  assert.deepEqual(responses.map(r => r.status).sort(), [200, 403]);
  const response = responses.find(r => r.ok);
  const { device } = await response.json();
  const setCookie = response.headers.get("Set-Cookie");
  assert.match(setCookie, /HttpOnly; Secure; SameSite=Strict; Max-Age=2592000/);
  const cookie = setCookie.split(";")[0];
  const headers = { Cookie: cookie, "X-Waiver-Device": device };
  assert.equal((await archive({ Cookie: cookie })).status, 401);
  assert.equal((await archive({ "X-Waiver-Device": device })).status, 401);
  assert.equal((await archive(headers)).status, 200);
  const row = await db.prepare("SELECT link_hash,session_hash FROM studio_access").first();
  assert.notEqual(row.link_hash, token);
  assert.notEqual(row.session_hash, device);
  assert.ok(!cookie.includes(row.session_hash));
  const bye = await post("logout", {}, headers);
  assert.match(bye.headers.get("Set-Cookie"), /Max-Age=0/);
  assert.equal((await archive(headers)).status, 401);
  assert.equal((await post("redeem", { token })).status, 403);
  assert.equal((await post("request", { lang: "en" })).status, 200);
  const expired = mail[1].text.match(/#access=([a-f0-9]{64})/)[1];
  await db.prepare("UPDATE studio_access SET issued=issued-901 WHERE session_hash IS NULL").run();
  assert.equal((await post("redeem", { token: expired })).status, 403);
});
