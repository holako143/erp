import React, { useMemo } from 'react';
import {
  SalesInvoice,
  ThermalTemplateType,
  StandardInvoiceTemplateType,
  InvoiceTemplateSettings,
} from '../../types/erp';
import {
  generateQRMatrix,
  generateLinearBarcodeBars,
  encodeZatcaPhase2TLVBase64,
} from '../../core/barcodeEngine';
import { formatCleanNumber } from '../../core/systemConfigEngine';
import {
  doesInvoiceHaveAnyWarranty,
  isCartItemWarrantyActive,
  isInvoiceVoidOrReturned,
} from '../../core/salesReturnEngine';
import { resolveThemeAwareInvoicePalette } from '../../core/posStrictStockValidationService';
import {
  CustomInvoiceLayoutTemplate,
  InvoiceLayoutZoneId,
  resolveEffectiveZones,
} from '../../core/invoiceTemplateLayoutEngine';
import {
  ShieldCheck,
  Award,
  Building2,
  MapPin,
  UserCheck,
  CreditCard,
  Landmark,
} from 'lucide-react';

export interface InvoiceRendererProps {
  invoice: SalesInvoice;
  mode: 'thermal' | 'a4';
  thermalTemplate?: ThermalTemplateType;
  standardTemplate?: StandardInvoiceTemplateType;
  settings: InvoiceTemplateSettings;
  customLayout?: CustomInvoiceLayoutTemplate | null;
  companyName: string;
  companyNameEn?: string;
  companyLogo?: string;
  taxNumber: string;
  branchName: string;
  branchAddress: string;
  branchPhone: string;
  currency: string;
}

// ---------------------------------------------------------------------------
// Arabic Number-to-Words (Tafqeet) Helper for Yemeni & Arab Commercial Invoices
// ---------------------------------------------------------------------------
export function numberToArabicWords(amount: number, currencyCode: string): string {
  const n = Math.floor(Math.abs(Number(amount) || 0));
  const currencyNameMap: Record<string, string> = {
    YER: 'ريال يمني',
    SAR: 'ريال سعودي',
    USD: 'دولار أمريكي',
    AED: 'درهم إماراتي',
    EUR: 'يورو',
    EGP: 'جنيه مصري',
  };
  const currLabel = currencyNameMap[currencyCode] || currencyCode;

  if (n === 0) return `صفر ${currLabel} فقط لا غير`;

  const ones = [
    '',
    'واحد',
    'اثنان',
    'ثلاثة',
    'أربعة',
    'خمسة',
    'ستة',
    'سبعة',
    'ثمانية',
    'تسعة',
    'عشرة',
    'أحد عشر',
    'اثنا عشر',
    'ثلاثة عشر',
    'أربعة عشر',
    'خمسة عشر',
    'ستة عشر',
    'سبعة عشر',
    'ثمانية عشر',
    'تسعة عشر',
  ];
  const tens = ['', '', 'عشرون', 'ثلاثون', 'أربعون', 'خمسون', 'ستون', 'سبعون', 'ثمانون', 'تسعون'];
  const hundreds = [
    '',
    'مائة',
    'مائتان',
    'ثلاثمائة',
    'أربعمائة',
    'خمسمائة',
    'ستمائة',
    'سبعمائة',
    'ثمانمائة',
    'تسعمائة',
  ];

  const convertBelowThousand = (num: number): string => {
    if (num === 0) return '';
    const h = Math.floor(num / 100);
    const rem = num % 100;
    const parts: string[] = [];
    if (h > 0) parts.push(hundreds[h]);
    if (rem > 0) {
      if (rem < 20) {
        parts.push(ones[rem]);
      } else {
        const u = rem % 10;
        const t = Math.floor(rem / 10);
        if (u > 0) {
          parts.push(`${ones[u]} و${tens[t]}`);
        } else {
          parts.push(tens[t]);
        }
      }
    }
    return parts.join(' و');
  };

  const millions = Math.floor(n / 1_000_000);
  const thousands = Math.floor((n % 1_000_000) / 1000);
  const remainder = n % 1000;

  const segments: string[] = [];
  if (millions > 0) {
    if (millions === 1) segments.push('مليون');
    else if (millions === 2) segments.push('مليونان');
    else if (millions >= 3 && millions <= 10) segments.push(`${ones[millions]} ملايين`);
    else segments.push(`${convertBelowThousand(millions)} مليون`);
  }
  if (thousands > 0) {
    if (thousands === 1) segments.push('ألف');
    else if (thousands === 2) segments.push('ألفان');
    else if (thousands >= 3 && thousands <= 10) segments.push(`${ones[thousands]} آلاف`);
    else segments.push(`${convertBelowThousand(thousands)} ألف`);
  }
  if (remainder > 0) {
    segments.push(convertBelowThousand(remainder));
  }

  return `فقط ${segments.join(' و')} ${currLabel} لا غير`;
}

