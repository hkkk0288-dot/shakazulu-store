import { Currency, DarAreaId, DeliveryMethod, Language, OrderItemSnapshot, PaymentMethod, Product, SizeOption } from '../types';

export const USD_EXCHANGE_RATE = 2650;
export const VACUUM_PACK_FEE_TZS = 3000;
export const FREE_DAR_DELIVERY_THRESHOLD_TZS = 50000;
export const WHATSAPP_NUMBER = '255756999885';
export const WHATSAPP_DISPLAY = '+255 756 999 885';
export const PHONE_DISPLAY = '0651 441 441';

export const SIZE_OPTIONS: { id: SizeOption; multiplier: number; labelEn: string; labelSw: string }[] = [
  { id: '250g', multiplier: 1, labelEn: '250g', labelSw: '250g' },
  { id: '500g', multiplier: 1.9, labelEn: '500g', labelSw: '500g' },
  { id: '1kg', multiplier: 3.6, labelEn: '1kg', labelSw: '1kg' },
  { id: '5kg', multiplier: 18, labelEn: '5kg Bulk Bucket', labelSw: 'Ndoo ya 5kg (Jumla)' },
];

export const DAR_AREAS: { id: DarAreaId; name: string; feeTzs: number; etaEn: string; etaSw: string }[] = [
  { id: 'mabibo', name: 'Mabibo', feeTzs: 3000, etaEn: '30–45 min (Bodaboda)', etaSw: 'Dakika 30–45 (Bodaboda)' },
  { id: 'kariakoo', name: 'Kariakoo', feeTzs: 4000, etaEn: '35–50 min (Bodaboda)', etaSw: 'Dakika 35–50 (Bodaboda)' },
  { id: 'kinondoni', name: 'Kinondoni', feeTzs: 4500, etaEn: '40–55 min (Bodaboda)', etaSw: 'Dakika 40–55 (Bodaboda)' },
  { id: 'mikocheni', name: 'Mikocheni', feeTzs: 5000, etaEn: '45–60 min (Bodaboda)', etaSw: 'Dakika 45–60 (Bodaboda)' },
  { id: 'temeke', name: 'Temeke', feeTzs: 5000, etaEn: '45–60 min (Bodaboda)', etaSw: 'Dakika 45–60 (Bodaboda)' },
  { id: 'masaki', name: 'Masaki', feeTzs: 6000, etaEn: '50–70 min (Bajaji/Boda)', etaSw: 'Dakika 50–70 (Bajaji/Boda)' },
  { id: 'mbezi', name: 'Mbezi', feeTzs: 7000, etaEn: '60–80 min (Bajaji)', etaSw: 'Dakika 60–80 (Bajaji)' },
];

export function roundTzs(value: number): number {
  return Math.round(value / 100) * 100;
}

export function getRetailUnitPriceTzs(basePrice250g: number, size: SizeOption): number {
  const option = SIZE_OPTIONS.find((s) => s.id === size);
  const mult = option ? option.multiplier : 1;
  return roundTzs(basePrice250g * mult);
}

export interface LinePricing {
  unitRetailTzs: number;
  unitFinalTzs: number;
  lineRetailTzs: number;
  lineFinalTzs: number;
  savingsTzs: number;
  isWholesaleApplied: boolean;
  discountPercent: number;
}

export function calculateLinePricing(
  basePrice250g: number,
  size: SizeOption,
  quantity: number,
  wholesaleDiscount: number
): LinePricing {
  const safeQty = Math.max(1, quantity);
  const unitRetailTzs = getRetailUnitPriceTzs(basePrice250g, size);
  const clampedDiscount = Math.max(0, Math.min(40, wholesaleDiscount));
  const qualifiesWholesale = size === '5kg' || safeQty >= 5;
  const discountPercent = qualifiesWholesale ? clampedDiscount : 0;
  const unitFinalTzs = qualifiesWholesale
    ? roundTzs(unitRetailTzs * (1 - clampedDiscount / 100))
    : unitRetailTzs;

  const lineRetailTzs = unitRetailTzs * safeQty;
  const lineFinalTzs = unitFinalTzs * safeQty;
  const savingsTzs = Math.max(0, lineRetailTzs - lineFinalTzs);

  return {
    unitRetailTzs,
    unitFinalTzs,
    lineRetailTzs,
    lineFinalTzs,
    savingsTzs,
    isWholesaleApplied: qualifiesWholesale && discountPercent > 0,
    discountPercent,
  };
}

