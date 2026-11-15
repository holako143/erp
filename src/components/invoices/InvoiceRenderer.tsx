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
  ShieldCheck,
  Award,
  Building2,
  MapPin,
  UserCheck,
  CreditCard,
} from 'lucide-react';

export interface InvoiceRendererProps {
  invoice: SalesInvoice;
  mode: 'thermal' | 'a4';
  thermalTemplate?: ThermalTemplateType;
  standardTemplate?: StandardInvoiceTemplateType;
  settings: InvoiceTemplateSettings;
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
}> = ({ payload, sizePx = 88, darkColor = '#0f172a' }) => {
  const matrix = useMemo(() => generateQRMatrix(payload, 25), [payload]);
  const dim = matrix.length;
  const quietZone = 2;
  const totalViewBox = dim + quietZone * 2;

  return (
    <div
      data-testid="invoice-qr-svg-container"
      className="inline-flex flex-col items-center justify-center bg-white p-1 rounded-lg border border-slate-300 shadow-2xs shrink-0"
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
}> = ({ code, widthPx = 190, heightPx = 36, darkColor = '#0f172a' }) => {
  const cleanCode = (code || 'INV-0001').trim();
  const bars = useMemo(() => generateLinearBarcodeBars(cleanCode), [cleanCode]);
  const quietZone = 8;
  const contentWidth =
    bars.length > 0 ? bars[bars.length - 1].x + bars[bars.length - 1].width : 80;
  const totalModules = Math.ceil(contentWidth + quietZone * 2);

  return (
    <div
      data-testid="invoice-barcode-svg-container"
      className="inline-flex flex-col items-center justify-center bg-white px-2 py-1 rounded-lg border border-slate-200 max-w-full"
      dir="ltr"
    >
      <svg
        viewBox={`0 0 ${totalModules} 36`}
        width={widthPx}
        height={heightPx}
        preserveAspectRatio="none"
        shapeRendering="crispEdges"
        className="block max-w-full"
        aria-label={`Barcode ${cleanCode}`}
      >
        <rect x={0} y={0} width={totalModules} height={36} fill="#ffffff" />
        {bars.map((bar, idx) => (
          <rect
            key={idx}
            x={bar.x + quietZone}
            y={2}
            width={bar.width}
            height={32}
            fill={darkColor}
          />
        ))}
      </svg>
      <div className="font-mono text-[9px] font-bold tracking-[0.2em] text-slate-800 mt-0.5 leading-none">
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
      ? 'w-11 h-11 rounded-xl'
      : size === 'lg'
      ? 'w-18 h-18 rounded-2xl'
      : 'w-14 h-14 rounded-2xl';

  if (resolvedLogo) {
    return (
      <div
        data-testid="invoice-company-logo-box"
        className={`${boxDims} bg-white border-2 border-slate-200 p-1 flex items-center justify-center overflow-hidden shadow-2xs shrink-0`}
      >
        <img src={resolvedLogo} alt={companyName} className="w-full h-full object-contain" />
      </div>
    );
  }

  return (
    <div
      data-testid="invoice-company-crest-box"
      style={{ backgroundColor: primaryColorHex }}
      className={`${boxDims} text-white border-2 border-white/25 flex flex-col items-center justify-center shadow-xs shrink-0 select-none`}
    >
      <Building2 className={size === 'sm' ? 'w-4 h-4 opacity-90' : 'w-5 h-5 opacity-90'} />
      <span className="text-[10px] font-black tracking-tight mt-0.5 leading-none">{initials}</span>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Official Company Stamp Component (Uses Customer's Own Company Name & Tax ID)
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
      className="inline-flex flex-col items-center justify-center border-2 border-double rounded-xl px-4 py-1.5 -rotate-2 select-none bg-white/80"
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

export const InvoiceRenderer: React.FC<InvoiceRendererProps> = ({
  invoice,
  mode,
  thermalTemplate,
  standardTemplate,
  settings,
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

  // Full 21-Control Customization Resolution
  const primaryHex = settings.primaryColorHex || '#0f172a';
  const secondaryHex = settings.secondaryColorHex || '#2563eb';
  const fontScale = settings.fontScale || 'normal';
  const paperMargin = settings.paperMargin || 'normal';
  const logoSize = settings.logoSize || 'md';
  const logoPosition = settings.logoPosition || 'center';
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

  // Authentic ZATCA / Tax QR payload
  const qrPayload = useMemo(() => {
    try {
      return encodeZatcaPhase2TLVBase64({
        sellerName: companyName,
        vatRegistrationNumber: taxNumber || '0',
        timestamp: invoice.date.includes('T') ? invoice.date : `${invoice.date}T12:00:00Z`,
        invoiceTotal: String(invoice.grandTotal),
        vatTotal: String(invoice.taxAmount),
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

  const hasSerialOrWarranty =
    showSerialAndWarranty &&
    invoice.items.some((i) => Boolean(i.serialNumber) || Boolean(i.warrantyMonths));
  const hasBatchOrExpiry = invoice.items.some(
    (i) => Boolean(i.batchNumber) || Boolean(i.expiryDate)
  );

  const tafqeetText = useMemo(
    () => numberToArabicWords(invoice.grandTotal, currency),
    [invoice.grandTotal, currency]
  );

  // ============================================================================
  // 1. THERMAL RECEIPT TEMPLATES (80mm & 58mm POS Roll Paper)
  // ============================================================================
  if (mode === 'thermal') {
    const is58mm = activeThermal === 'thermal_58mm_compact';
    const isYemenPos = activeThermal === 'thermal_80mm_onyx_pos';
    const isModern = activeThermal === 'thermal_80mm_modern';
    const isMinimal = activeThermal === 'thermal_80mm_minimal';
    const isWarrantyReceipt = activeThermal === 'thermal_80mm_warranty';
    const isRestaurant = activeThermal === 'thermal_80mm_restaurant';

    const thermalPaddingClass =
      paperMargin === 'narrow'
        ? 'p-2'
        : paperMargin === 'wide'
        ? 'p-5'
        : is58mm
        ? 'p-3'
        : 'p-4';
    const thermalFontClass =
      fontScale === 'compact'
        ? 'text-[9.5px]'
        : fontScale === 'large'
        ? 'text-[12px]'
        : is58mm
        ? 'text-[10px]'
        : 'text-[11px]';
    const thermalQrSize = settings.qrSizePx || (is58mm ? 74 : 86);
    const thermalBarcodeW = settings.barcodeWidthPx || (is58mm ? 165 : 210);

    return (
      <div
        data-testid="invoice-renderer-thermal"
        data-template={activeThermal}
        dir="rtl"
        className={`relative overflow-hidden mx-auto bg-white text-slate-950 shadow-lg border border-slate-300 transition-all print:shadow-none print:border-none ${
          is58mm ? 'max-w-[270px]' : 'max-w-[360px]'
        } ${thermalPaddingClass} ${thermalFontClass}`}
      >
        {/* Optional Diagonal Watermark */}
        {showWatermark && (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-[0.06] select-none overflow-hidden"
          >
            <span
              style={{ color: primaryHex }}
              className="text-2xl font-black -rotate-30 whitespace-nowrap"
            >
              {watermarkText}
            </span>
          </div>
        )}

        {/* Top Store Identity Header (Customer's Own Company Name & Logo Only) */}
        <div
          style={
            isModern
              ? { background: `linear-gradient(135deg, ${primaryHex}, ${secondaryHex})` }
              : isYemenPos
              ? { borderColor: primaryHex }
              : undefined
          }
          className={`relative z-10 pb-2.5 mb-2.5 ${
            logoPosition === 'right'
              ? 'text-right'
              : logoPosition === 'left'
              ? 'text-left'
              : 'text-center'
          } ${
            isModern
              ? 'text-white p-3 rounded-xl -mx-1 -mt-1'
              : isYemenPos
              ? 'border-b-2'
              : isMinimal
              ? 'border-b border-slate-200'
              : 'border-b-2 border-dashed border-slate-800'
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
                size={logoSize === 'lg' ? 'md' : 'sm'}
                primaryColorHex={isModern ? secondaryHex : primaryHex}
              />
            </div>
          )}

          <h2 className="font-black text-sm tracking-tight leading-snug">{companyName}</h2>
          {showCompanyNameEn && resolvedCompanyEn && (
            <div className={`text-[9px] font-bold ${isModern ? 'text-white/80' : 'text-slate-500'}`}>
              {resolvedCompanyEn}
            </div>
          )}
          <p className={`text-[10px] font-bold mt-0.5 ${isModern ? 'text-white/85' : 'text-slate-600'}`}>
            {branchName} {branchAddress ? `— ${branchAddress}` : ''}
          </p>
          {(branchPhone || (taxNumber && taxNumber !== '—')) && (
            <div
              className={`text-[10px] font-mono mt-0.5 flex flex-wrap items-center gap-1.5 ${
                logoPosition === 'center' ? 'justify-center' : ''
              } ${isModern ? 'text-white/85' : 'text-slate-600'}`}
              dir="ltr"
            >
              {branchPhone && <span>TEL: {branchPhone}</span>}
              {branchPhone && taxNumber && taxNumber !== '—' && <span>•</span>}
              {taxNumber && taxNumber !== '—' && <span>TAX: {taxNumber}</span>}
            </div>
          )}

          <div
            style={!isModern ? { borderColor: primaryHex, color: primaryHex } : undefined}
            className={`mt-1.5 inline-block px-2.5 py-0.5 rounded font-black text-[10px] border ${
              isModern ? 'bg-white/15 text-white border-white/30' : 'bg-slate-50'
            }`}
          >
            {settings.headerTitleAr?.trim()
              ? settings.headerTitleAr
              : isWarrantyReceipt
              ? 'فاتورة مبيعات وشهادة ضمان معتمدة'
              : isRestaurant
              ? 'فاتورة ضيافة وطلبات مطعم'
              : 'فاتورة مبيعات نقدية وضريبية'}
          </div>
        </div>

        {/* Invoice Metadata Block */}
        <div className="relative z-10 bg-slate-50 border border-slate-200 rounded-lg p-2 mb-2.5 text-[10px] space-y-1">
          <div className="flex justify-between items-center">
            <span className="text-slate-500 font-semibold">رقم الفاتورة:</span>
            <span className="font-mono font-black text-slate-900" dir="ltr">
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
            <span className="text-slate-500 font-semibold">العميل المستفيد:</span>
            <span className="font-bold text-slate-900 truncate max-w-[175px]">
              {invoice.customerName}
            </span>
          </div>
          {showCustomerPhone && invoice.customerPhone && (
            <div className="flex justify-between items-center">
              <span className="text-slate-500 font-semibold">هاتف العميل:</span>
              <span className="font-mono font-bold text-slate-800" dir="ltr">
                {invoice.customerPhone}
              </span>
            </div>
          )}
          <div className="flex justify-between items-center">
            <span className="text-slate-500 font-semibold">طريقة الدفع:</span>
            <span style={{ color: secondaryHex }} className="font-bold">
              {paymentMethodAr}
            </span>
          </div>
        </div>

        {/* Items Table */}
        <table className="relative z-10 w-full text-right border-collapse mb-2.5">
          <thead>
            <tr
              style={{ backgroundColor: isMinimal ? '#f1f5f9' : primaryHex }}
              className={`text-[10px] ${isMinimal ? 'text-slate-900' : 'text-white'}`}
            >
              <th className="py-1 px-1.5 rounded-r">الصنف</th>
              <th className="py-1 px-1 text-center">الكمية</th>
              <th className="py-1 px-1 text-center">السعر</th>
              <th className="py-1 px-1.5 text-left rounded-l">الإجمالي</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {invoice.items.map((item, idx) => (
              <tr key={idx} className="align-top">
                <td className="py-1.5 px-1 font-bold text-slate-900">
                  <div className="leading-snug">{item.productName}</div>
                  {showItemSku && item.sku && (
                    <div className="text-[8.5px] font-mono text-slate-400" dir="ltr">
                      SKU: {item.sku}
                    </div>
                  )}
                  {showSerialAndWarranty && (item.serialNumber || item.warrantyMonths) && (
                    <div className="text-[9px] font-mono text-slate-600 mt-0.5" dir="ltr">
                      {item.serialNumber ? `SN: ${item.serialNumber}` : ''}{' '}
                      {item.warrantyMonths ? `• ضمان ${item.warrantyMonths} شهر` : ''}
                    </div>
                  )}
                </td>
                <td className="py-1.5 px-1 text-center font-mono font-bold" dir="ltr">
                  {formatCleanNumber(item.quantity)}
                </td>
                <td className="py-1.5 px-1 text-center font-mono" dir="ltr">
                  {formatCleanNumber(item.unitPrice)}
                </td>
                <td className="py-1.5 px-1 text-left font-mono font-black text-slate-900" dir="ltr">
                  {formatCleanNumber(item.total)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Totals Summary */}
        <div
          style={{ borderColor: primaryHex }}
          className="relative z-10 border-t-2 pt-2 space-y-1 text-[10px]"
        >
          <div className="flex justify-between text-slate-600">
            <span>المجموع الفرعي:</span>
            <span className="font-mono font-bold" dir="ltr">
              {formatCleanNumber(invoice.subtotal)} {currency}
            </span>
          </div>
          {showItemDiscount && invoice.discountAmount > 0 && (
            <div className="flex justify-between text-rose-700 font-bold">
              <span>الخصم التجاري:</span>
              <span className="font-mono" dir="ltr">
                -{formatCleanNumber(invoice.discountAmount)} {currency}
              </span>
            </div>
          )}
          {showItemTax && invoice.taxAmount > 0 && (
            <div className="flex justify-between text-slate-600">
              <span>الضريبة المضافة:</span>
              <span className="font-mono font-bold" dir="ltr">
                {formatCleanNumber(invoice.taxAmount)} {currency}
              </span>
            </div>
          )}
          <div
            style={{ background: `linear-gradient(135deg, ${primaryHex}, ${secondaryHex})` }}
            className="flex justify-between items-center text-white px-2.5 py-1.5 rounded-lg text-xs font-black mt-1"
          >
            <span>الصافي النهائي:</span>
            <span className="font-mono text-sm text-amber-200" dir="ltr">
              {formatCleanNumber(invoice.grandTotal)} {currency}
            </span>
          </div>
          {showTafqeet && (
            <div className="text-[9px] font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded px-2 py-1 text-center">
              {tafqeetText}
            </div>
          )}
        </div>

        {/* Custom Bank Accounts (if enabled and provided) */}
        {showBankAccounts && customBankLines.length > 0 && (
          <div className="relative z-10 mt-2 p-2 rounded-lg bg-slate-50 border border-slate-200 text-[9px] text-slate-700 space-y-0.5">
            <div className="font-bold text-slate-900">حسابات التحويل:</div>
            {customBankLines.map((line, i) => (
              <div key={i}>{line}</div>
            ))}
          </div>
        )}

        {/* QR & Barcode Verification Block */}
        {(settings.showQR || settings.showBarcode) && (
          <div className="relative z-10 mt-2.5 pt-2.5 border-t border-dashed border-slate-300 flex flex-col items-center gap-2">
            {settings.showQR && (
              <CrispQRCodeSVG payload={qrPayload} sizePx={thermalQrSize} darkColor={primaryHex} />
            )}
            {settings.showBarcode && (
              <CrispLinearBarcodeSVG
                code={invoice.invoiceNumber}
                widthPx={thermalBarcodeW}
                heightPx={30}
                darkColor={primaryHex}
              />
            )}
          </div>
        )}

        {/* Footer Note */}
        <div className="relative z-10 mt-2.5 pt-2 border-t border-slate-200 text-center text-[9px] text-slate-500 space-y-0.5">
          {settings.footerNoteAr && (
            <p className="font-bold text-slate-700">{settings.footerNoteAr}</p>
          )}
          <p className="font-semibold text-slate-600">
            شكراً لتعاملكم مع {companyName} {branchPhone ? `— ${branchPhone}` : ''}
          </p>
        </div>
      </div>
    );
  }

  // ============================================================================
  // 2. STANDARD A4 COMMERCIAL, TAX & WARRANTY INVOICE TEMPLATES (8 Templates)
  // ============================================================================
  const isYemenOfficial = activeStandard === 'a4_onyx_yemen';
  const isGlobalB2B = activeStandard === 'a4_global_sap_odoo';
  const isWarrantyA4 = activeStandard === 'a4_warranty_electronics';
  const isModernBlue = activeStandard === 'a4_modern_blue';
  const isContracting = activeStandard === 'a4_contracting_specs';
  const isMedical = activeStandard === 'a4_medical_pharmacy';
  const isMinimalist = activeStandard === 'a4_minimalist_clean';

  const a4PaddingClass =
    paperMargin === 'narrow'
      ? 'p-3 sm:p-4'
      : paperMargin === 'wide'
      ? 'p-7 sm:p-9'
      : 'p-5 sm:p-6';
  const a4ScaleClass =
    fontScale === 'compact'
      ? 'text-[11px]'
      : fontScale === 'large'
      ? 'text-[13.5px]'
      : 'text-xs';

  const a4QrSize = settings.qrSizePx || 78;
  const a4BarcodeW = settings.barcodeWidthPx || 145;

  const isColoredHeader = isModernBlue || isGlobalB2B;

  const invoiceTitleAr = isWarrantyA4
    ? 'فاتورة مبيعات وشهادة ضمان رسمية معتمدة'
    : isContracting
    ? 'فاتورة مستخلصات وتوريدات هندسية معتمدة'
    : isMedical
    ? 'فاتورة توريد طبي وصيدلاني معتمدة (FEFO)'
    : isGlobalB2B
    ? 'فاتورة تجارية وضريبية موحدة • TAX INVOICE'
    : isMinimalist
    ? 'فاتورة مبيعات رسمية'
    : 'فاتورة مبيعات تجارية وضريبية معتمدة';

  const invoiceTitleEn = isWarrantyA4
    ? 'OFFICIAL SALES INVOICE & WARRANTY CERTIFICATE'
    : isContracting
    ? 'ENGINEERING & CONTRACTING SUPPLY INVOICE'
    : isMedical
    ? 'MEDICAL & PHARMACEUTICAL SUPPLY INVOICE'
    : 'COMMERCIAL & TAX INVOICE';

  return (
    <div
      data-testid="invoice-renderer-a4"
      data-template={activeStandard}
      dir="rtl"
      className={`relative mx-auto max-w-[840px] bg-white text-slate-900 shadow-xl border border-slate-300 rounded-xl overflow-hidden print:shadow-none print:border-none print:rounded-none ${a4ScaleClass}`}
    >
      {/* Optional Diagonal Watermark Overlay */}
      {showWatermark && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center opacity-[0.055] select-none overflow-hidden"
        >
          <span
            style={{ color: primaryHex }}
            className="text-5xl sm:text-6xl font-black -rotate-30 whitespace-nowrap tracking-wide"
          >
            {watermarkText}
          </span>
        </div>
      )}

      {/* Top Decorative Brand Bar */}
      <div
        style={{
          background: isMinimalist
            ? primaryHex
            : isYemenOfficial
            ? `linear-gradient(90deg, ${primaryHex}, #d97706, ${primaryHex})`
            : isWarrantyA4
            ? `linear-gradient(90deg, #059669, ${primaryHex}, #059669)`
            : `linear-gradient(90deg, ${primaryHex}, ${secondaryHex})`,
        }}
        className="h-2 w-full"
      />

      <div className={`relative z-10 space-y-4 ${a4PaddingClass}`}>
        {/* ZONE 1: ORGANIZED HEADER (Customer's Own Brand & Logo) */}
        <div
          style={
            isColoredHeader
              ? {
                  background: `linear-gradient(135deg, ${primaryHex}, ${secondaryHex})`,
                  borderColor: primaryHex,
                }
              : undefined
          }
          className={`rounded-2xl border p-4 ${
            isColoredHeader
              ? 'text-white'
              : isMinimalist
              ? 'bg-white border-slate-200'
              : 'bg-slate-50/75 border-slate-200/90'
          }`}
        >
          <div className="grid grid-cols-12 gap-3 items-center">
            {/* Right Column: Customer Company Arabic Details */}
            <div
              className={`col-span-12 ${
                logoPosition === 'left'
                  ? 'sm:col-span-9 order-1'
                  : logoPosition === 'right'
                  ? 'sm:col-span-5 order-2'
                  : 'sm:col-span-5'
              } text-right space-y-1`}
            >
              <h1
                className={`text-base sm:text-lg font-black tracking-tight leading-snug ${
                  isColoredHeader ? 'text-white' : 'text-slate-900'
                }`}
              >
                {companyName}
              </h1>
              <div
                className={`text-xs font-bold flex items-center gap-1.5 ${
                  isColoredHeader ? 'text-white/85' : 'text-slate-700'
                }`}
              >
                <MapPin className="w-3.5 h-3.5 shrink-0 opacity-75" />
                <span>
                  {branchName} {branchAddress ? `— ${branchAddress}` : ''}
                </span>
              </div>
              {(branchPhone || (taxNumber && taxNumber !== '—')) && (
                <div
                  className={`text-[11px] font-mono flex flex-wrap items-center gap-x-3 gap-y-0.5 ${
                    isColoredHeader ? 'text-white/80' : 'text-slate-600'
                  }`}
                >
                  {branchPhone && <span dir="ltr">هاتف: {branchPhone}</span>}
                  {branchPhone && taxNumber && taxNumber !== '—' && <span>•</span>}
                  {taxNumber && taxNumber !== '—' && <span dir="ltr">الرقم الضريبي: {taxNumber}</span>}
                </div>
              )}
            </div>

            {/* Logo Column */}
            {showCompanyLogo && (
              <div
                className={`col-span-12 ${
                  logoPosition === 'center'
                    ? 'sm:col-span-2 flex justify-center'
                    : logoPosition === 'right'
                    ? 'sm:col-span-2 order-1 flex justify-start'
                    : 'sm:col-span-3 order-3 flex justify-end'
                }`}
              >
                <CompanyBrandCrest
                  companyName={companyName}
                  companyLogo={companyLogo}
                  size={logoSize}
                  primaryColorHex={isColoredHeader ? secondaryHex : primaryHex}
                />
              </div>
            )}

            {/* Left Column: English Identity & Official Document Badge */}
            {logoPosition !== 'left' && (
              <div
                className={`col-span-12 ${
                  showCompanyLogo ? 'sm:col-span-5' : 'sm:col-span-7'
                } text-left space-y-1 order-3`}
                dir="ltr"
              >
                {showCompanyNameEn && resolvedCompanyEn && (
                  <div
                    className={`text-sm font-black tracking-tight truncate ${
                      isColoredHeader ? 'text-white' : 'text-slate-900'
                    }`}
                  >
                    {resolvedCompanyEn}
                  </div>
                )}
                <div
                  className={`text-[10px] font-mono font-bold tracking-wider uppercase ${
                    isColoredHeader ? 'text-amber-300' : 'text-emerald-700'
                  }`}
                >
                  {invoiceTitleEn}
                </div>
                <div
                  className={`inline-flex items-center gap-2 px-2.5 py-1 rounded-lg text-[11px] font-mono font-bold border ${
                    isColoredHeader
                      ? 'bg-black/25 border-white/25 text-white'
                      : 'bg-white border-slate-200 text-slate-900 shadow-2xs'
                  }`}
                >
                  <span>NO: {invoice.invoiceNumber}</span>
                  <span>|</span>
                  <span>{invoice.date}</span>
                </div>
              </div>
            )}
          </div>

          {/* Document Title Banner */}
          <div className="mt-3 pt-2.5 border-t border-slate-200/30 flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2 flex-wrap">
              <span
                style={!isColoredHeader ? { backgroundColor: primaryHex } : undefined}
                className={`px-3 py-1 rounded-lg font-black text-xs ${
                  isColoredHeader ? 'bg-amber-400 text-slate-950' : 'text-white'
                }`}
              >
                {invoiceTitleAr}
              </span>
              {settings.headerTitleAr && (
                <span
                  className={`text-[11px] font-semibold truncate max-w-[320px] ${
                    isColoredHeader ? 'text-white/90' : 'text-slate-600'
                  }`}
                >
                  {settings.headerTitleAr}
                </span>
              )}
            </div>

            <div className="flex items-center gap-2 text-[11px] font-bold">
              <span
                className={`px-2.5 py-0.5 rounded-full border ${
                  invoice.status === 'PAID'
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                    : 'bg-amber-50 text-amber-800 border-amber-200'
                }`}
              >
                {invoice.status === 'PAID' ? 'مدفوعة ومسددة بالكامل' : 'ذمم آجلة مستحقة'}
              </span>
              <span
                className={`px-2.5 py-0.5 rounded-full border font-mono ${
                  isColoredHeader
                    ? 'bg-white/15 text-white border-white/25'
                    : 'bg-white text-slate-800 border-slate-200'
                }`}
              >
                العملة: {currency}
              </span>
            </div>
          </div>
        </div>

        {/* ZONE 2: BENEFICIARY CUSTOMER & TRANSACTION METADATA GRID */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
          <div className="sm:col-span-7 bg-white rounded-xl border border-slate-200 p-3 flex flex-col justify-between">
            <div className="flex items-center justify-between border-b border-slate-100 pb-1.5 mb-2">
              <span className="text-[11px] font-black text-slate-700 flex items-center gap-1.5">
                <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span>بيانات العميل المستفيد (Customer / Beneficiary)</span>
              </span>
              {showCustomerId && (
                <span className="text-[10px] font-mono text-slate-400" dir="ltr">
                  ID: {invoice.customerId}
                </span>
              )}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <span className="text-[10px] text-slate-400 block">اسم العميل / الجهة:</span>
                <span className="font-black text-slate-900 text-xs sm:text-sm">
                  {invoice.customerName}
                </span>
              </div>
              {showCustomerPhone && (
                <div>
                  <span className="text-[10px] text-slate-400 block">رقم الجوال / التواصل:</span>
                  <span className="font-mono font-bold text-slate-800 text-xs" dir="ltr">
                    {invoice.customerPhone || '—'}
                  </span>
                </div>
              )}
            </div>
          </div>

          <div className="sm:col-span-5 bg-white rounded-xl border border-slate-200 p-3 flex flex-col justify-between">
            <div className="flex items-center justify-between border-b border-slate-100 pb-1.5 mb-2">
              <span className="text-[11px] font-black text-slate-700 flex items-center gap-1.5">
                <CreditCard style={{ color: secondaryHex }} className="w-3.5 h-3.5" />
                <span>بيانات السداد والترحيل المالي</span>
              </span>
              <span className="text-[10px] font-mono text-emerald-700 font-bold" dir="ltr">
                {paymentMethodEn}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <span className="text-[10px] text-slate-400 block">طريقة الدفع:</span>
                <span className="font-bold text-slate-900 text-xs">{paymentMethodAr}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block">الفرع المصدر:</span>
                <span className="font-bold text-slate-800 text-xs">{branchName}</span>
              </div>
            </div>
          </div>
        </div>

        {/* ZONE 3: STRUCTURED LINE ITEMS TABLE */}
        <div className="rounded-xl border border-slate-300 overflow-x-auto">
          <table className="w-full text-right border-collapse">
            <thead>
              <tr
                style={{
                  backgroundColor: isMinimalist ? '#f1f5f9' : primaryHex,
                }}
                className={`text-[11px] ${isMinimalist ? 'text-slate-900' : 'text-white'}`}
              >
                <th className="py-2 px-2.5 text-center w-9 border-l border-white/15">#</th>
                {showItemSku && (
                  <th className="py-2 px-2.5 text-center w-24 border-l border-white/15">كود SKU</th>
                )}
                <th className="py-2 px-3 border-l border-white/15">
                  بيان الصنف والمواصفات (Item Description)
                </th>
                {(hasSerialOrWarranty || (showSerialAndWarranty && isWarrantyA4)) && (
                  <th className="py-2 px-2.5 text-center border-l border-white/15">
                    الرقم التسلسلي والضمان
                  </th>
                )}
                {(hasBatchOrExpiry || isMedical) && (
                  <th className="py-2 px-2.5 text-center border-l border-white/15">
                    التشغيلة / الصلاحية
                  </th>
                )}
                <th className="py-2 px-2.5 text-center w-16 border-l border-white/15">الكمية</th>
                <th className="py-2 px-2.5 text-center w-24 border-l border-white/15">سعر الوحدة</th>
                {showItemDiscount && (
                  <th className="py-2 px-2 text-center w-16 border-l border-white/15">الخصم</th>
                )}
                {showItemTax && (
                  <th className="py-2 px-2 text-center w-16 border-l border-white/15">الضريبة</th>
                )}
                <th className="py-2 px-3 text-left w-28">الإجمالي ({currency})</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {invoice.items.map((item, idx) => (
                <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/70'}>
                  <td className="py-2 px-2 text-center font-mono font-bold text-slate-500 border-l border-slate-200">
                    {idx + 1}
                  </td>
                  {showItemSku && (
                    <td
                      className="py-2 px-2 text-center font-mono text-[11px] font-bold text-slate-700 border-l border-slate-200"
                      dir="ltr"
                    >
                      {item.sku}
                    </td>
                  )}
                  <td className="py-2 px-3 font-bold text-slate-900 border-l border-slate-200">
                    <div>{item.productName}</div>
                    {item.kitchenNotes && (
                      <div className="text-[10px] text-slate-500 font-normal mt-0.5">
                        ملاحظة: {item.kitchenNotes}
                      </div>
                    )}
                  </td>
                  {(hasSerialOrWarranty || (showSerialAndWarranty && isWarrantyA4)) && (
                    <td className="py-2 px-2.5 text-center border-l border-slate-200">
                      <div className="font-mono text-[10px] font-bold text-slate-800" dir="ltr">
                        {item.serialNumber || '—'}
                      </div>
                      {item.warrantyMonths ? (
                        <span className="inline-block mt-0.5 px-2 py-0.2 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-[9px] font-bold">
                          ضمان {item.warrantyMonths} شهر
                        </span>
                      ) : null}
                    </td>
                  )}
                  {(hasBatchOrExpiry || isMedical) && (
                    <td
                      className="py-2 px-2.5 text-center font-mono text-[10px] border-l border-slate-200"
                      dir="ltr"
                    >
                      <div>LOT: {item.batchNumber || '—'}</div>
                      <div className="text-rose-700">EXP: {item.expiryDate || '—'}</div>
                    </td>
                  )}
                  <td
                    className="py-2 px-2 text-center font-mono font-black text-slate-900 border-l border-slate-200"
                    dir="ltr"
                  >
                    {formatCleanNumber(item.quantity)}
                  </td>
                  <td
                    className="py-2 px-2.5 text-center font-mono font-semibold text-slate-800 border-l border-slate-200"
                    dir="ltr"
                  >
                    {formatCleanNumber(item.unitPrice)}
                  </td>
                  {showItemDiscount && (
                    <td
                      className="py-2 px-2 text-center font-mono text-rose-600 border-l border-slate-200"
                      dir="ltr"
                    >
                      {formatCleanNumber(item.discount || 0)}
                    </td>
                  )}
                  {showItemTax && (
                    <td
                      className="py-2 px-2 text-center font-mono text-slate-600 border-l border-slate-200"
                      dir="ltr"
                    >
                      {formatCleanNumber(item.taxAmount || 0)}
                    </td>
                  )}
                  <td
                    className="py-2 px-3 text-left font-mono font-black text-slate-900"
                    dir="ltr"
                  >
                    {formatCleanNumber(item.total)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* ZONE 4: BALANCED FINANCIAL SUMMARY, TAFQEET, BANK ACCOUNTS & QR/BARCODE */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-stretch">
          <div className="md:col-span-7 flex flex-col justify-between space-y-2.5">
            {showTafqeet && (
              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-2">
                <span className="text-slate-500 font-bold shrink-0">المبلغ كتابةً (التفقيط):</span>
                <span className="font-black text-slate-900 text-right">{tafqeetText}</span>
              </div>
            )}

            <div className="flex-1 p-3 rounded-xl bg-slate-50/70 border border-slate-200 flex flex-wrap sm:flex-nowrap items-center justify-between gap-3">
              <div className="space-y-1 text-[10px] text-slate-600 flex-1 min-w-[180px]">
                {showBankAccounts && (
                  <>
                    <div className="font-black text-slate-900 text-[11px] flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span>بيانات التحويل والسداد المعتمدة:</span>
                    </div>
                    {customBankLines.length > 0 ? (
                      customBankLines.map((line, i) => <div key={i}>• {line}</div>)
                    ) : (
                      <div className="text-slate-400">
                        يمكنك إضافة أرقام حساباتك المصرفية من استوديو تخصيص الفواتير.
                      </div>
                    )}
                  </>
                )}
                {invoice.notes && (
                  <div className="text-slate-800 font-bold pt-1">
                    ملاحظات الفاتورة: {invoice.notes}
                  </div>
                )}
              </div>

              {(settings.showQR || settings.showBarcode) && (
                <div className="flex items-center gap-2.5 shrink-0">
                  {settings.showQR && (
                    <CrispQRCodeSVG payload={qrPayload} sizePx={a4QrSize} darkColor={primaryHex} />
                  )}
                  {settings.showBarcode && (
                    <CrispLinearBarcodeSVG
                      code={invoice.invoiceNumber}
                      widthPx={a4BarcodeW}
                      heightPx={34}
                      darkColor={primaryHex}
                    />
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="md:col-span-5 bg-slate-50 rounded-xl border border-slate-200 p-3.5 flex flex-col justify-between space-y-2">
            <div className="space-y-1.5">
              <div className="flex justify-between items-center text-slate-600">
                <span>إجمالي قيمة الأصناف:</span>
                <span className="font-mono font-bold text-slate-900" dir="ltr">
                  {formatCleanNumber(invoice.subtotal)} {currency}
                </span>
              </div>

              <div className="flex justify-between items-center text-slate-600">
                <span>الخصم التجاري الممنوح:</span>
                <span className="font-mono font-bold text-rose-600" dir="ltr">
                  {invoice.discountAmount > 0
                    ? `-${formatCleanNumber(invoice.discountAmount)}`
                    : '0'}{' '}
                  {currency}
                </span>
              </div>

              {invoice.taxAmount > 0 && (
                <div className="flex justify-between items-center text-slate-600">
                  <span>ضريبة القيمة المضافة:</span>
                  <span className="font-mono font-bold text-slate-900" dir="ltr">
                    {formatCleanNumber(invoice.taxAmount)} {currency}
                  </span>
                </div>
              )}
            </div>

            <div
              style={{ background: `linear-gradient(135deg, ${primaryHex}, ${secondaryHex})` }}
              className="p-2.5 rounded-xl text-white flex items-center justify-between"
            >
              <div>
                <div className="text-xs font-black">الصافي النهائي المستحق</div>
                <div className="text-[9px] text-white/80 font-mono" dir="ltr">
                  NET PAYABLE AMOUNT
                </div>
              </div>
              <div className="font-mono text-lg font-black text-amber-200" dir="ltr">
                {formatCleanNumber(invoice.grandTotal)}{' '}
                <span className="text-xs font-normal text-white">{currency}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-0.5 text-[11px]">
              <div className="bg-white px-2.5 py-1 rounded-lg border border-slate-200 flex justify-between items-center">
                <span className="text-slate-500">المدفوع:</span>
                <span className="font-mono font-bold text-emerald-700" dir="ltr">
                  {formatCleanNumber(invoice.paidAmount ?? invoice.grandTotal)}
                </span>
              </div>
              <div className="bg-white px-2.5 py-1 rounded-lg border border-slate-200 flex justify-between items-center">
                <span className="text-slate-500">المتبقي:</span>
                <span className="font-mono font-bold text-slate-800" dir="ltr">
                  {formatCleanNumber(
                    Math.max(0, invoice.grandTotal - (invoice.paidAmount ?? invoice.grandTotal))
                  )}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* ZONE 5: WARRANTY TERMS & OFFICIAL COMPANY STAMP / SIGNATURES */}
        {(settings.showWarrantyTerms || isWarrantyA4) && (
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-[10px] text-slate-600 space-y-1">
            <div className="font-black text-slate-900 flex items-center gap-1.5 text-[11px]">
              <Award className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span>شروط وأحكام شهادة الضمان والصيانة المعتمدة من {companyName}:</span>
            </div>
            <p className="leading-relaxed">
              {settings.footerNoteAr} • يسري الضمان على العيوب المصنعية وفق الرقم التسلسلي (S/N)
              المدون أمام كل صنف، ولا يشمل الكسر أو سوء الاستخدام.
            </p>
          </div>
        )}

        {settings.showStampAndSignature && (
          <div className="pt-2 border-t border-slate-200 grid grid-cols-3 gap-4 items-center text-center text-[11px]">
            <div className="space-y-4">
              <div className="font-bold text-slate-700">توقيع المستلم / العميل</div>
              <div className="border-b border-dashed border-slate-300 w-36 mx-auto" />
            </div>

            <div className="flex justify-center">
              <OfficialCompanySeal
                companyName={companyName}
                branchName={branchName}
                taxNumber={taxNumber}
                colorHex={primaryHex}
              />
            </div>

            <div className="space-y-4">
              <div className="font-bold text-slate-700">اعتماد المبيعات والحسابات</div>
              <div className="border-b border-dashed border-slate-300 w-36 mx-auto" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
