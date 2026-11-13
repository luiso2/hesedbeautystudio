// The campaign follows Miami time. Eligibility is per service or treatment area.
export const PROMO_START = Date.parse('2026-11-13T00:00:00-05:00');
export const PROMO_END = Date.parse('2026-11-27T00:00:00-05:00');
export const campaignId = 'thanksgiving-2026';

export function thanksgivingActive(now = Date.now()) {
  return now >= PROMO_START && now < PROMO_END;
}

export function servicePricing(price, now = Date.now()) {
  if (price == null || price <= 50 || !thanksgivingActive(now)) return { price };
  const cents = Math.round(price * 100);
  return { basePrice: price, price: Math.round(cents * 0.8) / 100, promotion: campaignId };
}

export function offerEndLabel(lang) {
  return new Intl.DateTimeFormat(lang === 'en' ? 'en-US' : 'es-US', {
    month: 'long', day: 'numeric', timeZone: 'America/New_York',
  }).format(PROMO_END - 1);
}
