/**
 * RLM ERP - Enterprise Omnichannel Messaging Engine (WhatsApp & SMS by Phone Number)
 * Pure, deterministic functions for international phone normalization (Yemen +967, Saudi +966, UAE +971, Global),
 * deep-link URI construction (WhatsApp wa.me / api.whatsapp.com & SMS RFC-5724), and structured document composers.
 */

import {
  MessagingChannel,
  MessagingGatewayConfig,
  MessageTemplateCategory,
  OutboundMessageRecord,
  SalesInvoice,
  WarrantyMaintenanceTicket,
} from '../types/erp';

export interface PhoneNormalizationResult {
  valid: boolean;
  e164Phone: string;
  digitsOnly: string;
  countryDetected: 'YEMEN' | 'SAUDI' | 'UAE' | 'EGYPT' | 'INTERNATIONAL' | 'INVALID';
  errorAr?: string;
}

export const DEFAULT_MESSAGING_GATEWAY_CONFIG: MessagingGatewayConfig = {
  defaultCountryDialCode: '+967',
  smsSenderId: 'RLM-ERP',
  whatsappBusinessConnected: true,
  smsGatewayConnected: true,
  autoSendOnPOSCheckout: false,
  autoIncludeInvoiceItems: true,
  autoIncludeWarrantyTerms: true,
  ownerReportPhone: '+967 770 112 233',
  customSignatureAr: 'نظام RLM المؤسسي المتكامل — نشكركم لثقتكم وتعاملكم معنا',
  preferredInvoiceFormat: 'ALL_COMBINED',
  guaranteedActualDispatch: true,
  usbModemDirectPort: 'COM3',
};

export const SEED_OUTBOUND_MESSAGES: OutboundMessageRecord[] = [
  {
    id: 'msg-seed-101',
    tenantId: 'ten-1',
    channel: 'WHATSAPP',
    category: 'INVOICE',
    recipientName: 'شركة البناء الحديث للمقاولات العامة',
    recipientPhone: '+967 771 445 880',
    normalizedPhone: '+967771445880',
    referenceNumber: 'INV-2026-1001',
    messageBody:
      '📄 *فاتورة ضريبية وشهادة ضمان معتمدة*\nالمنشأة: شركة النور للتجارة والصناعة القابضة\nرقم الفاتورة: INV-2026-1001\nالعميل: شركة البناء الحديث للمقاولات العامة\nالإجمالي الصافي: 13,570.00 YER\nالحالة: مسددة بالكامل ✅',
    status: 'DELIVERED',
    whatsappUrl: 'https://wa.me/967771445880',
    smsUri: 'sms:+967771445880',
    sentBy: 'م. طارق المنصور',
    sentAt: '2026-11-02 14:20',
  },
  {
    id: 'msg-seed-102',
    tenantId: 'ten-1',
    channel: 'SMS',
    category: 'DEBT_REMINDER',
    recipientName: 'مؤسسة الأفق لتجارة الإلكترونيات والطاقة',
    recipientPhone: '+966 50 882 1940',
    normalizedPhone: '+966508821940',
    referenceNumber: 'SOA-2026-11',
    messageBody:
      'إشعار كشف حساب ومطالبة سداد: السادة/ مؤسسة الأفق لتجارة الإلكترونيات والطاقة، نفيدكم بأن الرصيد القائم المستحق عليكم هو 18,450.00 ر.س. نرجو التكرم بالسداد أو التواصل مع الإدارة المالية.',
    status: 'DELIVERED',
    whatsappUrl: 'https://wa.me/966508821940',
    smsUri: 'sms:+966508821940',
    sentBy: 'سارة العتيبي',
    sentAt: '2026-11-02 18:05',
  },
];

/**
 * Normalizes local or international phone numbers into strict E.164 format (+<country><national>)
 * Supports Yemeni mobile prefixes (77, 73, 71, 70, 78), Saudi (05, 5), UAE (05), Egypt (01), and international numbers.
 */
