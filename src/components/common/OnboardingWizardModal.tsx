import React, { useState } from 'react';
import { useERP } from '../../context/ERPContext';
import { IndustryType, Currency } from '../../types/erp';
import {
  Sparkles,
  Building2,
  Palette,
  Database,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Trash2,
  Layers,
  Cpu,
  Store,
  Pill,
  ShoppingCart,
  UtensilsCrossed,
  HardHat,
} from 'lucide-react';
import { HasebBrandLogo } from './HasebBrandLogo';

interface OnboardingWizardModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const OnboardingWizardModal: React.FC<OnboardingWizardModalProps> = ({ isOpen, onClose }) => {
  const {
    activeIndustry,
    setActiveIndustry,
    uiTheme,
    setUiTheme,
    company,
    updateCompanyProfile,
    currency,
    setCurrency,
    resetSystemToBlank,
    resetToInitialDemo,
    completeOnboarding,
  } = useERP();

  const [step, setStep] = useState<number>(1);
  const [selectedIndustry, setSelectedIndustry] = useState<IndustryType>(activeIndustry || 'electronics');
  const [selectedTheme, setSelectedTheme] = useState<'corporate_slate' | 'swiss_light' | 'haseb_royal' | 'haseb_sand' | 'obsidian_dark'>(
    uiTheme || 'corporate_slate'
  );
  const [selectedCurrency, setSelectedCurrency] = useState<Currency>(currency || 'SAR');
  const [nameAr, setNameAr] = useState(company?.nameAr || 'مؤسسة الحلول المتقدمة');
  const [taxNumber, setTaxNumber] = useState(company?.taxNumber || '300059281900003');
  const [phone, setPhone] = useState(company?.phone || '+966501234567');
  const [address, setAddress] = useState(company?.address || 'الرياض، المملكة العربية السعودية');
  const [dataMode, setDataMode] = useState<'SEED' | 'BLANK'>('BLANK');
  const [isFinishing, setIsFinishing] = useState(false);

  if (!isOpen) return null;

  const industries: { id: IndustryType; title: string; desc: string; icon: any }[] = [
    {
      id: 'electronics',
      title: 'إلكترونيات وطاقة شمسية وشاشات',
      desc: 'سيريال IMEI، شهادات ضمان، منظومات الطاقة الشمسية والبطاريات LiFePO4',
      icon: Cpu,
    },
    {
      id: 'general',
      title: 'تجارة عامة ونقاط بيع',
      desc: 'إدارة مخزون مرنة، مبيعات جملة وتجزئة، متعدد المخازن',
      icon: Store,
    },
    {
      id: 'grocery',
      title: 'سوبرماركت ومواد غذائية',
      desc: 'باركود الموازين الذكية، تواريخ الصلاحية، ودفع سريع بالكاشير',
      icon: ShoppingCart,
    },
    {
      id: 'pharmacy',
      title: 'صيدليات ومستلزمات طبية',
      desc: 'أرقام التشغيلات (Batches)، تواريخ الانتهاء، والمطالبات التأمينية',
      icon: Pill,
    },
    {
      id: 'restaurant',
      title: 'مطاعم ومقاهي ومطابخ سحابية',
      desc: 'إدارة الطاولات، تذاكر المطبخ KDS، والإضافات والخيارات السريعة',
      icon: UtensilsCrossed,
    },
    {
      id: 'contracting',
      title: 'مقاولات وورش وتصنيع ومشاريع',
      desc: 'أوامر تصنيع BOM، تتبع تكاليف المشاريع ومستخلصات المقاولين',
      icon: HardHat,
    },
  ];

