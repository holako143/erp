import React from 'react';
import {
  SalesInvoice,
  ThermalTemplateType,
  StandardInvoiceTemplateType,
  InvoiceTemplateSettings,
} from '../../types/erp';
import { generateCode128Binary } from '../../core/barcodeEngine';
import { generateGeneralQRCodeMatrix } from '../../core/communicationsEngine';
import { formatCleanNumber } from '../../core/systemConfigEngine';
import {
  ShieldCheck,
  Utensils,
  Award,
  Pill,
  CheckCircle2,
  Phone,
  MapPin,
  Hash,
  HardHat,
  Sparkles,
  Building2,
  Globe,
  Landmark,
  FileCheck2,
  QrCode,
} from 'lucide-react';

interface InvoiceRendererProps {
  invoice: SalesInvoice;
  mode: 'thermal' | 'a4';
  thermalTemplate?: ThermalTemplateType;
  standardTemplate?: StandardInvoiceTemplateType;
  settings: InvoiceTemplateSettings;
  companyName: string;
  taxNumber: string;
  branchName: string;
  branchAddress?: string;
  branchPhone?: string;
  currency: string;
}

/**
 * High-Precision Code-128 Linear Barcode SVG with Quiet Zones & Guard Bars
 */
const InlineBarcode: React.FC<{ value: string; height?: number }> = ({
  value,
  height = 36,
}) => {
  const cleanCode = (value || 'INV-2026-001').trim();
  const binary = generateCode128Binary(cleanCode);
  const barWidth = 1.45;
  const quietZone = 10;
  const totalWidth = binary.length * barWidth + quietZone * 2;

  return (
    <div
      data-testid="invoice-barcode-svg"
      className="flex flex-col items-center select-none bg-white px-2.5 py-1.5 rounded-lg border border-slate-200/90"
    >
      <svg
        viewBox={`0 0 ${totalWidth} ${height}`}
        className="w-full max-w-[240px]"
        style={{ height }}
        shapeRendering="crispEdges"
      >
        <rect x={0} y={0} width={totalWidth} height={height} fill="#ffffff" />
        {binary.split('').map((bit, idx) => {
          if (bit !== '1') return null;
          const isGuard = idx < 11 || idx >= binary.length - 13;
          return (
            <rect
              key={idx}
              x={quietZone + idx * barWidth}
              y={0}
              width={barWidth}
              height={isGuard ? height : height - 2}
              fill="#0f172a"
            />
          );
        })}
      </svg>
      <span
        dir="ltr"
        className="text-[9.5px] font-mono font-bold text-slate-700 mt-1 tracking-[0.22em] uppercase"
      >
        *{cleanCode}*
      </span>
    </div>
  );
};

/**
 * Authentic ISO/IEC 18004 QR Code SVG Matrix (25x25+ with 3 Finder Patterns, Timing Tracks, & Quiet Zone)
 */
