import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import { createHmac } from 'node:crypto';
import { PROMO_START, PROMO_END, servicePricing } from '../src/thanksgiving.js';
import worker from '../src/worker.js';
import { resolveCart, cartTotals } from '../src/booking-cart.js';
import { TERMS_VERSION, bookingTerms } from '../src/booking-terms.js';
import links from '../src/payment-links.json' with {type:'json'};
import catalog from '../src/booking-catalog.json' with {type:'json'};

function setup() {
  const db = new DatabaseSync(':memory:');
  for (const file of ['0001_booking_requests','0002_merktop_deposits','0003_multi_service_reviews','0004_google_review_link','0005_booking_terms']) db.exec(readFileSync(new URL(`../migrations/${file}.sql`, import.meta.url),'utf8'));
  const env = { BOOKING_ADMIN_TOKEN:'test-admin', MERKTOP_SITE_READ_KEY:'test-read', MERKTOP_WEBHOOK_SECRET:'test-secret',
    BOOKINGS_DB:{prepare(sql){const stmt=db.prepare(sql);let args=[];const api={bind(...values){args=values;return api},async first(){return stmt.get(...args)||null},async all(){return {results:stmt.all(...args)}},async run(){return {meta:{changes:Number(stmt.run(...args).changes)}}}};return api}} };
  return {db,env};
}
const base='https://mariahesed.com';
const req=(path,body,admin=false,method='POST')=>new Request(base+path,{method,headers:{'Content-Type':'application/json',Origin:base,...(admin?{Authorization:'Bearer test-admin'}:{})},body:body===undefined?undefined:JSON.stringify(body)});
const fields={date:new Date(Date.now()+86400000).toISOString().slice(0,10),time:'10:00',name:'Test Client',phone:'2025550123',consent:'on',terms:{version:TERMS_VERSION,language:'es',general:true}};
function mockConfig() {
  const link = (id, description, price, reservationMode) => ({
    link_id: id, description, deposit_amount: 4000, total_amount: reservationMode ? 4000 : price * 100,
    currency: 'usd', reservation_mode: reservationMode, pay_url: `https://payments.merktop.com/pay/d/${id}`,
  });
  const services = [link(links['massage-package'], 'Paquete de masajes (6 sesiones o más)', null, true)];
  for (const service of catalog) {
    for (const entry of service.options || [service]) {
      const id = links[service.options ? `${service.id}/${entry.id}` : service.id];
      if (id) services.push(link(id, service.name.es, entry.price, entry.price == null || !!entry.from));
    }
  }
  return Response.json({
    business: { id: 'aaeee082-a486-4bee-a1f2-c736d45e6a10', merchant_ready: true, bookings_paused: false },
    catalog: { services },
  });
}
async function eventRequest(id,link,paid,total){const timestamp=Math.floor(Date.now()/1000);const event={id:'evt_'+'b'.repeat(32),type:'deposit.paid',created:timestamp,data:{ref:id,link_id:link,deposit_id:'dep-test',currency:'usd',amount_paid:paid,amount_total:total}};const body=JSON.stringify(event);const sig=createHmac('sha256','test-secret').update(`${timestamp}.${body}`).digest('hex');return new Request(base+'/api/merktop/webhook',{method:'POST',headers:{'merktop-event-id':event.id,'merktop-signature':`t=${timestamp},v1=${sig}`},body})}