export function convertTzsToCurrency(amountTzs: number, currency: Currency): number {
  if (currency === 'USD') {
    return Number((amountTzs / USD_EXCHANGE_RATE).toFixed(2));
  }
  return Math.round(amountTzs);
}

export function formatPrice(amountTzs: number, currency: Currency): string {
  if (currency === 'USD') {
    const usd = amountTzs / USD_EXCHANGE_RATE;
    return `$${usd.toFixed(2)}`;
  }
  return `${Math.round(amountTzs).toLocaleString('en-US')} TZS`;
}

export function formatRawAmount(amount: number, currency: Currency): string {
  if (currency === 'USD') {
    return `$${amount.toFixed(2)}`;
  }
  return `${Math.round(amount).toLocaleString('en-US')} TZS`;
}

export function calculateWholesaleProfit(basePrice250g: number, wholesaleDiscount: number) {
  const bulkPricing = calculateLinePricing(basePrice250g, '5kg', 1, wholesaleDiscount);
  const retailResaleValueTzs = basePrice250g * 20; // 5kg = 20 x 250g packs
  const estimatedProfitTzs = Math.max(0, retailResaleValueTzs - bulkPricing.unitFinalTzs);
  const marginPercent =
    retailResaleValueTzs > 0 ? Math.round((estimatedProfitTzs / retailResaleValueTzs) * 100) : 0;

  return {
    bulkCostTzs: bulkPricing.unitFinalTzs,
    retailResaleValueTzs,
    estimatedProfitTzs,
    marginPercent,
  };
}

export function getDeliveryFeeTzs(
  method: DeliveryMethod,
  darArea?: DarAreaId,
  subtotalAfterPromoTzs = 0
): number | null {
  if (method === 'store_pickup') return 0;
  if (method === 'dar_delivery') {
    if (subtotalAfterPromoTzs >= FREE_DAR_DELIVERY_THRESHOLD_TZS) {
      return 0;
    }
    const found = DAR_AREAS.find((a) => a.id === darArea);
    return found ? found.feeTzs : DAR_AREAS[0].feeTzs;
  }
  return null; // upcountry_bus & international_dhl are confirmed/quoted on WhatsApp
}

export interface WhatsAppPayload {
  orderId?: string;
  language: Language;
  currency: Currency;
  customerName: string;
  customerPhone: string;
  items: OrderItemSnapshot[];
  vacuumPacked: boolean;
  vacuumFeeTzs: number;
  deliveryMethod: DeliveryMethod;
  deliveryLocation: string;
  deliveryFeeTzs: number | null;
  paymentMethod: PaymentMethod;
  subtotalTzs: number;
  savingsTzs: number;
  promoCode?: string;
  promoDiscountTzs?: number;
  totalTzs: number;
  notes?: string;
}

