import React, { useState, useRef, useEffect } from 'react';
import { useERP } from '../context/ERPContext';
import {
  Package,
  Plus,
  Search,
  Filter,
  FileSpreadsheet,
  Upload,
  CheckCircle2,
  Download,
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
  TrendingUp,
  Volume2,
  VolumeX,
  Zap,
  AlertTriangle,
  Maximize2,
  Minimize2,
} from 'lucide-react';
import {
  ResponsiveContainer,
  ComposedChart,
  BarChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Cell,
} from 'recharts';
import { CameraBarcodeScannerModal, ScannedBatchItem } from '../components/common/CameraBarcodeScannerModal';
import { WorkspaceTabResizerBar } from '../components/common/WorkspaceTabResizerBar';
import { IndustryType, ElectronicsSubCategory, Product } from '../types/erp';
import {
  parseBulkProductsCSV,
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
} from '../core/inventoryEngine';

const SAMPLE_BULK_CSV = `SKU,Barcode,NameAr,NameEn,CostPrice,SalePrice,StockQty,UOM,ReorderPoint,Sector
SOL-600W-TOPCON,6281042009103,لوح طاقة شمسية N-Type بايفيشال 600W,N-Type Bifacial Solar Panel 600W,390,510,80,PCS,15,electronics
INV-DEYE-12KW,6281042009110,إنفرتر هجين ذكي Deye 12kW 3-Phase MPPT,Deye 12kW 3-Phase Hybrid Inverter,4200,5350,12,PCS,3,electronics
BAT-LFP-51V-300,6281042009127,بطارية ليثيوم جدارية LiFePO4 51.2V 300Ah 15kWh,LiFePO4 Rack Battery 51.2V 300Ah 15kWh,4850,6200,15,PCS,4,electronics
SCR-OLED-77-4K,6281042009134,شاشة ذكية 77 بوصة 4K OLED 120Hz WebOS,Smart 77-inch 4K OLED 120Hz TV,3100,4150,10,PCS,3,electronics`;

