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
} from 'lucide-react';
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
    updatePOSCartQty,
    updatePOSCartItemMeta,
    clearPOSCart,
    checkoutPOS,
    holdBills,
    holdCurrentPOSBill,
    resumePOSBill,
    currentShift,
    closePOSShift,
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

  // Checkout & Cash Denominations
  const [isCheckoutModalOpen, setIsCheckoutModalOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'CARD' | 'SPLIT'>('CASH');
  const [cashTendered, setCashTendered] = useState<number>(0);
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
  const [posBanner, setPosBanner] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Coupon & Promo Discount State
  const [couponInput, setCouponInput] = useState('');
  const [appliedCouponCode, setAppliedCouponCode] = useState<string>('');
  const [couponFeedback, setCouponFeedback] = useState<{
    valid: boolean;
    messageAr: string;
  } | null>(null);

  const showBanner = (type: 'success' | 'error', text: string) => {
    setPosBanner({ type, text });
    setTimeout(() => setPosBanner(null), 4000);
  };

  // Cart Totals with Live Coupon Discount
  const subtotal = posCart.reduce((acc, curr) => acc + curr.quantity * curr.unitPrice, 0);
  const couponEval = useMemo(() => {
    if (!appliedCouponCode || subtotal <= 0) {
      return null;
    }
    return validateCouponForAmount(appliedCouponCode, subtotal);
  }, [appliedCouponCode, subtotal, validateCouponForAmount]);

  const couponDiscountAmount =
    couponEval && couponEval.valid ? couponEval.discountAmount : 0;
  const netTaxable = Math.max(0, subtotal - couponDiscountAmount);
  const effectiveTaxRate = (masterSystemConfig.defaultTaxRatePercent ?? 15) / 100;
  const taxAmount = Math.round(netTaxable * effectiveTaxRate * 100) / 100;
  const grandTotal = Math.round((netTaxable + taxAmount) * 100) / 100;

  const handleApplyCouponCode = (codeToTry?: string) => {
    const targetCode = (codeToTry ?? couponInput).trim().toUpperCase();
    if (!targetCode) return;
    setCouponInput(targetCode);
    const res = validateCouponForAmount(targetCode, subtotal);
    if (res.valid) {
      setAppliedCouponCode(targetCode);
      setCouponFeedback({ valid: true, messageAr: res.reasonAr });
    } else {
      setAppliedCouponCode('');
      setCouponFeedback({ valid: false, messageAr: res.reasonAr });
    }
  };

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
  const handlePerformCheckout = () => {
    try {
      const inv = checkoutPOS(paymentMethod, undefined, {
        orderType: activeIndustry === 'restaurant' ? orderType : 'STANDARD',
        tableNumber:
          activeIndustry === 'restaurant' && orderType === 'DINE_IN'
            ? selectedTable
            : undefined,
        couponCode: appliedCouponCode || undefined,
      });
      setCompletedInvoice(inv);
      setAppliedCouponCode('');
      setCouponInput('');
      setCouponFeedback(null);
      setIsCheckoutModalOpen(false);
      setReceiptViewMode('thermal');
      setSelectedThermalOverride(undefined);
      setIsReceiptModalOpen(true);
    } catch (err: any) {
      showBanner('error', err.message || 'Checkout error');
    }
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
    <div className="p-4 sm:p-6 space-y-4">
      {posBanner && (
        <div
          className={`p-3 rounded-md border text-xs font-semibold flex items-center justify-between ${
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

      {/* Top Shift & POS Control Bar (Clean, Unified, Dedicated to Active Industry) */}
      <div className="bg-white p-3 px-4 rounded-md border border-slate-200 shadow-2xs flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
            <span className="font-bold text-slate-900">
              وردية الكاشير: {currentShift.cashierName}
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

        <div className="flex flex-wrap items-center gap-2">
          {activeIndustry === 'restaurant' && (
            <button
              type="button"
              onClick={() => setIsKDSModalOpen(true)}
              className="bg-amber-50 hover:bg-amber-100 text-amber-950 border border-amber-300 font-bold px-3 py-1.5 rounded-md transition flex items-center gap-1.5 cursor-pointer"
            >
              <ChefHat className="w-4 h-4 text-amber-700" />
              <span>
                شاشة المطبخ KDS (
                <span className="font-mono tabular-nums" dir="ltr">
                  {kitchenTickets.filter((k) => k.status !== 'SERVED').length}
                </span>
                )
              </span>
            </button>
          )}

          <button
            type="button"
            onClick={() => {
              setActualCashCount(currentShift.expectedCash);
              setIsCloseShiftModalOpen(true);
            }}
            className="bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200 font-bold px-3 py-1.5 rounded-md transition flex items-center gap-1.5 cursor-pointer"
          >
            <Lock className="w-3.5 h-3.5 text-slate-600" />
            <span>إغلاق الوردية</span>
          </button>
        </div>
      </div>

      {/* SPECIALIZED ELECTRONICS, SOLAR PANELS, INVERTERS, BATTERIES & SMART SCREENS ENGINEERING BAR */}
      {activeIndustry === 'electronics' && (
        <div className="bg-slate-900 text-white p-3.5 rounded-md border border-slate-800 space-y-3 text-xs">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-md bg-teal-600/20 border border-teal-500/40 flex items-center justify-center text-teal-400 shrink-0">
                <Sun className="w-4 h-4" />
              </div>
              <div>
                <div className="font-bold text-white text-xs flex items-center gap-2">
                  <span>مركز مبيعات الإلكترونيات، الطاقة الشمسية، البطاريات والشاشات الذكية</span>
                  <span className="px-2 py-0.5 rounded-xs bg-teal-950 border border-teal-700 text-teal-300 text-[10px] font-semibold">
                    تفعيل تلقائي لشهادات الضمان والسيريال SN/IMEI
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  ألواح شمسية <span className="font-mono tabular-nums" dir="ltr">585W N-Type</span> · إنفرترات هجينة <span className="font-mono tabular-nums" dir="ltr">5kW / 8kW</span> · بطاريات ليثيوم <span className="font-mono tabular-nums" dir="ltr">LiFePO4 48V 200Ah</span> وجل · شاشات <span className="font-mono tabular-nums" dir="ltr">4K QLED & OLED</span>
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                data-testid="btn-open-solar-calculator"
                onClick={() => setIsSolarCalcOpen(true)}
                className="px-3.5 py-2 rounded-md bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs flex items-center gap-1.5 transition cursor-pointer shadow-2xs"
              >
                <Calculator className="w-4 h-4" />
                <span>حاسبة منظومات الطاقة الشمسية والبطاريات الذكية</span>
              </button>
            </div>
          </div>

          {/* Sub-Category Fast Filter Bar */}
          <div className="flex items-center gap-1.5 overflow-x-auto pt-2 border-t border-slate-800">
            {electronicsSubCategories.map((sub) => (
              <button
                key={sub.id}
                type="button"
                onClick={() => setSelectedElectronicsSubCat(sub.id)}
                className={`px-2.5 py-1 rounded-sm text-[11px] font-semibold whitespace-nowrap transition flex items-center gap-1.5 cursor-pointer ${
                  selectedElectronicsSubCat === sub.id
                    ? 'bg-teal-600 text-white'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white'
                }`}
              >
                <span>{sub.labelAr}</span>
                <span
                  className={`px-1.5 py-0.2 rounded-xs font-mono tabular-nums text-[10px] ${
                    selectedElectronicsSubCat === sub.id
                      ? 'bg-teal-800 text-teal-100'
                      : 'bg-slate-900 text-slate-400'
                  }`}
                  dir="ltr"
                >
                  {sub.count}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* INDUSTRY-SPECIFIC SMART TOOLBAR FOR RESTAURANT */}
      {activeIndustry === 'restaurant' && (
        <div className="bg-slate-900 text-white p-3.5 rounded-md border border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-bold text-amber-400 flex items-center gap-1.5">
              <Utensils className="w-4 h-4" /> وضع المطاعم والضيافة:
            </span>
            {[
              { id: 'DINE_IN', label: 'محلي (طاولات)' },
              { id: 'TAKEAWAY', label: 'سفري (استلام)' },
              { id: 'DELIVERY', label: 'توصيل طلبات' },
            ].map((ot) => (
              <button
                key={ot.id}
                type="button"
                onClick={() => setOrderType(ot.id as any)}
                className={`px-3 py-1.5 rounded-md font-bold transition cursor-pointer ${
                  orderType === ot.id
                    ? 'bg-amber-600 text-white'
                    : 'bg-slate-800 text-slate-200 hover:bg-slate-700'
                }`}
              >
                {ot.label}
              </button>
            ))}
          </div>

          {orderType === 'DINE_IN' && (
            <div className="flex items-center gap-1.5 overflow-x-auto">
              <span className="text-slate-300 font-bold">رقم الطاولة:</span>
              {tablesList.map((tbl) => (
                <button
                  key={tbl}
                  type="button"
                  onClick={() => setSelectedTable(tbl)}
                  className={`px-2.5 py-1 rounded-md font-mono font-bold transition cursor-pointer ${
                    selectedTable === tbl
                      ? 'bg-teal-600 text-white'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  {tbl}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* INDUSTRY-SPECIFIC SMART TOOLBAR FOR GROCERY */}
      {activeIndustry === 'grocery' && (
        <div className="bg-slate-900 text-white p-3.5 rounded-md border border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <Scale className="w-4 h-4 text-teal-400" />
            <span className="font-bold">محاكي الميزان الإلكتروني للتموينات والسوبرماركت (بادئة GS1 21):</span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-slate-300">الوزن بالكيلوجرام:</span>
            {[0.25, 0.5, 0.75, 1.25, 2.0].map((w) => (
              <button
                key={w}
                type="button"
                onClick={() => setScaleWeightKg(w)}
                className={`px-2.5 py-1 rounded-md font-mono font-bold cursor-pointer ${
                  scaleWeightKg === w ? 'bg-teal-600 text-white' : 'bg-slate-800 text-slate-300'
                }`}
              >
                {w} KG
              </button>
            ))}
            <button
              type="button"
              onClick={handleSimulateScaleScan}
              className="px-3.5 py-1.5 rounded-md bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold cursor-pointer"
            >
              قراءة وزن الميزان وإضافة للسلة
            </button>
          </div>
        </div>
      )}

      {/* Held Bills Drawer / Resume Bar */}
      {holdBills.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-md p-2.5 flex items-center gap-2 overflow-x-auto text-xs">
          <span className="font-bold text-amber-950 shrink-0">الفواتير المعلقة:</span>
          {holdBills.map((b) => (
            <button
              key={b.id}
              type="button"
              onClick={() => resumePOSBill(b.id)}
              className="bg-white hover:bg-amber-100 border border-amber-300 text-amber-900 px-3 py-1 rounded-md font-bold flex items-center gap-1.5 shrink-0 transition shadow-2xs cursor-pointer"
            >
              <PlayCircle className="w-3.5 h-3.5 text-amber-600" />
              <span>
                {b.orderNumber} ({b.items.length} أصناف) - {b.savedAt}
              </span>
            </button>
          ))}
        </div>
      )}

      {/* Main Grid: Products Catalog Touch Screen (Left) + Cart Register (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left Column (7 cols): Touch Catalog & Barcode Reader */}
        <div className="lg:col-span-7 space-y-3.5">
          {/* Quick Barcode Scan & Search Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
            <form onSubmit={handleBarcodeSubmit} className="sm:col-span-6 relative">
              <input
                type="text"
                value={barcodeInput}
                onChange={(e) => setBarcodeInput(e.target.value)}
                placeholder="امسح الباركود أو الكود SKU..."
                className="w-full text-xs p-2.5 ps-9 bg-white border border-slate-300 rounded-md font-mono outline-hidden focus:border-slate-900"
              />
              <Barcode className="w-4 h-4 text-slate-700 absolute start-2.5 top-2.5" />
            </form>

            <div className="sm:col-span-6 relative">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="ابحث بالاسم أو المواصفة..."
                className="w-full text-xs p-2.5 ps-9 bg-white border border-slate-200 rounded-md outline-hidden focus:border-slate-900"
              />
              <Search className="w-4 h-4 text-slate-400 absolute start-2.5 top-2.5" />
            </div>
          </div>

          {/* Category Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
            <button
              type="button"
              onClick={() => setSelectedCategory('all')}
              className={`px-3 py-1.5 rounded-md font-bold whitespace-nowrap transition cursor-pointer ${
                selectedCategory === 'all'
                  ? 'bg-slate-900 text-white shadow-2xs'
                  : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
              }`}
            >
              الكل (<span className="font-mono tabular-nums" dir="ltr">{products.length}</span>)
            </button>
            {categories.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setSelectedCategory(c.id)}
                className={`px-3 py-1.5 rounded-md font-bold whitespace-nowrap transition cursor-pointer ${
                  selectedCategory === c.id
                    ? 'bg-teal-700 text-white shadow-2xs'
                    : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                }`}
              >
                {language === 'ar' ? c.nameAr : c.name}
              </button>
            ))}
          </div>

          {/* Product Touch Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-[540px] overflow-y-auto pe-1">
            {filteredProducts.map((p) => (
              <div
                key={p.id}
                onClick={() => addToPOSCart(p, 1)}
                className="bg-white p-3 rounded-md border border-slate-200 hover:border-slate-900 hover:shadow-xs cursor-pointer transition flex flex-col justify-between group select-none"
              >
                <div>
                  <div className="flex items-center justify-between gap-1 mb-1.5">
                    <span className="text-[10px] text-slate-500 font-mono tabular-nums" dir="ltr">
                      {p.sku}
                    </span>
                    {p.warrantyMonths && (
                      <span className="text-[10px] bg-teal-50 text-teal-900 border border-teal-200 px-1.5 py-0.5 rounded-xs font-bold">
                        ضمان <span className="font-mono tabular-nums" dir="ltr">{p.warrantyMonths}</span>ش
                      </span>
                    )}
                    {p.prepTimeMinutes && (
                      <span className="text-[10px] bg-amber-50 text-amber-900 border border-amber-200 px-1.5 py-0.5 rounded-xs font-bold">
                        تحضير <span className="font-mono tabular-nums" dir="ltr">{p.prepTimeMinutes}</span>د
                      </span>
                    )}
                    {p.isWeightedScale && (
                      <span className="text-[10px] bg-emerald-50 text-emerald-900 border border-emerald-200 px-1.5 py-0.5 rounded-xs font-bold">
                        موزون بالكيلو
                      </span>
                    )}
                  </div>

                  <div className="font-bold text-slate-900 text-xs leading-snug group-hover:text-teal-700 transition">
                    {language === 'ar' ? p.nameAr : p.name}
                  </div>

                  {/* Technical Specs Badges for Solar, Inverters, Batteries & Screens */}
                  {(p.powerRatingWatts || p.batteryCapacitySpec || p.screenSizeSpec || p.voltageSpec) && (
                    <div className="flex flex-wrap gap-1 mt-2">
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
                          className="text-[10px] font-mono tabular-nums bg-emerald-50 text-emerald-900 border border-emerald-200 px-1.5 py-0.5 rounded-xs font-semibold"
                          dir="ltr"
                        >
                          {p.batteryCapacitySpec}
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
                </div>

                <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between">
                  <span className="font-bold text-slate-900 text-sm font-mono tabular-nums" dir="ltr">
                    {p.salePrice.toLocaleString()} {currency}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      data-testid={`btn-probe-branches-${p.sku}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        openCrossBranchModal(p.sku);
                      }}
                      className="p-1 hover:bg-indigo-50 text-indigo-600 dark:hover:bg-indigo-950/60 rounded text-[10px] font-bold transition flex items-center gap-0.5"
                      title="فحص توفر الصنف في باقي الفروع والشبكة المحلية (LAN)"
                    >
                      <Network className="w-3.5 h-3.5" />
                    </button>
                    <span
                      className={`text-[10px] font-mono tabular-nums px-1.5 py-0.5 rounded-xs border ${
                        p.stockQty <= p.reorderPoint
                          ? 'bg-amber-50 text-amber-900 border-amber-200 font-bold'
                          : 'bg-slate-50 text-slate-600 border-slate-200'
                      }`}
                      dir="ltr"
                    >
                      {p.stockQty} {p.uom}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Column (5 cols): Live POS Cart & Register Checkout */}
        <div className="lg:col-span-5 bg-white rounded-md border border-slate-200 shadow-2xs p-4 flex flex-col justify-between min-h-[560px]">
          {/* Cart Header */}
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <div className="flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-slate-900" />
              <div>
                <h2 className="font-bold text-slate-900 text-sm">سلة المبيعات وشهادات الضمان</h2>
                {activeIndustry === 'electronics' && (
                  <span className="text-[10px] text-teal-700 font-semibold">
                    توثيق الأرقام التسلسلية (SN / IMEI) للألواح والبطاريات والشاشات
                  </span>
                )}
                {activeIndustry === 'restaurant' && (
                  <span className="text-[10px] text-amber-700 font-bold">
                    {orderType === 'DINE_IN' ? `طاولة ${selectedTable} (محلي)` : orderType}
                  </span>
                )}
              </div>
            </div>
            {posCart.length > 0 && (
              <button
                type="button"
                onClick={clearPOSCart}
                className="text-rose-700 hover:text-rose-900 text-xs font-semibold flex items-center gap-1 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>تفريغ السلة</span>
              </button>
            )}
          </div>

          {/* Cart Items List with Sector-Specific Inline Controls */}
          <div className="flex-1 overflow-y-auto py-3 space-y-2.5 max-h-[360px]">
            {posCart.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-400 text-xs space-y-2 py-12">
                <Barcode className="w-9 h-9 text-slate-300 stroke-1" />
                <span>السلة فارغة. انقر على الأصناف أو استخدم حاسبة الطاقة الشمسية للبدء</span>
              </div>
            ) : (
              posCart.map((item) => (
                <div
                  key={item.productId}
                  className="p-2.5 rounded-md bg-slate-50 border border-slate-200 text-xs space-y-2"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-slate-900 truncate">{item.productName}</div>
                      <div className="text-[10px] text-slate-500 font-mono tabular-nums" dir="ltr">
                        {item.unitPrice.toLocaleString()} {currency} × {item.quantity} (+15% VAT)
                      </div>
                    </div>

                    {/* Quantity Controls */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => updatePOSCartQty(item.productId, item.quantity - 1)}
                        className="w-6 h-6 rounded-xs bg-white border border-slate-300 text-slate-700 flex items-center justify-center font-bold hover:bg-slate-100 cursor-pointer"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="w-8 text-center font-bold font-mono tabular-nums text-slate-900" dir="ltr">
                        {item.quantity}
                      </span>
                      <button
                        type="button"
                        onClick={() => updatePOSCartQty(item.productId, item.quantity + 1)}
                        className="w-6 h-6 rounded-xs bg-white border border-slate-300 text-slate-700 flex items-center justify-center font-bold hover:bg-slate-100 cursor-pointer"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>

                  {/* Item Total & Cross Branch Probe */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => openCrossBranchModal(item.sku)}
                      className="p-1 hover:bg-indigo-50 text-indigo-600 rounded text-[10px] font-bold"
                      title="فحص توفر هذا الصنف في الفروع الأخرى"
                    >
                      <Network className="w-3.5 h-3.5" />
                    </button>
                    <div className="w-20 text-end font-bold font-mono tabular-nums text-slate-900" dir="ltr">
                      {item.total.toFixed(2)} {currency}
                    </div>
                    </div>
                  </div>

                  {/* Electronics / Solar / Battery Serial / IMEI Editor */}
                  {(activeIndustry === 'electronics' || item.serialNumber || item.warrantyMonths) && (
                    <div className="flex items-center gap-2 pt-1.5 border-t border-slate-200/80">
                      <ShieldCheck className="w-3.5 h-3.5 text-teal-700 shrink-0" />
                      <input
                        type="text"
                        value={item.serialNumber || ''}
                        onChange={(e) =>
                          updatePOSCartItemMeta(item.productId, { serialNumber: e.target.value })
                        }
                        placeholder="الرقم التسلسلي للضمان SN / IMEI..."
                        className="flex-1 bg-white border border-slate-200 rounded-xs px-2 py-0.5 text-[10px] font-mono tabular-nums"
                        dir="ltr"
                      />
                      <span className="text-[10px] bg-teal-50 text-teal-900 border border-teal-200 px-1.5 py-0.5 rounded-xs font-bold shrink-0">
                        ضمان <span className="font-mono tabular-nums" dir="ltr">{item.warrantyMonths || 24}</span> شهر
                      </span>
                    </div>
                  )}

                  {/* Engineering / Kitchen Note Display */}
                  {item.kitchenNotes && activeIndustry !== 'restaurant' && (
                    <div className="text-[10px] text-slate-600 font-medium pt-0.5">
                      البيان الفني: {item.kitchenNotes}
                    </div>
                  )}

                  {/* Restaurant Kitchen Notes Quick Picker */}
                  {activeIndustry === 'restaurant' && (
                    <div className="pt-1 border-t border-slate-200/70 space-y-1">
                      <div className="flex flex-wrap gap-1">
                        {quickKitchenNotes.map((note) => (
                          <button
                            key={note}
                            type="button"
                            onClick={() =>
                              updatePOSCartItemMeta(item.productId, {
                                kitchenNotes: item.kitchenNotes
                                  ? `${item.kitchenNotes}، ${note}`
                                  : note,
                              })
                            }
                            className="text-[9px] bg-amber-50 hover:bg-amber-100 text-amber-950 border border-amber-200 px-1.5 py-0.5 rounded-xs font-bold cursor-pointer"
                          >
                            + {note}
                          </button>
                        ))}
                      </div>
                      {item.kitchenNotes && (
                        <div className="text-[10px] text-amber-900 font-bold">
                          ملاحظة للمطبخ: {item.kitchenNotes}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Pharmacy Batch & Expiry Info */}
                  {(activeIndustry === 'pharmacy' || item.batchNumber || item.expiryDate) && (
                    <div className="flex items-center justify-between text-[10px] pt-1 border-t border-slate-200/70 text-slate-700">
                      <span className="flex items-center gap-1 font-semibold">
                        <Pill className="w-3 h-3 text-teal-700" /> تشغيلة:{' '}
                        <span className="font-mono tabular-nums" dir="ltr">
                          {item.batchNumber || 'LOT-2026-A'}
                        </span>
                      </span>
                      {item.expiryDate && (
                        <span className="font-mono tabular-nums font-semibold" dir="ltr">
                          EXP: {item.expiryDate}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>

          {/* Cart Bottom Summary, Coupon Box & Checkout Buttons */}
          <div className="border-t border-slate-200 pt-3 space-y-3">
            {/* Coupon & Promotional Offers Input Box */}
            {masterSystemConfig.uiElementsVisibility.showCouponsAndPromotions && (
              <div className="p-2.5 rounded-md bg-slate-50 border border-slate-200 space-y-2">
                <div className="flex items-center gap-1.5">
                  <input
                    type="text"
                    data-testid="pos-coupon-input"
                    value={couponInput}
                    onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                    placeholder="أدخل كود كوبون الخصم (مثال: SOLAR10 أو VIP250)..."
                    className="flex-1 px-2.5 py-1.5 rounded bg-white border border-slate-300 text-xs font-mono font-bold uppercase outline-hidden focus:border-slate-900"
                  />
                  <button
                    type="button"
                    data-testid="pos-apply-coupon-btn"
                    disabled={posCart.length === 0}
                    onClick={() => handleApplyCouponCode()}
                    className="px-3 py-1.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold disabled:opacity-40 cursor-pointer"
                  >
                    تطبيق الكوبون
                  </button>
                  {appliedCouponCode && (
                    <button
                      type="button"
                      onClick={() => {
                        setAppliedCouponCode('');
                        setCouponInput('');
                        setCouponFeedback(null);
                      }}
                      className="px-2 py-1.5 rounded bg-rose-100 text-rose-700 text-xs font-bold cursor-pointer"
                    >
                      ✕
                    </button>
                  )}
                </div>

                {/* Quick Active Coupons Bar */}
                <div className="flex flex-wrap items-center gap-1 text-[10px]">
                  <span className="text-slate-500 font-bold">كوبونات متاحة:</span>
                  {promoCoupons
                    .filter((c) => c.isActive)
                    .slice(0, 4)
                    .map((cpn) => (
                      <button
                        key={cpn.id}
                        type="button"
                        data-testid={`pos-quick-coupon-${cpn.code}`}
                        disabled={posCart.length === 0}
                        onClick={() => handleApplyCouponCode(cpn.code)}
                        className={`px-2 py-0.5 rounded font-mono font-bold border transition cursor-pointer disabled:opacity-40 ${
                          appliedCouponCode === cpn.code
                            ? 'bg-emerald-600 text-white border-emerald-600'
                            : 'bg-white text-slate-700 border-slate-300 hover:border-emerald-500'
                        }`}
                      >
                        {cpn.code} (
                        {cpn.discountType === 'PERCENTAGE'
                          ? `${cpn.discountValue}%`
                          : `${cpn.discountValue} ${currency}`}
                        )
                      </button>
                    ))}
                </div>

                {couponFeedback && (
                  <div
                    data-testid="pos-coupon-feedback"
                    className={`text-[11px] font-bold ${
                      couponFeedback.valid ? 'text-emerald-700' : 'text-rose-600'
                    }`}
                  >
                    {couponFeedback.messageAr}
                  </div>
                )}
              </div>
            )}

            <div className="space-y-1 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>المجموع الفرعي (قبل الضريبة):</span>
                <span className="font-semibold font-mono tabular-nums" dir="ltr">
                  {subtotal.toFixed(2)} {currency}
                </span>
              </div>
              {couponDiscountAmount > 0 && (
                <div
                  data-testid="pos-coupon-discount-row"
                  className="flex justify-between text-emerald-700 font-bold"
                >
                  <span>خصم الكوبون الترويجي ({appliedCouponCode}):</span>
                  <span className="font-mono tabular-nums" dir="ltr">
                    -{couponDiscountAmount.toFixed(2)} {currency}
                  </span>
                </div>
              )}
              <div className="flex justify-between text-slate-600">
                <span>ضريبة القيمة المضافة ({masterSystemConfig.defaultTaxRatePercent}%):</span>
                <span className="font-semibold font-mono tabular-nums" dir="ltr">
                  {taxAmount.toFixed(2)} {currency}
                </span>
              </div>
              <div className="flex justify-between font-bold text-slate-900 text-base pt-1.5 border-t border-slate-200">
                <span>الإجمالي المستحق (شامل الضريبة):</span>
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
            <div className="grid grid-cols-12 gap-2">
              <button
                type="button"
                disabled={posCart.length === 0}
                onClick={() => holdCurrentPOSBill(undefined, selectedTable)}
                className="col-span-3 py-2.5 bg-amber-50 hover:bg-amber-100 text-amber-950 border border-amber-300 font-bold text-xs rounded-md transition flex items-center justify-center gap-1 disabled:opacity-40 cursor-pointer"
              >
                <PauseCircle className="w-4 h-4 text-amber-700" />
                <span>تعليق</span>
              </button>

              {activeIndustry === 'restaurant' && (
                <button
                  type="button"
                  disabled={posCart.length === 0}
                  onClick={handleSendToKitchen}
                  className="col-span-4 py-2.5 bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs rounded-md transition flex items-center justify-center gap-1 disabled:opacity-40 cursor-pointer"
                >
                  <ChefHat className="w-4 h-4" />
                  <span>إرسال للمطبخ KOT</span>
                </button>
              )}

              <button
                type="button"
                disabled={posCart.length === 0}
                onClick={() => {
                  setPaymentMethod('CASH');
                  setCashTendered(Math.ceil(grandTotal));
                  setIsCheckoutModalOpen(true);
                }}
                className={`${
                  activeIndustry === 'restaurant' ? 'col-span-5' : 'col-span-9'
                } py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm rounded-md shadow-2xs transition flex items-center justify-center gap-2 disabled:opacity-40 cursor-pointer`}
              >
                <CreditCard className="w-4 h-4" />
                <span>دفع وإصدار الفاتورة وشهادة الضمان</span>
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
          CHECKOUT MODAL (With Quick Cash Denominations & Change Calculator)
      ==================================================================== */}
      {isCheckoutModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-md shadow-xl border border-slate-300 w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <h3 className="font-bold text-base text-slate-900">طريقة الدفع وإتمام العملية</h3>
              <button
                type="button"
                onClick={() => setIsCheckoutModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 font-bold text-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-md text-center">
                <span className="text-slate-600 text-xs">المبلغ الإجمالي المستحق:</span>
                <div className="text-2xl font-bold font-mono tabular-nums text-emerald-700 mt-1" dir="ltr">
                  {grandTotal.toFixed(2)} {currency}
                </div>
              </div>

              {/* Payment Method Selector */}
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'CASH', labelAr: masterSystemConfig.cashPaymentLabelAr || 'نقداً (كاش)' },
                  {
                    id: 'CARD',
                    labelAr:
                      masterSystemConfig.cardPaymentLabelAr ||
                      'بطاقة بنكية / دفع إلكتروني (POS Card)',
                  },
                  { id: 'SPLIT', labelAr: 'دفع مختلط / متعدد' },
                ].map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setPaymentMethod(m.id as any)}
                    className={`p-3 rounded-md border text-xs font-bold text-center transition cursor-pointer ${
                      paymentMethod === m.id
                        ? 'bg-slate-900 text-white border-slate-900'
                        : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    {m.labelAr}
                  </button>
                ))}
              </div>

              {/* Cash Denominations & Change Calculator */}
              {paymentMethod === 'CASH' && (
                <div className="p-3.5 rounded-md bg-slate-50 border border-slate-200 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-700">المبلغ المستلم من العميل:</span>
                    <input
                      type="number"
                      value={cashTendered}
                      onChange={(e) => setCashTendered(Number(e.target.value))}
                      className="w-28 px-2.5 py-1 bg-white border border-slate-300 rounded-md font-mono tabular-nums font-bold text-sm text-center"
                      dir="ltr"
                    />
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {[50, 100, 500, 1000, 5000].map((denom) => (
                      <button
                        key={denom}
                        type="button"
                        onClick={() => setCashTendered(denom)}
                        className="flex-1 py-1 bg-white hover:bg-slate-100 border border-slate-300 rounded-sm font-mono tabular-nums font-bold text-slate-800 cursor-pointer"
                        dir="ltr"
                      >
                        {denom}
                      </button>
                    ))}
                  </div>
                  <div className="flex justify-between pt-2 border-t border-slate-200 font-bold text-sm">
                    <span>الباقي للعميل (Change):</span>
                    <span
                      className={`font-mono tabular-nums ${
                        cashTendered - grandTotal >= 0 ? 'text-emerald-700' : 'text-rose-700'
                      }`}
                      dir="ltr"
                    >
                      {Math.max(0, cashTendered - grandTotal).toFixed(2)} {currency}
                    </span>
                  </div>
                </div>
              )}

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsCheckoutModalOpen(false)}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-md transition cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="button"
                  onClick={handlePerformCheckout}
                  className="px-6 py-2.5 bg-emerald-700 hover:bg-emerald-600 text-white font-bold rounded-md shadow-2xs transition cursor-pointer"
                >
                  تأكيد الدفع وإصدار الفاتورة
                </button>
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
                  { mode: 'thermal', tpl: 'thermal_80mm_restaurant', label: 'حراري 80mm مطعم' },
                  { mode: 'thermal', tpl: 'thermal_58mm_compact', label: 'حراري 58mm بقالة' },
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

      {/* Close Shift Modal */}
      {isCloseShiftModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-md shadow-xl border border-slate-300 w-full max-w-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <h3 className="font-bold text-base text-slate-900">إغلاق وتسليم وردية الكاشير</h3>
              <button
                type="button"
                onClick={() => setIsCloseShiftModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 font-bold text-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div className="space-y-1 bg-slate-50 p-3 rounded-md border border-slate-200">
                <div className="flex justify-between">
                  <span className="text-slate-500">عهدة البداية:</span>
                  <span className="font-bold font-mono tabular-nums" dir="ltr">
                    {currentShift.startingCash} {currency}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">مبيعات الكاش:</span>
                  <span className="font-bold text-emerald-700 font-mono tabular-nums" dir="ltr">
                    +{currentShift.cashSales} {currency}
                  </span>
                </div>
                <div className="flex justify-between border-t border-slate-200 pt-1 font-bold text-slate-900">
                  <span>النقدية المتوقعة بالدرج:</span>
                  <span className="font-mono tabular-nums" dir="ltr">
                    {currentShift.expectedCash} {currency}
                  </span>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  العد الفعلي للنقدية بالدرج:
                </label>
                <input
                  type="number"
                  value={actualCashCount}
                  onChange={(e) => setActualCashCount(Number(e.target.value))}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-md text-sm font-bold font-mono tabular-nums outline-hidden"
                  dir="ltr"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsCloseShiftModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-md transition cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="button"
                  onClick={() => {
                    closePOSShift(actualCashCount);
                    setIsCloseShiftModalOpen(false);
                    showBanner('success', 'تم إغلاق وتسجيل الوردية بنجاح');
                  }}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-md shadow-2xs transition cursor-pointer"
                >
                  تأكيد إغلاق الوردية
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