test('cart rejects forged IDs, missing zones, duplicates and oversized requests; ignores client prices',()=>{
  const item={serviceId:'facial-detox',price:1};assert.equal(resolveCart([item], PROMO_START - 1)[0].price,125);
  for(const invalid of [[],[null],[{serviceId:'fake'}],[{serviceId:'fibroblast-plasma'}],[item,item],Array(13).fill(item)]) assert.throws(()=>resolveCart(invalid));
  assert.equal(resolveCart([{serviceId:'fibroblast-plasma',optionId:'area-1'},{serviceId:'fibroblast-plasma',optionId:'area-3'}]).length,2);
  assert.equal(cartTotals(resolveCart([item,{serviceId:'salmon-dna'}])).depositCents,8000);
});
test('multi-service booking stores authoritative snapshot and signs exact combined payment; webhook requires combined amount',async(t)=>{
  t.mock.method(Date, 'now', () => PROMO_END);
  const {db,env}=setup();const original=globalThis.fetch;globalThis.fetch=async()=>mockConfig();
  try {
    const response=await worker.fetch(req('/api/bookings',{...fields,items:[{serviceId:'facial-detox',price:1},{serviceId:'salmon-dna'}]}),env);
    assert.equal(response.status,201);const booking=await response.json();const url=new URL(booking.payment_url);
    assert.equal(booking.deposit_cents,8000);assert.equal(url.searchParams.get('tot'),'34500');
    const canonical=`v2.0.0.${links['facial-detox']}.8000.34500.${url.searchParams.get('desc')}`;
    assert.equal(url.searchParams.get('sig'),createHmac('sha256','test-secret').update(canonical).digest('hex'));
    const row=db.prepare('SELECT * FROM booking_requests WHERE id=?').get(booking.id);
    assert.equal(JSON.parse(row.items_json).length,2);assert.equal(row.price_cents,34500);assert.equal(row.status,'pending');
    assert.equal((await worker.fetch(await eventRequest(booking.id,row.merktop_link_id,4000,34500),env)).status,422);
    assert.equal((await worker.fetch(await eventRequest(booking.id,row.merktop_link_id,8000,34500),env)).status,200);
    assert.equal(db.prepare('SELECT payment_status FROM booking_requests WHERE id=?').get(booking.id).payment_status,'paid');
  } finally{globalThis.fetch=original;db.close()}
});
test('mixed quoted/from-price services collect per-service deposits without asserting a final balance',async()=>{
  const {db,env}=setup();const original=globalThis.fetch;globalThis.fetch=async()=>mockConfig();
  try{const response=await worker.fetch(req('/api/bookings',{...fields,items:[{serviceId:'facial-detox'},{serviceId:'fibroblast-parpado'}]}),env);assert.equal(response.status,201);const b=await response.json();const u=new URL(b.payment_url);assert.equal(u.searchParams.get('dep'),'8000');assert.equal(u.searchParams.get('tot'),'8000');const row=db.prepare('SELECT * FROM booking_requests WHERE id=?').get(b.id);assert.equal(row.price_cents,null);assert.equal(row.price_from,1)}finally{globalThis.fetch=original;db.close()}
});
test('low-price deposit decisions cannot silently overcharge',async()=>{
  const {db,env}=setup();const r=await worker.fetch(req('/api/bookings',{...fields,items:[{serviceId:'depilacion-cera',optionId:'area-2'}]}),env);assert.equal(r.status,409);assert.equal(db.prepare('SELECT COUNT(*) n FROM booking_requests').get().n,0);db.close();
});
test('only the admin can enable a Google composer, which replaces local reviews and personal invitations', async () => {
  const { db, env } = setup();
  const settingsPath = '/api/admin/reviews';
  const publicSettings = async () => (await worker.fetch(req('/api/reviews', undefined, false, 'GET'), env)).json();
  const save = (review_url, admin = true) => worker.fetch(req(settingsPath, { review_url }, admin, 'PUT'), env);
  assert.equal((await publicSettings()).review_url, null);
  const link = 'https://g.page/r/test-fixture/review';
  assert.equal((await save(link, false)).status, 401);
  for (const invalid of ['https://example.com/review','https://g.page.example.org/r/test/review','https://g.page/r/test','https://g.page/r/test/../redirect']) {
    assert.equal((await save(invalid)).status, 400);
  }
  assert.equal((await save(link)).status, 200);
  assert.equal((await publicSettings()).review_url, link);
  assert.equal((await worker.fetch(req('/api/reviews', { rating: 5 }), env)).status, 410);
  const id = crypto.randomUUID();
  db.prepare("INSERT INTO booking_requests(id,service_id,service_name,requested_date,requested_time,customer_name,customer_phone,status) VALUES(?,?,?,'2020-01-01','10:00','Private Name','2025550999','confirmed')").run(id, 'facial-detox', 'Facial Detox');
  const complete = `/api/admin/bookings/${id}/complete`;
  assert.equal((await worker.fetch(req(complete, {}), env)).status, 401);
  const result = await worker.fetch(req(complete, {}, true), env);
  assert.equal((await result.json()).review_url, link);
  assert.equal((await save('')).status, 200);
  assert.equal((await publicSettings()).review_url, null);
  db.close();
});

test('payment terms are required before creating a link or storing a booking', async () => {
  const { env, db } = setup();
  const cases = [
    ['facial-detox', undefined, 'terms_required'],
    ['facial-detox', { ...fields.terms, general: false }, 'terms_required'],
    ['facial-detox', { ...fields.terms, version: 'old' }, 'terms_version'],
    ['facial-detox', { ...fields.terms, language: 'unknown' }, 'terms_required'],
    ['brazilian-slim', fields.terms, 'terms_required'],
  ];
  try {
    for (const [serviceId, terms, error] of cases) {
      const items = [{ serviceId, massagePackage: serviceId === 'brazilian-slim' }];
      const result = await worker.fetch(req('/api/bookings', { ...fields, terms, items }), env);
      assert.equal(result.status, 400);
      assert.equal((await result.json()).error, error);
    }
    assert.equal(db.prepare('SELECT count(*) AS n FROM booking_requests').get().n, 0);
  } finally { db.close(); }
});

