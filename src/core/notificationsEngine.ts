/**
 * RLM ERP - Advanced Unified Notifications & Real-Time Alert Engine
 * Evaluates operational health, debtor limits, reorder thresholds, RMA tickets,
 * draft/held invoices, and backup integrity across all system modules.
 */

import { Product, Customer, SalesInvoice, WarrantyMaintenanceTicket, POSHoldBill, POSShift } from '../types/erp';

export type SystemNotificationCategory =
  | 'ALL'
  | 'DEBT_OVERDUE'      // مديونيات العملاء والموردين وتجاوز حدود الائتمان
  | 'LOW_STOCK'         // أصناف بلغت حد إعادة الطلب
  | 'OUT_OF_STOCK'      // إشعارات النواقص ونفاد المخزون التام
  | 'MAINTENANCE_RMA'   // تذكيرات الصيانة والضمان ومواعيد التسليم
  | 'SYSTEM_BACKUP'     // حفظ نسخ احتياطية للنظام وتنبيهات الأمان
  | 'HELD_INVOICES'     // الفواتير المعلقة ومسودات الكاشير
  | 'CASH_DRAWER'       // تنبيهات نقدية درج الصندوق وسقف الوردية
  | 'BRANCH_SYNC';      // مزامنة الفروع والتحويلات المعلقة

export type NotificationSeverity = 'critical' | 'warning' | 'info' | 'success';

export interface SystemNotification {
  id: string;
  category: SystemNotificationCategory;
  severity: NotificationSeverity;
  titleAr: string;
  titleEn: string;
  messageAr: string;
  messageEn: string;
  timestamp: string;
  isRead: boolean;
  count?: number;
  actionType?: 'DEBTS' | 'INVENTORY' | 'PURCHASING' | 'MAINTENANCE' | 'BACKUP' | 'POS' | 'SETTINGS' | 'BRANCH_TRANSFERS';
  actionPayload?: any;
  actionLabelAr?: string;
  actionLabelEn?: string;
}

/**
 * High-performance Web Audio API Synthesizer for Barcode Scanners
 * Generates an authentic supermarket/POS laser sound feedback without loading external audio assets.
 */
export function playScannerBeep(isSuccess = true) {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = isSuccess ? 'sine' : 'sawtooth';
    osc.frequency.setValueAtTime(isSuccess ? 1950 : 380, ctx.currentTime);

    if (isSuccess) {
      // Crisp 85ms POS Laser Chirp
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.085);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.085);
    } else {
      // Double Low Thud for Error / Unmatched Code
      osc.frequency.setValueAtTime(260, ctx.currentTime + 0.08);
      gain.gain.setValueAtTime(0.25, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.22);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.22);
    }
  } catch {
    // Audio contexts may be blocked by autoplay policies prior to user interaction
  }
}

interface NotificationEngineInput {
  products: Product[];
  customers: Customer[];
  salesInvoices: SalesInvoice[];
  warrantyTickets: WarrantyMaintenanceTicket[];
  holdBills: POSHoldBill[];
  currentShift: POSShift;
  currency: string;
  lastBackupTimestamp?: string | null;
  pendingTransfersCount?: number;
}

/**
 * Pure function that evaluates the operational state of the entire ERP and returns structured notifications
 */
