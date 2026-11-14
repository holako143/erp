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
  CheckCircle2,
  Building2,
  Phone,
  MapPin,
  FileText,
  Calendar,
  Hash,
  UserCheck,
  CreditCard,
  Sparkles,
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
  const totalModules = bars.length + quietZone * 2;

  return (
    <div
      data-testid="invoice-barcode-svg-container"
      className="inline-flex flex-col items-center justify-center bg-white px-2 py-1 rounded-lg border border-slate-200"
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
        {bars.map((bit, idx) =>
          bit === 1 ? (
            <rect key={idx} x={idx + quietZone} y={2} width={1} height={32} fill={darkColor} />
          ) : null
        )}
      </svg>
      <div className="font-mono text-[9px] font-bold tracking-[0.2em] text-slate-800 mt-0.5 leading-none">
        *{cleanCode}*
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Customer Company Logo / Identity Crest Component (Never shows software vendor names)
// ---------------------------------------------------------------------------
const CompanyBrandCrest: React.FC<{
  companyName: string;
  companyLogo?: string;
  accentColorClass?: string;
  size?: 'sm' | 'md' | 'lg';
}> = ({ companyName, companyLogo, accentColorClass = 'bg-slate-900 text-white', size = 'md' }) => {
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
      ? 'w-16 h-16 rounded-2xl'
      : 'w-14 h-14 rounded-2xl';

  if (resolvedLogo) {
    return (
      <div
        data-testid="invoice-company-logo-box"
        className={`${boxDims} bg-white border-2 border-slate-200 p-1 flex items-center justify-center overflow-hidden shadow-2xs shrink-0`}
      >
        <img
          src={resolvedLogo}
          alt={companyName}
          className="w-full h-full object-contain"
        />
      </div>
    );
  }

  return (
    <div
      data-testid="invoice-company-crest-box"
      className={`${boxDims} ${accentColorClass} border-2 border-amber-500/40 flex flex-col items-center justify-center shadow-xs shrink-0 select-none`}
    >
      <Building2 className={size === 'sm' ? 'w-4 h-4 text-amber-400' : 'w-5 h-5 text-amber-400'} />
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
  colorClass?: string;
}> = ({ companyName, branchName, taxNumber, colorClass = 'border-blue-800/75 text-blue-900' }) => {
  return (
    <div
      data-testid="invoice-official-company-seal"
      className={`inline-flex flex-col items-center justify-center border-2 border-double ${colorClass} rounded-xl px-4 py-1.5 -rotate-2 select-none bg-white/70`}
    >
      <span className="text-[9px] font-black tracking-wide truncate max-w-[160px]">
        {companyName}
      </span>
      <span className="text-[8px] font-bold opacity-85 truncate max-w-[150px]">
        {branchName} • معتمد رسمياً
      </span>
      <span className="text-[8px] font-mono font-bold mt-0.5" dir="ltr">
        TAX: {taxNumber}
      </span>
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

  const resolvedCompanyEn = useMemo(() => {
    if (companyNameEn && companyNameEn.trim()) return companyNameEn.trim();
    if (companyName.includes('الطاقة الشمسية')) return 'Modern Solar & Electronics Trading Corp.';
    return 'Enterprise Commercial & Trading Establishment';
  }, [companyName, companyNameEn]);

  // Authentic ZATCA / Tax QR payload encoding Seller Name, VAT, Timestamp, Total & VAT
  const qrPayload = useMemo(() => {
    try {
      return encodeZatcaPhase2TLVBase64({
        sellerName: companyName,
        vatRegistrationNumber: taxNumber,
        invoiceTimestamp: invoice.date.includes('T') ? invoice.date : `${invoice.date}T12:00:00Z`,
        invoiceTotal: invoice.grandTotal,
        vatTotal: invoice.taxAmount,
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

  const hasSerialOrWarranty = invoice.items.some(
    (i) => Boolean(i.serialNumber) || Boolean(i.warrantyMonths)
  );
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

    return (
      <div
        data-testid="invoice-renderer-thermal"
        data-template={activeThermal}
        dir="rtl"
        className={`mx-auto bg-white text-slate-950 shadow-lg border border-slate-300 transition-all print:shadow-none print:border-none ${
          is58mm
            ? 'max-w-[270px] p-3 text-[10px]'
            : 'max-w-[355px] p-4 text-[11px]'
        }`}
      >
        {/* Top Store Identity Header with Customer's Own Company Logo */}
        <div
          className={`text-center pb-2.5 mb-2.5 ${
            isModern
              ? 'bg-slate-900 text-white p-3 rounded-xl -mx-1 -mt-1'
              : isYemenPos
              ? 'border-b-2 border-slate-900'
              : isMinimal
              ? 'border-b border-slate-200'
              : 'border-b-2 border-dashed border-slate-800'
          }`}
        >
          <div className="flex justify-center mb-1.5">
            <CompanyBrandCrest
              companyName={companyName}
              companyLogo={companyLogo}
              size="sm"
              accentColorClass={
                isModern ? 'bg-white text-slate-900' : 'bg-slate-900 text-white'
              }
            />
          </div>

          <h2 className="font-black text-sm tracking-tight leading-snug">{companyName}</h2>
          <p className={`text-[10px] font-bold mt-0.5 ${isModern ? 'text-slate-300' : 'text-slate-600'}`}>
            {branchName} — {branchAddress}
          </p>
          <div
            className={`text-[10px] font-mono mt-0.5 flex items-center justify-center gap-2 ${
              isModern ? 'text-slate-300' : 'text-slate-600'
            }`}
            dir="ltr"
          >
            <span>TEL: {branchPhone}</span>
            <span>•</span>
            <span>TAX: {taxNumber}</span>
          </div>

          <div className="mt-1.5 inline-block px-2.5 py-0.5 rounded bg-slate-100 text-slate-900 font-black text-[10px] border border-slate-300">
            {isWarrantyReceipt
              ? 'فاتورة مبيعات وشهادة ضمان معتمدة'
              : isRestaurant
              ? 'فاتورة ضيافة وطلبات مطعم'
              : 'فاتورة مبيعات نقدية وضريبية'}
          </div>
        </div>

        {/* Invoice Metadata Block */}
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-2 mb-2.5 text-[10px] space-y-1">
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
          {invoice.customerPhone && (
            <div className="flex justify-between items-center">
              <span className="text-slate-500 font-semibold">هاتف العميل:</span>
              <span className="font-mono font-bold text-slate-800" dir="ltr">
                {invoice.customerPhone}
              </span>
            </div>
          )}
          <div className="flex justify-between items-center">
            <span className="text-slate-500 font-semibold">طريقة الدفع:</span>
            <span className="font-bold text-emerald-800">{paymentMethodAr}</span>
          </div>
        </div>

        {/* Items Table */}
        <table className="w-full text-right border-collapse mb-2.5">
          <thead>
            <tr className="bg-slate-900 text-white text-[10px]">
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
                  {(item.serialNumber || item.warrantyMonths) && (
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
        <div className="border-t-2 border-slate-900 pt-2 space-y-1 text-[10px]">
          <div className="flex justify-between text-slate-600">
            <span>المجموع الفرعي:</span>
            <span className="font-mono font-bold" dir="ltr">
              {formatCleanNumber(invoice.subtotal)} {currency}
            </span>
          </div>
          {invoice.discountAmount > 0 && (
            <div className="flex justify-between text-rose-700 font-bold">
              <span>الخصم التجاري:</span>
              <span className="font-mono" dir="ltr">
                -{formatCleanNumber(invoice.discountAmount)} {currency}
              </span>
            </div>
          )}
          {invoice.taxAmount > 0 && (
            <div className="flex justify-between text-slate-600">
              <span>الضريبة المضافة:</span>
              <span className="font-mono font-bold" dir="ltr">
                {formatCleanNumber(invoice.taxAmount)} {currency}
              </span>
            </div>
          )}
          <div className="flex justify-between items-center bg-slate-900 text-white px-2.5 py-1.5 rounded-lg text-xs font-black mt-1">
            <span>الصافي النهائي:</span>
            <span className="font-mono text-sm text-amber-300" dir="ltr">
              {formatCleanNumber(invoice.grandTotal)} {currency}
            </span>
          </div>
          <div className="text-[9px] font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded px-2 py-1 text-center">
            {tafqeetText}
          </div>
        </div>

        {/* QR & Barcode Verification Block */}
        {(settings.showQR || settings.showBarcode) && (
          <div className="mt-2.5 pt-2.5 border-t border-dashed border-slate-300 flex flex-col items-center gap-2">
            {settings.showQR && (
              <CrispQRCodeSVG payload={qrPayload} sizePx={is58mm ? 74 : 86} />
            )}
            {settings.showBarcode && (
              <CrispLinearBarcodeSVG
                code={invoice.invoiceNumber}
                widthPx={is58mm ? 165 : 210}
                heightPx={30}
              />
            )}
          </div>
        )}

        {/* Footer Note */}
        <div className="mt-2.5 pt-2 border-t border-slate-200 text-center text-[9px] text-slate-500 space-y-0.5">
          <p className="font-bold text-slate-700">{settings.footerNoteAr}</p>
          <p className="font-semibold text-slate-600">
            شكراً لتعاملكم مع {companyName} — {branchPhone}
          </p>
        </div>
      </div>
    );
  }

  // ============================================================================
  // 2. STANDARD A4 COMMERCIAL, TAX & WARRANTY INVOICE TEMPLATES
  //    (Unified, High-Density, Balanced Layout Featuring Customer's Own Logo & Brand)
  // ============================================================================
  const isYemenOfficial = activeStandard === 'a4_onyx_yemen';
  const isGlobalB2B = activeStandard === 'a4_global_sap_odoo';
  const isWarrantyA4 = activeStandard === 'a4_warranty_electronics';
  const isModernBlue = activeStandard === 'a4_modern_blue';
  const isContracting = activeStandard === 'a4_contracting_specs';
  const isMedical = activeStandard === 'a4_medical_pharmacy';
  const isMinimalist = activeStandard === 'a4_minimalist_clean';

  const headerAccentBg = isModernBlue
    ? 'bg-gradient-to-l from-blue-950 via-blue-900 to-indigo-950 text-white'
    : isWarrantyA4
    ? 'bg-slate-900 text-white'
    : isGlobalB2B
    ? 'bg-slate-900 text-white'
    : 'bg-white text-slate-900';

  const tableHeadBg = isModernBlue
    ? 'bg-blue-900 text-white'
    : isGlobalB2B
    ? 'bg-indigo-950 text-white'
    : isContracting
    ? 'bg-amber-900 text-white'
    : isMedical
    ? 'bg-teal-900 text-white'
    : 'bg-slate-900 text-white';

  const invoiceTitleAr = isWarrantyA4
    ? 'فاتورة مبيعات وشهادة ضمان رسمية معتمدة'
    : isContracting
    ? 'فاتورة مستخلصات وتوريدات هندسية معتمدة'
    : isMedical
    ? 'فاتورة توريد طبي وصيدلاني معتمدة (FEFO)'
    : isGlobalB2B
    ? 'فاتورة تجارية وضريبية موحدة • TAX INVOICE'
    : 'فاتورة مبيعات تجارية وضريبية معتمدة';

  const invoiceTitleEn = isWarrantyA4
    ? 'OFFICIAL SALES INVOICE & WARRANTY CERTIFICATE'
    : isContracting
    ? 'ENGINEERING & CONTRACTING SUPPLY INVOICE'
    : 'COMMERCIAL & TAX INVOICE';

  return (
    <div
      data-testid="invoice-renderer-a4"
      data-template={activeStandard}
      dir="rtl"
      className="mx-auto max-w-[840px] bg-white text-slate-900 shadow-xl border border-slate-300 rounded-xl overflow-hidden print:shadow-none print:border-none print:rounded-none"
    >
      {/* Top Decorative Brand Bar */}
      <div
        className={`h-2 w-full ${
          isModernBlue
            ? 'bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-500'
            : isYemenOfficial
            ? 'bg-gradient-to-r from-slate-900 via-amber-500 to-slate-900'
            : isWarrantyA4
            ? 'bg-gradient-to-r from-emerald-600 via-slate-900 to-emerald-600'
            : 'bg-slate-900'
        }`}
      />

      <div className="p-5 sm:p-6 space-y-4">
        {/* ====================================================================
            ZONE 1: ORGANIZED 3-COLUMN ENTERPRISE HEADER (Customer's Own Brand & Logo)
        ==================================================================== */}
        <div
          className={`rounded-2xl border p-4 ${
            isModernBlue
              ? `${headerAccentBg} border-blue-900`
              : 'bg-slate-50/70 border-slate-200/90'
          }`}
        >
          <div className="grid grid-cols-12 gap-3 items-center">
            {/* Right Column (5 cols): Customer Company Arabic Details */}
            <div className="col-span-12 sm:col-span-5 text-right space-y-1">
              <h1
                className={`text-base sm:text-lg font-black tracking-tight leading-snug ${
                  isModernBlue ? 'text-white' : 'text-slate-900'
                }`}
              >
                {companyName}
              </h1>
              <div
                className={`text-xs font-bold flex items-center gap-1.5 ${
                  isModernBlue ? 'text-blue-200' : 'text-slate-700'
                }`}
              >
                <MapPin className="w-3.5 h-3.5 shrink-0 opacity-75" />
                <span>
                  {branchName} — {branchAddress}
                </span>
              </div>
              <div
                className={`text-[11px] font-mono flex flex-wrap items-center gap-x-3 gap-y-0.5 ${
                  isModernBlue ? 'text-blue-100' : 'text-slate-600'
                }`}
              >
                <span dir="ltr">هاتف: {branchPhone}</span>
                <span>•</span>
                <span dir="ltr">الرقم الضريبي: {taxNumber}</span>
              </div>
            </div>

            {/* Center Column (2 cols): Customer's Own Company Logo / Crest */}
            <div className="col-span-12 sm:col-span-2 flex flex-col items-center justify-center">
              <CompanyBrandCrest
                companyName={companyName}
                companyLogo={companyLogo}
                size="lg"
                accentColorClass={
                  isModernBlue
                    ? 'bg-white text-blue-950'
                    : 'bg-slate-900 text-white'
                }
              />
            </div>

            {/* Left Column (5 cols): English Identity & Official Document Badge */}
            <div className="col-span-12 sm:col-span-5 text-left space-y-1" dir="ltr">
              <div
                className={`text-sm font-black tracking-tight truncate ${
                  isModernBlue ? 'text-white' : 'text-slate-900'
                }`}
              >
                {resolvedCompanyEn}
              </div>
              <div
                className={`text-[10px] font-mono font-bold tracking-wider uppercase ${
                  isModernBlue ? 'text-amber-300' : 'text-emerald-700'
                }`}
              >
                {invoiceTitleEn}
              </div>
              <div
                className={`inline-flex items-center gap-2 px-2.5 py-1 rounded-lg text-[11px] font-mono font-bold border ${
                  isModernBlue
                    ? 'bg-blue-950/80 border-blue-700 text-white'
                    : 'bg-white border-slate-200 text-slate-900 shadow-2xs'
                }`}
              >
                <span>NO: {invoice.invoiceNumber}</span>
                <span>|</span>
                <span>{invoice.date}</span>
              </div>
            </div>
          </div>

          {/* Centered Document Title Banner */}
          <div className="mt-3 pt-2.5 border-t border-slate-200/80 flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2">
              <span
                className={`px-3 py-1 rounded-lg font-black text-xs ${
                  isModernBlue
                    ? 'bg-amber-400 text-slate-950'
                    : 'bg-slate-900 text-white'
                }`}
              >
                {invoiceTitleAr}
              </span>
              {settings.headerTitleAr && (
                <span
                  className={`text-[11px] font-semibold truncate max-w-[320px] ${
                    isModernBlue ? 'text-blue-100' : 'text-slate-600'
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
                  isModernBlue
                    ? 'bg-blue-900/80 text-white border-blue-700'
                    : 'bg-white text-slate-800 border-slate-200'
                }`}
              >
                العملة: {currency}
              </span>
            </div>
          </div>
        </div>

        {/* ====================================================================
            ZONE 2: BENEFICIARY CUSTOMER & TRANSACTION METADATA GRID
        ==================================================================== */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 text-xs">
          {/* Beneficiary Customer Box (7 cols) */}
          <div className="sm:col-span-7 bg-white rounded-xl border border-slate-200 p-3 flex flex-col justify-between">
            <div className="flex items-center justify-between border-b border-slate-100 pb-1.5 mb-2">
              <span className="text-[11px] font-black text-slate-700 flex items-center gap-1.5">
                <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span>بيانات العميل المستفيد (Customer / Beneficiary)</span>
              </span>
              <span className="text-[10px] font-mono text-slate-400" dir="ltr">
                ID: {invoice.customerId}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <span className="text-[10px] text-slate-400 block">اسم العميل / الجهة:</span>
                <span className="font-black text-slate-900 text-xs sm:text-sm">
                  {invoice.customerName}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block">رقم الجوال / التواصل:</span>
                <span className="font-mono font-bold text-slate-800 text-xs" dir="ltr">
                  {invoice.customerPhone || '—'}
                </span>
              </div>
            </div>
          </div>

          {/* Payment & Settlement Box (5 cols) */}
          <div className="sm:col-span-5 bg-white rounded-xl border border-slate-200 p-3 flex flex-col justify-between">
            <div className="flex items-center justify-between border-b border-slate-100 pb-1.5 mb-2">
              <span className="text-[11px] font-black text-slate-700 flex items-center gap-1.5">
                <CreditCard className="w-3.5 h-3.5 text-blue-600" />
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

        {/* ====================================================================
            ZONE 3: STRUCTURED LINE ITEMS TABLE (Full Space Utilization)
        ==================================================================== */}
        <div className="rounded-xl border border-slate-300 overflow-hidden">
          <table className="w-full text-right border-collapse text-xs">
            <thead>
              <tr className={`${tableHeadBg} text-[11px]`}>
                <th className="py-2 px-2.5 text-center w-9 border-l border-white/15">#</th>
                <th className="py-2 px-2.5 text-center w-24 border-l border-white/15">كود SKU</th>
                <th className="py-2 px-3 border-l border-white/15">
                  بيان الصنف والمواصفات الفنية (Item Description)
                </th>
                {(hasSerialOrWarranty || isWarrantyA4) && (
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
                <th className="py-2 px-2.5 text-center w-24 border-l border-white/15">
                  سعر الوحدة
                </th>
                <th className="py-2 px-3 text-left w-28">الإجمالي ({currency})</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {invoice.items.map((item, idx) => (
                <tr
                  key={idx}
                  className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/70'}
                >
                  <td className="py-2 px-2 text-center font-mono font-bold text-slate-500 border-l border-slate-200">
                    {idx + 1}
                  </td>
                  <td
                    className="py-2 px-2 text-center font-mono text-[11px] font-bold text-slate-700 border-l border-slate-200"
                    dir="ltr"
                  >
                    {item.sku}
                  </td>
                  <td className="py-2 px-3 font-bold text-slate-900 border-l border-slate-200">
                    <div>{item.productName}</div>
                    {item.kitchenNotes && (
                      <div className="text-[10px] text-slate-500 font-normal mt-0.5">
                        ملاحظة: {item.kitchenNotes}
                      </div>
                    )}
                  </td>
                  {(hasSerialOrWarranty || isWarrantyA4) && (
                    <td className="py-2 px-2.5 text-center border-l border-slate-200">
                      <div className="font-mono text-[10px] font-bold text-slate-800" dir="ltr">
                        {item.serialNumber || 'SN-VERIFIED'}
                      </div>
                      <span className="inline-block mt-0.5 px-2 py-0.2 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-[9px] font-bold">
                        ضمان {item.warrantyMonths || 12} شهر
                      </span>
                    </td>
                  )}
                  {(hasBatchOrExpiry || isMedical) && (
                    <td className="py-2 px-2.5 text-center font-mono text-[10px] border-l border-slate-200" dir="ltr">
                      <div>LOT: {item.batchNumber || 'B-2025'}</div>
                      <div className="text-rose-700">EXP: {item.expiryDate || '2027-12'}</div>
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

        {/* ====================================================================
            ZONE 4: BALANCED FINANCIAL SUMMARY, TAFQEET, BANK ACCOUNTS & QR/BARCODE
        ==================================================================== */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-stretch">
          {/* Right Side (7 cols): Tafqeet + Bank Accounts + QR & Barcode */}
          <div className="md:col-span-7 flex flex-col justify-between space-y-2.5">
            {/* Tafqeet Box */}
            <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-2 text-xs">
              <span className="text-slate-500 font-bold shrink-0">المبلغ كتابةً (التفقيط):</span>
              <span className="font-black text-slate-900 text-right">{tafqeetText}</span>
            </div>

            {/* Official Bank Accounts & QR + Barcode Row */}
            <div className="flex-1 p-3 rounded-xl bg-slate-50/70 border border-slate-200 flex flex-wrap sm:flex-nowrap items-center justify-between gap-3">
              <div className="space-y-1 text-[10px] text-slate-600 flex-1 min-w-[180px]">
                <div className="font-black text-slate-900 text-[11px] flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>الحسابات المصرفية المعتمدة للتحويل والسداد:</span>
                </div>
                <div>• بنك الكريمي الإسلامي: 1102-884920 ({currency})</div>
                <div>• بنك التضامن الإسلامي: 1103-449102 ({currency})</div>
                {invoice.notes && (
                  <div className="text-slate-800 font-bold pt-1">
                    ملاحظات الفاتورة: {invoice.notes}
                  </div>
                )}
              </div>

              {(settings.showQR || settings.showBarcode) && (
                <div className="flex items-center gap-2.5 shrink-0">
                  {settings.showQR && <CrispQRCodeSVG payload={qrPayload} sizePx={78} />}
                  {settings.showBarcode && (
                    <CrispLinearBarcodeSVG
                      code={invoice.invoiceNumber}
                      widthPx={145}
                      heightPx={34}
                    />
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Left Side (5 cols): Financial Totals Table */}
          <div className="md:col-span-5 bg-slate-50 rounded-xl border border-slate-200 p-3.5 flex flex-col justify-between space-y-2 text-xs">
            <div className="space-y-1.5">
              <div className="flex justify-between items-center text-slate-600">
                <span>إجمالي قيمة الأصناف (Subtotal):</span>
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

            <div className="p-2.5 rounded-xl bg-slate-900 text-white flex items-center justify-between">
              <div>
                <div className="text-xs font-black">الصافي النهائي المستحق</div>
                <div className="text-[9px] text-slate-300 font-mono" dir="ltr">
                  NET PAYABLE AMOUNT
                </div>
              </div>
              <div className="font-mono text-lg font-black text-amber-300" dir="ltr">
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

        {/* ====================================================================
            ZONE 5: WARRANTY TERMS & OFFICIAL COMPANY STAMP / SIGNATURES
        ==================================================================== */}
        {(settings.showWarrantyTerms || isWarrantyA4) && (
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-[10px] text-slate-600 space-y-1">
            <div className="font-black text-slate-900 flex items-center gap-1.5 text-[11px]">
              <Award className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span>شروط وأحكام شهادة الضمان والصيانة المعتمدة من {companyName}:</span>
            </div>
            <p className="leading-relaxed">
              {settings.footerNoteAr} • يسري الضمان على العيوب المصنعية وفق الرقم التسلسلي (S/N) المدون أمام كل صنف، ولا يشمل الكسر أو سوء الاستخدام أو التوصيل الكهربائي الخاطئ.
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
