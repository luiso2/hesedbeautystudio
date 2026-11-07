// Accept only Google URLs that open a review composer for a specific business.
export function normalizeReviewUrl(value) {
  if (typeof value !== "string" || value.length > 1500) return null;
  let url;
  try {
    url = new URL(value.trim());
  } catch {
    return null;
  }
  if (url.protocol !== "https:" || url.username || url.password || url.port)
    return null;
  if (
    url.hostname === "g.page" &&
    /^\/(?:r\/)?[\w.-]+\/review\/?$/.test(url.pathname)
  ) {
    return url.origin + url.pathname;
  }
  const place = url.searchParams.get("placeid");
  if (
    ["search.google.com", "www.google.com"].includes(url.hostname) &&
    url.pathname === "/local/writereview" &&
    /^[A-Za-z0-9_-]{10,256}$/.test(place || "")
  ) {
    return `https://search.google.com/local/writereview?placeid=${place}`;
  }
  return null;
}

export async function googleReviewUrl(env) {
  const row = await env.BOOKINGS_DB.prepare(
    "SELECT value FROM studio_settings WHERE name = 'google_review_url'",
  ).first();
  return normalizeReviewUrl(row?.value);
}

export async function reviewRoutes(
  request,
  env,
  url,
  { json, readBody, authorized, miamiToday },
) {
  const path = url.pathname;
  if (path === "/api/reviews") {
    if (request.method === "GET")
      return json({ review_url: await googleReviewUrl(env), reviews: [] });
    return json({ error: "local_reviews_retired" }, 410);
  }
  const complete = path.match(
    /^\/api\/admin\/bookings\/([0-9a-f-]{36})\/complete$/,
  );
  if (!complete && path !== "/api/admin/reviews") return null;
  if (!authorized(request, env.BOOKING_ADMIN_TOKEN))
    return json({ error: "unauthorized" }, 401);
  if (path === "/api/admin/reviews" && request.method === "GET") {
    return json({ review_url: await googleReviewUrl(env), reviews: [] });
  }
  if (path === "/api/admin/reviews" && request.method === "PUT") {
    const body = await readBody(request);
    const value = normalizeReviewUrl(body?.review_url);
    if (!value && body?.review_url !== "")
      return json({ error: "invalid_google_review_url" }, 400);
    await env.BOOKINGS_DB.prepare(
      "INSERT INTO studio_settings (name, value) VALUES ('google_review_url', ?) ON CONFLICT(name) DO UPDATE SET value = excluded.value",
    )
      .bind(value || "")
      .run();
    return json({ review_url: value });
  }
  if (complete && request.method === "POST") {
    const row = await env.BOOKINGS_DB.prepare(
      "SELECT id, status, requested_date, requested_time, completed_at FROM booking_requests WHERE id = ?",
    )
      .bind(complete[1])
      .first();
    const nowTime = new Intl.DateTimeFormat("en-GB", {
      timeZone: "America/New_York",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    }).format(new Date());
    const today = miamiToday();
    if (
      !row ||
      row.status !== "confirmed" ||
      row.requested_date > today ||
      (row.requested_date === today && row.requested_time > nowTime)
    )
      return json({ error: "appointment_not_completed" }, 409);
    if (!row.completed_at) {
      row.completed_at = new Date().toISOString();
      await env.BOOKINGS_DB.prepare(
        "UPDATE booking_requests SET completed_at = COALESCE(completed_at, ?), updated_at = CURRENT_TIMESTAMP WHERE id = ?",
      )
        .bind(row.completed_at, row.id)
        .run();
      Object.assign(
        row,
        await env.BOOKINGS_DB.prepare(
          "SELECT completed_at FROM booking_requests WHERE id = ?",
        )
          .bind(row.id)
          .first(),
      );
    }
    return json({ review_url: await googleReviewUrl(env) });
  }
  return json({ error: "not_found" }, 404);
}
