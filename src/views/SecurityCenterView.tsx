import React, { useState } from 'react';
import { useERP, ALL_ERP_MODULES } from '../context/ERPContext';
import { LicenseDurationPreset } from '../core/securityEngine';
import { UserAccount, UserRole } from '../types/erp';
import {
  ShieldCheck,
  Users,
  KeyRound,
  Cpu,
  Lock,
  Unlock,
  CircuitBoard,
  HardDrive,
  Sparkles,
  Terminal,
  Copy,
  CheckCircle2,
  AlertTriangle,
  Plus,
  UserCheck,
  LogOut,
  Clock,
  ShieldAlert,
  Eye,
    Trash2,
  RefreshCw,
  Download,
} from 'lucide-react';

export const SecurityCenterView: React.FC = () => {
  const {
    language,
    userAccounts,
    currentAccount,
    addUserAccount,
    updateUserAccount,
    deleteUserAccount,
    login,
    logout,
    hardwareFingerprint,
    rescanLiveHardware,
    importWindowsWmiSerials,
    protectionState,
    activeLicenseSerial,
    activateSystemWithSerial,
    clearActiveLicense,
    generateDeveloperActivationKey,
    simulatedTrialDaysElapsed,
    setSimulatedTrialDaysElapsed,
    setIsSimulatedTrialExpired,
    isSimulatedForeignDevice,
    setIsSimulatedForeignDevice,
    isSimulatedClockTampered,
    setIsSimulatedClockTampered,
    simulatedTamperedComponent,
    setSimulatedTamperedComponent,
    setIsStandaloneKeygenOpen,
    antiTheftShieldEnabled,
    setAntiTheftShieldEnabled,
    blockedInspectCount,
    recordBlockedInspectAttempt,
  } = useERP();

  const [subTab, setSubTab] = useState<'memberships' | 'hardware' | 'keygen' | 'antitheft'>('memberships');

  // New User Membership Form State
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newNameAr, setNewNameAr] = useState('');
  const [newNameEn, setNewNameEn] = useState('');
  const [newRole, setNewRole] = useState<UserRole>('SALES_REP');
  const [newAllowedModules, setNewAllowedModules] = useState<string[]>(['dashboard', 'pos', 'sales']);
  const [userFormNotice, setUserFormNotice] = useState<string | null>(null);

  // Developer Keygen & WMI Bridge State
  const [clientReqCode, setClientReqCode] = useState(protectionState.machineRequestCode);
  const [durationPreset, setDurationPreset] = useState<LicenseDurationPreset>('1_YEAR');
  const [customDays, setCustomDays] = useState<number>(60);
  const [generatedSerial, setGeneratedSerial] = useState<string>('');
  const [serialToActivate, setSerialToActivate] = useState<string>('');
  const [licenseFeedback, setLicenseFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);
  const [wmiInputText, setWmiInputText] = useState('');
  const [wmiNotice, setWmiNotice] = useState<string | null>(null);
  const [copiedPsCmd, setCopiedPsCmd] = useState(false);

  const moduleLabels: Record<string, { ar: string; en: string }> = {
    dashboard: { ar: 'لوحة القيادة التنفيذية', en: 'Executive Dashboard' },
    pos: { ar: 'نقطة البيع والكاشير POS', en: 'POS Register & Kitchen' },
    barcodeEngine: { ar: 'محرك الباركود والتتبع GS1', en: 'Barcode & Traceability' },
    inventory: { ar: 'المخازن والمستودعات WMS', en: 'Inventory & WMS' },
    purchasing: { ar: 'المشتريات والموردين', en: 'Purchasing & Suppliers' },
    sales: { ar: 'المبيعات والفواتير الضريبية', en: 'Sales & Tax Invoices' },
    accounting: { ar: 'المحاسبة المالية والقيد المزدوج', en: 'Financial Accounting' },
    businessModules: { ar: 'وحدات الأعمال (HR/أصول/تصنيع)', en: 'Enterprise Suites' },
    aiInsights: { ar: 'المساعد الذكي Gemini AI', en: 'Gemini AI Copilot' },
    saasPlatform: { ar: 'إدارة المنصة والاشتراكات SaaS', en: 'SaaS Multi-Tenant Admin' },
    security: { ar: 'مركز الحماية والعضويات والترخيص', en: 'Security & Licensing Center' },
    settings: { ar: 'الإعدادات والمجالات والقوالب', en: 'Settings & Templates' },
  };

  const handleToggleNewUserModule = (modId: string) => {
    setNewAllowedModules((prev) =>
      prev.includes(modId) ? prev.filter((m) => m !== modId) : [...prev, modId]
    );
  };

  const handleCreateUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUsername.trim() || !newPassword.trim()) return;
    if (userAccounts.some((u) => u.username.toLowerCase() === newUsername.trim().toLowerCase())) {
      setUserFormNotice(
        language === 'ar' ? 'اسم المستخدم مسجل مسبقاً!' : 'Username already exists!'
      );
      return;
    }

    addUserAccount({
      username: newUsername.trim(),
      password: newPassword.trim(),
      email: `${newUsername.trim().toLowerCase()}@rlm-erp.sa`,
      name: newNameEn.trim() || newUsername.trim(),
      nameAr: newNameAr.trim() || newUsername.trim(),
      role: newRole,
      branchId: 'br-1',
      isActive: true,
      allowedModules: newAllowedModules.length > 0 ? newAllowedModules : ['dashboard'],
      permissions: {
        canCreate: true,
        canEdit: newRole !== 'CASHIER',
        canDelete: newRole === 'SUPER_ADMIN' || newRole === 'COMPANY_ADMIN',
        canExport: true,
        canApprove: newRole === 'SUPER_ADMIN' || newRole === 'COMPANY_ADMIN',
        canManageUsers: newRole === 'SUPER_ADMIN',
        canManageLicense: newRole === 'SUPER_ADMIN',
      },
    });

    setNewUsername('');
    setNewPassword('');
    setNewNameAr('');
    setNewNameEn('');
    setUserFormNotice(
      language === 'ar'
        ? 'تم إنشاء العضوية وتخصيص صلاحيات الأقسام بنجاح!'
        : 'User membership and module permissions created!'
    );
    setTimeout(() => setUserFormNotice(null), 3500);
  };

  const handleToggleExistingAccountModule = (acc: UserAccount, modId: string) => {
    if (acc.username === 'admin' && modId === 'security') return; // Keep admin in security
    const exists = acc.allowedModules.includes(modId);
    const updatedModules = exists
      ? acc.allowedModules.filter((m) => m !== modId)
      : [...acc.allowedModules, modId];
    updateUserAccount({
      ...acc,
      allowedModules: updatedModules.length > 0 ? updatedModules : ['dashboard'],
    });
  };

  const handleTogglePermissionFlag = (
    acc: UserAccount,
    flag: keyof UserAccount['permissions']
  ) => {
    if (acc.username === 'admin') return;
    updateUserAccount({
      ...acc,
      permissions: {
        ...acc.permissions,
        [flag]: !acc.permissions[flag],
      },
    });
  };

  const handleGenerateKey = () => {
    const code = clientReqCode.trim() || protectionState.machineRequestCode;
    const res = generateDeveloperActivationKey(code, durationPreset, customDays);
    if (!res.success || !res.serial) {
      setLicenseFeedback({
        type: 'error',
        text:
          language === 'ar'
            ? 'كود طلب الجهاز غير صالح! يجب أن يكون بصيغة RLM-REQ-XXXX-XXXX-XXXX-XXXX'
            : res.error || 'Invalid Machine Request Code',
      });
      return;
    }
    setGeneratedSerial(res.serial);
    setSerialToActivate(res.serial);
    setLicenseFeedback({
      type: 'success',
      text:
        language === 'ar'
          ? 'تم توليد سيريال التفعيل المشفر وربطه ببصمة هذا الجهاز فقط!'
          : 'Generated single-device activation serial successfully!',
    });
  };

  const handleApplySerial = (e: React.FormEvent) => {
    e.preventDefault();
    const res = activateSystemWithSerial(serialToActivate);
    if (res.valid) {
      setLicenseFeedback({
        type: 'success',
        text:
          language === 'ar'
            ? `تم تفعيل النظام بنجاح لمدة (${res.durationLabelAr}) مرتبطاً بهذا الجهاز فقط!`
            : `System activated successfully (${res.durationLabelEn}) bound to this machine!`,
      });
    } else {
      setLicenseFeedback({
        type: 'error',
        text:
          res.reason === 'DEVICE_MISMATCH'
            ? language === 'ar'
              ? 'فشل التفعيل: هذا السيريال خاص بجهاز آخر مختلف في الماذربورد والمعالج!'
              : 'Activation Failed: Serial is bound to another device!'
            : language === 'ar'
            ? 'سيريال التفعيل غير صالح أو منتهي الصلاحية!'
            : 'Invalid or expired activation serial!',
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Hero Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-2xl p-6 border border-indigo-500/30 shadow-xl flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-lg bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-xs font-bold">
            <ShieldCheck className="w-4 h-4" />
            <span>
              {language === 'ar'
                ? 'نظام الحماية المتقدم • التشفير ببصمة الهاردوير • إدارة العضويات والصلاحيات'
                : 'Enterprise Hardware DRM • Single-PC Keygen • RBAC Memberships'}
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black tracking-tight">
            {language === 'ar'
              ? 'مركز الحماية، العضويات والصلاحيات، وتراخيص الهاردوير (DRM)'
              : 'Security, Memberships & Hardware Licensing Center'}
          </h1>
          <p className="text-xs text-slate-300 max-w-3xl">
            {language === 'ar'
              ? 'تحكم كامل في حسابات الدخول (الافتراضي admin / admin)، صلاحيات الأقسام لكل مستخدم، حماية السورس كود من السرقة، الفترة التجريبية 30 يوماً، ومولد سيريالات التفعيل المرتبط بالماذربورد والمعالج لجهاز واحد فقط.'
              : 'Manage user accounts (default admin / admin), module permissions, anti-theft source code shield, 30-day trial lockout, and single-device Motherboard/CPU activation serials.'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <div className="px-3.5 py-2 rounded-xl bg-slate-900/90 border border-slate-700 text-xs">
            <div className="text-[10px] text-slate-400">
              {language === 'ar' ? 'العضوية المتصلة حالياً:' : 'Active Session:'}
            </div>
            <div className="font-black text-indigo-300 flex items-center gap-1.5">
              <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>{currentAccount.username}</span>
              <span className="text-[10px] bg-indigo-500/20 text-indigo-200 px-1.5 py-0.2 rounded">
                {currentAccount.role}
              </span>
            </div>
          </div>

          <button
            type="button"
            data-testid="security-logout-btn"
            onClick={logout}
            className="px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition cursor-pointer flex items-center gap-1.5 shadow-sm"
          >
            <LogOut className="w-4 h-4" />
            <span>{language === 'ar' ? 'تسجيل الخروج لبوابة الدخول' : 'Sign Out to Login Gate'}</span>
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-3">
        {[
          {
            id: 'memberships',
            labelAr: 'العضويات والصلاحيات (admin / Users)',
            labelEn: 'Memberships & Permissions',
            icon: Users,
          },
          {
            id: 'hardware',
            labelAr: 'بصمة الهاردوير والفترة التجريبية (30 يوم)',
            labelEn: 'Hardware Lock & 30-Day Trial',
            icon: Cpu,
          },
          {
            id: 'keygen',
            labelAr: 'برنامج المطور لتوليد السيريال (Keygen)',
            labelEn: 'Developer Serial Keygen',
            icon: KeyRound,
          },
          {
            id: 'antitheft',
            labelAr: 'حماية السورس كود ومنع السرقة',
            labelEn: 'Anti-Theft Source Shield',
            icon: Lock,
          },
        ].map((tab) => {
          const Icon = tab.icon;
          const active = subTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              data-testid={`sec-tab-${tab.id}`}
              onClick={() => setSubTab(tab.id as any)}
              className={`px-4 py-2.5 rounded-xl text-xs font-black flex items-center gap-2 transition cursor-pointer ${
                active
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                  : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{language === 'ar' ? tab.labelAr : tab.labelEn}</span>
            </button>
          );
        })}
      </div>

      {/* TAB 1: MEMBERSHIPS & GRANULAR PERMISSIONS */}
      {subTab === 'memberships' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left: Existing Accounts & Matrix (8 cols) */}
          <div className="lg:col-span-8 space-y-4">
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h2 className="text-base font-black text-slate-900">
                    {language === 'ar'
                      ? 'سجل العضويات وصلاحيات الوصول للأقسام والعمليات'
                      : 'Registered User Memberships & Module Access Matrix'}
                  </h2>
                  <p className="text-xs text-slate-500">
                    {language === 'ar'
                      ? 'انقر على أي قسم لتفعيل أو إلغاء صلاحية وصول العضوية إليه فوراً، أو انقر "تبديل للعضوية" لتجربة النظام بصلاحياتها.'
                      : 'Toggle module access pills in real time or switch to any user account to test their restricted view.'}
                  </p>
                </div>
                <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-200">
                  {userAccounts.filter((a) => !a.isHiddenMasterAdmin).length}{' '}
                  {language === 'ar' ? 'عضويات نشطة' : 'Accounts'}
                </span>
              </div>

              <div className="space-y-4">
                {userAccounts
                  .filter((acc) => !acc.isHiddenMasterAdmin)
                  .map((acc) => {
                    const isCurrent = acc.id === currentAccount.id;
                    return (
                      <div
                      key={acc.id}
                      className={`p-4 rounded-2xl border transition ${
                        isCurrent
                          ? 'bg-indigo-50/40 border-indigo-400 shadow-xs'
                          : 'bg-slate-50/70 border-slate-200'
                      }`}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-200/80">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-slate-900 text-white font-black text-xs flex items-center justify-center">
                            {acc.username.slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-black text-sm text-slate-900">
                                {language === 'ar' ? acc.nameAr : acc.name}
                              </span>
                              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-slate-200 text-slate-800">
                                {acc.role}
                              </span>
                              {isCurrent && (
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-300">
                                  {language === 'ar' ? 'المتصل الآن' : 'Current User'}
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-slate-500 font-mono mt-0.5">
                              {language === 'ar' ? 'اسم المستخدم:' : 'Username:'}{' '}
                              <strong className="text-indigo-700">{acc.username}</strong> •{' '}
                              {language === 'ar' ? 'كلمة السر:' : 'Password:'}{' '}
                              <strong className="text-indigo-700">{acc.password}</strong>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          {!isCurrent && (
                            <button
                              type="button"
                              onClick={() => login(acc.username, acc.password)}
                              className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition cursor-pointer"
                            >
                              {language === 'ar' ? 'التبديل لهذه العضوية' : 'Switch to Account'}
                            </button>
                          )}
                          {acc.username !== 'admin' && (
                            <button
                              type="button"
                              onClick={() => deleteUserAccount(acc.id)}
                              className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 transition cursor-pointer"
                              title={language === 'ar' ? 'حذف العضوية' : 'Delete Account'}
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Allowed Modules Toggle Grid */}
                      <div className="mt-3">
                        <div className="text-[11px] font-bold text-slate-600 mb-1.5">
                          {language === 'ar'
                            ? 'الأقسام المسموح لها بالظهور والوصول في القائمة الجانبية:'
                            : 'Allowed Sidebar Navigation Modules:'}
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {ALL_ERP_MODULES.map((modId) => {
                            const allowed = acc.allowedModules.includes(modId);
                            const label = moduleLabels[modId]
                              ? language === 'ar'
                                ? moduleLabels[modId].ar
                                : moduleLabels[modId].en
                              : modId;
                            return (
                              <button
                                key={modId}
                                type="button"
                                onClick={() => handleToggleExistingAccountModule(acc, modId)}
                                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition cursor-pointer ${
                                  allowed
                                    ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                                    : 'bg-slate-100 text-slate-400 border-slate-200 line-through'
                                }`}
                              >
                                {allowed ? '✓ ' : '✕ '}
                                {label}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Action Privileges */}
                      <div className="mt-3 pt-2.5 border-t border-slate-200/60 flex flex-wrap items-center gap-2">
                        <span className="text-[11px] font-bold text-slate-500">
                          {language === 'ar' ? 'صلاحيات العمليات:' : 'Action Privileges:'}
                        </span>
                        {(
                          [
                            { key: 'canCreate', ar: 'إضافة وإنشاء', en: 'Create' },
                            { key: 'canEdit', ar: 'تعديل البيانات', en: 'Edit' },
                            { key: 'canDelete', ar: 'حذف السجلات', en: 'Delete' },
                            { key: 'canExport', ar: 'تصدير وطباعة', en: 'Export/Print' },
                            { key: 'canApprove', ar: 'اعتماد وتعميد', en: 'Approve' },
                            { key: 'canManageLicense', ar: 'إدارة التراخيص', en: 'Manage License' },
                          ] as const
                        ).map((perm) => {
                          const active = acc.permissions[perm.key];
                          return (
                            <button
                              key={perm.key}
                              type="button"
                              onClick={() => handleTogglePermissionFlag(acc, perm.key)}
                              className={`px-2 py-0.5 rounded text-[10px] font-bold border transition cursor-pointer ${
                                active
                                  ? 'bg-indigo-50 text-indigo-800 border-indigo-200'
                                  : 'bg-slate-100 text-slate-400 border-slate-200'
                              }`}
                            >
                              {active ? '● ' : '○ '}
                              {language === 'ar' ? perm.ar : perm.en}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right: Create New Membership Form (4 cols) */}
          <div className="lg:col-span-4">
            <form
              onSubmit={handleCreateUser}
              className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4 sticky top-16"
            >
              <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                <Plus className="w-5 h-5 text-indigo-600" />
                <h3 className="text-sm font-black text-slate-900">
                  {language === 'ar'
                    ? 'إضافة عضوية مستخدم جديدة وتخصيص صلاحياتها'
                    : 'Create New User Membership & Permissions'}
                </h3>
              </div>

              {userFormNotice && (
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold">
                  {userFormNotice}
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {language === 'ar' ? 'اسم المستخدم للدخول (Username):' : 'Login Username:'}
                </label>
                <input
                  type="text"
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  placeholder="e.g. sales_ahmed"
                  className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono outline-hidden focus:border-indigo-600"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {language === 'ar' ? 'كلمة المرور (Password):' : 'Login Password:'}
                </label>
                <input
                  type="text"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono outline-hidden focus:border-indigo-600"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {language === 'ar' ? 'الاسم الكامل للموظف (عربي):' : 'Full Name (Arabic):'}
                </label>
                <input
                  type="text"
                  value={newNameAr}
                  onChange={(e) => setNewNameAr(e.target.value)}
                  placeholder="أحمد السالم - مبيعات"
                  className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs outline-hidden focus:border-indigo-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {language === 'ar' ? 'الدور الوظيفي (Role):' : 'System Role:'}
                </label>
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value as UserRole)}
                  className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold outline-hidden focus:border-indigo-600"
                >
                  <option value="SUPER_ADMIN">SUPER_ADMIN (مدير عام كامل الصلاحيات)</option>
                  <option value="COMPANY_ADMIN">COMPANY_ADMIN (مدير شركة / فرع)</option>
                  <option value="ACCOUNTANT">ACCOUNTANT (محاسب مالي)</option>
                  <option value="WAREHOUSE_MANAGER">WAREHOUSE_MANAGER (أمين مستودع)</option>
                  <option value="CASHIER">CASHIER (كاشير نقطة بيع)</option>
                  <option value="SALES_REP">SALES_REP (مندوب مبيعات)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  {language === 'ar' ? 'تحديد الأقسام المسموحة:' : 'Select Allowed Modules:'}
                </label>
                <div className="grid grid-cols-2 gap-1.5 max-h-48 overflow-y-auto p-2 bg-slate-50 rounded-xl border border-slate-200">
                  {ALL_ERP_MODULES.map((modId) => {
                    const checked = newAllowedModules.includes(modId);
                    return (
                      <label
                        key={modId}
                        className="flex items-center gap-1.5 text-[11px] font-medium text-slate-700 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => handleToggleNewUserModule(modId)}
                          className="rounded text-indigo-600"
                        />
                        <span className="truncate">
                          {language === 'ar' ? moduleLabels[modId]?.ar : moduleLabels[modId]?.en}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs transition cursor-pointer shadow-sm"
              >
                {language === 'ar' ? 'حفظ العضوية وتفعيل الصلاحيات' : 'Create User Membership'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* TAB 2: HARDWARE FINGERPRINT & 30-DAY TRIAL ENGINE */}
      {subTab === 'hardware' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left: Multi-Hardware Serials & Request Code (7 cols) */}
          <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-black text-slate-900">
                    {language === 'ar'
                      ? 'قارئ سيريالات الهاردوير الفعلية للجهاز (WebGL + CPU + WMI)'
                      : 'Real Multi-Hardware Component Serials Reader'}
                  </h2>
                  <span
                    className={`px-2.5 py-0.5 rounded-lg text-[10px] font-mono font-bold border ${
                      isSimulatedForeignDevice
                        ? 'bg-rose-50 text-rose-700 border-rose-200'
                        : hardwareFingerprint.detectionSource === 'WINDOWS_WMI_IMPORTED'
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                        : 'bg-indigo-50 text-indigo-700 border-indigo-200'
                    }`}
                  >
                    {isSimulatedForeignDevice
                      ? 'FOREIGN-PC-SIM'
                      : hardwareFingerprint.detectionSource === 'WINDOWS_WMI_IMPORTED'
                      ? 'WINDOWS-WMI-VERIFIED'
                      : 'LIVE-DEVICE-SILICON'}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  {language === 'ar'
                    ? 'يقرأ النظام فعلياً معالج الرسوميات الحقيقي (WebGL Unmasked GPU)، أنوية المعالج والرام، وبصمة السيليكون ونظام التشغيل، مع دعم استيراد سيريالات المصنع الخام عبر Windows WMI.'
                    : 'Extracts real WebGL Unmasked GPU renderer, CPU cores/model, RAM, and OS silicon telemetry, with native Windows WMI factory serial import.'}
                </p>
              </div>

              <button
                type="button"
                data-testid="rescan-live-hardware-btn"
                onClick={async () => {
                  await rescanLiveHardware();
                  setWmiNotice(
                    language === 'ar'
                      ? 'تمت إعادة فحص وقراءة الهاردوير الفعلي للجهاز الحي بنجاح!'
                      : 'Live device hardware rescanned successfully!'
                  );
                  setTimeout(() => setWmiNotice(null), 3500);
                }}
                className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition cursor-pointer flex items-center gap-1.5 shadow-xs"
              >
                <RefreshCw className="w-3.5 h-3.5 text-emerald-400" />
                <span>
                  {language === 'ar'
                    ? 'فحص الهاردوير الفعلي الآن'
                    : 'Rescan Live Hardware'}
                </span>
              </button>
            </div>

            {wmiNotice && (
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{wmiNotice}</span>
              </div>
            )}

            {/* Live Hardware Telemetry Summary Bar */}
            {hardwareFingerprint.rawTelemetry && (
              <div className="p-3.5 rounded-xl bg-slate-900 text-slate-200 border border-slate-800 grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                <div>
                  <span className="text-slate-400">
                    {language === 'ar' ? 'كرت الشاشة الفعلي المقروء (WebGL GPU): ' : 'Detected GPU Renderer: '}
                  </span>
                  <strong className="text-emerald-300 font-mono">
                    {hardwareFingerprint.rawTelemetry.gpuRenderer}
                  </strong>
                </div>
                <div>
                  <span className="text-slate-400">
                    {language === 'ar' ? 'المعالج والأنوية والذاكرة (CPU / RAM): ' : 'Detected CPU & RAM: '}
                  </span>
                  <strong className="text-indigo-300 font-mono">
                    {hardwareFingerprint.rawTelemetry.cpuModel} ({hardwareFingerprint.rawTelemetry.cpuCores} Cores /{' '}
                    {hardwareFingerprint.rawTelemetry.memoryGb} GB)
                  </strong>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                <div className="text-xs text-slate-500 flex items-center gap-1.5">
                  <CircuitBoard className="w-4 h-4 text-indigo-600" />
                  <span>{language === 'ar' ? 'سيريال الماذربورد (Motherboard):' : 'Motherboard Serial:'}</span>
                </div>
                <div className="font-mono text-xs font-black text-slate-900 mt-1 break-all">
                  {hardwareFingerprint.motherboardSerial}
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                <div className="text-xs text-slate-500 flex items-center gap-1.5">
                  <Cpu className="w-4 h-4 text-cyan-600" />
                  <span>{language === 'ar' ? 'سيريال المعالج (CPU Processor):' : 'CPU Processor ID:'}</span>
                </div>
                <div className="font-mono text-xs font-black text-slate-900 mt-1 break-all">
                  {hardwareFingerprint.cpuProcessorId}
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                <div className="text-xs text-slate-500 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-amber-600" />
                  <span>{language === 'ar' ? 'معرف كرت الشاشة (GPU Silicon):' : 'GPU Silicon ID:'}</span>
                </div>
                <div className="font-mono text-xs font-black text-slate-900 mt-1 break-all">
                  {hardwareFingerprint.gpuSiliconId}
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                <div className="text-xs text-slate-500 flex items-center gap-1.5">
                  <HardDrive className="w-4 h-4 text-emerald-600" />
                  <span>{language === 'ar' ? 'سيريال القرص الصلب (NVMe Disk):' : 'NVMe Disk Serial:'}</span>
                </div>
                <div className="font-mono text-xs font-black text-slate-900 mt-1 break-all">
                  {hardwareFingerprint.diskVolumeSerial}
                </div>
              </div>
            </div>

            {/* Resulting Request Code */}
            <div className="p-4 rounded-2xl bg-slate-900 text-white flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-xs text-indigo-300 font-bold">
                  {language === 'ar'
                    ? 'كود طلب التفعيل المجمع لهذا الجهاز الفعلي (يرسل للمطور):'
                    : 'Composite Machine Request Code (Send to Developer):'}
                </div>
                <div className="font-mono text-base sm:text-lg font-black tracking-wider text-white mt-0.5">
                  {protectionState.machineRequestCode}
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard?.writeText(protectionState.machineRequestCode).catch(() => {});
                  setClientReqCode(protectionState.machineRequestCode);
                  setCopiedCode(true);
                  setTimeout(() => setCopiedCode(false), 2000);
                }}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition cursor-pointer flex items-center gap-1.5"
              >
                <Copy className="w-4 h-4" />
                <span>
                  {copiedCode
                    ? language === 'ar'
                      ? 'تم النسخ!'
                      : 'Copied!'
                    : language === 'ar'
                    ? 'نسخ الكود للمطور'
                    : 'Copy Request Code'}
                </span>
              </button>
            </div>

            {/* Windows WMI Factory Serial Extractor & Importer */}
            <div className="p-4 rounded-2xl bg-indigo-50/60 border border-indigo-200 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <div className="text-xs font-black text-indigo-950 flex items-center gap-1.5">
                    <Terminal className="w-4 h-4 text-indigo-600" />
                    <span>
                      {language === 'ar'
                        ? 'جسر قراءة سيريالات المصنع الخام من ويندوز (Windows WMI / BIOS Bridge)'
                        : 'Windows WMI Raw Factory Serial Extractor & Importer'}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-600 mt-0.5">
                    {language === 'ar'
                      ? 'تمنع المتصفحات قراءة سيريال البوردة الخام مباشرة لدواعي الخصوصية. يمكنك تحميل أداة الفحص المباشرة لويندوز (.bat) أو نسخ أمر PowerShell لقراءة سيريال الماذربورد والمعالج والقرص من الـ BIOS ولصقها هنا.'
                      : 'Download the Windows WMI scanner (.bat) or copy the PowerShell command to extract raw BIOS Motherboard/CPU/Disk serials.'}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <a
                    href="/api/v1/hardware/windows-scanner.bat"
                    download="RLM_Hardware_WMI_Scanner.bat"
                    className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-bold transition flex items-center gap-1.5 shadow-xs"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>
                      {language === 'ar'
                        ? 'تحميل أداة فحص ويندوز (.bat)'
                        : 'Download WMI Scanner (.bat)'}
                    </span>
                  </a>

                  <button
                    type="button"
                    onClick={() => {
                      const psCmd =
                        '$mb=(Get-CimInstance Win32_BaseBoard).SerialNumber.Trim(); $cpu=(Get-CimInstance Win32_Processor | Select -First 1).ProcessorId.Trim(); $gpu=(Get-CimInstance Win32_VideoController | Select -First 1).PNPDeviceID.Trim(); $disk=(Get-CimInstance Win32_DiskDrive | Select -First 1).SerialNumber.Trim(); @{motherboardSerial="MB-WMI-$mb";cpuProcessorId="CPU-WMI-$cpu";gpuSiliconId="GPU-WMI-$gpu";diskVolumeSerial="DISK-WMI-$disk"} | ConvertTo-Json -Compress';
                      navigator.clipboard?.writeText(psCmd).catch(() => {});
                      setCopiedPsCmd(true);
                      setTimeout(() => setCopiedPsCmd(false), 2500);
                    }}
                    className="px-3 py-1.5 rounded-xl bg-white hover:bg-slate-100 text-indigo-700 border border-indigo-300 text-[11px] font-bold transition cursor-pointer flex items-center gap-1"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>
                      {copiedPsCmd
                        ? language === 'ar'
                          ? 'تم نسخ أمر PowerShell!'
                          : 'Copied PowerShell!'
                        : language === 'ar'
                        ? 'نسخ أمر PowerShell WMI'
                        : 'Copy PowerShell WMI Cmd'}
                    </span>
                  </button>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  data-testid="wmi-serial-import-input"
                  value={wmiInputText}
                  onChange={(e) => setWmiInputText(e.target.value)}
                  placeholder={
                    language === 'ar'
                      ? 'الصق مخرجات أداة Windows WMI بصيغة JSON أو السيريالات مفصولة بفاصلة...'
                      : 'Paste Windows WMI JSON output or comma-separated serials...'
                  }
                  className="flex-1 bg-white border border-indigo-200 rounded-xl px-3 py-2 text-xs font-mono text-slate-800 outline-hidden focus:border-indigo-600"
                />
                <button
                  type="button"
                  data-testid="wmi-serial-import-btn"
                  onClick={() => {
                    const res = importWindowsWmiSerials(wmiInputText);
                    if (res.success) {
                      setWmiNotice(
                        language === 'ar'
                          ? 'تم اعتماد سيريالات Windows WMI الفعلية وتحديث كود طلب الجهاز فوراً!'
                          : 'Windows WMI factory serials imported and bound successfully!'
                      );
                      setWmiInputText('');
                      setTimeout(() => setWmiNotice(null), 4000);
                    } else {
                      setWmiNotice(
                        language === 'ar'
                          ? 'يرجى لصق كود JSON صحيح من أداة الفحص أو كتابة السيريالات مفصولة بفاصلة (,)'
                          : 'Please paste valid WMI JSON or comma-separated serials'
                      );
                    }
                  }}
                  className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-black transition cursor-pointer shrink-0"
                >
                  {language === 'ar' ? 'اعتماد سيريالات WMI' : 'Bind WMI Serials'}
                </button>
              </div>
            </div>

            {/* Hardware Mismatch & Single-Component Replacement Simulation */}
            <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="max-w-md">
                  <div className="text-xs font-black text-amber-950">
                    {language === 'ar'
                      ? 'اختبار ارتباط السريال بالقطع الداخلية للجهاز (يتوقف فور تعطل أو تغيير أي قطعة):'
                      : 'Single-Device Internal Component Lock Verification:'}
                  </div>
                  <p className="text-[11px] text-amber-800 mt-0.5">
                    {language === 'ar'
                      ? 'جرب محاكاة تغيير قطعة داخلية واحدة فقط (اللوحة الأم أو المعالج أو القرص NVMe) أو إرجاع وقت الكمبيوتر للوراء، وستلاحظ إقفال النظام فوراً.'
                      : 'Simulate replacing a single internal component (Motherboard, CPU, or NVMe Disk) or rolling back system time.'}
                  </p>
                </div>
                <button
                  type="button"
                  data-testid="simulate-foreign-pc-btn"
                  onClick={() => setIsSimulatedForeignDevice(!isSimulatedForeignDevice)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-black transition cursor-pointer ${
                    isSimulatedForeignDevice
                      ? 'bg-emerald-600 text-white'
                      : 'bg-amber-600 hover:bg-amber-500 text-white'
                  }`}
                >
                  {isSimulatedForeignDevice
                    ? language === 'ar'
                      ? 'إرجاع بصمة الجهاز الأصلي'
                      : 'Restore Original PC Hardware'
                    : language === 'ar'
                    ? 'محاكاة نقل النسخة لجهاز آخر بالكامل'
                    : 'Simulate Foreign PC Hardware'}
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-amber-200/80">
                <button
                  type="button"
                  data-testid="simulate-tamper-MOTHERBOARD"
                  onClick={() => setSimulatedTamperedComponent('MOTHERBOARD')}
                  className="p-2 rounded-xl bg-white hover:bg-rose-50 border border-amber-300 text-rose-800 text-[11px] font-bold transition cursor-pointer"
                >
                  {language === 'ar' ? 'تغيير الماذربورد فقط' : 'Tamper Motherboard'}
                </button>
                <button
                  type="button"
                  data-testid="simulate-tamper-CPU"
                  onClick={() => setSimulatedTamperedComponent('CPU')}
                  className="p-2 rounded-xl bg-white hover:bg-rose-50 border border-amber-300 text-rose-800 text-[11px] font-bold transition cursor-pointer"
                >
                  {language === 'ar' ? 'تغيير المعالج CPU فقط' : 'Tamper CPU ID'}
                </button>
                <button
                  type="button"
                  data-testid="simulate-tamper-DISK_NVME"
                  onClick={() => setSimulatedTamperedComponent('DISK_NVME')}
                  className="p-2 rounded-xl bg-white hover:bg-rose-50 border border-amber-300 text-rose-800 text-[11px] font-bold transition cursor-pointer"
                >
                  {language === 'ar' ? 'تغيير القرص NVMe فقط' : 'Tamper NVMe Disk'}
                </button>
                <button
                  type="button"
                  data-testid="simulate-clock-rollback-btn"
                  onClick={() => setIsSimulatedClockTampered(true)}
                  className="p-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-[11px] font-black transition cursor-pointer"
                >
                  {language === 'ar' ? 'محاكاة إرجاع الوقت للوراء' : 'Simulate Clock Rollback'}
                </button>
              </div>
            </div>
          </div>

          {/* Right: 30-Day Trial Engine & Lockout Trigger (5 cols) */}
          <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-col justify-between space-y-5">
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <Clock className="w-5 h-5 text-indigo-600" />
                  <h3 className="text-base font-black text-slate-900">
                    {language === 'ar'
                      ? 'نظام الفترة التجريبية (30 يوماً) والإقفال التلقائي'
                      : '30-Day Trial Period & Lockout Control'}
                  </h3>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-900 text-white space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">
                    {language === 'ar' ? 'حالة الترخيص الحالية:' : 'Current License Status:'}
                  </span>
                  <span
                    className={`px-2.5 py-0.5 rounded-md font-bold ${
                      protectionState.status === 'LICENSE_ACTIVE'
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                    }`}
                  >
                    {protectionState.status === 'LICENSE_ACTIVE'
                      ? language === 'ar'
                        ? `مفعل رسمياً (${protectionState.licenseDetails?.durationLabelAr})`
                        : `Licensed (${protectionState.licenseDetails?.durationLabelEn})`
                      : language === 'ar'
                      ? `فترة تجريبية (${protectionState.trialRemainingDays} يوم متبقي)`
                      : `30-Day Trial (${protectionState.trialRemainingDays}d remaining)`}
                  </span>
                </div>

                {/* Progress Bar */}
                <div>
                  <div className="flex justify-between text-[11px] text-slate-300 mb-1">
                    <span>
                      {language === 'ar'
                        ? `المنقضي: ${simulatedTrialDaysElapsed} يوم`
                        : `Elapsed: ${simulatedTrialDaysElapsed} Days`}
                    </span>
                    <span>
                      {language === 'ar'
                        ? `المتبقي: ${Math.max(0, 30 - simulatedTrialDaysElapsed)} من 30 يوم`
                        : `Remaining: ${Math.max(0, 30 - simulatedTrialDaysElapsed)} / 30 Days`}
                    </span>
                  </div>
                  <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all ${
                        simulatedTrialDaysElapsed >= 25 ? 'bg-rose-500' : 'bg-indigo-500'
                      }`}
                      style={{ width: `${Math.min(100, (simulatedTrialDaysElapsed / 30) * 100)}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Interactive Trial Day Slider */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                <label className="block text-xs font-bold text-slate-700">
                  {language === 'ar'
                    ? 'شريط محاكاة مرور الأيام التجريبية (من اليوم 1 إلى اليوم 30):'
                    : 'Simulate Elapsed Trial Days (Day 1 to Day 30):'}
                </label>
                <input
                  type="range"
                  min={0}
                  max={30}
                  value={simulatedTrialDaysElapsed}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    setSimulatedTrialDaysElapsed(val);
                    if (val >= 30 && !activeLicenseSerial) {
                      setIsSimulatedTrialExpired(true);
                    }
                  }}
                  className="w-full accent-indigo-600 cursor-pointer"
                />
              </div>

              {activeLicenseSerial && (
                <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 space-y-2">
                  <div className="text-xs font-black text-emerald-900">
                    {language === 'ar' ? 'السيريال المفعل حالياً على هذا الجهاز:' : 'Active Installed Serial:'}
                  </div>
                  <div className="font-mono text-xs font-bold text-emerald-800 break-all">
                    {activeLicenseSerial}
                  </div>
                  <button
                    type="button"
                    onClick={clearActiveLicense}
                    className="text-xs font-bold text-rose-600 hover:underline cursor-pointer"
                  >
                    {language === 'ar'
                      ? 'إزالة التفعيل للعودة للوضع التجريبي واختبار القفل'
                      : 'Remove License to Test Trial Lock'}
                  </button>
                </div>
              )}
            </div>

            <button
              type="button"
              data-testid="simulate-trial-expiry-btn"
              onClick={() => {
                clearActiveLicense();
                setIsSimulatedTrialExpired(true);
              }}
              className="w-full py-3 px-4 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-black text-xs shadow-lg shadow-rose-600/20 transition cursor-pointer flex items-center justify-center gap-2"
            >
              <Lock className="w-4 h-4" />
              <span>
                {language === 'ar'
                  ? 'محاكاة انتهاء الـ 30 يوماً التجريبية وإقفال النظام الآن'
                  : 'Simulate 30-Day Trial Expiry & Lock System Now'}
              </span>
            </button>
          </div>
        </div>
      )}

      {/* TAB 3: DECOUPLED STANDALONE LICENSING & CLIENT SERIAL ACTIVATION */}
      {subTab === 'keygen' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left: Decoupled Standalone Licensing Architecture Notice (7 cols) */}
          <div className="lg:col-span-7 bg-slate-900 text-white rounded-2xl border border-amber-500/40 p-6 shadow-xl flex flex-col justify-between space-y-5">
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-amber-500/15 border border-amber-500/40 flex items-center justify-center text-amber-400">
                    <KeyRound className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-base font-black text-white">
                      {language === 'ar'
                        ? 'فصل نظام التفعيل والتشفير عن النظام المحاسبي (Standalone Keygen Server)'
                        : 'Decoupled Standalone Cryptographic Licensing Server'}
                    </h2>
                    <p className="text-xs text-slate-400">
                      {language === 'ar'
                        ? 'تم عزل أداة توليد السريالات في بوابة مستقلة محمية برمز المطور السري (PIN) لمنع أي مستخدم من تفعيل النظام لنفسه.'
                        : 'Serial generation is isolated inside a PIN-protected standalone portal so end-users cannot self-activate.'}
                    </p>
                  </div>
                </div>
                <span className="text-[10px] font-mono bg-amber-500/20 text-amber-300 px-2.5 py-1 rounded border border-amber-500/30">
                  DECOUPLED DRM v4.5
                </span>
              </div>

              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2 text-xs text-slate-300 leading-relaxed">
                <div className="font-bold text-amber-400">
                  {language === 'ar'
                    ? 'قواعد الحماية الصارمة المطبقة على التراخيص:'
                    : 'Strict Cryptographic Licensing Rules:'}
                </div>
                <ul className="list-disc ps-5 space-y-1">
                  <li>
                    {language === 'ar'
                      ? 'يعمل السريال على جهاز واحد فقط (مرتبط بسيريال اللوحة الأم + المعالج + كرت الشاشة + القرص NVMe + معرف النظام).'
                      : 'Each serial is strictly bound to 5 internal hardware components of a single machine.'}
                  </li>
                  <li>
                    {language === 'ar'
                      ? 'في حال تعطل أو تغيير أي قطعة داخلية، يتوقف البرنامج مباشرة ويطالب بإعادة التفعيل.'
                      : 'If any single internal component fails or is replaced, the ERP locks immediately.'}
                  </li>
                  <li>
                    {language === 'ar'
                      ? 'حماية ضد إرجاع الوقت (Anti-Clock Rollback): لا يمكن التلاعب بتاريخ الجهاز لتشغيل البرنامج بعد انتهاء التجربة أو التفعيل.'
                      : 'Monotonic Anti-Clock Rollback prevents rolling back system time to bypass expiration.'}
                  </li>
                </ul>
              </div>
            </div>

            <button
              type="button"
              data-testid="launch-standalone-keygen-btn"
              onClick={() => setIsStandaloneKeygenOpen(true)}
              className="w-full py-3.5 px-5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-sm shadow-lg transition cursor-pointer flex items-center justify-center gap-2"
            >
              <KeyRound className="w-4 h-4" />
              <span>
                {language === 'ar'
                  ? 'فتح منصة إصدار التراخيص المستقلة (تتطلب PIN المطور: RLM-DEV-9999)'
                  : 'Launch Standalone Licensing Server (Requires Developer PIN)'}
              </span>
            </button>
          </div>

          {/* Client Activation Verifier Box (5 cols) */}
          <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-col justify-between space-y-4">
            <form onSubmit={handleApplySerial} className="space-y-4">
              <div className="border-b border-slate-100 pb-3">
                <h3 className="text-base font-black text-slate-900">
                  {language === 'ar'
                    ? 'تطبيق واختبار سيريال التفعيل على النظام'
                    : 'Apply & Verify Activation Serial'}
                </h3>
                <p className="text-xs text-slate-500">
                  {language === 'ar'
                    ? 'يتحقق النظام من التوقيع التشفيري ومطابقة بصمة الماذربورد والمعالج وتاريخ الصلاحية.'
                    : 'Verifies cryptographic signature, Motherboard/CPU binding, and expiration date.'}
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  {language === 'ar' ? 'أدخل سيريال التفعيل (RLM-ACT-...):' : 'Enter Activation Serial:'}
                </label>
                <input
                  type="text"
                  value={serialToActivate}
                  onChange={(e) => setSerialToActivate(e.target.value)}
                  placeholder="RLM-ACT-XXXXXX-XXXX-XXXXXXXX-XXXXXXXX"
                  className="w-full border border-slate-300 rounded-xl px-3.5 py-3 text-xs font-mono font-bold text-slate-900 outline-hidden focus:border-emerald-600"
                  required
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs shadow-md transition cursor-pointer flex items-center justify-center gap-2"
              >
                <Unlock className="w-4 h-4" />
                <span>
                  {language === 'ar' ? 'تفعيل السيريال على هذا الجهاز' : 'Activate Serial on This Machine'}
                </span>
              </button>
            </form>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2 text-xs text-slate-600">
              <div className="font-black text-slate-900">
                {language === 'ar'
                  ? 'كيف تعمل خوارزمية القفل على جهاز واحد؟'
                  : 'How Single-Device Binding Works:'}
              </div>
              <p className="leading-relaxed">
                {language === 'ar'
                  ? 'يتم اشتقاق بصمة 64-بت من سيريال اللوحة الأم + المعالج + كرت الشاشة + القرص الصلب، وتوقيعها بمفتاح المطور السري مع مدة الصلاحية المختارة. إذا تم تغيير أي قطعة أو نقل البرنامج لجهاز آخر، يفشل التحقق التشفيري فوراً.'
                  : 'A 64-bit digest is computed from Motherboard + CPU + GPU + Disk serials and signed with the developer master secret and duration.'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: ANTI-THEFT SOURCE CODE PROTECTION SHIELD */}
      {subTab === 'antitheft' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-base font-black text-slate-900">
                {language === 'ar'
                  ? 'درع حماية السورس كود ومنع سرقة أو فحص النظام (Anti-Theft Shield)'
                  : 'Real-Time Source Code & Anti-Theft Protection Shield'}
              </h2>
              <p className="text-xs text-slate-500">
                {language === 'ar'
                  ? 'حماية استباقية ضد فتح أدوات المطور (F12 / Inspect)، عرض السورس كود (Ctrl+U)، حفظ الصفحة (Ctrl+S)، والقائمة اليمنى.'
                  : 'Proactive runtime defense against DevTools shortcuts (F12), View Source (Ctrl+U), Save Page (Ctrl+S), and context menu inspection.'}
              </p>
            </div>

            <div className="flex items-center gap-3">
              <span className="px-3 py-1.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-black">
                {language === 'ar'
                  ? `محاولات الاختراق المحظورة: ${blockedInspectCount}`
                  : `Blocked Attempts: ${blockedInspectCount}`}
              </span>

              <button
                type="button"
                onClick={() => setAntiTheftShieldEnabled(!antiTheftShieldEnabled)}
                className={`px-4 py-2 rounded-xl text-xs font-black transition cursor-pointer ${
                  antiTheftShieldEnabled
                    ? 'bg-emerald-600 text-white'
                    : 'bg-slate-200 text-slate-700'
                }`}
              >
                {antiTheftShieldEnabled
                  ? language === 'ar'
                    ? 'الدرع الأمني: مفعل بأقصى حماية'
                    : 'Security Shield: ENABLED'
                  : language === 'ar'
                  ? 'الدرع الأمني: متوقف مؤقتاً'
                  : 'Security Shield: PAUSED'}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
              <div className="flex items-center gap-2 text-indigo-700 font-black text-xs">
                <ShieldAlert className="w-4 h-4" />
                <span>
                  {language === 'ar'
                    ? 'حظر اختصارات السورس كود (F12 / Ctrl+U)'
                    : 'DevTools & Source Shortcut Blocker'}
                </span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                {language === 'ar'
                  ? 'اعتراض فوري لأزرار F12 و Ctrl+Shift+I و Ctrl+Shift+J و Ctrl+U و Ctrl+S لمنع سحب السورس كود أو حفظ الملفات.'
                  : 'Intercepts F12, Ctrl+Shift+I/J/C, Ctrl+U, and Ctrl+S keyboard events at the window root.'}
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
              <div className="flex items-center gap-2 text-emerald-700 font-black text-xs">
                <Eye className="w-4 h-4" />
                <span>
                  {language === 'ar'
                    ? 'منع القائمة اليمنى ونسخ الأكواد (Context Menu Lock)'
                    : 'Right-Click & DOM Inspection Lock'}
                </span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                {language === 'ar'
                  ? 'تعطيل النقر بالزر الأيمن (Inspect Element) خارج الحقول النصية مع تسجيل كل محاولة في سجل الرقابة الأمني.'
                  : 'Disables right-click context menu inspection and logs unauthorized attempts.'}
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
              <div className="flex items-center gap-2 text-amber-700 font-black text-xs">
                <Clock className="w-4 h-4" />
                <span>
                  {language === 'ar'
                    ? 'حماية ضد التلاعب بساعة النظام (Anti-Clock Tamper)'
                    : 'Anti-Clock Rollback Verification'}
                </span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                {language === 'ar'
                  ? 'يمنع التحايل على الفترة التجريبية (30 يوماً) أو تاريخ انتهاء السيريال عن طريق إرجاع تاريخ الكمبيوتر للوراء.'
                  : 'Prevents bypassing the 30-day trial or license expiry by rolling back the system clock.'}
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-900 text-white">
            <div className="text-xs">
              <span className="font-black text-indigo-300">
                {language === 'ar' ? 'اختبار استجابة الدرع الأمني:' : 'Test Shield Response:'}
              </span>{' '}
              {language === 'ar'
                ? 'اضغط الزر لمحاكاة محاولة فتح السورس كود (F12 / Ctrl+U) ومشاهدة اعتراض النظام لها.'
                : 'Click to simulate an unauthorized F12/Ctrl+U source inspection attempt.'}
            </div>
            <button
              type="button"
              onClick={() => recordBlockedInspectAttempt('F12 / View-Source Simulation')}
              className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition cursor-pointer"
            >
              {language === 'ar' ? 'محاكاة محاولة سحب السورس كود' : 'Simulate Source Theft Attempt'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
