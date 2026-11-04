import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  PackagePlus,
  Calculator,
  CheckCircle2,
  Layers,
  ShoppingCart,
  ShieldCheck,
  MessageSquare,
  ChevronDown,
  ChevronUp,
  Check,
} from 'lucide-react';
import { useERP } from '../../context/ERPContext';
import { INDUSTRY_BLUEPRINTS } from '../../core/industryBlueprints';
import { IndustryType, IndustrySupplyItem } from '../../types/erp';

interface IndustryChameleonPanelProps {
  contextMode?: 'DASHBOARD' | 'POS' | 'INVENTORY';
  defaultExpanded?: boolean;
}

export const IndustryChameleonPanel: React.FC<IndustryChameleonPanelProps> = ({
  contextMode = 'DASHBOARD',
  defaultExpanded = true,
}) => {
  const {
    activeIndustry,
    setActiveIndustry,
    currentIndustryBlueprint,
    provisionIndustrySuppliesToInventory,
    masterSystemConfig,
    products,
    addToPOSCart,
    formatCurrency,
    openQuickSendModal,
  } = useERP();

  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const [calcInput1, setCalcInput1] = useState<number>(
    currentIndustryBlueprint.quickCalculator.defaultInput1
  );
  const [calcInput2, setCalcInput2] = useState<number>(
    currentIndustryBlueprint.quickCalculator.defaultInput2
  );
  const [provisionToast, setProvisionToast] = useState<string | null>(null);

  useEffect(() => {
    setCalcInput1(currentIndustryBlueprint.quickCalculator.defaultInput1);
    setCalcInput2(currentIndustryBlueprint.quickCalculator.defaultInput2);
    setProvisionToast(null);
  }, [activeIndustry]);

  const calcOutput = currentIndustryBlueprint.quickCalculator.computeDescription(
    calcInput1,
    calcInput2
  );

  const isSingleLocked = masterSystemConfig.industryLockMode === 'SINGLE_LOCKED';

  const handleProvisionAllSupplies = () => {
    const res = provisionIndustrySuppliesToInventory(activeIndustry);
    setProvisionToast(res.messageAr);
  };

  const handleAddSingleSupplyToPOS = (sup: IndustrySupplyItem) => {
    const existingProd = products.find((p) => p.sku === sup.sku);
    if (existingProd) {
      addToPOSCart(existingProd, 1);
      setProvisionToast(`تمت إضافة (${sup.nameAr}) إلى سلة نقطة البيع بنجاح.`);
    } else {
      provisionIndustrySuppliesToInventory(activeIndustry);
      setProvisionToast(
        `تم تفعيل مستلزمات (${currentIndustryBlueprint.nameAr}) في المخزون — يمكنك الآن بيع الصنف مباشرة.`
      );
    }
  };

  const allIndustries: IndustryType[] = [
    'electronics',
    'restaurant',
    'grocery',
    'pharmacy',
    'contracting',
    'general',
  ];

  return (
    <div
      data-testid={`industry-chameleon-panel-${contextMode.toLowerCase()}`}
      className={`rounded-2xl border ${currentIndustryBlueprint.borderAccentClass} bg-gradient-to-l ${currentIndustryBlueprint.bannerGradient} p-5 shadow-xl text-slate-100 transition-all duration-300`}
    >
      {/* Top Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <span
              data-testid="active-industry-badge"
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${currentIndustryBlueprint.accentBadgeClass}`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{currentIndustryBlueprint.badgeTextAr}</span>
            </span>
            <span className="px-2.5 py-0.5 rounded-md bg-slate-900/80 border border-slate-700 text-[11px] text-slate-300 font-mono">
              قالب الطباعة: {currentIndustryBlueprint.standardTemplate} | الوحدة: {currentIndustryBlueprint.defaultUom}
            </span>
            {isSingleLocked && (
              <span className="px-2.5 py-0.5 rounded-md bg-amber-500/20 border border-amber-500/40 text-amber-300 text-[11px] font-bold">
                مخصص لنشاط واحد (مقفل إدارياً)
              </span>
            )}
          </div>
          <h2
            className="text-lg sm:text-xl font-extrabold text-white tracking-tight"
            data-testid="active-industry-title"
          >
            {contextMode === 'POS'
              ? currentIndustryBlueprint.posTitleAr
              : contextMode === 'INVENTORY'
              ? currentIndustryBlueprint.inventoryTitleAr
              : `منظومة العمل المتخصصة: ${currentIndustryBlueprint.nameAr}`}
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 max-w-3xl">
            {contextMode === 'POS'
              ? currentIndustryBlueprint.posSubtitleAr
              : contextMode === 'INVENTORY'
              ? currentIndustryBlueprint.inventorySubtitleAr
              : currentIndustryBlueprint.taglineAr}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={handleProvisionAllSupplies}
            data-testid="provision-industry-supplies-btn"
            className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold shadow-lg transition ${currentIndustryBlueprint.primaryButtonClass}`}
          >
            <PackagePlus className="w-4 h-4" />
            <span>
              تجهيز وإضافة مستلزمات النشاط للمستودع ({currentIndustryBlueprint.supplies.length} مستلزمات)
            </span>
          </button>

          <button
            type="button"
            onClick={() =>
              openQuickSendModal({
                channel: 'WHATSAPP',
                category: 'FINANCIAL_REPORT',
              })
            }
            data-testid="industry-panel-whatsapp-btn"
            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-emerald-600/25 hover:bg-emerald-600/35 border border-emerald-500/40 text-emerald-300 text-xs font-bold transition"
          >
            <MessageSquare className="w-4 h-4" />
            <span>إرسال واتساب / SMS</span>
          </button>

          <button
            type="button"
            onClick={() => setIsExpanded((prev) => !prev)}
            data-testid="toggle-industry-chameleon-details-btn"
            className="inline-flex items-center gap-1 px-3 py-2.5 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-slate-700 text-slate-300 text-xs font-semibold transition"
          >
            <span>{isExpanded ? 'طي الأدوات والمستلزمات' : 'عرض المستلزمات والحاسبة'}</span>
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Industry Quick Switcher Bar */}
      <div className="mt-4 pt-3 border-t border-slate-800/80 flex flex-wrap items-center gap-2">
        <span className="text-xs font-semibold text-slate-400 ml-1">
          تغيير النشاط وتكييف النظام بالكامل:
        </span>
        {allIndustries.map((indKey) => {
          const bp = INDUSTRY_BLUEPRINTS[indKey];
          const isSelected = activeIndustry === indKey;
          return (
            <button
              key={indKey}
              type="button"
              onClick={() => setActiveIndustry(indKey)}
              data-testid={`switch-industry-pill-${indKey}`}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition cursor-pointer ${
                isSelected
                  ? `${bp.accentBadgeClass} ring-1 ring-white/20 shadow-sm`
                  : 'bg-slate-900/70 border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              {bp.nameAr}
            </button>
          );
        })}
      </div>

      {/* Provision Feedback Toast */}
      {provisionToast && (
        <div
          data-testid="industry-provision-toast"
          className="mt-4 p-3.5 rounded-xl bg-emerald-950/80 border border-emerald-500/40 text-emerald-200 flex items-center justify-between gap-3 text-xs font-semibold"
        >
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{provisionToast}</span>
          </div>
          <button
            type="button"
            onClick={() => setProvisionToast(null)}
            className="text-slate-400 hover:text-white text-[11px]"
          >
            إخفاء
          </button>
        </div>
      )}

      {/* Expanded Section: Specialized Supplies Catalog + Interactive Calculator + Operational Checklist */}
      {isExpanded && (
        <div className="mt-5 pt-5 border-t border-slate-800/80 grid grid-cols-1 xl:grid-cols-12 gap-5">
          {/* Left 7 Cols: Specialized Supplies & Consumables Catalog */}
          <div className="xl:col-span-7 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Layers className="w-4 h-4 text-cyan-400" />
                <span>
                  كتالوج المستلزمات والإضافات المتخصصة لنشاط ({currentIndustryBlueprint.nameAr})
                </span>
              </h3>
              <span className="text-[11px] text-slate-400">
                جاهزة للإضافة الفورية للمخزون أو نقطة البيع
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {currentIndustryBlueprint.supplies.map((sup) => {
                const inInventory = products.find((p) => p.sku === sup.sku);
                return (
                  <div
                    key={sup.id}
                    data-testid={`industry-supply-card-${sup.sku}`}
                    className="bg-slate-950/75 border border-slate-800/90 rounded-xl p-3.5 flex flex-col justify-between gap-2.5 hover:border-slate-700 transition"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-900 text-cyan-300 border border-slate-800">
                          {sup.sku}
                        </span>
                        <span className="text-[10px] px-2 py-0.5 rounded bg-slate-900 text-slate-300">
                          {sup.categoryAr}
                        </span>
                      </div>
                      <h4 className="text-xs font-bold text-white leading-snug">{sup.nameAr}</h4>
                      <p className="text-[11px] text-slate-400 mt-1 line-clamp-2">
                        {sup.specificationsAr}
                      </p>
                    </div>

                    <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between gap-2">
                      <div className="text-[11px]">
                        <span className="text-slate-400">السعر: </span>
                        <span className="font-bold text-emerald-400">
                          {formatCurrency(sup.salePrice)}
                        </span>
                        <span className="text-slate-500"> / {sup.uom}</span>
                        {inInventory && (
                          <span className="mr-2 px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-300 text-[10px] font-semibold">
                            متوفر ({inInventory.stockQty})
                          </span>
                        )}
                      </div>

                      {contextMode === 'POS' ? (
                        <button
                          type="button"
                          onClick={() => handleAddSingleSupplyToPOS(sup)}
                          data-testid={`pos-add-supply-${sup.sku}`}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-cyan-600/25 hover:bg-cyan-600/40 text-cyan-300 border border-cyan-500/30 text-[11px] font-bold transition"
                        >
                          <ShoppingCart className="w-3 h-3" />
                          <span>إضافة للفاتورة</span>
                        </button>
                      ) : (
                        <span className="text-[10px] text-slate-400 font-mono">
                          افتراضي: +{sup.defaultStock} {sup.uom}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right 5 Cols: Interactive Domain Calculator + Operational Checklist */}
          <div className="xl:col-span-5 space-y-4">
            {/* Domain Quick Calculator */}
            <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 space-y-3">
              <div className="flex items-center gap-2">
                <Calculator className="w-4 h-4 text-amber-400" />
                <div>
                  <h4 className="text-xs font-bold text-white">
                    {currentIndustryBlueprint.quickCalculator.titleAr}
                  </h4>
                  <p className="text-[11px] text-slate-400">
                    {currentIndustryBlueprint.quickCalculator.subtitleAr}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] text-slate-300 mb-1">
                    {currentIndustryBlueprint.quickCalculator.input1LabelAr}
                  </label>
                  <input
                    type="number"
                    value={calcInput1}
                    onChange={(e) => setCalcInput1(Number(e.target.value) || 0)}
                    data-testid="industry-calc-input1"
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-300 mb-1">
                    {currentIndustryBlueprint.quickCalculator.input2LabelAr}
                  </label>
                  <input
                    type="number"
                    value={calcInput2}
                    onChange={(e) => setCalcInput2(Number(e.target.value) || 0)}
                    data-testid="industry-calc-input2"
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono"
                  />
                </div>
              </div>

              <div
                className="p-3 rounded-lg bg-slate-900/90 border border-slate-800 space-y-1"
                data-testid="industry-calc-result"
              >
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">النتيجة الهندسية / التجارية:</span>
                  <span className="font-extrabold text-amber-400 font-mono">
                    {calcOutput.primaryResult.toLocaleString()}{' '}
                    {currentIndustryBlueprint.quickCalculator.unitResultAr}
                  </span>
                </div>
                <p className="text-xs font-semibold text-emerald-300 leading-relaxed">
                  {calcOutput.recommendationAr}
                </p>
                <p className="text-[11px] text-slate-400">{calcOutput.technicalNoteAr}</p>
              </div>
            </div>

            {/* Specialized Features & Checklist */}
            <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 space-y-2.5">
              <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>المعايير والمميزات المفعّلة تلقائياً لهذا النشاط:</span>
              </h4>
              <ul className="space-y-1.5 text-[11px] text-slate-300">
                {currentIndustryBlueprint.specializedFeaturesAr.map((feat, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                    <span>{feat}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
