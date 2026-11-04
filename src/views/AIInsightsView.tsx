import React, { useState } from 'react';
import { useERP } from '../context/ERPContext';
import {
  Bot,
  Send,
  Sparkles,
  TrendingUp,
  AlertTriangle,
  FileSearch,
  ShieldCheck,
  CheckCircle2,
  Copy,
  Layers,
} from 'lucide-react';

export const AIInsightsView: React.FC = () => {
  const {
    aiMessages,
    sendAIMessage,
    isAILoading,
    parseInvoiceWithAI,
    products,
    suppliers,
    purchaseOrders,
    addPurchaseOrder,
    salesInvoices,
    currentTenant,
    currentBranch,
    currentWarehouse,
    currency,
    language,
  } = useERP();

  const [inputQuery, setInputQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'copilot' | 'forecasting' | 'ocr'>('copilot');

  // OCR state
  const [ocrText, setOcrText] = useState(
    'INVOICE #INV-9021\nVendor: Global Tools & Machinery GmbH\nItem: Hydraulic High-Pressure Pump 50HP\nQty: 2\nUnit Price: SAR 4,200\nSubtotal: SAR 8,400\nVAT 15%: SAR 1,260\nTotal Due: SAR 9,660'
  );
  const [ocrResult, setOcrResult] = useState<any>(null);
  const [isOcrProcessing, setIsOcrProcessing] = useState(false);
  const [poCreatedNotice, setPoCreatedNotice] = useState<string | null>(null);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputQuery.trim() || isAILoading) return;
    const q = inputQuery.trim();
    setInputQuery('');
    sendAIMessage(q);
  };

  const handleRunOCR = async () => {
    setIsOcrProcessing(true);
    setPoCreatedNotice(null);
    const parsed = await parseInvoiceWithAI(ocrText);
    setOcrResult(parsed);
    setIsOcrProcessing(false);
  };

  const handleCreatePOFromOCR = () => {
    if (!ocrResult || ocrResult.subtotal <= 0) return;
    const matchedSupplier =
      suppliers.find(
        (s) =>
          s.name.toLowerCase().includes((ocrResult.vendor || '').toLowerCase()) ||
          s.nameAr.includes(ocrResult.vendor || '')
      ) || suppliers[0];

    const fallbackProduct = products[0];
    const poItems =
      Array.isArray(ocrResult.items) && ocrResult.items.length > 0
        ? ocrResult.items.map((it: any) => {
            const matchedProd =
              products.find(
                (p) =>
                  p.name.toLowerCase().includes((it.name || '').toLowerCase()) ||
                  p.nameAr.includes(it.name || '')
              ) || fallbackProduct;
            const lineSubtotal = Number(it.total) || Number(ocrResult.subtotal) || 0;
            const lineTax = Math.round(lineSubtotal * 0.15 * 100) / 100;
            return {
              productId: matchedProd?.id || 'prod-ocr-1',
              productName: it.name || matchedProd?.nameAr || 'OCR Imported Item',
              sku: matchedProd?.sku || 'OCR-SKU',
              quantity: Number(it.qty) || 1,
              unitCost: Number(it.unitPrice) || lineSubtotal,
              taxRate: 15,
              taxAmount: lineTax,
              total: Math.round((lineSubtotal + lineTax) * 100) / 100,
            };
          })
        : [
            {
              productId: fallbackProduct?.id || 'prod-ocr-1',
              productName: `${ocrResult.vendor} (${ocrResult.invoiceNumber})`,
              sku: fallbackProduct?.sku || 'OCR-SKU',
              quantity: 1,
              unitCost: Number(ocrResult.subtotal) || 0,
              taxRate: 15,
              taxAmount: Number(ocrResult.vat15) || 0,
              total: Number(ocrResult.totalDue) || 0,
            },
          ];

    addPurchaseOrder({
      tenantId: currentTenant.id,
      warehouseId: currentWarehouse.id,
      supplierId: matchedSupplier?.id || 'sup-1',
      supplierName: ocrResult.vendor || matchedSupplier?.nameAr || 'مورد خارجي',
      orderDate: ocrResult.date || new Date().toISOString().slice(0, 10),
      expectedDate: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
      status: 'APPROVED',
      items: poItems,
      subtotal: Number(ocrResult.subtotal) || 0,
      taxAmount: Number(ocrResult.vat15) || 0,
      total: Number(ocrResult.totalDue) || 0,
    });

    setPoCreatedNotice(
      language === 'ar'
        ? `تم تحويل الفاتورة (${ocrResult.invoiceNumber}) للمورد (${ocrResult.vendor}) بإجمالي ${ocrResult.totalDue} ${currency} إلى أمر شراء فعلي في سجل المشتريات بنجاح!`
        : `Successfully created real Purchase Order from OCR Invoice (${ocrResult.invoiceNumber}) for ${ocrResult.vendor} (${ocrResult.totalDue} ${currency})!`
    );
  };

  const handleCreateReplenishmentPO = (productId: string, suggestedQty: number) => {
    const prod = products.find((p) => p.id === productId);
    if (!prod || suggestedQty <= 0) return;
    const supplier = suppliers[0];
    const subtotal = Math.round(prod.costPrice * suggestedQty * 100) / 100;
    const taxAmount = Math.round(subtotal * (prod.taxRate / 100) * 100) / 100;
    const total = Math.round((subtotal + taxAmount) * 100) / 100;

    addPurchaseOrder({
      tenantId: currentTenant.id,
      warehouseId: currentWarehouse.id,
      supplierId: supplier?.id || 'sup-1',
      supplierName: supplier?.nameAr || 'المورد المعتمد',
      orderDate: new Date().toISOString().slice(0, 10),
      expectedDate: new Date(Date.now() + 5 * 86400000).toISOString().slice(0, 10),
      status: 'APPROVED',
      items: [
        {
          productId: prod.id,
          productName: prod.nameAr,
          sku: prod.sku,
          quantity: suggestedQty,
          unitCost: prod.costPrice,
          taxRate: prod.taxRate,
          taxAmount,
          total,
        },
      ],
      subtotal,
      taxAmount,
      total,
    });

    setPoCreatedNotice(
      language === 'ar'
        ? `تم إصدار أمر شراء تعويضي فعلي للصنف (${prod.nameAr}) بكمية ${suggestedQty} وحدة وإجمالي ${total.toLocaleString()} ${currency}!`
        : `Issued replenishment Purchase Order for ${prod.name} (${suggestedQty} units, ${total.toLocaleString()} ${currency})!`
    );
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Bot className="w-6 h-6 text-purple-600" />
            <span>{language === 'ar' ? 'طبقة الذكاء الاصطناعي المؤسسي (AI Copilot Layer)' : 'Enterprise AI Insights'}</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            {language === 'ar'
              ? 'مساعد المحادثة الذكي، توقع نفاد المخزون وإعادة الطلب، وقراءة فواتير الموردين بالـ OCR'
              : 'Natural language database queries, replenishment predictive analytics, and OCR invoice ingestion'}
          </p>
        </div>

        {/* Sub-tabs */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs font-bold text-slate-700">
          <button
            type="button"
            onClick={() => setActiveTab('copilot')}
            className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${activeTab === 'copilot' ? 'bg-white text-purple-700 shadow-2xs' : 'hover:text-slate-900'}`}
          >
            {language === 'ar' ? 'المساعد التفاعلي' : 'AI Copilot'}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('forecasting')}
            className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${activeTab === 'forecasting' ? 'bg-white text-purple-700 shadow-2xs' : 'hover:text-slate-900'}`}
          >
            {language === 'ar' ? 'التنبؤ بالطلب' : 'Demand Forecast'}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('ocr')}
            className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${activeTab === 'ocr' ? 'bg-white text-purple-700 shadow-2xs' : 'hover:text-slate-900'}`}
          >
            {language === 'ar' ? 'استخراج الفواتير OCR' : 'Invoice OCR'}
          </button>
        </div>
      </div>

      {/* AI Security Guardrail Notice */}
      <div className="bg-purple-50/70 border border-purple-200 rounded-xl p-3 flex items-center justify-between text-xs text-purple-900">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-purple-600 shrink-0" />
          <span>
            {language === 'ar'
              ? 'حواجز الأمان مفعلة: الذكاء الاصطناعي يحلل ويقدم التوصيات ولا يستطيع كتابة أي قيد مالي أو تعديل مخزني دون موافقة بشرية صريحة.'
              : 'AI Security Guardrail: System is read-only and analytical; financial postings require human confirmation.'}
          </span>
        </div>
        <span className="font-mono text-[10px] bg-purple-200/60 px-2 py-0.5 rounded font-bold">
          Guardrails Active
        </span>
      </div>

      {/* 1. Conversational Copilot */}
      {activeTab === 'copilot' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs flex flex-col h-[520px] overflow-hidden">
          {/* Chat History */}
          <div className="flex-1 p-4 overflow-y-auto space-y-3">
            {aiMessages.map((msg) => {
              const isUser = msg.sender === 'user';
              return (
                <div
                  key={msg.id}
                  className={`flex gap-3 text-xs ${isUser ? 'justify-end' : 'justify-start'}`}
                >
                  {!isUser && (
                    <div className="w-7 h-7 rounded-full bg-purple-600 text-white flex items-center justify-center shrink-0 font-bold">
                      <Sparkles className="w-3.5 h-3.5" />
                    </div>
                  )}
                  <div
                    className={`max-w-xl p-3.5 rounded-2xl leading-relaxed ${
                      isUser
                        ? 'bg-indigo-600 text-white rounded-br-none'
                        : 'bg-slate-100 text-slate-800 rounded-bl-none border border-slate-200/60'
                    }`}
                  >
                    <div className="whitespace-pre-wrap">{msg.text}</div>
                    <div
                      className={`text-[9px] mt-1 text-end font-mono ${
                        isUser ? 'text-indigo-200' : 'text-slate-400'
                      }`}
                    >
                      {msg.timestamp}
                    </div>
                  </div>
                </div>
              );
            })}
            {isAILoading && (
              <div className="flex items-center gap-2 text-xs text-purple-600 font-semibold ps-10">
                <span className="w-2 h-2 rounded-full bg-purple-600 animate-ping"></span>
                <span>{language === 'ar' ? 'جارٍ تحليل بيانات ERP واستخراج الإجابة...' : 'Analyzing ERP ledger...'}</span>
              </div>
            )}
          </div>

          {/* Quick Questions Suggestions */}
          <div className="px-4 py-2 bg-slate-50 border-t border-slate-100 flex items-center gap-2 overflow-x-auto text-[11px]">
            <span className="font-bold text-slate-500 shrink-0">
              {language === 'ar' ? 'اقتراحات سريعة:' : 'Quick Prompts:'}
            </span>
            {[
              language === 'ar' ? 'ما هي أكثر الأصناف مبيعاً اليوم؟' : 'What are today’s top sales?',
              language === 'ar' ? 'هل توجد أصناف وصلت لحد إعادة الطلب؟' : 'Which SKUs need reordering?',
              language === 'ar' ? 'قدم ملخصاً لميزان المراجعة والضريبة' : 'Summarize trial balance & VAT',
            ].map((p, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => sendAIMessage(p)}
                className="bg-white hover:bg-purple-50 border border-slate-200 hover:border-purple-300 text-slate-700 hover:text-purple-700 px-2.5 py-1 rounded-lg shrink-0 transition cursor-pointer font-medium"
              >
                {p}
              </button>
            ))}
          </div>

          {/* Chat Input */}
          <form onSubmit={handleSend} className="p-3 border-t border-slate-200 flex items-center gap-2 bg-white">
            <input
              type="text"
              value={inputQuery}
              onChange={(e) => setInputQuery(e.target.value)}
              placeholder={
                language === 'ar'
                  ? 'اسأل المساعد الذكي عن أي استعلام مالي، مبيعات، أو حالة مخزون...'
                  : 'Ask AI Copilot about sales, accounting, or inventory...'
              }
              className="flex-1 text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-hidden focus:border-purple-600 focus:bg-white transition"
            />
            <button
              type="submit"
              disabled={isAILoading || !inputQuery.trim()}
              className="p-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl shadow-xs transition disabled:opacity-40 cursor-pointer"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      )}

      {/* 2. Demand Forecasting Table */}
      {activeTab === 'forecasting' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-5 space-y-4 text-xs">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="font-bold text-slate-900 text-sm">
                {language === 'ar' ? 'تحليل معدل التصريف والتنبؤ بنفاد المخزون' : 'Stock Velocity & Depletion Forecasting'}
              </h3>
              <p className="text-slate-500">
                {language === 'ar' ? 'محسوب استناداً إلى متوسط المبيعات اليومية والأرصدة الحالية' : 'Calculated from historical daily burn rate'}
              </p>
            </div>
            <span className="text-[10px] bg-purple-100 text-purple-800 font-bold px-2.5 py-1 rounded-full">
              AI Velocity Engine
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-start">
              <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3 text-start">{language === 'ar' ? 'الصنف' : 'Product'}</th>
                  <th className="py-2.5 px-3 text-center">{language === 'ar' ? 'الرصيد المتاح' : 'Stock'}</th>
                  <th className="py-2.5 px-3 text-center">{language === 'ar' ? 'معدل السحب اليومي' : 'Daily Sales'}</th>
                  <th className="py-2.5 px-3 text-center">{language === 'ar' ? 'الأيام المتبقية لنفاد المخزون' : 'Days Remaining'}</th>
                  <th className="py-2.5 px-3 text-center font-bold text-purple-800">{language === 'ar' ? 'الكمية المقترحة للطلب' : 'Suggested Order Qty'}</th>
                  <th className="py-2.5 px-3 text-center">{language === 'ar' ? 'مستوى الإلحاح' : 'Urgency'}</th>
                  <th className="py-2.5 px-3 text-center">{language === 'ar' ? 'إجراء التوريد الفعلي' : 'Action'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono">
                {products.map((p) => {
                  const totalSoldQty = salesInvoices
                    .filter((inv) => inv.status !== 'VOID')
                    .reduce((sum, inv) => {
                      const line = inv.items.find((it) => it.productId === p.id);
                      return sum + (line ? line.quantity : 0);
                    }, 0);
                  const dailyBurn = Math.max(1, totalSoldQty > 0 ? totalSoldQty : Math.round(Math.max(1, p.reorderPoint) / 5));
                  const daysLeft = Math.round(p.stockQty / dailyBurn);
                  const isCritical = p.stockQty <= p.reorderPoint || daysLeft <= 10;
                  const suggestedQty = Math.max(p.reorderPoint * 2, dailyBurn * 15);
                  return (
                    <tr key={p.id} className="hover:bg-slate-50/50">
                      <td className="py-2.5 px-3 font-bold font-sans text-slate-800">
                        {language === 'ar' ? p.nameAr : p.name}
                      </td>
                      <td className="py-2.5 px-3 text-center font-bold text-slate-900">{p.stockQty}</td>
                      <td className="py-2.5 px-3 text-center text-slate-600">{dailyBurn} pcs/day</td>
                      <td className="py-2.5 px-3 text-center font-black">
                        <span className={isCritical ? 'text-rose-600' : 'text-emerald-600'}>
                          {daysLeft} {language === 'ar' ? 'يوم' : 'Days'}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-center font-bold text-purple-700 bg-purple-50/40">
                        {suggestedQty} pcs
                      </td>
                      <td className="py-2.5 px-3 text-center font-sans">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            isCritical ? 'bg-rose-100 text-rose-800' : 'bg-emerald-100 text-emerald-800'
                          }`}
                        >
                          {isCritical ? (language === 'ar' ? 'عالي جداً' : 'High') : (language === 'ar' ? 'عادي' : 'Normal')}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-center font-sans">
                        <button
                          type="button"
                          data-testid={`forecast-create-po-btn-${p.sku}`}
                          onClick={() => handleCreateReplenishmentPO(p.id, suggestedQty)}
                          className="px-2.5 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-[10px] font-bold cursor-pointer transition"
                        >
                          {language === 'ar' ? 'إصدار أمر شراء (PO)' : 'Create PO'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {poCreatedNotice && (
            <div
              data-testid="forecast-po-created-banner"
              className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 font-bold text-xs flex items-center justify-between"
            >
              <span>{poCreatedNotice}</span>
              <span className="text-[11px] font-mono bg-emerald-100 px-2 py-0.5 rounded-md">
                إجمالي أوامر الشراء: {purchaseOrders.length}
              </span>
            </div>
          )}
        </div>
      )}

      {/* 3. AI Invoice OCR Parser */}
      {activeTab === 'ocr' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs space-y-4 text-xs">
            <h3 className="font-bold text-sm text-slate-900 border-b border-slate-100 pb-2">
              {language === 'ar' ? 'نص الفاتورة الممسوحة ضوئياً (OCR Input)' : 'Scanned Invoice Raw Text'}
            </h3>
            <textarea
              data-testid="ocr-invoice-textarea"
              value={ocrText}
              onChange={(e) => setOcrText(e.target.value)}
              rows={8}
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-mono outline-hidden focus:border-purple-600"
            />
            <button
              type="button"
              data-testid="ocr-extract-btn"
              onClick={handleRunOCR}
              disabled={isOcrProcessing}
              className="w-full py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl shadow-xs transition flex items-center justify-center gap-2 cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-purple-200" />
              <span>{isOcrProcessing ? (language === 'ar' ? 'جارٍ الاستخراج والتدقيق...' : 'Processing...') : (language === 'ar' ? 'استخراج البيانات المهيكلة بالذكاء الاصطناعي' : 'Extract Structured Data')}</span>
            </button>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs space-y-4 text-xs font-mono">
            <h3 className="font-bold text-sm text-slate-900 border-b border-slate-100 pb-2 font-sans">
              {language === 'ar' ? 'البيانات المستخرجة والمطابقة' : 'Extracted Entities (JSON)'}
            </h3>
            {ocrResult ? (
              <div className="space-y-3 bg-slate-50 p-3.5 rounded-xl border border-purple-200">
                <div className="flex justify-between">
                  <span className="font-sans text-slate-500">Vendor:</span>
                  <span data-testid="ocr-result-vendor" className="font-bold text-slate-900">{ocrResult.vendor}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-sans text-slate-500">Invoice Ref:</span>
                  <span data-testid="ocr-result-inv" className="font-bold text-slate-900">{ocrResult.invoiceNumber}</span>
                </div>
                {Array.isArray(ocrResult.items) && ocrResult.items.length > 0 && (
                  <div className="border-t border-slate-200 pt-2 space-y-1">
                    <div className="font-sans text-[11px] font-bold text-slate-500">Extracted Items:</div>
                    {ocrResult.items.map((it: any, idx: number) => (
                      <div key={idx} className="flex justify-between text-[11px] bg-white px-2 py-1 rounded border border-slate-200">
                        <span>{it.qty}x {it.name}</span>
                        <span className="font-bold">{it.total} {currency}</span>
                      </div>
                    ))}
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="font-sans text-slate-500">Subtotal:</span>
                  <span data-testid="ocr-result-subtotal" className="font-bold">{ocrResult.subtotal} {currency}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-sans text-slate-500">VAT (15%):</span>
                  <span data-testid="ocr-result-vat" className="font-bold">{ocrResult.vat15} {currency}</span>
                </div>
                <div className="flex justify-between border-t border-slate-200 pt-1 font-black text-slate-900">
                  <span className="font-sans">Grand Total:</span>
                  <span data-testid="ocr-result-total" className="text-purple-700">{ocrResult.totalDue} {currency}</span>
                </div>
                <div className="text-[10px] text-emerald-600 font-bold pt-2 border-t border-slate-200 flex items-center justify-between">
                  <span>Confidence Score: {ocrResult.confidence}% ✅</span>
                  <button
                    type="button"
                    data-testid="ocr-create-po-btn"
                    onClick={handleCreatePOFromOCR}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-sans font-bold rounded-lg text-xs cursor-pointer transition"
                  >
                    {language === 'ar' ? 'تحويل الفاتورة إلى أمر شراء فعلي (PO)' : 'Convert to Purchase Order'}
                  </button>
                </div>
                {poCreatedNotice && (
                  <div
                    data-testid="ocr-po-created-banner"
                    className="p-2.5 rounded-lg bg-emerald-100 border border-emerald-300 text-emerald-950 font-sans font-bold text-xs"
                  >
                    {poCreatedNotice} (إجمالي أوامر الشراء: {purchaseOrders.length})
                  </div>
                )}
              </div>
            ) : (
              <div className="h-40 flex items-center justify-center text-slate-400 font-sans">
                {language === 'ar' ? 'انقر على استخراج البيانات لرؤية النتائج المهيكلة' : 'Click extract to see structured invoice fields'}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
