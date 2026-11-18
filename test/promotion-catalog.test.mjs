import test from 'node:test';
import assert from 'node:assert/strict';
import { serveCatalog } from '../src/catalog-promotion.js';
import { PROMO_START, PROMO_END, campaignId } from '../src/promotion.js';

test('catalog prices and search metadata use 30% only above $50, through Cyber Monday in Miami', async () => {
  assert.equal(campaignId, 'black-friday-2026');
  assert.equal(PROMO_END, Date.parse('2026-12-01T05:00:00Z'));
  const graph = { '@graph': [
    { '@type': 'Offer', price: 125 },
    { '@type': 'Offer', price: 50 },
    { '@type': 'Offer', priceSpecification: { minPrice: 300 } },
  ] };
  const html = '<span data-service-price="125">US$125</span><span data-service-price="50">US$50</span>' +
    '<script type="application/ld+json">' + JSON.stringify(graph) + '</script>';
  const assets = { fetch: async () => new Response(html, { headers: { 'content-type': 'text/html', etag: 'static' } }) };
  for (const now of [PROMO_START, PROMO_END - 1, PROMO_END]) {
    const response = await serveCatalog(new Request('https://mariahesed.com/'), assets, now);
    assert.equal(response.headers.get('cache-control'), 'no-store');
    assert.equal(response.headers.get('etag'), null);
    const body = await response.text();
    assert.match(body, /data-service-price="50">US\$50<\/span>/);
    if (now < PROMO_END) {
      assert.match(body, /<del>US\$125<\/del> <b>US\$87.5<\/b> <small>−30%/);
      const metadata = JSON.parse(body.match(/<script type="application\/ld\+json">(.*?)<\/script>/)[1]);
      assert.equal(metadata['@graph'][0].price, 87.5);
      assert.equal(metadata['@graph'][1].price, 50);
      assert.equal(metadata['@graph'][2].priceSpecification.minPrice, 210);
      assert.equal(Date.parse(metadata['@graph'][0].validThrough), PROMO_END - 1);
    } else {
      assert.equal(body, html);
    }
  }
});
