import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import { createHmac } from 'node:crypto';
import worker from '../src/worker.js';
import { resolveCart, cartTotals } from '../src/booking-cart.js';
import links from '../src/payment-links.json' with {type:'json'};
import catalog from '../src/booking-catalog.json' with {type:'json'};

function setup() {
  const db = new DatabaseSync(':memory:');
  for (const file of ['0001_booking_requests','0002_merktop_deposits','0003_multi_service_reviews']) db.exec(readFileSync(new URL(`../migrations/${file}.sql`, import.meta.url),'utf8'));
  const env = { BOOKING_ADMIN_TOKEN:'test-admin', MERKTOP_SITE_READ_KEY:'test-read', MERKTOP_WEBHOOK_SECRET:'test-secret',
    BOOKINGS_DB:{prepare(sql){const stmt=db.prepare(sql);let args=[];const api={bind(...values){args=values;return api},async first(){return stmt.get(...args)||null},async all(){return {results:stmt.all(...args)}},async run(){return {meta:{changes:Number(stmt.run(...args).changes)}}}};return api}} };
  return {db,env};
}
const base='https://mariahesed.com';
const req=(path,body,admin=false,method='POST')=>new Request(base+path,{method,headers:{'Content-Type':'application/json',Origin:base,...(admin?{Authorization:'Bearer test-admin'}:{})},body:body===undefined?undefined:JSON.stringify(body)});
const fields={date:new Date(Date.now()+86400000).toISOString().slice(0,10),time:'10:00',name:'Test Client',phone:'2025550123',consent:'on'};
function mockConfig(){return Response.json({business:{id:'aaeee082-a486-4bee-a1f2-c736d45e6a10',merchant_ready:true,bookings_paused:false},catalog:{services:catalog.flatMap(s=>(s.options||[s]).flatMap(o=>{const id=links[s.options?`${s.id}/${o.id}`:s.id];return id?[{link_id:id,description:s.name.es,deposit_amount:4000,total_amount:o.price==null||o.from?4000:o.price*100,currency:'usd',reservation_mode:o.price==null||!!o.from,pay_url:`https://payments.merktop.com/pay/d/${id}`}]:[]}))}})}
async function eventRequest(id,link,paid,total){const timestamp=Math.floor(Date.now()/1000);const event={id:'evt_'+'b'.repeat(32),type:'deposit.paid',created:timestamp,data:{ref:id,link_id:link,deposit_id:'dep-test',currency:'usd',amount_paid:paid,amount_total:total}};const body=JSON.stringify(event);const sig=createHmac('sha256','test-secret').update(`${timestamp}.${body}`).digest('hex');return new Request(base+'/api/merktop/webhook',{method:'POST',headers:{'merktop-event-id':event.id,'merktop-signature':`t=${timestamp},v1=${sig}`},body})}

test('cart rejects forged IDs, missing zones, duplicates and oversized requests; ignores client prices',()=>{
  const item={serviceId:'facial-detox',price:1};assert.equal(resolveCart([item])[0].price,125);
  for(const invalid of [[],[null],[{serviceId:'fake'}],[{serviceId:'fibroblast-plasma'}],[item,item],Array(13).fill(item)]) assert.throws(()=>resolveCart(invalid));
  assert.equal(resolveCart([{serviceId:'fibroblast-plasma',optionId:'area-1'},{serviceId:'fibroblast-plasma',optionId:'area-3'}]).length,2);
  assert.equal(cartTotals(resolveCart([item,{serviceId:'salmon-dna'}])).depositCents,8000);
});
test('multi-service booking stores authoritative snapshot and signs exact combined payment; webhook requires combined amount',async()=>{
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
test('reviews require a completed visit, a valid private invitation and consent; publish all ratings without exposing booking details',async()=>{
  const {db,env}=setup();const id=crypto.randomUUID();db.prepare("INSERT INTO booking_requests(id,service_id,service_name,requested_date,requested_time,customer_name,customer_phone,status) VALUES(?,?,?,'2020-01-01','10:00','Private Name','2025550999','confirmed')").run(id,'facial-detox','Facial Detox');
  assert.equal((await worker.fetch(req(`/api/admin/bookings/${id}/complete`,{}),env)).status,401);
  const completion=await worker.fetch(req(`/api/admin/bookings/${id}/complete`,{},true),env);assert.equal(completion.status,200);const {review_url}=await completion.json();const token=new URL(review_url).hash.slice(1);
  const review={token,name:'First name',rating:1,comment:'This is a critical but genuine review.',consent:true};
  assert.equal((await worker.fetch(req('/api/reviews',{...review,token:token+'a'}),env)).status,403);
  assert.equal((await worker.fetch(req('/api/reviews',{...review,consent:false}),env)).status,400);
  assert.equal((await worker.fetch(req('/api/reviews',review),env)).status,201);
  assert.equal((await worker.fetch(req('/api/reviews',review),env)).status,409);
  assert.deepEqual((await (await worker.fetch(req('/api/reviews',undefined,false,'GET'),env)).json()).reviews,[]);
  const row=db.prepare('SELECT * FROM customer_reviews').get();assert.equal((await worker.fetch(req('/api/admin/reviews/'+row.id,{status:'published'},true,'PATCH'),env)).status,200);
  const publicResponse=await (await worker.fetch(req('/api/reviews',undefined,false,'GET'),env)).json();assert.equal(publicResponse.reviews[0].rating,1);assert.equal('booking_id' in publicResponse.reviews[0],false);assert.equal('customer_phone' in publicResponse.reviews[0],false);db.close();
});