export function normalizeInternationalPhone(
  rawPhone: string,
  defaultCountryDialCode = '+967'
): PhoneNormalizationResult {
  const cleaned = (rawPhone || '').replace(/[^\d+]/g, '');
  if (!cleaned) {
    return {
      valid: false,
      e164Phone: '',
      digitsOnly: '',
      countryDetected: 'INVALID',
      errorAr: 'يرجى إدخال رقم الجوال أو الهاتف المستهدف للإرسال.',
    };
  }

  let digits = cleaned.replace(/^\+/, '');
  if (digits.startsWith('00')) {
    digits = digits.slice(2);
  }

  const defaultDialDigits = (defaultCountryDialCode || '+967').replace(/\D/g, '') || '967';

  // Detect local Yemeni mobile numbers (9 digits starting with 77, 73, 71, 70, 78 or 07...)
  if (/^0?7[01378]\d{7}$/.test(digits)) {
    const local9 = digits.startsWith('0') ? digits.slice(1) : digits;
    const full = `967${local9}`;
    return {
      valid: true,
      e164Phone: `+${full}`,
      digitsOnly: full,
      countryDetected: 'YEMEN',
    };
  }

  // Detect local Saudi mobile numbers (05xxxxxxxx or 5xxxxxxxx - 9 digits starting with 5)
  if (/^0?5\d{8}$/.test(digits)) {
    const local9 = digits.startsWith('0') ? digits.slice(1) : digits;
    const dialPrefix = defaultDialDigits === '971' ? '971' : '966';
    const full = `${dialPrefix}${local9}`;
    return {
      valid: true,
      e164Phone: `+${full}`,
      digitsOnly: full,
      countryDetected: dialPrefix === '971' ? 'UAE' : 'SAUDI',
    };
  }

  // Detect local Egyptian mobile numbers (010, 011, 012, 015 + 8 digits)
  if (/^01[0125]\d{8}$/.test(digits)) {
    const full = `20${digits.slice(1)}`;
    return {
      valid: true,
      e164Phone: `+${full}`,
      digitsOnly: full,
      countryDetected: 'EGYPT',
    };
  }

  // Already includes country code
  if (digits.startsWith('967') && digits.length >= 11 && digits.length <= 13) {
    return {
      valid: true,
      e164Phone: `+${digits}`,
      digitsOnly: digits,
      countryDetected: 'YEMEN',
    };
  }
  if (digits.startsWith('966') && digits.length >= 11 && digits.length <= 13) {
    return {
      valid: true,
      e164Phone: `+${digits}`,
      digitsOnly: digits,
      countryDetected: 'SAUDI',
    };
  }
  if (digits.startsWith('971') && digits.length >= 11 && digits.length <= 13) {
    return {
      valid: true,
      e164Phone: `+${digits}`,
      digitsOnly: digits,
      countryDetected: 'UAE',
    };
  }
  if (digits.startsWith('20') && digits.length >= 11 && digits.length <= 13) {
    return {
      valid: true,
      e164Phone: `+${digits}`,
      digitsOnly: digits,
      countryDetected: 'EGYPT',
    };
  }

  // Generic local number (7 to 10 digits) -> prepend defaultCountryDialCode
  if (digits.length >= 7 && digits.length <= 10 && !cleaned.startsWith('+')) {
    const strippedZero = digits.startsWith('0') ? digits.slice(1) : digits;
    const full = `${defaultDialDigits}${strippedZero}`;
    return {
      valid: true,
      e164Phone: `+${full}`,
      digitsOnly: full,
      countryDetected:
        defaultDialDigits === '967'
          ? 'YEMEN'
          : defaultDialDigits === '966'
          ? 'SAUDI'
          : 'INTERNATIONAL',
    };
  }

  if (digits.length >= 8 && digits.length <= 15) {
    return {
      valid: true,
      e164Phone: `+${digits}`,
      digitsOnly: digits,
      countryDetected: 'INTERNATIONAL',
    };
  }

  return {
    valid: false,
    e164Phone: '',
    digitsOnly: '',
    countryDetected: 'INVALID',
    errorAr: 'صيغة رقم الهاتف غير صحيحة (يجب أن يتكون الرقم من 7 إلى 15 رقماً).',
  };
}