test('a single massage accepts general terms only, and only eligible services offer massage packages', () => {
  const offered = catalog.filter(service => service.offersMassagePackage).map(service => service.id);
  assert.deepEqual(offered, ['drenaje-linfatico-manual', 'brazilian-slim', 'maderoterapia-corporal',
    'metalterapia-sculpt', 'hesed-body-sculpt']);
  for (const serviceId of ['yoga-facial', 'radiofrecuencia-corporal', 'kinesio-body'])
    assert.throws(() => resolveCart([{ serviceId, massagePackage: true }]));
  assert.throws(() => resolveCart([{ serviceId: 'brazilian-slim', massagePackage: 'false' }]));
  assert.equal(resolveCart([{ serviceId: 'brazilian-slim' }], PROMO_END)[0].price, 95);
});

test('quoted massage packages use the package deposit and store the exact terms in the accepted language', async () => {
  const { db, env } = setup();
  const original = globalThis.fetch;
  globalThis.fetch = async () => mockConfig();
  try {
    for (const language of ['es', 'en']) {
      const items = [{ serviceId: 'facial-detox' }, { serviceId: 'brazilian-slim', massagePackage: true }];
      const terms = { ...fields.terms, language, massagePackage: true };
      const response = await worker.fetch(req('/api/bookings', { ...fields, items, terms }), env);
      assert.equal(response.status, 201);
      const booking = await response.json();
      const url = new URL(booking.payment_url);
      assert.equal(url.pathname, '/pay/d/' + links['massage-package']);
      assert.equal(url.searchParams.get('dep'), '8000');
      assert.equal(url.searchParams.get('tot'), '8000');
      assert.match(url.searchParams.get('desc'), /Brazilian Slim · Paquete/);
      const row = db.prepare('SELECT * FROM booking_requests WHERE id=?').get(booking.id);
      assert.equal(row.price_cents, null);
      const saved = JSON.parse(row.terms_json);
      assert.equal(saved.version, TERMS_VERSION);
      assert.equal(saved.language, language);
      assert.equal(saved.refund, bookingTerms[language].refund);
      assert.equal(saved.customerName, fields.name);
      assert.ok(Date.parse(saved.acceptedAt));
      assert.deepEqual(saved.massagePackage.services, ['brazilian-slim']);
      assert.equal(saved.massagePackage.terms, bookingTerms[language].package);
    }
    const response = await worker.fetch(req('/api/bookings', { ...fields, items: [{serviceId: 'brazilian-slim'}] }), env);
    assert.equal(response.status, 201);
    const booking = await response.json();
    const row = db.prepare('SELECT terms_json FROM booking_requests WHERE id=?').get(booking.id);
    assert.equal(JSON.parse(row.terms_json).massagePackage, undefined);
  } finally { globalThis.fetch = original; db.close(); }
});

test('Thanksgiving prices count each service and zone independently and expire at Miami midnight', () => {
  for (const when of [PROMO_START - 1, PROMO_END]) assert.deepEqual(servicePricing(55, when), { price: 55 });
  for (const when of [PROMO_START, PROMO_END - 1]) {
    for (const price of [null, 30, 50]) assert.deepEqual(servicePricing(price, when), { price });
    const items = resolveCart([
      { serviceId: 'depilacion-cera', optionId: 'area-10' },
      { serviceId: 'depilacion-cera', optionId: 'area-12' },
      { serviceId: 'fibroblast-plasma', optionId: 'area-4' },
    ], when);
    assert.deepEqual(items.map(item => item.price), [50, 44, 240]);
    assert.equal(items[2].from, true);
    assert.equal(cartTotals(items).knownCents, 33400);
  }
});

test('Thanksgiving signed checkout charges the right deposit and records the discounted balance', async t => {
  t.mock.method(Date, 'now', () => PROMO_START + 86400000);
  const {db, env} = setup();
  t.mock.method(globalThis, 'fetch', async () => mockConfig());
  try {
    const items = [{serviceId: 'facial-detox'}, {serviceId: 'fibroblast-plasma', optionId:'area-5'}];
    const stale = await worker.fetch(req('/api/bookings', {...fields, items, quotedTotalCents: 17500}), env);
    assert.equal(stale.status, 409);
    const res = await worker.fetch(req('/api/bookings', {...fields, items, quotedTotalCents: 15000}), env);
    assert.equal(res.status, 201);
    const { id, payment_url, deposit_cents } = await res.json();
    const url = new URL(payment_url), label = url.searchParams.get('desc');
    assert.match(label, /Thanksgiving −20% · Ahorro US\$25/);
    assert.equal(url.searchParams.get('tot'), '15000');
    assert.equal(deposit_cents, 8000);
    const canonical = `v2.0.0.${links['facial-detox']}.${deposit_cents}.15000.${label}`;
    assert.equal(url.searchParams.get('sig'), createHmac('sha256', 'test-secret').update(canonical).digest('hex'));
    const row = db.prepare('SELECT * FROM booking_requests WHERE id=?').get(id);
    assert.equal(row.payment_total_cents, 15000);
    assert.deepEqual(JSON.parse(row.items_json).map(item => item.price), [100, 50]);
    assert.equal((await worker.fetch(await eventRequest(id, row.merktop_link_id, deposit_cents, 15000), env)).status, 200);
  } finally { db.close(); }
});
