import React, { useState, useEffect } from 'react';
import { useERP } from '../../context/ERPContext';
import { CurrencyCode, IndustryType } from '../../types/erp';
import {
  Building2,
  CheckCircle2,
  Database,
  Trash2,
  Sparkles,
  Store,
  Cpu,
  Utensils,
  Pill,
  ShoppingBag,
  HardHat,
  ArrowLeft,
  ArrowRight,
  ShieldCheck,
  X,
  Upload,
  Image as ImageIcon,
} from 'lucide-react';

interface OnboardingWizardModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const OnboardingWizardModal: React.FC<OnboardingWizardModalProps> = ({
  isOpen,
  onClose,
}) => {
  const {
    company,
    currentBranch,
    currency,
    activeIndustry,
    setActiveIndustry,
    setCurrency,
    updateCompanyProfile,
    updateBranch,
    resetToInitialDemo,
    resetSystemToBlank,
    completeOnboarding,
  } = useERP();

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [dataMode, setDataMode] = useState<'DEMO' | 'BLANK'>('DEMO');
  const [selectedIndustry, setSelectedIndustry] = useState<IndustryType>(
    activeIndustry || 'electronics'
  );
  const [selectedCurrency, setSelectedCurrency] = useState<CurrencyCode>(currency || 'YER');

  const [companyNameAr, setCompanyNameAr] = useState(
    company.nameAr || 'مؤسسة الطاقة الشمسية والإلكترونيات الحديثة'
  );
  const [companyNameEn, setCompanyNameEn] = useState(
    company.name || 'Modern Solar & Electronics Corp'
  );
  const [taxNumber, setTaxNumber] = useState(company.taxNumber || '300059281900003');
  const [companyLogo, setCompanyLogo] = useState<string>(company.logo || '');
  const [branchNameAr, setBranchNameAr] = useState(
    currentBranch?.nameAr || 'المركز الرئيسي - صنعاء'
  );
  const [branchCity, setBranchCity] = useState(currentBranch?.city || 'صنعاء');
  const [branchPhone, setBranchPhone] = useState(currentBranch?.phone || '+967 1 445 880');

  useEffect(() => {
    if (isOpen) {
      setCompanyNameAr(company.nameAr || 'مؤسسة الطاقة الشمسية والإلكترونيات الحديثة');
      setCompanyNameEn(company.name || 'Modern Solar & Electronics Corp');
      setTaxNumber(company.taxNumber || '300059281900003');
      setCompanyLogo(company.logo || '');
      setBranchNameAr(currentBranch?.nameAr || 'المركز الرئيسي - صنعاء');
      setBranchCity(currentBranch?.city || 'صنعاء');
      setBranchPhone(currentBranch?.phone || '+967 1 445 880');
      setSelectedCurrency(currency || 'YER');
    }
  }, [isOpen, company, currentBranch, currency]);

  if (!isOpen) return null;

  const industries: {
    id: IndustryType;
    titleAr: string;
    descAr: string;
    icon: React.ElementType;
  }[] = [
    {
      id: 'electronics',
      titleAr: 'الطاقة الشمسية والإلكترونيات والأجهزة',
      descAr: 'ألواح شمسية، إنفرترات، بطاريات ليثيوم، شاشات، تتبع الأرقام التسلسلية وشهادات الضمان',
      icon: Cpu,
    },
    {
      id: 'grocery',
      titleAr: 'التموينات والسوبرماركت والتجزئة',
      descAr: 'دعم باركود الميزان الإلكتروني GS1، نقاط بيع سريعة، وتعدد الوحدات',
      icon: ShoppingBag,
    },
    {
      id: 'restaurant',
      titleAr: 'المطاعم والكافيهات والضيافة',
      descAr: 'إدارة الطاولات، شاشة المطبخ التفاعلية KDS، وطلبات السفري والمحلي',
      icon: Utensils,
    },
    {
      id: 'pharmacy',
      titleAr: 'الصيدليات والمستلزمات الطبية',
      descAr: 'تتبع التشغيلات (Batch/Lot) وتواريخ الصلاحية FEFO والبدائل الدوائية',
      icon: Pill,
    },
    {
      id: 'contracting',
      titleAr: 'المقاولات ومواد البناء والمشاريع',
      descAr: 'مستخلصات المشاريع، عروض الأسعار الهندسية، ومراكز التكلفة',
      icon: HardHat,
    },
    {
      id: 'general',
      titleAr: 'التجارة العامة والجملة والتوريدات',
      descAr: 'نظام محاسبي ومخزني متكامل لكافة الأنشطة التجارية والخدمية',
      icon: Store,
    },
  ];

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setCompanyLogo(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleFinish = () => {
    if (dataMode === 'BLANK') {
      resetSystemToBlank();
    } else {
      resetToInitialDemo();
    }

    setActiveIndustry(selectedIndustry);
    setCurrency(selectedCurrency);

    updateCompanyProfile({
      nameAr: companyNameAr.trim() || 'مؤسسة الطاقة الشمسية والإلكترونيات الحديثة',
      name: companyNameEn.trim() || companyNameAr.trim() || 'Modern Solar & Electronics Corp',
      taxNumber: taxNumber.trim() || '300059281900003',
      logo: companyLogo || undefined,
      address: `${branchCity.trim() || 'صنعاء'} - ${branchNameAr.trim() || 'المركز الرئيسي'}`,
      phone: branchPhone.trim() || '+967 1 445 880',
    });

    if (currentBranch) {
      updateBranch(currentBranch.id, {
        nameAr: branchNameAr.trim() || 'المركز الرئيسي - صنعاء',
        name: branchNameAr.trim() || 'Main Branch - Sanaa',
        city: branchCity.trim() || 'صنعاء',
        phone: branchPhone.trim() || '+967 1 445 880',
      });
    }

    try {
      localStorage.setItem('haseb_first_run_welcome_shown_v1', 'true');
      if (companyLogo) {
        localStorage.setItem('haseb_company_custom_logo_v1', companyLogo);
      }
    } catch {
      // ignore storage errors
    }

    completeOnboarding();
    onClose();
  };

  return (
    <div
      data-testid="onboarding-wizard-modal"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 bg-slate-900/70 backdrop-blur-xs z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
    >
      <div className="bg-white rounded-t-3xl sm:rounded-2xl border border-slate-200/80 max-w-3xl w-full max-h-[92dvh] flex flex-col overflow-hidden shadow-2xl">
        {/* Top Welcome Banner */}
        <div className="px-4 sm:px-6 py-4 bg-slate-50/95 border-b border-slate-200/80 text-slate-900 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center shrink-0 shadow-2xs">
              <Sparkles className="w-5 h-5 text-emerald-400" />
            </div>
            <div className="min-w-0">
              <h2 className="font-bold text-sm sm:text-base text-slate-900 truncate">
                مرحباً بك في نظام حاسب المؤسسي — معالج الترحيب والتهيئة الأولية
              </h2>
              <p className="text-[11px] text-slate-500 mt-0.5 truncate">
                إعداد هوية وشعار منشأتك في الفواتير، العملة الافتراضية، ونوع النشاط التجاري في 3 خطوات
              </p>
            </div>
          </div>

          <button
            type="button"
            data-testid="onboarding-close-btn"
            onClick={onClose}
            className="w-8 h-8 rounded-full border border-slate-200/80 bg-white hover:bg-slate-100 flex items-center justify-center text-slate-500 hover:text-slate-900 transition cursor-pointer shrink-0"
            title="إغلاق وتخطي"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Stepper Progress Bar */}
        <div className="px-4 sm:px-6 py-2.5 bg-white border-b border-slate-100 flex items-center justify-between text-xs shrink-0">
          {[
            { num: 1, title: '1. وضع البيانات' },
            { num: 2, title: '2. النشاط والعملة' },
            { num: 3, title: '3. هوية وشعار المنشأة' },
          ].map((s) => (
            <button
              key={s.num}
              type="button"
              onClick={() => setStep(s.num as 1 | 2 | 3)}
              className={`flex items-center gap-1.5 font-bold cursor-pointer transition ${
                step === s.num
                  ? 'text-slate-900'
                  : step > s.num
                  ? 'text-emerald-600'
                  : 'text-slate-400'
              }`}
            >
              <span
                className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-mono ${
                  step === s.num
                    ? 'bg-slate-900 text-white'
                    : step > s.num
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-slate-100 text-slate-500'
                }`}
              >
                {step > s.num ? '✓' : s.num}
              </span>
              <span>{s.title}</span>
            </button>
          ))}
        </div>

        {/* Step Content */}
        <div className="p-4 sm:p-6 space-y-5 flex-1 overflow-y-auto">
          {step === 1 && (
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  اختر طريقة بدء التشغيل لقاعدة البيانات:
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  يمكنك البدء ببيانات تجريبية متكاملة لاستكشاف كافة المزايا أو تصفير النظام للبدء الفعلي لمنشأتك.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div
                  data-testid="onboarding-mode-demo"
                  onClick={() => setDataMode('DEMO')}
                  className={`p-4 rounded-2xl border-2 cursor-pointer transition-all space-y-2 ${
                    dataMode === 'DEMO'
                      ? 'border-slate-900 bg-slate-50/90 shadow-xs'
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                      <Database className="w-5 h-5" />
                    </div>
                    {dataMode === 'DEMO' && <CheckCircle2 className="w-5 h-5 text-slate-900" />}
                  </div>
                  <div className="font-bold text-sm text-slate-900">
                    وضع البيانات التجريبية المتكاملة (موصى به للتجربة)
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    يحتوي على أصناف الطاقة الشمسية والإلكترونيات (ألواح Jinko 585W، إنفرترات Deye، بطاريات LiFePO4)، ومصارف يمنية (الكريمي والتضامن)، وفواتير جاهزة.
                  </p>
                </div>

                <div
                  data-testid="onboarding-mode-blank"
                  onClick={() => setDataMode('BLANK')}
                  className={`p-4 rounded-2xl border-2 cursor-pointer transition-all space-y-2 ${
                    dataMode === 'BLANK'
                      ? 'border-slate-900 bg-slate-50/90 shadow-xs'
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center">
                      <Trash2 className="w-5 h-5" />
                    </div>
                    {dataMode === 'BLANK' && <CheckCircle2 className="w-5 h-5 text-slate-900" />}
                  </div>
                  <div className="font-bold text-sm text-slate-900">
                    وضع النظام الفارغ تماماً (تصفير كامل للعميل الجديد)
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    يمسح جميع الأصناف والفواتير والعملاء التجريبيين مع الإبقاء على شجرة الحسابات المحاسبية جاهزة للبدء الفعلي من الصفر.
                  </p>
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-center bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
                <div className="sm:col-span-2">
                  <div className="text-xs font-bold text-slate-900">
                    العملة الرسمية الافتراضية للنظام والفواتير:
                  </div>
                  <div className="text-[11px] text-slate-500">
                    تظهر في نقطة البيع والفواتير والتقارير المالية وشجرة الحسابات
                  </div>
                </div>
                <select
                  data-testid="onboarding-currency-select"
                  value={selectedCurrency}
                  onChange={(e) => setSelectedCurrency(e.target.value as CurrencyCode)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-xs font-bold text-slate-900 outline-hidden focus:border-slate-900"
                >
                  <option value="YER">الريال اليمني (YER - ر.ي)</option>
                  <option value="SAR">الريال السعودي (SAR - ر.س)</option>
                  <option value="USD">الدولار الأمريكي (USD - $)</option>
                  <option value="AED">الدرهم الإماراتي (AED - د.إ)</option>
                  <option value="EGP">الجنيه المصري (EGP - ج.م)</option>
                </select>
              </div>

              <div>
                <h3 className="text-xs font-bold text-slate-900 mb-2">
                  اختر القطاع التجاري لتخصيص شاشة الكاشير والقوالب:
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {industries.map((ind) => {
                    const Icon = ind.icon;
                    const active = selectedIndustry === ind.id;
                    return (
                      <div
                        key={ind.id}
                        data-testid={`onboarding-industry-${ind.id}`}
                        onClick={() => setSelectedIndustry(ind.id)}
                        className={`p-3 rounded-xl border cursor-pointer transition flex items-start gap-3 ${
                          active
                            ? 'border-slate-900 bg-slate-50 ring-1 ring-slate-900/15'
                            : 'border-slate-200 hover:border-slate-300 bg-white'
                        }`}
                      >
                        <div
                          className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                            active ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          <Icon className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs font-bold text-slate-900">{ind.titleAr}</div>
                          <div className="text-[10px] text-slate-500 leading-relaxed mt-0.5">
                            {ind.descAr}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
                <Building2 className="w-4 h-4 text-emerald-600" />
                <span>بيانات المنشأة وشعارك الخاص في الفواتير وشهادات الضمان:</span>
              </div>

              {/* Company Logo Upload Box */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/90 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-3.5">
                  <div className="w-16 h-16 rounded-2xl bg-white border-2 border-dashed border-slate-300 flex items-center justify-center overflow-hidden shrink-0 shadow-2xs">
                    {companyLogo ? (
                      <img
                        src={companyLogo}
                        alt="شعار المنشأة"
                        className="w-full h-full object-contain p-1"
                      />
                    ) : (
                      <ImageIcon className="w-6 h-6 text-slate-400" />
                    )}
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-900">
                      شعار المؤسسة / الشركة (يظهر في ترويسة كافة الفواتير)
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      يتم وضع شعارك وهويتك الخاصة في جميع فواتير العملاء بدلاً من أي شعار افتراضي
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <label
                    data-testid="onboarding-upload-logo-label"
                    className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer transition shadow-2xs"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>رفع الشعار</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleLogoUpload}
                      className="sr-only"
                    />
                  </label>
                  {companyLogo && (
                    <button
                      type="button"
                      onClick={() => setCompanyLogo('')}
                      className="px-2.5 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 text-xs font-bold cursor-pointer"
                    >
                      حذف
                    </button>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    اسم المنشأة أو الشركة (عربي) *
                  </label>
                  <input
                    type="text"
                    data-testid="onboarding-company-name-input"
                    value={companyNameAr}
                    onChange={(e) => setCompanyNameAr(e.target.value)}
                    placeholder="مثال: شركة النور للطاقة الشمسية والتجارة"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-slate-900 font-bold outline-hidden focus:border-slate-900"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    الاسم الإنجليزي للترويسة (اختياري)
                  </label>
                  <input
                    type="text"
                    value={companyNameEn}
                    onChange={(e) => setCompanyNameEn(e.target.value)}
                    placeholder="e.g. Al-Noor Solar & Trading Co."
                    dir="ltr"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-slate-900 font-semibold outline-hidden focus:border-slate-900"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    الرقم الضريبي / السجل التجاري
                  </label>
                  <input
                    type="text"
                    data-testid="onboarding-tax-number-input"
                    value={taxNumber}
                    onChange={(e) => setTaxNumber(e.target.value)}
                    dir="ltr"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-slate-900 font-mono font-bold outline-hidden focus:border-slate-900"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    اسم الفرع الرئيسي
                  </label>
                  <input
                    type="text"
                    data-testid="onboarding-branch-name-input"
                    value={branchNameAr}
                    onChange={(e) => setBranchNameAr(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-slate-900 outline-hidden focus:border-slate-900"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">المدينة / العنوان</label>
                  <input
                    type="text"
                    value={branchCity}
                    onChange={(e) => setBranchCity(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-slate-900 outline-hidden focus:border-slate-900"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    رقم هاتف خدمة العملاء
                  </label>
                  <input
                    type="text"
                    value={branchPhone}
                    onChange={(e) => setBranchPhone(e.target.value)}
                    dir="ltr"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-slate-900 font-mono outline-hidden focus:border-slate-900"
                  />
                </div>
              </div>

              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center gap-2 text-xs text-emerald-900 font-semibold">
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>
                  سيتم حفظ إعداداتك فوراً وتطبيق شعارك وهويتك الخاصة على جميع قوالب الفواتير وشهادات الضمان.
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Bottom Navigation Footer */}
        <div className="px-4 sm:px-6 py-3.5 bg-slate-50 border-t border-slate-200/80 flex items-center justify-between shrink-0">
          <div>
            {step > 1 ? (
              <button
                type="button"
                onClick={() => setStep((s) => (s - 1) as 1 | 2 | 3)}
                className="px-4 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 text-xs font-bold text-slate-700 flex items-center gap-1.5 cursor-pointer"
              >
                <ArrowRight className="w-3.5 h-3.5" />
                <span>السابق</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={onClose}
                className="px-3 py-2 text-xs font-bold text-slate-500 hover:text-slate-800 cursor-pointer"
              >
                تخطي الآن
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            {step < 3 ? (
              <button
                type="button"
                data-testid="onboarding-next-btn"
                onClick={() => setStep((s) => (s + 1) as 1 | 2 | 3)}
                className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <span>التالي</span>
                <ArrowLeft className="w-3.5 h-3.5" />
              </button>
            ) : (
              <button
                type="button"
                data-testid="onboarding-finish-btn"
                onClick={handleFinish}
                className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>اعتماد الهوية وبدء النظام</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
