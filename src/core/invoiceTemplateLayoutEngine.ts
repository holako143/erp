/**
 * Headless Pure Layout Engine for Customizable Commercial Invoices (A4 & Thermal 80mm / 58mm)
 * Supports Drag-and-Drop Grid Zone Ordering, 12-Column Responsive Spans, Spacing Density,
 * Table Header Styles, and Pre-designed International & Yemeni Commercial Templates.
 */

import { StandardInvoiceTemplateType, ThermalTemplateType } from '../types/erp';

export type InvoiceLayoutZoneId =
  | 'HEADER_BRAND'
  | 'PARTIES_METADATA'
  | 'LINE_ITEMS_TABLE'
  | 'FINANCIAL_SUMMARY'
  | 'TAFQEET_BANKING'
  | 'VERIFICATION_QR_BARCODE'
  | 'WARRANTY_NOTES'
  | 'SIGNATURES_STAMP';

export interface CustomInvoiceGridZone {
  id: InvoiceLayoutZoneId;
  labelAr: string;
  labelEn: string;
  descriptionAr: string;
  visible: boolean;
  colSpan: 4 | 5 | 6 | 7 | 8 | 12;
  order: number;
  alignment: 'right' | 'center' | 'left';
  compactPadding?: boolean;
}

export type InvoiceLayoutFormat = 'a4' | 'thermal_80mm' | 'thermal_58mm';
export type InvoiceTableHeaderStyle = 'soft_tint' | 'minimal_line' | 'classic_bordered';
export type InvoiceSpacingDensity = 'compact' | 'standard' | 'airy';

export interface CustomInvoiceLayoutTemplate {
  id: string;
  nameAr: string;
  nameEn: string;
  descriptionAr: string;
  categoryAr: string;
  format: InvoiceLayoutFormat;
  baseTemplateId: StandardInvoiceTemplateType | ThermalTemplateType;
  isBuiltin?: boolean;
  accentHex: string;
  secondaryHex: string;
  headerSurfaceHex: string;
  tableHeaderStyle: InvoiceTableHeaderStyle;
  spacingDensity: InvoiceSpacingDensity;
  fontScale: 'compact' | 'normal' | 'large';
  showRowStripes: boolean;
  showGridBorders: boolean;
  zones: CustomInvoiceGridZone[];
  updatedAt: string;
}

export const DEFAULT_INVOICE_ZONES: CustomInvoiceGridZone[] = [
  {
    id: 'HEADER_BRAND',
    labelAr: 'ترويسة المنشأة والوثيقة',
    labelEn: 'Seller Identity & Document Header',
    descriptionAr: 'اسم الشركة، الشعار، العنوان، الرقم الضريبي، ورقم وتاريخ الفاتورة',
    visible: true,
    colSpan: 12,
    order: 0,
    alignment: 'right',
  },
  {
    id: 'PARTIES_METADATA',
    labelAr: 'بيانات العميل وشروط السداد',
    labelEn: 'Buyer Details & Payment Terms',
    descriptionAr: 'اسم العميل، رقم الهاتف، طريقة السداد، حالة الدفع، والفرع المصدر',
    visible: true,
    colSpan: 12,
    order: 1,
    alignment: 'right',
  },
  {
    id: 'LINE_ITEMS_TABLE',
    labelAr: 'جدول الأصناف والكميات والأسعار',
    labelEn: 'Line Items Ledger Table',
    descriptionAr: 'الأصناف، الأكواد، الأرقام التسلسلية، الكميات، الأسعار، والإجماليات',
    visible: true,
    colSpan: 12,
    order: 2,
    alignment: 'right',
  },
  {
    id: 'TAFQEET_BANKING',
    labelAr: 'التفقيط والحسابات المصرفية (IBAN)',
    labelEn: 'Amount in Words & Bank Details',
    descriptionAr: 'كتابة المبلغ بالحروف (فقط ... لا غير) وبيانات التحويل البنكي',
    visible: true,
    colSpan: 7,
    order: 3,
    alignment: 'right',
  },
  {
    id: 'FINANCIAL_SUMMARY',
    labelAr: 'ملخص الإجماليات والصافي المستحق',
    labelEn: 'Financial Totals Stack',
    descriptionAr: 'المجموع الفرعي، الخصم، الضريبة، الصافي النهائي، المدفوع والمتبقي',
    visible: true,
    colSpan: 5,
    order: 4,
    alignment: 'left',
  },
  {
    id: 'VERIFICATION_QR_BARCODE',
    labelAr: 'رمز التحقق الضريبي QR والباركود',
    labelEn: 'Verification QR & Linear Barcode',
    descriptionAr: 'رمز الاستجابة السريع ZATCA وباركود Code-128 للتحقق من الوثيقة',
    visible: true,
    colSpan: 12,
    order: 5,
    alignment: 'center',
  },
  {
    id: 'WARRANTY_NOTES',
    labelAr: 'شروط الضمان والملاحظات التجارية',
    labelEn: 'Warranty Terms & Notes',
    descriptionAr: 'سياسة الضمان والاستبدال وملاحظات التسليم المعتمدة',
    visible: true,
    colSpan: 12,
    order: 6,
    alignment: 'right',
  },
  {
    id: 'SIGNATURES_STAMP',
    labelAr: 'الختم الرسمي وتوقيع العميل',
    labelEn: 'Official Stamp & Signatures',
    descriptionAr: 'توقيع العميل المستلم (بما فيها التوقيع الرقمي)، الختم، واعتماد المبيعات',
    visible: true,
    colSpan: 12,
    order: 7,
    alignment: 'center',
  },
];

