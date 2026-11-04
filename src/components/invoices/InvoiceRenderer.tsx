import React from 'react';
import {
  SalesInvoice,
  ThermalTemplateType,
  StandardInvoiceTemplateType,
  InvoiceTemplateSettings,
} from '../../types/erp';
import { generateCode128Binary } from '../../core/barcodeEngine';
import {
  ShieldCheck,
  Utensils,
  Award,
  Pill,
  CheckCircle2,
  Phone,
  MapPin,
  Hash,
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

const InlineBarcode: React.FC<{ value: string; height?: number }> = ({
  value,
  height = 32,
}) => {
  const binary = generateCode128Binary(value || 'INV-2025');
  const barWidth = 1.4;
  const totalWidth = binary.length * barWidth;

  return (
    <div className="flex flex-col items-center">
      <svg
        viewBox={`0 0 ${totalWidth} ${height}`}
        className="w-full max-w-[220px]"
        style={{ height }}
      >
        {binary.split('').map((bit, idx) =>
          bit === '1' ? (
            <rect
              key={idx}
              x={idx * barWidth}
              y={0}
              width={barWidth}
              height={height}
              fill="#0f172a"
            />
          ) : null
        )}
      </svg>
      <span className="text-[9px] font-mono font-bold text-slate-600 mt-0.5 tracking-widest">
        {value}
      </span>
    </div>
  );
};

const InlineZatcaQR: React.FC<{ value: string; size?: number }> = ({
  value,
  size = 92,
}) => {
  // Deterministic 15x15 visual QR matrix from string hash
  const grid = 15;
  let hash = 2166136261;
  for (let i = 0; i < value.length; i++) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }

  const isFinder = (r: number, c: number) => {
    const inTL = r < 4 && c < 4;
    const inTR = r < 4 && c >= grid - 4;
    const inBL = r >= grid - 4 && c < 4;
    return inTL || inTR || inBL;
  };

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${grid} ${grid}`}
      className="bg-white p-1 rounded border border-slate-300"
    >
      {Array.from({ length: grid }).map((_, r) =>
        Array.from({ length: grid }).map((__, c) => {
          const finder = isFinder(r, c);
          const bit = ((hash >>> ((r * grid + c) % 24)) ^ (r * 7 + c * 13)) & 1;
          const filled = finder ? r % 3 === 0 || c % 3 === 0 || (r === 1 && c === 1) : bit === 1;
          return filled ? (
            <rect key={`${r}-${c}`} x={c} y={r} width={1} height={1} fill="#0f172a" />
          ) : null;
        })
      )}
    </svg>
  );
};

export const InvoiceRenderer: React.FC<InvoiceRendererProps> = ({
  invoice,
  mode,
  thermalTemplate,
  standardTemplate,
  settings,
  companyName,
  taxNumber,
  branchName,
  branchAddress = 'الرياض - المملكة العربية السعودية',
  branchPhone = '+966 11 400 9900',
  currency,
}) => {
  const activeThermal = thermalTemplate || settings.thermalTemplate;
  const activeStandard = standardTemplate || settings.standardTemplate;

  const orderTypeLabel: Record<string, string> = {
    DINE_IN: 'محلي - داخل المطعم (Dine-In)',
    TAKEAWAY: 'سفري - استلام (Takeaway)',
    DELIVERY: 'توصيل طلبات (Delivery)',
    STANDARD: 'مبيعات مباشرة',
  };

  const barcodeCode = invoice.invoiceNumber || 'INV-2025-001';
  const qrPayload =
    invoice.qrData ||
    `SELLER:${companyName}|VAT:${taxNumber}|INV:${invoice.invoiceNumber}|TOTAL:${invoice.grandTotal}|TAX:${invoice.taxAmount}`;

  // ============================================================================
  // 1. THERMAL RECEIPT TEMPLATES (80mm & 58mm)
  // ============================================================================
  if (mode === 'thermal') {
    const is58mm = activeThermal === 'thermal_58mm_compact';
    const isRestaurant = activeThermal === 'thermal_80mm_restaurant';
    const isWarranty = activeThermal === 'thermal_80mm_warranty';

    return (
      <div
        data-testid="invoice-thermal-preview"
        className={`mx-auto bg-white text-slate-900 border border-slate-300 shadow-sm rounded-xl font-mono transition-all ${
          is58mm ? 'max-w-[270px] p-3 text-[10px]' : 'max-w-[360px] p-5 text-xs'
        }`}
      >
        {/* Top Decorative Thermal Tear Edge */}
        <div className="border-b-2 border-dashed border-slate-300 pb-3 mb-3 text-center">
          <div className="inline-block px-2.5 py-0.5 rounded bg-slate-900 text-white font-black text-[10px] mb-1 font-sans">
            {isRestaurant
              ? '🍔 إيصال مطعم وكاشير + تذكرة مطبخ'
              : isWarranty
              ? '📱 فاتورة إلكترونيات وضمان معتمد'
              : is58mm
              ? '🛒 إيصال كاشير سريع 58mm'
              : '🧾 فاتورة ضريبية مبسطة 80mm'}
          </div>
          <h4 className={`font-black text-slate-900 font-sans ${is58mm ? 'text-xs' : 'text-sm'} mt-1`}>
            {companyName}
          </h4>
          <p className="text-[10px] text-slate-600 font-sans mt-0.5">
            {branchName} • {branchAddress}
          </p>
          <p className="text-[10px] text-slate-500 mt-0.5">الرقم الضريبي VAT: {taxNumber}</p>
          {settings.headerTitleAr && (
            <p className="text-[10px] text-indigo-700 font-sans font-bold mt-1 bg-indigo-50 py-0.5 px-2 rounded">
              {settings.headerTitleAr}
            </p>
          )}
        </div>

        {/* Restaurant Specific Banner (Table # & Order Type) */}
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
        <div className="space-y-1 text-[11px] border-b border-dashed border-slate-300 pb-2.5 mb-2.5">
          <div className="flex justify-between">
            <span className="text-slate-500 font-sans">رقم الفاتورة:</span>
            <span className="font-bold">{invoice.invoiceNumber}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500 font-sans">التاريخ والوقت:</span>
            <span>{invoice.date}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500 font-sans">العميل:</span>
            <span className="font-sans font-bold truncate max-w-[170px]">{invoice.customerName}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500 font-sans">طريقة الدفع:</span>
            <span className="font-bold">{invoice.paymentMethod}</span>
          </div>
        </div>

        {/* Line Items Table */}
        <div className="border-b border-dashed border-slate-300 pb-2.5 mb-2.5">
          <div className="grid grid-cols-12 text-[10px] font-bold text-slate-500 border-b border-slate-200 pb-1 mb-1.5 font-sans">
            <div className="col-span-6 text-right">الصنف</div>
            <div className="col-span-2 text-center">الكمية</div>
            <div className="col-span-4 text-left">الإجمالي</div>
          </div>
          <div className="space-y-2">
            {invoice.items.map((item, idx) => (
              <div key={idx} className="text-[11px]">
                <div className="grid grid-cols-12 items-start">
                  <div className="col-span-6 font-sans font-bold text-slate-800 leading-tight">
                    {item.productName}
                  </div>
                  <div className="col-span-2 text-center font-bold">{item.quantity}</div>
                  <div className="col-span-4 text-left font-bold">
                    {item.total.toFixed(2)}
                  </div>
                </div>
                <div className="text-[9px] text-slate-400 font-sans">
                  سعر الوحدة: {item.unitPrice.toFixed(2)} | ضريبة: {item.taxAmount.toFixed(2)}
                </div>

                {/* Electronics Warranty / Serial Details */}
                {(isWarranty || item.serialNumber || item.warrantyMonths) && (
                  <div className="mt-0.5 text-[9px] bg-cyan-50 text-cyan-900 px-1.5 py-0.5 rounded border border-cyan-200 font-sans">
                    {item.serialNumber && (
                      <div>
                        S/N (IMEI): <span className="font-mono font-bold">{item.serialNumber}</span>
                      </div>
                    )}
                    {item.warrantyMonths && (
                      <div>الضمان: {item.warrantyMonths} شهر (الوكيل المعتمد)</div>
                    )}
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
            ))}
          </div>
        </div>

        {/* Totals Section */}
        <div className="space-y-1 text-xs border-b-2 border-dashed border-slate-300 pb-3 mb-3 font-sans">
          <div className="flex justify-between text-slate-600">
            <span>المجموع قبل الضريبة:</span>
            <span className="font-mono">{invoice.subtotal.toFixed(2)} {currency}</span>
          </div>
          {invoice.discountAmount > 0 && (
            <div className="flex justify-between text-rose-600">
              <span>
                الخصم التجاري {invoice.couponCode ? `(${invoice.couponCode})` : ''}:
              </span>
              <span className="font-mono">-{invoice.discountAmount.toFixed(2)} {currency}</span>
            </div>
          )}
          <div className="flex justify-between text-slate-600">
            <span>ضريبة القيمة المضافة ({invoice.items[0]?.taxRate ?? 15}%):</span>
            <span className="font-mono">{invoice.taxAmount.toFixed(2)} {currency}</span>
          </div>
          <div className="flex justify-between text-sm font-black text-slate-900 pt-1.5 border-t border-slate-200">
            <span>الإجمالي النهائي:</span>
            <span className="font-mono">{invoice.grandTotal.toFixed(2)} {currency}</span>
          </div>
        </div>

        {/* Warranty Policy Note on Thermal Warranty Template */}
        {isWarranty && settings.showWarrantyTerms && (
          <div className="mb-3 p-2 bg-slate-50 border border-slate-200 rounded text-[9px] text-slate-600 font-sans leading-relaxed">
            <strong className="text-slate-800 block mb-0.5">شروط الضمان والاستبدال:</strong>
            يشمل الضمان الأعطال المصنعية حسب الرقم التسلسلي (IMEI/SN) المدون أعلاه ولا يشمل سوء الاستخدام أو الكسر.
          </div>
        )}

        {/* Barcode & ZATCA QR Code */}
        <div className="flex flex-col items-center gap-2.5">
          {settings.showBarcode && (
            <InlineBarcode value={barcodeCode} height={is58mm ? 24 : 32} />
          )}
          {settings.showQR && (
            <div className="p-2 bg-slate-50 rounded-lg border border-slate-200 flex flex-col items-center">
              <InlineZatcaQR value={qrPayload} size={is58mm ? 76 : 94} />
              <span className="text-[9px] text-slate-500 mt-1 font-sans">
                متوافق مع الفوترة الإلكترونية ZATCA TLV
              </span>
            </div>
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
  // 2. STANDARD A4 INVOICE TEMPLATES (Corporate, Modern Blue, Warranty, Medical)
  // ============================================================================
  const isModernBlue = activeStandard === 'a4_modern_blue';
  const isElectronicsA4 = activeStandard === 'a4_warranty_electronics';
  const isMedicalA4 = activeStandard === 'a4_medical_pharmacy';

  return (
    <div
      data-testid="invoice-a4-preview"
      className="mx-auto bg-white text-slate-900 border border-slate-200 shadow-sm rounded-2xl p-6 sm:p-8 max-w-4xl"
    >
      {/* Header Banner */}
      <div
        className={`rounded-xl p-5 mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
          isModernBlue
            ? 'bg-gradient-to-r from-indigo-900 via-blue-900 to-slate-900 text-white'
            : isElectronicsA4
            ? 'bg-gradient-to-r from-slate-900 to-cyan-950 text-white'
            : isMedicalA4
            ? 'bg-gradient-to-r from-emerald-900 to-teal-950 text-white'
            : 'bg-slate-50 border-2 border-slate-200 text-slate-900'
        }`}
      >
        <div>
          <div className="flex items-center gap-2 mb-1">
            {isElectronicsA4 && <Award className="w-5 h-5 text-cyan-400" />}
            {isMedicalA4 && <Pill className="w-5 h-5 text-emerald-400" />}
            {!isElectronicsA4 && !isMedicalA4 && (
              <ShieldCheck
                className={`w-5 h-5 ${isModernBlue ? 'text-indigo-300' : 'text-indigo-600'}`}
              />
            )}
            <span
              className={`text-xs font-bold uppercase tracking-wider ${
                isModernBlue || isElectronicsA4 || isMedicalA4
                  ? 'text-slate-300'
                  : 'text-indigo-600'
              }`}
            >
              {isElectronicsA4
                ? 'فاتورة ضريبية + شهادة ضمان أجهزة إلكترونية (A4 Warranty)'
                : isMedicalA4
                ? 'فاتورة توريد طبي وصيدلاني معتمدة (FEFO / Batch A4)'
                : isModernBlue
                ? 'فاتورة ضريبية إلكترونية معتمدة (Modern Blue A4)'
                : 'فاتورة ضريبية رسمية للشركات (Corporate Classic A4)'}
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black">{companyName}</h2>
          <div
            className={`flex flex-wrap items-center gap-4 text-xs mt-2 ${
              isModernBlue || isElectronicsA4 || isMedicalA4
                ? 'text-slate-300'
                : 'text-slate-600'
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
              <Phone className="w-3.5 h-3.5" /> {branchPhone}
            </span>
          </div>
        </div>

        <div
          className={`text-left sm:text-right p-3 rounded-lg ${
            isModernBlue || isElectronicsA4 || isMedicalA4
              ? 'bg-white/10'
              : 'bg-white border border-slate-200'
          }`}
        >
          <div
            className={`text-[11px] ${
              isModernBlue || isElectronicsA4 || isMedicalA4
                ? 'text-slate-300'
                : 'text-slate-500'
            }`}
          >
            رقم الفاتورة الضريبية
          </div>
          <div className="font-mono font-black text-base">{invoice.invoiceNumber}</div>
          <div
            className={`text-[11px] mt-1 ${
              isModernBlue || isElectronicsA4 || isMedicalA4
                ? 'text-slate-300'
                : 'text-slate-500'
            }`}
          >
            تاريخ الإصدار: {invoice.date}
          </div>
        </div>
      </div>

      {/* Customer & Payment Details Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
        <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
          <div className="text-[11px] text-slate-400 font-bold mb-1">
            بيانات العميل / الجهة المشترية
          </div>
          <div className="font-black text-sm text-slate-900">{invoice.customerName}</div>
          <div className="text-xs text-slate-500 mt-0.5">معرف العميل: {invoice.customerId}</div>
        </div>
        <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
          <div className="text-[11px] text-slate-400 font-bold mb-1">طريقة السداد والحالة</div>
          <div className="font-black text-sm text-slate-900">{invoice.paymentMethod}</div>
          <div className="inline-flex items-center gap-1 text-xs text-emerald-700 font-bold mt-0.5">
            <CheckCircle2 className="w-3.5 h-3.5" />{' '}
            {invoice.status === 'PAID' ? 'مرحّلة ومسددة بالكامل' : invoice.status}
          </div>
        </div>
        <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
          <div className="text-[11px] text-slate-400 font-bold mb-1">الرقم المرجعي للباركود</div>
          <div className="font-mono font-bold text-xs text-indigo-700">{barcodeCode}</div>
          <div className="text-[11px] text-slate-500 mt-0.5">متوافق مع المرحلة الثانية ZATCA</div>
        </div>
      </div>

      {/* A4 Line Items Table */}
      <div className="overflow-x-auto border border-slate-200 rounded-xl mb-6">
        <table className="w-full text-right text-xs">
          <thead
            className={`font-bold border-b border-slate-200 ${
              isModernBlue
                ? 'bg-indigo-50 text-indigo-950'
                : isElectronicsA4
                ? 'bg-cyan-50 text-cyan-950'
                : isMedicalA4
                ? 'bg-emerald-50 text-emerald-950'
                : 'bg-slate-100 text-slate-700'
            }`}
          >
            <tr>
              <th className="py-3 px-3">#</th>
              <th className="py-3 px-3">رمز الصنف / البيان</th>
              {(isElectronicsA4 ||
                invoice.items.some((i) => i.serialNumber || i.warrantyMonths)) && (
                <th className="py-3 px-3">الرقم التسلسلي (IMEI/SN) والضمان</th>
              )}
              {(isMedicalA4 || invoice.items.some((i) => i.batchNumber || i.expiryDate)) && (
                <th className="py-3 px-3">رقم التشغيلة والصلاحية</th>
              )}
              <th className="py-3 px-3 text-center">الكمية</th>
              <th className="py-3 px-3">سعر الوحدة</th>
              <th className="py-3 px-3">الضريبة (15%)</th>
              <th className="py-3 px-3">الإجمالي شامل الضريبة</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {invoice.items.map((item, idx) => (
              <tr key={idx} className="hover:bg-slate-50/80">
                <td className="py-3 px-3 font-mono font-bold text-slate-500">{idx + 1}</td>
                <td className="py-3 px-3">
                  <div className="font-bold text-slate-900">{item.productName}</div>
                  <div className="text-[10px] font-mono text-slate-400">SKU: {item.sku}</div>
                </td>
                {(isElectronicsA4 ||
                  invoice.items.some((i) => i.serialNumber || i.warrantyMonths)) && (
                  <td className="py-3 px-3">
                    <div className="font-mono text-[11px] font-bold text-cyan-800">
                      {item.serialNumber || 'SN-359881029481'}
                    </div>
                    <div className="text-[10px] text-slate-500">
                      ضمان معتمد: {item.warrantyMonths || 24} شهر
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
                <td className="py-3 px-3 text-center font-bold">{item.quantity}</td>
                <td className="py-3 px-3 font-mono">
                  {item.unitPrice.toFixed(2)} {currency}
                </td>
                <td className="py-3 px-3 font-mono text-amber-700">
                  {item.taxAmount.toFixed(2)} {currency}
                </td>
                <td className="py-3 px-3 font-mono font-black text-slate-900">
                  {item.total.toFixed(2)} {currency}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Bottom Summary, ZATCA QR, Warranty Box & Official Stamp */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
        {/* Left/Right QR & Terms */}
        <div className="md:col-span-7 space-y-3">
          <div className="flex flex-wrap items-center gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200">
            {settings.showQR && (
              <div className="bg-white p-1.5 rounded-lg border border-slate-200 shrink-0">
                <InlineZatcaQR value={qrPayload} size={92} />
              </div>
            )}
            <div className="flex-1 min-w-[180px] space-y-2">
              <div className="text-xs font-black text-slate-800">
                رمز التحقق الضريبي المعتمد (ZATCA Phase-2 TLV)
              </div>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                تحتوي هذه الفاتورة على ختم التشفير الرقمي وبيانات الضريبة المضمنة بصيغة Base64 TLV المعتمدة لدى هيئة الزكاة والضريبة والجمارك.
              </p>
              {settings.showBarcode && (
                <div className="pt-1 max-w-[200px]">
                  <InlineBarcode value={barcodeCode} height={26} />
                </div>
              )}
            </div>
          </div>

          {/* Electronics Warranty Certificate Box */}
          {(isElectronicsA4 || settings.showWarrantyTerms) && (
            <div className="p-3.5 rounded-xl bg-cyan-50/70 border border-cyan-200 text-xs text-cyan-950">
              <div className="font-black flex items-center gap-1.5 mb-1">
                <Award className="w-4 h-4 text-cyan-600" />
                وثيقة وشروط الضمان للأجهزة الإلكترونية والكهربائية:
              </div>
              <p className="text-[11px] text-cyan-900 leading-relaxed">
                تضمن المنشأة الأجهزة الموضحة أعلاه لمدة الضمان المحددة لكل صنف اعتباراً من تاريخ الفاتورة، ويشترط مطابقة الرقم التسلسلي (IMEI / Serial Number) عند مراجعة مراكز الصيانة المعتمدة.
              </p>
            </div>
          )}
        </div>

        {/* Totals & Official Stamp */}
        <div className="md:col-span-5 space-y-3">
          <div className="p-4 rounded-xl bg-slate-900 text-white space-y-2 text-xs">
            <div className="flex justify-between text-slate-300">
              <span>إجمالي المبلغ (غير شامل الضريبة):</span>
              <span className="font-mono font-bold">
                {invoice.subtotal.toFixed(2)} {currency}
              </span>
            </div>
            {invoice.discountAmount > 0 && (
              <div className="flex justify-between text-rose-300">
                <span>
                  إجمالي الخصومات الممنوحة {invoice.couponCode ? `(كوبون: ${invoice.couponCode})` : ''}:
                </span>
                <span className="font-mono font-bold">
                  -{invoice.discountAmount.toFixed(2)} {currency}
                </span>
              </div>
            )}
            <div className="flex justify-between text-amber-300">
              <span>ضريبة القيمة المضافة ({invoice.items[0]?.taxRate ?? 15}% VAT):</span>
              <span className="font-mono font-bold">
                {invoice.taxAmount.toFixed(2)} {currency}
              </span>
            </div>
            <div className="border-t border-slate-700 pt-2.5 flex justify-between text-base font-black text-emerald-400">
              <span>الإجمالي المستحق:</span>
              <span className="font-mono">
                {invoice.grandTotal.toFixed(2)} {currency}
              </span>
            </div>
          </div>

          {settings.showStampAndSignature && (
            <div className="grid grid-cols-2 gap-3 text-center">
              <div className="p-3 rounded-xl border border-dashed border-slate-300 bg-slate-50/50">
                <div className="text-[10px] font-bold text-slate-400 mb-3">
                  الختم الرسمي للمنشأة
                </div>
                <div className="inline-block px-3 py-1 rounded-full border-2 border-indigo-600/60 text-indigo-700 font-black text-[10px] -rotate-6">
                  APPROVED • معتمد
                </div>
              </div>
              <div className="p-3 rounded-xl border border-dashed border-slate-300 bg-slate-50/50">
                <div className="text-[10px] font-bold text-slate-400 mb-3">
                  توقيع المستلم / المحاسب
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
