import React, { useState, useMemo } from 'react';
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
} from 'lucide-react';
import { CameraBarcodeScannerModal, ScannedBatchItem } from '../components/common/CameraBarcodeScannerModal';
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

  // Cart Discount State (Percent vs Fixed Amount)
  const [discountType, setDiscountType] = useState<'PERCENT' | 'AMOUNT'>('PERCENT');
  const [discountValue, setDiscountValue] = useState<number | ''>('');

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

  const electronicsSubCategories: {
    id: ElectronicsSubCategory | 'ALL';
    labelAr: string;
    count: number;
  }[] = [
    {
      id: 'ALL',
      labelAr: 'كافة الإلكترونيات والطاقة',
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
      labelAr: 'شاشات ذكية 4K / OLED',
      count: products.filter((p) => p.subCategory === 'SMART_SCREEN').length,
    },
    {
      id: 'COMPUTING_MOBILE',
      labelAr: 'حواسيب وهواتف ذكية',
      count: products.filter((p) => p.subCategory === 'COMPUTING_MOBILE').length,
    },
    {
      id: 'SOLAR_ACCESSORY',
      labelAr: 'لوحات حماية وملحقات DC',
      count: products.filter((p) => p.subCategory === 'SOLAR_ACCESSORY').length,
    },
  ];

  return (
    <div className="h-full flex flex-col gap-2.5 overflow-hidden">
      {posBanner && (
        <div
          className={`shrink-0 px-3 py-2 rounded-lg border text-xs font-semibold flex items-center justify-between ${
            posBanner.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-950'
              : 'bg-rose-50 border-rose-200 text-rose-950'
          }`}
        >
          <span>{posBanner.text}</span>
          <button
            type="button"
            onClick={() => setPosBanner(null)}
            className="text-slate-500 hover:text-slate-900 font-bold cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* Unified Compact POS & Sector Operations Header Bar */}
      <div className="shrink-0 bg-white px-3.5 py-2.5 rounded-xl border border-slate-200/90 shadow-2xs flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                currentShift.status === 'OPEN'
                  ? 'bg-emerald-500 ring-2 ring-emerald-500/20'
                  : 'bg-rose-500 ring-2 ring-rose-500/20'
              }`}
            ></span>
            <span className="font-bold text-slate-900">
              وردية الكاشير: {currentShift.cashierName}
            </span>
            <span
              className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                currentShift.status === 'OPEN'
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                  : 'bg-rose-50 text-rose-800 border border-rose-200'
              }`}
            >
              {currentShift.status === 'OPEN' ? 'نشطة' : 'مغلقة'}
            </span>
          </div>
          <span className="text-slate-300">|</span>
          <span className="text-slate-600">
            مبيعات الوردية:{' '}
            <strong className="font-mono tabular-nums text-slate-900" dir="ltr">
              {currentShift.totalSales.toLocaleString()} {currency}
            </strong>
          </span>
          <span className="text-slate-300">|</span>
          <span className="text-slate-600">
            النقدية بالدرج:{' '}
            <strong className="font-mono tabular-nums text-emerald-700" dir="ltr">
              {currentShift.expectedCash.toLocaleString()} {currency}
            </strong>
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {activeIndustry === 'electronics' && (
            <>
              <button
                type="button"
                data-testid="btn-pos-goto-inventory"
                onClick={() => setActiveTab('inventory')}
                className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-800 font-bold text-xs flex items-center gap-1.5 transition cursor-pointer"
              >
                <Package className="w-3.5 h-3.5 text-emerald-600" />
                <span>المستودع والجرد</span>
              </button>
              <button
                type="button"
                data-testid="btn-pos-goto-warranty"
                onClick={() => setActiveTab('sales')}
                className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-800 font-bold text-xs flex items-center gap-1.5 transition cursor-pointer"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-amber-600" />
                <span>فحص الضمان (S/N)</span>
              </button>
              <button
                type="button"
                data-testid="btn-open-solar-calculator"
                onClick={() => setIsSolarCalcOpen(true)}
                className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 transition cursor-pointer shadow-2xs"
              >
                <Calculator className="w-3.5 h-3.5" />
                <span>حاسبة الطاقة الشمسية والبطاريات</span>
              </button>
            </>
          )}

          {activeIndustry === 'restaurant' && (
            <button
              type="button"
              onClick={() => setIsKDSModalOpen(true)}
              className="bg-amber-50 hover:bg-amber-100 text-amber-950 border border-amber-300 font-bold px-2.5 py-1.5 rounded-lg transition flex items-center gap-1.5 cursor-pointer"
            >
              <ChefHat className="w-3.5 h-3.5 text-amber-700" />
              <span>
                شاشة المطبخ KDS (
                <span className="font-mono tabular-nums" dir="ltr">
                  {kitchenTickets.filter((k) => k.status !== 'SERVED').length}
                </span>
                )
              </span>
            </button>
          )}

          {currentShift.status === 'CLOSED' && (
            <button
              type="button"
              data-testid="btn-open-new-shift-header"
              onClick={() => {
                openNewPOSShift(1500);
                showBanner('success', 'تم فتح وردية كاشير جديدة بعهدة افتتاحية 1,500');
              }}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-2.5 py-1.5 rounded-lg transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
            >
              <PlayCircle className="w-3.5 h-3.5" />
              <span>فتح وردية جديدة</span>
            </button>
          )}

          <button
            type="button"
            data-testid="btn-close-shift-header"
            onClick={() => {
              setActualCashCount(currentShift.expectedCash);
              setIsCloseShiftModalOpen(true);
            }}
            className="bg-slate-900 hover:bg-slate-800 text-white font-bold px-2.5 py-1.5 rounded-lg transition flex items-center gap-1.5 cursor-pointer"
          >
            <Lock className="w-3.5 h-3.5 text-slate-300" />
            <span>{currentShift.status === 'OPEN' ? 'إغلاق الوردية (Z-Report)' : 'تقرير الوردية'}</span>
          </button>
        </div>
      </div>

      {/* Held Bills Drawer / Resume Bar */}
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

      {/* Main Grid: Products Catalog Touch Screen (Left) + Cart Register (Right) — Locked to Remaining Height */}
      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 gap-3 overflow-hidden">
        {/* Left Column (7 cols): Touch Catalog & Barcode Reader */}
        <div className="lg:col-span-7 bg-white rounded-xl border border-slate-200/90 shadow-2xs p-3 flex flex-col min-h-0 overflow-hidden">
          {/* Quick Barcode Scan & Search Bar */}
          <div className="shrink-0 grid grid-cols-1 sm:grid-cols-12 gap-2 mb-2">
            <div className="sm:col-span-6 flex items-center gap-1.5">
              <form onSubmit={handleBarcodeSubmit} className="flex-1 relative">
                <input
                  type="text"
                  value={barcodeInput}
                  onChange={(e) => setBarcodeInput(e.target.value)}
                  placeholder="امسح الباركود أو الكود SKU..."
                  className="w-full text-xs py-2 px-3 ps-8 bg-slate-50 border border-slate-200 rounded-lg font-mono outline-hidden focus:bg-white focus:border-slate-900 transition"
                />
                <Barcode className="w-4 h-4 text-slate-600 absolute start-2.5 top-2" />
              </form>
              <button
                type="button"
                data-testid="pos-camera-barcode-btn"
                onClick={() => setIsCameraScannerOpen(true)}
                title="مسح الباركود والكود بالكاميرا (مفرد أو متعدد مستمر)"
                className="shrink-0 px-2.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 transition shadow-2xs cursor-pointer group"
              >
                <Camera className="w-4 h-4 group-hover:scale-110 transition-transform" />
                <span className="hidden sm:inline">كاميرا</span>
              </button>
            </div>

            <div className="sm:col-span-6 relative">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="ابحث بالاسم أو المواصفة (585W، 200Ah، OLED)..."
                className="w-full text-xs py-2 px-3 ps-8 bg-slate-50 border border-slate-200 rounded-lg outline-hidden focus:bg-white focus:border-slate-900 transition"
              />
              <Search className="w-4 h-4 text-slate-400 absolute start-2.5 top-2" />
            </div>
          </div>

          {/* Unified Sub-Category Filter Pills */}
          {activeIndustry === 'electronics' ? (
            <div className="shrink-0 flex items-center gap-1.5 overflow-x-auto pb-2 mb-2 border-b border-slate-100">
              {electronicsSubCategories.map((sub) => (
                <button
                  key={sub.id}
                  type="button"
                  onClick={() => setSelectedElectronicsSubCat(sub.id)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold whitespace-nowrap transition flex items-center gap-1.5 cursor-pointer ${
                    selectedElectronicsSubCat === sub.id
                      ? 'bg-slate-900 text-white shadow-2xs'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  <span>{sub.labelAr}</span>
                  <span
                    className={`px-1.5 py-0.2 rounded font-mono tabular-nums text-[10px] ${
                      selectedElectronicsSubCat === sub.id
                        ? 'bg-emerald-500/20 text-emerald-300'
                        : 'bg-white text-slate-500'
                    }`}
                    dir="ltr"
                  >
                    {sub.count}
                  </span>
                </button>
              ))}
            </div>
          ) : (
            <div className="shrink-0 flex items-center gap-1.5 overflow-x-auto pb-2 mb-2 border-b border-slate-100 text-xs">
              <button
                type="button"
                onClick={() => setSelectedCategory('all')}
                className={`px-2.5 py-1 rounded-lg font-bold whitespace-nowrap transition cursor-pointer ${
                  selectedCategory === 'all'
                    ? 'bg-slate-900 text-white shadow-2xs'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                الكل (<span className="font-mono tabular-nums" dir="ltr">{filteredProducts.length}</span>)
              </button>
              {categories
                .filter((c) => !c.industry || c.industry === 'electronics')
                .map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setSelectedCategory(c.id)}
                    className={`px-2.5 py-1 rounded-lg font-bold whitespace-nowrap transition cursor-pointer ${
                      selectedCategory === c.id
                        ? 'bg-teal-700 text-white shadow-2xs'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    {language === 'ar' ? c.nameAr : c.name}
                  </button>
                ))}
            </div>
          )}

          {/* Product Touch Grid — Fitted to Available Card Height */}
          <div className="flex-1 min-h-0 overflow-y-auto grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-2.5 content-start pe-1">
            {filteredProducts.map((p) => (
              <div
                key={p.id}
                onClick={() => addToPOSCart(p, 1)}
                className="bg-slate-50/70 hover:bg-white p-2.5 rounded-xl border border-slate-200/90 hover:border-emerald-600 hover:shadow-xs cursor-pointer transition flex flex-col justify-between group select-none"
              >
                <div>
                  <div className="flex items-center justify-between gap-1 mb-1">
                    <span className="text-[10px] text-slate-400 font-mono tabular-nums truncate" dir="ltr">
                      {p.sku}
                    </span>
                    {p.warrantyMonths && (
                      <span className="text-[9px] bg-emerald-50 text-emerald-800 border border-emerald-200 px-1.5 py-0.2 rounded font-bold shrink-0">
                        ضمان <span className="font-mono tabular-nums" dir="ltr">{p.warrantyMonths}</span>ش
                      </span>
                    )}
                  </div>

                  <div className="font-bold text-slate-900 text-xs leading-snug line-clamp-2 group-hover:text-emerald-700 transition">
                    {language === 'ar' ? p.nameAr : p.name}
                  </div>

                  {/* Technical Specs Badges for Solar, Inverters, Batteries & Screens */}
                  {(p.powerRatingWatts || p.batteryCapacitySpec || p.screenSizeSpec) && (
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {p.powerRatingWatts && (
                        <span
                          className="text-[9px] font-mono tabular-nums bg-white text-slate-700 border border-slate-200 px-1.5 py-0.2 rounded font-semibold"
                          dir="ltr"
                        >
                          {p.powerRatingWatts >= 1000
                            ? `${(p.powerRatingWatts / 1000).toFixed(1).replace('.0', '')} kW`
                            : `${p.powerRatingWatts} W`}
                        </span>
                      )}
                      {p.batteryCapacitySpec && (
                        <span
                          className="text-[9px] font-mono tabular-nums bg-emerald-50 text-emerald-900 border border-emerald-200 px-1.5 py-0.2 rounded font-semibold"
                          dir="ltr"
                        >
                          {p.batteryCapacitySpec}
                        </span>
                      )}
                      {p.screenSizeSpec && (
                        <span
                          className="text-[9px] font-mono tabular-nums bg-sky-50 text-sky-900 border border-sky-200 px-1.5 py-0.2 rounded font-semibold"
                          dir="ltr"
                        >
                          {p.screenSizeSpec}
                        </span>
                      )}
                    </div>
                  )}
                </div>

                <div className="mt-2 pt-1.5 border-t border-slate-200/70 flex items-center justify-between">
                  <span className="font-bold text-slate-900 text-xs font-mono tabular-nums" dir="ltr">
                    {p.salePrice.toLocaleString()} {currency}
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      data-testid={`btn-probe-branches-${p.sku}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        openCrossBranchModal(p.sku);
                      }}
                      className="p-1 hover:bg-indigo-50 text-indigo-600 rounded text-[10px] font-bold transition"
                      title="فحص توفر الصنف في باقي الفروع والشبكة المحلية (LAN)"
                    >
                      <Network className="w-3 h-3" />
                    </button>
                    <span
                      className={`text-[9px] font-mono tabular-nums px-1.5 py-0.2 rounded border ${
                        p.stockQty <= p.reorderPoint
                          ? 'bg-amber-50 text-amber-900 border-amber-200 font-bold'
                          : 'bg-white text-slate-600 border-slate-200'
                      }`}
                      dir="ltr"
                    >
                      {p.stockQty}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Column (5 cols): Live POS Cart & Register Checkout */}
        <div className="lg:col-span-5 bg-white rounded-xl border border-slate-200/90 shadow-2xs p-3 flex flex-col justify-between min-h-0 overflow-hidden">
          {/* Cart Header + Customer & Warranty Beneficiary Bar */}
          <div className="shrink-0 border-b border-slate-100 pb-2 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-slate-900 text-white flex items-center justify-center shrink-0">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <h2 className="font-bold text-slate-900 text-xs sm:text-sm">
                      سلة المبيعات وشهادة الضمان
                    </h2>
                    <span className="px-1.5 py-0.2 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 font-mono text-[10px] font-bold">
                      {posCart.reduce((s, i) => s + i.quantity, 0)} قطعة
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-500 font-medium">
                    توثيق الأرقام التسلسلية (SN / IMEI) وإصدار شهادة الضمان المعتمدة
                  </span>
                </div>
              </div>
              {posCart.length > 0 && (
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={handleGenerateAllCartSerials}
                    className="px-2 py-1 rounded-md bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-[10px] font-bold transition cursor-pointer"
                    title="توليد أرقام تسلسلية تلقائية لكافة الأصناف"
                  >
                    توليد S/N للكل
                  </button>
                  <button
                    type="button"
                    onClick={clearPOSCart}
                    className="px-2 py-1 rounded-md bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-[10px] font-bold flex items-center gap-1 cursor-pointer transition"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>تفريغ</span>
                  </button>
                </div>
              )}
            </div>

            {/* Customer / Beneficiary Quick Inputs for Warranty Certificate */}
            <div className="grid grid-cols-12 gap-1.5 bg-slate-50 p-1.5 rounded-lg border border-slate-200/80 text-[11px]">
              <select
                value={selectedCustomerId}
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
                className="col-span-4 bg-white border border-slate-200 rounded px-2 py-1 text-[11px] font-bold text-slate-800 outline-hidden focus:border-slate-900"
              >
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {language === 'ar' ? c.nameAr : c.name}
                  </option>
                ))}
              </select>
              <input
                type="text"
                value={warrantyCustomerName}
                onChange={(e) => setWarrantyCustomerName(e.target.value)}
                placeholder="اسم المستفيد بشهادة الضمان..."
                className="col-span-4 bg-white border border-slate-200 rounded px-2 py-1 text-[11px] font-semibold text-slate-900 outline-hidden focus:border-slate-900"
              />
              <input
                type="text"
                value={warrantyCustomerPhone}
                onChange={(e) => setWarrantyCustomerPhone(e.target.value)}
                placeholder="جوال العميل (967+)..."
                dir="ltr"
                className="col-span-4 bg-white border border-slate-200 rounded px-2 py-1 text-[11px] font-mono text-slate-800 outline-hidden focus:border-slate-900"
              />
            </div>
          </div>

          {/* Cart Items List */}
          <div className="flex-1 min-h-0 overflow-y-auto py-2 space-y-2 pe-0.5">
            {posCart.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-400 text-xs space-y-2">
                <ShieldCheck className="w-9 h-9 text-slate-300 stroke-1" />
                <span className="font-semibold text-slate-500">
                  السلة فارغة — اختر الأصناف لإصدار الفاتورة وشهادة الضمان
                </span>
              </div>
            ) : (
              posCart.map((item) => (
                <div
                  key={item.productId}
                  className="p-2.5 rounded-xl bg-slate-50/90 hover:bg-slate-50 border border-slate-200/90 text-xs space-y-1.5 transition"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-slate-900 truncate">{item.productName}</div>
                      <div className="flex items-center gap-1.5 text-[10px] text-slate-500 font-mono tabular-nums" dir="ltr">
                        <span className="bg-white px-1 rounded border border-slate-200 text-slate-600">
                          {item.sku}
                        </span>
                        <span>
                          {item.unitPrice.toLocaleString()} {currency} × {item.quantity}
                        </span>
                      </div>
                    </div>

                    {/* Quantity Controls */}
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => updatePOSCartQty(item.productId, item.quantity - 1)}
                        className="w-6 h-6 rounded-md bg-white border border-slate-300 text-slate-700 flex items-center justify-center font-bold hover:bg-slate-100 cursor-pointer"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="w-6 text-center font-bold font-mono tabular-nums text-slate-900" dir="ltr">
                        {item.quantity}
                      </span>
                      <button
                        type="button"
                        onClick={() => updatePOSCartQty(item.productId, item.quantity + 1)}
                        className="w-6 h-6 rounded-md bg-white border border-slate-300 text-slate-700 flex items-center justify-center font-bold hover:bg-slate-100 cursor-pointer"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>

                    {/* Item Total, Cross Branch Probe & Remove */}
                    <div className="flex items-center gap-1 shrink-0">
                      <div className="w-20 text-end font-bold font-mono tabular-nums text-slate-900" dir="ltr">
                        {item.total.toFixed(2)} {currency}
                      </div>
                      <button
                        type="button"
                        onClick={() => openCrossBranchModal(item.sku)}
                        className="p-1 hover:bg-indigo-50 text-indigo-600 rounded text-[10px] font-bold cursor-pointer"
                        title="فحص توفر هذا الصنف في الفروع الأخرى"
                      >
                        <Network className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => removeFromPOSCart(item.productId)}
                        className="p-1 hover:bg-rose-50 text-rose-500 hover:text-rose-700 rounded transition cursor-pointer"
                        title="حذف الصنف من السلة"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Electronics / Solar / Battery Serial / IMEI & Warranty Duration Editor */}
                  <div className="flex items-center gap-1.5 pt-1.5 border-t border-slate-200/80">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <input
                      type="text"
                      value={item.serialNumber || ''}
                      onChange={(e) =>
                        updatePOSCartItemMeta(item.productId, { serialNumber: e.target.value })
                      }
                      placeholder="الرقم التسلسلي للضمان SN / IMEI..."
                      className="flex-1 min-w-0 bg-white border border-slate-200 focus:border-emerald-600 rounded px-2 py-0.5 text-[10px] font-mono tabular-nums outline-hidden"
                      dir="ltr"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        updatePOSCartItemMeta(item.productId, {
                          serialNumber: generateUniqueSerialNumber('IMEI', currentTenant.code),
                        })
                      }
                      className="px-1.5 py-0.5 rounded bg-slate-200/80 hover:bg-slate-300 text-slate-800 text-[9px] font-bold shrink-0 cursor-pointer transition"
                      title="توليد رقم تسلسلي تلقائي للقطعة"
                    >
                      توليد S/N
                    </button>
                    <select
                      value={item.warrantyMonths ?? 24}
                      onChange={(e) =>
                        updatePOSCartItemMeta(item.productId, {
                          warrantyMonths: Number(e.target.value),
                        })
                      }
                      aria-label="مدة الضمان بالشهور"
                      className="bg-emerald-50 text-emerald-900 border border-emerald-200 rounded px-1.5 py-0.5 text-[10px] font-bold shrink-0 outline-hidden cursor-pointer"
                    >
                      <option value={12}>ضمان 12 شهر</option>
                      <option value={24}>ضمان 24 شهر</option>
                      <option value={36}>ضمان 36 شهر</option>
                      <option value={60}>ضمان 5 سنوات</option>
                      <option value={120}>ضمان 10 سنوات</option>
                    </select>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Cart Bottom Summary, Compact Coupon Box & Checkout Buttons */}
          <div className="shrink-0 border-t border-slate-100 pt-2 space-y-2">
            {/* Sales Cart Discount Controls: Percent (%) vs Fixed Amount (Currency) */}
            <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
                <span className="flex items-center gap-1.5">
                  <Percent className="w-3.5 h-3.5 text-emerald-600" />
                  <span>تطبيق خصم على السلة:</span>
                </span>

                {/* Mode Selector Toggle: Percent (%) vs Amount (Currency) */}
                <div className="flex items-center bg-white dark:bg-slate-900 rounded-lg p-0.5 border border-slate-200 dark:border-slate-700 text-[11px]">
                  <button
                    type="button"
                    data-testid="pos-discount-mode-percent"
                    onClick={() => {
                      setDiscountType('PERCENT');
                      if (discountType === 'AMOUNT' && typeof discountValue === 'number' && discountValue > 100) {
                        setDiscountValue(10);
                      }
                    }}
                    className={`px-2.5 py-0.5 rounded font-bold transition cursor-pointer ${
                      discountType === 'PERCENT'
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                    }`}
                  >
                    نسبة (%)
                  </button>
                  <button
                    type="button"
                    data-testid="pos-discount-mode-amount"
                    onClick={() => {
                      setDiscountType('AMOUNT');
                    }}
                    className={`px-2.5 py-0.5 rounded font-bold transition cursor-pointer ${
                      discountType === 'AMOUNT'
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                    }`}
                  >
                    مبلغ ({currency})
                  </button>
                </div>
              </div>

              {/* Number Input & Clear Action */}
              <div className="flex items-center gap-1.5">
                <div className="relative flex-1">
                  <input
                    type="number"
                    min="0"
                    max={discountType === 'PERCENT' ? 100 : subtotal}
                    step={discountType === 'PERCENT' ? '1' : '1'}
                    data-testid="pos-discount-value-input"
                    value={discountValue}
                    onChange={(e) => {
                      const val = e.target.value === '' ? '' : parseFloat(e.target.value);
                      if (val === '') {
                        setDiscountValue('');
                      } else if (!isNaN(val)) {
                        setDiscountValue(Math.max(0, val));
                      }
                    }}
                    placeholder={
                      discountType === 'PERCENT'
                        ? 'حدد النسبة المئوية (مثلاً: 10 أو 15 أو 25)...'
                        : `حدد مبلغ الخصم المباشر بـ ${currency} (مثلاً: 50 أو 100)...`
                    }
                    className="w-full pr-3 pl-8 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-mono font-bold outline-hidden focus:border-emerald-600 dark:text-white"
                  />
                  <span className="absolute left-2.5 top-1.5 font-bold text-xs text-slate-400 select-none">
                    {discountType === 'PERCENT' ? '%' : currency}
                  </span>
                </div>

                {typeof discountValue === 'number' && discountValue > 0 && (
                  <button
                    type="button"
                    data-testid="pos-clear-discount-btn"
                    onClick={() => setDiscountValue('')}
                    className="px-2.5 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold cursor-pointer transition"
                    title="إلغاء الخصم"
                  >
                    إلغاء
                  </button>
                )}
              </div>

              {/* Quick Presets Buttons */}
              <div className="flex flex-wrap items-center gap-1 text-[10px]">
                <span className="text-slate-400 font-medium">خيارات شائعة:</span>
                {discountType === 'PERCENT'
                  ? [5, 10, 15, 20, 25].map((pct) => (
                      <button
                        key={pct}
                        type="button"
                        data-testid={`pos-quick-pct-${pct}`}
                        disabled={posCart.length === 0}
                        onClick={() => setDiscountValue(pct)}
                        className={`px-2 py-0.5 rounded font-mono font-bold border transition cursor-pointer disabled:opacity-40 ${
                          discountValue === pct
                            ? 'bg-emerald-600 text-white border-emerald-600'
                            : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-emerald-500'
                        }`}
                      >
                        {pct}%
                      </button>
                    ))
                  : [20, 50, 100, 200, 500].map((amt) => (
                      <button
                        key={amt}
                        type="button"
                        data-testid={`pos-quick-amt-${amt}`}
                        disabled={posCart.length === 0 || subtotal < amt}
                        onClick={() => setDiscountValue(amt)}
                        className={`px-2 py-0.5 rounded font-mono font-bold border transition cursor-pointer disabled:opacity-40 ${
                          discountValue === amt
                            ? 'bg-emerald-600 text-white border-emerald-600'
                            : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-emerald-500'
                        }`}
                      >
                        {amt} {currency}
                      </button>
                    ))}

                {calculatedDiscountAmount > 0 && (
                  <span className="text-emerald-700 dark:text-emerald-400 font-bold ms-auto">
                    خصم فعلي: -{calculatedDiscountAmount.toFixed(2)} {currency}
                  </span>
                )}
              </div>
            </div>

            <div className="space-y-0.5 text-xs">
              <div className="flex justify-between text-slate-500">
                <span>المجموع الفرعي:</span>
                <span className="font-semibold font-mono tabular-nums" dir="ltr">
                  {subtotal.toFixed(2)} {currency}
                </span>
              </div>
              {calculatedDiscountAmount > 0 && (
                <div
                  data-testid="pos-coupon-discount-row"
                  className="flex justify-between text-emerald-700 font-bold"
                >
                  <span>
                    الخصم المطبق (
                    {discountType === 'PERCENT'
                      ? `نسبة ${discountValue}%`
                      : `مبلغ ${discountValue} ${currency}`}
                    ):
                  </span>
                  <span className="font-mono tabular-nums" dir="ltr">
                    -{calculatedDiscountAmount.toFixed(2)} {currency}
                  </span>
                </div>
              )}
              <div className="flex justify-between font-bold text-slate-900 text-sm pt-1 border-t border-slate-100">
                <span>الإجمالي المستحق:</span>
                <span
                  data-testid="pos-grand-total-display"
                  className="text-emerald-700 font-mono tabular-nums"
                  dir="ltr"
                >
                  {grandTotal.toFixed(2)} {currency}
                </span>
              </div>
            </div>

            {/* Actions Grid */}
            <div className="grid grid-cols-12 gap-1.5">
              <button
                type="button"
                disabled={posCart.length === 0}
                onClick={() => holdCurrentPOSBill(undefined, selectedTable)}
                className="col-span-3 py-2 bg-amber-50 hover:bg-amber-100 text-amber-950 border border-amber-300 font-bold text-xs rounded-xl transition flex items-center justify-center gap-1 disabled:opacity-40 cursor-pointer"
              >
                <PauseCircle className="w-3.5 h-3.5 text-amber-700" />
                <span>تعليق</span>
              </button>

              <button
                type="button"
                disabled={posCart.length === 0}
                onClick={handlePreviewDraftWarrantyCertificate}
                className="col-span-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-300 font-bold text-xs rounded-xl transition flex items-center justify-center gap-1 disabled:opacity-40 cursor-pointer"
                title="معاينة وطباعة شهادة الضمان الرسمية A4"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-700" />
                <span>معاينة الضمان</span>
              </button>

              <button
                type="button"
                disabled={posCart.length === 0}
                onClick={() => {
                  setPaymentMethod('CASH');
                  setCashTendered(grandTotal);
                  setSplitCashAmount(Math.round((grandTotal / 2) * 100) / 100);
                  setCardReference(`RRN-${Math.floor(100000 + Math.random() * 900000)}`);
                  setIsCheckoutModalOpen(true);
                }}
                className="col-span-6 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs sm:text-sm rounded-xl shadow-xs transition flex items-center justify-center gap-1.5 disabled:opacity-40 cursor-pointer"
              >
                <CreditCard className="w-4 h-4 text-emerald-400" />
                <span>دفع وإصدار الضمان</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ====================================================================
          SOLAR ENERGY, HYBRID INVERTER & BATTERY BANK SIZING CALCULATOR MODAL
      ==================================================================== */}
      {isSolarCalcOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-md shadow-xl border border-slate-300 w-full max-w-3xl overflow-hidden">
            <div className="px-5 py-3.5 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sun className="w-5 h-5 text-teal-400" />
                <div>
                  <h3 className="font-bold text-sm">
                    الحاسبة الهندسية لمنظومات الطاقة الشمسية والبطاريات والإنفرترات
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    حساب تلقائي لقدرة الإنفرتر الهجين، سعة بنك البطاريات (LiFePO4 / Gel)، وعدد الألواح الشمسية مع الإدراج المباشر للفاتورة
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsSolarCalcOpen(false)}
                className="text-slate-400 hover:text-white font-bold text-base cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-5 grid grid-cols-1 md:grid-cols-12 gap-5 text-xs">
              {/* Inputs Column */}
              <div className="md:col-span-6 space-y-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    إجمالي الأحمال الكهربائية المستمرة (Continuous Load Watts):
                  </label>
                  <input
                    type="number"
                    data-testid="input-solar-peak-watts"
                    value={peakLoadWatts}
                    onChange={(e) => setPeakLoadWatts(Math.max(100, Number(e.target.value)))}
                    className="w-full p-2 bg-slate-50 border border-slate-300 rounded-md font-mono tabular-nums font-bold text-slate-900"
                    dir="ltr"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      ساعات التشغيل الاحتياطي (Backup Hours):
                    </label>
                    <input
                      type="number"
                      value={autonomyHours}
                      onChange={(e) => setAutonomyHours(Math.max(1, Number(e.target.value)))}
                      className="w-full p-2 bg-slate-50 border border-slate-300 rounded-md font-mono tabular-nums font-bold text-slate-900"
                      dir="ltr"
                    />
                  </div>
                  <div>
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
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      جهد منظومة البطاريات (DC Bus):
                    </label>
                    <select
                      value={systemVoltage}
                      onChange={(e) => setSystemVoltage(Number(e.target.value) as 12 | 24 | 48)}
                      className="w-full p-2 bg-slate-50 border border-slate-300 rounded-md font-bold text-slate-900"
                    >
                      <option value={48}>48V DC (منظومات منازل ومشاريع)</option>
                      <option value={24}>24V DC (منظومات متوسطة)</option>
                      <option value={12}>12V DC (منظومات صغيرة)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      نوع البطاريات (Chemistry):
                    </label>
                    <select
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
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      قدرة اللوح الشمسي الواحد (Watts):
                    </label>
                    <select
                      value={panelRatingWatts}
                      onChange={(e) => setPanelRatingWatts(Number(e.target.value))}
                      className="w-full p-2 bg-slate-50 border border-slate-300 rounded-md font-mono font-bold text-slate-900"
                    >
                      <option value={585}>585W Jinko N-Type Bifacial</option>
                      <option value={550}>550W Mono PERC Half-Cell</option>
                      <option value={620}>620W Utility Bifacial</option>
                    </select>
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      ساعات الذروة الشمسية (Sun Hours):
                    </label>
                    <input
                      type="number"
                      step="0.5"
                      value={peakSunHours}
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/65 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden">
            {/* Executive Dark Header */}
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                  <CreditCard className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm sm:text-base">
                    طريقة الدفع وإتمام العملية
                  </h3>
                  <p className="text-[11px] text-slate-400">
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
                className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center font-bold transition cursor-pointer"
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

                  <div className="relative">
                    <input
                      type="number"
                      step="any"
                      min="0"
                      value={cashTendered === 0 ? '' : cashTendered}
                      onChange={(e) => setCashTendered(Math.max(0, Number(e.target.value) || 0))}
                      placeholder="0.00"
                      className="w-full px-4 py-3 bg-white border-2 border-slate-300 focus:border-slate-900 rounded-xl font-mono tabular-nums font-black text-xl text-slate-900 outline-hidden transition shadow-inner"
                      dir="ltr"
                    />
                    <span
                      className="absolute end-4 top-3.5 text-xs font-mono font-bold text-slate-400"
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
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">
                      رقم مرجع العملية / التفويض البنكي (Approval / RRN):
                    </label>
                    <input
                      type="text"
                      value={cardReference}
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
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        الجزء المدفوع نقداً (كاش):
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        max={grandTotal}
                        value={splitCashAmount}
                        onChange={(e) => {
                          const val = Math.min(grandTotal, Math.max(0, Number(e.target.value)));
                          setSplitCashAmount(val);
                        }}
                        className="w-full px-3 py-2 bg-white border border-slate-300 focus:border-slate-900 rounded-lg font-mono tabular-nums font-bold text-sm text-slate-900 outline-hidden"
                        dir="ltr"
                      />
                    </div>
                    <div>
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
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">
                      مرجع عملية الشبكة للجزء البنكي (اختياري):
                    </label>
                    <input
                      type="text"
                      value={cardReference}
                      onChange={(e) => setCardReference(e.target.value)}
                      placeholder="رقم إيصال جهاز نقاط البيع..."
                      className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg font-mono text-xs text-slate-800 outline-hidden"
                      dir="ltr"
                    />
                  </div>
                </div>
              )}

              {/* Optional Invoice / Warranty Note */}
              <div>
                <input
                  type="text"
                  value={checkoutNotes}
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
                    onClick={() => handlePerformCheckout(true)}
                    className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl shadow-2xs transition flex items-center gap-1.5 cursor-pointer"
                  >
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    <span>إصدار مع شهادة ضمان A4</span>
                  </button>
                  <button
                    type="button"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-xs p-4">
          <div className="bg-slate-100 rounded-md shadow-xl border border-slate-300 w-full max-w-4xl max-h-[92vh] overflow-hidden flex flex-col">
            {/* Top Template Switcher Toolbar */}
            <div className="px-5 py-3.5 bg-slate-900 text-white flex flex-wrap items-center justify-between gap-3">
              <div>
                <span className="font-bold text-sm">
                  معاينة وطباعة الفاتورة وشهادة الضمان ({completedInvoice.invoiceNumber})
                </span>
                <p className="text-[11px] text-slate-400">
                  اختر القالب المناسب للطباعة (حراري 80mm شهادة ضمان أو فاتورة ضريبية رسمية A4)
                </p>
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
                    className={`px-2.5 py-1 rounded-sm font-bold cursor-pointer transition ${
                      (receiptViewMode === 'thermal' &&
                        (selectedThermalOverride || invoiceTemplateSettings.thermalTemplate) ===
                          opt.tpl) ||
                      (receiptViewMode === 'a4' &&
                        (selectedA4Override || invoiceTemplateSettings.standardTemplate) ===
                          opt.tpl)
                        ? 'bg-teal-500 text-slate-950'
                        : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-xs p-4">
          <div className="bg-slate-900 text-white rounded-md shadow-xl border border-slate-700 w-full max-w-4xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ChefHat className="w-5 h-5 text-amber-400" />
                <h3 className="font-bold text-base">
                  شاشة المطبخ التفاعلية (Kitchen Display System - KDS)
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsKDSModalOpen(false)}
                className="text-slate-400 hover:text-white font-bold text-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-6 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 max-h-[75vh] overflow-y-auto">
              {kitchenTickets.map((ticket) => (
                <div
                  key={ticket.id}
                  className={`rounded-md border p-4 flex flex-col justify-between ${
                    ticket.status === 'PREPARING'
                      ? 'bg-amber-950/40 border-amber-500/50'
                      : ticket.status === 'READY'
                      ? 'bg-emerald-950/40 border-emerald-500/50'
                      : 'bg-slate-800/50 border-slate-700 opacity-75'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between border-b border-white/10 pb-2 mb-3">
                      <div>
                        <span className="font-mono font-bold text-sm text-amber-300">
                          {ticket.kotNumber}
                        </span>
                        <div className="text-xs font-bold text-white mt-0.5">
                          طاولة: {ticket.tableNumber || 'سفري'} · {ticket.orderType}
                        </div>
                      </div>
                      <span className="text-[10px] font-mono bg-white/10 px-2 py-0.5 rounded-xs flex items-center gap-1">
                        <Clock className="w-3 h-3" /> {ticket.createdAt}
                      </span>
                    </div>

                    <div className="space-y-2 mb-4">
                      {ticket.items.map((it, i) => (
                        <div key={i} className="text-xs bg-black/20 p-2 rounded-sm">
                          <div className="font-bold text-white">
                            {it.qty} × {it.name}
                          </div>
                          {it.notes && (
                            <div className="text-[10px] text-amber-300 mt-0.5">
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
                      className={`w-full py-2 rounded-sm text-xs font-bold transition cursor-pointer ${
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
                    <div className="text-center text-xs font-bold text-emerald-400 flex items-center justify-center gap-1">
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl shadow-xl border border-slate-300 w-full max-w-md overflow-hidden">
            <div className="px-5 py-3.5 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Lock className="w-4 h-4 text-emerald-400" />
                <div>
                  <h3 className="font-bold text-sm">
                    إغلاق وتسليم وردية الكاشير (Z-Report)
                  </h3>
                  <p className="text-[10px] text-slate-400">
                    الكاشير: {currentShift.cashierName} • بداية الوردية: {currentShift.startTime}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsCloseShiftModalOpen(false)}
                className="text-slate-400 hover:text-white font-bold text-base cursor-pointer"
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
              <div className="space-y-1.5">
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
                  value={actualCashCount}
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
                  <div className="flex items-center justify-between pt-1 border-t border-slate-200/80">
                    <span className="text-slate-600">عهدة الوردية الجديدة:</span>
                    <input
                      type="number"
                      value={newShiftStartingFloat}
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