function cloneDefaultZones(
  overrides: Partial<Record<InvoiceLayoutZoneId, Partial<CustomInvoiceGridZone>>> = {}
): CustomInvoiceGridZone[] {
  return DEFAULT_INVOICE_ZONES.map((z) => ({
    ...z,
    ...(overrides[z.id] || {}),
  })).sort((a, b) => a.order - b.order);
}

export const BUILTIN_CUSTOM_INVOICE_LAYOUT_LIBRARY: CustomInvoiceLayoutTemplate[] = [
  {
    id: 'preset-a4-yemen-onyx-commercial',
    nameAr: 'التجاري اليمني المعتمد (أونكس برو A4)',
    nameEn: 'Yemen Commercial Ledger Pro (A4)',
    descriptionAr:
      'تصميم تجاري رصين متوافق مع الفواتير اليمنية المعتمدة (أونكس برو): ترويسة ثلاثية متوازنة، جدول بحدود واضحة، تفقيط عربي، QR + باركود متناسقين.',
    categoryAr: 'يمني تجاري رسمي',
    format: 'a4',
    baseTemplateId: 'a4_onyx_yemen',
    isBuiltin: true,
    accentHex: '#1e3a8a',
    secondaryHex: '#b45309',
    headerSurfaceHex: '#f8fafc',
    tableHeaderStyle: 'classic_bordered',
    spacingDensity: 'compact',
    fontScale: 'normal',
    showRowStripes: true,
    showGridBorders: true,
    zones: cloneDefaultZones({
      TAFQEET_BANKING: { colSpan: 7, order: 3 },
      FINANCIAL_SUMMARY: { colSpan: 5, order: 4 },
      VERIFICATION_QR_BARCODE: { colSpan: 12, order: 5 },
    }),
    updatedAt: '2026-11-18T00:00:00.000Z',
  },
  {
    id: 'preset-a4-international-b2b-7zone',
    nameAr: 'المعيار الدولي الموحد (B2B 7-Zone ISO)',
    nameEn: 'International B2B 7-Zone Standard',
    descriptionAr:
      'هيكل فواتير B2B الدولي النظيف: هوامش متوازنة، محاذاة رقمية Tabular-Nums، ترويسة بيضاء هادئة بشريط علوي أنيق، وبطاقة QR وباركود بجانب الإجماليات.',
    categoryAr: 'دولي قياسي B2B',
    format: 'a4',
    baseTemplateId: 'a4_global_sap_odoo',
    isBuiltin: true,
    accentHex: '#0f172a',
    secondaryHex: '#2563eb',
    headerSurfaceHex: '#ffffff',
    tableHeaderStyle: 'soft_tint',
    spacingDensity: 'standard',
    fontScale: 'normal',
    showRowStripes: true,
    showGridBorders: false,
    zones: cloneDefaultZones({
      VERIFICATION_QR_BARCODE: { colSpan: 5, order: 3 },
      FINANCIAL_SUMMARY: { colSpan: 7, order: 4 },
      TAFQEET_BANKING: { colSpan: 12, order: 5 },
    }),
    updatedAt: '2026-11-18T00:00:00.000Z',
  },
  {
    id: 'preset-a4-swiss-minimal-ledger',
    nameAr: 'السويسري النقي للمحاسبة (Minimal Ledger)',
    nameEn: 'Swiss Minimal Accounting Ledger',
    descriptionAr:
      'أسلوب طباعي نقي بدون حشو أو إطارات ثقيلة: خط سفلي أنيق لرأس الجدول، استغلال مثالي للمساحة في صفحة A4 واحدة.',
    categoryAr: 'محاسبي مقتصد بالحبر',
    format: 'a4',
    baseTemplateId: 'a4_minimalist_clean',
    isBuiltin: true,
    accentHex: '#0f172a',
    secondaryHex: '#475569',
    headerSurfaceHex: '#ffffff',
    tableHeaderStyle: 'minimal_line',
    spacingDensity: 'compact',
    fontScale: 'normal',
    showRowStripes: false,
    showGridBorders: false,
    zones: cloneDefaultZones({
      TAFQEET_BANKING: { colSpan: 7, order: 3 },
      FINANCIAL_SUMMARY: { colSpan: 5, order: 4 },
      WARRANTY_NOTES: { visible: false, colSpan: 12, order: 6 },
    }),
    updatedAt: '2026-11-18T00:00:00.000Z',
  },
  {
    id: 'preset-a4-solar-warranty-certificate',
    nameAr: 'وثيقة الإلكترونيات والطاقة والضمان (A4)',
    nameEn: 'Solar & Electronics Warranty Invoice',
    descriptionAr:
      'مصمم لقطاعات الإلكترونيات والطاقة الشمسية: إبراز الرقم التسلسلي S/N ومدة الضمان لكل صنف، التوقيع الإلكتروني للعميل، وشروط الضمان.',
    categoryAr: 'ضمان وإلكترونيات',
    format: 'a4',
    baseTemplateId: 'a4_warranty_electronics',
    isBuiltin: true,
    accentHex: '#047857',
    secondaryHex: '#0f172a',
    headerSurfaceHex: '#f0fdf4',
    tableHeaderStyle: 'soft_tint',
    spacingDensity: 'standard',
    fontScale: 'normal',
    showRowStripes: true,
    showGridBorders: true,
    zones: cloneDefaultZones({
      TAFQEET_BANKING: { colSpan: 6, order: 3 },
      FINANCIAL_SUMMARY: { colSpan: 6, order: 4 },
      VERIFICATION_QR_BARCODE: { colSpan: 12, order: 5 },
      WARRANTY_NOTES: { visible: true, colSpan: 12, order: 6 },
    }),
    updatedAt: '2026-11-18T00:00:00.000Z',
  },
  {
    id: 'preset-thermal-80mm-commercial-pos',
    nameAr: 'إيصال الكاشير التجاري (80mm Onyx POS)',
    nameEn: '80mm Commercial POS Receipt',
    descriptionAr:
      'إيصال حراري بعرض 80مم منسق بوضوح: ترويسة مختصرة، جدول أصناف منضبط، مربع المدفوع والباقي، وباركود + QR في الأسفل.',
    categoryAr: 'حراري 80mm',
    format: 'thermal_80mm',
    baseTemplateId: 'thermal_80mm_onyx_pos',
    isBuiltin: true,
    accentHex: '#0f172a',
    secondaryHex: '#059669',
    headerSurfaceHex: '#f8fafc',
    tableHeaderStyle: 'classic_bordered',
    spacingDensity: 'compact',
    fontScale: 'normal',
    showRowStripes: false,
    showGridBorders: true,
    zones: cloneDefaultZones({
      TAFQEET_BANKING: { colSpan: 12, order: 4 },
      FINANCIAL_SUMMARY: { colSpan: 12, order: 3 },
      SIGNATURES_STAMP: { visible: false, colSpan: 12, order: 7 },
    }),
    updatedAt: '2026-11-18T00:00:00.000Z',
  },
  {
    id: 'preset-thermal-80mm-warranty-serial',
    nameAr: 'إيصال الضمان والسيريال (80mm Warranty)',
    nameEn: '80mm Warranty & Serial Receipt',
    descriptionAr:
      'إيصال حراري 80مم مخصص لمبيعات الأجهزة والبطاريات والعاكسات مع عرض الرقم التسلسلي ومدة الضمان لكل بند.',
    categoryAr: 'حراري 80mm ضمان',
    format: 'thermal_80mm',
    baseTemplateId: 'thermal_80mm_warranty',
    isBuiltin: true,
    accentHex: '#065f46',
    secondaryHex: '#0284c7',
    headerSurfaceHex: '#f0fdf4',
    tableHeaderStyle: 'soft_tint',
    spacingDensity: 'compact',
    fontScale: 'normal',
    showRowStripes: true,
    showGridBorders: false,
    zones: cloneDefaultZones({
      TAFQEET_BANKING: { colSpan: 12, order: 4 },
      FINANCIAL_SUMMARY: { colSpan: 12, order: 3 },
      WARRANTY_NOTES: { visible: true, colSpan: 12, order: 5 },
      VERIFICATION_QR_BARCODE: { colSpan: 12, order: 6 },
      SIGNATURES_STAMP: { visible: false, colSpan: 12, order: 7 },
    }),
    updatedAt: '2026-11-18T00:00:00.000Z',
  },
  {
    id: 'preset-thermal-58mm-mobile-compact',
    nameAr: 'الإيصال المدمج المحمول (58mm Compact)',
    nameEn: '58mm Mobile Compact Receipt',
    descriptionAr:
      'مصمم لطابعات البلوتوث الحرارية 58مم بأضيق هوامش ووضوح تام للأرقام ورمز التحقق QR.',
    categoryAr: 'حراري 58mm محمول',
    format: 'thermal_58mm',
    baseTemplateId: 'thermal_58mm_compact',
    isBuiltin: true,
    accentHex: '#1e293b',
    secondaryHex: '#0f172a',
    headerSurfaceHex: '#ffffff',
    tableHeaderStyle: 'minimal_line',
    spacingDensity: 'compact',
    fontScale: 'compact',
    showRowStripes: false,
    showGridBorders: false,
    zones: cloneDefaultZones({
      TAFQEET_BANKING: { visible: false, colSpan: 12, order: 4 },
      WARRANTY_NOTES: { visible: false, colSpan: 12, order: 6 },
      SIGNATURES_STAMP: { visible: false, colSpan: 12, order: 7 },
    }),
    updatedAt: '2026-11-18T00:00:00.000Z',
  },
];

