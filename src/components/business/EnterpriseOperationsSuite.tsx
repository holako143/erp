import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  Calendar,
  CheckCircle2,
  ClipboardList,
  Download,
  FileCheck2,
  Paperclip,
  Plus,
  Shield,
  UserPlus,
  Users,
  Wrench,
} from 'lucide-react';
import { useERP } from '../../context/ERPContext';
import {
  ROLE_DEFAULT_SECURITY_PROFILES,
  SecurityRoleKey,
  getDefaultProfileForRole,
} from '../../core/securityEngine';
import {
  PredictiveMaintenanceAlert,
  evaluateFleetAndMachineryMaintenance,
} from '../../core/warehouseAdvancedEngine';

export type EnterpriseSuiteTab =
  | 'EMPLOYEE_ONBOARDING'
  | 'TEAM_TASK_COLLABORATION'
  | 'PREDICTIVE_MAINTENANCE';

export interface MilestoneSubTaskAttachment {
  id: string;
  fileName: string;
  fileSizeKb: number;
  uploadedAt: string;
}

export interface MilestoneCollaborativeSubTask {
  id: string;
  projectId: string;
  milestoneTitle: string;
  subTaskTitle: string;
  assigneeName: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  status: 'TODO' | 'IN_PROGRESS' | 'DONE';
  dueDate: string;
  attachments: MilestoneSubTaskAttachment[];
}

export interface EnterpriseOperationsSuiteProps {
  initialTab?: EnterpriseSuiteTab;
}