  const handleFinish = async () => {
    setIsFinishing(true);
    // 1. Update company profile
    updateCompanyProfile({
      nameAr,
      name: nameAr,
      taxNumber,
      phone,
      address,
    });

    // 2. Set industry & theme & currency
    setActiveIndustry(selectedIndustry);
    setUiTheme(selectedTheme);
    setCurrency(selectedCurrency);

    // 3. Apply data mode
    if (dataMode === 'BLANK') {
      resetSystemToBlank();
    } else {
      resetToInitialDemo();
    }

    // 4. Mark onboarding as complete
    completeOnboarding();
    setIsFinishing(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-3xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden text-slate-100 flex flex-col my-auto max-h-[95vh]">
        {/* Header Banner */}
        <div className="relative px-6 py-5 bg-gradient-to-r from-emerald-950 via-slate-900 to-sky-950 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <HasebBrandLogo size="md" theme={selectedTheme} />
            <div>
              <h2 className="text-xl font-black text-white flex items-center gap-2">
                مرحباً بك في منظومة حاسب المحاسبية المتكاملة
                <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-mono">
                  معالج الإعداد الأولي
                </span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                خطوات بسيطة وسريعة لتهيئة منظومة حاسب بالكامل حسب نشاطك وهويتك المؤسسية
              </p>
            </div>
          </div>
          <div className="text-xs font-mono font-bold text-slate-400">
            خطوة <span className="text-emerald-400 text-sm">{step}</span> من 4
          </div>
        </div>

        {/* Progress Stepper */}
        <div className="grid grid-cols-4 border-b border-slate-800 bg-slate-950/50 text-[11px] font-medium text-slate-400 text-center">
          <div className={`py-2 border-b-2 transition ${step === 1 ? 'border-emerald-500 text-emerald-400 font-bold' : 'border-transparent'}`}>
            1. نوع النشاط
          </div>
          <div className={`py-2 border-b-2 transition ${step === 2 ? 'border-emerald-500 text-emerald-400 font-bold' : 'border-transparent'}`}>
            2. الثيم والمظهر
          </div>
          <div className={`py-2 border-b-2 transition ${step === 3 ? 'border-emerald-500 text-emerald-400 font-bold' : 'border-transparent'}`}>
            3. بيانات المؤسسة
          </div>
          <div className={`py-2 border-b-2 transition ${step === 4 ? 'border-emerald-500 text-emerald-400 font-bold' : 'border-transparent'}`}>
            4. وضع البيانات
          </div>
        </div>

        {/* Step Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {/* STEP 1: Industry Selection */}
          {step === 1 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm font-bold text-slate-200">
                <Layers className="w-4 h-4 text-emerald-400" />
                <span>اختر قطاع العمل الخاص بمنشأتك (سيتكيف النظام ومصطلحاته بالكامل معه):</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {industries.map((ind) => {
                  const Icon = ind.icon;
                  const isSelected = selectedIndustry === ind.id;
                  return (
                    <button
                      type="button"
                      key={ind.id}
                      onClick={() => setSelectedIndustry(ind.id)}
                      className={`text-start p-3.5 rounded-xl border transition-all cursor-pointer flex gap-3 items-start ${
                        isSelected
                          ? 'bg-emerald-500/10 border-emerald-500 text-white shadow-lg shadow-emerald-950/40 ring-1 ring-emerald-500/50'
                          : 'bg-slate-800/40 border-slate-700/60 hover:border-slate-600 text-slate-300'
                      }`}
                    >
                      <div
                        className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                          isSelected
                            ? 'bg-emerald-500 text-slate-950 font-bold'
                            : 'bg-slate-700/60 text-slate-300'
                        }`}
                      >
                        <Icon className="w-5 h-5" />
                      </div>
                      <div className="flex-1">
                        <div className="font-bold text-sm flex items-center justify-between">
                          <span>{ind.title}</span>
                          {isSelected && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
                        </div>
                        <p className="text-xs text-slate-400 mt-1 leading-relaxed">{ind.desc}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* STEP 2: Theme & Currency */}
          {step === 2 && (
            <div className="space-y-5">
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm font-bold text-slate-200">
                  <Palette className="w-4 h-4 text-sky-400" />
                  <span>اختر ثيم وهوية منظومة حاسب (5 ثيمات احترافية مريحة للعين):</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {[
                    {
                      id: 'corporate_slate',
                      name: 'زمرد حاسب الملكي (Imperial Emerald)',
                      desc: 'هوية مالية متكاملة بتدرجات الزمرد الملكي وخلفية عاجية',
                      bg: 'bg-emerald-700 border-emerald-500',
                    },
                    {
                      id: 'haseb_royal',
                      name: 'ياقوت حاسب المصرفي (Royal Sapphire)',
                      desc: 'طابع البنوك والمؤسسات بتدرجات الياقوت الأزرق والكحلي',
                      bg: 'bg-blue-700 border-blue-500',
                    },
                    {
                      id: 'swiss_light',
                      name: 'كشمير حاسب السويسري (Swiss Cashmere)',
                      desc: 'تصميم سويسري فائق النقاء بلمسات النيلي الملكي',
                      bg: 'bg-indigo-700 border-indigo-400',
                    },
                    {
                      id: 'haseb_sand',
                      name: 'رمال حاسب الدافئة (Warm Oasis Paper)',
                      desc: 'خلفية ورقية دافئة بدون أشعة زرقاء لورديات الكاشير الطويلة',
                      bg: 'bg-[#f2ece1] border-[#d3c5ad]',
                    },
                    {
                      id: 'obsidian_dark',
                      name: 'ليل حاسب الكربوني (Obsidian Dark)',
                      desc: 'وضع داكن احترافي شامل لجميع البطاقات والجداول',
                      bg: 'bg-slate-950 border-emerald-500',
                    },
                  ].map((th) => {
                    const isSelected = selectedTheme === th.id;
                    return (
                      <button
                        type="button"
                        key={th.id}
                        onClick={() => setSelectedTheme(th.id as any)}
                        className={`p-3.5 rounded-xl border text-start transition cursor-pointer flex flex-col justify-between ${
                          isSelected
                            ? 'border-sky-500 bg-sky-500/10 ring-1 ring-sky-500'
                            : 'border-slate-700 bg-slate-800/40 hover:border-slate-600'
                        }`}
                      >
                        <div>
                          <div className="font-bold text-xs text-white flex items-center justify-between">
                            <span>{th.name}</span>
                            {isSelected && <CheckCircle2 className="w-4 h-4 text-sky-400 shrink-0" />}
                          </div>
                          <p className="text-[11px] text-slate-400 mt-1">{th.desc}</p>
                        </div>
                        <div className={`mt-3 h-5 rounded-md border ${th.bg}`} />
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-2 pt-2 border-t border-slate-800">
                <label className="block text-sm font-bold text-slate-200">
                  العملة الرسمية الافتراضية للنظام:
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { code: 'SAR', label: 'الريال السعودي (SAR)', symbol: 'ر.س' },
                    { code: 'YER', label: 'الريال اليمني (YER)', symbol: 'ر.ي' },
                    { code: 'USD', label: 'الدولار الأمريكي (USD)', symbol: '$' },
                  ].map((cur) => (
                    <button
                      type="button"
                      key={cur.code}
                      onClick={() => setSelectedCurrency(cur.code as Currency)}
                      className={`p-3 rounded-xl border text-start transition cursor-pointer flex items-center justify-between ${
                        selectedCurrency === cur.code
                          ? 'border-emerald-500 bg-emerald-500/10 text-white font-bold'
                          : 'border-slate-700 bg-slate-800/40 text-slate-300 hover:border-slate-600'
                      }`}
                    >
                      <span className="text-xs">{cur.label}</span>
                      <span className="text-xs font-mono font-bold text-emerald-400">{cur.symbol}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: Business Information */}
          {step === 3 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm font-bold text-slate-200">
                <Building2 className="w-4 h-4 text-amber-400" />
                <span>بيانات المؤسسة والترويسة الضريبية الرسمية للفواتير:</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">
                    اسم المنشأة أو الشركة بالعربية:
                  </label>
                  <input
                    type="text"
                    value={nameAr}
                    onChange={(e) => setNameAr(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-lg bg-slate-800 border border-slate-700 text-white text-sm focus:border-emerald-500 focus:outline-none"
                    placeholder="مثال: مؤسسة النور للطاقة والإلكترونيات"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">
                    الرقم الضريبي VAT:
                  </label>
                  <input
                    type="text"
                    value={taxNumber}
                    onChange={(e) => setTaxNumber(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-lg bg-slate-800 border border-slate-700 text-white text-sm font-mono focus:border-emerald-500 focus:outline-none"
                    placeholder="مثال: 300059281900003"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">
                    رقم الهاتف / الواتساب الرسمي:
                  </label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-lg bg-slate-800 border border-slate-700 text-white text-sm font-mono focus:border-emerald-500 focus:outline-none"
                    placeholder="+966501234567"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">
                    العنوان والمدينة:
                  </label>
                  <input
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-lg bg-slate-800 border border-slate-700 text-white text-sm focus:border-emerald-500 focus:outline-none"
                    placeholder="الرياض، طريق الملك فهد"
                  />
                </div>
              </div>
            </div>
          )}

          {/* STEP 4: Database Mode (Seed Demo vs Clean Blank) */}
          {step === 4 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm font-bold text-slate-200">
                <Database className="w-4 h-4 text-emerald-400" />
                <span>اختر كيفية تهيئة قاعدة البيانات لبدء التشغيل:</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => setDataMode('BLANK')}
                  className={`p-4 rounded-xl border text-start transition cursor-pointer flex flex-col justify-between ${
                    dataMode === 'BLANK'
                      ? 'border-emerald-500 bg-emerald-500/10 ring-1 ring-emerald-500 text-white'
                      : 'border-slate-700 bg-slate-800/40 text-slate-300 hover:border-slate-600'
                  }`}
                >
                  <div>
                    <div className="w-10 h-10 rounded-lg bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 mb-3">
                      <Trash2 className="w-5 h-5" />
                    </div>
                    <div className="font-bold text-sm flex items-center justify-between">
                      <span>البدء بالكامل من الصفر (قاعدة بيانات فارغة)</span>
                      {dataMode === 'BLANK' && <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />}
                    </div>
                    <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                      يُفضل للشركات والمتاجر الحقيقية الجاهزة للإدخال الفعلي. يتم تصفير كافة المنتجات والفواتير والمخزون والموردين، مع الإبقاء الحصري على شجرة الحسابات المالية (Chart of Accounts) لضمان اتزان المحاسبة والقيود.
                    </p>
                  </div>
                  <div className="mt-4 text-[11px] text-emerald-400 font-bold bg-emerald-950/60 px-2.5 py-1 rounded border border-emerald-500/30 text-center">
                    موصى به للإنتاج الفعلي
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setDataMode('SEED')}
                  className={`p-4 rounded-xl border text-start transition cursor-pointer flex flex-col justify-between ${
                    dataMode === 'SEED'
                      ? 'border-sky-500 bg-sky-500/10 ring-1 ring-sky-500 text-white'
                      : 'border-slate-700 bg-slate-800/40 text-slate-300 hover:border-slate-600'
                  }`}
                >
                  <div>
                    <div className="w-10 h-10 rounded-lg bg-sky-500/20 border border-sky-500/40 flex items-center justify-center text-sky-400 mb-3">
                      <Database className="w-5 h-5" />
                    </div>
                    <div className="font-bold text-sm flex items-center justify-between">
                      <span>البدء بقاعدة بيانات افتراضية تجريبية</span>
                      {dataMode === 'SEED' && <CheckCircle2 className="w-5 h-5 text-sky-400 shrink-0" />}
                    </div>
                    <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                      يحتوي على منتجات أمثلة، عملاء، فواتير مبيعات سابقة، وسجلات مخزون لاختبار ميزات النظام ومراجعة التقارير المالية قبل العمل الفعلي.
                    </p>
                  </div>
                  <div className="mt-4 text-[11px] text-sky-400 font-bold bg-sky-950/60 px-2.5 py-1 rounded border border-sky-500/30 text-center">
                    مناسب للتجربة والتدريب
                  </div>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between">
          <div>
            {step > 1 ? (
              <button
                type="button"
                onClick={() => setStep((s) => Math.max(1, s - 1))}
                className="px-4 py-2 rounded-xl border border-slate-700 text-slate-300 hover:text-white hover:bg-slate-800 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
              >
                <ArrowRight className="w-4 h-4" />
                <span>السابق</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={onClose}
                className="px-3 py-2 text-slate-400 hover:text-slate-200 text-xs font-semibold cursor-pointer"
              >
                تخطي مؤقتاً
              </button>
            )}
          </div>

          <div>
            {step < 4 ? (
              <button
                type="button"
                onClick={() => setStep((s) => Math.min(4, s + 1))}
                className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-lg shadow-emerald-950"
              >
                <span>التالي</span>
                <ArrowLeft className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                disabled={isFinishing}
                onClick={handleFinish}
                className="px-6 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-black transition flex items-center gap-2 cursor-pointer shadow-lg shadow-emerald-900/60"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{isFinishing ? 'جاري تطبيق الإعدادات...' : 'اعتماد الإعدادات وبدء استخدام النظام'}</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
