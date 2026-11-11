// Bump the version when changing what the client agrees to.
export const TERMS_VERSION = '2026-11-10.1';

export const bookingTerms = {
  es: {
    title: 'Condiciones de la reserva',
    refundTitle: 'Reembolsos',
    refund: 'Si cambias de decisión, puedes solicitar un reembolso dentro de las 24 horas siguientes al pago. Pasado ese plazo, los pagos por servicios y los depósitos no son reembolsables por cambio de decisión. Para solicitarlo, escribe a María por WhatsApp con tu nombre o referencia de reserva.',
    rights: 'Esta política respeta tus derechos legales, incluidos los que correspondan por un cargo no autorizado o un servicio que el estudio no preste según lo acordado.',
    accept: 'He leído y acepto las condiciones de pago y reembolso.',
    packageTitle: 'Vigencia de tu paquete de masajes',
    package: 'Para paquetes de seis masajes o más, tienes dos meses desde tu primer masaje para completar las sesiones. Si necesitas más tiempo, dispones de 15 días adicionales de gracia. Al terminar ese plazo, las sesiones pendientes vencen y el importe pagado por ellas no es reembolsable, salvo los derechos que te reconozca la ley.',
    packageAccept: 'Acepto el plazo de mi paquete y las condiciones de las sesiones sin utilizar.',
    contact: 'Contactar con María por WhatsApp',
    choosePackage: 'Reservar como paquete de 6 masajes o más',
    packagePrice: 'Precio del paquete por confirmar con María',
    required: 'Para continuar al pago, marca las condiciones que corresponden a tu reserva.',
    updated: 'Las condiciones se actualizaron. Recarga la página para revisarlas antes de pagar.',
  },
  en: {
    title: 'Booking terms',
    refundTitle: 'Refunds',
    refund: 'If you change your mind, you may request a refund within 24 hours of payment. After that, service payments and deposits are nonrefundable for a change of mind. To request a refund, send María your name or booking reference on WhatsApp.',
    rights: 'This policy preserves your legal rights, including those that apply to unauthorized charges or a service the studio does not provide as agreed.',
    accept: 'I have read and agree to the payment and refund terms.',
    packageTitle: 'Your massage package deadline',
    package: 'For packages of six or more massages, you have two months from your first massage to complete your sessions. If you need more time, you have a further 15-day grace period. After that deadline, unused sessions expire and the amount paid for them is nonrefundable, subject to your legal rights.',
    packageAccept: 'I agree to my package deadline and the terms for unused sessions.',
    contact: 'Contact María on WhatsApp',
    choosePackage: 'Book as a package of 6 or more massages',
    packagePrice: 'Confirm the package price with María',
    required: 'To continue to payment, accept the terms that apply to your booking.',
    updated: 'The terms have changed. Reload the page to review them before paying.',
  },
};

export function recordTerms(acceptance, items, customerName) {
  if (!acceptance) throw new Error('terms_required');
  if (acceptance.version !== TERMS_VERSION) throw new Error('terms_version');
  const language = acceptance.language;
  if (!['es', 'en'].includes(language) || acceptance.general !== true) throw new Error('terms_required');
  const packageServices = items.filter(item => item.massagePackage).map(item => item.serviceId);
  if (packageServices.length && acceptance.massagePackage !== true) throw new Error('terms_required');
  const copy = bookingTerms[language];
  return {
    version: TERMS_VERSION, language, customerName, acceptedAt: new Date().toISOString(),
    refund: copy.refund, rights: copy.rights, acceptance: copy.accept,
    ...(packageServices.length && { massagePackage: { services: packageServices, terms: copy.package, acceptance: copy.packageAccept } }),
  };
}
