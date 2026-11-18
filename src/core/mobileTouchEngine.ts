export const DOUBLE_TAP_THRESHOLD_MS = 320;
export const MIN_TOUCH_TARGET_PX = 44;

export type MobileQuickActionTone = 'primary' | 'emerald' | 'amber' | 'rose' | 'indigo' | 'slate';

export type MobileQuickActionContextType =
  | 'NAV_MODULE'
  | 'POS_PRODUCT'
  | 'POS_CART_ITEM'
  | 'INVENTORY_PRODUCT'
  | 'WHATSAPP_CHAT';

export interface MobileQuickActionDescriptor {
  id: string;
  labelAr: string;
  labelEn: string;
  subtitleAr: string;
  badgeText?: string;
  tone: MobileQuickActionTone;
}

export interface MobileQuickActionTarget {
  contextType: MobileQuickActionContextType;
  itemId: string;
  titleAr: string;
  subtitleAr?: string;
  badgeAr?: string;
  sku?: string;
  productId?: string;
  chatId?: string;
  moduleId?: string;
}

export interface DoubleTapEvaluationResult {
  isDoubleTap: boolean;
  nextLastTapTimestampMs: number;
  nextLastTapItemId: string | null;
  deltaMs: number;
}

/**
 * Pure deterministic evaluator for mobile touch/click Double-Tap gestures on list items.
 */
export function evaluateDoubleTapGesture(
  lastTapTimestampMs: number,
  lastTapItemId: string | null,
  currentTimestampMs: number,
  currentItemId: string,
  thresholdMs: number = DOUBLE_TAP_THRESHOLD_MS
): DoubleTapEvaluationResult {
  const safeThreshold = Math.max(120, Math.min(600, thresholdMs));
  const deltaMs =
    lastTapItemId === currentItemId && lastTapTimestampMs > 0
      ? currentTimestampMs - lastTapTimestampMs
      : -1;

  if (
    lastTapItemId === currentItemId &&
    lastTapTimestampMs > 0 &&
    deltaMs >= 0 &&
    deltaMs <= safeThreshold
  ) {
    return {
      isDoubleTap: true,
      nextLastTapTimestampMs: 0,
      nextLastTapItemId: null,
      deltaMs,
    };
  }

  return {
    isDoubleTap: false,
    nextLastTapTimestampMs: currentTimestampMs,
    nextLastTapItemId: currentItemId,
    deltaMs,
  };
}

/**
 * Builds context-aware quick action items when a user double-taps a list item on mobile.
 */