/**
 * Builds standards-compliant WhatsApp and SMS deep links
 */
export function buildWhatsAppAndSmsProtocolLinks(
  rawPhone: string,
  messageBody: string,
  defaultCountryDialCode = '+967'
): {
  valid: boolean;
  normalized: PhoneNormalizationResult;
  whatsappWebUrl: string;
  whatsappApiUrl: string;
  smsUri: string;
} {
  const normalized = normalizeInternationalPhone(rawPhone, defaultCountryDialCode);
  const encodedText = encodeURIComponent(messageBody || '');
  if (!normalized.valid) {
    return {
      valid: false,
      normalized,
      whatsappWebUrl: '',
      whatsappApiUrl: '',
      smsUri: '',
    };
  }

  return {
    valid: true,
    normalized,
    whatsappWebUrl: `https://wa.me/${normalized.digitsOnly}?text=${encodedText}`,
    whatsappApiUrl: `https://api.whatsapp.com/send?phone=${normalized.digitsOnly}&text=${encodedText}`,
    smsUri: `sms:${normalized.e164Phone}?body=${encodedText}`,
  };
}

/**
 * Composes an official Invoice message for WhatsApp / SMS
 */
export function composeInvoiceMessageText(params: {
  invoice: SalesInvoice;
  companyName: string;
  branchName?: string;
  branchPhone?: string;
  currency: string;
  includeItems?: boolean;
  includeWarranty?: boolean;
  customSignatureAr?: string;
}): string {
  const {
    invoice,
    companyName,
    branchName,
    currency,
    includeItems = true,
    includeWarranty = true,
    customSignatureAr,
  } = params;

  const lines: string[] = [
    `📄 *فاتورة مبيعات معتمدة (${invoice.invoiceNumber})*`,
    `🏢 *${companyName}*${branchName ? ` - ${branchName}` : ''}`,
    `📅 التاريخ: ${invoice.date}`,
    `👤 العميل: ${invoice.customerName}`,
    `💳 طريقة الدفع: ${
      invoice.paymentMethod === 'CASH'
        ? 'نقداً'
        : invoice.paymentMethod === 'CARD'
        ? 'شبكة / تحويل إلكتروني'
        : 'آجل (ذمم عملاء)'
    }`,
    `────────────────────`,
  ];

  if (includeItems && Array.isArray(invoice.items) && invoice.items.length > 0) {
    lines.push(`📦 *الأصناف المباعة (${invoice.items.length}):*`);
    invoice.items.forEach((item, idx) => {
      const serialPart = item.serialNumber ? ` | S/N: ${item.serialNumber}` : '';
      const warrantyPart =
        includeWarranty && item.warrantyMonths ? ` | ضمان: ${item.warrantyMonths} شهر` : '';
      lines.push(
        `${idx + 1}. ${item.productName} (×${item.quantity}) = ${item.total.toLocaleString()} ${currency}${serialPart}${warrantyPart}`
      );
    });
    lines.push(`────────────────────`);
  }

  lines.push(`💰 المجموع الفرعي: ${invoice.subtotal.toLocaleString()} ${currency}`);
  if (invoice.discountAmount > 0) {
    lines.push(
      `🎁 الخصم الممنوح${invoice.couponCode ? ` (${invoice.couponCode})` : ''}: -${invoice.discountAmount.toLocaleString()} ${currency}`
    );
  }
  if (invoice.taxAmount > 0) {
    lines.push(`🏛️ الضريبة المضافة: ${invoice.taxAmount.toLocaleString()} ${currency}`);
  }
  lines.push(`✅ *الإجمالي النهائي: ${invoice.grandTotal.toLocaleString()} ${currency}*`);

  const unpaid = Math.max(
    0,
    Math.round(((invoice.grandTotal || 0) - (invoice.paidAmount ?? invoice.grandTotal)) * 100) /
      100
  );
  if (unpaid > 0) {
    lines.push(`⚠️ المتبقي بالذمة (آجل): ${unpaid.toLocaleString()} ${currency}`);
  }

  if (customSignatureAr) {
    lines.push(`\n${customSignatureAr}`);
  }

  return lines.join('\n');
}

