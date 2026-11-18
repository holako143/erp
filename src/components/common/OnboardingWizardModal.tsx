import React, { useState, useEffect, useMemo } from 'react';
import { useERP } from '../../context/ERPContext';
import { Currency, IndustryType } from '../../types/erp';
import { evaluatePasswordStrength } from '../../core/securityEngine';
import {
  Building2,
  CheckCircle2,
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
  Palette,
  Lock,
  Eye,
  EyeOff,
  AlertTriangle,
  UserCheck,
} from 'lucide-react';
import { HasebBrandLogo } from './HasebBrandLogo';
import { useModalLayer, renderModalPortal } from '../../core/modalLayerEngine';

interface OnboardingWizardModalProps {
  isOpen: boolean;
  onClose: () => void;
  isMandatoryFirstRun?: boolean;
}

type UiThemeId = 'corporate_slate' | 'swiss_light' | 'haseb_royal' | 'haseb_sand' | 'obsidian_dark';
type ArabicFontId = 'cairo' | 'tajawal' | 'almarai' | 'ibm';

export const OnboardingWizardModal: React.FC<OnboardingWizardModalProps> = ({
  isOpen,
  onClose,
  isMandatoryFirstRun = false,
}) => {
  const {
    company,
    currentBranch,
    currentWarehouse,
    currency,
    activeIndustry,
    uiTheme,
    uiFont,
    idleTimeoutMinutes,
    completeFirstLaunchSetup,
  } = useERP();

  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Step 1: Company, Logo, Branch & Warehouse Identity (clean user inputs, zero demo data)
  const [companyNameAr, setCompanyNameAr] = useState(
    isMandatoryFirstRun ? '' : company.nameAr || ''
  );
  const [companyNameEn, setCompanyNameEn] = useState(
    isMandatoryFirstRun ? '' : company.name || ''
  );
  const [taxNumber, setTaxNumber] = useState(isMandatoryFirstRun ? '' : company.taxNumber || '');
  const [companyLogo, setCompanyLogo] = useState<string>(company.logo || '');
  const [branchNameAr, setBranchNameAr] = useState(
    currentBranch?.nameAr || 'الفرع الرئيسي'
  );
  const [warehouseNameAr, setWarehouseNameAr] = useState(
    currentWarehouse?.nameAr || 'المستودع الرئيسي'
  );
  const [branchCity, setBranchCity] = useState(currentBranch?.city || 'صنعاء');
  const [branchPhone, setBranchPhone] = useState(
    isMandatoryFirstRun ? '' : currentBranch?.phone || company.phone || ''
  );

  // Step 2: Currency, Industry, Theme & Font Preferences
  const [selectedIndustry, setSelectedIndustry] = useState<IndustryType>(
    activeIndustry || 'general'
  );
  const [selectedCurrency, setSelectedCurrency] = useState<Currency>(currency || 'YER');
  const [selectedTheme, setSelectedTheme] = useState<UiThemeId>(uiTheme || 'haseb_royal');
  const [selectedFont, setSelectedFont] = useState<ArabicFontId>(() => {
    if (uiFont === 'readex') return 'almarai';
    if (uiFont === 'ibm_plex') return 'ibm';
    if (uiFont === 'tajawal') return 'tajawal';
    return 'cairo';
  });

  // Step 3: Single General Manager Admin Account + Auto-Lock Security
  const [adminNameAr, setAdminNameAr] = useState('المدير العام');
  const [adminUsername, setAdminUsername] = useState('admin');
  const [adminPassword, setAdminPassword] = useState('');
  const [adminPasswordConfirm, setAdminPasswordConfirm] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [selectedIdleTimeout, setSelectedIdleTimeout] = useState<number>(idleTimeoutMinutes || 15);
  const [formError, setFormError] = useState<string | null>(null);
  const { zIndex, isTopLayer } = useModalLayer(isOpen, 80);

  useEffect(() => {
    if (isOpen && !isMandatoryFirstRun) {
      setCompanyNameAr(company.nameAr || '');
      setCompanyNameEn(company.name || '');
      setTaxNumber(company.taxNumber || '');
      setCompanyLogo(company.logo || '');
      setBranchNameAr(currentBranch?.nameAr || 'الفرع الرئيسي');
      setWarehouseNameAr(currentWarehouse?.nameAr || 'المستودع الرئيسي');
      setBranchCity(currentBranch?.city || 'صنعاء');
      setBranchPhone(currentBranch?.phone || company.phone || '');
      setSelectedCurrency(currency || 'YER');
      setSelectedIndustry(activeIndustry || 'general');
      setSelectedTheme(uiTheme || 'haseb_royal');
      setSelectedFont(
        uiFont === 'readex'
          ? 'almarai'
          : uiFont === 'ibm_plex'
          ? 'ibm'
          : uiFont === 'tajawal'
          ? 'tajawal'
          : 'cairo'
      );
    }
  }, [
    isOpen,
    isMandatoryFirstRun,
    company,
    currentBranch,
    currentWarehouse,
    currency,
    activeIndustry,
    uiTheme,
    uiFont,
  ]);

  const pwdStrength = useMemo(
    () => evaluatePasswordStrength(adminPassword),
    [adminPassword]
  );

  if (!isOpen) return null;

  const industries: {
    id: IndustryType;
    titleAr: string;
    descAr: string;
    icon: React.ElementType;
  }[] = [
    {
      id: 'general',
      titleAr: 'التجارة العامة والجملة والتوريدات',
      descAr: 'نظام محاسبي ومخزني متكامل لكافة الأنشطة التجارية والخدمية',
      icon: Store,
    },
    {
      id: 'electronics',
      titleAr: 'الإلكترونيات والأجهزة والطاقة',
      descAr: 'تتبع الأرقام التسلسلية (Serial) وشهادات الضمان والبيع التفصيلي',
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
  ];

  const themeOptions: { id: UiThemeId; labelAr: string; swatch: string }[] = [
    { id: 'haseb_royal', labelAr: 'الأزرق الملكي (موصى به)', swatch: 'from-blue-600 to-indigo-700' },
    { id: 'corporate_slate', labelAr: 'المؤسسي المتوازن', swatch: 'from-slate-700 to-blue-700' },
    { id: 'swiss_light', labelAr: 'النقي الكلاسيكي', swatch: 'from-sky-500 to-slate-600' },
    { id: 'haseb_sand', labelAr: 'الرملي الدافئ', swatch: 'from-amber-700 to-stone-700' },
    { id: 'obsidian_dark', labelAr: 'الليلي الداكن', swatch: 'from-slate-900 to-indigo-950' },
  ];

  const fontOptions: { id: ArabicFontId; labelAr: string }[] = [
    { id: 'cairo', labelAr: 'خط Cairo الحديث' },
    { id: 'tajawal', labelAr: 'خط Tajawal المتناسق' },
    { id: 'almarai', labelAr: 'خط Almarai الواضح' },
    { id: 'ibm', labelAr: 'خط IBM Plex العربي' },
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

  const handleNext = () => {
    setFormError(null);
    if (step === 1) {
      if (!companyNameAr.trim()) {
        setFormError('يرجى إدخال اسم المنشأة أو الشركة للمتابعة.');
        return;
      }
      setStep(2);
      return;
    }
    if (step === 2) {
      setStep(3);
    }
  };

  const handleFinish = () => {
    setFormError(null);
    if (!companyNameAr.trim()) {
      setStep(1);
      setFormError('يرجى إدخال اسم المنشأة أو الشركة.');
      return;
    }
    if (!adminUsername.trim()) {
      setFormError('يرجى إدخال اسم المستخدم للعضوية الإدارية.');
      return;
    }
    if (adminPassword.trim().length < 4) {
      setFormError('يجب أن لا تقل كلمة المرور عن 4 أحرف لحماية حساب المدير العام.');
      return;
    }
    if (adminPassword !== adminPasswordConfirm) {
      setFormError('تأكيد كلمة المرور غير متطابق.');
      return;
    }

    const res = completeFirstLaunchSetup({
      companyNameAr: companyNameAr.trim(),
      companyNameEn: companyNameEn.trim() || companyNameAr.trim(),
      logoDataUrl: companyLogo || undefined,
      taxNumber: taxNumber.trim(),
      phone: branchPhone.trim(),
      address: `${branchCity.trim() || 'صنعاء'} - ${branchNameAr.trim() || 'الفرع الرئيسي'}`,
      city: branchCity.trim() || 'صنعاء',
      branchNameAr: branchNameAr.trim() || 'الفرع الرئيسي',
      warehouseNameAr: warehouseNameAr.trim() || 'المستودع الرئيسي',
      currency: selectedCurrency,
      industry: selectedIndustry,
      uiTheme: selectedTheme,
      arabicFont: selectedFont,
      adminNameAr: adminNameAr.trim() || 'المدير العام',
      adminUsername: adminUsername.trim(),
      adminPassword: adminPassword.trim(),
      idleTimeoutMinutes: selectedIdleTimeout,
    });

    if (!res.success) {
      setFormError(res.errorAr || 'تعذر إتمام الإعداد الأولي');
      return;
    }

    onClose();
  };

  return renderModalPortal(
    <div
      dir="rtl"
      data-testid="onboarding-wizard-modal"
      data-modal-top={isTopLayer ? 'true' : 'false'}
      style={{ zIndex }}
      data-mandatory-lock={isMandatoryFirstRun ? 'true' : undefined}
      onMouseDown={(e) => {
        if (!isMandatoryFirstRun && e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 bg-slate-900/75 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4"
    >
      <div className="bg-white rounded-t-3xl sm:rounded-2xl border border-slate-200/80 max-w-3xl w-full max-h-[94dvh] flex flex-col overflow-hidden shadow-2xl">
        {/* Top Welcome Banner */}
        <div className="px-4 sm:px-6 py-4 haseb-card-gradient text-white flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <HasebBrandLogo size="lg" theme="obsidian_dark" className="shrink-0" />
            <div className="min-w-0">
              <h2 className="font-black text-sm sm:text-base text-white truncate flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-emerald-300 shrink-0" />
                <span>
                  {isMandatoryFirstRun
                    ? 'مرحباً بك في نظام حاسب المؤسسي — التهيئة الأولية'
                    : 'معالج إعداد هوية المنشأة وتفضيلات النظام'}
                </span>
              </h2>
              <p className="text-[11px] text-white/80 mt-0.5 truncate">
                ابدأ بقاعدة بيانات نظيفة 100% مع شعارك وهويتك الخاصة وعضوية المدير العام المحمية
              </p>
            </div>
          </div>

          {!isMandatoryFirstRun && (
            <button
              type="button"
              data-testid="onboarding-close-btn"
              onClick={onClose}
              className="w-8 h-8 rounded-full border border-white/25 bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition cursor-pointer shrink-0"
              title="إغلاق"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Stepper Progress Bar */}
        <div className="px-4 sm:px-6 py-2.5 bg-slate-50 border-b border-slate-200/70 flex items-center justify-between text-xs shrink-0 overflow-x-auto gap-2">
          {[
            { num: 1, title: '1. هوية المنشأة والفرع' },
            { num: 2, title: '2. النشاط والعملة والمظهر' },
            { num: 3, title: '3. حساب المدير العام والحماية' },
          ].map((s) => (
            <button
              key={s.num}
              type="button"
              onClick={() => {
                if (s.num <= step || companyNameAr.trim()) setStep(s.num as 1 | 2 | 3);
              }}
              className={`flex items-center gap-1.5 font-bold cursor-pointer transition shrink-0 ${
                step === s.num
                  ? 'text-blue-700'
                  : step > s.num
                  ? 'text-emerald-600'
                  : 'text-slate-400'
              }`}
            >
              <span
                className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-mono ${
                  step === s.num
                    ? 'haseb-btn-primary text-white'
                    : step > s.num
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-slate-200 text-slate-500'
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
          {formError && (
            <div
              data-testid="onboarding-error-banner"
              className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold flex items-center gap-2"
            >
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
                <Building2 className="w-4 h-4 text-blue-600" />
                <span>بيانات منشأتك وشعارها الخاص (يظهر حصرياً في الفواتير وشهادات الضمان):</span>
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
                      شعار المؤسسة / الشركة (اختياري)
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      يظهر شعارك وهويتك الخاصة في جميع فواتير العملاء دون أي اسم نظام خارجي
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <label
                    data-testid="onboarding-upload-logo-label"
                    className="px-3.5 py-2 rounded-xl haseb-btn-primary text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer transition shadow-2xs"
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
                    placeholder="أدخل اسم متجرك أو شركتك"
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-slate-900 font-bold outline-hidden focus:border-blue-600"
                    required
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
                    placeholder="Company English Name (Optional)"
                    dir="ltr"
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-slate-900 font-semibold outline-hidden focus:border-blue-600"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    الرقم الضريبي / السجل التجاري (اختياري)
                  </label>
                  <input
                    type="text"
                    data-testid="onboarding-tax-number-input"
                    value={taxNumber}
                    onChange={(e) => setTaxNumber(e.target.value)}
                    placeholder="أدخل الرقم الضريبي إن وجد"
                    dir="ltr"
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-slate-900 font-mono font-bold outline-hidden focus:border-blue-600"
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
                    placeholder="+967 77..."
                    dir="ltr"
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-slate-900 font-mono outline-hidden focus:border-blue-600"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">اسم الفرع الرئيسي</label>
                  <input
                    type="text"
                    data-testid="onboarding-branch-name-input"
                    value={branchNameAr}
                    onChange={(e) => setBranchNameAr(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-slate-900 outline-hidden focus:border-blue-600"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">اسم المستودع الرئيسي</label>
                  <input
                    type="text"
                    data-testid="onboarding-warehouse-name-input"
                    value={warehouseNameAr}
                    onChange={(e) => setWarehouseNameAr(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-slate-900 outline-hidden focus:border-blue-600"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block font-bold text-slate-700 mb-1">المدينة / العنوان</label>
                  <input
                    type="text"
                    value={branchCity}
                    onChange={(e) => setBranchCity(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-slate-900 outline-hidden focus:border-blue-600"
                  />
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
                  onChange={(e) => setSelectedCurrency(e.target.value as Currency)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-xs font-bold text-slate-900 outline-hidden focus:border-blue-600"
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
                            ? 'border-blue-600 bg-blue-50/70 ring-1 ring-blue-600/20'
                            : 'border-slate-200 hover:border-slate-300 bg-white'
                        }`}
                      >
                        <div
                          className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                            active ? 'haseb-btn-primary text-white' : 'bg-slate-100 text-slate-600'
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

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                  <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                    <Palette className="w-3.5 h-3.5 text-blue-600" />
                    <span>مظهر وألوان الواجهة:</span>
                  </div>
                  <div className="grid grid-cols-2 gap-1.5">
                    {themeOptions.map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => setSelectedTheme(t.id)}
                        className={`px-2.5 py-2 rounded-xl border text-[11px] font-bold flex items-center gap-2 cursor-pointer transition ${
                          selectedTheme === t.id
                            ? 'border-blue-600 bg-white text-blue-700 shadow-2xs'
                            : 'border-slate-200 bg-white/70 text-slate-700 hover:bg-white'
                        }`}
                      >
                        <span className={`w-3.5 h-3.5 rounded-full bg-linear-to-br ${t.swatch} shrink-0`} />
                        <span className="truncate">{t.labelAr}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                  <div className="text-xs font-bold text-slate-900">الخط العربي المفضل:</div>
                  <div className="grid grid-cols-2 gap-1.5">
                    {fontOptions.map((f) => (
                      <button
                        key={f.id}
                        type="button"
                        onClick={() => setSelectedFont(f.id)}
                        className={`px-2.5 py-2 rounded-xl border text-[11px] font-bold cursor-pointer transition ${
                          selectedFont === f.id
                            ? 'border-blue-600 bg-white text-blue-700 shadow-2xs'
                            : 'border-slate-200 bg-white/70 text-slate-700 hover:bg-white'
                        }`}
                      >
                        {f.labelAr}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <div className="p-3.5 rounded-2xl bg-blue-50/80 border border-blue-200 flex items-start gap-3">
                <UserCheck className="w-5 h-5 text-blue-700 shrink-0 mt-0.5" />
                <div>
                  <div className="text-xs font-bold text-blue-950">
                    العضوية السيادية الوحيدة — المدير العام (بدون حسابات افتراضية أخرى)
                  </div>
                  <p className="text-[11px] text-blue-800 mt-0.5 leading-relaxed">
                    لأعلى درجات الأمان، يتم إنشاء عضوية واحدة فقط باسم المدير العام وبكلمة مرور خاصة بك مشفرة محلياً. يمكنك إضافة الموظفين لاحقاً من مركز الحماية.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">اسم العضوية الرسمي</label>
                  <input
                    type="text"
                    data-testid="onboarding-admin-name-input"
                    value={adminNameAr}
                    onChange={(e) => setAdminNameAr(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-slate-900 font-bold outline-hidden focus:border-blue-600"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">اسم المستخدم للدخول *</label>
                  <input
                    type="text"
                    data-testid="onboarding-admin-username-input"
                    value={adminUsername}
                    onChange={(e) => setAdminUsername(e.target.value)}
                    dir="ltr"
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-slate-900 font-mono font-bold outline-hidden focus:border-blue-600"
                    required
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">كلمة المرور الخاصة بك *</label>
                  <div className="relative">
                    <Lock className="w-3.5 h-3.5 text-slate-400 absolute top-3 start-3" />
                    <input
                      type={showPwd ? 'text' : 'password'}
                      data-testid="onboarding-admin-password-input"
                      value={adminPassword}
                      onChange={(e) => setAdminPassword(e.target.value)}
                      placeholder="4 أحرف على الأقل"
                      dir="ltr"
                      className="w-full ps-9 pe-9 py-2.5 rounded-xl border border-slate-300 text-slate-900 font-mono font-bold outline-hidden focus:border-blue-600"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPwd(!showPwd)}
                      className="absolute top-2.5 end-2.5 text-slate-400 hover:text-slate-700 p-0.5 cursor-pointer"
                    >
                      {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">تأكيد كلمة المرور *</label>
                  <input
                    type={showPwd ? 'text' : 'password'}
                    data-testid="onboarding-admin-confirm-input"
                    value={adminPasswordConfirm}
                    onChange={(e) => setAdminPasswordConfirm(e.target.value)}
                    placeholder="أعد إدخال كلمة المرور"
                    dir="ltr"
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-slate-900 font-mono font-bold outline-hidden focus:border-blue-600"
                    required
                  />
                </div>
              </div>

              {/* Live Password Strength Meter */}
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
                <div className="flex items-center justify-between text-[11px] font-bold">
                  <span className="text-slate-600">مؤشر قوة كلمة المرور:</span>
                  <span
                    className={
                      pwdStrength.score >= 3
                        ? 'text-emerald-700'
                        : pwdStrength.score === 2
                        ? 'text-amber-700'
                        : 'text-rose-700'
                    }
                  >
                    {pwdStrength.labelAr}
                  </span>
                </div>
                <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all ${
                      pwdStrength.score >= 3
                        ? 'bg-emerald-500'
                        : pwdStrength.score === 2
                        ? 'bg-amber-500'
                        : 'bg-rose-500'
                    }`}
                    style={{ width: `${Math.max(10, pwdStrength.score * 25)}%` }}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
                <div>
                  <div className="text-xs font-bold text-slate-900">القفل التلقائي عند الخمول:</div>
                  <div className="text-[11px] text-slate-500">
                    يقفل الشاشة تلقائياً لحماية البيانات عند ترك الجهاز
                  </div>
                </div>
                <select
                  value={selectedIdleTimeout}
                  onChange={(e) => setSelectedIdleTimeout(Number(e.target.value))}
                  className="px-3 py-2 rounded-xl border border-slate-300 bg-white text-xs font-bold text-slate-900 outline-hidden focus:border-blue-600"
                >
                  <option value={5}>بعد 5 دقائق</option>
                  <option value={15}>بعد 15 دقيقة (موصى به)</option>
                  <option value={30}>بعد 30 دقيقة</option>
                  <option value={60}>بعد 60 دقيقة</option>
                </select>
              </div>

              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center gap-2 text-xs text-emerald-900 font-semibold">
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>
                  النسخة مقيدة ببصمة الجهاز الحالية وبحماية ضد التلاعب بالوقت وأكواد تفعيل لمرة واحدة.
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
                onClick={() => {
                  setFormError(null);
                  setStep((s) => (s - 1) as 1 | 2 | 3);
                }}
                className="px-4 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 text-xs font-bold text-slate-700 flex items-center gap-1.5 cursor-pointer"
              >
                <ArrowRight className="w-3.5 h-3.5" />
                <span>السابق</span>
              </button>
            ) : !isMandatoryFirstRun ? (
              <button
                type="button"
                onClick={onClose}
                className="px-3 py-2 text-xs font-bold text-slate-500 hover:text-slate-800 cursor-pointer"
              >
                إغلاق
              </button>
            ) : (
              <span className="text-[11px] font-bold text-slate-500">
                الخطوة {step} من 3
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {step < 3 ? (
              <button
                type="button"
                data-testid="onboarding-next-btn"
                onClick={handleNext}
                className="px-5 py-2.5 rounded-xl haseb-btn-primary text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs"
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
                <span>حفظ الهوية وتشغيل النظام</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
