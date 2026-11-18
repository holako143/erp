import React, { useMemo, useRef, useState, useDeferredValue } from 'react';
import { useERP } from '../../context/ERPContext';
import {
  BatchEntityType,
  BatchExecutionLog,
  CUSTOMER_BATCH_HEADERS,
  INVENTORY_BATCH_HEADERS,
  applyCustomerBatchUpdates,
  applyInventoryBatchUpdates,
  parseAndValidateBatchCsv,
  serializeCustomersToCsv,
  serializeInventoryToCsv,
  updateCsvCellValue,
} from '../../core/batchProcessingEngine';
import {
  CheckCircle2,
  Download,
  FileSpreadsheet,
  Package,
  RefreshCw,
  Trash2,
  Upload,
  Users,
  AlertCircle,
  Play,
} from 'lucide-react';

export const BatchProcessingPanel: React.FC = () => {
  const {
    products,
    customers,
    batchUpdateProducts,
    batchUpdateCustomers,
    currentUser,
    currency,
    language,
  } = useERP();

  const isAr = language === 'ar';
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [entityType, setEntityType] = useState<BatchEntityType>('INVENTORY');
  const [csvText, setCsvText] = useState<string>(() => serializeInventoryToCsv(products, 8));
  const [statusMessage, setStatusMessage] = useState<{
    type: 'success' | 'warning' | 'error';
    text: string;
  } | null>(null);
  const [executionLogs, setExecutionLogs] = useState<BatchExecutionLog[]>([]);
  const [filterMode, setFilterMode] = useState<'ALL' | 'CHANGES' | 'ERRORS'>('ALL');

  const deferredCsv = useDeferredValue(csvText);

  const parsedResult = useMemo(
    () =>
      parseAndValidateBatchCsv({
        rawCsv: deferredCsv,
        entityType,
        products,
        customers,
      }),
    [deferredCsv, entityType, products, customers]
  );

  const visibleRows = useMemo(() => {
    if (filterMode === 'CHANGES') {
      return parsedResult.rows.filter((r) => r.status === 'VALID_UPDATE');
    }
    if (filterMode === 'ERRORS') {
      return parsedResult.rows.filter((r) => r.status === 'INVALID' || r.status === 'NOT_FOUND');
    }
    return parsedResult.rows;
  }, [parsedResult.rows, filterMode]);

  const handleSwitchEntity = (nextType: BatchEntityType) => {
    setEntityType(nextType);
    setFilterMode('ALL');
    setStatusMessage(null);
    setCsvText(
      nextType === 'INVENTORY'
        ? serializeInventoryToCsv(products, 8)
        : serializeCustomersToCsv(customers, 8)
    );
  };

  const handleLoadAllCurrent = () => {
    setCsvText(
      entityType === 'INVENTORY'
        ? serializeInventoryToCsv(products)
        : serializeCustomersToCsv(customers)
    );
    setStatusMessage({
      type: 'success',
      text: isAr
        ? `تم تحميل ${entityType === 'INVENTORY' ? products.length : customers.length} سجل حالي في المحرر.`
        : `Loaded ${entityType === 'INVENTORY' ? products.length : customers.length} current records into the editor.`,
    });
  };

  const handleDownloadCsv = () => {
    const content =
      csvText.trim() ||
      (entityType === 'INVENTORY'
        ? serializeInventoryToCsv(products)
        : serializeCustomersToCsv(customers));
    const blob = new Blob([`\uFEFF${content}`], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `haseb-batch-${entityType.toLowerCase()}-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setCsvText(String(reader.result || ''));
      setStatusMessage({
        type: 'success',
        text: isAr ? `تم استيراد الملف (${file.name}) بنجاح.` : `Imported file (${file.name}).`,
      });
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleCellChange = (lineNumber: number, columnKey: string, nextVal: string) => {
    setCsvText((prev) =>
      updateCsvCellValue({
        rawCsv: prev,
        entityType,
        lineNumber,
        columnKey,
        newValue: nextVal,
      })
    );
  };

  const handleApplyBatch = () => {
    if (parsedResult.validUpdateCount === 0) {
      setStatusMessage({
        type: 'warning',
        text: isAr
          ? 'لا توجد صفوف معدلة صالحة للتطبيق. عدّل قيمة في جدول المعاينة أو محرر CSV أولاً.'
          : 'No valid modified rows to apply. Edit a field in the grid or CSV editor first.',
      });
      return;
    }

    if (entityType === 'INVENTORY') {
      const outcome = applyInventoryBatchUpdates(products, parsedResult);
      batchUpdateProducts(outcome.nextProducts, {
        updatedCount: outcome.updatedCount,
        skippedCount: outcome.skippedCount,
        totalFieldChanges: outcome.totalFieldChanges,
      });
      setExecutionLogs((prev) => [
        {
          id: `blog-${Date.now()}`,
          entityType: 'INVENTORY',
          timestamp: new Date().toISOString(),
          updatedCount: outcome.updatedCount,
          skippedCount: outcome.skippedCount,
          totalFieldChanges: outcome.totalFieldChanges,
          actorName: currentUser?.name || 'Admin',
        },
        ...prev,
      ]);
      setStatusMessage({
        type: 'success',
        text: isAr
          ? `تم تحديث ${outcome.updatedCount} صنف مخزني (${outcome.totalFieldChanges} تعديل) بنجاح.${
              outcome.skippedCount > 0 ? ` تم تخطي ${outcome.skippedCount} صف.` : ''
            }`
          : `Successfully updated ${outcome.updatedCount} inventory items (${outcome.totalFieldChanges} field changes).${
              outcome.skippedCount > 0 ? ` Skipped ${outcome.skippedCount} rows.` : ''
            }`,
      });
    } else {
      const outcome = applyCustomerBatchUpdates(customers, parsedResult);
      batchUpdateCustomers(outcome.nextCustomers, {
        updatedCount: outcome.updatedCount,
        skippedCount: outcome.skippedCount,
        totalFieldChanges: outcome.totalFieldChanges,
      });
      setExecutionLogs((prev) => [
        {
          id: `blog-${Date.now()}`,
          entityType: 'CUSTOMERS',
          timestamp: new Date().toISOString(),
          updatedCount: outcome.updatedCount,
          skippedCount: outcome.skippedCount,
          totalFieldChanges: outcome.totalFieldChanges,
          actorName: currentUser?.name || 'Admin',
        },
        ...prev,
      ]);
      setStatusMessage({
        type: 'success',
        text: isAr
          ? `تم تحديث ${outcome.updatedCount} عميل (${outcome.totalFieldChanges} تعديل) بنجاح.${
              outcome.skippedCount > 0 ? ` تم تخطي ${outcome.skippedCount} صف.` : ''
            }`
          : `Successfully updated ${outcome.updatedCount} customer records (${outcome.totalFieldChanges} field changes).${
              outcome.skippedCount > 0 ? ` Skipped ${outcome.skippedCount} rows.` : ''
            }`,
      });
    }
  };

  const activeColumns =
    entityType === 'INVENTORY'
      ? [
          { key: 'sku', label: 'SKU', editable: false, numeric: false },
          { key: 'nameAr', label: isAr ? 'الاسم بالعربية' : 'Arabic Name', editable: true, numeric: false },
          { key: 'costPrice', label: isAr ? 'التكلفة' : 'Cost', editable: true, numeric: true },
          { key: 'salePrice', label: isAr ? 'سعر البيع' : 'Sale Price', editable: true, numeric: true },
          { key: 'stockQty', label: isAr ? 'الكمية' : 'Stock Qty', editable: true, numeric: true },
          { key: 'reorderPoint', label: isAr ? 'حد الطلب' : 'Reorder', editable: true, numeric: true },
        ]
      : [
          { key: 'id', label: 'ID', editable: false, numeric: false },
          { key: 'nameAr', label: isAr ? 'اسم العميل' : 'Customer Name', editable: true, numeric: false },
          { key: 'phone', label: isAr ? 'الهاتف' : 'Phone', editable: true, numeric: false },
          { key: 'email', label: isAr ? 'البريد' : 'Email', editable: true, numeric: false },
          { key: 'creditLimit', label: isAr ? 'الحد الائتماني' : 'Credit Limit', editable: true, numeric: true },
          { key: 'balance', label: isAr ? 'الرصيد / المديونية' : 'Balance', editable: true, numeric: true },
        ];

  const expectedHeadersLine =
    entityType === 'INVENTORY'
      ? INVENTORY_BATCH_HEADERS.join(', ')
      : CUSTOMER_BATCH_HEADERS.join(', ');

  return (
    <div
      data-testid="batch-processing-panel"
      className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden"
    >
      {/* Header & Entity Type Segmented Selector */}
      <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1 min-w-0">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
            <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">
              {isAr
                ? 'وحدة المعالجة الجماعية والتحديث المتعدد عبر CSV'
                : 'CSV Batch Processing & Bulk Update Workspace'}
            </h3>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {isAr
              ? 'حرّر بيانات الأصناف أو العملاء مباشرة في الجدول أو ألصق صفوف CSV/Excel للمعاينة والاعتماد الفوري.'
              : 'Edit inventory items or customer records inline or paste CSV/Excel rows to preview diffs and apply bulk updates.'}
          </p>
        </div>

        <div
          role="tablist"
          aria-label={isAr ? 'اختر نوع السجلات' : 'Select Target Dataset'}
          className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg shrink-0"
        >
          <button
            type="button"
            role="tab"
            aria-selected={entityType === 'INVENTORY'}
            data-testid="batch-target-inventory"
            onClick={() => handleSwitchEntity('INVENTORY')}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap transition cursor-pointer ${
              entityType === 'INVENTORY'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-2xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <Package className="w-3.5 h-3.5" />
            <span>{isAr ? 'تحديث أصناف المخزون' : 'Inventory Items'}</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={entityType === 'CUSTOMERS'}
            data-testid="batch-target-customers"
            onClick={() => handleSwitchEntity('CUSTOMERS')}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap transition cursor-pointer ${
              entityType === 'CUSTOMERS'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-2xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>{isAr ? 'تحديث سجلات العملاء' : 'Customer Records'}</span>
          </button>
        </div>
      </div>

      {/* Status / Validation Feedback Banner */}
      {statusMessage && (
        <div
          data-testid="batch-status-banner"
          className={`mx-4 mt-4 p-3 rounded-lg border text-xs font-semibold flex items-center justify-between gap-3 ${
            statusMessage.type === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200'
              : statusMessage.type === 'warning'
              ? 'bg-amber-50 dark:bg-amber-950/50 border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200'
              : 'bg-rose-50 dark:bg-rose-950/50 border-rose-200 dark:border-rose-800 text-rose-900 dark:text-rose-200'
          }`}
        >
          <div className="flex items-center gap-2">
            {statusMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
            )}
            <span>{statusMessage.text}</span>
          </div>
          <button
            type="button"
            aria-label={isAr ? 'إغلاق الإشعار' : 'Dismiss message'}
            onClick={() => setStatusMessage(null)}
            className="text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 cursor-pointer px-1"
          >
            ✕
          </button>
        </div>
      )}

      {/* Action Toolbar & Summary Metrics */}
      <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            data-testid="batch-load-all-btn"
            onClick={handleLoadAllCurrent}
            className="px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer transition"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>
              {isAr
                ? `تحميل كافة السجلات (${entityType === 'INVENTORY' ? products.length : customers.length})`
                : `Load All Current (${entityType === 'INVENTORY' ? products.length : customers.length})`}
            </span>
          </button>

          <button
            type="button"
            data-testid="batch-export-csv-btn"
            onClick={handleDownloadCsv}
            className="px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer transition"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{isAr ? 'تنزيل CSV' : 'Export CSV'}</span>
          </button>

          <button
            type="button"
            data-testid="batch-upload-csv-btn"
            onClick={() => fileInputRef.current?.click()}
            className="px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer transition"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>{isAr ? 'رفع ملف CSV' : 'Upload CSV'}</span>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.tsv,.txt,text/csv"
            onChange={handleFileUpload}
            className="hidden"
          />

          <button
            type="button"
            data-testid="batch-clear-btn"
            onClick={() => {
              setCsvText(
                entityType === 'INVENTORY'
                  ? INVENTORY_BATCH_HEADERS.join(',')
                  : CUSTOMER_BATCH_HEADERS.join(',')
              );
              setStatusMessage(null);
            }}
            className="px-3 py-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer transition"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>{isAr ? 'مسح الصفوف' : 'Clear Rows'}</span>
          </button>
        </div>

        <button
          type="button"
          data-testid="batch-apply-btn"
          disabled={parsedResult.validUpdateCount === 0}
          onClick={handleApplyBatch}
          className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 dark:disabled:bg-slate-700 disabled:text-slate-500 text-white text-xs font-bold flex items-center gap-2 whitespace-nowrap shrink-0 cursor-pointer disabled:cursor-not-allowed transition"
        >
          <Play className="w-3.5 h-3.5" />
          <span>
            {isAr
              ? `تنفيذ التحديث الجماعي (${parsedResult.validUpdateCount})`
              : `Apply Bulk Updates (${parsedResult.validUpdateCount})`}
          </span>
        </button>
      </div>

      {/* Unboxed Typographic Summary Strip + Filter */}
      <div className="px-4 py-2.5 bg-slate-50 dark:bg-slate-950/50 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div
          data-testid="batch-summary-metrics"
          className="flex flex-wrap items-center gap-2 text-slate-600 dark:text-slate-300 font-mono tabular-nums"
        >
          <span>
            {isAr ? 'إجمالي الصفوف:' : 'Rows:'}{' '}
            <strong className="text-slate-900 dark:text-white">{parsedResult.totalRows}</strong>
          </span>
          <span aria-hidden="true" className="text-slate-300 dark:text-slate-700">·</span>
          <span className="text-emerald-700 dark:text-emerald-400">
            {isAr ? 'جاهز للتحديث:' : 'Ready:'}{' '}
            <strong data-testid="batch-ready-count">{parsedResult.validUpdateCount}</strong>
          </span>
          <span aria-hidden="true" className="text-slate-300 dark:text-slate-700">·</span>
          <span>
            {isAr ? 'بدون تغيير:' : 'Unchanged:'} <strong>{parsedResult.unchangedCount}</strong>
          </span>
          <span aria-hidden="true" className="text-slate-300 dark:text-slate-700">·</span>
          <span className={parsedResult.errorCount > 0 ? 'text-rose-600 dark:text-rose-400' : ''}>
            {isAr ? 'أخطاء:' : 'Errors:'}{' '}
            <strong data-testid="batch-error-count">{parsedResult.errorCount}</strong>
          </span>
        </div>

        <div className="flex items-center gap-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-0.5 text-[11px]">
          {[
            { id: 'ALL', label: isAr ? 'الكل' : 'All' },
            { id: 'CHANGES', label: isAr ? 'المعدلة فقط' : 'Modified' },
            { id: 'ERRORS', label: isAr ? 'الأخطاء' : 'Errors' },
          ].map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setFilterMode(f.id as any)}
              className={`px-2.5 py-1 rounded-md font-semibold transition cursor-pointer whitespace-nowrap ${
                filterMode === f.id
                  ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Two-Pane Workspace: Raw CSV/TSV Editor + Live Editable Spreadsheet Diff Grid */}
      <div className="p-4 space-y-4">
        <div className="space-y-1.5">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
            <label
              htmlFor="batch-csv-editor-textarea"
              className="font-bold text-slate-800 dark:text-slate-200"
            >
              {isAr ? 'محرر بيانات CSV / لصق مباشر من Excel' : 'CSV / Tab-Delimited Batch Editor'}
            </label>
            <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400" dir="ltr">
              {expectedHeadersLine}
            </span>
          </div>
          <textarea
            id="batch-csv-editor-textarea"
            data-testid="batch-csv-editor"
            dir="ltr"
            rows={6}
            value={csvText}
            onChange={(e) => setCsvText(e.target.value)}
            placeholder={expectedHeadersLine}
            className="w-full p-3 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 text-xs font-mono tabular-nums text-slate-800 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/40 leading-relaxed"
          />
        </div>

        {/* Spreadsheet Preview & Inline Cell Editor */}
        <div className="border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden">
          {visibleRows.length === 0 ? (
            <div
              data-testid="batch-empty-state"
              className="p-8 text-center text-xs text-slate-500 dark:text-slate-400 space-y-2"
            >
              <p className="font-semibold text-slate-700 dark:text-slate-200">
                {isAr
                  ? 'لا توجد صفوف للعرض في هذا الفلتر أو المحرر فارغ.'
                  : 'No rows to preview for this filter.'}
              </p>
              <button
                type="button"
                onClick={handleLoadAllCurrent}
                className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold cursor-pointer"
              >
                {isAr ? 'تحميل السجلات الحالية' : 'Load Current Records'}
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto max-h-[380px]">
              <table className="w-full text-xs text-start border-collapse">
                <thead className="bg-slate-50 dark:bg-slate-950 text-slate-500 dark:text-slate-400 font-bold border-b border-slate-200 dark:border-slate-800 sticky top-0 z-10">
                  <tr>
                    <th className="py-2 px-3 text-start w-10">#</th>
                    {activeColumns.map((col) => (
                      <th
                        key={col.key}
                        className={`py-2 px-3 whitespace-nowrap ${
                          col.numeric ? 'text-end' : 'text-start'
                        }`}
                      >
                        {col.label}
                      </th>
                    ))}
                    <th className="py-2 px-3 text-start whitespace-nowrap">
                      {isAr ? 'المعاينة والحالة' : 'Status & Diff'}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {visibleRows.map((row) => (
                    <tr
                      key={`${row.lineNumber}-${row.rowIndex}`}
                      data-testid={`batch-preview-row-${row.rowIndex}`}
                      className={`h-10 transition-colors ${
                        row.status === 'VALID_UPDATE'
                          ? 'bg-emerald-50/40 dark:bg-emerald-950/20'
                          : row.status === 'INVALID' || row.status === 'NOT_FOUND'
                          ? 'bg-rose-50/50 dark:bg-rose-950/20'
                          : 'hover:bg-slate-50/70 dark:hover:bg-slate-800/40'
                      }`}
                    >
                      <td className="py-1.5 px-3 font-mono text-slate-400 tabular-nums">
                        {row.rowIndex}
                      </td>
                      {activeColumns.map((col) => {
                        const cellVal = row.rawValues[col.key] ?? '';
                        const hasDiff = row.diffs.some((d) => d.field === col.key);
                        if (!col.editable) {
                          return (
                            <td
                              key={col.key}
                              className="py-1.5 px-3 font-mono font-bold text-slate-800 dark:text-slate-200 whitespace-nowrap tabular-nums"
                              dir="ltr"
                            >
                              {cellVal || row.matchKey}
                            </td>
                          );
                        }
                        return (
                          <td key={col.key} className="py-1 px-2 min-w-[100px]">
                            <input
                              type="text"
                              aria-label={`${row.matchKey} ${col.label}`}
                              data-testid={`batch-cell-${row.rowIndex}-${col.key}`}
                              value={cellVal}
                              onChange={(e) =>
                                handleCellChange(row.lineNumber, col.key, e.target.value)
                              }
                              dir={col.numeric || col.key === 'email' || col.key === 'phone' ? 'ltr' : undefined}
                              className={`w-full px-2 py-1 rounded border text-xs transition focus:outline-hidden focus:ring-2 focus:ring-indigo-500/40 ${
                                col.numeric ? 'font-mono tabular-nums text-end' : ''
                              } ${
                                hasDiff
                                  ? 'border-emerald-400 dark:border-emerald-600 bg-white dark:bg-slate-900 font-bold text-emerald-800 dark:text-emerald-300'
                                  : 'border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-900 text-slate-800 dark:text-slate-200'
                              }`}
                            />
                          </td>
                        );
                      })}
                      <td className="py-1.5 px-3 text-[11px] min-w-[200px]">
                        {row.status === 'VALID_UPDATE' ? (
                          <div className="space-y-0.5">
                            <div className="font-bold text-emerald-700 dark:text-emerald-400">
                              {isAr ? 'جاهز للتحديث' : 'Ready to Update'} ({row.diffs.length})
                            </div>
                            <div className="text-[10px] text-slate-600 dark:text-slate-400 font-mono tabular-nums">
                              {row.diffs
                                .map(
                                  (d) =>
                                    `${isAr ? d.labelAr : d.labelEn}: ${d.oldValue} → ${d.newValue}`
                                )
                                .join(' · ')}
                            </div>
                          </div>
                        ) : row.status === 'UNCHANGED' ? (
                          <span className="text-slate-400 dark:text-slate-500">
                            {isAr ? 'مطابق (بدون تعديل)' : 'Unchanged'}
                          </span>
                        ) : (
                          <span className="font-semibold text-rose-600 dark:text-rose-400">
                            {isAr ? row.errorAr : row.errorEn}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Execution History */}
        {executionLogs.length > 0 && (
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-2">
            <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300">
              {isAr ? 'سجل الدفعات المنفذة في الجلسة' : 'Session Batch Execution History'}
            </h4>
            <div className="divide-y divide-slate-100 dark:divide-slate-800 border border-slate-200 dark:border-slate-800 rounded-lg text-xs">
              {executionLogs.map((log) => (
                <div
                  key={log.id}
                  data-testid="batch-history-entry"
                  className="px-3 py-2 flex flex-wrap items-center justify-between gap-2 text-slate-600 dark:text-slate-300"
                >
                  <span className="font-semibold text-slate-800 dark:text-slate-100">
                    {log.entityType === 'INVENTORY'
                      ? isAr
                        ? 'تحديث جماعي للمخزون'
                        : 'Inventory Bulk Update'
                      : isAr
                      ? 'تحديث جماعي للعملاء'
                      : 'Customer Bulk Update'}
                    {' · '}
                    <span className="font-mono tabular-nums text-emerald-700 dark:text-emerald-400">
                      {log.updatedCount} {isAr ? 'سجل' : 'records'} ({log.totalFieldChanges}{' '}
                      {isAr ? 'حقل' : 'fields'})
                    </span>
                  </span>
                  <span className="font-mono text-[11px] text-slate-400 tabular-nums" dir="ltr">
                    {new Date(log.timestamp).toLocaleTimeString('en-GB')} · {log.actorName} ({currency})
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
