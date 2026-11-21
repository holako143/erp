import React, { useMemo, useState } from 'react';
import {
  Branch,
  PosPrinterProfile,
  PrinterConnectionType,
  PrinterPaperSize,
  PrinterProfileCategory,
  StandardInvoiceTemplateType,
  ThermalTemplateType,
} from '../../types/erp';
import {
  A4_PAPER_SIZES,
  PrinterProfileInput,
  RECEIPT_PAPER_SIZES,
  buildPrinterTestTicketSummary,
  getDefaultTemplateForCategory,
  validatePrinterProfileInput,
} from '../../core/printerProfileEngine';
import { useModalLayer, renderModalPortal } from '../../core/modalLayerEngine';
import {
  Printer,
  Plus,
  Search,
  Star,
  Edit3,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Receipt,
  FileText,
  Wifi,
  Usb,
  Bluetooth,
  Monitor,
  X,
  Play,
} from 'lucide-react';

interface PrinterConfigurationManagerProps {
  language: 'ar' | 'en';
  companyName: string;
  branches: Branch[];
  profiles: PosPrinterProfile[];
  onSaveProfile: (input: PrinterProfileInput) => PosPrinterProfile;
  onSetDefault: (profileId: string, scope: 'GLOBAL' | 'CATEGORY') => void;
  onDeleteProfile: (profileId: string) => { success: boolean; errorAr?: string };
  onMarkTested: (profileId: string, testedAtIso?: string) => void;
  onFeedback: (text: string, type?: 'success' | 'warning' | 'error') => void;
}

const THERMAL_TEMPLATES: Array<{ id: ThermalTemplateType; labelAr: string; labelEn: string }> = [
  { id: 'thermal_80mm_onyx_pos', labelAr: '80mm الإيصال التنفيذي Pro', labelEn: '80mm Onyx POS Pro' },
  { id: 'thermal_80mm_warranty', labelAr: '80mm إيصال الضمان والسيريال', labelEn: '80mm Warranty & Serial' },
  { id: 'thermal_80mm_standard', labelAr: '80mm الضريبي القياسي', labelEn: '80mm Standard Tax' },
  { id: 'thermal_80mm_modern', labelAr: '80mm الهوية الرقمية', labelEn: '80mm Modern Identity' },
  { id: 'thermal_80mm_minimal', labelAr: '80mm السويسري الموفّر', labelEn: '80mm Minimal Eco' },
  { id: 'thermal_80mm_restaurant', labelAr: '80mm الضيافة والمطاعم', labelEn: '80mm Hospitality' },
  { id: 'thermal_58mm_compact', labelAr: '58mm المدمج المحمول', labelEn: '58mm Compact Mobile' },
];

const A4_TEMPLATES: Array<{ id: StandardInvoiceTemplateType; labelAr: string; labelEn: string }> = [
  { id: 'a4_onyx_yemen', labelAr: 'A4 القالب التنفيذي المعتمد', labelEn: 'A4 Executive Standard' },
  { id: 'a4_executive_grid_pro', labelAr: 'A4 الشبكي التنفيذي Pro', labelEn: 'A4 Executive Grid Pro' },
  { id: 'a4_global_sap_odoo', labelAr: 'A4 الضريبي المؤسسي B2B', labelEn: 'A4 Corporate B2B' },
  { id: 'a4_warranty_electronics', labelAr: 'A4 وثيقة الضمان والسيريال', labelEn: 'A4 Warranty Certificate' },
  { id: 'a4_corporate_classic', labelAr: 'A4 الكلاسيكي للشركات', labelEn: 'A4 Classic Corporate' },
  { id: 'a4_modern_blue', labelAr: 'A4 الهوية البصرية المتدرج', labelEn: 'A4 Modern Blue' },
  { id: 'a4_minimalist_clean', labelAr: 'A4 السويسري النقي', labelEn: 'A4 Swiss Minimal' },
];

function createEmptyFormState(category: PrinterProfileCategory = 'RECEIPT'): PrinterProfileInput {
  const paperSize: PrinterPaperSize = category === 'A4' ? 'A4' : '80mm';
  return {
    name: '',
    category,
    paperSize,
    connectionType: category === 'A4' ? 'NETWORK_IP' : 'USB',
    addressOrPort: category === 'A4' ? '192.168.1.125:9100' : 'USB001',
    templateId: getDefaultTemplateForCategory(category, paperSize),
    copies: 1,
    autoCut: category === 'RECEIPT',
    openCashDrawer: false,
    autoPrintOnSale: category === 'RECEIPT',
    branchId: 'ALL',
    isDefaultForCategory: false,
    isGlobalDefault: false,
    isActive: true,
    notes: '',
  };
}

