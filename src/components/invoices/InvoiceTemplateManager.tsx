import React, { useState, useMemo } from 'react';
import {
  LayoutGrid,
  GripVertical,
  ArrowUp,
  ArrowDown,
  Plus,
  Copy,
  Save,
  Check,
  Trash2,
  Eye,
  Printer,
  FileText,
  Receipt,
  RotateCcw,
  X,
  Sliders,
} from 'lucide-react';
import { useERP } from '../../context/ERPContext';
import {
  SalesInvoice,
  StandardInvoiceTemplateType,
  ThermalTemplateType,
} from '../../types/erp';
import {
  BUILTIN_CUSTOM_INVOICE_LAYOUT_LIBRARY,
  CustomInvoiceLayoutTemplate,
  CustomInvoiceGridZone,
  InvoiceLayoutFormat,
  InvoiceLayoutZoneId,
  InvoiceTableHeaderStyle,
  InvoiceSpacingDensity,
  reorderCustomInvoiceZones,
  moveInvoiceZoneByDirection,
  toggleInvoiceZoneVisibility,
  updateInvoiceZoneSpan,
  duplicateCustomInvoiceTemplate,
  createBlankCustomInvoiceTemplate,
  upsertCustomInvoiceLayout,
  deleteCustomInvoiceLayout,
  resolveEffectiveZones,
} from '../../core/invoiceTemplateLayoutEngine';
import { InvoiceRenderer } from './InvoiceRenderer';

export interface InvoiceTemplateManagerProps {
  sampleInvoice?: SalesInvoice;
  isModal?: boolean;
  onClose?: () => void;
  onApplied?: (template: CustomInvoiceLayoutTemplate) => void;
}