export function resolveEffectiveZones(zones?: CustomInvoiceGridZone[]): CustomInvoiceGridZone[] {
  if (!Array.isArray(zones) || zones.length === 0) {
    return cloneDefaultZones();
  }
  const byId = new Map<InvoiceLayoutZoneId, CustomInvoiceGridZone>();
  for (const z of zones) {
    byId.set(z.id, z);
  }
  const merged = DEFAULT_INVOICE_ZONES.map((def, idx) => {
    const existing = byId.get(def.id);
    return existing
      ? { ...def, ...existing }
      : { ...def, order: zones.length + idx };
  });
  return merged
    .sort((a, b) => a.order - b.order)
    .map((z, idx) => ({ ...z, order: idx }));
}

export function reorderCustomInvoiceZones(
  zones: CustomInvoiceGridZone[],
  fromIndex: number,
  toIndex: number
): CustomInvoiceGridZone[] {
  const ordered = resolveEffectiveZones(zones);
  if (
    fromIndex < 0 ||
    toIndex < 0 ||
    fromIndex >= ordered.length ||
    toIndex >= ordered.length ||
    fromIndex === toIndex
  ) {
    return ordered;
  }
  const copy = [...ordered];
  const [moved] = copy.splice(fromIndex, 1);
  copy.splice(toIndex, 0, moved);
  return copy.map((z, idx) => ({ ...z, order: idx }));
}