export const EnterpriseOperationsSuite: React.FC<EnterpriseOperationsSuiteProps> = ({
  initialTab = 'EMPLOYEE_ONBOARDING',
}) => {
  const {
    employees,
    addEmployee,
    addUserAccount,
    currentBranch,
    projects,
    fleetVehicles,
    fixedAssets,
    language,
    dispatchToastAndPushNotification,
  } = useERP();

  const isAr = language === 'ar';
  const [activeTab, setActiveTab] = useState<EnterpriseSuiteTab>(initialTab);

  const showToast = (msg: string, type: 'success' | 'info' | 'warning' = 'success') => {
    dispatchToastAndPushNotification({
      titleAr: 'منظومة العمليات والمشاريع والصيانة',
      titleEn: 'Enterprise Operations Suite',
      messageAr: msg,
      messageEn: msg,
      severity: type,
      category: 'LIVE_EVENTS',
    });
  };

  // ==========================================================================
  // 1. Employee Onboarding Guided Workflow State
  // ==========================================================================
  const [onboardingStep, setOnboardingStep] = useState<1 | 2 | 3>(1);
  const [hireName, setHireName] = useState<string>('');
  const [hireRoleTitle, setHireRoleTitle] = useState<string>('محاسب مالي أول');
  const [hireDepartment, setHireDepartment] = useState<string>('الإدارة المالية');
  const [hireSalary, setHireSalary] = useState<number>(8500);
  const [hirePhone, setHirePhone] = useState<string>('0501234567');
  const [hireUsername, setHireUsername] = useState<string>('');
  const [hireSecurityRole, setHireSecurityRole] = useState<SecurityRoleKey>('ACCOUNTANT');
  const [hireAllowedModules, setHireAllowedModules] = useState<string[]>(
    () => getDefaultProfileForRole('ACCOUNTANT').defaultModules
  );
  const [uploadedDocs, setUploadedDocs] = useState<
    Array<{ docType: string; fileName: string; verified: boolean }>
  >([
    { docType: 'NATIONAL_ID', fileName: 'national_identity_card.pdf', verified: true },
    { docType: 'EMPLOYMENT_CONTRACT', fileName: 'signed_employment_contract.pdf', verified: true },
  ]);
  const [onboardedHistory, setOnboardedHistory] = useState<
    Array<{ id: string; name: string; department: string; securityRole: string; docsCount: number }>
  >([]);

  const handleSelectOnboardingRole = (role: SecurityRoleKey) => {
    setHireSecurityRole(role);
    const profile = getDefaultProfileForRole(role);
    setHireAllowedModules([...profile.defaultModules]);
  };

  const handleUploadOnboardingDoc = (docType: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const fileName = file ? file.name : `${docType.toLowerCase()}_verified.pdf`;
    setUploadedDocs((prev) => [
      ...prev.filter((d) => d.docType !== docType),
      { docType, fileName, verified: true },
    ]);
  };

  const handleCompleteOnboarding = () => {
    const finalName = hireName.trim() || (isAr ? 'موظف جديد معتمد' : 'New Onboarded Employee');
    const finalUsername =
      hireUsername.trim() ||
      `emp_${Date.now().toString().slice(-4)}`;
    const roleProfile = getDefaultProfileForRole(hireSecurityRole);

    addEmployee({
      employeeCode: `EMP-${Date.now().toString().slice(-4)}`,
      fullName: finalName,
      fullNameAr: finalName,
      position: hireRoleTitle,
      department: hireDepartment,
      basicSalary: Number(hireSalary) || 6000,
      housingAllowance: 1000,
      transportAllowance: 500,
      status: 'ACTIVE',
      joinDate: new Date().toISOString().slice(0, 10),
    });

    addUserAccount({
      username: finalUsername,
      password: '123',
      name: finalName,
      nameAr: finalName,
      email: `${finalUsername}@rlm-erp.local`,
      role:
        hireSecurityRole === 'ADMIN'
          ? 'COMPANY_ADMIN'
          : hireSecurityRole === 'VIEWER'
          ? 'SALES_REP'
          : hireSecurityRole,
      branchId: currentBranch?.id || 'BR-MAIN',
      isActive: true,
      allowedModules: hireAllowedModules as never[],
      permissions: { ...roleProfile.defaultPermissions },
    });

    setOnboardedHistory((prev) => [
      {
        id: `ONB-${Date.now().toString().slice(-4)}`,
        name: finalName,
        department: hireDepartment,
        securityRole: hireSecurityRole,
        docsCount: uploadedDocs.length,
      },
      ...prev,
    ]);

    setHireName('');
    setHireUsername('');
    setOnboardingStep(1);

    showToast(
      isAr
        ? `تم استكمال تأهيل الموظف "${finalName}" وإنشاء حسابه الأمني بصلاحية (${hireSecurityRole}) بنجاح!`
        : `Completed onboarding for "${finalName}" and provisioned security role (${hireSecurityRole})!`,
      'success'
    );
  };

  // ==========================================================================
  // 2. Team Task Collaboration (Project Milestones, Sub-Tasks, Priority, Files)
  // ==========================================================================
  const [subTasks, setSubTasks] = useState<MilestoneCollaborativeSubTask[]>(() => [
    {
      id: 'task-101',
      projectId: projects[0]?.id || 'PRJ-01',
      milestoneTitle: isAr ? 'المرحلة الأولى: البنية التحتية والربط السحابي' : 'Milestone 1: Core Infrastructure',
      subTaskTitle: isAr
        ? 'مراجعة واعتماد مخطط قاعدة البيانات المالية وربط الفروع'
        : 'Verify financial schema & multi-branch sync rules',
      assigneeName: employees[0]?.fullNameAr || employees[0]?.fullName || 'م. طارق المنصور',
      priority: 'CRITICAL',
      status: 'IN_PROGRESS',
      dueDate: new Date(Date.now() + 3 * 86_400_000).toISOString().slice(0, 10),
      attachments: [
        {
          id: 'att-1',
          fileName: 'architecture_blueprint_v2.pdf',
          fileSizeKb: 420,
          uploadedAt: new Date().toISOString().slice(0, 10),
        },
      ],
    },
    {
      id: 'task-102',
      projectId: projects[0]?.id || 'PRJ-01',
      milestoneTitle: isAr ? 'المرحلة الثانية: اختبار قبول المستخدمين (UAT)' : 'Milestone 2: User Acceptance Testing',
      subTaskTitle: isAr
        ? 'اختبار دورة الفوترة الضريبية والباركود مع فريق المستودع'
        : 'Execute E2E barcode & ZATCA billing verification',
      assigneeName: employees[1]?.fullNameAr || employees[1]?.fullName || 'سارة العلي',
      priority: 'HIGH',
      status: 'TODO',
      dueDate: new Date(Date.now() + 7 * 86_400_000).toISOString().slice(0, 10),
      attachments: [],
    },
  ]);

  const [newMilestoneTitle, setNewMilestoneTitle] = useState<string>(
    isAr ? 'المرحلة التنفيذية: التسليم النهائي' : 'Milestone 3: Final Delivery'
  );
  const [newSubTaskTitle, setNewSubTaskTitle] = useState<string>('');
  const [newTaskAssignee, setNewTaskAssignee] = useState<string>(
    employees[0]?.fullNameAr || employees[0]?.fullName || 'أحمد المحمد'
  );
  const [newTaskPriority, setNewTaskPriority] =
    useState<MilestoneCollaborativeSubTask['priority']>('HIGH');
  const [newTaskAttachmentName, setNewTaskAttachmentName] = useState<string>('');

  const handleAddCollaborativeSubTask = () => {
    if (!newSubTaskTitle.trim()) return;
    const created: MilestoneCollaborativeSubTask = {
      id: `task-${Date.now()}`,
      projectId: projects[0]?.id || 'PRJ-01',
      milestoneTitle: newMilestoneTitle,
      subTaskTitle: newSubTaskTitle.trim(),
      assigneeName: newTaskAssignee,
      priority: newTaskPriority,
      status: 'TODO',
      dueDate: new Date(Date.now() + 5 * 86_400_000).toISOString().slice(0, 10),
      attachments: newTaskAttachmentName.trim()
        ? [
            {
              id: `att-${Date.now()}`,
              fileName: newTaskAttachmentName.trim(),
              fileSizeKb: 256,
              uploadedAt: new Date().toISOString().slice(0, 10),
            },
          ]
        : [],
    };
    setSubTasks((prev) => [created, ...prev]);
    setNewSubTaskTitle('');
    setNewTaskAttachmentName('');
    showToast(
      isAr
        ? `تم إسناد المهمة الفرعية إلى "${created.assigneeName}" بأولوية (${created.priority})`
        : `Assigned sub-task to "${created.assigneeName}" (${created.priority})`,
      'success'
    );
  };

  const handleAttachFileToSubTask = (
    taskId: string,
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSubTasks((prev) =>
      prev.map((t) =>
        t.id === taskId
          ? {
              ...t,
              attachments: [
                ...t.attachments,
                {
                  id: `att-${Date.now()}`,
                  fileName: file.name,
                  fileSizeKb: Math.max(12, Math.round(file.size / 1024)),
                  uploadedAt: new Date().toISOString().slice(0, 10),
                },
              ],
            }
          : t
      )
    );
    showToast(
      isAr ? `تم إرفاق الملف "${file.name}" بالمهمة بنجاح` : `Attached "${file.name}" to sub-task`,
      'info'
    );
  };

  // ==========================================================================
  // 3. Predictive Maintenance Module (Fleet & Machinery Usage Analysis)
  // ==========================================================================
  const maintenanceAlerts = useMemo(
    () => evaluateFleetAndMachineryMaintenance(fleetVehicles, fixedAssets),
    [fleetVehicles, fixedAssets]
  );
  const [scheduledCalendarIds, setScheduledCalendarIds] = useState<string[]>([]);

  const handleIssueMaintenanceCalendarEvent = (alert: PredictiveMaintenanceAlert) => {
    setScheduledCalendarIds((prev) =>
      prev.includes(alert.alertId) ? prev : [...prev, alert.alertId]
    );
    if (typeof document !== 'undefined') {
      const blob = new Blob([alert.icsCalendarPayload], { type: 'text/calendar;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `maintenance-${alert.assetCode}.ics`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
    showToast(
      isAr
        ? `تم إصدار تنبيه "صيانة مستحقة" وجدولة حدث التقويم لفريق الصيانة للأصل [${alert.assetCode}]`
        : `Issued 'Maintenance Due' alert & calendar event for [${alert.assetCode}]`,
      'success'
    );
  };

  return (
    <section
      data-testid="enterprise-operations-suite"
      className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-4 sm:p-5 space-y-4"
    >
      {/* Top Switcher */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            data-testid="ops-tab-onboarding"
            onClick={() => setActiveTab('EMPLOYEE_ONBOARDING')}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
              activeTab === 'EMPLOYEE_ONBOARDING'
                ? 'bg-blue-600 text-white shadow-2xs'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
            }`}
          >
            <UserPlus className="w-4 h-4" />
            <span>{isAr ? 'تأهيل الموظفين الجدد (Employee Onboarding)' : 'Employee Onboarding'}</span>
          </button>

          <button
            type="button"
            data-testid="ops-tab-team-tasks"
            onClick={() => setActiveTab('TEAM_TASK_COLLABORATION')}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
              activeTab === 'TEAM_TASK_COLLABORATION'
                ? 'bg-blue-600 text-white shadow-2xs'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>{isAr ? 'تعاون المهام والمشاريع (Team Task Collaboration)' : 'Team Task Collaboration'}</span>
          </button>

          <button
            type="button"
            data-testid="ops-tab-predictive-maintenance"
            onClick={() => setActiveTab('PREDICTIVE_MAINTENANCE')}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
              activeTab === 'PREDICTIVE_MAINTENANCE'
                ? 'bg-blue-600 text-white shadow-2xs'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
            }`}
          >
            <Wrench className="w-4 h-4" />
            <span>{isAr ? 'الصيانة التنبؤية للأسطول والمعدات (Predictive Maintenance)' : 'Predictive Maintenance'}</span>
          </button>
        </div>
      </div>

      {/* 1. EMPLOYEE ONBOARDING GUIDED WORKFLOW */}
      {activeTab === 'EMPLOYEE_ONBOARDING' && (
        <div
          data-testid="employee-onboarding-workflow"
          className="space-y-4"
        >
          {/* Step Progress Bar */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { step: 1 as const, ar: '1. البيانات الوظيفية والعقد', en: '1. New Hire Profile' },
              { step: 2 as const, ar: '2. رفع الوثائق الأساسية', en: '2. Essential Documents' },
              { step: 3 as const, ar: '3. الدور الأمني وصلاحيات النظام', en: '3. Initial Security Permissions' },
            ].map((s) => (
              <button
                key={s.step}
                type="button"
                data-testid={`onboarding-step-btn-${s.step}`}
                onClick={() => setOnboardingStep(s.step)}
                className={`p-3 rounded-xl border text-start transition cursor-pointer ${
                  onboardingStep === s.step
                    ? 'border-blue-600 bg-blue-50/70 dark:bg-blue-950/30 font-bold text-blue-700 dark:text-blue-300'
                    : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                }`}
              >
                <div className="text-xs font-bold">{isAr ? s.ar : s.en}</div>
              </button>
            ))}
          </div>

          {onboardingStep === 1 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 p-4 rounded-xl bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                  {isAr ? 'الاسم الكامل للموظف الجديد' : 'Full Name'}
                </label>
                <input
                  type="text"
                  data-testid="onboarding-name-input"
                  placeholder={isAr ? 'مثال: عبد العزيز الشمري' : 'e.g. Abdulaziz Al-Shammari'}
                  value={hireName}
                  onChange={(e) => setHireName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                  {isAr ? 'المسمى الوظيفي' : 'Job Title'}
                </label>
                <input
                  type="text"
                  value={hireRoleTitle}
                  onChange={(e) => setHireRoleTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                  {isAr ? 'القسم / الإدارة' : 'Department'}
                </label>
                <input
                  type="text"
                  value={hireDepartment}
                  onChange={(e) => setHireDepartment(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                  {isAr ? 'الراتب الأساسي' : 'Base Salary'}
                </label>
                <input
                  type="number"
                  value={hireSalary}
                  onChange={(e) => setHireSalary(Number(e.target.value) || 0)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-mono"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                  {isAr ? 'اسم المستخدم للنظام' : 'System Username'}
                </label>
                <input
                  type="text"
                  placeholder="emp_username"
                  value={hireUsername}
                  onChange={(e) => setHireUsername(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-mono"
                />
              </div>

              <div className="flex items-end">
                <button
                  type="button"
                  onClick={() => setOnboardingStep(2)}
                  className="w-full py-2 px-4 rounded-lg bg-blue-600 text-white text-xs font-bold cursor-pointer"
                >
                  {isAr ? 'التالي: رفع الوثائق الرسمية ←' : 'Next: Upload Documents →'}
                </button>
              </div>
            </div>
          )}

          {onboardingStep === 2 && (
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800 space-y-3">
              <h5 className="text-xs font-bold text-slate-900 dark:text-slate-100">
                {isAr
                  ? 'رفع ومطابقة المسوغات والوثائق الأساسية للموظف'
                  : 'Upload Essential Onboarding Documents'}
              </h5>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {[
                  { key: 'NATIONAL_ID', ar: 'بطاقة الهوية / الإقامة', en: 'National ID / Iqama' },
                  { key: 'EMPLOYMENT_CONTRACT', ar: 'عقد العمل الموقع', en: 'Signed Employment Contract' },
                  { key: 'ACADEMIC_DEGREE', ar: 'المؤهل العلمي والشهادات المهنية', en: 'Academic & Professional Certificates' },
                ].map((docSpec) => {
                  const existing = uploadedDocs.find((d) => d.docType === docSpec.key);
                  return (
                    <div
                      key={docSpec.key}
                      className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold">{isAr ? docSpec.ar : docSpec.en}</span>
                        {existing && <FileCheck2 className="w-4 h-4 text-emerald-600" />}
                      </div>
                      <div className="text-[11px] font-mono text-slate-500 truncate">
                        {existing ? existing.fileName : isAr ? 'لم يتم الرفع بعد' : 'Pending upload'}
                      </div>
                      <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-xs font-semibold cursor-pointer">
                        <Paperclip className="w-3.5 h-3.5 text-blue-600" />
                        <span>{isAr ? 'إرفاق وثيقة' : 'Upload File'}</span>
                        <input
                          type="file"
                          onChange={(e) => handleUploadOnboardingDoc(docSpec.key, e)}
                          className="hidden"
                        />
                      </label>
                    </div>
                  );
                })}
              </div>
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => setOnboardingStep(3)}
                  className="py-2 px-4 rounded-lg bg-blue-600 text-white text-xs font-bold cursor-pointer"
                >
                  {isAr ? 'التالي: إعداد الصلاحيات الأمنية ←' : 'Next: Security Permissions →'}
                </button>
              </div>
            </div>
          )}

          {onboardingStep === 3 && (
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h5 className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                  <Shield className="w-4 h-4 text-blue-600" />
                  <span>
                    {isAr
                      ? 'تعيين الدور الأمني الأولي والوحدات المسموح بها (RBAC Setup)'
                      : 'Assign Initial Security Role & Allowed Modules'}
                  </span>
                </h5>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {(Object.keys(ROLE_DEFAULT_SECURITY_PROFILES) as SecurityRoleKey[]).map((rKey) => {
                  const prof = ROLE_DEFAULT_SECURITY_PROFILES[rKey];
                  return (
                    <button
                      key={rKey}
                      type="button"
                      onClick={() => handleSelectOnboardingRole(rKey)}
                      className={`p-2.5 rounded-xl border text-start text-xs cursor-pointer ${
                        hireSecurityRole === rKey
                          ? 'border-blue-600 bg-blue-600 text-white font-bold'
                          : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900'
                      }`}
                    >
                      <div>{isAr ? prof.labelAr : prof.labelEn}</div>
                      <div className="text-[10px] opacity-80 font-mono mt-0.5">
                        {prof.defaultModules.length} modules
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="flex items-center justify-between pt-2">
                <span className="text-xs text-slate-500">
                  {isAr
                    ? `سيتم تفعيل ${hireAllowedModules.length} وحدة نظام تلقائياً لهذا الموظف.`
                    : `${hireAllowedModules.length} ERP modules will be provisioned for this account.`}
                </span>
                <button
                  type="button"
                  data-testid="complete-onboarding-submit-btn"
                  onClick={handleCompleteOnboarding}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>
                    {isAr
                      ? 'اعتماد تعيين الموظف وتفعيل حسابه الأمني'
                      : 'Complete Onboarding & Provision Account'}
                  </span>
                </button>
              </div>
            </div>
          )}

          {onboardedHistory.length > 0 && (
            <div className="space-y-1.5">
              {onboardedHistory.map((item) => (
                <div
                  key={item.id}
                  data-testid={`onboarded-employee-record-${item.id}`}
                  className="flex items-center justify-between px-3.5 py-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 text-xs"
                >
                  <span className="font-bold text-emerald-900 dark:text-emerald-200">
                    ✓ {item.name} — {item.department}
                  </span>
                  <span className="font-mono text-emerald-700 dark:text-emerald-400">
                    Role: {item.securityRole} ({item.docsCount} docs verified)
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 2. TEAM TASK COLLABORATION (PROJECT MILESTONES, SUB-TASKS, PRIORITY, FILES) */}
      {activeTab === 'TEAM_TASK_COLLABORATION' && (
        <div
          data-testid="team-task-collaboration-panel"
          className="space-y-4"
        >
          <div className="grid grid-cols-1 md:grid-cols-5 gap-2.5 p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800">
            <input
              type="text"
              placeholder={isAr ? 'المرحلة (Milestone)...' : 'Project Milestone...'}
              value={newMilestoneTitle}
              onChange={(e) => setNewMilestoneTitle(e.target.value)}
              className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold"
            />
            <input
              type="text"
              data-testid="collab-subtask-title-input"
              placeholder={isAr ? 'عنوان المهمة الفرعية...' : 'Sub-task description...'}
              value={newSubTaskTitle}
              onChange={(e) => setNewSubTaskTitle(e.target.value)}
              className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
            />
            <input
              type="text"
              placeholder={isAr ? 'الموظف المسؤول...' : 'Assignee...'}
              value={newTaskAssignee}
              onChange={(e) => setNewTaskAssignee(e.target.value)}
              className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
            />
            <select
              data-testid="collab-subtask-priority-select"
              value={newTaskPriority}
              onChange={(e) =>
                setNewTaskPriority(e.target.value as MilestoneCollaborativeSubTask['priority'])
              }
              className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-bold"
            >
              <option value="LOW">LOW</option>
              <option value="MEDIUM">MEDIUM</option>
              <option value="HIGH">HIGH</option>
              <option value="CRITICAL">CRITICAL</option>
            </select>
            <button
              type="button"
              data-testid="collab-add-subtask-btn"
              onClick={handleAddCollaborativeSubTask}
              className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>{isAr ? 'إسناد مهمة فرعية' : 'Assign Sub-Task'}</span>
            </button>
          </div>

          <div className="space-y-2.5">
            {subTasks.map((task) => (
              <div
                key={task.id}
                data-testid={`collab-subtask-card-${task.id}`}
                className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                        task.priority === 'CRITICAL'
                          ? 'bg-red-100 text-red-800'
                          : task.priority === 'HIGH'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-blue-100 text-blue-800'
                      }`}
                    >
                      {task.priority}
                    </span>
                    <span className="text-[11px] font-bold text-blue-600">
                      {task.milestoneTitle}
                    </span>
                    <span className="text-[11px] text-slate-400">·</span>
                    <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      👤 {task.assigneeName}
                    </span>
                  </div>
                  <div className="text-sm font-bold text-slate-900 dark:text-slate-100">
                    {task.subTaskTitle}
                  </div>
                  {task.attachments.length > 0 && (
                    <div className="flex flex-wrap items-center gap-1.5 pt-1">
                      {task.attachments.map((att) => (
                        <span
                          key={att.id}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[10.5px] font-mono text-slate-700 dark:text-slate-300"
                        >
                          <Paperclip className="w-3 h-3 text-blue-600" />
                          {att.fileName} ({att.fileSizeKb} KB)
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <label className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-semibold cursor-pointer">
                    <Paperclip className="w-3.5 h-3.5 text-blue-600" />
                    <span>{isAr ? 'إرفاق ملف' : 'Attach File'}</span>
                    <input
                      type="file"
                      onChange={(e) => handleAttachFileToSubTask(task.id, e)}
                      className="hidden"
                    />
                  </label>

                  <button
                    type="button"
                    onClick={() =>
                      setSubTasks((prev) =>
                        prev.map((t) =>
                          t.id === task.id
                            ? {
                                ...t,
                                status: t.status === 'DONE' ? 'IN_PROGRESS' : 'DONE',
                              }
                            : t
                        )
                      )
                    }
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer ${
                      task.status === 'DONE'
                        ? 'bg-emerald-600 text-white'
                        : 'bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200'
                    }`}
                  >
                    {task.status === 'DONE'
                      ? isAr
                        ? '✓ مكتملة'
                        : '✓ Done'
                      : isAr
                      ? 'إنجاز المهمة'
                      : 'Mark Done'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 3. PREDICTIVE MAINTENANCE MODULE */}
      {activeTab === 'PREDICTIVE_MAINTENANCE' && (
        <div
          data-testid="predictive-maintenance-module"
          className="space-y-4"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                <Wrench className="w-4 h-4 text-amber-500" />
                <span>
                  {isAr
                    ? 'محرك الصيانة التنبؤية لتحليل سجلات تشغيل الأسطول والمعدات (Predictive Maintenance)'
                    : 'Predictive Maintenance Engine (Fleet & Machinery Usage Telemetry)'}
                </span>
              </h4>
              <p className="text-xs text-slate-500">
                {isAr
                  ? 'يحلل عدادات المسافات وساعات التشغيل لجدولة فترات الصيانة وإصدار تنبيهات وأحداث تقويم تلقائية لفريق الصيانة'
                  : 'Analyzes odometer & operating hour logs to schedule service intervals and issue automatic Maintenance Due alerts & calendar events'}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {maintenanceAlerts.map((alert) => {
              const isCalendarScheduled = scheduledCalendarIds.includes(alert.alertId);
              return (
                <div
                  key={alert.alertId}
                  data-testid={`pred-maint-card-${alert.assetCode}`}
                  className={`p-4 rounded-xl border space-y-2.5 ${
                    alert.urgency === 'MAINTENANCE_DUE_NOW'
                      ? 'border-red-300 dark:border-red-800 bg-red-50/40 dark:bg-red-950/20'
                      : 'border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-950/40'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                      {isAr ? alert.assetNameAr : alert.assetNameEn}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded font-mono text-[10px] font-bold ${
                        alert.urgency === 'MAINTENANCE_DUE_NOW'
                          ? 'bg-red-600 text-white'
                          : alert.urgency === 'UPCOMING_SOON'
                          ? 'bg-amber-500 text-white'
                          : 'bg-emerald-600 text-white'
                      }`}
                    >
                      {alert.urgency === 'MAINTENANCE_DUE_NOW'
                        ? '⚠ MAINTENANCE DUE'
                        : alert.urgency}
                    </span>
                  </div>

                  <div className="text-xs font-mono text-slate-600 dark:text-slate-400">
                    Usage: {alert.currentUsageMetric.toLocaleString()} /{' '}
                    {alert.serviceThresholdMetric.toLocaleString()} {alert.metricUnit} (
                    {alert.usageRatioPct}%) · Due: {alert.predictedServiceDateIso}
                  </div>

                  <p className="text-xs text-slate-700 dark:text-slate-300">
                    {isAr ? alert.recommendedTaskAr : alert.recommendedTaskEn}
                  </p>

                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[11px] text-slate-500">{alert.assignedTeam}</span>
                    <button
                      type="button"
                      data-testid={`pred-maint-calendar-btn-${alert.assetCode}`}
                      onClick={() => handleIssueMaintenanceCalendarEvent(alert)}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer ${
                        isCalendarScheduled
                          ? 'bg-emerald-600 text-white'
                          : 'bg-blue-600 hover:bg-blue-700 text-white'
                      }`}
                    >
                      <Calendar className="w-3.5 h-3.5" />
                      <span>
                        {isCalendarScheduled
                          ? isAr
                            ? '✓ تم إرسال حدث التقويم (.ics)'
                            : '✓ Calendar Event Issued'
                          : isAr
                          ? 'إصدار تنبيه وحدث تقويم (.ics)'
                          : 'Issue Alert & Calendar Event'}
                      </span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
};

export default EnterpriseOperationsSuite;
