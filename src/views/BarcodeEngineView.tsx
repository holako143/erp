import React, { useState } from 'react';
import { useERP } from '../context/ERPContext';
import {
  Barcode,
  QrCode,
  Printer,
  Search,
  Scan,
  ShieldCheck,
  FileText,
  Clock,
  Layers,
  CheckCircle2,
  AlertCircle,
  Copy,
  Plus,
} from 'lucide-react';
import { BarcodeFormat, SmartLabelOCRResult } from '../types/erp';
import {
  calculateEAN13CheckDigit,
  calculateEAN8CheckDigit,
  generateValidEAN13,
  generateUniqueSerialNumber,
  generateUniqueBatchNumber,
  renderBarcodeSVG,
} from '../core/barcodeEngine';
import {
  BatchScanBufferItem,
  appendScanToBatchBuffer,
  buildArWarehouseOverlayData,
} from '../core/warehouseAdvancedEngine';

export const BarcodeEngineView: React.FC = () => {
  const {
    products,
    updateProduct,
    barcodes,
    generateBarcodeForProduct,
    traceabilityEvents,
    addTraceabilityEvent,
    scanProductLabelWithSmartOCR,
    registerOCRProductOrSerial,
    currency,
    language,
    currentWarehouse,
    currentUser,
    currentTenant,
    dispatchToastAndPushNotification,
  } = useERP();

  const [activeSubTab, setActiveSubTab] = useState<
    'generator' | 'labels' | 'scanner' | 'ocrCamera' | 'traceability' | 'batchScan' | 'arWarehouse'
  >('generator');

  // Batch Scan Mode Temporary Buffer State
  const [batchBuffer, setBatchBuffer] = useState<BatchScanBufferItem[]>(() => {
    const p0 = products[0];
    if (!p0) return [];
    return appendScanToBatchBuffer([], p0.barcode || p0.sku, products, barcodes || [], 2).updatedBuffer;
  });
  const [batchScanInput, setBatchScanInput] = useState<string>('');
  const [batchScanQty, setBatchScanQty] = useState<number>(1);
  const [batchCommitFeedback, setBatchCommitFeedback] = useState<string | null>(null);

  // AR Warehouse View State
  const [arTargetProductId, setArTargetProductId] = useState<string>(products[0]?.id || '');
  const arOverlayNodes = buildArWarehouseOverlayData(products, arTargetProductId);
  const arOverlayData = arOverlayNodes[0] || null;

  React.useEffect(() => {
    const onVoiceAction = (e: Event) => {
      const detail = (e as CustomEvent)?.detail;
      if (detail?.action === 'OPEN_BATCH_SCAN') {
        setActiveSubTab('batchScan');
      } else if (detail?.action === 'OPEN_AR_WAREHOUSE') {
        setActiveSubTab('arWarehouse');
      } else if (detail?.action === 'START_SCAN') {
        setActiveSubTab('scanner');
      }
    };
    window.addEventListener('erp-voice-action', onVoiceAction);
    return () => window.removeEventListener('erp-voice-action', onVoiceAction);
  }, []);

  const handleBatchScanAdd = (e: React.FormEvent) => {
    e.preventDefault();
    const code = batchScanInput.trim() || products[0]?.barcode || '6281042000019';
    setBatchBuffer((prev) =>
      appendScanToBatchBuffer(prev, code, products, barcodes || [], batchScanQty).updatedBuffer
    );
    setBatchScanInput('');
  };

  const handleCommitBatchBufferIntake = () => {
    let updatedCount = 0;
    batchBuffer.forEach((item) => {
      if (item.productId) {
        const prod = products.find((p) => p.id === item.productId);
        if (prod) {
          updateProduct({
            ...prod,
            stockQty: (Number(prod.stockQty) || 0) + item.scannedIntakeQty,
          });
          updatedCount += item.scannedIntakeQty;
        }
      }
    });
    const msg =
      language === 'ar'
        ? `تم اعتماد إدخال الدفعة المجمعة (${batchBuffer.length} صنف / +${updatedCount} وحدة) إلى رصيد المستودع بنجاح!`
        : `Committed batch scan intake (${batchBuffer.length} items / +${updatedCount} units) to inventory!`;
    setBatchCommitFeedback(msg);
    setBatchBuffer([]);
    dispatchToastAndPushNotification({
      titleAr: 'المسح المتتابع المجمع (Batch Scan)',
      titleEn: 'Batch Scan Intake Committed',
      messageAr: msg,
      messageEn: msg,
      severity: 'success',
      category: 'LIVE_EVENTS',
    });
  };

  // Smart Camera / Label OCR State
  const [ocrLabelInput, setOcrLabelInput] = useState<string>(
    'JINKO SOLAR TIGER NEO N-TYPE 585W BIFACIAL | VOC: 51.4V | EFF: 22.65% | BARCODE: 6281042005014 | SN: SN-JNK-2026-99402'
  );
  const [ocrExtracted, setOcrExtracted] = useState<SmartLabelOCRResult | null>(() =>
    scanProductLabelWithSmartOCR(
      'JINKO SOLAR TIGER NEO N-TYPE 585W BIFACIAL | VOC: 51.4V | EFF: 22.65% | BARCODE: 6281042005014 | SN: SN-JNK-2026-99402'
    )
  );
  const [ocrFeedback, setOcrFeedback] = useState<{ ok: boolean; msg: string } | null>(null);

  // Generator State
  const [selectedProductId, setSelectedProductId] = useState<string>(products[0]?.id || '');
  const [selectedFormat, setSelectedFormat] = useState<BarcodeFormat>('EAN-13');
  const [isIndividualPiece, setIsIndividualPiece] = useState(false);
  const [batchCount, setBatchCount] = useState(1);
  const [generatedList, setGeneratedList] = useState<string[]>([]);
  const [justGeneratedCode, setJustGeneratedCode] = useState<string>('6281042000019');

  // Scanner Simulator State
  const [scannedInput, setScannedInput] = useState('');
  const [scanResult, setScanResult] = useState<any>(null);

  // Traceability Search
  const [traceSearchSerial, setTraceSearchSerial] = useState('');

  // Label Printing Format
  const [labelPaperSize, setLabelPaperSize] = useState<'thermal80' | 'a4Sheet'>('thermal80');

  const selectedProduct = products.find((p) => p.id === selectedProductId) || products[0];

  // Handle Generate
  const handleGenerate = () => {
    const list: string[] = [];
    for (let i = 0; i < batchCount; i++) {
      const item = generateBarcodeForProduct(selectedProductId, selectedFormat, isIndividualPiece);
      list.push(item.code);
      if (i === 0) setJustGeneratedCode(item.code);
    }
    setGeneratedList(list);
  };

  // Handle Scanner Input Simulation
  const handleScanSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!scannedInput.trim()) return;

    const trimmed = scannedInput.trim();
    // 1. Search in barcodes
    const barcodeMatch = barcodes.find((b) => b.code === trimmed);
    // 2. Search in products
    const productMatch = products.find((p) => p.barcode === trimmed || p.sku === trimmed);
    // 3. Search in traceability
    const traceMatch = traceabilityEvents.filter((t) => t.serialNumber === trimmed);

    setScanResult({
      code: trimmed,
      barcodeMatch,
      productMatch,
      traceEvents: traceMatch,
      found: !!(barcodeMatch || productMatch || traceMatch.length > 0),
    });

    setScannedInput('');
  };

  // Filtered traceability events
  const filteredEvents = traceabilityEvents.filter((ev) =>
    ev.serialNumber.toLowerCase().includes(traceSearchSerial.toLowerCase())
  );

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Barcode className="w-6 h-6 text-indigo-600" />
            <span>{language === 'ar' ? 'محرك الباركود الفريد والتتبع (Unique ID & Traceability Engine)' : 'Unique ID & Barcode Engine'}</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            {language === 'ar'
              ? 'توليد رموز EAN-13 وCode 128 وQR، ومنع التعارض، وفصل باركود الصنف عن باركود القطعة، وتتبع تاريخي كامل'
              : 'GS1-standard EAN-13, Code 128, QR Code, serialized piece tracking, and label printing'}
          </p>
        </div>

        {/* Sub-tabs */}
        <div className="flex flex-wrap items-center gap-1 bg-slate-100 p-1 rounded-md text-xs font-semibold text-slate-700">
          <button
            type="button"
            data-testid="barcode-tab-generator"
            onClick={() => setActiveSubTab('generator')}
            className={`px-3 py-1.5 rounded transition cursor-pointer ${activeSubTab === 'generator' ? 'bg-white text-slate-900 shadow-2xs' : 'hover:text-slate-900'}`}
          >
            {language === 'ar' ? 'مولد المعرفات' : 'ID Generator'}
          </button>
          <button
            type="button"
            data-testid="barcode-tab-ocr"
            onClick={() => setActiveSubTab('ocrCamera')}
            className={`px-3 py-1.5 rounded transition cursor-pointer ${activeSubTab === 'ocrCamera' ? 'bg-white text-slate-900 shadow-2xs' : 'hover:text-slate-900'}`}
          >
            {language === 'ar' ? 'التعرف بالكاميرا وOCR الملصقات' : 'Smart Label OCR'}
          </button>
          <button
            type="button"
            data-testid="barcode-tab-labels"
            onClick={() => setActiveSubTab('labels')}
            className={`px-3 py-1.5 rounded transition cursor-pointer ${activeSubTab === 'labels' ? 'bg-white text-slate-900 shadow-2xs' : 'hover:text-slate-900'}`}
          >
            {language === 'ar' ? 'مصمم الملصقات' : 'Label Designer'}
          </button>
          <button
            type="button"
            data-testid="barcode-tab-scanner"
            onClick={() => setActiveSubTab('scanner')}
            className={`px-3 py-1.5 rounded transition cursor-pointer ${activeSubTab === 'scanner' ? 'bg-white text-slate-900 shadow-2xs' : 'hover:text-slate-900'}`}
          >
            {language === 'ar' ? 'محاكي وقارئ الباركود' : 'Scanner Terminal'}
          </button>
          <button
            type="button"
            data-testid="barcode-tab-traceability"
            onClick={() => setActiveSubTab('traceability')}
            className={`px-3 py-1.5 rounded transition cursor-pointer ${activeSubTab === 'traceability' ? 'bg-white text-slate-900 shadow-2xs' : 'hover:text-slate-900'}`}
          >
            {language === 'ar' ? 'سجل التتبع الزمني' : 'Audit Traceability'}
          </button>
          <button
            type="button"
            data-testid="barcode-tab-batchScan"
            onClick={() => setActiveSubTab('batchScan')}
            className={`px-3 py-1.5 rounded transition cursor-pointer ${activeSubTab === 'batchScan' ? 'bg-indigo-600 text-white shadow-2xs' : 'hover:text-slate-900'}`}
          >
            {language === 'ar' ? 'المسح المتتابع (Batch Scan)' : 'Batch Scan Mode'}
          </button>
          <button
            type="button"
            data-testid="barcode-tab-arWarehouse"
            onClick={() => setActiveSubTab('arWarehouse')}
            className={`px-3 py-1.5 rounded transition cursor-pointer ${activeSubTab === 'arWarehouse' ? 'bg-indigo-600 text-white shadow-2xs' : 'hover:text-slate-900'}`}
          >
            {language === 'ar' ? 'ملاحة المستودع بالواقع المعزز (AR)' : 'AR Warehouse View'}
          </button>
        </div>
      </div>

      {/* SUB-TAB 1: Generator */}
      {activeSubTab === 'generator' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Configuration Form */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs space-y-4">
            <h3 className="font-bold text-sm text-slate-900 border-b border-slate-100 pb-2 flex items-center justify-between">
              <span>{language === 'ar' ? 'إعدادات توليد المعرف الفريد' : 'Unique ID Generation'}</span>
              <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded font-mono font-bold">
                Collision-Proof
              </span>
            </h3>

            {/* Product Selector */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {language === 'ar' ? 'اختر المنتج المستهدف' : 'Target Product'}
              </label>
              <select
                value={selectedProductId}
                onChange={(e) => setSelectedProductId(e.target.value)}
                className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg outline-hidden focus:border-indigo-500 font-medium"
              >
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {language === 'ar' ? p.nameAr : p.name} (SKU: {p.sku})
                  </option>
                ))}
              </select>
            </div>

            {/* Type: Product Barcode vs Piece Serial Number */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {language === 'ar' ? 'مستوى التتبع' : 'Traceability Level'}
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsIndividualPiece(false);
                    setSelectedFormat('EAN-13');
                  }}
                  className={`p-2 rounded-lg text-xs font-bold border transition text-center cursor-pointer ${
                    !isIndividualPiece
                      ? 'bg-indigo-50 border-indigo-500 text-indigo-700'
                      : 'bg-white border-slate-200 text-slate-600'
                  }`}
                >
                  {language === 'ar' ? 'باركود للصنف العام' : 'Product Level'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsIndividualPiece(true);
                    setSelectedFormat('Code 128');
                  }}
                  className={`p-2 rounded-lg text-xs font-bold border transition text-center cursor-pointer ${
                    isIndividualPiece
                      ? 'bg-indigo-50 border-indigo-500 text-indigo-700'
                      : 'bg-white border-slate-200 text-slate-600'
                  }`}
                >
                  {language === 'ar' ? 'رقم تسلسلي للقطعة الفردية' : 'Item Serial (Unique)'}
                </button>
              </div>
            </div>

            {/* Format Selector */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {language === 'ar' ? 'المعيار الرمزي' : 'Barcode Standard'}
              </label>
              <select
                value={selectedFormat}
                onChange={(e) => setSelectedFormat(e.target.value as BarcodeFormat)}
                className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg outline-hidden focus:border-indigo-500 font-mono font-semibold"
              >
                <option value="EAN-13">EAN-13 (GS1 Retail Standard - 13 Digits)</option>
                <option value="Code 128">Code 128 (Alphanumeric High Density)</option>
                <option value="QR Code">QR Code (High Capacity 2D Matrix)</option>
                <option value="EAN-8">EAN-8 (Compact Retail - 8 Digits)</option>
                <option value="Code 39">Code 39 (Industrial Standard)</option>
              </select>
            </div>

            {/* Quantity to Generate */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {language === 'ar' ? 'عدد المعرفات المراد توليدها' : 'Count to Generate'}
              </label>
              <div className="flex items-center gap-2">
                {[1, 5, 10, 25].map((cnt) => (
                  <button
                    key={cnt}
                    type="button"
                    onClick={() => setBatchCount(cnt)}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-bold border transition cursor-pointer ${
                      batchCount === cnt ? 'haseb-nav-active text-white' : 'bg-slate-100 text-slate-700 border-slate-200'
                    }`}
                  >
                    {cnt}
                  </button>
                ))}
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="button"
              onClick={handleGenerate}
              className="w-full py-2.5 haseb-btn-primary text-white font-semibold text-xs rounded-md transition flex items-center justify-center gap-2 cursor-pointer"
            >
              <Barcode className="w-4 h-4 text-white" />
              <span>{language === 'ar' ? `توليد ${batchCount} معرفات فريدة الآن` : `Generate ${batchCount} Unique IDs`}</span>
            </button>
          </div>

          {/* Real-time Rendered Barcode Preview */}
          <div className="lg:col-span-2 bg-white p-5 rounded-xl border border-slate-200 shadow-2xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-4">
                <span className="font-bold text-sm text-slate-900">
                  {language === 'ar' ? 'المعاينة الفورية للباركود المتولد' : 'Live Vector Barcode Preview'}
                </span>
                <span className="text-xs text-indigo-600 font-mono font-bold bg-indigo-50 px-2.5 py-0.5 rounded">
                  Format: {selectedFormat}
                </span>
              </div>

              {/* Vector SVG Render Box */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-6 flex flex-col items-center justify-center min-h-[180px]">
                {selectedFormat === 'QR Code' ? (
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-32 h-32 bg-white p-3 rounded-lg border border-slate-300 shadow-xs flex items-center justify-center">
                      <QrCode className="w-24 h-24 text-slate-900" />
                    </div>
                    <span className="font-mono text-xs font-bold text-slate-700">{justGeneratedCode}</span>
                  </div>
                ) : (
                  <div className="w-full max-w-md bg-white p-4 rounded-lg border border-slate-300 shadow-xs">
                    <div
                      className="w-full h-24"
                      dangerouslySetInnerHTML={{
                        __html: renderBarcodeSVG(justGeneratedCode, selectedFormat, 65),
                      }}
                    />
                  </div>
                )}

                {/* Details under barcode */}
                <div className="mt-4 text-center">
                  <div className="font-bold text-slate-900 text-sm">
                    {language === 'ar' ? selectedProduct.nameAr : selectedProduct.name}
                  </div>
                  <div className="text-xs text-slate-500 font-mono mt-0.5">
                    SKU: {selectedProduct.sku} • Price: {selectedProduct.salePrice} {currency}
                  </div>
                  {isIndividualPiece && (
                    <div className="mt-1 text-[11px] text-indigo-700 font-bold bg-indigo-100/70 px-2 py-0.5 rounded-full inline-block">
                      {language === 'ar' ? 'قطعة فردية برقم تسلسلي مخصص' : 'Serialized Piece Tracked'}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Generated Batch Table */}
            {generatedList.length > 0 && (
              <div className="mt-4 pt-3 border-t border-slate-100">
                <div className="text-xs font-bold text-slate-700 mb-2">
                  {language === 'ar' ? `المعرفات التي تم توليدها (${generatedList.length}):` : `Generated IDs (${generatedList.length}):`}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-36 overflow-y-auto">
                  {generatedList.map((code, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-1.5 px-2 bg-slate-50 rounded border border-slate-200 text-xs font-mono"
                    >
                      <span className="font-bold text-slate-800">{code}</span>
                      <span className="text-[10px] text-emerald-700 font-semibold">Registered</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* SUB-TAB: Smart Product Identification via Camera & Label OCR (Section 4 & 8) */}
      {activeSubTab === 'ocrCamera' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* Left: Label Camera / OCR Input & Presets */}
          <div className="lg:col-span-5 bg-white p-5 rounded-md border border-slate-200 space-y-4">
            <div className="border-b border-slate-100 pb-3">
              <h3 className="font-bold text-sm text-slate-900">
                منظومة التعرف الضوئي الذكي على ملصقات المنتجات (Smart Label OCR)
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                قراءة ملصق اللوح الشمسي أو البطارية أو الإنفرتر أو الشاشة واستخراج الشركة المصنعة، الموديل، القدرة، السيريال، مع فحص عدم تكرار الرقم التسلسلي
              </p>
            </div>

            <div className="space-y-1.5">
              <div className="text-[11px] font-semibold text-slate-600">
                نماذج ملصقات مصنعية جاهزة للفحص السريع:
              </div>
              <div className="grid grid-cols-2 gap-1.5 text-[11px]">
                <button
                  type="button"
                  onClick={() => {
                    const txt =
                      'JINKO SOLAR TIGER NEO N-TYPE 585W BIFACIAL | VOC: 51.4V | EFF: 22.65% | BARCODE: 6281042005014 | SN: SN-JNK-2026-99402';
                    setOcrLabelInput(txt);
                    setOcrExtracted(scanProductLabelWithSmartOCR(txt));
                  }}
                  className="p-2 text-start rounded border border-slate-200 hover:bg-slate-50 font-medium text-slate-800 cursor-pointer"
                >
                  ملصق لوح شمسي Jinko 585W
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const txt =
                      'DEYE HYBRID INVERTER SUN-8K-SG01LP1 8kW | 48VDC DUAL MPPT | EFF: 97.6% | BARCODE: 6281042005021 | SN: SN-DEYE-8K-2026-7721';
                    setOcrLabelInput(txt);
                    setOcrExtracted(scanProductLabelWithSmartOCR(txt));
                  }}
                  className="p-2 text-start rounded border border-slate-200 hover:bg-slate-50 font-medium text-slate-800 cursor-pointer"
                >
                  ملصق إنفرتر هجين Deye 8kW
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const txt =
                      'FELICITY SOLAR LIFEPO4 BATTERY LPBF48200 48V 200Ah (10.24kWh) | 6000 CYCLES | BARCODE: 6281042005045 | SN: SN-FLC-48V200-3391';
                    setOcrLabelInput(txt);
                    setOcrExtracted(scanProductLabelWithSmartOCR(txt));
                  }}
                  className="p-2 text-start rounded border border-slate-200 hover:bg-slate-50 font-medium text-slate-800 cursor-pointer"
                >
                  ملصق بطارية ليثيوم 48V 200Ah
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const txt =
                      'SAMSUNG QLED 65 INCH 4K SMART TV QA65Q70D 145W | 220VAC | BARCODE: 6281042005069 | SN: SN-SAM-QLED65-8820';
                    setOcrLabelInput(txt);
                    setOcrExtracted(scanProductLabelWithSmartOCR(txt));
                  }}
                  className="p-2 text-start rounded border border-slate-200 hover:bg-slate-50 font-medium text-slate-800 cursor-pointer"
                >
                  ملصق شاشة سامسونج 65" 4K
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                النص المستخرج من الكاميرا / قارئ الملصقات الصناعي (OCR Raw Stream)
              </label>
              <textarea
                rows={3}
                value={ocrLabelInput}
                onChange={(e) => setOcrLabelInput(e.target.value)}
                className="w-full p-2.5 rounded-md border border-slate-300 font-mono text-xs bg-slate-50"
              />
            </div>

            <button
              type="button"
              data-testid="btn-analyze-ocr-label"
              onClick={() => {
                setOcrFeedback(null);
                setOcrExtracted(scanProductLabelWithSmartOCR(ocrLabelInput));
              }}
              className="w-full py-2.5 haseb-btn-primary text-white text-xs font-semibold rounded-md transition cursor-pointer"
            >
              تحليل الملصق واستخراج المواصفات والتحقق من السيريال
            </button>
          </div>

          {/* Right: Human-Reviewed OCR Extraction & Duplicate Serial Guard */}
          <div className="lg:col-span-7 bg-white p-5 rounded-md border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-bold text-sm text-slate-900">
                  نتيجة الاستخراج والمراجعة البشرية قبل الاعتماد المالي والمخزني
                </h3>
                <p className="text-[11px] text-slate-500">
                  مطابقة تلقائية مع كتالوج الأصناف وكشف فوري للأرقام التسلسلية المكررة
                </p>
              </div>
              {ocrExtracted && (
                <span className="px-2.5 py-1 rounded bg-slate-100 border border-slate-200 font-mono text-xs font-bold text-slate-800">
                  دقة التعرف: {ocrExtracted.confidencePercent}%
                </span>
              )}
            </div>

            {ocrFeedback && (
              <div
                className={`p-3 rounded-md border text-xs font-semibold ${
                  ocrFeedback.ok
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                    : 'bg-rose-50 border-rose-200 text-rose-900'
                }`}
              >
                {ocrFeedback.msg}
              </div>
            )}

            {ocrExtracted && (
              <div className="space-y-4 text-xs">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div className="p-3 rounded-md bg-slate-50 border border-slate-200">
                    <div className="text-[11px] text-slate-500">الشركة المصنعة</div>
                    <div className="font-bold text-slate-900 mt-0.5">{ocrExtracted.manufacturer}</div>
                  </div>
                  <div className="p-3 rounded-md bg-slate-50 border border-slate-200">
                    <div className="text-[11px] text-slate-500">كود الموديل (Model)</div>
                    <div className="font-bold font-mono text-slate-900 mt-0.5">{ocrExtracted.modelCode}</div>
                  </div>
                  <div className="p-3 rounded-md bg-slate-50 border border-slate-200">
                    <div className="text-[11px] text-slate-500">الرقم التسلسلي المستخرج (SN)</div>
                    <div className="font-bold font-mono text-teal-700 mt-0.5">{ocrExtracted.serialNumber}</div>
                  </div>
                  <div className="p-3 rounded-md bg-slate-50 border border-slate-200">
                    <div className="text-[11px] text-slate-500">القدرة الكهربائية</div>
                    <div className="font-bold font-mono text-slate-900 mt-0.5">
                      {ocrExtracted.powerRatingWatts ? `${ocrExtracted.powerRatingWatts} W` : '—'}
                    </div>
                  </div>
                  <div className="p-3 rounded-md bg-slate-50 border border-slate-200">
                    <div className="text-[11px] text-slate-500">الفولتية / السعة</div>
                    <div className="font-bold font-mono text-slate-900 mt-0.5">
                      {ocrExtracted.voltageSpec || ocrExtracted.batteryCapacitySpec || 'قياسي'}
                    </div>
                  </div>
                  <div className="p-3 rounded-md bg-slate-50 border border-slate-200">
                    <div className="text-[11px] text-slate-500">باركود GS1 EAN-13</div>
                    <div className="font-bold font-mono text-slate-900 mt-0.5">{ocrExtracted.barcode}</div>
                  </div>
                </div>

                {/* Duplicate Serial Check Status */}
                <div
                  className={`p-3.5 rounded-md border flex items-center justify-between ${
                    ocrExtracted.isDuplicateSerial
                      ? 'bg-rose-50 border-rose-200 text-rose-900'
                      : 'bg-emerald-50 border-emerald-200 text-emerald-900'
                  }`}
                >
                  <div>
                    <div className="font-bold">
                      {ocrExtracted.isDuplicateSerial
                        ? `تحذير: الرقم التسلسلي (${ocrExtracted.serialNumber}) مسجل مسبقاً في النظام!`
                        : `الرقم التسلسلي (${ocrExtracted.serialNumber}) فريد وجاهز للتوثيق المخزني`}
                    </div>
                    <div className="text-[11px] mt-0.5">
                      {ocrExtracted.matchedProductId
                        ? `الصنف المطابق في قاعدة البيانات: ${ocrExtracted.matchedProductName}`
                        : `لم يتم العثور على صنف مطابق — سيقوم النظام بإنشاء بطاقة صنف جديدة عند الاعتماد`}
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    data-testid="btn-approve-ocr-serial"
                    onClick={() => {
                      const res = registerOCRProductOrSerial(ocrExtracted);
                      setOcrFeedback({ ok: res.success, msg: res.messageAr });
                      // Re-evaluate OCR so duplicate check reflects the newly registered serial
                      setOcrExtracted(scanProductLabelWithSmartOCR(ocrLabelInput));
                    }}
                    className="px-5 py-2.5 bg-teal-700 hover:bg-teal-600 text-white font-semibold rounded-md transition cursor-pointer"
                  >
                    اعتماد المراجعة البشرية وتوثيق القطعة والسيريال بالمستودع
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* SUB-TAB 2: Labels Designer & Printable Preview */}
      {activeSubTab === 'labels' && (
        <div className="space-y-4">
          {/* Controls Bar */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-700">
                {language === 'ar' ? 'نوع ورق الطباعة:' : 'Paper Format:'}
              </span>
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
                <button
                  type="button"
                  onClick={() => setLabelPaperSize('thermal80')}
                  className={`px-3 py-1 rounded text-xs font-bold transition cursor-pointer ${
                    labelPaperSize === 'thermal80' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-700 hover:text-slate-900'
                  }`}
                >
                  {language === 'ar' ? 'طابعة حرارية (80mm)' : 'Thermal 80mm'}
                </button>
                <button
                  type="button"
                  onClick={() => setLabelPaperSize('a4Sheet')}
                  className={`px-3 py-1 rounded text-xs font-bold transition cursor-pointer ${
                    labelPaperSize === 'a4Sheet' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-700 hover:text-slate-900'
                  }`}
                >
                  {language === 'ar' ? 'ورقة A4 (24 ملصق)' : 'A4 Sheet (24-up)'}
                </button>
              </div>
            </div>

            <button
              type="button"
              onClick={() => window.print()}
              className="haseb-btn-primary text-white text-xs font-bold px-4 py-2 rounded-xl flex items-center gap-2 shadow-xs transition cursor-pointer"
            >
              <Printer className="w-4 h-4 text-white" />
              <span>{language === 'ar' ? 'طباعة الملصقات الآن (Print)' : 'Print Labels'}</span>
            </button>
          </div>

          {/* Printable Layout Preview */}
          {labelPaperSize === 'thermal80' ? (
            /* 80mm Thermal Receipt Layout */
            <div className="max-w-xs mx-auto bg-white p-5 rounded-xl border border-slate-300 shadow-md text-center space-y-3 font-mono print-receipt">
              <div className="border-b border-dashed border-slate-300 pb-2">
                <div className="font-bold text-sm text-slate-900">{currentTenant.legalName}</div>
                <div className="text-[10px] text-slate-500 mt-0.5">CR: 1010892741 | VAT: 310948271000003</div>
              </div>

              <div>
                <div className="text-xs font-bold text-slate-800 leading-tight">
                  {language === 'ar' ? selectedProduct.nameAr : selectedProduct.name}
                </div>
                <div className="text-[11px] text-slate-600 mt-1">
                  SKU: <span className="font-bold">{selectedProduct.sku}</span>
                </div>
              </div>

              {/* Render Barcode */}
              <div
                className="w-full h-18 py-1"
                dangerouslySetInnerHTML={{
                  __html: renderBarcodeSVG(selectedProduct.barcode, 'Code 128', 50),
                }}
              />

              <div className="flex items-center justify-between border-t border-dashed border-slate-300 pt-2 text-xs">
                <span className="text-slate-500">{language === 'ar' ? 'السعر شامل الضريبة:' : 'Price (incl. VAT):'}</span>
                <span className="font-black text-slate-900 text-sm">
                  {selectedProduct.salePrice} {currency}
                </span>
              </div>
              <div className="text-[9px] text-slate-400">Location: {selectedProduct.binLocation || 'ZA-01'}</div>
            </div>
          ) : (
            /* A4 Sheet 24-up Grid */
            <div className="bg-white p-6 rounded-xl border border-slate-300 shadow-md">
              <div className="text-xs font-bold text-slate-500 mb-3 text-center">
                {language === 'ar' ? 'ورقة ملصقات A4 القياسية (3 أعمدة × 8 صفوف)' : 'A4 24-up Adhesive Label Sheet Preview'}
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div
                    key={i}
                    className="border border-slate-200 p-2.5 rounded-lg text-center space-y-1 bg-slate-50/50"
                  >
                    <div className="text-[11px] font-bold text-slate-800 truncate">
                      {language === 'ar' ? selectedProduct.nameAr : selectedProduct.name}
                    </div>
                    <div
                      className="w-full h-12"
                      dangerouslySetInnerHTML={{
                        __html: renderBarcodeSVG(selectedProduct.barcode, 'Code 128', 35),
                      }}
                    />
                    <div className="flex justify-between items-center text-[10px] font-mono px-1">
                      <span className="text-slate-500">{selectedProduct.sku}</span>
                      <span className="font-bold text-slate-900">
                        {selectedProduct.salePrice} {currency}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* SUB-TAB 3: Scanner Terminal */}
      {activeSubTab === 'scanner' && (
        <div className="max-w-2xl mx-auto bg-white p-6 rounded-xl border border-slate-200 shadow-2xs space-y-6">
          <div className="text-center space-y-1">
            <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center mx-auto">
              <Scan className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-base text-slate-900">
              {language === 'ar' ? 'محاكي وقارئ الباركود (USB / Wireless / Camera)' : 'Barcode Scanner Receiver'}
            </h3>
            <p className="text-xs text-slate-500">
              {language === 'ar'
                ? 'امسح بالماسح الضوئي الفعلي أو الصق أي كود صنف أو رقم تسلسلي للتحقق الفوري'
                : 'Supports physical USB/Bluetooth handheld barcode scanners or manual input'}
            </p>
          </div>

          <form onSubmit={handleScanSubmit} className="space-y-3">
            <div className="relative">
              <input
                type="text"
                value={scannedInput}
                onChange={(e) => setScannedInput(e.target.value)}
                placeholder={
                  language === 'ar'
                    ? 'امسح الباركود هنا (مثال: 6281042000019 أو SN-ALN-2610-8F9A1)...'
                    : 'Scan or type barcode (e.g., 6281042000019 or SN-ALN-2610-8F9A1)...'
                }
                className="w-full p-3 ps-10 bg-slate-50 border border-slate-300 rounded-xl text-sm font-mono outline-hidden focus:border-indigo-600 focus:bg-white transition"
                autoFocus
              />
              <Scan className="w-5 h-5 text-slate-400 absolute start-3 top-3.5" />
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl transition cursor-pointer"
              >
                {language === 'ar' ? 'فحص ومطابقة الرمز' : 'Verify Scanned Code'}
              </button>
              <button
                type="button"
                onClick={() => setScannedInput('SN-ALN-2610-8F9A1')}
                className="px-3 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-mono text-xs rounded-xl cursor-pointer"
              >
                {language === 'ar' ? 'تجربة رقم تسلسلي' : 'Try Serial'}
              </button>
            </div>
          </form>

          {/* Scan Results Box */}
          {scanResult && (
            <div className={`p-4 rounded-xl border ${scanResult.found ? 'bg-emerald-50/70 border-emerald-200' : 'bg-rose-50/70 border-rose-200'}`}>
              <div className="flex items-center gap-2 mb-2 font-bold text-sm">
                {scanResult.found ? (
                  <>
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    <span className="text-emerald-900">{language === 'ar' ? 'تم التعرف على الرمز بنجاح' : 'Barcode Successfully Recognized'}</span>
                  </>
                ) : (
                  <>
                    <AlertCircle className="w-5 h-5 text-rose-600" />
                    <span className="text-rose-900">{language === 'ar' ? 'الرمز غير مسجل في النظام' : 'Unregistered Barcode'}</span>
                  </>
                )}
              </div>

              {scanResult.productMatch && (
                <div className="text-xs space-y-1 text-slate-700 bg-white p-3 rounded-lg border border-emerald-200/60 mt-2">
                  <div className="font-bold text-sm text-slate-900">
                    {language === 'ar' ? scanResult.productMatch.nameAr : scanResult.productMatch.name}
                  </div>
                  <div>SKU: <span className="font-mono font-bold">{scanResult.productMatch.sku}</span></div>
                  <div>
                    {language === 'ar' ? 'الرصيد بالمستودع:' : 'Current Stock:'}{' '}
                    <span className="font-bold text-emerald-700">{scanResult.productMatch.stockQty} {scanResult.productMatch.uom}</span>
                  </div>
                  <div>
                    {language === 'ar' ? 'سعر البيع:' : 'Sale Price:'}{' '}
                    <span className="font-bold">{scanResult.productMatch.salePrice} {currency}</span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* SUB-TAB 4: Traceability Audit Timeline */}
      {activeSubTab === 'traceability' && (
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <div>
              <h3 className="font-bold text-sm text-slate-900">
                {language === 'ar' ? 'تتبع دورة حياة القطعة بالرقم التسلسلي' : 'Serialized Piece Lifecycle Trace'}
              </h3>
              <p className="text-xs text-slate-500">
                {language === 'ar' ? 'سجل غير قابل للتعديل يوثق كل حركة واستلام وجرد ونقل ومبيعات' : 'Immutable audit log of all scans and movements'}
              </p>
            </div>

            {/* Serial Search Input */}
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={traceSearchSerial}
                onChange={(e) => setTraceSearchSerial(e.target.value)}
                placeholder="SN-ALN-2610-8F9A1"
                className="text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg font-mono outline-hidden focus:border-indigo-500 w-56"
              />
            </div>
          </div>

          {/* Timeline Events */}
          <div className="relative border-s border-indigo-200 ms-4 space-y-6 py-2">
            {filteredEvents.map((ev, idx) => (
              <div key={ev.id} className="relative ps-6">
                <span className="absolute -start-2 top-0.5 w-4 h-4 rounded-full bg-indigo-600 border-2 border-white shadow-xs"></span>
                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-indigo-700 bg-indigo-100/70 px-2 py-0.5 rounded text-[10px]">
                      {ev.eventType}
                    </span>
                    <span className="text-slate-400 font-mono text-[10px]">
                      {new Date(ev.timestamp).toLocaleString()}
                    </span>
                  </div>
                  <div className="font-bold text-slate-800 text-sm">{ev.productName}</div>
                  <div className="text-slate-600 font-mono text-[11px]">
                    Serial: <span className="font-bold text-slate-900">{ev.serialNumber}</span> • Ref: {ev.referenceDoc}
                  </div>
                  <p className="text-slate-600 text-xs mt-1">{ev.notes}</p>
                  <div className="text-[10px] text-slate-500 pt-1 border-t border-slate-200/60 flex justify-between">
                    <span>Location: {ev.location}</span>
                    <span>Operator: {ev.operator}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SUB-TAB 5: Batch Scan Mode (Sequential Temporary Buffer Intake) */}
      {activeSubTab === 'batchScan' && (
        <div
          data-testid="barcode-batch-scan-panel"
          className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs space-y-4"
        >
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <div>
              <h3 className="font-bold text-sm text-slate-900">
                {language === 'ar'
                  ? 'وضع المسح التتابعي السريع في الذاكرة المؤقتة (Batch Scan Mode Buffer)'
                  : 'Sequential Batch Scan Mode & Temporary Intake Buffer'}
              </h3>
              <p className="text-xs text-slate-500">
                {language === 'ar'
                  ? 'امسح عدة أصناف متتالية في سلة مؤقتة سريعة ثم اعتمد إضافتها دفعة واحدة للمخزون'
                  : 'Rapidly scan multiple items sequentially into a temporary buffer for faster inventory intake'}
              </p>
            </div>
            <button
              type="button"
              data-testid="batch-scan-commit-btn"
              disabled={batchBuffer.length === 0}
              onClick={handleCommitBatchBufferIntake}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white text-xs font-bold cursor-pointer"
            >
              {language === 'ar'
                ? `اعتماد وترحيل الدفعة للمخزون (${batchBuffer.reduce((s, i) => s + i.scannedIntakeQty, 0)} وحدة)`
                : `Commit Batch Intake (${batchBuffer.reduce((s, i) => s + i.scannedIntakeQty, 0)} units)`}
            </button>
          </div>

          {batchCommitFeedback && (
            <div
              data-testid="batch-scan-commit-banner"
              className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-bold"
            >
              {batchCommitFeedback}
            </div>
          )}

          <form onSubmit={handleBatchScanAdd} className="flex flex-wrap items-center gap-2">
            <input
              type="text"
              data-testid="batch-scan-code-input"
              value={batchScanInput}
              onChange={(e) => setBatchScanInput(e.target.value)}
              placeholder={
                language === 'ar'
                  ? 'امسح الباركود أو SKU (أو اضغط مسح لإضافة الصنف الافتراضي)...'
                  : 'Scan barcode or SKU...'
              }
              className="flex-1 min-w-[220px] px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs font-mono"
            />
            <input
              type="number"
              min={1}
              max={500}
              data-testid="batch-scan-qty-input"
              value={batchScanQty}
              onChange={(e) => setBatchScanQty(Math.max(1, Number(e.target.value) || 1))}
              className="w-24 px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs font-mono"
            />
            <button
              type="submit"
              data-testid="batch-scan-append-btn"
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold cursor-pointer"
            >
              {language === 'ar' ? '+ مسح وإضافة للذاكرة المؤقتة' : '+ Scan to Buffer'}
            </button>
          </form>

          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100 text-slate-700">
                  <th className="p-2.5 text-start">{language === 'ar' ? 'الرمز الممسوح' : 'Scanned Code'}</th>
                  <th className="p-2.5 text-start">{language === 'ar' ? 'الصنف المطابق' : 'Matched Item'}</th>
                  <th className="p-2.5 text-center">{language === 'ar' ? 'الرف' : 'Bin'}</th>
                  <th className="p-2.5 text-center">{language === 'ar' ? 'الكمية بالذاكرة' : 'Buffered Qty'}</th>
                  <th className="p-2.5 text-center">{language === 'ar' ? 'سعر الوحدة' : 'Unit Cost'}</th>
                </tr>
              </thead>
              <tbody>
                {batchBuffer.map((item) => (
                  <tr key={item.id} className="border-t border-slate-100">
                    <td className="p-2.5 font-mono font-bold">{item.barcode}</td>
                    <td className="p-2.5 font-semibold">
                      {language === 'ar' ? item.nameAr : item.nameEn} ({item.sku})
                    </td>
                    <td className="p-2.5 text-center font-mono">{item.binLocation}</td>
                    <td className="p-2.5 text-center font-mono font-bold text-indigo-600">
                      +{item.scannedIntakeQty}
                    </td>
                    <td className="p-2.5 text-center font-mono">
                      {item.unitCost.toLocaleString()} {currency}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SUB-TAB 6: AR Warehouse View (Live Camera Feed + Stock HUD + Aisle Navigation Path) */}
      {activeSubTab === 'arWarehouse' && arOverlayData && (
        <div
          data-testid="barcode-ar-warehouse-panel"
          className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs space-y-4"
        >
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <div>
              <h3 className="font-bold text-sm text-slate-900">
                {language === 'ar'
                  ? 'منظور المستودع بالواقع المعزز وتوجيه الممرات (AR Warehouse Navigation View)'
                  : 'AR Warehouse Camera Overlay & Aisle Path Navigation'}
              </h3>
              <p className="text-xs text-slate-500">
                {language === 'ar'
                  ? 'يعرض بيانات الرصيد الفوري ومسار التوجيه البصري للممر والرف مباشرة فوق بث الكاميرا'
                  : 'Overlays real-time stock telemetry and aisle navigation paths onto the camera feed'}
              </p>
            </div>

            <select
              data-testid="ar-warehouse-product-select"
              value={arTargetProductId}
              onChange={(e) => setArTargetProductId(e.target.value)}
              className="px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs font-bold"
            >
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.sku} — {language === 'ar' ? p.nameAr : p.name} ({p.binLocation || 'Z1-A01'})
                </option>
              ))}
            </select>
          </div>

          <div
            data-testid="ar-warehouse-camera-hud"
            className="relative rounded-2xl overflow-hidden bg-slate-950 border-2 border-indigo-500/60 min-h-[380px] p-5 flex flex-col justify-between text-white"
          >
            {/* Top AR HUD Telemetry Overlay */}
            <div className="flex flex-wrap items-start justify-between gap-4 z-10">
              <div className="p-3.5 rounded-xl bg-slate-900/85 backdrop-blur-md border border-cyan-400/50 space-y-1 max-w-sm">
                <div className="flex items-center gap-2 text-[11px] font-mono text-cyan-300">
                  <span>AR TARGET LOCK</span>
                  <span>•</span>
                  <span>BIN: {arOverlayData.binCode}</span>
                </div>
                <div className="text-sm font-black">
                  {language === 'ar' ? arOverlayData.nameAr : arOverlayData.nameEn}
                </div>
                <div className="text-xs font-mono text-slate-300">
                  SKU: {arOverlayData.sku} · Stock: {arOverlayData.stockQty} units · Status:{' '}
                  <span className="text-emerald-400 font-bold">{arOverlayData.stockStatus}</span>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-900/85 backdrop-blur-md border border-indigo-400/50 text-end font-mono">
                <div className="text-[10px] text-indigo-300">AISLE NAVIGATION TELEMETRY</div>
                <div className="text-lg font-black text-cyan-300">
                  {arOverlayData.distanceMeters}m · ~{Math.ceil(arOverlayData.distanceMeters * 1.4)}s
                </div>
                <div className="text-[11px] text-slate-300">
                  Zone {arOverlayData.zone} → Aisle {arOverlayData.aisle} → Shelf {arOverlayData.shelfLevel}
                </div>
              </div>
            </div>

            {/* Center SVG AR Path Navigation Overlay */}
            <div className="my-2 flex items-center justify-center z-10">
              <svg
                data-testid="ar-warehouse-path-svg"
                viewBox="0 0 100 100"
                className="w-full max-w-md h-48"
              >
                <defs>
                  <linearGradient id="arPathGrad" x1="0" y1="1" x2="0" y2="0">
                    <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.95" />
                    <stop offset="100%" stopColor="#22c55e" stopOpacity="0.95" />
                  </linearGradient>
                </defs>
                {/* Perspective Corridor Grid Lines */}
                <line x1="12" y1="95" x2="36" y2="12" stroke="#334155" strokeWidth="1" strokeDasharray="2 2" />
                <line x1="88" y1="95" x2="64" y2="12" stroke="#334155" strokeWidth="1" strokeDasharray="2 2" />
                {/* Dynamic Aisle Navigation Path */}
                <polyline
                  fill="none"
                  stroke="url(#arPathGrad)"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  points={arOverlayData.svgPathWaypoints.map((pt) => `${pt.x},${pt.y}`).join(' ')}
                />
                {arOverlayData.svgPathWaypoints.map((wp, idx) => (
                  <g key={idx} transform={`translate(${wp.x}, ${wp.y})`}>
                    <circle r="3.5" fill="#06b6d4" stroke="#ffffff" strokeWidth="1" />
                  </g>
                ))}
              </svg>
            </div>

            {/* Bottom Waypoint Guidance Strip */}
            <div className="p-3 rounded-xl bg-slate-900/85 border border-slate-700 text-xs font-bold text-cyan-200 z-10">
              {language === 'ar' ? arOverlayData.turnDirectionAr : arOverlayData.turnDirectionEn}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