export function moveInvoiceZoneByDirection(
  zones: CustomInvoiceGridZone[],
  zoneId: InvoiceLayoutZoneId,
  direction: 'UP' | 'DOWN'
): CustomInvoiceGridZone[] {
  const ordered = resolveEffectiveZones(zones);
  const idx = ordered.findIndex((z) => z.id === zoneId);
  if (idx === -1) return ordered;
  const targetIdx = direction === 'UP' ? idx - 1 : idx + 1;
  if (targetIdx < 0 || targetIdx >= ordered.length) return ordered;
  return reorderCustomInvoiceZones(ordered, idx, targetIdx);
}

export function toggleInvoiceZoneVisibility(
  zones: CustomInvoiceGridZone[],
  zoneId: InvoiceLayoutZoneId
): CustomInvoiceGridZone[] {
  return resolveEffectiveZones(zones).map((z) =>
    z.id === zoneId ? { ...z, visible: !z.visible } : z
  );
}

export function updateInvoiceZoneSpan(
  zones: CustomInvoiceGridZone[],
  zoneId: InvoiceLayoutZoneId,
  colSpan: CustomInvoiceGridZone['colSpan']
): CustomInvoiceGridZone[] {
  return resolveEffectiveZones(zones).map((z) =>
    z.id === zoneId ? { ...z, colSpan } : z
  );
}

