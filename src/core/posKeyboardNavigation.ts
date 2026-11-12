/**
 * High-Speed POS & ERP Form Keyboard Navigation Engine (Tab / Shift+Tab / Enter)
 * Provides deterministic field ordering, cyclic focus wrap-around, and active field metadata
 * to maximize cashier data-entry velocity in Point of Sale and enterprise forms.
 */

export interface PosFieldDescriptor {
  id: string;
  stepNumber: number;
  labelAr: string;
  labelEn: string;
  shortcutHint?: string;
  autoSelectOnFocus?: boolean;
}

export const POS_CORE_FIELD_DESCRIPTORS: Record<string, PosFieldDescriptor> = {
  'pos-barcode-input': {
    id: 'pos-barcode-input',
    stepNumber: 1,
    labelAr: 'مسح الباركود / الكود SKU',
    labelEn: 'Barcode / SKU Scanner',
    shortcutHint: 'Tab ↹',
    autoSelectOnFocus: true,
  },
  'pos-search-input': {
    id: 'pos-search-input',
    stepNumber: 2,
    labelAr: 'البحث بالاسم أو المواصفة',
    labelEn: 'Product Search',
    shortcutHint: 'Tab ↹',
    autoSelectOnFocus: true,
  },
  'pos-customer-select': {
    id: 'pos-customer-select',
    stepNumber: 3,
    labelAr: 'اختيار العميل',
    labelEn: 'Customer Selection',
    shortcutHint: 'Tab ↹',
  },
  'pos-warranty-name-input': {
    id: 'pos-warranty-name-input',
    stepNumber: 4,
    labelAr: 'اسم المستفيد بشهادة الضمان',
    labelEn: 'Warranty Beneficiary Name',
    shortcutHint: 'Tab ↹',
    autoSelectOnFocus: true,
  },
  'pos-warranty-phone-input': {
    id: 'pos-warranty-phone-input',
    stepNumber: 5,
    labelAr: 'جوال العميل',
    labelEn: 'Customer Phone',
    shortcutHint: 'Tab ↹',
    autoSelectOnFocus: true,
  },
  'pos-discount-value-input': {
    id: 'pos-discount-value-input',
    stepNumber: 6,
    labelAr: 'قيمة الخصم على السلة',
    labelEn: 'Cart Discount Value',
    shortcutHint: 'Tab ↹',
    autoSelectOnFocus: true,
  },
  'pos-checkout-btn': {
    id: 'pos-checkout-btn',
    stepNumber: 7,
    labelAr: 'دفع وإصدار الضمان',
    labelEn: 'Checkout & Issue Warranty',
    shortcutHint: 'F9 / Enter',
  },
};

/**
 * Computes the next or previous index in an ordered list of focusable field IDs,
 * wrapping around cleanly from the end to the beginning (and vice-versa for Shift+Tab).
 */
export function computeNextPosTabStopIndex(
  orderedFieldIds: string[],
  currentFieldId: string | null,
  direction: 'NEXT' | 'PREV' = 'NEXT'
): { targetIndex: number; targetFieldId: string | null; wrapped: boolean } {
  if (!Array.isArray(orderedFieldIds) || orderedFieldIds.length === 0) {
    return { targetIndex: -1, targetFieldId: null, wrapped: false };
  }

  const currentIndex = currentFieldId ? orderedFieldIds.indexOf(currentFieldId) : -1;

  if (currentIndex === -1) {
    const fallbackIndex = direction === 'NEXT' ? 0 : orderedFieldIds.length - 1;
    return {
      targetIndex: fallbackIndex,
      targetFieldId: orderedFieldIds[fallbackIndex],
      wrapped: false,
    };
  }

  if (direction === 'NEXT') {
    const nextIndex = (currentIndex + 1) % orderedFieldIds.length;
    return {
      targetIndex: nextIndex,
      targetFieldId: orderedFieldIds[nextIndex],
      wrapped: nextIndex === 0 && orderedFieldIds.length > 1,
    };
  } else {
    const prevIndex = (currentIndex - 1 + orderedFieldIds.length) % orderedFieldIds.length;
    return {
      targetIndex: prevIndex,
      targetFieldId: orderedFieldIds[prevIndex],
      wrapped: prevIndex === orderedFieldIds.length - 1 && orderedFieldIds.length > 1,
    };
  }
}

/**
 * Builds the complete ordered list of POS fast-entry field IDs based on current cart items
 * and whether the checkout button is enabled.
 */
export function buildOrderedPosFieldIds(
  cartProductIds: string[],
  isCheckoutEnabled: boolean
): string[] {
  const ordered: string[] = [
    'pos-barcode-input',
    'pos-search-input',
    'pos-customer-select',
    'pos-warranty-name-input',
    'pos-warranty-phone-input',
  ];

  for (const pid of cartProductIds) {
    ordered.push(`pos-cart-serial-${pid}`);
    ordered.push(`pos-cart-warranty-${pid}`);
  }

  ordered.push('pos-discount-value-input');

  if (isCheckoutEnabled) {
    ordered.push('pos-checkout-btn');
  }

  return ordered;
}

/**
 * Resolves a human-readable Arabic/English label for any focused POS field ID,
 * including dynamic cart item Serial Number and Warranty fields.
 */
export function resolvePosActiveFieldLabel(
  fieldId: string | null,
  language: 'ar' | 'en' = 'ar'
): { label: string; stepBadge: string } {
  if (!fieldId) {
    return {
      label: language === 'ar' ? 'مسح الباركود / الكود SKU' : 'Barcode / SKU Scanner',
      stepBadge: '1',
    };
  }

  const core = POS_CORE_FIELD_DESCRIPTORS[fieldId];
  if (core) {
    return {
      label: language === 'ar' ? core.labelAr : core.labelEn,
      stepBadge: String(core.stepNumber),
    };
  }

  if (fieldId.startsWith('pos-cart-serial-')) {
    return {
      label: language === 'ar' ? 'الرقم التسلسلي للصنف (SN / IMEI)' : 'Item Serial Number (SN / IMEI)',
      stepBadge: 'S/N',
    };
  }

  if (fieldId.startsWith('pos-cart-warranty-')) {
    return {
      label: language === 'ar' ? 'مدة ضمان الصنف بالشهور' : 'Item Warranty Duration',
      stepBadge: 'ضمان',
    };
  }

  if (fieldId.startsWith('pos-checkout-')) {
    return {
      label: language === 'ar' ? 'نافذة تحصيل المبلغ وإتمام الدفع' : 'Payment Settlement Modal',
      stepBadge: 'دفع',
    };
  }

  return {
    label: language === 'ar' ? 'حقل إدخال نشط' : 'Active Input Field',
    stepBadge: '↹',
  };
}
