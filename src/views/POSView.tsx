import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useERP } from '../context/ERPContext';
import {
  CreditCard,
  Barcode,
  Search,
  Trash2,
  Plus,
  Minus,
  PauseCircle,
  PlayCircle,
  Printer,
  Lock,
  Utensils,
  Cpu,
  Pill,
  Scale,
  ChefHat,
  CheckCircle2,
  Clock,
  Sun,
  BatteryCharging,
  Zap,
  Monitor,
  Calculator,
  ShieldCheck,
  Filter,
  MessageSquare,
  Smartphone,
  Network,
  Package,
  Percent,
  Camera,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { CameraBarcodeScannerModal, ScannedBatchItem } from '../components/common/CameraBarcodeScannerModal';
import { WorkspaceTabResizerBar } from '../components/common/WorkspaceTabResizerBar';
import { SplitPaneRatioMode, resolveSplitPaneLayout } from '../core/workspaceLayoutEngine';
import {
  SalesInvoice,
  ThermalTemplateType,
  StandardInvoiceTemplateType,
  ElectronicsSubCategory,
} from '../types/erp';
import { InvoiceRenderer } from '../components/invoices/InvoiceRenderer';
import {
  parseWeightedScaleBarcode,
  generateWeightedScaleBarcode,
  generateUniqueSerialNumber,
} from '../core/barcodeEngine';
import { calculateSolarAndBatterySystemSizing } from '../core/inventoryEngine';
import { composeInvoiceMessageText } from '../core/messagingEngine';
import { IndustryChameleonPanel } from '../components/common/IndustryChameleonPanel';
import {
  buildOrderedPosFieldIds,
  computeNextPosTabStopIndex,
  resolvePosActiveFieldLabel,
} from '../core/posKeyboardNavigation';

export const POSView: React.FC = () => {
  const {
    products,
    categories,
    posCart,
    addToPOSCart,
    addSolarSystemKitToPOSCart,
    removeFromPOSCart,
    updatePOSCartQty,
    updatePOSCartItemMeta,
    clearPOSCart,
    checkoutPOS,
    holdBills,
    holdCurrentPOSBill,
    resumePOSBill,
    currentShift,
    closePOSShift,
    openNewPOSShift,
    currency,
    language,
    currentTenant,
    company,
    currentBranch,
    activeIndustry,
    setActiveIndustry,
    invoiceTemplateSettings,
    kitchenTickets,
    sendCartToKitchen,
    advanceKitchenTicket,
    masterSystemConfig,
    promoCoupons,
    validateCouponForAmount,
    openQuickSendModal,
    openCrossBranchModal,
    customers,
    setActiveTab,
  } = useERP();

  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedElectronicsSubCat, setSelectedElectronicsSubCat] = useState<ElectronicsSubCategory | 'ALL'>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [barcodeInput, setBarcodeInput] = useState('');

  // Solar & Battery Engineering Calculator Modal State
  const [isSolarCalcOpen, setIsSolarCalcOpen] = useState(false);
  const [peakLoadWatts, setPeakLoadWatts] = useState<number>(3600);
  const [autonomyHours, setAutonomyHours] = useState<number>(8);
  const [systemVoltage, setSystemVoltage] = useState<12 | 24 | 48>(48);
  const [batteryChemistry, setBatteryChemistry] = useState<'LIFEPO4' | 'TUBULAR_GEL'>('LIFEPO4');
  const [panelRatingWatts, setPanelRatingWatts] = useState<number>(585);
  const [peakSunHours, setPeakSunHours] = useState<number>(5.5);

  const solarSizingResult = useMemo(
    () =>
      calculateSolarAndBatterySystemSizing({
        continuousLoadWatts: peakLoadWatts,
        backupHours: autonomyHours,
        systemVoltage,
        batteryType: batteryChemistry,
        singlePanelWatts: panelRatingWatts,
        peakSunHours,
      }),
    [
      peakLoadWatts,
      autonomyHours,
      systemVoltage,
      batteryChemistry,
      panelRatingWatts,
      peakSunHours,
    ]
  );

  // Restaurant Mode States
  const [orderType, setOrderType] = useState<'DINE_IN' | 'TAKEAWAY' | 'DELIVERY' | 'STANDARD'>(
    activeIndustry === 'restaurant' ? 'DINE_IN' : 'STANDARD'
  );
  const [selectedTable, setSelectedTable] = useState<string>('T-01');
  const [isKDSModalOpen, setIsKDSModalOpen] = useState(false);

  // Grocery Scale Simulator State
  const [scaleWeightKg, setScaleWeightKg] = useState<number>(0.75);

  // Live Camera Barcode Scanner State
  const [isCameraScannerOpen, setIsCameraScannerOpen] = useState(false);

  // Checkout & Payment Settlement State
  const [isCheckoutModalOpen, setIsCheckoutModalOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'CARD' | 'SPLIT'>('CASH');
  const [cashTendered, setCashTendered] = useState<number>(0);
  const [splitCashAmount, setSplitCashAmount] = useState<number>(0);
  const [cardReference, setCardReference] = useState<string>('');
  const [checkoutNotes, setCheckoutNotes] = useState<string>('');
  const [completedInvoice, setCompletedInvoice] = useState<SalesInvoice | null>(null);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [receiptViewMode, setReceiptViewMode] = useState<'thermal' | 'a4'>('thermal');
  const [selectedThermalOverride, setSelectedThermalOverride] = useState<ThermalTemplateType | undefined>(
    undefined
  );
  const [selectedA4Override, setSelectedA4Override] = useState<StandardInvoiceTemplateType | undefined>(
    undefined
  );

  const [isCloseShiftModalOpen, setIsCloseShiftModalOpen] = useState(false);
  const [actualCashCount, setActualCashCount] = useState(currentShift.expectedCash);
  const [autoOpenNewShift, setAutoOpenNewShift] = useState(true);
  const [newShiftStartingFloat, setNewShiftStartingFloat] = useState<number>(1500);
  const [posBanner, setPosBanner] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Customer & Warranty Beneficiary State in POS Cart
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>(customers[2]?.id || customers[0]?.id || 'cust-pos-walkin');
  const [warrantyCustomerName, setWarrantyCustomerName] = useState<string>('');
  const [warrantyCustomerPhone, setWarrantyCustomerPhone] = useState<string>('');

  // Cart Discount State (Percent vs Fixed Amount) & Resizable Split-Pane State
  const [discountType, setDiscountType] = useState<'PERCENT' | 'AMOUNT'>('PERCENT');
  const [discountValue, setDiscountValue] = useState<number | ''>('');
  const [posSplitMode, setPosSplitMode] = useState<SplitPaneRatioMode>('BALANCED');
  const [isDiscountPanelOpen, setIsDiscountPanelOpen] = useState<boolean>(false);
  const posSplitLayout = resolveSplitPaneLayout(posSplitMode, 'POS');

  // High-Speed POS Active Focus & Deterministic Tab Cycling State
  const posContainerRef = useRef<HTMLDivElement | null>(null);
  const [activePosFieldId, setActivePosFieldId] = useState<string>('pos-barcode-input');

  const orderedPosFieldIds = useMemo(
    () =>
      buildOrderedPosFieldIds(
        posCart.map((it) => it.productId),
        posCart.length > 0
      ),
    [posCart]
  );

  const activeFieldMeta = useMemo(
    () => resolvePosActiveFieldLabel(activePosFieldId, language),
    [activePosFieldId, language]
  );

  const focusPosFieldById = (fieldId: string) => {
    const root = posContainerRef.current || document;
    const el = root.querySelector(`[data-pos-field-id="${fieldId}"]`) as
      | HTMLInputElement
      | HTMLSelectElement
      | HTMLButtonElement
      | null;
    if (el && !el.disabled) {
      el.focus();
      if ('select' in el && typeof el.select === 'function' && el.tagName === 'INPUT') {
        try {
          el.select();
        } catch {
          // ignore select on unsupported input types
        }
      }
      setActivePosFieldId(fieldId);
    }
  };

  // Auto-focus Barcode Scanner field when POS mounts
  useEffect(() => {
    const timer = setTimeout(() => {
      focusPosFieldById('pos-barcode-input');
    }, 60);
    return () => clearTimeout(timer);
  }, []);

  const showBanner = (type: 'success' | 'error', text: string) => {
    setPosBanner({ type, text });
    setTimeout(() => setPosBanner(null), 4000);
  };

  // Cart Totals with Live Discount (Percent or Fixed Amount)
  const subtotal = posCart.reduce((acc, curr) => acc + curr.quantity * curr.unitPrice, 0);

  const calculatedDiscountAmount = useMemo(() => {
    if (typeof discountValue !== 'number' || discountValue <= 0 || subtotal <= 0) {
      return 0;
    }
    if (discountType === 'PERCENT') {
      const pct = Math.min(100, Math.max(0, discountValue));
      return Math.round(((subtotal * pct) / 100) * 100) / 100;
    } else {
      return Math.min(subtotal, Math.max(0, discountValue));
    }
  }, [discountType, discountValue, subtotal]);

  // Backward compatibility alias
  const couponDiscountAmount = calculatedDiscountAmount;

  const netTaxable = Math.max(0, subtotal - calculatedDiscountAmount);
  const taxAmount = 0;
  const grandTotal = Math.round(netTaxable * 100) / 100;

  // Filtered Products for touch grid - Strictly limited to active industry (no cross-contamination)
  const filteredProducts = products.filter((p) => {
    const matchesCat = selectedCategory === 'all' || p.categoryId === selectedCategory;
    const matchesSubCat =
      activeIndustry !== 'electronics' ||
      selectedElectronicsSubCat === 'ALL' ||
      p.subCategory === selectedElectronicsSubCat ||
      (selectedElectronicsSubCat === 'LITHIUM_BATTERY' &&
        (p.subCategory === 'LITHIUM_BATTERY' || p.subCategory === 'GEL_BATTERY'));
    const matchesInd =
      activeIndustry === 'general' ||
      p.industry === activeIndustry ||
      !p.industry;
    const matchesSearch =
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.nameAr.includes(searchTerm) ||
      p.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.barcode.includes(searchTerm);
    return matchesCat && matchesSubCat && matchesInd && matchesSearch;
  });

  // Fast Barcode Input Handler (Supports GS1 Prefix 21 Weight-Embedded & Prefix 20 Price-Embedded Scale Barcodes)
  const handleBarcodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const raw = barcodeInput.trim();
    if (!raw) return;

    const scaleParsed = parseWeightedScaleBarcode(raw);
    if (scaleParsed.isValid) {
      const scaleProduct =
        products.find((p) => p.barcode.includes(scaleParsed.itemPlu)) ||
        products.find((p) => p.isWeightedScale) ||
        products.find((p) => p.industry === 'grocery') ||
        products[0];

      if (scaleProduct) {
        if (scaleParsed.mode === 'WEIGHT_GRAMS' && scaleParsed.weightKg) {
          addToPOSCart(
            scaleProduct,
            scaleParsed.weightKg,
            `باركود ميزان إلكتروني (GS1-${scaleParsed.prefix}): ${scaleParsed.weightKg} كجم (${scaleParsed.weightGrams} جم)`
          );
          setBarcodeInput('');
          showBanner(
            'success',
            `تم قراءة باركود الوزن (بادئة ${scaleParsed.prefix}): ${scaleProduct.nameAr} — الوزن: ${scaleParsed.weightKg} كجم`
          );
          return;
        } else if (scaleParsed.mode === 'PRICE_HALALAS' && scaleParsed.embeddedPrice) {
          const calculatedQty =
            scaleProduct.salePrice > 0
              ? Number((scaleParsed.embeddedPrice / scaleProduct.salePrice).toFixed(3))
              : 1;
          addToPOSCart(
            scaleProduct,
            calculatedQty,
            `باركود ميزان تسعير (GS1-20): السعر المضمن ${scaleParsed.embeddedPrice} ${currency}`
          );
          setBarcodeInput('');
          showBanner(
            'success',
            `تم قراءة باركود السعر (بادئة 20): ${scaleProduct.nameAr} — القيمة: ${scaleParsed.embeddedPrice} ${currency} (${calculatedQty} كجم)`
          );
          return;
        }
      }
    }

    const matched = products.find(
      (p) => p.barcode === raw || p.sku.toLowerCase() === raw.toLowerCase()
    );
    if (matched) {
      addToPOSCart(matched, 1);
      setBarcodeInput('');
      showBanner('success', `تمت إضافة الصنف: ${matched.nameAr}`);
    } else {
      showBanner(
        'error',
        language === 'ar'
          ? 'الباركود غير موجود في قاعدة الأصناف'
          : 'Barcode not found in catalog'
      );
    }
  };

  // Simulate Weighing an item on Electronic Scale (Generates valid 13-digit GS1 Prefix 21 barcode)
  const handleSimulateScaleScan = () => {
    const scaleProduct =
      products.find((p) => p.isWeightedScale) ||
      products.find((p) => p.industry === 'grocery') ||
      products[0];
    if (!scaleProduct) return;
    const generatedGs1Code = generateWeightedScaleBarcode('21', '10045', Math.round(scaleWeightKg * 1000));
    addToPOSCart(
      scaleProduct,
      scaleWeightKg,
      `موزون (${generatedGs1Code}): ${scaleWeightKg} كجم`
    );
    setBarcodeInput(generatedGs1Code);
    showBanner(
      'success',
      `تم توليد وقراءة باركود الميزان [${generatedGs1Code}] وإضافة (${scaleProduct.nameAr}) بوزن ${scaleWeightKg} كجم`
    );
  };

  // Live Camera Barcode Handler (Single Mode)
  const handleCameraBarcodeScan = (scannedCode: string, matchedProduct?: any, qty = 1) => {
    if (matchedProduct) {
      addToPOSCart(matchedProduct, qty);
      showBanner(
        'success',
        `تم مسح وإضافة الصنف عبر الكاميرا: ${matchedProduct.nameAr || matchedProduct.name}`
      );
      return;
    }

    // Check scale barcode
    const scaleProduct =
      products.find((p) => p.isWeightedScale || p.sku.includes('GS1')) ||
      products[0];
    const scaleParsed = parseWeightedScaleBarcode(scannedCode);
    if (scaleParsed.isValid) {
      if (scaleParsed.mode === 'WEIGHT_GRAMS') {
        addToPOSCart(
          scaleProduct,
          scaleParsed.weightKg,
          `باركود ميزان إلكتروني (GS1-${scaleParsed.prefix}): ${scaleParsed.weightKg} كجم`
        );
        showBanner(
          'success',
          `تم قراءة باركود الوزن عبر الكاميرا: ${scaleProduct.nameAr} — ${scaleParsed.weightKg} كجم`
        );
        return;
      } else if (scaleParsed.mode === 'PRICE_HALALAS' && scaleParsed.embeddedPrice) {
        const calculatedQty =
          scaleProduct.salePrice > 0
            ? Number((scaleParsed.embeddedPrice / scaleProduct.salePrice).toFixed(3))
            : 1;
        addToPOSCart(
          scaleProduct,
          calculatedQty,
          `باركود ميزان تسعير (GS1-20): ${scaleParsed.embeddedPrice} ${currency}`
        );
        showBanner(
          'success',
          `تم قراءة باركود السعر عبر الكاميرا: ${scaleProduct.nameAr} — ${scaleParsed.embeddedPrice} ${currency}`
        );
        return;
      }
    }

    showBanner(
      'error',
      language === 'ar'
        ? `الباركود [${scannedCode}] غير مسجل في قاعدة الأصناف`
        : `Barcode [${scannedCode}] not found in catalog`
    );
  };

  // Live Camera Batch Barcode Handler (Continuous Mode)
  const handleCameraBatchScanComplete = (batchItems: ScannedBatchItem[]) => {
    let count = 0;
    batchItems.forEach((item) => {
      if (item.product) {
        addToPOSCart(item.product, item.quantity);
        count += item.quantity;
      }
    });
    if (count > 0) {
      showBanner(
        'success',
        language === 'ar'
          ? `تمت إضافة ${count} قطع بنجاح من المسح المتعدد بالكاميرا`
          : `Added ${count} items from camera batch scan`
      );
    }
  };

  // Send order to Kitchen Display Screen (KOT)
  const handleSendToKitchen = () => {
    if (posCart.length === 0) return;
    const kot = sendCartToKitchen(
      selectedTable,
      orderType === 'STANDARD' ? 'DINE_IN' : orderType
    );
    if (kot) {
      showBanner(
        'success',
        `تم إرسال الطلب للمطبخ بنجاح (${kot.kotNumber}) - الطاولة ${selectedTable}`
      );
    }
  };

  // Perform Checkout
  const handlePerformCheckout = (preferA4Warranty = false) => {
    try {
      const inv = checkoutPOS(paymentMethod, selectedCustomerId, {
        orderType: activeIndustry === 'restaurant' ? orderType : 'STANDARD',
        tableNumber:
          activeIndustry === 'restaurant' && orderType === 'DINE_IN'
            ? selectedTable
            : undefined,
        manualDiscountType: calculatedDiscountAmount > 0 ? discountType : undefined,
        manualDiscountValue:
          calculatedDiscountAmount > 0 && typeof discountValue === 'number'
            ? discountValue
            : undefined,
        manualDiscountAmount:
          calculatedDiscountAmount > 0 ? calculatedDiscountAmount : undefined,
        customerName: warrantyCustomerName.trim() || undefined,
        customerPhone: warrantyCustomerPhone.trim() || undefined,
        splitCashAmount: paymentMethod === 'SPLIT' ? splitCashAmount : undefined,
        cardReference: paymentMethod !== 'CASH' ? cardReference.trim() || undefined : undefined,
        notes: checkoutNotes.trim() || undefined,
      });
      setCompletedInvoice(inv);
      setDiscountValue('');
      setCheckoutNotes('');
      setIsCheckoutModalOpen(false);
      if (preferA4Warranty) {
        setReceiptViewMode('a4');
        setSelectedA4Override('a4_warranty_electronics');
      } else {
        setReceiptViewMode('thermal');
        setSelectedThermalOverride(
          activeIndustry === 'electronics' ? 'thermal_80mm_warranty' : undefined
        );
      }
      setIsReceiptModalOpen(true);
    } catch (err: any) {
      showBanner('error', err.message || 'Checkout error');
    }
  };

  // Preview Live Warranty Certificate Draft before payment
  const handlePreviewDraftWarrantyCertificate = () => {
    if (posCart.length === 0) return;
    const targetCust = customers.find((c) => c.id === selectedCustomerId) || customers[0];
    const resolvedName =
      warrantyCustomerName.trim() ||
      (language === 'ar' ? targetCust?.nameAr : targetCust?.name) ||
      'عميل نقدي - ضمان مباشر';
    const resolvedPhone = warrantyCustomerPhone.trim() || targetCust?.phone || '+967 771 445 880';

    const draftItems = posCart.map((it) => ({
      ...it,
      serialNumber:
        it.serialNumber?.trim() || generateUniqueSerialNumber('IMEI', currentTenant.code),
      warrantyMonths: it.warrantyMonths || 24,
    }));

    const draftInvoice: SalesInvoice = {
      id: `draft-war-${Date.now()}`,
      tenantId: currentTenant.id,
      invoiceNumber: `WAR-CERT-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
      customerId: selectedCustomerId,
      customerName: resolvedName,
      customerPhone: resolvedPhone,
      branchId: currentBranch.id,
      date: new Date().toISOString().split('T')[0],
      items: draftItems,
      subtotal,
      discountAmount: calculatedDiscountAmount,
      discountType: calculatedDiscountAmount > 0 ? discountType : undefined,
      discountValue:
        calculatedDiscountAmount > 0 && typeof discountValue === 'number'
          ? discountValue
          : undefined,
      couponCode:
        calculatedDiscountAmount > 0
          ? discountType === 'PERCENT'
            ? `خصم ${discountValue}%`
            : `خصم نقدي (${calculatedDiscountAmount.toFixed(2)} ${currency})`
          : undefined,
      taxAmount,
      grandTotal,
      paidAmount: grandTotal,
      paymentMethod,
      status: 'PAID',
      qrData: `WARRANTY-CERT-${resolvedName}-TOTAL-${grandTotal}`,
      industryMode: activeIndustry,
    };

    setCompletedInvoice(draftInvoice);
    setReceiptViewMode('a4');
    setSelectedA4Override('a4_warranty_electronics');
    setIsReceiptModalOpen(true);
  };

  // Auto-generate serials for all items in cart
  const handleGenerateAllCartSerials = () => {
    posCart.forEach((item) => {
      if (!item.serialNumber?.trim()) {
        updatePOSCartItemMeta(item.productId, {
          serialNumber: generateUniqueSerialNumber('IMEI', currentTenant.code),
          warrantyMonths: item.warrantyMonths || 24,
        });
      }
    });
    showBanner('success', 'تم توليد وتوثيق الأرقام التسلسلية (SN / IMEI) لكافة أصناف السلة');
  };

  const handleApplySolarKitToCart = () => {
    const res = addSolarSystemKitToPOSCart(solarSizingResult);
    setIsSolarCalcOpen(false);
    showBanner(
      'success',
      `تم إدراج منظومة الطاقة الشمسية المتكاملة (${solarSizingResult.recommendedPanelCount} لوح 585W + إنفرتر ${solarSizingResult.recommendedInverterKw}kW + ${solarSizingResult.recommendedBatteryUnits} بطارية) في السلة بقيمة تقديرية ${res.totalAmount.toLocaleString()} ${currency}`
    );
  };

  const tablesList = ['T-01', 'T-02', 'T-03', 'T-04', 'T-05', 'T-06', 'T-07', 'T-08'];
  const quickKitchenNotes = ['بدون بصل', 'زيادة جبن', 'حار سبايسي', 'صوص إضافي', 'تغليف سفري'];

  const [isPosFilterDrawerOpen, setIsPosFilterDrawerOpen] = useState<boolean>(false);

  // Listen for Navbar Close Shift & Footer F9 triggers
  useEffect(() => {
    const handleOpenCloseShift = () => {
      setActualCashCount(currentShift.expectedCash);
      setIsCloseShiftModalOpen(true);
    };
    const handleTriggerCheckout = () => {
      if (posCart.length > 0) {
        setPaymentMethod('CASH');
        setCashTendered(grandTotal);
        setSplitCashAmount(Math.round((grandTotal / 2) * 100) / 100);
        setCardReference(`RRN-${Math.floor(100000 + Math.random() * 900000)}`);
        setIsCheckoutModalOpen(true);
      }
    };
    window.addEventListener('haseb-open-close-shift-modal', handleOpenCloseShift);
    window.addEventListener('haseb-trigger-pos-checkout', handleTriggerCheckout);
    return () => {
      window.removeEventListener('haseb-open-close-shift-modal', handleOpenCloseShift);
      window.removeEventListener('haseb-trigger-pos-checkout', handleTriggerCheckout);
    };
  }, [currentShift.expectedCash, posCart.length, grandTotal]);

  const electronicsSubCategories: {
    id: ElectronicsSubCategory | 'ALL';
    labelAr: string;
    count: number;
  }[] = [
    {
      id: 'ALL',
      labelAr: 'الكل',
      count: products.filter((p) => p.industry === 'electronics').length,
    },
    {
      id: 'SOLAR_PANEL',
      labelAr: 'ألواح طاقة شمسية',
      count: products.filter((p) => p.subCategory === 'SOLAR_PANEL').length,
    },
    {
      id: 'HYBRID_INVERTER',
      labelAr: 'إنفرترات هجينة MPPT',
      count: products.filter((p) => p.subCategory === 'HYBRID_INVERTER').length,
    },
    {
      id: 'LITHIUM_BATTERY',
      labelAr: 'بطاريات ليثيوم وجل',
      count: products.filter(
        (p) => p.subCategory === 'LITHIUM_BATTERY' || p.subCategory === 'GEL_BATTERY'
      ).length,
    },
    {
      id: 'SMART_SCREEN',
      labelAr: 'شاشات ذكية 4K',
      count: products.filter((p) => p.subCategory === 'SMART_SCREEN').length,
    },
    {
      id: 'COMPUTING_MOBILE',
      labelAr: 'حواسيب وتجهيزات',
      count: products.filter((p) => p.subCategory === 'COMPUTING_MOBILE').length,
    },
  ];

  const getProductSpecChips = (p: (typeof products)[number]): [string, string] => {
    const skuMap: Record<string, [string, string]> = {
      'SOL-PNL-585W': ['585W N-Type', 'كفاءة 22.6%'],
      'SOL-INV-DEYE8K': ['48V / 8kW', 'WiFi Smart'],
      'BAT-LI-48V200': ['10.24kWh', '6000 دورة'],
      'SOL-INV-GROW5K': ['5kW MPPT', 'Off-Grid'],
      'BAT-GEL-12V200': ['12V 200Ah', 'Deep Cycle'],
      'SOL-ACC-DCKIT': ['1000V DC', 'SPD + Fuse'],
      'SCR-LG-65C3': ['65" OLED 4K', '120Hz WebOS'],
      'SCR-SAM-55QLED': ['55" QLED 4K', 'Smart Hub'],
    };
    if (skuMap[p.sku]) return skuMap[p.sku];
    const chip1 = p.powerRatingWatts
      ? p.powerRatingWatts >= 1000
        ? `${(p.powerRatingWatts / 1000).toFixed(1).replace('.0', '')}kW`
        : `${p.powerRatingWatts}W`
      : p.batteryCapacitySpec || p.screenSizeSpec || p.uom;
    const chip2 = p.efficiencySpec || p.voltageSpec || 'Original';
    return [chip1, chip2];
  };

  const getProductDisplayName = (p: (typeof products)[number]): string => {
    const cleanTitleMap: Record<string, string> = {
      'SOL-PNL-585W': 'لوح طاقة شمسية مونو كريستال Jinko Tiger Neo 585W وجهين',
      'SOL-INV-DEYE8K': 'إنفرتر طاقة شمسية هجين ذكي Deye 8kW Hybrid Dual MPPT',
      'BAT-LI-48V200': 'بطارية ليثيوم فوسفات الحديد Felicity LiFePO4 48V 200Ah',
      'SOL-INV-GROW5K': 'إنفرتر طاقة شمسية هجين Growatt 5000ES 5kW 48V',
      'BAT-GEL-12V200': 'بطارية جل أنبوبية ديب سايكل Ritar 12V 200Ah',
      'SOL-ACC-DCKIT': 'لوحة حماية وتجميع طاقة شمسية 1000V DC مع قواطع وصواعق',
    };
    if (language === 'ar' && cleanTitleMap[p.sku]) {
      return cleanTitleMap[p.sku];
    }
    return language === 'ar' ? p.nameAr : p.name;
  };

  // Fast Keyboard Tab / Shift+Tab / F9 Navigation Handler for POS Data Entry
  const handlePosWorkspaceKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    // F9 or Ctrl+Enter opens Checkout Modal immediately if cart has items
    if (
      (e.key === 'F9' || ((e.ctrlKey || e.metaKey) && e.key === 'Enter')) &&
      posCart.length > 0 &&
      !isCheckoutModalOpen
    ) {
      e.preventDefault();
      setPaymentMethod('CASH');
      setCashTendered(grandTotal);
      setSplitCashAmount(Math.round((grandTotal / 2) * 100) / 100);
      setCardReference(`RRN-${Math.floor(100000 + Math.random() * 900000)}`);
      setIsCheckoutModalOpen(true);
      return;
    }

    if (e.key !== 'Tab') return;

    // 1. If a POS modal is open, cycle cleanly through that modal's fields
    if (isCheckoutModalOpen || isSolarCalcOpen || isCloseShiftModalOpen) {
      const root = posContainerRef.current;
      if (!root) return;
      const modalFields = Array.from(
        root.querySelectorAll<HTMLElement>('[data-pos-modal-field]:not(:disabled)')
      ).filter((el) => el.offsetParent !== null);
      if (modalFields.length > 0) {
        e.preventDefault();
        const activeEl = document.activeElement as HTMLElement | null;
        const currIdx = activeEl ? modalFields.indexOf(activeEl) : -1;
        const nextIdx = e.shiftKey
          ? currIdx <= 0
            ? modalFields.length - 1
            : currIdx - 1
          : (currIdx + 1) % modalFields.length;
        const target = modalFields[nextIdx];
        if (target) {
          target.focus();
          if ('select' in target && typeof (target as HTMLInputElement).select === 'function') {
            try {
              (target as HTMLInputElement).select();
            } catch {
              // ignore
            }
          }
        }
      }
      return;
    }

    // 2. Main POS Fast Data-Entry Tab Cycle
    e.preventDefault();
    const activeEl = document.activeElement as HTMLElement | null;
    const currentAttrId =
      activeEl?.getAttribute('data-pos-field-id') || activePosFieldId || null;

    const { targetFieldId } = computeNextPosTabStopIndex(
      orderedPosFieldIds,
      currentAttrId,
      e.shiftKey ? 'PREV' : 'NEXT'
    );

    if (targetFieldId) {
      focusPosFieldById(targetFieldId);
    }
  };

  return (
    <div
      ref={posContainerRef}
      onKeyDown={handlePosWorkspaceKeyDown}
      className="h-full flex-1 flex overflow-hidden relative"
    >
      {/* ====================================================================
          CENTER AREA: PRODUCT SHOWCASE & BARCODE SCANNER (Lumina Reference)
      ==================================================================== */}
      <div
        data-testid="pos-catalog-pane"
        className={`${posSplitLayout.primaryColClass} flex-1 flex flex-col min-w-0 p-4 gap-3.5 overflow-hidden`}
      >
        {posBanner && (
          <div
            className={`shrink-0 px-3.5 py-2 rounded-xl border text-xs font-semibold flex items-center justify-between ${
              posBanner.type === 'success'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                : 'bg-rose-50 border-rose-200 text-rose-900'
            }`}
          >
            <span>{posBanner.text}</span>
            <button
              type="button"
              onClick={() => setPosBanner(null)}
              className="text-slate-400 hover:text-slate-800 font-bold cursor-pointer"
            >
              ✕
            </button>
          </div>
        )}

        {/* Held Bills Resume Strip */}
        {holdBills.length > 0 && (
          <div className="shrink-0 bg-amber-50 border border-amber-200 rounded-xl px-3 py-1.5 flex items-center gap-2 overflow-x-auto text-xs">
            <span className="font-bold text-amber-950 shrink-0">الفواتير المعلقة:</span>
            {holdBills.map((b) => (
              <button
                key={b.id}
                type="button"
                onClick={() => resumePOSBill(b.id)}
                className="bg-white hover:bg-amber-100 border border-amber-300 text-amber-900 px-2.5 py-1 rounded-lg font-bold flex items-center gap-1.5 shrink-0 transition shadow-2xs cursor-pointer"
              >
                <PlayCircle className="w-3.5 h-3.5 text-amber-600" />
                <span>
                  {b.orderNumber} ({b.items.length} أصناف) - {b.savedAt}
                </span>
              </button>
            ))}
          </div>
        )}

        {/* Top Row: Barcode Scanner Input + Filter Toggle Button */}
        <div className="flex items-center gap-2.5 shrink-0">
          <form onSubmit={handleBarcodeSubmit} className="pos-focus-group relative flex-1">
            <Barcode className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              data-testid="pos-barcode-input"
              data-pos-field-id="pos-barcode-input"
              tabIndex={1}
              value={barcodeInput}
              onFocus={(e) => {
                setActivePosFieldId('pos-barcode-input');
                e.currentTarget.select();
              }}
              onChange={(e) => setBarcodeInput(e.target.value)}
              placeholder="امسح الباركود أو أدخل رمز الصنف SKU مباشرة..."
              className="w-full bg-white border border-slate-200/80 hover:border-slate-300 focus:border-blue-600 focus:ring-2 focus:ring-blue-500/15 rounded-xl py-2 pr-9 pl-16 text-xs outline-hidden transition-all shadow-2xs"
            />
            <div className="absolute left-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
              <button
                type="button"
                data-testid="pos-camera-barcode-btn"
                onClick={() => setIsCameraScannerOpen(true)}
                title="مسح الباركود بالكاميرا"
                className="text-slate-400 hover:text-blue-600 transition cursor-pointer p-0.5"
              >
                <Camera className="w-3.5 h-3.5" />
              </button>
              <kbd className="px-1.5 py-0.5 text-[10px] font-mono text-slate-400 bg-slate-50 rounded border border-slate-200/60">
                F1
              </kbd>
            </div>
          </form>

          <button
            type="button"
            onClick={() => setIsPosFilterDrawerOpen((prev) => !prev)}
            className="px-3 py-2 bg-white hover:bg-slate-50 border border-slate-200/80 rounded-xl text-xs font-medium text-slate-600 flex items-center gap-1.5 transition-colors shadow-2xs shrink-0 cursor-pointer"
          >
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <span>تصفية</span>
          </button>
        </div>

        {/* Collapsible Advanced Filter, Search, Solar Calculator & Resizable Tabs Toolbar */}
        <div
          className={
            isPosFilterDrawerOpen
              ? 'flex flex-wrap items-center justify-between gap-2 bg-white p-2.5 rounded-xl border border-slate-200/70 shrink-0 text-xs shadow-2xs'
              : 'sr-only'
          }
        >
          <div className="flex flex-wrap items-center gap-2 flex-1 min-w-[220px]">
            <div className="pos-focus-group relative flex-1 max-w-xs">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                data-testid="pos-search-input"
                data-pos-field-id="pos-search-input"
                tabIndex={2}
                value={searchTerm}
                onFocus={(e) => {
                  setActivePosFieldId('pos-search-input');
                  e.currentTarget.select();
                }}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="فلترة بالاسم أو المواصفة..."
                className="w-full text-xs py-1.5 pr-8 pl-3 bg-slate-50 border border-slate-200 rounded-lg"
              />
            </div>

            <button
              type="button"
              data-testid="btn-open-solar-calculator"
              onClick={() => setIsSolarCalcOpen(true)}
              className="px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs flex items-center gap-1.5 cursor-pointer"
            >
              <Calculator className="w-3.5 h-3.5" />
              <span>حاسبة الطاقة الشمسية</span>
            </button>

            <button
              type="button"
              data-testid="btn-pos-goto-inventory"
              onClick={() => setActiveTab('inventory')}
              className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium text-xs flex items-center gap-1 cursor-pointer"
            >
              <Package className="w-3.5 h-3.5" />
              <span>المستودع</span>
            </button>

            <button
              type="button"
              data-testid="btn-pos-goto-warranty"
              onClick={() => setActiveTab('sales')}
              className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium text-xs flex items-center gap-1 cursor-pointer"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>فحص الضمان</span>
            </button>

            <button
              type="button"
              data-testid="pos-active-focus-indicator"
              onClick={() => {
                const { targetFieldId } = computeNextPosTabStopIndex(
                  orderedPosFieldIds,
                  activePosFieldId,
                  'NEXT'
                );
                if (targetFieldId) focusPosFieldById(targetFieldId);
              }}
              className="px-2 py-1 rounded-lg bg-blue-50 text-blue-700 font-mono text-[11px] cursor-pointer"
            >
              {activeFieldMeta.stepBadge} • {activeFieldMeta.label}
            </button>

            {currentShift.status === 'CLOSED' && (
              <button
                type="button"
                data-testid="btn-open-new-shift-header"
                onClick={() => {
                  openNewPOSShift(1500);
                  showBanner('success', 'تم فتح وردية كاشير جديدة بعهدة افتتاحية 1,500');
                }}
                className="px-2.5 py-1.5 rounded-lg bg-blue-600 text-white font-semibold text-xs cursor-pointer"
              >
                فتح وردية جديدة
              </button>
            )}

            <button
              type="button"
              data-testid="btn-close-shift-header"
              onClick={() => {
                setActualCashCount(currentShift.expectedCash);
                setIsCloseShiftModalOpen(true);
              }}
              className="px-2.5 py-1.5 rounded-lg bg-slate-100 text-slate-700 font-semibold text-xs cursor-pointer"
            >
              إغلاق الوردية (Z-Report)
            </button>
          </div>

          <WorkspaceTabResizerBar
            testIdPrefix="pos-workspace"
            splitMode={posSplitMode}
            onSplitModeChange={setPosSplitMode}
            primaryPaneLabel="الكتالوج"
            secondaryPaneLabel="السلة"
          />
        </div>

        {/* Category Pills Row (Rounded Full Pills matching code_9f7cabf7.html) */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 shrink-0">
          {electronicsSubCategories.map((sub) => {
            const isSelected = selectedElectronicsSubCat === sub.id;
            return (
              <button
                key={sub.id}
                type="button"
                onClick={() => setSelectedElectronicsSubCat(sub.id)}
                className={
                  isSelected
                    ? 'px-3.5 py-1.5 rounded-full text-xs font-semibold bg-slate-900 text-white shadow-xs flex items-center gap-1.5 shrink-0 cursor-pointer transition-colors'
                    : 'px-3.5 py-1.5 rounded-full text-xs font-medium bg-white text-slate-600 hover:text-slate-900 border border-slate-200/70 shrink-0 transition-colors cursor-pointer'
                }
              >
                <span>{sub.labelAr}</span>
                {sub.id === 'ALL' && (
                  <span
                    className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                      isSelected ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
                    }`}
                    dir="ltr"
                  >
                    {sub.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Product Cards Grid (Lumina 2xl Rounded Cards with Semantic Warranty Badges) */}
        <div className="flex-1 overflow-y-auto pr-0.5 min-h-0">
          <div className="grid grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-3.5">
            {filteredProducts.map((p) => {
              const [chip1, chip2] = getProductSpecChips(p);
              const warrantyMonths = p.warrantyMonths || 12;
              const warrantyBadgeClass =
                warrantyMonths >= 100
                  ? 'bg-emerald-50 text-emerald-700'
                  : warrantyMonths >= 48
                  ? 'bg-blue-50 text-blue-700'
                  : warrantyMonths >= 24
                  ? 'bg-amber-50 text-amber-700'
                  : 'bg-slate-100 text-slate-600';

              return (
                <div
                  key={p.id}
                  onClick={() => addToPOSCart(p, 1)}
                  className="bg-white rounded-2xl p-4 border border-slate-200/70 hover:border-blue-500/40 transition-all cursor-pointer flex flex-col justify-between group shadow-2xs select-none"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2.5">
                      <span
                        className="text-[10px] font-mono font-medium text-slate-400 tracking-wide truncate"
                        dir="ltr"
                      >
                        {p.sku}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-medium shrink-0 ${warrantyBadgeClass}`}
                      >
                        ضمان {warrantyMonths} شهر
                      </span>
                    </div>

                    <h3 className="text-[13px] font-semibold text-slate-800 leading-snug mb-2 group-hover:text-blue-600 transition-colors line-clamp-2">
                      {getProductDisplayName(p)}
                    </h3>

                    <div className="flex items-center gap-1.5 text-[10px] text-slate-500 mb-3">
                      <span
                        className="bg-slate-50 px-2 py-0.5 rounded-md border border-slate-100 font-mono truncate"
                        dir="ltr"
                      >
                        {chip1}
                      </span>
                      <span className="bg-slate-50 px-2 py-0.5 rounded-md border border-slate-100 truncate">
                        {chip2}
                      </span>
                      <button
                        type="button"
                        data-testid={`btn-probe-branches-${p.sku}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          openCrossBranchModal(p.sku);
                        }}
                        className="sr-only"
                        title="فحص توفر الصنف في باقي الفروع"
                      >
                        فحص الفروع
                      </button>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-100 flex items-end justify-between">
                    <div>
                      <span className="block text-[10px] text-slate-400">السعر النقدي</span>
                      <span className="text-base font-bold text-slate-900 font-mono" dir="ltr">
                        {p.salePrice.toLocaleString('en-US', {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}{' '}
                        <span className="text-[10px] font-normal text-slate-400">{currency}</span>
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-slate-500">
                        المتوفر:{' '}
                        <strong className="text-slate-700 font-mono" dir="ltr">
                          {p.stockQty}
                        </strong>
                      </span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          addToPOSCart(p, 1);
                        }}
                        className="w-8 h-8 rounded-xl bg-slate-100 group-hover:bg-slate-900 text-slate-700 group-hover:text-white flex items-center justify-center transition-colors cursor-pointer"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ====================================================================
          LEFT AREA: SALES CART & CHECKOUT DRAWER (Lumina Reference)
      ==================================================================== */}
      <aside
        data-testid="pos-cart-pane"
        className="w-[380px] xl:w-[390px] bg-white border-r border-slate-200/70 flex flex-col justify-between shrink-0 z-20"
      >
        {/* Cart Header */}
        <div className="p-4 border-b border-slate-200/70 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-slate-900">سلة المبيعات</h2>
              <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[11px] font-mono font-semibold">
                {posCart.reduce((s, i) => s + i.quantity, 0)} صنف
              </span>
            </div>
            <button
              type="button"
              onClick={clearPOSCart}
              className="text-[11px] text-slate-400 hover:text-rose-600 flex items-center gap-1 transition-colors cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>تفريغ السلة</span>
            </button>
          </div>

          {/* Customer & Phone Quick Inputs (5-Column Grid matching code_9f7cabf7.html) */}
          <div className="pos-focus-group grid grid-cols-5 gap-2">
            <div className="col-span-3">
              <label className="block text-[10px] text-slate-400 mb-1">العميل المستفيد</label>
              <div className="relative">
                <select
                  data-testid="pos-customer-select"
                  data-pos-field-id="pos-customer-select"
                  tabIndex={3}
                  value={selectedCustomerId}
                  onFocus={() => setActivePosFieldId('pos-customer-select')}
                  onChange={(e) => {
                    const cid = e.target.value;
                    setSelectedCustomerId(cid);
                    const found = customers.find((c) => c.id === cid);
                    if (found) {
                      setWarrantyCustomerName(language === 'ar' ? found.nameAr : found.name);
                      setWarrantyCustomerPhone(found.phone);
                    }
                  }}
                  aria-label="اختيار العميل"
                  className="sr-only"
                >
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {language === 'ar' ? c.nameAr : c.name}
                    </option>
                  ))}
                </select>
                <input
                  type="text"
                  data-testid="pos-warranty-name-input"
                  data-pos-field-id="pos-warranty-name-input"
                  tabIndex={4}
                  value={warrantyCustomerName}
                  onFocus={(e) => {
                    setActivePosFieldId('pos-warranty-name-input');
                    e.currentTarget.select();
                  }}
                  onChange={(e) => setWarrantyCustomerName(e.target.value)}
                  placeholder="عميل نقدي عام"
                  className="w-full bg-slate-50 border border-slate-200/70 rounded-xl px-2.5 py-1.5 text-xs text-slate-700 placeholder:text-slate-700 focus:bg-white focus:border-blue-600 outline-hidden transition-all"
                />
              </div>
            </div>
            <div className="col-span-2">
              <label className="block text-[10px] text-slate-400 mb-1">رقم الهاتف</label>
              <input
                type="text"
                data-testid="pos-warranty-phone-input"
                data-pos-field-id="pos-warranty-phone-input"
                tabIndex={5}
                value={warrantyCustomerPhone}
                onFocus={(e) => {
                  setActivePosFieldId('pos-warranty-phone-input');
                  e.currentTarget.select();
                }}
                onChange={(e) => setWarrantyCustomerPhone(e.target.value)}
                placeholder="+967..."
                dir="ltr"
                className="w-full bg-slate-50 border border-slate-200/70 rounded-xl px-2.5 py-1.5 text-xs font-mono text-slate-700 focus:bg-white focus:border-blue-600 outline-hidden transition-all text-left"
              />
            </div>
          </div>
        </div>

        {/* Cart Items List + Quick Discount Box */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0">
          {posCart.length === 0 ? (
            <div className="py-10 flex flex-col items-center justify-center text-slate-400 text-xs space-y-2">
              <ShieldCheck className="w-8 h-8 text-slate-300 stroke-1" />
              <span className="font-medium text-slate-400">
                السلة فارغة — اختر الأصناف لإصدار الفاتورة
              </span>
            </div>
          ) : (
            posCart.map((item) => (
              <div
                key={item.productId}
                className="pos-focus-group bg-slate-50/70 rounded-2xl p-3 border border-slate-200/70 space-y-2.5"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h4 className="text-xs font-semibold text-slate-800 leading-snug">
                      {item.sku === 'SOL-PNL-585W'
                        ? 'لوح طاقة شمسية مونو كريستال Jinko Tiger Neo'
                        : item.productName}
                    </h4>
                    <span className="text-[10px] text-slate-400 font-mono block mt-0.5" dir="ltr">
                      {item.sku} • {item.unitPrice.toLocaleString()} {currency}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeFromPOSCart(item.productId)}
                    className="text-slate-400 hover:text-rose-600 p-1 transition-colors cursor-pointer"
                    title="حذف الصنف من السلة"
                  >
                    ✕
                  </button>
                </div>

                {/* Quantity Stepper & Line Total */}
                <div className="flex items-center justify-between pt-1">
                  <div className="flex items-center bg-white border border-slate-200/80 rounded-xl p-0.5">
                    <button
                      type="button"
                      onClick={() => updatePOSCartQty(item.productId, item.quantity - 1)}
                      className="w-6 h-6 rounded-lg hover:bg-slate-100 text-slate-600 flex items-center justify-center text-xs font-bold cursor-pointer"
                    >
                      -
                    </button>
                    <span
                      className="w-8 text-center text-xs font-mono font-semibold text-slate-800"
                      dir="ltr"
                    >
                      {item.quantity}
                    </span>
                    <button
                      type="button"
                      onClick={() => updatePOSCartQty(item.productId, item.quantity + 1)}
                      className="w-6 h-6 rounded-lg hover:bg-slate-100 text-slate-600 flex items-center justify-center text-xs font-bold cursor-pointer"
                    >
                      +
                    </button>
                  </div>
                  <div className="text-left">
                    <span className="text-sm font-bold text-slate-900 font-mono" dir="ltr">
                      {item.total.toFixed(2)}{' '}
                      <span className="text-[10px] font-normal text-slate-500">{currency}</span>
                    </span>
                  </div>
                </div>

                {/* Serial & Warranty Bar */}
                <div className="bg-white rounded-xl p-2 border border-slate-200/60 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 min-w-0 flex-1">
                    <span className="text-[10px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md shrink-0">
                      ضمان {item.warrantyMonths ?? 144} شهر
                    </span>
                    <input
                      type="text"
                      data-testid={`pos-cart-serial-${item.productId}`}
                      data-pos-field-id={`pos-cart-serial-${item.productId}`}
                      value={item.serialNumber || ''}
                      onFocus={(e) => {
                        setActivePosFieldId(`pos-cart-serial-${item.productId}`);
                        e.currentTarget.select();
                      }}
                      onChange={(e) =>
                        updatePOSCartItemMeta(item.productId, { serialNumber: e.target.value })
                      }
                      placeholder="S/N أو IMEI..."
                      dir="ltr"
                      className="text-[11px] font-mono text-slate-600 bg-transparent border-none outline-hidden w-full text-left"
                    />
                    <select
                      data-testid={`pos-cart-warranty-${item.productId}`}
                      data-pos-field-id={`pos-cart-warranty-${item.productId}`}
                      value={item.warrantyMonths ?? 144}
                      onFocus={() => setActivePosFieldId(`pos-cart-warranty-${item.productId}`)}
                      onChange={(e) =>
                        updatePOSCartItemMeta(item.productId, {
                          warrantyMonths: Number(e.target.value),
                        })
                      }
                      aria-label="مدة الضمان بالشهور"
                      className="sr-only"
                    >
                      <option value={12}>ضمان 12 شهر</option>
                      <option value={24}>ضمان 24 شهر</option>
                      <option value={36}>ضمان 36 شهر</option>
                      <option value={60}>ضمان 60 شهر</option>
                      <option value={120}>ضمان 120 شهر</option>
                      <option value={144}>ضمان 144 شهر</option>
                    </select>
                  </div>
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                </div>
              </div>
            ))
          )}

          {/* Quick Discount Options (Matching code_9f7cabf7.html) */}
          <div className="pos-focus-group bg-slate-50/60 rounded-2xl p-3 border border-slate-200/60 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-slate-600 flex items-center gap-1">
                <span>%</span>
                <span>تطبيق خصم سريع</span>
              </span>
              <span className="text-[10px] text-slate-400">اختياري</span>
            </div>

            <div className="grid grid-cols-4 gap-1.5">
              {[5, 10, 15].map((pct) => (
                <button
                  key={pct}
                  type="button"
                  data-testid={`pos-quick-pct-${pct}`}
                  disabled={posCart.length === 0}
                  onClick={() => {
                    setDiscountType('PERCENT');
                    setDiscountValue(discountValue === pct ? '' : pct);
                  }}
                  className={`py-1.5 rounded-lg border text-[11px] font-mono font-medium transition-colors cursor-pointer disabled:opacity-40 ${
                    discountType === 'PERCENT' && discountValue === pct
                      ? 'bg-slate-900 text-white border-slate-900'
                      : 'bg-white border-slate-200/80 text-slate-600 hover:border-slate-400'
                  }`}
                >
                  {pct}%
                </button>
              ))}
              <button
                type="button"
                onClick={() => setIsDiscountPanelOpen((prev) => !prev)}
                className={`py-1.5 rounded-lg border text-[11px] font-medium transition-colors cursor-pointer ${
                  isDiscountPanelOpen
                    ? 'bg-slate-900 text-white border-slate-900'
                    : 'bg-white border-slate-200/80 text-slate-600 hover:border-slate-400'
                }`}
              >
                مخصص
              </button>
            </div>

            {/* Custom Discount Input Drawer (Visible when 'مخصص' is clicked, kept in DOM for keyboard/tests) */}
            <div className={isDiscountPanelOpen ? 'pt-2 space-y-2 border-t border-slate-200/60' : 'sr-only'}>
              <div className="flex items-center justify-between gap-1.5">
                <div className="flex items-center bg-white rounded-lg p-0.5 border border-slate-200 text-[11px]">
                  <button
                    type="button"
                    data-testid="pos-discount-mode-percent"
                    onClick={() => setDiscountType('PERCENT')}
                    className={`px-2 py-0.5 rounded font-semibold cursor-pointer ${
                      discountType === 'PERCENT' ? 'bg-slate-900 text-white' : 'text-slate-600'
                    }`}
                  >
                    نسبة (%)
                  </button>
                  <button
                    type="button"
                    data-testid="pos-discount-mode-amount"
                    onClick={() => setDiscountType('AMOUNT')}
                    className={`px-2 py-0.5 rounded font-semibold cursor-pointer ${
                      discountType === 'AMOUNT' ? 'bg-slate-900 text-white' : 'text-slate-600'
                    }`}
                  >
                    مبلغ ({currency})
                  </button>
                </div>

                {typeof discountValue === 'number' && discountValue > 0 && (
                  <button
                    type="button"
                    data-testid="pos-clear-discount-btn"
                    onClick={() => setDiscountValue('')}
                    className="px-2 py-0.5 rounded bg-rose-50 text-rose-600 text-[10px] font-semibold cursor-pointer"
                  >
                    إلغاء
                  </button>
                )}
              </div>

              <input
                type="number"
                min="0"
                max={discountType === 'PERCENT' ? 100 : subtotal}
                data-testid="pos-discount-value-input"
                data-pos-field-id="pos-discount-value-input"
                value={discountValue}
                onFocus={(e) => {
                  setActivePosFieldId('pos-discount-value-input');
                  e.currentTarget.select();
                }}
                onChange={(e) => {
                  const val = e.target.value === '' ? '' : parseFloat(e.target.value);
                  if (val === '') {
                    setDiscountValue('');
                  } else if (!isNaN(val)) {
                    setDiscountValue(Math.max(0, val));
                  }
                }}
                placeholder={discountType === 'PERCENT' ? 'أدخل نسبة الخصم...' : 'أدخل مبلغ الخصم...'}
                className="w-full px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 text-xs font-mono"
              />

              <div className="flex flex-wrap gap-1">
                {[20, 50, 100].map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    data-testid={`pos-quick-amt-${amt}`}
                    onClick={() => {
                      setDiscountType('AMOUNT');
                      setDiscountValue(amt);
                    }}
                    className="px-2 py-0.5 rounded bg-white border border-slate-200 text-[10px] font-mono"
                  >
                    {amt} {currency}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Cart Footer & Totals (Matching code_9f7cabf7.html) */}
        <div className="p-4 border-t border-slate-200/70 bg-slate-50/50 space-y-3.5">
          <div className="space-y-1.5 text-xs">
            <div className="flex items-center justify-between text-slate-500">
              <span>المجموع الفرعي:</span>
              <span className="font-mono font-medium text-slate-700" dir="ltr">
                {subtotal.toFixed(2)} {currency}
              </span>
            </div>
            <div
              data-testid="pos-coupon-discount-row"
              className="flex items-center justify-between text-slate-500"
            >
              <span>الخصم المطبق:</span>
              <span className="font-mono font-medium text-slate-700" dir="ltr">
                {calculatedDiscountAmount > 0 ? `-${calculatedDiscountAmount.toFixed(2)}` : '0.00'}{' '}
                {currency}
              </span>
            </div>
            <div className="flex items-center justify-between text-slate-500">
              <span>الضريبة:</span>
              <span className="font-mono font-medium text-slate-700" dir="ltr">
                0.00 {currency}
              </span>
            </div>
            <div className="pt-2 border-t border-slate-200/70 flex items-baseline justify-between">
              <span className="text-sm font-bold text-slate-900">الإجمالي المستحق:</span>
              <span
                data-testid="pos-grand-total-display"
                className="text-2xl font-bold text-slate-900 font-mono"
                dir="ltr"
              >
                {grandTotal.toFixed(2)}{' '}
                <span className="text-xs font-normal text-slate-500">{currency}</span>
              </span>
            </div>
          </div>

          {/* Primary Action Button */}
          <div className="pt-1">
            <button
              type="button"
              data-testid="pos-checkout-btn"
              data-pos-field-id="pos-checkout-btn"
              disabled={posCart.length === 0}
              onFocus={() => setActivePosFieldId('pos-checkout-btn')}
              onClick={() => {
                setPaymentMethod('CASH');
                setCashTendered(grandTotal);
                setSplitCashAmount(Math.round((grandTotal / 2) * 100) / 100);
                setCardReference(`RRN-${Math.floor(100000 + Math.random() * 900000)}`);
                setIsCheckoutModalOpen(true);
              }}
              className="w-full bg-slate-900 hover:bg-slate-800 text-white font-semibold py-3 px-4 rounded-xl shadow-md transition-all flex items-center justify-center gap-2 text-sm cursor-pointer disabled:opacity-40"
            >
              <CreditCard className="w-4 h-4" />
              <span>دفع وإصدار الفاتورة</span>
              <kbd className="px-1.5 py-0.5 bg-white/15 rounded text-[10px] font-mono font-normal text-slate-200 mr-1">
                F9
              </kbd>
            </button>
          </div>

          {/* Secondary Actions (3-Column Grid: تعليق • طباعة • واتساب) */}
          <div className="grid grid-cols-3 gap-2 pt-0.5">
            <button
              type="button"
              disabled={posCart.length === 0}
              onClick={() => holdCurrentPOSBill(undefined, selectedTable)}
              className="py-2 px-3 rounded-xl border border-slate-200/80 bg-white hover:bg-slate-50 text-slate-700 text-xs font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:opacity-40"
            >
              <PauseCircle className="w-3.5 h-3.5 text-slate-500" />
              <span>تعليق</span>
            </button>

            <button
              type="button"
              disabled={posCart.length === 0}
              onClick={handlePreviewDraftWarrantyCertificate}
              className="py-2 px-3 rounded-xl border border-slate-200/80 bg-white hover:bg-slate-50 text-slate-700 text-xs font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:opacity-40"
            >
              <Printer className="w-3.5 h-3.5 text-slate-500" />
              <span>طباعة</span>
            </button>

            <button
              type="button"
              disabled={posCart.length === 0}
              onClick={() => {
                openQuickSendModal({
                  channel: 'WHATSAPP',
                  category: 'INVOICE',
                  recipientName: warrantyCustomerName || 'عميل نقدي عام',
                  recipientPhone: warrantyCustomerPhone || '+967 771 445 880',
                  referenceNumber: `POS-${Date.now().toString().slice(-4)}`,
                  messageBody: `فاتورة مبيعات وشهادة ضمان حاسب ERP — الإجمالي: ${grandTotal.toFixed(2)} ${currency}`,
                });
              }}
              className="py-2 px-3 rounded-xl border border-emerald-200 bg-emerald-50/70 hover:bg-emerald-100/70 text-emerald-800 text-xs font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:opacity-40"
            >
              <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
              <span>واتساب</span>
            </button>
          </div>
        </div>
      </aside>

      {/* ====================================================================
          MODALS PORTAL
      ==================================================================== */}

      {/* ====================================================================
          SOLAR ENERGY, HYBRID INVERTER & BATTERY BANK SIZING CALCULATOR MODAL
      ==================================================================== */}
      {isSolarCalcOpen && (
        <div
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setIsSolarCalcOpen(false);
          }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4"
        >
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200/80 w-full max-w-3xl overflow-hidden">
            <div className="px-6 py-4 bg-slate-50/90 border-b border-slate-200/80 text-slate-900 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center shrink-0 shadow-2xs">
                  <Sun className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900">
                    الحاسبة الهندسية لمنظومات الطاقة الشمسية والبطاريات والإنفرترات
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    حساب تلقائي لقدرة الإنفرتر الهجين، سعة بنك البطاريات (LiFePO4 / Gel)، وعدد الألواح الشمسية مع الإدراج المباشر للفاتورة
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsSolarCalcOpen(false)}
                className="w-8 h-8 rounded-full border border-slate-200/80 bg-white hover:bg-slate-100 text-slate-500 hover:text-slate-900 flex items-center justify-center font-bold text-sm cursor-pointer transition"
              >
                ✕
              </button>
            </div>

            <div className="p-5 grid grid-cols-1 md:grid-cols-12 gap-5 text-xs">
              {/* Inputs Column */}
              <div className="md:col-span-6 space-y-3">
                <div className="pos-focus-group p-2 rounded-md border border-transparent transition-all">
                  <label className="block font-bold text-slate-700 mb-1">
                    إجمالي الأحمال الكهربائية المستمرة (Continuous Load Watts):
                  </label>
                  <input
                    type="number"
                    autoFocus
                    data-pos-modal-field="solar-peak-watts"
                    data-testid="input-solar-peak-watts"
                    value={peakLoadWatts}
                    onFocus={(e) => e.currentTarget.select()}
                    onChange={(e) => setPeakLoadWatts(Math.max(100, Number(e.target.value)))}
                    className="w-full p-2 bg-slate-50 border border-slate-300 rounded-md font-mono tabular-nums font-bold text-slate-900"
                    dir="ltr"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div className="pos-focus-group p-2 rounded-md border border-transparent transition-all">
                    <label className="block font-bold text-slate-700 mb-1">
                      ساعات التشغيل الاحتياطي (Backup Hours):
                    </label>
                    <input
                      type="number"
                      data-pos-modal-field="solar-autonomy-hours"
                      value={autonomyHours}
                      onFocus={(e) => e.currentTarget.select()}
                      onChange={(e) => setAutonomyHours(Math.max(1, Number(e.target.value)))}
                      className="w-full p-2 bg-slate-50 border border-slate-300 rounded-md font-mono tabular-nums font-bold text-slate-900"
                      dir="ltr"
                    />
                  </div>
                  <div className="p-2">
                    <label className="block font-bold text-slate-700 mb-1">
                      الطاقة المطلوبة يومياً (kWh):
                    </label>
                    <div
                      className="w-full p-2 bg-slate-100 border border-slate-200 rounded-md font-mono tabular-nums font-bold text-slate-800"
                      dir="ltr"
                    >
                      {solarSizingResult.dailyEnergyKwh} kWh / Day
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div className="pos-focus-group p-2 rounded-md border border-transparent transition-all">
                    <label className="block font-bold text-slate-700 mb-1">
                      جهد منظومة البطاريات (DC Bus):
                    </label>
                    <select
                      data-pos-modal-field="solar-system-voltage"
                      value={systemVoltage}
                      onChange={(e) => setSystemVoltage(Number(e.target.value) as 12 | 24 | 48)}
                      className="w-full p-2 bg-slate-50 border border-slate-300 rounded-md font-bold text-slate-900"
                    >
                      <option value={48}>48V DC (منظومات منازل ومشاريع)</option>
                      <option value={24}>24V DC (منظومات متوسطة)</option>
                      <option value={12}>12V DC (منظومات صغيرة)</option>
                    </select>
                  </div>
                  <div className="pos-focus-group p-2 rounded-md border border-transparent transition-all">
                    <label className="block font-bold text-slate-700 mb-1">
                      نوع البطاريات (Chemistry):
                    </label>
                    <select
                      data-pos-modal-field="solar-battery-chemistry"
                      value={batteryChemistry}
                      onChange={(e) =>
                        setBatteryChemistry(e.target.value as 'LIFEPO4' | 'TUBULAR_GEL')
                      }
                      className="w-full p-2 bg-slate-50 border border-slate-300 rounded-md font-bold text-slate-900"
                    >
                      <option value="LIFEPO4">ليثيوم LiFePO4 (عمق تفريغ 85%)</option>
                      <option value="TUBULAR_GEL">بطاريات جل أنبوبية Gel (عمق 55%)</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div className="pos-focus-group p-2 rounded-md border border-transparent transition-all">
                    <label className="block font-bold text-slate-700 mb-1">
                      قدرة اللوح الشمسي الواحد (Watts):
                    </label>
                    <select
                      data-pos-modal-field="solar-panel-watts"
                      value={panelRatingWatts}
                      onChange={(e) => setPanelRatingWatts(Number(e.target.value))}
                      className="w-full p-2 bg-slate-50 border border-slate-300 rounded-md font-mono font-bold text-slate-900"
                    >
                      <option value={585}>585W Jinko N-Type Bifacial</option>
                      <option value={550}>550W Mono PERC Half-Cell</option>
                      <option value={620}>620W Utility Bifacial</option>
                    </select>
                  </div>
                  <div className="pos-focus-group p-2 rounded-md border border-transparent transition-all">
                    <label className="block font-bold text-slate-700 mb-1">
                      ساعات الذروة الشمسية (Sun Hours):
                    </label>
                    <input
                      type="number"
                      step="0.5"
                      data-pos-modal-field="solar-sun-hours"
                      value={peakSunHours}
                      onFocus={(e) => e.currentTarget.select()}
                      onChange={(e) => setPeakSunHours(Math.max(3, Number(e.target.value)))}
                      className="w-full p-2 bg-slate-50 border border-slate-300 rounded-md font-mono tabular-nums font-bold text-slate-900"
                      dir="ltr"
                    />
                  </div>
                </div>
              </div>

              {/* Engineering Output Column */}
              <div className="md:col-span-6 bg-slate-50 p-4 rounded-md border border-slate-200 flex flex-col justify-between space-y-3">
                <div>
                  <h4 className="font-bold text-slate-900 text-xs border-b border-slate-200 pb-2 mb-3">
                    المواصفات الهندسية المحسوبة للمنظومة:
                  </h4>

                  <div className="grid grid-cols-2 gap-2.5">
                    <div className="bg-white p-2.5 rounded-md border border-slate-200">
                      <div className="text-[10px] text-slate-500">قدرة الإنفرتر الهجين الموصى بها</div>
                      <div
                        data-testid="solar-result-inverter-kw"
                        className="text-base font-bold font-mono tabular-nums text-slate-900 mt-0.5"
                        dir="ltr"
                      >
                        {solarSizingResult.recommendedInverterKw} kW Hybrid
                      </div>
                      <div className="text-[10px] text-teal-700 font-semibold truncate">
                        {solarSizingResult.recommendedInverterModel}
                      </div>
                    </div>

                    <div className="bg-white p-2.5 rounded-md border border-slate-200">
                      <div className="text-[10px] text-slate-500">مصفوفة الألواح الشمسية المطلوبة</div>
                      <div
                        data-testid="solar-result-panels-count"
                        className="text-base font-bold font-mono tabular-nums text-teal-700 mt-0.5"
                        dir="ltr"
                      >
                        {solarSizingResult.recommendedPanelCount} × {panelRatingWatts}W
                      </div>
                      <div className="text-[10px] text-slate-600 font-mono tabular-nums" dir="ltr">
                        Total PV: {solarSizingResult.requiredSolarArrayKwp} kWp
                      </div>
                    </div>

                    <div className="bg-white p-2.5 rounded-md border border-slate-200">
                      <div className="text-[10px] text-slate-500">سعة بنك البطاريات الإجمالية</div>
                      <div
                        data-testid="solar-result-battery-kwh"
                        className="text-base font-bold font-mono tabular-nums text-emerald-700 mt-0.5"
                        dir="ltr"
                      >
                        {solarSizingResult.requiredBatteryStorageKwh} kWh
                      </div>
                      <div className="text-[10px] text-slate-600 font-mono tabular-nums" dir="ltr">
                        {solarSizingResult.requiredBatteryAhAtSystemVoltage} Ah @ {systemVoltage}V
                      </div>
                    </div>

                    <div className="bg-white p-2.5 rounded-md border border-slate-200">
                      <div className="text-[10px] text-slate-500">عدد وحدات البطاريات القياسية</div>
                      <div className="text-base font-bold font-mono tabular-nums text-slate-900 mt-0.5" dir="ltr">
                        {solarSizingResult.recommendedBatteryUnits} Units
                      </div>
                      <div className="text-[10px] text-slate-600 truncate" dir="ltr">
                        {solarSizingResult.recommendedBatteryUnitSpec}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsSolarCalcOpen(false)}
                    className="px-3.5 py-2 rounded-md border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 font-bold cursor-pointer"
                  >
                    إغلاق
                  </button>
                  <button
                    type="button"
                    data-pos-modal-field="solar-apply-btn"
                    data-testid="btn-apply-solar-kit-pos"
                    onClick={handleApplySolarKitToCart}
                    className="px-4 py-2 rounded-md bg-teal-600 hover:bg-teal-500 text-white font-bold flex items-center gap-1.5 cursor-pointer shadow-2xs"
                  >
                    <Zap className="w-4 h-4" />
                    <span>إدراج المنظومة الكاملة في سلة المبيعات</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ====================================================================
          PROFESSIONAL CHECKOUT & PAYMENT SETTLEMENT MODAL
      ==================================================================== */}
      {isCheckoutModalOpen && (
        <div
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setIsCheckoutModalOpen(false);
          }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/65 backdrop-blur-xs p-4"
        >
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200/80 w-full max-w-lg overflow-hidden">
            {/* Lumina POS Light Header */}
            <div className="px-6 py-4 bg-slate-50/90 border-b border-slate-200/80 text-slate-900 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center shrink-0 shadow-2xs">
                  <CreditCard className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm sm:text-base text-slate-900">
                    طريقة الدفع وإتمام العملية
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    {warrantyCustomerName.trim() ||
                      customers.find((c) => c.id === selectedCustomerId)?.nameAr ||
                      'عميل مبيعات نقدية'}{' '}
                    • {posCart.reduce((s, i) => s + i.quantity, 0)} قطعة مشمولة بالضمان
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsCheckoutModalOpen(false)}
                className="w-8 h-8 rounded-full border border-slate-200/80 bg-white hover:bg-slate-100 text-slate-500 hover:text-slate-900 flex items-center justify-center font-bold transition cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              {/* Financial Summary Banner */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/90 flex flex-wrap items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="text-[11px] text-slate-500 font-semibold">
                    صافي الفاتورة المستحق للسداد:
                  </div>
                  <div className="flex items-center gap-3 text-[11px] text-slate-600">
                    <span>
                      المجموع الفرعي:{' '}
                      <strong className="font-mono text-slate-800" dir="ltr">
                        {subtotal.toFixed(2)}
                      </strong>
                    </span>
                    {couponDiscountAmount > 0 && (
                      <span className="text-emerald-700 font-bold">
                        خصم: -{couponDiscountAmount.toFixed(2)}
                      </span>
                    )}
                  </div>
                </div>
                <div className="text-end">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
                    الإجمالي المستحق
                  </span>
                  <div
                    className="text-2xl font-black font-mono tabular-nums text-slate-900 mt-0.5"
                    dir="ltr"
                  >
                    {grandTotal.toFixed(2)} <span className="text-sm font-bold text-emerald-700">{currency}</span>
                  </div>
                </div>
              </div>

              {/* Payment Method Cards */}
              <div>
                <label className="block font-bold text-slate-700 mb-2">
                  اختر وسيلة السداد المعتمدة:
                </label>
                <div className="grid grid-cols-3 gap-2.5">
                  {[
                    {
                      id: 'CASH',
                      titleAr: masterSystemConfig.cashPaymentLabelAr || 'نقداً (كاش)',
                      subAr: 'تحصيل نقدي بالصندوق',
                    },
                    {
                      id: 'CARD',
                      titleAr: 'بطاقة بنكية / شبكة',
                      subAr: 'مدى • فيزا • تحويل فوري',
                    },
                    {
                      id: 'SPLIT',
                      titleAr: 'دفع مختلط / مجزأ',
                      subAr: 'جزء نقدي + جزء بطاقة',
                    },
                  ].map((m) => {
                    const isSelected = paymentMethod === m.id;
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => {
                          setPaymentMethod(m.id as any);
                          if (m.id === 'CASH') {
                            setCashTendered(grandTotal);
                          } else if (m.id === 'SPLIT') {
                            setSplitCashAmount(Math.round((grandTotal / 2) * 100) / 100);
                          }
                        }}
                        className={`p-3 rounded-xl border text-start transition cursor-pointer flex flex-col justify-between ${
                          isSelected
                            ? 'bg-slate-900 text-white border-slate-900 shadow-sm ring-2 ring-slate-900/10'
                            : 'bg-white border-slate-200 text-slate-800 hover:border-slate-300 hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-bold text-xs">{m.titleAr}</span>
                          {isSelected && (
                            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                          )}
                        </div>
                        <span
                          className={`text-[10px] ${
                            isSelected ? 'text-slate-300' : 'text-slate-500'
                          }`}
                        >
                          {m.subAr}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 1. CASH PAYMENT PANEL (With Sleek Minimalist Numerical Input Keypad) */}
              {paymentMethod === 'CASH' && (
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3.5">
                  <div className="flex items-center justify-between">
                    <label className="font-bold text-slate-800">
                      المبلغ المستلم من العميل (Amount Received):
                    </label>
                    <button
                      type="button"
                      onClick={() => setCashTendered(grandTotal)}
                      className="text-[11px] font-bold text-emerald-700 hover:text-emerald-800 underline cursor-pointer"
                    >
                      مطابقة تامّة ({grandTotal.toFixed(2)})
                    </button>
                  </div>

                  <div className="relative pos-focus-group p-1 rounded-xl border border-transparent transition-all">
                    <input
                      type="number"
                      step="any"
                      min="0"
                      autoFocus
                      data-pos-modal-field="checkout-cash-tendered"
                      data-testid="pos-checkout-cash-tendered-input"
                      value={cashTendered === 0 ? '' : cashTendered}
                      onFocus={(e) => e.currentTarget.select()}
                      onChange={(e) => setCashTendered(Math.max(0, Number(e.target.value) || 0))}
                      placeholder="0.00"
                      className="w-full px-4 py-3 bg-white border-2 border-slate-300 focus:border-slate-900 rounded-xl font-mono tabular-nums font-black text-xl text-slate-900 outline-hidden transition shadow-inner"
                      dir="ltr"
                    />
                    <span
                      className="absolute end-5 top-4.5 text-xs font-mono font-bold text-slate-400"
                      dir="ltr"
                    >
                      {currency}
                    </span>
                  </div>

                  {/* Sleek Minimalist Numerical Keypad */}
                  <div className="bg-white p-2.5 rounded-xl border border-slate-200/90 shadow-xs space-y-1.5">
                    <div className="text-[10px] text-slate-400 font-bold px-1 flex items-center justify-between">
                      <span>لوحة الأرقام السريعة (Keypad):</span>
                      <span className="font-mono text-[9px] text-slate-500">انقر لإدخال أو تعديل المبلغ</span>
                    </div>
                    <div className="grid grid-cols-4 gap-1.5 text-sm font-bold font-mono" dir="ltr">
                      {[
                        '7', '8', '9', 'C',
                        '4', '5', '6', 'Exact',
                        '1', '2', '3', '00',
                        '0', '.', '+10', '+100',
                      ].map((key) => {
                        const isClear = key === 'C';
                        const isExact = key === 'Exact';
                        const isPlus = key.startsWith('+');
                        return (
                          <button
                            key={key}
                            type="button"
                            onClick={() => {
                              if (isClear) {
                                setCashTendered(0);
                              } else if (isExact) {
                                setCashTendered(grandTotal);
                              } else if (isPlus) {
                                const addVal = Number(key.replace('+', ''));
                                setCashTendered((prev) => Math.round((prev + addVal) * 100) / 100);
                              } else if (key === '.') {
                                const str = String(cashTendered || '');
                                if (!str.includes('.')) {
                                  setCashTendered(Number(`${str || '0'}.`));
                                }
                              } else if (key === '00') {
                                setCashTendered((prev) => Number(`${prev || ''}00`));
                              } else {
                                const str = cashTendered === 0 ? key : `${cashTendered}${key}`;
                                setCashTendered(Number(str) || 0);
                              }
                            }}
                            className={`py-2 rounded-lg transition select-none flex items-center justify-center cursor-pointer ${
                              isClear
                                ? 'bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200'
                                : isExact
                                ? 'bg-emerald-600 hover:bg-emerald-500 text-white font-sans text-xs'
                                : isPlus
                                ? 'bg-sky-50 hover:bg-sky-100 text-sky-800 border border-sky-200 text-xs'
                                : 'bg-slate-50 hover:bg-slate-100 text-slate-900 border border-slate-200 hover:border-slate-300'
                            }`}
                          >
                            {isExact ? 'المبلغ كامل' : key}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Change Due / Shortage Display */}
                  <div
                    className={`p-3.5 rounded-xl border flex items-center justify-between font-bold ${
                      cashTendered >= grandTotal
                        ? 'bg-emerald-50/90 border-emerald-200 text-emerald-950'
                        : 'bg-rose-50 border-rose-200 text-rose-950'
                    }`}
                  >
                    <div>
                      <span className="text-xs">
                        {cashTendered >= grandTotal
                          ? 'الباقي المستحق للعميل (Change Due):'
                          : 'المبلغ المتبقي للتحصيل (Remaining Due):'}
                      </span>
                      <div className="text-[10px] text-slate-500 font-normal mt-0.5 font-sans">
                        {cashTendered >= grandTotal
                          ? 'يُعاد هذا المبلغ للعميل نقداً من الدرج'
                          : 'المبلغ المستلم أقل من الإجمالي المطلوب'}
                      </div>
                    </div>
                    <span className="font-mono tabular-nums text-lg font-black" dir="ltr">
                      {Math.abs(cashTendered - grandTotal).toFixed(2)} {currency}
                    </span>
                  </div>
                </div>
              )}

              {/* 2. CARD / ELECTRONIC POS PANEL */}
              {paymentMethod === 'CARD' && (
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-800">
                      مبلغ السداد عبر جهاز الشبكة / البطاقة:
                    </span>
                    <span className="font-mono font-bold text-sm text-emerald-700" dir="ltr">
                      {grandTotal.toFixed(2)} {currency}
                    </span>
                  </div>
                  <div className="pos-focus-group p-1.5 rounded-lg border border-transparent transition-all">
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">
                      رقم مرجع العملية / التفويض البنكي (Approval / RRN):
                    </label>
                    <input
                      type="text"
                      autoFocus
                      data-pos-modal-field="checkout-card-reference"
                      value={cardReference}
                      onFocus={(e) => e.currentTarget.select()}
                      onChange={(e) => setCardReference(e.target.value)}
                      placeholder="مثال: RRN-849201 أو رقم الحوالة..."
                      className="w-full px-3 py-2 bg-white border border-slate-300 focus:border-slate-900 rounded-lg font-mono text-xs font-bold text-slate-900 outline-hidden"
                      dir="ltr"
                    />
                  </div>
                </div>
              )}

              {/* 3. SPLIT PAYMENT PANEL (Cash + Card) */}
              {paymentMethod === 'SPLIT' && (
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="pos-focus-group p-1.5 rounded-lg border border-transparent transition-all">
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        الجزء المدفوع نقداً (كاش):
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        max={grandTotal}
                        autoFocus
                        data-pos-modal-field="checkout-split-cash"
                        value={splitCashAmount}
                        onFocus={(e) => e.currentTarget.select()}
                        onChange={(e) => {
                          const val = Math.min(grandTotal, Math.max(0, Number(e.target.value)));
                          setSplitCashAmount(val);
                        }}
                        className="w-full px-3 py-2 bg-white border border-slate-300 focus:border-slate-900 rounded-lg font-mono tabular-nums font-bold text-sm text-slate-900 outline-hidden"
                        dir="ltr"
                      />
                    </div>
                    <div className="p-1.5">
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        الجزء المسدد بالبطاقة / الشبكة:
                      </label>
                      <div
                        className="w-full px-3 py-2 bg-emerald-50 border border-emerald-200 rounded-lg font-mono tabular-nums font-bold text-sm text-emerald-900"
                        dir="ltr"
                      >
                        {Math.max(0, grandTotal - splitCashAmount).toFixed(2)} {currency}
                      </div>
                    </div>
                  </div>
                  <div className="pos-focus-group p-1.5 rounded-lg border border-transparent transition-all">
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">
                      مرجع عملية الشبكة للجزء البنكي (اختياري):
                    </label>
                    <input
                      type="text"
                      data-pos-modal-field="checkout-split-reference"
                      value={cardReference}
                      onFocus={(e) => e.currentTarget.select()}
                      onChange={(e) => setCardReference(e.target.value)}
                      placeholder="رقم إيصال جهاز نقاط البيع..."
                      className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg font-mono text-xs text-slate-800 outline-hidden"
                      dir="ltr"
                    />
                  </div>
                </div>
              )}

              {/* Optional Invoice / Warranty Note */}
              <div className="pos-focus-group p-1 rounded-xl border border-transparent transition-all">
                <input
                  type="text"
                  data-pos-modal-field="checkout-notes"
                  data-testid="pos-checkout-notes-input"
                  value={checkoutNotes}
                  onFocus={(e) => e.currentTarget.select()}
                  onChange={(e) => setCheckoutNotes(e.target.value)}
                  placeholder="ملاحظات إضافية على الفاتورة أو شهادة الضمان (اختياري)..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 focus:bg-white focus:border-slate-900 rounded-xl text-xs text-slate-800 outline-hidden transition"
                />
              </div>

              {/* Action Buttons */}
              <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => setIsCheckoutModalOpen(false)}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition cursor-pointer"
                >
                  إلغاء
                </button>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    data-pos-modal-field="checkout-confirm-a4"
                    onClick={() => handlePerformCheckout(true)}
                    className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl shadow-2xs transition flex items-center gap-1.5 cursor-pointer"
                  >
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    <span>إصدار مع شهادة ضمان A4</span>
                  </button>
                  <button
                    type="button"
                    data-pos-modal-field="checkout-confirm-standard"
                    data-testid="pos-confirm-checkout-btn"
                    onClick={() => handlePerformCheckout(false)}
                    className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl shadow-2xs transition flex items-center gap-1.5 cursor-pointer"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>تأكيد الدفع وإصدار الفاتورة</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ====================================================================
          MULTI-TEMPLATE RECEIPT & A4 INVOICE PREVIEW MODAL
      ==================================================================== */}
      {isReceiptModalOpen && completedInvoice && (
        <div
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setIsReceiptModalOpen(false);
          }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-xs p-4"
        >
          <div className="bg-slate-50 rounded-2xl shadow-2xl border border-slate-200/80 w-full max-w-4xl max-h-[92vh] overflow-hidden flex flex-col">
            {/* Top Template Switcher Toolbar (Lumina POS Theme) */}
            <div className="px-6 py-4 bg-white border-b border-slate-200/80 text-slate-900 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center shrink-0 shadow-2xs">
                  <Printer className="w-5 h-5" />
                </div>
                <div>
                  <span className="font-bold text-sm text-slate-900">
                    معاينة وطباعة الفاتورة وشهادة الضمان ({completedInvoice.invoiceNumber})
                  </span>
                  <p className="text-[11px] text-slate-500">
                    اختر القالب المناسب للطباعة (حراري 80mm شهادة ضمان أو فاتورة ضريبية رسمية A4)
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-1.5 text-xs">
                {[
                  { mode: 'thermal', tpl: 'thermal_80mm_warranty', label: 'حراري 80mm ضمان وسيريال' },
                  { mode: 'a4', tpl: 'a4_warranty_electronics', label: 'A4 شهادة ضمان رسمية' },
                  { mode: 'thermal', tpl: 'thermal_80mm_standard', label: 'حراري 80mm قياسي' },
                  { mode: 'a4', tpl: 'a4_corporate_classic', label: 'فاتورة A4 مؤسسية' },
                  { mode: 'a4', tpl: 'a4_modern_blue', label: 'فاتورة A4 عصرية' },
                  { mode: 'thermal', tpl: 'thermal_58mm_compact', label: 'حراري 58mm مضغوط' },
                ].map((opt) => (
                  <button
                    key={opt.tpl}
                    type="button"
                    onClick={() => {
                      setReceiptViewMode(opt.mode as any);
                      if (opt.mode === 'thermal') {
                        setSelectedThermalOverride(opt.tpl as ThermalTemplateType);
                      } else {
                        setSelectedA4Override(opt.tpl as StandardInvoiceTemplateType);
                      }
                    }}
                    className={`px-3 py-1.5 rounded-full border font-bold cursor-pointer transition ${
                      (receiptViewMode === 'thermal' &&
                        (selectedThermalOverride || invoiceTemplateSettings.thermalTemplate) ===
                          opt.tpl) ||
                      (receiptViewMode === 'a4' &&
                        (selectedA4Override || invoiceTemplateSettings.standardTemplate) ===
                          opt.tpl)
                        ? 'bg-slate-900 text-white border-slate-900 shadow-2xs'
                        : 'bg-white text-slate-600 border-slate-200/80 hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Scrollable Invoice Renderer */}
            <div className="flex-1 overflow-y-auto p-6">
              <InvoiceRenderer
                invoice={completedInvoice}
                mode={receiptViewMode}
                thermalTemplate={selectedThermalOverride}
                standardTemplate={selectedA4Override}
                settings={invoiceTemplateSettings}
                companyName={company.nameAr || currentTenant.legalName}
                taxNumber={company.taxNumber || '300059281900003'}
                branchName={currentBranch.nameAr}
                branchAddress={currentBranch.city}
                branchPhone={currentBranch.phone}
                currency={currency}
              />
            </div>

            {/* Bottom Actions */}
            <div className="p-4 bg-white border-t border-slate-200 flex flex-wrap justify-between items-center gap-2">
              <button
                type="button"
                onClick={() => setIsReceiptModalOpen(false)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold rounded-md text-xs transition cursor-pointer"
              >
                إغلاق والبدء بعملية بيع جديدة
              </button>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  data-testid="pos-receipt-whatsapp-btn"
                  onClick={() => {
                    const matchedCust = customers.find((c) => c.id === completedInvoice.customerId);
                    openQuickSendModal({
                      channel: 'WHATSAPP',
                      category: 'INVOICE',
                      recipientName: completedInvoice.customerName,
                      recipientPhone: matchedCust?.phone || '+967 771 445 880',
                      referenceNumber: completedInvoice.invoiceNumber,
                      messageBody: composeInvoiceMessageText({
                        invoice: completedInvoice,
                        companyName: company.nameAr || currentTenant.legalName,
                        branchName: currentBranch.nameAr,
                        currency,
                      }),
                    });
                  }}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-md text-xs flex items-center gap-1.5 transition cursor-pointer"
                >
                  <MessageSquare className="w-4 h-4" />
                  <span>إرسال الفاتورة واتساب</span>
                </button>
                <button
                  type="button"
                  data-testid="pos-receipt-sms-btn"
                  onClick={() => {
                    const matchedCust = customers.find((c) => c.id === completedInvoice.customerId);
                    openQuickSendModal({
                      channel: 'SMS',
                      category: 'INVOICE',
                      recipientName: completedInvoice.customerName,
                      recipientPhone: matchedCust?.phone || '+967 771 445 880',
                      referenceNumber: completedInvoice.invoiceNumber,
                      messageBody: composeInvoiceMessageText({
                        invoice: completedInvoice,
                        companyName: company.nameAr || currentTenant.legalName,
                        branchName: currentBranch.nameAr,
                        currency,
                      }),
                    });
                  }}
                  className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-md text-xs flex items-center gap-1.5 transition cursor-pointer"
                >
                  <Smartphone className="w-4 h-4" />
                  <span>إرسال الفاتورة SMS</span>
                </button>
                <button
                  type="button"
                  data-testid="pos-receipt-open-comm-btn"
                  onClick={() => {
                    setIsReceiptModalOpen(false);
                    setActiveTab('communications');
                  }}
                  className="px-3.5 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 font-bold rounded-md text-xs flex items-center gap-1.5 transition cursor-pointer"
                  title="فتح محطة الواتساب والرسائل المدمجة"
                >
                  <MessageSquare className="w-4 h-4 text-indigo-600" />
                  <span>محطة الواتساب والرسائل</span>
                </button>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-md text-xs flex items-center gap-2 transition cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                  <span>طباعة الفاتورة وشهادة الضمان</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ====================================================================
          KITCHEN DISPLAY SCREEN (KDS) MODAL FOR RESTAURANTS
      ==================================================================== */}
      {isKDSModalOpen && (
        <div
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setIsKDSModalOpen(false);
          }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-xs p-4"
        >
          <div className="bg-white text-slate-900 rounded-2xl shadow-2xl border border-slate-200/80 w-full max-w-4xl overflow-hidden">
            <div className="px-6 py-4 bg-slate-50/90 border-b border-slate-200/80 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center shrink-0 shadow-2xs">
                  <ChefHat className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-base text-slate-900">
                  شاشة المطبخ التفاعلية (Kitchen Display System - KDS)
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsKDSModalOpen(false)}
                className="w-8 h-8 rounded-full border border-slate-200/80 bg-white hover:bg-slate-100 text-slate-500 hover:text-slate-900 flex items-center justify-center font-bold text-sm cursor-pointer transition"
              >
                ✕
              </button>
            </div>

            <div className="p-6 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 max-h-[75vh] overflow-y-auto bg-slate-50/50">
              {kitchenTickets.map((ticket) => (
                <div
                  key={ticket.id}
                  className={`rounded-2xl border p-4 flex flex-col justify-between bg-white shadow-2xs ${
                    ticket.status === 'PREPARING'
                      ? 'border-amber-300 ring-1 ring-amber-100'
                      : ticket.status === 'READY'
                      ? 'border-emerald-300 ring-1 ring-emerald-100'
                      : 'border-slate-200 opacity-75'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-3">
                      <div>
                        <span className="font-mono font-bold text-sm text-amber-700">
                          {ticket.kotNumber}
                        </span>
                        <div className="text-xs font-bold text-slate-900 mt-0.5">
                          طاولة: {ticket.tableNumber || 'سفري'} · {ticket.orderType}
                        </div>
                      </div>
                      <span className="text-[10px] font-mono bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full flex items-center gap-1">
                        <Clock className="w-3 h-3" /> {ticket.createdAt}
                      </span>
                    </div>

                    <div className="space-y-2 mb-4">
                      {ticket.items.map((it, i) => (
                        <div key={i} className="text-xs bg-slate-50 border border-slate-200/60 p-2 rounded-xl">
                          <div className="font-bold text-slate-900">
                            {it.qty} × {it.name}
                          </div>
                          {it.notes && (
                            <div className="text-[10px] text-amber-700 mt-0.5">
                              ملاحظة: {it.notes}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {ticket.status !== 'SERVED' ? (
                    <button
                      type="button"
                      onClick={() => advanceKitchenTicket(ticket.id)}
                      className={`w-full py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                        ticket.status === 'PREPARING'
                          ? 'bg-amber-600 hover:bg-amber-500 text-white'
                          : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                      }`}
                    >
                      {ticket.status === 'PREPARING'
                        ? 'تحويل إلى جاهز للتقديم (READY)'
                        : 'تم التقديم للطاولة (SERVED)'}
                    </button>
                  ) : (
                    <div className="text-center text-xs font-bold text-emerald-700 flex items-center justify-center gap-1">
                      <CheckCircle2 className="w-4 h-4" /> تم تقديم الطلب بنجاح
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Close & Reconcile Shift Modal (Z-Report) */}
      {isCloseShiftModalOpen && (
        <div
          data-testid="pos-close-shift-modal-backdrop"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setIsCloseShiftModalOpen(false);
          }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4"
        >
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200/80 w-full max-w-md overflow-hidden">
            <div className="px-5 py-4 bg-slate-50/90 border-b border-slate-200/80 text-slate-900 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center shrink-0 shadow-2xs">
                  <Lock className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900">
                    إغلاق وتسليم وردية الكاشير (Z-Report)
                  </h3>
                  <p className="text-[10px] text-slate-500">
                    الكاشير: {currentShift.cashierName} • بداية الوردية: {currentShift.startTime}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsCloseShiftModalOpen(false)}
                className="w-8 h-8 rounded-full border border-slate-200/80 bg-white hover:bg-slate-100 text-slate-500 hover:text-slate-900 flex items-center justify-center font-bold text-sm cursor-pointer transition"
              >
                ✕
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              {/* Z-Report Financial Breakdown */}
              <div className="space-y-1.5 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">حالة الوردية الحالية:</span>
                  <span
                    className={`px-2 py-0.5 rounded font-bold text-[10px] ${
                      currentShift.status === 'OPEN'
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-rose-100 text-rose-800'
                    }`}
                  >
                    {currentShift.status === 'OPEN' ? 'مفتوحة ونشطة (OPEN)' : 'مغلقة (CLOSED)'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">عهدة بداية الوردية:</span>
                  <span className="font-bold font-mono tabular-nums" dir="ltr">
                    {currentShift.startingCash.toFixed(2)} {currency}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">مبيعات الكاش (النقدية):</span>
                  <span className="font-bold text-emerald-700 font-mono tabular-nums" dir="ltr">
                    +{currentShift.cashSales.toFixed(2)} {currency}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">مبيعات الشبكة والبطاقة:</span>
                  <span className="font-bold text-indigo-700 font-mono tabular-nums" dir="ltr">
                    +{currentShift.cardSales.toFixed(2)} {currency}
                  </span>
                </div>
                <div className="flex justify-between border-t border-slate-200 pt-1.5 font-bold text-slate-700">
                  <span>إجمالي مبيعات الوردية:</span>
                  <span className="font-mono tabular-nums" dir="ltr">
                    {currentShift.totalSales.toFixed(2)} {currency}
                  </span>
                </div>
                <div className="flex justify-between border-t border-slate-200 pt-1.5 font-bold text-sm text-slate-900">
                  <span>النقدية المتوقعة بالدرج:</span>
                  <span className="font-mono tabular-nums text-emerald-700" dir="ltr">
                    {currentShift.expectedCash.toFixed(2)} {currency}
                  </span>
                </div>
              </div>

              {/* Actual Cash Count Input & Quick Match */}
              <div className="pos-focus-group p-2 rounded-lg border border-transparent transition-all space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-slate-800">
                    العد الفعلي للنقدية بالدرج:
                  </label>
                  <button
                    type="button"
                    onClick={() => setActualCashCount(currentShift.expectedCash)}
                    className="text-[11px] font-bold text-emerald-700 hover:text-emerald-800 underline cursor-pointer"
                  >
                    مطابقة مع المتوقع ({currentShift.expectedCash.toFixed(2)})
                  </button>
                </div>
                <input
                  type="number"
                  autoFocus
                  data-pos-modal-field="shift-actual-cash"
                  value={actualCashCount}
                  onFocus={(e) => e.currentTarget.select()}
                  onChange={(e) => setActualCashCount(Number(e.target.value))}
                  className="w-full p-2.5 bg-white border border-slate-300 focus:border-slate-900 rounded-lg text-sm font-bold font-mono tabular-nums outline-hidden"
                  dir="ltr"
                />
              </div>

              {/* Live Cash Discrepancy / Variance Box */}
              {(() => {
                const diff = Math.round((actualCashCount - currentShift.expectedCash) * 100) / 100;
                return (
                  <div
                    className={`p-3 rounded-lg border flex items-center justify-between font-bold ${
                      diff === 0
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                        : diff > 0
                        ? 'bg-sky-50 border-sky-200 text-sky-900'
                        : 'bg-rose-50 border-rose-200 text-rose-900'
                    }`}
                  >
                    <span>
                      {diff === 0
                        ? 'مطابق تماماً — لا يوجد عجز أو فائض'
                        : diff > 0
                        ? 'فائض نقدي بالصندوق (Overage):'
                        : 'عجز نقدي بالصندوق (Shortage):'}
                    </span>
                    <span className="font-mono tabular-nums text-sm" dir="ltr">
                      {diff > 0 ? `+${diff.toFixed(2)}` : diff.toFixed(2)} {currency}
                    </span>
                  </div>
                );
              })()}

              {/* Auto-Open New Shift Toggle */}
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 space-y-2">
                <label className="flex items-center justify-between cursor-pointer">
                  <span className="font-bold text-slate-800">
                    فتح وردية جديدة تلقائياً بعد الإغلاق
                  </span>
                  <input
                    type="checkbox"
                    checked={autoOpenNewShift}
                    onChange={(e) => setAutoOpenNewShift(e.target.checked)}
                    className="w-4 h-4 accent-emerald-600 rounded cursor-pointer"
                  />
                </label>
                {autoOpenNewShift && (
                  <div className="pos-focus-group p-1.5 rounded-md border border-transparent transition-all flex items-center justify-between pt-1 border-t border-slate-200/80">
                    <span className="text-slate-600">عهدة الوردية الجديدة:</span>
                    <input
                      type="number"
                      data-pos-modal-field="shift-new-float"
                      value={newShiftStartingFloat}
                      onFocus={(e) => e.currentTarget.select()}
                      onChange={(e) => setNewShiftStartingFloat(Number(e.target.value))}
                      className="w-28 px-2 py-1 bg-white border border-slate-300 rounded font-mono font-bold text-xs text-center"
                      dir="ltr"
                    />
                  </div>
                )}
              </div>

              <div className="pt-1 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsCloseShiftModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg transition cursor-pointer"
                >
                  إلغاء
                </button>
                {currentShift.status === 'CLOSED' && !autoOpenNewShift ? (
                  <button
                    type="button"
                    data-pos-modal-field="shift-open-new-btn"
                    onClick={() => {
                      openNewPOSShift(newShiftStartingFloat);
                      setIsCloseShiftModalOpen(false);
                      showBanner(
                        'success',
                        `تم فتح وردية كاشير جديدة بعهدة افتتاحية ${newShiftStartingFloat.toFixed(2)} ${currency}`
                      );
                    }}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg shadow-2xs transition cursor-pointer"
                  >
                    فتح وردية جديدة الآن
                  </button>
                ) : (
                  <button
                    type="button"
                    data-pos-modal-field="shift-confirm-close-btn"
                    data-testid="btn-confirm-close-shift"
                    onClick={() => {
                      closePOSShift(
                        actualCashCount,
                        autoOpenNewShift ? newShiftStartingFloat : undefined
                      );
                      setIsCloseShiftModalOpen(false);
                      showBanner(
                        'success',
                        autoOpenNewShift
                          ? `تم إغلاق الوردية السابقة بنجاح وفتح وردية جديدة بعهدة ${newShiftStartingFloat.toLocaleString()} ${currency}`
                          : 'تم إغلاق وتسليم وردية الكاشير بنجاح (Z-Report)'
                      );
                    }}
                    className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-lg shadow-2xs transition cursor-pointer"
                  >
                    {autoOpenNewShift
                      ? 'إغلاق الوردية وبدء وردية جديدة'
                      : 'تأكيد إغلاق الوردية'}
                  </button>
                )}
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
          contextMode="POS"
          title="مسح الباركود والكود بالكاميرا - نقطة البيع"
        />
      )}
    </div>
  );
};