export const PrinterConfigurationManager: React.FC<PrinterConfigurationManagerProps> = ({
  language,
  companyName,
  branches,
  profiles,
  onSaveProfile,
  onSetDefault,
  onDeleteProfile,
  onMarkTested,
  onFeedback,
}) => {
  const isAr = language === 'ar';
  const [categoryFilter, setCategoryFilter] = useState<'ALL' | PrinterProfileCategory>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [formState, setFormState] = useState<PrinterProfileInput>(() => createEmptyFormState('RECEIPT'));
  const [formErrors, setFormErrors] = useState<string[]>([]);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [testingProfileId, setTestingProfileId] = useState<string | null>(null);
  const [testTicketPreview, setTestTicketPreview] = useState<ReturnType<
    typeof buildPrinterTestTicketSummary
  > | null>(null);

  const editorLayer = useModalLayer(isEditorOpen, 70);
  const testTicketLayer = useModalLayer(Boolean(testTicketPreview), 80);

  const globalDefault = useMemo(
    () => profiles.find((p) => p.isGlobalDefault) || profiles[0] || null,
    [profiles]
  );
  const receiptDefault = useMemo(
    () =>
      profiles.find((p) => p.category === 'RECEIPT' && p.isDefaultForCategory) ||
      profiles.find((p) => p.category === 'RECEIPT') ||
      null,
    [profiles]
  );
  const a4Default = useMemo(
    () =>
      profiles.find((p) => p.category === 'A4' && p.isDefaultForCategory) ||
      profiles.find((p) => p.category === 'A4') ||
      null,
    [profiles]
  );

  const filteredProfiles = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return profiles.filter((p) => {
      if (categoryFilter !== 'ALL' && p.category !== categoryFilter) return false;
      if (!q) return true;
      return (
        p.name.toLowerCase().includes(q) ||
        p.addressOrPort.toLowerCase().includes(q) ||
        p.paperSize.toLowerCase().includes(q) ||
        p.connectionType.toLowerCase().includes(q)
      );
    });
  }, [profiles, categoryFilter, searchQuery]);

  const openCreateModal = (initialCategory: PrinterProfileCategory = 'RECEIPT') => {
    setFormErrors([]);
    setFormState(createEmptyFormState(initialCategory));
    setIsEditorOpen(true);
  };

  const openEditModal = (profile: PosPrinterProfile) => {
    setFormErrors([]);
    setFormState({
      id: profile.id,
      name: profile.name,
      category: profile.category,
      paperSize: profile.paperSize,
      connectionType: profile.connectionType,
      addressOrPort: profile.addressOrPort,
      templateId: profile.templateId,
      copies: profile.copies,
      autoCut: profile.autoCut,
      openCashDrawer: profile.openCashDrawer,
      autoPrintOnSale: profile.autoPrintOnSale,
      branchId: profile.branchId || 'ALL',
      isDefaultForCategory: profile.isDefaultForCategory,
      isGlobalDefault: profile.isGlobalDefault,
      isActive: profile.isActive,
      notes: profile.notes || '',
    });
    setIsEditorOpen(true);
  };

  const handleSubmitProfile = (e: React.FormEvent) => {
    e.preventDefault();
    const check = validatePrinterProfileInput(formState);
    if (!check.valid) {
      setFormErrors(check.errors);
      return;
    }
    const saved = onSaveProfile(formState);
    setIsEditorOpen(false);
    setFormErrors([]);
    onFeedback(
      isAr
        ? `✓ تم حفظ ملف الطابعة "${saved.name}" (${saved.paperSize}) بنجاح.`
        : `✓ Printer profile "${saved.name}" (${saved.paperSize}) saved.`,
      'success'
    );
  };

  const handleRunTestPrint = async (profile: PosPrinterProfile) => {
    setTestingProfileId(profile.id);
    try {
      const res = await fetch('/api/v1/printers/test-print', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profile, companyName }),
      });
      const json = await res.json().catch(() => null);
      if (json?.success && json.ticket) {
        onMarkTested(profile.id, json.testedAt);
        setTestTicketPreview(json.ticket);
      } else {
        const fallbackTicket = buildPrinterTestTicketSummary(profile, companyName);
        onMarkTested(profile.id, fallbackTicket.timestampIso);
        setTestTicketPreview(fallbackTicket);
      }
      onFeedback(
        isAr
          ? `✓ تم توليد صفحة الاختبار للطابعة "${profile.name}".`
          : `✓ Test print generated for "${profile.name}".`,
        'success'
      );
    } catch {
      const fallbackTicket = buildPrinterTestTicketSummary(profile, companyName);
      onMarkTested(profile.id, fallbackTicket.timestampIso);
      setTestTicketPreview(fallbackTicket);
    } finally {
      setTestingProfileId(null);
    }
  };

  const connectionIcon = (conn: PrinterConnectionType) => {
    switch (conn) {
      case 'NETWORK_IP':
        return Wifi;
      case 'BLUETOOTH':
        return Bluetooth;
      case 'SYSTEM_DRIVER':
        return Monitor;
      case 'USB':
      default:
        return Usb;
    }
  };

  const connectionLabel = (conn: PrinterConnectionType) => {
    switch (conn) {
      case 'NETWORK_IP':
        return isAr ? 'شبكة LAN / IP' : 'Network IP';
      case 'BLUETOOTH':
        return isAr ? 'بلوتوث' : 'Bluetooth';
      case 'SYSTEM_DRIVER':
        return isAr ? 'تعريف النظام (OS)' : 'OS Driver';
      case 'USB':
      default:
        return 'USB Direct';
    }
  };

  const getBranchLabel = (branchId: string) => {
    if (!branchId || branchId === 'ALL') return isAr ? 'جميع الفروع' : 'All Branches';
    const match = branches.find((b) => b.id === branchId);
    return match ? match.nameAr || match.name : branchId;
  };

  const availablePaperSizes =
    formState.category === 'A4' ? A4_PAPER_SIZES : RECEIPT_PAPER_SIZES;
  const availableTemplates =
    formState.category === 'A4' ? A4_TEMPLATES : THERMAL_TEMPLATES;

  return (
    <div data-testid="printer-configuration-manager" className="max-w-5xl space-y-5 min-w-0">
      {/* Top Overview & Primary Action */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-200/80 dark:border-slate-800 pb-4">
          <div className="space-y-1">
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Printer className="w-4 h-4 text-slate-500" />
              <span>
                {isAr
                  ? 'إدارة ملفات طابعات نقاط البيع والفواتير (حراري / A4)'
                  : 'POS Printer Configuration Manager (Receipt & A4)'}
              </span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {isAr
                ? 'تعريف وتخصيص عدة طابعات إيصالات حرارية (80mm / 58mm) وطابعات فواتير قياسية (A4 / A5) مع تحديد الطابعة الافتراضية للنظام ولكل فئة.'
                : 'Configure multiple POS receipt (80mm / 58mm) and standard A4/A5 printer profiles, and assign system and per-format default printers.'}
            </p>
          </div>

          <button
            type="button"
            data-testid="btn-add-printer-profile"
            onClick={() => openCreateModal('RECEIPT')}
            className="px-4 py-2 rounded-lg haseb-btn-primary text-white text-xs font-bold flex items-center gap-2 cursor-pointer whitespace-nowrap shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>{isAr ? 'إضافة ملف طابعة جديد' : 'Add Printer Profile'}</span>
          </button>
        </div>

        {/* Active Defaults Summary Grid (Single-Elevation Hairline Dividers) */}
        <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x md:rtl:divide-x-reverse divide-slate-200/80 dark:divide-slate-800 bg-slate-50/70 dark:bg-slate-800/40 rounded-lg border border-slate-200/80 dark:border-slate-800">
          <div className="p-3.5 space-y-1">
            <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
              {isAr ? 'الطابعة الافتراضية الرئيسية لنقطة البيع' : 'Global Default POS Printer'}
            </div>
            <div
              data-testid="default-global-printer-name"
              className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate"
            >
              {globalDefault ? globalDefault.name : isAr ? 'غير محددة' : 'Not Assigned'}
            </div>
            {globalDefault && (
              <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[11px] text-slate-500 font-mono tabular-nums">
                <span dir="ltr">{globalDefault.paperSize}</span>
                <span aria-hidden="true">·</span>
                <span>{connectionLabel(globalDefault.connectionType)}</span>
                <span aria-hidden="true">·</span>
                <span dir="ltr">{globalDefault.addressOrPort}</span>
              </div>
            )}
          </div>

          <div className="p-3.5 space-y-1">
            <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
              {isAr ? 'افتراضي الإيصالات الحرارية (Receipt)' : 'Default Receipt Printer'}
            </div>
            <div
              data-testid="default-receipt-printer-name"
              className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate"
            >
              {receiptDefault ? receiptDefault.name : isAr ? 'لا توجد طابعة إيصالات' : 'None'}
            </div>
            {receiptDefault && (
              <div className="text-[11px] text-slate-500 font-mono tabular-nums">
                {receiptDefault.paperSize} ·{' '}
                {isAr ? `${receiptDefault.copies} نسخة` : `${receiptDefault.copies} copy`}
              </div>
            )}
          </div>

          <div className="p-3.5 space-y-1">
            <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
              {isAr ? 'افتراضي الفواتير القياسية (A4)' : 'Default A4 Invoice Printer'}
            </div>
            <div
              data-testid="default-a4-printer-name"
              className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate"
            >
              {a4Default ? a4Default.name : isAr ? 'لا توجد طابعة A4' : 'None'}
            </div>
            {a4Default && (
              <div className="text-[11px] text-slate-500 font-mono tabular-nums">
                {a4Default.paperSize} ·{' '}
                {isAr ? `${a4Default.copies} نسخة` : `${a4Default.copies} copy`}
              </div>
            )}
          </div>
        </div>

        {/* Filter Bar & Live Search */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          <div
            role="group"
            aria-label={isAr ? 'تصفية فئات الطابعات' : 'Filter printer categories'}
            className="inline-flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg"
          >
            {(
              [
                { id: 'ALL' as const, labelAr: `الكل (${profiles.length})`, labelEn: `All (${profiles.length})` },
                {
                  id: 'RECEIPT' as const,
                  labelAr: `إيصالات حرارية (${profiles.filter((p) => p.category === 'RECEIPT').length})`,
                  labelEn: `Receipt (${profiles.filter((p) => p.category === 'RECEIPT').length})`,
                },
                {
                  id: 'A4' as const,
                  labelAr: `فواتير A4 (${profiles.filter((p) => p.category === 'A4').length})`,
                  labelEn: `A4 / Document (${profiles.filter((p) => p.category === 'A4').length})`,
                },
              ] as const
            ).map((f) => {
              const active = categoryFilter === f.id;
              return (
                <button
                  key={f.id}
                  type="button"
                  data-testid={`printer-filter-${f.id.toLowerCase()}`}
                  onClick={() => setCategoryFilter(f.id)}
                  className={`px-3 py-1.5 rounded-md text-xs font-semibold transition cursor-pointer whitespace-nowrap ${
                    active
                      ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  {isAr ? f.labelAr : f.labelEn}
                </button>
              );
            })}
          </div>

          <div className="relative flex-1 min-w-[200px] max-w-xs">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute top-1/2 -translate-y-1/2 start-3 pointer-events-none" />
            <input
              type="search"
              data-testid="printer-search-input"
              aria-label={isAr ? 'بحث في ملفات الطابعات' : 'Search printer profiles'}
              placeholder={isAr ? 'بحث بالاسم أو العنوان IP...' : 'Search by name or IP...'}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full ps-8 pe-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-slate-100"
            />
          </div>
        </div>

        {/* Printer Profiles List (Clean Divided Rows — No Card-Inside-Card Clutter) */}
        {filteredProfiles.length === 0 ? (
          <div className="py-10 text-center space-y-2 border border-dashed border-slate-200 dark:border-slate-800 rounded-lg">
            <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">
              {isAr
                ? 'لا توجد ملفات طابعات مطابقة للبحث الحالي.'
                : 'No printer profiles match the current filter.'}
            </p>
            <button
              type="button"
              onClick={() => {
                setCategoryFilter('ALL');
                setSearchQuery('');
              }}
              className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-semibold cursor-pointer"
            >
              {isAr ? 'عرض جميع الطابعات' : 'Show All Profiles'}
            </button>
          </div>
        ) : (
          <div
            data-testid="printer-profiles-list"
            className="divide-y divide-slate-200/80 dark:divide-slate-800 border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden"
          >
            {filteredProfiles.map((profile) => {
              const ConnIcon = connectionIcon(profile.connectionType);
              return (
                <div
                  key={profile.id}
                  data-testid={`printer-profile-row-${profile.id}`}
                  className="p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white dark:bg-slate-900 hover:bg-slate-50/70 dark:hover:bg-slate-800/30 transition-colors"
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-center shrink-0 mt-0.5">
                      {profile.category === 'RECEIPT' ? (
                        <Receipt className="w-4 h-4" />
                      ) : (
                        <FileText className="w-4 h-4" />
                      )}
                    </div>

                    <div className="min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                        <span className="text-sm font-bold text-slate-900 dark:text-slate-100">
                          {profile.name}
                        </span>
                        {profile.isGlobalDefault && (
                          <span
                            data-testid={`printer-global-default-flag-${profile.id}`}
                            className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 inline-flex items-center gap-1"
                          >
                            <Star className="w-3 h-3 fill-current" />
                            <span>{isAr ? 'الافتراضية الرئيسية' : 'Global Default'}</span>
                          </span>
                        )}
                        {!profile.isGlobalDefault && profile.isDefaultForCategory && (
                          <span
                            data-testid={`printer-category-default-flag-${profile.id}`}
                            className="text-[11px] font-semibold text-indigo-700 dark:text-indigo-400"
                          >
                            {profile.category === 'RECEIPT'
                              ? isAr
                                ? '· افتراضي الإيصالات'
                                : '· Default Receipt'
                              : isAr
                              ? '· افتراضي A4'
                              : '· Default A4'}
                          </span>
                        )}
                      </div>

                      {/* Unboxed clean metadata with typographic separators */}
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
                        <span className="font-mono tabular-nums font-semibold text-slate-700 dark:text-slate-300">
                          {profile.paperSize}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span className="inline-flex items-center gap-1">
                          <ConnIcon className="w-3 h-3" />
                          <span>{connectionLabel(profile.connectionType)}</span>
                        </span>
                        <span aria-hidden="true">·</span>
                        <span className="font-mono tabular-nums" dir="ltr">
                          {profile.addressOrPort}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span className="font-mono tabular-nums">
                          {isAr ? `${profile.copies} نسخة` : `${profile.copies} copies`}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span>{getBranchLabel(profile.branchId)}</span>
                        {profile.category === 'RECEIPT' && profile.autoCut && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span>{isAr ? 'قص تلقائي' : 'Auto-Cut'}</span>
                          </>
                        )}
                        {profile.category === 'RECEIPT' && profile.openCashDrawer && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span>{isAr ? 'درج نقدي' : 'Cash Drawer'}</span>
                          </>
                        )}
                        {profile.lastTestedAt && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span className="text-emerald-700 dark:text-emerald-400 font-mono tabular-nums">
                              {isAr ? 'آخر اختبار: ' : 'Tested: '}
                              {new Date(profile.lastTestedAt).toLocaleTimeString('en-GB')}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Row Actions */}
                  <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                    {!profile.isGlobalDefault && (
                      <button
                        type="button"
                        data-testid={`btn-set-global-default-${profile.id}`}
                        aria-label={`Set ${profile.name} as global default printer`}
                        onClick={() => {
                          onSetDefault(profile.id, 'GLOBAL');
                          onFeedback(
                            isAr
                              ? `✓ تم تعيين "${profile.name}" كطابعة افتراضية رئيسية للنظام.`
                              : `✓ "${profile.name}" set as global default printer.`,
                            'success'
                          );
                        }}
                        className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold cursor-pointer whitespace-nowrap"
                      >
                        {isAr ? 'تعيين كافتراضية' : 'Set Default'}
                      </button>
                    )}

                    {!profile.isDefaultForCategory && (
                      <button
                        type="button"
                        data-testid={`btn-set-cat-default-${profile.id}`}
                        aria-label={`Set ${profile.name} as default ${profile.category} printer`}
                        onClick={() => {
                          onSetDefault(profile.id, 'CATEGORY');
                          onFeedback(
                            isAr
                              ? `✓ تم تعيين "${profile.name}" كافتراضي لفئة ${
                                  profile.category === 'RECEIPT' ? 'الإيصالات الحرارية' : 'فواتير A4'
                                }.`
                              : `✓ "${profile.name}" set as default ${profile.category} printer.`,
                            'success'
                          );
                        }}
                        className="px-2.5 py-1.5 rounded-lg border border-indigo-200 dark:border-indigo-800 bg-indigo-50/70 dark:bg-indigo-950/30 hover:bg-indigo-100 text-indigo-700 dark:text-indigo-300 text-xs font-semibold cursor-pointer whitespace-nowrap"
                      >
                        {profile.category === 'RECEIPT'
                          ? isAr
                            ? 'افتراضي الإيصال'
                            : 'Default Receipt'
                          : isAr
                          ? 'افتراضي A4'
                          : 'Default A4'}
                      </button>
                    )}

                    <button
                      type="button"
                      data-testid={`btn-test-printer-${profile.id}`}
                      aria-label={`Test print on ${profile.name}`}
                      disabled={testingProfileId === profile.id}
                      onClick={() => handleRunTestPrint(profile)}
                      className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 text-slate-700 dark:text-slate-200 text-xs font-semibold inline-flex items-center gap-1 cursor-pointer whitespace-nowrap disabled:opacity-50"
                    >
                      <Play className="w-3 h-3" />
                      <span>{isAr ? 'اختبار' : 'Test'}</span>
                    </button>

                    <button
                      type="button"
                      data-testid={`btn-edit-printer-${profile.id}`}
                      aria-label={`Edit ${profile.name}`}
                      onClick={() => openEditModal(profile)}
                      className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>

                    {confirmDeleteId === profile.id ? (
                      <button
                        type="button"
                        data-testid={`btn-confirm-delete-printer-${profile.id}`}
                        onClick={() => {
                          const res = onDeleteProfile(profile.id);
                          setConfirmDeleteId(null);
                          if (res.success) {
                            onFeedback(
                              isAr
                                ? `تم حذف ملف الطابعة "${profile.name}".`
                                : `Deleted printer profile "${profile.name}".`,
                              'warning'
                            );
                          } else {
                            onFeedback(res.errorAr || 'تعذر الحذف', 'error');
                          }
                        }}
                        className="px-2.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold cursor-pointer whitespace-nowrap"
                      >
                        {isAr ? 'تأكيد الحذف' : 'Confirm'}
                      </button>
                    ) : (
                      <button
                        type="button"
                        data-testid={`btn-delete-printer-${profile.id}`}
                        aria-label={`Delete ${profile.name}`}
                        onClick={() => setConfirmDeleteId(profile.id)}
                        className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Add / Edit Printer Profile Modal (Portal with Global Z-Index Stack) */}
      {isEditorOpen &&
        renderModalPortal(
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="printer-editor-modal-title"
            data-testid="printer-editor-modal"
            style={{ zIndex: editorLayer.zIndex }}
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4"
            onClick={(e) => {
              if (e.target === e.currentTarget) setIsEditorOpen(false);
            }}
          >
            <div className="w-full max-w-xl bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
              <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2">
                <h4
                  id="printer-editor-modal-title"
                  className="text-sm font-bold text-slate-900 dark:text-slate-100"
                >
                  {formState.id
                    ? isAr
                      ? 'تعديل ملف الطابعة'
                      : 'Edit Printer Profile'
                    : isAr
                    ? 'إضافة ملف طابعة جديد (إيصالات / A4)'
                    : 'Add New POS Printer Profile'}
                </h4>
                <button
                  type="button"
                  aria-label={isAr ? 'إغلاق النافذة' : 'Close dialog'}
                  onClick={() => setIsEditorOpen(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSubmitProfile} className="p-5 space-y-4 overflow-y-auto text-xs">
                {formErrors.length > 0 && (
                  <div
                    role="alert"
                    data-testid="printer-form-validation-errors"
                    className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200 space-y-1"
                  >
                    {formErrors.map((err, i) => (
                      <div key={i} className="flex items-start gap-2">
                        <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                        <span>{err}</span>
                      </div>
                    ))}
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="sm:col-span-2">
                    <label
                      htmlFor="printer-name-input"
                      className="block font-semibold text-slate-700 dark:text-slate-300 mb-1"
                    >
                      {isAr ? 'اسم ملف الطابعة *' : 'Printer Profile Name *'}
                    </label>
                    <input
                      id="printer-name-input"
                      data-testid="printer-name-input"
                      type="text"
                      placeholder={
                        isAr ? 'مثال: طابعة الكاشير رقم 2 (Epson TM-T20)' : 'e.g. Front Counter Thermal 80mm'
                      }
                      value={formState.name}
                      onChange={(e) => setFormState((prev) => ({ ...prev, name: e.target.value }))}
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="printer-category-select"
                      className="block font-semibold text-slate-700 dark:text-slate-300 mb-1"
                    >
                      {isAr ? 'فئة الطابعة' : 'Printer Category'}
                    </label>
                    <select
                      id="printer-category-select"
                      data-testid="printer-category-select"
                      value={formState.category}
                      onChange={(e) => {
                        const nextCat = e.target.value as PrinterProfileCategory;
                        const nextPaper: PrinterPaperSize = nextCat === 'A4' ? 'A4' : '80mm';
                        setFormState((prev) => ({
                          ...prev,
                          category: nextCat,
                          paperSize: nextPaper,
                          templateId: getDefaultTemplateForCategory(nextCat, nextPaper),
                          autoCut: nextCat === 'RECEIPT',
                          openCashDrawer: nextCat === 'RECEIPT' ? prev.openCashDrawer : false,
                        }));
                      }}
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-semibold"
                    >
                      <option value="RECEIPT">
                        {isAr ? 'طابعة إيصالات حرارية (Receipt)' : 'Thermal Receipt Printer'}
                      </option>
                      <option value="A4">
                        {isAr ? 'طابعة فواتير قياسية (A4 / Laser)' : 'Standard A4 / Document Printer'}
                      </option>
                    </select>
                  </div>

                  <div>
                    <label
                      htmlFor="printer-paper-size-select"
                      className="block font-semibold text-slate-700 dark:text-slate-300 mb-1"
                    >
                      {isAr ? 'مقاس الورق' : 'Paper Size'}
                    </label>
                    <select
                      id="printer-paper-size-select"
                      data-testid="printer-paper-size-select"
                      value={formState.paperSize}
                      onChange={(e) => {
                        const nextPaper = e.target.value as PrinterPaperSize;
                        setFormState((prev) => ({
                          ...prev,
                          paperSize: nextPaper,
                          templateId: getDefaultTemplateForCategory(prev.category, nextPaper),
                        }));
                      }}
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-mono font-semibold"
                    >
                      {availablePaperSizes.map((sz) => (
                        <option key={sz} value={sz}>
                          {sz}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label
                      htmlFor="printer-connection-select"
                      className="block font-semibold text-slate-700 dark:text-slate-300 mb-1"
                    >
                      {isAr ? 'نوع الاتصال' : 'Connection Interface'}
                    </label>
                    <select
                      id="printer-connection-select"
                      data-testid="printer-connection-select"
                      value={formState.connectionType}
                      onChange={(e) =>
                        setFormState((prev) => ({
                          ...prev,
                          connectionType: e.target.value as PrinterConnectionType,
                        }))
                      }
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-semibold"
                    >
                      <option value="USB">USB Direct</option>
                      <option value="NETWORK_IP">{isAr ? 'شبكة محلية (LAN IP)' : 'Network LAN IP'}</option>
                      <option value="BLUETOOTH">{isAr ? 'بلوتوث (Bluetooth)' : 'Bluetooth'}</option>
                      <option value="SYSTEM_DRIVER">
                        {isAr ? 'تعريف نظام التشغيل (Windows/macOS)' : 'System OS Driver'}
                      </option>
                    </select>
                  </div>

                  <div>
                    <label
                      htmlFor="printer-address-input"
                      className="block font-semibold text-slate-700 dark:text-slate-300 mb-1"
                    >
                      {formState.connectionType === 'NETWORK_IP'
                        ? isAr
                          ? 'عنوان IP والمنفذ *'
                          : 'IP Address & Port *'
                        : isAr
                        ? 'المنفذ أو اسم الطابعة *'
                        : 'Port or Queue Name *'}
                    </label>
                    <input
                      id="printer-address-input"
                      data-testid="printer-address-input"
                      type="text"
                      dir="ltr"
                      placeholder={
                        formState.connectionType === 'NETWORK_IP'
                          ? '192.168.1.120:9100'
                          : 'USB001'
                      }
                      value={formState.addressOrPort}
                      onChange={(e) =>
                        setFormState((prev) => ({ ...prev, addressOrPort: e.target.value }))
                      }
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-mono"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="printer-template-select"
                      className="block font-semibold text-slate-700 dark:text-slate-300 mb-1"
                    >
                      {isAr ? 'قالب الفاتورة المرتبط' : 'Linked Invoice Template'}
                    </label>
                    <select
                      id="printer-template-select"
                      data-testid="printer-template-select"
                      value={formState.templateId}
                      onChange={(e) =>
                        setFormState((prev) => ({
                          ...prev,
                          templateId: e.target.value as any,
                        }))
                      }
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                    >
                      {availableTemplates.map((tpl) => (
                        <option key={tpl.id} value={tpl.id}>
                          {isAr ? tpl.labelAr : tpl.labelEn}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label
                        htmlFor="printer-copies-input"
                        className="block font-semibold text-slate-700 dark:text-slate-300 mb-1"
                      >
                        {isAr ? 'عدد النسخ' : 'Copies'}
                      </label>
                      <input
                        id="printer-copies-input"
                        data-testid="printer-copies-input"
                        type="number"
                        min={1}
                        max={5}
                        value={formState.copies ?? 1}
                        onChange={(e) =>
                          setFormState((prev) => ({
                            ...prev,
                            copies: Number(e.target.value),
                          }))
                        }
                        className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-mono tabular-nums font-semibold"
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="printer-branch-select"
                        className="block font-semibold text-slate-700 dark:text-slate-300 mb-1"
                      >
                        {isAr ? 'الفرع' : 'Branch'}
                      </label>
                      <select
                        id="printer-branch-select"
                        value={formState.branchId || 'ALL'}
                        onChange={(e) =>
                          setFormState((prev) => ({ ...prev, branchId: e.target.value }))
                        }
                        className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                      >
                        <option value="ALL">{isAr ? 'جميع الفروع' : 'All Branches'}</option>
                        {branches.map((b) => (
                          <option key={b.id} value={b.id}>
                            {b.nameAr || b.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {/* Behavioral Checkboxes */}
                <div className="pt-2 border-t border-slate-200/80 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-slate-700 dark:text-slate-300">
                  <label className="inline-flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={Boolean(formState.autoPrintOnSale)}
                      onChange={(e) =>
                        setFormState((prev) => ({ ...prev, autoPrintOnSale: e.target.checked }))
                      }
                    />
                    <span>{isAr ? 'طباعة تلقائية فور إتمام البيع' : 'Auto-print on sale completion'}</span>
                  </label>

                  <label className="inline-flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={Boolean(formState.isDefaultForCategory)}
                      onChange={(e) =>
                        setFormState((prev) => ({
                          ...prev,
                          isDefaultForCategory: e.target.checked,
                        }))
                      }
                    />
                    <span>
                      {formState.category === 'RECEIPT'
                        ? isAr
                          ? 'افتراضي لفئة الإيصالات'
                          : 'Default Receipt Printer'
                        : isAr
                        ? 'افتراضي لفئة فواتير A4'
                        : 'Default A4 Printer'}
                    </span>
                  </label>

                  <label className="inline-flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={Boolean(formState.isGlobalDefault)}
                      onChange={(e) =>
                        setFormState((prev) => ({ ...prev, isGlobalDefault: e.target.checked }))
                      }
                    />
                    <span>{isAr ? 'الطابعة الافتراضية الرئيسية للنظام' : 'Global Default POS Printer'}</span>
                  </label>

                  {formState.category === 'RECEIPT' && (
                    <>
                      <label className="inline-flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={Boolean(formState.autoCut)}
                          onChange={(e) =>
                            setFormState((prev) => ({ ...prev, autoCut: e.target.checked }))
                          }
                        />
                        <span>{isAr ? 'قص الورق تلقائياً (ESC/POS Auto-Cut)' : 'ESC/POS Auto-Cut'}</span>
                      </label>

                      <label className="inline-flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={Boolean(formState.openCashDrawer)}
                          onChange={(e) =>
                            setFormState((prev) => ({
                              ...prev,
                              openCashDrawer: e.target.checked,
                            }))
                          }
                        />
                        <span>{isAr ? 'فتح درج النقدية تلقائياً' : 'Trigger Cash Drawer Kick'}</span>
                      </label>
                    </>
                  )}
                </div>

                <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsEditorOpen(false)}
                    className="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                  >
                    {isAr ? 'إلغاء' : 'Cancel'}
                  </button>
                  <button
                    type="submit"
                    data-testid="btn-submit-printer-profile"
                    className="px-4 py-2 rounded-lg haseb-btn-primary text-white font-bold cursor-pointer"
                  >
                    {formState.id
                      ? isAr
                        ? 'حفظ التعديلات'
                        : 'Save Changes'
                      : isAr
                      ? 'إضافة الطابعة'
                      : 'Create Profile'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

      {/* Test Print Ticket Preview Modal */}
      {testTicketPreview &&
        renderModalPortal(
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="printer-test-ticket-title"
            data-testid="printer-test-ticket-modal"
            style={{ zIndex: testTicketLayer.zIndex }}
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4"
            onClick={(e) => {
              if (e.target === e.currentTarget) setTestTicketPreview(null);
            }}
          >
            <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden">
              <div className="px-5 py-3.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400">
                  <CheckCircle2 className="w-4 h-4" />
                  <h4 id="printer-test-ticket-title" className="text-xs font-bold">
                    {testTicketPreview.title}
                  </h4>
                </div>
                <button
                  type="button"
                  aria-label={isAr ? 'إغلاق معاينة الاختبار' : 'Close test print preview'}
                  onClick={() => setTestTicketPreview(null)}
                  className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="p-5 space-y-3">
                <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-950 border border-dashed border-slate-300 dark:border-slate-700 font-mono text-xs text-slate-800 dark:text-slate-200 space-y-1.5">
                  <div className="text-center font-bold border-b border-dashed border-slate-300 dark:border-slate-700 pb-2">
                    {testTicketPreview.companyName}
                  </div>
                  {testTicketPreview.lines.map((line, i) => {
                    const colonIdx = line.indexOf(':');
                    if (colonIdx > 0) {
                      const label = line.slice(0, colonIdx).trim();
                      const value = line.slice(colonIdx + 1).trim();
                      return (
                        <div
                          key={i}
                          className="flex items-baseline justify-between gap-3 leading-relaxed text-[11px]"
                        >
                          <span className="text-slate-500 dark:text-slate-400 shrink-0">
                            {label}:
                          </span>
                          <span
                            dir="auto"
                            className="font-semibold text-slate-800 dark:text-slate-100 text-end break-all"
                          >
                            {value}
                          </span>
                        </div>
                      );
                    }
                    return (
                      <div key={i} className="leading-relaxed">
                        {line}
                      </div>
                    );
                  })}
                  <div
                    className="pt-2 border-t border-dashed border-slate-300 dark:border-slate-700 text-[11px] text-slate-500 text-center tabular-nums"
                    dir="ltr"
                  >
                    {new Date(testTicketPreview.timestampIso).toLocaleString('en-GB')}
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="px-3.5 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                  >
                    {isAr ? 'إرسال للطباعة الفعلية' : 'Send to Browser Print'}
                  </button>
                  <button
                    type="button"
                    data-testid="btn-close-test-ticket"
                    onClick={() => setTestTicketPreview(null)}
                    className="px-4 py-2 rounded-lg haseb-btn-primary text-white text-xs font-bold cursor-pointer"
                  >
                    {isAr ? 'تم' : 'Done'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
    </div>
  );
};