export const InventoryView: React.FC = () => {
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
  const [expandedChart, setExpandedChart] = useState<'BOTH' | 'DEMAND' | 'STOCK'>('BOTH');

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

  const handleCameraBarcodeScan = (scannedCode: string, matchedProduct?: any, qty = 1) => {
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
  };

  const handleCameraBatchScanComplete = (batchItems: ScannedBatchItem[]) => {
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
  };

  const showCostPrice = masterSystemConfig.uiElementsVisibility.showCostPriceInInventory;
  const showExportImport = masterSystemConfig.uiElementsVisibility.showExportImportButtons;

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedSubCatFilter, setSelectedSubCatFilter] = useState<string>('ALL');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [bulkCsvText, setBulkCsvText] = useState<string>(SAMPLE_BULK_CSV);
  const [postOpeningJournal, setPostOpeningJournal] = useState<boolean>(true);
  const [importBanner, setImportBanner] = useState<string | null>(null);
  const [productModalError, setProductModalError] = useState<string | null>(null);
  const [productModalNotice, setProductModalNotice] = useState<string | null>(null);

  // Specific Electronics & Solar Categories
  const electronicsCategories = categories.filter((c) => !c.industry || c.industry === 'electronics');

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
  const [expiryDate] = useState<string>('2027-09-30');
  const [prepTimeMinutes] = useState<number>(12);

  // Custom / Edit Specific Category Inline State inside Modal
  const [isCustomCategoryOpen, setIsCustomCategoryOpen] = useState(false);
  const [customCategoryMode, setCustomCategoryMode] = useState<'ADD' | 'EDIT'>('ADD');
  const [customCategoryNameAr, setCustomCategoryNameAr] = useState('');

  // Carton / Piece Camera Scanner inside Add/Edit Product Modal (for Barcode & SKU)
  const [cartonCaptureTarget, setCartonCaptureTarget] = useState<'BARCODE' | 'SKU' | null>(null);
  const [cartonRawLabelInput, setCartonRawLabelInput] = useState('');
  const [isLiveWebcamActive, setIsLiveWebcamActive] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const stopCartonWebcam = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setIsLiveWebcamActive(false);
  };

  useEffect(() => {
    return () => {
      stopCartonWebcam();
    };
  }, []);

  const startCartonWebcam = async () => {
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' },
        });
        streamRef.current = stream;
        setIsLiveWebcamActive(true);
        setTimeout(() => {
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            videoRef.current.play().catch(() => {});
          }
        }, 100);
      } else {
        setIsLiveWebcamActive(false);
      }
    } catch {
      setIsLiveWebcamActive(false);
    }
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
    setProductIndustry('electronics');
    setIsAddModalOpen(true);
  };

  // Open Modal for Editing an Existing Product (تعديل الصنف بالكامل)
  const handleOpenEditModal = (product: Product) => {
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
    setProductIndustry(product.industry || 'electronics');
    setIsAddModalOpen(true);
  };

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

  const liveBulkPreview = parseBulkProductsCSV(
    bulkCsvText,
    currentTenant.id,
    currentWarehouse.id,
    electronicsCategories[0]?.id || 'cat-solar-panels',
    'electronics'
  );

  // Filtered Products dedicated to Electronics, Solar Energy, Batteries, Inverters & Smart Screens
  const electronicsProducts = products.filter(
    (p) => !p.industry || p.industry === 'electronics'
  );

  const filteredProducts = electronicsProducts.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.nameAr.includes(searchQuery) ||
      p.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.barcode.includes(searchQuery);

    const specForCat = SPECIFIC_INVENTORY_CLASSIFICATIONS.find(
      (c) => c.categoryId === selectedCategory
    );
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

  // Inline Quick Stock Adjustment (+1 / -1) in Inventory Table
  const handleQuickStockStep = (product: Product, delta: number) => {
    const nextQty = Math.max(0, product.stockQty + delta);
    updateProduct({
      ...product,
      stockQty: nextQty,
    });
    setImportBanner(
      `تم تحديث رصيد المخزون للصنف (${product.nameAr}) إلى ${nextQty} ${product.uom}.`
    );
    setTimeout(() => setImportBanner(null), 3500);
  };

  const handleCommitSingleStockTake = (product: typeof products[0]) => {
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
  };

  // Commit ALL Modified Stock-Take Counts at Once (اعتماد الجرد الكلي لجميع الفروقات دفعة واحدة)
  const handleCommitAllStockTake = () => {
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
  };

  const handleConfirmBulkImport = () => {
    const res = importBulkProductsCSV(bulkCsvText, postOpeningJournal);
    if (res.importedCount > 0) {
      setIsBulkModalOpen(false);
      setImportBanner(
        `تم استيراد ${res.importedCount} أصناف بنجاح وإثبات رصيد افتتاحي بقيمة ${res.totalOpeningValuation.toLocaleString()} ${currency} في الأستاذ العام!`
      );
      setTimeout(() => setImportBanner(null), 5000);
    }
  };

  const handleCsvFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const content = ev.target?.result;
      if (typeof content === 'string') {
        setBulkCsvText(content);
      }
    };
    reader.readAsText(file);
  };

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
        costPrice: Number(costPrice) || 0,
        salePrice: Number(salePrice) || 0,
        taxRate: 0,
        stockQty: Number(stockQty) || 0,
        minStock: Math.floor(reorderPoint / 2),
        maxStock: reorderPoint * 5,
        reorderPoint: Number(reorderPoint) || 5,
        warehouseId: currentWarehouse.id,
        binLocation: binLocation || 'ZA-01-S1-B01',
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

  const handleExportCSV = () => {
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
  };

  // Stock-taking live summary stats
  const stockTakeSummary = filteredProducts.reduce(
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
  );

  // Build Recharts Mini-Dashboard Analytics for Top Demanded Items & Current Stock Levels
  const miniDashboardAnalytics = buildInventoryMiniDashboardAnalytics(
    electronicsProducts,
    salesInvoices
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

      {/* Organized Header Card: Row 1 Title & Primary Actions + Row 2 Sub-Tabs & Utility Actions */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200/90 dark:border-slate-800 p-4 shadow-2xs space-y-3">
        {/* Row 1: Full-Width Title & Primary High-Frequency Buttons */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="flex-1 min-w-[280px]">
            <h1 className="text-base sm:text-lg font-black text-slate-900 dark:text-slate-100 tracking-tight flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-blue-600/10 border border-blue-500/20 flex items-center justify-center text-blue-700 dark:text-blue-400 shrink-0">
                <Package className="w-4 h-4" />
              </div>
              <span>
                {language === 'ar'
                  ? 'إدارة المخزون والجرد الفعلي والتصنيف الهندسي (WMS)'
                  : 'Solar, Electronics, Batteries & Smart Screens WMS'}
              </span>
            </h1>
            <p className="text-xs text-slate-500 mt-1 ps-10">
              تحكم كامل بالأصناف والتصنيفات المخزنية المحددة، تعديل البيانات والأسعار والأرصدة، الجرد الفعلي اللحظي، وتصوير/توليد الباركود والأكواد
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {hasPermission('canCreate') && (
              <button
                type="button"
                data-testid="add-product-modal-btn"
                onClick={handleOpenCreateModal}
                className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold px-3.5 py-2 rounded-lg transition flex items-center gap-1.5 shadow-2xs cursor-pointer whitespace-nowrap shrink-0"
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
              className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold px-3.5 py-2 rounded-lg transition flex items-center gap-1.5 shadow-2xs cursor-pointer whitespace-nowrap shrink-0"
            >
              <Zap className="w-3.5 h-3.5 shrink-0" />
              <span>وضع الجرد السريع بالباركود</span>
            </button>

            <button
              type="button"
              data-testid="btn-toggle-inventory-mini-dashboard"
              onClick={() => setIsMiniDashboardOpen((prev) => !prev)}
              className={`text-xs font-bold px-3 py-2 rounded-lg border transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0 ${
                isMiniDashboardOpen
                  ? 'bg-blue-50 text-blue-800 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5 text-blue-600 shrink-0" />
              <span>{isMiniDashboardOpen ? 'إخفاء اللوحة البيانية' : 'لوحة قرارات المخزون'}</span>
            </button>
          </div>
        </div>

        {/* Row 2: Resizable Sub-Tabs Navigation + Secondary Utility Actions & Workspace Resizer */}
        <div className="pt-2.5 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              data-testid="subtab-inventory-items"
              onClick={() => setInventorySubTab('ITEMS')}
              className={`erp-resizable-tab px-3.5 py-2 rounded-lg font-bold text-xs flex items-center gap-2 border transition cursor-pointer whitespace-nowrap shrink-0 ${
                inventorySubTab === 'ITEMS'
                  ? 'border-blue-600 bg-blue-600 text-white shadow-2xs'
                  : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/70 text-slate-700 dark:text-slate-300 hover:bg-slate-100'
              }`}
            >
              <Package className="w-3.5 h-3.5 shrink-0" />
              <span>سجل الأصناف والتحكم بالمخزون ({electronicsProducts.length})</span>
            </button>

            <button
              type="button"
              data-testid="subtab-stock-taking"
              onClick={() => setInventorySubTab('STOCK_TAKING')}
              className={`erp-resizable-tab px-3.5 py-2 rounded-lg font-bold text-xs flex items-center gap-2 border transition cursor-pointer whitespace-nowrap shrink-0 ${
                inventorySubTab === 'STOCK_TAKING'
                  ? 'border-indigo-600 bg-indigo-600 text-white shadow-2xs'
                  : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/70 text-slate-700 dark:text-slate-300 hover:bg-slate-100'
              }`}
            >
              <ClipboardCheck className="w-3.5 h-3.5 shrink-0" />
              <span>الجرد الفعلي اللحظي وتسوية الفروقات</span>
            </button>

            <button
              type="button"
              data-testid="subtab-branch-transfers"
              onClick={() => setInventorySubTab('BRANCH_TRANSFERS')}
              className={`erp-resizable-tab px-3.5 py-2 rounded-lg font-bold text-xs flex items-center gap-2 border transition cursor-pointer whitespace-nowrap shrink-0 ${
                inventorySubTab === 'BRANCH_TRANSFERS'
                  ? 'border-blue-600 bg-blue-600 text-white shadow-2xs'
                  : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/70 text-slate-700 dark:text-slate-300 hover:bg-slate-100'
              }`}
            >
              <Network className="w-3.5 h-3.5 shrink-0" />
              <span>شبكة الفروع والتحويلات ({branchNodes.length} فروع)</span>
              {interBranchTransfers.length > 0 && (
                <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-white/20 text-current font-mono">
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
              className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold px-2.5 py-1.5 rounded-lg transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0"
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
              className="bg-white hover:bg-blue-50 text-blue-700 border border-blue-200 text-xs font-bold px-2.5 py-1.5 rounded-lg transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0"
            >
              <MessageSquare className="w-3.5 h-3.5 shrink-0" />
              <span>إشعار النواقص</span>
            </button>

            {hasPermission('canCreate') && showExportImport && (
              <button
                type="button"
                data-testid="open-bulk-import-btn"
                onClick={() => setIsBulkModalOpen(true)}
                className="bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200 text-xs font-semibold px-2.5 py-1.5 rounded-lg transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0"
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
                className="bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-semibold px-2.5 py-1.5 rounded-lg transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-blue-700 shrink-0" />
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

      {/* Interactive Recharts Mini-Dashboard Inside Inventory Screen (لوحة التحكم المصغرة لاتخاذ القرار السريع) */}
      {isMiniDashboardOpen && (
        <div
          data-testid="inventory-mini-dashboard"
          className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200/90 dark:border-slate-800 p-4 shadow-2xs space-y-4"
        >
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-blue-600/10 border border-blue-500/20 flex items-center justify-center text-blue-600">
                <TrendingUp className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-black text-slate-900 dark:text-slate-100">
                  لوحة التحكم المصغرة للمخزون واتخاذ القرار السريع (Interactive Inventory Analytics)
                </h2>
                <p className="text-[11px] text-slate-500">
                  تحليل بياني لحظي لأكثر الأصناف طلباً ومعدلات الدوران ومستويات المخزون الحالية مقابل حد إعادة الطلب الآمن
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              <div className="px-3 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                <div className="text-[10px] text-slate-500 font-bold">إجمالي وحدات المستودع</div>
                <div className="font-mono font-black text-slate-900 dark:text-white text-sm" dir="ltr">
                  {miniDashboardAnalytics.totalUnitsInStock.toLocaleString()} PCS
                </div>
              </div>
              <div className="px-3 py-1.5 rounded-lg bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800">
                <div className="text-[10px] text-blue-700 dark:text-blue-300 font-bold">قيمة المخزون بالتكلفة</div>
                <div className="font-mono font-black text-blue-900 dark:text-blue-200 text-sm" dir="ltr">
                  {miniDashboardAnalytics.totalInventoryValue.toLocaleString()} {currency}
                </div>
              </div>
              <div className="px-3 py-1.5 rounded-lg bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800">
                <div className="text-[10px] text-indigo-700 dark:text-indigo-300 font-bold">الأعلى طلباً ودوراناً</div>
                <div className="font-bold text-indigo-950 dark:text-indigo-200 text-xs truncate max-w-[150px]">
                  {miniDashboardAnalytics.topPerformerNameAr}
                </div>
              </div>
              <div className="px-3 py-1.5 rounded-lg bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
                <div className="text-[10px] text-amber-800 dark:text-amber-300 font-bold">تحتاج إعادة طلب</div>
                <div className="font-mono font-black text-amber-900 dark:text-amber-200 text-sm">
                  {miniDashboardAnalytics.lowStockItemsCount} أصناف
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Recharts Chart 1: Top Demanded Items vs Current Stock */}
            {expandedChart !== 'STOCK' && (
              <div
                data-testid="inventory-chart-top-demanded"
                className={`p-3.5 rounded-xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 space-y-2 ${
                  expandedChart === 'DEMAND' ? 'lg:col-span-2' : ''
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    <BarChart3 className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                    <span>أكثر الأصناف طلباً ومبيعات مقارنة بالرصيد المتاح</span>
                  </h3>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="text-[10px] font-bold text-blue-700 bg-blue-100/80 px-2 py-0.5 rounded">
                      تفاعلي مباشر (Recharts)
                    </span>
                    <button
                      type="button"
                      data-testid="btn-resize-demand-chart"
                      onClick={() =>
                        setExpandedChart((prev) => (prev === 'DEMAND' ? 'BOTH' : 'DEMAND'))
                      }
                      className="p-1 rounded border border-slate-200 bg-white hover:bg-blue-50 text-slate-600 hover:text-blue-700 cursor-pointer"
                      title={expandedChart === 'DEMAND' ? 'استعادة العرض المزدوج' : 'تكبير الرسم البياني'}
                    >
                      {expandedChart === 'DEMAND' ? (
                        <Minimize2 className="w-3 h-3" />
                      ) : (
                        <Maximize2 className="w-3 h-3" />
                      )}
                    </button>
                  </div>
                </div>
                <div className={`${expandedChart === 'DEMAND' ? 'h-64' : 'h-48'} w-full`} dir="ltr">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart
                      data={miniDashboardAnalytics.topDemandedItems}
                      margin={{ top: 8, right: 12, left: 0, bottom: 4 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis
                        dataKey="sku"
                        tick={{ fontSize: 10, fill: '#475569', fontWeight: 700 }}
                      />
                      <YAxis tick={{ fontSize: 10, fill: '#475569' }} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#0f172a',
                          borderColor: '#1e293b',
                          borderRadius: '8px',
                          color: '#f8fafc',
                          fontSize: '11px',
                        }}
                        formatter={(val: any, name: any) => [
                          `${val} وحدة`,
                          name === 'demandedQty'
                            ? 'الطلب والمبيعات'
                            : name === 'currentStock'
                            ? 'الرصيد المتاح'
                            : 'حد إعادة الطلب',
                        ]}
                        labelFormatter={(label: any, payload: any) =>
                          payload?.[0]?.payload?.nameAr || label
                        }
                      />
                      <Legend
                        wrapperStyle={{ fontSize: '11px', fontWeight: 700 }}
                        formatter={(val) =>
                          val === 'demandedQty'
                            ? 'الطلب والمبيعات'
                            : val === 'currentStock'
                            ? 'الرصيد الفعلي المتاح'
                            : 'حد الطلب الآمن'
                        }
                      />
                      <Bar
                        dataKey="demandedQty"
                        name="demandedQty"
                        fill="#2563eb"
                        radius={[4, 4, 0, 0]}
                        barSize={20}
                      />
                      <Bar
                        dataKey="currentStock"
                        name="currentStock"
                        fill="#6366f1"
                        radius={[4, 4, 0, 0]}
                        barSize={20}
                      />
                      <Line
                        type="monotone"
                        dataKey="reorderPoint"
                        name="reorderPoint"
                        stroke="#f59e0b"
                        strokeWidth={2}
                        dot={{ r: 3, fill: '#f59e0b' }}
                      />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {/* Recharts Chart 2: Current Stock Levels vs Reorder Point */}
            {expandedChart !== 'DEMAND' && (
              <div
                data-testid="inventory-chart-stock-levels"
                className={`p-3.5 rounded-xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 space-y-2 ${
                  expandedChart === 'STOCK' ? 'lg:col-span-2' : ''
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    <Package className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                    <span>مستويات المخزون الحالية مقابل حد إعادة الطلب الآمن</span>
                  </h3>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="text-[10px] font-bold text-indigo-700 bg-indigo-100/80 px-2 py-0.5 rounded">
                      انقر على أي عمود لتصفية الصنف
                    </span>
                    <button
                      type="button"
                      data-testid="btn-resize-stock-chart"
                      onClick={() =>
                        setExpandedChart((prev) => (prev === 'STOCK' ? 'BOTH' : 'STOCK'))
                      }
                      className="p-1 rounded border border-slate-200 bg-white hover:bg-indigo-50 text-slate-600 hover:text-indigo-700 cursor-pointer"
                      title={expandedChart === 'STOCK' ? 'استعادة العرض المزدوج' : 'تكبير الرسم البياني'}
                    >
                      {expandedChart === 'STOCK' ? (
                        <Minimize2 className="w-3 h-3" />
                      ) : (
                        <Maximize2 className="w-3 h-3" />
                      )}
                    </button>
                  </div>
                </div>
                <div className={`${expandedChart === 'STOCK' ? 'h-64' : 'h-48'} w-full`} dir="ltr">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={miniDashboardAnalytics.stockLevelsItems}
                    margin={{ top: 8, right: 12, left: 0, bottom: 4 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis
                      dataKey="sku"
                      tick={{ fontSize: 10, fill: '#475569', fontWeight: 700 }}
                    />
                    <YAxis tick={{ fontSize: 10, fill: '#475569' }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#0f172a',
                        borderColor: '#1e293b',
                        borderRadius: '8px',
                        color: '#f8fafc',
                        fontSize: '11px',
                      }}
                      formatter={(val: any, name: any) => [
                        `${val} وحدة`,
                        name === 'stockQty' ? 'الرصيد الفعلي الحالي' : 'حد إعادة الطلب الآمن',
                      ]}
                      labelFormatter={(label: any, payload: any) =>
                        payload?.[0]?.payload?.nameAr || label
                      }
                    />
                    <Legend
                      wrapperStyle={{ fontSize: '11px', fontWeight: 700 }}
                      formatter={(val) =>
                        val === 'stockQty' ? 'الرصيد الفعلي الحالي' : 'حد إعادة الطلب الآمن'
                      }
                    />
                    <Bar
                      dataKey="stockQty"
                      name="stockQty"
                      radius={[4, 4, 0, 0]}
                      barSize={22}
                      onClick={(data: any) => {
                        if (data?.sku) {
                          setSearchQuery(String(data.sku));
                          setInventorySubTab('ITEMS');
                        }
                      }}
                      className="cursor-pointer"
                    >
                      {miniDashboardAnalytics.stockLevelsItems.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={
                            entry.healthStatus === 'OUT_OF_STOCK'
                              ? '#e11d48'
                              : entry.healthStatus === 'REORDER_NOW'
                              ? '#d97706'
                              : '#1d4ed8'
                          }
                        />
                      ))}
                    </Bar>
                    <Bar
                      dataKey="reorderPoint"
                      name="reorderPoint"
                      fill="#94a3b8"
                      radius={[4, 4, 0, 0]}
                      barSize={14}
                    />
                  </BarChart>
                </ResponsiveContainer>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {inventorySubTab === 'ITEMS' && (
        <>
          {/* Filter Bar Dedicated to Solar, Inverters, Batteries & Smart Screens */}
          <div className="bg-white dark:bg-slate-900 p-3.5 rounded-lg border border-slate-200/90 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
            <div className="w-full sm:w-80 flex items-center gap-1.5">
              <div className="flex-1 relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="بحث بالاسم، الكود SKU، أو الباركود..."
                  className="w-full text-xs p-2 ps-8 bg-slate-50 border border-slate-200 rounded-md outline-hidden focus:border-blue-600"
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
                className="shrink-0 px-2.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-xs font-bold flex items-center gap-1 transition shadow-2xs cursor-pointer group"
              >
                <Camera className="w-4 h-4 group-hover:scale-110 transition-transform" />
                <span className="hidden sm:inline">كاميرا</span>
              </button>
            </div>

            {/* Specialized Engineering Sub-Category Filter Buttons */}
            <div className="flex flex-wrap items-center gap-1 text-xs">
              {[
                { id: 'ALL', label: 'كل الأصناف' },
                { id: 'SOLAR_PANEL', label: 'ألواح شمسية' },
                { id: 'HYBRID_INVERTER', label: 'إنفرترات هجينة' },
                { id: 'LITHIUM_BATTERY', label: 'بطاريات ليثيوم وجل' },
                { id: 'SMART_SCREEN', label: 'شاشات ذكية 4K/OLED' },
                { id: 'COMPUTING_MOBILE', label: 'أجهزة وحواسيب' },
                { id: 'SOLAR_ACCESSORY', label: 'قواطع وكابلات طاقة' },
              ].map((sec) => (
                <button
                  key={sec.id}
                  type="button"
                  onClick={() => setSelectedSubCatFilter(sec.id)}
                  className={`px-2.5 py-1.5 rounded-md font-semibold transition cursor-pointer ${
                    selectedSubCatFilter === sec.id
                      ? 'bg-blue-700 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {sec.label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <Filter className="w-3.5 h-3.5 text-slate-500" />
              <select
                data-testid="inventory-category-filter-select"
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="text-xs p-2 bg-slate-50 border border-slate-200 rounded-md outline-hidden font-bold text-slate-700"
              >
                <option value="all">جميع التصنيفات المخزنية المحددة</option>
                {electronicsCategories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {language === 'ar' ? c.nameAr : c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Products Table */}
          <div className="bg-white rounded-md border border-slate-200 shadow-2xs overflow-hidden">
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
                  {filteredProducts.map((p) => {
                    const isReorder = p.stockQty <= p.reorderPoint;
                    const specificClassificationAr = resolveSpecificProductClassificationAr(
                      p,
                      categories
                    );
                    return (
                      <tr key={p.id} className="hover:bg-slate-50/70 transition">
                        <td className="py-3 px-4">
                          <div className="font-bold text-slate-900 text-sm">
                            {language === 'ar' ? p.nameAr : p.name}
                          </div>
                          <div className="text-[11px] text-slate-500 flex flex-wrap items-center gap-2 mt-0.5">
                            <span>
                              SKU:{' '}
                              <span
                                className="font-mono tabular-nums text-blue-800 font-bold"
                                dir="ltr"
                              >
                                {p.sku}
                              </span>
                            </span>
                            <span>·</span>
                            <span>
                              الموقع:{' '}
                              <span className="font-mono tabular-nums text-slate-700" dir="ltr">
                                {p.binLocation || 'ZA-01'}
                              </span>
                            </span>
                          </div>
                          {(p.powerRatingWatts ||
                            p.batteryCapacitySpec ||
                            p.voltageSpec ||
                            p.screenSizeSpec) && (
                            <div className="flex flex-wrap gap-1.5 mt-1.5">
                              {p.powerRatingWatts && (
                                <span
                                  className="text-[10px] font-mono tabular-nums bg-slate-100 text-slate-800 border border-slate-200 px-1.5 py-0.5 rounded-xs font-semibold"
                                  dir="ltr"
                                >
                                  {p.powerRatingWatts >= 1000
                                    ? `${(p.powerRatingWatts / 1000).toFixed(1).replace('.0', '')} kW`
                                    : `${p.powerRatingWatts} W`}
                                </span>
                              )}
                              {p.batteryCapacitySpec && (
                                <span
                                  className="text-[10px] font-mono tabular-nums bg-blue-50 text-blue-900 border border-blue-200 px-1.5 py-0.5 rounded-xs font-semibold"
                                  dir="ltr"
                                >
                                  {p.batteryCapacitySpec}
                                </span>
                              )}
                              {p.voltageSpec && (
                                <span
                                  className="text-[10px] font-mono tabular-nums bg-slate-50 text-slate-700 border border-slate-200 px-1.5 py-0.5 rounded-xs"
                                  dir="ltr"
                                >
                                  {p.voltageSpec}
                                </span>
                              )}
                              {p.screenSizeSpec && (
                                <span
                                  className="text-[10px] font-mono tabular-nums bg-sky-50 text-sky-900 border border-sky-200 px-1.5 py-0.5 rounded-xs font-semibold"
                                  dir="ltr"
                                >
                                  {p.screenSizeSpec}
                                </span>
                              )}
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <span
                            data-testid={`product-specific-category-${p.sku}`}
                            className="inline-block bg-blue-50 text-blue-900 border border-blue-200 font-bold px-2.5 py-0.5 rounded-xs text-[11px]"
                          >
                            {specificClassificationAr}
                          </span>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {p.warrantyMonths && (
                              <span className="text-[10px] bg-indigo-50 text-indigo-900 border border-indigo-200 px-1.5 py-0.5 rounded-xs font-bold">
                                ضمان{' '}
                                <span className="font-mono tabular-nums" dir="ltr">
                                  {p.warrantyMonths}
                                </span>{' '}
                                شهر
                              </span>
                            )}
                            {p.hasSerials && (
                              <span className="text-[10px] bg-slate-100 text-slate-700 border border-slate-200 px-1.5 py-0.5 rounded-xs font-bold">
                                تتبع S/N
                              </span>
                            )}
                          </div>
                        </td>
                        <td
                          className="py-3 px-4 font-mono tabular-nums font-bold text-slate-800"
                          dir="ltr"
                        >
                          {p.barcode}
                        </td>
                        {showCostPrice && (
                          <td
                            className="py-3 px-4 text-end font-semibold font-mono tabular-nums text-slate-700"
                            dir="ltr"
                          >
                            {p.costPrice.toLocaleString()} {currency}
                          </td>
                        )}
                        <td
                          className="py-3 px-4 text-end font-bold font-mono tabular-nums text-slate-900"
                          dir="ltr"
                        >
                          {p.salePrice.toLocaleString()} {currency}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <div className="inline-flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-md px-1.5 py-1">
                            <button
                              type="button"
                              data-testid={`quick-stock-dec-${p.sku}`}
                              onClick={() => handleQuickStockStep(p, -1)}
                              title="إنقاص الرصيد (-1)"
                              className="w-5 h-5 rounded bg-white hover:bg-rose-50 text-slate-700 hover:text-rose-700 border border-slate-200 flex items-center justify-center font-bold transition cursor-pointer"
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                            <div className="px-1.5 min-w-[3rem] text-center">
                              <span
                                className="font-bold font-mono tabular-nums text-sm text-slate-900"
                                dir="ltr"
                              >
                                {p.stockQty}
                              </span>{' '}
                              <span className="text-[10px] text-slate-500 font-medium">
                                {p.uom}
                              </span>
                            </div>
                            <button
                              type="button"
                              data-testid={`quick-stock-inc-${p.sku}`}
                              onClick={() => handleQuickStockStep(p, 1)}
                              title="زيادة الرصيد (+1)"
                              className="w-5 h-5 rounded bg-white hover:bg-blue-50 text-slate-700 hover:text-blue-700 border border-slate-200 flex items-center justify-center font-bold transition cursor-pointer"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span
                            className={`inline-block px-2 py-0.5 rounded-xs text-[10px] font-bold border ${
                              isReorder
                                ? 'bg-amber-50 text-amber-900 border-amber-300'
                                : 'bg-blue-50 text-blue-900 border-blue-200'
                            }`}
                          >
                            {isReorder ? 'إعادة طلب' : 'متوفر'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <div className="flex flex-wrap items-center justify-center gap-1">
                            <button
                              type="button"
                              data-testid={`edit-product-btn-${p.sku}`}
                              onClick={() => handleOpenEditModal(p)}
                              className="px-2 py-1 bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-200 rounded text-[11px] font-bold inline-flex items-center gap-1 transition cursor-pointer"
                              title="تعديل بيانات الصنف، السعر، الكود، الباركود، أو التصنيف المخزني"
                            >
                              <Edit3 className="w-3 h-3 text-blue-600" />
                              <span>تعديل</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setStockCountsMap((prev) => ({
                                  ...prev,
                                  [p.id]: prev[p.id] ?? p.stockQty,
                                }));
                                setInventorySubTab('STOCK_TAKING');
                              }}
                              className="px-2 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border border-indigo-200 rounded text-[11px] font-bold inline-flex items-center gap-1 transition cursor-pointer"
                              title="جرد وتسوية الرصيد الفعلي للصنف"
                            >
                              <ClipboardCheck className="w-3 h-3 text-indigo-600" />
                              <span>جرد</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                addToPOSCart(p, 1);
                                setActiveTab('pos');
                              }}
                              className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 rounded text-[11px] font-bold inline-flex items-center gap-1 transition cursor-pointer"
                              title="إضافة مباشرة لسلة نقطة البيع والانتقال للكاشير"
                            >
                              <ShoppingCart className="w-3 h-3 text-slate-700" />
                              <span>بيع POS</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => openCrossBranchModal(p.sku)}
                              className="px-2 py-1 bg-sky-50 hover:bg-sky-100 text-sky-800 border border-sky-200 rounded text-[11px] font-bold inline-flex items-center gap-1 transition cursor-pointer"
                              title="فحص توفر الصنف في باقي الفروع والشبكة المحلية (LAN)"
                            >
                              <Network className="w-3 h-3 text-sky-600" />
                              <span>الفروع</span>
                            </button>
                            <button
                              type="button"
                              data-testid={`delete-product-btn-${p.sku}`}
                              onClick={() => {
                                deleteProduct(p.id);
                                setImportBanner(`تم حذف الصنف (${p.nameAr} — ${p.sku}) من سجل المخزون.`);
                                setTimeout(() => setImportBanner(null), 4000);
                              }}
                              className="p-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded text-[11px] font-bold inline-flex items-center transition cursor-pointer"
                              title="حذف الصنف من المخزون"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
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

          <div className="bg-slate-900 text-white p-4 rounded-xl border border-slate-800 space-y-3">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
              <div>
                <h3 className="font-bold text-sm flex items-center gap-2">
                  <ClipboardCheck className="w-4 h-4 text-blue-400 shrink-0" />
                  <span>محرك الجرد الفعلي اللحظي والتحكم الكامل بتسوية الفروقات</span>
                </h3>
                <p className="text-xs text-slate-300 mt-1">
                  تحكم بالعدد الفعلي لكل صنف عبر أزرار (+ / -) أو الإدخال المباشر أو مسح الكاميرا، ثم اعتمد الجرد فردياً أو جماعياً لترحيل قيد التسوية آلياً.
                </p>
              </div>
              <div className="w-full lg:w-72 shrink-0">
                <input
                  type="text"
                  value={stockAuditReason}
                  onChange={(e) => setStockAuditReason(e.target.value)}
                  placeholder="بيان محضر الجرد..."
                  className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white text-xs outline-hidden focus:border-blue-400"
                />
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                data-testid="toggle-fast-stock-take-btn"
                onClick={() => {
                  setIsFastStockTakeOpen((prev) => !prev);
                  setTimeout(() => fastBarcodeInputRef.current?.focus(), 60);
                }}
                className={`px-3.5 py-2 font-bold rounded-lg text-xs flex items-center justify-center gap-1.5 transition shadow-xs cursor-pointer whitespace-nowrap shrink-0 ${
                  isFastStockTakeOpen
                    ? 'bg-blue-500 text-white ring-2 ring-blue-300'
                    : 'bg-slate-800 hover:bg-slate-700 text-blue-300 border border-blue-500/40'
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
                  {filteredProducts.map((p) => {
                    const counted = stockCountsMap[p.id] ?? p.stockQty;
                    const variance = calculateStockAdjustmentVariance(
                      p.id,
                      p.stockQty,
                      counted,
                      p.costPrice
                    );
                    return (
                      <tr key={p.id} className="hover:bg-slate-50/70 transition">
                        <td className="py-3 px-4">
                          <div className="font-bold text-slate-900">{p.nameAr}</div>
                          <div className="text-[11px] text-slate-500 flex items-center gap-2 mt-0.5">
                            <span className="font-mono text-blue-800 font-bold" dir="ltr">
                              {p.sku}
                            </span>
                            <span>·</span>
                            <span>{resolveSpecificProductClassificationAr(p, categories)}</span>
                          </div>
                        </td>
                        <td
                          className="py-3 px-4 text-center font-mono font-bold text-slate-700"
                          dir="ltr"
                        >
                          {p.stockQty} {p.uom}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <div className="inline-flex items-center gap-1">
                            <button
                              type="button"
                              data-testid={`stock-step-dec-${p.sku}`}
                              onClick={() =>
                                setStockCountsMap((prev) => ({
                                  ...prev,
                                  [p.id]: Math.max(0, (prev[p.id] ?? p.stockQty) - 1),
                                }))
                              }
                              className="w-7 h-7 rounded bg-slate-100 hover:bg-rose-100 text-slate-700 hover:text-rose-800 border border-slate-300 flex items-center justify-center font-bold cursor-pointer"
                            >
                              <Minus className="w-3.5 h-3.5" />
                            </button>
                            <input
                              type="number"
                              min={0}
                              data-testid={`stock-count-input-${p.sku}`}
                              value={counted}
                              onChange={(e) =>
                                setStockCountsMap((prev) => ({
                                  ...prev,
                                  [p.id]: Math.max(0, Number(e.target.value)),
                                }))
                              }
                              className="w-20 text-center font-mono font-bold p-1.5 bg-slate-50 border border-slate-300 rounded-md focus:border-blue-600 outline-hidden"
                            />
                            <button
                              type="button"
                              data-testid={`stock-step-inc-${p.sku}`}
                              onClick={() =>
                                setStockCountsMap((prev) => ({
                                  ...prev,
                                  [p.id]: (prev[p.id] ?? p.stockQty) + 1,
                                }))
                              }
                              className="w-7 h-7 rounded bg-slate-100 hover:bg-blue-100 text-slate-700 hover:text-blue-800 border border-slate-300 flex items-center justify-center font-bold cursor-pointer"
                            >
                              <Plus className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-center font-mono font-bold" dir="ltr">
                          <span
                            className={`px-2 py-0.5 rounded text-[11px] ${
                              variance.adjustmentType === 'SURPLUS'
                                ? 'bg-blue-100 text-blue-800'
                                : variance.adjustmentType === 'DEFICIT'
                                ? 'bg-rose-100 text-rose-800'
                                : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            {variance.varianceQty > 0
                              ? `+${variance.varianceQty}`
                              : variance.varianceQty}
                          </span>
                        </td>
                        <td
                          className="py-3 px-4 text-end font-mono font-bold text-slate-800"
                          dir="ltr"
                        >
                          {formatCurrency(variance.varianceValue)}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <button
                            type="button"
                            data-testid={`commit-stock-take-btn-${p.sku}`}
                            onClick={() => handleCommitSingleStockTake(p)}
                            className="px-3 py-1.5 bg-blue-700 hover:bg-blue-600 text-white rounded-md font-bold text-xs transition cursor-pointer"
                          >
                            اعتماد الجرد وترحيل القيد
                          </button>
                        </td>
                      </tr>
                    );
                  })}
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/65 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-300 w-full max-w-2xl overflow-hidden my-auto">
            {/* Modal Header with Trash Icon to Clear All Form Data */}
            <div className="px-6 py-4 bg-slate-900 text-white border-b border-slate-800 flex items-center justify-between gap-2">
              <h3 className="font-bold text-sm sm:text-base flex items-center gap-2">
                <Package className="w-4 h-4 text-blue-400 shrink-0" />
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
                  className="px-2.5 py-1.5 rounded-lg bg-rose-600/90 hover:bg-rose-500 text-white text-xs font-bold flex items-center gap-1.5 transition shadow-xs cursor-pointer"
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
                  className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center font-bold cursor-pointer"
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
                  className="p-4 rounded-xl bg-slate-900 text-white border-2 border-blue-500 space-y-3 shadow-lg"
                >
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                    <div className="flex items-center gap-2">
                      <Camera className="w-4 h-4 text-blue-400" />
                      <span className="font-bold text-xs text-blue-200">
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
                      className="text-slate-400 hover:text-white cursor-pointer"
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
                          <ScanLine className="w-6 h-6 text-blue-400 mx-auto" />
                          <div className="text-[11px] font-bold text-slate-200">
                            عدسة قراءة ملصق الكرتون / القطعة
                          </div>
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
                      <label className="block text-[11px] text-slate-300 font-bold">
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

      {/* Bulk CSV / Excel Import Wizard Modal */}
      {isBulkModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[90vh] overflow-y-auto p-6 space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Upload className="w-5 h-5 text-indigo-600" />
                <div>
                  <h3 className="font-black text-base text-slate-900">
                    معالج الاستيراد الجماعي للأصناف والأرصدة الافتتاحية (Excel / CSV Wizard)
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    الصق البيانات مباشرة من ملف Excel أو ارفع ملف CSV لتسجيل الأصناف وتوليد الباركود وقيد الرصيد الافتتاحي آلياً
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsBulkModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 font-bold text-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Template & File Upload Controls */}
            <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-50 p-3 rounded-xl border border-slate-200">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setBulkCsvText(SAMPLE_BULK_CSV)}
                  className="px-3 py-1.5 rounded-lg bg-white hover:bg-indigo-50 text-indigo-700 border border-indigo-200 font-bold transition cursor-pointer flex items-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>تحميل نموذج قياسي جاهز (4 أصناف متنوعة)</span>
                </button>
                <label className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-bold transition cursor-pointer flex items-center gap-1.5">
                  <Upload className="w-3.5 h-3.5" />
                  <span>رفع ملف .CSV أو .TXT</span>
                  <input
                    type="file"
                    accept=".csv,.txt,.tsv"
                    onChange={handleCsvFileUpload}
                    className="hidden"
                  />
                </label>
              </div>
              <div className="text-[11px] font-mono text-slate-600">
                الأعمدة: SKU, Barcode, NameAr, NameEn, CostPrice, SalePrice, StockQty, UOM, ReorderPoint, Sector
              </div>
            </div>

            {/* Raw CSV Textarea */}
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                بيانات الجدول (يدعم الفاصلة `,` أو اللصق المباشر من خلايا Excel `Tab`):
              </label>
              <textarea
                data-testid="bulk-csv-textarea"
                rows={5}
                value={bulkCsvText}
                onChange={(e) => setBulkCsvText(e.target.value)}
                className="w-full p-3 rounded-xl bg-slate-900 text-blue-300 font-mono text-[11px] border border-slate-700 outline-hidden"
              />
            </div>

            {/* Live Parsed Preview Table */}
            <div className="space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-bold text-slate-800">
                  معاينة الأصناف الجاهزة للاستيراد ({liveBulkPreview.validProducts.length} صنف صالح):
                </span>
                <div className="flex items-center gap-3 font-mono font-bold">
                  <span className="text-slate-600">
                    إجمالي الكميات:{' '}
                    <strong className="text-slate-900">{liveBulkPreview.totalOpeningQty}</strong>
                  </span>
                  <span className="text-blue-700">
                    إجمالي تقييم المخزون الافتتاحي:{' '}
                    <strong>
                      {liveBulkPreview.totalOpeningValuation.toLocaleString()} {currency}
                    </strong>
                  </span>
                </div>
              </div>

              <div className="max-h-44 overflow-y-auto border border-slate-200 rounded-xl">
                <table className="w-full text-[11px] text-start">
                  <thead className="bg-slate-100 text-slate-600 font-bold">
                    <tr>
                      <th className="py-2 px-3 text-start">SKU</th>
                      <th className="py-2 px-3 text-start">الباركود</th>
                      <th className="py-2 px-3 text-start">اسم الصنف</th>
                      <th className="py-2 px-3 text-center">القطاع</th>
                      <th className="py-2 px-3 text-end">التكلفة</th>
                      <th className="py-2 px-3 text-end">سعر البيع</th>
                      <th className="py-2 px-3 text-center">الكمية</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {liveBulkPreview.validProducts.map((item, idx) => (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="py-1.5 px-3 font-mono font-bold text-slate-900">
                          {item.sku}
                        </td>
                        <td className="py-1.5 px-3 font-mono text-indigo-700">{item.barcode}</td>
                        <td className="py-1.5 px-3 font-bold text-slate-800">{item.nameAr}</td>
                        <td className="py-1.5 px-3 text-center">{item.industry}</td>
                        <td className="py-1.5 px-3 text-end font-mono">{item.costPrice}</td>
                        <td className="py-1.5 px-3 text-end font-mono font-bold">
                          {item.salePrice}
                        </td>
                        <td className="py-1.5 px-3 text-center font-mono font-black text-blue-700">
                          {item.stockQty} {item.uom}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Auto-Journal Checkbox & Submit */}
            <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
              <label className="flex items-center gap-2 font-bold text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={postOpeningJournal}
                  onChange={(e) => setPostOpeningJournal(e.target.checked)}
                  className="rounded text-indigo-600 w-4 h-4"
                />
                <span>
                  إصدار وترحيل قيد يومية محاسبي تلقائي بالرصيد الافتتاحي للمخزون (
                  {liveBulkPreview.totalOpeningValuation.toLocaleString()} {currency})
                </span>
              </label>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsBulkModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="button"
                  data-testid="confirm-bulk-import-btn"
                  disabled={liveBulkPreview.validProducts.length === 0}
                  onClick={handleConfirmBulkImport}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-black rounded-xl shadow-sm transition disabled:opacity-40 cursor-pointer"
                >
                  اعتماد واستيراد الأصناف ({liveBulkPreview.validProducts.length})
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Live Camera Barcode & QR Scanner Modal */}
      {isCameraScannerOpen && (
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
      )}
    </div>
  );
};
