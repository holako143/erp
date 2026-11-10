import React, { useState } from 'react';
import { useERP } from '../context/ERPContext';
import {
  Briefcase,
  Users,
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
    'hr' | 'crm' | 'ecommerce' | 'workflows' | 'assets' | 'quality'
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

  // 6. Quality Inspection New Ticket State
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
                ? 'وحدات العمليات المساندة'
                : 'Supporting Operations Modules'}
            </span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            {language === 'ar'
              ? 'الموارد البشرية والرواتب، CRM، المتجر الإلكتروني، الاعتمادات، الأصول والإهلاك، وفحص الجودة للألواح والبطاريات'
              : 'HR & Payroll, CRM Pipeline, E-Commerce, Workflows, Fixed Assets, and Solar/Electronics QC'}
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

      {/* 6. Quality Control */}
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
