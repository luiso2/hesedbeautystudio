import catalog from './booking-catalog.json' with { type: 'json' };

import { servicePricing } from './promotion.js';

export const MAX_ITEMS = 12;
export const itemKey = (item) => `${item.serviceId}/${item.optionId || ''}`;
export function resolveCart(input, now = Date.now()) {
  if (!Array.isArray(input) || !input.length || input.length > MAX_ITEMS) throw new Error('invalid_service');
  const seen = new Set();
  return input.map((item) => {
    const service = catalog.find((entry) => entry.id === item?.serviceId);
    const option = service?.options?.find((entry) => entry.id === item?.optionId);
    const key = itemKey(item || {});
    if (!service || (service.options?.length && !option) || (!service.options?.length && item.optionId) || seen.has(key))
      throw new Error('invalid_service');
    seen.add(key);
    if (item.massagePackage !== undefined && typeof item.massagePackage !== 'boolean')
      throw new Error('invalid_service');
    if (item.massagePackage) {
      if (!service.offersMassagePackage) throw new Error('invalid_service');
      return { serviceId: service.id, optionId: '', name: service.name,
        optionName: { es: 'Paquete de 6 masajes o más', en: 'Package of 6 or more massages' },
        price: null, from: false, massagePackage: true };
    }
    const selected = option || service;
    return { serviceId: service.id, optionId: option?.id || '', name: service.name, optionName: option?.name || null,
      ...servicePricing(selected.price, now), from: !!selected.from };
  });
}
export const STANDARD_DEPOSIT_CENTS = 4000;
// A service that costs less than the standard deposit is paid in full when booking.
export const itemDepositCents = (item) => item.price == null
  ? STANDARD_DEPOSIT_CENTS : Math.min(STANDARD_DEPOSIT_CENTS, Math.round(item.price * 100));
export function cartTotals(items) {
  const knownCents = items.reduce((sum, item) => sum + (item.price == null ? 0 : Math.round(item.price * 100)), 0);
  const hasUnknown = items.some((item) => item.price == null);
  const estimated = hasUnknown || items.some((item) => item.from);
  const depositCents = items.reduce((sum, item) => sum + itemDepositCents(item), 0);
  return { knownCents, hasUnknown, estimated, depositCents,
    paymentTotalCents: estimated ? depositCents : knownCents };
}
