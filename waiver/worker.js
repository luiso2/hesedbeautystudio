import {
  validForm,
  validEmail,
  emailFingerprint,
  version,
} from "./shared/form.js";
import { makePdf } from "./shared/pdf.js";

const enc = new TextEncoder(),
  dec = new TextDecoder();
const now = () => Math.floor(Date.now() / 1000);
function json(data, status = 200) {
  return Response.json(data, {
    status,
    headers: {
      "Cache-Control": "no-store",
      "Referrer-Policy": "no-referrer",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
const hex = (bytes) =>
  Array.from(new Uint8Array(bytes), (v) =>
    v.toString(16).padStart(2, "0"),
  ).join("");
const hash = async (s) =>
  hex(await crypto.subtle.digest("SHA-256", enc.encode(s)));
const randomToken = () => hex(crypto.getRandomValues(new Uint8Array(32)));
const uuid = /^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/;
class Invalid extends Error {
  constructor(code, status = 400) {
    super(code);
    this.status = status;
  }
}
async function read(request) {
  if (!request.headers.get("Content-Type")?.startsWith("application/json"))
    throw new Invalid("json_required", 415);
  const reader = request.body?.getReader();
  if (!reader) throw new Invalid("empty");
  let length = 0;
  const chunks = [];
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    length += value.length;
    if (length > 128000) {
      await reader.cancel();
      throw new Invalid("too_large", 413);
    }
    chunks.push(value);
  }
  try {
    return JSON.parse(await new Blob(chunks).text());
  } catch {
    throw new Invalid("invalid_json");
  }
}
async function key(env) {
  return crypto.subtle.importKey(
    "raw",
    Uint8Array.from(atob(env.RECORD_KEY), (c) => c.charCodeAt(0)),
    "AES-GCM",
    false,
    ["encrypt", "decrypt"],
  );
}
async function seal(env, aad, bytes) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const cipher = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv, additionalData: enc.encode(aad) },
    await key(env),
    bytes,
  );
  const packed = new Uint8Array(12 + cipher.byteLength);
  packed.set(iv);
  packed.set(new Uint8Array(cipher), 12);
  return packed.buffer;
}
async function open(env, aad, raw) {
  const b = new Uint8Array(raw);
  return crypto.subtle.decrypt(
    { name: "AES-GCM", iv: b.slice(0, 12), additionalData: enc.encode(aad) },
    await key(env),
    b.slice(12),
  );
}
const pack = (env, aad, v) => seal(env, aad, enc.encode(JSON.stringify(v)));
const unpack = async (env, aad, v) =>
  JSON.parse(dec.decode(await open(env, aad, v)));
