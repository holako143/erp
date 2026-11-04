/**
 * RLM ERP - Enterprise Coupons, Discounts & Promotional Offers Engine
 * Pure, deterministic validation & calculation logic for POS and B2B Sales
 */

import { IndustryType, InvoiceItem, PromoCoupon, PromotionalOffer } from '../types/erp';

export interface CouponValidationResult {
  valid: boolean;
  code: string;
  couponId?: string;
  coupon?: PromoCoupon;
  discountAmount: number;
  netSubtotal: number;
  reasonCode?:
    | 'EMPTY_CODE'
    | 'NOT_FOUND'
    | 'INACTIVE'
    | 'EXPIRED'
    | 'NOT_STARTED'
    | 'USAGE_LIMIT_REACHED'
    | 'BELOW_MIN_ORDER'
    | 'INDUSTRY_MISMATCH';
  messageAr: string;
  messageEn: string;
  reasonAr: string;
  reasonEn: string;
}

export interface AutomaticOfferEvaluationResult {
  appliedOfferId?: string;
  appliedOfferTitleAr?: string;
  appliedOfferTitleEn?: string;
  offerDiscountAmount: number;
}

export const SEED_PROMO_COUPONS: PromoCoupon[] = [
  {
    id: 'cpn-solar-10',
    tenantId: 'ten-1',
    code: 'SOLAR10',
    nameAr: 'خصم مشاريع الطاقة الشمسية والبطاريات 10%',
    nameEn: 'Solar & Battery Systems 10% Discount',
    titleAr: 'خصم مشاريع الطاقة الشمسية والبطاريات 10%',
    titleEn: 'Solar & Battery Systems 10% Discount',
    discountType: 'PERCENTAGE',
    discountValue: 10,
    minOrderAmount: 500,
    minInvoiceAmount: 500,
    maxDiscountAmount: 2500,
    validFrom: '2025-01-01',
    validUntil: '2028-12-31',
    usageLimit: 500,
    usedCount: 14,
    isActive: true,
    applicableIndustry: 'ALL',
  },
  {
    id: 'cpn-vip-250',
    tenantId: 'ten-1',
    code: 'VIP250',
    nameAr: 'كوبون كبار العملاء خصم نقدي مباشر 250',
    nameEn: 'VIP Direct Cash Discount 250',
    titleAr: 'كوبون كبار العملاء خصم نقدي مباشر 250',
    titleEn: 'VIP Direct Cash Discount 250',
    discountType: 'FIXED_AMOUNT',
    discountValue: 250,
    minOrderAmount: 1500,
    minInvoiceAmount: 1500,
    validFrom: '2025-01-01',
    validUntil: '2028-12-31',
    usageLimit: 200,
    usedCount: 8,
    isActive: true,
    applicableIndustry: 'ALL',
  },
  {
    id: 'cpn-welcome-5',
    tenantId: 'ten-1',
    code: 'WELCOME5',
    nameAr: 'كوبون ترحيبي فوري 5% لجميع الفواتير',
    nameEn: 'Welcome Instant 5% Off All Orders',
    titleAr: 'كوبون ترحيبي فوري 5% لجميع الفواتير',
    titleEn: 'Welcome Instant 5% Off All Orders',
    discountType: 'PERCENTAGE',
    discountValue: 5,
    minOrderAmount: 100,
    minInvoiceAmount: 100,
    maxDiscountAmount: 1000,
    validFrom: '2025-01-01',
    validUntil: '2028-12-31',
    usageLimit: 1000,
    usedCount: 42,
    isActive: true,
    applicableIndustry: 'ALL',
  },
  {
    id: 'cpn-expired-99',
    tenantId: 'ten-1',
    code: 'EXPIRED2024',
    nameAr: 'كوبون موسمي منتهي الصلاحية',
    nameEn: 'Expired Seasonal Coupon',
    titleAr: 'كوبون موسمي منتهي الصلاحية',
    titleEn: 'Expired Seasonal Coupon',
    discountType: 'PERCENTAGE',
    discountValue: 20,
    minOrderAmount: 100,
    minInvoiceAmount: 100,
    validFrom: '2024-01-01',
    validUntil: '2024-12-31',
    usageLimit: 100,
    usedCount: 100,
    isActive: true,
    applicableIndustry: 'ALL',
  },
];

