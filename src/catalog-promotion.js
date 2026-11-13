import { PROMO_END, servicePricing, thanksgivingActive } from './thanksgiving.js';

function updateOffers(fragment, now) {
  if (Array.isArray(fragment)) return fragment.forEach(node => updateOffers(node, now));
  if (!fragment || typeof fragment !== 'object') return;
  if (fragment['@type'] === 'Offer') {
    const specification = fragment.priceSpecification;
    const price = servicePricing(specification?.minPrice ?? fragment.price, now);
    if (price.promotion) {
      if (specification) specification.minPrice = price.price;
      else fragment.price = price.price;
      fragment.validThrough = new Date(PROMO_END - 1).toISOString();
    }
    return;
  }
  Object.values(fragment).forEach(node => updateOffers(node, now));
}

export async function serveCatalog(request, assets, now = Date.now()) {
  // A browser may still send the ETag of the static page it saw before the offer.
  const assetRequest = new Request(request);
  assetRequest.headers.delete('if-none-match');
  assetRequest.headers.delete('if-modified-since');
  const asset = await assets.fetch(assetRequest);
  if (asset.status !== 200 || !asset.headers.get('content-type')?.includes('text/html')) return asset;
  // The asset ETag only represents the undiscounted file. Never cache a seasonal response across its cutoff.
  const headers = new Headers(asset.headers);
  for (const key of ['content-length', 'etag', 'last-modified']) headers.delete(key);
  headers.set('cache-control', 'no-store');
  if (!thanksgivingActive(now) || request.method === 'HEAD') return new Response(asset.body, { headers });
  let html = await asset.text();
  html = html.replace(/<span data-service-price="([\d.]+)">US\$[\d.]+<\/span>/g, (original, amount) => {
    const price = servicePricing(Number(amount), now);
    return price.promotion
      ? `<span data-service-price="${amount}"><del>US$${amount}</del> <b>US$${price.price}</b> <small>−20%</small></span>` : original;
  });
  html = html.replace(/(<script type="application\/ld\+json">)([\s\S]*?)(<\/script>)/g, (_, open, content, close) => {
    const graph = JSON.parse(content);
    updateOffers(graph, now);
    return open + JSON.stringify(graph).replaceAll('<', '\\u003c') + close;
  });
  return new Response(html, { headers });
}