export function buildWhatsAppOrderUrl(payload: WhatsAppPayload): string {
  const {
    orderId,
    language,
    currency,
    customerName,
    customerPhone,
    items,
    vacuumPacked,
    vacuumFeeTzs,
    deliveryMethod,
    deliveryLocation,
    deliveryFeeTzs,
    paymentMethod,
    subtotalTzs,
    savingsTzs,
    promoCode,
    promoDiscountTzs = 0,
    totalTzs,
    notes,
  } = payload;

  const isSw = language === 'sw';

  const deliveryLabels: Record<DeliveryMethod, { en: string; sw: string }> = {
    dar_delivery: { en: 'Dar es Salaam Delivery', sw: 'Usafiri Dar es Salaam' },
    upcountry_bus: { en: 'Upcountry Bus Parcel (Mikoani)', sw: 'Basi la Mikoani' },
    international_dhl: { en: 'International Shipping (DHL / EMS)', sw: 'Usafirishaji Nje ya Nchi (DHL / EMS)' },
    store_pickup: { en: 'Store Pickup (Dar es Salaam)', sw: 'Kuchukua Dukani (Dar es Salaam)' },
  };

  const paymentLabels: Record<PaymentMethod, string> = {
    mpesa: 'M-Pesa',
    mixx_yas: 'Mixx by Yas',
    airtel_money: 'Airtel Money',
    card: 'Card (Visa/Mastercard)',
    whatsapp: isSw ? 'Agiza kupitia WhatsApp' : 'Order via WhatsApp',
  };

  const lines: string[] = [];
  lines.push(isSw ? '🛍️ *ODA MPYA — SHAKAZULU STORE*' : '🛍️ *NEW ORDER — SHAKAZULU STORE*');
  if (orderId) {
    lines.push(`${isSw ? 'Namba ya Oda' : 'Order ID'}: *#${orderId}*`);
  }
  lines.push(`${isSw ? 'Mteja' : 'Customer'}: ${customerName || '-'}`);
  if (customerPhone) {
    lines.push(`${isSw ? 'Simu' : 'Phone'}: ${customerPhone}`);
  }
  lines.push('');
  lines.push(isSw ? '*Bidhaa:*' : '*Items:*');

  items.forEach((item, idx) => {
    const itemName = isSw ? item.nameSw : item.nameEn;
    const sizeLabel = item.size === '5kg' ? (isSw ? 'Ndoo ya 5kg' : '5kg Bulk Bucket') : item.size;
    const wholesaleTag = item.isWholesale ? (isSw ? ' [Bei ya Jumla]' : ' [Wholesale]') : '';
    lines.push(
      `${idx + 1}. ${itemName} (${sizeLabel}) × ${item.quantity}${wholesaleTag} — ${formatPrice(item.lineTotalTzs, currency)}`
    );
  });

  lines.push('');
  lines.push(
    `${isSw ? 'Vacuum Packing' : 'Vacuum Packing'}: ${
      vacuumPacked
        ? `${isSw ? 'Ndiyo' : 'Yes'} (+${formatPrice(vacuumFeeTzs, currency)})`
        : isSw
          ? 'Hapana'
          : 'No'
    }`
  );
  lines.push(
    `${isSw ? 'Njia ya Usafiri' : 'Delivery'}: ${deliveryLabels[deliveryMethod][language]} (${deliveryLocation})`
  );
  lines.push(`${isSw ? 'Malipo' : 'Payment'}: ${paymentLabels[paymentMethod]}`);
  lines.push('');
  lines.push(`${isSw ? 'Jumla ya Bidhaa' : 'Subtotal'}: ${formatPrice(subtotalTzs, currency)}`);
  if (savingsTzs > 0) {
    lines.push(`${isSw ? 'Punguzo la Jumla' : 'Wholesale Savings'}: -${formatPrice(savingsTzs, currency)}`);
  }
  if (promoCode && promoDiscountTzs > 0) {
    lines.push(
      `${isSw ? 'Kuponi' : 'Promo'} (${promoCode}): -${formatPrice(promoDiscountTzs, currency)}`
    );
  }
  if (vacuumPacked) {
    lines.push(`${isSw ? 'Gharama ya Vacuum' : 'Vacuum Packing'}: ${formatPrice(vacuumFeeTzs, currency)}`);
  }
  lines.push(
    `${isSw ? 'Gharama ya Usafiri' : 'Delivery Fee'}: ${
      deliveryFeeTzs === null
        ? isSw
          ? 'Kuthibitishwa WhatsApp'
          : 'Quoted on WhatsApp'
        : deliveryFeeTzs === 0
          ? isSw
            ? 'Bure'
            : 'Free'
          : formatPrice(deliveryFeeTzs, currency)
    }`
  );
  lines.push(`*${isSw ? 'JUMLA KUU' : 'GRAND TOTAL'}: ${formatPrice(totalTzs, currency)}*`);

  if (notes && notes.trim()) {
    lines.push('');
    lines.push(`${isSw ? 'Maelezo' : 'Notes'}: ${notes.trim()}`);
  }

  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(lines.join('\n'))}`;
}

export function getDisplayProductName(product: Product, language: Language): string {
  return language === 'sw' && product.nameSw ? product.nameSw : product.nameEn;
}
