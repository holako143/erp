import React, { useState, useRef, useEffect, useMemo, useCallback, Suspense, lazy } from 'react';
import { useERP } from '../context/ERPContext';
import {
  isSecureCameraContext,
  mapCameraErrorToArabicMessage,
} from '../core/cameraScannerEngine';
import {
  Package,
  Plus,
  Search,
  Filter,
  FileSpreadsheet,
  Upload,
  CheckCircle2,
  MessageSquare,
  Network,
  ArrowRightLeft,
  Server,
  CheckCheck,
  ClipboardCheck,
  ShoppingCart,
  Camera,
  Trash2,
  Edit3,
  Sparkles,
  RefreshCw,
  Minus,
  FolderPlus,
  ScanLine,
  X,
  BarChart3,
  Volume2,
  VolumeX,
  Zap,
  AlertTriangle,
  Image as ImageIcon,
} from 'lucide-react';
import type { ScannedBatchItem } from '../components/common/CameraBarcodeScannerModal';
import { WorkspaceTabResizerBar } from '../components/common/WorkspaceTabResizerBar';
import { IndustryType, ElectronicsSubCategory, Product, ProductUnitOption } from '../types/erp';
import { sanitizeProductUnitOptions } from '../core/multiUnitAndProcurementEngine';
import {
  calculateStockAdjustmentVariance,
  SPECIFIC_INVENTORY_CLASSIFICATIONS,
  generateUniqueProductBarcode,
  generateUniqueProductSku,
  extractCartonBarcodeAndSkuFromLabel,
  resolveSpecificProductClassificationAr,
  buildInventoryMiniDashboardAnalytics,
  processFastStockTakeScan,
  FastStockTakeScanEntry,
  FastStockTakeAudioTone,
  PRESET_PRODUCT_ILLUSTRATIONS,
  getProductVisualIllustrationUri,
} from '../core/inventoryEngine';
import { InventoryProductRow } from '../components/inventory/InventoryProductRow';
import { StockTakingRow } from '../components/inventory/StockTakingRow';
import { HasebBrandLogo } from '../components/common/HasebBrandLogo';
import { MobileQuickActionsSheet } from '../components/common/MobileQuickActionsSheet';
import {
  MobileQuickActionTarget,
  MobileQuickActionDescriptor,
} from '../core/mobileTouchEngine';

const CameraBarcodeScannerModal = lazy(() =>
  import('../components/common/CameraBarcodeScannerModal').then((m) => ({
    default: m.CameraBarcodeScannerModal,
  }))
);
const InventoryMiniDashboard = lazy(() => import('../components/inventory/InventoryMiniDashboard'));
const InventoryBulkImportModal = lazy(
  () => import('../components/inventory/InventoryBulkImportModal')
);

const InventoryModalLoadingFallback: React.FC = () => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs">
    <div className="bg-white rounded-2xl px-6 py-4 shadow-xl border border-slate-200 flex items-center gap-3 text-xs font-bold text-slate-800">
      <HasebBrandLogo size="sm" />
      <div className="space-y-1">
        <div>جاري تجهيز المكون...</div>
        <div className="w-24 h-1 rounded-full bg-slate-200 overflow-hidden">
          <div className="w-12 h-full rounded-full haseb-shimmer-bar" />
        </div>
      </div>
    </div>
  </div>
);

