import React, { useState } from 'react';
import { useERP } from '../context/ERPContext';
import {
  ThermalTemplateType,
  StandardInvoiceTemplateType,
  SalesInvoice,
  Branch,
  Warehouse,
  AutoBackupConfig,
  AutoBackupSchedule,
  ServerBackupMetadata,
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
  Database,
  Volume2,
  VolumeX,
  BellRing,
  ShieldAlert,
  RefreshCw,
  Clock,
  HardDrive,
  Laptop,
  Wifi,
  Terminal,
  Smartphone,
} from 'lucide-react';
import { useAlertSound } from '../hooks/useAlertSound';
import { PWAInstallButton } from '../components/layout/PWAInstallBanner';
import type { SystemReadinessReport } from '../core/installerEngine';
import { computeNextDailyBackupIso } from '../core/backupSchedulerEngine';
import { AiThemeAndPreviewStudio } from '../components/settings/AiThemeAndPreviewStudio';
import { InvoiceTemplateManager } from '../components/invoices/InvoiceTemplateManager';
import { useModalLayer, renderModalPortal } from '../core/modalLayerEngine';

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
    resetInvoiceTemplateSettings,
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
    openOnboarding,
    language,
    uiTheme,
    soundAlertPrefs,
    updateSoundAlertPrefs,
    dispatchToastAndPushNotification,
    offlineStorageMetrics,
    flushPendingSyncQueue,
    reloadStateFromServer,
    isServerSyncing,
    autoDailyBackupEnabled,
    setAutoDailyBackupEnabled,
    lastAutoDailyBackupAt,
    latestDailyBackupInfo,
    isRunningDailyBackup,
    runDailyBackupNow,
    downloadLatestDailyBackup,
    requestedSettingsTab,
    setRequestedSettingsTab,
  } = useERP();

  const { playAlertSound, activeSoundProfile } = useAlertSound({
    uiTheme,
    preferences: soundAlertPrefs,
  });

  // Top-level tabs: central hub, templates, company profile, sound alerts, backup, system_setup
  const [activeSettingsTab, setActiveSettingsTab] = useState<
    'central_hub' | 'templates' | 'company' | 'sound_alerts' | 'backup' | 'system_setup'
  >(() => requestedSettingsTab || 'central_hub');

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

  const addBranchLayer = useModalLayer(isAddBranchModalOpen, 60);
  const editBranchLayer = useModalLayer(Boolean(editingBranch), 60);
  const addWarehouseLayer = useModalLayer(isAddWarehouseModalOpen, 60);
  const editWarehouseLayer = useModalLayer(Boolean(editingWarehouse), 60);

  React.useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (addBranchLayer.isTopLayer) {
        setIsAddBranchModalOpen(false);
      } else if (editBranchLayer.isTopLayer) {
        setEditingBranch(null);
      } else if (addWarehouseLayer.isTopLayer) {
        setIsAddWarehouseModalOpen(false);
      } else if (editWarehouseLayer.isTopLayer) {
        setEditingWarehouse(null);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [
    addBranchLayer.isTopLayer,
    editBranchLayer.isTopLayer,
    addWarehouseLayer.isTopLayer,
    editWarehouseLayer.isTopLayer,
  ]);

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
  const [companyNameEn, setCompanyNameEn] = useState(company.name || '');
  const [taxNumber, setTaxNumber] = useState(company.taxNumber || '');
  const [companyLogo, setCompanyLogo] = useState<string>(company.logo || '');
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const [restoreFeedback, setRestoreFeedback] = useState<string | null>(null);

  // Template Studio state
  const [previewMode, setPreviewMode] = useState<'thermal' | 'a4'>('a4');
  const [studioMobilePane, setStudioMobilePane] = useState<'editor' | 'preview'>('editor');
  const [studioSectionOpen, setStudioSectionOpen] = useState<
    'colors' | 'header' | 'columns' | 'footer' | 'ALL'
  >('colors');
  const [customHeader, setCustomHeader] = useState(invoiceTemplateSettings.headerTitleAr);
  const [customFooter, setCustomFooter] = useState(invoiceTemplateSettings.footerNoteAr);

  React.useEffect(() => {
    if (requestedSettingsTab) {
      setActiveSettingsTab(requestedSettingsTab);
    }
  }, [requestedSettingsTab]);

  React.useEffect(() => {
    const openStudio = () => {
      setActiveSettingsTab('templates');
    };
    const openBackup = () => {
      setActiveSettingsTab('backup');
    };
    window.addEventListener('haseb-open-invoice-studio', openStudio);
    window.addEventListener('haseb-open-backup-tab', openBackup);
    return () => {
      window.removeEventListener('haseb-open-invoice-studio', openStudio);
      window.removeEventListener('haseb-open-backup-tab', openBackup);
    };
  }, []);

  // Disaster recovery & server scheduled auto-backup state
  const [snapshotPassphrase, setSnapshotPassphrase] = useState('RLM-DEFAULT-RECOVERY-KEY-2026');
  const [serverBackupConfig, setServerBackupConfig] = useState<AutoBackupConfig>({
    schedule: 'EVERY_6_HOURS',
    maxRetentionCount: 15,
    includeSqliteCopy: true,
  });
  const [serverBackupsList, setServerBackupsList] = useState<ServerBackupMetadata[]>([]);
  const [isBackupBusy, setIsBackupBusy] = useState(false);
  const [confirmRestoreFilename, setConfirmRestoreFilename] = useState<string | null>(null);
  const [auditChainStatus, setAuditChainStatus] = useState<{
    valid: boolean;
    totalEntries: number;
    brokenAtSequence?: number;
    reason?: string;
    recentEntries: Array<{
      seq: number;
      timestampIso: string;
      actor: string;
      category: string;
      action: string;
      entryHash: string;
    }>;
  } | null>(null);

  const loadServerBackupsStatus = React.useCallback(async () => {
    try {
      const [bkpRes, audRes] = await Promise.all([
        fetch('/api/v1/backups/status'),
        fetch('/api/v1/security/audit-chain'),
      ]);
      if (bkpRes.ok) {
        const json = await bkpRes.json();
        if (json?.config) setServerBackupConfig(json.config);
        if (Array.isArray(json?.backups)) setServerBackupsList(json.backups);
      }
      if (audRes.ok) {
        const audJson = await audRes.json();
        if (audJson?.integrity) {
          setAuditChainStatus({
            valid: Boolean(audJson.integrity.valid ?? audJson.integrity.intact),
            totalEntries: Number(audJson.integrity.totalEntries) || 0,
            brokenAtSequence: audJson.integrity.brokenAtSequence,
            reason: audJson.integrity.reason,
            recentEntries: Array.isArray(audJson.entries) ? audJson.entries.slice(-5).reverse() : [],
          });
        }
      }
    } catch {
      // ignore offline
    }
  }, []);

  // Zero-download installer, firewall, port & ADB USB readiness inspection state
  const [systemReadiness, setSystemReadiness] = useState<SystemReadinessReport | null>(null);
  const [isCheckingReadiness, setIsCheckingReadiness] = useState(false);
  const [isApplyingPermissions, setIsApplyingPermissions] = useState(false);
  const [permissionActionsLog, setPermissionActionsLog] = useState<string[]>([]);

  const loadSystemReadiness = React.useCallback(async () => {
    setIsCheckingReadiness(true);
    try {
      const res = await fetch('/api/v1/system/readiness');
      if (!res.ok) return;
      const json = await res.json();
      if (json?.readiness) setSystemReadiness(json.readiness);
    } catch {
      // ignore offline
    } finally {
      setIsCheckingReadiness(false);
    }
  }, []);

  const handleApplyHostPermissions = async () => {
    setIsApplyingPermissions(true);
    try {
      const res = await fetch('/api/v1/system/apply-permissions', { method: 'POST' });
      const json = await res.json().catch(() => null);
      if (json?.readiness) setSystemReadiness(json.readiness);
      if (Array.isArray(json?.actionsTakenAr)) {
        setPermissionActionsLog(json.actionsTakenAr);
      }
    } catch {
      setPermissionActionsLog(['تعذر الاتصال بالخادم المحلي لتطبيق الصلاحيات.']);
    } finally {
      setIsApplyingPermissions(false);
    }
  };

  React.useEffect(() => {
    if (activeSettingsTab === 'backup') {
      loadServerBackupsStatus();
    } else if (activeSettingsTab === 'system_setup') {
      loadSystemReadiness();
    }
  }, [activeSettingsTab, loadServerBackupsStatus, loadSystemReadiness]);

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
    updateCompanyProfile({
      nameAr: companyName,
      name: companyNameEn || companyName,
      taxNumber,
      logo: companyLogo || undefined,
    });
    try {
      if (companyLogo) {
        localStorage.setItem('haseb_company_custom_logo_v1', companyLogo);
      } else {
        localStorage.removeItem('haseb_company_custom_logo_v1');
      }
    } catch {
      // ignore
    }
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  // Backup Export Handlers (Server AES-256-GCM V2 with local fallback)
  const handleExportEncryptedSnapshot = async () => {
    try {
      const res = await fetch('/api/v1/backups/create-encrypted', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ passphrase: snapshotPassphrase }),
      });
      const json = await res.json().catch(() => null);
      if (res.ok && json?.success && json.envelope) {
        const blob = new Blob([JSON.stringify(json.envelope, null, 2)], {
          type: 'application/json',
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = json.filename || `haseb-backup-encrypted-${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);
        await loadServerBackupsStatus();
        showBanner(
          `تم إنشاء وتنزيل النسخة المشفرة بمعيار AES-256-GCM (${json.filename}) بنجاح! البصمة: ${String(
            json.envelope.plaintextSha256 || ''
          ).slice(0, 16)}...`,
          'success'
        );
        return;
      }
    } catch {
      // Fallback to local snapshot when offline
    }
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
      id: 'thermal_80mm_onyx_pos',
      titleAr: 'إيصال المبيعات التنفيذي المعتمد 80mm (Executive POS Pro)',
      descAr: 'تصميم محاسبي تنفيذي متناغم مع ثيم النظام بشعار منشأتك مع التفقيط ووحدة التحقق (QR + باركود).',
      categoryBadge: 'الإصدار التنفيذي (الأشهر)',
      paperWidth: '80mm',
    },
    {
      id: 'thermal_80mm_standard',
      titleAr: 'الإيصال الضريبي القياسي الموحد 80mm (Standard Tax Receipt)',
      descAr: 'تصميم رسمي واضح لمعارض التجزئة والتجارة مع باركود ورمز QR ضريبي مباشر.',
      categoryBadge: 'تجزئة وتجارة عامة',
      paperWidth: '80mm',
    },
    {
      id: 'thermal_80mm_warranty',
      titleAr: 'إيصال الضمان والأرقام التسلسلية 80mm (Serial & Warranty)',
      descAr: 'يتضمن إظهار الأرقام التسلسلية (S/N / IMEI) وفترة الضمان بالأشهر وشروط صيانة الوكيل.',
      categoryBadge: 'إلكترونيات وطاقة شمسية',
      paperWidth: '80mm',
    },
    {
      id: 'thermal_80mm_modern',
      titleAr: 'إيصال الهوية البصرية الرقمي 80mm (Modern Brand Identity)',
      descAr: 'تصميم عصري يتفاعل مع ألوان الثيم العام، بطاقات أصناف مفصولة، ووضوح فائق للمعارض الحديثة.',
      categoryBadge: 'معارض راقية وماركات',
      paperWidth: '80mm',
    },
    {
      id: 'thermal_80mm_minimal',
      titleAr: 'الإيصال السويسري الموفّر للحبر 80mm (Swiss Eco Minimal)',
      descAr: 'تنسيق طباعي مقتصد بالحبر، فواصل هادئة غير صاخبة، سرعة طباعة قصوى وتوفير للورق.',
      categoryBadge: 'توفير ورق وحبر',
      paperWidth: '80mm',
    },
    {
      id: 'thermal_80mm_restaurant',
      titleAr: 'إيصال الضيافة والمطاعم 80mm (Hospitality & Dining)',
      descAr: 'إبراز رقم الطاولة وحالة الطلب (محلي / سفري) مع مساحة مخصصة لملاحظات التحضير.',
      categoryBadge: 'مطاعم وكافيهات',
      paperWidth: '80mm',
    },
    {
      id: 'thermal_58mm_compact',
      titleAr: 'الإيصال المدمج للطابعات المحمولة 58mm (Compact Mobile)',
      descAr: 'مخصص لطابعات البلوتوث المحمولة ونقاط التوزيع الميدانية بمقاس 58mm.',
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
      id: 'a4_onyx_yemen',
      titleAr: 'القالب التنفيذي الرسمي المعتمد A4 (Executive Commercial Pro)',
      descAr: 'التصميم التنفيذي الرسمي المتناغم مع الثيم العام، بترويسة مزدوجة، تفقيط المبلغ، ووحدة تحقق متكاملة (الباركود أسفل الـ QR).',
      badgeAr: 'القالب التنفيذي المعتمد',
    },
    {
      id: 'a4_global_sap_odoo',
      titleAr: 'القالب الضريبي المؤسسي للشركات A4 (Enterprise Tax B2B)',
      descAr: 'مستند ضريبي دولي ثنائي اللغة (عربي/إنجليزي) للشركات والتوريدات الكبرى مع وحدة تحقق QR وباركود Code-128.',
      badgeAr: 'نموذج دولي للشركات',
    },
    {
      id: 'a4_corporate_classic',
      titleAr: 'القالب التجاري الكلاسيكي الرصين A4 (Classic Corporate)',
      descAr: 'تصميم مصرفي ومحاسبي رصين للشركات وتوريدات الجملة مع جداول متكيفة مع الثيم وختم رسمي معتمد.',
      badgeAr: 'توريد وشركات B2B',
    },
    {
      id: 'a4_warranty_electronics',
      titleAr: 'وثيقة المبيعات وشهادة الضمان المعتمدة A4 (Warranty & S/N Certificate)',
      descAr: 'تدمج الفاتورة الضريبية مع شهادة ضمان رسمية وجدول الأرقام التسلسلية (S/N) وشروط صيانة الوكيل.',
      badgeAr: 'طاقة شمسية وإلكترونيات',
    },
    {
      id: 'a4_modern_blue',
      titleAr: 'قالب الهوية البصرية المتدرج A4 (Royal Brand Gradient)',
      descAr: 'ترويسة احترافية متدرجة تتفاعل مع ألوان الثيم العام وهوية المنشأة بأسلوب عصري أنيق.',
      badgeAr: 'هوية بصرية متدرجة',
    },
    {
      id: 'a4_contracting_specs',
      titleAr: 'فاتورة المستخلصات والتوريدات الهندسية A4 (Engineering & Contracting)',
      descAr: 'مخصصة لمستخلصات المشاريع الهندسية، مواصفات المواد، والمطابقة لمعايير الجودة والسلامة.',
      badgeAr: 'مقاولات ومشاريع',
    },
    {
      id: 'a4_medical_pharmacy',
      titleAr: 'فاتورة التوريد الطبي والدوائي A4 (Medical & Batch FEFO)',
      descAr: 'تتضمن تتبع أرقام التشغيلات (Batch/Lot) وتواريخ الصلاحية للامتثال لمعايير المستودعات الطبية والغذائية.',
      badgeAr: 'طبي وصيدلاني FEFO',
    },
    {
      id: 'a4_minimalist_clean',
      titleAr: 'القالب النقي السويسري الموفّر للحبر A4 (Swiss Clean Print)',
      descAr: 'تصميم سويسري فائق النقاء بدون تظليل ثقيل، مثالي للطابعات المكتبية الليزرية وتوفير الحبر.',
      badgeAr: 'سويسري موفّر للحبر',
    },
    {
      id: 'a4_executive_grid_pro',
      titleAr: 'القالب الشبكي التنفيذي المتقدم A4 (Executive Grid Pro & Signature)',
      descAr: 'تصميم شبكي عصري (Grid-based) يتكيف تلقائياً مع ألوان الثيم العام، ينظم تفاصيل الشركة والباركود والتوقيع الرقمي.',
      badgeAr: 'شبكي تنفيذي متقدم',
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
      {/* AI Color Theme Generator (Gemini API) & Real-Time Workspace Preview Card */}
      <AiThemeAndPreviewStudio />

      {/* ====================================================================
          TOP CENTRAL CONTROL BAR & KPI METRICS
      ==================================================================== */}
      <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl haseb-btn-primary text-white flex items-center justify-center font-black shadow-2xs">
              <Store className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <span>الإدارة المركزية الموحدة للفروع والمستودعات</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 font-bold">
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

      {/* Primary Navigation Tabs (Lumina POS Rounded-Full Pills) */}
      <div className="flex flex-wrap gap-2 bg-white dark:bg-slate-900 p-2 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs">
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
            id: 'sound_alerts',
            label: language === 'ar' ? 'التنبيهات الصوتية' : 'Sound Alerts',
            icon: soundAlertPrefs.enabled ? Volume2 : VolumeX,
          },
          {
            id: 'backup',
            label: 'النسخ الاحتياطي والأمان المحلي',
            icon: Download,
          },
          {
            id: 'system_setup',
            label: 'ملف التسطيب والصلاحيات',
            icon: Laptop,
          },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeSettingsTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              data-testid={`settings-tab-${tab.id}`}
              onClick={() => {
                setActiveSettingsTab(tab.id as any);
                if (requestedSettingsTab) setRequestedSettingsTab(null);
              }}
              className={`flex items-center gap-2 px-4 py-2 rounded-full border text-xs transition cursor-pointer ${
                isActive
                  ? 'haseb-nav-active text-white font-semibold shadow-2xs'
                  : 'bg-white border-slate-200/80 text-slate-600 hover:border-slate-300 font-medium dark:bg-slate-900 dark:border-slate-800 dark:text-slate-300'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
              {typeof tab.count === 'number' && (
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                    isActive ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
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
          <div className="bg-white dark:bg-slate-900 p-3 sm:p-4 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 max-w-full min-w-0">
            <div className="flex flex-wrap items-center gap-1.5 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl w-full sm:w-auto max-w-full">
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
            <div className="relative w-full sm:w-auto sm:min-w-[220px]">
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
          TAB 2: INTERACTIVE INVOICE & WARRANTY STUDIO (7 Thermal + 8 A4 + 21 Controls)
      ==================================================================== */}
      {activeSettingsTab === 'templates' && (
        <div className="space-y-5">
          {/* Drag-and-Drop Grid Invoice Template Manager (A4 & Thermal Library + Customizer) */}
          <InvoiceTemplateManager sampleInvoice={sampleInvoice} />

          {/* Mobile Sub-Pane Switcher (Editor vs Live Preview) */}
          <div className="xl:hidden bg-white dark:bg-slate-900 p-2 rounded-2xl border border-slate-200 dark:border-slate-800 grid grid-cols-2 gap-1.5 sticky top-2 z-20 shadow-sm">
            <button
              type="button"
              data-testid="studio-mobile-editor-btn"
              onClick={() => setStudioMobilePane('editor')}
              className={`py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                studioMobilePane === 'editor'
                  ? 'haseb-btn-primary text-white'
                  : 'bg-slate-100 text-slate-700'
              }`}
            >
              القوالب وأدوات التخصيص
            </button>
            <button
              type="button"
              data-testid="studio-mobile-preview-btn"
              onClick={() => setStudioMobilePane('preview')}
              className={`py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                studioMobilePane === 'preview'
                  ? 'haseb-btn-primary text-white'
                  : 'bg-slate-100 text-slate-700'
              }`}
            >
              المعاينة الحية للفاتورة
            </button>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-start">
            {/* Controls Column */}
            <div
              className={`xl:col-span-6 space-y-4 ${
                studioMobilePane === 'preview' ? 'hidden xl:block' : 'block'
              }`}
            >
              {/* Mode Switch + Quick Style Presets + Reset */}
              <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">
                      استوديو تصميم وتخصيص الفواتير الحية
                    </h3>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      تحكم كامل في الألوان، الهوامش، الشعار، العلامة المائية، والأعمدة لجميع القوالب
                    </p>
                  </div>

                  <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                    <button
                      type="button"
                      data-testid="studio-mode-thermal-btn"
                      onClick={() => setPreviewMode('thermal')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                        previewMode === 'thermal'
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : 'text-slate-600 dark:text-slate-300 hover:bg-white'
                      }`}
                    >
                      حراري (7)
                    </button>
                    <button
                      type="button"
                      data-testid="studio-mode-a4-btn"
                      onClick={() => setPreviewMode('a4')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                        previewMode === 'a4'
                          ? 'haseb-btn-primary text-white shadow-xs'
                          : 'text-slate-600 dark:text-slate-300 hover:bg-white'
                      }`}
                    >
                      رسمي A4 (8)
                    </button>
                  </div>
                </div>

                {/* Quick Style Presets + Reset Button */}
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-[11px] font-bold text-slate-500">ثيمات جاهزة:</span>
                    {[
                      { label: 'أزرق ملكي', p: '#1e3a8a', s: '#2563eb' },
                      { label: 'أخضر مصرفي', p: '#065f46', s: '#10b981' },
                      { label: 'كحلي كلاسيك', p: '#0f172a', s: '#334155' },
                      { label: 'عنابي دافئ', p: '#7c2d12', s: '#d97706' },
                    ].map((preset) => (
                      <button
                        key={preset.label}
                        type="button"
                        onClick={() =>
                          updateInvoiceTemplateSettings({
                            primaryColorHex: preset.p,
                            secondaryColorHex: preset.s,
                          })
                        }
                        className="px-2.5 py-1 rounded-full border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-white text-[10px] font-bold flex items-center gap-1.5 cursor-pointer"
                      >
                        <span
                          className="w-2.5 h-2.5 rounded-full"
                          style={{ backgroundColor: preset.p }}
                        />
                        <span>{preset.label}</span>
                      </button>
                    ))}
                  </div>

                  <button
                    type="button"
                    data-testid="studio-reset-defaults-btn"
                    onClick={() => {
                      resetInvoiceTemplateSettings();
                      setCustomHeader('فاتورة ضريبية ومستند ضمان رسمي');
                      setCustomFooter('شكراً لتعاملكم معنا • يرجى الاحتفاظ بالفاتورة لخدمات الضمان.');
                      showBanner('تمت استعادة الإعدادات الافتراضية لقوالب الفواتير بنجاح.');
                    }}
                    className="px-2.5 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-[10px] font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>إعادة الافتراضي</span>
                  </button>
                </div>
              </div>

              {/* Thermal Templates (7 Templates) */}
              <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    <Receipt className="w-4 h-4 text-emerald-600" />
                    قوالب الفواتير الحرارية (7 قوالب احترافية)
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
                        data-testid={`studio-tpl-${tpl.id}`}
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

                        <div className="mt-2 pt-1.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[10px]">
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

              {/* Standard A4 Templates (8 Templates) */}
              <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    <FileText className="w-4 h-4 text-blue-600" />
                    قوالب الفواتير العادية A4 (8 قوالب معتمدة)
                  </h3>
                  <span className="text-[11px] font-mono text-blue-600 font-bold">
                    {invoiceTemplateSettings.standardTemplate}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {standardTemplatesList.map((tpl) => {
                    const isSelected = invoiceTemplateSettings.standardTemplate === tpl.id;
                    return (
                      <div
                        key={tpl.id}
                        data-testid={`studio-tpl-${tpl.id}`}
                        onClick={() => {
                          updateInvoiceTemplateSettings({ standardTemplate: tpl.id });
                          setPreviewMode('a4');
                        }}
                        className={`p-3 rounded-xl border transition cursor-pointer flex flex-col justify-between ${
                          isSelected
                            ? 'border-blue-600 bg-blue-50/50 dark:bg-blue-950/30 ring-1 ring-blue-500/30'
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

                        <div className="mt-2 pt-1.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[10px]">
                          <span className="px-1.5 py-0.2 rounded bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-bold">
                            {tpl.badgeAr}
                          </span>
                          {isSelected && (
                            <span className="text-blue-600 font-bold flex items-center gap-0.5">
                              <Check className="w-3 h-3" /> مفعّل
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* 21 Live Customization Sections (Accordion Panels) */}
              <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    <Sliders className="w-4 h-4 text-emerald-600" />
                    تخصيص المكونات والألوان والبيانات (تعديل حي فوري)
                  </h3>
                  <div className="flex items-center gap-1">
                    {(
                      [
                        { id: 'colors', label: 'الألوان والخطوط' },
                        { id: 'header', label: 'الشعار والعلامة' },
                        { id: 'columns', label: 'الأعمدة والعميل' },
                        { id: 'footer', label: 'QR والبنوك والتذييل' },
                      ] as const
                    ).map((sec) => (
                      <button
                        key={sec.id}
                        type="button"
                        data-testid={`studio-sec-${sec.id}`}
                        onClick={() => setStudioSectionOpen(sec.id)}
                        className={`px-2 py-1 rounded-lg text-[10px] font-bold cursor-pointer transition ${
                          studioSectionOpen === sec.id
                            ? 'haseb-btn-primary text-white'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        {sec.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Section 1: Colors, Font Scale & Paper Margins */}
                {studioSectionOpen === 'colors' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs pt-2">
                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                      <label className="font-bold text-slate-700 block">اللون الأساسي للفاتورة:</label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          data-testid="studio-primary-color-input"
                          value={invoiceTemplateSettings.primaryColorHex || '#0f172a'}
                          onChange={(e) =>
                            updateInvoiceTemplateSettings({ primaryColorHex: e.target.value })
                          }
                          className="w-10 h-8 rounded cursor-pointer border border-slate-300"
                        />
                        <span className="font-mono text-xs text-slate-600" dir="ltr">
                          {invoiceTemplateSettings.primaryColorHex || '#0f172a'}
                        </span>
                      </div>
                    </div>

                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                      <label className="font-bold text-slate-700 block">اللون الثانوي والتدرج:</label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          data-testid="studio-secondary-color-input"
                          value={invoiceTemplateSettings.secondaryColorHex || '#2563eb'}
                          onChange={(e) =>
                            updateInvoiceTemplateSettings({ secondaryColorHex: e.target.value })
                          }
                          className="w-10 h-8 rounded cursor-pointer border border-slate-300"
                        />
                        <span className="font-mono text-xs text-slate-600" dir="ltr">
                          {invoiceTemplateSettings.secondaryColorHex || '#2563eb'}
                        </span>
                      </div>
                    </div>

                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
                      <label className="font-bold text-slate-700 block">مقياس خط الفاتورة:</label>
                      <select
                        data-testid="studio-font-scale-select"
                        value={invoiceTemplateSettings.fontScale || 'normal'}
                        onChange={(e) =>
                          updateInvoiceTemplateSettings({ fontScale: e.target.value as any })
                        }
                        className="w-full px-2.5 py-2 rounded-lg border border-slate-300 bg-white font-bold text-xs"
                      >
                        <option value="compact">مضغوط (Compact)</option>
                        <option value="normal">قياسي متوازن (Normal)</option>
                        <option value="large">كبير وواضح (Large)</option>
                      </select>
                    </div>

                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
                      <label className="font-bold text-slate-700 block">هوامش الورقة (Margin):</label>
                      <select
                        data-testid="studio-paper-margin-select"
                        value={invoiceTemplateSettings.paperMargin || 'normal'}
                        onChange={(e) =>
                          updateInvoiceTemplateSettings({ paperMargin: e.target.value as any })
                        }
                        className="w-full px-2.5 py-2 rounded-lg border border-slate-300 bg-white font-bold text-xs"
                      >
                        <option value="narrow">ضيق لتوفير الورق</option>
                        <option value="normal">متوازن قياسي</option>
                        <option value="wide">واسع فاخر</option>
                      </select>
                    </div>
                  </div>
                )}

                {/* Section 2: Logo, Header Title & Watermark */}
                {studioSectionOpen === 'header' && (
                  <div className="space-y-3 text-xs pt-2">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <label className="flex items-center gap-2 p-2.5 rounded-lg bg-slate-50 border border-slate-200 cursor-pointer font-bold">
                        <input
                          type="checkbox"
                          checked={invoiceTemplateSettings.showCompanyLogo !== false}
                          onChange={(e) =>
                            updateInvoiceTemplateSettings({ showCompanyLogo: e.target.checked })
                          }
                        />
                        <span>إظهار شعار المنشأة</span>
                      </label>
                      <label className="flex items-center gap-2 p-2.5 rounded-lg bg-slate-50 border border-slate-200 cursor-pointer font-bold">
                        <input
                          type="checkbox"
                          checked={invoiceTemplateSettings.showCompanyNameEn !== false}
                          onChange={(e) =>
                            updateInvoiceTemplateSettings({ showCompanyNameEn: e.target.checked })
                          }
                        />
                        <span>إظهار الاسم الإنجليزي</span>
                      </label>
                    </div>

                    <div className="grid grid-cols-2 gap-2.5">
                      <div>
                        <label className="font-bold text-slate-700 block mb-1">حجم الشعار:</label>
                        <select
                          value={invoiceTemplateSettings.logoSize || 'md'}
                          onChange={(e) =>
                            updateInvoiceTemplateSettings({ logoSize: e.target.value as any })
                          }
                          className="w-full px-2.5 py-2 rounded-lg border border-slate-300 bg-white font-bold"
                        >
                          <option value="sm">صغير</option>
                          <option value="md">متوسط</option>
                          <option value="lg">كبير</option>
                        </select>
                      </div>
                      <div>
                        <label className="font-bold text-slate-700 block mb-1">موضع الشعار:</label>
                        <select
                          value={invoiceTemplateSettings.logoPosition || 'center'}
                          onChange={(e) =>
                            updateInvoiceTemplateSettings({ logoPosition: e.target.value as any })
                          }
                          className="w-full px-2.5 py-2 rounded-lg border border-slate-300 bg-white font-bold"
                        >
                          <option value="right">يمين الترويسة</option>
                          <option value="center">منتصف الترويسة</option>
                          <option value="left">يسار الترويسة</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="font-bold text-slate-700 block mb-1">عنوان الترويسة الإضافي:</label>
                      <input
                        type="text"
                        value={customHeader}
                        onChange={(e) => {
                          setCustomHeader(e.target.value);
                          updateInvoiceTemplateSettings({ headerTitleAr: e.target.value });
                        }}
                        className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs outline-hidden focus:border-blue-600"
                      />
                    </div>

                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                      <label className="flex items-center gap-2 font-bold cursor-pointer">
                        <input
                          type="checkbox"
                          data-testid="studio-watermark-checkbox"
                          checked={Boolean(invoiceTemplateSettings.showWatermark)}
                          onChange={(e) =>
                            updateInvoiceTemplateSettings({ showWatermark: e.target.checked })
                          }
                        />
                        <span>إظهار علامة مائية قطرية (Watermark) على الفاتورة</span>
                      </label>
                      {invoiceTemplateSettings.showWatermark && (
                        <input
                          type="text"
                          data-testid="studio-watermark-text-input"
                          value={invoiceTemplateSettings.watermarkText || ''}
                          onChange={(e) =>
                            updateInvoiceTemplateSettings({ watermarkText: e.target.value })
                          }
                          placeholder={company.nameAr || 'اكتب نص العلامة المائية...'}
                          className="w-full px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-xs"
                        />
                      )}
                    </div>
                  </div>
                )}

                {/* Section 3: Table Columns & Customer Visibility */}
                {studioSectionOpen === 'columns' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs pt-2">
                    {[
                      { key: 'showCustomerPhone', label: 'إظهار رقم هاتف العميل' },
                      { key: 'showCustomerId', label: 'إظهار رقم ملف العميل ID' },
                      { key: 'showItemSku', label: 'إظهار عمود كود الصنف SKU' },
                      { key: 'showItemDiscount', label: 'إظهار عمود الخصم بالجدول' },
                      { key: 'showItemTax', label: 'إظهار عمود الضريبة بالجدول' },
                      { key: 'showSerialAndWarranty', label: 'إظهار الرقم التسلسلي والضمان S/N' },
                    ].map((opt) => (
                      <label
                        key={opt.key}
                        className="flex items-center gap-2 p-2.5 rounded-lg bg-slate-50 border border-slate-200 cursor-pointer font-bold text-slate-700"
                      >
                        <input
                          type="checkbox"
                          data-testid={`studio-toggle-${opt.key}`}
                          checked={(invoiceTemplateSettings as any)[opt.key] !== false}
                          onChange={(e) =>
                            updateInvoiceTemplateSettings({ [opt.key]: e.target.checked })
                          }
                        />
                        <span>{opt.label}</span>
                      </label>
                    ))}
                  </div>
                )}

                {/* Section 4: Tafqeet, Bank Accounts, QR/Barcode Size & Footer */}
                {studioSectionOpen === 'footer' && (
                  <div className="space-y-3 text-xs pt-2">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {[
                        { key: 'showTafqeet', label: 'إظهار التفقيط (المبلغ كتابةً)' },
                        { key: 'showBankAccounts', label: 'إظهار الحسابات المصرفية' },
                        { key: 'showQR', label: 'رمز التحقق QR Code' },
                        { key: 'showBarcode', label: 'الباركود الخطي Code-128' },
                        { key: 'showStampAndSignature', label: 'أختام الاعتماد والتوقيع' },
                        { key: 'showWarrantyTerms', label: 'شروط الضمان المعتمد' },
                      ].map((opt) => (
                        <label
                          key={opt.key}
                          className="flex items-center gap-2 p-2.5 rounded-lg bg-slate-50 border border-slate-200 cursor-pointer font-bold text-slate-700"
                        >
                          <input
                            type="checkbox"
                            data-testid={`studio-toggle-${opt.key}`}
                            checked={(invoiceTemplateSettings as any)[opt.key] !== false}
                            onChange={(e) =>
                              updateInvoiceTemplateSettings({ [opt.key]: e.target.checked })
                            }
                          />
                          <span>{opt.label}</span>
                        </label>
                      ))}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200">
                      <div>
                        <div className="flex justify-between font-bold mb-1">
                          <span>حجم رمز QR:</span>
                          <span className="font-mono">{invoiceTemplateSettings.qrSizePx || 82}px</span>
                        </div>
                        <input
                          type="range"
                          min={56}
                          max={120}
                          value={invoiceTemplateSettings.qrSizePx || 82}
                          onChange={(e) =>
                            updateInvoiceTemplateSettings({ qrSizePx: Number(e.target.value) })
                          }
                          className="w-full accent-blue-600 cursor-pointer"
                        />
                      </div>
                      <div>
                        <div className="flex justify-between font-bold mb-1">
                          <span>عرض الباركود الخطي:</span>
                          <span className="font-mono">{invoiceTemplateSettings.barcodeWidthPx || 165}px</span>
                        </div>
                        <input
                          type="range"
                          min={120}
                          max={240}
                          value={invoiceTemplateSettings.barcodeWidthPx || 165}
                          onChange={(e) =>
                            updateInvoiceTemplateSettings({ barcodeWidthPx: Number(e.target.value) })
                          }
                          className="w-full accent-blue-600 cursor-pointer"
                        />
                      </div>
                    </div>

                    {invoiceTemplateSettings.showBankAccounts !== false && (
                      <div>
                        <label className="block font-bold text-slate-700 mb-1">
                          تفاصيل الحسابات المصرفية الخاصة بك (كل حساب في سطر):
                        </label>
                        <textarea
                          rows={2}
                          data-testid="studio-bank-details-textarea"
                          value={invoiceTemplateSettings.customBankDetailsAr || ''}
                          onChange={(e) =>
                            updateInvoiceTemplateSettings({ customBankDetailsAr: e.target.value })
                          }
                          placeholder="مثال: اسم البنك - رقم الحساب (اكتب حساباتك المصرفية هنا لتظهر في الفواتير)"
                          className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs outline-hidden focus:border-blue-600"
                        />
                      </div>
                    )}

                    <div>
                      <label className="block font-bold text-slate-700 mb-1">
                        ملاحظة وسياسة الاستبدال أسفل الفاتورة:
                      </label>
                      <input
                        type="text"
                        value={customFooter}
                        onChange={(e) => {
                          setCustomFooter(e.target.value);
                          updateInvoiceTemplateSettings({ footerNoteAr: e.target.value });
                        }}
                        className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs outline-hidden focus:border-blue-600"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Live Preview Column */}
            <div
              className={`xl:col-span-6 bg-slate-100 dark:bg-slate-950 p-3.5 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3 xl:sticky xl:top-16 ${
                studioMobilePane === 'editor' ? 'hidden xl:block' : 'block'
              }`}
            >
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
                  className="px-3 py-1.5 rounded-lg haseb-btn-primary text-white text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>طباعة تجريبية</span>
                </button>
              </div>

              <div className="p-2 sm:p-4 bg-slate-200/60 dark:bg-slate-900/80 rounded-xl overflow-x-auto max-h-[760px] overflow-y-auto">
                <InvoiceRenderer
                  invoice={sampleInvoice}
                  mode={previewMode}
                  thermalTemplate={invoiceTemplateSettings.thermalTemplate}
                  standardTemplate={invoiceTemplateSettings.standardTemplate}
                  settings={invoiceTemplateSettings}
                  companyName={company.nameAr || currentTenant.legalName}
                  companyNameEn={company.name}
                  companyLogo={companyLogo || company.logo}
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
      )}

      {/* ====================================================================
          TAB 3: COMPANY PROFILE, CUSTOM LOGO & SECTOR PRESET
      ==================================================================== */}
      {activeSettingsTab === 'company' && (
        <div className="max-w-4xl space-y-4">
          <form
            onSubmit={handleSaveCompany}
            className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-4"
          >
            <div className="border-b border-slate-100 dark:border-slate-800 pb-3 flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-emerald-600" />
                  بيانات الهوية الرسمية وشعار المنشأة في الفواتير
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  يظهر شعارك واسم منشأتك الخاص في ترويسة كافة فواتير العملاء وشهادات الضمان والختم الرسمي
                </p>
              </div>
              <button
                type="button"
                data-testid="settings-open-welcome-wizard-btn"
                onClick={openOnboarding}
                className="px-3.5 py-2 rounded-xl haseb-btn-primary text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer transition"
              >
                <span>فتح معالج الترحيب والتهيئة الأولية</span>
              </button>
            </div>

            {/* Company Logo Upload Box */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div className="w-16 h-16 rounded-2xl bg-white border-2 border-dashed border-slate-300 flex items-center justify-center overflow-hidden shrink-0 shadow-2xs">
                  {companyLogo ? (
                    <img
                      src={companyLogo}
                      alt="شعار المنشأة"
                      className="w-full h-full object-contain p-1"
                    />
                  ) : (
                    <Building2 className="w-6 h-6 text-slate-400" />
                  )}
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-900 dark:text-white">
                    شعار المؤسسة الرسمي (يظهر في ترويسة جميع قوالب الفواتير A4 والحراري)
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    ارفع صورة شعار شركتك أو معرضك ليظهر في الفواتير بدلاً من أي رمز افتراضي
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <label
                  data-testid="settings-upload-company-logo"
                  className="px-4 py-2 rounded-xl haseb-btn-primary text-white text-xs font-bold cursor-pointer transition"
                >
                  <span>رفع شعار المنشأة</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="sr-only"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      const reader = new FileReader();
                      reader.onload = () => {
                        if (typeof reader.result === 'string') {
                          setCompanyLogo(reader.result);
                        }
                      };
                      reader.readAsDataURL(file);
                    }}
                  />
                </label>
                {companyLogo && (
                  <button
                    type="button"
                    onClick={() => setCompanyLogo('')}
                    className="px-3 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 text-xs font-bold cursor-pointer"
                  >
                    إزالة الشعار
                  </button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
                  الاسم الإنجليزي في الفاتورة (English Name):
                </label>
                <input
                  type="text"
                  value={companyNameEn}
                  onChange={(e) => setCompanyNameEn(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100 outline-hidden focus:border-emerald-600"
                  dir="ltr"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  الرقم الضريبي الموحد VAT:
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

            <div className="p-4 rounded-xl haseb-card-gradient text-white space-y-2">
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
                  <CheckCircle2 className="w-4 h-4" /> تم حفظ التعديلات وتحديث شعار وهوية الفواتير بنجاح!
                </span>
              ) : (
                <span className="text-[11px] text-slate-400">
                  التغييرات تسري فوراً في كامل النظام وجميع قوالب الفواتير.
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
          TAB 3.5: THEME-APPROPRIATE POS & NOTIFICATION SOUND ALERTS
      ==================================================================== */}
      {activeSettingsTab === 'sound_alerts' && (
        <div
          data-testid="settings-sound-alerts-panel"
          className="w-full bg-white dark:bg-slate-900 p-4 sm:p-6 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-5"
        >
          <div className="border-b border-slate-100 dark:border-slate-800 pb-3.5 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-300 border border-blue-200/70 dark:border-blue-800/60 flex items-center justify-center shrink-0">
                {soundAlertPrefs.enabled ? (
                  <Volume2 className="w-5 h-5" />
                ) : (
                  <VolumeX className="w-5 h-5 text-slate-400" />
                )}
              </div>
              <div className="min-w-0">
                <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">
                  {language === 'ar'
                    ? 'تنبيهات الصوت لنقطة البيع والإشعارات'
                    : 'POS & System Sound Alerts'}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {language === 'ar'
                    ? 'نغمات هادئة متناغمة تلقائياً مع ثيم الواجهة النشط لتنبيه الكاشير عند الإشعارات أو تحذيرات الأمان.'
                    : 'Subtle, theme-matched chimes that alert POS operators when a toast notification or security alert appears.'}
                </p>
              </div>
            </div>

            <button
              type="button"
              role="switch"
              aria-checked={soundAlertPrefs.enabled}
              data-testid="settings-sound-alerts-toggle"
              onClick={() =>
                updateSoundAlertPrefs({ enabled: !soundAlertPrefs.enabled })
              }
              className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition cursor-pointer shrink-0 ${
                soundAlertPrefs.enabled
                  ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-xs'
                  : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300'
              }`}
            >
              {soundAlertPrefs.enabled ? (
                <Volume2 className="w-4 h-4" />
              ) : (
                <VolumeX className="w-4 h-4" />
              )}
              <span>
                {soundAlertPrefs.enabled
                  ? language === 'ar'
                    ? 'مفعّل'
                    : 'Enabled'
                  : language === 'ar'
                  ? 'مكتوم / معطّل'
                  : 'Muted / Disabled'}
              </span>
            </button>
          </div>

          {/* Individual Event Sound Channels */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 flex items-center justify-between gap-3">
              <div className="flex items-start gap-2.5 min-w-0">
                <BellRing className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <div className="text-xs font-bold text-slate-900 dark:text-slate-100">
                    {language === 'ar'
                      ? 'إشعارات المزامنة والتنبيهات المنبثقة'
                      : 'Toast & Live Sync Notifications'}
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    {language === 'ar'
                      ? 'نغمة خفيفة عند وصول فاتورة، تحديث مخزون، أو إشعار شبكي.'
                      : 'Soft chime on incoming invoice, inventory, or sync toast alerts.'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={soundAlertPrefs.toastEnabled}
                data-testid="settings-sound-toast-toggle"
                disabled={!soundAlertPrefs.enabled}
                onClick={() =>
                  updateSoundAlertPrefs({
                    toastEnabled: !soundAlertPrefs.toastEnabled,
                  })
                }
                className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition cursor-pointer shrink-0 disabled:opacity-50 ${
                  soundAlertPrefs.toastEnabled && soundAlertPrefs.enabled
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                }`}
              >
                {soundAlertPrefs.toastEnabled
                  ? language === 'ar'
                    ? 'تشغيل'
                    : 'On'
                  : language === 'ar'
                  ? 'إيقاف'
                  : 'Off'}
              </button>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 flex items-center justify-between gap-3">
              <div className="flex items-start gap-2.5 min-w-0">
                <ShieldAlert className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <div className="text-xs font-bold text-slate-900 dark:text-slate-100">
                    {language === 'ar'
                      ? 'تنبيهات الأمان والحماية (Security Alerts)'
                      : 'Security & Shield Alerts'}
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    {language === 'ar'
                      ? 'إشارة تنبيه مميزة وغير مزعجة عند ظهور تحذير أمني أو حظر وصول.'
                      : 'Distinct operator warning tone when a security shield alert triggers.'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={soundAlertPrefs.securityEnabled}
                data-testid="settings-sound-security-toggle"
                disabled={!soundAlertPrefs.enabled}
                onClick={() =>
                  updateSoundAlertPrefs({
                    securityEnabled: !soundAlertPrefs.securityEnabled,
                  })
                }
                className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition cursor-pointer shrink-0 disabled:opacity-50 ${
                  soundAlertPrefs.securityEnabled && soundAlertPrefs.enabled
                    ? 'bg-rose-600 text-white'
                    : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                }`}
              >
                {soundAlertPrefs.securityEnabled
                  ? language === 'ar'
                    ? 'تشغيل'
                    : 'On'
                  : language === 'ar'
                  ? 'إيقاف'
                  : 'Off'}
              </button>
            </div>
          </div>

          {/* Volume Level Slider & Subtle Presets */}
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <label
                htmlFor="settings-sound-alerts-volume-slider"
                className="text-xs font-bold text-slate-800 dark:text-slate-200"
              >
                {language === 'ar'
                  ? 'مستوى حدة الصوت لنقطة البيع (Volume)'
                  : 'POS Alert Sound Volume'}
              </label>
              <span
                data-testid="settings-sound-volume-value"
                className="font-mono text-xs font-black px-2.5 py-0.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200"
              >
                {soundAlertPrefs.volumePercent}%
              </span>
            </div>

            <input
              id="settings-sound-alerts-volume-slider"
              data-testid="settings-sound-alerts-volume"
              type="range"
              min={0}
              max={100}
              step={5}
              disabled={!soundAlertPrefs.enabled}
              value={soundAlertPrefs.volumePercent}
              onChange={(e) =>
                updateSoundAlertPrefs({ volumePercent: Number(e.target.value) })
              }
              className="w-full accent-blue-600 cursor-pointer disabled:opacity-50"
            />

            <div className="flex flex-wrap items-center gap-2">
              {[
                { val: 20, labelAr: 'خافت (20%)', labelEn: 'Subtle (20%)' },
                { val: 35, labelAr: 'متوازن (35% - موصى به)', labelEn: 'Balanced (35%)' },
                { val: 70, labelAr: 'واضح (70%)', labelEn: 'Clear (70%)' },
              ].map((preset) => (
                <button
                  key={preset.val}
                  type="button"
                  disabled={!soundAlertPrefs.enabled}
                  onClick={() => updateSoundAlertPrefs({ volumePercent: preset.val })}
                  className={`px-3 py-1 rounded-lg text-[11px] font-bold border transition cursor-pointer disabled:opacity-50 ${
                    soundAlertPrefs.volumePercent === preset.val
                      ? 'haseb-nav-active text-white'
                      : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-slate-300'
                  }`}
                >
                  {language === 'ar' ? preset.labelAr : preset.labelEn}
                </button>
              ))}
            </div>
          </div>

          {/* Theme Acoustic Signature & Interactive Sound Preview */}
          <div className="p-4 rounded-xl haseb-card-gradient text-white border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1 min-w-0">
              <div className="text-[11px] font-bold text-emerald-400">
                {language === 'ar'
                  ? 'البصمة الصوتية المتناغمة مع الثيم النشط'
                  : 'Active Theme Acoustic Signature'}
              </div>
              <div
                data-testid="settings-active-sound-signature"
                className="text-xs font-bold text-white"
              >
                {language === 'ar'
                  ? activeSoundProfile.signatureNameAr
                  : activeSoundProfile.signatureNameEn}
              </div>
              <p className="text-[11px] text-slate-300">
                {language === 'ar'
                  ? 'تتكيف الترددات ونوع الموجة تلقائياً عند تبديل المظهر (الداكن، الكهرماني الدافئ، السماوي، النيلي، أو المؤسسي).'
                  : 'Frequencies and waveform automatically adapt whenever you switch themes.'}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <button
                type="button"
                data-testid="settings-test-toast-sound-btn"
                onClick={() => {
                  dispatchToastAndPushNotification({
                    category: 'LIVE_EVENTS',
                    severity: 'info',
                    titleAr: 'تجربة تنبيه الإشعارات الصوتية',
                    titleEn: 'Sound Alert Notification Test',
                    messageAr:
                      soundAlertPrefs.enabled && soundAlertPrefs.toastEnabled
                        ? `تم تشغيل نغمة الإشعار المتناغمة مع الثيم (${activeSoundProfile.signatureNameAr}).`
                        : 'تم عرض الإشعار (التنبيهات الصوتية مكتومة حالياً من الإعدادات).',
                    messageEn:
                      soundAlertPrefs.enabled && soundAlertPrefs.toastEnabled
                        ? `Played theme-matched chime (${activeSoundProfile.signatureNameEn}).`
                        : 'Toast displayed (sound alerts are currently muted).',
                  });
                }}
                className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
              >
                <BellRing className="w-3.5 h-3.5" />
                <span>
                  {language === 'ar' ? 'تجربة صوت الإشعار' : 'Test Toast Sound'}
                </span>
              </button>

              <button
                type="button"
                data-testid="settings-test-security-sound-btn"
                onClick={() => {
                  playAlertSound('security_alert');
                }}
                className="px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
              >
                <ShieldAlert className="w-3.5 h-3.5" />
                <span>
                  {language === 'ar' ? 'تجربة تنبيه الأمان' : 'Test Security Alert'}
                </span>
              </button>
            </div>
          </div>
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

          {/* Automated Daily System Backup & Direct Download Backup Option */}
          <div
            data-testid="settings-daily-backup-card"
            className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 space-y-3"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  <h4 className="text-xs font-extrabold text-slate-900 dark:text-slate-100">
                    {language === 'ar'
                      ? 'النسخ الاحتياطي اليومي التلقائي وتنزيل النسخة (Automated Daily Backup)'
                      : 'Automated Daily System Backup & Download'}
                  </h4>
                  <span
                    data-testid="settings-daily-backup-status"
                    className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      autoDailyBackupEnabled
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300'
                        : 'bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300'
                    }`}
                  >
                    {autoDailyBackupEnabled
                      ? language === 'ar'
                        ? 'مفعّل يومياً'
                        : 'Daily Active'
                      : language === 'ar'
                      ? 'متوقف'
                      : 'Paused'}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  {language === 'ar'
                    ? 'يقوم النظام بأخذ نسخة احتياطية كاملة يومياً بشكل تلقائي وإشعار المدير عبر رسالة منبثقة فور الاكتمال.'
                    : 'Automatically creates a full system backup every 24 hours and notifies the administrator via toast upon completion.'}
                </p>
              </div>

              <button
                type="button"
                data-testid="settings-daily-backup-toggle"
                onClick={() => setAutoDailyBackupEnabled(!autoDailyBackupEnabled)}
                className={`px-3 py-1.5 rounded-lg text-[11px] font-bold border transition cursor-pointer ${
                  autoDailyBackupEnabled
                    ? 'bg-emerald-600 border-emerald-600 text-white hover:bg-emerald-700'
                    : 'bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-100'
                }`}
              >
                {autoDailyBackupEnabled
                  ? language === 'ar'
                    ? 'الجدول اليومي: مفعّل ✓'
                    : 'Auto Daily: ON'
                  : language === 'ar'
                  ? 'الجدول اليومي: متوقف'
                  : 'Auto Daily: OFF'}
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] bg-white dark:bg-slate-900 p-2.5 rounded-lg border border-slate-200/80 dark:border-slate-700">
              <div>
                <span className="text-slate-400">
                  {language === 'ar' ? 'آخر نسخة يومية:' : 'Last Daily Backup:'}
                </span>{' '}
                <span className="font-mono font-bold text-slate-800 dark:text-slate-200" dir="ltr">
                  {lastAutoDailyBackupAt
                    ? new Date(lastAutoDailyBackupAt).toLocaleString('en-GB')
                    : language === 'ar'
                    ? 'قيد الانتظار'
                    : 'Pending'}
                </span>
              </div>
              <div>
                <span className="text-slate-400">
                  {language === 'ar' ? 'النسخة المجدولة القادمة:' : 'Next Scheduled Backup:'}
                </span>{' '}
                <span className="font-mono font-bold text-slate-800 dark:text-slate-200" dir="ltr">
                  {autoDailyBackupEnabled
                    ? new Date(computeNextDailyBackupIso(lastAutoDailyBackupAt)).toLocaleString('en-GB')
                    : '—'}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <button
                type="button"
                data-testid="settings-download-backup-btn"
                aria-label="Download Backup"
                onClick={() => {
                  const res = downloadLatestDailyBackup();
                  if (res.success) {
                    setRestoreFeedback(
                      language === 'ar'
                        ? `✓ تم تنزيل النسخة الاحتياطية (${res.filename}) بنجاح (${(res.sizeBytes / 1024).toFixed(1)} KB).`
                        : `✓ Downloaded backup (${res.filename}) successfully (${(res.sizeBytes / 1024).toFixed(1)} KB).`
                    );
                  }
                }}
                className="w-full py-2.5 px-4 haseb-btn-primary text-white rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition cursor-pointer shadow-xs"
              >
                <Download className="w-4 h-4 shrink-0" />
                <span>
                  {language === 'ar' ? 'تنزيل النسخة الاحتياطية (Download Backup)' : 'Download Backup'}
                </span>
              </button>

              <button
                type="button"
                data-testid="settings-run-daily-backup-btn"
                disabled={isRunningDailyBackup}
                onClick={async () => {
                  const created = await runDailyBackupNow('MANUAL');
                  await loadServerBackupsStatus();
                  if (created) {
                    setRestoreFeedback(
                      language === 'ar'
                        ? `✓ اكتمل النسخ الاحتياطي (${created.filename}) وتم إرسال إشعار للمدير.`
                        : `✓ Backup completed (${created.filename}) and administrator notified.`
                    );
                  }
                }}
                className="w-full py-2.5 px-4 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-100 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${isRunningDailyBackup ? 'animate-spin' : ''}`} />
                <span>
                  {language === 'ar'
                    ? 'تشغيل النسخ اليومي الآن وإشعار المدير'
                    : 'Run Daily Backup Now'}
                </span>
              </button>
            </div>

            {latestDailyBackupInfo && (
              <div className="text-[10.5px] font-mono text-slate-500 dark:text-slate-400 flex flex-wrap items-center justify-between gap-2 pt-1">
                <span dir="ltr">{latestDailyBackupInfo.filename}</span>
                <span>
                  {latestDailyBackupInfo.productsCount} صنف • {latestDailyBackupInfo.invoicesCount} فاتورة • {latestDailyBackupInfo.customersCount} عميل
                </span>
              </div>
            )}
          </div>

          <div className="p-4 rounded-xl haseb-card-gradient text-white border border-slate-700/40 space-y-3 shadow-xs">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Lock className="w-4 h-4 text-emerald-300" />
                <span className="text-xs font-bold">
                  تصدير لقطة قاعدة البيانات المشفرة (Export Encrypted Snapshot)
                </span>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-200 border border-emerald-400/30">
                AES-256-GCM + SCRYPT + SHA-256
              </span>
            </div>

            <div className="space-y-1.5">
              <label className="block text-[11px] text-slate-200 font-semibold flex items-center gap-1.5">
                <KeyRound className="w-3.5 h-3.5 text-amber-300" />
                <span>مفتاح التشفير وفك التشفير الخاص بالمنشأة (AES-256-GCM Passphrase):</span>
              </label>
              <input
                type="text"
                data-testid="encrypted-backup-passphrase-input"
                value={snapshotPassphrase}
                onChange={(e) => setSnapshotPassphrase(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-slate-950/60 border border-slate-600/60 text-xs font-mono text-emerald-200 outline-hidden"
                dir="ltr"
              />
            </div>

            <button
              type="button"
              data-testid="btn-export-encrypted-backup"
              onClick={handleExportEncryptedSnapshot}
              className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition cursor-pointer shadow-xs"
            >
              <Lock className="w-4 h-4" />
              <span>تنزيل نسخة احتياطية مشفرة بمعيار AES-256-GCM (.json)</span>
            </button>
          </div>

          <div className="space-y-3 pt-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={handleExportJSON}
                className="w-full py-2.5 px-4 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition cursor-pointer"
              >
                <Download className="w-4 h-4 text-slate-600 dark:text-slate-300" />
                تصدير نسخة احتياطية JSON
              </button>

              <a
                href="/api/v1/local-db/postgres-schema.sql"
                download="Haseb_PostgreSQL18_Schema.sql"
                data-testid="settings-download-postgres-btn"
                className="w-full py-2.5 px-4 haseb-btn-primary text-white rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition cursor-pointer shadow-xs"
              >
                <Database className="w-4 h-4 text-emerald-300 shrink-0" />
                <span>تصدير هيكلة وبيانات PostgreSQL 18 (.sql)</span>
              </a>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2">
              <div className="text-xs font-bold text-slate-800 dark:text-slate-200">
                استيراد واستعادة لقطة مشفرة (AES-256-GCM) أو نسخة احتياطية (مع أخذ نسخة أمان تلقائية قبل الاستعادة)
              </div>
              <input
                type="file"
                accept=".json,application/json"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  const reader = new FileReader();
                  reader.onload = async () => {
                    const text = String(reader.result || '');
                    try {
                      const parsed = JSON.parse(text);
                      if (
                        parsed?.backupFormat === 'HASEB-ENCRYPTED-BACKUP-V2' ||
                        parsed?.backupFormat === 'HASEB-SERVER-BACKUP-V1'
                      ) {
                        const r = await fetch('/api/v1/backups/restore', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            payload: parsed,
                            passphrase: snapshotPassphrase,
                          }),
                        });
                        const j = await r.json();
                        if (j?.success) {
                          await reloadStateFromServer();
                          await loadServerBackupsStatus();
                        }
                        setRestoreFeedback(j?.messageAr || 'تمت الاستعادة بنجاح');
                        return;
                      }
                    } catch {}
                    const res = importBackupJSON(text, snapshotPassphrase);
                    setRestoreFeedback(res.messageAr);
                  };
                  reader.readAsText(file);
                }}
                className="w-full text-xs text-slate-600 dark:text-slate-300 file:me-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-indigo-600 file:text-white hover:file:bg-indigo-700 cursor-pointer"
              />
            </div>

            {/* Tamper-Evident SHA-256 Audit Chain Integrity Panel */}
            {auditChainStatus && (
              <div
                data-testid="audit-chain-verification-panel"
                className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-700 space-y-2"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                      سجل التدقيق المتسلسل غير القابل للتعديل (Tamper-Evident SHA-256 Audit Chain)
                    </span>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                      auditChainStatus.valid
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                        : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                    }`}
                  >
                    {auditChainStatus.valid
                      ? `CHAIN INTACT ✓ (${auditChainStatus.totalEntries} كتلة موقعة)`
                      : `TAMPER DETECTED AT #${auditChainStatus.brokenAtSequence}`}
                  </span>
                </div>
                {auditChainStatus.recentEntries.length > 0 && (
                  <div className="space-y-1 pt-1">
                    {auditChainStatus.recentEntries.slice(0, 3).map((entry) => (
                      <div
                        key={entry.seq}
                        className="flex items-center justify-between text-[10.5px] font-mono bg-white dark:bg-slate-800/80 px-2.5 py-1 rounded border border-slate-200/70 dark:border-slate-700/70"
                      >
                        <span className="font-bold text-slate-700 dark:text-slate-200">
                          #{entry.seq} [{entry.category}] {entry.action}
                        </span>
                        <span className="text-slate-400" dir="ltr">
                          SHA256: {entry.entryHash.slice(0, 14)}...
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Scheduled Server Auto-Backup & One-Click Restore */}
            <div
              data-testid="scheduled-auto-backup-panel"
              className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 space-y-3"
            >
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-2.5">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-emerald-600" />
                  <div>
                    <div className="text-xs font-bold text-slate-900 dark:text-slate-100">
                      النسخ الاحتياطي التلقائي المجدول والاستعادة بضغطة زر
                    </div>
                    <div className="text-[10.5px] text-slate-500">
                      يحفظ نسخاً محققة ببصمة SHA-256 على الخادم المحلي (.data/backups) مع استعادة فورية لجميع الأجهزة
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  data-testid="btn-run-backup-now"
                  disabled={isBackupBusy}
                  onClick={async () => {
                    setIsBackupBusy(true);
                    try {
                      const res = await fetch('/api/v1/backups/run-now', { method: 'POST' });
                      const json = await res.json();
                      if (json?.success) {
                        if (json.config) setServerBackupConfig(json.config);
                        if (Array.isArray(json.backups)) setServerBackupsList(json.backups);
                        setRestoreFeedback(
                          `✓ تم إنشاء نسخة احتياطية محققة على الخادم (${json.created?.filename}) بنجاح.`
                        );
                      }
                    } finally {
                      setIsBackupBusy(false);
                    }
                  }}
                  className="px-3 py-1.5 rounded-lg haseb-btn-primary text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <Database className="w-3.5 h-3.5" />
                  <span>نسخ احتياطي فوري</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs items-end">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    تكرار النسخ التلقائي
                  </label>
                  <select
                    data-testid="backup-schedule-select"
                    value={serverBackupConfig.schedule}
                    onChange={(e) =>
                      setServerBackupConfig((prev) => ({
                        ...prev,
                        schedule: e.target.value as AutoBackupSchedule,
                      }))
                    }
                    className="w-full p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-bold"
                  >
                    <option value="HOURLY">كل ساعة (Hourly)</option>
                    <option value="EVERY_6_HOURS">كل 6 ساعات (موصى به)</option>
                    <option value="DAILY">يومياً (Daily)</option>
                    <option value="OFF">إيقاف الجدولة التلقائية</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    الحد الأقصى للنسخ المحفوظة
                  </label>
                  <input
                    type="number"
                    min={3}
                    max={100}
                    value={serverBackupConfig.maxRetentionCount}
                    onChange={(e) =>
                      setServerBackupConfig((prev) => ({
                        ...prev,
                        maxRetentionCount: Number(e.target.value) || 15,
                      }))
                    }
                    className="w-full p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono font-bold"
                  />
                </div>
                <button
                  type="button"
                  data-testid="btn-save-backup-config"
                  disabled={isBackupBusy}
                  onClick={async () => {
                    setIsBackupBusy(true);
                    try {
                      const res = await fetch('/api/v1/backups/config', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(serverBackupConfig),
                      });
                      const json = await res.json();
                      if (json?.success) {
                        setServerBackupConfig(json.config);
                        setRestoreFeedback('✓ تم حفظ إعدادات الجدولة والاحتفاظ بالنسخ التلقائية.');
                      }
                    } finally {
                      setIsBackupBusy(false);
                    }
                  }}
                  className="py-2 px-3 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700 font-bold cursor-pointer"
                >
                  حفظ إعدادات الجدولة
                </button>
              </div>

              {serverBackupsList.length > 0 && (
                <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-lg">
                  <table className="w-full text-[11px] text-start">
                    <thead className="bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-b border-slate-200 dark:border-slate-700">
                      <tr>
                        <th className="py-2 px-2.5 text-start">الملف / التوقيت</th>
                        <th className="py-2 px-2.5 text-center">النوع</th>
                        <th className="py-2 px-2.5 text-center">الأصناف / الفواتير</th>
                        <th className="py-2 px-2.5 text-end">الحجم</th>
                        <th className="py-2 px-2.5 text-center">الاستعادة</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {serverBackupsList.slice(0, 8).map((bkp) => (
                        <tr key={bkp.filename}>
                          <td className="py-2 px-2.5">
                            <div className="font-mono font-bold text-slate-800 dark:text-slate-200 truncate max-w-[200px]" dir="ltr">
                              {bkp.filename}
                            </div>
                            <div className="text-[10px] text-slate-400">
                              SHA256: {bkp.checksumSha256.slice(0, 12)}...
                            </div>
                          </td>
                          <td className="py-2 px-2.5 text-center">
                            <span
                              className={`px-2 py-0.5 rounded font-bold text-[10px] ${
                                bkp.trigger === 'AUTO'
                                  ? 'bg-blue-50 text-blue-700'
                                  : 'bg-emerald-50 text-emerald-700'
                              }`}
                            >
                              {bkp.trigger === 'AUTO' ? 'تلقائي' : 'يدوي'}
                            </span>
                          </td>
                          <td className="py-2 px-2.5 text-center font-mono">
                            {bkp.productsCount} / {bkp.invoicesCount}
                          </td>
                          <td className="py-2 px-2.5 text-end font-mono">
                            {(bkp.sizeBytes / 1024).toFixed(1)} KB
                          </td>
                          <td className="py-2 px-2.5 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <a
                                href={`/api/v1/backups/download/${encodeURIComponent(bkp.filename)}`}
                                download={bkp.filename}
                                className="px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold"
                              >
                                تنزيل
                              </a>
                              {confirmRestoreFilename === bkp.filename ? (
                                <button
                                  type="button"
                                  disabled={isBackupBusy}
                                  onClick={async () => {
                                    setIsBackupBusy(true);
                                    try {
                                      const res = await fetch('/api/v1/backups/restore', {
                                        method: 'POST',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify({ filename: bkp.filename }),
                                      });
                                      const json = await res.json();
                                      if (json?.success) {
                                        await reloadStateFromServer();
                                      }
                                      setConfirmRestoreFilename(null);
                                      setRestoreFeedback(json?.messageAr || 'تمت الاستعادة بنجاح');
                                    } finally {
                                      setIsBackupBusy(false);
                                    }
                                  }}
                                  className="px-2 py-1 rounded bg-rose-600 hover:bg-rose-700 text-white font-bold cursor-pointer"
                                >
                                  تأكيد الاستعادة
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  data-testid={`btn-restore-${bkp.filename}`}
                                  onClick={() => setConfirmRestoreFilename(bkp.filename)}
                                  className="px-2 py-1 rounded bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 font-bold cursor-pointer"
                                >
                                  استعادة
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* IndexedDB Offline POS Queue & Resilient Snapshot Cache */}
            <div
              data-testid="indexeddb-offline-queue-panel"
              className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
            >
              <div className="flex items-start gap-2.5">
                <HardDrive className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" />
                <div className="space-y-0.5">
                  <div className="text-xs font-bold text-slate-900 dark:text-slate-100">
                    محرك العمل دون إنترنت (IndexedDB Offline Queue)
                  </div>
                  <div className="text-[11px] text-slate-500 font-mono">
                    الحالة: {offlineStorageMetrics.indexedDbSupported ? 'IndexedDB مفعّل' : 'LocalFallback'} • معاملات معلقة: {offlineStorageMetrics.pendingCount} • حجم اللقطة المحلية: {(offlineStorageMetrics.snapshotSizeBytes / 1024).toFixed(1)} KB
                  </div>
                </div>
              </div>
              <button
                type="button"
                data-testid="btn-flush-offline-queue"
                disabled={isServerSyncing}
                onClick={async () => {
                  const ok = await flushPendingSyncQueue();
                  setRestoreFeedback(
                    ok
                      ? '✓ تمت مزامنة كافة المعاملات المحلية المعلقة مع الخادم بنجاح.'
                      : '⚠ تعذر الوصول للخادم حالياً — المعاملات محفوظة بأمان في IndexedDB.'
                  );
                }}
                className="px-3.5 py-2 rounded-lg bg-white hover:bg-slate-100 dark:bg-slate-900 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700 text-xs font-bold flex items-center gap-1.5 cursor-pointer shrink-0"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isServerSyncing ? 'animate-spin' : ''}`} />
                <span>مزامنة الطابور الآن</span>
              </button>
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
          TAB 6: ZERO-DOWNLOAD INSTALLER, PORT & FIREWALL PERMISSIONS, USB BRIDGE
      ==================================================================== */}
      {activeSettingsTab === 'system_setup' && (
        <div
          data-testid="settings-system-setup-panel"
          className="max-w-5xl space-y-4 min-w-0"
        >
          {/* Offline Portable Bundle & Installers Card */}
          <div className="bg-white dark:bg-slate-900 p-4 sm:p-6 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-start gap-2.5 min-w-0">
                <div className="w-9 h-9 rounded-xl haseb-btn-primary text-white flex items-center justify-center shrink-0">
                  <Laptop className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">
                    ملف التسطيب والحزمة المتكاملة بدون إنترنت (Zero-Download Setup)
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    تشغيل مباشر على أي جهاز بدون تحميل حزم npm — يفتح تلقائياً منافذ الشبكة (3000/3443)، جدار الحماية، صلاحيات URL ACL، وخدمة ADB للجوال
                  </p>
                </div>
              </div>
              <span className="text-[11px] font-mono px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 shrink-0 tabular-nums">
                {systemReadiness?.zeroDownloadReady ? 'جاهز بدون إنترنت ✓' : 'وضع المعاينة / التجهيز'}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
              <a
                href="/api/v1/installer/windows-setup.exe"
                download="Haseb_ERP_Setup_Offline.exe"
                data-testid="settings-download-windows-exe-btn"
                className="py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-2 transition cursor-pointer whitespace-nowrap shadow-xs"
              >
                <Download className="w-4 h-4 text-emerald-100 shrink-0" />
                <span className="truncate">
                  مثبت Windows مباشر (.exe)
                  {systemReadiness?.exeInstallerSizeMb
                    ? ` (${systemReadiness.exeInstallerSizeMb} MB)`
                    : ''}
                </span>
              </a>

              <a
                href="/api/v1/installer/portable-bundle.zip"
                download="Haseb_ERP_Portable_Offline_Bundle.zip"
                data-testid="settings-download-portable-zip-btn"
                className="py-2.5 px-3 rounded-xl haseb-btn-primary text-white font-bold text-xs flex items-center justify-center gap-2 transition cursor-pointer whitespace-nowrap"
              >
                <Download className="w-4 h-4 text-emerald-300 shrink-0" />
                <span className="truncate">الحزمة المتكاملة (.zip)</span>
              </a>

              <a
                href="/api/v1/installer/windows-setup.bat"
                download="Haseb_ERP_Windows_Installer.bat"
                data-testid="settings-download-win-installer-btn"
                className="py-2.5 px-3 rounded-xl bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-700 font-bold text-xs flex items-center justify-center gap-2 transition cursor-pointer whitespace-nowrap"
              >
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                <span className="truncate">مثبت Windows (.bat)</span>
              </a>

              <a
                href="/api/v1/installer/linux-setup.sh"
                download="Haseb_ERP_Linux_Mac_Installer.sh"
                data-testid="settings-download-linux-installer-btn"
                className="py-2.5 px-3 rounded-xl bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-700 font-bold text-xs flex items-center justify-center gap-2 transition cursor-pointer whitespace-nowrap"
              >
                <Terminal className="w-4 h-4 text-blue-600 shrink-0" />
                <span className="truncate">مثبت Linux / Mac (.sh)</span>
              </a>

              <PWAInstallButton alwaysVisible />
            </div>

            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
              ملف{' '}
              <code className="font-mono font-bold text-emerald-700 dark:text-emerald-400" dir="ltr">
                Haseb_ERP_Setup_Offline.exe
              </code>{' '}
              يعمل فوراً على أي جهاز Windows 64-bit بدون تثبيت Node.js أو تحميل ملفات؛ كما توجد نسخ السكربتات باسم{' '}
              <code className="font-mono font-bold text-slate-900 dark:text-slate-100" dir="ltr">
                installer_windows.bat
              </code>{' '}
              و{' '}
              <code className="font-mono font-bold text-slate-900 dark:text-slate-100" dir="ltr">
                installer_linux_mac.sh
              </code>
              . عند التشغيل يفتح جدار الحماية للمنافذ (3000، 3443، 5037) وينشئ اختصار سطح المكتب ويشغّل جسر USB تلقائياً.
            </div>
          </div>

          {/* Live Host Readiness & 1-Click Permission Engine */}
          <div className="bg-white dark:bg-slate-900 p-4 sm:p-6 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2.5 border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="min-w-0">
                <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <Wifi className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>فحص جاهزية المنفذ، جدار الحماية، والحزمة الصفرية</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  تطبيق تلقائي لصلاحيات المنفذ وتهيئة خدمة ADB للتعرف الفوري على أي جوال USB
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  data-testid="btn-refresh-system-readiness"
                  disabled={isCheckingReadiness}
                  onClick={() => void loadSystemReadiness()}
                  className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-700 text-xs font-bold flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isCheckingReadiness ? 'animate-spin' : ''}`} />
                  <span>تحديث الفحص</span>
                </button>

                <button
                  type="button"
                  data-testid="btn-apply-host-permissions"
                  disabled={isApplyingPermissions}
                  onClick={() => void handleApplyHostPermissions()}
                  className="px-3.5 py-2 rounded-xl haseb-btn-primary text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer whitespace-nowrap disabled:opacity-60"
                >
                  <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
                  <span>
                    {isApplyingPermissions
                      ? 'جاري التطبيق...'
                      : 'فحص وتطبيق صلاحيات المنفذ وجدار الحماية وADB'}
                  </span>
                </button>
              </div>
            </div>

            {systemReadiness && (
              <div
                data-testid="system-readiness-grid"
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 tabular-nums text-xs"
              >
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-1">
                  <div className="text-[11px] text-slate-500">حزمة التشغيل الصفرية وملف التسطيب</div>
                  <div className="font-bold text-slate-900 dark:text-slate-100 font-mono text-[11px]">
                    EXE: {systemReadiness.exeInstallerReady ? `جاهز ✓ (${systemReadiness.exeInstallerSizeMb ?? ''}MB)` : 'غير مبني'} · dist:{' '}
                    {systemReadiness.distReady ? '✓' : '×'} · bundle: {systemReadiness.bundleReady ? '✓' : '×'}
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-1">
                  <div className="text-[11px] text-slate-500">جدار الحماية والمنافذ (Ports)</div>
                  <div className="font-bold text-slate-900 dark:text-slate-100">
                    {systemReadiness.firewallStatus === 'CONFIGURED' ||
                    systemReadiness.firewallStatus === 'CONTAINER_MANAGED'
                      ? `مفتوح وجاهز (${systemReadiness.port})`
                      : `يتطلب تشغيل المثبت كمسؤول`}
                  </div>
                  <div className="text-[10.5px] text-slate-500 truncate" title={systemReadiness.firewallDetailsAr}>
                    {systemReadiness.firewallDetailsAr}
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-1">
                  <div className="text-[11px] text-slate-500">رابط الشبكة المحلية (LAN)</div>
                  <div className="font-bold text-emerald-700 dark:text-emerald-400 font-mono truncate" dir="ltr">
                    {systemReadiness.primaryLanUrl}
                  </div>
                  <div className="text-[10.5px] text-slate-500">
                    نظام التشغيل: {systemReadiness.platform} ({systemReadiness.arch})
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-1 sm:col-span-2 lg:col-span-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-slate-100">
                      <Smartphone className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>جسر USB / ADB ومنافذ المودم التسلسلية (COM/TTY)</span>
                    </div>
                    <span className="font-mono text-[11px] text-slate-600 dark:text-slate-300">
                      ADB: {systemReadiness.adbAvailable ? (systemReadiness.adbDaemonRunning ? 'نشط ✓' : 'متاح ✓') : 'غير مثبت في PATH'} · منافذ تسلسلية: {systemReadiness.serialPortsCount}
                    </span>
                  </div>
                  {systemReadiness.adbPath && (
                    <div className="text-[11px] font-mono text-slate-500 truncate" dir="ltr">
                      ADB Binary: {systemReadiness.adbPath}
                    </div>
                  )}
                  {systemReadiness.serialPorts.length > 0 && (
                    <div className="text-[11px] font-mono text-slate-500 truncate" dir="ltr">
                      Serial Hardware: {systemReadiness.serialPorts.join(' | ')}
                    </div>
                  )}
                </div>
              </div>
            )}

            {permissionActionsLog.length > 0 && (
              <div
                data-testid="permission-actions-log"
                className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 space-y-1.5 text-xs text-emerald-900 dark:text-emerald-200"
              >
                {permissionActionsLog.map((line, i) => (
                  <div key={i} className="font-medium leading-relaxed">
                    {line}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ====================================================================
          MODAL: ADD NEW BRANCH
      ==================================================================== */}
      {isAddBranchModalOpen &&
        renderModalPortal(
          <div
            style={{ zIndex: addBranchLayer.zIndex }}
            data-modal-top={addBranchLayer.isTopLayer ? 'true' : undefined}
            onMouseDown={(e) => {
              if (e.target === e.currentTarget) setIsAddBranchModalOpen(false);
            }}
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4"
          >
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
      {editingBranch &&
        renderModalPortal(
          <div
            style={{ zIndex: editBranchLayer.zIndex }}
            data-modal-top={editBranchLayer.isTopLayer ? 'true' : undefined}
            onMouseDown={(e) => {
              if (e.target === e.currentTarget) setEditingBranch(null);
            }}
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4"
          >
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
      {isAddWarehouseModalOpen &&
        renderModalPortal(
          <div
            style={{ zIndex: addWarehouseLayer.zIndex }}
            data-modal-top={addWarehouseLayer.isTopLayer ? 'true' : undefined}
            onMouseDown={(e) => {
              if (e.target === e.currentTarget) setIsAddWarehouseModalOpen(false);
            }}
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4"
          >
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
      {editingWarehouse &&
        renderModalPortal(
          <div
            style={{ zIndex: editWarehouseLayer.zIndex }}
            data-modal-top={editWarehouseLayer.isTopLayer ? 'true' : undefined}
            onMouseDown={(e) => {
              if (e.target === e.currentTarget) setEditingWarehouse(null);
            }}
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4"
          >
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
