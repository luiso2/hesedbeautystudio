import catalog from './booking-catalog.json' with { type: 'json' };

export const MAX_ITEMS = 12;
export const itemKey = (item) => `${item.serviceId}/${item.optionId || ''}`;
export function resolveCart(input) {
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
      price: selected.price, from: !!selected.from };
  });
}
export function cartTotals(items) {
  const knownCents = items.reduce((sum, item) => sum + (item.price == null ? 0 : Math.round(item.price * 100)), 0);
  const hasUnknown = items.some((item) => item.price == null);
  const estimated = hasUnknown || items.some((item) => item.from);
  // Existing low-price exceptions require the merchant's explicit decision.
  const policyPending = items.some((item) => item.price != null && item.price < 40);
  const depositCents = items.length * 4000;
  return { knownCents, hasUnknown, estimated, policyPending, depositCents,
    paymentTotalCents: estimated ? depositCents : knownCents };
}