/**
 * Composes a Customer Debt / Aging Statement Reminder for WhatsApp / SMS
 */
export function composeDebtReminderMessageText(params: {
  customerName: string;
  totalBalance: number;
  current0To30?: number;
  days31To60?: number;
  days61To90?: number;
  daysOver90?: number;
  creditLimit?: number;
  companyName: string;
  currency: string;
  customSignatureAr?: string;
}): string {
  const {
    customerName,
    totalBalance,
    current0To30 = 0,
    days31To60 = 0,
    days61To90 = 0,
    daysOver90 = 0,
    companyName,
    currency,
    customSignatureAr,
  } = params;

  const lines: string[] = [
    `🔔 *إشعار كشف حساب ومطالبة سداد مديونية*`,
    `🏢 *${companyName}*`,
    `السادة المحترمون / *${customerName}*`,
    `تحية طيبة وبعد،،`,
    `نفيدكم بتفاصيل الرصيد القائم والمستحق في حسابكم لدينا حتى تاريخ اليوم:`,
    `────────────────────`,
    `💳 *إجمالي المديونية القائمة: ${totalBalance.toLocaleString()} ${currency}*`,
  ];

  if (current0To30 > 0 || days31To60 > 0 || days61To90 > 0 || daysOver90 > 0) {
    lines.push(`📊 *تفصيل أعمار الديون:*`);
    if (current0To30 > 0) lines.push(`• جاري (0-30 يوم): ${current0To30.toLocaleString()} ${currency}`);
    if (days31To60 > 0) lines.push(`• من 31 إلى 60 يوم: ${days31To60.toLocaleString()} ${currency}`);
    if (days61To90 > 0) lines.push(`• من 61 إلى 90 يوم: ${days61To90.toLocaleString()} ${currency}`);
    if (daysOver90 > 0)
      lines.push(`• متأخرات (+90 يوم): ${daysOver90.toLocaleString()} ${currency} ⚠️`);
  }

  lines.push(`────────────────────`);
  lines.push(
    `نرجو التكرم بسداد المبلغ المستحق نقداً أو عبر الحوالة البنكية وإرسال إشعار السداد لتحديث رصيدكم في النظام.`
  );
  if (customSignatureAr) {
    lines.push(`\n${customSignatureAr}`);
  }
  return lines.join('\n');
}

/**
 * Composes a Payment Receipt Voucher confirmation message for WhatsApp / SMS
 */
export function composeReceiptVoucherMessageText(params: {
  voucherNumber: string;
  customerName: string;
  amountReceived: number;
  remainingBalance: number;
  paymentMethod: string;
  companyName: string;
  currency: string;
  dateIso?: string;
}): string {
  const {
    voucherNumber,
    customerName,
    amountReceived,
    remainingBalance,
    paymentMethod,
    companyName,
    currency,
    dateIso = new Date().toISOString().slice(0, 10),
  } = params;

  return [
    `🧾 *سند قبض مالي معتمد (${voucherNumber})*`,
    `🏢 *${companyName}*`,
    `📅 التاريخ: ${dateIso}`,
    `👤 استلمنا من المكرم: *${customerName}*`,
    `💵 المبلغ المقبوض: *${amountReceived.toLocaleString()} ${currency}*`,
    `🏦 طريقة التحصيل: ${paymentMethod}`,
    `📊 الرصيد المتبقي بعد السداد: *${remainingBalance.toLocaleString()} ${currency}*`,
    `────────────────────`,
    `شكراً لالتزامكم بالسداد — تم قيد الدفعة في حسابكم آلياً ✅`,
  ].join('\n');
}