// ---------------------------------------------------------------------------
// Crisp Vector QR Code SVG Component
// ---------------------------------------------------------------------------
const CrispQRCodeSVG: React.FC<{
  payload: string;
  sizePx?: number;
  darkColor?: string;
}> = ({ payload, sizePx = 76, darkColor = '#0f172a' }) => {
  const matrix = useMemo(() => generateQRMatrix(payload, 25), [payload]);
  const dim = matrix.length;
  const quietZone = 2;
  const totalViewBox = dim + quietZone * 2;

  return (
    <div
      data-testid="invoice-qr-svg-container"
      className="inline-flex flex-col items-center justify-center bg-white p-1 rounded border border-slate-300 shrink-0"
    >
      <svg
        viewBox={`0 0 ${totalViewBox} ${totalViewBox}`}
        width={sizePx}
        height={sizePx}
        shapeRendering="crispEdges"
        className="block"
        aria-label="Invoice Verification QR Code"
      >
        <rect x={0} y={0} width={totalViewBox} height={totalViewBox} fill="#ffffff" />
        {matrix.map((row, rIdx) =>
          row.map((cell, cIdx) =>
            cell ? (
              <rect
                key={`${rIdx}-${cIdx}`}
                x={cIdx + quietZone}
                y={rIdx + quietZone}
                width={1}
                height={1}
                fill={darkColor}
              />
            ) : null
          )
        )}
      </svg>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Crisp Vector Code-128 Linear Barcode SVG Component
// ---------------------------------------------------------------------------
const CrispLinearBarcodeSVG: React.FC<{
  code: string;
  widthPx?: number;
  heightPx?: number;
  darkColor?: string;
}> = ({ code, widthPx = 160, heightPx = 30, darkColor = '#0f172a' }) => {
  const cleanCode = (code || 'INV-0001').trim();
  const bars = useMemo(() => generateLinearBarcodeBars(cleanCode), [cleanCode]);
  const quietZone = 8;
  const contentWidth =
    bars.length > 0 ? bars[bars.length - 1].x + bars[bars.length - 1].width : 80;
  const totalModules = Math.ceil(contentWidth + quietZone * 2);

  return (
    <div
      data-testid="invoice-barcode-svg-container"
      className="inline-flex flex-col items-center justify-center bg-white px-2 py-1 rounded border border-slate-200 max-w-full"
      dir="ltr"
    >
      <svg
        viewBox={`0 0 ${totalModules} 32`}
        width={widthPx}
        height={heightPx}
        preserveAspectRatio="none"
        shapeRendering="crispEdges"
        className="block max-w-full"
        aria-label={`Barcode ${cleanCode}`}
      >
        <rect x={0} y={0} width={totalModules} height={32} fill="#ffffff" />
        {bars.map((bar, idx) => (
          <rect
            key={idx}
            x={bar.x + quietZone}
            y={2}
            width={bar.width}
            height={28}
            fill={darkColor}
          />
        ))}
      </svg>
      <div className="font-mono text-[8.5px] font-bold tracking-[0.18em] text-slate-800 mt-0.5 leading-none">
        *{cleanCode}*
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Customer Company Logo / Identity Crest Component (Customer Branding Only)
// ---------------------------------------------------------------------------
const CompanyBrandCrest: React.FC<{
  companyName: string;
  companyLogo?: string;
  primaryColorHex?: string;
  size?: 'sm' | 'md' | 'lg';
}> = ({ companyName, companyLogo, primaryColorHex = '#1e3a8a', size = 'md' }) => {
  const resolvedLogo = useMemo(() => {
    if (companyLogo && companyLogo.trim()) return companyLogo.trim();
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('haseb_company_custom_logo_v1');
        if (saved && saved.trim()) return saved.trim();
      } catch {
        // ignore
      }
    }
    return '';
  }, [companyLogo]);

  const initials = useMemo(() => {
    const words = (companyName || 'مؤسسة تجارية')
      .replace(/مؤسسة|شركة|معرض|مجموعة/g, '')
      .trim()
      .split(/\s+/)
      .filter(Boolean);
    if (words.length >= 2) {
      return `${words[0][0]} ${words[1][0]}`;
    }
    return (companyName || 'م').slice(0, 2);
  }, [companyName]);

  const boxDims =
    size === 'sm'
      ? 'w-10 h-10 aspect-square rounded-lg'
      : size === 'lg'
      ? 'w-16 h-16 aspect-square rounded-xl'
      : 'w-12 h-12 aspect-square rounded-xl';

  if (resolvedLogo) {
    return (
      <div
        data-testid="invoice-company-logo-box"
        className={`${boxDims} bg-white border border-slate-300 p-1 flex items-center justify-center overflow-hidden shrink-0`}
      >
        <img src={resolvedLogo} alt={companyName} className="w-full h-full object-contain" />
      </div>
    );
  }

  return (
    <div
      data-testid="invoice-company-crest-box"
      style={{ borderColor: primaryColorHex, color: primaryColorHex }}
      className={`${boxDims} bg-slate-50 border-2 flex flex-col items-center justify-center shrink-0 select-none`}
    >
      <Building2 className={size === 'sm' ? 'w-4 h-4 opacity-90' : 'w-5 h-5 opacity-90'} />
      <span className="text-[9px] font-black tracking-tight mt-0.5 leading-none">{initials}</span>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Official Company Stamp Component
// ---------------------------------------------------------------------------
const OfficialCompanySeal: React.FC<{
  companyName: string;
  branchName: string;
  taxNumber: string;
  colorHex?: string;
}> = ({ companyName, branchName, taxNumber, colorHex = '#1e3a8a' }) => {
  return (
    <div
      data-testid="invoice-official-company-seal"
      style={{ borderColor: colorHex, color: colorHex }}
      className="inline-flex flex-col items-center justify-center border-2 border-double rounded-lg px-3.5 py-1 -rotate-2 select-none bg-white"
    >
      <span className="text-[9px] font-black tracking-wide truncate max-w-[160px]">
        {companyName}
      </span>
      <span className="text-[8px] font-bold opacity-85 truncate max-w-[150px]">
        {branchName} • معتمد رسمياً
      </span>
      {taxNumber && taxNumber !== '—' && (
        <span className="text-[8px] font-mono font-bold mt-0.5" dir="ltr">
          TAX: {taxNumber}
        </span>
      )}
    </div>
  );
};

const A4_COL_SPAN_CLASS: Record<number, string> = {
  4: 'col-span-12 md:col-span-4',
  5: 'col-span-12 md:col-span-5',
  6: 'col-span-12 md:col-span-6',
  7: 'col-span-12 md:col-span-7',
  8: 'col-span-12 md:col-span-8',
  12: 'col-span-12',
};

export const InvoiceRenderer: React.FC<InvoiceRendererProps> = ({
  invoice,
  mode,
  thermalTemplate,
  standardTemplate,
  settings,
  customLayout,
  companyName,
  companyNameEn,
  companyLogo,
  taxNumber,
  branchName,
  branchAddress,
  branchPhone,
  currency,
}) => {
  const activeThermal = thermalTemplate || settings.thermalTemplate;
  const activeStandard = standardTemplate || settings.standardTemplate;

  // Determine whether a custom drag-and-drop layout should govern rendering
  const resolvedCustomLayout: CustomInvoiceLayoutTemplate | null = useMemo(() => {
    if (customLayout) return customLayout;
    if (
      settings.activeCustomLayout &&
      settings.activeCustomLayoutId &&
      settings.activeCustomLayout.id === settings.activeCustomLayoutId
    ) {
      const layoutMode = settings.activeCustomLayout.format === 'a4' ? 'a4' : 'thermal';
      if (layoutMode === mode) {
        return settings.activeCustomLayout;
      }
    }
    return null;
  }, [customLayout, settings.activeCustomLayout, settings.activeCustomLayoutId, mode]);

  const activeUiTheme =
    typeof document !== 'undefined'
      ? document.documentElement.getAttribute('data-erp-theme') || 'corporate_slate'
      : 'corporate_slate';

  const effectivePrimaryInput = resolvedCustomLayout?.accentHex || settings.primaryColorHex;
  const effectiveSecondaryInput = resolvedCustomLayout?.secondaryHex || settings.secondaryColorHex;

  const themePalette = useMemo(
    () =>
      resolveThemeAwareInvoicePalette({
        uiTheme: activeUiTheme,
        rawPrimaryHex: effectivePrimaryInput,
        rawSecondaryHex: effectiveSecondaryInput,
        templateId: mode === 'a4' ? activeStandard : activeThermal,
      }),
    [
      activeUiTheme,
      effectivePrimaryInput,
      effectiveSecondaryInput,
      mode,
      activeStandard,
      activeThermal,
    ]
  );

  const primaryHex = themePalette.primaryAccent;
  const secondaryHex = themePalette.secondaryAccent;
  const fontScale = resolvedCustomLayout?.fontScale || settings.fontScale || 'normal';
  const paperMargin = settings.paperMargin || 'normal';
  const logoSize = settings.logoSize || 'md';
  const logoPosition = settings.logoPosition || 'right';
  const showCompanyLogo = settings.showCompanyLogo !== false;
  const showCompanyNameEn = settings.showCompanyNameEn !== false;
  const showCustomerPhone = settings.showCustomerPhone !== false;
  const showCustomerId = settings.showCustomerId !== false;
  const showItemSku = settings.showItemSku !== false;
  const showItemDiscount = settings.showItemDiscount !== false;
  const showItemTax = settings.showItemTax !== false;
  const showSerialAndWarranty = settings.showSerialAndWarranty !== false;
  const showTafqeet = settings.showTafqeet !== false;
  const showBankAccounts = settings.showBankAccounts !== false;
  const customBankLines = (settings.customBankDetailsAr || '')
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean);
  const showWatermark = Boolean(settings.showWatermark);
  const watermarkText = (settings.watermarkText || '').trim() || companyName;

  const resolvedCompanyEn = useMemo(() => {
    if (companyNameEn && companyNameEn.trim() && companyNameEn.trim() !== companyName.trim()) {
      return companyNameEn.trim();
    }
    return '';
  }, [companyName, companyNameEn]);

  const qrPayload = useMemo(() => {
    try {
      return encodeZatcaPhase2TLVBase64({
        sellerName: companyName,
        vatRegistrationNumber: taxNumber || '0',
        timestamp: invoice.date.includes('T') ? invoice.date : `${invoice.date}T12:00:00Z`,
        invoiceTotal: String(invoice.grandTotal),
        vatTotal: String(invoice.taxAmount),
        invoiceNumber: invoice.invoiceNumber,
      });
    } catch {
      return `SELLER:${companyName}|TAX:${taxNumber}|INV:${invoice.invoiceNumber}|DATE:${invoice.date}|TOTAL:${invoice.grandTotal} ${currency}`;
    }
  }, [companyName, taxNumber, invoice, currency]);

  const paymentMethodAr =
    invoice.paymentMethod === 'CASH'
      ? 'نقداً (صندوق الكاشير)'
      : invoice.paymentMethod === 'CARD'
      ? 'شبكة / تحويل مصرفي'
      : invoice.paymentMethod === 'SPLIT'
      ? 'دفع مشترك (نقدي + مصرفي)'
      : 'آجل (ذمم عملاء)';

  const paymentMethodEn =
    invoice.paymentMethod === 'CASH'
      ? 'Cash Settlement'
      : invoice.paymentMethod === 'CARD'
      ? 'Bank / Card Transfer'
      : invoice.paymentMethod === 'SPLIT'
      ? 'Split Tender'
      : 'Credit Account';

  const isReturnedOrVoid = isInvoiceVoidOrReturned(invoice);
  const anyItemHasWarranty = doesInvoiceHaveAnyWarranty(invoice);
  const allWarrantiesDisabled =
    invoice.warrantyCancelled === true ||
    ((invoice.items || []).length > 0 &&
      (invoice.items || []).every((i) => i.warrantyEnabled === false || Number(i.warrantyMonths || 0) === 0));
  const sanitizedCustomHeaderAr = useMemo(() => {
    const raw = settings.headerTitleAr?.trim() || '';
    if (!raw) return '';
    if (!allWarrantiesDisabled) return raw;
    if (/ضمان/.test(raw)) {
      return 'فاتورة مبيعات ضريبية معتمدة';
    }
    return raw;
  }, [settings.headerTitleAr, allWarrantiesDisabled]);

  const hasSerialOrWarranty =
    showSerialAndWarranty &&
    invoice.items.some((i) => Boolean(i.serialNumber) || isCartItemWarrantyActive(i));
  const hasBatchOrExpiry = invoice.items.some(
    (i) => Boolean(i.batchNumber) || Boolean(i.expiryDate)
  );

  const paidVal = Math.min(
    invoice.grandTotal || 0,
    Math.max(0, Math.round((invoice.paidAmount ?? invoice.grandTotal ?? 0) * 100) / 100)
  );
  const remainingDebtVal = Math.max(
    0,
    Math.round(
      (invoice.remainingAmount !== undefined
        ? invoice.remainingAmount
        : (invoice.grandTotal || 0) - paidVal) * 100
    ) / 100
  );
  const totalUnitsSold = useMemo(
    () =>
      Math.round(
        (invoice.items || []).reduce((sum, it) => sum + (Number(it.quantity) || 0), 0) * 100
      ) / 100,
    [invoice.items]
  );
  const tenderedVal =
    invoice.tenderedAmount !== undefined
      ? Math.max(0, Number(invoice.tenderedAmount) || 0)
      : paidVal;
  const changeDueVal = Math.max(
    0,
    Math.round((tenderedVal - (invoice.grandTotal || 0)) * 100) / 100
  );
  const invoiceStatusAr = isReturnedOrVoid
    ? 'ملغاة — تم الاسترجاع'
    : remainingDebtVal <= 0.01
    ? 'مسددة بالكامل'
    : paidVal > 0
    ? 'سداد جزئي'
    : 'آجل — ذمم عملاء';

  const refundedDisplayVal =
    invoice.refundedAmount !== undefined
      ? Number(invoice.refundedAmount)
      : Number(invoice.grandTotal) || 0;

  const tafqeetText = useMemo(
    () => numberToArabicWords(invoice.grandTotal, currency),
    [invoice.grandTotal, currency]
  );

  // ============================================================================
  // 1. THERMAL RECEIPT TEMPLATES (80mm & 58mm POS Roll Paper)
  // ============================================================================
  if (mode === 'thermal') {
    const is58mm =
      resolvedCustomLayout?.format === 'thermal_58mm' || activeThermal === 'thermal_58mm_compact';
    const isYemenPos = activeThermal === 'thermal_80mm_onyx_pos';
    const isMinimal =
      resolvedCustomLayout?.tableHeaderStyle === 'minimal_line' ||
      activeThermal === 'thermal_80mm_minimal';
    const isWarrantyReceipt = activeThermal === 'thermal_80mm_warranty';
    const isRestaurant = activeThermal === 'thermal_80mm_restaurant';

    const thermalPaddingClass =
      paperMargin === 'narrow'
        ? 'p-2'
        : paperMargin === 'wide'
        ? 'p-4'
        : is58mm
        ? 'p-2.5'
        : 'p-3.5';
    const thermalFontClass =
      fontScale === 'compact'
        ? 'text-[9.5px]'
        : fontScale === 'large'
        ? 'text-[12px]'
        : is58mm
        ? 'text-[10px]'
        : 'text-[10.5px]';
    const thermalQrSize = settings.qrSizePx || (is58mm ? 70 : 82);
    const thermalBarcodeW = settings.barcodeWidthPx || (is58mm ? 160 : 200);

    const effectiveThermalZones = resolvedCustomLayout
      ? resolveEffectiveZones(resolvedCustomLayout.zones)
      : null;

    const renderThermalZone = (zoneId: InvoiceLayoutZoneId) => {
      switch (zoneId) {
        case 'HEADER_BRAND':
          return (
            <div
              key={zoneId}
              style={{ borderColor: primaryHex }}
              className={`pb-2 mb-2 ${
                logoPosition === 'right'
                  ? 'text-right'
                  : logoPosition === 'left'
                  ? 'text-left'
                  : 'text-center'
              } ${
                isMinimal
                  ? 'border-b border-slate-300'
                  : isYemenPos
                  ? 'border-b-2'
                  : 'border-b border-dashed border-slate-400'
              }`}
            >
              {showCompanyLogo && (
                <div
                  className={`flex mb-1.5 ${
                    logoPosition === 'right'
                      ? 'justify-start'
                      : logoPosition === 'left'
                      ? 'justify-end'
                      : 'justify-center'
                  }`}
                >
                  <CompanyBrandCrest
                    companyName={companyName}
                    companyLogo={companyLogo}
                    size="sm"
                    primaryColorHex={primaryHex}
                  />
                </div>
              )}
              <h2 className="font-black text-sm tracking-tight leading-snug text-slate-950">
                {companyName}
              </h2>
              {showCompanyNameEn && resolvedCompanyEn && (
                <div className="text-[9px] font-semibold text-slate-500">{resolvedCompanyEn}</div>
              )}
              <p className="text-[10px] font-semibold text-slate-600 mt-0.5">
                {branchName} {branchAddress ? `— ${branchAddress}` : ''}
              </p>
              {(branchPhone || (taxNumber && taxNumber !== '—')) && (
                <div
                  className={`text-[9.5px] font-mono mt-0.5 flex flex-wrap items-center gap-1.5 text-slate-600 ${
                    logoPosition === 'center' ? 'justify-center' : ''
                  }`}
                  dir="ltr"
                >
                  {branchPhone && <span>TEL: {branchPhone}</span>}
                  {branchPhone && taxNumber && taxNumber !== '—' && <span>•</span>}
                  {taxNumber && taxNumber !== '—' && <span>VAT: {taxNumber}</span>}
                </div>
              )}
              <div
                style={{ borderColor: primaryHex, color: primaryHex }}
                className="mt-1.5 inline-block px-2 py-0.5 rounded border font-black text-[10px] bg-slate-50"
              >
                {sanitizedCustomHeaderAr
                  ? sanitizedCustomHeaderAr
                  : isWarrantyReceipt && !allWarrantiesDisabled
                  ? 'فاتورة مبيعات وشهادة ضمان'
                  : isRestaurant
                  ? 'إيصال طلبات وضيافة'
                  : 'فاتورة مبيعات ضريبية مبسطة'}
              </div>
              {isReturnedOrVoid && (
                <div
                  data-testid="invoice-returned-stamp"
                  className="mt-2 p-2 rounded-md border-2 border-dashed border-rose-600 bg-rose-50 text-rose-800 text-center space-y-0.5"
                >
                  <div className="text-xs font-black tracking-tight">
                    ★ ملغاة — تم الاسترجاع (RETURNED / VOID) ★
                  </div>
                  <div className="text-[10px] font-bold">
                    {refundedDisplayVal > 0
                      ? `تم إرجاع المبلغ: ${formatCleanNumber(refundedDisplayVal)} ${currency}`
                      : `تم إلغاء الفاتورة وإسقاط المديونية: ${formatCleanNumber(invoice.grandTotal)} ${currency}`}
                  </div>
                  <div className="text-[9px] font-mono text-rose-700" dir="ltr">
                    {invoice.returnCreditNoteNumber ? `${invoice.returnCreditNoteNumber} • ` : ''}
                    {invoice.returnedAt || invoice.date}
                  </div>
                </div>
              )}
            </div>
          );

        case 'PARTIES_METADATA':
          return (
            <div
              key={zoneId}
              className="border border-slate-200 rounded bg-slate-50/70 p-2 mb-2 text-[10px] space-y-1"
            >
              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-semibold">رقم الفاتورة:</span>
                <span className="font-mono font-black text-slate-950" dir="ltr">
                  {invoice.invoiceNumber}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-semibold">التاريخ:</span>
                <span className="font-mono font-bold text-slate-800" dir="ltr">
                  {invoice.date}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-semibold">العميل:</span>
                <span className="font-bold text-slate-950 truncate max-w-[175px]">
                  {invoice.customerName}
                </span>
              </div>
              {showCustomerPhone && invoice.customerPhone && (
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 font-semibold">الهاتف:</span>
                  <span className="font-mono font-bold text-slate-800" dir="ltr">
                    {invoice.customerPhone}
                  </span>
                </div>
              )}
              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-semibold">الدفع:</span>
                <span className="font-bold text-slate-800">{paymentMethodAr}</span>
              </div>
            </div>
          );

        case 'LINE_ITEMS_TABLE':
          return (
            <table key={zoneId} className="w-full text-right border-collapse mb-2">
              <thead>
                <tr
                  style={{
                    backgroundColor: isMinimal ? 'transparent' : themePalette.tableHeaderBg,
                    color: isMinimal ? '#0f172a' : themePalette.tableHeaderText,
                    borderBottom: `1.5px solid ${themePalette.tableHeaderBorder}`,
                  }}
                  className="text-[9.5px] font-black"
                >
                  <th className="py-1.5 px-1 text-start">الصنف</th>
                  <th className="py-1.5 px-1 text-center">الكمية</th>
                  <th className="py-1.5 px-1 text-end">السعر</th>
                  <th className="py-1.5 px-1 text-end">الإجمالي</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {invoice.items.map((item, idx) => (
                  <tr key={idx} className="align-top">
                    <td className="py-1.5 px-1 font-bold text-slate-950">
                      <div className="leading-snug">{item.productName}</div>
                      {showItemSku && item.sku && (
                        <div className="text-[8.5px] font-mono text-slate-400" dir="ltr">
                          {item.sku}
                        </div>
                      )}
                      {showSerialAndWarranty &&
                        (item.serialNumber || isCartItemWarrantyActive(item)) && (
                          <div className="text-[8.5px] font-mono text-slate-600 mt-0.5" dir="ltr">
                            {item.serialNumber ? `SN: ${item.serialNumber}` : ''}{' '}
                            {isCartItemWarrantyActive(item)
                              ? `• ضمان ${item.warrantyMonths} ش`
                              : ''}
                          </div>
                        )}
                    </td>
                    <td className="py-1.5 px-1 text-center font-mono font-bold tabular-nums" dir="ltr">
                      {formatCleanNumber(item.quantity)}
                    </td>
                    <td className="py-1.5 px-1 text-end font-mono tabular-nums" dir="ltr">
                      {formatCleanNumber(item.unitPrice)}
                    </td>
                    <td className="py-1.5 px-1 text-end font-mono font-black text-slate-950 tabular-nums" dir="ltr">
                      {formatCleanNumber(item.total)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          );

        case 'FINANCIAL_SUMMARY':
          return (
            <div
              key={zoneId}
              style={{ borderColor: primaryHex }}
              className="border-t-2 pt-2 space-y-1 text-[10px] mb-2"
            >
              <div className="flex justify-between text-slate-500 text-[9.5px]">
                <span>الأصناف / الكمية:</span>
                <span className="font-mono font-bold text-slate-800 tabular-nums" dir="ltr">
                  {invoice.items.length} ({formatCleanNumber(totalUnitsSold)})
                </span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>المجموع الفرعي:</span>
                <span className="font-mono font-bold tabular-nums" dir="ltr">
                  {formatCleanNumber(invoice.subtotal)} {currency}
                </span>
              </div>
              {showItemDiscount && invoice.discountAmount > 0 && (
                <div className="flex justify-between text-rose-700 font-bold">
                  <span>الخصم:</span>
                  <span className="font-mono tabular-nums" dir="ltr">
                    -{formatCleanNumber(invoice.discountAmount)} {currency}
                  </span>
                </div>
              )}
              {showItemTax && invoice.taxAmount > 0 && (
                <div className="flex justify-between text-slate-600">
                  <span>الضريبة:</span>
                  <span className="font-mono font-bold tabular-nums" dir="ltr">
                    {formatCleanNumber(invoice.taxAmount)} {currency}
                  </span>
                </div>
              )}
              <div
                style={{
                  backgroundColor: themePalette.netPayableBg,
                  color: themePalette.netPayableText,
                  borderColor: themePalette.netPayableBorder,
                }}
                className="flex justify-between items-center border px-2 py-1.5 rounded text-xs font-black mt-1"
              >
                <span>الصافي النهائي:</span>
                <span style={{ color: primaryHex }} className="font-mono text-sm font-black tabular-nums" dir="ltr">
                  {formatCleanNumber(invoice.grandTotal)} {currency}
                </span>
              </div>
              <div
                data-testid="thermal-paid-remaining-box"
                className="bg-slate-50 border border-slate-200 rounded p-1.5 space-y-0.5 mt-1"
              >
                <div className="flex justify-between items-center font-bold text-emerald-800">
                  <span>المدفوع:</span>
                  <span className="font-mono tabular-nums" dir="ltr">
                    {formatCleanNumber(paidVal)} {currency}
                  </span>
                </div>
                {changeDueVal > 0 && (
                  <div className="flex justify-between items-center text-slate-600 font-semibold">
                    <span>الباقي للعميل:</span>
                    <span className="font-mono tabular-nums" dir="ltr">
                      {formatCleanNumber(changeDueVal)} {currency}
                    </span>
                  </div>
                )}
                <div
                  className={`flex justify-between items-center font-black pt-0.5 border-t border-slate-200 ${
                    remainingDebtVal > 0.01 ? 'text-rose-700' : 'text-slate-600'
                  }`}
                >
                  <span>{remainingDebtVal > 0.01 ? 'المتبقي (مديونية):' : 'المتبقي:'}</span>
                  <span className="font-mono tabular-nums" dir="ltr">
                    {formatCleanNumber(remainingDebtVal)} {currency}
                  </span>
                </div>
              </div>
            </div>
          );

        case 'TAFQEET_BANKING':
          return (
            <React.Fragment key={zoneId}>
              {showTafqeet && (
                <div className="text-[9px] font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded px-2 py-1 text-center mb-2">
                  {tafqeetText}
                </div>
              )}
              {showBankAccounts && customBankLines.length > 0 && (
                <div className="mb-2 p-1.5 rounded bg-slate-50 border border-slate-200 text-[9px] text-slate-700 space-y-0.5">
                  <div className="font-bold text-slate-900">حسابات التحويل:</div>
                  {customBankLines.map((line, i) => (
                    <div key={i}>{line}</div>
                  ))}
                </div>
              )}
            </React.Fragment>
          );

        case 'VERIFICATION_QR_BARCODE':
          if (!settings.showQR && !settings.showBarcode) return null;
          return (
            <div
              key={zoneId}
              className="mt-2 pt-2 border-t border-dashed border-slate-300 flex flex-col items-center gap-1.5 mb-2"
            >
              {settings.showQR && (
                <CrispQRCodeSVG payload={qrPayload} sizePx={thermalQrSize} darkColor={primaryHex} />
              )}
              {settings.showBarcode && (
                <CrispLinearBarcodeSVG
                  code={invoice.invoiceNumber}
                  widthPx={thermalBarcodeW}
                  heightPx={26}
                  darkColor={primaryHex}
                />
              )}
            </div>
          );

        case 'WARRANTY_NOTES':
          if (allWarrantiesDisabled && !settings.footerNoteAr) return null;
          return (
            <div
              key={zoneId}
              className="mt-2 pt-1.5 border-t border-slate-200 text-center text-[9px] text-slate-500 space-y-0.5"
            >
              {!allWarrantiesDisabled && settings.footerNoteAr && (
                <p className="font-bold text-slate-700">{settings.footerNoteAr}</p>
              )}
              <p className="font-semibold text-slate-600">
                شكراً لتعاملكم مع {companyName} {branchPhone ? `— ${branchPhone}` : ''}
              </p>
            </div>
          );

        case 'SIGNATURES_STAMP':
          if (!invoice.customerSignatureBase64) return null;
          return (
            <div key={zoneId} className="mt-2 pt-1.5 border-t border-slate-200 flex flex-col items-center">
              <img
                src={invoice.customerSignatureBase64}
                alt="Customer Signature"
                className="h-10 object-contain border-b border-slate-300 pb-0.5"
              />
              <span className="text-[8.5px] text-slate-500 mt-0.5">توقيع العميل</span>
            </div>
          );
      }
    };

    const thermalOrder: InvoiceLayoutZoneId[] = effectiveThermalZones
      ? effectiveThermalZones.filter((z) => z.visible).map((z) => z.id)
      : [
          'HEADER_BRAND',
          'PARTIES_METADATA',
          'LINE_ITEMS_TABLE',
          'FINANCIAL_SUMMARY',
          'TAFQEET_BANKING',
          'VERIFICATION_QR_BARCODE',
          'WARRANTY_NOTES',
          'SIGNATURES_STAMP',
        ];

    return (
      <div
        data-testid="invoice-renderer-thermal"
        data-template={resolvedCustomLayout ? resolvedCustomLayout.id : activeThermal}
        dir="rtl"
        className={`relative overflow-hidden mx-auto bg-white text-slate-950 shadow-md border border-slate-300 transition-all print:shadow-none print:border-none ${
          is58mm ? 'max-w-[264px]' : 'max-w-[348px]'
        } ${thermalPaddingClass} ${thermalFontClass}`}
      >
        {showWatermark && (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-[0.05] select-none overflow-hidden"
          >
            <span
              style={{ color: primaryHex }}
              className="text-2xl font-black -rotate-30 whitespace-nowrap"
            >
              {watermarkText}
            </span>
          </div>
        )}
        <div className="relative z-10">
          {thermalOrder.map((zId) => renderThermalZone(zId))}
        </div>
      </div>
    );
  }

  // ============================================================================
  // 2. STANDARD A4 COMMERCIAL, TAX & WARRANTY INVOICE TEMPLATES
  //    Aligned with International B2B 7-Zone & Yemeni Onyx Pro Commercial Standards
  // ============================================================================
  const isExecutiveGridPro = activeStandard === 'a4_executive_grid_pro';
  const isYemenOfficial = activeStandard === 'a4_onyx_yemen';
  const isGlobalB2B = activeStandard === 'a4_global_sap_odoo';
  const isWarrantyA4 = activeStandard === 'a4_warranty_electronics';
  const isModernBlue = activeStandard === 'a4_modern_blue';
  const isContracting = activeStandard === 'a4_contracting_specs';
  const isMedical = activeStandard === 'a4_medical_pharmacy';
  const isMinimalist = activeStandard === 'a4_minimalist_clean';

  const density = resolvedCustomLayout?.spacingDensity || 'standard';
  const a4PaddingClass =
    paperMargin === 'narrow' || density === 'compact'
      ? 'p-4 sm:p-5'
      : paperMargin === 'wide' || density === 'airy'
      ? 'p-6 sm:p-8'
      : 'p-5 sm:p-6';
  const a4GapClass =
    density === 'compact' ? 'space-y-2.5' : density === 'airy' ? 'space-y-4' : 'space-y-3';

  const a4ScaleClass =
    fontScale === 'compact'
      ? 'text-[10.5px]'
      : fontScale === 'large'
      ? 'text-[13px]'
      : 'text-[11.5px]';

  const a4QrSize = settings.qrSizePx || 74;
  const a4BarcodeW = settings.barcodeWidthPx || 148;

  const tableHeaderStyle =
    resolvedCustomLayout?.tableHeaderStyle ||
    (isMinimalist ? 'minimal_line' : isYemenOfficial ? 'classic_bordered' : 'soft_tint');
  const showRowStripes =
    resolvedCustomLayout !== null ? resolvedCustomLayout.showRowStripes : !isMinimalist;
  const showGridBorders =
    resolvedCustomLayout !== null ? resolvedCustomLayout.showGridBorders : isYemenOfficial || isExecutiveGridPro;

  const invoiceTitleAr = sanitizedCustomHeaderAr
    ? sanitizedCustomHeaderAr
    : isWarrantyA4 && !allWarrantiesDisabled
    ? 'فاتورة مبيعات وشهادة ضمان رسمية'
    : isContracting
    ? 'فاتورة مستخلصات وتوريدات هندسية'
    : isMedical
    ? 'فاتورة توريد طبي وصيدلاني (FEFO)'
    : isGlobalB2B
    ? 'فاتورة ضريبية وتجارية موحدة'
    : isYemenOfficial
    ? 'فاتورة مبيعات تجارية وضريبية'
    : 'فاتورة مبيعات رسمية';

  const invoiceTitleEn =
    isWarrantyA4 && !allWarrantiesDisabled
      ? 'SALES INVOICE & WARRANTY CERTIFICATE'
      : isContracting
      ? 'ENGINEERING SUPPLY INVOICE'
      : isMedical
      ? 'PHARMACEUTICAL INVOICE'
      : isGlobalB2B
      ? 'COMMERCIAL TAX INVOICE'
      : 'TAX & COMMERCIAL INVOICE';

  // Reusable Authentic Commercial A4 Zone Blocks (Used by both Standard Presets and Drag-and-Drop Custom Layouts)
  const renderZoneHeaderBrand = () => {
    // Traditional Yemeni Onyx 3-Column Commercial Header OR International Clean B2B Header
    if (isYemenOfficial && !resolvedCustomLayout) {
      return (
        <div
          key="HEADER_BRAND"
          style={{ borderColor: primaryHex }}
          className="border-b-2 pb-3 grid grid-cols-12 gap-3 items-center"
        >
          {/* Right: Seller Arabic Identity */}
          <div className="col-span-12 sm:col-span-5 text-right space-y-0.5">
            <h1 className="text-base sm:text-lg font-black text-slate-950 tracking-tight leading-snug">
              {companyName}
            </h1>
            <div className="text-[11px] font-semibold text-slate-700 flex items-center gap-1">
              <MapPin className="w-3 h-3 shrink-0 text-slate-500" />
              <span>
                {branchName} {branchAddress ? `— ${branchAddress}` : ''}
              </span>
            </div>
            <div className="text-[10.5px] font-mono text-slate-600 flex flex-wrap gap-x-2.5">
              {branchPhone && <span dir="ltr">هاتف: {branchPhone}</span>}
              {taxNumber && taxNumber !== '—' && (
                <span dir="ltr">الرقم الضريبي: {taxNumber}</span>
              )}
            </div>
          </div>

          {/* Center: Logo + Official Yemeni Document Title */}
          <div className="col-span-12 sm:col-span-3 flex flex-col items-center justify-center text-center gap-1.5">
            {showCompanyLogo && (
              <CompanyBrandCrest
                companyName={companyName}
                companyLogo={companyLogo}
                size={logoSize === 'lg' ? 'md' : 'sm'}
                primaryColorHex={primaryHex}
              />
            )}
            <div
              style={{
                borderColor: primaryHex,
                color: primaryHex,
                backgroundColor: themePalette.headerSurfaceBg,
              }}
              className="px-3 py-1 rounded border font-black text-[11px] whitespace-nowrap"
            >
              {invoiceTitleAr}
            </div>
          </div>

          {/* Left: Structured Document Metadata Table (Number, Date, Status, Currency) */}
          <div className="col-span-12 sm:col-span-4 border border-slate-300 rounded overflow-hidden text-[10.5px]">
            <div className="grid grid-cols-2 border-b border-slate-200 bg-slate-50">
              <span className="px-2 py-1 font-bold text-slate-600 border-l border-slate-200">
                رقم الفاتورة
              </span>
              <span className="px-2 py-1 font-mono font-black text-slate-950 text-left whitespace-nowrap" dir="ltr">
                {invoice.invoiceNumber}
              </span>
            </div>
            <div className="grid grid-cols-2 border-b border-slate-200">
              <span className="px-2 py-1 font-bold text-slate-600 border-l border-slate-200">
                التاريخ
              </span>
              <span className="px-2 py-1 font-mono font-bold text-slate-900 text-left whitespace-nowrap" dir="ltr">
                {invoice.date}
              </span>
            </div>
            <div className="grid grid-cols-2 border-b border-slate-200 bg-slate-50">
              <span className="px-2 py-1 font-bold text-slate-600 border-l border-slate-200">
                العملة
              </span>
              <span className="px-2 py-1 font-mono font-bold text-slate-900 text-left" dir="ltr">
                {currency}
              </span>
            </div>
            <div className="grid grid-cols-2">
              <span className="px-2 py-1 font-bold text-slate-600 border-l border-slate-200">
                الحالة
              </span>
              <span
                className={`px-2 py-1 font-bold text-left ${
                  isReturnedOrVoid ? 'text-rose-700 font-black' : 'text-emerald-700'
                }`}
              >
                {invoiceStatusAr}
              </span>
            </div>
          </div>
        </div>
      );
    }

    // International Clean Commercial Header (Restrained, High-Contrast, Non-Gimmicky)
    return (
      <div
        key="HEADER_BRAND"
        style={{
          backgroundColor:
            resolvedCustomLayout?.headerSurfaceHex ||
            (isMinimalist ? '#ffffff' : themePalette.headerSurfaceBg),
          borderColor: isMinimalist ? '#e2e8f0' : themePalette.headerBorderColor,
        }}
        className={`rounded-lg border p-3.5 ${
          isMinimalist ? 'border-x-0 border-t-0 rounded-none px-0 pt-1 pb-3' : ''
        }`}
      >
        <div className="grid grid-cols-12 gap-3 items-center">
          {/* Seller Brand & Details */}
          <div className="col-span-12 sm:col-span-7 flex items-start gap-3 text-right">
            {showCompanyLogo && logoPosition !== 'left' && (
              <CompanyBrandCrest
                companyName={companyName}
                companyLogo={companyLogo}
                size={logoSize === 'lg' ? 'lg' : logoSize === 'sm' ? 'sm' : 'md'}
                primaryColorHex={primaryHex}
              />
            )}
            <div className="space-y-0.5 min-w-0">
              <div className="flex flex-wrap items-baseline gap-2">
                <h1 className="text-base sm:text-lg font-black text-slate-950 tracking-tight leading-snug">
                  {companyName}
                </h1>
                {showCompanyNameEn && resolvedCompanyEn && (
                  <span className="text-[10.5px] font-semibold text-slate-500" dir="ltr">
                    {resolvedCompanyEn}
                  </span>
                )}
              </div>
              <div className="text-[11px] font-medium text-slate-600 flex items-center gap-1">
                <MapPin className="w-3 h-3 shrink-0 text-slate-400" />
                <span>
                  {branchName} {branchAddress ? `— ${branchAddress}` : ''}
                </span>
              </div>
              {(branchPhone || (taxNumber && taxNumber !== '—')) && (
                <div className="text-[10.5px] font-mono text-slate-600 flex flex-wrap items-center gap-x-3">
                  {branchPhone && <span dir="ltr">هاتف: {branchPhone}</span>}
                  {taxNumber && taxNumber !== '—' && (
                    <span dir="ltr">الرقم الضريبي: {taxNumber}</span>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Document Identity & Reference Box */}
          <div className="col-span-12 sm:col-span-5 flex flex-col sm:items-end justify-between gap-1.5">
            <div className="flex items-center gap-2">
              {showCompanyLogo && logoPosition === 'left' && (
                <CompanyBrandCrest
                  companyName={companyName}
                  companyLogo={companyLogo}
                  size="sm"
                  primaryColorHex={primaryHex}
                />
              )}
              <div className="sm:text-left">
                <div
                  style={{ color: primaryHex }}
                  className="text-xs sm:text-sm font-black leading-tight"
                >
                  {invoiceTitleAr}
                </div>
                <div
                  className="text-[9.5px] font-mono font-bold tracking-wider text-slate-400 uppercase"
                  dir="ltr"
                >
                  {invoiceTitleEn}
                </div>
              </div>
            </div>

            <div className="w-full sm:w-auto border border-slate-300 rounded bg-white px-3 py-1.5 flex flex-wrap items-center justify-between sm:justify-end gap-x-3 gap-y-1 text-[11px] font-mono">
              <div className="whitespace-nowrap">
                <span className="text-[9px] text-slate-400 block font-sans">رقم المستند</span>
                <span className="font-black text-slate-950 whitespace-nowrap" dir="ltr">
                  {invoice.invoiceNumber}
                </span>
              </div>
              <div className="h-5 w-px bg-slate-200" />
              <div className="whitespace-nowrap">
                <span className="text-[9px] text-slate-400 block font-sans">التاريخ</span>
                <span className="font-bold text-slate-800 whitespace-nowrap" dir="ltr">
                  {invoice.date}
                </span>
              </div>
              <div className="h-5 w-px bg-slate-200" />
              <div className="whitespace-nowrap">
                <span className="text-[9px] text-slate-400 block font-sans">الحالة</span>
                <span
                  className={`font-sans font-black text-[10px] whitespace-nowrap ${
                    isReturnedOrVoid || remainingDebtVal > 0.01
                      ? 'text-rose-700'
                      : 'text-emerald-700'
                  }`}
                >
                  {invoiceStatusAr}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderZonePartiesMetadata = () => (
    <div key="PARTIES_METADATA" className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
      <div className="sm:col-span-7 rounded-lg border border-slate-200 bg-slate-50/50 p-2.5">
        <div className="flex items-center justify-between border-b border-slate-200/80 pb-1 mb-1.5">
          <span className="text-[10.5px] font-black text-slate-700 flex items-center gap-1">
            <UserCheck className="w-3.5 h-3.5 text-emerald-700" />
            <span>بيانات العميل (Bill To / Customer)</span>
          </span>
          {showCustomerId && (
            <span className="text-[9.5px] font-mono text-slate-400" dir="ltr">
              ID: {invoice.customerId}
            </span>
          )}
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <span className="text-[9.5px] text-slate-400 block">الاسم التجاري / العميل:</span>
            <span className="font-black text-slate-950 text-xs">{invoice.customerName}</span>
          </div>
          {showCustomerPhone && (
            <div>
              <span className="text-[9.5px] text-slate-400 block">رقم التواصل:</span>
              <span className="font-mono font-bold text-slate-800 text-xs" dir="ltr">
                {invoice.customerPhone || '—'}
              </span>
            </div>
          )}
        </div>
      </div>

      <div className="sm:col-span-5 rounded-lg border border-slate-200 bg-slate-50/50 p-2.5">
        <div className="flex items-center justify-between border-b border-slate-200/80 pb-1 mb-1.5">
          <span className="text-[10.5px] font-black text-slate-700 flex items-center gap-1">
            <CreditCard style={{ color: secondaryHex }} className="w-3.5 h-3.5" />
            <span>شروط الدفع والتسليم</span>
          </span>
          <span className="text-[9px] font-mono text-slate-500 font-bold" dir="ltr">
            {paymentMethodEn}
          </span>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <span className="text-[9.5px] text-slate-400 block">طريقة السداد:</span>
            <span className="font-bold text-slate-900 text-xs">{paymentMethodAr}</span>
          </div>
          <div>
            <span className="text-[9.5px] text-slate-400 block">الفرع / العملة:</span>
            <span className="font-bold text-slate-800 text-xs">
              {branchName} ({currency})
            </span>
          </div>
        </div>
      </div>
    </div>
  );

  const renderZoneLineItemsTable = () => {
    const headerRowStyle: React.CSSProperties =
      tableHeaderStyle === 'minimal_line'
        ? {
            backgroundColor: 'transparent',
            color: '#0f172a',
            borderBottom: `2px solid ${primaryHex}`,
          }
        : tableHeaderStyle === 'classic_bordered'
        ? {
            backgroundColor: themePalette.tableHeaderBg,
            color: themePalette.tableHeaderText,
            borderBottom: `2px solid ${themePalette.tableHeaderBorder}`,
          }
        : {
            backgroundColor: themePalette.tableHeaderBg,
            color: themePalette.tableHeaderText,
            borderBottom: `1.5px solid ${themePalette.tableHeaderBorder}`,
          };

    const cellBorderClass = showGridBorders ? 'border-l border-slate-200' : '';

    return (
      <div
        key="LINE_ITEMS_TABLE"
        className={`overflow-x-auto ${
          tableHeaderStyle === 'minimal_line'
            ? 'border-b border-slate-300'
            : 'rounded-lg border border-slate-300'
        }`}
      >
        <table className="w-full text-right border-collapse">
          <thead>
            <tr
              data-testid="invoice-a4-table-header-row"
              style={headerRowStyle}
              className="text-[10.5px] font-black"
            >
              <th className={`py-2 px-2 text-center w-8 ${cellBorderClass}`}>م</th>
              {showItemSku && (
                <th className={`py-2 px-2 text-start w-24 ${cellBorderClass}`}>الرمز SKU</th>
              )}
              <th className={`py-2 px-2.5 text-start ${cellBorderClass}`}>
                بيان الصنف والمواصفات (Description)
              </th>
              {(hasSerialOrWarranty || (showSerialAndWarranty && isWarrantyA4 && !allWarrantiesDisabled)) && (
                <th className={`py-2 px-2 text-center ${cellBorderClass}`}>
                  {allWarrantiesDisabled ? 'الرقم التسلسلي S/N' : 'السيريال / الضمان'}
                </th>
              )}
              {(hasBatchOrExpiry || isMedical) && (
                <th className={`py-2 px-2 text-center ${cellBorderClass}`}>التشغيلة / الصلاحية</th>
              )}
              <th className={`py-2 px-2 text-center w-14 ${cellBorderClass}`}>الكمية</th>
              <th className={`py-2 px-2 text-end w-22 ${cellBorderClass}`}>سعر الوحدة</th>
              {showItemDiscount && (
                <th className={`py-2 px-2 text-end w-16 ${cellBorderClass}`}>الخصم</th>
              )}
              {showItemTax && (
                <th className={`py-2 px-2 text-end w-16 ${cellBorderClass}`}>الضريبة</th>
              )}
              <th className="py-2 px-2.5 text-end w-26">الإجمالي ({currency})</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {invoice.items.map((item, idx) => (
              <tr
                key={idx}
                style={
                  showRowStripes && idx % 2 === 1
                    ? { backgroundColor: themePalette.tableStripeBg }
                    : undefined
                }
                className={idx % 2 === 0 ? 'bg-white' : ''}
              >
                <td
                  className={`py-1.5 px-2 text-center font-mono font-bold text-slate-500 tabular-nums ${cellBorderClass}`}
                >
                  {idx + 1}
                </td>
                {showItemSku && (
                  <td
                    className={`py-1.5 px-2 text-start font-mono text-[10.5px] font-semibold text-slate-700 ${cellBorderClass}`}
                    dir="ltr"
                  >
                    {item.sku}
                  </td>
                )}
                <td className={`py-1.5 px-2.5 font-bold text-slate-950 ${cellBorderClass}`}>
                  <div>{item.productName}</div>
                  {item.kitchenNotes && (
                    <div className="text-[9.5px] text-slate-500 font-normal mt-0.5">
                      ملاحظة: {item.kitchenNotes}
                    </div>
                  )}
                </td>
                {(hasSerialOrWarranty || (showSerialAndWarranty && isWarrantyA4 && !allWarrantiesDisabled)) && (
                  <td className={`py-1.5 px-2 text-center ${cellBorderClass}`}>
                    <div className="font-mono text-[10px] font-bold text-slate-800" dir="ltr">
                      {item.serialNumber || '—'}
                    </div>
                    {isCartItemWarrantyActive(item) ? (
                      <span className="inline-block mt-0.5 px-1.5 py-0.2 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 text-[9px] font-bold">
                        ضمان {item.warrantyMonths} شهر
                      </span>
                    ) : null}
                  </td>
                )}
                {(hasBatchOrExpiry || isMedical) && (
                  <td
                    className={`py-1.5 px-2 text-center font-mono text-[9.5px] ${cellBorderClass}`}
                    dir="ltr"
                  >
                    <div>LOT: {item.batchNumber || '—'}</div>
                    <div className="text-rose-700">EXP: {item.expiryDate || '—'}</div>
                  </td>
                )}
                <td
                  className={`py-1.5 px-2 text-center font-mono font-black text-slate-950 tabular-nums ${cellBorderClass}`}
                  dir="ltr"
                >
                  {formatCleanNumber(item.quantity)}
                </td>
                <td
                  className={`py-1.5 px-2 text-end font-mono font-semibold text-slate-800 tabular-nums ${cellBorderClass}`}
                  dir="ltr"
                >
                  {formatCleanNumber(item.unitPrice)}
                </td>
                {showItemDiscount && (
                  <td
                    className={`py-1.5 px-2 text-end font-mono text-rose-600 tabular-nums ${cellBorderClass}`}
                    dir="ltr"
                  >
                    {formatCleanNumber(item.discount || 0)}
                  </td>
                )}
                {showItemTax && (
                  <td
                    className={`py-1.5 px-2 text-end font-mono text-slate-600 tabular-nums ${cellBorderClass}`}
                    dir="ltr"
                  >
                    {formatCleanNumber(item.taxAmount || 0)}
                  </td>
                )}
                <td
                  className="py-1.5 px-2.5 text-end font-mono font-black text-slate-950 tabular-nums"
                  dir="ltr"
                >
                  {formatCleanNumber(item.total)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  const renderZoneTafqeetBanking = () => (
    <div key="TAFQEET_BANKING" className="h-full flex flex-col justify-between space-y-2">
      {showTafqeet && (
        <div className="px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between gap-2 text-xs">
          <span className="text-slate-500 font-bold shrink-0">المبلغ كتابةً:</span>
          <span className="font-black text-slate-950 text-right">{tafqeetText}</span>
        </div>
      )}

      {(showBankAccounts || invoice.notes || settings.bankIban || settings.bankSwift) && (
        <div className="flex-1 p-2.5 rounded-lg bg-slate-50/70 border border-slate-200 flex flex-col justify-between space-y-1.5 text-[10px] text-slate-600">
          {showBankAccounts && (
            <div className="space-y-1">
              <div className="font-black text-slate-900 text-[10.5px] flex items-center gap-1">
                <Landmark className="w-3.5 h-3.5 text-slate-600 shrink-0" />
                <span>بيانات التحويل المصرفي المعتمدة (Bank & Remittance)</span>
              </div>
              {(settings.bankIban || settings.bankSwift) && (
                <div className="flex flex-wrap gap-3 font-mono text-[10px] text-slate-800" dir="ltr">
                  {settings.bankIban && <span>IBAN: {settings.bankIban}</span>}
                  {settings.bankSwift && <span>SWIFT: {settings.bankSwift}</span>}
                </div>
              )}
              {customBankLines.length > 0 ? (
                customBankLines.map((line, i) => <div key={i}>• {line}</div>)
              ) : (
                !settings.bankIban && (
                  <div className="text-slate-400">
                    يمكنك إضافة أرقام الحسابات المصرفية أو IBAN من محرر القوالب.
                  </div>
                )
              )}
            </div>
          )}
          {invoice.notes && (
            <div className="text-slate-800 font-bold pt-0.5">ملاحظات: {invoice.notes}</div>
          )}
          <div className="text-[9px] text-slate-400 pt-1 border-t border-slate-200/70">
            وثيقة مالية معتمدة صادرة آلياً وموثقة رقمياً.
          </div>
        </div>
      )}
    </div>
  );

  const renderZoneFinancialSummary = () => (
    <div
      key="FINANCIAL_SUMMARY"
      className="h-full bg-slate-50/60 rounded-lg border border-slate-200 p-3 flex flex-col justify-between space-y-2"
    >
      <div className="space-y-1">
        <div className="flex justify-between items-center text-slate-500 text-[10px]">
          <span>الأصناف والكميات:</span>
          <span className="font-bold text-slate-800 tabular-nums whitespace-nowrap" dir="rtl">
            {formatCleanNumber(invoice.items.length)} صنف • {formatCleanNumber(totalUnitsSold)} وحدة
          </span>
        </div>
        <div className="flex justify-between items-center text-slate-700">
          <span>المجموع الفرعي:</span>
          <span className="font-mono font-bold text-slate-950 tabular-nums" dir="ltr">
            {formatCleanNumber(invoice.subtotal)} {currency}
          </span>
        </div>
        {invoice.discountAmount > 0 && (
          <div className="flex justify-between items-center text-rose-700">
            <span>الخصم التجاري:</span>
            <span className="font-mono font-bold tabular-nums" dir="ltr">
              -{formatCleanNumber(invoice.discountAmount)} {currency}
            </span>
          </div>
        )}
        {invoice.taxAmount > 0 && (
          <div className="flex justify-between items-center text-slate-700">
            <span>الضريبة المضافة:</span>
            <span className="font-mono font-bold text-slate-950 tabular-nums" dir="ltr">
              {formatCleanNumber(invoice.taxAmount)} {currency}
            </span>
          </div>
        )}
      </div>

      <div
        data-testid="invoice-a4-net-payable-box"
        style={{
          backgroundColor: themePalette.netPayableBg,
          color: themePalette.netPayableText,
          borderColor: themePalette.netPayableBorder,
        }}
        className="px-3 py-2 rounded-lg border-2 flex items-center justify-between"
      >
        <div>
          <div className="text-[11px] font-black">الصافي النهائي المستحق</div>
          <div className="text-[8.5px] opacity-75 font-mono" dir="ltr">
            NET PAYABLE
          </div>
        </div>
        <div
          style={{ color: primaryHex }}
          className="font-mono text-base sm:text-lg font-black tabular-nums"
          dir="ltr"
        >
          {formatCleanNumber(invoice.grandTotal)} <span className="text-xs">{currency}</span>
        </div>
      </div>

      <div data-testid="a4-paid-remaining-box" className="grid grid-cols-2 gap-1.5 text-[10.5px]">
        <div className="bg-white px-2.5 py-1 rounded border border-emerald-200 flex justify-between items-center">
          <span className="text-slate-600 font-semibold">المدفوع:</span>
          <span className="font-mono font-black text-emerald-700 tabular-nums" dir="ltr">
            {formatCleanNumber(paidVal)} {currency}
          </span>
        </div>
        <div
          className={`px-2.5 py-1 rounded border flex justify-between items-center ${
            remainingDebtVal > 0.01
              ? 'bg-rose-50 border-rose-300 text-rose-800'
              : 'bg-white border-slate-200 text-slate-800'
          }`}
        >
          <span className="font-semibold">
            {remainingDebtVal > 0.01 ? 'المتبقي (دين):' : 'المتبقي:'}
          </span>
          <span className="font-mono font-black tabular-nums" dir="ltr">
            {formatCleanNumber(remainingDebtVal)} {currency}
          </span>
        </div>
      </div>
      {changeDueVal > 0 && (
        <div className="bg-emerald-50 px-2.5 py-1 rounded border border-emerald-200 flex justify-between items-center text-[10px] text-emerald-900 font-bold">
          <span>المستلم: {formatCleanNumber(tenderedVal)}</span>
          <span>الباقي للعميل: {formatCleanNumber(changeDueVal)}</span>
        </div>
      )}
    </div>
  );

  const renderZoneVerificationQrBarcode = () => {
    if (!settings.showQR && !settings.showBarcode) return null;
    return (
      <div
        key="VERIFICATION_QR_BARCODE"
        data-testid={
          isExecutiveGridPro
            ? 'invoice-executive-grid-verification-pod'
            : 'invoice-a4-verification-pod'
        }
        style={{
          backgroundColor: themePalette.verificationPodBg,
          borderColor: themePalette.verificationPodBorder,
        }}
        className="h-full px-3 py-2.5 rounded-lg border flex flex-wrap items-center justify-between gap-3"
      >
        <div className="flex items-center gap-3 flex-wrap">
          {settings.showQR && (
            <div data-testid="invoice-a4-qr-wrapper" className="flex items-center gap-2">
              <CrispQRCodeSVG payload={qrPayload} sizePx={a4QrSize} darkColor={primaryHex} />
            </div>
          )}
          <div className="text-right space-y-0.5">
            <div className="text-[10.5px] font-black text-slate-900 flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 shrink-0" style={{ color: primaryHex }} />
              <span>التحقق الضريبي والباركود الرقمي</span>
            </div>
            <p className="text-[9.5px] text-slate-500">
              امسح رمز الاستجابة السريع للتحقق من بيانات الفاتورة الضريبية وإصدارها الآلي.
            </p>
          </div>
        </div>

        {settings.showBarcode && (
          <div data-testid="invoice-a4-barcode-wrapper" className="shrink-0">
            <CrispLinearBarcodeSVG
              code={invoice.invoiceNumber}
              widthPx={Math.min(a4BarcodeW, 175)}
              heightPx={28}
              darkColor={primaryHex}
            />
          </div>
        )}
      </div>
    );
  };

  const renderZoneWarrantyNotes = () => {
    if (allWarrantiesDisabled || !anyItemHasWarranty) return null;
    if (!settings.showWarrantyTerms && !isWarrantyA4 && !settings.footerNoteAr) return null;
    return (
      <div
        key="WARRANTY_NOTES"
        data-testid="invoice-warranty-notes-box"
        className="px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-[10px] text-slate-600 space-y-0.5"
      >
        <div className="font-black text-slate-900 flex items-center gap-1.5 text-[10.5px]">
          <Award className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
          <span>شروط الضمان وسياسة الاستبدال ({companyName}):</span>
        </div>
        <p className="leading-relaxed">
          {settings.footerNoteAr} • يسري الضمان على العيوب المصنعية وفق الرقم التسلسلي (S/N) ولا
          يشمل الكسر أو سوء الاستخدام.
        </p>
      </div>
    );
  };

  const renderZoneSignaturesStamp = () => {
    if (!settings.showStampAndSignature && !invoice.customerSignatureBase64) return null;
    return (
      <div
        key="SIGNATURES_STAMP"
        className="pt-2.5 border-t border-slate-200 grid grid-cols-3 gap-4 items-center text-center text-[10.5px]"
      >
        <div className="flex flex-col items-center justify-end space-y-1.5 min-h-[54px]">
          {invoice.customerSignatureBase64 ? (
            <div data-testid="invoice-customer-signature" className="flex flex-col items-center">
              <img
                src={invoice.customerSignatureBase64}
                alt="Customer Signature"
                className="h-11 object-contain border-b border-slate-400 px-2 pb-0.5"
              />
              <span className="text-[9px] font-bold text-slate-600 mt-0.5">
                توقيع العميل المعتمد
              </span>
            </div>
          ) : (
            <>
              <div className="font-bold text-slate-700">توقيع المستلم / العميل</div>
              <div className="border-b border-dashed border-slate-300 w-32 mx-auto pt-3" />
            </>
          )}
        </div>

        <div className="flex justify-center">
          <OfficialCompanySeal
            companyName={companyName}
            branchName={branchName}
            taxNumber={taxNumber}
            colorHex={primaryHex}
          />
        </div>

        <div className="flex flex-col items-center justify-end space-y-1.5 min-h-[54px]">
          <div className="font-bold text-slate-700">اعتماد المبيعات والحسابات</div>
          <div className="border-b border-dashed border-slate-300 w-32 mx-auto pt-3" />
        </div>
      </div>
    );
  };

  const renderA4ZoneById = (zoneId: InvoiceLayoutZoneId) => {
    switch (zoneId) {
      case 'HEADER_BRAND':
        return renderZoneHeaderBrand();
      case 'PARTIES_METADATA':
        return renderZonePartiesMetadata();
      case 'LINE_ITEMS_TABLE':
        return renderZoneLineItemsTable();
      case 'TAFQEET_BANKING':
        return renderZoneTafqeetBanking();
      case 'FINANCIAL_SUMMARY':
        return renderZoneFinancialSummary();
      case 'VERIFICATION_QR_BARCODE':
        return renderZoneVerificationQrBarcode();
      case 'WARRANTY_NOTES':
        return renderZoneWarrantyNotes();
      case 'SIGNATURES_STAMP':
        return renderZoneSignaturesStamp();
    }
  };

  // Custom Drag-and-Drop Grid Layout Mode
  if (resolvedCustomLayout && resolvedCustomLayout.format === 'a4') {
    const orderedZones = resolveEffectiveZones(resolvedCustomLayout.zones).filter(
      (z) => z.visible
    );
    return (
      <div
        data-testid="invoice-renderer-a4"
        data-template={resolvedCustomLayout.id}
        data-theme-palette={themePalette.themeId}
        dir="rtl"
        className={`relative mx-auto max-w-[840px] bg-white text-slate-900 shadow-lg border border-slate-300 rounded-lg overflow-hidden print:shadow-none print:border-none print:rounded-none ${a4ScaleClass}`}
      >
        {showWatermark && (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center opacity-[0.05] select-none overflow-hidden"
          >
            <span
              style={{ color: primaryHex }}
              className="text-5xl font-black -rotate-30 whitespace-nowrap tracking-wide"
            >
              {watermarkText}
            </span>
          </div>
        )}
        {isReturnedOrVoid && (
          <div
            data-testid="invoice-returned-stamp"
            className="pointer-events-none absolute top-10 left-1/2 -translate-x-1/2 z-30 border-4 border-rose-600 bg-rose-50/95 text-rose-800 px-4 py-2 rounded-lg shadow-sm -rotate-6 text-center"
          >
            <div className="text-sm font-black tracking-wide">ملغاة — تم الاسترجاع</div>
            <div className="text-[11px] font-bold">
              {refundedDisplayVal > 0
                ? `تم إرجاع المبلغ: ${formatCleanNumber(refundedDisplayVal)} ${currency}`
                : `إلغاء فاتورة وإسقاط المديونية: ${formatCleanNumber(invoice.grandTotal)} ${currency}`}
            </div>
            <div className="text-[9.5px] font-mono text-rose-700" dir="ltr">
              {invoice.returnCreditNoteNumber ? `${invoice.returnCreditNoteNumber} • ` : ''}
              {invoice.returnedAt || invoice.date}
            </div>
          </div>
        )}
        <div style={{ backgroundColor: isReturnedOrVoid ? '#dc2626' : primaryHex }} className="h-1.5 w-full" />
        <div className={`relative z-10 grid grid-cols-12 gap-3 items-stretch ${a4PaddingClass}`}>
          {orderedZones.map((zone) => {
            const content = renderA4ZoneById(zone.id);
            if (!content) return null;
            return (
              <div
                key={zone.id}
                data-testid={`invoice-zone-${zone.id}`}
                className={A4_COL_SPAN_CLASS[zone.colSpan] || 'col-span-12'}
              >
                {content}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // Standard Preset A4 Layout (Clean, Compact, Authentic International & Yemeni Commercial Structure)
  return (
    <div
      data-testid="invoice-renderer-a4"
      data-template={activeStandard}
      data-theme-palette={themePalette.themeId}
      dir="rtl"
      className={`relative mx-auto max-w-[840px] bg-white text-slate-900 shadow-lg border border-slate-300 rounded-lg overflow-hidden print:shadow-none print:border-none print:rounded-none ${a4ScaleClass}`}
    >
      {showWatermark && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center opacity-[0.05] select-none overflow-hidden"
        >
          <span
            style={{ color: primaryHex }}
            className="text-5xl sm:text-6xl font-black -rotate-30 whitespace-nowrap tracking-wide"
          >
            {watermarkText}
          </span>
        </div>
      )}

      {isReturnedOrVoid && (
        <div
          data-testid="invoice-returned-stamp"
          className="pointer-events-none absolute top-10 left-1/2 -translate-x-1/2 z-30 border-4 border-rose-600 bg-rose-50/95 text-rose-800 px-4 py-2 rounded-lg shadow-sm -rotate-6 text-center"
        >
          <div className="text-sm font-black tracking-wide">ملغاة — تم الاسترجاع</div>
          <div className="text-[11px] font-bold">
            {refundedDisplayVal > 0
              ? `تم إرجاع المبلغ: ${formatCleanNumber(refundedDisplayVal)} ${currency}`
              : `إلغاء فاتورة وإسقاط المديونية: ${formatCleanNumber(invoice.grandTotal)} ${currency}`}
          </div>
          <div className="text-[9.5px] font-mono text-rose-700" dir="ltr">
            {invoice.returnCreditNoteNumber ? `${invoice.returnCreditNoteNumber} • ` : ''}
            {invoice.returnedAt || invoice.date}
          </div>
        </div>
      )}

      {/* Restrained 4px Commercial Top Accent Rule */}
      <div
        style={{
          background: isReturnedOrVoid
            ? '#dc2626'
            : isModernBlue || isGlobalB2B
            ? `linear-gradient(90deg, ${primaryHex}, ${secondaryHex})`
            : primaryHex,
        }}
        className="h-1.5 w-full"
      />

      <div className={`relative z-10 ${a4GapClass} ${a4PaddingClass}`}>
        {renderZoneHeaderBrand()}
        {isReturnedOrVoid && (
          <div
            data-testid="invoice-returned-banner"
            className="p-2.5 rounded-lg border-2 border-rose-300 bg-rose-50 text-rose-900 flex flex-wrap items-center justify-between gap-2 text-xs"
          >
            <div className="font-black">
              تم إلغاء هذه الفاتورة واسترجاعها بالكامل — لا تُحتسب ضمن المبيعات الفعّالة
            </div>
            <div className="font-bold font-mono" dir="ltr">
              {refundedDisplayVal > 0
                ? `تم إرجاع المبلغ: ${formatCleanNumber(refundedDisplayVal)} ${currency}`
                : `تم إسقاط المديونية: ${formatCleanNumber(invoice.grandTotal)} ${currency}`}
            </div>
          </div>
        )}
        {renderZonePartiesMetadata()}
        {renderZoneLineItemsTable()}

        {/* Balanced Bottom Grid: Tafqeet/Banking (7 cols) + Totals Summary (5 cols) */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-stretch">
          <div className="md:col-span-7">{renderZoneTafqeetBanking()}</div>
          <div className="md:col-span-5">{renderZoneFinancialSummary()}</div>
        </div>

        {renderZoneVerificationQrBarcode()}
        {renderZoneWarrantyNotes()}
        {renderZoneSignaturesStamp()}
      </div>
    </div>
  );
};