const sql = (env, query, ...args) => env.DB.prepare(query).bind(...args);
async function admin(request, env) {
  const authorization = request.headers.get("Authorization") || "";
  if (!/^Bearer \S{1,512}$/.test(authorization))
    throw new Invalid("unauthorized", 401);
  const r = await env.STUDIO.fetch("https://mariahesed.com/api/admin/session", {
    headers: { authorization },
  });
  if (r.ok && (await r.json().catch(() => null))?.authenticated === true)
    return;
  throw new Invalid(
    r.status === 401 ? "unauthorized" : "admin_unavailable",
    r.status === 401 ? 401 : 503,
  );
}
async function job(env, id, kind, meta) {
  const jid = id + "/" + kind;
  return sql(
    env,
    "INSERT INTO mail_jobs(id,waiver_id,kind,destination,due) VALUES(?,?,?,?,?)",
    jid,
    id,
    kind,
    await pack(env, jid, meta),
    now(),
  );
}
async function issue(body, env, ctx) {
  if (
    !["tablet", "link", "email"].includes(body?.mode) ||
    (body.mode === "email" && !validEmail(body.email))
  )
    throw new Invalid("invalid_invitation");
  const lang = body.lang === "en" ? "en" : "es";
  const tickets = [],
    batch = [];
  for (let i = 0; i < (body.mode === "tablet" ? 10 : 1); i++) {
    const id = crypto.randomUUID(),
      token = randomToken(),
      expires = now() + 86400 * (body.mode === "tablet" ? 90 : 30);
    const mail = body.mode === "email" ? body.email.trim().toLowerCase() : null;
    const emailHash = mail ? await emailFingerprint(token, mail) : null;
    batch.push(
      sql(
        env,
        "INSERT INTO invitations(token_hash,id,kind,expires,email_hash) VALUES(?,?,?,?,?)",
        await hash(token),
        id,
        body.mode,
        expires,
        emailHash,
      ),
    );
    tickets.push({ id, token, expires });
    if (mail)
      batch.push(
        await job(env, id, "invite", {
          to: mail,
          lang,
          url:
            env.PUBLIC_ORIGIN + "/#sign=" + token + "." + id + "&lang=" + lang,
        }),
      );
  }
  await env.DB.batch(batch);
  if (body.mode === "email") ctx.waitUntil(deliver(env));
  return json({ tickets }, 201);
}
async function ticket(request, env) {
  const token = request.headers.get("X-Waiver-Key") || "";
  if (!/^[a-f0-9]{64}$/.test(token)) throw new Invalid("invalid_link", 403);
  const row = await sql(
    env,
    "SELECT id,kind,expires,email_hash,used FROM invitations WHERE token_hash=?",
    await hash(token),
  ).first();
  if (!row) throw new Invalid("invalid_link", 403);
  return { row, token };
}
async function sign(request, env, ctx) {
  const { row, token } = await ticket(request, env);
  const d = await read(request);
  if (
    !validForm(d) ||
    d.id !== row.id ||
    Date.parse(d.signedAt) > Date.now() + 600000
  )
    throw new Invalid("invalid_form");
  if (
    row.email_hash &&
    (await emailFingerprint(token, d.email)) !== row.email_hash
  )
    throw new Invalid("email_mismatch", 422);
  const digest = await hash(JSON.stringify(d));
  async function existing() {
    const old = await sql(
      env,
      "SELECT digest FROM signed_forms WHERE id=?",
      row.id,
    ).first();
    if (old?.digest === digest) return json({ id: row.id, stored: true });
    if (old) throw new Invalid("already_signed", 409);
    return null;
  }
  if (row.used)
    return (await existing()) || json({ error: "already_signed" }, 409);
  if (
    row.expires <
    (row.kind === "tablet" ? Date.parse(d.signedAt) / 1000 : now())
  )
    throw new Invalid("expired", 410);
  const pdf = await makePdf(d, row.id);
  const statements = [
    sql(
      env,
      "INSERT INTO signed_forms(id,received,digest,details,pdf) VALUES(?,?,?,?,?)",
      row.id,
      now(),
      digest,
      await pack(env, row.id, d),
      await seal(env, row.id + "/pdf", pdf),
    ),
    await job(env, row.id, "client", { to: d.email, lang: d.lang }),
    await job(env, row.id, "studio", { to: env.STUDIO_EMAIL, lang: "es" }),
  ];
  try {
    await env.DB.batch(statements);
  } catch (error) {
    const prior = await existing();
    if (prior) return prior;
    throw error;
  }
  ctx.waitUntil(deliver(env));
  return json({ id: row.id, stored: true }, 201);
}
function base64(bytes) {
  let s = "";
  const b = new Uint8Array(bytes);
  for (let i = 0; i < b.length; i += 16384)
    s += String.fromCharCode(...b.subarray(i, i + 16384));
  return btoa(s);
}
export async function deliver(env, send = fetch) {
  const { results } = await sql(
    env,
    "SELECT id,waiver_id,kind,destination,attempts FROM mail_jobs WHERE sent IS NULL AND due<=? ORDER BY due,id LIMIT 8",
    now(),
  ).all();
  for (const j of results) {
    const claim = await sql(
      env,
      "UPDATE mail_jobs SET due=?,attempts=attempts+1 WHERE id=? AND sent IS NULL AND due<=?",
      now() + 180,
      j.id,
      now(),
    ).run();
    if (!claim.meta.changes) continue;
    try {
      const meta = await unpack(env, j.id, j.destination),
        en = meta.lang === "en",
        invite = j.kind === "invite";
      const message = {
        from: env.MAIL_FROM,
        to: [meta.to],
        reply_to: env.STUDIO_EMAIL,
        subject: invite
          ? en
            ? "Your consent form · María Hesed"
            : "Tu consentimiento para firmar · María Hesed"
          : en
            ? "Your signed copy · María Hesed"
            : "Copia del consentimiento firmado · María Hesed",
        text: invite
          ? (en
              ? "Please review and sign your private form before your treatment."
              : "Antes de tu tratamiento, revisa y firma tu formulario privado.") +
            "\n\n" +
            meta.url +
            "\n\nMaría Hesed · Aesthetic Studio"
          : (en
              ? "Your signed document is attached. Keep this copy for your records."
              : "Adjuntamos el consentimiento firmado en PDF para tus archivos.") +
            "\n\nMaría Hesed · Aesthetic Studio",
      };
      if (!invite) {
        const row = await sql(
          env,
          "SELECT pdf FROM signed_forms WHERE id=?",
          j.waiver_id,
        ).first();
        message.attachments = [
          {
            filename: "Maria-Hesed-" + j.waiver_id + ".pdf",
            content: base64(await open(env, j.waiver_id + "/pdf", row.pdf)),
          },
        ];
      }
      const res = await send("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: "Bearer " + env.MAIL_KEY,
          "Content-Type": "application/json",
          "Idempotency-Key": j.id,
        },
        body: JSON.stringify(message),
        signal: AbortSignal.timeout(15000),
      });
      if (!res.ok) throw new Error("provider_" + res.status);
      await sql(
        env,
        "UPDATE mail_jobs SET sent=?,error=NULL,destination=x'' WHERE id=?",
        now(),
        j.id,
      ).run();
    } catch (e) {
      const delay = Math.min(21600, 60 * 2 ** Math.min(j.attempts, 9));
      await sql(
        env,
        "UPDATE mail_jobs SET due=?,error=? WHERE id=?",
        now() + delay,
        /^provider_\d+$/.test(e.message) ? e.message : "delivery_error",
        j.id,
      ).run();
    }
  }
}
async function archive(url, env) {
  const before = Number(
    url.searchParams.get("before") || Number.MAX_SAFE_INTEGER,
  );
  if (!Number.isSafeInteger(before)) throw new Invalid("invalid_cursor");
  const { results } = await sql(
    env,
    `SELECT s.rowid AS cursor,s.id,s.received,s.details,
    (SELECT COUNT(*) FROM mail_jobs j WHERE j.waiver_id=s.id AND j.kind!='invite' AND j.sent IS NOT NULL) AS sent
    FROM signed_forms s WHERE s.rowid<? ORDER BY s.rowid DESC LIMIT 21`,
    before,
  ).all();
  const records = [];
  for (const r of results.slice(0, 20)) {
    const d = await unpack(env, r.id, r.details);
    records.push({ id: r.id, name: d.name, date: d.date, sent: r.sent });
  }
  return json({
    records,
    next: results.length > 20 ? results[19].cursor : null,
  });
}
export default {
  async scheduled(_, env, ctx) {
    ctx.waitUntil(deliver(env));
  },
  async fetch(request, env, ctx) {
    const url = new URL(request.url),
      path = url.pathname;
    if (!path.startsWith("/api/")) return env.ASSETS.fetch(request);
    try {
      if (path.startsWith("/api/admin/")) {
        await admin(request, env);
        if (path === "/api/admin/archive" && request.method === "GET")
          return await archive(url, env);
        if (path === "/api/admin/invite" && request.method === "POST")
          return await issue(await read(request), env, ctx);
        const id = path.split("/").pop();
        if (
          path.startsWith("/api/admin/invitation/") &&
          uuid.test(id) &&
          request.method === "GET"
        ) {
          const j = await sql(
            env,
            "SELECT sent FROM mail_jobs WHERE id=?",
            id + "/invite",
          ).first();
          return j
            ? json({ state: j.sent ? "sent" : "pending" })
            : json({ error: "not_found" }, 404);
        }
        if (path.startsWith("/api/admin/record/") && uuid.test(id)) {
          if (request.method === "GET") {
            const row = await sql(
              env,
              "SELECT pdf FROM signed_forms WHERE id=?",
              id,
            ).first();
            if (!row) throw new Invalid("not_found", 404);
            return new Response(await open(env, id + "/pdf", row.pdf), {
              headers: {
                "Content-Type": "application/pdf",
                "Cache-Control": "no-store",
                "Content-Disposition":
                  'attachment; filename="Maria-Hesed-' + id + '.pdf"',
                "X-Content-Type-Options": "nosniff",
              },
            });
          }
          if (request.method === "DELETE") {
            await env.DB.batch([
              sql(env, "DELETE FROM mail_jobs WHERE waiver_id=?", id),
              sql(env, "DELETE FROM signed_forms WHERE id=?", id),
              sql(env, "DELETE FROM invitations WHERE id=?", id),
            ]);
            return json({ deleted: true });
          }
        }
      }
      if (path === "/api/ticket" && request.method === "GET") {
        const { row } = await ticket(request, env);
        if (row.used) throw new Invalid("already_signed", 409);
        if (row.expires < now()) throw new Invalid("expired", 410);
        return json({
          id: row.id,
          expires: row.expires,
          emailHash: row.email_hash,
          version,
        });
      }
      if (path === "/api/sign" && request.method === "POST")
        return await sign(request, env, ctx);
      return json({ error: "not_found" }, 404);
    } catch (e) {
      return e instanceof Invalid
        ? json({ error: e.message }, e.status)
        : json({ error: "temporarily_unavailable" }, 503);
    }
  },
};
