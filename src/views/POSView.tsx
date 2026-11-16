import React, { useState, useMemo, useRef, useEffect, useCallback, Suspense, lazy } from 'react';
import { useERP } from '../context/ERPContext';
import {
  CreditCard,
  Barcode,
  Search,
  Trash2,
  PauseCircle,
  PlayCircle,
  Printer,
  Lock,
  Play,
  CheckCircle2,
  Clock,
  Zap,
  Calculator,
  ShieldCheck,
  Filter,
  MessageSquare,
  Smartphone,
  Package,
  Camera,
  ChevronDown,
  Image as ImageIcon,
  LayoutGrid,
  LayoutList,
  ShoppingCart,
  UserCheck,
  Users,
  Pin,
  EyeOff,
  ChefHat,
  Columns2,
} from 'lucide-react';
import type { ScannedBatchItem } from '../components/common/CameraBarcodeScannerModal';
import { WorkspaceTabResizerBar } from '../components/common/WorkspaceTabResizerBar';
import { SplitPaneRatioMode, resolveSplitPaneLayout } from '../core/workspaceLayoutEngine';
import { HasebBrandLogo } from '../components/common/HasebBrandLogo';
import {
  SalesInvoice,
  ThermalTemplateType,
  StandardInvoiceTemplateType,
  ElectronicsSubCategory,
  Product,
} from '../types/erp';
import {
  parseWeightedScaleBarcode,
  generateUniqueSerialNumber,
} from '../core/barcodeEngine';
import type { SolarSystemSizingOutput } from '../core/inventoryEngine';
import { formatCleanNumber } from '../core/systemConfigEngine';
import { composeInvoiceMessageText } from '../core/messagingEngine';
import {
  buildOrderedPosFieldIds,
  computeNextPosTabStopIndex,
  resolvePosActiveFieldLabel,
  evaluatePosCartVisibility,
  buildCartQuantityLookupMap,
  sumCartItemQuantities,
  computeMobilePosLayoutMetrics,
  MobilePosViewMode,
  MobilePosSplitBalance,
  DEFAULT_WALKIN_CUSTOMER_LABEL_AR,
} from '../core/posKeyboardNavigation';
import { POSProductCard } from '../components/pos/POSProductCard';
import { POSCartItemRow } from '../components/pos/POSCartItemRow';
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
const InvoiceRenderer = lazy(() =>
  import('../components/invoices/InvoiceRenderer').then((m) => ({
    default: m.InvoiceRenderer,
  }))
);
const POSCustomerPickerModal = lazy(() => import('../components/pos/POSCustomerPickerModal'));
const POSSolarCalculatorModal = lazy(() => import('../components/pos/POSSolarCalculatorModal'));

const POSModalLoadingFallback: React.FC = () => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs">
    <div className="bg-white rounded-2xl px-6 py-4 shadow-xl border border-slate-200 flex items-center gap-3 text-xs font-bold text-slate-800">
      <HasebBrandLogo size="sm" />
      <div className="space-y-1">
        <div>جاري تجهيز النافذة...</div>
        <div className="w-24 h-1 rounded-full bg-slate-200 overflow-hidden">
          <div className="w-12 h-full rounded-full haseb-shimmer-bar" />
        </div>
      </div>
    </div>
  </div>
);

