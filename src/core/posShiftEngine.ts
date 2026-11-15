import { POSShift } from '../types/erp';

export interface ShiftActionControlMeta {
  isOpen: boolean;
  mode: 'OPEN' | 'CLOSE';
  label: string;
  shortLabel: string;
  statusBadge: string;
}

/**
 * Creates a clean default shiftless state (`CLOSED`) so the ERP runs seamlessly
 * on first launch without forcing the user to open or close a shift.
 */
export const createDefaultShiftlessState = (params?: {
  tenantId?: string;
  branchId?: string;
  cashierId?: string;
  cashierName?: string;
}): POSShift => ({
  id: 'shift-none',
  tenantId: params?.tenantId || 'ten-1',
  branchId: params?.branchId || 'branch-main-01',
  cashierId: params?.cashierId || 'usr-admin-1',
  cashierName: params?.cashierName || 'المدير العام',
  startTime: '',
  startingCash: 0,
  cashSales: 0,
  cardSales: 0,
  totalSales: 0,
  expectedCash: 0,
  status: 'CLOSED',
});

/**
 * Returns true only when a cashier shift has been explicitly opened.
 */
export const isShiftActive = (shift?: POSShift | null): boolean =>
  Boolean(shift && shift.status === 'OPEN');

/**
 * Accumulates POS checkout totals into `currentShift` ONLY if a shift is currently OPEN.
 * When no shift is open (`CLOSED`), the ERP operates in flexible shiftless mode and
 * leaves `shift` untouched (`CLOSED`) instead of creating a phantom open shift.
 */
export const applySaleToShift = (
  shift: POSShift,
  sale: { grandTotal: number; cashPortion: number; cardPortion: number }
): POSShift => {
  if (!shift || shift.status !== 'OPEN') {
    return shift;
  }
  const cleanGrand = Math.max(0, Number(sale.grandTotal) || 0);
  const cleanCash = Math.max(0, Number(sale.cashPortion) || 0);
  const cleanCard = Math.max(0, Number(sale.cardPortion) || 0);

  return {
    ...shift,
    status: 'OPEN',
    cashSales: Math.round((shift.cashSales + cleanCash) * 100) / 100,
    cardSales: Math.round((shift.cardSales + cleanCard) * 100) / 100,
    totalSales: Math.round((shift.totalSales + cleanGrand) * 100) / 100,
    expectedCash: Math.round((shift.expectedCash + cleanCash) * 100) / 100,
  };
};

/**
 * Returns bilingual UI labels & action modes for navbar/profile/POS shift controls.
 */
export const getShiftActionControlMeta = (
  shift: POSShift | null | undefined,
  language: 'ar' | 'en'
): ShiftActionControlMeta => {
  const active = isShiftActive(shift);
  if (active) {
    return {
      isOpen: true,
      mode: 'CLOSE',
      label: language === 'ar' ? 'إغلاق الوردية' : 'Close Shift',
      shortLabel: language === 'ar' ? 'إغلاق وردية' : 'Close Shift',
      statusBadge: language === 'ar' ? 'وردية نشطة' : 'Shift Open',
    };
  }
  return {
    isOpen: false,
    mode: 'OPEN',
    label: language === 'ar' ? 'فتح وردية' : 'Open Shift',
    shortLabel: language === 'ar' ? 'فتح وردية' : 'Open Shift',
    statusBadge: language === 'ar' ? 'وضع مرن (بدون وردية)' : 'Flexible (No Shift)',
  };
};
