import React, { useState } from 'react';
import { useERP } from '../context/ERPContext';
import {
  IndustryType,
  ThermalTemplateType,
  StandardInvoiceTemplateType,
  SalesInvoice,
} from '../types/erp';
import { InvoiceRenderer } from '../components/invoices/InvoiceRenderer';
import {
  Settings,
  Building2,
  GitBranch,
  Warehouse,
  Save,
  RotateCcw,
  Download,
  CheckCircle2,
  Utensils,
  Cpu,
  ShoppingBasket,
  Pill,
  HardHat,
  Layers,
  Receipt,
  FileText,
  Printer,
  Plus,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react';

export const SettingsView: React.FC = () => {
  const {
    currentTenant,
    company,
    branches,
    warehouses,
    currentBranch,
    setCurrentBranch,
    resetToInitialDemo,
    products,
    salesInvoices,
    journalEntries,
    auditLogs,
    activeIndustry,
    setActiveIndustry,
    invoiceTemplateSettings,
    updateInvoiceTemplateSettings,
    updateCompanyProfile,
    addBranch,
    addWarehouse,
    currency,
    isSidebarCollapsed,
    setIsSidebarCollapsed,
    importBackupJSON,
    uiTheme,
    setUiTheme,
    uiDensity,
    setUiDensity,
  } = useERP();

  const [activeSettingsTab, setActiveSettingsTab] = useState<
    'industry' | 'templates' | 'organization' | 'backup'
  >('industry');

  const [companyName, setCompanyName] = useState(company.nameAr || currentTenant.legalName);
  const [taxNumber, setTaxNumber] = useState(company.taxNumber || '300059281900003');
  const [defaultVat, setDefaultVat] = useState(15);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const [restoreFeedback, setRestoreFeedback] = useState<string | null>(null);
  const [previewMode, setPreviewMode] = useState<'thermal' | 'a4'>('thermal');

  // New Branch & Warehouse state
  const [newBranchNameAr, setNewBranchNameAr] = useState('');
  const [newBranchCity, setNewBranchCity] = useState('');
  const [newBranchPhone, setNewBranchPhone] = useState('+966 11 450 0000');

  const [newWhNameAr, setNewWhNameAr] = useState('');
  const [newWhCode, setNewWhCode] = useState('');

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    updateCompanyProfile({ nameAr: companyName, name: companyName, taxNumber });
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  const handleAddBranch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBranchNameAr.trim()) return;
    addBranch({
      code: `BR-0${branches.length + 1}`,
      nameAr: newBranchNameAr.trim(),
      name: newBranchNameAr.trim(),
      city: newBranchCity.trim() || 'الرياض',
      phone: newBranchPhone.trim() || '+966 11 000 0000',
      isActive: true,
    });
    setNewBranchNameAr('');
    setNewBranchCity('');
  };

  const handleAddWarehouse = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWhNameAr.trim()) return;
    addWarehouse({
      code: newWhCode.trim() || `WH-0${warehouses.length + 1}`,
      nameAr: newWhNameAr.trim(),
      name: newWhNameAr.trim(),
      branchId: currentBranch.id,
      isDefault: false,
    });
    setNewWhNameAr('');
    setNewWhCode('');
  };

  const handleExportJSON = () => {
    let fullSnapshot: Record<string, any> = {};
    try {
      const raw = localStorage.getItem('rlm_erp_instant_v4_solar');
      if (raw) fullSnapshot = JSON.parse(raw);
    } catch {
      // Fallback to active slices
    }
    const backupPayload = {
      exportedAt: new Date().toISOString(),
      tenant: currentTenant,
      company,
      activeIndustry,
      invoiceTemplateSettings,
      branches,
      warehouses,
      productsCount: products.length,
      salesInvoicesCount: salesInvoices.length,
      journalEntriesCount: journalEntries.length,
      auditLogsCount: auditLogs.length,
      data: {
        ...fullSnapshot,
        products,
        salesInvoices,
        journalEntries,
      },
    };
    const blob = new Blob([JSON.stringify(backupPayload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `RLM-ERP-Backup-${currentTenant.code}-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const industryCatalog: {
    id: IndustryType;
    titleAr: string;
    subtitleAr: string;
    icon: React.ElementType;
    badgeAr: string;
    accentColor: string;
    features: string[];
    defaultThermal: ThermalTemplateType;
    defaultA4: StandardInvoiceTemplateType;
  }[] = [
    {
      id: 'electronics',
      titleAr: 'الإلكترونيات، الطاقة الشمسية، البطاريات والشاشات الذكية',
      subtitleAr: 'Electronics, Solar Panels, Inverters, Batteries & Smart Screens',
      icon: Cpu,
      badgeAr: 'ألواح شمسية + بطاريات + ضمان وسيريال',
      accentColor: 'bg-teal-700',
      features: [
        'حاسبة هندسية ذكية لمنظومات الطاقة الشمسية (585W) والإنفرترات الهجينة وبنوك البطاريات (LiFePO4 / Gel)',
        'تتبع الأرقام التسلسلية الفريدة (SN / IMEI) للألواح والبطاريات والإنفرترات والشاشات الذكية 4K/OLED',
        'تحديد فترة الضمان بالأشهر (24 إلى 144 شهراً) وطباعة شهادة ضمان الوكيل المعتمد',
        'قالب فاتورة A4 مدمج مع وثيقة ضمان رسمية وقالب حراري 80mm بالسيريال والضمان',
      ],
      defaultThermal: 'thermal_80mm_warranty',
      defaultA4: 'a4_warranty_electronics',
    },
    {
      id: 'restaurant',
      titleAr: 'المطاعم والكافيهات والضيافة',
      subtitleAr: 'Restaurants, Cafes & Cloud Kitchens',
      icon: Utensils,
      badgeAr: 'طاولات + شاشة مطبخ KDS',
      accentColor: 'bg-amber-700',
      features: [
        'إدارة الطاولات والصالات (T-01 إلى T-08) وحالة الإشغال',
        'تحديد نوع الطلب في الكاشير (محلي Dine-In / سفري Takeaway / توصيل Delivery)',
        'شاشة مطبخ تفاعلية (KDS) وإرسال تذكرة تحضير فورية (KOT)',
        'ملاحظات التحضير للأصناف (بدون بصل، زيادة جبن، درجة استواء) وحساب السعرات',
      ],
      defaultThermal: 'thermal_80mm_restaurant',
      defaultA4: 'a4_modern_blue',
    },
    {
      id: 'grocery',
      titleAr: 'البقالات والسوبرماركت والتموينات',
      subtitleAr: 'Supermarkets, Hypermarkets & Groceries',
      icon: ShoppingBasket,
      badgeAr: 'باركود الميزان + كاشير سريع',
      accentColor: 'bg-emerald-700',
      features: [
        'دعم باركود الميزان الإلكتروني للأصناف الموزونة (بادئة 21 للأجبان والتمور والخضار)',
        'تعدد وحدات القياس للصنف الواحد (حبة / شدة / كرتون) مع تحويل تلقائي',
        'فئات النقدية السريعة (50 / 100 / 200 / 500) وحاسبة الباقي للعميل',
        'قالب إيصال حراري مدمج 58mm و80mm عالي السرعة لنقاط البيع المزدحمة',
      ],
      defaultThermal: 'thermal_58mm_compact',
      defaultA4: 'a4_corporate_classic',
    },
    {
      id: 'pharmacy',
      titleAr: 'الصيدليات والمستلزمات الطبية',
      subtitleAr: 'Pharmacies, Clinics & Medical Supplies',
      icon: Pill,
      badgeAr: 'تتبع التشغيلة Batch + الصلاحية FEFO',
      accentColor: 'bg-rose-800',
      features: [
        'تتبع أرقام التشغيلات الطبية (Batch / Lot Number) وتواريخ انتهاء الصلاحية',
        'سياسة الصرف التلقائي للأقرب انتهاءً (FEFO - First Expired First Out)',
        'تنبيهات الأصناف قريبة الانتهاء وطباعة الجرعات الإرشادية على الفاتورة',
        'قالب فاتورة طبية A4 معتمد لشركات التأمين والتوريد الطبي',
      ],
      defaultThermal: 'thermal_80mm_standard',
      defaultA4: 'a4_medical_pharmacy',
    },
    {
      id: 'contracting',
      titleAr: 'المقاولات والمشاريع الهندسية',
      subtitleAr: 'Contracting, Construction & Engineering',
      icon: HardHat,
      badgeAr: 'مستخلصات مشاريع + مراكز تكلفة',
      accentColor: 'bg-slate-800',
      features: [
        'ربط الفواتير والمشتريات بمراكز التكلفة والمشاريع الهندسية',
        'إصدار فواتير ضريبية رسمية A4 للشركات مع الختم الرسمي والتوقيع',
        'إدارة صرف المواد الخام والمعدات من المستودعات للمواقع',
        'متابعة ميزانيات المشاريع ونسب الإنجاز المالي',
      ],
      defaultThermal: 'thermal_80mm_standard',
      defaultA4: 'a4_corporate_classic',
    },
    {
      id: 'general',
      titleAr: 'التجارة والصناعة الشاملة (كافة القطاعات)',
      subtitleAr: 'All-in-One Multi-Industry Enterprise ERP',
      icon: Layers,
      badgeAr: 'جميع المميزات مفعّلة معاً',
      accentColor: 'bg-slate-900',
      features: [
        'تفعيل شامل لكافة أصناف وأدوات جميع القطاعات في شاشة واحدة',
        'المرونة الكاملة في التبديل بين الفواتير الحرارية 80mm/58mm وفواتير A4 الرسمية',
        'توليد باركود GS1 ورموز ZATCA QR ومحاسبة القيد المزدوج الآلية',
        'مناسب للشركات القابضة والمجموعات التجارية متعددة الأنشطة',
      ],
      defaultThermal: 'thermal_80mm_standard',
      defaultA4: 'a4_corporate_classic',
    },
  ];

  const thermalTemplatesList: {
    id: ThermalTemplateType;
    titleAr: string;
    descAr: string;
    widthBadge: string;
  }[] = [
    {
      id: 'thermal_80mm_standard',
      titleAr: 'قالب حراري قياسي 80mm (ZATCA QR + Barcode)',
      descAr: 'مناسب للمعارض التجارية والتجزئة العامة مع باركود ورمز استجابة ضريبي.',
      widthBadge: '80mm Standard',
    },
    {
      id: 'thermal_80mm_restaurant',
      titleAr: 'قالب مطاعم وكافيهات 80mm (رقم الطاولة + نوع الطلب + ملاحظات المطبخ)',
      descAr: 'يبرز رقم الطاولة ونوع الطلب (محلي/سفري/توصيل) وملاحظات الشيف لكل وجبة.',
      widthBadge: '80mm F&B + KOT',
    },
    {
      id: 'thermal_58mm_compact',
      titleAr: 'قالب بقالة وسوبرماركت مضغوط 58mm (سريع وموفر للورق)',
      descAr: 'مصمم لطابعات الكاشير السريعة 58mm مع دعم الأوزان العشرية.',
      widthBadge: '58mm Compact',
    },
    {
      id: 'thermal_80mm_warranty',
      titleAr: 'قالب إلكترونيات وضمان 80mm (IMEI / Serial + شروط الضمان)',
      descAr: 'يطبع الرقم التسلسلي وفترة الضمان لكل جهاز مع بند شروط الصيانة.',
      widthBadge: '80mm IMEI Warranty',
    },
  ];

  const standardTemplatesList: {
    id: StandardInvoiceTemplateType;
    titleAr: string;
    descAr: string;
    badge: string;
  }[] = [
    {
      id: 'a4_corporate_classic',
      titleAr: 'فاتورة ضريبية رسمية للشركات (A4 Corporate Classic)',
      descAr: 'تصميم رسمي لمبيعات الجملة والشركات B2B مع جدول ضريبي مفصل وختم وتوقيع.',
      badge: 'A4 B2B Official',
    },
    {
      id: 'a4_modern_blue',
      titleAr: 'فاتورة ضريبية عصرية ملونة (A4 Modern Blue)',
      descAr: 'ترويسة احترافية متدرجة اللون مع إبراز الهوية البصرية للمنشأة.',
      badge: 'A4 Modern',
    },
    {
      id: 'a4_warranty_electronics',
      titleAr: 'فاتورة ضريبية + شهادة ضمان إلكترونيات (A4 Warranty Certificate)',
      descAr: 'تدمج الفاتورة الضريبية مع شهادة ضمان رسمية تتضمن عمود IMEI/Serial وفترة الضمان.',
      badge: 'A4 + Warranty',
    },
    {
      id: 'a4_medical_pharmacy',
      titleAr: 'فاتورة توريد طبي وصيدلاني (A4 Medical Batch & Expiry)',
      descAr: 'تتضمن أعمدة رقم التشغيلة (LOT/Batch) وتاريخ الانتهاء (EXP) للمستشفيات والصيدليات.',
      badge: 'A4 Medical FEFO',
    },
  ];

  const sampleInvoice: SalesInvoice = salesInvoices[0] || {
    id: 'inv-sample',
    tenantId: currentTenant.id,
    invoiceNumber: 'INV-2025-0099',
    customerId: 'cust-1',
    customerName: 'شركة التموين والأنظمة المتقدمة',
    branchId: currentBranch.id,
    date: '2025-05-15',
    subtotal: 4200,
    discountAmount: 0,
    taxAmount: 630,
    grandTotal: 4830,
    paidAmount: 4830,
    paymentMethod: 'CARD',
    status: 'PAID',
    qrData: 'ZATCA-SAMPLE-PAYLOAD',
    orderType: activeIndustry === 'restaurant' ? 'DINE_IN' : 'STANDARD',
    tableNumber: activeIndustry === 'restaurant' ? 'T-04' : undefined,
    items: [
      {
        productId: 'prod-1',
        sku: 'ELEC-101',
        productName:
          activeIndustry === 'restaurant'
            ? 'وجبة برجر أنجوس دبل مشوي + بطاطس'
            : activeIndustry === 'pharmacy'
            ? 'فيتامين د3 5000 وحدة + جهاز قياس ضغط'
            : 'هاتف ذكي برو ماكس 5G - 256GB',
        quantity: 1,
        unitPrice: 4200,
        discount: 0,
        taxRate: 15,
        taxAmount: 630,
        total: 4830,
        serialNumber: 'IMEI-359881029481120',
        warrantyMonths: 24,
        kitchenNotes: 'بدون بصل - جبن إضافي',
        batchNumber: 'LOT-2025-09A',
        expiryDate: '2027-08-30',
      },
    ],
  };

  return (
    <div className="p-4 sm:p-6 space-y-5">
      {/* Header */}
      <div className="bg-white dark:bg-slate-900 p-5 rounded-lg border border-slate-200/90 dark:border-slate-800 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-emerald-700" />
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
              مركز الإعدادات المؤسسي، تخصيص المظهر، ومجال النشاط
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            تحكم كامل في الهوية البصرية (Swiss-Grid)، كثافة الجداول المالية، مجال عمل المنشأة، وقوالب الفواتير الضريبية
          </p>
        </div>

        {/* Quick Sidebar Mode Toggle inside Settings */}
        <button
          type="button"
          onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          className="flex items-center gap-2 px-3.5 py-2 rounded-md bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold transition cursor-pointer"
        >
          {isSidebarCollapsed ? (
            <>
              <PanelLeftOpen className="w-4 h-4 text-emerald-400" />
              <span>تمديد القائمة الجانبية</span>
            </>
          ) : (
            <>
              <PanelLeftClose className="w-4 h-4 text-emerald-400" />
              <span>طي القائمة الجانبية (أيقونات)</span>
            </>
          )}
        </button>
      </div>

      {/* Institutional Appearance & Density Studio */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-lg border border-slate-200/90 dark:border-slate-800 grid grid-cols-1 lg:grid-cols-12 gap-4 items-center">
        <div className="lg:col-span-5">
          <div className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
            استوديو الهوية البصرية المعمارية • Swiss-Grid UI
          </div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 mt-0.5">
            مظهر النظام وكثافة الجداول المحاسبية
          </h3>
          <p className="text-[11px] text-slate-500 mt-0.5">
            اختر السمة اللونية المؤسسية وكثافة عرض الصفوف لتناسب شاشات المحاسبين أو نقاط البيع
          </p>
        </div>

        <div className="lg:col-span-4 flex items-center gap-2">
          {[
            { id: 'corporate_slate', label: 'كحلي مؤسسي', sub: 'Corporate Slate' },
            { id: 'swiss_light', label: 'أبيض مصرفي', sub: 'Swiss Light' },
            { id: 'obsidian_dark', label: 'داكن مالي', sub: 'Obsidian Dark' },
          ].map((th) => (
            <button
              key={th.id}
              type="button"
              data-testid={`settings-theme-${th.id}`}
              onClick={() => setUiTheme(th.id as any)}
              className={`flex-1 px-3 py-2 rounded-md border text-right transition cursor-pointer ${
                uiTheme === th.id
                  ? 'border-emerald-600 bg-emerald-50/70 dark:bg-emerald-950/40 text-slate-900 dark:text-white'
                  : 'border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/50 text-slate-600 dark:text-slate-300 hover:border-slate-300'
              }`}
            >
              <div className="text-xs font-bold">{th.label}</div>
              <div className="text-[10px] font-mono text-slate-400">{th.sub}</div>
            </button>
          ))}
        </div>

        <div className="lg:col-span-3 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={() => setUiDensity('comfortable')}
            className={`px-3 py-2 rounded-md border text-xs font-bold transition cursor-pointer ${
              uiDensity === 'comfortable'
                ? 'border-slate-900 bg-slate-900 text-white'
                : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
            }`}
          >
            كثافة قياسية (Comfortable)
          </button>
          <button
            type="button"
            onClick={() => setUiDensity('compact')}
            className={`px-3 py-2 rounded-md border text-xs font-bold transition cursor-pointer ${
              uiDensity === 'compact'
                ? 'border-slate-900 bg-slate-900 text-white'
                : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
            }`}
          >
            كثافة مدمجة (Compact)
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex flex-wrap gap-1.5 bg-white dark:bg-slate-900 p-1.5 rounded-lg border border-slate-200/90 dark:border-slate-800">
        {[
          {
            id: 'industry',
            label: '1. تحديد مجال النشاط التجاري (القطاعات)',
            icon: Layers,
          },
          {
            id: 'templates',
            label: '2. قوالب الفواتير الحرارية والعادية (Thermal & A4)',
            icon: Receipt,
          },
          {
            id: 'organization',
            label: '3. بيانات المنشأة والفروع والمستودعات',
            icon: Building2,
          },
          {
            id: 'backup',
            label: '4. النسخ الاحتياطي وإعادة الضبط',
            icon: Download,
          },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeSettingsTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              data-testid={`settings-tab-${tab.id}`}
              onClick={() => setActiveSettingsTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2 rounded-md text-xs font-bold transition cursor-pointer ${
                isActive
                  ? 'bg-slate-900 text-white dark:bg-emerald-600'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* ====================================================================
          TAB 1: MULTI-INDUSTRY SELECTOR
      ==================================================================== */}
      {activeSettingsTab === 'industry' && (
        <div className="space-y-4">
          <div className="bg-slate-900 text-white p-5 rounded-lg border border-slate-800 flex flex-wrap items-center justify-between gap-4">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400">
                محرك التكيف المؤسسي حسب القطاع • Multi-Industry Engine
              </span>
              <h3 className="text-base font-bold mt-0.5">
                اختر مجال نشاط منشأتك لتكييف شاشة الكاشير (POS) والمخزون وقوالب الفواتير تلقائياً
              </h3>
              <p className="text-xs text-slate-300 mt-1">
                عند تغيير المجال، يتم تفعيل الأدوات المتخصصة (طاولات المطاعم وشاشة المطبخ، أو IMEI والضمان للإلكترونيات، أو باركود الميزان للبقالات) مع الحفاظ على جميع بياناتك.
              </p>
            </div>
            <div className="bg-slate-800/90 border border-slate-700 px-4 py-2.5 rounded-md text-right">
              <div className="text-[10px] text-slate-400">المجال المفعّل حالياً</div>
              <div className="text-sm font-bold text-emerald-400">
                {industryCatalog.find((i) => i.id === activeIndustry)?.titleAr}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {industryCatalog.map((sector) => {
              const Icon = sector.icon;
              const isSelected = activeIndustry === sector.id;
              return (
                <div
                  key={sector.id}
                  data-testid={`industry-card-${sector.id}`}
                  onClick={() => setActiveIndustry(sector.id)}
                  className={`rounded-lg border p-5 transition-all cursor-pointer flex flex-col justify-between ${
                    isSelected
                      ? 'border-emerald-600 bg-emerald-50/25 dark:bg-emerald-950/20 ring-1 ring-emerald-600/30'
                      : 'border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300'
                  }`}
                >
                  <div>
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div
                        className={`w-10 h-10 rounded-md ${sector.accentColor} text-white flex items-center justify-center shrink-0`}
                      >
                        <Icon className="w-5 h-5" />
                      </div>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-sm border ${
                          isSelected
                            ? 'bg-emerald-600 text-white border-emerald-600'
                            : 'bg-slate-50 text-slate-700 border-slate-200'
                        }`}
                      >
                        {isSelected ? 'النشاط المفعّل حالياً' : sector.badgeAr}
                      </span>
                    </div>

                    <h4 className="font-bold text-sm text-slate-900 dark:text-slate-100">{sector.titleAr}</h4>
                    <p className="text-[11px] font-mono text-slate-400 mb-3">{sector.subtitleAr}</p>

                    <ul className="space-y-1.5 text-xs text-slate-600 dark:text-slate-300 mb-4">
                      {sector.features.map((feat, i) => (
                        <li key={i} className="flex items-start gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                          <span>{feat}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="pt-3 border-t border-slate-200/80 dark:border-slate-800 flex items-center justify-between">
                    <span className="text-[10px] text-slate-500">
                      القالب الافتراضي: <strong className="font-mono">{sector.defaultThermal}</strong>
                    </span>
                    <button
                      type="button"
                      className={`px-3 py-1.5 rounded-md text-xs font-bold transition cursor-pointer ${
                        isSelected
                          ? 'bg-emerald-600 text-white'
                          : 'bg-slate-900 text-white hover:bg-slate-800'
                      }`}
                    >
                      {isSelected ? 'مفعّل الآن' : 'تفعيل هذا المجال'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ====================================================================
          TAB 2: THERMAL & STANDARD A4 INVOICE TEMPLATES STUDIO
      ==================================================================== */}
      {activeSettingsTab === 'templates' && (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
          {/* Template Controls Column */}
          <div className="xl:col-span-6 space-y-5">
            {/* Thermal Templates Selector */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-black text-sm text-slate-900 flex items-center gap-2">
                  <Receipt className="w-4 h-4 text-emerald-600" />
                  قوالب الفواتير الحرارية لنقاط البيع (Thermal Receipts 80mm / 58mm)
                </h3>
                <button
                  type="button"
                  onClick={() => setPreviewMode('thermal')}
                  className={`text-xs px-2.5 py-1 rounded-lg font-bold cursor-pointer ${
                    previewMode === 'thermal'
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-100 text-slate-700'
                  }`}
                >
                  معاينة الحراري
                </button>
              </div>

              <div className="space-y-2">
                {thermalTemplatesList.map((tpl) => {
                  const isSelected = invoiceTemplateSettings.thermalTemplate === tpl.id;
                  return (
                    <div
                      key={tpl.id}
                      data-testid={`select-thermal-${tpl.id}`}
                      onClick={() => {
                        updateInvoiceTemplateSettings({ thermalTemplate: tpl.id });
                        setPreviewMode('thermal');
                      }}
                      className={`p-3.5 rounded-xl border transition cursor-pointer flex items-start justify-between gap-3 ${
                        isSelected
                          ? 'border-emerald-600 bg-emerald-50/50 ring-1 ring-emerald-600/30'
                          : 'border-slate-200 hover:border-slate-300 bg-slate-50/40'
                      }`}
                    >
                      <div>
                        <div className="font-black text-xs text-slate-900">{tpl.titleAr}</div>
                        <p className="text-[11px] text-slate-500 mt-0.5">{tpl.descAr}</p>
                      </div>
                      <span
                        className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded shrink-0 ${
                          isSelected
                            ? 'bg-emerald-600 text-white'
                            : 'bg-slate-200 text-slate-700'
                        }`}
                      >
                        {tpl.widthBadge}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Standard A4 Templates Selector */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-black text-sm text-slate-900 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-indigo-600" />
                  قوالب الفواتير الضريبية العادية (Standard A4 Tax Invoices)
                </h3>
                <button
                  type="button"
                  onClick={() => setPreviewMode('a4')}
                  className={`text-xs px-2.5 py-1 rounded-lg font-bold cursor-pointer ${
                    previewMode === 'a4'
                      ? 'bg-indigo-600 text-white'
                      : 'bg-slate-100 text-slate-700'
                  }`}
                >
                  معاينة A4
                </button>
              </div>

              <div className="space-y-2">
                {standardTemplatesList.map((tpl) => {
                  const isSelected = invoiceTemplateSettings.standardTemplate === tpl.id;
                  return (
                    <div
                      key={tpl.id}
                      data-testid={`select-a4-${tpl.id}`}
                      onClick={() => {
                        updateInvoiceTemplateSettings({ standardTemplate: tpl.id });
                        setPreviewMode('a4');
                      }}
                      className={`p-3.5 rounded-xl border transition cursor-pointer flex items-start justify-between gap-3 ${
                        isSelected
                          ? 'border-indigo-600 bg-indigo-50/50 ring-1 ring-indigo-600/30'
                          : 'border-slate-200 hover:border-slate-300 bg-slate-50/40'
                      }`}
                    >
                      <div>
                        <div className="font-black text-xs text-slate-900">{tpl.titleAr}</div>
                        <p className="text-[11px] text-slate-500 mt-0.5">{tpl.descAr}</p>
                      </div>
                      <span
                        className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded shrink-0 ${
                          isSelected
                            ? 'bg-indigo-600 text-white'
                            : 'bg-slate-200 text-slate-700'
                        }`}
                      >
                        {tpl.badge}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Print Options & Custom Header/Footer Notes */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
              <h3 className="font-black text-sm text-slate-900">
                عناصر الطباعة والنصوص المخصصة على الفاتورة
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                {[
                  { key: 'showQR', label: 'إظهار رمز الفوترة الإلكترونية ZATCA QR' },
                  { key: 'showBarcode', label: 'إظهار الباركود الخطي Code-128' },
                  { key: 'showStampAndSignature', label: 'إظهار الختم الرسمي وتوقيع المحاسب' },
                  { key: 'showWarrantyTerms', label: 'إظهار وثيقة وشروط الضمان والأرقام التسلسلية' },
                ].map((opt) => (
                  <label
                    key={opt.key}
                    className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-50 border border-slate-200 cursor-pointer font-bold text-slate-700"
                  >
                    <input
                      type="checkbox"
                      checked={(invoiceTemplateSettings as any)[opt.key]}
                      onChange={(e) =>
                        updateInvoiceTemplateSettings({ [opt.key]: e.target.checked })
                      }
                      className="rounded text-indigo-600"
                    />
                    <span>{opt.label}</span>
                  </label>
                ))}
              </div>

              <div className="space-y-3 pt-2">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    رسالة ترحيبية أعلى الفاتورة (Header Note)
                  </label>
                  <input
                    type="text"
                    value={invoiceTemplateSettings.headerTitleAr}
                    onChange={(e) =>
                      updateInvoiceTemplateSettings({ headerTitleAr: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs focus:border-indigo-600 outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    سياسة الاستبدال والاسترجاع أسفل الفاتورة (Footer Note)
                  </label>
                  <input
                    type="text"
                    value={invoiceTemplateSettings.footerNoteAr}
                    onChange={(e) =>
                      updateInvoiceTemplateSettings({ footerNoteAr: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs focus:border-indigo-600 outline-hidden"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Live Interactive Preview Column */}
          <div className="xl:col-span-6 bg-slate-100 p-5 rounded-2xl border border-slate-200 space-y-4 sticky top-16">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-3">
              <div>
                <h4 className="font-black text-sm text-slate-900">
                  معاينة حية ومباشرة لقالب الفاتورة
                </h4>
                <p className="text-[11px] text-slate-500">
                  تتحدث المعاينة فورياً عند تغيير القالب أو إظهار/إخفاء العناصر
                </p>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setPreviewMode('thermal')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition ${
                    previewMode === 'thermal'
                      ? 'bg-slate-900 text-white'
                      : 'bg-white text-slate-700 border border-slate-300'
                  }`}
                >
                  إيصال حراري (Thermal)
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewMode('a4')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition ${
                    previewMode === 'a4'
                      ? 'bg-indigo-600 text-white'
                      : 'bg-white text-slate-700 border border-slate-300'
                  }`}
                >
                  فاتورة رسمية (A4)
                </button>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1 cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" /> طباعة تجريبية
                </button>
              </div>
            </div>

            <div className="max-h-[700px] overflow-y-auto py-2">
              <InvoiceRenderer
                invoice={sampleInvoice}
                mode={previewMode}
                settings={invoiceTemplateSettings}
                companyName={company.nameAr || currentTenant.legalName}
                taxNumber={company.taxNumber || '300059281900003'}
                branchName={currentBranch.nameAr}
                branchAddress={currentBranch.city}
                branchPhone={currentBranch.phone}
                currency={currency}
              />
            </div>
          </div>
        </div>
      )}

      {/* ====================================================================
          TAB 3: ORGANIZATION, BRANCHES & WAREHOUSES
      ==================================================================== */}
      {activeSettingsTab === 'organization' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <form
              onSubmit={handleSaveSettings}
              className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4"
            >
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2 border-b border-slate-100 pb-3">
                <Building2 className="w-4 h-4 text-indigo-600" />
                البيانات القانونية والضريبية للمنشأة
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    الاسم القانوني للشركة (يظهر في الفواتير)
                  </label>
                  <input
                    type="text"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs focus:border-indigo-600 outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    الرقم الضريبي (VAT Registration No - 15 Digits)
                  </label>
                  <input
                    type="text"
                    value={taxNumber}
                    onChange={(e) => setTaxNumber(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs font-mono focus:border-indigo-600 outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    نسبة ضريبة القيمة المضافة الافتراضية (%)
                  </label>
                  <input
                    type="number"
                    value={defaultVat}
                    onChange={(e) => setDefaultVat(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs focus:border-indigo-600 outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    الفرع التشغيلي النشط
                  </label>
                  <select
                    value={currentBranch.id}
                    onChange={(e) => {
                      const b = branches.find((item) => item.id === e.target.value);
                      if (b) setCurrentBranch(b);
                    }}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs bg-white focus:border-indigo-600 outline-hidden"
                  >
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.nameAr} - {b.city}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="pt-3 flex items-center justify-between">
                {savedSuccess ? (
                  <span className="text-xs font-bold text-emerald-600 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4" /> تم حفظ الإعدادات وتحديث الترويسة الضريبية بنجاح!
                  </span>
                ) : (
                  <span className="text-[11px] text-slate-400">
                    تنعكس هذه البيانات مباشرة في رموز ZATCA QR وقوالب الفواتير.
                  </span>
                )}
                <button
                  type="submit"
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition cursor-pointer"
                >
                  <Save className="w-4 h-4" /> حفظ التعديلات
                </button>
              </div>
            </form>

            {/* Branches & Warehouses Breakdown + Add Forms */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Branches Box */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
                <h4 className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                  <GitBranch className="w-4 h-4 text-emerald-600" />
                  الفروع المسجلة ({branches.length})
                </h4>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {branches.map((b) => (
                    <div
                      key={b.id}
                      className="p-2.5 bg-slate-50 rounded-lg border border-slate-200/80 flex justify-between items-center text-xs"
                    >
                      <div>
                        <div className="font-bold text-slate-800">{b.nameAr}</div>
                        <div className="text-[10px] text-slate-500">
                          {b.city} • {b.phone}
                        </div>
                      </div>
                      <span className="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded text-[10px] font-bold">
                        {b.code}
                      </span>
                    </div>
                  ))}
                </div>
                <form onSubmit={handleAddBranch} className="pt-2 border-t border-slate-100 space-y-2">
                  <div className="text-[11px] font-bold text-slate-700">إضافة فرع جديد</div>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      placeholder="اسم الفرع..."
                      value={newBranchNameAr}
                      onChange={(e) => setNewBranchNameAr(e.target.value)}
                      className="px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs"
                    />
                    <input
                      type="text"
                      placeholder="المدينة..."
                      value={newBranchCity}
                      onChange={(e) => setNewBranchCity(e.target.value)}
                      className="px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs"
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-full py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" /> إضافة الفرع
                  </button>
                </form>
              </div>

              {/* Warehouses Box */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
                <h4 className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                  <Warehouse className="w-4 h-4 text-amber-600" />
                  المستودعات المخزنية ({warehouses.length})
                </h4>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {warehouses.map((w) => (
                    <div
                      key={w.id}
                      className="p-2.5 bg-slate-50 rounded-lg border border-slate-200/80 flex justify-between items-center text-xs"
                    >
                      <div>
                        <div className="font-bold text-slate-800">{w.nameAr}</div>
                        <div className="text-[10px] text-slate-500">{w.name}</div>
                      </div>
                      <span className="bg-amber-100 text-amber-800 px-2 py-0.5 rounded text-[10px] font-mono font-bold">
                        {w.code}
                      </span>
                    </div>
                  ))}
                </div>
                <form onSubmit={handleAddWarehouse} className="pt-2 border-t border-slate-100 space-y-2">
                  <div className="text-[11px] font-bold text-slate-700">إضافة مستودع جديد</div>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      placeholder="اسم المستودع..."
                      value={newWhNameAr}
                      onChange={(e) => setNewWhNameAr(e.target.value)}
                      className="px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs"
                    />
                    <input
                      type="text"
                      placeholder="الكود (WH-05)..."
                      value={newWhCode}
                      onChange={(e) => setNewWhCode(e.target.value)}
                      className="px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs"
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-full py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" /> إضافة المستودع
                  </button>
                </form>
              </div>
            </div>
          </div>

          <div className="bg-slate-900 text-white p-6 rounded-2xl space-y-4">
            <h3 className="font-black text-base">ملخص حالة قاعدة البيانات</h3>
            <div className="space-y-2 text-xs text-slate-300">
              <div className="flex justify-between py-2 border-b border-slate-800">
                <span>الأصناف والمنتجات المسجلة:</span>
                <span className="font-mono font-bold text-emerald-400">{products.length}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-800">
                <span>الفواتير الضريبية المرحّلة:</span>
                <span className="font-mono font-bold text-indigo-400">{salesInvoices.length}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-800">
                <span>قيود اليومية المحاسبية:</span>
                <span className="font-mono font-bold text-amber-400">{journalEntries.length}</span>
              </div>
              <div className="flex justify-between py-2">
                <span>سجلات التدقيق الأمني:</span>
                <span className="font-mono font-bold text-cyan-400">{auditLogs.length}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ====================================================================
          TAB 4: BACKUP & RESET
      ==================================================================== */}
      {activeSettingsTab === 'backup' && (
        <div className="max-w-2xl bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <h3 className="font-bold text-slate-900 text-sm">
            النسخ الاحتياطي واستعادة البيانات التشغيلية (JSON Archive & Restore)
          </h3>
          <p className="text-xs text-slate-500 leading-relaxed">
            يتم حفظ كافة الحركات المالية والمخزنية والقيود المحاسبية وقوالب الفواتير المختارة تلقائياً. يمكنك تصدير نسخة احتياطية كاملة بصيغة JSON، أو استيراد نسخة احتياطية محفوظة مسبقاً، أو استعادة حالة المصنع الافتراضية.
          </p>

          {restoreFeedback && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-bold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{restoreFeedback}</span>
            </div>
          )}

          <div className="space-y-3 pt-2">
            <button
              type="button"
              onClick={handleExportJSON}
              className="w-full py-2.5 px-4 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition cursor-pointer"
            >
              <Download className="w-4 h-4 text-emerald-400" />
              تصدير نسخة احتياطية كاملة (Export Full JSON Backup)
            </button>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
              <div className="text-xs font-bold text-slate-800">
                استيراد واستعادة نسخة احتياطية (Restore from JSON File)
              </div>
              <input
                type="file"
                accept=".json,application/json"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  const reader = new FileReader();
                  reader.onload = () => {
                    const res = importBackupJSON(String(reader.result || ''));
                    setRestoreFeedback(res.messageAr);
                  };
                  reader.readAsText(file);
                }}
                className="w-full text-xs text-slate-600 file:me-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-indigo-600 file:text-white hover:file:bg-indigo-700 cursor-pointer"
              />
            </div>

            {!confirmReset ? (
              <button
                type="button"
                onClick={() => setConfirmReset(true)}
                className="w-full py-2.5 px-4 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
                إعادة ضبط النظام للبيانات الافتراضية (Reset Demo State)
              </button>
            ) : (
              <div className="p-3 bg-rose-50 border border-rose-300 rounded-xl space-y-2">
                <p className="text-[11px] font-bold text-rose-900">
                  هل أنت متأكد من مسح التعديلات المحلية واستعادة البيانات الافتراضية؟
                </p>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      resetToInitialDemo();
                      setConfirmReset(false);
                      setRestoreFeedback('تمت استعادة البيانات الافتراضية للمصنع بنجاح');
                    }}
                    className="flex-1 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold cursor-pointer"
                  >
                    نعم، استعادة الافتراضي
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmReset(false)}
                    className="flex-1 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-lg text-xs font-bold cursor-pointer"
                  >
                    إلغاء
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