export const POSView: React.FC = React.memo(() => {
  const {
    products,
    updateProduct,
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
    openShiftModal,
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
    addCustomer,
    setActiveTab,
  } = useERP();

  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedElectronicsSubCat, setSelectedElectronicsSubCat] = useState<ElectronicsSubCategory | 'ALL'>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [barcodeInput, setBarcodeInput] = useState('');
  const [posDisplayMode, setPosDisplayMode] = useState<'WITH_IMAGES' | 'DATA_ONLY'>('WITH_IMAGES');
  const [mobilePosPane, setMobilePosPane] = useState<MobilePosViewMode>('CATALOG');
  const [mobileSplitBalance, setMobileSplitBalance] = useState<MobilePosSplitBalance>('BALANCED_50_50');
  const [isMobileSplitCustomerExpanded, setIsMobileSplitCustomerExpanded] = useState<boolean>(false);

  // Solar & Battery Engineering Calculator Modal State (calculation state lives inside lazy modal)
  const [isSolarCalcOpen, setIsSolarCalcOpen] = useState(false);

  // Restaurant Mode States
  const [orderType] = useState<'DINE_IN' | 'TAKEAWAY' | 'DELIVERY' | 'STANDARD'>(
    activeIndustry === 'restaurant' ? 'DINE_IN' : 'STANDARD'
  );
  const [selectedTable] = useState<string>('T-01');
  const [isKDSModalOpen, setIsKDSModalOpen] = useState(false);

  // Live Camera Barcode Scanner State
  const [isCameraScannerOpen, setIsCameraScannerOpen] = useState(false);

  // Checkout & Payment Settlement State
  const [isCheckoutModalOpen, setIsCheckoutModalOpen] = useState(false);
  const [isQuickNumpadOpen, setIsQuickNumpadOpen] = useState(false);
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

  const [posBanner, setPosBanner] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const showBanner = useCallback((type: 'success' | 'error', text: string) => {
    setPosBanner({ type, text });
    setTimeout(() => setPosBanner(null), 4000);
  }, []);

  // Customer & Warranty Beneficiary State in POS Cart (Defaults to Walk-in Cash Customer: "عميل نقدي عام")
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('cust-pos-walkin');
  const [warrantyCustomerName, setWarrantyCustomerName] = useState<string>(DEFAULT_WALKIN_CUSTOMER_LABEL_AR);
  const [warrantyCustomerPhone, setWarrantyCustomerPhone] = useState<string>('');

  // Fast Beneficiary Customer Picker Modal (Triggered by clicking "العميل المستفيد" tab or pressing F8)
  const [isCustomerPickerOpen, setIsCustomerPickerOpen] = useState<boolean>(false);

  // Double-Tap Quick Actions Sheet State for POS Product Cards & Cart Items
  const [posQuickActionTarget, setPosQuickActionTarget] = useState<MobileQuickActionTarget | null>(
    null
  );

  const handleOpenProductQuickActions = useCallback(
    (product: Product) => {
      setPosQuickActionTarget({
        contextType: 'POS_PRODUCT',
        itemId: product.sku,
        productId: product.id,
        sku: product.sku,
        titleAr: product.nameAr || product.name,
        subtitleAr: `السعر: ${formatCleanNumber(product.salePrice)} ${currency} • المتوفر: ${product.stockQty}`,
        badgeAr: product.sku,
      });
    },
    [currency]
  );

  const handleOpenCartItemQuickActions = useCallback(
    (item: { productId: string; sku: string; productName: string; quantity: number; unitPrice: number }) => {
      setPosQuickActionTarget({
        contextType: 'POS_CART_ITEM',
        itemId: item.productId,
        productId: item.productId,
        sku: item.sku,
        titleAr: item.productName,
        subtitleAr: `الكمية الحالية: ${item.quantity} • سعر الوحدة: ${formatCleanNumber(item.unitPrice)} ${currency}`,
        badgeAr: `×${item.quantity}`,
      });
    },
    [currency]
  );

  const handleSelectPosQuickAction = useCallback(
    (action: MobileQuickActionDescriptor, target: MobileQuickActionTarget) => {
      if (target.contextType === 'POS_PRODUCT') {
        const prod = products.find((p) => p.id === target.productId || p.sku === target.sku);
        if (!prod) return;
        if (action.id === 'pos-prod-add-1') {
          addToPOSCart(prod, 1);
          showBanner('success', `تمت إضافة قطعة واحدة (+1) من (${prod.nameAr}) للسلة`);
        } else if (action.id === 'pos-prod-add-5') {
          addToPOSCart(prod, 5);
          showBanner('success', `تمت إضافة (5) وحدات من (${prod.nameAr}) للسلة دفعة واحدة`);
        } else if (action.id === 'pos-prod-probe') {
          openCrossBranchModal(prod.sku);
        } else if (action.id === 'pos-prod-whatsapp') {
          openQuickSendModal({
            channel: 'WHATSAPP',
            category: 'INVOICE',
            recipientName: warrantyCustomerName,
            recipientPhone: warrantyCustomerPhone,
            referenceNumber: prod.sku,
            messageBody: `🌟 *عرض سعر رسمي — ${company.nameAr || 'حاسب ERP'}*\nالصنف: *${prod.nameAr}*\nالكود: ${prod.sku}\nالسعر النقدي: *${formatCleanNumber(prod.salePrice)} ${currency}*\nالضمان المعتمد: ${prod.warrantyMonths || 12} شهر`,
          });
        }
        return;
      }

      if (target.contextType === 'POS_CART_ITEM' && target.productId) {
        const cartItem = posCart.find((it) => it.productId === target.productId);
        if (!cartItem) return;
        if (action.id === 'cart-item-inc') {
          updatePOSCartQty(cartItem.productId, cartItem.quantity + 1);
          showBanner('success', `تمت زيادة كمية (${cartItem.productName}) إلى ${cartItem.quantity + 1}`);
        } else if (action.id === 'cart-item-double') {
          const doubled = Math.max(2, cartItem.quantity * 2);
          updatePOSCartQty(cartItem.productId, doubled);
          showBanner('success', `تمت مضاعفة كمية (${cartItem.productName}) إلى ${doubled}`);
        } else if (action.id === 'cart-item-focus-sn') {
          const snField = `pos-cart-serial-${cartItem.productId}`;
          setActivePosFieldId(snField);
          setTimeout(() => {
            const el = document.querySelector(`[data-testid="${snField}"]`) as HTMLInputElement | null;
            el?.focus();
          }, 60);
        } else if (action.id === 'cart-item-remove') {
          removeFromPOSCart(cartItem.productId);
          showBanner('success', `تم حذف (${cartItem.productName}) من السلة`);
        }
      }
    },
    [
      products,
      posCart,
      addToPOSCart,
      updatePOSCartQty,
      removeFromPOSCart,
      openCrossBranchModal,
      openQuickSendModal,
      warrantyCustomerName,
      warrantyCustomerPhone,
      company.nameAr,
      currency,
      showBanner,
    ]
  );

  const handleSelectBeneficiaryCustomer = useCallback(
    (cust: {
      id: string;
      nameAr: string;
      name?: string;
      phone?: string;
    }) => {
      setSelectedCustomerId(cust.id);
      setWarrantyCustomerName(cust.nameAr || cust.name || DEFAULT_WALKIN_CUSTOMER_LABEL_AR);
      setWarrantyCustomerPhone(cust.phone || '');
      setIsCustomerPickerOpen(false);
      showBanner(
        'success',
        `تم اختيار العميل المستفيد للفاتورة: ${cust.nameAr || cust.name || DEFAULT_WALKIN_CUSTOMER_LABEL_AR}`
      );
    },
    [showBanner]
  );

  const handleQuickCreateAndSelectCustomer = useCallback(
    (cleanName: string, cleanPhone: string) => {
      addCustomer({
        code: `CUST-${Math.floor(1000 + Math.random() * 9000)}`,
        name: cleanName,
        nameAr: cleanName,
        phone: cleanPhone,
        email: '',
        taxNumber: '',
        creditLimit: 500000,
        balance: 0,
        loyaltyPoints: 0,
      });
      setWarrantyCustomerName(cleanName);
      setWarrantyCustomerPhone(cleanPhone);
      setIsCustomerPickerOpen(false);
      showBanner('success', `تم تسجيل واختيار العميل الجديد للفاتورة: ${cleanName}`);
    },
    [addCustomer, showBanner]
  );

  // Smart POS Cart Auto-Hide / Auto-Show & Permanent Pin State
  // By default: hidden when cart is empty, immediately shown when an item is added, or permanently pinned open
  const [isCartPinnedOpen, setIsCartPinnedOpen] = useState<boolean>(false);
  const [isCartManuallyShownWhenEmpty, setIsCartManuallyShownWhenEmpty] = useState<boolean>(false);
  const prevCartLenRef = useRef<number>(posCart.length);

  useEffect(() => {
    // When cart transitions from having items (>0) to empty (0), auto-hide unless pinned
    if (prevCartLenRef.current > 0 && posCart.length === 0) {
      setIsCartManuallyShownWhenEmpty(false);
    }
    prevCartLenRef.current = posCart.length;
  }, [posCart.length]);

  const cartVisibility = useMemo(
    () =>
      evaluatePosCartVisibility({
        cartItemCount: posCart.length,
        isCartPinnedOpen,
        isCartManuallyShownWhenEmpty,
      }),
    [posCart.length, isCartPinnedOpen, isCartManuallyShownWhenEmpty]
  );

  // Cart Discount State (Percent vs Fixed Amount) & Resizable Split-Pane State
  const [discountType, setDiscountType] = useState<'PERCENT' | 'AMOUNT'>('PERCENT');
  const [discountValue, setDiscountValue] = useState<number | ''>('');
  const [posSplitMode, setPosSplitMode] = useState<SplitPaneRatioMode>('BALANCED');
  const [isDiscountPanelOpen, setIsDiscountPanelOpen] = useState<boolean>(false);
  const posSplitLayout = useMemo(() => resolveSplitPaneLayout(posSplitMode, 'POS'), [posSplitMode]);

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

  const focusPosFieldById = useCallback((fieldId: string) => {
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
  }, []);

  // Auto-focus Barcode Scanner field when POS mounts
  useEffect(() => {
    const timer = setTimeout(() => {
      focusPosFieldById('pos-barcode-input');
    }, 60);
    return () => clearTimeout(timer);
  }, [focusPosFieldById]);

  // O(1) Cart Lookup & Total Quantities
  const cartQtyByProductId = useMemo(
    () => buildCartQuantityLookupMap(posCart),
    [posCart]
  );
  const cartTotalUnits = useMemo(() => sumCartItemQuantities(posCart), [posCart]);
  const mobilePosLayout = useMemo(
    () => computeMobilePosLayoutMetrics(mobilePosPane, cartTotalUnits, mobileSplitBalance),
    [mobilePosPane, cartTotalUnits, mobileSplitBalance]
  );

  // Cart Totals with Live Discount (Percent or Fixed Amount)
  const subtotal = useMemo(
    () => posCart.reduce((acc, curr) => acc + curr.quantity * curr.unitPrice, 0),
    [posCart]
  );

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

  // Memoized Filtered Products for touch grid - Strictly limited to active industry
  const filteredProducts = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return products.filter((p) => {
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
        !q ||
        p.name.toLowerCase().includes(q) ||
        p.nameAr.includes(searchTerm) ||
        p.sku.toLowerCase().includes(q) ||
        p.barcode.includes(searchTerm);
      return matchesCat && matchesSubCat && matchesInd && matchesSearch;
    });
  }, [products, selectedCategory, activeIndustry, selectedElectronicsSubCat, searchTerm]);

  // Memoized Product Card & Cart Row Callbacks
  const handleAddProductToCart = useCallback(
    (product: Product) => {
      addToPOSCart(product, 1);
    },
    [addToPOSCart]
  );

  const handleUpdateProductImage = useCallback(
    (product: Product, imageDataUri: string) => {
      updateProduct({ ...product, imageUrl: imageDataUri });
      showBanner('success', `تم تحديث صورة الصنف: ${product.nameAr}`);
    },
    [updateProduct, showBanner]
  );

  const handleProbeBranches = useCallback(
    (sku: string) => {
      openCrossBranchModal(sku);
    },
    [openCrossBranchModal]
  );

  const handleRemoveCartItem = useCallback(
    (productId: string) => {
      removeFromPOSCart(productId);
    },
    [removeFromPOSCart]
  );

  const handleUpdateCartQty = useCallback(
    (productId: string, newQty: number) => {
      updatePOSCartQty(productId, newQty);
    },
    [updatePOSCartQty]
  );

  const handleUpdateCartMeta = useCallback(
    (productId: string, meta: { serialNumber?: string; warrantyMonths?: number }) => {
      updatePOSCartItemMeta(productId, meta);
    },
    [updatePOSCartItemMeta]
  );

  const handleFocusCartField = useCallback((fieldId: string) => {
    setActivePosFieldId(fieldId);
  }, []);

  // Fast Barcode Input Handler (Supports GS1 Prefix 21 Weight-Embedded & Prefix 20 Price-Embedded Scale Barcodes)
  const handleBarcodeSubmit = useCallback(
    (e: React.FormEvent) => {
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
    },
    [barcodeInput, products, addToPOSCart, currency, language, showBanner]
  );

  // Live Camera Barcode Handler (Single Mode)
  const handleCameraBarcodeScan = useCallback(
    (scannedCode: string, matchedProduct?: any, qty = 1) => {
      if (matchedProduct) {
        addToPOSCart(matchedProduct, qty);
        showBanner(
          'success',
          `تم مسح وإضافة الصنف عبر الكاميرا: ${matchedProduct.nameAr || matchedProduct.name}`
        );
        return;
      }

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
    },
    [addToPOSCart, currency, language, products, showBanner]
  );

  // Live Camera Batch Barcode Handler (Continuous Mode)
  const handleCameraBatchScanComplete = useCallback(
    (batchItems: ScannedBatchItem[]) => {
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
    },
    [addToPOSCart, language, showBanner]
  );

  // Perform Checkout
  const handlePerformCheckout = useCallback(
    (preferA4Warranty = false) => {
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
    },
    [
      checkoutPOS,
      paymentMethod,
      selectedCustomerId,
      activeIndustry,
      orderType,
      selectedTable,
      calculatedDiscountAmount,
      discountType,
      discountValue,
      warrantyCustomerName,
      warrantyCustomerPhone,
      splitCashAmount,
      cardReference,
      checkoutNotes,
      showBanner,
    ]
  );

  // Preview Live Warranty Certificate Draft before payment
  const handlePreviewDraftWarrantyCertificate = useCallback(() => {
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
            ? `خصم ${formatCleanNumber(Number(discountValue) || 0)}%`
            : `خصم نقدي (${formatCleanNumber(calculatedDiscountAmount)} ${currency})`
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
  }, [
    posCart,
    customers,
    selectedCustomerId,
    warrantyCustomerName,
    warrantyCustomerPhone,
    language,
    currentTenant.code,
    currentTenant.id,
    currentBranch.id,
    subtotal,
    calculatedDiscountAmount,
    discountType,
    discountValue,
    currency,
    taxAmount,
    grandTotal,
    paymentMethod,
    activeIndustry,
  ]);

  const handleApplySolarKitToCart = useCallback(
    (solarSizingResult: SolarSystemSizingOutput) => {
      const res = addSolarSystemKitToPOSCart(solarSizingResult);
      setIsSolarCalcOpen(false);
      showBanner(
        'success',
        `تم إدراج منظومة الطاقة الشمسية المتكاملة (${solarSizingResult.recommendedPanelCount} لوح 585W + إنفرتر ${solarSizingResult.recommendedInverterKw}kW + ${solarSizingResult.recommendedBatteryUnits} بطارية) في السلة بقيمة تقديرية ${res.totalAmount.toLocaleString()} ${currency}`
      );
    },
    [addSolarSystemKitToPOSCart, currency, showBanner]
  );

  const [isPosFilterDrawerOpen, setIsPosFilterDrawerOpen] = useState<boolean>(false);

  // Listen for Footer F9 Checkout, & F8 Beneficiary Customer Picker triggers
  useEffect(() => {
    const handleTriggerCheckout = () => {
      if (posCart.length > 0) {
        setPaymentMethod('CASH');
        setCashTendered(grandTotal);
        setSplitCashAmount(Math.round((grandTotal / 2) * 100) / 100);
        setCardReference(`RRN-${Math.floor(100000 + Math.random() * 900000)}`);
        setIsQuickNumpadOpen(false);
        setIsCheckoutModalOpen(true);
      }
    };
    const handleOpenCustomerPicker = () => {
      setIsCustomerPickerOpen(true);
    };
    window.addEventListener('haseb-trigger-pos-checkout', handleTriggerCheckout);
    window.addEventListener('haseb-open-pos-customer-picker', handleOpenCustomerPicker);
    return () => {
      window.removeEventListener('haseb-trigger-pos-checkout', handleTriggerCheckout);
      window.removeEventListener('haseb-open-pos-customer-picker', handleOpenCustomerPicker);
    };
  }, [posCart.length, grandTotal]);

  const electronicsSubCategories = useMemo(() => {
    let allCount = 0;
    let solarPanelCount = 0;
    let inverterCount = 0;
    let batteryCount = 0;
    let screenCount = 0;
    let computingCount = 0;

    for (let i = 0; i < products.length; i += 1) {
      const p = products[i];
      if (p.industry === 'electronics') allCount += 1;
      if (p.subCategory === 'SOLAR_PANEL') solarPanelCount += 1;
      else if (p.subCategory === 'HYBRID_INVERTER') inverterCount += 1;
      else if (p.subCategory === 'LITHIUM_BATTERY' || p.subCategory === 'GEL_BATTERY') {
        batteryCount += 1;
      } else if (p.subCategory === 'SMART_SCREEN') screenCount += 1;
      else if (p.subCategory === 'COMPUTING_MOBILE') computingCount += 1;
    }

    return [
      { id: 'ALL' as const, labelAr: 'الكل', count: allCount },
      { id: 'SOLAR_PANEL' as const, labelAr: 'ألواح طاقة شمسية', count: solarPanelCount },
      { id: 'HYBRID_INVERTER' as const, labelAr: 'إنفرترات هجينة MPPT', count: inverterCount },
      { id: 'LITHIUM_BATTERY' as const, labelAr: 'بطاريات ليثيوم وجل', count: batteryCount },
      { id: 'SMART_SCREEN' as const, labelAr: 'شاشات ذكية 4K', count: screenCount },
      { id: 'COMPUTING_MOBILE' as const, labelAr: 'حواسيب وتجهيزات', count: computingCount },
    ];
  }, [products]);

  const getProductSpecChips = useCallback((p: Product): [string, string] => {
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
  }, []);

  const getProductDisplayName = useCallback(
    (p: Product): string => {
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
    },
    [language]
  );

  // Fast Keyboard Tab / Shift+Tab / F8 / F9 Navigation Handler for POS Data Entry
  const handlePosWorkspaceKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      // F8 opens the fast Beneficiary Customer Picker Modal immediately
      if (e.key === 'F8') {
        e.preventDefault();
        e.stopPropagation();
        setIsCustomerPickerOpen((prev) => !prev);
        return;
      }

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
      if (isCheckoutModalOpen || isSolarCalcOpen) {
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
    },
    [
      posCart.length,
      isCheckoutModalOpen,
      grandTotal,
      isSolarCalcOpen,
      activePosFieldId,
      orderedPosFieldIds,
      focusPosFieldById,
    ]
  );

  return (
    <div
      ref={posContainerRef}
      onKeyDown={handlePosWorkspaceKeyDown}
      className="h-full flex-1 flex flex-col lg:flex-row overflow-hidden relative"
    >
      {/* ====================================================================
          CENTER AREA: PRODUCT SHOWCASE & BARCODE SCANNER
          - Supports full CATALOG or SPLIT-VIEW alongside Cart on Mobile (< lg)
      ==================================================================== */}
      <div
        data-testid="pos-catalog-pane"
        className={`${posSplitLayout.primaryColClass} ${
          mobilePosLayout.isSplitViewOnMobile
            ? `flex flex-none ${mobilePosLayout.catalogMobileHeightClass} lg:h-auto lg:flex-1 p-2 sm:p-4 gap-1.5 sm:gap-3`
            : mobilePosLayout.showCatalogOnMobile
            ? 'flex flex-1 p-2.5 sm:p-4 gap-2 sm:gap-3.5'
            : 'hidden lg:flex flex-1 p-2.5 sm:p-4 gap-2 sm:gap-3.5'
        } flex-col min-w-0 min-h-0 overflow-hidden`}
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

        {/* Top Row: Barcode Scanner + Compact Controls (De-duplicated: Shift is in Navbar, Beneficiary Customer is in Cart) */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 min-w-0 max-w-full">
          <form onSubmit={handleBarcodeSubmit} className="pos-focus-group relative flex-1 min-w-0">
            <Barcode className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
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
              placeholder="امسح الباركود أو أدخل رمز الصنف SKU..."
              className="w-full bg-white border border-slate-200/80 hover:border-slate-300 focus:border-blue-600 focus:ring-2 focus:ring-blue-500/15 rounded-xl py-1.5 sm:py-2 pr-9 pl-12 sm:pl-16 text-xs outline-hidden transition-all shadow-2xs"
            />
            <div className="absolute left-2 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
              <button
                type="button"
                data-testid="pos-camera-barcode-btn"
                onClick={() => setIsCameraScannerOpen(true)}
                title="مسح الباركود بالكاميرا"
                className="text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition cursor-pointer p-1.5 sm:p-1"
              >
                <Camera className="w-3.5 h-3.5" />
              </button>
              <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] font-mono text-slate-400 bg-slate-50 rounded border border-slate-200/60">
                F1
              </kbd>
            </div>
          </form>

          <div className="flex items-center gap-1.5 shrink-0">
            {/* 2-Mode POS Product Display Toggle: WITH_IMAGES vs DATA_ONLY */}
            <div
              data-testid="pos-display-mode-switcher"
              className="flex items-center bg-white border border-slate-200/80 rounded-xl p-0.5 shadow-2xs shrink-0"
            >
              <button
                type="button"
                data-testid="pos-display-mode-with-images"
                onClick={() => {
                  setPosDisplayMode('WITH_IMAGES');
                  try {
                    localStorage.setItem('haseb_pos_display_mode_v1', 'WITH_IMAGES');
                  } catch {
                    // ignore
                  }
                }}
                title="عرض الأصناف بصور وبيانات"
                className={`px-2 sm:px-2.5 py-1 sm:py-1.5 rounded-lg text-[11px] font-bold flex items-center gap-1 transition cursor-pointer whitespace-nowrap ${
                  posDisplayMode === 'WITH_IMAGES'
                    ? 'haseb-btn-primary'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <ImageIcon className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">بصور وبيانات</span>
                <span className="sm:hidden">صور</span>
              </button>
              <button
                type="button"
                data-testid="pos-display-mode-data-only"
                onClick={() => {
                  setPosDisplayMode('DATA_ONLY');
                  try {
                    localStorage.setItem('haseb_pos_display_mode_v1', 'DATA_ONLY');
                  } catch {
                    // ignore
                  }
                }}
                title="عرض الأصناف ببيانات فقط"
                className={`px-2 sm:px-2.5 py-1 sm:py-1.5 rounded-lg text-[11px] font-bold flex items-center gap-1 transition cursor-pointer whitespace-nowrap ${
                  posDisplayMode === 'DATA_ONLY'
                    ? 'haseb-btn-primary'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <LayoutList className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">ببيانات فقط</span>
                <span className="sm:hidden">قائمة</span>
              </button>
            </div>

            {/* Smart Cart Visibility & Permanent Pin Controls (Desktop lg+) */}
            <div className="hidden lg:flex items-center bg-white border border-slate-200/80 rounded-xl p-0.5 shadow-2xs shrink-0">
              <button
                type="button"
                data-testid="pos-toggle-cart-visibility-btn"
                onClick={() => {
                  if (cartVisibility.isVisible && posCart.length === 0) {
                    setIsCartPinnedOpen(false);
                    setIsCartManuallyShownWhenEmpty(false);
                  } else {
                    setIsCartManuallyShownWhenEmpty((prev) => !prev);
                  }
                }}
                title={
                  cartVisibility.isVisible
                    ? 'السلة ظاهرة حالياً (تختفي تلقائياً عند الفراغ ما لم يتم تثبيتها)'
                    : 'إظهار سلة المبيعات'
                }
                className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold flex items-center gap-1.5 transition cursor-pointer ${
                  cartVisibility.isVisible
                    ? 'haseb-btn-primary'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <ShoppingCart className="w-3.5 h-3.5" />
                <span>السلة ({cartTotalUnits})</span>
              </button>
              <button
                type="button"
                data-testid="pos-pin-cart-btn"
                onClick={() => {
                  setIsCartPinnedOpen((prev) => {
                    const next = !prev;
                    if (!next && posCart.length === 0) {
                      setIsCartManuallyShownWhenEmpty(false);
                    }
                    return next;
                  });
                }}
                title={
                  isCartPinnedOpen
                    ? 'إلغاء تثبيت السلة (لتختفي تلقائياً عندما تكون فارغة)'
                    : 'تثبيت إظهار السلة بشكل دائم حتى وهي فارغة'
                }
                className={`px-2 py-1.5 rounded-lg text-[11px] font-bold flex items-center gap-1 transition cursor-pointer ${
                  isCartPinnedOpen
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                <Pin className="w-3 h-3" />
                <span className="hidden xl:inline">{isCartPinnedOpen ? 'مثبتة دائماً' : 'تثبيت دائم'}</span>
              </button>
            </div>

            <button
              type="button"
              onClick={() => setIsPosFilterDrawerOpen((prev) => !prev)}
              className="px-2.5 sm:px-3 py-1.5 sm:py-2 bg-white hover:bg-slate-50 border border-slate-200/80 rounded-xl text-[11px] sm:text-xs font-medium text-slate-600 flex items-center gap-1 transition-colors shadow-2xs shrink-0 cursor-pointer"
            >
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <span>تصفية</span>
            </button>
          </div>
        </div>

        {/* Collapsible Advanced Filter, Search, Solar Calculator & Resizable Tabs Toolbar */}
        <div
          className={
            isPosFilterDrawerOpen
              ? 'flex flex-wrap items-center justify-between gap-2 bg-white p-2.5 rounded-xl border border-slate-200/70 shrink-0 text-xs shadow-2xs'
              : 'sr-only'
          }
        >
          <div className="flex flex-wrap items-center gap-2 flex-1 min-w-0 w-full sm:w-auto sm:min-w-[220px]">
            <div className="pos-focus-group relative flex-1 min-w-[140px] max-w-xs">
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
              className="px-2.5 py-1.5 rounded-lg haseb-btn-primary font-semibold text-xs flex items-center gap-1.5 cursor-pointer"
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
        <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 shrink-0 no-scrollbar max-w-full min-w-0">
          {electronicsSubCategories.map((sub) => {
            const isSelected = selectedElectronicsSubCat === sub.id;
            return (
              <button
                key={sub.id}
                type="button"
                onClick={() => setSelectedElectronicsSubCat(sub.id)}
                className={
                  isSelected
                    ? 'px-3.5 py-1.5 rounded-full text-xs font-semibold haseb-nav-active flex items-center gap-1.5 shrink-0 cursor-pointer transition-colors'
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

        {/* Product Cards Grid (Expands to more columns when Cart is auto-hidden!) */}
        <div
          className={`flex-1 overflow-y-auto pr-0.5 min-h-0 ${
            mobilePosLayout.isSplitViewOnMobile ? 'pb-2 lg:pb-1' : 'pb-28 lg:pb-1'
          }`}
        >
          <div
            data-testid="pos-products-grid"
            data-display-mode={posDisplayMode}
            data-cart-visible={cartVisibility.isVisible ? 'true' : 'false'}
            className={`grid gap-2.5 sm:gap-3.5 ${
              filteredProducts.length === 0
                ? 'grid-cols-1'
                : cartVisibility.isVisible
                ? 'grid-cols-2 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-3 2xl:grid-cols-4'
                : 'grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5'
            }`}
          >
            {filteredProducts.length === 0 ? (
              <div
                data-testid="pos-empty-products-state"
                className="bg-white rounded-2xl border border-dashed border-slate-300 p-8 sm:p-12 text-center space-y-3 my-4"
              >
                <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-500 flex items-center justify-center mx-auto">
                  <Package className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-sm font-bold text-slate-900">
                    {products.length === 0
                      ? 'لا توجد أصناف مسجلة في المخزون بعد'
                      : 'لا توجد أصناف مطابقة لنتائج البحث الحالية'}
                  </h3>
                  <p className="text-xs text-slate-500 max-w-md mx-auto">
                    {products.length === 0
                      ? 'ابدأ بإضافة أصنافك ومنتجاتك في إدارة المخزون لتظهر مباشرة في شاشة البيع السريع.'
                      : 'جرّب مسح نص البحث أو اختيار التصنيف الشامل لعرض جميع الأصناف المتوفرة.'}
                  </p>
                </div>
                <div className="flex items-center justify-center gap-2 pt-1">
                  {products.length === 0 ? (
                    <button
                      type="button"
                      onClick={() => setActiveTab('inventory')}
                      className="px-4 py-2 haseb-btn-primary text-white rounded-xl text-xs font-bold cursor-pointer"
                    >
                      + الانتقال لإضافة أول صنف بالمخزون
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setSearchTerm('');
                        setSelectedCategory('all');
                        setSelectedElectronicsSubCat('ALL');
                      }}
                      className="px-4 py-2 haseb-btn-primary text-white rounded-xl text-xs font-bold cursor-pointer"
                    >
                      عرض جميع الأصناف
                    </button>
                  )}
                </div>
              </div>
            ) : (
              filteredProducts.map((p) => {
                const [chip1, chip2] = getProductSpecChips(p);
                return (
                  <POSProductCard
                    key={p.id}
                    product={p}
                    inCartQuantity={cartQtyByProductId[p.id] || 0}
                    displayMode={posDisplayMode}
                    currency={currency}
                    displayName={getProductDisplayName(p)}
                    chip1={chip1}
                    chip2={chip2}
                    onAddToCart={handleAddProductToCart}
                    onProbeBranches={handleProbeBranches}
                    onUpdateProductImage={handleUpdateProductImage}
                    onOpenQuickActions={handleOpenProductQuickActions}
                  />
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* ====================================================================
          MOBILE SPLIT-MODE INTERACTIVE DIVIDER & PROPORTION BAR (< lg)
      ==================================================================== */}
      {mobilePosLayout.isSplitViewOnMobile && (
        <div
          data-testid="pos-mobile-split-bar"
          className="lg:hidden shrink-0 px-3 py-1.5 bg-slate-100 dark:bg-slate-900 border-y border-slate-200/90 dark:border-slate-800 flex items-center justify-between gap-2 z-20"
        >
          <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-600 dark:text-slate-300">
            <Columns2 className="w-3.5 h-3.5 text-blue-600 shrink-0" />
            <span>وضع التقسيم المباشر:</span>
          </div>

          <div className="flex items-center bg-white dark:bg-slate-800 rounded-lg p-0.5 border border-slate-200/80 dark:border-slate-700 gap-0.5">
            <button
              type="button"
              data-testid="pos-mobile-split-ratio-catalog"
              onClick={() => setMobileSplitBalance('CATALOG_60_40')}
              className={`px-2 py-0.5 rounded-md text-[10px] font-bold transition cursor-pointer ${
                mobileSplitBalance === 'CATALOG_60_40'
                  ? 'haseb-btn-primary text-white'
                  : 'text-slate-600 dark:text-slate-300'
              }`}
            >
              توسيع الكتالوج
            </button>
            <button
              type="button"
              data-testid="pos-mobile-split-ratio-balanced"
              onClick={() => setMobileSplitBalance('BALANCED_50_50')}
              className={`px-2 py-0.5 rounded-md text-[10px] font-bold transition cursor-pointer ${
                mobileSplitBalance === 'BALANCED_50_50'
                  ? 'haseb-btn-primary text-white'
                  : 'text-slate-600 dark:text-slate-300'
              }`}
            >
              50 / 50
            </button>
            <button
              type="button"
              data-testid="pos-mobile-split-ratio-cart"
              onClick={() => setMobileSplitBalance('CART_40_60')}
              className={`px-2 py-0.5 rounded-md text-[10px] font-bold transition cursor-pointer ${
                mobileSplitBalance === 'CART_40_60'
                  ? 'haseb-btn-primary text-white'
                  : 'text-slate-600 dark:text-slate-300'
              }`}
            >
              توسيع السلة
            </button>
          </div>
        </div>
      )}

      {/* ====================================================================
          LEFT AREA: SALES CART & CHECKOUT DRAWER
          - Desktop: Hidden by default when empty, pops open as soon as any item is added or pinned
          - Mobile (< lg): Supports full CART view OR simultaneous ergonomic SPLIT view
      ==================================================================== */}
      <aside
        data-testid="pos-cart-pane"
        data-cart-visibility-reason={cartVisibility.reason}
        data-mobile-view-mode={mobilePosPane}
        className={`${
          mobilePosLayout.isSplitViewOnMobile
            ? `flex flex-none ${mobilePosLayout.cartMobileHeightClass} lg:h-auto lg:flex`
            : mobilePosLayout.showCartOnMobile
            ? cartVisibility.isVisible
              ? 'flex flex-1 lg:flex-none lg:flex'
              : 'flex flex-1 lg:hidden'
            : cartVisibility.isVisible
            ? 'hidden lg:flex'
            : 'hidden'
        } w-full lg:w-[380px] xl:w-[390px] bg-white border-r border-slate-200/70 flex-col justify-between shrink-0 z-20 overflow-hidden transition-all`}
      >
        {/* Cart Header (Compact in Mobile Split Mode, Full in Cart/Desktop Mode) */}
        <div
          className={`${
            mobilePosLayout.isSplitViewOnMobile ? 'p-2.5 lg:p-4 space-y-2' : 'p-3.5 sm:p-4 space-y-3'
          } border-b border-slate-200/70 shrink-0`}
        >
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <h2 className="text-xs sm:text-sm font-bold text-slate-900 shrink-0">سلة المبيعات</h2>
              <span
                data-testid="pos-cart-items-count-badge"
                className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[11px] font-mono font-semibold shrink-0"
              >
                {cartTotalUnits} صنف
              </span>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              {/* Permanent Pin Toggle Button inside Cart Header (Desktop & Full Cart) */}
              <button
                type="button"
                data-testid="pos-cart-pin-toggle-btn"
                onClick={() => {
                  setIsCartPinnedOpen((prev) => {
                    const next = !prev;
                    if (!next && posCart.length === 0) {
                      setIsCartManuallyShownWhenEmpty(false);
                    }
                    return next;
                  });
                }}
                title={
                  isCartPinnedOpen
                    ? 'السلة مثبتة دائماً (انقر لتفعيل الإخفاء التلقائي عند الفراغ)'
                    : 'تثبيت السلة لتبقى ظاهرة دائماً حتى وهي فارغة'
                }
                className={`${
                  mobilePosLayout.isSplitViewOnMobile ? 'hidden lg:flex' : 'flex'
                } px-2 py-1 rounded-lg text-[10px] font-bold items-center gap-1 border transition cursor-pointer ${
                  isCartPinnedOpen
                    ? 'bg-blue-50 text-blue-700 border-blue-200'
                    : 'bg-slate-50 text-slate-500 border-slate-200/80 hover:text-slate-900'
                }`}
              >
                <Pin className="w-3 h-3" />
                <span>{isCartPinnedOpen ? 'مثبتة دائماً' : 'تثبيت دائم'}</span>
              </button>

              {posCart.length > 0 ? (
                <button
                  type="button"
                  data-testid="pos-clear-cart-btn"
                  onClick={() => {
                    clearPOSCart();
                    setIsCartManuallyShownWhenEmpty(false);
                  }}
                  className="text-[11px] text-slate-400 hover:text-rose-600 flex items-center gap-1 transition-colors cursor-pointer px-1.5 py-1 rounded-lg hover:bg-rose-50"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>تفريغ</span>
                </button>
              ) : (
                !isCartPinnedOpen && (
                  <button
                    type="button"
                    data-testid="pos-cart-hide-btn"
                    onClick={() => setIsCartManuallyShownWhenEmpty(false)}
                    className="text-[11px] text-slate-400 hover:text-slate-700 flex items-center gap-1 transition-colors cursor-pointer px-1.5 py-1 rounded-lg hover:bg-slate-100"
                  >
                    <EyeOff className="w-3.5 h-3.5" />
                    <span>إخفاء</span>
                  </button>
                )
              )}
            </div>
          </div>

          {/* Beneficiary Customer Tab & Quick Inputs (Kept EXCLUSIVELY in Sales Cart) */}
          <div className="pos-focus-group bg-slate-50/80 p-2 rounded-xl border border-slate-200/80 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <button
                type="button"
                data-testid="pos-cart-beneficiary-tab-btn"
                onClick={() => setIsCustomerPickerOpen(true)}
                className="flex items-center gap-1.5 text-[11px] font-bold text-blue-700 hover:text-blue-800 bg-blue-50 hover:bg-blue-100/80 px-2.5 py-1 rounded-lg border border-blue-200/80 transition cursor-pointer min-w-0"
                title="انقر هنا أو اضغط F8 لاختيار العميل المستفيد من قائمة العملاء"
              >
                <Users className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                <span className="shrink-0">العميل المستفيد:</span>
                <span
                  data-testid="pos-active-beneficiary-label"
                  className="truncate max-w-[115px] sm:max-w-[140px] text-slate-900 font-black"
                >
                  {warrantyCustomerName.trim() || DEFAULT_WALKIN_CUSTOMER_LABEL_AR}
                </span>
                <kbd className="hidden sm:inline-block px-1 py-0.2 bg-white rounded text-[9px] font-mono text-blue-700 border border-blue-200">
                  F8
                </kbd>
              </button>

              <div className="flex items-center gap-1.5 shrink-0">
                {warrantyCustomerName &&
                  warrantyCustomerName !== DEFAULT_WALKIN_CUSTOMER_LABEL_AR && (
                    <button
                      type="button"
                      data-testid="pos-reset-walkin-customer-btn"
                      onClick={() => {
                        setSelectedCustomerId('cust-pos-walkin');
                        setWarrantyCustomerName(DEFAULT_WALKIN_CUSTOMER_LABEL_AR);
                        setWarrantyCustomerPhone('');
                      }}
                      className="text-[10px] font-semibold text-slate-500 hover:text-slate-900 underline cursor-pointer"
                    >
                      نقدي عام
                    </button>
                  )}

                {mobilePosLayout.isSplitViewOnMobile && (
                  <button
                    type="button"
                    data-testid="pos-mobile-split-toggle-cust-fields-btn"
                    onClick={() => setIsMobileSplitCustomerExpanded((prev) => !prev)}
                    className="lg:hidden px-2 py-0.5 rounded-md bg-white border border-slate-200 text-[10px] font-bold text-slate-600 cursor-pointer"
                  >
                    {isMobileSplitCustomerExpanded ? 'طي الحقول' : 'تعديل الاسم/الهاتف'}
                  </button>
                )}
              </div>
            </div>

            <div
              className={`${
                mobilePosLayout.isSplitViewOnMobile && !isMobileSplitCustomerExpanded
                  ? 'hidden lg:grid'
                  : 'grid'
              } grid-cols-5 gap-2`}
            >
              <div className="col-span-3">
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
                      if (cid === 'cust-pos-walkin') {
                        setWarrantyCustomerName(DEFAULT_WALKIN_CUSTOMER_LABEL_AR);
                        setWarrantyCustomerPhone('');
                        return;
                      }
                      const found = customers.find((c) => c.id === cid);
                      if (found) {
                        setWarrantyCustomerName(language === 'ar' ? found.nameAr : found.name);
                        setWarrantyCustomerPhone(found.phone);
                      }
                    }}
                    aria-label="اختيار العميل"
                    className="sr-only"
                  >
                    <option value="cust-pos-walkin">{DEFAULT_WALKIN_CUSTOMER_LABEL_AR}</option>
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
                    className="w-full bg-white border border-slate-200/90 rounded-xl px-2.5 py-1.5 text-xs font-bold text-slate-800 placeholder:text-slate-500 focus:border-blue-600 outline-hidden transition-all"
                  />
                </div>
              </div>
              <div className="col-span-2">
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
                  placeholder="هاتف العميل..."
                  dir="ltr"
                  className="w-full bg-white border border-slate-200/90 rounded-xl px-2.5 py-1.5 text-xs font-mono text-slate-700 focus:border-blue-600 outline-hidden transition-all text-left"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Cart Items List + Quick Discount Box */}
        <div
          data-testid="pos-cart-items-scroll"
          className={`flex-1 overflow-y-auto min-h-0 ${
            mobilePosLayout.isSplitViewOnMobile ? 'p-2.5 lg:p-4 space-y-2' : 'p-4 space-y-3'
          }`}
        >
          {posCart.length === 0 ? (
            <div
              className={`${
                mobilePosLayout.isSplitViewOnMobile ? 'py-4 lg:py-10' : 'py-10'
              } flex flex-col items-center justify-center text-slate-400 text-xs space-y-1.5`}
            >
              <ShieldCheck className="w-7 h-7 text-slate-300 stroke-1" />
              <span className="font-medium text-slate-400">
                السلة فارغة — اختر الأصناف لإصدار الفاتورة
              </span>
            </div>
          ) : (
            posCart.map((item) => (
              <POSCartItemRow
                key={item.productId}
                item={item}
                currency={currency}
                onRemove={handleRemoveCartItem}
                onUpdateQty={handleUpdateCartQty}
                onUpdateMeta={handleUpdateCartMeta}
                onFocusField={handleFocusCartField}
                onOpenQuickActions={handleOpenCartItemQuickActions}
              />
            ))
          )}

          {/* Quick Discount Options */}
          <div
            className={`pos-focus-group bg-slate-50/60 rounded-2xl p-2.5 sm:p-3 border border-slate-200/60 space-y-2 ${
              mobilePosLayout.isSplitViewOnMobile && posCart.length === 0 ? 'hidden lg:block' : ''
            }`}
          >
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
                      ? 'haseb-btn-primary'
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
                    ? 'haseb-btn-primary'
                    : 'bg-white border-slate-200/80 text-slate-600 hover:border-slate-400'
                }`}
              >
                مخصص
              </button>
            </div>

            {/* Custom Discount Input Drawer */}
            <div className={isDiscountPanelOpen ? 'pt-2 space-y-2 border-t border-slate-200/60' : 'sr-only'}>
              <div className="flex items-center justify-between gap-1.5">
                <div className="flex items-center bg-white rounded-lg p-0.5 border border-slate-200 text-[11px]">
                  <button
                    type="button"
                    data-testid="pos-discount-mode-percent"
                    onClick={() => setDiscountType('PERCENT')}
                    className={`px-2 py-0.5 rounded font-semibold cursor-pointer ${
                      discountType === 'PERCENT' ? 'haseb-btn-primary' : 'text-slate-600'
                    }`}
                  >
                    نسبة (%)
                  </button>
                  <button
                    type="button"
                    data-testid="pos-discount-mode-amount"
                    onClick={() => setDiscountType('AMOUNT')}
                    className={`px-2 py-0.5 rounded font-semibold cursor-pointer ${
                      discountType === 'AMOUNT' ? 'haseb-btn-primary' : 'text-slate-600'
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

        {/* Cart Footer & Totals (Streamlined in Mobile Split Mode so items have generous height) */}
        <div
          className={`${
            mobilePosLayout.isSplitViewOnMobile
              ? 'px-2.5 pt-2 pb-28 lg:p-4 lg:pb-4 space-y-1.5 lg:space-y-3'
              : 'p-3 sm:p-4 pb-28 lg:pb-4 space-y-2 sm:space-y-3'
          } border-t border-slate-200/70 bg-slate-50/50 shrink-0`}
        >
          <div
            className={`${
              mobilePosLayout.isSplitViewOnMobile ? 'hidden lg:block' : 'block'
            } space-y-1 text-xs`}
          >
            <div className="flex items-center justify-between text-slate-500">
              <span>المجموع الفرعي:</span>
              <span className="font-mono font-medium text-slate-700" dir="ltr">
                {formatCleanNumber(subtotal)} {currency}
              </span>
            </div>
            <div
              data-testid="pos-coupon-discount-row"
              className="flex items-center justify-between text-slate-500"
            >
              <span>الخصم المطبق:</span>
              <span className="font-mono font-medium text-slate-700" dir="ltr">
                {calculatedDiscountAmount > 0 ? `-${formatCleanNumber(calculatedDiscountAmount)}` : '0'}{' '}
                {currency}
              </span>
            </div>
            <div className="flex items-center justify-between text-slate-500">
              <span>الضريبة:</span>
              <span className="font-mono font-medium text-slate-700" dir="ltr">
                0 {currency}
              </span>
            </div>
            <div className="pt-1.5 border-t border-slate-200/70 flex items-baseline justify-between">
              <span className="text-sm font-bold text-slate-900">الإجمالي المستحق:</span>
              <span
                data-testid="pos-grand-total-display"
                className="text-xl sm:text-2xl font-bold text-slate-900 font-mono"
                dir="ltr"
              >
                {formatCleanNumber(grandTotal)}{' '}
                <span className="text-xs font-normal text-slate-500">{currency}</span>
              </span>
            </div>
          </div>

          {/* Primary Action Button (Desktop & Full Cart View; Mobile Split Mode uses the sticky bottom dock CTA) */}
          <div className={mobilePosLayout.isSplitViewOnMobile ? 'hidden lg:block pt-0.5' : 'pt-0.5'}>
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
                setIsQuickNumpadOpen(false);
                setIsCheckoutModalOpen(true);
              }}
              className="w-full haseb-btn-primary font-semibold py-2.5 sm:py-3 px-4 rounded-xl transition-all flex items-center justify-center gap-2 text-sm cursor-pointer disabled:opacity-40"
            >
              <CreditCard className="w-4 h-4" />
              <span>دفع وإصدار الفاتورة</span>
              <kbd className="px-1.5 py-0.5 bg-white/15 rounded text-[10px] font-mono font-normal text-white/90 mr-1">
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
              className="py-1.5 sm:py-2 px-2.5 sm:px-3 rounded-xl border border-slate-200/80 bg-white hover:bg-slate-50 text-slate-700 text-xs font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:opacity-40"
            >
              <PauseCircle className="w-3.5 h-3.5 text-slate-500" />
              <span>تعليق</span>
            </button>

            <button
              type="button"
              disabled={posCart.length === 0}
              onClick={handlePreviewDraftWarrantyCertificate}
              className="py-1.5 sm:py-2 px-2.5 sm:px-3 rounded-xl border border-slate-200/80 bg-white hover:bg-slate-50 text-slate-700 text-xs font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:opacity-40"
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
                  messageBody: `فاتورة مبيعات وشهادة ضمان حاسب ERP — الإجمالي: ${formatCleanNumber(grandTotal)} ${currency}`,
                });
              }}
              className="py-1.5 sm:py-2 px-2.5 sm:px-3 rounded-xl border border-emerald-200 bg-emerald-50/70 hover:bg-emerald-100/70 text-emerald-800 text-xs font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:opacity-40"
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
          SOLAR ENERGY, HYBRID INVERTER & BATTERY BANK SIZING CALCULATOR MODAL (LAZY)
      ==================================================================== */}
      {isSolarCalcOpen && (
        <Suspense fallback={<POSModalLoadingFallback />}>
          <POSSolarCalculatorModal
            onApplyKit={handleApplySolarKitToCart}
            onClose={() => setIsSolarCalcOpen(false)}
          />
        </Suspense>
      )}

      {/* ====================================================================
          FAST & LIGHTWEIGHT BENEFICIARY CUSTOMER PICKER MODAL (Click Tab or F8, LAZY)
      ==================================================================== */}
      {isCustomerPickerOpen && (
        <Suspense fallback={<POSModalLoadingFallback />}>
          <POSCustomerPickerModal
            customers={customers}
            selectedCustomerId={selectedCustomerId}
            warrantyCustomerName={warrantyCustomerName}
            language={language}
            currency={currency}
            onSelectCustomer={handleSelectBeneficiaryCustomer}
            onQuickCreateCustomer={handleQuickCreateAndSelectCustomer}
            onClose={() => setIsCustomerPickerOpen(false)}
          />
        </Suspense>
      )}

      {/* ====================================================================
          MOBILE & DESKTOP ERGONOMIC CHECKOUT & PAYMENT SETTLEMENT MODAL
          (Responsive Bottom-Sheet on Mobile + Sticky Action Footer)
      ==================================================================== */}
      {isCheckoutModalOpen && (
        <div
          data-testid="pos-checkout-modal-backdrop"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setIsCheckoutModalOpen(false);
          }}
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/65 backdrop-blur-xs p-0 sm:p-4"
        >
          <div
            data-testid="pos-checkout-modal-card"
            className="bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl border border-slate-200/80 w-full max-w-lg max-h-[92dvh] flex flex-col overflow-hidden"
          >
            {/* Sticky Header */}
            <div className="px-4 sm:px-5 py-3.5 bg-slate-50/95 border-b border-slate-200/80 text-slate-900 flex items-center justify-between gap-2 shrink-0">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-9 h-9 rounded-xl haseb-card-gradient text-white flex items-center justify-center shrink-0">
                  <CreditCard className="w-4 h-4 text-white" />
                </div>
                <div className="min-w-0">
                  <h3 className="font-bold text-xs sm:text-sm text-slate-900 truncate">
                    طريقة الدفع وإتمام العملية
                  </h3>
                  <div className="flex items-center gap-1.5 text-[11px] text-slate-500 truncate">
                    <span className="truncate">
                      {warrantyCustomerName.trim() || DEFAULT_WALKIN_CUSTOMER_LABEL_AR}
                    </span>
                    <span>•</span>
                    <span>{cartTotalUnits} أصناف</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  data-testid="pos-checkout-beneficiary-btn"
                  onClick={() => setIsCustomerPickerOpen(true)}
                  className="px-2.5 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 text-[11px] font-bold flex items-center gap-1 cursor-pointer transition"
                  title="تغيير العميل المستفيد (F8)"
                >
                  <UserCheck className="w-3.5 h-3.5" />
                  <span>تغيير العميل</span>
                </button>
                <button
                  type="button"
                  data-testid="pos-checkout-close-btn"
                  onClick={() => setIsCheckoutModalOpen(false)}
                  className="w-8 h-8 rounded-full border border-slate-200/80 bg-white hover:bg-slate-100 text-slate-500 hover:text-slate-900 flex items-center justify-center font-bold transition cursor-pointer"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Scrollable Body */}
            <div className="p-3.5 sm:p-5 space-y-3.5 text-xs overflow-y-auto flex-1">
              {/* Compact Financial Summary Strip */}
              <div className="p-3.5 rounded-2xl haseb-card-gradient text-white flex items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <div className="text-[10px] text-white/80 font-semibold">
                    صافي الفاتورة المستحق للسداد:
                  </div>
                  <div className="flex items-center gap-2 text-[10px] text-white/85">
                    <span>
                      الفرعي:{' '}
                      <strong className="font-mono text-white" dir="ltr">
                        {formatCleanNumber(subtotal)}
                      </strong>
                    </span>
                    {couponDiscountAmount > 0 && (
                      <span className="text-amber-200 font-bold">
                        خصم: -{formatCleanNumber(couponDiscountAmount)}
                      </span>
                    )}
                  </div>
                </div>
                <div className="text-left" dir="ltr">
                  <div className="text-xl sm:text-2xl font-black font-mono tabular-nums text-white">
                    {formatCleanNumber(grandTotal)}{' '}
                    <span className="text-xs font-bold text-white/85">{currency}</span>
                  </div>
                </div>
              </div>

              {/* Payment Method Cards (Touch-Ergonomic 3-Col Grid) */}
              <div>
                <label className="block font-bold text-slate-700 mb-1.5 text-[11px]">
                  اختر وسيلة السداد المعتمدة:
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    {
                      id: 'CASH',
                      titleAr: masterSystemConfig.cashPaymentLabelAr || 'نقداً (كاش)',
                      subAr: 'صندوق الكاشير',
                    },
                    {
                      id: 'CARD',
                      titleAr: 'بطاقة / تحويل',
                      subAr: 'الكريمي • ام فلوس',
                    },
                    {
                      id: 'SPLIT',
                      titleAr: 'دفع مشترك',
                      subAr: 'نقدي + مصرفي',
                    },
                  ].map((m) => {
                    const isSelected = paymentMethod === m.id;
                    return (
                      <button
                        key={m.id}
                        type="button"
                        data-testid={`pos-payment-method-${m.id}`}
                        onClick={() => {
                          setPaymentMethod(m.id as any);
                          if (m.id === 'CASH') {
                            setCashTendered(grandTotal);
                          } else if (m.id === 'SPLIT') {
                            setSplitCashAmount(Math.round((grandTotal / 2) * 100) / 100);
                          }
                        }}
                        className={`p-2.5 sm:p-3 rounded-xl border text-start transition cursor-pointer flex flex-col justify-between ${
                          isSelected
                            ? 'haseb-nav-active'
                            : 'bg-white border-slate-200 text-slate-800 hover:border-slate-300 hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-1 mb-0.5">
                          <span className="font-bold text-[11px] sm:text-xs truncate">{m.titleAr}</span>
                          {isSelected && (
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                          )}
                        </div>
                        <span
                          className={`text-[9px] sm:text-[10px] truncate ${
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

              {/* 1. CASH PAYMENT PANEL */}
              {paymentMethod === 'CASH' && (
                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <label className="font-bold text-slate-800 text-[11px]">
                      المبلغ المستلم من العميل:
                    </label>
                    <button
                      type="button"
                      onClick={() => setCashTendered(grandTotal)}
                      className="text-[11px] font-bold text-emerald-700 hover:text-emerald-800 underline cursor-pointer"
                    >
                      مطابقة تامّة ({formatCleanNumber(grandTotal)})
                    </button>
                  </div>

                  {/* Quick Cash Denomination Chips for Mobile & Touch Speed */}
                  <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
                    <button
                      type="button"
                      onClick={() => setCashTendered(grandTotal)}
                      className="px-2.5 py-1 rounded-lg bg-emerald-600 text-white font-bold text-[10px] shrink-0 cursor-pointer"
                    >
                      المبلغ كامل
                    </button>
                    {[1000, 5000, 10000, 50000].map((denom) => (
                      <button
                        key={denom}
                        type="button"
                        onClick={() => setCashTendered((prev) => (prev || 0) + denom)}
                        className="px-2.5 py-1 rounded-lg bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 font-mono font-bold text-[10px] shrink-0 cursor-pointer"
                        dir="ltr"
                      >
                        +{formatCleanNumber(denom)}
                      </button>
                    ))}
                  </div>

                  <div className="relative pos-focus-group rounded-xl">
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
                      placeholder="0"
                      className="w-full px-3.5 py-2.5 bg-white border-2 border-slate-300 focus:border-slate-900 rounded-xl font-mono tabular-nums font-black text-lg sm:text-xl text-slate-900 outline-hidden transition"
                      dir="ltr"
                    />
                    <span
                      className="absolute end-4 top-1/2 -translate-y-1/2 text-xs font-mono font-bold text-slate-400"
                      dir="ltr"
                    >
                      {currency}
                    </span>
                  </div>

                  {/* Collapsible Numerical Keypad */}
                  <div className="bg-white rounded-xl border border-slate-200/90 overflow-hidden">
                    <button
                      type="button"
                      data-testid="pos-checkout-numpad-toggle"
                      aria-expanded={isQuickNumpadOpen}
                      onClick={() => setIsQuickNumpadOpen((prev) => !prev)}
                      className="w-full px-3 py-2 flex items-center justify-between text-xs font-bold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
                    >
                      <span className="flex items-center gap-1.5">
                        <Calculator className="w-3.5 h-3.5 text-slate-600" />
                        <span>لوحة الأرقام السريعة (Keypad)</span>
                      </span>
                      <span className="flex items-center gap-1 text-[11px] font-semibold text-blue-600">
                        <span>{isQuickNumpadOpen ? 'إخفاء' : 'إظهار اللوحة'}</span>
                        <ChevronDown
                          className={`w-4 h-4 transition-transform duration-200 ${
                            isQuickNumpadOpen ? 'rotate-180' : ''
                          }`}
                        />
                      </span>
                    </button>

                    {isQuickNumpadOpen && (
                      <div
                        data-testid="pos-checkout-numpad-grid"
                        className="p-2 border-t border-slate-100 grid grid-cols-4 gap-1.5 text-sm font-bold font-mono"
                        dir="ltr"
                      >
                        {[
                          '7', '8', '9', 'C',
                          '4', '5', '6', 'Exact',
                          '1', '2', '3', '00',
                          '0', '.', '+100', '+1000',
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
                                  : 'bg-slate-50 hover:bg-slate-100 text-slate-900 border border-slate-200'
                              }`}
                            >
                              {isExact ? 'المبلغ كامل' : key}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Change Due / Shortage Display */}
                  <div
                    className={`p-3 rounded-xl border flex items-center justify-between font-bold ${
                      cashTendered >= grandTotal
                        ? 'bg-emerald-50/90 border-emerald-200 text-emerald-950'
                        : 'bg-rose-50 border-rose-200 text-rose-950'
                    }`}
                  >
                    <span className="text-[11px] sm:text-xs">
                      {cashTendered >= grandTotal
                        ? 'الباقي المستحق للعميل:'
                        : 'المبلغ المتبقي للتحصيل:'}
                    </span>
                    <span className="font-mono tabular-nums text-base sm:text-lg font-black" dir="ltr">
                      {formatCleanNumber(Math.abs(cashTendered - grandTotal))} {currency}
                    </span>
                  </div>
                </div>
              )}

              {/* 2. CARD / ELECTRONIC POS PANEL */}
              {paymentMethod === 'CARD' && (
                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-800 text-[11px]">
                      مبلغ السداد عبر الشبكة / التحويل المصرفي:
                    </span>
                    <span className="font-mono font-bold text-sm text-emerald-700" dir="ltr">
                      {formatCleanNumber(grandTotal)} {currency}
                    </span>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">
                      رقم مرجع العملية / الحوالة (Approval / RRN):
                    </label>
                    <input
                      type="text"
                      autoFocus
                      data-pos-modal-field="checkout-card-reference"
                      value={cardReference}
                      onFocus={(e) => e.currentTarget.select()}
                      onChange={(e) => setCardReference(e.target.value)}
                      placeholder="مثال: RRN-849201 أو رقم إشعار الكريمي..."
                      className="w-full px-3 py-2 bg-white border border-slate-300 focus:border-slate-900 rounded-xl font-mono text-xs font-bold text-slate-900 outline-hidden"
                      dir="ltr"
                    />
                  </div>
                </div>
              )}

              {/* 3. SPLIT PAYMENT PANEL (Cash + Card) */}
              {paymentMethod === 'SPLIT' && (
                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2.5">
                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        الجزء المدفوع نقداً (كاش):
                      </label>
                      <input
                        type="number"
                        step="any"
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
                        className="w-full px-3 py-2 bg-white border border-slate-300 focus:border-slate-900 rounded-xl font-mono tabular-nums font-bold text-sm text-slate-900 outline-hidden"
                        dir="ltr"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        الجزء المسدد بالبطاقة / التحويل:
                      </label>
                      <div
                        className="w-full px-3 py-2 bg-emerald-50 border border-emerald-200 rounded-xl font-mono tabular-nums font-bold text-sm text-emerald-900"
                        dir="ltr"
                      >
                        {formatCleanNumber(Math.max(0, grandTotal - splitCashAmount))} {currency}
                      </div>
                    </div>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">
                      مرجع عملية الشبكة للجزء البنكي (اختياري):
                    </label>
                    <input
                      type="text"
                      data-pos-modal-field="checkout-split-reference"
                      value={cardReference}
                      onFocus={(e) => e.currentTarget.select()}
                      onChange={(e) => setCardReference(e.target.value)}
                      placeholder="رقم إيصال التحويل أو الشبكة..."
                      className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-xl font-mono text-xs text-slate-800 outline-hidden"
                      dir="ltr"
                    />
                  </div>
                </div>
              )}

              {/* Optional Invoice / Warranty Note */}
              <div>
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
            </div>

            {/* Sticky Bottom Action Bar (Always accessible on Mobile & Desktop) */}
            <div className="p-3 sm:p-4 bg-white border-t border-slate-200/80 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setIsCheckoutModalOpen(false)}
                className="order-3 sm:order-1 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition cursor-pointer"
              >
                إلغاء
              </button>
              <div className="order-1 sm:order-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                <button
                  type="button"
                  data-pos-modal-field="checkout-confirm-a4"
                  onClick={() => handlePerformCheckout(true)}
                  className="px-3.5 py-2.5 haseb-btn-primary font-bold text-xs rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <ShieldCheck className="w-4 h-4 shrink-0" />
                  <span>إصدار مع شهادة ضمان A4</span>
                </button>
                <button
                  type="button"
                  data-pos-modal-field="checkout-confirm-standard"
                  data-testid="pos-confirm-checkout-btn"
                  onClick={() => handlePerformCheckout(false)}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs sm:text-sm rounded-xl shadow-sm transition flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>تأكيد الدفع وإصدار الفاتورة</span>
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
        <div
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setIsReceiptModalOpen(false);
          }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-xs p-2 sm:p-4"
        >
          <div className="bg-slate-50 rounded-2xl shadow-2xl border border-slate-200/80 w-full max-w-4xl max-h-[92vh] overflow-hidden flex flex-col">
            {/* Top Template Switcher Toolbar */}
            <div className="px-4 sm:px-6 py-4 bg-white border-b border-slate-200/80 text-slate-900 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl haseb-card-gradient text-white flex items-center justify-center shrink-0">
                  <Printer className="w-5 h-5" />
                </div>
                <div>
                  <span className="font-bold text-sm text-slate-900">
                    معاينة وطباعة الفاتورة وشهادة الضمان ({completedInvoice.invoiceNumber})
                  </span>
                  <p className="text-[11px] text-slate-500">
                    تظهر الفاتورة بشعار وهوية منشأتك الخاصة — اختر القالب المناسب للطباعة
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-1.5 text-xs">
                {[
                  { mode: 'a4', tpl: 'a4_onyx_yemen', label: 'A4 اليمني المعتمد' },
                  { mode: 'a4', tpl: 'a4_global_sap_odoo', label: 'A4 التجاري الدولي' },
                  { mode: 'a4', tpl: 'a4_warranty_electronics', label: 'A4 شهادة ضمان' },
                  { mode: 'a4', tpl: 'a4_corporate_classic', label: 'A4 مؤسسية' },
                  { mode: 'a4', tpl: 'a4_modern_blue', label: 'A4 أزرق عصري' },
                  { mode: 'a4', tpl: 'a4_contracting_specs', label: 'A4 مقاولات' },
                  { mode: 'a4', tpl: 'a4_medical_pharmacy', label: 'A4 طبي FEFO' },
                  { mode: 'a4', tpl: 'a4_minimalist_clean', label: 'A4 مينيمل' },
                  { mode: 'thermal', tpl: 'thermal_80mm_onyx_pos', label: 'حراري 80mm اليمني' },
                  { mode: 'thermal', tpl: 'thermal_80mm_warranty', label: 'حراري 80mm ضمان' },
                  { mode: 'thermal', tpl: 'thermal_80mm_standard', label: 'حراري 80mm قياسي' },
                  { mode: 'thermal', tpl: 'thermal_80mm_modern', label: 'حراري 80mm عصري' },
                  { mode: 'thermal', tpl: 'thermal_80mm_minimal', label: 'حراري 80mm مينيمل' },
                  { mode: 'thermal', tpl: 'thermal_80mm_restaurant', label: 'حراري 80mm مطاعم' },
                  { mode: 'thermal', tpl: 'thermal_58mm_compact', label: 'حراري 58mm مضغوط' },
                ].map((opt) => (
                  <button
                    key={opt.tpl}
                    type="button"
                    data-testid={`pos-receipt-tpl-${opt.tpl}`}
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
                        ? 'haseb-nav-active'
                        : 'bg-white text-slate-600 border-slate-200/80 hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => {
                    setIsReceiptModalOpen(false);
                    setActiveTab('settings');
                    setTimeout(() => window.dispatchEvent(new CustomEvent('haseb-open-invoice-studio')), 40);
                  }}
                  className="px-3 py-1.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 font-bold cursor-pointer transition"
                >
                  تخصيص القالب والألوان
                </button>
              </div>
            </div>

            {/* Scrollable Invoice Renderer (Lazy-loaded) */}
            <div className="flex-1 overflow-y-auto p-3 sm:p-6">
              <Suspense
                fallback={
                  <div className="py-12 text-center text-xs font-bold text-slate-500">
                    جاري تحميل معاينة الفاتورة...
                  </div>
                }
              >
                <InvoiceRenderer
                  invoice={completedInvoice}
                  mode={receiptViewMode}
                  thermalTemplate={selectedThermalOverride}
                  standardTemplate={selectedA4Override}
                  settings={invoiceTemplateSettings}
                  companyName={company.nameAr || currentTenant.legalName}
                  companyNameEn={company.name}
                  companyLogo={company.logo}
                  taxNumber={company.taxNumber || '—'}
                  branchName={currentBranch.nameAr}
                  branchAddress={currentBranch.city}
                  branchPhone={currentBranch.phone}
                  currency={currency}
                />
              </Suspense>
            </div>

            {/* Bottom Actions */}
            <div className="p-4 bg-white border-t border-slate-200 flex flex-wrap justify-between items-center gap-2">
              <button
                type="button"
                data-testid="pos-receipt-close-btn"
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
                      recipientPhone: matchedCust?.phone || completedInvoice.customerPhone || '',
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
                      recipientPhone: matchedCust?.phone || completedInvoice.customerPhone || '',
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
                  className="px-5 py-2 haseb-btn-primary font-bold rounded-md text-xs flex items-center gap-2 transition cursor-pointer"
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
                <div className="w-10 h-10 rounded-xl haseb-card-gradient text-white flex items-center justify-center shrink-0">
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



      {/* ====================================================================
          MOBILE / TABLET BOTTOM-DOCKED CART & SPLIT-VIEW BAR (< lg)
          Anchored ergonomically above mobile bottom navigation
      ==================================================================== */}
      <div
        data-testid="pos-mobile-bottom-dock"
        className="lg:hidden fixed bottom-14 inset-x-0 z-30 px-2.5 py-2 bg-white/95 dark:bg-[#0B111E]/95 backdrop-blur-md border-t border-slate-200/80 dark:border-slate-800 shadow-[0_-8px_24px_-8px_rgba(15,23,42,0.12)] flex items-center justify-between gap-2"
      >
        {/* 3-Way Mode Switcher: Catalog | Split-View | Cart */}
        <div className="grid grid-cols-3 bg-slate-100 dark:bg-slate-900 p-1 rounded-xl gap-1 flex-1 min-w-0">
          <button
            type="button"
            data-testid="pos-mobile-tab-catalog"
            onClick={() => setMobilePosPane('CATALOG')}
            className={`min-h-[38px] px-2 py-1 rounded-lg text-[11px] font-bold flex items-center justify-center gap-1 transition cursor-pointer whitespace-nowrap ${
              mobilePosPane === 'CATALOG'
                ? 'haseb-nav-active'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
            }`}
          >
            <LayoutGrid className="w-3.5 h-3.5 shrink-0" />
            <span>المنتجات</span>
          </button>

          <button
            type="button"
            data-testid="pos-mobile-tab-split"
            onClick={() => setMobilePosPane('SPLIT')}
            className={`min-h-[38px] px-2 py-1 rounded-lg text-[11px] font-bold flex items-center justify-center gap-1 transition cursor-pointer whitespace-nowrap ${
              mobilePosPane === 'SPLIT'
                ? 'haseb-nav-active'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
            }`}
          >
            <Columns2 className="w-3.5 h-3.5 shrink-0" />
            <span>تقسيم</span>
          </button>

          <button
            type="button"
            data-testid="pos-mobile-tab-cart"
            onClick={() => setMobilePosPane('CART')}
            className={`min-h-[38px] px-2 py-1 rounded-lg text-[11px] font-bold flex items-center justify-center gap-1 transition cursor-pointer whitespace-nowrap ${
              mobilePosPane === 'CART'
                ? 'haseb-nav-active'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
            }`}
          >
            <ShoppingCart className="w-3.5 h-3.5 shrink-0" />
            <span>السلة</span>
            <span
              data-testid="pos-mobile-dock-cart-badge"
              className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                mobilePosPane === 'CART'
                  ? 'bg-white/25 text-white'
                  : cartTotalUnits > 0
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-200 text-slate-700'
              }`}
            >
              {cartTotalUnits}
            </span>
          </button>
        </div>

        {/* Live Total + Fast Checkout CTA */}
        <button
          type="button"
          data-testid="pos-mobile-dock-checkout-btn"
          disabled={posCart.length === 0}
          onClick={() => {
            if (posCart.length === 0) return;
            setPaymentMethod('CASH');
            setCashTendered(grandTotal);
            setSplitCashAmount(Math.round((grandTotal / 2) * 100) / 100);
            setCardReference(`RRN-${Math.floor(100000 + Math.random() * 900000)}`);
            setIsQuickNumpadOpen(false);
            setIsCheckoutModalOpen(true);
          }}
          className="min-h-[40px] px-3 py-1.5 rounded-xl haseb-btn-primary font-bold text-xs flex items-center gap-1.5 shrink-0 cursor-pointer disabled:opacity-45"
        >
          <CreditCard className="w-3.5 h-3.5 shrink-0" />
          <span>{posCart.length > 0 ? formatCleanNumber(grandTotal) : 'دفع'}</span>
          {posCart.length > 0 && <span className="text-[10px] opacity-90">{currency}</span>}
        </button>
      </div>

      {/* Live Camera Barcode & QR Scanner Modal (Lazy-loaded) */}
      {isCameraScannerOpen && (
        <Suspense fallback={<POSModalLoadingFallback />}>
          <CameraBarcodeScannerModal
            isOpen={isCameraScannerOpen}
            onClose={() => setIsCameraScannerOpen(false)}
            onScan={handleCameraBarcodeScan}
            onBatchScanComplete={handleCameraBatchScanComplete}
            contextMode="POS"
            title="مسح الباركود والكود بالكاميرا - نقطة البيع"
          />
        </Suspense>
      )}

      {/* Mobile Double-Tap Quick Actions Sheet for POS Products & Cart Items */}
      <MobileQuickActionsSheet
        target={posQuickActionTarget}
        onClose={() => setPosQuickActionTarget(null)}
        onSelectAction={handleSelectPosQuickAction}
        language={language}
      />
    </div>
  );
});

POSView.displayName = 'POSView';
export default POSView;

