import React, { useState, useMemo } from 'react';
import {
  BookmarkPlus,
  CheckCircle2,
  Eye,
  Layout,
  Palette,
  RefreshCw,
  Save,
  ShieldCheck,
  Sparkles,
  Sun,
  Moon,
  Trash2,
  Type,
  Upload,
} from 'lucide-react';
import { useERP } from '../../context/ERPContext';
import {
  BrandPaletteTokens,
  evaluateWcagContrast,
  generateCohesivePaletteVariants,
  suggestAccessibleTextHex,
} from '../../core/themeContrastEngine';

export type GeneratedBrandPalette = BrandPaletteTokens;

interface SavedCustomPreset extends BrandPaletteTokens {
  id: string;
  cornerRadius: 'sharp' | 'balanced' | 'rounded';
}

const CUSTOM_PRESETS_STORAGE_KEY = 'haseb_custom_ai_theme_presets_v1';

function loadSavedPresets(): SavedCustomPreset[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(CUSTOM_PRESETS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export const AiThemeAndPreviewStudio: React.FC = () => {
  const {
    company: companyInfo,
    updateCompanyProfile,
    uiDensity,
    setUiDensity,
    fontScalePercent,
    setFontScalePercent,
    updateInvoiceTemplateSettings,
    language,
    currency,
    dispatchToastAndPushNotification,
  } = useERP();

  const isAr = language === 'ar';

  const notify = (msg: string) => {
    dispatchToastAndPushNotification({
      titleAr: 'استوديو الهوية البصرية الذكي',
      titleEn: 'AI Theme & Workspace Studio',
      messageAr: msg,
      messageEn: msg,
      severity: 'success',
      category: 'LIVE_EVENTS',
    });
  };

  const [logoDataUrl, setLogoDataUrl] = useState<string>(
    companyInfo.logo || companyInfo.logoUrl || ''
  );
  const [brandHintText, setBrandHintText] = useState<string>(
    companyInfo.nameAr || companyInfo.name || 'مؤسسة الأعمال التجارية'
  );
  const [moodPrompt, setMoodPrompt] = useState<string>(
    'أسلوب مالي وتجاري رصين، وضوح عالي للأرقام والجداول والفواتير'
  );
  const [polarity, setPolarity] = useState<'light' | 'dark' | 'warm'>('light');
  const [isGeneratingPalette, setIsGeneratingPalette] = useState<boolean>(false);

  // Staged workspace preview settings BEFORE the user clicks Save/Apply
  const [stagedPrimaryHex, setStagedPrimaryHex] = useState<string>('#1e3a8a');
  const [stagedSecondaryHex, setStagedSecondaryHex] = useState<string>('#0f172a');
  const [stagedAccentHex, setStagedAccentHex] = useState<string>('#059669');
  const [stagedSurfaceHex, setStagedSurfaceHex] = useState<string>('#ffffff');
  const [stagedBackgroundHex, setStagedBackgroundHex] = useState<string>('#f8fafc');
  const [stagedTextHex, setStagedTextHex] = useState<string>('#0f172a');
  const [stagedFontScalePercent, setStagedFontScalePercent] = useState<number>(
    fontScalePercent || 100
  );
  const [stagedDensity, setStagedDensity] = useState<'comfortable' | 'compact'>(
    uiDensity || 'comfortable'
  );
  const [stagedCornerRadius, setStagedCornerRadius] = useState<'sharp' | 'balanced' | 'rounded'>(
    'balanced'
  );
  const [syncWithInvoices, setSyncWithInvoices] = useState<boolean>(true);
  const [previewTab, setPreviewTab] = useState<'dashboard' | 'pos' | 'invoice'>('dashboard');

  const [generatedPalettes, setGeneratedPalettes] = useState<GeneratedBrandPalette[]>(() =>
    generateCohesivePaletteVariants('#1e3a8a', companyInfo.nameAr || 'RLM ERP', 'light')
  );
  const [selectedCandidateIndex, setSelectedCandidateIndex] = useState<number>(0);
  const [savedPresets, setSavedPresets] = useState<SavedCustomPreset[]>(() => loadSavedPresets());

  const applyPaletteToStaged = (p: GeneratedBrandPalette) => {
    setStagedPrimaryHex(p.primaryHex);
    setStagedSecondaryHex(p.secondaryHex || '#0f172a');
    setStagedAccentHex(p.accentHex || '#059669');
    setStagedSurfaceHex(p.surfaceHex || '#ffffff');
    setStagedBackgroundHex(p.backgroundHex || '#f8fafc');
    setStagedTextHex(p.textHex || suggestAccessibleTextHex(p.surfaceHex || '#ffffff'));
    if (p.polarity) setPolarity(p.polarity);
  };

  const extractDominantColorFromDataUrl = (dataUrl: string): Promise<string> =>
    new Promise((resolve) => {
      if (!dataUrl || typeof Image === 'undefined') {
        resolve('#1e3a8a');
        return;
      }
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = 24;
          canvas.height = 24;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve('#1e3a8a');
            return;
          }
          ctx.drawImage(img, 0, 0, 24, 24);
          const data = ctx.getImageData(0, 0, 24, 24).data;
          let r = 0;
          let g = 0;
          let b = 0;
          let count = 0;
          for (let i = 0; i < data.length; i += 4) {
            const alpha = data[i + 3];
            const lum = (data[i] + data[i + 1] + data[i + 2]) / 3;
            if (alpha > 128 && lum > 20 && lum < 240) {
              r += data[i];
              g += data[i + 1];
              b += data[i + 2];
              count++;
            }
          }
          if (count > 0) {
            const toHex = (n: number) =>
              Math.min(255, Math.max(0, Math.round(n / count)))
                .toString(16)
                .padStart(2, '0');
            resolve(`#${toHex(r)}${toHex(g)}${toHex(b)}`);
          } else {
            resolve('#1e3a8a');
          }
        } catch {
          resolve('#1e3a8a');
        }
      };
      img.onerror = () => resolve('#1e3a8a');
      img.src = dataUrl;
    });

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      if (typeof reader.result === 'string') {
        const url = reader.result;
        setLogoDataUrl(url);
        const dominantHex = await extractDominantColorFromDataUrl(url);
        setStagedPrimaryHex(dominantHex);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleGenerateAiPalette = async () => {
    setIsGeneratingPalette(true);
    try {
      const extractedSeedHex = logoDataUrl
        ? await extractDominantColorFromDataUrl(logoDataUrl)
        : stagedPrimaryHex;

      const response = await fetch('/api/gemini/theme-palette', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyName: brandHintText || companyInfo.nameAr || 'RLM Enterprise',
          moodPrompt,
          polarity,
          logoDataUrl: logoDataUrl ? logoDataUrl.slice(0, 120000) : '',
          dominantSeedHex: extractedSeedHex,
          language,
        }),
      });

      if (response.ok) {
        const result = await response.json();
        const list: GeneratedBrandPalette[] =
          Array.isArray(result?.palettes) && result.palettes.length > 0
            ? result.palettes
            : result?.primaryHex
            ? [result]
            : [];
        if (list.length > 0) {
          setGeneratedPalettes(list);
          setSelectedCandidateIndex(0);
          applyPaletteToStaged(list[0]);
          notify(
            isAr
              ? `تم توليد ${list.length} خيارات باليت ذكية عبر Gemini AI بنجاح!`
              : `Generated ${list.length} cohesive palettes via Gemini AI!`
          );
          setIsGeneratingPalette(false);
          return;
        }
      }
      throw new Error('Fallback to local brand harmonizer');
    } catch {
      const seedHex = logoDataUrl
        ? await extractDominantColorFromDataUrl(logoDataUrl)
        : stagedPrimaryHex;
      const variants = generateCohesivePaletteVariants(
        seedHex,
        brandHintText || companyInfo.nameAr || 'RLM ERP',
        polarity
      );
      setGeneratedPalettes(variants);
      setSelectedCandidateIndex(0);
      applyPaletteToStaged(variants[0]);
      notify(
        isAr
          ? 'تم توليد 3 سمات متناسقة وعالية التباين وعرضها في بطاقة المعاينة الحية!'
          : 'Generated 3 brand-consistent palettes!'
      );
    } finally {
      setIsGeneratingPalette(false);
    }
  };

  const handleSaveCustomPreset = () => {
    const active = generatedPalettes[selectedCandidateIndex] || generatedPalettes[0];
    const preset: SavedCustomPreset = {
      id: `preset-${Date.now()}`,
      paletteNameAr: active?.paletteNameAr || `سمة مخصصة (${stagedPrimaryHex})`,
      paletteNameEn: active?.paletteNameEn || `Custom (${stagedPrimaryHex})`,
      primaryHex: stagedPrimaryHex,
      secondaryHex: stagedSecondaryHex,
      accentHex: stagedAccentHex,
      surfaceHex: stagedSurfaceHex,
      backgroundHex: stagedBackgroundHex,
      textHex: stagedTextHex,
      polarity,
      cornerRadius: stagedCornerRadius,
      rationaleAr: active?.rationaleAr || 'سمة مخصصة محفوظة من قبل المستخدم',
      rationaleEn: active?.rationaleEn || 'User saved custom workspace theme',
    };
    const next = [preset, ...savedPresets].slice(0, 8);
    setSavedPresets(next);
    try {
      localStorage.setItem(CUSTOM_PRESETS_STORAGE_KEY, JSON.stringify(next));
    } catch {
      // ignore
    }
    notify(isAr ? 'تم حفظ السمة في مفضلة السمات المخصصة!' : 'Saved theme preset!');
  };

  const handleDeleteSavedPreset = (id: string) => {
    const next = savedPresets.filter((p) => p.id !== id);
    setSavedPresets(next);
    try {
      localStorage.setItem(CUSTOM_PRESETS_STORAGE_KEY, JSON.stringify(next));
    } catch {
      // ignore
    }
  };

  const handleSaveAndApplyTheme = () => {
    setUiDensity(stagedDensity);
    setFontScalePercent(stagedFontScalePercent);

    if (logoDataUrl && logoDataUrl !== companyInfo.logo) {
      updateCompanyProfile({ logo: logoDataUrl, logoUrl: logoDataUrl });
    }

    if (syncWithInvoices) {
      updateInvoiceTemplateSettings({
        primaryColorHex: stagedPrimaryHex,
        secondaryColorHex: stagedAccentHex,
      });
    }

    if (typeof document !== 'undefined') {
      document.documentElement.style.setProperty('--erp-brand-primary', stagedPrimaryHex);
      document.documentElement.style.fontSize = `${stagedFontScalePercent}%`;
    }

    notify(
      isAr
        ? syncWithInvoices
          ? 'تم تطبيق السمة على النظام وقوالب الفواتير وحجم الخط وكثافة الواجهة!'
          : 'تم حفظ وتطبيق سمة الألوان وحجم الخط وكثافة الواجهة على النظام!'
        : 'Saved and applied theme colors, font size, and UI density!'
    );
  };

  const activePalette = generatedPalettes[selectedCandidateIndex] || generatedPalettes[0];

  const primaryBtnText = useMemo(
    () => suggestAccessibleTextHex(stagedPrimaryHex),
    [stagedPrimaryHex]
  );
  const surfaceContrast = useMemo(
    () => evaluateWcagContrast(stagedTextHex, stagedSurfaceHex),
    [stagedTextHex, stagedSurfaceHex]
  );
  const primaryContrast = useMemo(
    () => evaluateWcagContrast(primaryBtnText, stagedPrimaryHex),
    [primaryBtnText, stagedPrimaryHex]
  );

  const radiusClass =
    stagedCornerRadius === 'sharp'
      ? 'rounded'
      : stagedCornerRadius === 'rounded'
      ? 'rounded-2xl'
      : 'rounded-lg';

  return (
    <section
      data-testid="ai-theme-and-preview-studio"
      className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-4 sm:p-5 space-y-5"
    >
      {/* Studio Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="p-2.5 rounded-xl bg-blue-600/10 text-blue-600 dark:text-blue-400">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100">
              {isAr
                ? 'مولّد سمات الألوان بالذكاء الاصطناعي (Gemini AI) وبطاقة المعاينة الفورية'
                : 'AI Color Theme Generator (Gemini API) & Real-Time Workspace Preview'}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {isAr
                ? 'ارفع الشعار وحدد الطابع المطلوب لتوليد 3 سمات متناسقة بفحص تباين WCAG، وعاين لوحة التحكم ونقطة البيع والفواتير قبل الحفظ'
                : 'Upload logo & prompt style to generate 3 WCAG-verified palettes with live workspace, POS & invoice preview'}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            data-testid="save-custom-ai-preset-btn"
            onClick={handleSaveCustomPreset}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 text-slate-800 dark:text-slate-100 text-xs font-bold transition cursor-pointer"
          >
            <BookmarkPlus className="w-3.5 h-3.5 text-blue-600" />
            <span>{isAr ? 'حفظ كمفضلة' : 'Save Preset'}</span>
          </button>

          <button
            type="button"
            data-testid="save-apply-workspace-theme-btn"
            onClick={handleSaveAndApplyTheme}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs transition cursor-pointer"
          >
            <Save className="w-4 h-4" />
            <span>{isAr ? 'حفظ وتطبيق السمة على النظام' : 'Save & Apply to Workspace'}</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
        {/* Left Column: AI Color Theme Generator + WCAG + Typography & Density Controls */}
        <div className="xl:col-span-6 space-y-4">
          {/* 1. Logo Upload, Prompt, Polarity & Gemini Trigger */}
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950/50 border border-slate-200/80 dark:border-slate-800 space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <Palette className="w-4 h-4 text-blue-600" />
                {isAr ? '1. تحليل الشعار وتوجيه الذكاء الاصطناعي (Gemini AI)' : '1. Logo & AI Style Prompt'}
              </span>

              {/* Polarity Switcher */}
              <div className="flex items-center gap-1 bg-white dark:bg-slate-900 p-0.5 rounded-lg border border-slate-200 dark:border-slate-700 text-[10.5px]">
                {[
                  { id: 'light', label: isAr ? 'فاتح' : 'Light', icon: Sun },
                  { id: 'warm', label: isAr ? 'رملي دافئ' : 'Warm', icon: Sparkles },
                  { id: 'dark', label: isAr ? 'داكن' : 'Dark', icon: Moon },
                ].map((pol) => {
                  const Icon = pol.icon;
                  return (
                    <button
                      key={pol.id}
                      type="button"
                      data-testid={`ai-theme-polarity-${pol.id}`}
                      onClick={() => {
                        setPolarity(pol.id as any);
                        const variants = generateCohesivePaletteVariants(
                          stagedPrimaryHex,
                          brandHintText || 'ERP',
                          pol.id as any
                        );
                        setGeneratedPalettes(variants);
                        setSelectedCandidateIndex(0);
                        applyPaletteToStaged(variants[0]);
                      }}
                      className={`px-2 py-1 rounded-md font-bold flex items-center gap-1 cursor-pointer transition ${
                        polarity === pol.id
                          ? 'bg-slate-900 text-white'
                          : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100'
                      }`}
                    >
                      <Icon className="w-3 h-3" />
                      <span>{pol.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex flex-wrap items-start gap-3">
              <div className="w-14 h-14 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 flex items-center justify-center overflow-hidden shrink-0">
                {logoDataUrl ? (
                  <img
                    src={logoDataUrl}
                    alt="Company Logo Preview"
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <span
                    className="text-xs font-black tracking-wider"
                    style={{ color: stagedPrimaryHex }}
                  >
                    LOGO
                  </span>
                )}
              </div>

              <div className="flex-1 min-w-[200px] space-y-2">
                <input
                  type="text"
                  data-testid="ai-theme-brand-name-input"
                  value={brandHintText}
                  onChange={(e) => setBrandHintText(e.target.value)}
                  placeholder={isAr ? 'اسم الشركة أو العلامة التجارية...' : 'Company brand name...'}
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold text-slate-900 dark:text-slate-100"
                />

                <input
                  type="text"
                  data-testid="ai-theme-mood-input"
                  value={moodPrompt}
                  onChange={(e) => setMoodPrompt(e.target.value)}
                  placeholder={
                    isAr
                      ? 'صف الطابع المطلوب (مثال: طاقة شمسية، ألوان هندسية رصينة، تباين عالٍ)...'
                      : 'Describe desired mood (e.g., solar engineering, crisp banking contrast)...'
                  }
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-[11px] text-slate-700 dark:text-slate-200"
                />

                <div className="flex flex-wrap items-center gap-2">
                  <label
                    data-testid="ai-theme-logo-upload-label"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200 cursor-pointer hover:border-blue-500"
                  >
                    <Upload className="w-3.5 h-3.5 text-blue-600" />
                    <span>{isAr ? 'رفع شعار الشركة' : 'Upload Logo'}</span>
                    <input
                      type="file"
                      data-testid="ai-theme-logo-file-input"
                      accept="image/*"
                      onChange={handleLogoUpload}
                      className="hidden"
                    />
                  </label>

                  <button
                    type="button"
                    data-testid="ai-generate-palette-btn"
                    disabled={isGeneratingPalette}
                    onClick={handleGenerateAiPalette}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 dark:bg-blue-600 dark:hover:bg-blue-700 text-white text-xs font-bold transition cursor-pointer disabled:opacity-60"
                  >
                    {isGeneratingPalette ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    )}
                    <span>
                      {isGeneratingPalette
                        ? isAr
                          ? 'جاري توليد 3 سمات...'
                          : 'Generating Palettes...'
                        : isAr
                        ? 'توليد 3 سمات بالذكاء الاصطناعي'
                        : 'Generate 3 AI Palettes'}
                    </span>
                  </button>
                </div>
              </div>
            </div>

            {/* 3 Generated Candidate Switcher */}
            {generatedPalettes.length > 1 && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
                {generatedPalettes.map((cand, idx) => {
                  const isActive = idx === selectedCandidateIndex;
                  return (
                    <button
                      key={idx}
                      type="button"
                      data-testid={`ai-palette-candidate-${idx}`}
                      onClick={() => {
                        setSelectedCandidateIndex(idx);
                        applyPaletteToStaged(cand);
                      }}
                      className={`p-2 rounded-lg border text-right transition cursor-pointer flex flex-col justify-between gap-1.5 ${
                        isActive
                          ? 'border-blue-600 bg-blue-50/70 dark:bg-blue-950/30 ring-1 ring-blue-500/30'
                          : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300'
                      }`}
                    >
                      <div className="text-[10.5px] font-bold text-slate-900 dark:text-slate-100 truncate w-full">
                        {isAr ? cand.paletteNameAr : cand.paletteNameEn}
                      </div>
                      <div className="flex items-center gap-1">
                        {[cand.primaryHex, cand.secondaryHex, cand.accentHex, cand.surfaceHex].map(
                          (c, ci) => (
                            <span
                              key={ci}
                              style={{ backgroundColor: c }}
                              className="w-4 h-4 rounded-sm border border-slate-300/80 shrink-0"
                            />
                          )
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Active Palette Details, WCAG Contrast Ratio & 5-Token Editor */}
            {activePalette && (
              <div
                data-testid="ai-generated-palette-card"
                className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2.5"
              >
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                    {isAr ? activePalette.paletteNameAr : activePalette.paletteNameEn}
                  </span>
                  <div
                    data-testid="ai-theme-wcag-badge"
                    className={`inline-flex items-center gap-1 text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${
                      surfaceContrast.passesAA && primaryContrast.passesAA
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                        : 'bg-amber-50 text-amber-800 border-amber-200'
                    }`}
                  >
                    <ShieldCheck className="w-3 h-3" />
                    <span>
                      WCAG {surfaceContrast.ratioLabel} ({surfaceContrast.rating})
                    </span>
                  </div>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  {isAr ? activePalette.rationaleAr : activePalette.rationaleEn}
                </p>

                <div className="grid grid-cols-5 gap-1.5 pt-1">
                  {[
                    {
                      label: isAr ? 'الأساسي' : 'Primary',
                      hex: stagedPrimaryHex,
                      setter: setStagedPrimaryHex,
                      testId: 'swatch-primary',
                    },
                    {
                      label: isAr ? 'الثانوي' : 'Sidebar',
                      hex: stagedSecondaryHex,
                      setter: setStagedSecondaryHex,
                      testId: 'swatch-secondary',
                    },
                    {
                      label: isAr ? 'التمييز' : 'Accent',
                      hex: stagedAccentHex,
                      setter: setStagedAccentHex,
                      testId: 'swatch-accent',
                    },
                    {
                      label: isAr ? 'البطاقات' : 'Surface',
                      hex: stagedSurfaceHex,
                      setter: setStagedSurfaceHex,
                      testId: 'swatch-surface',
                    },
                    {
                      label: isAr ? 'الخلفية' : 'Bg',
                      hex: stagedBackgroundHex,
                      setter: setStagedBackgroundHex,
                      testId: 'swatch-background',
                    },
                  ].map((sw) => (
                    <div
                      key={sw.testId}
                      data-testid={sw.testId}
                      className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 flex flex-col items-center gap-1"
                    >
                      <input
                        type="color"
                        value={sw.hex}
                        onChange={(e) => sw.setter(e.target.value)}
                        className="w-7 h-7 rounded cursor-pointer border-0"
                      />
                      <span className="text-[9.5px] font-semibold text-slate-600 dark:text-slate-400 truncate">
                        {sw.label}
                      </span>
                      <span className="text-[9px] font-mono text-slate-900 dark:text-slate-200">
                        {sw.hex}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Saved Custom Presets Strip */}
            {savedPresets.length > 0 && (
              <div className="pt-1 space-y-1.5">
                <div className="text-[10.5px] font-bold text-slate-500">
                  {isAr ? 'السمات المحفوظة في المفضلة:' : 'Saved Custom Presets:'}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {savedPresets.map((preset) => (
                    <div
                      key={preset.id}
                      className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-[10.5px] font-bold"
                    >
                      <button
                        type="button"
                        onClick={() => {
                          applyPaletteToStaged(preset);
                          setStagedCornerRadius(preset.cornerRadius || 'balanced');
                        }}
                        className="flex items-center gap-1.5 cursor-pointer"
                      >
                        <span
                          className="w-3 h-3 rounded-full border border-slate-300"
                          style={{ backgroundColor: preset.primaryHex }}
                        />
                        <span className="max-w-[120px] truncate">{preset.paletteNameAr}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteSavedPreset(preset.id)}
                        className="text-slate-400 hover:text-rose-600 cursor-pointer"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* 2. Font Size, Corner Radius, Invoice Sync & UI Density Controls */}
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950/50 border border-slate-200/80 dark:border-slate-800 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Font Scale Slider */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    <Type className="w-3.5 h-3.5 text-blue-600" />
                    <span>{isAr ? 'حجم الخط (Font Scale)' : 'Font Size Scale'}</span>
                  </label>
                  <span
                    data-testid="staged-font-scale-value"
                    className="text-xs font-mono font-bold text-blue-600"
                  >
                    {stagedFontScalePercent}%
                  </span>
                </div>
                <input
                  type="range"
                  data-testid="staged-font-scale-slider"
                  min={85}
                  max={120}
                  step={5}
                  value={stagedFontScalePercent}
                  onChange={(e) => setStagedFontScalePercent(Number(e.target.value))}
                  className="w-full accent-blue-600 cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-slate-400 font-mono mt-1">
                  <span>85% (Small)</span>
                  <span>100% (Default)</span>
                  <span>120% (Large)</span>
                </div>
              </div>

              {/* UI Density Selector */}
              <div>
                <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1.5 flex items-center gap-1.5">
                  <Layout className="w-3.5 h-3.5 text-blue-600" />
                  <span>{isAr ? 'كثافة الواجهة (UI Density)' : 'Workspace UI Density'}</span>
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    data-testid="staged-density-comfortable"
                    onClick={() => setStagedDensity('comfortable')}
                    className={`py-2 px-3 rounded-lg text-xs font-bold border transition cursor-pointer ${
                      stagedDensity === 'comfortable'
                        ? 'border-blue-600 bg-blue-600 text-white'
                        : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    {isAr ? 'مريح (Comfortable)' : 'Comfortable'}
                  </button>
                  <button
                    type="button"
                    data-testid="staged-density-compact"
                    onClick={() => setStagedDensity('compact')}
                    className={`py-2 px-3 rounded-lg text-xs font-bold border transition cursor-pointer ${
                      stagedDensity === 'compact'
                        ? 'border-blue-600 bg-blue-600 text-white'
                        : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    {isAr ? 'مضغوط (Compact)' : 'Compact'}
                  </button>
                </div>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-200/80 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-1.5 text-[11px]">
                <span className="font-bold text-slate-600 dark:text-slate-300">
                  {isAr ? 'زوايا البطاقات:' : 'Corners:'}
                </span>
                {[
                  { id: 'sharp', label: isAr ? 'حاد' : 'Sharp' },
                  { id: 'balanced', label: isAr ? 'متوازن' : 'Balanced' },
                  { id: 'rounded', label: isAr ? 'دائري' : 'Rounded' },
                ].map((r) => (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => setStagedCornerRadius(r.id as any)}
                    className={`px-2 py-1 rounded border font-bold cursor-pointer ${
                      stagedCornerRadius === r.id
                        ? 'bg-slate-900 text-white border-slate-900'
                        : 'bg-white text-slate-600 border-slate-200'
                    }`}
                  >
                    {r.label}
                  </button>
                ))}
              </div>

              <label className="inline-flex items-center gap-1.5 text-[11px] font-bold text-slate-700 dark:text-slate-200 cursor-pointer">
                <input
                  type="checkbox"
                  checked={syncWithInvoices}
                  onChange={(e) => setSyncWithInvoices(e.target.checked)}
                  className="accent-blue-600"
                />
                <span>{isAr ? 'مزامنة ألوان السمة مع قوالب الفواتير' : 'Sync colors with invoices'}</span>
              </label>
            </div>
          </div>
        </div>

        {/* Right Column: Upgraded Real-Time Interactive Workspace Preview Card */}
        <div className="xl:col-span-6 flex flex-col">
          <div
            data-testid="settings-realtime-preview-card"
            className="flex-1 rounded-2xl border-2 border-slate-200 dark:border-slate-700 bg-slate-100/80 dark:bg-slate-950 p-4 space-y-3 flex flex-col justify-between"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 dark:text-slate-200">
                <Eye className="w-4 h-4 text-blue-600" />
                <span>
                  {isAr
                    ? 'بطاقة المعاينة الفورية لبيئة العمل (قبل الحفظ)'
                    : 'Real-Time Workspace Preview Card (Before Saving)'}
                </span>
              </div>

              <div className="flex items-center gap-1 bg-white dark:bg-slate-900 p-0.5 rounded-lg border border-slate-200 dark:border-slate-700 text-[10px]">
                {[
                  { id: 'dashboard', label: isAr ? 'لوحة التحكم' : 'Dashboard' },
                  { id: 'pos', label: isAr ? 'نقطة البيع' : 'POS' },
                  { id: 'invoice', label: isAr ? 'ترويسة الفاتورة' : 'Invoice' },
                ].map((pt) => (
                  <button
                    key={pt.id}
                    type="button"
                    data-testid={`preview-card-tab-${pt.id}`}
                    onClick={() => setPreviewTab(pt.id as any)}
                    className={`px-2 py-1 rounded font-bold cursor-pointer transition ${
                      previewTab === pt.id
                        ? 'bg-slate-900 text-white'
                        : 'text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    {pt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Simulated Miniature ERP Workspace */}
            <div
              data-testid="preview-card-mini-workspace"
              style={{
                fontSize: `${Math.round((stagedFontScalePercent / 100) * 12.5)}px`,
                backgroundColor: stagedSurfaceHex,
                color: stagedTextHex,
              }}
              className={`${radiusClass} overflow-hidden border border-slate-300 dark:border-slate-800 shadow-sm flex min-h-[300px]`}
            >
              {/* Simulated Sidebar */}
              <div
                style={{ backgroundColor: stagedSecondaryHex }}
                className={`w-36 text-white flex flex-col justify-between shrink-0 ${
                  stagedDensity === 'compact' ? 'p-2.5' : 'p-3.5'
                }`}
              >
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 pb-2 border-b border-white/10">
                    <div
                      style={{ backgroundColor: stagedPrimaryHex, color: primaryBtnText }}
                      className={`w-6 h-6 ${radiusClass} flex items-center justify-center font-black text-[9px] shrink-0`}
                    >
                      {logoDataUrl ? (
                        <img src={logoDataUrl} alt="" className="w-full h-full object-contain p-0.5 bg-white rounded" />
                      ) : (
                        'ERP'
                      )}
                    </div>
                    <span className="font-bold truncate text-xs">
                      {brandHintText || 'ERP'}
                    </span>
                  </div>

                  {[
                    { label: isAr ? 'نقطة البيع' : 'POS', active: previewTab === 'pos' },
                    { label: isAr ? 'المخزون' : 'Inventory', active: false },
                    { label: isAr ? 'المبيعات' : 'Sales', active: previewTab === 'invoice' },
                    { label: isAr ? 'المحاسبة' : 'Accounting', active: previewTab === 'dashboard' },
                    { label: isAr ? 'التواصل' : 'WhatsApp', active: false },
                  ].map((nav, i) => (
                    <div
                      key={i}
                      style={{
                        backgroundColor: nav.active ? stagedPrimaryHex : 'transparent',
                        color: nav.active ? primaryBtnText : '#cbd5e1',
                      }}
                      className={`${radiusClass} font-semibold transition ${
                        stagedDensity === 'compact' ? 'px-2 py-1 text-[10.5px]' : 'px-2.5 py-1.5 text-xs'
                      }`}
                    >
                      {nav.label}
                    </div>
                  ))}
                </div>

                <div className="text-[9.5px] text-slate-400 font-mono">
                  {stagedFontScalePercent}% · {stagedDensity}
                </div>
              </div>

              {/* Simulated Main Content */}
              <div
                style={{ backgroundColor: stagedBackgroundHex, color: stagedTextHex }}
                className={`flex-1 flex flex-col justify-between ${
                  stagedDensity === 'compact' ? 'p-2.5 space-y-2' : 'p-3.5 space-y-3'
                }`}
              >
                {previewTab === 'dashboard' && (
                  <>
                    <div
                      style={{ backgroundColor: stagedSurfaceHex }}
                      className={`flex items-center justify-between px-3 py-2 ${radiusClass} border border-slate-200/80`}
                    >
                      <span className="font-bold">
                        {isAr ? 'مؤشرات الأداء والمحاسبة' : 'Live Financial KPIs'}
                      </span>
                      <span
                        style={{ backgroundColor: stagedAccentHex, color: '#ffffff' }}
                        className={`px-2 py-0.5 ${radiusClass} text-[10px] font-bold`}
                      >
                        {primaryContrast.ratioLabel}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2.5">
                      <div
                        style={{ backgroundColor: stagedSurfaceHex }}
                        className={`${radiusClass} border border-slate-200/80 ${
                          stagedDensity === 'compact' ? 'p-2' : 'p-3'
                        }`}
                      >
                        <div className="text-[10px] opacity-65">
                          {isAr ? 'إجمالي المبيعات' : 'Net Revenue'}
                        </div>
                        <div
                          style={{ color: stagedPrimaryHex }}
                          className="font-bold font-mono tabular-nums mt-0.5"
                          dir="ltr"
                        >
                          148,500 {currency}
                        </div>
                      </div>

                      <div
                        style={{ backgroundColor: stagedSurfaceHex }}
                        className={`${radiusClass} border border-slate-200/80 ${
                          stagedDensity === 'compact' ? 'p-2' : 'p-3'
                        }`}
                      >
                        <div className="text-[10px] opacity-65">
                          {isAr ? 'التحصيل النقدي' : 'Collected'}
                        </div>
                        <div
                          style={{ color: stagedAccentHex }}
                          className="font-bold font-mono tabular-nums mt-0.5"
                          dir="ltr"
                        >
                          94.2%
                        </div>
                      </div>
                    </div>

                    <div
                      style={{ backgroundColor: stagedSurfaceHex }}
                      className={`${radiusClass} border border-slate-200/80 overflow-hidden text-[10.5px]`}
                    >
                      <div
                        style={{
                          borderBottom: `1.5px solid ${stagedPrimaryHex}`,
                        }}
                        className="px-2.5 py-1.5 font-bold flex justify-between opacity-80"
                      >
                        <span>{isAr ? 'القيد / الفاتورة' : 'Document'}</span>
                        <span>{isAr ? 'المبلغ' : 'Amount'}</span>
                      </div>
                      <div className="px-2.5 py-1.5 flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <CheckCircle2
                            className="w-3.5 h-3.5 shrink-0"
                            style={{ color: stagedAccentHex }}
                          />
                          <span>INV-2026-0142</span>
                        </div>
                        <span className="font-mono font-bold tabular-nums" dir="ltr">
                          6,200 {currency}
                        </span>
                      </div>
                    </div>
                  </>
                )}

                {previewTab === 'pos' && (
                  <>
                    <div
                      style={{ backgroundColor: stagedSurfaceHex }}
                      className={`px-3 py-2 ${radiusClass} border border-slate-200/80 flex items-center justify-between`}
                    >
                      <span className="font-bold">
                        {isAr ? 'نقطة البيع الفورية (POS)' : 'Quick POS Terminal'}
                      </span>
                      <span
                        style={{ backgroundColor: stagedPrimaryHex, color: primaryBtnText }}
                        className={`px-2 py-0.5 ${radiusClass} text-[10px] font-bold`}
                      >
                        {isAr ? 'وردية نشطة' : 'Shift Open'}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      {['لوح شمسي 585W', 'عاكس Deye 8kW'].map((name, idx) => (
                        <div
                          key={idx}
                          style={{ backgroundColor: stagedSurfaceHex }}
                          className={`p-2 ${radiusClass} border border-slate-200/80 space-y-1`}
                        >
                          <div className="font-bold text-[10.5px] truncate">{name}</div>
                          <div
                            style={{ color: stagedPrimaryHex }}
                            className="font-mono font-black text-xs"
                            dir="ltr"
                          >
                            {idx === 0 ? '500' : '4,400'} {currency}
                          </div>
                        </div>
                      ))}
                    </div>

                    <button
                      type="button"
                      style={{ backgroundColor: stagedPrimaryHex, color: primaryBtnText }}
                      className={`w-full py-2 ${radiusClass} font-bold text-xs text-center`}
                    >
                      {isAr ? 'إتمام البيع وطباعة الإيصال — 6,200' : 'Complete Checkout'}
                    </button>
                  </>
                )}

                {previewTab === 'invoice' && (
                  <div
                    style={{ backgroundColor: '#ffffff', color: '#0f172a' }}
                    className={`flex-1 ${radiusClass} border border-slate-300 overflow-hidden flex flex-col justify-between`}
                  >
                    <div style={{ backgroundColor: stagedPrimaryHex }} className="h-1.5 w-full" />
                    <div className="p-3 space-y-2.5 flex-1 flex flex-col justify-between">
                      <div className="flex items-start justify-between border-b border-slate-200 pb-2">
                        <div>
                          <div className="font-black text-xs">{brandHintText}</div>
                          <div className="text-[9.5px] text-slate-500">
                            {isAr ? 'فاتورة ضريبية وتجارية معتمدة' : 'Commercial Tax Invoice'}
                          </div>
                        </div>
                        <span
                          dir="ltr"
                          style={{
                            borderColor: stagedPrimaryHex,
                            color: stagedPrimaryHex,
                          }}
                          className="px-2 py-0.5 rounded border font-mono text-[9.5px] font-bold"
                        >
                          #INV-0142
                        </span>
                      </div>

                      <div className="border border-slate-200 rounded overflow-hidden text-[9.5px]">
                        <div
                          style={{ borderBottom: `1.5px solid ${stagedPrimaryHex}` }}
                          className="bg-slate-50 px-2 py-1 font-bold flex justify-between"
                        >
                          <span>{isAr ? 'الصنف' : 'Item'}</span>
                          <span>{isAr ? 'الإجمالي' : 'Total'}</span>
                        </div>
                        <div className="px-2 py-1 flex justify-between">
                          <span>Deye 8kW Hybrid Inverter</span>
                          <span dir="ltr" className="font-mono font-bold">4,400 {currency}</span>
                        </div>
                      </div>

                      <div
                        style={{
                          borderColor: stagedAccentHex,
                        }}
                        className="p-2 rounded border-2 bg-slate-50 flex items-center justify-between font-black text-xs"
                      >
                        <span>{isAr ? 'الصافي النهائي:' : 'Net Payable:'}</span>
                        <span dir="ltr" style={{ color: stagedPrimaryHex }} className="font-mono">
                          6,200 {currency}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between text-[10px] font-mono text-slate-500">
              <span>
                Primary: {stagedPrimaryHex} · Accent: {stagedAccentHex}
              </span>
              <span>
                {stagedFontScalePercent}% · {stagedDensity} · {stagedCornerRadius}
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default AiThemeAndPreviewStudio;