export const InventoryView: React.FC = React.memo(() => {
  const {
    products,
    addProduct,
    updateProduct,
    deleteProduct,
    importBulkProductsCSV,
    categories,
    addCategory,
    updateCategory,
    currentWarehouse,
    currency,
    language,
    currentTenant,
    hasPermission,
    masterSystemConfig,
    openQuickSendModal,
    openCrossBranchModal,
    branchNodes,
    interBranchTransfers,
    advanceBranchTransfer,
    formatCurrency,
    addToPOSCart,
    setActiveTab,
    addManualJournalEntry,
    salesInvoices,
  } = useERP();

  const [inventorySubTab, setInventorySubTab] = useState<'ITEMS' | 'STOCK_TAKING' | 'BRANCH_TRANSFERS'>('ITEMS');
  const [transferFeedback, setTransferFeedback] = useState<string | null>(null);

  // Interactive Recharts Mini-Dashboard State
  const [isMiniDashboardOpen, setIsMiniDashboardOpen] = useState<boolean>(true);

  // Physical Stock-Taking State (الجرد الفعلي اللحظي) & Fast Stock-Take Mode (الجرد السريع المتتالي)
  const [stockCountsMap, setStockCountsMap] = useState<Record<string, number>>({});
  const [stockAuditReason, setStockAuditReason] = useState<string>(
    'جرد فعلي دوري لمستودع الطاقة الشمسية والبطاريات والشاشات'
  );
  const [stockTakeBanner, setStockTakeBanner] = useState<string | null>(null);

  // Fast Stock-Take Mode State (وضع الجرد السريع بالباركود المتتالي + التنبيهات الصوتية والمرئية)
  const [isFastStockTakeOpen, setIsFastStockTakeOpen] = useState<boolean>(true);
  const [fastScanCodeInput, setFastScanCodeInput] = useState<string>('');
  const [fastScanQtyInput, setFastScanQtyInput] = useState<number>(1);
  const [fastScanEntryMode, setFastScanEntryMode] = useState<'INCREMENT' | 'SET_EXACT'>('INCREMENT');
  const [fastScanAudioEnabled, setFastScanAudioEnabled] = useState<boolean>(true);
  const [fastScanLog, setFastScanLog] = useState<FastStockTakeScanEntry[]>([]);
  const [latestFastScanAlert, setLatestFastScanAlert] = useState<FastStockTakeScanEntry | null>(null);
  const fastBarcodeInputRef = useRef<HTMLInputElement | null>(null);

  // Web Audio API Synthesizer for Fast Stock-Take Mode (تنبيهات صوتية فورية للتطابق أو الاختلاف)
  const playFastStockTakeAudio = (tone: FastStockTakeAudioTone) => {
    if (!fastScanAudioEnabled) return;
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const now = ctx.currentTime;

      const playNote = (freq: number, startOffset: number, duration: number, type: OscillatorType = 'sine', gainVal = 0.14) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(freq, now + startOffset);
        gain.gain.setValueAtTime(gainVal, now + startOffset);
        gain.gain.exponentialRampToValueAtTime(0.001, now + startOffset + duration);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + startOffset);
        osc.stop(now + startOffset + duration);
      };

      if (tone === 'MATCH_SUCCESS_CHIME') {
        // Ascending pleasant dual chime on exact match
        playNote(880, 0, 0.12, 'sine', 0.16);
        playNote(1318.5, 0.11, 0.22, 'triangle', 0.18);
      } else if (tone === 'DIFF_WARNING_BEEP') {
        // Two-tone warning beep when counted < system stock
        playNote(480, 0, 0.12, 'triangle', 0.15);
        playNote(360, 0.14, 0.18, 'triangle', 0.15);
      } else if (tone === 'SURPLUS_ALERT_BEEP') {
        // Triple pulse when counted > system stock (surplus)
        playNote(660, 0, 0.09, 'sine', 0.15);
        playNote(520, 0.1, 0.09, 'sine', 0.15);
        playNote(784, 0.2, 0.16, 'triangle', 0.16);
      } else {
        // Error buzz when barcode not found
        playNote(220, 0, 0.18, 'sawtooth', 0.14);
        playNote(165, 0.19, 0.24, 'sawtooth', 0.14);
      }

      setTimeout(() => {
        ctx.close().catch(() => {});
      }, 700);
    } catch {
      // ignore audio context restrictions in headless environments
    }
  };

  // Live Camera Barcode Scanner State & Handlers (Main Table & Stock-Taking)
  const [isCameraScannerOpen, setIsCameraScannerOpen] = useState(false);
  const [cameraScannerContext, setCameraScannerContext] = useState<'ITEMS' | 'STOCK_TAKE'>('ITEMS');

  const handleCameraBarcodeScan = useCallback(
    (scannedCode: string, matchedProduct?: any, qty = 1) => {
      if (cameraScannerContext === 'STOCK_TAKE') {
        if (matchedProduct) {
          setStockCountsMap((prev) => ({
            ...prev,
            [matchedProduct.id]: (prev[matchedProduct.id] ?? matchedProduct.stockQty) + qty,
          }));
          setStockTakeBanner(
            `تم مسح الباركود [${scannedCode}] للصنف (${matchedProduct.nameAr}) وتحديث الرصيد الفعلي للجرد بمقدار +${qty}.`
          );
        } else {
          setStockTakeBanner(`الباركود [${scannedCode}] غير مسجل في قاعدة الأصناف.`);
        }
      } else {
        if (matchedProduct) {
          setSearchQuery(matchedProduct.sku || matchedProduct.nameAr);
        } else {
          setSearchQuery(scannedCode);
        }
      }
    },
    [cameraScannerContext]
  );

  const handleCameraBatchScanComplete = useCallback(
    (batchItems: ScannedBatchItem[]) => {
      if (cameraScannerContext === 'STOCK_TAKE') {
        let count = 0;
        setStockCountsMap((prev) => {
          const next = { ...prev };
          batchItems.forEach((item) => {
            if (item.product) {
              next[item.product.id] = (next[item.product.id] ?? item.product.stockQty) + item.quantity;
              count += item.quantity;
            }
          });
          return next;
        });
        if (count > 0) {
          setStockTakeBanner(`تم تطبيق جرد ${count} قطع بنجاح من المسح المتعدد بالكاميرا على محضر الجرد.`);
        }
      } else {
        if (batchItems.length > 0 && batchItems[0].product) {
          setSearchQuery(batchItems[0].product.sku);
        }
      }
    },
    [cameraScannerContext]
  );

  const showCostPrice = masterSystemConfig.uiElementsVisibility.showCostPriceInInventory;
  const showExportImport = masterSystemConfig.uiElementsVisibility.showExportImportButtons;

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedSubCatFilter, setSelectedSubCatFilter] = useState<string>('ALL');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [importBanner, setImportBanner] = useState<string | null>(null);
  const [productModalError, setProductModalError] = useState<string | null>(null);
  const [productModalNotice, setProductModalNotice] = useState<string | null>(null);

  // Specific Electronics & Solar Categories (Memoized)
  const electronicsCategories = useMemo(
    () => categories.filter((c) => !c.industry || c.industry === 'electronics'),
    [categories]
  );

  // Form State for Add / Edit Product
  const [name, setName] = useState('');
  const [nameAr, setNameAr] = useState('');
  const [sku, setSku] = useState('');
  const [barcode, setBarcode] = useState('');
  const [categoryId, setCategoryId] = useState(
    electronicsCategories[0]?.id || 'cat-solar-panels'
  );
  const [productIndustry, setProductIndustry] = useState<IndustryType>('electronics');
  const [uom, setUom] = useState('PCS');
  const [costPrice, setCostPrice] = useState<number>(100);
  const [salePrice, setSalePrice] = useState<number>(150);
  const [stockQty, setStockQty] = useState<number>(20);
  const [reorderPoint, setReorderPoint] = useState<number>(5);
  const [binLocation, setBinLocation] = useState('ZA-01-S1-B01');
  const [warrantyMonths, setWarrantyMonths] = useState<number>(24);
  const [subCategory, setSubCategory] = useState<ElectronicsSubCategory>('SOLAR_PANEL');
  const [powerRatingWatts, setPowerRatingWatts] = useState<number>(585);
  const [batteryCapacitySpec, setBatteryCapacitySpec] = useState<string>('');
  const [voltageSpec, setVoltageSpec] = useState<string>('48V DC');
  const [screenSizeSpec, setScreenSizeSpec] = useState<string>('');
  const [productImageUrl, setProductImageUrl] = useState<string>('');
  const [productUnits, setProductUnits] = useState<ProductUnitOption[]>([]);
  const [expiryDate] = useState<string>('2027-09-30');
  const [prepTimeMinutes] = useState<number>(12);

  const handleProductImageFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const result = ev.target?.result;
      if (typeof result === 'string') {
        setProductImageUrl(result);
        setProductModalNotice(`تم إرفاق صورة الصنف (${file.name}) بنجاح!`);
        setTimeout(() => setProductModalNotice(null), 3500);
      }
    };
    reader.readAsDataURL(file);
  };

  // Custom / Edit Specific Category Inline State inside Modal
  const [isCustomCategoryOpen, setIsCustomCategoryOpen] = useState(false);
  const [customCategoryMode, setCustomCategoryMode] = useState<'ADD' | 'EDIT'>('ADD');
  const [customCategoryNameAr, setCustomCategoryNameAr] = useState('');

  // Carton / Piece Camera Scanner inside Add/Edit Product Modal (for Barcode & SKU)
  const [cartonCaptureTarget, setCartonCaptureTarget] = useState<'BARCODE' | 'SKU' | null>(null);
  const [cartonRawLabelInput, setCartonRawLabelInput] = useState('');
  const [isLiveWebcamActive, setIsLiveWebcamActive] = useState(false);
  const [cartonCameraError, setCartonCameraError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const stopCartonWebcam = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsLiveWebcamActive(false);
  };

  useEffect(() => {
    return () => {
      stopCartonWebcam();
    };
  }, []);

  const startCartonWebcam = async () => {
    setCartonCameraError(null);
    stopCartonWebcam();

    const secure = typeof window !== 'undefined' && isSecureCameraContext(window.location);
    if (!secure || typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      const info = mapCameraErrorToArabicMessage(new Error('Secure context required'), secure);
      setCartonCameraError(info.messageAr);
      setIsLiveWebcamActive(false);
      return;
    }

    const attempts: MediaStreamConstraints[] = [
      { video: { facingMode: { ideal: 'environment' } }, audio: false },
      { video: { facingMode: { ideal: 'user' } }, audio: false },
      { video: true, audio: false },
    ];

    let lastErr: unknown = null;
    for (const constraints of attempts) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        streamRef.current = stream;
        setIsLiveWebcamActive(true);
        setTimeout(() => {
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            videoRef.current.setAttribute('playsinline', 'true');
            videoRef.current.muted = true;
            videoRef.current.play().catch(() => {});
          }
        }, 60);
        return;
      } catch (err) {
        lastErr = err;
      }
    }

    setIsLiveWebcamActive(false);
    setCartonCameraError(mapCameraErrorToArabicMessage(lastErr, secure).messageAr);
  };

  // Clear / Reset All Fields in Add Product Form (أيقونة سلة الحذف لتفريغ كافة حقول القائمة)
  const handleClearAddProductForm = () => {
    setName('');
    setNameAr('');
    setSku('');
    setBarcode('');
    setCostPrice(0);
    setSalePrice(0);
    setStockQty(0);
    setReorderPoint(5);
    setBinLocation('');
    setWarrantyMonths(12);
    setPowerRatingWatts(0);
    setBatteryCapacitySpec('');
    setVoltageSpec('');
    setScreenSizeSpec('');
    setProductImageUrl('');
    setProductModalError(null);
    setCartonCaptureTarget(null);
    stopCartonWebcam();
    setProductModalNotice('تم مسح وحذف جميع البيانات في قائمة إضافة الصنف بنجاح.');
    setTimeout(() => setProductModalNotice(null), 4000);
  };

  // Generate Unique Item Barcode (الأيقونة الأولى بجانب الباركود)
  const handleGenerateItemBarcode = () => {
    const existingBarcodes = products
      .filter((p) => p.id !== editingProductId)
      .map((p) => p.barcode);
    const newBar = generateUniqueProductBarcode(subCategory, existingBarcodes);
    setBarcode(newBar);
    setProductModalNotice(`تم توليد باركود جديد خاص بهذا الصنف: ${newBar}`);
    setTimeout(() => setProductModalNotice(null), 3500);
  };

  // Generate Unique Item SKU (الأيقونة الأولى بجانب كود الصنف)
  const handleGenerateItemSku = () => {
    const existingSkus = products
      .filter((p) => p.id !== editingProductId)
      .map((p) => p.sku);
    const newSku = generateUniqueProductSku({
      subCategory,
      nameAr,
      powerRatingWatts,
      existingSkus,
    });
    setSku(newSku);
    setProductModalNotice(`تم توليد كود صنف (SKU) ذكي وفريد لهذا الصنف: ${newSku}`);
    setTimeout(() => setProductModalNotice(null), 3500);
  };

  // Open Carton Camera Scanner for Barcode or SKU (الأيقونة الثانية: كاميرا لتصوير الكرتون أو القطعة)
  const handleOpenCartonCameraFor = (target: 'BARCODE' | 'SKU') => {
    if (cartonCaptureTarget === target) {
      stopCartonWebcam();
      setCartonCaptureTarget(null);
      return;
    }
    setCartonCaptureTarget(target);
    const defaultSample =
      subCategory === 'SOLAR_PANEL'
        ? `CARTON: JINKO TIGER NEO N-TYPE 585W | MODEL: SOL-JNK-${Math.floor(500 + Math.random() * 400)} | EAN: ${generateUniqueProductBarcode('SOLAR_PANEL', products.map((p) => p.barcode))}`
        : subCategory === 'HYBRID_INVERTER'
        ? `CARTON: DEYE HYBRID INVERTER 8KW | P/N: INV-DEYE-${Math.floor(100 + Math.random() * 800)} | EAN: ${generateUniqueProductBarcode('HYBRID_INVERTER', products.map((p) => p.barcode))}`
        : subCategory === 'LITHIUM_BATTERY'
        ? `CARTON: FELICITY LIFEPO4 48V 200AH | P/N: BAT-LFP-${Math.floor(100 + Math.random() * 800)} | EAN: ${generateUniqueProductBarcode('LITHIUM_BATTERY', products.map((p) => p.barcode))}`
        : `CARTON: SMART 4K QLED 65" | MODEL: SCR-QLED-${Math.floor(100 + Math.random() * 800)} | EAN: ${generateUniqueProductBarcode(subCategory, products.map((p) => p.barcode))}`;
    setCartonRawLabelInput(defaultSample);
    startCartonWebcam();
  };

  // Apply Carton Optical Scan to Barcode and/or SKU
  const handleApplyCartonScan = (mode: 'TARGET_ONLY' | 'BOTH_AND_SPECS' = 'TARGET_ONLY') => {
    const existingBarcodes = products
      .filter((p) => p.id !== editingProductId)
      .map((p) => p.barcode);
    const existingSkus = products
      .filter((p) => p.id !== editingProductId)
      .map((p) => p.sku);

    const extracted = extractCartonBarcodeAndSkuFromLabel(
      cartonRawLabelInput,
      subCategory,
      existingBarcodes,
      existingSkus
    );

    if (cartonCaptureTarget === 'BARCODE') {
      setBarcode(extracted.extractedBarcode);
      if (mode === 'BOTH_AND_SPECS') {
        if (!sku.trim()) setSku(extracted.extractedSku);
        if (!nameAr.trim()) {
          setNameAr(extracted.detectedNameAr);
          setName(extracted.detectedNameAr);
        }
      }
      setProductModalNotice(
        `تم التقاط الباركود (${extracted.extractedBarcode}) من تصوير الكرتون/القطعة بنجاح!`
      );
    } else if (cartonCaptureTarget === 'SKU') {
      setSku(extracted.extractedSku);
      if (mode === 'BOTH_AND_SPECS') {
        if (!barcode.trim()) setBarcode(extracted.extractedBarcode);
        if (!nameAr.trim()) {
          setNameAr(extracted.detectedNameAr);
          setName(extracted.detectedNameAr);
        }
      }
      setProductModalNotice(
        `تم التقاط كود الصنف (${extracted.extractedSku}) من تصوير الكرتون/القطعة بنجاح!`
      );
    }

    stopCartonWebcam();
    setCartonCaptureTarget(null);
    setTimeout(() => setProductModalNotice(null), 4000);
  };

  const handleCartonImageFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const baseName = file.name.replace(/\.[^.]+$/, '').toUpperCase();
    const simulatedLabel = `IMAGE_FILE: ${baseName} | P/N: ${generateUniqueProductSku({
      subCategory,
      nameAr: baseName,
      powerRatingWatts,
      existingSkus: products.map((p) => p.sku),
    })} | EAN: ${generateUniqueProductBarcode(subCategory, products.map((p) => p.barcode))}`;
    setCartonRawLabelInput(simulatedLabel);
  };

  // Open Modal for Creating a New Product
  const handleOpenCreateModal = () => {
    setEditingProductId(null);
    setProductModalError(null);
    setProductModalNotice(null);
    setCartonCaptureTarget(null);
    stopCartonWebcam();

    const defaultSpec = SPECIFIC_INVENTORY_CLASSIFICATIONS[0];
    setCategoryId(defaultSpec.categoryId);
    setSubCategory(defaultSpec.subCategory);
    setWarrantyMonths(defaultSpec.defaultWarrantyMonths);
    setName('');
    setNameAr('');
    setSku(
      generateUniqueProductSku({
        subCategory: defaultSpec.subCategory,
        powerRatingWatts: 585,
        existingSkus: products.map((p) => p.sku),
      })
    );
    setBarcode(
      generateUniqueProductBarcode(
        defaultSpec.subCategory,
        products.map((p) => p.barcode)
      )
    );
    setCostPrice(360);
    setSalePrice(480);
    setStockQty(20);
    setReorderPoint(5);
    setBinLocation('ZA-01-S1-B01');
    setPowerRatingWatts(585);
    setVoltageSpec('48V DC');
    setBatteryCapacitySpec('');
    setScreenSizeSpec('');
    setProductImageUrl('');
    setProductUnits([]);
    setProductIndustry('electronics');
    setIsAddModalOpen(true);
  };

  // Open Modal for Editing an Existing Product (تعديل الصنف بالكامل) - Memoized for InventoryProductRow
  const handleOpenEditModal = useCallback(
    (product: Product) => {
      setEditingProductId(product.id);
      setProductModalError(null);
      setProductModalNotice(null);
      setCartonCaptureTarget(null);
      stopCartonWebcam();

      setName(product.name);
      setNameAr(product.nameAr);
      setSku(product.sku);
      setBarcode(product.barcode);

      // Resolve specific categoryId
      const matchedSpec = SPECIFIC_INVENTORY_CLASSIFICATIONS.find(
        (c) => c.categoryId === product.categoryId || c.subCategory === product.subCategory
      );
      setCategoryId(
        product.categoryId && product.categoryId !== 'cat-electronics'
          ? product.categoryId
          : matchedSpec?.categoryId || electronicsCategories[0]?.id || 'cat-solar-panels'
      );
      setSubCategory((product.subCategory as ElectronicsSubCategory) || matchedSpec?.subCategory || 'SOLAR_PANEL');
      setUom(product.uom || 'PCS');
      setCostPrice(product.costPrice);
      setSalePrice(product.salePrice);
      setStockQty(product.stockQty);
      setReorderPoint(product.reorderPoint || 5);
      setBinLocation(product.binLocation || 'ZA-01-S1-B01');
      setWarrantyMonths(product.warrantyMonths ?? 24);
      setPowerRatingWatts(product.powerRatingWatts ?? 0);
      setBatteryCapacitySpec(product.batteryCapacitySpec || '');
      setVoltageSpec(product.voltageSpec || '');
      setScreenSizeSpec(product.screenSizeSpec || '');
      setProductImageUrl(product.imageUrl || '');
      setProductUnits(Array.isArray(product.units) ? product.units : []);
      setProductIndustry(product.industry || 'electronics');
      setIsAddModalOpen(true);
    },
    [electronicsCategories]
  );

  // Handle Category Selection Change -> Synchronize SubCategory & Default Warranty
  const handleSelectSpecificCategory = (selectedCatId: string) => {
    setCategoryId(selectedCatId);
    const spec = SPECIFIC_INVENTORY_CLASSIFICATIONS.find((c) => c.categoryId === selectedCatId);
    if (spec) {
      setSubCategory(spec.subCategory);
      if (!editingProductId) {
        setWarrantyMonths(spec.defaultWarrantyMonths);
      }
    }
  };

  // Handle Adding or Renaming a Specific Category
  const handleSaveCustomCategory = () => {
    if (!customCategoryNameAr.trim()) return;
    if (customCategoryMode === 'ADD') {
      const created = addCategory(customCategoryNameAr.trim());
      setCategoryId(created.id);
      setProductModalNotice(`تم إنشاء التصنيف المخزني الجديد (${created.nameAr}) واختياره.`);
    } else {
      const currentCat = categories.find((c) => c.id === categoryId);
      if (currentCat) {
        updateCategory({
          ...currentCat,
          nameAr: customCategoryNameAr.trim(),
          name: customCategoryNameAr.trim(),
        });
        setProductModalNotice(`تم تعديل مسمى التصنيف المخزني إلى (${customCategoryNameAr.trim()}).`);
      }
    }
    setCustomCategoryNameAr('');
    setIsCustomCategoryOpen(false);
    setTimeout(() => setProductModalNotice(null), 3500);
  };

  // Filtered Products dedicated to Electronics, Solar Energy, Batteries, Inverters & Smart Screens (Memoized)
  const electronicsProducts = useMemo(
    () => products.filter((p) => !p.industry || p.industry === 'electronics'),
    [products]
  );

  const filteredProducts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const specForCat = SPECIFIC_INVENTORY_CLASSIFICATIONS.find(
      (c) => c.categoryId === selectedCategory
    );
    return electronicsProducts.filter((p) => {
      const matchesSearch =
        !q ||
        p.name.toLowerCase().includes(q) ||
        p.nameAr.includes(searchQuery) ||
        p.sku.toLowerCase().includes(q) ||
        p.barcode.includes(searchQuery);

      const matchesCategory =
        selectedCategory === 'all' ||
        p.categoryId === selectedCategory ||
        Boolean(specForCat && p.subCategory === specForCat.subCategory);

      const matchesSubCat =
        selectedSubCatFilter === 'ALL' ||
        p.subCategory === selectedSubCatFilter ||
        (selectedSubCatFilter === 'LITHIUM_BATTERY' &&
          (p.subCategory === 'LITHIUM_BATTERY' || p.subCategory === 'GEL_BATTERY'));
      return matchesSearch && matchesCategory && matchesSubCat;
    });
  }, [electronicsProducts, searchQuery, selectedCategory, selectedSubCatFilter]);

  // Inline Quick Stock Adjustment (+1 / -1) in Inventory Table (Memoized)
  const handleQuickStockStep = useCallback(
    (product: Product, delta: number) => {
      const nextQty = Math.max(0, product.stockQty + delta);
      updateProduct({
        ...product,
        stockQty: nextQty,
      });
      setImportBanner(
        `تم تحديث رصيد المخزون للصنف (${product.nameAr}) إلى ${nextQty} ${product.uom}.`
      );
      setTimeout(() => setImportBanner(null), 3500);
    },
    [updateProduct]
  );

  const handleGoToStockTake = useCallback((p: Product) => {
    setStockCountsMap((prev) => ({
      ...prev,
      [p.id]: prev[p.id] ?? p.stockQty,
    }));
    setInventorySubTab('STOCK_TAKING');
  }, []);

  const handleSellInPos = useCallback(
    (p: Product) => {
      addToPOSCart(p, 1);
      setActiveTab('pos');
    },
    [addToPOSCart, setActiveTab]
  );

  const handleProbeCrossBranch = useCallback(
    (skuCode: string) => {
      openCrossBranchModal(skuCode);
    },
    [openCrossBranchModal]
  );

  const handleDeleteProduct = useCallback(
    (p: Product) => {
      deleteProduct(p.id);
      setImportBanner(`تم حذف الصنف (${p.nameAr} — ${p.sku}) من سجل المخزون.`);
      setTimeout(() => setImportBanner(null), 4000);
    },
    [deleteProduct]
  );

  const [invQuickActionTarget, setInvQuickActionTarget] = useState<MobileQuickActionTarget | null>(null);

  const handleOpenInventoryQuickActions = useCallback(
    (p: Product) => {
      setInvQuickActionTarget({
        contextType: 'INVENTORY_PRODUCT',
        itemId: p.id,
        productId: p.id,
        sku: p.sku,
        titleAr: p.nameAr,
        subtitleAr: `SKU: ${p.sku} • الرصيد: ${p.stockQty} ${p.uom}`,
        badgeAr: formatCurrency(p.salePrice),
      });
    },
    [formatCurrency]
  );

  const handleSelectInvQuickAction = useCallback(
    (action: MobileQuickActionDescriptor, target: MobileQuickActionTarget) => {
      const matchedProduct = products.find(
        (p) => p.id === (target.productId || target.itemId) || p.sku === target.sku
      );
      if (!matchedProduct) return;

      if (action.id === 'inv-prod-sell-pos') {
        handleSellInPos(matchedProduct);
      } else if (action.id === 'inv-prod-edit') {
        handleOpenEditModal(matchedProduct);
      } else if (action.id === 'inv-prod-stock-inc') {
        handleQuickStockStep(matchedProduct, 1);
      } else if (action.id === 'inv-prod-stock-take') {
        handleGoToStockTake(matchedProduct);
      } else if (action.id === 'inv-prod-branches') {
        handleProbeCrossBranch(matchedProduct.sku);
      } else if (action.id === 'inv-prod-delete') {
        handleDeleteProduct(matchedProduct);
      }
    },
    [
      products,
      handleSellInPos,
      handleOpenEditModal,
      handleQuickStockStep,
      handleGoToStockTake,
      handleProbeCrossBranch,
      handleDeleteProduct,
    ]
  );

  const handleStepStockCount = useCallback((p: Product, delta: number) => {
    setStockCountsMap((prev) => ({
      ...prev,
      [p.id]: Math.max(0, (prev[p.id] ?? p.stockQty) + delta),
    }));
  }, []);

  const handleSetStockCount = useCallback((productId: string, nextCount: number) => {
    setStockCountsMap((prev) => ({
      ...prev,
      [productId]: nextCount,
    }));
  }, []);

  const handleCommitSingleStockTake = useCallback(
    (product: Product) => {
      const countedQty = stockCountsMap[product.id] ?? product.stockQty;
      const variance = calculateStockAdjustmentVariance(
        product.id,
        product.stockQty,
        countedQty,
        product.costPrice
      );
      updateProduct({
        ...product,
        stockQty: countedQty,
      });
      if (variance.journalLines.length > 0) {
        addManualJournalEntry({
          description: `${stockAuditReason} — الصنف: ${product.nameAr} (${product.sku}) | الفرق: ${variance.varianceQty > 0 ? '+' : ''}${variance.varianceQty}`,
          lines: variance.journalLines.map((l) => ({
            accountId: l.accountId,
            debit: l.debit,
            credit: l.credit,
            memo: l.memo,
          })),
        });
      }
      setStockTakeBanner(
        `✓ تم اعتماد الجرد الفعلي للصنف (${product.nameAr}): الرصيد الجديد ${countedQty} ${product.uom} (${
          variance.varianceQty === 0
            ? 'مطابق تماماً للدفاتر'
            : `${variance.adjustmentType === 'SURPLUS' ? 'فائض +' : 'عجز '}${variance.varianceQty} بقيمة ${formatCurrency(variance.varianceValue)} وتم ترحيل قيد التسوية المحاسبي آلياً`
        })`
      );
      setTimeout(() => setStockTakeBanner(null), 6000);
    },
    [stockCountsMap, updateProduct, addManualJournalEntry, stockAuditReason, formatCurrency]
  );

  // Commit ALL Modified Stock-Take Counts at Once (اعتماد الجرد الكلي لجميع الفروقات دفعة واحدة)
  const handleCommitAllStockTake = useCallback(() => {
    let updatedItemsCount = 0;
    let totalSurplusValue = 0;
    let totalDeficitValue = 0;

    filteredProducts.forEach((product) => {
      const countedQty = stockCountsMap[product.id];
      if (countedQty !== undefined && countedQty !== product.stockQty) {
        const variance = calculateStockAdjustmentVariance(
          product.id,
          product.stockQty,
          countedQty,
          product.costPrice
        );
        updateProduct({
          ...product,
          stockQty: countedQty,
        });
        if (variance.journalLines.length > 0) {
          addManualJournalEntry({
            description: `${stockAuditReason} (اعتماد جماعي) — ${product.nameAr} (${product.sku})`,
            lines: variance.journalLines.map((l) => ({
              accountId: l.accountId,
              debit: l.debit,
              credit: l.credit,
              memo: l.memo,
            })),
          });
        }
        updatedItemsCount += 1;
        if (variance.adjustmentType === 'SURPLUS') totalSurplusValue += variance.varianceValue;
        if (variance.adjustmentType === 'DEFICIT') totalDeficitValue += variance.varianceValue;
      }
    });

    if (updatedItemsCount === 0) {
      setStockTakeBanner('جميع الأرصدة الفعلية مطابقة حالياً للرصيد الدفتري — لا توجد فروقات جردية للترحيل.');
    } else {
      setStockTakeBanner(
        `✓ تم اعتماد الجرد الجماعي لـ (${updatedItemsCount}) أصناف وترحيل قيود التسوية المحاسبية (إجمالي الفائض: ${formatCurrency(totalSurplusValue)} | إجمالي العجز: ${formatCurrency(totalDeficitValue)}).`
      );
    }
    setTimeout(() => setStockTakeBanner(null), 6000);
  }, [filteredProducts, stockCountsMap, updateProduct, addManualJournalEntry, stockAuditReason, formatCurrency]);

  const handleConfirmBulkImport = useCallback(
    (csvTextToImport: string, shouldPostOpeningJournal: boolean) => {
      const res = importBulkProductsCSV(csvTextToImport, shouldPostOpeningJournal);
      if (res.importedCount > 0) {
        setIsBulkModalOpen(false);
        setImportBanner(
          `تم استيراد ${res.importedCount} أصناف بنجاح وإثبات رصيد افتتاحي بقيمة ${res.totalOpeningValuation.toLocaleString()} ${currency} في الأستاذ العام!`
        );
        setTimeout(() => setImportBanner(null), 5000);
      }
    },
    [importBulkProductsCSV, currency]
  );

  const handleSelectChartSku = useCallback((skuCode: string) => {
    setSearchQuery(skuCode);
    setInventorySubTab('ITEMS');
  }, []);

  const handleSaveProduct = (e: React.FormEvent) => {
    e.preventDefault();
    setProductModalError(null);
    const effectiveNameAr = nameAr.trim() || name.trim();
    const effectiveNameEn = name.trim() || nameAr.trim();

    if (!effectiveNameAr || !sku.trim()) {
      setProductModalError('يرجى إدخال اسم الصنف وكود الصنف (SKU) قبل الحفظ.');
      return;
    }

    const cleanSku = sku.trim().toUpperCase();
    const cleanBarcode =
      barcode.trim() ||
      generateUniqueProductBarcode(
        subCategory,
        products.map((p) => p.barcode)
      );

    // Check duplicate against other products (excluding current editing product)
    const duplicateItem = products.find(
      (p) =>
        p.id !== editingProductId &&
        (p.sku.toUpperCase() === cleanSku || p.barcode === cleanBarcode)
    );

    if (duplicateItem) {
      const msg = `تنبيه منع التكرار: كود الصنف (${cleanSku}) أو الباركود (${cleanBarcode}) مسجل مسبقاً للصنف (${duplicateItem.nameAr})!`;
      setProductModalError(msg);
      return;
    }

    if (Number(costPrice) < 0 || Number(salePrice) <= 0 || Number(stockQty) < 0) {
      const msg = 'خطأ في المدخلات: يجب أن يكون سعر البيع أكبر من صفر وأن تكون التكلفة والرصيد غير سالبة!';
      setProductModalError(msg);
      return;
    }

    if (editingProductId) {
      const existingProd = products.find((p) => p.id === editingProductId);
      if (existingProd) {
        updateProduct({
          ...existingProd,
          sku: cleanSku,
          barcode: cleanBarcode,
          name: effectiveNameEn,
          nameAr: effectiveNameAr,
          categoryId,
          industry: productIndustry,
          uom,
          costPrice: Number(costPrice) || 0,
          salePrice: Number(salePrice) || 0,
          taxRate: 0,
          stockQty: Number(stockQty) || 0,
          minStock: Math.max(1, Math.floor((Number(reorderPoint) || 5) / 2)),
          maxStock: (Number(reorderPoint) || 5) * 5,
          reorderPoint: Number(reorderPoint) || 5,
          binLocation: binLocation || 'ZA-01-S1-B01',
          warrantyMonths: Number(warrantyMonths) || 12,
          subCategory,
          powerRatingWatts: Number(powerRatingWatts) > 0 ? Number(powerRatingWatts) : undefined,
          batteryCapacitySpec: batteryCapacitySpec.trim() || undefined,
          voltageSpec: voltageSpec.trim() || undefined,
          screenSizeSpec: screenSizeSpec.trim() || undefined,
          imageUrl: productImageUrl.trim() || undefined,
          units: sanitizeProductUnitOptions(productUnits, Number(costPrice) || 0, Number(salePrice) || 0),
        });
        setImportBanner(
          `✓ تم حفظ التعديلات على الصنف (${effectiveNameAr} — ${cleanSku}) بنجاح!`
        );
      }
    } else {
      const openingVal = Math.round((Number(stockQty) || 0) * (Number(costPrice) || 0) * 100) / 100;
      addProduct({
        tenantId: currentTenant.id,
        sku: cleanSku,
        barcode: cleanBarcode,
        name: effectiveNameEn,
        nameAr: effectiveNameAr,
        categoryId,
        industry: productIndustry,
        uom,
        units: sanitizeProductUnitOptions(productUnits, Number(costPrice) || 0, Number(salePrice) || 0),
        costPrice: Number(costPrice) || 0,
        salePrice: Number(salePrice) || 0,
        taxRate: 0,
        stockQty: Number(stockQty) || 0,
        minStock: Math.floor(reorderPoint / 2),
        maxStock: reorderPoint * 5,
        reorderPoint: Number(reorderPoint) || 5,
        warehouseId: currentWarehouse.id,
        binLocation: binLocation || 'ZA-01-S1-B01',
        imageUrl: productImageUrl.trim() || undefined,
        hasSerials: productIndustry === 'electronics',
        hasBatches: productIndustry === 'pharmacy' || productIndustry === 'grocery',
        warrantyMonths: productIndustry === 'electronics' ? warrantyMonths : undefined,
        subCategory: productIndustry === 'electronics' ? subCategory : undefined,
        powerRatingWatts:
          productIndustry === 'electronics' && powerRatingWatts > 0 ? powerRatingWatts : undefined,
        batteryCapacitySpec:
          productIndustry === 'electronics' && batteryCapacitySpec.trim()
            ? batteryCapacitySpec.trim()
            : undefined,
        voltageSpec:
          productIndustry === 'electronics' && voltageSpec.trim() ? voltageSpec.trim() : undefined,
        screenSizeSpec:
          productIndustry === 'electronics' && screenSizeSpec.trim()
            ? screenSizeSpec.trim()
            : undefined,
        expiryDate:
          productIndustry === 'pharmacy' || productIndustry === 'grocery'
            ? expiryDate
            : undefined,
        prepTimeMinutes: productIndustry === 'restaurant' ? prepTimeMinutes : undefined,
        isActive: true,
      });

      setImportBanner(
        `تم إضافة الصنف (${effectiveNameAr} - ${cleanSku}) بنجاح${
          openingVal > 0
            ? ` وترحيل قيد رصيد مخزون افتتاحي بقيمة ${openingVal.toLocaleString()} ${currency} في الأستاذ العام`
            : ''
        }!`
      );
    }

    stopCartonWebcam();
    setCartonCaptureTarget(null);
    setIsAddModalOpen(false);
    setEditingProductId(null);
    setTimeout(() => setImportBanner(null), 5000);
  };

  const handleExportCSV = useCallback(() => {
    const headers = [
      'SKU',
      'Barcode',
      'Name (AR)',
      'Name (EN)',
      'Classification',
      'Bin Location',
      'Cost (WAC)',
      'Sale Price',
      'Stock Qty',
      'UOM',
      'Reorder Point',
    ];
    const rows = filteredProducts.map((p) => [
      p.sku,
      p.barcode,
      `"${p.nameAr.replace(/"/g, '""')}"`,
      `"${p.name.replace(/"/g, '""')}"`,
      `"${resolveSpecificProductClassificationAr(p, categories)}"`,
      p.binLocation || 'ZA-01',
      p.costPrice,
      p.salePrice,
      p.stockQty,
      p.uom,
      p.reorderPoint,
    ]);
    const csvContent =
      '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute(
      'download',
      `Haseb_Inventory_${currentTenant.code}_${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }, [filteredProducts, categories, currentTenant.code]);

  // Stock-taking live summary stats (Memoized)
  const stockTakeSummary = useMemo(
    () =>
      filteredProducts.reduce(
        (acc, p) => {
          const counted = stockCountsMap[p.id] ?? p.stockQty;
          const v = calculateStockAdjustmentVariance(p.id, p.stockQty, counted, p.costPrice);
          if (v.adjustmentType === 'SURPLUS') {
            acc.surplusCount += 1;
            acc.netValueImpact += v.varianceValue;
          } else if (v.adjustmentType === 'DEFICIT') {
            acc.deficitCount += 1;
            acc.netValueImpact -= v.varianceValue;
          }
          return acc;
        },
        { surplusCount: 0, deficitCount: 0, netValueImpact: 0 }
      ),
    [filteredProducts, stockCountsMap]
  );

  // Build Recharts Mini-Dashboard Analytics only when mini-dashboard is open (Memoized)
  const miniDashboardAnalytics = useMemo(
    () =>
      isMiniDashboardOpen
        ? buildInventoryMiniDashboardAnalytics(electronicsProducts, salesInvoices)
        : null,
    [isMiniDashboardOpen, electronicsProducts, salesInvoices]
  );

  // Execute Sequential Barcode / SKU Scan in Fast Stock-Take Mode
  const handleExecuteFastStockScan = (
    overrideCode?: string,
    overrideQty?: number,
    overrideMode?: 'INCREMENT' | 'SET_EXACT'
  ) => {
    const codeToScan = (overrideCode ?? fastScanCodeInput).trim();
    if (!codeToScan) return;

    const result = processFastStockTakeScan({
      rawBarcodeOrSku: codeToScan,
      qtyInput: overrideQty ?? fastScanQtyInput,
      scanMode: overrideMode ?? fastScanEntryMode,
      products: electronicsProducts,
      currentCountsMap: stockCountsMap,
    });

    setStockCountsMap(result.updatedCountsMap);
    setLatestFastScanAlert(result.scanEntry);
    setFastScanLog((prev) => [result.scanEntry, ...prev.slice(0, 24)]);
    playFastStockTakeAudio(result.scanEntry.audioTone);

    if (!overrideCode) {
      setFastScanCodeInput('');
    }
    setTimeout(() => {
      fastBarcodeInputRef.current?.focus();
    }, 30);
  };

  return (
    <div className="space-y-3.5">
      {importBanner && (
        <div
          data-testid="bulk-import-banner"
          className="p-3.5 rounded-lg bg-blue-50 border border-blue-300 text-blue-950 text-xs font-bold flex items-center justify-between"
        >
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
            <span>{importBanner}</span>
          </div>
          <button
            type="button"
            onClick={() => setImportBanner(null)}
            className="text-blue-700 hover:text-blue-950 font-bold cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* Lumina POS-Style Header Card: Title, Primary Actions & Pill Sub-Tabs */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/70 dark:border-slate-800 p-4 shadow-2xs space-y-3">
        {/* Row 1: Title & Primary High-Frequency Actions */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl haseb-btn-primary text-white flex items-center justify-center shrink-0 shadow-2xs">
              <Package className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h1 className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100 tracking-tight truncate">
                {language === 'ar'
                  ? 'إدارة المخزون والجرد الفعلي والتصنيف الهندسي (WMS)'
                  : 'Solar, Electronics, Batteries & Smart Screens WMS'}
              </h1>
              <p className="text-[11px] text-slate-500 mt-0.5 truncate">
                تحكم متكامل بالأصناف والتصنيفات الهندسية، الجرد الفعلي اللحظي، وتوليد ومسح الباركود والأكواد
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {hasPermission('canCreate') && (
              <button
                type="button"
                data-testid="add-product-modal-btn"
                onClick={handleOpenCreateModal}
                className="haseb-btn-primary text-white text-xs font-semibold px-4 py-2 rounded-xl transition flex items-center gap-1.5 shadow-2xs cursor-pointer whitespace-nowrap shrink-0"
              >
                <Plus className="w-3.5 h-3.5 shrink-0" />
                <span>إضافة صنف جديد</span>
              </button>
            )}

            <button
              type="button"
              data-testid="btn-open-fast-stock-take-mode"
              onClick={() => {
                setInventorySubTab('STOCK_TAKING');
                setIsFastStockTakeOpen(true);
                setTimeout(() => fastBarcodeInputRef.current?.focus(), 80);
              }}
              className="bg-white hover:bg-slate-50 text-slate-700 border border-slate-200/80 text-xs font-semibold px-3.5 py-2 rounded-xl transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0"
            >
              <Zap className="w-3.5 h-3.5 text-amber-500 shrink-0" />
              <span>الجرد السريع بالباركود</span>
            </button>

            <button
              type="button"
              data-testid="btn-toggle-inventory-mini-dashboard"
              onClick={() => setIsMiniDashboardOpen((prev) => !prev)}
              className={`text-xs font-semibold px-3.5 py-2 rounded-xl border transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0 ${
                isMiniDashboardOpen
                  ? 'bg-slate-100 text-slate-900 border-slate-300/80 dark:bg-slate-800 dark:text-slate-100 dark:border-slate-700'
                  : 'bg-white text-slate-600 border-slate-200/80 hover:bg-slate-50 dark:bg-slate-900 dark:text-slate-300 dark:border-slate-800'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5 text-blue-600 shrink-0" />
              <span>{isMiniDashboardOpen ? 'إخفاء اللوحة البيانية' : 'لوحة قرارات المخزون'}</span>
            </button>
          </div>
        </div>

        {/* Row 2: POS-Style Rounded-Full Pill Sub-Tabs + Utility Actions */}
        <div className="pt-2.5 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2.5 min-w-0 max-w-full">
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5 max-w-full min-w-0 w-full xl:w-auto">
            <button
              type="button"
              data-testid="subtab-inventory-items"
              onClick={() => setInventorySubTab('ITEMS')}
              className={`erp-resizable-tab px-4 py-1.5 rounded-full text-xs flex items-center gap-2 border transition cursor-pointer whitespace-nowrap shrink-0 ${
                inventorySubTab === 'ITEMS'
                  ? 'haseb-nav-active text-white font-semibold shadow-2xs'
                  : 'border-slate-200/80 dark:border-slate-700 bg-white dark:bg-slate-800/70 text-slate-600 dark:text-slate-300 hover:bg-slate-50 font-medium'
              }`}
            >
              <Package className="w-3.5 h-3.5 shrink-0" />
              <span>سجل الأصناف والتحكم بالمخزون</span>
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                  inventorySubTab === 'ITEMS'
                    ? 'bg-white/20 text-white'
                    : 'bg-slate-100 text-slate-600'
                }`}
              >
                {electronicsProducts.length}
              </span>
            </button>

            <button
              type="button"
              data-testid="subtab-stock-taking"
              onClick={() => setInventorySubTab('STOCK_TAKING')}
              className={`erp-resizable-tab px-4 py-1.5 rounded-full text-xs flex items-center gap-2 border transition cursor-pointer whitespace-nowrap shrink-0 ${
                inventorySubTab === 'STOCK_TAKING'
                  ? 'haseb-nav-active text-white font-semibold shadow-2xs'
                  : 'border-slate-200/80 dark:border-slate-700 bg-white dark:bg-slate-800/70 text-slate-600 dark:text-slate-300 hover:bg-slate-50 font-medium'
              }`}
            >
              <ClipboardCheck className="w-3.5 h-3.5 shrink-0" />
              <span>الجرد الفعلي اللحظي وتسوية الفروقات</span>
            </button>

            <button
              type="button"
              data-testid="subtab-branch-transfers"
              onClick={() => setInventorySubTab('BRANCH_TRANSFERS')}
              className={`erp-resizable-tab px-4 py-1.5 rounded-full text-xs flex items-center gap-2 border transition cursor-pointer whitespace-nowrap shrink-0 ${
                inventorySubTab === 'BRANCH_TRANSFERS'
                  ? 'haseb-nav-active text-white font-semibold shadow-2xs'
                  : 'border-slate-200/80 dark:border-slate-700 bg-white dark:bg-slate-800/70 text-slate-600 dark:text-slate-300 hover:bg-slate-50 font-medium'
              }`}
            >
              <Network className="w-3.5 h-3.5 shrink-0" />
              <span>شبكة الفروع والتحويلات ({branchNodes.length})</span>
              {interBranchTransfers.length > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-white/20 text-current font-mono">
                  {interBranchTransfers.length}
                </span>
              )}
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              data-testid="inventory-goto-pos-btn"
              onClick={() => setActiveTab('pos')}
              className="bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200/80 text-xs font-semibold px-3 py-1.5 rounded-full transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0"
            >
              <ShoppingCart className="w-3.5 h-3.5 shrink-0" />
              <span>نقطة البيع POS</span>
            </button>

            <button
              type="button"
              data-testid="inventory-whatsapp-alert-btn"
              onClick={() =>
                openQuickSendModal({
                  channel: 'WHATSAPP',
                  category: 'LOW_STOCK_ALERT',
                })
              }
              className="bg-emerald-50/70 hover:bg-emerald-50 text-emerald-700 border border-emerald-200/80 text-xs font-semibold px-3 py-1.5 rounded-full transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0"
            >
              <MessageSquare className="w-3.5 h-3.5 shrink-0" />
              <span>إشعار النواقص</span>
            </button>

            {hasPermission('canCreate') && showExportImport && (
              <button
                type="button"
                data-testid="open-bulk-import-btn"
                onClick={() => setIsBulkModalOpen(true)}
                className="bg-white hover:bg-slate-50 text-slate-600 border border-slate-200/80 text-xs font-medium px-3 py-1.5 rounded-full transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0"
              >
                <Upload className="w-3.5 h-3.5 shrink-0" />
                <span>استيراد CSV</span>
              </button>
            )}

            {hasPermission('canExport') && showExportImport && (
              <button
                type="button"
                data-testid="export-inventory-csv-btn"
                onClick={handleExportCSV}
                className="bg-white hover:bg-slate-50 text-slate-600 border border-slate-200/80 text-xs font-medium px-3 py-1.5 rounded-full transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                <span>تصدير CSV</span>
              </button>
            )}

            <WorkspaceTabResizerBar
              testIdPrefix="inventory-workspace"
              isSectionMaximized={!isMiniDashboardOpen}
              onToggleSectionMaximized={() => setIsMiniDashboardOpen((prev) => !prev)}
              maximizeLabel="طي اللوحة البيانية"
            />
          </div>
        </div>
      </div>

      {/* Interactive Recharts Mini-Dashboard Inside Inventory Screen (Lazy-Loaded Code-Split Chunk) */}
      {isMiniDashboardOpen && miniDashboardAnalytics && (
        <Suspense
          fallback={
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/70 p-6 text-center text-xs font-bold text-slate-500">
              جاري تحميل الرسوم البيانية التحليلية للمخزون...
            </div>
          }
        >
          <InventoryMiniDashboard
            analytics={miniDashboardAnalytics}
            currency={currency}
            onSelectSkuFilter={handleSelectChartSku}
          />
        </Suspense>
      )}

      {inventorySubTab === 'ITEMS' && (
        <>
          {/* POS Lumina-Style Search & Pill Filter Bar */}
          <div className="bg-white dark:bg-slate-900 p-3.5 rounded-2xl border border-slate-200/70 dark:border-slate-800 shadow-2xs flex flex-wrap items-center justify-between gap-3">
            <div className="w-full sm:w-80 flex items-center gap-1.5">
              <div className="flex-1 relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="بحث بالاسم، الكود SKU، أو الباركود..."
                  className="w-full text-xs py-2 ps-8 pe-3 bg-slate-50/80 border border-slate-200/80 rounded-xl outline-hidden focus:bg-white focus:border-blue-600"
                />
                <Search className="w-3.5 h-3.5 text-slate-400 absolute start-2.5 top-2.5" />
              </div>
              <button
                type="button"
                data-testid="inventory-camera-scan-btn"
                onClick={() => {
                  setCameraScannerContext('ITEMS');
                  setIsCameraScannerOpen(true);
                }}
                title="مسح الباركود والكود بالكاميرا للبحث عن الصنف أو تدقيقه"
                className="shrink-0 px-3 py-2 haseb-btn-primary text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition shadow-2xs cursor-pointer group"
              >
                <Camera className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" />
                <span className="hidden sm:inline">كاميرا</span>
              </button>
            </div>

            {/* POS-Style Rounded-Full Category Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar text-xs">
              {[
                { id: 'ALL', label: 'الكل' },
                { id: 'SOLAR_PANEL', label: 'ألواح شمسية' },
                { id: 'HYBRID_INVERTER', label: 'إنفرترات هجينة' },
                { id: 'LITHIUM_BATTERY', label: 'بطاريات ليثيوم وجل' },
                { id: 'SMART_SCREEN', label: 'شاشات ذكية 4K' },
                { id: 'COMPUTING_MOBILE', label: 'حواسيب وتجهيزات' },
                { id: 'SOLAR_ACCESSORY', label: 'قواطع وكابلات' },
              ].map((sec) => (
                <button
                  key={sec.id}
                  type="button"
                  onClick={() => setSelectedSubCatFilter(sec.id)}
                  className={`px-3.5 py-1.5 rounded-full font-medium transition cursor-pointer whitespace-nowrap shrink-0 ${
                    selectedSubCatFilter === sec.id
                      ? 'haseb-nav-active text-white font-semibold shadow-2xs'
                      : 'bg-white text-slate-600 border border-slate-200/80 hover:bg-slate-50'
                  }`}
                >
                  {sec.label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <select
                data-testid="inventory-category-filter-select"
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="text-xs py-1.5 px-3 bg-slate-50 border border-slate-200/80 rounded-xl outline-hidden font-semibold text-slate-700"
              >
                <option value="all">جميع التصنيفات المخزنية</option>
                {electronicsCategories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {language === 'ar' ? c.nameAr : c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Products Table (Lumina Card Surface) */}
          <div className="bg-white rounded-2xl border border-slate-200/70 shadow-2xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-start">
                <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4 text-start">الصنف والمواصفات الهندسية</th>
                    <th className="py-3 px-4 text-start">التصنيف المخزني المحدد والضمان</th>
                    <th className="py-3 px-4 text-start">الباركود</th>
                    {showCostPrice && <th className="py-3 px-4 text-end">التكلفة (WAC)</th>}
                    <th className="py-3 px-4 text-end">سعر البيع</th>
                    <th className="py-3 px-4 text-center">الرصيد والتحكم السريع</th>
                    <th className="py-3 px-4 text-center">الحالة</th>
                    <th className="py-3 px-4 text-center">إدارة الصنف (تعديل · جرد · POS · حذف)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredProducts.length === 0 ? (
                    <tr>
                      <td colSpan={showCostPrice ? 8 : 7} className="py-12 px-4 text-center">
                        <div className="max-w-sm mx-auto space-y-2.5">
                          <Package className="w-10 h-10 text-slate-300 mx-auto" />
                          <div className="text-sm font-bold text-slate-800">
                            {products.length === 0
                              ? 'المستودع فارغ — لا توجد أصناف مسجلة بعد'
                              : 'لا توجد أصناف مطابقة لخيارات البحث'}
                          </div>
                          <p className="text-xs text-slate-500">
                            {products.length === 0
                              ? 'أضف أول صنف الآن أو استورد قائمة الأصناف من ملف CSV للبدء فوراً.'
                              : 'امسح الفلاتر الحالية لعرض كافة الأصناف المسجلة.'}
                          </p>
                          {hasPermission('canCreate') && products.length === 0 && (
                            <button
                              type="button"
                              onClick={handleOpenCreateModal}
                              className="px-4 py-2 haseb-btn-primary text-white rounded-xl text-xs font-bold cursor-pointer inline-flex items-center gap-1.5"
                            >
                              <Plus className="w-3.5 h-3.5" />
                              <span>إضافة أول صنف للمستودع</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredProducts.map((p) => (
                      <InventoryProductRow
                        key={p.id}
                        product={p}
                        specificClassificationAr={resolveSpecificProductClassificationAr(p, categories)}
                        currency={currency}
                        language={language}
                        showCostPrice={showCostPrice}
                        onQuickStockStep={handleQuickStockStep}
                        onOpenEditModal={handleOpenEditModal}
                        onGoToStockTake={handleGoToStockTake}
                        onSellInPos={handleSellInPos}
                        onProbeCrossBranch={handleProbeCrossBranch}
                        onDeleteProduct={handleDeleteProduct}
                        onOpenQuickActions={handleOpenInventoryQuickActions}
                      />
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Physical Stock-Taking & Automatic Double-Entry Reconciliation Tab */}
      {inventorySubTab === 'STOCK_TAKING' && (
        <div className="space-y-4">
          {stockTakeBanner && (
            <div
              data-testid="stock-take-banner"
              className="p-3.5 rounded-lg bg-blue-50 border border-blue-300 text-blue-950 text-xs font-bold flex items-center justify-between"
            >
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
                <span>{stockTakeBanner}</span>
              </div>
              <button
                type="button"
                onClick={() => setStockTakeBanner(null)}
                className="text-blue-700 hover:text-blue-950 font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>
          )}

          {/* Stock-Taking Summary KPIs & Global Controls */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div className="bg-white p-3.5 rounded-lg border border-slate-200 shadow-2xs">
              <div className="text-[11px] text-slate-500 font-bold">إجمالي الأصناف الخاضعة للجرد</div>
              <div className="text-lg font-black text-slate-900 font-mono mt-1">
                {filteredProducts.length} صنف
              </div>
            </div>
            <div className="bg-white p-3.5 rounded-lg border border-blue-200 shadow-2xs">
              <div className="text-[11px] text-blue-700 font-bold">أصناف بفائض جردي (+)</div>
              <div className="text-lg font-black text-blue-900 font-mono mt-1">
                {stockTakeSummary.surplusCount}
              </div>
            </div>
            <div className="bg-white p-3.5 rounded-lg border border-rose-200 shadow-2xs">
              <div className="text-[11px] text-rose-700 font-bold">أصناف بعجز جردي (-)</div>
              <div className="text-lg font-black text-rose-900 font-mono mt-1">
                {stockTakeSummary.deficitCount}
              </div>
            </div>
            <div className="bg-white p-3.5 rounded-lg border border-slate-200 shadow-2xs">
              <div className="text-[11px] text-slate-500 font-bold">صافي الأثر المالي للتسويات</div>
              <div
                className={`text-lg font-black font-mono mt-1 ${
                  stockTakeSummary.netValueImpact < 0 ? 'text-rose-700' : 'text-blue-800'
                }`}
                dir="ltr"
              >
                {formatCurrency(stockTakeSummary.netValueImpact)}
              </div>
            </div>
          </div>

          <div className="bg-white text-slate-900 p-4 rounded-2xl border border-slate-200/80 shadow-2xs space-y-3">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
              <div>
                <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                  <ClipboardCheck className="w-4 h-4 text-blue-600 shrink-0" />
                  <span>محرك الجرد الفعلي اللحظي والتحكم الكامل بتسوية الفروقات</span>
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  تحكم بالعدد الفعلي لكل صنف عبر أزرار (+ / -) أو الإدخال المباشر أو مسح الكاميرا، ثم اعتمد الجرد فردياً أو جماعياً لترحيل قيد التسوية آلياً.
                </p>
              </div>
              <div className="w-full lg:w-72 shrink-0">
                <input
                  type="text"
                  value={stockAuditReason}
                  onChange={(e) => setStockAuditReason(e.target.value)}
                  placeholder="بيان محضر الجرد..."
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200/80 text-slate-900 text-xs outline-hidden focus:bg-white focus:border-blue-500"
                />
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                data-testid="toggle-fast-stock-take-btn"
                onClick={() => {
                  setIsFastStockTakeOpen((prev) => !prev);
                  setTimeout(() => fastBarcodeInputRef.current?.focus(), 60);
                }}
                className={`px-3.5 py-2 font-bold rounded-full text-xs flex items-center justify-center gap-1.5 transition shadow-2xs cursor-pointer whitespace-nowrap shrink-0 border ${
                  isFastStockTakeOpen
                    ? 'haseb-nav-active text-white'
                    : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200/80'
                }`}
              >
                <Zap className="w-4 h-4 shrink-0" />
                <span>{isFastStockTakeOpen ? 'وضع الجرد السريع نشط ⚡' : 'تفعيل وضع الجرد السريع بالباركود'}</span>
              </button>
              <button
                type="button"
                data-testid="stock-take-camera-scan-btn"
                onClick={() => {
                  setCameraScannerContext('STOCK_TAKE');
                  setIsCameraScannerOpen(true);
                }}
                className="px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg text-xs flex items-center justify-center gap-1.5 transition shadow-xs cursor-pointer whitespace-nowrap shrink-0"
              >
                <Camera className="w-4 h-4 shrink-0" />
                <span>مسح بالكاميرا للجرد</span>
              </button>
              <button
                type="button"
                data-testid="btn-commit-all-stock-take"
                onClick={handleCommitAllStockTake}
                className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-lg text-xs flex items-center justify-center gap-1.5 transition shadow-xs cursor-pointer whitespace-nowrap shrink-0"
              >
                <CheckCheck className="w-4 h-4 shrink-0" />
                <span>اعتماد جميع الفروقات دفعة واحدة</span>
              </button>
              <button
                type="button"
                data-testid="btn-reset-stock-take"
                onClick={() => {
                  setStockCountsMap({});
                  setFastScanLog([]);
                  setLatestFastScanAlert(null);
                  setStockTakeBanner('تمت إعادة ضبط خانات الجرد لمطابقة الأرصدة الدفترية الحالية.');
                  setTimeout(() => setStockTakeBanner(null), 3500);
                }}
                className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold rounded-lg text-xs flex items-center gap-1.5 transition cursor-pointer whitespace-nowrap shrink-0"
              >
                <RefreshCw className="w-3.5 h-3.5 shrink-0" />
                <span>إعادة ضبط</span>
              </button>
            </div>
          </div>

          {/* Fast Stock-Take Mode Studio (وضع الجرد السريع بالباركود المتتالي مع التنبيهات الصوتية والمرئية الفورية) */}
          {isFastStockTakeOpen && (
            <div
              data-testid="fast-stock-take-panel"
              className="bg-white dark:bg-slate-900 rounded-xl border-2 border-blue-600/80 shadow-md p-4 space-y-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs">
                    <Zap className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-black text-sm text-slate-900 dark:text-white">
                        وضع الجرد السريع بالباركود المتتالي (Fast Stock-Take Mode)
                      </h4>
                      <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-800 text-[10px] font-bold">
                        تنبيه صوتي ومرئي لحظي
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      امسح الباركود أو كود الصنف بشكل متتالي بقارئ الباركود أو لوحة المفاتيح — سيصدر النظام نغمة وتنبيهاً مرئياً فورياً يوضح تطابق أو اختلاف الكمية عن المسجل بالنظام.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    data-testid="btn-toggle-fast-stock-audio"
                    onClick={() => setFastScanAudioEnabled((prev) => !prev)}
                    className={`px-3 py-1.5 rounded-lg border text-xs font-bold flex items-center gap-1.5 transition cursor-pointer ${
                      fastScanAudioEnabled
                        ? 'bg-blue-50 text-blue-800 border-blue-200'
                        : 'bg-slate-100 text-slate-600 border-slate-200'
                    }`}
                  >
                    {fastScanAudioEnabled ? (
                      <>
                        <Volume2 className="w-4 h-4 text-blue-600" />
                        <span>التنبيه الصوتي: مفعّل</span>
                      </>
                    ) : (
                      <>
                        <VolumeX className="w-4 h-4 text-slate-500" />
                        <span>التنبيه الصوتي: صامت</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Sequential Barcode Input Bar */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleExecuteFastStockScan();
                }}
                className="grid grid-cols-1 md:grid-cols-12 gap-2.5 items-end bg-slate-50 p-3 rounded-xl border border-slate-200"
              >
                <div className="md:col-span-5">
                  <label className="block font-bold text-slate-700 text-[11px] mb-1">
                    امسح الباركود أو أدخل كود الصنف (SKU / EAN-13) ثم اضغط Enter:
                  </label>
                  <div className="relative">
                    <input
                      ref={fastBarcodeInputRef}
                      type="text"
                      data-testid="fast-stock-barcode-input"
                      value={fastScanCodeInput}
                      onChange={(e) => setFastScanCodeInput(e.target.value)}
                      placeholder="امسح الباركود هنا (مثال: 6281042005014 أو SOL-PNL-585W)..."
                      className="w-full p-2.5 ps-9 bg-white border-2 border-blue-500 rounded-lg font-mono font-bold text-xs text-slate-900 outline-hidden"
                      dir="ltr"
                    />
                    <ScanLine className="w-4 h-4 text-blue-600 absolute start-2.5 top-2.5" />
                  </div>
                </div>

                <div className="md:col-span-2">
                  <label className="block font-bold text-slate-700 text-[11px] mb-1">
                    الكمية لكل مسحة:
                  </label>
                  <input
                    type="number"
                    min={0}
                    data-testid="fast-stock-qty-input"
                    value={fastScanQtyInput}
                    onChange={(e) => setFastScanQtyInput(Math.max(0, Number(e.target.value)))}
                    className="w-full p-2.5 bg-white border border-slate-300 rounded-lg font-mono font-bold text-xs text-center"
                  />
                </div>

                <div className="md:col-span-3">
                  <label className="block font-bold text-slate-700 text-[11px] mb-1">
                    نمط احتساب الكمية الممسوحة:
                  </label>
                  <select
                    data-testid="fast-stock-mode-select"
                    value={fastScanEntryMode}
                    onChange={(e) =>
                      setFastScanEntryMode(e.target.value as 'INCREMENT' | 'SET_EXACT')
                    }
                    className="w-full p-2.5 bg-white border border-slate-300 rounded-lg font-bold text-xs text-slate-800"
                  >
                    <option value="INCREMENT">إضافة تراكمية (+ على الممسوح)</option>
                    <option value="SET_EXACT">تثبيت كإجمالي فعلي نهائي (=)</option>
                  </select>
                </div>

                <div className="md:col-span-2">
                  <button
                    type="submit"
                    data-testid="btn-submit-fast-stock-scan"
                    className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-500 text-white font-black rounded-lg text-xs flex items-center justify-center gap-1.5 shadow-xs transition cursor-pointer"
                  >
                    <Zap className="w-4 h-4" />
                    <span>إدخال المسحة</span>
                  </button>
                </div>
              </form>

              {/* Quick 1-Click Barcode Test Chips (للتجربة الفورية للمسح المتتالي والتنبيهات) */}
              <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                <span className="font-bold text-slate-500">تجربة مسح سريعة بضغطة واحدة:</span>
                {electronicsProducts.slice(0, 4).map((prod) => (
                  <button
                    key={prod.id}
                    type="button"
                    data-testid={`fast-scan-quick-match-${prod.sku}`}
                    onClick={() => handleExecuteFastStockScan(prod.barcode, prod.stockQty, 'SET_EXACT')}
                    className="px-2.5 py-1 rounded-md bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-200 font-bold transition cursor-pointer"
                    title="مسح مطابق لرصيد النظام (يصدر نغمة وإشعار تطابق)"
                  >
                    ✓ مطابقة: {prod.sku} ({prod.stockQty})
                  </button>
                ))}
                {electronicsProducts[0] && (
                  <button
                    type="button"
                    data-testid={`fast-scan-quick-diff-${electronicsProducts[0].sku}`}
                    onClick={() =>
                      handleExecuteFastStockScan(
                        electronicsProducts[0].barcode,
                        Math.max(1, electronicsProducts[0].stockQty - 3),
                        'SET_EXACT'
                      )
                    }
                    className="px-2.5 py-1 rounded-md bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 font-bold transition cursor-pointer"
                    title="مسح بكمية مختلفة عن النظام (يصدر نغمة وتنبيه اختلاف)"
                  >
                    ⚠ اختبار اختلاف كمية ({electronicsProducts[0].sku})
                  </button>
                )}
              </div>

              {/* High-Contrast Visual & Audio Alert Banner on Every Scan */}
              {latestFastScanAlert && (
                <div
                  data-testid="fast-stock-visual-alert"
                  data-status={latestFastScanAlert.comparisonStatus}
                  className={`p-4 rounded-xl border-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-all ${
                    latestFastScanAlert.comparisonStatus === 'MATCHED'
                      ? 'bg-blue-50/90 border-blue-500 text-blue-950'
                      : latestFastScanAlert.comparisonStatus === 'DEFICIT'
                      ? 'bg-amber-50/95 border-amber-500 text-amber-950'
                      : latestFastScanAlert.comparisonStatus === 'SURPLUS'
                      ? 'bg-indigo-50/95 border-indigo-500 text-indigo-950'
                      : 'bg-rose-50/95 border-rose-500 text-rose-950'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 font-black ${
                        latestFastScanAlert.comparisonStatus === 'MATCHED'
                          ? 'bg-blue-600 text-white'
                          : latestFastScanAlert.comparisonStatus === 'DEFICIT'
                          ? 'bg-amber-500 text-slate-950'
                          : latestFastScanAlert.comparisonStatus === 'SURPLUS'
                          ? 'bg-indigo-600 text-white'
                          : 'bg-rose-600 text-white'
                      }`}
                    >
                      {latestFastScanAlert.comparisonStatus === 'MATCHED' ? (
                        <CheckCircle2 className="w-5 h-5" />
                      ) : (
                        <AlertTriangle className="w-5 h-5" />
                      )}
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-black text-sm">
                          {latestFastScanAlert.visualTitleAr}
                        </span>
                        <span className="px-2 py-0.5 rounded bg-white/80 border border-current/20 font-mono text-[10px] font-bold">
                          النغمة الصوتية: {latestFastScanAlert.audioTone}
                        </span>
                      </div>
                      <p className="text-xs font-bold mt-1 opacity-90">
                        {latestFastScanAlert.visualDetailAr}
                      </p>
                    </div>
                  </div>

                  {latestFastScanAlert.matched && (
                    <div className="flex items-center gap-3 shrink-0 bg-white/90 px-3.5 py-2 rounded-lg border border-slate-200">
                      <div className="text-center">
                        <div className="text-[10px] text-slate-500 font-bold">المسجل بالنظام</div>
                        <div className="font-mono font-black text-sm text-slate-800">
                          {latestFastScanAlert.systemQty}
                        </div>
                      </div>
                      <div className="text-slate-300 font-bold">|</div>
                      <div className="text-center">
                        <div className="text-[10px] text-blue-700 font-bold">الفعلي الممسوح</div>
                        <div className="font-mono font-black text-sm text-blue-700">
                          {latestFastScanAlert.countedQty}
                        </div>
                      </div>
                      <div className="text-slate-300 font-bold">|</div>
                      <div className="text-center">
                        <div className="text-[10px] text-slate-500 font-bold">الفرق</div>
                        <div
                          className={`font-mono font-black text-sm ${
                            latestFastScanAlert.varianceQty === 0
                              ? 'text-blue-700'
                              : latestFastScanAlert.varianceQty > 0
                              ? 'text-indigo-700'
                              : 'text-rose-700'
                          }`}
                          dir="ltr"
                        >
                          {latestFastScanAlert.varianceQty > 0
                            ? `+${latestFastScanAlert.varianceQty}`
                            : latestFastScanAlert.varianceQty}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Sequential Scans History Table */}
              {fastScanLog.length > 0 && (
                <div className="border border-slate-200 rounded-lg overflow-hidden">
                  <div className="bg-slate-100 px-3 py-2 text-[11px] font-bold text-slate-700 flex items-center justify-between">
                    <span>سجل عمليات المسح المتتالي في الجرد السريع ({fastScanLog.length})</span>
                    <button
                      type="button"
                      onClick={() => {
                        setFastScanLog([]);
                        setLatestFastScanAlert(null);
                      }}
                      className="text-rose-600 hover:text-rose-800 font-bold cursor-pointer"
                    >
                      مسح السجل
                    </button>
                  </div>
                  <div className="max-h-40 overflow-y-auto">
                    <table className="w-full text-[11px] text-start">
                      <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200">
                        <tr>
                          <th className="py-1.5 px-3 text-start">الوقت</th>
                          <th className="py-1.5 px-3 text-start">الباركود / الكود</th>
                          <th className="py-1.5 px-3 text-start">الصنف</th>
                          <th className="py-1.5 px-3 text-center">النظام</th>
                          <th className="py-1.5 px-3 text-center">الفعلي</th>
                          <th className="py-1.5 px-3 text-center">حالة المطابقة</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {fastScanLog.map((entry) => (
                          <tr key={entry.scanId} className="hover:bg-slate-50">
                            <td className="py-1.5 px-3 font-mono text-slate-500" dir="ltr">
                              {entry.scannedAt}
                            </td>
                            <td className="py-1.5 px-3 font-mono font-bold text-slate-800" dir="ltr">
                              {entry.sku || entry.rawCode}
                            </td>
                            <td className="py-1.5 px-3 font-bold text-slate-900">
                              {entry.productNameAr}
                            </td>
                            <td className="py-1.5 px-3 text-center font-mono">
                              {entry.systemQty}
                            </td>
                            <td className="py-1.5 px-3 text-center font-mono font-black text-blue-700">
                              {entry.countedQty}
                            </td>
                            <td className="py-1.5 px-3 text-center">
                              <span
                                className={`px-2 py-0.5 rounded font-bold text-[10px] ${
                                  entry.comparisonStatus === 'MATCHED'
                                    ? 'bg-blue-100 text-blue-800'
                                    : entry.comparisonStatus === 'DEFICIT'
                                    ? 'bg-amber-100 text-amber-900'
                                    : entry.comparisonStatus === 'SURPLUS'
                                    ? 'bg-indigo-100 text-indigo-900'
                                    : 'bg-rose-100 text-rose-800'
                                }`}
                              >
                                {entry.comparisonStatus === 'MATCHED'
                                  ? '✓ مطابق للنظام'
                                  : entry.comparisonStatus === 'DEFICIT'
                                  ? `⚠ نقص (${entry.varianceQty})`
                                  : entry.comparisonStatus === 'SURPLUS'
                                  ? `⚡ فائض (+${entry.varianceQty})`
                                  : 'غير مسجل'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="bg-white rounded-md border border-slate-200 shadow-2xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-start">
                <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4 text-start">الصنف والتصنيف المحدد</th>
                    <th className="py-3 px-4 text-center">الرصيد الدفتري بالنظام</th>
                    <th className="py-3 px-4 text-center">العدد الفعلي (الجرد)</th>
                    <th className="py-3 px-4 text-center">فرق الجرد (الكمية)</th>
                    <th className="py-3 px-4 text-end">الأثر المالي بالتكلفة (WAC)</th>
                    <th className="py-3 px-4 text-center">إجراء التسوية والترحيل</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredProducts.map((p) => (
                    <StockTakingRow
                      key={p.id}
                      product={p}
                      countedQty={stockCountsMap[p.id] ?? p.stockQty}
                      specificClassificationAr={resolveSpecificProductClassificationAr(p, categories)}
                      formatCurrency={formatCurrency}
                      onStepCount={handleStepStockCount}
                      onSetCount={handleSetStockCount}
                      onCommitSingle={handleCommitSingleStockTake}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {inventorySubTab === 'BRANCH_TRANSFERS' && (
        <div className="space-y-6">
          {transferFeedback && (
            <div
              data-testid="transfer-feedback-banner"
              className="p-3 bg-blue-50 dark:bg-blue-950/40 border border-blue-300 dark:border-blue-700 text-blue-900 dark:text-blue-300 text-xs font-bold rounded-lg flex items-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4 text-blue-600" />
              <span>{transferFeedback}</span>
            </div>
          )}

          {/* Connected Branch Nodes Topology */}
          <div className="bg-white dark:bg-slate-900 p-4 rounded-lg border border-slate-200 dark:border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Server className="w-4 h-4 text-indigo-600" />
                <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">
                  عقد الفروع والخوادم المحلية المتصلة عبر الشبكة (LAN & WAN Topology)
                </h3>
              </div>
              <span className="text-xs bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300 font-bold px-2.5 py-1 rounded-md flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse"></span>
                مزامنة لحظية نشطة (Peer-to-Peer Sync)
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
              {branchNodes.map((node) => {
                const isOnline = node.status === 'ONLINE_LAN' || node.status === 'ONLINE_WAN';
                return (
                  <div
                    key={node.branchId}
                    className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-md border border-slate-200 dark:border-slate-700 space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-slate-900 dark:text-slate-100">
                        {node.branchNameAr}
                      </span>
                      <span
                        className={`px-1.5 py-0.5 text-[10px] font-bold rounded ${
                          isOnline ? 'bg-blue-100 text-blue-800' : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {isOnline ? 'متصل LAN' : 'غير متصل'}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-500 space-y-0.5">
                      <div className="flex justify-between font-mono" dir="ltr">
                        <span>IP:</span>
                        <span>{node.lanIpAddress}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>زمن الاستجابة (Ping):</span>
                        <span className="font-mono font-bold text-blue-600" dir="ltr">
                          {node.latencyMs} ms
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>المدينة:</span>
                        <span>{node.branchCity}</span>
                      </div>
                      <div className="text-[10px] text-slate-400 truncate">
                        المستودع: {node.warehouseNameAr}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        openCrossBranchModal(electronicsProducts[0]?.sku || 'SOL-PNL-585W')
                      }
                      className="w-full mt-1 py-1.5 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/40 dark:hover:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 rounded text-xs font-bold transition flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <Network className="w-3.5 h-3.5" />
                      <span>فحص أرصدة الفرع</span>
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Inter-Branch Transfer Orders Table */}
          <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 overflow-hidden space-y-0">
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ArrowRightLeft className="w-4 h-4 text-blue-600" />
                <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">
                  أوامر التحويل بين الفروع وقيود المقاصة المحاسبية المتزنة
                </h3>
              </div>
              <button
                type="button"
                data-testid="btn-new-branch-probe"
                onClick={() => openCrossBranchModal(electronicsProducts[0]?.sku || 'SOL-PNL-585W')}
                className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs px-3 py-1.5 rounded-md transition flex items-center gap-1.5 cursor-pointer"
              >
                <Network className="w-3.5 h-3.5" />
                <span>طلب تحويل جديد عبر فحص الفروع</span>
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-start">
                <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-500 font-bold border-b border-slate-200 dark:border-slate-700">
                  <tr>
                    <th className="py-3 px-4 text-start">رقم التحويل</th>
                    <th className="py-3 px-4 text-start">التاريخ</th>
                    <th className="py-3 px-4 text-start">الصنف</th>
                    <th className="py-3 px-4 text-start">الفرع المصدر</th>
                    <th className="py-3 px-4 text-start">الفرع المستلم</th>
                    <th className="py-3 px-4 text-center">الكمية</th>
                    <th className="py-3 px-4 text-center">الحالة</th>
                    <th className="py-3 px-4 text-center">قيد المقاصة المتزن</th>
                    <th className="py-3 px-4 text-center">الإجراء والاعتماد</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {interBranchTransfers.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-8 text-center text-slate-400">
                        لا توجد طلبات تحويل حالياً. يمكنك فحص الفروع لأي صنف وطلب التحويل اللحظي بضغطة زر واحدة.
                      </td>
                    </tr>
                  ) : (
                    interBranchTransfers.map((t) => {
                      const isApproved =
                        t.status === 'APPROVED' || t.status === 'PENDING_APPROVAL';
                      const isInTransit = t.status === 'IN_TRANSIT';
                      const isReceived = t.status === 'RECEIVED';
                      return (
                        <tr key={t.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                          <td
                            className="py-3 px-4 font-mono font-bold text-slate-800 dark:text-slate-200"
                            dir="ltr"
                          >
                            {t.requestNumber || t.id}
                          </td>
                          <td
                            className="py-3 px-4 font-mono text-slate-500 text-[11px]"
                            dir="ltr"
                          >
                            {t.requestedAt}
                          </td>
                          <td className="py-3 px-4">
                            <div className="font-bold text-slate-800 dark:text-slate-200">
                              {t.productNameAr}
                            </div>
                            <div className="font-mono text-slate-400 text-[10px]" dir="ltr">
                              SKU: {t.sku}
                            </div>
                          </td>
                          <td className="py-3 px-4 font-medium text-slate-700 dark:text-slate-300">
                            {t.sourceBranchNameAr}
                          </td>
                          <td className="py-3 px-4 font-medium text-slate-700 dark:text-slate-300">
                            {t.targetBranchNameAr}
                          </td>
                          <td
                            className="py-3 px-4 text-center font-bold font-mono tabular-nums text-slate-900 dark:text-slate-100"
                            dir="ltr"
                          >
                            {t.requestedQty}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                isReceived
                                  ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-300'
                                  : isInTransit
                                  ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-300'
                                  : 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/60 dark:text-indigo-300'
                              }`}
                            >
                              {isReceived
                                ? 'تم الاستلام بالمستودع'
                                : isInTransit
                                ? 'قيد الشحن والنقل'
                                : 'معتمد للتحويل'}
                            </span>
                          </td>
                          <td
                            className="py-3 px-4 text-center font-mono text-[11px] text-slate-500"
                            dir="ltr"
                          >
                            {t.journalEntryNumber || '1104-BR2 / 1104-BR1'}
                          </td>
                          <td className="py-3 px-4 text-center">
                            {isApproved && (
                              <button
                                type="button"
                                data-testid={`btn-transit-transfer-${t.id}`}
                                onClick={() => {
                                  const res = advanceBranchTransfer(t.id, 'IN_TRANSIT');
                                  setTransferFeedback(res.messageAr);
                                  setTimeout(() => setTransferFeedback(null), 5000);
                                }}
                                className="px-2.5 py-1 bg-amber-600 hover:bg-amber-500 text-white rounded text-[11px] font-bold transition cursor-pointer"
                              >
                                بدء الشحن (In-Transit)
                              </button>
                            )}
                            {isInTransit && (
                              <button
                                type="button"
                                data-testid={`btn-receive-transfer-${t.id}`}
                                onClick={() => {
                                  const res = advanceBranchTransfer(t.id, 'RECEIVED');
                                  setTransferFeedback(res.messageAr);
                                  setTimeout(() => setTransferFeedback(null), 5000);
                                }}
                                className="px-2.5 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded text-[11px] font-bold transition cursor-pointer"
                              >
                                تأكيد الاستلام بالمستودع
                              </button>
                            )}
                            {isReceived && (
                              <span className="inline-flex items-center gap-1 text-[11px] text-blue-600 dark:text-blue-400 font-bold">
                                <CheckCheck className="w-3.5 h-3.5" />
                                <span>مكتمل ومرحّل بالمخزون</span>
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit Product Modal (إضافة صنف طاقة شمسية / إلكترونيات / شاشات جديد) */}
      {isAddModalOpen && (
        <div
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) {
              stopCartonWebcam();
              setCartonCaptureTarget(null);
              setIsAddModalOpen(false);
            }
          }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/65 backdrop-blur-xs p-4 overflow-y-auto"
        >
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200/80 w-full max-w-2xl overflow-hidden my-auto">
            {/* Modal Header with Trash Icon to Clear All Form Data (Lumina POS Theme) */}
            <div className="px-6 py-4 bg-slate-50/90 text-slate-900 border-b border-slate-200/80 flex items-center justify-between gap-2">
              <h3 className="font-bold text-sm sm:text-base flex items-center gap-2.5 text-slate-900">
                <span className="w-9 h-9 rounded-xl haseb-btn-primary text-white flex items-center justify-center shrink-0 shadow-2xs">
                  <Package className="w-4 h-4" />
                </span>
                <span>
                  {editingProductId
                    ? 'تعديل بيانات الصنف والتصنيف المخزني المحدد'
                    : 'إضافة صنف طاقة شمسية / إلكترونيات / شاشات جديد'}
                </span>
              </h3>
              <div className="flex items-center gap-2">
                {/* Trash Icon Button to Delete/Clear All Data in the Add Product Form */}
                <button
                  type="button"
                  data-testid="btn-clear-add-product-form"
                  onClick={handleClearAddProductForm}
                  title="سلة الحذف: حذف وتفريغ جميع البيانات في قائمة إضافة صنف طاقة شمسية"
                  className="px-3 py-1.5 rounded-full bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>حذف / تفريغ البيانات</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    stopCartonWebcam();
                    setCartonCaptureTarget(null);
                    setIsAddModalOpen(false);
                  }}
                  className="w-8 h-8 rounded-full border border-slate-200/80 bg-white hover:bg-slate-100 text-slate-500 hover:text-slate-900 flex items-center justify-center font-bold cursor-pointer transition"
                >
                  ✕
                </button>
              </div>
            </div>

            <form onSubmit={handleSaveProduct} className="p-5 space-y-4 text-xs max-h-[82vh] overflow-y-auto">
              {productModalError && (
                <div
                  data-testid="product-modal-error-banner"
                  className="p-3 rounded-lg bg-rose-50 border border-rose-300 text-rose-900 font-bold text-xs"
                >
                  {productModalError}
                </div>
              )}

              {productModalNotice && (
                <div
                  data-testid="form-cleared-banner"
                  className="p-2.5 rounded-lg bg-blue-50 border border-blue-200 text-blue-900 font-bold text-xs flex items-center justify-between"
                >
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
                    <span>{productModalNotice}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setProductModalNotice(null)}
                    className="text-blue-700 hover:text-blue-950 font-bold cursor-pointer"
                  >
                    ✕
                  </button>
                </div>
              )}

              {/* Interactive Carton / Piece Camera Scanner Panel (Opens when clicking Camera icon next to Barcode or SKU) */}
              {cartonCaptureTarget && (
                <div
                  data-testid="carton-camera-scanner-panel"
                  className="p-4 rounded-2xl bg-slate-50 text-slate-900 border border-blue-300 space-y-3 shadow-xs"
                >
                  <div className="flex items-center justify-between border-b border-slate-200/80 pb-2.5">
                    <div className="flex items-center gap-2">
                      <Camera className="w-4 h-4 text-blue-600" />
                      <span className="font-bold text-xs text-slate-900">
                        {cartonCaptureTarget === 'BARCODE'
                          ? 'تصوير الكرتون أو القطعة بالكاميرا لإدخال الباركود (EAN-13)'
                          : 'تصوير الكرتون أو القطعة بالكاميرا لإدخال كود الصنف (SKU / P/N)'}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        stopCartonWebcam();
                        setCartonCaptureTarget(null);
                      }}
                      className="text-slate-400 hover:text-slate-700 cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
                    {/* Live Camera Viewfinder or Optical Box Preview */}
                    <div className="sm:col-span-5 bg-slate-950 rounded-lg border border-slate-800 h-32 flex flex-col items-center justify-center relative overflow-hidden">
                      {isLiveWebcamActive ? (
                        <video
                          ref={videoRef}
                          autoPlay
                          playsInline
                          muted
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="text-center p-2 space-y-1">
                          <ScanLine className="w-5 h-5 text-blue-400 mx-auto" />
                          <div className="text-[11px] font-bold text-slate-200">
                            عدسة قراءة ملصق الكرتون / القطعة
                          </div>
                          {cartonCameraError && (
                            <div className="text-[9px] text-amber-300 leading-tight line-clamp-2 px-1">
                              {cartonCameraError}
                            </div>
                          )}
                          <button
                            type="button"
                            onClick={startCartonWebcam}
                            className="px-2 py-0.5 rounded bg-blue-600/30 hover:bg-blue-600/50 text-blue-200 border border-blue-500/40 text-[10px] font-bold cursor-pointer"
                          >
                            تشغيل عدسة الكاميرا الحية
                          </button>
                        </div>
                      )}
                      <div className="absolute inset-x-4 top-1/2 h-0.5 bg-blue-500/80 shadow-[0_0_8px_#3b82f6]" />
                    </div>

                    {/* Optical Label Data & Capture Buttons */}
                    <div className="sm:col-span-7 space-y-2">
                      <label className="block text-[11px] text-slate-700 font-bold">
                        بيانات ملصق الكرتون / القطعة الملتقطة ضوئياً:
                      </label>
                      <input
                        type="text"
                        data-testid="carton-optical-label-input"
                        value={cartonRawLabelInput}
                        onChange={(e) => setCartonRawLabelInput(e.target.value)}
                        placeholder="امسح أو الصق نص ملصق الكرتون هنا..."
                        className="w-full p-2 rounded-lg bg-slate-800 border border-slate-700 text-blue-200 font-mono text-[11px] outline-hidden focus:border-blue-400"
                        dir="ltr"
                      />
                      <div className="flex flex-wrap items-center gap-2 pt-1">
                        <button
                          type="button"
                          data-testid="btn-apply-carton-scan"
                          onClick={() => handleApplyCartonScan('TARGET_ONLY')}
                          className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center gap-1.5 transition cursor-pointer"
                        >
                          <Camera className="w-3.5 h-3.5" />
                          <span>
                            {cartonCaptureTarget === 'BARCODE'
                              ? 'التقاط وإدراج الباركود الآن'
                              : 'التقاط وإدراج كود الصنف الآن'}
                          </span>
                        </button>
                        <button
                          type="button"
                          data-testid="btn-apply-carton-scan-both"
                          onClick={() => handleApplyCartonScan('BOTH_AND_SPECS')}
                          className="px-2.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-[11px] flex items-center gap-1 transition cursor-pointer"
                        >
                          <Sparkles className="w-3.5 h-3.5" />
                          <span>تعبئة الباركود + الكود معاً</span>
                        </button>
                        <label className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold text-[11px] flex items-center gap-1 cursor-pointer">
                          <Upload className="w-3.5 h-3.5 text-blue-400" />
                          <span>صورة كرتون</span>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleCartonImageFileUpload}
                            className="hidden"
                          />
                        </label>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {/* Arabic Product Name */}
                <div>
                  <label className="block font-bold text-slate-700 mb-1">اسم الصنف بالعربية *</label>
                  <input
                    type="text"
                    data-testid="new-product-name-ar"
                    required
                    value={nameAr}
                    onChange={(e) => {
                      setNameAr(e.target.value);
                      if (!name || name === nameAr) setName(e.target.value);
                    }}
                    placeholder="مثال: لوح طاقة شمسية 585W N-Type"
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg focus:border-blue-600 outline-hidden"
                  />
                </div>

                {/* Specific Inventory Classification with Add/Edit Category Action */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="font-bold text-slate-700">التصنيف المخزني المحدد *</label>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        data-testid="btn-toggle-custom-category"
                        onClick={() => {
                          setCustomCategoryMode('ADD');
                          setCustomCategoryNameAr('');
                          setIsCustomCategoryOpen((prev) => !prev);
                        }}
                        title="إضافة تصنيف مخزني مخصص جديد"
                        className="px-1.5 py-0.5 rounded bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 text-[10px] font-bold flex items-center gap-1 cursor-pointer"
                      >
                        <FolderPlus className="w-3 h-3" />
                        <span>+ تصنيف جديد</span>
                      </button>
                      <button
                        type="button"
                        data-testid="btn-edit-current-category"
                        onClick={() => {
                          const currentCat = categories.find((c) => c.id === categoryId);
                          setCustomCategoryMode('EDIT');
                          setCustomCategoryNameAr(currentCat?.nameAr || '');
                          setIsCustomCategoryOpen(true);
                        }}
                        title="تعديل مسمى التصنيف المخزني المحدد"
                        className="px-1.5 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 text-[10px] font-bold flex items-center gap-1 cursor-pointer"
                      >
                        <Edit3 className="w-3 h-3" />
                        <span>تعديل</span>
                      </button>
                    </div>
                  </div>
                  <select
                    data-testid="new-product-category-select"
                    value={categoryId}
                    onChange={(e) => handleSelectSpecificCategory(e.target.value)}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg font-bold text-slate-800 focus:border-blue-600 outline-hidden"
                  >
                    {electronicsCategories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.nameAr}
                      </option>
                    ))}
                  </select>

                  {isCustomCategoryOpen && (
                    <div className="mt-1.5 flex items-center gap-1.5 bg-blue-50/70 p-1.5 rounded-lg border border-blue-200">
                      <input
                        type="text"
                        data-testid="input-custom-category-name"
                        value={customCategoryNameAr}
                        onChange={(e) => setCustomCategoryNameAr(e.target.value)}
                        placeholder={
                          customCategoryMode === 'ADD'
                            ? 'اسم التصنيف الجديد (مثال: منظمات شحن MPPT)...'
                            : 'تعديل اسم التصنيف...'
                        }
                        className="flex-1 p-1.5 bg-white border border-blue-300 rounded text-xs outline-hidden"
                      />
                      <button
                        type="button"
                        data-testid="btn-save-custom-category"
                        onClick={handleSaveCustomCategory}
                        className="px-2.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded text-[11px] cursor-pointer"
                      >
                        حفظ
                      </button>
                    </div>
                  )}
                </div>

                {/* SKU Field + Two Small Icons Next to Label (Generate Unique SKU + Camera Carton Capture) */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="font-bold text-slate-700">كود الصنف (SKU) *</label>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        data-testid="btn-generate-item-sku"
                        onClick={handleGenerateItemSku}
                        title="توليد كود صنف (SKU) جديد وخاص بهذا الصنف تلقائياً"
                        className="px-2 py-0.5 rounded bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 text-[10px] font-bold inline-flex items-center gap-1 transition cursor-pointer"
                      >
                        <RefreshCw className="w-3 h-3 text-blue-600" />
                        <span>توليد كود</span>
                      </button>
                      <button
                        type="button"
                        data-testid="btn-camera-capture-sku"
                        onClick={() => handleOpenCartonCameraFor('SKU')}
                        title="تصوير الكرتون أو القطعة بالكاميرا لإدخال كود الصنف (SKU)"
                        className={`px-2 py-0.5 rounded border text-[10px] font-bold inline-flex items-center gap-1 transition cursor-pointer ${
                          cartonCaptureTarget === 'SKU'
                            ? 'bg-blue-600 text-white border-blue-600'
                            : 'bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border-indigo-200'
                        }`}
                      >
                        <Camera className="w-3 h-3" />
                        <span>كاميرا</span>
                      </button>
                    </div>
                  </div>
                  <input
                    type="text"
                    data-testid="new-product-sku"
                    required
                    value={sku}
                    onChange={(e) => setSku(e.target.value)}
                    placeholder="SOL-PNL-600W"
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg font-mono font-bold text-slate-900 focus:border-blue-600 outline-hidden"
                    dir="ltr"
                  />
                </div>

                {/* Barcode Field + Two Small Icons Next to Label (Generate Unique Barcode + Camera Carton Capture) */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="font-bold text-slate-700">الباركود (EAN-13)</label>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        data-testid="btn-generate-item-barcode"
                        onClick={handleGenerateItemBarcode}
                        title="توليد باركود جديد خاص بهذا الصنف (EAN-13 فريد)"
                        className="px-2 py-0.5 rounded bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 text-[10px] font-bold inline-flex items-center gap-1 transition cursor-pointer"
                      >
                        <RefreshCw className="w-3 h-3 text-blue-600" />
                        <span>توليد باركود</span>
                      </button>
                      <button
                        type="button"
                        data-testid="btn-camera-capture-barcode"
                        onClick={() => handleOpenCartonCameraFor('BARCODE')}
                        title="تصوير الكرتون أو القطعة بالكاميرا لإدخال الباركود"
                        className={`px-2 py-0.5 rounded border text-[10px] font-bold inline-flex items-center gap-1 transition cursor-pointer ${
                          cartonCaptureTarget === 'BARCODE'
                            ? 'bg-blue-600 text-white border-blue-600'
                            : 'bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border-indigo-200'
                        }`}
                      >
                        <Camera className="w-3 h-3" />
                        <span>كاميرا</span>
                      </button>
                    </div>
                  </div>
                  <input
                    type="text"
                    data-testid="new-product-barcode"
                    value={barcode}
                    onChange={(e) => setBarcode(e.target.value)}
                    placeholder="6281051..."
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg font-mono font-bold text-slate-900 focus:border-blue-600 outline-hidden"
                    dir="ltr"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">التكلفة (Cost Price)</label>
                  <input
                    type="number"
                    data-testid="new-product-cost"
                    value={costPrice}
                    onChange={(e) => setCostPrice(Number(e.target.value))}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg font-mono focus:border-blue-600 outline-hidden"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">سعر البيع (Sale Price) *</label>
                  <input
                    type="number"
                    data-testid="new-product-price"
                    value={salePrice}
                    onChange={(e) => setSalePrice(Number(e.target.value))}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg font-mono font-bold focus:border-blue-600 outline-hidden"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    {editingProductId ? 'الرصيد المخزني الحالي' : 'الرصيد الافتتاحي'}
                  </label>
                  <input
                    type="number"
                    data-testid="new-product-stock"
                    value={stockQty}
                    onChange={(e) => setStockQty(Number(e.target.value))}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg font-mono font-bold focus:border-blue-600 outline-hidden"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">الوحدة (UOM)</label>
                  <select
                    value={uom}
                    onChange={(e) => setUom(e.target.value)}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg font-bold"
                  >
                    <option value="PCS">قطعة / وحدة (PCS)</option>
                    <option value="BOX">صندوق / كرتون (BOX)</option>
                    <option value="SET">منظومة متكاملة (SET)</option>
                  </select>
                </div>
              </div>

              {/* Multi-Unit Packaging Builder (حبة / درزن / كرتون) */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <div className="text-[11px] font-bold text-slate-800">
                      وحدات التعبئة والبيع المتعددة (حبة / درزن / كرتون)
                    </div>
                    <div className="text-[10px] text-slate-500">
                      تُسحب من الرصيد الأساسي تلقائياً وفق معامل التحويل عند البيع أو التوريد
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <button
                      type="button"
                      data-testid="add-unit-dozen-btn"
                      onClick={() =>
                        setProductUnits((prev) => [
                          ...prev,
                          {
                            id: `uom-${Date.now()}-12`,
                            unitNameAr: 'درزن',
                            unitNameEn: 'DOZEN',
                            conversionFactor: 12,
                            salePrice: Math.round((Number(salePrice) || 0) * 12 * 100) / 100,
                            costPrice: Math.round((Number(costPrice) || 0) * 12 * 100) / 100,
                            barcode: '',
                          },
                        ])
                      }
                      className="px-2 py-1 rounded-lg bg-white hover:bg-blue-50 border border-slate-300 text-[10px] font-bold text-slate-700 cursor-pointer"
                    >
                      + درزن (×12)
                    </button>
                    <button
                      type="button"
                      data-testid="add-unit-carton-btn"
                      onClick={() =>
                        setProductUnits((prev) => [
                          ...prev,
                          {
                            id: `uom-${Date.now()}-24`,
                            unitNameAr: 'كرتون',
                            unitNameEn: 'CARTON',
                            conversionFactor: 24,
                            salePrice: Math.round((Number(salePrice) || 0) * 24 * 100) / 100,
                            costPrice: Math.round((Number(costPrice) || 0) * 24 * 100) / 100,
                            barcode: '',
                          },
                        ])
                      }
                      className="px-2 py-1 rounded-lg bg-white hover:bg-emerald-50 border border-slate-300 text-[10px] font-bold text-slate-700 cursor-pointer"
                    >
                      + كرتون (×24)
                    </button>
                    <button
                      type="button"
                      data-testid="add-unit-custom-btn"
                      onClick={() =>
                        setProductUnits((prev) => [
                          ...prev,
                          {
                            id: `uom-${Date.now()}-c`,
                            unitNameAr: 'شد',
                            conversionFactor: 6,
                            salePrice: Math.round((Number(salePrice) || 0) * 6 * 100) / 100,
                            costPrice: Math.round((Number(costPrice) || 0) * 6 * 100) / 100,
                            barcode: '',
                          },
                        ])
                      }
                      className="px-2 py-1 rounded-lg haseb-btn-primary text-white text-[10px] font-bold cursor-pointer"
                    >
                      + وحدة مخصصة
                    </button>
                  </div>
                </div>

                {productUnits.length > 0 && (
                  <div className="space-y-1.5 pt-1">
                    {productUnits.map((unitRow, idx) => (
                      <div
                        key={unitRow.id}
                        className="grid grid-cols-12 gap-1.5 items-center bg-white p-2 rounded-lg border border-slate-200"
                      >
                        <input
                          type="text"
                          value={unitRow.unitNameAr}
                          onChange={(e) =>
                            setProductUnits((prev) =>
                              prev.map((u, i) => (i === idx ? { ...u, unitNameAr: e.target.value } : u))
                            )
                          }
                          placeholder="اسم الوحدة (كرتون)"
                          className="col-span-3 px-2 py-1 bg-slate-50 border border-slate-200 rounded text-[11px] font-bold"
                        />
                        <input
                          type="number"
                          min="0.01"
                          step="any"
                          value={unitRow.conversionFactor}
                          onChange={(e) =>
                            setProductUnits((prev) =>
                              prev.map((u, i) =>
                                i === idx ? { ...u, conversionFactor: Number(e.target.value) } : u
                              )
                            )
                          }
                          placeholder="المعامل"
                          title="معامل التحويل (كم وحدة أساسية)"
                          className="col-span-2 px-2 py-1 bg-slate-50 border border-slate-200 rounded text-[11px] font-mono font-bold"
                        />
                        <input
                          type="number"
                          min="0"
                          step="any"
                          value={unitRow.salePrice}
                          onChange={(e) =>
                            setProductUnits((prev) =>
                              prev.map((u, i) => (i === idx ? { ...u, salePrice: Number(e.target.value) } : u))
                            )
                          }
                          placeholder="سعر البيع"
                          title="سعر بيع الوحدة"
                          className="col-span-3 px-2 py-1 bg-slate-50 border border-slate-200 rounded text-[11px] font-mono font-bold"
                        />
                        <input
                          type="text"
                          value={unitRow.barcode || ''}
                          onChange={(e) =>
                            setProductUnits((prev) =>
                              prev.map((u, i) => (i === idx ? { ...u, barcode: e.target.value } : u))
                            )
                          }
                          placeholder="باركود الوحدة"
                          className="col-span-3 px-2 py-1 bg-slate-50 border border-slate-200 rounded text-[10px] font-mono"
                        />
                        <button
                          type="button"
                          onClick={() =>
                            setProductUnits((prev) => prev.filter((_, i) => i !== idx))
                          }
                          className="col-span-1 h-7 rounded bg-rose-50 hover:bg-rose-100 text-rose-600 font-bold text-xs cursor-pointer"
                          title="حذف الوحدة"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="p-3.5 bg-slate-50 rounded-lg border border-slate-200 space-y-2.5">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <div>
                    <label className="block font-bold text-slate-800 mb-1">
                      التصنيف الهندسي الدقيق
                    </label>
                    <select
                      data-testid="new-product-subcategory-select"
                      value={subCategory}
                      onChange={(e) => {
                        const nextSub = e.target.value as ElectronicsSubCategory;
                        setSubCategory(nextSub);
                        const matchedSpec = SPECIFIC_INVENTORY_CLASSIFICATIONS.find(
                          (c) => c.subCategory === nextSub
                        );
                        if (matchedSpec) {
                          setCategoryId(matchedSpec.categoryId);
                        }
                      }}
                      className="w-full p-2 bg-white border border-slate-300 rounded-md font-bold"
                    >
                      <option value="SOLAR_PANEL">ألواح طاقة شمسية</option>
                      <option value="HYBRID_INVERTER">إنفرتر هجين MPPT</option>
                      <option value="LITHIUM_BATTERY">بطارية ليثيوم LiFePO4</option>
                      <option value="GEL_BATTERY">بطارية جل أنبوبية</option>
                      <option value="SMART_SCREEN">شاشة ذكية 4K / OLED</option>
                      <option value="COMPUTING_MOBILE">أجهزة وحواسيب</option>
                      <option value="SOLAR_ACCESSORY">قواطع وملحقات طاقة</option>
                    </select>
                  </div>
                  <div>
                    <label className="block font-bold text-slate-800 mb-1">
                      فترة الضمان (بالأشهر)
                    </label>
                    <input
                      type="number"
                      value={warrantyMonths}
                      onChange={(e) => setWarrantyMonths(Number(e.target.value))}
                      className="w-full p-2 bg-white border border-slate-300 rounded-md font-mono"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-800 mb-1">
                      حد إعادة الطلب (Reorder)
                    </label>
                    <input
                      type="number"
                      value={reorderPoint}
                      onChange={(e) => setReorderPoint(Number(e.target.value))}
                      className="w-full p-2 bg-white border border-slate-300 rounded-md font-mono"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <div>
                    <label className="block font-bold text-slate-800 mb-1">
                      القدرة بالواط (Watts)
                    </label>
                    <input
                      type="number"
                      value={powerRatingWatts}
                      onChange={(e) => setPowerRatingWatts(Number(e.target.value))}
                      placeholder="585"
                      className="w-full p-2 bg-white border border-slate-300 rounded-md font-mono"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-800 mb-1">
                      مواصفة السعة / الجهد / الشاشة
                    </label>
                    <input
                      type="text"
                      value={batteryCapacitySpec || screenSizeSpec || voltageSpec}
                      onChange={(e) => {
                        setVoltageSpec(e.target.value);
                        setBatteryCapacitySpec(e.target.value);
                      }}
                      placeholder="48V 200Ah / 65 4K QLED"
                      className="w-full p-2 bg-white border border-slate-300 rounded-md font-mono"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-800 mb-1">
                      موقع الرف بالمستودع (Bin)
                    </label>
                    <input
                      type="text"
                      value={binLocation}
                      onChange={(e) => setBinLocation(e.target.value)}
                      placeholder="ZA-01-S1-B01"
                      className="w-full p-2 bg-white border border-slate-300 rounded-md font-mono"
                      dir="ltr"
                    />
                  </div>
                </div>
              </div>

              {/* Product Image Attachment Section (إرفاق صورة للصنف لعرضها في نقطة البيع والمخزون) */}
              <div
                data-testid="product-image-attachment-section"
                className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2.5"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 font-bold text-slate-800">
                    <ImageIcon className="w-4 h-4 text-blue-600" />
                    <span>إرفاق صورة للصنف (تظهر في بطاقات نقطة البيع POS والمخزون)</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <label
                      data-testid="product-image-upload-label"
                      className="px-3 py-1.5 rounded-lg haseb-btn-primary text-white font-bold text-[11px] flex items-center gap-1.5 cursor-pointer transition"
                    >
                      <Upload className="w-3.5 h-3.5 text-emerald-400" />
                      <span>رفع صورة من الجهاز</span>
                      <input
                        type="file"
                        data-testid="product-image-upload-input"
                        accept="image/*"
                        onChange={handleProductImageFileUpload}
                        className="hidden"
                      />
                    </label>
                    {productImageUrl && (
                      <button
                        type="button"
                        data-testid="product-image-clear-btn"
                        onClick={() => setProductImageUrl('')}
                        className="px-2.5 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold text-[11px] cursor-pointer"
                      >
                        حذف الصورة
                      </button>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
                  <div className="sm:col-span-4 flex items-center justify-center bg-white border border-slate-200 rounded-xl p-2 h-24 overflow-hidden">
                    <img
                      data-testid="product-image-preview"
                      src={getProductVisualIllustrationUri({
                        imageUrl: productImageUrl,
                        subCategory,
                        sku,
                        nameAr,
                      })}
                      alt="معاينة صورة الصنف"
                      className="max-h-full max-w-full object-contain rounded-lg"
                    />
                  </div>
                  <div className="sm:col-span-8 space-y-2">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">
                        أو أدخل رابط الصورة المباشر (Image URL / Data URI):
                      </label>
                      <input
                        type="text"
                        data-testid="product-image-url-input"
                        value={productImageUrl}
                        onChange={(e) => setProductImageUrl(e.target.value)}
                        placeholder="https://... أو ارفع صورة من جهازك أو اختر رسماً توضيحياً أدناه"
                        className="w-full p-2 bg-white border border-slate-300 rounded-lg font-mono text-[11px] outline-hidden focus:border-blue-600"
                        dir="ltr"
                      />
                    </div>
                    <div className="flex flex-wrap items-center gap-1">
                      <span className="text-[10px] font-bold text-slate-500 me-1">قوالب مصورة سريعة:</span>
                      {PRESET_PRODUCT_ILLUSTRATIONS.map((preset) => (
                        <button
                          key={preset.id}
                          type="button"
                          data-testid={`preset-image-btn-${preset.id}`}
                          onClick={() => setProductImageUrl(preset.dataUri)}
                          className={`px-2 py-0.5 rounded-md text-[10px] font-bold border transition cursor-pointer ${
                            productImageUrl === preset.dataUri
                              ? 'haseb-nav-active text-white'
                              : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          {preset.labelAr}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2">
                <button
                  type="button"
                  data-testid="btn-clear-add-product-form-footer"
                  onClick={handleClearAddProductForm}
                  className="px-3.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold rounded-xl flex items-center gap-1.5 transition cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>إفراغ جميع الحقول</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      stopCartonWebcam();
                      setCartonCaptureTarget(null);
                      setIsAddModalOpen(false);
                    }}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl cursor-pointer"
                  >
                    إلغاء
                  </button>
                  <button
                    type="submit"
                    data-testid="submit-product-btn"
                    className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl shadow-xs cursor-pointer"
                  >
                    {editingProductId ? 'حفظ التعديلات على الصنف' : 'حفظ الصنف وتوليد الباركود'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bulk CSV / Excel Import Wizard Modal (Lazy-loaded) */}
      {isBulkModalOpen && (
        <Suspense fallback={<InventoryModalLoadingFallback />}>
          <InventoryBulkImportModal
            tenantId={currentTenant.id}
            warehouseId={currentWarehouse.id}
            defaultCategoryId={electronicsCategories[0]?.id || 'cat-solar-panels'}
            currency={currency}
            onConfirmImport={handleConfirmBulkImport}
            onClose={() => setIsBulkModalOpen(false)}
          />
        </Suspense>
      )}

      {/* Live Camera Barcode & QR Scanner Modal (Lazy-loaded) */}
      {isCameraScannerOpen && (
        <Suspense fallback={<InventoryModalLoadingFallback />}>
          <CameraBarcodeScannerModal
            isOpen={isCameraScannerOpen}
            onClose={() => setIsCameraScannerOpen(false)}
            onScan={handleCameraBarcodeScan}
            onBatchScanComplete={handleCameraBatchScanComplete}
            contextMode={cameraScannerContext === 'STOCK_TAKE' ? 'STOCK_TAKE' : 'INVENTORY'}
            title={
              cameraScannerContext === 'STOCK_TAKE'
                ? 'مسح الباركود بالكاميرا - الجرد الفعلي للمستودع'
                : 'مسح الباركود والكود بالكاميرا - إدارة المخزون'
            }
          />
        </Suspense>
      )}

      {/* Mobile Double-Tap Quick Actions Sheet for Inventory Products */}
      <MobileQuickActionsSheet
        target={invQuickActionTarget}
        onClose={() => setInvQuickActionTarget(null)}
        onSelectAction={handleSelectInvQuickAction}
        language={language}
      />
    </div>
  );
});

InventoryView.displayName = 'InventoryView';
export default InventoryView;
