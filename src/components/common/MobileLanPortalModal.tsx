import React, { useState } from 'react';
import { useERP } from '../../context/ERPContext';
import {
  Wifi,
  Smartphone,
  Copy,
  Check,
  ExternalLink,
  RefreshCw,
  X,
  Server,
  ShoppingCart,
  Utensils,
  ChefHat,
  PackageCheck,
  Search,
  CheckCircle2,
  AlertTriangle,
  ArrowRightLeft,
  SlidersHorizontal,
} from 'lucide-react';
import { generateGeneralQRCodeMatrix } from '../../core/communicationsEngine';
import { calculateStockAdjustmentVariance } from '../../core/inventoryEngine';

export const MobileLanPortalModal: React.FC = () => {
  const {
    isLanPortalOpen,
    closeLanPortal,
    networkInfo,
    refreshNetworkInfo,
    products,
    updateProduct,
    addJournalEntry,
    currency,
    language,
    currentBranch,
    setActiveTab,
    formatCurrency,
  } = useERP();

  const [activeSubTab, setActiveSubTab] = useState<'QR_LINK' | 'WORKSPACES' | 'STOCK_COUNT' | 'FIREWALL'>('QR_LINK');
  const [copiedLink, setCopiedLink] = useState(false);
  const [selectedIpOverride, setSelectedIpOverride] = useState<string>('');
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Mobile Stock Taking State
  const [stockSearchQuery, setStockSearchQuery] = useState('');
  const [selectedProductId, setSelectedProductId] = useState<string>(products[0]?.id || '');
  const [countedQtyInput, setCountedQtyInput] = useState<number>(products[0]?.stockQty || 0);
  const [stockAdjustmentFeedback, setStockAdjustmentFeedback] = useState<{
    type: 'success' | 'error';
    messageAr: string;
  } | null>(null);

  if (!isLanPortalOpen) return null;

  const activeLanUrl =
    selectedIpOverride ||
    networkInfo?.primaryLanUrl ||
    (typeof window !== 'undefined'
      ? `${window.location.protocol}//${window.location.hostname}:${window.location.port || '3000'}`
      : 'http://192.168.1.105:3000');

  const qrMatrix = generateGeneralQRCodeMatrix(activeLanUrl, 25);

  const selectedProduct = products.find((p) => p.id === selectedProductId) || products[0];

  const handleCopy = () => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(activeLanUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 3000);
    }
  };

  const handleRefreshNet = async () => {
    setIsRefreshing(true);
    await refreshNetworkInfo();
    setIsRefreshing(false);
  };

  const handleSelectProduct = (pId: string) => {
    setSelectedProductId(pId);
    const prod = products.find((p) => p.id === pId);
    if (prod) {
      setCountedQtyInput(prod.stockQty);
    }
  };

  const handleCommitStockAdjustment = () => {
    if (!selectedProduct) return;
    const varianceResult = calculateStockAdjustmentVariance(
      selectedProduct.id,
      selectedProduct.stockQty,
      countedQtyInput,
      selectedProduct.costPrice
    );

    // Update product in memory store
    const updatedProd = {
      ...selectedProduct,
      stockQty: countedQtyInput,
    };
    updateProduct(updatedProd);

    // Post double-entry adjustment journal if variance != 0
    if (varianceResult.journalLines.length > 0) {
      addJournalEntry({
        date: new Date().toISOString().slice(0, 10),
        memo: `تسوية جردية ميدانية عبر الجوال والشبكة - الصنف ${selectedProduct.nameAr} (${varianceResult.varianceQty > 0 ? '+' : ''}${varianceResult.varianceQty})`,
        lines: varianceResult.journalLines.map((l) => ({
          accountId: l.accountId,
          debit: l.debit,
          credit: l.credit,
          memo: l.memo,
        })),
      });
    }

    setStockAdjustmentFeedback({
      type: 'success',
      messageAr:
        varianceResult.adjustmentType === 'MATCHED'
          ? `تم تأكيد مطابقة الرصيد الفعلي للصنف (${selectedProduct.nameAr}) بنجاح.`
          : `تم ترحيل التسوية الجردية (${varianceResult.varianceQty > 0 ? 'فائض +' : 'عجز '}${varianceResult.varianceQty}) بقيمة ${formatCurrency(varianceResult.varianceValue)} وتحديث رصيد المخزون وقيد اليومية آلياً.`,
    });

    setTimeout(() => setStockAdjustmentFeedback(null), 5000);
  };

  const currentVariance = selectedProduct
    ? calculateStockAdjustmentVariance(
        selectedProduct.id,
        selectedProduct.stockQty,
        countedQtyInput,
        selectedProduct.costPrice
      )
    : null;

  return (
    <div
      data-testid="mobile-lan-portal-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/75 backdrop-blur-sm animate-fadeIn"
    >
      <div className="bg-white dark:bg-slate-900 w-full max-w-4xl rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-slate-950 via-sky-950 to-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-sky-500/20 text-sky-400 rounded-xl border border-sky-500/30">
              <Wifi className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-black tracking-tight">
                  بوابة الربط والدخول عبر الشبكة المحلية والجوال (LAN & Wi-Fi Station)
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-500 text-slate-950">
                  شبكة داخلية فائقة السرعة
                </span>
              </div>
              <p className="text-xs text-sky-200 mt-0.5">
                تفاعل فوري بدون إنترنت عبر الراوتر أو شبكة Wi-Fi المحلية لجميع أجهزة الجوال والكمبيوتر
              </p>
            </div>
          </div>

          <button
            type="button"
            data-testid="btn-close-lan-modal"
            onClick={closeLanPortal}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Sub-Tabs Nav */}
        <div className="px-6 bg-slate-100 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 flex gap-2 overflow-x-auto text-xs font-bold">
          <button
            type="button"
            data-testid="tab-lan-qr"
            onClick={() => setActiveSubTab('QR_LINK')}
            className={`py-3 px-4 border-b-2 transition flex items-center gap-2 cursor-pointer ${
              activeSubTab === 'QR_LINK'
                ? 'border-sky-500 text-sky-600 dark:text-sky-400 bg-white dark:bg-slate-900 rounded-t-lg'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Smartphone className="w-4 h-4 text-sky-500" />
            <span>مسح كود الـ QR والرابط المباشر</span>
          </button>

          <button
            type="button"
            data-testid="tab-lan-workspaces"
            onClick={() => setActiveSubTab('WORKSPACES')}
            className={`py-3 px-4 border-b-2 transition flex items-center gap-2 cursor-pointer ${
              activeSubTab === 'WORKSPACES'
                ? 'border-sky-500 text-sky-600 dark:text-sky-400 bg-white dark:bg-slate-900 rounded-t-lg'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <SlidersHorizontal className="w-4 h-4 text-emerald-500" />
            <span>أوضاع العمل عبر الجوال (Mobile Workspaces)</span>
          </button>

          <button
            type="button"
            data-testid="tab-lan-stock-count"
            onClick={() => setActiveSubTab('STOCK_COUNT')}
            className={`py-3 px-4 border-b-2 transition flex items-center gap-2 cursor-pointer ${
              activeSubTab === 'STOCK_COUNT'
                ? 'border-sky-500 text-sky-600 dark:text-sky-400 bg-white dark:bg-slate-900 rounded-t-lg'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <PackageCheck className="w-4 h-4 text-amber-500" />
            <span>جرد المستودع بالكاميرا بالجوال</span>
          </button>

          <button
            type="button"
            data-testid="tab-lan-firewall"
            onClick={() => setActiveSubTab('FIREWALL')}
            className={`py-3 px-4 border-b-2 transition flex items-center gap-2 cursor-pointer ${
              activeSubTab === 'FIREWALL'
                ? 'border-sky-500 text-sky-600 dark:text-sky-400 bg-white dark:bg-slate-900 rounded-t-lg'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Server className="w-4 h-4 text-indigo-500" />
            <span>إرشادات جدار الحماية (Firewall Port 3000)</span>
          </button>
        </div>

        {/* Body Content */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* TAB 1: QR & DIRECT LINK */}
          {activeSubTab === 'QR_LINK' && (
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
              {/* Left Column: QR Code Renderer */}
              <div className="md:col-span-5 flex flex-col items-center justify-center p-6 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700 text-center space-y-3">
                <div className="p-4 bg-white rounded-2xl shadow-lg border border-slate-200 inline-block">
                  <svg
                    viewBox={`0 0 ${qrMatrix.length} ${qrMatrix.length}`}
                    className="w-52 h-52 block"
                    style={{ shapeRendering: 'crispEdges' }}
                  >
                    {qrMatrix.map((row, r) =>
                      row.map((val, c) =>
                        val ? (
                          <rect key={`${r}-${c}`} x={c} y={r} width="1" height="1" fill="#0f172a" />
                        ) : null
                      )
                    )}
                  </svg>
                </div>
                <div>
                  <h4 className="text-sm font-black text-slate-900 dark:text-slate-100">
                    امسح الكود بكاميرا الجوال
                  </h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    افتح كاميرا أي هاتف متصل بنفس شبكة الـ Wi-Fi للدخول المباشر
                  </p>
                </div>
              </div>

              {/* Right Column: Connection Details */}
              <div className="md:col-span-7 space-y-5">
                <div className="space-y-2">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    رابط الدخول عبر المتصفح (LAN Web URL):
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      readOnly
                      data-testid="lan-primary-url-input"
                      value={activeLanUrl}
                      className="flex-1 p-3 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl font-mono text-sm font-bold text-sky-600 dark:text-sky-400 select-all"
                      dir="ltr"
                    />
                    <button
                      type="button"
                      data-testid="btn-copy-lan-link"
                      onClick={handleCopy}
                      className="px-4 py-3 bg-sky-600 hover:bg-sky-500 text-white font-bold rounded-xl text-xs transition flex items-center gap-1.5 cursor-pointer"
                    >
                      {copiedLink ? <Check className="w-4 h-4 text-emerald-300" /> : <Copy className="w-4 h-4" />}
                      <span>{copiedLink ? 'تم النسخ!' : 'نسخ'}</span>
                    </button>
                  </div>
                </div>

                {/* Available Network Interfaces */}
                {networkInfo && networkInfo.lanAddresses.length > 0 && (
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                        عناوين الـ IP المتاحة على هذا الجهاز:
                      </span>
                      <button
                        type="button"
                        onClick={handleRefreshNet}
                        className="text-[11px] text-sky-600 dark:text-sky-400 font-bold flex items-center gap-1 hover:underline cursor-pointer"
                      >
                        <RefreshCw className={`w-3 h-3 ${isRefreshing ? 'animate-spin' : ''}`} />
                        <span>تحديث العناوين</span>
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {networkInfo.lanAddresses.map((ip) => {
                        const url = `http://${ip}:${networkInfo.port}`;
                        const isSelected = activeLanUrl === url;
                        return (
                          <button
                            key={ip}
                            type="button"
                            onClick={() => setSelectedIpOverride(url)}
                            className={`p-2.5 rounded-xl border text-start transition cursor-pointer ${
                              isSelected
                                ? 'bg-sky-50 dark:bg-sky-950/40 border-sky-400 text-sky-800 dark:text-sky-200 font-bold'
                                : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100'
                            }`}
                          >
                            <div className="font-mono text-xs" dir="ltr">
                              {ip}
                            </div>
                            <div className="text-[10px] text-slate-400">
                              {ip.startsWith('192.168.')
                                ? 'شبكة Wi-Fi محلية اعتيادية'
                                : ip.startsWith('10.')
                                ? 'شبكة مؤسسية خاصة (Corporate)'
                                : 'منفذ شبكة فرعي'}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Status Metrics Bar */}
                <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 grid grid-cols-3 gap-2 text-center text-xs">
                  <div>
                    <div className="text-slate-400 text-[10px]">المنفذ الافتراضي</div>
                    <div className="font-mono font-bold text-slate-800 dark:text-slate-200" dir="ltr">
                      {networkInfo?.port || 3000} TCP
                    </div>
                  </div>
                  <div>
                    <div className="text-slate-400 text-[10px]">سرعة استجابة RAM-DB</div>
                    <div className="font-mono font-bold text-emerald-600" dir="ltr">
                      {'< 1 ms (لحظي)'}
                    </div>
                  </div>
                  <div>
                    <div className="text-slate-400 text-[10px]">الفرع النشط</div>
                    <div className="font-bold text-slate-800 dark:text-slate-200 truncate">
                      {currentBranch.nameAr}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: MOBILE WORKSPACES */}
          {activeSubTab === 'WORKSPACES' && (
            <div className="space-y-4">
              <p className="text-xs text-slate-500">
                اختر شاشة العمل المخصصة لعرضها مباشرة على جوال الموظف أو جهاز التابلت:
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[
                  {
                    title: 'شاشة نقطة البيع المحمولة (Mobile POS)',
                    desc: 'مناسبة للمبيعات السريعة، عربات البيع، وفواتير التوصيل عبر الجوال.',
                    icon: ShoppingCart,
                    tab: 'pos',
                    color: 'emerald',
                  },
                  {
                    title: 'جهاز نادل المطعم وطلبات الطاولات (Mobile Waiter)',
                    desc: 'فتح الطاولات وتسجيل طلبات الزبائن وإرسالها لحظياً للمطبخ.',
                    icon: Utensils,
                    tab: 'pos',
                    color: 'amber',
                  },
                  {
                    title: 'شاشة عرض المطبخ التفاعلية (Kitchen KDS)',
                    desc: 'متابعة الطلبات الجاري تحضيرها في المطبخ وتحديث حالتها فوراً.',
                    icon: ChefHat,
                    tab: 'pos',
                    color: 'rose',
                  },
                  {
                    title: 'محطة الواتساب والرسائل المتكاملة',
                    desc: 'متابعة المحادثات وإرسال الفواتير وسندات القبض عبر الجوال.',
                    icon: Smartphone,
                    tab: 'communications',
                    color: 'sky',
                  },
                ].map((ws) => {
                  const Icon = ws.icon;
                  return (
                    <div
                      key={ws.title}
                      className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2.5"
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-sky-500/10 text-sky-600 dark:text-sky-400 rounded-xl font-bold">
                          <Icon className="w-5 h-5" />
                        </div>
                        <div>
                          <h4 className="font-bold text-xs text-slate-900 dark:text-slate-100">
                            {ws.title}
                          </h4>
                          <p className="text-[11px] text-slate-500">{ws.desc}</p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          closeLanPortal();
                          setActiveTab(ws.tab);
                        }}
                        className="w-full py-2 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-800 dark:text-slate-200 font-bold rounded-lg text-xs transition flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>فتح هذه الشاشة الآن</span>
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 3: MOBILE STOCK TAKING */}
          {activeSubTab === 'STOCK_COUNT' && (
            <div className="space-y-5">
              <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl text-xs text-amber-900 dark:text-amber-200">
                <strong>جرد المستودع الميداني عبر الجوال:</strong> يتيح هذا الوضع لموظف المستودع التجول بين الرفوف، مسح باركود الصنف أو اختياره، وإدخال الكمية الفعلية ليقوم النظام تلقائياً باحتساب الفارق وترحيل قيد تسوية جردية متزن.
              </div>

              {stockAdjustmentFeedback && (
                <div
                  data-testid="stock-adj-feedback-banner"
                  className={`p-3 rounded-xl text-xs font-bold flex items-center gap-2 border ${
                    stockAdjustmentFeedback.type === 'success'
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                      : 'bg-rose-50 text-rose-800 border-rose-300'
                  }`}
                >
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{stockAdjustmentFeedback.messageAr}</span>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-start">
                {/* Product Search & Picker (Left 5 Cols) */}
                <div className="md:col-span-5 space-y-2">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    البحث واختيار الصنف للجرد:
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={stockSearchQuery}
                      onChange={(e) => setStockSearchQuery(e.target.value)}
                      placeholder="بحث بالاسم أو الباركود أو SKU..."
                      className="w-full p-2.5 ps-8 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs"
                    />
                    <Search className="w-4 h-4 text-slate-400 absolute start-2.5 top-3" />
                  </div>

                  <div className="max-h-56 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl">
                    {products
                      .filter(
                        (p) =>
                          p.nameAr.toLowerCase().includes(stockSearchQuery.toLowerCase()) ||
                          p.sku.toLowerCase().includes(stockSearchQuery.toLowerCase()) ||
                          p.barcode.includes(stockSearchQuery)
                      )
                      .slice(0, 10)
                      .map((p) => (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => handleSelectProduct(p.id)}
                          className={`w-full p-2.5 text-start text-xs transition flex items-center justify-between cursor-pointer ${
                            selectedProductId === p.id
                              ? 'bg-sky-50 dark:bg-sky-950/40 text-sky-900 dark:text-sky-200 font-bold'
                              : 'hover:bg-slate-50 dark:hover:bg-slate-800/40 text-slate-700 dark:text-slate-300'
                          }`}
                        >
                          <div>
                            <div className="truncate max-w-[200px]">{p.nameAr}</div>
                            <div className="text-[10px] text-slate-400 font-mono" dir="ltr">
                              {p.sku} • {p.barcode}
                            </div>
                          </div>
                          <span className="font-mono font-bold bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-[11px]">
                            {p.stockQty} {p.uom}
                          </span>
                        </button>
                      ))}
                  </div>
                </div>

                {/* Stock Count Editor & Variance Card (Right 7 Cols) */}
                {selectedProduct && (
                  <div className="md:col-span-7 bg-slate-50 dark:bg-slate-800/60 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-4">
                    <div className="border-b border-slate-200 dark:border-slate-700 pb-3">
                      <h4 className="font-black text-sm text-slate-900 dark:text-slate-100">
                        {selectedProduct.nameAr}
                      </h4>
                      <p className="text-[11px] text-slate-500 font-mono mt-0.5" dir="ltr">
                        SKU: {selectedProduct.sku} | Barcode: {selectedProduct.barcode}
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
                        <span className="text-slate-500 block text-[11px]">الرصيد الدفتري بالنظام:</span>
                        <span className="text-base font-black font-mono text-slate-900 dark:text-slate-100" dir="ltr">
                          {selectedProduct.stockQty} {selectedProduct.uom}
                        </span>
                      </div>

                      <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
                        <span className="text-slate-500 block text-[11px]">تكلفة الوحدة (WAC):</span>
                        <span className="text-base font-black font-mono text-slate-900 dark:text-slate-100" dir="ltr">
                          {selectedProduct.costPrice} {currency}
                        </span>
                      </div>
                    </div>

                    {/* Counted Quantity Input */}
                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                        الكمية الفعلية المحصورة بالجرد:
                      </label>
                      <input
                        type="number"
                        data-testid="input-physical-count"
                        value={countedQtyInput}
                        onChange={(e) => setCountedQtyInput(Number(e.target.value))}
                        className="w-full p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-base font-black font-mono text-sky-600 focus:outline-none focus:ring-2 focus:ring-sky-500"
                        dir="ltr"
                      />
                    </div>

                    {/* Variance Evaluation Banner */}
                    {currentVariance && (
                      <div
                        className={`p-3 rounded-xl border text-xs flex items-center justify-between font-bold ${
                          currentVariance.adjustmentType === 'SURPLUS'
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                            : currentVariance.adjustmentType === 'DEFICIT'
                            ? 'bg-rose-50 text-rose-800 border-rose-300'
                            : 'bg-slate-100 text-slate-700 border-slate-200'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          {currentVariance.adjustmentType === 'SURPLUS' ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                          ) : currentVariance.adjustmentType === 'DEFICIT' ? (
                            <AlertTriangle className="w-4 h-4 text-rose-600" />
                          ) : (
                            <Check className="w-4 h-4 text-slate-500" />
                          )}
                          <span>
                            {currentVariance.adjustmentType === 'SURPLUS'
                              ? `فائض في الجرد (+${currentVariance.varianceQty} ${selectedProduct.uom})`
                              : currentVariance.adjustmentType === 'DEFICIT'
                              ? `عجز في الجرد (${currentVariance.varianceQty} ${selectedProduct.uom})`
                              : 'الرصيد الفعلي مطابق تماماً للرصيد الدفتري'}
                          </span>
                        </div>

                        <span className="font-mono text-xs" dir="ltr">
                          قيمة الفارق: {formatCurrency(currentVariance.varianceValue)}
                        </span>
                      </div>
                    )}

                    <button
                      type="button"
                      data-testid="btn-commit-stock-adjustment"
                      onClick={handleCommitStockAdjustment}
                      className="w-full py-3 bg-sky-600 hover:bg-sky-500 text-white font-bold rounded-xl text-xs transition shadow-md flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <PackageCheck className="w-4 h-4" />
                      <span>اعتماد نتيجة الجرد وترحيل القيد آلياً</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 4: FIREWALL & OFFLINE LAN INSTRUCTIONS */}
          {activeSubTab === 'FIREWALL' && (
            <div className="space-y-4 text-xs text-slate-700 dark:text-slate-300">
              <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2">
                <h4 className="font-bold text-sm text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <Server className="w-4 h-4 text-indigo-500" />
                  <span>طريقة السماح بالاتصال عبر جدار حماية ويندوز (Windows Firewall):</span>
                </h4>
                <p className="text-slate-500 leading-relaxed">
                  إذا واجهتك صعوبة في فتح الرابط من الجوال، افتح موجه الأوامر (CMD كمسؤول) ونفذ الأمر التالي لفتح المنفذ 3000 بنقرة واحدة:
                </p>
                <div className="p-3 bg-slate-950 text-emerald-400 font-mono text-xs rounded-xl overflow-x-auto select-all" dir="ltr">
                  netsh advfirewall firewall add rule name="RLM ERP LAN" dir=in action=allow protocol=TCP localport=3000
                </div>
              </div>

              <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2">
                <h4 className="font-bold text-sm text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <Wifi className="w-4 h-4 text-sky-500" />
                  <span>العمل في بيئة أوفلاين بالكامل (بدون اتصال بالإنترنت):</span>
                </h4>
                <p className="text-slate-500 leading-relaxed">
                  النظام يدعم العمل 100% بدون أي حاجة للإنترنت. كل ما تحتاجه هو راوتر محلي (Wi-Fi Router أو سويتش شبكة سلكي) وربط كمبيوتر الخادم الرئيسي مع جوالات ونقاط بيع الموظفين على نفس الراوتر.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
