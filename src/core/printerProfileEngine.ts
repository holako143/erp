import {
  PosPrinterProfile,
  PrinterConnectionType,
  PrinterPaperSize,
  PrinterProfileCategory,
  StandardInvoiceTemplateType,
  ThermalTemplateType,
} from '../types/erp';

export const RECEIPT_PAPER_SIZES: readonly PrinterPaperSize[] = ['80mm', '58mm'];
export const A4_PAPER_SIZES: readonly PrinterPaperSize[] = ['A4', 'A5', 'LETTER'];

export interface PrinterProfileInput {
  id?: string;
  name: string;
  category: PrinterProfileCategory;
  paperSize: PrinterPaperSize;
  connectionType: PrinterConnectionType;
  addressOrPort: string;
  templateId?: ThermalTemplateType | StandardInvoiceTemplateType;
  copies?: number;
  autoCut?: boolean;
  openCashDrawer?: boolean;
  autoPrintOnSale?: boolean;
  branchId?: string;
  isDefaultForCategory?: boolean;
  isGlobalDefault?: boolean;
  isActive?: boolean;
  notes?: string;
}

export interface PrinterProfileValidationResult {
  valid: boolean;
  errors: string[];
}

export function createDefaultPrinterProfiles(nowIso = '2026-01-01T08:00:00.000Z'): PosPrinterProfile[] {
  return [
    {
      id: 'prn-receipt-main-80mm',
      name: 'طابعة الكاشير الرئيسية (Thermal 80mm)',
      category: 'RECEIPT',
      paperSize: '80mm',
      connectionType: 'USB',
      addressOrPort: 'USB001 / EPSON TM-T88V',
      templateId: 'thermal_80mm_onyx_pos',
      copies: 1,
      autoCut: true,
      openCashDrawer: true,
      autoPrintOnSale: true,
      branchId: 'ALL',
      isDefaultForCategory: true,
      isGlobalDefault: true,
      isActive: true,
      notes: 'الطابعة الافتراضية لنقطة البيع والدرج النقدي',
      createdAt: nowIso,
      updatedAt: nowIso,
    },
    {
      id: 'prn-a4-office-laser',
      name: 'طابعة الفواتير الضريبية والضمان (A4 Laser)',
      category: 'A4',
      paperSize: 'A4',
      connectionType: 'NETWORK_IP',
      addressOrPort: '192.168.1.120:9100',
      templateId: 'a4_onyx_yemen',
      copies: 1,
      autoCut: false,
      openCashDrawer: false,
      autoPrintOnSale: false,
      branchId: 'ALL',
      isDefaultForCategory: true,
      isGlobalDefault: false,
      isActive: true,
      notes: 'للفواتير الرسمية B2B وعقود الضمان وكشوف الحسابات',
      createdAt: nowIso,
      updatedAt: nowIso,
    },
    {
      id: 'prn-receipt-mobile-58mm',
      name: 'طابعة المندوب المتنقلة (Bluetooth 58mm)',
      category: 'RECEIPT',
      paperSize: '58mm',
      connectionType: 'BLUETOOTH',
      addressOrPort: 'BT-POS-58-01',
      templateId: 'thermal_58mm_compact',
      copies: 1,
      autoCut: false,
      openCashDrawer: false,
      autoPrintOnSale: false,
      branchId: 'ALL',
      isDefaultForCategory: false,
      isGlobalDefault: false,
      isActive: true,
      notes: 'مناسبة للأجهزة اللوحية والجوال عبر البلوتوث',
      createdAt: nowIso,
      updatedAt: nowIso,
    },
  ];
}

export function getDefaultTemplateForCategory(
  category: PrinterProfileCategory,
  paperSize: PrinterPaperSize
): ThermalTemplateType | StandardInvoiceTemplateType {
  if (category === 'A4') return 'a4_onyx_yemen';
  return paperSize === '58mm' ? 'thermal_58mm_compact' : 'thermal_80mm_onyx_pos';
}