export const SEED_PROMOTIONAL_OFFERS: PromotionalOffer[] = [
  {
    id: 'off-solar-bundle',
    tenantId: 'ten-1',
    titleAr: 'عرض باقة الطاقة المتكاملة (عند شراء 4 قطع أو أكثر خصم إضافي 5%)',
    titleEn: 'Solar & Electronics Bulk Bundle (4+ Units -> Extra 5% Off)',
    nameAr: 'عرض باقة الطاقة المتكاملة (عند شراء 4 قطع أو أكثر خصم إضافي 5%)',
    nameEn: 'Solar & Electronics Bulk Bundle (4+ Units -> Extra 5% Off)',
    offerType: 'BUY_X_GET_DISCOUNT',
    minQty: 4,
    minOrderAmount: 1000,
    discountPercent: 5,
    badgeTextAr: 'عرض الكميات 5%',
    isActive: true,
    validUntil: '2028-12-31',
  },
  {
    id: 'off-seasonal-tech',
    tenantId: 'ten-1',
    titleAr: 'العرض الموسمي للإلكترونيات والشاشات الذكية (خصم 3% للطلبات فوق 10 وحدات)',
    titleEn: 'Seasonal Tech Offer (3% Off 10+ Units)',
    nameAr: 'العرض الموسمي للإلكترونيات والشاشات الذكية (خصم 3% للطلبات فوق 10 وحدات)',
    nameEn: 'Seasonal Tech Offer (3% Off 10+ Units)',
    offerType: 'SEASONAL_SALE',
    minQty: 10,
    minOrderAmount: 2500,
    discountPercent: 3,
    badgeTextAr: 'عرض موسمي 3%',
    isActive: true,
    validUntil: '2028-12-31',
  },
];

/**
 * Validates a promo coupon code against order subtotal, date range, usage cap, and industry
 */
export function validateAndCalculateCouponDiscount(params: {
  code: string;
  subtotal?: number;
  subtotalAmount?: number;
  coupons: PromoCoupon[];
  activeIndustry?: IndustryType;
  nowIso?: string;
}): CouponValidationResult {
  const {
    code,
    subtotal,
    subtotalAmount,
    coupons,
    activeIndustry = 'electronics',
    nowIso = new Date().toISOString().slice(0, 10),
  } = params;

  const cleanCode = (code || '').trim().toUpperCase();
  const rawSub = subtotal !== undefined ? subtotal : subtotalAmount;
  const safeSubtotal = Math.max(0, Number(rawSub) || 0);

  if (!cleanCode) {
    const msgAr = 'يرجى إدخال رمز الكوبون أولاً';
    const msgEn = 'Please enter a coupon code first';
    return {
      valid: false,
      code: '',
      discountAmount: 0,
      netSubtotal: safeSubtotal,
      reasonCode: 'EMPTY_CODE',
      messageAr: msgAr,
      messageEn: msgEn,
      reasonAr: msgAr,
      reasonEn: msgEn,
    };
  }

  const found = coupons.find((c) => c.code.trim().toUpperCase() === cleanCode);
  if (!found) {
    const msgAr = `رمز الكوبون (${cleanCode}) غير موجود في النظام`;
    const msgEn = `Coupon code (${cleanCode}) does not exist`;
    return {
      valid: false,
      code: cleanCode,
      discountAmount: 0,
      netSubtotal: safeSubtotal,
      reasonCode: 'NOT_FOUND',
      messageAr: msgAr,
      messageEn: msgEn,
      reasonAr: msgAr,
      reasonEn: msgEn,
    };
  }

  if (!found.isActive) {
    const msgAr = `الكوبون (${cleanCode}) موقوف حالياً من قبل الإدارة`;
    const msgEn = `Coupon (${cleanCode}) is currently deactivated`;
    return {
      valid: false,
      code: cleanCode,
      couponId: found.id,
      coupon: found,
      discountAmount: 0,
      netSubtotal: safeSubtotal,
      reasonCode: 'INACTIVE',
      messageAr: msgAr,
      messageEn: msgEn,
      reasonAr: msgAr,
      reasonEn: msgEn,
    };
  }

  const dateOnly = nowIso.slice(0, 10);
  if (found.validFrom && dateOnly < found.validFrom.slice(0, 10)) {
    const msgAr = `لم تبدأ فترة سريان الكوبون (${cleanCode}) بعد`;
    const msgEn = `Coupon (${cleanCode}) is not active yet`;
    return {
      valid: false,
      code: cleanCode,
      couponId: found.id,
      coupon: found,
      discountAmount: 0,
      netSubtotal: safeSubtotal,
      reasonCode: 'NOT_STARTED',
      messageAr: msgAr,
      messageEn: msgEn,
      reasonAr: msgAr,
      reasonEn: msgEn,
    };
  }

  if (found.validUntil && dateOnly > found.validUntil.slice(0, 10)) {
    const msgAr = `انتهت صلاحية الكوبون (${cleanCode}) بتاريخ ${found.validUntil}`;
    const msgEn = `Coupon (${cleanCode}) expired on ${found.validUntil}`;
    return {
      valid: false,
      code: cleanCode,
      couponId: found.id,
      coupon: found,
      discountAmount: 0,
      netSubtotal: safeSubtotal,
      reasonCode: 'EXPIRED',
      messageAr: msgAr,
      messageEn: msgEn,
      reasonAr: msgAr,
      reasonEn: msgEn,
    };
  }

  if (found.usageLimit > 0 && found.usedCount >= found.usageLimit) {
    const msgAr = `استنفد الكوبون (${cleanCode}) الحد الأقصى للاستخدام (${found.usageLimit} مرة)`;
    const msgEn = `Coupon (${cleanCode}) has reached its maximum usage limit (${found.usageLimit})`;
    return {
      valid: false,
      code: cleanCode,
      couponId: found.id,
      coupon: found,
      discountAmount: 0,
      netSubtotal: safeSubtotal,
      reasonCode: 'USAGE_LIMIT_REACHED',
      messageAr: msgAr,
      messageEn: msgEn,
      reasonAr: msgAr,
      reasonEn: msgEn,
    };
  }

  if (
    found.applicableIndustry !== 'ALL' &&
    found.applicableIndustry !== activeIndustry
  ) {
    const msgAr = `الكوبون (${cleanCode}) مخصص لنشاط (${found.applicableIndustry}) فقط`;
    const msgEn = `Coupon (${cleanCode}) is restricted to sector (${found.applicableIndustry})`;
    return {
      valid: false,
      code: cleanCode,
      couponId: found.id,
      coupon: found,
      discountAmount: 0,
      netSubtotal: safeSubtotal,
      reasonCode: 'INDUSTRY_MISMATCH',
      messageAr: msgAr,
      messageEn: msgEn,
      reasonAr: msgAr,
      reasonEn: msgEn,
    };
  }

  const minReq = found.minOrderAmount ?? found.minInvoiceAmount ?? 0;
  if (safeSubtotal < minReq) {
    const msgAr = `الحد الأدنى لتفعيل الكوبون (${cleanCode}) هو ${minReq.toLocaleString()} بينما قيمة الطلب ${safeSubtotal.toLocaleString()}`;
    const msgEn = `Minimum order for (${cleanCode}) is ${minReq}, current subtotal is ${safeSubtotal}`;
    return {
      valid: false,
      code: cleanCode,
      couponId: found.id,
      coupon: found,
      discountAmount: 0,
      netSubtotal: safeSubtotal,
      reasonCode: 'BELOW_MIN_ORDER',
      messageAr: msgAr,
      messageEn: msgEn,
      reasonAr: msgAr,
      reasonEn: msgEn,
    };
  }

  let rawDiscount = 0;
  if (found.discountType === 'PERCENTAGE') {
    rawDiscount = (safeSubtotal * found.discountValue) / 100;
    if (found.maxDiscountAmount && found.maxDiscountAmount > 0) {
      rawDiscount = Math.min(rawDiscount, found.maxDiscountAmount);
    }
  } else {
    rawDiscount = found.discountValue;
  }

  const discountAmount = Math.round(Math.min(safeSubtotal, Math.max(0, rawDiscount)) * 100) / 100;
  const netSubtotal = Math.round(Math.max(0, safeSubtotal - discountAmount) * 100) / 100;
  const msgAr = `تم تطبيق الكوبون (${cleanCode} - ${found.nameAr}) بخصم قدره ${discountAmount.toLocaleString()} بنجاح!`;
  const msgEn = `Applied coupon (${cleanCode}) with discount of ${discountAmount.toLocaleString()}!`;

  return {
    valid: true,
    code: cleanCode,
    couponId: found.id,
    coupon: found,
    discountAmount,
    netSubtotal,
    messageAr: msgAr,
    messageEn: msgEn,
    reasonAr: msgAr,
    reasonEn: msgEn,
  };
}