export const InvoiceTemplateManager: React.FC<InvoiceTemplateManagerProps> = ({
  sampleInvoice: externalSampleInvoice,
  isModal = false,
  onClose,
  onApplied,
}) => {
  const {
    salesInvoices,
    invoiceTemplateSettings,
    updateInvoiceTemplateSettings,
    company,
    currentTenant,
    currentBranch,
    currency,
    activeIndustry,
    dispatchToastAndPushNotification,
  } = useERP();

  const savedCustomLayouts = invoiceTemplateSettings.savedCustomLayouts || [];
  const allLibraryTemplates = useMemo(
    () => [...savedCustomLayouts, ...BUILTIN_CUSTOM_INVOICE_LAYOUT_LIBRARY],
    [savedCustomLayouts]
  );

  const initialDraft: CustomInvoiceLayoutTemplate = useMemo(() => {
    if (invoiceTemplateSettings.activeCustomLayout) {
      return {
        ...invoiceTemplateSettings.activeCustomLayout,
        zones: resolveEffectiveZones(invoiceTemplateSettings.activeCustomLayout.zones),
      };
    }
    return {
      ...BUILTIN_CUSTOM_INVOICE_LAYOUT_LIBRARY[0],
      zones: resolveEffectiveZones(BUILTIN_CUSTOM_INVOICE_LAYOUT_LIBRARY[0].zones),
    };
  }, [invoiceTemplateSettings.activeCustomLayout]);

  const [draft, setDraft] = useState<CustomInvoiceLayoutTemplate>(initialDraft);
  const [libraryFilter, setLibraryFilter] = useState<'ALL' | 'A4' | 'THERMAL'>('ALL');
  const [editorSubTab, setEditorSubTab] = useState<'zones' | 'style' | 'content'>('zones');
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const previewInvoice: SalesInvoice = useMemo(() => {
    if (externalSampleInvoice && externalSampleInvoice.id) return externalSampleInvoice;
    if (salesInvoices[0]) return salesInvoices[0];
    return {
      id: 'inv-preview-demo',
      tenantId: currentTenant.id,
      invoiceNumber: 'INV-2026-0142',
      customerId: 'cust-demo',
      customerName: 'شركة الرواد للتجارة والطاقة الحديثة',
      customerPhone: '+967 771 234 567',
      branchId: currentBranch.id,
      date: new Date().toISOString().slice(0, 10),
      subtotal: 6400,
      discountAmount: 200,
      taxAmount: 0,
      grandTotal: 6200,
      paidAmount: 6200,
      remainingAmount: 0,
      paymentMethod: 'CARD',
      status: 'PAID',
      qrData: 'DEMO-QR',
      industryMode: activeIndustry,
      items: [
        {
          productId: 'p1',
          sku: 'INV-DEYE-8K',
          productName: 'عاكس طاقة شمسية هجين Deye 8kW MPPT',
          quantity: 1,
          unitPrice: 4400,
          discount: 0,
          taxRate: 0,
          taxAmount: 0,
          total: 4400,
          serialNumber: 'SN-DEYE-88420',
          warrantyMonths: 36,
        },
        {
          productId: 'p2',
          sku: 'SOLAR-585W',
          productName: 'لوح شمسي أحادي البلورة 585W Tier-1',
          quantity: 4,
          unitPrice: 500,
          discount: 200,
          taxRate: 0,
          taxAmount: 0,
          total: 1800,
          warrantyMonths: 120,
        },
      ],
    };
  }, [externalSampleInvoice, salesInvoices, currentTenant.id, currentBranch.id, activeIndustry]);

  const filteredTemplates = useMemo(() => {
    return allLibraryTemplates.filter((t) => {
      if (libraryFilter === 'A4') return t.format === 'a4';
      if (libraryFilter === 'THERMAL') return t.format !== 'a4';
      return true;
    });
  }, [allLibraryTemplates, libraryFilter]);

  const showNotice = (msg: string) => {
    setStatusMessage(msg);
    setTimeout(() => setStatusMessage(null), 4000);
    dispatchToastAndPushNotification({
      titleAr: 'مدير قوالب الفواتير',
      titleEn: 'Invoice Template Manager',
      messageAr: msg,
      messageEn: msg,
      severity: 'success',
      category: 'LIVE_EVENTS',
    });
  };

  const handleSelectLibraryTemplate = (tpl: CustomInvoiceLayoutTemplate) => {
    setDraft({
      ...tpl,
      zones: resolveEffectiveZones(tpl.zones),
    });
  };

  const handleCreateNew = (format: InvoiceLayoutFormat) => {
    const fresh = createBlankCustomInvoiceTemplate(format);
    setDraft(fresh);
    setEditorSubTab('zones');
    showNotice(`تم إنشاء مسودة قالب جديد (${format === 'a4' ? 'A4' : format === 'thermal_58mm' ? '58mm' : '80mm'}) جاهز للتخصيص.`);
  };

  const handleDuplicateCurrent = () => {
    const dup = duplicateCustomInvoiceTemplate(draft);
    const nextSaved = upsertCustomInvoiceLayout(savedCustomLayouts, dup);
    updateInvoiceTemplateSettings({ savedCustomLayouts: nextSaved });
    setDraft(dup);
    showNotice(`تم نسخ القالب وحفظه باسم "${dup.nameAr}".`);
  };

  const handleSaveToLibrary = () => {
    const targetToSave = draft.isBuiltin ? duplicateCustomInvoiceTemplate(draft, `${draft.nameAr} (معدل)`) : draft;
    const nextSaved = upsertCustomInvoiceLayout(savedCustomLayouts, targetToSave);
    updateInvoiceTemplateSettings({ savedCustomLayouts: nextSaved });
    setDraft(targetToSave);
    showNotice(`تم حفظ القالب "${targetToSave.nameAr}" في مكتبتك المخصصة.`);
  };

  const handleApplyToSystem = () => {
    const cleanTpl: CustomInvoiceLayoutTemplate = {
      ...draft,
      zones: resolveEffectiveZones(draft.zones),
      updatedAt: new Date().toISOString(),
    };
    const nextSaved = cleanTpl.isBuiltin
      ? savedCustomLayouts
      : upsertCustomInvoiceLayout(savedCustomLayouts, cleanTpl);

    const patch: any = {
      savedCustomLayouts: nextSaved,
      activeCustomLayoutId: cleanTpl.id,
      activeCustomLayout: cleanTpl,
      primaryColorHex: cleanTpl.accentHex,
      secondaryColorHex: cleanTpl.secondaryHex,
      fontScale: cleanTpl.fontScale,
    };
    if (cleanTpl.format === 'a4') {
      patch.standardTemplate = cleanTpl.baseTemplateId as StandardInvoiceTemplateType;
    } else {
      patch.thermalTemplate = cleanTpl.baseTemplateId as ThermalTemplateType;
    }
    updateInvoiceTemplateSettings(patch);
    showNotice(`تم اعتماد القالب "${cleanTpl.nameAr}" للفواتير بنجاح!`);
    if (onApplied) onApplied(cleanTpl);
  };

  const handleDeleteCustomTemplate = (id: string) => {
    const nextSaved = deleteCustomInvoiceLayout(savedCustomLayouts, id);
    const clearingActive = invoiceTemplateSettings.activeCustomLayoutId === id;
    updateInvoiceTemplateSettings({
      savedCustomLayouts: nextSaved,
      ...(clearingActive ? { activeCustomLayoutId: undefined, activeCustomLayout: undefined } : {}),
    });
    if (draft.id === id) {
      setDraft({
        ...BUILTIN_CUSTOM_INVOICE_LAYOUT_LIBRARY[0],
        zones: resolveEffectiveZones(BUILTIN_CUSTOM_INVOICE_LAYOUT_LIBRARY[0].zones),
      });
    }
    showNotice('تم حذف القالب المخصص من المكتبة.');
  };

  const handleZoneDrop = (dropIdx: number) => {
    if (draggedIndex === null || draggedIndex === dropIdx) {
      setDraggedIndex(null);
      setDragOverIndex(null);
      return;
    }
    setDraft((prev) => ({
      ...prev,
      zones: reorderCustomInvoiceZones(prev.zones, draggedIndex, dropIdx),
    }));
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleMoveZone = (zoneId: InvoiceLayoutZoneId, dir: 'UP' | 'DOWN') => {
    setDraft((prev) => ({
      ...prev,
      zones: moveInvoiceZoneByDirection(prev.zones, zoneId, dir),
    }));
  };

  const handleToggleZone = (zoneId: InvoiceLayoutZoneId) => {
    setDraft((prev) => ({
      ...prev,
      zones: toggleInvoiceZoneVisibility(prev.zones, zoneId),
    }));
  };

  const handleZoneSpanChange = (
    zoneId: InvoiceLayoutZoneId,
    colSpan: CustomInvoiceGridZone['colSpan']
  ) => {
    setDraft((prev) => ({
      ...prev,
      zones: updateInvoiceZoneSpan(prev.zones, zoneId, colSpan),
    }));
  };

  const effectiveZones = useMemo(() => resolveEffectiveZones(draft.zones), [draft.zones]);

  return (
    <div
      data-testid="invoice-template-manager"
      className={`bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 ${
        isModal ? 'shadow-2xl overflow-hidden flex flex-col max-h-[92vh]' : 'p-4 sm:p-5 space-y-4'
      }`}
    >
      {/* Top Bar */}
      <div
        className={`flex flex-wrap items-center justify-between gap-3 ${
          isModal
            ? 'px-5 py-3.5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/60 shrink-0'
            : 'pb-3 border-b border-slate-100 dark:border-slate-800'
        }`}
      >
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-slate-900 text-white flex items-center justify-center shrink-0">
            <LayoutGrid className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm sm:text-base font-black text-slate-900 dark:text-slate-100">
              مدير ومحرر قوالب الفواتير الشبكي (A4 &amp; Thermal)
            </h2>
            <p className="text-[11px] text-slate-500">
              أنشئ وعدّل القوالب التجارية بالسحب والإفلات، خصّص عرض الأعمدة والمسافات، واحفظ مكتبتك الخاصة
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            data-testid="template-manager-new-a4-btn"
            onClick={() => handleCreateNew('a4')}
            className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 text-slate-800 dark:text-slate-100 text-xs font-bold flex items-center gap-1 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>قالب A4 جديد</span>
          </button>

          <button
            type="button"
            data-testid="template-manager-new-thermal-btn"
            onClick={() => handleCreateNew('thermal_80mm')}
            className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 text-slate-800 dark:text-slate-100 text-xs font-bold flex items-center gap-1 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>قالب حراري 80mm</span>
          </button>

          <button
            type="button"
            data-testid="template-manager-save-btn"
            onClick={handleSaveToLibrary}
            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
          >
            <Save className="w-3.5 h-3.5" />
            <span>حفظ في المكتبة</span>
          </button>

          <button
            type="button"
            data-testid="template-manager-apply-btn"
            onClick={handleApplyToSystem}
            className="px-3.5 py-1.5 rounded-lg haseb-btn-primary text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs"
          >
            <Check className="w-3.5 h-3.5" />
            <span>اعتماد وتطبيق القالب</span>
          </button>

          {isModal && onClose && (
            <button
              type="button"
              data-testid="template-manager-close-btn"
              onClick={onClose}
              className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 cursor-pointer"
              title="إغلاق"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Feedback Banner */}
      {statusMessage && (
        <div className="mx-4 mt-3 px-3.5 py-2 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-bold flex items-center justify-between">
          <span>{statusMessage}</span>
          <button type="button" onClick={() => setStatusMessage(null)} className="cursor-pointer">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Main Split Body */}
      <div
        className={`grid grid-cols-1 xl:grid-cols-12 gap-4 ${
          isModal ? 'p-4 sm:p-5 overflow-y-auto flex-1' : ''
        }`}
      >
        {/* Left 5 Cols: Template Library + Drag & Drop Zone Editor */}
        <div className="xl:col-span-5 space-y-4">
          {/* 1. Template Library Selector */}
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-black text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-blue-700" />
                <span>مكتبة القوالب التجارية (A4 &amp; Thermal)</span>
              </span>

              <div className="flex items-center gap-1 text-[10.5px]">
                {[
                  { id: 'ALL', label: `الكل (${allLibraryTemplates.length})` },
                  { id: 'A4', label: 'رسمي A4' },
                  { id: 'THERMAL', label: 'حراري 80/58mm' },
                ].map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    data-testid={`tpl-lib-filter-${f.id}`}
                    onClick={() => setLibraryFilter(f.id as any)}
                    className={`px-2.5 py-1 rounded-md font-bold cursor-pointer transition ${
                      libraryFilter === f.id
                        ? 'bg-slate-900 text-white'
                        : 'bg-white dark:bg-slate-800 text-slate-600 border border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[220px] overflow-y-auto pe-1">
              {filteredTemplates.map((tpl) => {
                const isSelected = draft.id === tpl.id;
                const isActiveInSystem = invoiceTemplateSettings.activeCustomLayoutId === tpl.id;
                return (
                  <div
                    key={tpl.id}
                    data-testid={`tpl-library-card-${tpl.id}`}
                    onClick={() => handleSelectLibraryTemplate(tpl)}
                    className={`p-2.5 rounded-lg border text-right transition cursor-pointer flex flex-col justify-between ${
                      isSelected
                        ? 'border-blue-600 bg-blue-50/70 dark:bg-blue-950/30 ring-1 ring-blue-500/30'
                        : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between gap-1.5 mb-1">
                        <span className="font-bold text-[11.5px] text-slate-900 dark:text-slate-100 truncate">
                          {tpl.nameAr}
                        </span>
                        <span
                          className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded shrink-0 ${
                            tpl.format === 'a4'
                              ? 'bg-slate-100 text-slate-700'
                              : 'bg-emerald-50 text-emerald-700'
                          }`}
                        >
                          {tpl.format === 'a4' ? 'A4' : tpl.format === 'thermal_58mm' ? '58mm' : '80mm'}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-500 line-clamp-2 leading-relaxed">
                        {tpl.descriptionAr}
                      </p>
                    </div>

                    <div className="mt-2 pt-1.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[9.5px]">
                      <span className="text-slate-400 font-semibold">{tpl.categoryAr}</span>
                      <div className="flex items-center gap-1.5">
                        {isActiveInSystem && (
                          <span className="text-emerald-700 font-black flex items-center gap-0.5">
                            <Check className="w-3 h-3" /> مفعل حالياً
                          </span>
                        )}
                        {!tpl.isBuiltin && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteCustomTemplate(tpl.id);
                            }}
                            className="p-0.5 text-rose-500 hover:text-rose-700 cursor-pointer"
                            title="حذف القالب المخصص"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 2. Drag-and-Drop & Grid Editor Tabs */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
            <div className="px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                {[
                  { id: 'zones', label: 'ترتيب الشبكة (سحب وإفلات)', icon: LayoutGrid },
                  { id: 'style', label: 'التنسيق والألوان والخطوط', icon: Sliders },
                  { id: 'content', label: 'نصوص الفاتورة والبنوك', icon: Receipt },
                ].map((t) => {
                  const Icon = t.icon;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      data-testid={`tpl-editor-tab-${t.id}`}
                      onClick={() => setEditorSubTab(t.id as any)}
                      className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold flex items-center gap-1 cursor-pointer transition ${
                        editorSubTab === t.id
                          ? 'bg-slate-900 text-white'
                          : 'bg-white dark:bg-slate-800 text-slate-600 border border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      <span>{t.label}</span>
                    </button>
                  );
                })}
              </div>

              <button
                type="button"
                data-testid="template-manager-duplicate-btn"
                onClick={handleDuplicateCurrent}
                className="px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10.5px] font-bold flex items-center gap-1 cursor-pointer"
              >
                <Copy className="w-3 h-3" />
                <span>نسخ كقالب جديد</span>
              </button>
            </div>

            <div className="p-3.5 space-y-2.5">
              {/* Subtab A: Drag-and-Drop Grid Zone Builder */}
              {editorSubTab === 'zones' && (
                <div className="space-y-2" data-testid="template-zones-drag-list">
                  <div className="flex items-center justify-between text-[11px] text-slate-500 pb-1">
                    <span>اسحب الكتل لإعادة ترتيب أقسام الفاتورة أو عدّل عرضها (نظام 12 عمود لـ A4):</span>
                    {invoiceTemplateSettings.activeCustomLayoutId && (
                      <button
                        type="button"
                        onClick={() => {
                          updateInvoiceTemplateSettings({
                            activeCustomLayoutId: undefined,
                            activeCustomLayout: undefined,
                          });
                          showNotice('تم إلغاء التخصيص الشبكي والعودة إلى القالب القياسي.');
                        }}
                        className="text-rose-600 hover:underline font-bold flex items-center gap-1 cursor-pointer"
                      >
                        <RotateCcw className="w-3 h-3" />
                        <span>استعادة القياسي</span>
                      </button>
                    )}
                  </div>

                  {effectiveZones.map((zone, idx) => (
                    <div
                      key={zone.id}
                      data-testid={`zone-drag-item-${zone.id}`}
                      draggable
                      onDragStart={() => setDraggedIndex(idx)}
                      onDragOver={(e) => {
                        e.preventDefault();
                        setDragOverIndex(idx);
                      }}
                      onDragLeave={() => setDragOverIndex(null)}
                      onDrop={() => handleZoneDrop(idx)}
                      onDragEnd={() => {
                        setDraggedIndex(null);
                        setDragOverIndex(null);
                      }}
                      className={`p-2.5 rounded-lg border flex flex-wrap items-center justify-between gap-2 transition select-none ${
                        dragOverIndex === idx
                          ? 'border-blue-600 bg-blue-50/70'
                          : zone.visible
                          ? 'border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-800/40'
                          : 'border-slate-200/60 bg-slate-100/40 opacity-60'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <span
                          className="cursor-grab active:cursor-grabbing text-slate-400 hover:text-slate-700 p-1"
                          title="اسحب لإعادة الترتيب"
                        >
                          <GripVertical className="w-4 h-4" />
                        </span>

                        <input
                          type="checkbox"
                          data-testid={`zone-toggle-${zone.id}`}
                          checked={zone.visible}
                          onChange={() => handleToggleZone(zone.id)}
                          className="accent-blue-600 cursor-pointer shrink-0"
                        />

                        <div className="min-w-0">
                          <div className="font-bold text-xs text-slate-900 dark:text-slate-100 truncate">
                            {idx + 1}. {zone.labelAr}
                          </div>
                          <div className="text-[10px] text-slate-500 truncate">
                            {zone.descriptionAr}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {draft.format === 'a4' && (
                          <select
                            data-testid={`zone-span-${zone.id}`}
                            value={zone.colSpan}
                            onChange={(e) =>
                              handleZoneSpanChange(
                                zone.id,
                                Number(e.target.value) as CustomInvoiceGridZone['colSpan']
                              )
                            }
                            className="px-2 py-1 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-[10.5px] font-mono font-bold"
                            title="عرض الكتلة في شبكة A4"
                          >
                            <option value={12}>عرض كامل (12/12)</option>
                            <option value={8}>ثلثين (8/12)</option>
                            <option value={7}>7 / 12 عمود</option>
                            <option value={6}>نصف العرض (6/12)</option>
                            <option value={5}>5 / 12 عمود</option>
                            <option value={4}>ثلث العرض (4/12)</option>
                          </select>
                        )}

                        <button
                          type="button"
                          data-testid={`zone-move-up-${zone.id}`}
                          disabled={idx === 0}
                          onClick={() => handleMoveZone(zone.id, 'UP')}
                          className="p-1 rounded border border-slate-200 bg-white hover:bg-slate-100 text-slate-600 disabled:opacity-35 cursor-pointer"
                          title="تحريك للأعلى"
                        >
                          <ArrowUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          data-testid={`zone-move-down-${zone.id}`}
                          disabled={idx === effectiveZones.length - 1}
                          onClick={() => handleMoveZone(zone.id, 'DOWN')}
                          className="p-1 rounded border border-slate-200 bg-white hover:bg-slate-100 text-slate-600 disabled:opacity-35 cursor-pointer"
                          title="تحريك للأسفل"
                        >
                          <ArrowDown className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Subtab B: Layout Style, Colors, Margins & Table Grid */}
              {editorSubTab === 'style' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="sm:col-span-2">
                    <label className="block font-bold text-slate-700 dark:text-slate-200 mb-1">
                      اسم القالب:
                    </label>
                    <input
                      type="text"
                      data-testid="tpl-editor-name-input"
                      value={draft.nameAr}
                      onChange={(e) => setDraft((p) => ({ ...p, nameAr: e.target.value }))}
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-bold"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-200 mb-1">
                      تنسيق الورق:
                    </label>
                    <select
                      data-testid="tpl-editor-format-select"
                      value={draft.format}
                      onChange={(e) =>
                        setDraft((p) => ({
                          ...p,
                          format: e.target.value as InvoiceLayoutFormat,
                        }))
                      }
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white font-bold"
                    >
                      <option value="a4">صفحة رسمية A4</option>
                      <option value="thermal_80mm">إيصال حراري 80mm</option>
                      <option value="thermal_58mm">إيصال حراري محمول 58mm</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-200 mb-1">
                      نمط رأس جدول الأصناف:
                    </label>
                    <select
                      value={draft.tableHeaderStyle}
                      onChange={(e) =>
                        setDraft((p) => ({
                          ...p,
                          tableHeaderStyle: e.target.value as InvoiceTableHeaderStyle,
                        }))
                      }
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white font-bold"
                    >
                      <option value="soft_tint">تظليل احترافي هادئ (Soft Tint)</option>
                      <option value="classic_bordered">تجاري كلاسيكي بحدود (Classic)</option>
                      <option value="minimal_line">سويسري بخط سفلي (Minimal Line)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-200 mb-1">
                      كثافة المسافات والهوامش:
                    </label>
                    <select
                      value={draft.spacingDensity}
                      onChange={(e) =>
                        setDraft((p) => ({
                          ...p,
                          spacingDensity: e.target.value as InvoiceSpacingDensity,
                        }))
                      }
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white font-bold"
                    >
                      <option value="compact">مضغوط موفّر للمساحة (Compact)</option>
                      <option value="standard">متوازن قياسي (Standard)</option>
                      <option value="airy">مريح وواسع (Airy)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-200 mb-1">
                      حجم الخط:
                    </label>
                    <select
                      value={draft.fontScale}
                      onChange={(e) =>
                        setDraft((p) => ({ ...p, fontScale: e.target.value as any }))
                      }
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white font-bold"
                    >
                      <option value="compact">صغير مضغوط</option>
                      <option value="normal">قياسي متوازن</option>
                      <option value="large">كبير وواضح</option>
                    </select>
                  </div>

                  <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between">
                    <span className="font-bold text-slate-700">اللون الرئيسي:</span>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={draft.accentHex}
                        onChange={(e) => setDraft((p) => ({ ...p, accentHex: e.target.value }))}
                        className="w-8 h-7 rounded cursor-pointer border border-slate-300"
                      />
                      <span className="font-mono text-[11px]" dir="ltr">
                        {draft.accentHex}
                      </span>
                    </div>
                  </div>

                  <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between">
                    <span className="font-bold text-slate-700">اللون الثانوي:</span>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={draft.secondaryHex}
                        onChange={(e) => setDraft((p) => ({ ...p, secondaryHex: e.target.value }))}
                        className="w-8 h-7 rounded cursor-pointer border border-slate-300"
                      />
                      <span className="font-mono text-[11px]" dir="ltr">
                        {draft.secondaryHex}
                      </span>
                    </div>
                  </div>

                  <label className="flex items-center gap-2 p-2.5 rounded-lg bg-slate-50 border border-slate-200 font-bold cursor-pointer">
                    <input
                      type="checkbox"
                      checked={draft.showRowStripes}
                      onChange={(e) =>
                        setDraft((p) => ({ ...p, showRowStripes: e.target.checked }))
                      }
                    />
                    <span>تظليل الصفوف المتناوب (Zebra Stripes)</span>
                  </label>

                  <label className="flex items-center gap-2 p-2.5 rounded-lg bg-slate-50 border border-slate-200 font-bold cursor-pointer">
                    <input
                      type="checkbox"
                      checked={draft.showGridBorders}
                      onChange={(e) =>
                        setDraft((p) => ({ ...p, showGridBorders: e.target.checked }))
                      }
                    />
                    <span>إظهار الخطوط الفاصلة بين الأعمدة</span>
                  </label>
                </div>
              )}

              {/* Subtab C: Live Editable Invoice Fields, Bank IBAN/SWIFT & Footer */}
              {editorSubTab === 'content' && (
                <div className="space-y-3 text-xs">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      عنوان الفاتورة الرسمي (يظهر في الترويسة):
                    </label>
                    <input
                      type="text"
                      data-testid="tpl-editor-header-title-input"
                      value={invoiceTemplateSettings.headerTitleAr || ''}
                      onChange={(e) =>
                        updateInvoiceTemplateSettings({ headerTitleAr: e.target.value })
                      }
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-300 bg-white font-semibold"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">
                        رقم الحساب المصرفي الدولي (IBAN):
                      </label>
                      <input
                        type="text"
                        dir="ltr"
                        placeholder="SA00 0000 0000 0000 0000"
                        value={invoiceTemplateSettings.bankIban || ''}
                        onChange={(e) =>
                          updateInvoiceTemplateSettings({
                            bankIban: e.target.value,
                            showBankAccounts: true,
                          })
                        }
                        className="w-full px-3 py-1.5 rounded-lg border border-slate-300 bg-white font-mono"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">
                        رمز السويفت (SWIFT / BIC):
                      </label>
                      <input
                        type="text"
                        dir="ltr"
                        placeholder="CABKYE..."
                        value={invoiceTemplateSettings.bankSwift || ''}
                        onChange={(e) =>
                          updateInvoiceTemplateSettings({
                            bankSwift: e.target.value,
                            showBankAccounts: true,
                          })
                        }
                        className="w-full px-3 py-1.5 rounded-lg border border-slate-300 bg-white font-mono"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      تفاصيل الحسابات البنكية والمحافظ (سطر لكل حساب):
                    </label>
                    <textarea
                      rows={2}
                      value={invoiceTemplateSettings.customBankDetailsAr || ''}
                      onChange={(e) =>
                        updateInvoiceTemplateSettings({
                          customBankDetailsAr: e.target.value,
                          showBankAccounts: true,
                        })
                      }
                      placeholder="بنك الكريمي - رقم الحساب: 123456789"
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-300 bg-white"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      ملاحظة التذييل وشروط الضمان:
                    </label>
                    <input
                      type="text"
                      value={invoiceTemplateSettings.footerNoteAr || ''}
                      onChange={(e) =>
                        updateInvoiceTemplateSettings({ footerNoteAr: e.target.value })
                      }
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-300 bg-white"
                    />
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1">
                    {[
                      { key: 'showItemSku', label: 'كود SKU' },
                      { key: 'showItemDiscount', label: 'عمود الخصم' },
                      { key: 'showItemTax', label: 'عمود الضريبة' },
                      { key: 'showSerialAndWarranty', label: 'السيريال والضمان' },
                      { key: 'showTafqeet', label: 'التفقيط العربي' },
                      { key: 'showQR', label: 'رمز QR' },
                      { key: 'showBarcode', label: 'الباركود الخطي' },
                      { key: 'showStampAndSignature', label: 'الختم والتوقيع' },
                    ].map((opt) => (
                      <label
                        key={opt.key}
                        className="flex items-center gap-1.5 p-2 rounded border border-slate-200 bg-slate-50 font-bold cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={(invoiceTemplateSettings as any)[opt.key] !== false}
                          onChange={(e) =>
                            updateInvoiceTemplateSettings({ [opt.key]: e.target.checked })
                          }
                        />
                        <span>{opt.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right 7 Cols: Real-Time Rendered Invoice Preview */}
        <div className="xl:col-span-7 bg-slate-100 dark:bg-slate-950 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 flex flex-col space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-slate-100">
              <Eye className="w-4 h-4 text-blue-600" />
              <span>
                معاينة حية: {draft.nameAr} (
                {draft.format === 'a4' ? 'A4' : draft.format === 'thermal_58mm' ? '58mm' : '80mm'})
              </span>
            </div>

            <button
              type="button"
              onClick={() => window.print()}
              className="px-3 py-1 rounded-lg bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-100 text-xs font-bold flex items-center gap-1.5 cursor-pointer hover:bg-slate-50"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>طباعة تجريبية</span>
            </button>
          </div>

          <div className="flex-1 overflow-auto p-2.5 bg-slate-200/60 dark:bg-slate-900 rounded-lg max-h-[700px]">
            <div className="w-full mx-auto">
              <InvoiceRenderer
                invoice={previewInvoice}
                mode={draft.format === 'a4' ? 'a4' : 'thermal'}
                standardTemplate={
                  draft.format === 'a4'
                    ? (draft.baseTemplateId as StandardInvoiceTemplateType)
                    : undefined
                }
                thermalTemplate={
                  draft.format !== 'a4'
                    ? (draft.baseTemplateId as ThermalTemplateType)
                    : undefined
                }
                customLayout={draft}
                settings={invoiceTemplateSettings}
                companyName={company.nameAr || currentTenant.legalName}
                companyNameEn={company.name}
                companyLogo={company.logo}
                taxNumber={company.taxNumber || '—'}
                branchName={currentBranch?.nameAr || 'الفرع الرئيسي'}
                branchAddress={currentBranch?.city || ''}
                branchPhone={currentBranch?.phone || company.phone || ''}
                currency={currency}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InvoiceTemplateManager;
