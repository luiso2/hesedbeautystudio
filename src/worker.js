import catalog from "./booking-catalog.json";

const json = (data, status = 200) =>
  Response.json(data, {
    status,
    headers: { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" },
  });

const clean = (value, limit) =>
  typeof value === "string"
    ? value.trim().replace(/[\u0000-\u001f\u007f]/g, " ").slice(0, limit)
    : "";

const miamiToday = () => {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const pick = (type) => parts.find((part) => part.type === type).value;
  return `${pick("year")}-${pick("month")}-${pick("day")}`;
};

const validDate = (value) => {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T12:00:00Z`);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) return false;
  const today = miamiToday();
  const latest = new Date(`${today}T12:00:00Z`);
  latest.setUTCDate(latest.getUTCDate() + 180);
  return value >= today && value <= latest.toISOString().slice(0, 10);
};

async function readBody(request) {
  if (!request.headers.get("content-type")?.includes("application/json")) return null;
  const length = Number(request.headers.get("content-length") || 0);
  if (length > 4096) return null;
  if (!request.body) return null;
  const reader = request.body.getReader();
  const chunks = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > 4096) {
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
  try {
    return JSON.parse(new TextDecoder().decode(bytes));
  } catch {
    return null;
  }
}

function authorized(request, secret) {
  if (!secret) return false;
  const token = request.headers.get("authorization")?.replace(/^Bearer /i, "") || "";
  const actual = new TextEncoder().encode(token);
  const expected = new TextEncoder().encode(secret);
  if (actual.length !== expected.length) return false;
  let difference = 0;
  for (let i = 0; i < expected.length; i++) difference |= actual[i] ^ expected[i];
  return difference === 0;
}

async function createBooking(request, env) {
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin)
    return json({ error: "invalid_origin" }, 403);
  const body = await readBody(request);
  if (!body || typeof body !== "object" || Array.isArray(body))
    return json({ error: "invalid_request" }, 400);
  if (body.website) return json({ error: "invalid_request" }, 400);

  const service = catalog.find((entry) => entry.id === body.serviceId);
  const option = service?.options?.find((entry) => entry.id === body.optionId);
  if (!service || (service.options?.length && !option) || (!service.options && body.optionId))
    return json({ error: "invalid_service" }, 400);

  const date = body.date;
  const time = body.time;
  const name = clean(body.name, 100);
  const phone = clean(body.phone, 30);
  const email = clean(body.email, 150);
  const note = clean(body.note, 600);
  if (
    !validDate(date) ||
    typeof time !== "string" ||
    !/^([01]\d|2[0-3]):[0-5]\d$/.test(time) ||
    name.length < 2 ||
    !/^[+()\d\s.-]{10,30}$/.test(phone) ||
    phone.replace(/\D/g, "").length < 10 ||
    body.consent !== "on" ||
    (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
  ) return json({ error: "invalid_fields" }, 400);

  const recent = await env.BOOKINGS_DB.prepare(
    "SELECT COUNT(*) AS count FROM booking_requests WHERE customer_phone = ? AND created_at > datetime('now', '-1 hour')",
  ).bind(phone).first();
  if (recent?.count >= 3) return json({ error: "rate_limited" }, 429);

  const id = crypto.randomUUID();
  const selected = option || service;
  await env.BOOKINGS_DB.prepare(
    `INSERT INTO booking_requests
     (id, service_id, option_id, service_name, option_name, price_cents, price_from,
      requested_date, requested_time, customer_name, customer_phone, customer_email, customer_note)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).bind(
    id,
    service.id,
    option?.id || null,
    service.name.es,
    option?.name.es || null,
    selected.price == null ? null : selected.price * 100,
    selected.from ? 1 : 0,
    date,
    time,
    name,
    phone,
    email || null,
    note || null,
  ).run();
  return json({ id, status: "pending" }, 201);
}

async function adminBookings(request, env, url) {
  if (!env.BOOKING_ADMIN_TOKEN) return json({ error: "not_configured" }, 503);
  if (!authorized(request, env.BOOKING_ADMIN_TOKEN))
    return json({ error: "unauthorized" }, 401);

  if (url.pathname === "/api/admin/bookings" && request.method === "GET") {
    const status = url.searchParams.get("status");
    const allowed = ["pending", "confirmed", "declined", "cancelled"];
    if (status && !allowed.includes(status)) return json({ error: "invalid_status" }, 400);
    const statement = status
      ? env.BOOKINGS_DB.prepare("SELECT * FROM booking_requests WHERE status = ? ORDER BY created_at DESC LIMIT 200").bind(status)
      : env.BOOKINGS_DB.prepare("SELECT * FROM booking_requests ORDER BY created_at DESC LIMIT 200");
    const { results } = await statement.all();
    return json({ bookings: results });
  }

  const match = url.pathname.match(/^\/api\/admin\/bookings\/([0-9a-f-]{36})$/);
  if (match && request.method === "PATCH") {
    const body = await readBody(request);
    if (!body || !["confirmed", "declined", "cancelled", "pending"].includes(body.status))
      return json({ error: "invalid_status" }, 400);
    try {
      const result = await env.BOOKINGS_DB.prepare(
        "UPDATE booking_requests SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
      ).bind(body.status, match[1]).run();
      if (!result.meta.changes) return json({ error: "not_found" }, 404);
      return json({ id: match[1], status: body.status });
    } catch (error) {
      if (String(error).includes("UNIQUE constraint failed"))
        return json({ error: "slot_taken" }, 409);
      throw error;
    }
  }
  return json({ error: "not_found" }, 404);
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (!url.pathname.startsWith("/api/")) return json({ error: "not_found" }, 404);
    if (!env.BOOKINGS_DB) return json({ error: "not_configured" }, 503);
    try {
      if (url.pathname === "/api/bookings" && request.method === "POST")
        return await createBooking(request, env);
      if (url.pathname.startsWith("/api/admin/bookings"))
        return await adminBookings(request, env, url);
      return json({ error: "not_found" }, 404);
    } catch (error) {
      console.error(JSON.stringify({ event: "booking_api_error", path: url.pathname, message: String(error) }));
      return json({ error: "server_error" }, 500);
    }
  },
};
