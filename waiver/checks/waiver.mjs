import { createHash } from "node:crypto";
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

test("María’s private entrance opens on multiple devices, locks for signing and can be revoked", async t => {
  const { runtime, db, mail } = await studio();
  t.after(() => runtime.dispose());
  const post = (path, body, headers = {}) => runtime.dispatchFetch("http://localhost/api/access/" + path, {
    method: "POST", headers: { "Content-Type": "application/json", ...headers }, body: JSON.stringify(body),
  });
  const archive = (headers = {}) => runtime.dispatchFetch("http://localhost/api/admin/archive", { headers });
  const token = "f".repeat(64);
  const digest = createHash("sha256").update(token).digest("hex");
  await db.prepare("INSERT INTO studio_entrance(slot,token_hash) VALUES(1,?)").bind(digest).run();
  const entry = "http://localhost/acceso/" + token;
  const preview = await runtime.dispatchFetch(entry);
  assert.equal(preview.status, 200);
  assert.equal(preview.headers.get("Set-Cookie"), null);
  assert.match(preview.headers.get("Cache-Control"), /no-store/);
  assert.equal(preview.headers.get("Referrer-Policy"), "no-referrer");
  const shell = await preview.text();
  assert.match(shell, /waiver-[A-Z0-9]+\.js/);
  assert.ok(!shell.includes(token));
  assert.equal((await db.prepare("SELECT COUNT(*) AS n FROM studio_access").first()).n, 0);
  assert.equal((await post("request", { lang: "es" })).status, 404);
  assert.equal((await post("studio", { token }, { Origin: "https://other.example" })).status, 403);
  assert.equal((await post("studio", { token: "a".repeat(64) })).status, 403);
  assert.equal((await post("redeem", { token })).status, 403);
  assert.equal((await archive({ "X-Waiver-Key": token })).status, 401);
  const open = async () => {
    const response = await post("studio", { token });
    assert.equal(response.status, 200);
    const { device } = await response.json();
    const cookie = response.headers.get("Set-Cookie");
    assert.match(cookie, /HttpOnly; Secure; SameSite=Strict; Max-Age=2592000/);
    return { Cookie: cookie.split(";")[0], "X-Waiver-Device": device };
  };
  const tablet = await open(), phone = await open();
  assert.notEqual(tablet.Cookie, phone.Cookie);
  assert.equal((await archive({ Cookie: tablet.Cookie })).status, 401);
  assert.equal((await archive({ "X-Waiver-Device": tablet["X-Waiver-Device"] })).status, 401);
  assert.equal((await archive(tablet)).status, 200);
  const reused = await post("studio", { token }, tablet);
  assert.equal(reused.status, 200);
  assert.equal(reused.headers.get("Set-Cookie"), null);
  assert.equal((await reused.json()).device, tablet["X-Waiver-Device"]);
  const bye = await post("logout", {}, tablet);
  assert.match(bye.headers.get("Set-Cookie"), /Max-Age=0/);
  assert.equal((await archive(tablet)).status, 401);
  assert.equal((await archive(phone)).status, 200);
  const reopened = await open();
  assert.equal((await archive(reopened)).status, 200);
  await db.prepare("DELETE FROM studio_entrance WHERE slot=1").run();
  assert.equal((await post("studio", { token })).status, 403);
  assert.equal((await archive(phone)).status, 401);
  assert.equal((await archive(reopened)).status, 401);
  assert.equal(mail.length, 0);
});

test("installed launches restore the copied device cookie and renew only a valid session", async t => {
  const { runtime, db } = await studio();
  t.after(() => runtime.dispose());
  const get = (path, headers = {}) => runtime.dispatchFetch("http://localhost" + path, { headers });
  const manifest = await (await get("/manifest.webmanifest")).json();
  assert.equal(manifest.id, "/");
  assert.equal(manifest.display, "standalone");
  assert.match(await (await get(manifest.start_url)).text(), /waiver-[A-Z0-9]+\.js/);
  const token = "3".repeat(64);
  const hash = value => createHash("sha256").update(value).digest("hex");
  await db.prepare("INSERT INTO studio_entrance(slot,token_hash) VALUES(1,?)").bind(hash(token)).run();
  const post = (path, body, headers = {}) => runtime.dispatchFetch("http://localhost/api/access/" + path, {
    method: "POST", headers: { "Content-Type": "application/json", ...headers }, body: JSON.stringify(body),
  });
  const link = await post("studio", { token });
  const cookies = link.headers.getSetCookie();
  const device = (await link.json()).device;
  assert.ok(cookies.some(c => c.startsWith("__Host-waiver-device=" + device + ";") && !c.includes("HttpOnly")));
  const installed = { Cookie: cookies.map(c => c.split(";")[0]).join("; "), "X-Waiver-Device": device };
  assert.equal((await get("/api/admin/archive", { Cookie: installed.Cookie })).status, 401);
  const time = Math.floor(Date.now() / 1000);
  await db.prepare("UPDATE studio_access SET session_expires=?").bind(time + 60).run();
  const launch = await get("/api/admin/archive", installed);
  assert.equal(launch.status, 200);
  assert.equal(launch.headers.getSetCookie().length, 2);
  assert.ok((await db.prepare("SELECT session_expires FROM studio_access").first()).session_expires >= time + 30*86400);
  const logout = await post("logout", {}, installed);
  assert.ok(logout.headers.getSetCookie().every(c => c.includes("Max-Age=0")));
  assert.equal((await get("/api/admin/archive", installed)).status, 401);
});

test("previously issued email links still work once during their original lifetime", async t => {
  const { runtime, db } = await studio();
  t.after(() => runtime.dispose());
  const token = "d".repeat(64), digest = createHash("sha256").update(token).digest("hex");
  await db.prepare("INSERT INTO studio_access(link_hash,issued) VALUES(?,?)")
    .bind(digest, Math.floor(Date.now()/1000)).run();
  const redeem = () => runtime.dispatchFetch("http://localhost/api/access/redeem", {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token }),
  });
  const responses = await Promise.all([redeem(), redeem()]);
  assert.deepEqual(responses.map(r => r.status).sort(), [200, 403]);
});
