import React, { useMemo, useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  CheckCircle2,
  GitBranch,
  GripVertical,
  Play,
  Plus,
  ShieldCheck,
  Sparkles,
  Trash2,
} from 'lucide-react';
import { useERP } from '../../context/ERPContext';
import {
  CustomApprovalWorkflowBlueprint,
  INITIAL_CUSTOM_WORKFLOW_BLUEPRINTS,
  WorkflowConditionField,
  WorkflowConditionOperator,
  WorkflowFalseBranchBehavior,
  WorkflowNodeType,
  WorkflowStepNode,
  reorderWorkflowStepsDragDrop,
  simulateWorkflowExecutionTrace,
} from '../../core/hrAttendanceAndWorkflowEngine';

const PALETTE_NODE_TEMPLATES: Array<{
  templateId: string;
  nodeType: WorkflowNodeType;
  titleAr: string;
  titleEn: string;
  approverRole: string;
  conditionField: WorkflowConditionField;
  conditionOperator: WorkflowConditionOperator;
  conditionValue: string | number;
  falseBranchBehavior: WorkflowFalseBranchBehavior;
  slaHours: number;
}> = [
  {
    templateId: 'tpl-cond-amount',
    nodeType: 'CONDITION',
    titleAr: 'شرط سقف المبلغ المالي (> 25,000)',
    titleEn: 'Amount Threshold Condition (> 25,000)',
    approverRole: 'ACCOUNTANT',
    conditionField: 'AMOUNT',
    conditionOperator: '>',
    conditionValue: 25000,
    falseBranchBehavior: 'SKIP_STEP',
    slaHours: 6,
  },
  {
    templateId: 'tpl-approver-dept',
    nodeType: 'APPROVER',
    titleAr: 'اعتماد مدير القسم المختص',
    titleEn: 'Department Manager Approval',
    approverRole: 'COMPANY_ADMIN',
    conditionField: 'AMOUNT',
    conditionOperator: '>=',
    conditionValue: 1000,
    falseBranchBehavior: 'AUTO_APPROVE_CHAIN',
    slaHours: 4,
  },
  {
    templateId: 'tpl-approver-cfo',
    nodeType: 'APPROVER',
    titleAr: 'اعتماد الإدارة المالية / CFO',
    titleEn: 'Finance / CFO Sign-Off',
    approverRole: 'SUPER_ADMIN',
    conditionField: 'DISCOUNT_PCT',
    conditionOperator: '>=',
    conditionValue: 15,
    falseBranchBehavior: 'SKIP_STEP',
    slaHours: 8,
  },
  {
    templateId: 'tpl-action-erp',
    nodeType: 'AUTOMATED_ACTION',
    titleAr: 'ترحيل القيد وإشعار المستفيد تلقائياً',
    titleEn: 'Auto-Post Journal & Dispatch Notification',
    approverRole: 'SYSTEM_AUTOMATION',
    conditionField: 'AMOUNT',
    conditionOperator: '>=',
    conditionValue: 0,
    falseBranchBehavior: 'SKIP_STEP',
    slaHours: 1,
  },
];