export function updateInvoiceZoneAlignment(
  zones: CustomInvoiceGridZone[],
  zoneId: InvoiceLayoutZoneId,
  alignment: CustomInvoiceGridZone['alignment']
): CustomInvoiceGridZone[] {
  return resolveEffectiveZones(zones).map((z) =>
    z.id === zoneId ? { ...z, alignment } : z
  );
}

export function duplicateCustomInvoiceTemplate(
  template: CustomInvoiceLayoutTemplate,
  customNameAr?: string
): CustomInvoiceLayoutTemplate {
  const suffix = Math.floor(1000 + Math.random() * 9000);
  return {
    ...template,
    id: `custom-tpl-${Date.now()}-${suffix}`,
    nameAr: (customNameAr || `${template.nameAr} (نسخة مخصصة)`).trim(),
    nameEn: `${template.nameEn} (Custom)`,
    isBuiltin: false,
    zones: template.zones.map((z) => ({ ...z })),
    updatedAt: new Date().toISOString(),
  };
}

export function createBlankCustomInvoiceTemplate(
  format: InvoiceLayoutFormat = 'a4'
): CustomInvoiceLayoutTemplate {
  const is58 = format === 'thermal_58mm';
  const isThermal = format !== 'a4';
  const suffix = Math.floor(100 + Math.random() * 900);
  return {
    id: `custom-tpl-${Date.now()}-${suffix}`,
    nameAr: isThermal
      ? `قالب حراري مخصص (${is58 ? '58mm' : '80mm'}) #${suffix}`
      : `قالب A4 مخصص #${suffix}`,
    nameEn: isThermal ? `Custom Thermal ${is58 ? '58mm' : '80mm'}` : `Custom A4 Layout #${suffix}`,
    descriptionAr: 'قالب تجاري مخصص تم إنشاؤه من محرر التخطيط الشبكي.',
    categoryAr: 'قوالب المستخدم المخصصة',
    format,
    baseTemplateId: is58
      ? 'thermal_58mm_compact'
      : isThermal
      ? 'thermal_80mm_onyx_pos'
      : 'a4_onyx_yemen',
    isBuiltin: false,
    accentHex: '#1e3a8a',
    secondaryHex: '#059669',
    headerSurfaceHex: '#f8fafc',
    tableHeaderStyle: 'soft_tint',
    spacingDensity: isThermal ? 'compact' : 'standard',
    fontScale: is58 ? 'compact' : 'normal',
    showRowStripes: true,
    showGridBorders: true,
    zones: cloneDefaultZones(
      isThermal
        ? {
            TAFQEET_BANKING: { colSpan: 12, order: 4, visible: !is58 },
            FINANCIAL_SUMMARY: { colSpan: 12, order: 3 },
            SIGNATURES_STAMP: { visible: false, colSpan: 12, order: 7 },
          }
        : undefined
    ),
    updatedAt: new Date().toISOString(),
  };
}

export function upsertCustomInvoiceLayout(
  existingList: CustomInvoiceLayoutTemplate[],
  template: CustomInvoiceLayoutTemplate
): CustomInvoiceLayoutTemplate[] {
  const cleanTpl: CustomInvoiceLayoutTemplate = {
    ...template,
    isBuiltin: false,
    zones: resolveEffectiveZones(template.zones),
    updatedAt: new Date().toISOString(),
  };
  const idx = existingList.findIndex((t) => t.id === cleanTpl.id);
  if (idx >= 0) {
    const next = [...existingList];
    next[idx] = cleanTpl;
    return next;
  }
  return [cleanTpl, ...existingList];
}

export function deleteCustomInvoiceLayout(
  existingList: CustomInvoiceLayoutTemplate[],
  templateId: string
): CustomInvoiceLayoutTemplate[] {
  return existingList.filter((t) => t.id !== templateId || t.isBuiltin);
}