const InlineZatcaQR: React.FC<{ value: string; size?: number }> = ({
  value,
  size = 96,
}) => {
  const matrix = React.useMemo(
    () => generateGeneralQRCodeMatrix(value || 'RLM-ERP-INVOICE', 25),
    [value]
  );
  const grid = matrix.length || 25;
  const quietZone = 2;
  const totalModules = grid + quietZone * 2;

  return (
    <div
      data-testid="invoice-qr-svg"
      className="inline-flex items-center justify-center bg-white p-1.5 rounded-lg border border-slate-300 shadow-2xs"
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${totalModules} ${totalModules}`}
        shapeRendering="crispEdges"
        className="block"
      >
        <rect x={0} y={0} width={totalModules} height={totalModules} fill="#ffffff" />
        {matrix.map((row, r) =>
          row.map((filled, c) =>
            filled ? (
              <rect
                key={`${r}-${c}`}
                x={c + quietZone}
                y={r + quietZone}
                width={1}
                height={1}
                fill="#0f172a"
              />
            ) : null
          )
        )}
      </svg>
    </div>
  );
};

const calculateWarrantyExpiry = (startDateStr: string, months = 24): string => {
  try {
    const base = startDateStr ? new Date(startDateStr) : new Date();
    if (isNaN(base.getTime())) return '2028-11-10';
    const d = new Date(base);
    d.setMonth(d.getMonth() + (Number(months) || 24));
    return d.toISOString().split('T')[0];
  } catch {
    return '2028-11-10';
  }
};

/**
 * Converts numeric invoice total into official Arabic financial words (التفقيط المالي المعتمد)
 */
function formatArabicTafqeet(amount: number, currencyCode: string): string {
  const cleanVal = Math.max(0, Math.round(Number(amount) || 0));
  const currencyNameMap: Record<string, string> = {
    YER: 'ريال يمني',
    'ر.ي': 'ريال يمني',
    SAR: 'ريال سعودي',
    'ر.س': 'ريال سعودي',
    USD: 'دولار أمريكي',
    AED: 'درهم إماراتي',
  };
  const currencyLabel = currencyNameMap[currencyCode] || currencyCode || 'ريال يمني';

  if (cleanVal === 0) return `فقط صفر ${currencyLabel} لا غير`;

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
  const tens = ['', 'عشرة', 'عشرون', 'ثلاثون', 'أربعون', 'خمسون', 'ستون', 'سبعون', 'ثمانون', 'تسعون'];
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

  const convertBelow1000 = (n: number): string => {
    if (n === 0) return '';
    const parts: string[] = [];
    const h = Math.floor(n / 100);
    const rem = n % 100;
    if (h > 0) parts.push(hundreds[h]);
    if (rem > 0) {
      if (rem < 20) {
        parts.push(ones[rem]);
      } else {
        const o = rem % 10;
        const t = Math.floor(rem / 10);
        if (o > 0) {
          parts.push(`${ones[o]} و${tens[t]}`);
        } else {
          parts.push(tens[t]);
        }
      }
    }
    return parts.join(' و');
  };

  const chunks: string[] = [];
  const millions = Math.floor(cleanVal / 1000000);
  const thousands = Math.floor((cleanVal % 1000000) / 1000);
  const remainder = cleanVal % 1000;

  if (millions > 0) {
    if (millions === 1) chunks.push('مليون');
    else if (millions === 2) chunks.push('مليونان');
    else if (millions >= 3 && millions <= 10) chunks.push(`${ones[millions]} ملايين`);
    else chunks.push(`${convertBelow1000(millions)} مليون`);
  }

  if (thousands > 0) {
    if (thousands === 1) chunks.push('ألف');
    else if (thousands === 2) chunks.push('ألفان');
    else if (thousands >= 3 && thousands <= 10) chunks.push(`${ones[thousands]} آلاف`);
    else chunks.push(`${convertBelow1000(thousands)} ألف`);
  }

  if (remainder > 0) {
    chunks.push(convertBelow1000(remainder));
  }

  return `فقط ${chunks.join(' و')} ${currencyLabel} لا غير`;
}

export const InvoiceRenderer: React.FC<InvoiceRendererProps> = ({
  invoice,
  mode,
  thermalTemplate,
  standardTemplate,
  settings,
  companyName,
  taxNumber,
  branchName,
  branchAddress = 'صنعاء - شارع الستين الجنوبي',
  branchPhone = '+967 771 445 880',
  currency,
}) => {
  const activeThermal = thermalTemplate || settings.thermalTemplate;
  const activeStandard = standardTemplate || settings.standardTemplate;

  const orderTypeLabel: Record<string, string> = {
    DINE_IN: 'محلي - داخل الصالة (Dine-In)',
    TAKEAWAY: 'سفري - استلام (Takeaway)',
    DELIVERY: 'توصيل طلبات (Delivery)',
    STANDARD: 'مبيعات مباشرة',
  };

  const paymentMethodAr: Record<string, string> = {
    CASH: 'نقداً (صندوق الكاشير)',
    CARD: 'شبكة / محفظة إلكترونية (ام فلوس / جوالي)',
    CREDIT: 'آجل (ذمم عملاء)',
    TRANSFER: 'حوالة بنكية (بنك الكريمي / التضامن)',
  };

  const barcodeCode = invoice.invoiceNumber || 'INV-2026-001';
  const qrPayload =
    invoice.qrData ||
    `SELLER:${companyName}|TAX:${taxNumber}|INV:${invoice.invoiceNumber}|DATE:${invoice.date}|TOTAL:${formatCleanNumber(invoice.grandTotal)}|CUR:${currency}`;
  const tafqeetText = formatArabicTafqeet(invoice.grandTotal, currency);

  // ============================================================================
  // 1. THERMAL RECEIPT TEMPLATES (80mm Onyx POS, Warranty, Modern, Restaurant, 58mm)
  // ============================================================================
  if (mode === 'thermal') {
    const is58mm = activeThermal === 'thermal_58mm_compact';
    const isRestaurant = activeThermal === 'thermal_80mm_restaurant';
    const isWarranty = activeThermal === 'thermal_80mm_warranty';
    const isModern = activeThermal === 'thermal_80mm_modern';
    const isMinimal = activeThermal === 'thermal_80mm_minimal';
    const isOnyxPos = activeThermal === 'thermal_80mm_onyx_pos';

    return (
      <div
        data-testid="invoice-thermal-preview"
        className={`mx-auto bg-white text-slate-900 border ${
          isOnyxPos
            ? 'border-2 border-slate-900 shadow-md'
            : isModern
            ? 'border-indigo-300 shadow-md ring-1 ring-indigo-100'
            : isMinimal
            ? 'border-slate-200 shadow-none'
            : 'border-slate-300 shadow-sm'
        } rounded-xl font-mono transition-all ${
          is58mm ? 'max-w-[275px] p-3 text-[10px]' : 'max-w-[390px] p-5 text-xs'
        }`}
      >
        {/* Top Decorative Thermal Header */}
        <div
          className={`border-b-2 ${
            isOnyxPos
              ? 'border-double border-slate-900 pb-3 mb-3'
              : isMinimal
              ? 'border-solid border-slate-200 pb-3 mb-3'
              : 'border-dashed border-slate-300 pb-3 mb-3'
          } text-center`}
        >
          <div
            className={`inline-block px-2.5 py-0.5 rounded text-[10px] font-bold mb-1 font-sans ${
              isOnyxPos
                ? 'bg-emerald-900 text-white'
                : isModern
                ? 'bg-slate-900 text-white'
                : isMinimal
                ? 'bg-slate-100 text-slate-800 border border-slate-300'
                : 'bg-slate-900 text-white'
            }`}
          >
            {isOnyxPos
              ? 'فاتورة كاشير أونكس برو المعتمدة — Onyx POS 80mm'
              : isRestaurant
              ? 'إيصال طلبات وضيافة + أمر تجهيز'
              : isWarranty
              ? 'فاتورة مبيعات وشهادة ضمان معتمدة'
              : isModern
              ? 'فاتورة كاشير معتمدة 80mm'
              : isMinimal
              ? 'إيصال مبيعات مبسط 80mm'
              : is58mm
              ? 'إيصال نقاط البيع 58mm'
              : 'فاتورة مبيعات معتمدة 80mm'}
          </div>
          <h4 className={`font-black text-slate-900 font-sans ${is58mm ? 'text-xs' : 'text-sm'} mt-1`}>
            {companyName}
          </h4>
          <p className="text-[10px] text-slate-600 font-sans mt-0.5">
            {branchName} • {branchAddress}
          </p>
          <p className="text-[10px] text-slate-500 mt-0.5 font-sans">
            الرقم الضريبي: <span className="font-mono font-bold">{taxNumber}</span> • هاتف:{' '}
            <span className="font-mono" dir="ltr">
              {branchPhone}
            </span>
          </p>
          {settings.headerTitleAr && (
            <p className="text-[10px] text-emerald-800 font-sans font-bold mt-1.5 bg-emerald-50 border border-emerald-200 py-0.5 px-2 rounded">
              {settings.headerTitleAr}
            </p>
          )}
        </div>

        {/* Restaurant Specific Banner */}
        {(isRestaurant || invoice.orderType === 'DINE_IN' || invoice.tableNumber) && (
          <div className="mb-3 p-2 rounded-lg bg-orange-50 border border-orange-200 text-orange-950 font-sans">
            <div className="flex items-center justify-between text-xs font-black">
              <span className="flex items-center gap-1">
                <Utensils className="w-3.5 h-3.5 text-orange-600" />
                {orderTypeLabel[invoice.orderType || 'DINE_IN']}
              </span>
              {invoice.tableNumber && (
                <span className="bg-orange-600 text-white px-2 py-0.5 rounded text-[11px]">
                  طاولة: {invoice.tableNumber}
                </span>
              )}
            </div>
          </div>
        )}

        {/* Invoice Metadata */}
        <div
          className={`space-y-1 text-[11px] border-b ${
            isOnyxPos ? 'border-solid border-slate-800 bg-slate-50 p-2 rounded-lg' : 'border-dashed border-slate-300'
          } pb-2.5 mb-2.5`}
        >
          <div className="flex justify-between">
            <span className="text-slate-500 font-sans">رقم الفاتورة / السند:</span>
            <span className="font-bold text-slate-900">{invoice.invoiceNumber}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500 font-sans">تاريخ الإصدار:</span>
            <span>{invoice.date}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500 font-sans">العميل المستفيد:</span>
            <span className="font-sans font-bold truncate max-w-[190px]">{invoice.customerName}</span>
          </div>
          {invoice.customerPhone && (
            <div className="flex justify-between">
              <span className="text-slate-500 font-sans">جوال العميل:</span>
              <span className="font-mono font-bold" dir="ltr">
                {invoice.customerPhone}
              </span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-slate-500 font-sans">طريقة الدفع:</span>
            <span className="font-sans font-bold">
              {paymentMethodAr[invoice.paymentMethod] || invoice.paymentMethod}
            </span>
          </div>
        </div>

        {/* Line Items Table */}
        <div className="border-b border-dashed border-slate-300 pb-2.5 mb-2.5">
          <div
            className={`grid grid-cols-12 text-[10px] font-bold ${
              isOnyxPos
                ? 'bg-slate-900 text-white px-2 py-1 rounded'
                : 'text-slate-500 border-b border-slate-200 pb-1'
            } mb-1.5 font-sans`}
          >
            <div className="col-span-6 text-right">بيان الصنف</div>
            <div className="col-span-2 text-center">الكمية</div>
            <div className="col-span-4 text-left">الإجمالي</div>
          </div>
          <div className="space-y-2">
            {invoice.items.map((item, idx) => {
              const expiryDate = calculateWarrantyExpiry(invoice.date, item.warrantyMonths || 24);
              return (
                <div key={idx} className="text-[11px] border-b border-slate-100 pb-1.5 last:border-b-0 last:pb-0">
                  <div className="grid grid-cols-12 items-start">
                    <div className="col-span-6 font-sans font-bold text-slate-900 leading-tight">
                      {item.productName}
                    </div>
                    <div className="col-span-2 text-center font-bold">{formatCleanNumber(item.quantity)}</div>
                    <div className="col-span-4 text-left font-bold text-slate-900">
                      {formatCleanNumber(item.total)} {currency}
                    </div>
                  </div>
                  <div className="text-[9.5px] text-slate-500 font-sans mt-0.5 flex items-center justify-between">
                    <span>
                      سعر الوحدة: <strong className="font-mono">{formatCleanNumber(item.unitPrice)}</strong> {currency}
                    </span>
                    <span className="font-mono text-[9px] text-slate-400">{item.sku}</span>
                  </div>

                  {/* Electronics Warranty / Serial Details */}
                  {(isWarranty || isOnyxPos || item.serialNumber || item.warrantyMonths) && (
                    <div className="mt-1 p-1.5 text-[9.5px] bg-emerald-50/90 text-emerald-950 rounded border border-emerald-200 font-sans space-y-0.5">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-emerald-800">الرقم التسلسلي S/N:</span>
                        <span
                          className="font-mono font-bold bg-white px-1.5 py-0.2 rounded border border-emerald-200"
                          dir="ltr"
                        >
                          {item.serialNumber || `SN-${item.sku}-001`}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[9px] text-emerald-700">
                        <span>
                          مدة الضمان: <strong>{item.warrantyMonths || 24} شهر</strong>
                        </span>
                        <span>
                          ينتهي في: <strong className="font-mono" dir="ltr">{expiryDate}</strong>
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Restaurant Kitchen Notes */}
                  {item.kitchenNotes && (
                    <div className="mt-0.5 text-[9px] bg-amber-50 text-amber-800 px-1.5 py-0.5 rounded font-sans">
                      ملاحظة مطبخ: {item.kitchenNotes}
                    </div>
                  )}

                  {/* Pharmacy Batch / Expiry */}
                  {(item.batchNumber || item.expiryDate) && (
                    <div className="mt-0.5 text-[9px] bg-rose-50 text-rose-800 px-1.5 py-0.5 rounded font-sans">
                      تشغيلة: {item.batchNumber || 'B-101'} | صلاحية: {item.expiryDate || '2027-06'}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Totals Section */}
        <div className="space-y-1 text-xs border-b-2 border-dashed border-slate-300 pb-3 mb-3 font-sans">
          <div className="flex justify-between text-slate-600">
            <span>المجموع الفرعي:</span>
            <span className="font-mono font-bold">
              {formatCleanNumber(invoice.subtotal)} {currency}
            </span>
          </div>
          {invoice.discountAmount > 0 && (
            <div className="flex justify-between text-rose-600">
              <span>
                الخصم المطبق{' '}
                {invoice.discountType
                  ? invoice.discountType === 'PERCENT'
                    ? `(نسبة ${formatCleanNumber(invoice.discountValue || 0)}%)`
                    : `(مبلغ مقطوع)`
                  : invoice.couponCode
                  ? `(${invoice.couponCode})`
                  : ''}
                :
              </span>
              <span className="font-mono font-bold">
                -{formatCleanNumber(invoice.discountAmount)} {currency}
              </span>
            </div>
          )}
          {invoice.taxAmount > 0 && (
            <div className="flex justify-between text-slate-600">
              <span>الضريبة المضافة:</span>
              <span className="font-mono font-bold">
                {formatCleanNumber(invoice.taxAmount)} {currency}
              </span>
            </div>
          )}
          <div className="flex justify-between text-sm font-black text-slate-900 pt-1.5 border-t border-slate-200">
            <span>الإجمالي النهائي الصافي:</span>
            <span className="font-mono text-emerald-700">
              {formatCleanNumber(invoice.grandTotal)} {currency}
            </span>
          </div>
          <div className="text-[10px] text-slate-600 bg-slate-100 px-2 py-1 rounded text-center font-bold mt-1">
            {tafqeetText}
          </div>
        </div>

        {/* Warranty Policy Note on Thermal Warranty Template */}
        {(isWarranty || isOnyxPos || invoice.items.some((i) => i.serialNumber || i.warrantyMonths)) &&
          settings.showWarrantyTerms && (
            <div className="mb-3 p-2.5 bg-slate-900 text-white rounded-lg text-[9.5px] font-sans leading-relaxed">
              <div className="font-bold text-emerald-400 flex items-center gap-1 mb-0.5">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>شهادة ضمان معتمدة (Official Warranty Certificate)</span>
              </div>
              يشمل الضمان الصيانة والاستبدال للأعطال المصنعية للألواح والإنفرترات والبطاريات والشاشات بموجب الرقم التسلسلي (S/N) المدون أعلاه، ولا يشمل الكسر أو سوء التوصيل الكهربائي.
            </div>
          )}

        {/* Barcode & Authentic QR Code */}
        <div className="flex flex-col items-center gap-2.5">
          {settings.showQR && (
            <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 flex flex-col items-center w-full">
              <InlineZatcaQR value={qrPayload} size={is58mm ? 84 : 104} />
              <span className="text-[9.5px] font-bold text-slate-600 mt-1.5 font-sans">
                امسح رمز QR للتحقق الفوري من الفاتورة والضمان الرقمي
              </span>
            </div>
          )}
          {settings.showBarcode && (
            <InlineBarcode value={barcodeCode} height={is58mm ? 26 : 34} />
          )}
        </div>

        {/* Footer Note */}
        {settings.footerNoteAr && (
          <div className="mt-3 pt-2 border-t border-dashed border-slate-200 text-center text-[10px] text-slate-500 font-sans">
            {settings.footerNoteAr}
          </div>
        )}
      </div>
    );
  }

  // ============================================================================
  // 2. SPECIALIZED YEMEN ONYX PRO A4 TEMPLATE (a4_onyx_yemen)
  // ============================================================================
  if (activeStandard === 'a4_onyx_yemen') {
    return (
      <div
        data-testid="invoice-a4-preview"
        className="mx-auto bg-white text-slate-900 border-2 border-slate-900 shadow-sm rounded-2xl p-6 sm:p-8 max-w-4xl"
      >
        {/* Dual Bilingual Commercial Header (Onyx Pro Yemen Standard) */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 pb-5 mb-5 border-b-4 border-double border-slate-900 items-center">
          {/* Right: Arabic Company Details */}
          <div className="md:col-span-5 text-right space-y-1">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded bg-emerald-900 text-white text-[10px] font-bold">
              <Building2 className="w-3.5 h-3.5 text-emerald-300" />
              <span>الجمهورية اليمنية — فاتورة تجارية وضريبية معتمدة</span>
            </div>
            <h2 className="text-lg sm:text-xl font-black text-slate-950 leading-snug">
              {companyName}
            </h2>
            <p className="text-xs text-slate-700 font-bold">{branchName} — {branchAddress}</p>
            <p className="text-[11px] text-slate-600">
              الرقم الضريبي: <strong className="font-mono">{taxNumber}</strong> | هاتف:{' '}
              <strong className="font-mono" dir="ltr">{branchPhone}</strong>
            </p>
          </div>

          {/* Center: Official Seal & Title */}
          <div className="md:col-span-3 flex flex-col items-center justify-center text-center">
            <div className="w-14 h-14 rounded-2xl bg-slate-900 text-white flex flex-col items-center justify-center shadow-sm border-2 border-emerald-500">
              <ShieldCheck className="w-7 h-7 text-emerald-400" />
              <span className="text-[8px] font-mono font-bold tracking-widest text-emerald-300">
                ONYX PRO
              </span>
            </div>
            <div className="mt-2 px-3 py-1 rounded-lg bg-slate-900 text-white font-black text-xs">
              فاتورة مبيعات وشهادة ضمان
            </div>
            <span className="text-[10px] font-mono font-bold text-slate-500 mt-0.5">
              COMMERCIAL SALES INVOICE
            </span>
          </div>

          {/* Left: Invoice Number & English Header */}
          <div className="md:col-span-4 text-left dir-ltr bg-slate-50 p-3.5 rounded-xl border border-slate-300 space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="font-mono font-bold text-slate-500">INVOICE NO:</span>
              <span className="font-mono font-black text-sm text-emerald-800">{invoice.invoiceNumber}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="font-mono text-slate-500">ISSUE DATE:</span>
              <span className="font-mono font-bold text-slate-900">{invoice.date}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="font-mono text-slate-500">CURRENCY:</span>
              <span className="font-mono font-bold text-slate-900">{currency} (ريال يمني)</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="font-mono text-slate-500">PAYMENT:</span>
              <span className="font-sans font-bold text-emerald-700">
                {paymentMethodAr[invoice.paymentMethod] || invoice.paymentMethod}
              </span>
            </div>
          </div>
        </div>

        {/* Customer & Account Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5 bg-slate-50 p-3.5 rounded-xl border border-slate-300 text-xs">
          <div>
            <span className="text-slate-500 font-bold block mb-0.5">المكرم / الأخوة (العميل المستفيد):</span>
            <span className="font-black text-sm text-slate-950">{invoice.customerName}</span>
          </div>
          <div>
            <span className="text-slate-500 font-bold block mb-0.5">رقم الجوال / الهاتف:</span>
            <span className="font-mono font-bold text-sm text-slate-900" dir="ltr">
              {invoice.customerPhone || '+967 770 000 000'}
            </span>
          </div>
          <div>
            <span className="text-slate-500 font-bold block mb-0.5">المخزن والمركز المالي:</span>
            <span className="font-bold text-slate-900">{branchName} • مركز التكلفة الرئيسي</span>
          </div>
        </div>

        {/* Onyx Pro Full-Bordered Table */}
        <div className="overflow-x-auto border-2 border-slate-900 rounded-xl mb-5">
          <table className="w-full text-right text-xs border-collapse">
            <thead className="bg-slate-900 text-white font-bold">
              <tr>
                <th className="py-2.5 px-2.5 border-l border-slate-700 text-center w-10">م</th>
                <th className="py-2.5 px-2.5 border-l border-slate-700">رقم الصنف SKU</th>
                <th className="py-2.5 px-3 border-l border-slate-700">بيان الصنف والمواصفات الفنية</th>
                <th className="py-2.5 px-2.5 border-l border-slate-700">الرقم التسلسلي S/N والضمان</th>
                <th className="py-2.5 px-2.5 border-l border-slate-700 text-center">الكمية</th>
                <th className="py-2.5 px-2.5 border-l border-slate-700">سعر الوحدة</th>
                <th className="py-2.5 px-3">الإجمالي الصافي</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-300">
              {invoice.items.map((item, idx) => {
                const expiryDate = calculateWarrantyExpiry(invoice.date, item.warrantyMonths || 24);
                return (
                  <tr key={idx} className="even:bg-slate-50/80 hover:bg-emerald-50/30">
                    <td className="py-2.5 px-2.5 border-l border-slate-300 text-center font-mono font-bold">
                      {idx + 1}
                    </td>
                    <td className="py-2.5 px-2.5 border-l border-slate-300 font-mono text-[11px] font-bold text-slate-700">
                      {item.sku}
                    </td>
                    <td className="py-2.5 px-3 border-l border-slate-300 font-bold text-slate-950">
                      {item.productName}
                    </td>
                    <td className="py-2.5 px-2.5 border-l border-slate-300">
                      <span
                        className="inline-block font-mono text-[10.5px] font-bold text-emerald-950 bg-emerald-50 border border-emerald-300 px-1.5 py-0.5 rounded"
                        dir="ltr"
                      >
                        {item.serialNumber || `SN-${item.sku}-01`}
                      </span>
                      <span className="block text-[10px] text-slate-600 mt-0.5">
                        ضمان {item.warrantyMonths || 24} شهر (لغاية {expiryDate})
                      </span>
                    </td>
                    <td className="py-2.5 px-2.5 border-l border-slate-300 text-center font-mono font-black text-slate-900">
                      {formatCleanNumber(item.quantity)}
                    </td>
                    <td className="py-2.5 px-2.5 border-l border-slate-300 font-mono font-bold">
                      {formatCleanNumber(item.unitPrice)} {currency}
                    </td>
                    <td className="py-2.5 px-3 font-mono font-black text-slate-950">
                      {formatCleanNumber(item.total)} {currency}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Arabic Tafqeet Bar */}
        <div className="mb-5 p-3 rounded-xl bg-emerald-50 border-2 border-emerald-700/30 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 rounded bg-emerald-900 text-white font-bold text-[11px]">
              تفقيط المبلغ الإجمالي
            </span>
            <span className="font-black text-emerald-950 text-sm">{tafqeetText}</span>
          </div>
          <span className="font-mono font-black text-base text-emerald-900">
            {formatCleanNumber(invoice.grandTotal)} {currency}
          </span>
        </div>

        {/* Bottom Grid: Yemeni Bank Accounts, QR/Barcode & Totals */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-start">
          <div className="md:col-span-7 space-y-3">
            {/* Yemeni Banks Remittance Box */}
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-300 text-xs space-y-1.5">
              <div className="font-black text-slate-900 flex items-center gap-1.5">
                <Landmark className="w-4 h-4 text-emerald-700" />
                <span>الحسابات المصرفية المعتمدة للسداد والتحويل (اليمن):</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] pt-1">
                <div className="bg-white p-2 rounded-lg border border-slate-200">
                  <div className="font-bold text-slate-800">بنك الكريمي للتمويل الأصغر الإسلامي</div>
                  <div className="font-mono text-emerald-700 font-bold mt-0.5">
                    حساب (YER): 124088991 • ام فلوس: 771445880
                  </div>
                </div>
                <div className="bg-white p-2 rounded-lg border border-slate-200">
                  <div className="font-bold text-slate-800">بنك التضامن الإسلامي / بنك اليمن والكويت</div>
                  <div className="font-mono text-indigo-700 font-bold mt-0.5">
                    حساب جاري: 4001928301 • محفظة جوالي
                  </div>
                </div>
              </div>
            </div>

            {/* Authentic QR + Barcode Verification Row */}
            <div className="flex flex-wrap items-center gap-4 p-3.5 rounded-xl bg-white border border-slate-300">
              {settings.showQR && <InlineZatcaQR value={qrPayload} size={96} />}
              <div className="flex-1 min-w-[180px] space-y-1.5">
                <div className="text-xs font-black text-slate-900 flex items-center gap-1">
                  <QrCode className="w-4 h-4 text-emerald-700" />
                  <span>التحقق الرقمي من الفاتورة وشهادة الضمان (QR & Code-128)</span>
                </div>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  البضاعة المباعة مكفولة بضمان الوكيل المعتمد ضد الأعطال المصنعية حسب الرقم التسلسلي (S/N) المدون لكل صنف.
                </p>
                {settings.showBarcode && <InlineBarcode value={barcodeCode} height={28} />}
              </div>
            </div>
          </div>

          <div className="md:col-span-5 space-y-3">
            <div className="p-4 rounded-xl bg-slate-900 text-white space-y-2 text-xs">
              <div className="flex justify-between text-slate-300">
                <span>إجمالي قيمة الأصناف:</span>
                <span className="font-mono font-bold">
                  {formatCleanNumber(invoice.subtotal)} {currency}
                </span>
              </div>
              {invoice.discountAmount > 0 && (
                <div className="flex justify-between text-rose-300">
                  <span>إجمالي الخصم الممنوح:</span>
                  <span className="font-mono font-bold">
                    -{formatCleanNumber(invoice.discountAmount)} {currency}
                  </span>
                </div>
              )}
              {invoice.taxAmount > 0 && (
                <div className="flex justify-between text-slate-300">
                  <span>الضريبة المضافة:</span>
                  <span className="font-mono font-bold">
                    {formatCleanNumber(invoice.taxAmount)} {currency}
                  </span>
                </div>
              )}
              <div className="border-t border-slate-700 pt-2.5 flex justify-between text-base font-black text-emerald-400">
                <span>الصافي النهائي المستحق:</span>
                <span className="font-mono">
                  {formatCleanNumber(invoice.grandTotal)} {currency}
                </span>
              </div>
            </div>

            {settings.showStampAndSignature && (
              <div className="grid grid-cols-2 gap-3 text-center">
                <div className="p-3 rounded-xl border border-dashed border-slate-400 bg-slate-50">
                  <div className="text-[10px] font-bold text-slate-500 mb-2">ختم الحسابات والمبيعات</div>
                  <div className="inline-block px-2.5 py-1 rounded-full border-2 border-emerald-700 text-emerald-800 font-black text-[10px] -rotate-6">
                    معتمد • ONYX CERTIFIED
                  </div>
                </div>
                <div className="p-3 rounded-xl border border-dashed border-slate-400 bg-slate-50">
                  <div className="text-[10px] font-bold text-slate-500 mb-2">توقيع المستلم</div>
                  <div className="text-[11px] font-mono text-slate-400">___________________</div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ============================================================================
  // 3. GLOBAL B2B SAP / ODOO COMMERCIAL TAX INVOICE (a4_global_sap_odoo)
  // ============================================================================
  if (activeStandard === 'a4_global_sap_odoo') {
    return (
      <div
        data-testid="invoice-a4-preview"
        className="mx-auto bg-white text-slate-900 border border-slate-300 shadow-sm rounded-2xl p-6 sm:p-8 max-w-4xl"
      >
        {/* Top Accent Strip */}
        <div className="h-2 w-full bg-gradient-to-r from-slate-900 via-indigo-700 to-emerald-600 rounded-full mb-6" />

        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-6 mb-6 border-b border-slate-200">
          <div>
            <div className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-700 uppercase tracking-wider mb-1">
              <Globe className="w-4 h-4" />
              <span>GLOBAL B2B COMMERCIAL TAX INVOICE • فاتورة ضريبية دولية موحدة</span>
            </div>
            <h2 className="text-2xl font-black text-slate-950">{companyName}</h2>
            <p className="text-xs text-slate-600 mt-1">
              {branchName} • {branchAddress} • Tel: <span className="font-mono" dir="ltr">{branchPhone}</span>
            </p>
            <p className="text-xs font-mono text-slate-500 mt-0.5">
              TAX / VAT REG NO: <strong className="text-slate-800">{taxNumber}</strong>
            </p>
          </div>

          <div className="bg-slate-900 text-white p-4 rounded-xl min-w-[230px] text-left">
            <div className="text-[10px] font-mono uppercase tracking-widest text-indigo-300">
              TAX INVOICE / فاتورة مبيعات
            </div>
            <div className="font-mono font-black text-lg mt-0.5">{invoice.invoiceNumber}</div>
            <div className="flex items-center justify-between text-[11px] text-slate-300 mt-2 pt-2 border-t border-slate-700">
              <span>Date / التاريخ:</span>
              <span className="font-mono font-bold text-white">{invoice.date}</span>
            </div>
          </div>
        </div>

        {/* International 3-Column Metadata Box (Bill To / Payment Terms / Verification) */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6 text-xs">
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
            <div className="text-[10px] font-mono uppercase text-slate-400 font-bold mb-1">
              BILL TO / العميل المفوتر
            </div>
            <div className="font-black text-sm text-slate-900">{invoice.customerName}</div>
            <div className="font-mono text-slate-600 mt-1" dir="ltr">
              {invoice.customerPhone || `CUST-ID: ${invoice.customerId}`}
            </div>
          </div>
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
            <div className="text-[10px] font-mono uppercase text-slate-400 font-bold mb-1">
              PAYMENT TERMS / شروط الدفع
            </div>
            <div className="font-black text-sm text-slate-900">
              {paymentMethodAr[invoice.paymentMethod] || invoice.paymentMethod}
            </div>
            <div className="text-emerald-700 font-bold mt-1 flex items-center gap-1">
              <FileCheck2 className="w-3.5 h-3.5" />
              <span>Status: {invoice.status} • Currency: {currency}</span>
            </div>
          </div>
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
            <div className="text-[10px] font-mono uppercase text-slate-400 font-bold mb-1">
              DOCUMENT REF / الرقم المرجعي
            </div>
            <div className="font-mono font-bold text-indigo-700">{barcodeCode}</div>
            <div className="text-[11px] text-slate-500 mt-1">ISO/IEC 18004 & Code-128 Verified</div>
          </div>
        </div>

        {/* Bilingual Items Table */}
        <div className="overflow-x-auto border border-slate-200 rounded-xl mb-6">
          <table className="w-full text-right text-xs">
            <thead className="bg-slate-900 text-white font-bold">
              <tr>
                <th className="py-3 px-3">#</th>
                <th className="py-3 px-3">Item & Description / البيان والمواصفات</th>
                <th className="py-3 px-3">Serial & Warranty / الرقم التسلسلي والضمان</th>
                <th className="py-3 px-3 text-center">Qty / الكمية</th>
                <th className="py-3 px-3">Unit Price / السعر</th>
                <th className="py-3 px-3">Net Total / الإجمالي</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {invoice.items.map((item, idx) => (
                <tr key={idx} className="hover:bg-slate-50">
                  <td className="py-3 px-3 font-mono font-bold text-slate-500">{idx + 1}</td>
                  <td className="py-3 px-3">
                    <div className="font-bold text-slate-900">{item.productName}</div>
                    <div className="text-[10px] font-mono text-slate-400">SKU: {item.sku}</div>
                  </td>
                  <td className="py-3 px-3">
                    <span
                      className="font-mono text-[11px] font-bold text-indigo-950 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded"
                      dir="ltr"
                    >
                      {item.serialNumber || `SN-${item.sku}-01`}
                    </span>
                    <span className="block text-[10px] text-slate-500 mt-0.5">
                      Warranty: {item.warrantyMonths || 24} Months
                    </span>
                  </td>
                  <td className="py-3 px-3 text-center font-mono font-bold">
                    {formatCleanNumber(item.quantity)}
                  </td>
                  <td className="py-3 px-3 font-mono">
                    {formatCleanNumber(item.unitPrice)} {currency}
                  </td>
                  <td className="py-3 px-3 font-mono font-black text-slate-900">
                    {formatCleanNumber(item.total)} {currency}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Summary & QR Row */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
          <div className="md:col-span-7 flex flex-wrap items-center gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200">
            {settings.showQR && <InlineZatcaQR value={qrPayload} size={96} />}
            <div className="flex-1 min-w-[180px] space-y-1.5">
              <div className="text-xs font-black text-slate-900">
                Digital Tax & Warranty Verification (SAP / Odoo Standard)
              </div>
              <p className="text-[11px] text-slate-600">{tafqeetText}</p>
              {settings.showBarcode && <InlineBarcode value={barcodeCode} height={28} />}
            </div>
          </div>

          <div className="md:col-span-5 p-4 rounded-xl bg-slate-900 text-white space-y-2 text-xs">
            <div className="flex justify-between text-slate-300">
              <span>Subtotal / المجموع الفرعي:</span>
              <span className="font-mono font-bold">
                {formatCleanNumber(invoice.subtotal)} {currency}
              </span>
            </div>
            {invoice.discountAmount > 0 && (
              <div className="flex justify-between text-rose-300">
                <span>Discount / الخصم:</span>
                <span className="font-mono font-bold">
                  -{formatCleanNumber(invoice.discountAmount)} {currency}
                </span>
              </div>
            )}
            <div className="border-t border-slate-700 pt-2.5 flex justify-between text-base font-black text-emerald-400">
              <span>Grand Total / الإجمالي:</span>
              <span className="font-mono">
                {formatCleanNumber(invoice.grandTotal)} {currency}
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ============================================================================
  // 4. STANDARD A4 INVOICE TEMPLATES (Corporate, Modern Blue, Warranty, Medical, Contracting, Minimalist)
  // ============================================================================
  const isModernBlue = activeStandard === 'a4_modern_blue';
  const isElectronicsA4 = activeStandard === 'a4_warranty_electronics';
  const isMedicalA4 = activeStandard === 'a4_medical_pharmacy';
  const isContracting = activeStandard === 'a4_contracting_specs';
  const isMinimalistClean = activeStandard === 'a4_minimalist_clean';
  const isDarkBanner = isModernBlue || isElectronicsA4 || isMedicalA4 || isContracting;

  return (
    <div
      data-testid="invoice-a4-preview"
      className="mx-auto bg-white text-slate-900 border border-slate-200 shadow-sm rounded-2xl p-6 sm:p-8 max-w-4xl"
    >
      {/* Header Banner */}
      <div
        className={`rounded-xl p-5 mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
          isMinimalistClean
            ? 'bg-white border-b-2 border-slate-900 text-slate-900 rounded-none px-1 shadow-none'
            : isDarkBanner
            ? 'bg-slate-900 border border-slate-800 text-white'
            : 'bg-slate-50 border border-slate-200 text-slate-900'
        }`}
      >
        <div>
          <div className="flex items-center gap-2 mb-1">
            {isElectronicsA4 && <Award className="w-5 h-5 text-emerald-400" />}
            {isMedicalA4 && <Pill className="w-5 h-5 text-emerald-400" />}
            {isContracting && <HardHat className="w-5 h-5 text-amber-400" />}
            {isMinimalistClean && <Sparkles className="w-5 h-5 text-slate-700" />}
            {!isElectronicsA4 && !isMedicalA4 && !isContracting && !isMinimalistClean && (
              <ShieldCheck
                className={`w-5 h-5 ${isModernBlue ? 'text-indigo-300' : 'text-indigo-600'}`}
              />
            )}
            <span
              className={`text-xs font-bold uppercase tracking-wider ${
                isDarkBanner
                  ? isContracting
                    ? 'text-amber-300'
                    : 'text-emerald-300'
                  : 'text-indigo-600'
              }`}
            >
              {isElectronicsA4
                ? 'فاتورة مبيعات معتمدة + شهادة ضمان رسمية للأجهزة والطاقة الشمسية (Official Warranty A4)'
                : isMedicalA4
                ? 'فاتورة توريد طبي وصيدلاني معتمدة (FEFO / Batch A4)'
                : isContracting
                ? 'فاتورة مستخلصات مقاولات وتوريدات هندسية معتمدة (Contracting & Specs A4)'
                : isMinimalistClean
                ? 'فاتورة مبيعات مبسطة ذات تصميم مينيمل معاصر (Minimalist Clean A4)'
                : isModernBlue
                ? 'فاتورة مبيعات إلكترونية معتمدة (Modern Blue A4)'
                : 'فاتورة مبيعات رسمية للشركات — نظام حاسب (Corporate Classic A4)'}
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black">{companyName}</h2>
          <div
            className={`flex flex-wrap items-center gap-4 text-xs mt-2 ${
              isDarkBanner ? 'text-slate-300' : 'text-slate-600'
            }`}
          >
            <span className="flex items-center gap-1">
              <Hash className="w-3.5 h-3.5" /> الرقم الضريبي:{' '}
              <strong className="font-mono">{taxNumber}</strong>
            </span>
            <span className="flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5" /> {branchName} - {branchAddress}
            </span>
            <span className="flex items-center gap-1">
              <Phone className="w-3.5 h-3.5" /> <span dir="ltr">{branchPhone}</span>
            </span>
          </div>
        </div>

        <div
          className={`text-left sm:text-right p-3.5 rounded-lg ${
            isDarkBanner
              ? 'bg-white/10 border border-white/15'
              : 'bg-white border border-slate-200'
          }`}
        >
          <div
            className={`text-[11px] ${
              isDarkBanner ? 'text-slate-300' : 'text-slate-500'
            }`}
          >
            {isContracting ? 'رقم المستخلص / الفاتورة' : 'رقم الفاتورة وشهادة الضمان'}
          </div>
          <div className="font-mono font-black text-base">{invoice.invoiceNumber}</div>
          <div
            className={`text-[11px] mt-1 ${
              isDarkBanner ? 'text-emerald-300' : 'text-slate-500'
            }`}
          >
            تاريخ الإصدار وبداية الضمان: {invoice.date}
          </div>
        </div>
      </div>

      {/* Customer & Payment Details Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
        <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
          <div className="text-[11px] text-slate-400 font-bold mb-1">
            المستفيد من الضمان / الجهة المشترية
          </div>
          <div className="font-black text-sm text-slate-900">{invoice.customerName}</div>
          <div className="text-xs text-slate-600 mt-0.5 font-mono" dir="ltr">
            {invoice.customerPhone || `ID: ${invoice.customerId}`}
          </div>
        </div>
        <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
          <div className="text-[11px] text-slate-400 font-bold mb-1">طريقة السداد وحالة التفعيل</div>
          <div className="font-black text-sm text-slate-900">
            {paymentMethodAr[invoice.paymentMethod] || invoice.paymentMethod}
          </div>
          <div className="inline-flex items-center gap-1 text-xs text-emerald-700 font-bold mt-0.5">
            <CheckCircle2 className="w-3.5 h-3.5" />{' '}
            {invoice.status === 'PAID' ? 'مسددة بالكامل • الضمان مفعل' : invoice.status}
          </div>
        </div>
        <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
          <div className="text-[11px] text-slate-400 font-bold mb-1">الرقم المرجعي لتتبع الضمان</div>
          <div className="font-mono font-bold text-xs text-emerald-700">{barcodeCode}</div>
          <div className="text-[11px] text-slate-500 mt-0.5">معتمد للفحص عبر السيريال (S/N)</div>
        </div>
      </div>

      {/* A4 Line Items Table */}
      <div className="overflow-x-auto border border-slate-200 rounded-xl mb-4">
        <table className="w-full text-right text-xs">
          <thead
            className={`font-bold border-b border-slate-200 ${
              isModernBlue
                ? 'bg-indigo-50 text-indigo-950'
                : isElectronicsA4
                ? 'bg-emerald-50 text-emerald-950'
                : isMedicalA4
                ? 'bg-emerald-50 text-emerald-950'
                : isContracting
                ? 'bg-amber-50 text-amber-950'
                : isMinimalistClean
                ? 'bg-slate-50 text-slate-800'
                : 'bg-slate-100 text-slate-700'
            }`}
          >
            <tr>
              <th className="py-3 px-3">#</th>
              <th className="py-3 px-3">رمز الصنف / البيان والمواصفات</th>
              {(isElectronicsA4 ||
                invoice.items.some((i) => i.serialNumber || i.warrantyMonths)) && (
                <th className="py-3 px-3">الرقم التسلسلي (IMEI / SN) وفترة الضمان</th>
              )}
              {(isMedicalA4 || invoice.items.some((i) => i.batchNumber || i.expiryDate)) && (
                <th className="py-3 px-3">رقم التشغيلة والصلاحية</th>
              )}
              <th className="py-3 px-3 text-center">الكمية</th>
              <th className="py-3 px-3">سعر الوحدة</th>
              <th className="py-3 px-3">الإجمالي الصافي</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {invoice.items.map((item, idx) => {
              const expiryDate = calculateWarrantyExpiry(invoice.date, item.warrantyMonths || 24);
              return (
                <tr key={idx} className="hover:bg-slate-50/80">
                  <td className="py-3 px-3 font-mono font-bold text-slate-500">{idx + 1}</td>
                  <td className="py-3 px-3">
                    <div className="font-bold text-slate-900">{item.productName}</div>
                    <div className="text-[10px] font-mono text-slate-400">SKU: {item.sku}</div>
                  </td>
                  {(isElectronicsA4 ||
                    invoice.items.some((i) => i.serialNumber || i.warrantyMonths)) && (
                    <td className="py-3 px-3">
                      <div
                        className="inline-block font-mono text-[11px] font-bold text-emerald-900 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded"
                        dir="ltr"
                      >
                        {item.serialNumber || `SN-${item.sku}-8810`}
                      </div>
                      <div className="text-[10px] text-slate-600 mt-1 flex items-center gap-2">
                        <span className="font-bold text-emerald-700">
                          الضمان: {item.warrantyMonths || 24} شهر
                        </span>
                        <span>•</span>
                        <span>
                          ينتهي: <strong className="font-mono" dir="ltr">{expiryDate}</strong>
                        </span>
                      </div>
                    </td>
                  )}
                  {(isMedicalA4 || invoice.items.some((i) => i.batchNumber || i.expiryDate)) && (
                    <td className="py-3 px-3">
                      <div className="font-mono text-[11px] font-bold text-emerald-800">
                        LOT: {item.batchNumber || 'BATCH-2025-09'}
                      </div>
                      <div className="text-[10px] text-rose-600 font-bold">
                        EXP: {item.expiryDate || '2027-08-30'}
                      </div>
                    </td>
                  )}
                  <td className="py-3 px-3 text-center font-bold">
                    {formatCleanNumber(item.quantity)}
                  </td>
                  <td className="py-3 px-3 font-mono">
                    {formatCleanNumber(item.unitPrice)} {currency}
                  </td>
                  <td className="py-3 px-3 font-mono font-black text-slate-900">
                    {formatCleanNumber(item.total)} {currency}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Tafqeet Bar */}
      <div className="mb-6 px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs">
        <span className="font-bold text-slate-700">المبلغ كتابةً: {tafqeetText}</span>
        <span className="font-mono font-black text-slate-900">
          {formatCleanNumber(invoice.grandTotal)} {currency}
        </span>
      </div>

      {/* Bottom Summary, Authentic QR, Warranty Box & Official Stamp */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
        <div className="md:col-span-7 space-y-3">
          {(isElectronicsA4 || settings.showWarrantyTerms) && (
            <div className="p-4 rounded-xl bg-emerald-50/70 border-2 border-emerald-200 text-xs text-emerald-950 space-y-2">
              <div className="font-black flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-sm text-emerald-900">
                  <Award className="w-4 h-4 text-emerald-600" />
                  شهادة الضمان المعتمدة للأجهزة والطاقة الشمسية والبطاريات
                </span>
                <span className="px-2 py-0.5 rounded bg-emerald-700 text-white text-[10px] font-bold">
                  ضمان الوكيل المعتمد
                </span>
              </div>
              <p className="text-[11px] text-emerald-900 leading-relaxed">
                تضمن المنشأة الأجهزة والألواح الشمسية والإنفرترات والبطاريات الموضحة أعلاه لمدة الضمان المحددة أمام كل صنف اعتباراً من تاريخ الإصدار ({invoice.date})، ويشترط إبراز هذه الشهادة أو مطابقة الرقم التسلسلي (IMEI / Serial Number) عند مراجعة مركز الصيانة.
              </p>
              <div className="grid grid-cols-3 gap-2 pt-1 text-[10px] font-bold text-emerald-800">
                <div className="bg-white/80 p-1.5 rounded border border-emerald-200 text-center">
                  ✓ يشمل الأعطال المصنعية
                </div>
                <div className="bg-white/80 p-1.5 rounded border border-emerald-200 text-center">
                  ✓ فحص واستبدال عبر السيريال
                </div>
                <div className="bg-white/80 p-1.5 rounded border border-emerald-200 text-center">
                  ✕ لا يشمل الكسر وسوء الاستخدام
                </div>
              </div>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200">
            {settings.showQR && <InlineZatcaQR value={qrPayload} size={96} />}
            <div className="flex-1 min-w-[180px] space-y-2">
              <div className="text-xs font-black text-slate-800">
                رمز التحقق الضريبي والضمان الرقمي (ISO/IEC 18004 QR & Code-128)
              </div>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                تحتوي هذه الوثيقة على ختم التشفير الرقمي وبيانات الضريبة والأرقام التسلسلية المعتمدة للتحقق الفوري من سريان الضمان.
              </p>
              {settings.showBarcode && (
                <div className="pt-1 max-w-[220px]">
                  <InlineBarcode value={barcodeCode} height={28} />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Totals & Official Stamp */}
        <div className="md:col-span-5 space-y-3">
          <div className="p-4 rounded-xl bg-slate-900 text-white space-y-2 text-xs">
            <div className="flex justify-between text-slate-300">
              <span>إجمالي قيمة الأصناف:</span>
              <span className="font-mono font-bold">
                {formatCleanNumber(invoice.subtotal)} {currency}
              </span>
            </div>
            {invoice.discountAmount > 0 && (
              <div className="flex justify-between text-rose-300">
                <span>
                  إجمالي الخصم الممنوح{' '}
                  {invoice.discountType
                    ? invoice.discountType === 'PERCENT'
                      ? `(نسبة ${formatCleanNumber(invoice.discountValue || 0)}%)`
                      : `(مبلغ مقطوع)`
                    : invoice.couponCode
                    ? `(${invoice.couponCode})`
                    : ''}
                  :
                </span>
                <span className="font-mono font-bold">
                  -{formatCleanNumber(invoice.discountAmount)} {currency}
                </span>
              </div>
            )}
            <div className="border-t border-slate-700 pt-2.5 flex justify-between text-base font-black text-emerald-400">
              <span>الإجمالي النهائي المستحق:</span>
              <span className="font-mono">
                {formatCleanNumber(invoice.grandTotal)} {currency}
              </span>
            </div>
          </div>

          {settings.showStampAndSignature && (
            <div className="grid grid-cols-2 gap-3 text-center">
              <div className="p-3 rounded-xl border border-dashed border-slate-300 bg-slate-50/50">
                <div className="text-[10px] font-bold text-slate-400 mb-3">
                  ختم الضمان والمبيعات المعتمد
                </div>
                <div className="inline-block px-3 py-1 rounded-full border-2 border-emerald-600/70 text-emerald-700 font-black text-[10px] -rotate-6">
                  WARRANTY APPROVED • معتمد
                </div>
              </div>
              <div className="p-3 rounded-xl border border-dashed border-slate-300 bg-slate-50/50">
                <div className="text-[10px] font-bold text-slate-400 mb-3">
                  توقيع المستلم / العميل
                </div>
                <div className="text-[11px] font-mono text-slate-500">___________________</div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Footer Note */}
      {(settings.headerTitleAr || settings.footerNoteAr) && (
        <div className="mt-6 pt-3 border-t border-slate-200 flex flex-wrap justify-between items-center text-[11px] text-slate-500">
          <span>{settings.headerTitleAr}</span>
          <span className="font-bold text-slate-700">{settings.footerNoteAr}</span>
        </div>
      )}
    </div>
  );
};
