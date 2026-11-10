import React, { useState } from 'react';
import { useERP } from '../context/ERPContext';
import {
  ThermalTemplateType,
  StandardInvoiceTemplateType,
  SalesInvoice,
  Branch,
  Warehouse,
} from '../types/erp';
import { InvoiceRenderer } from '../components/invoices/InvoiceRenderer';
import {
  Settings,
  Building2,
  GitBranch,
  Warehouse as WarehouseIcon,
  Save,
  RotateCcw,
  Download,
  CheckCircle2,
  Receipt,
  FileText,
  Printer,
  Plus,
  PanelLeftClose,
  PanelLeftOpen,
  Lock,
  ShieldCheck,
  KeyRound,
  Edit3,
  Trash2,
  AlertTriangle,
  Search,
  Check,
  X,
  Eye,
  MapPin,
  Phone,
  Sliders,
  Store,
  Boxes,
  ArrowRightLeft,
  FolderTree,
  ListFilter,
  CheckSquare,
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
    invoiceTemplateSettings,
    updateInvoiceTemplateSettings,
    updateCompanyProfile,
    addBranch,
    updateBranch,
    deleteBranch,
    addWarehouse,
    updateWarehouse,
    deleteWarehouse,
    currentWarehouse,
    setCurrentWarehouse,
    currency,
    isSidebarCollapsed,
    setIsSidebarCollapsed,
    exportEncryptedDatabaseSnapshot,
    importBackupJSON,
    activeIndustry,
    masterSystemConfig,
    toggleSectorMode,
  } = useERP();

  // Top-level tabs: central hub, templates, company profile, backup
  const [activeSettingsTab, setActiveSettingsTab] = useState<
    'central_hub' | 'templates' | 'company' | 'backup'
  >('central_hub');

  // Sub-segmented view inside the Central Branches & Warehouses Hub
  const [centralViewMode, setCentralViewMode] = useState<'hierarchy' | 'branches' | 'warehouses'>(
    'hierarchy'
  );

  // Search & Filter States
  const [branchSearch, setBranchSearch] = useState('');
  const [warehouseSearch, setWarehouseSearch] = useState('');
  const [filterCity, setFilterCity] = useState<string>('ALL');
  const [filterBranchId, setFilterBranchId] = useState<string>('ALL');

  // Modals for Branches
  const [isAddBranchModalOpen, setIsAddBranchModalOpen] = useState(false);
  const [editingBranch, setEditingBranch] = useState<Branch | null>(null);
  const [newBranchData, setNewBranchData] = useState({
    nameAr: '',
    name: '',
    city: 'الرياض',
    phone: '+966 11 450 0000',
    isActive: true,
  });

  // Modals for Warehouses
  const [isAddWarehouseModalOpen, setIsAddWarehouseModalOpen] = useState(false);
  const [editingWarehouse, setEditingWarehouse] = useState<Warehouse | null>(null);
  const [newWarehouseData, setNewWarehouseData] = useState({
    nameAr: '',
    name: '',
    code: '',
    branchId: currentBranch?.id || branches[0]?.id || '',
    isDefault: false,
  });

  // Global Notification / CRUD Feedback
  const [crudBanner, setCrudBanner] = useState<{
    type: 'success' | 'warning' | 'error';
    text: string;
  } | null>(null);

  const showBanner = (text: string, type: 'success' | 'warning' | 'error' = 'success') => {
    setCrudBanner({ text, type });
    setTimeout(() => {
      setCrudBanner(null);
    }, 6000);
  };

  // Company Profile form state
  const [companyName, setCompanyName] = useState(company.nameAr || currentTenant.legalName);
  const [taxNumber, setTaxNumber] = useState(company.taxNumber || '300059281900003');
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const [restoreFeedback, setRestoreFeedback] = useState<string | null>(null);

  // Template Studio state
  const [previewMode, setPreviewMode] = useState<'thermal' | 'a4'>('thermal');
  const [customHeader, setCustomHeader] = useState(invoiceTemplateSettings.headerTitleAr);
  const [customFooter, setCustomFooter] = useState(invoiceTemplateSettings.footerNoteAr);

  // Disaster recovery snapshot state
  const [snapshotPassphrase, setSnapshotPassphrase] = useState('RLM-DEFAULT-RECOVERY-KEY-2026');

  // ============================================================================
  // BRANCH CRUD HANDLERS
  // ============================================================================
  const handleCreateBranch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBranchData.nameAr.trim()) {
      showBanner('يرجى إدخال اسم الفرع بالعربية', 'error');
      return;
    }
    const nextCode = `BR-0${branches.length + 1}`;
    const created = addBranch({
      code: nextCode,
      nameAr: newBranchData.nameAr.trim(),
      name: newBranchData.name.trim() || newBranchData.nameAr.trim(),
      city: newBranchData.city.trim() || 'الرياض',
      phone: newBranchData.phone.trim() || '+966 11 000 0000',
      isActive: newBranchData.isActive,
    });
    setIsAddBranchModalOpen(false);
    setNewBranchData({
      nameAr: '',
      name: '',
      city: 'الرياض',
      phone: '+966 11 450 0000',
      isActive: true,
    });
    showBanner(`تم تسجيل الفرع الجديد "${created.nameAr}" (${created.code}) بنجاح!`, 'success');
  };

  const handleUpdateBranchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBranch) return;
    const res = updateBranch(editingBranch.id, {
      nameAr: editingBranch.nameAr.trim(),
      name: editingBranch.name.trim() || editingBranch.nameAr.trim(),
      city: editingBranch.city.trim(),
      phone: editingBranch.phone.trim(),
      isActive: editingBranch.isActive,
    });
    setEditingBranch(null);
    if (res.success) {
      showBanner(res.messageAr || 'تم تحديث بيانات الفرع بنجاح.', 'success');
    } else {
      showBanner(res.messageAr || 'تعذر تحديث الفرع', 'error');
    }
  };

  const handleDeleteBranch = (b: Branch) => {
    const res = deleteBranch(b.id);
    if (res.success) {
      showBanner(res.messageAr, 'success');
    } else {
      showBanner(res.messageAr, 'warning');
    }
  };

  // ============================================================================
  // WAREHOUSE CRUD HANDLERS
  // ============================================================================
  const handleCreateWarehouse = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWarehouseData.nameAr.trim()) {
      showBanner('يرجى إدخال اسم المستودع بالعربية', 'error');
      return;
    }
    const generatedCode = newWarehouseData.code.trim() || `WH-0${warehouses.length + 1}`;
    const targetBranchId = newWarehouseData.branchId || currentBranch?.id || branches[0]?.id;
    const created = addWarehouse({
      code: generatedCode,
      nameAr: newWarehouseData.nameAr.trim(),
      name: newWarehouseData.name.trim() || newWarehouseData.nameAr.trim(),
      branchId: targetBranchId,
      isDefault: newWarehouseData.isDefault,
    });
    setIsAddWarehouseModalOpen(false);
    setNewWarehouseData({
      nameAr: '',
      name: '',
      code: '',
      branchId: currentBranch?.id || branches[0]?.id || '',
      isDefault: false,
    });
    showBanner(`تم إنشاء المستودع "${created.nameAr}" (${created.code}) وربطه بالفرع بنجاح!`, 'success');
  };

  const handleUpdateWarehouseSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingWarehouse) return;
    const res = updateWarehouse(editingWarehouse.id, {
      nameAr: editingWarehouse.nameAr.trim(),
      name: editingWarehouse.name.trim() || editingWarehouse.nameAr.trim(),
      code: editingWarehouse.code.trim(),
      branchId: editingWarehouse.branchId,
      isDefault: editingWarehouse.isDefault,
    });
    setEditingWarehouse(null);
    if (res.success) {
      showBanner(res.messageAr || 'تم تحديث بيانات المستودع بنجاح.', 'success');
    } else {
      showBanner(res.messageAr || 'تعذر تحديث المستودع', 'error');
    }
  };

  const handleDeleteWarehouse = (w: Warehouse) => {
    const res = deleteWarehouse(w.id);
    if (res.success) {
      showBanner(res.messageAr, 'success');
    } else {
      showBanner(res.messageAr, 'warning');
    }
  };

  // Helper to open Add Warehouse pre-linked to a specific branch
  const handleOpenAddWarehouseForBranch = (branchId: string) => {
    setNewWarehouseData({
      nameAr: '',
      name: '',
      code: `WH-0${warehouses.length + 1}`,
      branchId: branchId,
      isDefault: false,
    });
    setIsAddWarehouseModalOpen(true);
  };

  // Company Profile handler
  const handleSaveCompany = (e: React.FormEvent) => {
    e.preventDefault();
    updateCompanyProfile({ nameAr: companyName, name: companyName, taxNumber });
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  // Backup Export Handlers
  const handleExportEncryptedSnapshot = () => {
    const { jsonString, filename, snapshot } = exportEncryptedDatabaseSnapshot(snapshotPassphrase);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    showBanner(`تم تنزيل لقطة قاعدة البيانات المشفرة (${filename}) بنجاح! التوقيع: ${snapshot.integritySignature}`, 'success');
  };

  const handleExportJSON = () => {
    const backupPayload = {
      exportedAt: new Date().toISOString(),
      tenant: currentTenant,
      company,
      activeIndustry,
      branches,
      warehouses,
      productsCount: products.length,
      salesInvoicesCount: salesInvoices.length,
      products,
      salesInvoices,
    };
    const blob = new Blob([JSON.stringify(backupPayload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `RLM-ERP-Backup-${currentTenant.code}-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Filtered lists
  const availableCities = Array.from(new Set(branches.map((b) => b.city))).filter(Boolean);

  const filteredBranches = branches.filter((b) => {
    const matchSearch =
      b.nameAr.toLowerCase().includes(branchSearch.toLowerCase()) ||
      b.code.toLowerCase().includes(branchSearch.toLowerCase()) ||
      b.city.toLowerCase().includes(branchSearch.toLowerCase());
    const matchCity = filterCity === 'ALL' || b.city === filterCity;
    return matchSearch && matchCity;
  });

  const filteredWarehouses = warehouses.filter((w) => {
    const matchSearch =
      w.nameAr.toLowerCase().includes(warehouseSearch.toLowerCase()) ||
      w.code.toLowerCase().includes(warehouseSearch.toLowerCase());
    const matchBranch = filterBranchId === 'ALL' || w.branchId === filterBranchId;
    return matchSearch && matchBranch;
  });

  // Template lists
  const thermalTemplatesList: {
    id: ThermalTemplateType;
    titleAr: string;
    descAr: string;
    categoryBadge: string;
    paperWidth: '80mm' | '58mm';
  }[] = [
    {
      id: 'thermal_80mm_standard',
      titleAr: 'قالب كاشير قياسي 80mm',
      descAr: 'تصميم تقليدي متين لمعارض التجزئة والتجارة مع باركود ورمز ZATCA ضريبي مباشر.',
      categoryBadge: 'تجزئة وتجارة عامة',
      paperWidth: '80mm',
    },
    {
      id: 'thermal_80mm_warranty',
      titleAr: 'قالب إلكترونيات وطاقة شمسية وضمان 80mm',
      descAr: 'يتضمن تفقيط الأرقام التسلسلية (S/N / IMEI) وفترة الضمان بالأشهر وشروط صيانة الوكيل.',
      categoryBadge: 'إلكترونيات وطاقة شمسية',
      paperWidth: '80mm',
    },
    {
      id: 'thermal_80mm_modern',
      titleAr: 'قالب عصري رقمي 80mm (Modern Digital)',
      descAr: 'تصميم بلمسات تدرج كحلي حديث، بطاقات أصناف مفصولة، ووضوح فائق لكاشير المعارض الحديثة.',
      categoryBadge: 'معارض راقية وماركات',
      paperWidth: '80mm',
    },
    {
      id: 'thermal_80mm_minimal',
      titleAr: 'قالب مينيمل نقي 80mm (Minimalist Clean)',
      descAr: 'تنسيق طباعي مقتصد بالحبر، فواصل هادئة غير صاخبة، سرعة طباعة قصوى وتوفير للورق.',
      categoryBadge: 'بوتيك وتوفير ورق',
      paperWidth: '80mm',
    },
    {
      id: 'thermal_80mm_restaurant',
      titleAr: 'قالب مطاعم وكافيهات 80mm (Restaurant & Bar)',
      descAr: 'إبراز رقم الطاولة وحالة الطلب (محلي / سفري) مع مساحة مخصصة لملاحظات المطبخ.',
      categoryBadge: 'مطاعم وكافيهات',
      paperWidth: '80mm',
    },
    {
      id: 'thermal_58mm_compact',
      titleAr: 'قالب كاشير مضغوط 58mm (Ultra Compact)',
      descAr: 'مخصص لطابعات البلوتوث والمحمولة وطابعات إكسسوارات الجوال 58mm.',
      categoryBadge: 'طابعات 58mm محمولة',
      paperWidth: '58mm',
    },
  ];

  const standardTemplatesList: {
    id: StandardInvoiceTemplateType;
    titleAr: string;
    descAr: string;
    badgeAr: string;
  }[] = [
    {
      id: 'a4_corporate_classic',
      titleAr: 'فاتورة الشركات والمؤسسات الرسمية (Corporate Classic A4)',
      descAr: 'تصميم مصرفي وقانوني للشركات B2B وتوريدات الجملة مع جداول محاسبية وختم معتمد.',
      badgeAr: 'توريد وشركات B2B',
    },
    {
      id: 'a4_warranty_electronics',
      titleAr: 'فاتورة + شهادة ضمان معتمدة للأجهزة والطاقة الشمسية (Warranty A4)',
      descAr: 'تدمج الفاتورة الضريبية مع وثيقة ضمان رسمية وجدول السيريال وشروط استبدال الوكيل للألواح والإنفرترات.',
      badgeAr: 'طاقة شمسية وإلكترونيات',
    },
    {
      id: 'a4_modern_blue',
      titleAr: 'فاتورة ضريبية عصرية ملونة (Modern Blue A4)',
      descAr: 'ترويسة تقنية احترافية بتدرجات الأزرق والكحلي مع هوية بصرية أنيقة للمؤسسات المعاصرة.',
      badgeAr: 'عصرية ملونة',
    },
    {
      id: 'a4_contracting_specs',
      titleAr: 'فاتورة مستخلصات مقاولات وتوريدات هندسية (Contracting Specs A4)',
      descAr: 'مخصصة لمستخلصات المشاريع الهندسية، مواصفات المواد، والمطابقة لمعايير الجودة والسلامة.',
      badgeAr: 'مقاولات ومشاريع',
    },
    {
      id: 'a4_medical_pharmacy',
      titleAr: 'فاتورة توريد طبي وصيدلاني وتشغيلات (FEFO Medical A4)',
      descAr: 'تتضمن تتبع أرقام التشغيلات (Batch/Lot) وتواريخ الصلاحية للامتثال لهيئة الغذاء والدواء.',
      badgeAr: 'طبي وصيدلاني',
    },
    {
      id: 'a4_minimalist_clean',
      titleAr: 'فاتورة مينيمل فائقة النقاء (Minimalist Clean A4)',
      descAr: 'تصميم سويسري خالٍ من الحشو البصري، خطوط نقية وأناقة تحريرية تناسب الاستشارات والمصممين.',
      badgeAr: 'مينيمل سويسري',
    },
  ];

  const sampleInvoice: SalesInvoice = salesInvoices[0] || {
    id: 'inv-sample-demo',
    tenantId: currentTenant.id,
    invoiceNumber: 'INV-2025-0088',
    customerId: 'cust-1',
    customerName: 'مؤسسة التقنية والأنظمة المتقدمة للتجارة',
    customerPhone: '+966 50 123 4567',
    branchId: currentBranch.id,
    date: '2025-05-18',
    subtotal: 5400,
    discountAmount: 200,
    couponCode: 'SUMMER25',
    taxAmount: 780,
    grandTotal: 5980,
    paidAmount: 5980,
    paymentMethod: 'CARD',
    status: 'PAID',
    qrData: 'ZATCA-SAMPLE-PAYLOAD',
    orderType: activeIndustry === 'restaurant' ? 'DINE_IN' : 'STANDARD',
    tableNumber: activeIndustry === 'restaurant' ? 'T-07' : undefined,
    items: [
      {
        productId: 'prod-solar-1',
        sku: 'SOLAR-585W',
        productName: 'لوح شمسي مونوكريستالين فائق الكفاءة 585W Tier-1',
        quantity: 4,
        unitPrice: 850,
        discount: 0,
        taxRate: 0.15,
        taxAmount: 510,
        total: 3910,
        serialNumber: 'SN-SLR-98214-585',
        warrantyMonths: 144,
      },
    ],
  };

  // Metrics
  const activeBranchesCount = branches.filter((b) => b.isActive).length;
  const totalStockedProducts = products.filter((p) => p.stockQty > 0).length;

  return (
    <div className="space-y-4">
      {/* ====================================================================
          TOP CENTRAL CONTROL BAR & KPI METRICS
      ==================================================================== */}
      <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-600 to-teal-700 text-white flex items-center justify-center font-black shadow-xs">
              <Store className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <span>الإدارة المركزية الموحدة للفروع والمستودعات</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-bold">
                  Enterprise Topology
                </span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                التحكم المباشر والكامل (إضافة، تعديل، حذف، وتعيين) في كافة الفروع التشغيلية والمستودعات التخزينية للمنشأة
              </p>
            </div>
          </div>

          {/* Quick Header Actions */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setIsAddBranchModalOpen(true)}
              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span>إضافة فرع جديد</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setNewWarehouseData({
                  nameAr: '',
                  name: '',
                  code: `WH-0${warehouses.length + 1}`,
                  branchId: currentBranch?.id || branches[0]?.id || '',
                  isDefault: false,
                });
                setIsAddWarehouseModalOpen(true);
              }}
              className="px-3.5 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span>إضافة مستودع جديد</span>
            </button>

            <button
              type="button"
              onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
              className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition cursor-pointer"
              title="طي أو فتح الشريط الجانبي"
            >
              {isSidebarCollapsed ? <PanelLeftOpen className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Central Enterprise Topology KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 flex items-center justify-center shrink-0">
              <GitBranch className="w-4 h-4" />
            </div>
            <div>
              <div className="text-[10px] text-slate-500 font-medium">الفروع المسجلة:</div>
              <div className="text-sm font-black text-slate-900 dark:text-white">
                {branches.length} فرع{' '}
                <span className="text-[10px] font-normal text-emerald-600">({activeBranchesCount} نشط)</span>
              </div>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 flex items-center justify-center shrink-0">
              <WarehouseIcon className="w-4 h-4" />
            </div>
            <div>
              <div className="text-[10px] text-slate-500 font-medium">المستودعات التخزينية:</div>
              <div className="text-sm font-black text-slate-900 dark:text-white">
                {warehouses.length} مستودع
              </div>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300 flex items-center justify-center shrink-0">
              <Store className="w-4 h-4" />
            </div>
            <div className="truncate">
              <div className="text-[10px] text-slate-500 font-medium">الفرع النشط حالياً:</div>
              <div className="text-xs font-black text-indigo-700 dark:text-indigo-400 truncate">
                {currentBranch?.nameAr}
              </div>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300 flex items-center justify-center shrink-0">
              <Boxes className="w-4 h-4" />
            </div>
            <div className="truncate">
              <div className="text-[10px] text-slate-500 font-medium">مستودع الصرف الافتراضي:</div>
              <div className="text-xs font-black text-teal-700 dark:text-teal-400 truncate">
                {currentWarehouse?.nameAr}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Global CRUD Notification Toast / Feedback Banner */}
      {crudBanner && (
        <div
          className={`p-3.5 rounded-xl border text-xs font-bold flex items-center justify-between gap-3 transition-all ${
            crudBanner.type === 'success'
              ? 'bg-emerald-50 text-emerald-900 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-200 dark:border-emerald-800'
              : crudBanner.type === 'warning'
              ? 'bg-amber-50 text-amber-950 border-amber-300 dark:bg-amber-950 dark:text-amber-200 dark:border-amber-800'
              : 'bg-rose-50 text-rose-950 border-rose-300 dark:bg-rose-950 dark:text-rose-200 dark:border-rose-800'
          }`}
        >
          <div className="flex items-center gap-2">
            {crudBanner.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />}
            {crudBanner.type === 'warning' && <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />}
            {crudBanner.type === 'error' && <X className="w-4 h-4 text-rose-600 shrink-0" />}
            <span>{crudBanner.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setCrudBanner(null)}
            className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Primary Navigation Tabs */}
      <div className="flex flex-wrap gap-1.5 bg-white dark:bg-slate-900 p-1.5 rounded-xl border border-slate-200/90 dark:border-slate-800">
        {[
          {
            id: 'central_hub',
            label: 'إدارة الفروع والمستودعات المركزية',
            count: branches.length + warehouses.length,
            icon: FolderTree,
          },
          {
            id: 'templates',
            label: 'استوديو قوالب الفواتير والضمان (6 حراري + 6 عادي)',
            icon: Receipt,
          },
          {
            id: 'company',
            label: 'بيانات المنشأة والضرائب ووضع القطاع',
            icon: Building2,
          },
          {
            id: 'backup',
            label: 'النسخ الاحتياطي والأمان السحابي',
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
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                isActive
                  ? 'bg-slate-900 text-white dark:bg-emerald-600 shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
              {typeof tab.count === 'number' && (
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                    isActive ? 'bg-white/20 text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ====================================================================
          TAB 1: CENTRAL MULTI-BRANCH & WAREHOUSES MANAGEMENT HUB
      ==================================================================== */}
      {activeSettingsTab === 'central_hub' && (
        <div className="space-y-4">
          {/* Segmented Sub-view Switcher & Filters */}
          <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
              <button
                type="button"
                data-testid="central-view-hierarchy"
                onClick={() => setCentralViewMode('hierarchy')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                  centralViewMode === 'hierarchy'
                    ? 'bg-white dark:bg-slate-900 text-emerald-700 dark:text-emerald-400 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                <FolderTree className="w-3.5 h-3.5" />
                <span>الهيكل التنظيمي الموحد (الفروع والمستودعات معاً)</span>
              </button>

              <button
                type="button"
                data-testid="central-view-branches"
                onClick={() => setCentralViewMode('branches')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                  centralViewMode === 'branches'
                    ? 'bg-white dark:bg-slate-900 text-emerald-700 dark:text-emerald-400 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                <GitBranch className="w-3.5 h-3.5" />
                <span>سجل الفروع المستقل ({branches.length})</span>
              </button>

              <button
                type="button"
                data-testid="central-view-warehouses"
                onClick={() => setCentralViewMode('warehouses')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                  centralViewMode === 'warehouses'
                    ? 'bg-white dark:bg-slate-900 text-amber-700 dark:text-amber-400 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                <WarehouseIcon className="w-3.5 h-3.5" />
                <span>سجل المستودعات المستقل ({warehouses.length})</span>
              </button>
            </div>

            {/* Quick Search */}
            <div className="relative min-w-[220px]">
              <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
              <input
                type="text"
                placeholder="بحث فوري في الفروع والمستودعات..."
                value={centralViewMode === 'warehouses' ? warehouseSearch : branchSearch}
                onChange={(e) => {
                  if (centralViewMode === 'warehouses') {
                    setWarehouseSearch(e.target.value);
                  } else {
                    setBranchSearch(e.target.value);
                  }
                }}
                className="w-full pr-9 pl-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100 outline-hidden focus:border-emerald-600"
              />
            </div>
          </div>

          {/* 1.1 HIERARCHICAL TREE VIEW: BRANCHES WITH NESTED WAREHOUSES */}
          {centralViewMode === 'hierarchy' && (
            <div className="space-y-4">
              {filteredBranches.map((branch) => {
                const isCurrent = currentBranch?.id === branch.id;
                const branchWarehouses = warehouses.filter((wh) => wh.branchId === branch.id);
                const branchInvoicesCount = salesInvoices.filter((inv) => inv.branchId === branch.id).length;

                return (
                  <div
                    key={branch.id}
                    className={`bg-white dark:bg-slate-900 rounded-2xl border transition-all overflow-hidden ${
                      isCurrent
                        ? 'border-emerald-600 ring-2 ring-emerald-500/20 shadow-xs'
                        : 'border-slate-200 dark:border-slate-800'
                    }`}
                  >
                    {/* Branch Header Banner */}
                    <div className="p-4 sm:p-5 bg-slate-50/80 dark:bg-slate-850 border-b border-slate-200/80 dark:border-slate-800 flex flex-wrap items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs ${
                            isCurrent
                              ? 'bg-emerald-600 text-white'
                              : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200'
                          }`}
                        >
                          <Store className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-black text-sm text-slate-900 dark:text-slate-100">
                              {branch.nameAr}
                            </h3>
                            <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200">
                              {branch.code}
                            </span>
                            {isCurrent && (
                              <span className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 px-2 py-0.5 rounded-full text-[10px] font-bold">
                                الفرع النشط حالياً
                              </span>
                            )}
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                branch.isActive
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                  : 'bg-rose-50 text-rose-700 border border-rose-200'
                              }`}
                            >
                              {branch.isActive ? 'نشط' : 'معطّل (محمي)'}
                            </span>
                          </div>
                          <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 mt-1">
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3.5 h-3.5 text-slate-400" />
                              {branch.city}
                            </span>
                            <span>•</span>
                            <span className="flex items-center gap-1" dir="ltr">
                              <Phone className="w-3.5 h-3.5 text-slate-400" />
                              {branch.phone}
                            </span>
                            <span>•</span>
                            <span>{branchInvoicesCount} فاتورة مرحّلة</span>
                          </div>
                        </div>
                      </div>

                      {/* Branch Actions */}
                      <div className="flex items-center gap-1.5">
                        {!isCurrent ? (
                          <button
                            type="button"
                            onClick={() => {
                              setCurrentBranch(branch);
                              showBanner(`تم تعيين فرع "${branch.nameAr}" كمركز العمليات النشط.`, 'success');
                            }}
                            className="px-3 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-bold transition cursor-pointer"
                          >
                            تعيين كفرع نشط
                          </button>
                        ) : (
                          <span className="text-xs font-bold text-emerald-600 flex items-center gap-1 px-2.5 py-1">
                            <Check className="w-3.5 h-3.5" /> الفرع المفعّل
                          </span>
                        )}

                        <button
                          type="button"
                          onClick={() => handleOpenAddWarehouseForBranch(branch.id)}
                          className="px-2.5 py-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 text-xs font-bold flex items-center gap-1 transition cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>إضافة مستودع تابع</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setEditingBranch(branch)}
                          className="p-1.5 rounded-lg bg-white dark:bg-slate-800 hover:bg-indigo-50 text-slate-600 hover:text-indigo-600 border border-slate-200 dark:border-slate-700 transition cursor-pointer"
                          title="تعديل بيانات الفرع"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>

                        <button
                          type="button"
                          disabled={branches.length <= 1 || isCurrent}
                          onClick={() => handleDeleteBranch(branch)}
                          className={`p-1.5 rounded-lg border transition cursor-pointer ${
                            branches.length <= 1 || isCurrent
                              ? 'bg-slate-100 dark:bg-slate-800 border-slate-200 text-slate-300 cursor-not-allowed'
                              : 'bg-white dark:bg-slate-800 border-slate-200 hover:bg-rose-50 text-slate-600 hover:text-rose-600'
                          }`}
                          title="حذف الفرع بأمان"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Nested Child Warehouses */}
                    <div className="p-4 sm:p-5 space-y-3">
                      <div className="flex items-center justify-between text-xs font-bold text-slate-600 dark:text-slate-300">
                        <span className="flex items-center gap-1.5">
                          <WarehouseIcon className="w-4 h-4 text-amber-600" />
                          <span>المستودعات التابعة لهذا الفرع ({branchWarehouses.length}):</span>
                        </span>
                      </div>

                      {branchWarehouses.length === 0 ? (
                        <div className="p-4 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 text-center text-xs text-slate-400">
                          لا توجد مستودعات مرتبطة بهذا الفرع حالياً.{' '}
                          <button
                            type="button"
                            onClick={() => handleOpenAddWarehouseForBranch(branch.id)}
                            className="text-amber-600 font-bold hover:underline cursor-pointer"
                          >
                            انقر هنا لإضافة أول مستودع تابع
                          </button>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                          {branchWarehouses.map((wh) => {
                            const isCurrentWh = currentWarehouse?.id === wh.id;
                            const stockedCount = products.filter((p) => p.warehouseId === wh.id && p.stockQty > 0).length;

                            return (
                              <div
                                key={wh.id}
                                className={`p-3.5 rounded-xl border transition-all flex flex-col justify-between ${
                                  isCurrentWh
                                    ? 'bg-amber-50/50 dark:bg-amber-950/20 border-amber-300 dark:border-amber-800 ring-1 ring-amber-500/20'
                                    : 'bg-slate-50/50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 hover:border-slate-300'
                                }`}
                              >
                                <div>
                                  <div className="flex items-center justify-between gap-2 mb-1.5">
                                    <span className="font-mono font-bold text-xs px-2 py-0.5 rounded bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200">
                                      {wh.code}
                                    </span>
                                    {wh.isDefault && (
                                      <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                                        افتراضي
                                      </span>
                                    )}
                                    {isCurrentWh && (
                                      <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                                        نشط للصرف
                                      </span>
                                    )}
                                  </div>

                                  <div className="font-black text-xs text-slate-900 dark:text-slate-100">
                                    {wh.nameAr}
                                  </div>
                                  <div className="text-[11px] text-slate-400 mt-1 flex items-center justify-between">
                                    <span>أصناف بمخزون:</span>
                                    <span className="font-mono font-bold text-amber-700 dark:text-amber-400">
                                      {stockedCount} صنف
                                    </span>
                                  </div>
                                </div>

                                <div className="mt-3 pt-2.5 border-t border-slate-200/80 dark:border-slate-700/80 flex items-center justify-between">
                                  {!isCurrentWh ? (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setCurrentWarehouse(wh);
                                        showBanner(`تم تعيين مستودع "${wh.nameAr}" كمستودع الصرف النشط.`, 'success');
                                      }}
                                      className="text-[11px] font-bold text-amber-700 hover:underline cursor-pointer"
                                    >
                                      تعيين كنشط
                                    </button>
                                  ) : (
                                    <span className="text-[11px] font-bold text-amber-700 flex items-center gap-1">
                                      <Check className="w-3 h-3" /> مفعّل
                                    </span>
                                  )}

                                  <div className="flex items-center gap-1">
                                    <button
                                      type="button"
                                      onClick={() => setEditingWarehouse(wh)}
                                      className="p-1 rounded bg-white dark:bg-slate-800 hover:bg-slate-100 text-slate-600 hover:text-indigo-600 border border-slate-200 dark:border-slate-700 cursor-pointer"
                                      title="تعديل المستودع"
                                    >
                                      <Edit3 className="w-3 h-3" />
                                    </button>
                                    <button
                                      type="button"
                                      disabled={warehouses.length <= 1 || isCurrentWh}
                                      onClick={() => handleDeleteWarehouse(wh)}
                                      className="p-1 rounded bg-white dark:bg-slate-800 hover:bg-rose-50 text-slate-600 hover:text-rose-600 border border-slate-200 dark:border-slate-700 cursor-pointer disabled:opacity-40"
                                      title="حذف المستودع"
                                    >
                                      <Trash2 className="w-3 h-3" />
                                    </button>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* 1.2 DEDICATED BRANCHES DIRECTORY & CRUD */}
          {centralViewMode === 'branches' && (
            <div className="space-y-4">
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
                <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      فلترة حسب المدينة:
                    </span>
                    <select
                      value={filterCity}
                      onChange={(e) => setFilterCity(e.target.value)}
                      className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold text-slate-800 dark:text-slate-200 outline-hidden"
                    >
                      <option value="ALL">جميع المدن ({availableCities.length})</option>
                      {availableCities.map((city) => (
                        <option key={city} value={city}>
                          {city}
                        </option>
                      ))}
                    </select>
                  </div>

                  <button
                    type="button"
                    onClick={() => setIsAddBranchModalOpen(true)}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" /> إضافة فرع
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-right text-xs">
                    <thead className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 font-bold text-slate-700 dark:text-slate-300">
                      <tr>
                        <th className="p-3">الكود</th>
                        <th className="p-3">اسم الفرع</th>
                        <th className="p-3">المدينة والموقع</th>
                        <th className="p-3">الهاتف</th>
                        <th className="p-3 text-center">المستودعات</th>
                        <th className="p-3 text-center">الفواتير</th>
                        <th className="p-3 text-center">الحالة</th>
                        <th className="p-3 text-left">الإجراءات</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                      {filteredBranches.map((b) => {
                        const isCurrent = currentBranch?.id === b.id;
                        const whCount = warehouses.filter((wh) => wh.branchId === b.id).length;
                        const invCount = salesInvoices.filter((inv) => inv.branchId === b.id).length;

                        return (
                          <tr key={b.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                            <td className="p-3 font-mono font-bold text-slate-900 dark:text-white">
                              {b.code}
                            </td>
                            <td className="p-3">
                              <div className="font-black text-slate-900 dark:text-slate-100">{b.nameAr}</div>
                              <div className="text-[10px] text-slate-400 font-mono">{b.name}</div>
                            </td>
                            <td className="p-3">{b.city}</td>
                            <td className="p-3 font-mono" dir="ltr">
                              {b.phone}
                            </td>
                            <td className="p-3 text-center font-bold text-amber-600">{whCount}</td>
                            <td className="p-3 text-center font-mono font-bold text-emerald-600">{invCount}</td>
                            <td className="p-3 text-center">
                              <span
                                className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                  b.isActive
                                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                    : 'bg-rose-50 text-rose-700 border border-rose-200'
                                }`}
                              >
                                {b.isActive ? 'نشط' : 'معطّل'}
                              </span>
                            </td>
                            <td className="p-3 text-left">
                              <div className="flex items-center justify-end gap-1.5">
                                {!isCurrent ? (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setCurrentBranch(b);
                                      showBanner(`تم تعيين فرع "${b.nameAr}" كفرع العمليات النشط.`, 'success');
                                    }}
                                    className="px-2 py-1 bg-slate-100 hover:bg-emerald-50 text-slate-700 hover:text-emerald-700 rounded text-[11px] font-bold cursor-pointer"
                                  >
                                    تفعيل
                                  </button>
                                ) : (
                                  <span className="text-[10px] font-bold text-emerald-600 px-2 py-1">
                                    النشط
                                  </span>
                                )}
                                <button
                                  type="button"
                                  onClick={() => setEditingBranch(b)}
                                  className="p-1 rounded bg-slate-100 hover:bg-indigo-50 text-slate-600 hover:text-indigo-600 cursor-pointer"
                                  title="تعديل الفرع"
                                >
                                  <Edit3 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  disabled={branches.length <= 1 || isCurrent}
                                  onClick={() => handleDeleteBranch(b)}
                                  className="p-1 rounded bg-slate-100 hover:bg-rose-50 text-slate-600 hover:text-rose-600 cursor-pointer disabled:opacity-30"
                                  title="حذف الفرع"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* 1.3 DEDICATED WAREHOUSES DIRECTORY & CRUD */}
          {centralViewMode === 'warehouses' && (
            <div className="space-y-4">
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
                <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      فلترة حسب الفرع التابع:
                    </span>
                    <select
                      value={filterBranchId}
                      onChange={(e) => setFilterBranchId(e.target.value)}
                      className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold text-slate-800 dark:text-slate-200 outline-hidden"
                    >
                      <option value="ALL">جميع الفروع ({branches.length})</option>
                      {branches.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.nameAr} ({b.code})
                        </option>
                      ))}
                    </select>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setNewWarehouseData({
                        nameAr: '',
                        name: '',
                        code: `WH-0${warehouses.length + 1}`,
                        branchId: currentBranch?.id || branches[0]?.id || '',
                        isDefault: false,
                      });
                      setIsAddWarehouseModalOpen(true);
                    }}
                    className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" /> إضافة مستودع
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-right text-xs">
                    <thead className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 font-bold text-slate-700 dark:text-slate-300">
                      <tr>
                        <th className="p-3">الكود</th>
                        <th className="p-3">اسم المستودع</th>
                        <th className="p-3">الفرع التابع</th>
                        <th className="p-3 text-center">أصناف بمخزون فعلي</th>
                        <th className="p-3 text-center">الافتراضي للمبيعات</th>
                        <th className="p-3 text-center">حالة الاستخدام</th>
                        <th className="p-3 text-left">الإجراءات</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                      {filteredWarehouses.map((w) => {
                        const isCurrentWh = currentWarehouse?.id === w.id;
                        const linkedBranch = branches.find((b) => b.id === w.branchId);
                        const stockedCount = products.filter((p) => p.warehouseId === w.id && p.stockQty > 0).length;

                        return (
                          <tr key={w.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                            <td className="p-3 font-mono font-bold text-amber-700 dark:text-amber-400">
                              {w.code}
                            </td>
                            <td className="p-3">
                              <div className="font-black text-slate-900 dark:text-slate-100">{w.nameAr}</div>
                              <div className="text-[10px] text-slate-400 font-mono">{w.name}</div>
                            </td>
                            <td className="p-3">
                              <span className="font-bold">{linkedBranch?.nameAr || 'غير محدد'}</span>
                            </td>
                            <td className="p-3 text-center font-mono font-bold text-slate-800 dark:text-slate-200">
                              {stockedCount} صنف
                            </td>
                            <td className="p-3 text-center">
                              {w.isDefault ? (
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                                  افتراضي
                                </span>
                              ) : (
                                <span className="text-slate-400 text-[10px]">-</span>
                              )}
                            </td>
                            <td className="p-3 text-center">
                              {isCurrentWh ? (
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-800">
                                  نشط للصرف
                                </span>
                              ) : (
                                <span className="text-slate-400 text-[10px]">احتياطي</span>
                              )}
                            </td>
                            <td className="p-3 text-left">
                              <div className="flex items-center justify-end gap-1.5">
                                {!isCurrentWh ? (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setCurrentWarehouse(w);
                                      showBanner(`تم تعيين مستودع "${w.nameAr}" كمستودع الصرف النشط.`, 'success');
                                    }}
                                    className="px-2 py-1 bg-slate-100 hover:bg-amber-50 text-slate-700 hover:text-amber-700 rounded text-[11px] font-bold cursor-pointer"
                                  >
                                    تفعيل
                                  </button>
                                ) : (
                                  <span className="text-[10px] font-bold text-amber-600 px-2 py-1">
                                    النشط
                                  </span>
                                )}
                                <button
                                  type="button"
                                  onClick={() => setEditingWarehouse(w)}
                                  className="p-1 rounded bg-slate-100 hover:bg-indigo-50 text-slate-600 hover:text-indigo-600 cursor-pointer"
                                  title="تعديل المستودع"
                                >
                                  <Edit3 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  disabled={warehouses.length <= 1 || isCurrentWh}
                                  onClick={() => handleDeleteWarehouse(w)}
                                  className="p-1 rounded bg-slate-100 hover:bg-rose-50 text-slate-600 hover:text-rose-600 cursor-pointer disabled:opacity-30"
                                  title="حذف المستودع"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ====================================================================
          TAB 2: INVOICE & WARRANTY STUDIO (6 Thermal + 6 Standard A4)
      ==================================================================== */}
      {activeSettingsTab === 'templates' && (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
          {/* Controls Column */}
          <div className="xl:col-span-6 space-y-4">
            <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">
                  نوع المعاينة والطباعة المباشرة
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  اختر بين إيصالات الكاشير الحرارية أو الفواتير الضريبية الرسمية A4
                </p>
              </div>

              <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
                <button
                  type="button"
                  onClick={() => setPreviewMode('thermal')}
                  className={`px-3 py-1.5 rounded-md text-xs font-bold transition cursor-pointer ${
                    previewMode === 'thermal'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700'
                  }`}
                >
                  إيصال كاشير حراري
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewMode('a4')}
                  className={`px-3 py-1.5 rounded-md text-xs font-bold transition cursor-pointer ${
                    previewMode === 'a4'
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700'
                  }`}
                >
                  فاتورة ضريبية A4
                </button>
              </div>
            </div>

            {/* Thermal Templates */}
            <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <Receipt className="w-4 h-4 text-emerald-600" />
                  قوالب الفواتير الحرارية لنقاط البيع (6 قوالب احترافية)
                </h3>
                <span className="text-[11px] font-mono text-emerald-600 font-bold">
                  {invoiceTemplateSettings.thermalTemplate}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {thermalTemplatesList.map((tpl) => {
                  const isSelected = invoiceTemplateSettings.thermalTemplate === tpl.id;
                  return (
                    <div
                      key={tpl.id}
                      onClick={() => {
                        updateInvoiceTemplateSettings({ thermalTemplate: tpl.id });
                        setPreviewMode('thermal');
                      }}
                      className={`p-3 rounded-xl border transition cursor-pointer flex flex-col justify-between ${
                        isSelected
                          ? 'border-emerald-600 bg-emerald-50/50 dark:bg-emerald-950/30 ring-1 ring-emerald-500/30'
                          : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 bg-slate-50/40 dark:bg-slate-850'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between gap-1 mb-1">
                          <span className="font-bold text-xs text-slate-900 dark:text-slate-100">
                            {tpl.titleAr}
                          </span>
                          <span
                            className={`text-[9px] font-bold px-1.5 py-0.2 rounded font-mono ${
                              isSelected
                                ? 'bg-emerald-600 text-white'
                                : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200'
                            }`}
                          >
                            {tpl.paperWidth}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-500 leading-relaxed">{tpl.descAr}</p>
                      </div>

                      <div className="mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[10px]">
                        <span className="text-slate-400">{tpl.categoryBadge}</span>
                        {isSelected && (
                          <span className="text-emerald-600 font-bold flex items-center gap-0.5">
                            <Check className="w-3 h-3" /> مفعّل
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Standard A4 Templates */}
            <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-indigo-600" />
                  قوالب الفواتير العادية A4 مع وثائق الضمان (6 قوالب معتمدة)
                </h3>
                <span className="text-[11px] font-mono text-indigo-600 font-bold">
                  {invoiceTemplateSettings.standardTemplate}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {standardTemplatesList.map((tpl) => {
                  const isSelected = invoiceTemplateSettings.standardTemplate === tpl.id;
                  return (
                    <div
                      key={tpl.id}
                      onClick={() => {
                        updateInvoiceTemplateSettings({ standardTemplate: tpl.id });
                        setPreviewMode('a4');
                      }}
                      className={`p-3 rounded-xl border transition cursor-pointer flex flex-col justify-between ${
                        isSelected
                          ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/30 ring-1 ring-indigo-500/30'
                          : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 bg-slate-50/40 dark:bg-slate-850'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between gap-1 mb-1">
                          <span className="font-bold text-xs text-slate-900 dark:text-slate-100">
                            {tpl.titleAr}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-500 leading-relaxed">{tpl.descAr}</p>
                      </div>

                      <div className="mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[10px]">
                        <span className="px-1.5 py-0.2 rounded bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-bold">
                          {tpl.badgeAr}
                        </span>
                        {isSelected && (
                          <span className="text-indigo-600 font-bold flex items-center gap-0.5">
                            <Check className="w-3 h-3" /> مفعّل
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Customization Options */}
            <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 space-y-4">
              <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Sliders className="w-4 h-4 text-emerald-600" />
                تخصيص مكونات الفاتورة والنصوص والاعتمادات
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                {[
                  { key: 'showQR', label: 'رمز التحقق والفوترة ZATCA QR' },
                  { key: 'showBarcode', label: 'الباركود الخطي للتتبع Code-128' },
                  { key: 'showStampAndSignature', label: 'أختام الاعتماد وتوقيع العميل' },
                  { key: 'showWarrantyTerms', label: 'شهادة وشروط الضمان المعتمد' },
                ].map((opt) => (
                  <label
                    key={opt.key}
                    className="flex items-center gap-2 p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 cursor-pointer font-bold text-slate-700 dark:text-slate-200"
                  >
                    <input
                      type="checkbox"
                      checked={(invoiceTemplateSettings as any)[opt.key]}
                      onChange={(e) =>
                        updateInvoiceTemplateSettings({ [opt.key]: e.target.checked })
                      }
                      className="rounded text-emerald-600"
                    />
                    <span>{opt.label}</span>
                  </label>
                ))}
              </div>

              <div className="space-y-3 pt-2">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    عنوان أو ترويسة ترحيبية أعلى الفاتورة (Header Title):
                  </label>
                  <input
                    type="text"
                    value={customHeader}
                    onChange={(e) => {
                      setCustomHeader(e.target.value);
                      updateInvoiceTemplateSettings({ headerTitleAr: e.target.value });
                    }}
                    placeholder="مثال: نسعد بخدمتكم • جميع المبيعات خاضعة للضمان المعتمد"
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100 outline-hidden focus:border-emerald-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    ملاحظة وسياسة الاستبدال والضمان أسفل الفاتورة (Footer Note):
                  </label>
                  <input
                    type="text"
                    value={customFooter}
                    onChange={(e) => {
                      setCustomFooter(e.target.value);
                      updateInvoiceTemplateSettings({ footerNoteAr: e.target.value });
                    }}
                    placeholder="مثال: البضاعة المباعة تخضع لسياسة الاستبدال خلال 7 أيام بشرط سلامة التغليف وسريان السيريال."
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100 outline-hidden focus:border-emerald-600"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Live Preview Column */}
          <div className="xl:col-span-6 bg-slate-100 dark:bg-slate-950 p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3 sticky top-16">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Eye className="w-4 h-4 text-emerald-600" />
                <span className="font-bold text-xs text-slate-800 dark:text-slate-200">
                  المعاينة الحية التفاعلية ({previewMode === 'thermal' ? 'حراري' : 'A4'})
                </span>
              </div>

              <button
                type="button"
                onClick={() => window.print()}
                className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>طباعة تجريبية</span>
              </button>
            </div>

            <div className="p-2 sm:p-4 bg-slate-200/60 dark:bg-slate-900/80 rounded-xl overflow-x-auto max-h-[750px] overflow-y-auto">
              <InvoiceRenderer
                invoice={sampleInvoice}
                mode={previewMode}
                thermalTemplate={invoiceTemplateSettings.thermalTemplate}
                standardTemplate={invoiceTemplateSettings.standardTemplate}
                settings={invoiceTemplateSettings}
                companyName={company.nameAr || currentTenant.legalName}
                taxNumber={company.taxNumber || '300059281900003'}
                branchName={currentBranch?.nameAr || 'الفرع الرئيسي'}
                branchAddress={`${currentBranch?.city || 'الرياض'} - المملكة العربية السعودية`}
                branchPhone={currentBranch?.phone || '+966 11 000 0000'}
                currency={currency}
              />
            </div>
          </div>
        </div>
      )}

      {/* ====================================================================
          TAB 3: COMPANY PROFILE & SECTOR PRESET
      ==================================================================== */}
      {activeSettingsTab === 'company' && (
        <div className="max-w-4xl space-y-4">
          <form
            onSubmit={handleSaveCompany}
            className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-4"
          >
            <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Building2 className="w-4 h-4 text-emerald-600" />
                بيانات الهوية الرسمية والترخيص الضريبي (ZATCA)
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                تنعكس هذه البيانات تلقائياً في الترويسة ورمز الاستجابة السريع للفوترة الإلكترونية المرحلة الثانية
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  اسم المنشأة أو الشركة الرسمي (عربي):
                </label>
                <input
                  type="text"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100 outline-hidden focus:border-emerald-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  الرقم الضريبي الموحد VAT (15 رقماً):
                </label>
                <input
                  type="text"
                  value={taxNumber}
                  onChange={(e) => setTaxNumber(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-mono text-slate-900 dark:text-slate-100 outline-hidden focus:border-emerald-600"
                  dir="ltr"
                />
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-900 text-white space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-emerald-400">
                  وضع القطاع المركز • Sector Mode
                </span>
                <button
                  type="button"
                  onClick={() => toggleSectorMode(!masterSystemConfig.sectorModeEnabled)}
                  className={`px-3 py-1 rounded text-xs font-bold transition cursor-pointer ${
                    masterSystemConfig.sectorModeEnabled
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-800 text-slate-300 border border-slate-700'
                  }`}
                >
                  {masterSystemConfig.sectorModeEnabled ? 'مفعّل' : 'معطّل'}
                </button>
              </div>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                عند التفعيل، يحصر النظام القوائم والشاشات الرئيسية على (نقطة البيع POS، المخزون، المبيعات والضمان، المحاسبة) لتوفير بيئة عمل فائقة التركيز وسلسة.
              </p>
            </div>

            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
              {savedSuccess ? (
                <span className="text-xs font-bold text-emerald-600 flex items-center gap-1">
                  <CheckCircle2 className="w-4 h-4" /> تم حفظ التعديلات وتحديث الترويسة بنجاح!
                </span>
              ) : (
                <span className="text-[11px] text-slate-400">
                  التغييرات تسري فوراً في كامل النظام.
                </span>
              )}

              <button
                type="submit"
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shadow-xs"
              >
                <Save className="w-4 h-4" />
                <span>حفظ التعديلات</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ====================================================================
          TAB 4: DISASTER RECOVERY & BACKUP
      ==================================================================== */}
      {activeSettingsTab === 'backup' && (
        <div className="max-w-3xl bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-4">
          <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
            <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              النسخ الاحتياطي المشفر وخطط التعافي من الكوارث (Disaster Recovery)
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              تصدير لقطات كاملة مشفرة بتوقيع رقمي لحماية قيود الحسابات والفواتير وقواعد البيانات
            </p>
          </div>

          {restoreFeedback && (
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 rounded-lg text-xs font-bold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{restoreFeedback}</span>
            </div>
          )}

          <div className="p-4 rounded-xl bg-slate-900 text-white border border-slate-800 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Lock className="w-4 h-4 text-emerald-400" />
                <span className="text-xs font-bold">
                  تصدير لقطة قاعدة البيانات المشفرة (Export Encrypted Snapshot)
                </span>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                RLM-STREAM-256 + HMAC
              </span>
            </div>

            <div className="space-y-1.5">
              <label className="block text-[11px] text-slate-300 font-semibold flex items-center gap-1.5">
                <KeyRound className="w-3.5 h-3.5 text-amber-400" />
                <span>مفتاح التشفير وفك التشفير الخاص بالمنشأة:</span>
              </label>
              <input
                type="text"
                value={snapshotPassphrase}
                onChange={(e) => setSnapshotPassphrase(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-xs font-mono text-emerald-300 outline-hidden"
                dir="ltr"
              />
            </div>

            <button
              type="button"
              onClick={handleExportEncryptedSnapshot}
              className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition cursor-pointer shadow-xs"
            >
              <Lock className="w-4 h-4" />
              <span>تنزيل لقطة قاعدة البيانات المشفرة (.enc.json)</span>
            </button>
          </div>

          <div className="space-y-3 pt-2">
            <button
              type="button"
              onClick={handleExportJSON}
              className="w-full py-2.5 px-4 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition cursor-pointer"
            >
              <Download className="w-4 h-4 text-slate-600 dark:text-slate-300" />
              تصدير نسخة احتياطية قياسية غير مشفرة (JSON Backup)
            </button>

            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2">
              <div className="text-xs font-bold text-slate-800 dark:text-slate-200">
                استيراد واستعادة لقطة مشفرة أو نسخة احتياطية
              </div>
              <input
                type="file"
                accept=".json,application/json"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  const reader = new FileReader();
                  reader.onload = () => {
                    const res = importBackupJSON(String(reader.result || ''), snapshotPassphrase);
                    setRestoreFeedback(res.messageAr);
                  };
                  reader.readAsText(file);
                }}
                className="w-full text-xs text-slate-600 dark:text-slate-300 file:me-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-indigo-600 file:text-white hover:file:bg-indigo-700 cursor-pointer"
              />
            </div>

            {!confirmReset ? (
              <button
                type="button"
                onClick={() => setConfirmReset(true)}
                className="w-full py-2 px-4 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
                إعادة ضبط النظام للبيانات الافتراضية
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
                      setRestoreFeedback('تمت استعادة البيانات الافتراضية بنجاح');
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

      {/* ====================================================================
          MODAL: ADD NEW BRANCH
      ==================================================================== */}
      {isAddBranchModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 max-w-lg w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <GitBranch className="w-4 h-4 text-emerald-600" />
                إضافة فرع تشغيلي جديد للمنظومة
              </h3>
              <button
                type="button"
                onClick={() => setIsAddBranchModalOpen(false)}
                className="text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateBranch} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  اسم الفرع (باللغة العربية) *
                </label>
                <input
                  type="text"
                  required
                  placeholder="مثال: فرع الشرقية - الخبر، فرع جدة طريق المدينة"
                  value={newBranchData.nameAr}
                  onChange={(e) => setNewBranchData({ ...newBranchData, nameAr: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100 outline-hidden focus:border-emerald-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  الاسم بالإنجليزية (اختياري)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Khobar Commercial Branch"
                  value={newBranchData.name}
                  onChange={(e) => setNewBranchData({ ...newBranchData, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100 outline-hidden focus:border-emerald-600"
                  dir="ltr"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    المدينة
                  </label>
                  <input
                    type="text"
                    value={newBranchData.city}
                    onChange={(e) => setNewBranchData({ ...newBranchData, city: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100 outline-hidden focus:border-emerald-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    هاتف الفرع
                  </label>
                  <input
                    type="text"
                    value={newBranchData.phone}
                    onChange={(e) => setNewBranchData({ ...newBranchData, phone: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-mono text-slate-900 dark:text-slate-100 outline-hidden focus:border-emerald-600"
                    dir="ltr"
                  />
                </div>
              </div>

              <label className="flex items-center gap-2 pt-1 cursor-pointer">
                <input
                  type="checkbox"
                  checked={newBranchData.isActive}
                  onChange={(e) => setNewBranchData({ ...newBranchData, isActive: e.target.checked })}
                  className="rounded text-emerald-600"
                />
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  فرع تشغيلي نشط وجاهز للعمليات
                </span>
              </label>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddBranchModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-4 h-4" /> حفظ وإضافة الفرع
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ====================================================================
          MODAL: EDIT BRANCH
      ==================================================================== */}
      {editingBranch && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 max-w-lg w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-indigo-600" />
                تعديل بيانات الفرع: {editingBranch.code}
              </h3>
              <button
                type="button"
                onClick={() => setEditingBranch(null)}
                className="text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateBranchSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  اسم الفرع (باللغة العربية) *
                </label>
                <input
                  type="text"
                  required
                  value={editingBranch.nameAr}
                  onChange={(e) => setEditingBranch({ ...editingBranch, nameAr: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100 outline-hidden focus:border-indigo-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  الاسم بالإنجليزية
                </label>
                <input
                  type="text"
                  value={editingBranch.name}
                  onChange={(e) => setEditingBranch({ ...editingBranch, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100 outline-hidden focus:border-indigo-600"
                  dir="ltr"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    المدينة
                  </label>
                  <input
                    type="text"
                    value={editingBranch.city}
                    onChange={(e) => setEditingBranch({ ...editingBranch, city: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100 outline-hidden focus:border-indigo-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    هاتف الفرع
                  </label>
                  <input
                    type="text"
                    value={editingBranch.phone}
                    onChange={(e) => setEditingBranch({ ...editingBranch, phone: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-mono text-slate-900 dark:text-slate-100 outline-hidden focus:border-indigo-600"
                    dir="ltr"
                  />
                </div>
              </div>

              <label className="flex items-center gap-2 pt-1 cursor-pointer">
                <input
                  type="checkbox"
                  checked={editingBranch.isActive}
                  onChange={(e) => setEditingBranch({ ...editingBranch, isActive: e.target.checked })}
                  className="rounded text-indigo-600"
                />
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  حالة النشاط (فرع نشط ومتاح للعمليات)
                </span>
              </label>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingBranch(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer"
                >
                  <Save className="w-4 h-4" /> حفظ التعديلات
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ====================================================================
          MODAL: ADD NEW WAREHOUSE
      ==================================================================== */}
      {isAddWarehouseModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 max-w-lg w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <WarehouseIcon className="w-4 h-4 text-amber-600" />
                إضافة مستودع تخزين جديد
              </h3>
              <button
                type="button"
                onClick={() => setIsAddWarehouseModalOpen(false)}
                className="text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateWarehouse} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  اسم المستودع (عربي) *
                </label>
                <input
                  type="text"
                  required
                  placeholder="مثال: مستودع الألواح والإنفرترات المركزي"
                  value={newWarehouseData.nameAr}
                  onChange={(e) => setNewWarehouseData({ ...newWarehouseData, nameAr: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100 outline-hidden focus:border-amber-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  كود المستودع (اختياري - يولد آلياً)
                </label>
                <input
                  type="text"
                  placeholder="e.g. WH-04"
                  value={newWarehouseData.code}
                  onChange={(e) => setNewWarehouseData({ ...newWarehouseData, code: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-mono text-slate-900 dark:text-slate-100 outline-hidden focus:border-amber-600"
                  dir="ltr"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  الفرع التابع له المستودع *
                </label>
                <select
                  value={newWarehouseData.branchId}
                  onChange={(e) => setNewWarehouseData({ ...newWarehouseData, branchId: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100 outline-hidden focus:border-amber-600 bg-white dark:bg-slate-800"
                >
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.nameAr} ({b.code}) - {b.city}
                    </option>
                  ))}
                </select>
              </div>

              <label className="flex items-center gap-2 pt-1 cursor-pointer">
                <input
                  type="checkbox"
                  checked={newWarehouseData.isDefault}
                  onChange={(e) => setNewWarehouseData({ ...newWarehouseData, isDefault: e.target.checked })}
                  className="rounded text-amber-600"
                />
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  تعيين كمستودع رئيسي افتراضي للمبيعات
                </span>
              </label>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddWarehouseModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-4 h-4" /> حفظ وإضافة المستودع
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ====================================================================
          MODAL: EDIT WAREHOUSE
      ==================================================================== */}
      {editingWarehouse && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 max-w-lg w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-amber-600" />
                تعديل بيانات المستودع: {editingWarehouse.code}
              </h3>
              <button
                type="button"
                onClick={() => setEditingWarehouse(null)}
                className="text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateWarehouseSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  اسم المستودع (عربي) *
                </label>
                <input
                  type="text"
                  required
                  value={editingWarehouse.nameAr}
                  onChange={(e) => setEditingWarehouse({ ...editingWarehouse, nameAr: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100 outline-hidden focus:border-amber-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  كود المستودع
                </label>
                <input
                  type="text"
                  value={editingWarehouse.code}
                  onChange={(e) => setEditingWarehouse({ ...editingWarehouse, code: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-mono text-slate-900 dark:text-slate-100 outline-hidden focus:border-amber-600"
                  dir="ltr"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  الفرع التابع
                </label>
                <select
                  value={editingWarehouse.branchId}
                  onChange={(e) => setEditingWarehouse({ ...editingWarehouse, branchId: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100 outline-hidden focus:border-amber-600 bg-white dark:bg-slate-800"
                >
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.nameAr} ({b.code}) - {b.city}
                    </option>
                  ))}
                </select>
              </div>

              <label className="flex items-center gap-2 pt-1 cursor-pointer">
                <input
                  type="checkbox"
                  checked={editingWarehouse.isDefault}
                  onChange={(e) => setEditingWarehouse({ ...editingWarehouse, isDefault: e.target.checked })}
                  className="rounded text-amber-600"
                />
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  مستودع رئيسي افتراضي للمبيعات
                </span>
              </label>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingWarehouse(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer"
                >
                  <Save className="w-4 h-4" /> حفظ التعديلات
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