export function validatePrinterProfileInput(
  input: PrinterProfileInput
): PrinterProfileValidationResult {
  const errors: string[] = [];

  const cleanName = String(input.name || '').trim();
  if (cleanName.length < 2) {
    errors.push('يرجى إدخال اسم واضح لملف الطابعة (حرفين على الأقل).');
  }

  if (input.category !== 'RECEIPT' && input.category !== 'A4') {
    errors.push('فئة الطابعة يجب أن تكون إيصالات حرارية (RECEIPT) أو قياسية (A4).');
  }

  if (input.category === 'RECEIPT' && !RECEIPT_PAPER_SIZES.includes(input.paperSize)) {
    errors.push('طابعات الإيصالات تدعم مقاس ورق 80mm أو 58mm فقط.');
  }

  if (input.category === 'A4' && !A4_PAPER_SIZES.includes(input.paperSize)) {
    errors.push('طابعات المستندات تدعم مقاس ورق A4 أو A5 أو LETTER فقط.');
  }

  const addr = String(input.addressOrPort || '').trim();
  if (input.connectionType === 'NETWORK_IP') {
    const ipPortRegex =
      /^(?:(?:\d{1,3}\.){3}\d{1,3}|[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}|localhost)(?::\d{1,5})?$/;
    if (!addr || !ipPortRegex.test(addr)) {
      errors.push('عنوان طابعة الشبكة غير صالح (مثال: 192.168.1.120:9100).');
    }
  } else if (!addr) {
    errors.push('يرجى تحديد المنفذ أو اسم الطابعة في النظام (مثال: USB001 أو اسم التعريف).');
  }

  const copies = input.copies !== undefined ? Number(input.copies) : 1;
  if (!Number.isInteger(copies) || copies < 1 || copies > 5) {
    errors.push('عدد النسخ يجب أن يكون رقماً صحيحاً بين 1 و 5.');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Ensures structural invariants across printer profiles:
 * - Exactly one active profile (if any exist) is marked `isGlobalDefault`
 * - At most one profile per category (`RECEIPT`, `A4`) is marked `isDefaultForCategory`
 */
export function normalizePrinterProfileDefaults(
  profiles: PosPrinterProfile[]
): PosPrinterProfile[] {
  if (profiles.length === 0) return [];
  const next = profiles.map((p) => ({ ...p }));

  // 1. Ensure single global default
  const globalDefaults = next.filter((p) => p.isGlobalDefault && p.isActive);
  if (globalDefaults.length === 0) {
    const firstActive = next.find((p) => p.isActive) || next[0];
    next.forEach((p) => {
      p.isGlobalDefault = p.id === firstActive.id;
    });
  } else if (globalDefaults.length > 1) {
    const keepId = globalDefaults[0].id;
    next.forEach((p) => {
      p.isGlobalDefault = p.id === keepId;
    });
  }

  // 2. Ensure single category default per category (when profiles of that category exist)
  (['RECEIPT', 'A4'] as PrinterProfileCategory[]).forEach((cat) => {
    const inCat = next.filter((p) => p.category === cat);
    if (inCat.length === 0) return;
    const catDefaults = inCat.filter((p) => p.isDefaultForCategory && p.isActive);
    if (catDefaults.length === 0) {
      const firstActiveInCat = inCat.find((p) => p.isActive) || inCat[0];
      next.forEach((p) => {
        if (p.category === cat) {
          p.isDefaultForCategory = p.id === firstActiveInCat.id;
        }
      });
    } else if (catDefaults.length > 1) {
      const keepId = catDefaults[0].id;
      next.forEach((p) => {
        if (p.category === cat) {
          p.isDefaultForCategory = p.id === keepId;
        }
      });
    }
  });

  return next;
}

export function upsertPrinterProfile(
  profiles: PosPrinterProfile[],
  input: PrinterProfileInput,
  nowIso = new Date().toISOString()
): { profiles: PosPrinterProfile[]; saved: PosPrinterProfile } {
  const existingIndex = input.id ? profiles.findIndex((p) => p.id === input.id) : -1;
  const existing = existingIndex >= 0 ? profiles[existingIndex] : null;
  const id =
    existing?.id ||
    `prn-${input.category.toLowerCase()}-${Date.now().toString(36)}-${Math.random()
      .toString(36)
      .slice(2, 6)}`;

  const isReceipt = input.category === 'RECEIPT';
  const saved: PosPrinterProfile = {
    id,
    name: input.name.trim(),
    category: input.category,
    paperSize: input.paperSize,
    connectionType: input.connectionType,
    addressOrPort: input.addressOrPort.trim(),
    templateId:
      input.templateId || getDefaultTemplateForCategory(input.category, input.paperSize),
    copies: Math.max(1, Math.min(5, Math.round(Number(input.copies) || 1))),
    autoCut: isReceipt ? Boolean(input.autoCut) : false,
    openCashDrawer: isReceipt ? Boolean(input.openCashDrawer) : false,
    autoPrintOnSale: Boolean(input.autoPrintOnSale),
    branchId: input.branchId || 'ALL',
    isDefaultForCategory:
      input.isDefaultForCategory !== undefined
        ? Boolean(input.isDefaultForCategory)
        : existing?.isDefaultForCategory ?? false,
    isGlobalDefault:
      input.isGlobalDefault !== undefined
        ? Boolean(input.isGlobalDefault)
        : existing?.isGlobalDefault ?? false,
    isActive: input.isActive !== undefined ? Boolean(input.isActive) : existing?.isActive ?? true,
    notes: input.notes !== undefined ? input.notes.trim() : existing?.notes || '',
    lastTestedAt: existing?.lastTestedAt,
    createdAt: existing?.createdAt || nowIso,
    updatedAt: nowIso,
  };

  let updatedList = profiles.map((p) => {
    const copy = { ...p };
    if (saved.isGlobalDefault && copy.id !== saved.id) {
      copy.isGlobalDefault = false;
    }
    if (saved.isDefaultForCategory && copy.category === saved.category && copy.id !== saved.id) {
      copy.isDefaultForCategory = false;
    }
    return copy;
  });

  if (existingIndex >= 0) {
    updatedList[existingIndex] = saved;
  } else {
    updatedList = [...updatedList, saved];
  }

  const normalized = normalizePrinterProfileDefaults(updatedList);
  const finalSaved = normalized.find((p) => p.id === saved.id) || saved;
  return { profiles: normalized, saved: finalSaved };
}

export function setDefaultPrinterProfile(
  profiles: PosPrinterProfile[],
  profileId: string,
  scope: 'GLOBAL' | 'CATEGORY',
  nowIso = new Date().toISOString()
): PosPrinterProfile[] {
  const target = profiles.find((p) => p.id === profileId);
  if (!target) return profiles;

  const updated = profiles.map((p) => {
    if (scope === 'GLOBAL') {
      if (p.id === profileId) {
        return {
          ...p,
          isActive: true,
          isGlobalDefault: true,
          isDefaultForCategory: true,
          updatedAt: nowIso,
        };
      }
      return {
        ...p,
        isGlobalDefault: false,
        isDefaultForCategory:
          p.category === target.category ? false : p.isDefaultForCategory,
      };
    }

    // scope === 'CATEGORY'
    if (p.category !== target.category) return p;
    if (p.id === profileId) {
      return {
        ...p,
        isActive: true,
        isDefaultForCategory: true,
        updatedAt: nowIso,
      };
    }
    return {
      ...p,
      isDefaultForCategory: false,
    };
  });

  return normalizePrinterProfileDefaults(updated);
}

export function deletePrinterProfile(
  profiles: PosPrinterProfile[],
  profileId: string
): { success: boolean; profiles: PosPrinterProfile[]; errorAr?: string } {
  if (profiles.length <= 1) {
    return {
      success: false,
      profiles,
      errorAr: 'لا يمكن حذف ملف الطابعة الوحيد؛ يجب الإبقاء على طابعة واحدة على الأقل في النظام.',
    };
  }
  const filtered = profiles.filter((p) => p.id !== profileId);
  if (filtered.length === profiles.length) {
    return {
      success: false,
      profiles,
      errorAr: 'لم يتم العثور على ملف الطابعة المطلوب حذفه.',
    };
  }
  return {
    success: true,
    profiles: normalizePrinterProfileDefaults(filtered),
  };
}

export function markPrinterTested(
  profiles: PosPrinterProfile[],
  profileId: string,
  testedAtIso = new Date().toISOString()
): PosPrinterProfile[] {
  return profiles.map((p) =>
    p.id === profileId ? { ...p, lastTestedAt: testedAtIso, updatedAt: testedAtIso } : p
  );
}

export function resolveDefaultPrinterForMode(
  profiles: PosPrinterProfile[],
  mode: 'thermal' | 'a4',
  branchId?: string
): PosPrinterProfile | null {
  const category: PrinterProfileCategory = mode === 'a4' ? 'A4' : 'RECEIPT';
  const active = profiles.filter((p) => p.isActive && p.category === category);
  if (active.length === 0) {
    return profiles.find((p) => p.isGlobalDefault && p.isActive) || profiles[0] || null;
  }
  if (branchId) {
    const branchDefault = active.find(
      (p) => p.branchId === branchId && p.isDefaultForCategory
    );
    if (branchDefault) return branchDefault;
    const branchMatch = active.find((p) => p.branchId === branchId);
    if (branchMatch) return branchMatch;
  }
  return (
    active.find((p) => p.isDefaultForCategory) ||
    active.find((p) => p.isGlobalDefault) ||
    active[0]
  );
}

export function resolveGlobalDefaultPrinter(
  profiles: PosPrinterProfile[]
): PosPrinterProfile | null {
  return (
    profiles.find((p) => p.isGlobalDefault && p.isActive) ||
    profiles.find((p) => p.isActive) ||
    profiles[0] ||
    null
  );
}

export function buildPrinterTestTicketSummary(
  profile: PosPrinterProfile,
  companyName: string,
  nowIso = new Date().toISOString()
): {
  title: string;
  companyName: string;
  printerName: string;
  paperSize: PrinterPaperSize;
  connectionSummary: string;
  timestampIso: string;
  lines: string[];
} {
  return {
    title:
      profile.category === 'RECEIPT'
        ? `اختبار طباعة إيصال حراري (${profile.paperSize})`
        : `اختبار طباعة مستند قياسي (${profile.paperSize})`,
    companyName: companyName || 'Haseb Enterprise ERP',
    printerName: profile.name,
    paperSize: profile.paperSize,
    connectionSummary: `${profile.connectionType} · ${profile.addressOrPort}`,
    timestampIso: nowIso,
    lines: [
      `المنشأة: ${companyName || 'Haseb Enterprise ERP'}`,
      `ملف الطابعة: ${profile.name}`,
      `المقاس والقالب: ${profile.paperSize} (${profile.templateId})`,
      `الاتصال: ${profile.connectionType} — ${profile.addressOrPort}`,
      `عدد النسخ: ${profile.copies}`,
      ...(profile.category === 'RECEIPT'
        ? [
            `القص التلقائي: ${profile.autoCut ? 'مفعّل' : 'معطّل'}`,
            `فتح درج النقدية: ${profile.openCashDrawer ? 'مفعّل' : 'معطّل'}`,
          ]
        : []),
      'الحالة: جاهز للطباعة (UTF-8 Arabic / RTL OK)',
    ],
  };
}
