/**
 * Pure WCAG 2.1 Color Contrast & Harmonic Brand Palette Engine
 * Zero DOM dependencies — unit-testable for AI Theme Generator & Workspace Preview.
 */

export interface BrandPaletteTokens {
  paletteNameAr: string;
  paletteNameEn: string;
  primaryHex: string;
  secondaryHex: string;
  accentHex: string;
  surfaceHex: string;
  backgroundHex: string;
  textHex: string;
  rationaleAr: string;
  rationaleEn: string;
  polarity?: 'light' | 'dark' | 'warm';
  source?: 'GEMINI_AI' | 'BRAND_HARMONIZER';
}

export type WcagRatingLevel = 'AAA' | 'AA' | 'AA_LARGE' | 'FAIL';

export interface WcagContrastEvaluation {
  ratio: number;
  ratioLabel: string;
  rating: WcagRatingLevel;
  passesAA: boolean;
  labelAr: string;
  labelEn: string;
}

function normalizeHex(hex: string): { r: number; g: number; b: number } | null {
  const clean = String(hex || '').trim().replace(/^#/, '');
  if (/^[0-9a-fA-F]{3}$/.test(clean)) {
    return {
      r: parseInt(clean[0] + clean[0], 16),
      g: parseInt(clean[1] + clean[1], 16),
      b: parseInt(clean[2] + clean[2], 16),
    };
  }
  if (/^[0-9a-fA-F]{6}$/.test(clean)) {
    return {
      r: parseInt(clean.slice(0, 2), 16),
      g: parseInt(clean.slice(2, 4), 16),
      b: parseInt(clean.slice(4, 6), 16),
    };
  }
  return null;
}

function channelToLinear(c: number): number {
  const s = c / 255;
  return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
}

export function computeRelativeLuminance(hex: string): number {
  const rgb = normalizeHex(hex);
  if (!rgb) return 0;
  return (
    0.2126 * channelToLinear(rgb.r) +
    0.7152 * channelToLinear(rgb.g) +
    0.0722 * channelToLinear(rgb.b)
  );
}

export function computeContrastRatio(fgHex: string, bgHex: string): number {
  const l1 = computeRelativeLuminance(fgHex);
  const l2 = computeRelativeLuminance(bgHex);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return Math.round(((lighter + 0.05) / (darker + 0.05)) * 100) / 100;
}

export function evaluateWcagContrast(fgHex: string, bgHex: string): WcagContrastEvaluation {
  const ratio = computeContrastRatio(fgHex, bgHex);
  let rating: WcagRatingLevel = 'FAIL';
  let labelAr = 'تباين ضعيف (يُنصح بالتحسين)';
  let labelEn = 'Low Contrast';

  if (ratio >= 7) {
    rating = 'AAA';
    labelAr = 'تباين فائق AAA';
    labelEn = 'AAA Super Contrast';
  } else if (ratio >= 4.5) {
    rating = 'AA';
    labelAr = 'تباين قياسي معتمد AA';
    labelEn = 'AA Standard Pass';
  } else if (ratio >= 3) {
    rating = 'AA_LARGE';
    labelAr = 'مقبول للعناوين الكبيرة';
    labelEn = 'AA Large Text';
  }

  return {
    ratio,
    ratioLabel: `${ratio.toFixed(1)}:1`,
    rating,
    passesAA: ratio >= 4.5,
    labelAr,
    labelEn,
  };
}

export function suggestAccessibleTextHex(bgHex: string): '#0f172a' | '#ffffff' {
  const darkRatio = computeContrastRatio('#0f172a', bgHex);
  const whiteRatio = computeContrastRatio('#ffffff', bgHex);
  return whiteRatio > darkRatio ? '#ffffff' : '#0f172a';
}

export function generateCohesivePaletteVariants(
  seedHex: string,
  companyName: string,
  polarity: 'light' | 'dark' | 'warm' = 'light'
): BrandPaletteTokens[] {
  const validSeed = /^#[0-9a-fA-F]{6}$/.test(String(seedHex || '').trim())
    ? String(seedHex).trim()
    : '#1e3a8a';

  if (polarity === 'dark') {
    return [
      {
        paletteNameAr: `ليلي تنفيذي — ${companyName}`,
        paletteNameEn: `${companyName} Executive Dark`,
        primaryHex: validSeed,
        secondaryHex: '#0b1120',
        accentHex: '#10b981',
        surfaceHex: '#111827',
        backgroundHex: '#030712',
        textHex: '#f8fafc',
        polarity: 'dark',
        rationaleAr: 'وضع داكن احترافي بسطوح عالية التباين يقلل إجهاد العين في الورديات الطويلة.',
        rationaleEn: 'High-contrast dark surface hierarchy engineered for extended financial shifts.',
        source: 'BRAND_HARMONIZER',
      },
      {
        paletteNameAr: 'دفتر محاسبي ليلي',
        paletteNameEn: 'Obsidian Accounting Ledger',
        primaryHex: '#3b82f6',
        secondaryHex: '#0f172a',
        accentHex: '#f59e0b',
        surfaceHex: '#1e293b',
        backgroundHex: '#090d16',
        textHex: '#f1f5f9',
        polarity: 'dark',
        rationaleAr: 'تدرج أزرق كهربائي مع كهرماني دافئ لتمييز الأرصدة والمؤشرات الحرجة.',
        rationaleEn: 'Electric cobalt and amber indicators layered cleanly over deep slate.',
        source: 'BRAND_HARMONIZER',
      },
      {
        paletteNameAr: 'زمردي ليلي للمخزون',
        paletteNameEn: 'Emerald Night Operations',
        primaryHex: '#059669',
        secondaryHex: '#064e3b',
        accentHex: '#38bdf8',
        surfaceHex: '#0f172a',
        backgroundHex: '#020617',
        textHex: '#f8fafc',
        polarity: 'dark',
        rationaleAr: 'مناسب لنقاط البيع والمخزون بإبراز واضح لحالات السداد والتحقق.',
        rationaleEn: 'Tailored for POS and inventory flows with crisp status legibility.',
        source: 'BRAND_HARMONIZER',
      },
    ];
  }

  if (polarity === 'warm') {
    return [
      {
        paletteNameAr: `رملي تجاري دافئ — ${companyName}`,
        paletteNameEn: `${companyName} Warm Heritage`,
        primaryHex: validSeed,
        secondaryHex: '#292524',
        accentHex: '#d97706',
        surfaceHex: '#fffcf5',
        backgroundHex: '#f5efe4',
        textHex: '#1c1917',
        polarity: 'warm',
        rationaleAr: 'خلفية رملية دافئة مريحة للعين مستوحاة من الدفاتر التجارية العربية.',
        rationaleEn: 'Warm paper-toned surfaces reducing glare for long accounting sessions.',
        source: 'BRAND_HARMONIZER',
      },
      {
        paletteNameAr: 'نحاسي وزيتي تنفيذي (Copper Olive)',
        paletteNameEn: 'Copper & Olive Commercial',
        primaryHex: '#9a3412',
        secondaryHex: '#27272a',
        accentHex: '#0f766e',
        surfaceHex: '#ffffff',
        backgroundHex: '#faf5ef',
        textHex: '#18181b',
        polarity: 'warm',
        rationaleAr: 'تباين رصين يجمع دفء النحاسي مع دقة الفيروزي في الفواتير والطباعة.',
        rationaleEn: 'Refined terracotta and deep teal pairing suited for commercial invoices.',
        source: 'BRAND_HARMONIZER',
      },
      {
        paletteNameAr: 'أرضي كلاسيكي (Sandstone Ledger)',
        paletteNameEn: 'Sandstone Classic Ledger',
        primaryHex: '#1e3a8a',
        secondaryHex: '#44403c',
        accentHex: '#b45309',
        surfaceHex: '#fffdf9',
        backgroundHex: '#f4efe6',
        textHex: '#1c1917',
        polarity: 'warm',
        rationaleAr: 'مزيج أزرق مؤسسي على ورق دافئ لتوضيح الجداول والأرقام المالية.',
        rationaleEn: 'Corporate navy ink anchored on warm parchment surfaces.',
        source: 'BRAND_HARMONIZER',
      },
    ];
  }

  return [
    {
      paletteNameAr: `توازن الهوية المؤسسي — ${companyName}`,
      paletteNameEn: `${companyName} Corporate Balance`,
      primaryHex: validSeed,
      secondaryHex: '#0f172a',
      accentHex: '#059669',
      surfaceHex: '#ffffff',
      backgroundHex: '#f8fafc',
      textHex: '#0f172a',
      polarity: 'light',
      rationaleAr: 'باليت مؤسسي مستخلص من شعارك بتباين قياسي للجداول والفواتير الرسمية.',
      rationaleEn: 'Brand-aligned institutional palette tuned for crisp accounting tables and invoices.',
      source: 'BRAND_HARMONIZER',
    },
    {
      paletteNameAr: 'أزرق مصرفي رصين (Banking Cobalt)',
      paletteNameEn: 'Banking Cobalt Precision',
      primaryHex: '#1e40af',
      secondaryHex: '#1e293b',
      accentHex: '#0d9488',
      surfaceHex: '#ffffff',
      backgroundHex: '#f1f5f9',
      textHex: '#0f172a',
      polarity: 'light',
      rationaleAr: 'طابع بنكي مالي عالي الموثوقية يناسب مبيعات B2B وتقارير الأرباح.',
      rationaleEn: 'Financial cobalt paired with crisp slate surfaces for B2B ledgers.',
      source: 'BRAND_HARMONIZER',
    },
    {
      paletteNameAr: 'زمردي تشغيلي (Solar & Retail Mint)',
      paletteNameEn: 'Operational Emerald Suite',
      primaryHex: '#065f46',
      secondaryHex: '#0f172a',
      accentHex: '#2563eb',
      surfaceHex: '#ffffff',
      backgroundHex: '#f8fafc',
      textHex: '#0f172a',
      polarity: 'light',
      rationaleAr: 'مثالي لقطاعات الطاقة الشمسية ونقاط البيع مع وضوح عالٍ لحالات الدفع.',
      rationaleEn: 'Clean emerald hierarchy designed for solar, electronics, and POS workflows.',
      source: 'BRAND_HARMONIZER',
    },
  ];
}