/**
 * Evaluates automatic promotional offers based on cart quantities and active rules
 */
export function evaluateAutomaticPromotionalOffers(params: {
  items: Pick<InvoiceItem, 'quantity' | 'unitPrice'>[];
  offers: PromotionalOffer[];
  subtotal: number;
  nowIso?: string;
}): AutomaticOfferEvaluationResult {
  const { items, offers, subtotal, nowIso = new Date().toISOString().slice(0, 10) } = params;
  const safeSubtotal = Math.max(0, Number(subtotal) || 0);
  if (safeSubtotal <= 0 || !Array.isArray(items) || items.length === 0) {
    return { offerDiscountAmount: 0 };
  }

  const totalUnits = items.reduce((sum, i) => sum + Math.max(0, Number(i.quantity) || 0), 0);
  const dateOnly = nowIso.slice(0, 10);

  let bestOffer: PromotionalOffer | null = null;
  let bestDiscount = 0;

  for (const offer of offers) {
    if (!offer.isActive) continue;
    if (offer.validUntil && dateOnly > offer.validUntil.slice(0, 10)) continue;
    if (totalUnits >= offer.minQty) {
      const candidateDiscount =
        Math.round(((safeSubtotal * offer.discountPercent) / 100) * 100) / 100;
      if (candidateDiscount > bestDiscount) {
        bestDiscount = candidateDiscount;
        bestOffer = offer;
      }
    }
  }

  if (!bestOffer || bestDiscount <= 0) {
    return { offerDiscountAmount: 0 };
  }

  return {
    appliedOfferId: bestOffer.id,
    appliedOfferTitleAr: bestOffer.titleAr,
    appliedOfferTitleEn: bestOffer.titleEn,
    offerDiscountAmount: bestDiscount,
  };
}