export function generateSystemNotifications({
  products = [],
  customers = [],
  salesInvoices = [],
  warrantyTickets = [],
  holdBills = [],
  currentShift,
  currency,
  lastBackupTimestamp,
  pendingTransfersCount = 0,
}: NotificationEngineInput): SystemNotification[] {
  const notifications: SystemNotification[] = [];
  const now = new Date();
  const nowIso = now.toISOString();

  // 1. OUT OF STOCK SHORTAGES (النواقص ونفاد المخزون التام) - CRITICAL
  const zeroStockProducts = products.filter((p) => p.stockQty <= 0);
  if (zeroStockProducts.length > 0) {
    const sampleNames = zeroStockProducts.slice(0, 3).map((p) => p.nameAr || p.name).join('، ');
    notifications.push({
      id: `alert-out-of-stock-${zeroStockProducts.length}`,
      category: 'OUT_OF_STOCK',
      severity: 'critical',
      titleAr: `تنبيه نفاد المخزون ونواقص حرجة (${zeroStockProducts.length} صنف)`,
      titleEn: `Out-of-Stock Critical Shortages (${zeroStockProducts.length} items)`,
      messageAr: `يوجد ${zeroStockProducts.length} صنف رصيدها صفري بالمستودع وتعيق المبيعات، منها: (${sampleNames}). يتطلب إصدار أمر شراء عاجل.`,
      messageEn: `${zeroStockProducts.length} items are currently at zero stock, including: (${sampleNames}). Urgent purchase order recommended.`,
      timestamp: nowIso,
      isRead: false,
      count: zeroStockProducts.length,
      actionType: 'PURCHASING',
      actionLabelAr: 'إصدار أمر شراء للنواقص ↗',
      actionLabelEn: 'Issue Purchase Order ↗',
    });
  }

  // 2. LOW STOCK THRESHOLD ALERTS (أصناف بلغت أو قاربت حد إعادة الطلب) - WARNING
  const strictLowStockProducts = products.filter(
    (p) => p.stockQty > 0 && p.stockQty <= p.reorderPoint
  );
  const approachingLowStockProducts =
    strictLowStockProducts.length > 0
      ? strictLowStockProducts
      : products.filter(
          (p) => p.stockQty > 0 && p.stockQty <= Math.max((p.reorderPoint || 10) * 2.5, 30)
        );

  if (approachingLowStockProducts.length > 0) {
    const sampleNames = approachingLowStockProducts
      .slice(0, 3)
      .map((p) => `${p.nameAr || p.name} (${p.stockQty})`)
      .join('، ');
    notifications.push({
      id: `alert-low-stock-${approachingLowStockProducts.length}`,
      category: 'LOW_STOCK',
      severity: 'warning',
      titleAr:
        strictLowStockProducts.length > 0
          ? `أصناف بلغت حد إعادة الطلب (${strictLowStockProducts.length} صنف)`
          : `متابعة مستويات المخزون وإعادة الطلب (${approachingLowStockProducts.length} صنف)`,
      titleEn: `Low Stock Reorder Threshold (${approachingLowStockProducts.length} items)`,
      messageAr: `يوجد ${approachingLowStockProducts.length} صنف تتطلب متابعة التوريد وإعادة الطلب، أبرزها: (${sampleNames}). يرجى تأمين الكميات لضمان استمرارية المبيعات.`,
      messageEn: `${approachingLowStockProducts.length} items have reached or approached their reorder threshold, including: (${sampleNames}).`,
      timestamp: nowIso,
      isRead: false,
      count: approachingLowStockProducts.length,
      actionType: 'INVENTORY',
      actionLabelAr: 'عرض الأصناف بالمخزون ↗',
      actionLabelEn: 'View Low Stock Inventory ↗',
    });
  }

  // 3. DEBTORS & OVERDUE RECEIVABLES (مديونيات العملاء وتجاوز حدود الائتمان) - CRITICAL / WARNING
  const overCreditCustomers = customers.filter(
    (c) => (c.balance || 0) > (c.creditLimit && c.creditLimit > 0 ? c.creditLimit : 50000)
  );
  const debtorCustomers = customers.filter((c) => (c.balance || 0) > 0);
  const totalReceivables = debtorCustomers.reduce((sum, c) => sum + (c.balance || 0), 0);

  if (overCreditCustomers.length > 0) {
    const topDebtor = overCreditCustomers[0];
    notifications.push({
      id: `alert-credit-limit-${overCreditCustomers.length}`,
      category: 'DEBT_OVERDUE',
      severity: 'critical',
      titleAr: `تجاوز سقف الائتمان (${overCreditCustomers.length} عملاء)`,
      titleEn: `Credit Limit Breached (${overCreditCustomers.length} Customers)`,
      messageAr: `العميل (${topDebtor.nameAr || topDebtor.name}) تجاوز حد الائتمان المسموح به برصيد مدين ${topDebtor.balance.toLocaleString()} ${currency} من أصل حد ${topDebtor.creditLimit?.toLocaleString()} ${currency}.`,
      messageEn: `Customer (${topDebtor.name}) has breached credit limit with ${topDebtor.balance.toLocaleString()} ${currency} outstanding.`,
      timestamp: nowIso,
      isRead: false,
      count: overCreditCustomers.length,
      actionType: 'DEBTS',
      actionLabelAr: 'كشف المديونيات وإرسال تذكير ↗',
      actionLabelEn: 'Open Debt Ledger & Remind ↗',
    });
  }

  if (totalReceivables > 0) {
    const sampleDebtors = debtorCustomers
      .slice(0, 2)
      .map((c) => c.nameAr || c.name)
      .join('، ');
    notifications.push({
      id: `alert-total-receivables`,
      category: 'DEBT_OVERDUE',
      severity: 'warning',
      titleAr: `مديونيات عملاء مستحقة للتحصيل (${debtorCustomers.length} عميل)`,
      titleEn: `Outstanding Customer Receivables (${debtorCustomers.length} customers)`,
      messageAr: `إجمالي الذمم المدينة المستحقة للتحصيل يبلغ ${totalReceivables.toLocaleString()} ${currency} موزعة على ${debtorCustomers.length} عميل (${sampleDebtors}). تحصيل الدفعات يعزز سيولة الصندوق.`,
      messageEn: `Total outstanding customer receivables stand at ${totalReceivables.toLocaleString()} ${currency}.`,
      timestamp: nowIso,
      isRead: false,
      count: debtorCustomers.length,
      actionType: 'DEBTS',
      actionLabelAr: 'كشف مديونيات العملاء ↗',
      actionLabelEn: 'View Receivables ↗',
    });
  }

  // 4. MAINTENANCE & WARRANTY TICKETS (تذكيرات الصيانة والضمان ومواعيد التسليم)
  const readyTickets = warrantyTickets.filter((w) => w.status === 'READY');
  const inProgressTickets = warrantyTickets.filter(
    (w) => w.status !== 'DELIVERED' && w.status !== 'REJECTED' && w.status !== 'READY'
  );

  if (readyTickets.length > 0) {
    notifications.push({
      id: `alert-rma-ready-${readyTickets.length}`,
      category: 'MAINTENANCE_RMA',
      severity: 'info',
      titleAr: `أجهزة مكتملة الصيانة جاهزة للتسليم (${readyTickets.length} تذكرة)`,
      titleEn: `RMA Devices Ready for Delivery (${readyTickets.length} tickets)`,
      messageAr: `يوجد ${readyTickets.length} أجهزة تم الانتهاء من صيانتها واختبارها بنجاح وهي بانتظار استلام العملاء أو إرسال إشعار جاهزية عبر واتساب.`,
      messageEn: `${readyTickets.length} warranty maintenance devices are repaired and awaiting customer pickup or delivery.`,
      timestamp: nowIso,
      isRead: false,
      count: readyTickets.length,
      actionType: 'MAINTENANCE',
      actionLabelAr: 'متابعة تذاكر الصيانة ↗',
      actionLabelEn: 'View Maintenance RMA ↗',
    });
  }

  if (inProgressTickets.length > 0) {
    notifications.push({
      id: `alert-rma-in-progress-${inProgressTickets.length}`,
      category: 'MAINTENANCE_RMA',
      severity: 'warning',
      titleAr: `أجهزة تحت الفحص والصيانة بالضمان (${inProgressTickets.length} جهاز)`,
      titleEn: `Active Warranty Tickets In Progress (${inProgressTickets.length} devices)`,
      messageAr: `يوجد ${inProgressTickets.length} جهاز قيد الفحص الفني والإصلاح في مركز الضمان والصيانة. يرجى متابعة حالة قطع الغيار ومواعيد التسليم.`,
      messageEn: `${inProgressTickets.length} devices are undergoing diagnostics and repairs.`,
      timestamp: nowIso,
      isRead: false,
      count: inProgressTickets.length,
      actionType: 'MAINTENANCE',
      actionLabelAr: 'عرض جدول الصيانة ↗',
      actionLabelEn: 'View Repair Queue ↗',
    });
  }

  // 5. SYSTEM BACKUP & DATA INTEGRITY (حفظ نسخ احتياطية للنظام وتنبيهات الأمان)
  let needsBackup = true;
  if (lastBackupTimestamp) {
    const hoursSinceLastBackup =
      (now.getTime() - new Date(lastBackupTimestamp).getTime()) / (1000 * 60 * 60);
    if (hoursSinceLastBackup < 24) {
      needsBackup = false;
    }
  }

  if (needsBackup) {
    notifications.push({
      id: 'alert-system-backup-needed',
      category: 'SYSTEM_BACKUP',
      severity: 'critical',
      titleAr: 'تنبيه أمان: مطلوب حفظ نسخة احتياطية للنظام',
      titleEn: 'Security Notice: System Backup Required',
      messageAr:
        'لم يتم حفظ نسخة احتياطية مشفرة لقاعدة البيانات اليوم. قم بتنزيل نسخة احتياطية الآن لحماية بيانات المعاملات والمحاسبة.',
      messageEn:
        'No encrypted system snapshot has been exported recently. Download a secure backup now to safeguard financial records.',
      timestamp: nowIso,
      isRead: false,
      actionType: 'BACKUP',
      actionLabelAr: 'حفظ نسخة احتياطية فوراً 💾',
      actionLabelEn: 'Instant Backup Now 💾',
    });
  } else {
    notifications.push({
      id: 'alert-system-backup-ok',
      category: 'SYSTEM_BACKUP',
      severity: 'success',
      titleAr: 'النسخ الاحتياطي للنظام محدث ومؤمن',
      titleEn: 'System Backup Up-to-Date & Secured',
      messageAr: `تم حفظ نسخة احتياطية مشفرة بنجاح في ${new Date(
        lastBackupTimestamp!
      ).toLocaleTimeString('ar-SA')}. قاعدة البيانات مؤمنة بالكامل.`,
      messageEn: 'Encrypted system database backup is valid and up-to-date.',
      timestamp: lastBackupTimestamp!,
      isRead: true,
      actionType: 'BACKUP',
      actionLabelAr: 'تنزيل نسخة جديدة ↗',
      actionLabelEn: 'Download Fresh Backup ↗',
    });
  }

  // 6. HELD INVOICES & SUSPENDED ORDERS (الفواتير المعلقة ومسودات الكاشير)
  if (holdBills.length > 0) {
    const totalHeldItems = holdBills.reduce((sum, b) => sum + b.items.length, 0);
    notifications.push({
      id: `alert-held-invoices-${holdBills.length}`,
      category: 'HELD_INVOICES',
      severity: 'warning',
      titleAr: `فواتير مبيعات معلقة في نقطة البيع (${holdBills.length} فاتورة)`,
      titleEn: `Suspended Invoices in POS (${holdBills.length} orders)`,
      messageAr: `توجد ${holdBills.length} فاتورة معلقة (بإجمالي ${totalHeldItems} صنف) لم تستكمل في الكاشير. يرجى استئنافها أو إفراغها.`,
      messageEn: `There are ${holdBills.length} parked orders (${totalHeldItems} items) waiting in POS checkout.`,
      timestamp: nowIso,
      isRead: false,
      count: holdBills.length,
      actionType: 'POS',
      actionLabelAr: 'استئناف الفواتير بنقطة البيع ↗',
      actionLabelEn: 'Resume Orders in POS ↗',
    });
  }

  // 7. CASH DRAWER & SHIFT BALANCE (تنبيهات نقدية درج الصندوق وحالة الوردية النشطة)
  const cashInDrawer = currentShift?.expectedCash || 0;
  if (cashInDrawer > 0) {
    const isHighCash =
      (currency === 'YER' && cashInDrawer > 1500000) ||
      (currency !== 'YER' && cashInDrawer > 25000);
    notifications.push({
      id: 'alert-cash-drawer-threshold',
      category: 'CASH_DRAWER',
      severity: isHighCash ? 'warning' : 'info',
      titleAr: isHighCash
        ? `تنبيه سقف النقدية بدرج الكاشير (${cashInDrawer.toLocaleString()} ${currency})`
        : `سيولة وردية الكاشير النشطة (${cashInDrawer.toLocaleString()} ${currency})`,
      titleEn: `Cash Drawer Balance (${cashInDrawer.toLocaleString()} ${currency})`,
      messageAr: isHighCash
        ? `تجاوزت السيولة النقدية بدرج الكاشير سقف الأمان (${cashInDrawer.toLocaleString()} ${currency}). يُنصح بتوريد دفعة إلى الخزينة الرئيسية.`
        : `الرصيد النقدي المتوقع في درج الكاشير للوردية الحالية يبلغ ${cashInDrawer.toLocaleString()} ${currency} (${salesInvoices.length} فاتورة مسجلة).`,
      messageEn: `Current shift expected cash in drawer is ${cashInDrawer.toLocaleString()} ${currency}.`,
      timestamp: nowIso,
      isRead: false,
      actionType: 'POS',
      actionLabelAr: 'مراجعة صندوق الوردية ↗',
      actionLabelEn: 'Manage Shift Cash ↗',
    });
  }

  // 8. BRANCH LAN TRANSFERS (مزامنة الفروع)
  if (pendingTransfersCount > 0) {
    notifications.push({
      id: `alert-branch-transfers-${pendingTransfersCount}`,
      category: 'BRANCH_SYNC',
      severity: 'info',
      titleAr: `تحويلات بضائع معلقة بين الفروع (${pendingTransfersCount})`,
      titleEn: `Pending Inter-Branch Transfers (${pendingTransfersCount})`,
      messageAr: `يوجد ${pendingTransfersCount} طلب تحويل أصناف عبر شبكة الفروع بانتظار التأكيد والاستلام المخزني.`,
      messageEn: `${pendingTransfersCount} inter-branch stock transfer requests require confirmation.`,
      timestamp: nowIso,
      isRead: false,
      count: pendingTransfersCount,
      actionType: 'BRANCH_TRANSFERS',
      actionLabelAr: 'متابعة التحويلات ↗',
      actionLabelEn: 'View Transfers ↗',
    });
  }

  return notifications;
}