export const VisualWorkflowBuilderStudio: React.FC = () => {
  const { currency, language, dispatchToastAndPushNotification } = useERP();
  const isAr = language === 'ar';

  const [blueprint, setBlueprint] = useState<CustomApprovalWorkflowBlueprint>(
    () => INITIAL_CUSTOM_WORKFLOW_BLUEPRINTS[0]
  );
  const [draggedStepIndex, setDraggedStepIndex] = useState<number | null>(null);
  const [dragOverStepIndex, setDragOverStepIndex] = useState<number | null>(null);
  const [draggedPaletteTemplateId, setDraggedPaletteTemplateId] = useState<string | null>(null);

  // Simulator Payload State
  const [simAmount, setSimAmount] = useState<number>(32000);
  const [simDiscountPct, setSimDiscountPct] = useState<number>(12);
  const [simUrgency, setSimUrgency] = useState<string>('URGENT');
  const [simDepartment, setSimDepartment] = useState<string>('FINANCE');

  const simulationResult = useMemo(
    () =>
      simulateWorkflowExecutionTrace(blueprint, {
        amount: simAmount,
        discountPct: simDiscountPct,
        urgency: simUrgency,
        department: simDepartment,
      }),
    [blueprint, simAmount, simDiscountPct, simUrgency, simDepartment]
  );

  const handleAddNodeFromTemplate = (
    tpl: (typeof PALETTE_NODE_TEMPLATES)[0],
    insertAtIndex?: number
  ) => {
    const newStep: WorkflowStepNode = {
      id: `wf-step-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
      stepOrder: blueprint.steps.length + 1,
      nodeType: tpl.nodeType,
      titleAr: tpl.titleAr,
      titleEn: tpl.titleEn,
      approverRole: tpl.approverRole,
      conditionField: tpl.conditionField,
      conditionOperator: tpl.conditionOperator,
      conditionValue: tpl.conditionValue,
      falseBranchBehavior: tpl.falseBranchBehavior,
      slaHours: tpl.slaHours,
    };

    setBlueprint((prev) => {
      const nextSteps = [...prev.steps];
      if (
        typeof insertAtIndex === 'number' &&
        insertAtIndex >= 0 &&
        insertAtIndex <= nextSteps.length
      ) {
        nextSteps.splice(insertAtIndex, 0, newStep);
      } else {
        nextSteps.push(newStep);
      }
      return {
        ...prev,
        updatedAtIso: new Date().toISOString(),
        steps: nextSteps.map((s, idx) => ({ ...s, stepOrder: idx + 1 })),
      };
    });
  };

  const handleMoveStep = (sourceIdx: number, destIdx: number) => {
    setBlueprint((prev) => ({
      ...prev,
      updatedAtIso: new Date().toISOString(),
      steps: reorderWorkflowStepsDragDrop(prev.steps, sourceIdx, destIdx),
    }));
  };

  const handleDeleteStep = (stepId: string) => {
    setBlueprint((prev) => {
      const filtered = prev.steps.filter((s) => s.id !== stepId);
      return {
        ...prev,
        updatedAtIso: new Date().toISOString(),
        steps: filtered.map((s, idx) => ({ ...s, stepOrder: idx + 1 })),
      };
    });
  };

  const handleUpdateStepField = <K extends keyof WorkflowStepNode>(
    stepId: string,
    field: K,
    value: WorkflowStepNode[K]
  ) => {
    setBlueprint((prev) => ({
      ...prev,
      updatedAtIso: new Date().toISOString(),
      steps: prev.steps.map((s) => (s.id === stepId ? { ...s, [field]: value } : s)),
    }));
  };

  const handleSaveAndPublishBlueprint = () => {
    dispatchToastAndPushNotification({
      titleAr: 'مصمم مسارات الاعتماد الذكي (Workflow Builder)',
      titleEn: 'Visual Workflow Builder Studio',
      messageAr: `تم حفظ وتفعيل مسار "${blueprint.nameAr}" (${blueprint.steps.length} مراحل مشروطة) بنجاح!`,
      messageEn: `Published conditional workflow "${blueprint.nameEn}" (${blueprint.steps.length} steps)!`,
      severity: 'success',
      category: 'LIVE_EVENTS',
    });
  };

  return (
    <section
      data-testid="visual-workflow-builder-studio"
      className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden p-4 sm:p-5 space-y-5"
    >
      {/* Top Studio Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3.5">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-700">
            <GitBranch className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-black text-slate-900 text-sm flex items-center gap-2">
              <span>
                {isAr
                  ? 'مصمم مسارات العمل والاعتمادات بالسحب والإفلات (Visual Drag-and-Drop Workflow Builder)'
                  : 'Visual Drag-and-Drop Conditional Approval Workflow Builder'}
              </span>
              <span className="px-2 py-0.5 text-[10px] font-mono font-bold rounded bg-indigo-100 text-indigo-800">
                DRAG & DROP ENGINE
              </span>
            </h3>
            <p className="text-[11px] text-slate-500">
              {isAr
                ? 'قم ببناء وترتيب تسلسل المهام والاعتمادات المشروطة بصرياً بالسحب والإفلات مع محاكاة فورية لمسار القرار'
                : 'Define custom conditional task sequences for approvals using a visual drag-and-drop interface and live rule simulator'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <select
            data-testid="workflow-target-module-select"
            value={blueprint.targetModule}
            onChange={(e) =>
              setBlueprint((prev) => ({
                ...prev,
                targetModule: e.target.value as CustomApprovalWorkflowBlueprint['targetModule'],
              }))
            }
            className="px-3 py-1.5 rounded-xl bg-slate-100 border border-slate-200 text-xs font-bold"
          >
            <option value="PURCHASING">{isAr ? 'وحدة المشتريات والتوريد' : 'Purchasing Module'}</option>
            <option value="ACCOUNTING">{isAr ? 'وحدة المحاسبة والمالية' : 'Accounting Module'}</option>
            <option value="HR_PAYROLL">{isAr ? 'الموارد البشرية والرواتب' : 'HR & Payroll'}</option>
            <option value="SALES">{isAr ? 'المبيعات والخصومات' : 'Sales & Discounts'}</option>
            <option value="INVENTORY">{isAr ? 'المخزون والتحويلات' : 'Inventory & Transfers'}</option>
          </select>

          <button
            type="button"
            data-testid="publish-workflow-blueprint-btn"
            onClick={handleSaveAndPublishBlueprint}
            className="px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold inline-flex items-center gap-1.5 shadow-2xs cursor-pointer"
          >
            <ShieldCheck className="w-4 h-4" />
            <span>{isAr ? 'حفظ وتفعيل المسار' : 'Publish Workflow'}</span>
          </button>
        </div>
      </div>

      {/* Draggable Node Palette Bar */}
      <div className="space-y-2">
        <div className="text-[11px] font-bold text-slate-600 flex items-center justify-between">
          <span>
            {isAr
              ? 'مكتبة اللبنات القابلة للسحب والإفلات (اسحب أي لبنة إلى مساحة العمل أو انقر لإضافتها):'
              : 'Draggable Workflow Node Palette (Drag onto sequence canvas or click to append):'}
          </span>
          <span className="font-mono text-[10px] text-slate-400">
            {blueprint.steps.length} {isAr ? 'مراحل نشطة' : 'active steps'}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
          {PALETTE_NODE_TEMPLATES.map((tpl) => (
            <div
              key={tpl.templateId}
              draggable
              data-testid={`workflow-palette-node-${tpl.templateId}`}
              onDragStart={() => setDraggedPaletteTemplateId(tpl.templateId)}
              onDragEnd={() => setDraggedPaletteTemplateId(null)}
              onClick={() => handleAddNodeFromTemplate(tpl)}
              className="p-2.5 rounded-xl border border-dashed border-indigo-300 bg-indigo-50/40 hover:bg-indigo-50 hover:border-indigo-500 transition flex items-center justify-between gap-2 cursor-grab active:cursor-grabbing text-xs"
            >
              <div className="min-w-0">
                <div className="text-[10px] font-mono font-bold text-indigo-600">
                  + {tpl.nodeType}
                </div>
                <div className="font-bold text-slate-800 truncate">
                  {isAr ? tpl.titleAr : tpl.titleEn}
                </div>
              </div>
              <Plus className="w-4 h-4 text-indigo-600 shrink-0" />
            </div>
          ))}
        </div>
      </div>

      {/* Main Split: Drag-and-Drop Sequence Canvas (Left/Right) + Live Conditional Simulator */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Drag-and-Drop Sequence Canvas */}
        <div
          data-testid="workflow-drag-drop-canvas"
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            if (draggedPaletteTemplateId) {
              const tpl = PALETTE_NODE_TEMPLATES.find(
                (t) => t.templateId === draggedPaletteTemplateId
              );
              if (tpl) handleAddNodeFromTemplate(tpl);
              setDraggedPaletteTemplateId(null);
            }
          }}
          className="lg:col-span-7 space-y-2.5 p-3.5 rounded-2xl bg-slate-50 border border-slate-200/90 min-h-[320px]"
        >
          <div className="flex items-center justify-between text-xs font-bold text-slate-700 pb-1">
            <span>
              {isAr
                ? 'التسلسل التفاعلي للمهام والاعتمادات المشروطة (اسحب البطاقات لإعادة الترتيب)'
                : 'Conditional Approval Sequence (Drag cards to reorder sequence)'}
            </span>
          </div>

          {blueprint.steps.map((step, idx) => {
            const traceStep = simulationResult.traceSteps.find((t) => t.stepId === step.id);
            const isMatched = traceStep?.conditionMatched;

            return (
              <div
                key={step.id}
                draggable
                data-testid={`workflow-step-card-${idx}`}
                onDragStart={() => setDraggedStepIndex(idx)}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOverStepIndex(idx);
                }}
                onDragLeave={() => setDragOverStepIndex(null)}
                onDrop={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (draggedPaletteTemplateId) {
                    const tpl = PALETTE_NODE_TEMPLATES.find(
                      (t) => t.templateId === draggedPaletteTemplateId
                    );
                    if (tpl) handleAddNodeFromTemplate(tpl, idx + 1);
                    setDraggedPaletteTemplateId(null);
                  } else if (draggedStepIndex !== null && draggedStepIndex !== idx) {
                    handleMoveStep(draggedStepIndex, idx);
                  }
                  setDraggedStepIndex(null);
                  setDragOverStepIndex(null);
                }}
                className={`p-3.5 rounded-xl bg-white border transition space-y-2.5 ${
                  dragOverStepIndex === idx
                    ? 'border-2 border-indigo-600 shadow-md'
                    : isMatched
                    ? 'border-emerald-300 shadow-2xs'
                    : 'border-slate-200 opacity-85'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <GripVertical className="w-4 h-4 text-slate-400 cursor-grab shrink-0" />
                    <span className="w-6 h-6 rounded-lg bg-slate-900 text-white font-mono text-xs font-black flex items-center justify-center shrink-0">
                      {step.stepOrder}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                        step.nodeType === 'CONDITION'
                          ? 'bg-amber-100 text-amber-800'
                          : step.nodeType === 'AUTOMATED_ACTION'
                          ? 'bg-purple-100 text-purple-800'
                          : 'bg-blue-100 text-blue-800'
                      }`}
                    >
                      {step.nodeType}
                    </span>
                    <input
                      type="text"
                      data-testid={`workflow-step-title-${idx}`}
                      value={isAr ? step.titleAr : step.titleEn}
                      onChange={(e) =>
                        handleUpdateStepField(
                          step.id,
                          isAr ? 'titleAr' : 'titleEn',
                          e.target.value
                        )
                      }
                      className="font-bold text-slate-900 text-xs bg-transparent border-b border-transparent focus:border-indigo-500 outline-none truncate"
                    />
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      data-testid={`workflow-step-move-up-${idx}`}
                      disabled={idx === 0}
                      onClick={() => handleMoveStep(idx, idx - 1)}
                      className="p-1 rounded hover:bg-slate-100 disabled:opacity-30 text-slate-600 cursor-pointer"
                      title="Move Up"
                    >
                      <ArrowUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      data-testid={`workflow-step-move-down-${idx}`}
                      disabled={idx === blueprint.steps.length - 1}
                      onClick={() => handleMoveStep(idx, idx + 1)}
                      className="p-1 rounded hover:bg-slate-100 disabled:opacity-30 text-slate-600 cursor-pointer"
                      title="Move Down"
                    >
                      <ArrowDown className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      data-testid={`workflow-step-delete-${idx}`}
                      disabled={blueprint.steps.length <= 1}
                      onClick={() => handleDeleteStep(step.id)}
                      className="p-1 rounded hover:bg-rose-50 disabled:opacity-30 text-rose-600 cursor-pointer"
                      title="Delete Step"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Inline Rule & Approver Controls */}
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-[11px] pt-1 border-t border-slate-100">
                  <div>
                    <label className="block text-[10px] text-slate-400">
                      {isAr ? 'الشرط (IF)' : 'If Field'}
                    </label>
                    <select
                      data-testid={`workflow-step-field-${idx}`}
                      value={step.conditionField}
                      onChange={(e) =>
                        handleUpdateStepField(
                          step.id,
                          'conditionField',
                          e.target.value as WorkflowConditionField
                        )
                      }
                      className="w-full px-2 py-1 rounded bg-slate-50 border border-slate-200 font-mono text-[11px]"
                    >
                      <option value="AMOUNT">AMOUNT</option>
                      <option value="DISCOUNT_PCT">DISCOUNT_PCT</option>
                      <option value="URGENCY">URGENCY</option>
                      <option value="DEPARTMENT">DEPARTMENT</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] text-slate-400">
                      {isAr ? 'المعامل' : 'Operator'}
                    </label>
                    <select
                      data-testid={`workflow-step-op-${idx}`}
                      value={step.conditionOperator}
                      onChange={(e) =>
                        handleUpdateStepField(
                          step.id,
                          'conditionOperator',
                          e.target.value as WorkflowConditionOperator
                        )
                      }
                      className="w-full px-2 py-1 rounded bg-slate-50 border border-slate-200 font-mono text-[11px]"
                    >
                      <option value=">">&gt;</option>
                      <option value=">=">&gt;=</option>
                      <option value="<=">&lt;=</option>
                      <option value="==">==</option>
                      <option value="!=">!=</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] text-slate-400">
                      {isAr ? 'القيمة المشروطة' : 'Threshold Value'}
                    </label>
                    <input
                      type="text"
                      data-testid={`workflow-step-val-${idx}`}
                      value={step.conditionValue}
                      onChange={(e) => {
                        const raw = e.target.value;
                        const num = Number(raw);
                        handleUpdateStepField(
                          step.id,
                          'conditionValue',
                          !Number.isNaN(num) && raw.trim() !== '' ? num : raw
                        );
                      }}
                      className="w-full px-2 py-1 rounded bg-slate-50 border border-slate-200 font-mono text-[11px]"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] text-slate-400">
                      {isAr ? 'الجهة المعتمدة' : 'Approver Role'}
                    </label>
                    <select
                      data-testid={`workflow-step-role-${idx}`}
                      value={step.approverRole}
                      onChange={(e) =>
                        handleUpdateStepField(step.id, 'approverRole', e.target.value)
                      }
                      className="w-full px-2 py-1 rounded bg-slate-50 border border-slate-200 font-mono text-[11px]"
                    >
                      <option value="WAREHOUSE_MANAGER">WAREHOUSE_MANAGER</option>
                      <option value="ACCOUNTANT">ACCOUNTANT</option>
                      <option value="HR_MANAGER">HR_MANAGER</option>
                      <option value="COMPANY_ADMIN">COMPANY_ADMIN</option>
                      <option value="SUPER_ADMIN">SUPER_ADMIN</option>
                      <option value="SYSTEM_AUTOMATION">SYSTEM_AUTOMATION</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] text-slate-400">
                      {isAr ? 'عند عدم تحقق الشرط' : 'If False Branch'}
                    </label>
                    <select
                      data-testid={`workflow-step-false-branch-${idx}`}
                      value={step.falseBranchBehavior}
                      onChange={(e) =>
                        handleUpdateStepField(
                          step.id,
                          'falseBranchBehavior',
                          e.target.value as WorkflowFalseBranchBehavior
                        )
                      }
                      className="w-full px-2 py-1 rounded bg-slate-50 border border-slate-200 font-mono text-[11px]"
                    >
                      <option value="SKIP_STEP">{isAr ? 'تخطي المرحلة' : 'Skip Step'}</option>
                      <option value="AUTO_APPROVE_CHAIN">{isAr ? 'اعتماد فوري' : 'Auto Approve'}</option>
                      <option value="ESCALATE_CFO">{isAr ? 'تصعيد للمدير التنفيذي' : 'Escalate CFO'}</option>
                      <option value="REJECT_REQUEST">{isAr ? 'رفض تلقائي' : 'Auto Reject'}</option>
                    </select>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Live Conditional Path Simulator Panel */}
        <div
          data-testid="workflow-simulator-panel"
          className="lg:col-span-5 p-4 rounded-2xl bg-slate-900 text-slate-100 space-y-4"
        >
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <Play className="w-4 h-4 text-emerald-400" />
              <div>
                <h4 className="text-xs font-black">
                  {isAr
                    ? 'محاكي مسار الاعتماد المشروط الفوري (Live Conditional Path Simulator)'
                    : 'Live Conditional Workflow Simulator'}
                </h4>
                <p className="text-[10px] text-slate-400">
                  {isAr
                    ? 'اختبر كيف يتفرع المسار تلقائياً حسب قيمة المعاملة أو نسبة الخصم'
                    : 'Test how the task sequence branches dynamically based on transaction parameters'}
                </p>
              </div>
            </div>
            <Sparkles className="w-4 h-4 text-indigo-400" />
          </div>

          <div className="grid grid-cols-2 gap-2.5 text-xs">
            <div>
              <label className="block text-[10px] text-slate-400 mb-1">
                {isAr ? `مبلغ المعاملة الاختباري (${currency})` : `Test Amount (${currency})`}
              </label>
              <input
                type="number"
                data-testid="workflow-sim-amount-input"
                value={simAmount}
                onChange={(e) => setSimAmount(Number(e.target.value) || 0)}
                className="w-full px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 font-mono text-xs text-white"
              />
            </div>

            <div>
              <label className="block text-[10px] text-slate-400 mb-1">
                {isAr ? 'نسبة الخصم (%)' : 'Discount (%)'}
              </label>
              <input
                type="number"
                data-testid="workflow-sim-discount-input"
                value={simDiscountPct}
                onChange={(e) => setSimDiscountPct(Number(e.target.value) || 0)}
                className="w-full px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 font-mono text-xs text-white"
              />
            </div>

            <div>
              <label className="block text-[10px] text-slate-400 mb-1">
                {isAr ? 'الأولوية (URGENCY)' : 'Urgency'}
              </label>
              <select
                value={simUrgency}
                onChange={(e) => setSimUrgency(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-lg bg-slate-800 border border-slate-700 font-mono text-xs text-white"
              >
                <option value="NORMAL">NORMAL</option>
                <option value="URGENT">URGENT</option>
                <option value="CRITICAL">CRITICAL</option>
              </select>
            </div>

            <div>
              <label className="block text-[10px] text-slate-400 mb-1">
                {isAr ? 'القسم الطالب' : 'Department'}
              </label>
              <select
                value={simDepartment}
                onChange={(e) => setSimDepartment(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-lg bg-slate-800 border border-slate-700 font-mono text-xs text-white"
              >
                <option value="FINANCE">FINANCE</option>
                <option value="WAREHOUSE">WAREHOUSE</option>
                <option value="SALES">SALES</option>
                <option value="HR">HR</option>
              </select>
            </div>
          </div>

          {/* Simulation Summary Banner */}
          <div className="p-3 rounded-xl bg-slate-800/90 border border-slate-700 flex items-center justify-between text-xs">
            <div>
              <div className="text-[10px] text-slate-400">
                {isAr ? 'قرار التوجيه النهائي' : 'Routing Decision'}
              </div>
              <div
                data-testid="workflow-sim-decision-status"
                className="font-mono font-black text-emerald-400 mt-0.5"
              >
                {simulationResult.finalDecisionStatus}
              </div>
            </div>
            <div className="text-end">
              <div className="text-[10px] text-slate-400">
                {isAr ? 'إجمالي زمن الاعتماد المتوقع (SLA)' : 'Total Expected SLA'}
              </div>
              <div
                data-testid="workflow-sim-total-sla"
                className="font-mono font-bold text-indigo-300 mt-0.5"
              >
                {simulationResult.totalExpectedSlaHours}h ({simulationResult.activeApproversChain.length} approvers)
              </div>
            </div>
          </div>

          {/* Step-by-Step Trace Output */}
          <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
            {simulationResult.traceSteps.map((tr) => (
              <div
                key={tr.stepId}
                data-testid={`workflow-sim-trace-step-${tr.stepOrder}`}
                className={`p-2.5 rounded-xl border text-[11px] flex items-center justify-between gap-2 ${
                  tr.executionOutcome === 'EXECUTED_REQUIRED'
                    ? 'bg-emerald-950/50 border-emerald-700/60 text-emerald-200'
                    : tr.executionOutcome === 'REJECTED'
                    ? 'bg-rose-950/50 border-rose-700/60 text-rose-200'
                    : 'bg-slate-800/50 border-slate-700/60 text-slate-400'
                }`}
              >
                <div className="min-w-0">
                  <div className="font-bold truncate">
                    #{tr.stepOrder} {isAr ? tr.titleAr : tr.titleEn}
                  </div>
                  <div className="text-[10px] font-mono opacity-80">
                    IF ({tr.conditionExpression}) → {tr.assignedApproverRole}
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded font-mono text-[10px] font-bold bg-black/30 shrink-0">
                  {tr.executionOutcome === 'EXECUTED_REQUIRED' ? (
                    <span className="inline-flex items-center gap-1 text-emerald-300">
                      <CheckCircle2 className="w-3 h-3" /> ACTIVE
                    </span>
                  ) : (
                    tr.executionOutcome
                  )}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};