export function buildMobileQuickActionsForTarget(
  target: MobileQuickActionTarget
): MobileQuickActionDescriptor[] {
  switch (target.contextType) {
    case 'NAV_MODULE': {
      const modId = target.moduleId || target.itemId;
      if (modId === 'pos') {
        return [
          {
            id: 'nav-pos-open',
            labelAr: 'فتح شاشة الكاشير الفوري',
            labelEn: 'Open POS Register',
            subtitleAr: 'الانتقال المباشر لإصدار فاتورة مبيعات جديدة',
            badgeText: 'F2',
            tone: 'primary',
          },
          {
            id: 'nav-pos-camera',
            labelAr: 'مسح باركود الصنف بالكاميرا',
            labelEn: 'Scan Barcode via Camera',
            subtitleAr: 'تشغيل عدسة الكاميرا لإضافة الأصناف للسلة فوراً',
            badgeText: 'F1',
            tone: 'emerald',
          },
          {
            id: 'nav-pos-customer',
            labelAr: 'اختيار العميل المستفيد للفاتورة',
            labelEn: 'Select Beneficiary Customer',
            subtitleAr: 'تحديد عميل الفاتورة والضمان السريع',
            badgeText: 'F8',
            tone: 'indigo',
          },
          {
            id: 'nav-pos-shift',
            labelAr: 'فتح / إغلاق الوردية (الوضع المرن)',
            labelEn: 'Open / Close Shift',
            subtitleAr: 'إدارة وردية الكاشير وعهدة الصندوق النقدية',
            tone: 'amber',
          },
        ];
      }
      if (modId === 'inventory') {
        return [
          {
            id: 'nav-inv-open',
            labelAr: 'استعراض أصناف المستودع',
            labelEn: 'Browse Inventory Catalog',
            subtitleAr: 'عرض الأرصدة والأسعار والتصنيفات الهندسية',
            badgeText: 'F3',
            tone: 'primary',
          },
          {
            id: 'nav-inv-fast-stock',
            labelAr: 'وضع الجرد السريع بالباركود',
            labelEn: 'Fast Barcode Stock-Take',
            subtitleAr: 'مطابقة الأرصدة الفعلية مع التنبيه الصوتي اللحظي',
            badgeText: '⚡',
            tone: 'emerald',
          },
          {
            id: 'nav-inv-probe-branches',
            labelAr: 'فحص أرصدة الفروع والشبكة',
            labelEn: 'Cross-Branch Stock Probe',
            subtitleAr: 'الاستعلام عن توفر الأصناف في كافة المستودعات',
            tone: 'indigo',
          },
        ];
      }
      if (modId === 'communications') {
        return [
          {
            id: 'nav-comm-chats',
            labelAr: 'فتح محادثات واتساب النشطة',
            labelEn: 'Open Active WhatsApp Chats',
            subtitleAr: 'الرد الفوري على العملاء وإرسال المستندات',
            tone: 'emerald',
          },
          {
            id: 'nav-comm-quick-send',
            labelAr: 'إرسال فوري لفاتورة أو كشف حساب',
            labelEn: 'Quick Send Invoice / Statement',
            subtitleAr: 'فتح نافذة الإرسال السريع لأي رقم أو عميل',
            badgeText: '⚡',
            tone: 'primary',
          },
          {
            id: 'nav-comm-qr',
            labelAr: 'إدارة الربط وباركود QR',
            labelEn: 'WhatsApp QR Pairing',
            subtitleAr: 'ربط أو فحص حالة اتصال خادم واتساب',
            tone: 'indigo',
          },
        ];
      }
      return [
        {
          id: 'nav-generic-open',
          labelAr: `فتح ${target.titleAr} الآن`,
          labelEn: `Open ${target.titleAr}`,
          subtitleAr: 'الانتقال المباشر إلى هذه الواجهة',
          tone: 'primary',
        },
        {
          id: 'nav-generic-quick-send',
          labelAr: 'إرسال مستند سريع عبر واتساب',
          labelEn: 'Quick WhatsApp Dispatch',
          subtitleAr: 'مشاركة فاتورة أو إشعار مالي فوري مع العميل',
          tone: 'emerald',
        },
        {
          id: 'nav-generic-lan',
          labelAr: 'مزامنة الشبكة المحلية (LAN Sync)',
          labelEn: 'Local LAN Synchronization',
          subtitleAr: 'فحص الاتصال اللحظي بين أجهزة الشبكة والجوال',
          tone: 'indigo',
        },
      ];
    }

    case 'POS_PRODUCT':
      return [
        {
          id: 'pos-prod-add-1',
          labelAr: 'إضافة قطعة واحدة للسلة (+1)',
          labelEn: 'Add 1 Unit to Cart',
          subtitleAr: 'إدراج الصنف مباشرة في فاتورة المبيعات الحالية',
          badgeText: '+1',
          tone: 'primary',
        },
        {
          id: 'pos-prod-add-5',
          labelAr: 'إضافة كمية جملة للسلة (+5)',
          labelEn: 'Add 5 Units to Cart',
          subtitleAr: 'إدراج 5 وحدات دفعة واحدة لتسريع الفوترة',
          badgeText: '+5',
          tone: 'emerald',
        },
        {
          id: 'pos-prod-probe',
          labelAr: 'فحص توفر الصنف في الفروع',
          labelEn: 'Check Stock Across Branches',
          subtitleAr: 'عرض الكميات المتوفرة في باقي الفروع والمستودعات',
          tone: 'indigo',
        },
        {
          id: 'pos-prod-whatsapp',
          labelAr: 'إرسال عرض سعر الصنف عبر واتساب',
          labelEn: 'Send Product Quote via WhatsApp',
          subtitleAr: 'مشاركة سعر ومواصفات الصنف والضمان مع العميل',
          tone: 'amber',
        },
      ];

    case 'POS_CART_ITEM':
      return [
        {
          id: 'cart-item-inc',
          labelAr: 'زيادة الكمية بمقدار (+1)',
          labelEn: 'Increase Quantity (+1)',
          subtitleAr: 'إضافة وحدة إضافية على السطر الحالي في السلة',
          badgeText: '+1',
          tone: 'primary',
        },
        {
          id: 'cart-item-double',
          labelAr: 'مضاعفة الكمية الحالية (×2)',
          labelEn: 'Double Quantity (x2)',
          subtitleAr: 'مضاعفة عدد الوحدات المسجلة لهذا الصنف فوراً',
          badgeText: '×2',
          tone: 'emerald',
        },
        {
          id: 'cart-item-focus-sn',
          labelAr: 'إدخال الرقم التسلسلي (S/N) والضمان',
          labelEn: 'Edit Serial Number & Warranty',
          subtitleAr: 'التركيز المباشر على خانة السيريال لتوثيق الضمان',
          tone: 'indigo',
        },
        {
          id: 'cart-item-remove',
          labelAr: 'حذف الصنف من السلة نهائياً',
          labelEn: 'Remove Item from Cart',
          subtitleAr: 'إزالة هذا البند من الفاتورة الحالية',
          tone: 'rose',
        },
      ];

    case 'INVENTORY_PRODUCT':
      return [
        {
          id: 'inv-prod-sell-pos',
          labelAr: 'بيع فوري في نقطة البيع (POS)',
          labelEn: 'Sell Immediately in POS',
          subtitleAr: 'إضافة الصنف لسلة المبيعات والانتقال لشاشة الكاشير',
          badgeText: 'POS',
          tone: 'primary',
        },
        {
          id: 'inv-prod-edit',
          labelAr: 'تعديل بيانات الصنف والسعر',
          labelEn: 'Edit Product & Pricing',
          subtitleAr: 'تحديث الاسم، سعر البيع، الكود، أو التصنيف المخزني',
          tone: 'indigo',
        },
        {
          id: 'inv-prod-qr-label',
          labelAr: 'توليد وطباعة ملصق QR (SKU + Barcode)',
          labelEn: 'Generate & Print QR Label',
          subtitleAr: 'توليد رمز QR مشفر بالباركود ورمز الصنف لطباعة الملصقات المخزنية',
          badgeText: 'QR',
          tone: 'emerald',
        },
        {
          id: 'inv-prod-stock-inc',
          labelAr: 'زيادة الرصيد المخزني السريع (+1)',
          labelEn: 'Quick Increment Stock (+1)',
          subtitleAr: 'تحديث كمية المستودع الحالي بإضافة وحدة واحدة',
          badgeText: '+1',
          tone: 'emerald',
        },
        {
          id: 'inv-prod-stock-take',
          labelAr: 'جرد وتسوية الرصيد الفعلي',
          labelEn: 'Audit & Reconcile Stock',
          subtitleAr: 'فتح شاشة الجرد الفعلي للصنف ومطابقة الكمية',
          tone: 'amber',
        },
        {
          id: 'inv-prod-branches',
          labelAr: 'فحص أرصدة الصنف في الفروع',
          labelEn: 'Probe Cross-Branch Stock',
          subtitleAr: 'الاستعلام اللحظي عن أرصدة الفروع وطلب تحويل',
          tone: 'slate',
        },
        {
          id: 'inv-prod-delete',
          labelAr: 'حذف الصنف من المستودع',
          labelEn: 'Delete Product',
          subtitleAr: 'إزالة بطاقة الصنف من سجل المخزون',
          tone: 'rose',
        },
      ];

    case 'WHATSAPP_CHAT':
      return [
        {
          id: 'wa-chat-open',
          labelAr: 'فتح المحادثة والرد الفوري',
          labelEn: 'Open Conversation',
          subtitleAr: 'عرض سجل الرسائل الكامل وإرسال رد مباشر',
          tone: 'emerald',
        },
        {
          id: 'wa-chat-send-invoice',
          labelAr: 'إرسال فاتورة مبيعات للعميل',
          labelEn: 'Send Sales Invoice',
          subtitleAr: 'تجهيز وإرسال فاتورة إلكترونية عبر واتساب',
          badgeText: 'PDF',
          tone: 'primary',
        },
        {
          id: 'wa-chat-send-statement',
          labelAr: 'إرسال كشف حساب / تذكير مديونية',
          labelEn: 'Send Account Statement',
          subtitleAr: 'مشاركة الرصيد الحالي وكشف الحساب التفصيلي',
          tone: 'amber',
        },
        {
          id: 'wa-chat-toggle-pin',
          labelAr: 'تثبيت / إلغاء تثبيت المحادثة',
          labelEn: 'Pin / Unpin Conversation',
          subtitleAr: 'تثبيت العميل في أعلى قائمة المحادثات للوصول السريع',
          tone: 'indigo',
        },
      ];
  }
}

export interface TouchTargetErgonomicsMetrics {
  minButtonHeightPx: number;
  minIconHitBoxPx: number;
  surroundingGapPx: number;
  buttonPaddingXClass: string;
  buttonPaddingYClass: string;
  doubleTapThresholdMs: number;
  isMobileTouchViewport: boolean;
}

export function computeTouchTargetMetrics(viewportWidth: number): TouchTargetErgonomicsMetrics {
  const isMobileTouchViewport = viewportWidth < 1024;
  return {
    minButtonHeightPx: isMobileTouchViewport ? MIN_TOUCH_TARGET_PX : 36,
    minIconHitBoxPx: isMobileTouchViewport ? 42 : 32,
    surroundingGapPx: isMobileTouchViewport ? 10 : 6,
    buttonPaddingXClass: isMobileTouchViewport ? 'px-3.5' : 'px-2.5',
    buttonPaddingYClass: isMobileTouchViewport ? 'py-2.5' : 'py-1.5',
    doubleTapThresholdMs: DOUBLE_TAP_THRESHOLD_MS,
    isMobileTouchViewport,
  };
}