/**
 * Composes a Warranty / Maintenance RMA Ticket status alert for WhatsApp / SMS
 */
export function composeWarrantyRMAMessageText(params: {
  ticket: WarrantyMaintenanceTicket;
  companyName: string;
  currency: string;
}): string {
  const { ticket, companyName, currency } = params;
  const statusAr: Record<string, string> = {
    RECEIVED: 'تم استلام الجهاز في مركز الصيانة والضمان',
    DIAGNOSING: 'قيد الفحص والتشخيص الهندسي',
    IN_REPAIR: 'تحت الإصلاح والمعايرة الفنية',
    READY: 'جاهز للاستلام والتسليم للعميل ✅',
    DELIVERED: 'تم التسليم للعميل بنجاح',
  };

  return [
    `🛠️ *إشعار مركز الضمان والصيانة الهندسية (${ticket.ticketNumber})*`,
    `🏢 *${companyName}*`,
    `👤 العميل: *${ticket.customerName}*`,
    `🔌 الجهاز / الصنف: ${ticket.productName}`,
    `🔢 الرقم التسلسلي (S/N): ${ticket.serialNumber}`,
    `🛡️ حالة الضمان: ${
      ticket.isUnderWarranty
        ? `مشمول بالضمان المجاني (ساري حتى ${ticket.warrantyExpiryDate})`
        : `خارج الضمان (${ticket.totalCustomerCharge.toLocaleString()} ${currency})`
    }`,
    `📌 المرحلة الحالية: *${statusAr[ticket.status] || ticket.status}*`,
    `📝 التقرير الفني: ${ticket.technicianReport || ticket.faultDescription}`,
  ].join('\n');
}

/**
 * Composes an Executive Financial & Operational Summary Report for WhatsApp / SMS
 */
export function composeExecutiveReportMessageText(params: {
  companyName: string;
  reportTitleAr: string;
  totalRevenue: number;
  netProfit: number;
  cashBalance: number;
  receivablesTotal: number;
  payablesTotal: number;
  lowStockCount: number;
  currency: string;
  activeIndustryAr?: string;
  dateIso?: string;
}): string {
  const {
    companyName,
    reportTitleAr,
    totalRevenue,
    netProfit,
    cashBalance,
    receivablesTotal,
    payablesTotal,
    lowStockCount,
    currency,
    activeIndustryAr,
    dateIso = new Date().toISOString().slice(0, 10),
  } = params;

  return [
    `📊 *${reportTitleAr}*`,
    `🏢 *${companyName}*${activeIndustryAr ? ` (${activeIndustryAr})` : ''}`,
    `📅 التاريخ: ${dateIso}`,
    `────────────────────`,
    `📈 إجمالي المبيعات والإيرادات: *${totalRevenue.toLocaleString()} ${currency}*`,
    `💎 صافي الربح التشغيلي: *${netProfit.toLocaleString()} ${currency}*`,
    `🏦 السيولة النقدية والبنكية: *${cashBalance.toLocaleString()} ${currency}*`,
    `📥 إجمالي مديونيات العملاء (الذمم المدينة): *${receivablesTotal.toLocaleString()} ${currency}*`,
    `📤 إجمالي مستحقات الموردين (الذمم الدائنة): *${payablesTotal.toLocaleString()} ${currency}*`,
    `📦 أصناف بلغت حد إعادة الطلب بالمستودع: *${lowStockCount} صنف*`,
    `────────────────────`,
    `تم التوليد والإرسال آلياً من نظام RLM ERP المؤسسي ✅`,
  ].join('\n');
}
