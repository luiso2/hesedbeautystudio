const encoder = new TextEncoder();
async function signature(secret, value) {
  const key = await crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const digest = await crypto.subtle.sign('HMAC', key, encoder.encode(value));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}
export async function reviewLink(row, secret, origin) {
  const sig = await signature(secret, `review:${row.id}:${row.completed_at}`);
  return `${origin}/resena#${row.id}.${sig}`;
}
export async function reviewRoutes(request, env, url, { json, readBody, authorized, clean, miamiToday }) {
  const path = url.pathname;
  if (path === '/api/reviews' && request.method === 'GET') {
    const { results } = await env.BOOKINGS_DB.prepare(
      "SELECT display_name, rating, comment, created_at FROM customer_reviews WHERE status = 'published' ORDER BY created_at DESC LIMIT 50",
    ).all();
    return json({ reviews: results });
  }
  if (path === '/api/reviews' && request.method === 'POST') {
    if (request.headers.get('origin') && request.headers.get('origin') !== url.origin) return json({ error: 'invalid_origin' }, 403);
    const body = await readBody(request);
    if (!body || body.website || body.consent !== true || !Number.isInteger(body.rating) || body.rating < 1 || body.rating > 5)
      return json({ error: 'invalid_fields' }, 400);
    const name = clean(body.name, 60), comment = clean(body.comment, 1500);
    if (name.length < 2 || comment.length < 10) return json({ error: 'invalid_fields' }, 400);
    const match = /^([0-9a-f-]{36})\.([0-9a-f]{64})$/.exec(body.token || '');
    if (!match || !env.BOOKING_ADMIN_TOKEN) return json({ error: 'invalid_invitation' }, 403);
    const row = await env.BOOKINGS_DB.prepare('SELECT id, completed_at FROM booking_requests WHERE id = ? AND completed_at IS NOT NULL').bind(match[1]).first();
    if (!row) return json({ error: 'invalid_invitation' }, 403);
    const expected = await signature(env.BOOKING_ADMIN_TOKEN, `review:${row.id}:${row.completed_at}`);
    let diff = 0; for (let i = 0; i < expected.length; i++) diff |= expected.charCodeAt(i) ^ match[2].charCodeAt(i);
    if (diff) return json({ error: 'invalid_invitation' }, 403);
    const result = await env.BOOKINGS_DB.prepare(
      "INSERT OR IGNORE INTO customer_reviews (id, booking_id, display_name, rating, comment) VALUES (?, ?, ?, ?, ?)",
    ).bind(crypto.randomUUID(), row.id, name, body.rating, comment).run();
    if (!result.meta.changes) return json({ error: 'already_reviewed' }, 409);
    return json({ status: 'pending' }, 201);
  }
  if (!path.startsWith('/api/admin/')) return null;
  const complete = path.match(/^\/api\/admin\/bookings\/([0-9a-f-]{36})\/complete$/);
  const moderate = path.match(/^\/api\/admin\/reviews\/([0-9a-f-]{36})$/);
  if (!complete && !moderate && path !== '/api/admin/reviews') return null;
  if (!authorized(request, env.BOOKING_ADMIN_TOKEN)) return json({ error: 'unauthorized' }, 401);
  if (complete && request.method === 'POST') {
    const row = await env.BOOKINGS_DB.prepare('SELECT id, status, requested_date, requested_time, completed_at FROM booking_requests WHERE id = ?').bind(complete[1]).first();
    const nowTime = new Intl.DateTimeFormat('en-GB', { timeZone: 'America/New_York', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(new Date());
    const today = miamiToday();
    if (!row || row.status !== 'confirmed' || row.requested_date > today || (row.requested_date === today && row.requested_time > nowTime))
      return json({ error: 'appointment_not_completed' }, 409);
    if (!row.completed_at) {
      row.completed_at = new Date().toISOString();
      await env.BOOKINGS_DB.prepare('UPDATE booking_requests SET completed_at = COALESCE(completed_at, ?), updated_at = CURRENT_TIMESTAMP WHERE id = ?').bind(row.completed_at, row.id).run();
      Object.assign(row, await env.BOOKINGS_DB.prepare('SELECT completed_at FROM booking_requests WHERE id = ?').bind(row.id).first());
    }
    return json({ review_url: await reviewLink(row, env.BOOKING_ADMIN_TOKEN, url.origin) });
  }
  if (path === '/api/admin/reviews' && request.method === 'GET') {
    const { results } = await env.BOOKINGS_DB.prepare('SELECT * FROM customer_reviews ORDER BY created_at DESC LIMIT 200').all();
    return json({ reviews: results });
  }
  if (moderate && request.method === 'PATCH') {
    const body = await readBody(request);
    if (!['pending', 'published', 'hidden'].includes(body?.status)) return json({ error: 'invalid_status' }, 400);
    const result = await env.BOOKINGS_DB.prepare('UPDATE customer_reviews SET status = ? WHERE id = ?').bind(body.status, moderate[1]).run();
    return result.meta.changes ? json({ ok: true }) : json({ error: 'not_found' }, 404);
  }
  return json({ error: 'not_found' }, 404);
}
