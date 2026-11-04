import React, { useState } from 'react';
import { useERP } from '../context/ERPContext';
import {
  Briefcase,
  Users,
  Factory,
  FolderGit2,
  Truck,
  CheckCheck,
  Wrench,
  Target,
  ShoppingBag,
  GitPullRequest,
  ArrowRight,
  CheckCircle2,
  XCircle,
  Plus,
  Calculator,
  Banknote,
  Play,
  FileSpreadsheet,
} from 'lucide-react';

export const BusinessModulesView: React.FC = () => {
  const {
    employees,
    addEmployee,
    runMonthlyPayroll,
    fixedAssets,
    addFixedAsset,
    runAssetDepreciationCycle,
    boms,
    productionOrders,
    addProductionOrder,
    advanceProductionOrder,
    projects,
    addProject,
    advanceProjectProgress,
    fleetVehicles,
    addFleetVehicle,
    cycleFleetVehicleStatus,
    qualityInspections,
    addQualityInspection,
    crmLeads,
    addCRMLead,
    advanceLeadStage,
    ecommerceOrders,
    advanceEcommerceOrder,
    workflowApprovals,
    decideWorkflowApproval,
    currency,
    language,
  } = useERP();

  const [activeSubModule, setActiveSubModule] = useState<
    'hr' | 'crm' | 'ecommerce' | 'workflows' | 'assets' | 'mfg' | 'projects' | 'fleet' | 'quality'
  >('hr');

  const [statusBanner, setStatusBanner] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setStatusBanner(msg);
    setTimeout(() => {
      setStatusBanner((curr) => (curr === msg ? null : curr));
    }, 4500);
  };

  // 1. HR New Employee State
  const [showEmpForm, setShowEmpForm] = useState(false);
  const [empNameAr, setEmpNameAr] = useState('');
  const [empDepartment, setEmpDepartment] = useState('الإدارة المالية');
  const [empPosition, setEmpPosition] = useState('محاسب تكاليف');
  const [empBasic, setEmpBasic] = useState(8500);
  const [empHousing, setEmpHousing] = useState(2125);
  const [empTransport, setEmpTransport] = useState(850);

  // 2. CRM New Lead State
  const [showLeadForm, setShowLeadForm] = useState(false);
  const [leadNameAr, setLeadNameAr] = useState('');
  const [leadCompany, setLeadCompany] = useState('');
  const [leadPhone, setLeadPhone] = useState('+966 55 ');
  const [leadValue, setLeadValue] = useState(45000);

  // 5. Fixed Assets New Asset State
  const [showAssetForm, setShowAssetForm] = useState(false);
  const [assetNameAr, setAssetNameAr] = useState('');
  const [assetCategory, setAssetCategory] = useState('معدات وآلات صناعية');
  const [assetCost, setAssetCost] = useState(60000);
  const [assetSalvage, setAssetSalvage] = useState(5000);
  const [assetLife, setAssetLife] = useState(5);

  // 6. Manufacturing New Production Order State
  const [showMOForm, setShowMOForm] = useState(false);
  const [moProductName, setMoProductName] = useState(
    boms[0]?.finishedProductName || 'وحدة تكييف صناعي مركزي 20 طن'
  );
  const [moTargetQty, setMoTargetQty] = useState(20);

  // 7. Projects New Project State
  const [showProjectForm, setShowProjectForm] = useState(false);
  const [prjNameAr, setPrjNameAr] = useState('');
  const [prjBudget, setPrjBudget] = useState(250000);

  // 8. Fleet New Vehicle State
  const [showFleetForm, setShowFleetForm] = useState(false);
  const [vehPlate, setVehPlate] = useState('أ ب ج - 8821');
  const [vehModel, setVehModel] = useState('شاحنة إيسوزو مبردة 5 طن 2025');
  const [vehDriver, setVehDriver] = useState('سالم الدوسري');

  // 9. Quality Inspection New Ticket State
  const [showQCForm, setShowQCForm] = useState(false);
  const [qcRefDoc, setQcRefDoc] = useState('PO-2026-4410');
  const [qcSampleSize, setQcSampleSize] = useState(50);
  const [qcDefects, setQcDefects] = useState(0);

  const handleAddEmployee = (e: React.FormEvent) => {
    e.preventDefault();
    if (!empNameAr.trim()) return;
    addEmployee({
      employeeCode: `EMP-${100 + employees.length + 1}`,
      fullName: empNameAr.trim(),
      fullNameAr: empNameAr.trim(),
      department: empDepartment,
      position: empPosition,
      basicSalary: Number(empBasic) || 5000,
      housingAllowance: Number(empHousing) || 1250,
      transportAllowance: Number(empTransport) || 500,
      joinDate: new Date().toISOString().slice(0, 10),
      status: 'ACTIVE',
    });
    setEmpNameAr('');
    setShowEmpForm(false);
    showToast('تم تسجيل الموظف الجديد وإضافته لمسير الرواتب بنجاح');
  };

  const handlePayrollRun = () => {
    const monthLabel = new Date().toLocaleDateString('ar-SA', { month: 'long', year: 'numeric' });
    const res = runMonthlyPayroll(monthLabel);
    showToast(
      `تم اعتماد وصرف مسير رواتب (${res.employeesPaid} موظف) بإجمالي ${res.totalPayroll.toLocaleString()} ${currency} وترحيل القيد المالي المتوازن تلقائياً!`
    );
  };

  const handleAddLead = (e: React.FormEvent) => {
    e.preventDefault();
    if (!leadNameAr.trim()) return;
    addCRMLead({
      leadName: leadNameAr.trim(),
      leadNameAr: leadNameAr.trim(),
      company: leadCompany.trim() || 'شركة أعمال رائدة',
      contactPerson: leadNameAr.trim(),
      phone: leadPhone,
      email: 'deals@enterprise.sa',
      source: 'Direct B2B Inquiry',
      estimatedValue: Number(leadValue) || 25000,
      probability: 40,
      stage: 'NEW_LEAD',
      assignedTo: 'Sales Team',
    });
    setLeadNameAr('');
    setLeadCompany('');
    setShowLeadForm(false);
    showToast('تمت إضافة فرصة المبيعات الجديدة إلى خط أنابيب CRM');
  };

  const handleAddAsset = (e: React.FormEvent) => {
    e.preventDefault();
    if (!assetNameAr.trim()) return;
    const cost = Number(assetCost) || 50000;
    addFixedAsset({
      assetCode: `AST-0${fixedAssets.length + 1}`,
      name: assetNameAr.trim(),
      nameAr: assetNameAr.trim(),
      category: assetCategory,
      purchaseDate: new Date().toISOString().slice(0, 10),
      purchaseCost: cost,
      salvageValue: Number(assetSalvage) || 0,
      usefulLifeYears: Number(assetLife) || 5,
      accumulatedDepreciation: 0,
      currentBookValue: cost,
      location: 'الفرع الرئيسي - الرياض',
    });
    setAssetNameAr('');
    setShowAssetForm(false);
    showToast('تم تسجيل الأصل الثابت الجديد في سجل الأصول وجدول الإهلاك');
  };

  const handleRunDepreciation = () => {
    const res = runAssetDepreciationCycle();
    showToast(
      `تم احتساب قسط الإهلاك الدوري لـ (${res.assetsCount}) أصل ثابت بإجمالي ${res.totalDepreciated.toLocaleString()} ${currency} وترحيل قيد الإهلاك للمحاسبة!`
    );
  };

  const handleAddMO = (e: React.FormEvent) => {
    e.preventDefault();
    addProductionOrder({
      bomId: boms[0]?.id || 'bom-1',
      finishedProductName: moProductName,
      targetQuantity: Number(moTargetQty) || 10,
      completedQuantity: 0,
      startDate: new Date().toISOString().slice(0, 10),
      dueDate: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
      status: 'IN_PRODUCTION',
    });
    setShowMOForm(false);
    showToast('تم فتح أمر تصنيع وإنتاج جديد وربطه بقائمة المواد BOM');
  };

  const handleAddProject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!prjNameAr.trim()) return;
    addProject({
      code: `PRJ-2026-0${projects.length + 1}`,
      name: prjNameAr.trim(),
      nameAr: prjNameAr.trim(),
      budget: Number(prjBudget) || 150000,
      spentCost: 0,
      startDate: new Date().toISOString().slice(0, 10),
      endDate: new Date(Date.now() + 90 * 86400000).toISOString().slice(0, 10),
      progressPercent: 10,
      status: 'IN_PROGRESS',
    });
    setPrjNameAr('');
    setShowProjectForm(false);
    showToast('تم إنشاء المشروع الهندسي الجديد وفتح مركز التكلفة الخاص به');
  };

  const handleAddVehicle = (e: React.FormEvent) => {
    e.preventDefault();
    if (!vehPlate.trim()) return;
    addFleetVehicle({
      plateNumber: vehPlate.trim(),
      model: vehModel.trim(),
      driverName: vehDriver.trim(),
      fuelCapacity: 140,
      mileageKm: 12500,
      status: 'AVAILABLE',
    });
    setShowFleetForm(false);
    showToast('تمت إضافة المركبة الجديدة إلى أسطول النقل والإمداد اللوجستي');
  };

  const handleAddQC = (e: React.FormEvent) => {
    e.preventDefault();
    addQualityInspection({
      type: 'FINAL_PRODUCT',
      referenceDoc: qcRefDoc,
      sampleSize: Number(qcSampleSize) || 50,
      defectsCount: Number(qcDefects) || 0,
      status: Number(qcDefects) > 2 ? 'CONDITIONAL' : 'PASSED',
      inspector: 'م. فهد العتيبي (توكيد الجودة)',
      date: new Date().toISOString().slice(0, 10),
    });
    setShowQCForm(false);
    showToast('تم إصدار شهادة فحص وتوكيد الجودة (QC Inspection) بنجاح');
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Briefcase className="w-6 h-6 text-amber-600" />
            <span>
              {language === 'ar'
                ? 'وحدات الأعمال والعمليات المتخصصة (9 أنظمة تفاعلية)'
                : 'Specialized Operations Modules (9 Interactive Suites)'}
            </span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            {language === 'ar'
              ? 'الموارد البشرية والرواتب، CRM، المتجر الإلكتروني، الاعتمادات، الأصول والإهلاك، التصنيع وBOM، المشاريع، الأسطول، وتوكيد الجودة'
              : 'HR & Payroll, CRM Pipeline, E-Commerce, Workflows, Fixed Assets, Manufacturing BOM, Projects, Fleet, and QC'}
          </p>
        </div>
      </div>

      {statusBanner && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs font-bold flex items-center justify-between shadow-2xs">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{statusBanner}</span>
          </div>
          <button
            type="button"
            onClick={() => setStatusBanner(null)}
            className="text-emerald-700 hover:text-emerald-950 font-black px-2 cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* Sub-module Selector Bar */}
      <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs font-bold text-slate-700 overflow-x-auto">
        {[
          { id: 'hr', labelAr: 'الموارد البشرية والرواتب', labelEn: 'HR & Payroll', icon: Users },
          { id: 'crm', labelAr: 'إدارة علاقات العملاء CRM', labelEn: 'CRM Pipeline', icon: Target },
          { id: 'ecommerce', labelAr: 'المتجر الإلكتروني والطلبات', labelEn: 'E-Commerce Orders', icon: ShoppingBag },
          { id: 'workflows', labelAr: 'سير العمل والاعتمادات', labelEn: 'Workflow Approvals', icon: GitPullRequest },
          { id: 'assets', labelAr: 'الأصول الثابتة والإهلاك', labelEn: 'Assets & Deprec.', icon: Wrench },
          { id: 'mfg', labelAr: 'التصنيع وقوائم المواد BOM', labelEn: 'Manufacturing BOM', icon: Factory },
          { id: 'projects', labelAr: 'إدارة المشاريع والتكاليف', labelEn: 'Projects', icon: FolderGit2 },
          { id: 'fleet', labelAr: 'الأسطول والنقل اللوجستي', labelEn: 'Fleet & Logistics', icon: Truck },
          { id: 'quality', labelAr: 'إدارة الجودة QC', labelEn: 'Quality Control', icon: CheckCheck },
        ].map((mod) => {
          const Icon = mod.icon;
          const isAct = activeSubModule === mod.id;
          return (
            <button
              key={mod.id}
              type="button"
              data-testid={`biz-tab-${mod.id}`}
              onClick={() => setActiveSubModule(mod.id as any)}
              className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 whitespace-nowrap transition cursor-pointer ${
                isAct ? 'bg-white text-amber-700 shadow-2xs' : 'hover:text-slate-900'
              }`}
            >
              <Icon className={`w-3.5 h-3.5 ${isAct ? 'text-amber-600' : 'text-slate-400'}`} />
              <span>{language === 'ar' ? mod.labelAr : mod.labelEn}</span>
            </button>
          );
        })}
      </div>

      {/* 1. HR & Payroll */}
      {activeSubModule === 'hr' && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="font-bold text-slate-800 text-sm">
                  {language === 'ar' ? 'سجل الموظفين ومسيرات الرواتب الشهرية (WPS)' : 'Employees & Payroll Register'}
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  إجمالي مسير الرواتب الشهري:{' '}
                  <strong className="font-mono text-slate-900">
                    {employees
                      .reduce((s, e) => s + e.basicSalary + e.housingAllowance + e.transportAllowance, 0)
                      .toLocaleString()}{' '}
                    {currency}
                  </strong>
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  data-testid="run-payroll-btn"
                  onClick={handlePayrollRun}
                  className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-2xs transition cursor-pointer"
                >
                  <Banknote className="w-4 h-4" />
                  <span>{language === 'ar' ? 'اعتماد وصرف مسير الرواتب وترحيله للمحاسبة' : 'Run & Post Monthly Payroll'}</span>
                </button>
                <button
                  type="button"
                  data-testid="open-add-employee-btn"
                  onClick={() => setShowEmpForm(!showEmpForm)}
                  className="px-3.5 py-2 bg-slate-900 hover:bg-indigo-600 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>{language === 'ar' ? 'إضافة موظف جديد' : 'Add Employee'}</span>
                </button>
              </div>
            </div>

            {showEmpForm && (
              <form
                onSubmit={handleAddEmployee}
                className="p-4 bg-slate-50 border-b border-slate-200 grid grid-cols-1 sm:grid-cols-6 gap-3 text-xs items-end"
              >
                <div className="sm:col-span-2">
                  <label className="block font-bold text-slate-700 mb-1">اسم الموظف الكامل</label>
                  <input
                    type="text"
                    required
                    value={empNameAr}
                    onChange={(e) => setEmpNameAr(e.target.value)}
                    placeholder="مثال: م. عبدالرحمن الشهري"
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">القسم</label>
                  <input
                    type="text"
                    value={empDepartment}
                    onChange={(e) => setEmpDepartment(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">المسمى الوظيفي</label>
                  <input
                    type="text"
                    value={empPosition}
                    onChange={(e) => setEmpPosition(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">الراتب الأساسي</label>
                  <input
                    type="number"
                    value={empBasic}
                    onChange={(e) => setEmpBasic(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg font-mono"
                  />
                </div>
                <button
                  type="submit"
                  className="py-2 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg cursor-pointer"
                >
                  حفظ الموظف
                </button>
              </form>
            )}

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-start">
                <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-4 text-start">{language === 'ar' ? 'الكود / الموظف' : 'Code / Employee'}</th>
                    <th className="py-2.5 px-4 text-start">{language === 'ar' ? 'القسم / المسمى' : 'Department & Position'}</th>
                    <th className="py-2.5 px-4 text-end">{language === 'ar' ? 'الراتب الأساسي' : 'Basic Salary'}</th>
                    <th className="py-2.5 px-4 text-end">{language === 'ar' ? 'بدل سكن ونقل' : 'Allowances'}</th>
                    <th className="py-2.5 px-4 text-end font-bold text-slate-900">{language === 'ar' ? 'إجمالي الراتب' : 'Gross Salary'}</th>
                    <th className="py-2.5 px-4 text-center">{language === 'ar' ? 'الحالة' : 'Status'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {employees.map((emp) => (
                    <tr key={emp.id} className="hover:bg-slate-50/50">
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900 text-sm">
                          {language === 'ar' ? emp.fullNameAr : emp.fullName}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono">{emp.employeeCode}</div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-800">{emp.position}</div>
                        <div className="text-[10px] text-slate-500">{emp.department}</div>
                      </td>
                      <td className="py-3 px-4 text-end font-mono">{emp.basicSalary.toLocaleString()} {currency}</td>
                      <td className="py-3 px-4 text-end font-mono text-slate-600">
                        {(emp.housingAllowance + emp.transportAllowance).toLocaleString()} {currency}
                      </td>
                      <td className="py-3 px-4 text-end font-mono font-black text-slate-900 text-sm">
                        {(emp.basicSalary + emp.housingAllowance + emp.transportAllowance).toLocaleString()} {currency}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                          {emp.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 2. CRM & Sales Pipeline */}
      {activeSubModule === 'crm' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="font-bold text-slate-800 text-sm">
                {language === 'ar' ? 'فرص المبيعات وخط أنابيب العملاء المحتملين (CRM Pipeline)' : 'CRM Leads & Deal Pipeline'}
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                {language === 'ar'
                  ? 'تتبع الصفقات المؤسسية من مرحلة التواصل الأولي وحتى الإغلاق وإصدار العقد'
                  : 'Track enterprise B2B opportunities from initial qualification to contract closure'}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold bg-amber-50 text-amber-800 px-3 py-1.5 rounded-lg border border-amber-200">
                {language === 'ar' ? 'إجمالي الفرص:' : 'Pipeline Value:'}{' '}
                {crmLeads.reduce((s, l) => s + l.estimatedValue, 0).toLocaleString()} {currency}
              </span>
              <button
                type="button"
                onClick={() => setShowLeadForm(!showLeadForm)}
                className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>فرصة بيعية جديدة</span>
              </button>
            </div>
          </div>

          {showLeadForm && (
            <form
              onSubmit={handleAddLead}
              className="p-4 bg-slate-50 border-b border-slate-200 grid grid-cols-1 sm:grid-cols-5 gap-3 text-xs items-end"
            >
              <div>
                <label className="block font-bold text-slate-700 mb-1">اسم الفرصة / المشروع</label>
                <input
                  type="text"
                  required
                  value={leadNameAr}
                  onChange={(e) => setLeadNameAr(e.target.value)}
                  placeholder="توريد أجهزة نقاط بيع..."
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">الجهة / الشركة</label>
                <input
                  type="text"
                  value={leadCompany}
                  onChange={(e) => setLeadCompany(e.target.value)}
                  placeholder="مجموعة الخليج..."
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">رقم التواصل</label>
                <input
                  type="text"
                  value={leadPhone}
                  onChange={(e) => setLeadPhone(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg font-mono"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">القيمة التقديرية ({currency})</label>
                <input
                  type="number"
                  value={leadValue}
                  onChange={(e) => setLeadValue(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg font-mono"
                />
              </div>
              <button
                type="submit"
                className="py-2 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg cursor-pointer"
              >
                إضافة الفرصة
              </button>
            </form>
          )}

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-start">
              <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-4 text-start">{language === 'ar' ? 'العميل / الجهة' : 'Lead / Company'}</th>
                  <th className="py-2.5 px-4 text-start">{language === 'ar' ? 'جهة الاتصال' : 'Contact Person'}</th>
                  <th className="py-2.5 px-4 text-end">{language === 'ar' ? 'القيمة التقديرية' : 'Estimated Value'}</th>
                  <th className="py-2.5 px-4 text-center">{language === 'ar' ? 'الاحتمالية' : 'Probability'}</th>
                  <th className="py-2.5 px-4 text-center">{language === 'ar' ? 'المرحلة الحالية' : 'Current Stage'}</th>
                  <th className="py-2.5 px-4 text-center">{language === 'ar' ? 'إجراء' : 'Action'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {crmLeads.map((lead) => (
                  <tr key={lead.id} className="hover:bg-slate-50/50">
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900 text-sm">
                        {language === 'ar' ? lead.leadNameAr : lead.leadName}
                      </div>
                      <div className="text-[10px] text-slate-400">{lead.company} • {lead.source}</div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-800">{lead.contactPerson}</div>
                      <div className="text-[10px] text-slate-500 font-mono">{lead.phone}</div>
                    </td>
                    <td className="py-3 px-4 text-end font-mono font-bold text-slate-900">
                      {lead.estimatedValue.toLocaleString()} {currency}
                    </td>
                    <td className="py-3 px-4 text-center font-mono">
                      <span className="font-bold text-indigo-700">{lead.probability}%</span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          lead.stage === 'WON'
                            ? 'bg-emerald-100 text-emerald-800'
                            : lead.stage === 'NEGOTIATION'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-blue-100 text-blue-800'
                        }`}
                      >
                        {lead.stage}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      {lead.stage !== 'WON' && lead.stage !== 'LOST' ? (
                        <button
                          type="button"
                          onClick={() => advanceLeadStage(lead.id)}
                          className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-[11px] font-bold inline-flex items-center gap-1 transition cursor-pointer"
                        >
                          <span>{language === 'ar' ? 'ترقية المرحلة' : 'Advance Stage'}</span>
                          <ArrowRight className="w-3 h-3" />
                        </button>
                      ) : (
                        <span className="text-[11px] text-emerald-700 font-bold">
                          {language === 'ar' ? 'تم الإغلاق بنجاح ✅' : 'Closed Won ✅'}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 3. E-Commerce Storefront Orders */}
      {activeSubModule === 'ecommerce' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h3 className="font-bold text-slate-800 text-sm">
                {language === 'ar' ? 'طلبات المتجر الإلكتروني والربط المباشر بالمخزون' : 'Omnichannel E-Commerce Storefront Orders'}
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                {language === 'ar'
                  ? 'مزامنة فورية لطلبات المتجر الإلكتروني وبوابات الدفع (مدى، Apple Pay، تمارا) مع المستودعات'
                  : 'Real-time synchronization of web orders and payment gateways with WMS inventory'}
              </p>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-start">
              <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-4 text-start">{language === 'ar' ? 'رقم الطلب / القناة' : 'Order # / Channel'}</th>
                  <th className="py-2.5 px-4 text-start">{language === 'ar' ? 'العميل / المدينة' : 'Customer / City'}</th>
                  <th className="py-2.5 px-4 text-center">{language === 'ar' ? 'بوابة الدفع' : 'Payment Gateway'}</th>
                  <th className="py-2.5 px-4 text-end">{language === 'ar' ? 'الإجمالي' : 'Total Amount'}</th>
                  <th className="py-2.5 px-4 text-center">{language === 'ar' ? 'حالة التجهيز والشحن' : 'Fulfillment Status'}</th>
                  <th className="py-2.5 px-4 text-center">{language === 'ar' ? 'تحديث الشحن' : 'Action'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {ecommerceOrders.map((ord) => (
                  <tr key={ord.id} className="hover:bg-slate-50/50">
                    <td className="py-3 px-4 font-mono">
                      <div className="font-bold text-slate-900 text-sm">{ord.orderNumber}</div>
                      <div className="text-[10px] text-indigo-600 font-sans font-bold">{ord.channel}</div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-800">{ord.customerName}</div>
                      <div className="text-[10px] text-slate-500">{ord.city} • {ord.itemsCount} items</div>
                    </td>
                    <td className="py-3 px-4 text-center font-mono">
                      <span className="px-2 py-0.5 bg-slate-100 text-slate-800 rounded font-bold text-[10px]">
                        {ord.paymentGateway}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-end font-mono font-black text-slate-900 text-sm">
                      {ord.totalAmount.toLocaleString()} {currency}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          ord.fulfillmentStatus === 'DELIVERED'
                            ? 'bg-emerald-100 text-emerald-800'
                            : ord.fulfillmentStatus === 'SHIPPED'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {ord.fulfillmentStatus}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      {ord.fulfillmentStatus !== 'DELIVERED' ? (
                        <button
                          type="button"
                          onClick={() => advanceEcommerceOrder(ord.id)}
                          className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[11px] font-bold transition cursor-pointer"
                        >
                          {language === 'ar' ? 'المرحلة التالية' : 'Next Step'}
                        </button>
                      ) : (
                        <span className="text-[11px] text-emerald-700 font-bold">
                          {language === 'ar' ? 'مكتمل التوصيل ✅' : 'Delivered ✅'}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 4. Enterprise Workflow Approvals */}
      {activeSubModule === 'workflows' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h3 className="font-bold text-slate-800 text-sm">
                {language === 'ar' ? 'مركز الاعتمادات وسير العمل المؤسسي (Workflow Engine)' : 'Enterprise Multi-Level Workflow Approvals'}
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                {language === 'ar'
                  ? 'اعتماد أوامر الشراء الكبرى، التسويات المحاسبية، ومسيرات الرواتب مع تسجيل كامل في سجل التدقيق'
                  : 'Approve high-value purchase orders, accounting adjustments, and HR payroll runs'}
              </p>
            </div>
          </div>
          <div className="divide-y divide-slate-100">
            {workflowApprovals.map((wf) => (
              <div key={wf.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/50 text-xs">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded text-[10px]">
                      {wf.requestNumber}
                    </span>
                    <span className="font-bold text-slate-900 text-sm">
                      {language === 'ar' ? wf.titleAr : wf.title}
                    </span>
                  </div>
                  <div className="text-slate-500 flex flex-wrap items-center gap-3 text-[11px]">
                    <span>{language === 'ar' ? 'القسم:' : 'Module:'} <strong>{wf.module}</strong></span>
                    <span>•</span>
                    <span>{language === 'ar' ? 'مقدم الطلب:' : 'Requested By:'} <strong>{wf.requestedBy}</strong></span>
                    <span>•</span>
                    <span>{language === 'ar' ? 'الدور المعتمد:' : 'Approver Role:'} <strong>{wf.approverRole}</strong></span>
                    {wf.amount > 0 && (
                      <>
                        <span>•</span>
                        <span className="font-mono font-bold text-slate-900">
                          {wf.amount.toLocaleString()} {currency}
                        </span>
                      </>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {wf.status === 'PENDING' ? (
                    <>
                      <button
                        type="button"
                        onClick={() => decideWorkflowApproval(wf.id, 'APPROVED')}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold inline-flex items-center gap-1 transition cursor-pointer"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>{language === 'ar' ? 'اعتماد' : 'Approve'}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => decideWorkflowApproval(wf.id, 'REJECTED')}
                        className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg font-bold inline-flex items-center gap-1 transition cursor-pointer"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        <span>{language === 'ar' ? 'رفض' : 'Reject'}</span>
                      </button>
                    </>
                  ) : (
                    <span
                      className={`px-3 py-1 rounded-full font-bold text-[11px] ${
                        wf.status === 'APPROVED'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-rose-100 text-rose-800'
                      }`}
                    >
                      {wf.status}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 5. Fixed Assets & Depreciation */}
      {activeSubModule === 'assets' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="font-bold text-slate-800 text-sm">
                {language === 'ar' ? 'سجل الأصول الثابتة وجداول الإهلاك الآلي (Straight-Line)' : 'Fixed Assets & Depreciation Registry'}
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                إجمالي القيمة الدفترية الصافية:{' '}
                <strong className="font-mono text-emerald-700">
                  {fixedAssets.reduce((s, a) => s + a.currentBookValue, 0).toLocaleString()} {currency}
                </strong>
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                data-testid="run-depreciation-btn"
                onClick={handleRunDepreciation}
                className="px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
              >
                <Calculator className="w-4 h-4" />
                <span>{language === 'ar' ? 'احتساب وترحيل قسط الإهلاك السنوي' : 'Run Depreciation Cycle'}</span>
              </button>
              <button
                type="button"
                onClick={() => setShowAssetForm(!showAssetForm)}
                className="px-3.5 py-2 bg-slate-900 hover:bg-indigo-600 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>{language === 'ar' ? 'إضافة أصل ثابت' : 'Add Fixed Asset'}</span>
              </button>
            </div>
          </div>

          {showAssetForm && (
            <form
              onSubmit={handleAddAsset}
              className="p-4 bg-slate-50 border-b border-slate-200 grid grid-cols-1 sm:grid-cols-6 gap-3 text-xs items-end"
            >
              <div className="sm:col-span-2">
                <label className="block font-bold text-slate-700 mb-1">اسم الأصل الثابت</label>
                <input
                  type="text"
                  required
                  value={assetNameAr}
                  onChange={(e) => setAssetNameAr(e.target.value)}
                  placeholder="مثال: خط تغليف وتعبئة أوتوماتيكي..."
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">التصنيف</label>
                <input
                  type="text"
                  value={assetCategory}
                  onChange={(e) => setAssetCategory(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">تكلفة الشراء</label>
                <input
                  type="number"
                  value={assetCost}
                  onChange={(e) => setAssetCost(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg font-mono"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">العمر الإنتاجي (سنوات)</label>
                <input
                  type="number"
                  value={assetLife}
                  onChange={(e) => setAssetLife(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg font-mono"
                />
              </div>
              <button
                type="submit"
                className="py-2 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg cursor-pointer"
              >
                حفظ الأصل
              </button>
            </form>
          )}

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-start">
              <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-4 text-start">{language === 'ar' ? 'رمز الأصل / البيان' : 'Asset Code & Name'}</th>
                  <th className="py-2.5 px-4 text-start">{language === 'ar' ? 'التصنيف / الموقع' : 'Category & Location'}</th>
                  <th className="py-2.5 px-4 text-end">{language === 'ar' ? 'تكلفة الشراء' : 'Original Cost'}</th>
                  <th className="py-2.5 px-4 text-end text-rose-700">{language === 'ar' ? 'مجمع الإهلاك' : 'Accum. Deprec.'}</th>
                  <th className="py-2.5 px-4 text-end font-bold text-slate-900">{language === 'ar' ? 'القيمة الدفترية الحالية' : 'Current Book Value'}</th>
                  <th className="py-2.5 px-4 text-center">{language === 'ar' ? 'العمر الإنتاجي' : 'Useful Life'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono">
                {fixedAssets.map((ast) => (
                  <tr key={ast.id} className="hover:bg-slate-50/50">
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900 font-sans text-sm">
                        {language === 'ar' ? ast.nameAr : ast.name}
                      </div>
                      <div className="text-[10px] text-slate-400">{ast.assetCode}</div>
                    </td>
                    <td className="py-3 px-4 font-sans text-slate-600">
                      <div>{ast.category}</div>
                      <div className="text-[10px] text-slate-400">{ast.location}</div>
                    </td>
                    <td className="py-3 px-4 text-end font-semibold text-slate-800">
                      {ast.purchaseCost.toLocaleString()} {currency}
                    </td>
                    <td className="py-3 px-4 text-end text-rose-700 font-bold">
                      -{ast.accumulatedDepreciation.toLocaleString()} {currency}
                    </td>
                    <td className="py-3 px-4 text-end font-black text-emerald-700 text-sm">
                      {ast.currentBookValue.toLocaleString()} {currency}
                    </td>
                    <td className="py-3 px-4 text-center font-sans">
                      {ast.usefulLifeYears} {language === 'ar' ? 'سنوات' : 'Years'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 6. Manufacturing BOM */}
      {activeSubModule === 'mfg' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs space-y-3">
            <h3 className="font-bold text-sm text-slate-900 border-b border-slate-100 pb-2">
              {language === 'ar' ? 'قوائم المواد والتركيبات التصنيعية (BOM Recipes)' : 'Bill of Materials (BOM)'}
            </h3>
            {boms.map((b) => (
              <div key={b.id} className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2 text-xs">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-slate-900 text-sm">{b.finishedProductName}</span>
                  <span className="font-mono bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded text-[10px] font-bold">
                    {b.bomCode}
                  </span>
                </div>
                <div className="text-slate-600">
                  {b.items.map((item, idx) => (
                    <div key={idx} className="flex justify-between py-0.5 border-b border-slate-100 last:border-none">
                      <span>• {item.productName} ({item.quantityRequired} unit)</span>
                      <span className="font-mono">{item.unitCost} {currency}</span>
                    </div>
                  ))}
                </div>
                <div className="flex justify-between pt-1 border-t border-slate-200 font-bold text-slate-900">
                  <span>{language === 'ar' ? 'تكلفة إنتاج الوحدة شاملة العمالة:' : 'Total Cost / Finished Unit:'}</span>
                  <span className="text-emerald-700 font-mono">{b.totalCostPerUnit} {currency}</span>
                </div>
              </div>
            ))}
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h3 className="font-bold text-sm text-slate-900">
                {language === 'ar' ? 'أوامر التصنيع وخطوط الإنتاج' : 'Active Production Orders'}
              </h3>
              <button
                type="button"
                onClick={() => setShowMOForm(!showMOForm)}
                className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>أمر تصنيع جديد</span>
              </button>
            </div>

            {showMOForm && (
              <form onSubmit={handleAddMO} className="p-3 bg-slate-100 rounded-xl space-y-2 text-xs">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">المنتج التام المستهدف</label>
                  <input
                    type="text"
                    required
                    value={moProductName}
                    onChange={(e) => setMoProductName(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={moTargetQty}
                    onChange={(e) => setMoTargetQty(Number(e.target.value))}
                    placeholder="الكمية..."
                    className="w-32 px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg font-mono"
                  />
                  <button
                    type="submit"
                    className="flex-1 py-1.5 bg-emerald-600 text-white font-bold rounded-lg cursor-pointer"
                  >
                    إطلاق خط الإنتاج
                  </button>
                </div>
              </form>
            )}

            {productionOrders.map((mo) => (
              <div key={mo.id} className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2 text-xs">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-slate-900">{mo.finishedProductName}</span>
                  <span className="font-mono text-xs font-bold text-indigo-700">{mo.orderNumber}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>الكمية المستهدفة: {mo.targetQuantity} units</span>
                  <span className="font-bold text-emerald-700">المنجز: {mo.completedQuantity} units</span>
                </div>
                <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-indigo-600 h-full rounded-full transition-all"
                    style={{ width: `${Math.min(100, (mo.completedQuantity / mo.targetQuantity) * 100)}%` }}
                  ></div>
                </div>
                <div className="flex items-center justify-between pt-1">
                  <span className="text-[10px] text-slate-400">
                    Start: {mo.startDate} • Due: {mo.dueDate}
                  </span>
                  {mo.completedQuantity < mo.targetQuantity ? (
                    <button
                      type="button"
                      onClick={() => advanceProductionOrder(mo.id)}
                      className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <Play className="w-3 h-3" />
                      <span>تسجيل دفعة إنتاج (+25%)</span>
                    </button>
                  ) : (
                    <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded font-bold text-[10px]">
                      مكتمل التصنيع ✅
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 7. Projects */}
      {activeSubModule === 'projects' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="font-bold text-slate-900 text-sm">
              {language === 'ar' ? 'متابعة المشاريع الهندسية والربحية والميزانيات' : 'Project Costing & Profitability'}
            </h3>
            <button
              type="button"
              onClick={() => setShowProjectForm(!showProjectForm)}
              className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>مشروع جديد</span>
            </button>
          </div>

          {showProjectForm && (
            <form
              onSubmit={handleAddProject}
              className="p-4 bg-slate-50 rounded-xl border border-slate-200 grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs items-end"
            >
              <div className="sm:col-span-2">
                <label className="block font-bold text-slate-700 mb-1">اسم المشروع / العقد</label>
                <input
                  type="text"
                  required
                  value={prjNameAr}
                  onChange={(e) => setPrjNameAr(e.target.value)}
                  placeholder="تجهيز مستودعات تبريد مركزية..."
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">الميزانية المعتمدة ({currency})</label>
                <input
                  type="number"
                  value={prjBudget}
                  onChange={(e) => setPrjBudget(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg font-mono"
                />
              </div>
              <button
                type="submit"
                className="py-2 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg cursor-pointer"
              >
                فتح المشروع
              </button>
            </form>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {projects.map((prj) => (
              <div key={prj.id} className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3 text-xs">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="font-bold text-slate-900 text-sm">
                      {language === 'ar' ? prj.nameAr : prj.name}
                    </div>
                    <div className="text-[10px] text-slate-500 font-mono mt-0.5">{prj.code}</div>
                  </div>
                  <span className="bg-blue-100 text-blue-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
                    {prj.status}
                  </span>
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between">
                    <span className="text-slate-500">{language === 'ar' ? 'نسبة الإنجاز:' : 'Progress:'}</span>
                    <span className="font-bold text-slate-800">{prj.progressPercent}%</span>
                  </div>
                  <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-emerald-500 h-full rounded-full transition-all"
                      style={{ width: `${prj.progressPercent}%` }}
                    ></div>
                  </div>
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-slate-200 font-mono">
                  <div>
                    <div>Budget: {prj.budget.toLocaleString()} {currency}</div>
                    <div className="text-emerald-700 font-bold">Spent: {prj.spentCost.toLocaleString()} {currency}</div>
                  </div>
                  {prj.progressPercent < 100 && (
                    <button
                      type="button"
                      onClick={() => advanceProjectProgress(prj.id)}
                      className="px-3 py-1.5 bg-slate-900 hover:bg-indigo-600 text-white font-sans font-bold rounded-lg text-[11px] cursor-pointer"
                    >
                      اعتماد مستخلص (+10%)
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 8. Fleet Logistics */}
      {activeSubModule === 'fleet' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-slate-200">
            <h3 className="font-bold text-slate-900 text-sm">
              {language === 'ar' ? 'إدارة أسطول المركبات والشاحنات اللوجستية' : 'Fleet & Logistics Management'}
            </h3>
            <button
              type="button"
              onClick={() => setShowFleetForm(!showFleetForm)}
              className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>إضافة مركبة للأسطول</span>
            </button>
          </div>

          {showFleetForm && (
            <form
              onSubmit={handleAddVehicle}
              className="p-4 bg-white rounded-xl border border-slate-200 grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs items-end"
            >
              <div>
                <label className="block font-bold text-slate-700 mb-1">رقم اللوحة</label>
                <input
                  type="text"
                  required
                  value={vehPlate}
                  onChange={(e) => setVehPlate(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">طراز المركبة / الشاحنة</label>
                <input
                  type="text"
                  value={vehModel}
                  onChange={(e) => setVehModel(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">السائق المسؤول</label>
                <input
                  type="text"
                  value={vehDriver}
                  onChange={(e) => setVehDriver(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg"
                />
              </div>
              <button
                type="submit"
                className="py-2 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg cursor-pointer"
              >
                تسجيل المركبة
              </button>
            </form>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {fleetVehicles.map((v) => (
              <div key={v.id} className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs space-y-3 text-xs">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <Truck className="w-5 h-5 text-indigo-600" />
                    <span className="font-bold text-slate-900 text-sm">{v.plateNumber}</span>
                  </div>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                      v.status === 'AVAILABLE'
                        ? 'bg-emerald-100 text-emerald-800'
                        : v.status === 'ON_ROUTE'
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {v.status}
                  </span>
                </div>
                <div className="text-slate-600 space-y-1">
                  <div>Model: <span className="font-semibold text-slate-800">{v.model}</span></div>
                  <div>Driver: <span className="font-semibold text-slate-800">{v.driverName}</span></div>
                  <div className="flex justify-between font-mono pt-1">
                    <span>Mileage: {v.mileageKm.toLocaleString()} KM</span>
                    <span>Fuel Tank: {v.fuelCapacity} L</span>
                  </div>
                </div>
                <div className="pt-2 border-t border-slate-100 flex justify-end">
                  <button
                    type="button"
                    onClick={() => cycleFleetVehicleStatus(v.id)}
                    className="px-3 py-1 bg-slate-100 hover:bg-indigo-50 text-slate-700 hover:text-indigo-700 font-bold rounded-lg text-[11px] transition cursor-pointer"
                  >
                    تغيير حالة التشغيل / التوصيل
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 9. Quality Control */}
      {activeSubModule === 'quality' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-5 space-y-4 text-xs">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="font-bold text-slate-900 text-sm">
              {language === 'ar' ? 'سجل فحص وتوكيد الجودة (QC Inspection)' : 'Quality Assurance Inspection Tickets'}
            </h3>
            <button
              type="button"
              onClick={() => setShowQCForm(!showQCForm)}
              className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>إصدار تذكرة فحص جودة</span>
            </button>
          </div>

          {showQCForm && (
            <form
              onSubmit={handleAddQC}
              className="p-4 bg-slate-50 rounded-xl border border-slate-200 grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs items-end"
            >
              <div>
                <label className="block font-bold text-slate-700 mb-1">المستند المرجعي (PO / MO)</label>
                <input
                  type="text"
                  required
                  value={qcRefDoc}
                  onChange={(e) => setQcRefDoc(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg font-mono"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">حجم العينة المفحوصة</label>
                <input
                  type="number"
                  value={qcSampleSize}
                  onChange={(e) => setQcSampleSize(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg font-mono"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">عدد العيوب المكتشفة</label>
                <input
                  type="number"
                  value={qcDefects}
                  onChange={(e) => setQcDefects(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg font-mono"
                />
              </div>
              <button
                type="submit"
                className="py-2 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg cursor-pointer"
              >
                اعتماد نتيجة الفحص
              </button>
            </form>
          )}

          <div className="space-y-3">
            {qualityInspections.map((qc) => (
              <div key={qc.id} className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                <div>
                  <div className="font-bold text-slate-900 text-sm">{qc.inspectionNumber}</div>
                  <div className="text-slate-500 text-[11px]">
                    Type: {qc.type} • Ref: {qc.referenceDoc} • Sample: {qc.sampleSize} units • Defects: {qc.defectsCount}
                  </div>
                </div>
                <div className="text-end">
                  <span
                    className={`font-bold px-2.5 py-1 rounded-full text-xs ${
                      qc.status === 'PASSED'
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {qc.status}
                  </span>
                  <div className="text-[10px] text-slate-400 mt-1">{qc.date} by {qc.inspector}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
