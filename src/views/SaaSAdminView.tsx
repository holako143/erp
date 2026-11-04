import React, { useState } from 'react';
import { useERP } from '../context/ERPContext';
import {
  CloudCog,
  Users,
  GitBranch,
  ShieldCheck,
  Check,
  ArrowRight,
  ArrowLeft,
  Crown,
  Layers,
  Store,
  Pill,
  Cpu,
  Utensils,
  Factory,
  HardHat,
} from 'lucide-react';

export const SaaSAdminView: React.FC = () => {
  const {
    tenants,
    currentTenant,
    setCurrentTenant,
    addTenant,
    updateTenantPlan,
    activeIndustry,
    setActiveIndustry,
    currency,
    language,
    direction,
  } = useERP();

  const [showAddTenant, setShowAddTenant] = useState(false);
  const [newTenantName, setNewTenantName] = useState('');
  const [newTenantCode, setNewTenantCode] = useState('KSA-04');
  const [newTenantPlan, setNewTenantPlan] = useState<'starter' | 'professional' | 'enterprise'>('enterprise');
  const [saasNotice, setSaasNotice] = useState<string | null>(null);

  const ArrowIcon = direction === 'rtl' ? ArrowLeft : ArrowRight;

  const handleProvisionTenant = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTenantName.trim() || !newTenantCode.trim()) return;
    addTenant({
      name: newTenantName.trim(),
      legalName: newTenantName.trim(),
      code: newTenantCode.trim().toUpperCase(),
      planId: newTenantPlan,
      status: 'active',
      maxUsers: newTenantPlan === 'enterprise' ? 50 : newTenantPlan === 'professional' ? 15 : 5,
      maxBranches: newTenantPlan === 'enterprise' ? 10 : newTenantPlan === 'professional' ? 3 : 1,
      maxWarehouses: newTenantPlan === 'enterprise' ? 20 : 5,
    });
    setNewTenantName('');
    setShowAddTenant(false);
  };

  const industryPresets = [
    {
      id: 'electronics',
      nameAr: 'الإلكترونيات، الطاقة الشمسية، البطاريات والضمان',
      nameEn: 'Electronics, Solar, Batteries & Serialized Devices',
      icon: Cpu,
      featuresAr: 'باركود قطعة فردي لكل جهاز (IMEI / Serial Number)، حاسبة تحجيم منظومات الطاقة الشمسية والبطاريات، وشهادة ضمان مرتبطة برقم الفاتورة والعميل.',
      featuresEn: 'Unique piece-level serial/IMEI tracking, solar & battery engineering sizing, warranty lifecycle validation by serial.',
    },
    {
      id: 'grocery',
      nameAr: 'التجزئة والسوبرماركت والتموينات',
      nameEn: 'Retail & Supermarket Chains',
      icon: Store,
      featuresAr: 'باركود GS1 EAN-13، ميزان إلكتروني، تعدد وحدات القياس (حبة/شدة/كرتون)، كاشير سريع، وعروض ترويجية.',
      featuresEn: 'GS1 EAN-13, weight-embedded barcodes, multi-UOM, fast POS checkout, and loyalty promotions.',
    },
    {
      id: 'pharmacy',
      nameAr: 'الصيدليات والمستلزمات الطبية',
      nameEn: 'Pharmacies & Medical Supplies',
      icon: Pill,
      featuresAr: 'تتبع أرقام التشغيلات (Batch/Lot) وتواريخ الصلاحية FEFO، ومنع بيع الأصناف المنتهية الصلاحية آلياً.',
      featuresEn: 'Strict Batch/Lot & Expiry Date (FEFO) tracking, automated expired item block.',
    },
    {
      id: 'restaurant',
      nameAr: 'المطاعم والكافيهات والمطابخ السحابية',
      nameEn: 'Restaurants & Cloud Kitchens',
      icon: Utensils,
      featuresAr: 'رسبي ومكونات الوجبات (Recipe BOM)، شاشة مطبخ، طلبات محلي/سفري/توصيل، وحساب تكلفة الطبق.',
      featuresEn: 'Menu recipe BOM depletion, dine-in/takeaway POS modes, and food cost analytics.',
    },
    {
      id: 'general',
      nameAr: 'المصانع وخطوط الإنتاج والتوريد الصناعي',
      nameEn: 'Manufacturing & Industrial Plants',
      icon: Factory,
      featuresAr: 'قوائم المواد BOM، أوامر التصنيع، حساب الهالك وتكاليف التشغيل، وتوكيد الجودة QC.',
      featuresEn: 'Multi-level BOM, work orders, scrap & labor costing, and QC inspection tickets.',
    },
    {
      id: 'contracting',
      nameAr: 'المقاولات والمشاريع الهندسية',
      nameEn: 'Construction & Engineering Projects',
      icon: HardHat,
      featuresAr: 'مراكز تكلفة للمشاريع، مستخلصات، إدارة الأسطول والمعدات الثقيلة، وصرف مواد للمواقع.',
      featuresEn: 'Project cost centers, milestone billing, heavy fleet tracking, and site material requisitions.',
    },
  ];

  const plans = [
    {
      id: 'starter',
      nameAr: 'الباقة الأساسية (Starter)',
      nameEn: 'Starter Tier',
      price: 499,
      maxUsers: 5,
      maxBranches: 1,
      modules: ['Core Platform', 'Barcode Engine', 'Inventory', 'POS Register', 'Basic Accounting'],
    },
    {
      id: 'professional',
      nameAr: 'الباقة المتقدمة (Professional)',
      nameEn: 'Professional Tier',
      price: 1299,
      maxUsers: 15,
      maxBranches: 3,
      modules: ['Core Platform', 'Barcode & Serials', 'Inventory & WMS', 'Purchasing', 'Sales', 'Full Accounting', 'AI Copilot'],
    },
    {
      id: 'enterprise',
      nameAr: 'باقة الشركات الكبرى (Enterprise)',
      nameEn: 'Enterprise Tier',
      price: 2999,
      maxUsers: 50,
      maxBranches: 10,
      modules: ['All 14 Modular Suites (Manufacturing, Fleet, Quality, Projects, HR, CRM, E-Commerce, Full AI)'],
      isPopular: true,
    },
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <CloudCog className="w-6 h-6 text-rose-600" />
            <span>{language === 'ar' ? 'إدارة المنصة والاشتراكات التجارية (SaaS Multi-Tenant Portal)' : 'SaaS Commercial Platform & Tenants'}</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            {language === 'ar'
              ? 'إدارة المستأجرين المشتركين، قوالب الأنشطة القطاعية، الباقات الشهرية والسنوية، وعزل البيانات'
              : 'Multi-tenant subscription management, industry activity presets, isolation enforcement, and plan modularity'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowAddTenant(!showAddTenant)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-3.5 py-2 rounded-xl font-bold text-xs transition cursor-pointer"
          >
            {language === 'ar' ? '+ تهيئة مستأجر / شركة جديدة' : '+ Provision New Tenant'}
          </button>
          <span className="bg-rose-50 text-rose-700 border border-rose-200 px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5">
            <Crown className="w-4 h-4 text-rose-600" />
            <span>{language === 'ar' ? 'لوحة تحكم مدير المنصة Super Admin' : 'Super Admin Portal'}</span>
          </span>
        </div>
      </div>

      {showAddTenant && (
        <form
          onSubmit={handleProvisionTenant}
          className="bg-white p-4 rounded-2xl border border-indigo-200 shadow-xs grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs items-end"
        >
          <div>
            <label className="block font-bold text-slate-700 mb-1">الاسم القانوني للشركة / المستأجر</label>
            <input
              type="text"
              required
              value={newTenantName}
              onChange={(e) => setNewTenantName(e.target.value)}
              placeholder="مجموعة النخبة التجارية القابضة..."
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg"
            />
          </div>
          <div>
            <label className="block font-bold text-slate-700 mb-1">كود المستأجر (Tenant Code)</label>
            <input
              type="text"
              required
              value={newTenantCode}
              onChange={(e) => setNewTenantCode(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg font-mono"
            />
          </div>
          <div>
            <label className="block font-bold text-slate-700 mb-1">الباقة التجارية</label>
            <select
              value={newTenantPlan}
              onChange={(e) => setNewTenantPlan(e.target.value as any)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg font-bold"
            >
              <option value="enterprise">Enterprise (50 Users / 10 Branches)</option>
              <option value="professional">Professional (15 Users / 3 Branches)</option>
              <option value="starter">Starter (5 Users / 1 Branch)</option>
            </select>
          </div>
          <button
            type="submit"
            className="py-2 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg cursor-pointer"
          >
            إنشاء وتفعيل البيئة المعزولة
          </button>
        </form>
      )}

      {/* Tenants Directory Cards */}
      <div className="space-y-3">
        <h3 className="font-bold text-sm text-slate-800">
          {language === 'ar' ? 'الشركات والمستأجرين النشطين (Active Tenants)' : 'Active Subscribed Tenants'}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {tenants.map((ten) => {
            const isCurrent = currentTenant.id === ten.id;
            return (
              <div
                key={ten.id}
                className={`p-5 rounded-2xl border transition flex flex-col justify-between ${
                  isCurrent
                    ? 'bg-gradient-to-b from-indigo-50/50 to-white border-indigo-500 shadow-md ring-2 ring-indigo-500/20'
                    : 'bg-white border-slate-200 shadow-2xs hover:border-slate-300'
                }`}
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono font-bold bg-slate-100 text-slate-700 px-2 py-0.5 rounded">
                      CODE: {ten.code}
                    </span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                        ten.planId === 'enterprise'
                          ? 'bg-purple-100 text-purple-800'
                          : 'bg-blue-100 text-blue-800'
                      }`}
                    >
                      {ten.planId}
                    </span>
                  </div>

                  <div className="font-bold text-slate-900 text-sm">{language === 'ar' ? ten.legalName : ten.name}</div>

                  <div className="text-xs text-slate-500 space-y-1 pt-1 font-medium">
                    <div className="flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-slate-400" />
                      <span>{language === 'ar' ? 'الحد الأقصى للمستخدمين:' : 'Max Users:'} <strong>{ten.maxUsers}</strong></span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <GitBranch className="w-3.5 h-3.5 text-slate-400" />
                      <span>{language === 'ar' ? 'الحد الأقصى للفروع:' : 'Max Branches:'} <strong>{ten.maxBranches}</strong></span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                      <span>{language === 'ar' ? 'العزل في قاعدة البيانات:' : 'Database Isolation:'} <strong>Strict ACID</strong></span>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100 mt-4">
                  {isCurrent ? (
                    <div className="text-center font-bold text-xs text-indigo-700 bg-indigo-50 py-2 rounded-xl">
                      {language === 'ar' ? 'المستأجر النشط حالياً ✅' : 'Current Active Workspace ✅'}
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setCurrentTenant(ten)}
                      className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl transition flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <span>{language === 'ar' ? 'التبديل إلى بيئة هذا المستأجر' : 'Switch to this Tenant'}</span>
                      <ArrowIcon className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {saasNotice && (
        <div
          data-testid="saas-feedback-banner"
          className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-950 text-xs font-bold flex items-center justify-between"
        >
          <span>{saasNotice}</span>
          <button
            type="button"
            onClick={() => setSaasNotice(null)}
            className="text-emerald-700 hover:text-emerald-950 font-bold cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* Multi-Industry Activity Presets */}
      <div className="space-y-3 pt-2">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-sm text-slate-800 flex items-center gap-2">
            <Layers className="w-4 h-4 text-indigo-600" />
            <span>{language === 'ar' ? 'قوالب تهيئة الأنشطة التجارية والقطاعية (Multi-Industry Presets)' : 'Multi-Industry Activity Presets'}</span>
          </h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {industryPresets.map((ind) => {
            const Icon = ind.icon;
            const isSelected = activeIndustry === ind.id;
            return (
              <div
                key={ind.id}
                data-testid={`saas-industry-card-${ind.id}`}
                onClick={() => {
                  setActiveIndustry(ind.id as any);
                  setSaasNotice(
                    language === 'ar'
                      ? `تم تفعيل قالب النشاط التجاري (${ind.nameAr}) وتحديث قوالب الفواتير وحقول المخزون فعلياً!`
                      : `Activated industry preset (${ind.nameEn}) across the platform!`
                  );
                }}
                className={`p-4 rounded-xl border transition cursor-pointer ${
                  isSelected
                    ? 'bg-indigo-50/60 border-indigo-500 shadow-xs'
                    : 'bg-white border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className={`p-2 rounded-lg ${isSelected ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-700'}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <span className="font-bold text-slate-900 text-xs">
                      {language === 'ar' ? ind.nameAr : ind.nameEn}
                    </span>
                  </div>
                  {isSelected && (
                    <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">
                      {language === 'ar' ? 'مفعل فعلياً' : 'Active'}
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  {language === 'ar' ? ind.featuresAr : ind.featuresEn}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Commercial Plans Pricing Matrix */}
      <div className="space-y-3 pt-2">
        <h3 className="font-bold text-sm text-slate-800">
          {language === 'ar' ? 'باقات الاشتراك التجاري والأسعار (Subscription Plans)' : 'Commercial Subscription Plans'}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {plans.map((p) => {
            const isCurrentPlan = currentTenant.planId === p.id;
            return (
              <div
                key={p.id}
                className={`bg-white rounded-2xl border p-6 flex flex-col justify-between ${
                  isCurrentPlan ? 'border-indigo-600 shadow-md ring-2 ring-indigo-500/20' : 'border-slate-200 shadow-2xs'
                }`}
              >
                <div>
                  {p.isPopular && (
                    <span className="bg-indigo-600 text-white text-[10px] font-bold px-2.5 py-0.5 rounded-full inline-block mb-2">
                      {language === 'ar' ? 'الأكثر طلباً للشركات' : 'Most Popular'}
                    </span>
                  )}
                  <h4 className="font-bold text-slate-900 text-base">{language === 'ar' ? p.nameAr : p.nameEn}</h4>
                  <div className="mt-3 flex items-baseline gap-1">
                    <span className="text-3xl font-black text-slate-900">{p.price}</span>
                    <span className="text-xs text-slate-500 font-bold">{currency} / {language === 'ar' ? 'شهر' : 'month'}</span>
                  </div>

                  <div className="mt-4 pt-4 border-t border-slate-100 space-y-2 text-xs">
                    <div className="font-bold text-slate-700">{language === 'ar' ? 'الميزات والوحدات المشمولة:' : 'Included Modules:'}</div>
                    {p.modules.map((m, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-slate-600">
                        <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span>{m}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-6 mt-6 border-t border-slate-100 space-y-2">
                  <div className="w-full py-2 bg-slate-50 text-slate-700 font-bold text-xs rounded-xl text-center border border-slate-200">
                    {language === 'ar' ? `الحد الأقصى: ${p.maxUsers} مستخدمين / ${p.maxBranches} فروع` : `Up to ${p.maxUsers} Users / ${p.maxBranches} Branches`}
                  </div>
                  <button
                    type="button"
                    data-testid={`saas-plan-btn-${p.id}`}
                    onClick={() => {
                      updateTenantPlan(currentTenant.id, p.id as any);
                      setSaasNotice(
                        language === 'ar'
                          ? `تم تحديث باقة المستأجر (${currentTenant.legalName}) إلى (${p.nameAr}) بسعة ${p.maxUsers} مستخدمين و${p.maxBranches} فروع بنجاح!`
                          : `Updated tenant (${currentTenant.name}) subscription tier to (${p.nameEn})!`
                      );
                    }}
                    className={`w-full py-2.5 font-bold text-xs rounded-xl transition cursor-pointer ${
                      isCurrentPlan
                        ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                        : 'bg-slate-900 hover:bg-slate-800 text-white'
                    }`}
                  >
                    {isCurrentPlan
                      ? language === 'ar'
                        ? 'الباقة المفعلة للمستأجر الحالي ✅'
                        : 'Current Active Tier ✅'
                      : language === 'ar'
                      ? 'تفعيل / ترقية إلى هذه الباقة'
                      : 'Switch to this Tier'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
