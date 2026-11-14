import React, { useState, useMemo, useEffect } from 'react';
import {
  Bell,
  X,
  AlertTriangle,
  AlertCircle,
  HardDrive,
  Clock,
  CheckCircle2,
  CheckCheck,
  Trash2,
  ArrowUpRight,
  Sparkles,
} from 'lucide-react';
import { useERP } from '../../context/ERPContext';
import {
  SystemNotification,
  SystemNotificationCategory,
  generateSystemNotifications,
} from '../../core/notificationsEngine';

interface SystemNotificationCenterModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SystemNotificationCenterModal: React.FC<SystemNotificationCenterModalProps> = ({
  isOpen,
  onClose,
}) => {
  const {
    products,
    customers,
    salesInvoices,
    warrantyTickets,
    holdBills,
    currentShift,
    currency,
    language,
    setActiveTab,
    exportEncryptedDatabaseSnapshot,
    interBranchTransfers,
    uiTheme,
  } = useERP();

  const [activeCategoryFilter, setActiveCategoryFilter] =
    useState<SystemNotificationCategory>('ALL');
  const [readNotificationIds, setReadNotificationIds] = useState<Set<string>>(new Set());
  const [dismissedNotificationIds, setDismissedNotificationIds] = useState<Set<string>>(new Set());
  const [lastBackupTimestamp, setLastBackupTimestamp] = useState<string | null>(() => {
    return localStorage.getItem('rlm_last_backup_timestamp');
  });
  const [backupBannerSuccess, setBackupBannerSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Generate dynamic system notifications across all operational modules
  const rawNotifications = useMemo(() => {
    return generateSystemNotifications({
      products,
      customers,
      salesInvoices,
      warrantyTickets,
      holdBills,
      currentShift,
      currency,
      lastBackupTimestamp,
      pendingTransfersCount: interBranchTransfers.filter(
        (t) => t.status === 'PENDING_APPROVAL' || t.status === 'IN_TRANSIT'
      ).length,
    });
  }, [
    products,
    customers,
    salesInvoices,
    warrantyTickets,
    holdBills,
    currentShift,
    currency,
    lastBackupTimestamp,
    interBranchTransfers,
  ]);

  // Apply read and dismissed states
  const activeNotifications = useMemo(() => {
    return rawNotifications
      .filter((n) => !dismissedNotificationIds.has(n.id))
      .map((n) => ({
        ...n,
        isRead: n.isRead || readNotificationIds.has(n.id),
      }));
  }, [rawNotifications, dismissedNotificationIds, readNotificationIds]);

  // Filter by category
  const filteredNotifications = useMemo(() => {
    if (activeCategoryFilter === 'ALL') return activeNotifications;
    return activeNotifications.filter((n) => n.category === activeCategoryFilter);
  }, [activeNotifications, activeCategoryFilter]);

  const unreadCount = activeNotifications.filter((n) => !n.isRead).length;
  const criticalCount = activeNotifications.filter((n) => n.severity === 'critical').length;

  // Actions
  const handleMarkAllAsRead = () => {
    const allIds = new Set(activeNotifications.map((n) => n.id));
    setReadNotificationIds(allIds);
  };

  const handleClearRead = () => {
    const readIds = activeNotifications.filter((n) => n.isRead).map((n) => n.id);
    setDismissedNotificationIds((prev) => new Set([...prev, ...readIds]));
  };

  const handleDismissOne = (id: string) => {
    setDismissedNotificationIds((prev) => new Set([...prev, id]));
  };

  const handleToggleRead = (id: string) => {
    setReadNotificationIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Instant 1-Click Backup
  const handleInstantBackup = () => {
    const backupRes = exportEncryptedDatabaseSnapshot();
    const nowIso = new Date().toISOString();
    setLastBackupTimestamp(nowIso);
    localStorage.setItem('rlm_last_backup_timestamp', nowIso);
    setBackupBannerSuccess(
      language === 'ar'
        ? `تم تنزيل النسخة الاحتياطية (${backupRes.filename}) بنجاح وتحديث حالة أمان النظام.`
        : `Database backup (${backupRes.filename}) downloaded successfully.`
    );
    setTimeout(() => setBackupBannerSuccess(null), 5000);
  };

  // 1-Click Action Handler
  const handleNotificationAction = (notification: SystemNotification) => {
    handleToggleRead(notification.id);
    onClose();

    switch (notification.actionType) {
      case 'DEBTS':
        setActiveTab('reportsAndAI');
        break;
      case 'INVENTORY':
        setActiveTab('inventory');
        break;
      case 'PURCHASING':
        setActiveTab('purchasing');
        break;
      case 'MAINTENANCE':
        setActiveTab('businessModules');
        break;
      case 'POS':
        setActiveTab('pos');
        break;
      case 'BACKUP':
        handleInstantBackup();
        break;
      case 'BRANCH_TRANSFERS':
        setActiveTab('inventory');
        break;
      default:
        setActiveTab('pos');
        break;
    }
  };

  if (!isOpen) return null;

  const isDark = uiTheme === 'obsidian_dark';

  const categoryTabs: { id: SystemNotificationCategory; label: string; count: number }[] = [
    { id: 'ALL', label: 'الكل', count: activeNotifications.length },
    {
      id: 'DEBT_OVERDUE',
      label: 'الديون والائتمان',
      count: activeNotifications.filter((n) => n.category === 'DEBT_OVERDUE').length,
    },
    {
      id: 'LOW_STOCK',
      label: 'إعادة الطلب',
      count: activeNotifications.filter((n) => n.category === 'LOW_STOCK').length,
    },
    {
      id: 'OUT_OF_STOCK',
      label: 'النواقص الصفرية',
      count: activeNotifications.filter((n) => n.category === 'OUT_OF_STOCK').length,
    },
    {
      id: 'MAINTENANCE_RMA',
      label: 'الضمان والصيانة',
      count: activeNotifications.filter((n) => n.category === 'MAINTENANCE_RMA').length,
    },
    {
      id: 'CASH_DRAWER',
      label: 'صندوق الوردية',
      count: activeNotifications.filter((n) => n.category === 'CASH_DRAWER').length,
    },
    {
      id: 'HELD_INVOICES',
      label: 'الفواتير المعلقة',
      count: activeNotifications.filter((n) => n.category === 'HELD_INVOICES').length,
    },
    {
      id: 'SYSTEM_BACKUP',
      label: 'النسخ الاحتياطي',
      count: activeNotifications.filter((n) => n.category === 'SYSTEM_BACKUP').length,
    },
  ];

  return (
    <div
      data-testid="system-notification-center-modal"
      data-navbar-popover-content="NOTIFICATIONS"
      role="dialog"
      aria-label={language === 'ar' ? 'قائمة الإشعارات والتنبيهات المنسدلة' : 'Notifications Dropdown'}
      className="absolute top-12 left-0 w-[94vw] sm:w-[540px] md:w-[580px] max-w-[calc(100vw-1.5rem)] z-50 text-xs"
    >
      {/* Upward Caret Pointer directly aligned beneath the Notifications Bell Icon */}
      <div
        aria-hidden="true"
        className={`w-3.5 h-3.5 rotate-45 absolute -top-1.5 left-3 border-t border-s z-10 ${
          isDark
            ? 'bg-slate-900 border-slate-700'
            : 'bg-slate-50 border-slate-200/90'
        }`}
      />

      {/* Inner Dropdown Surface Card */}
      <div
        className={`relative flex flex-col max-h-[calc(100vh-4.75rem)] rounded-2xl border shadow-2xl overflow-hidden transition-all ${
          isDark
            ? 'bg-[#0f172a] border-slate-700 text-slate-100'
            : 'bg-white border-slate-200/90 text-slate-800'
        }`}
      >
        {/* Header */}
        <div
          className={`px-4 py-3 border-b flex items-center justify-between gap-2.5 shrink-0 ${
            isDark
              ? 'bg-slate-900/95 border-slate-800'
              : 'bg-slate-50/90 border-slate-200/80'
          }`}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8.5 h-8.5 rounded-xl bg-slate-900 dark:bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-2xs">
              <Bell className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <h2 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-slate-100 truncate">
                  {language === 'ar'
                    ? 'مركز الإشعارات والتنبيهات التشغيلية الشاملة'
                    : 'Comprehensive Notifications Center'}
                </h2>
                {unreadCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300">
                    {unreadCount} {language === 'ar' ? 'جديد' : 'unread'}
                  </span>
                )}
                {criticalCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300">
                    {criticalCount} {language === 'ar' ? 'إجراء حرج' : 'critical'}
                  </span>
                )}
              </div>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                {language === 'ar'
                  ? 'متابعة لحظية للمخزون، حد إعادة الطلب، المديونيات، الضمان، الصندوق، والنسخ الاحتياطي'
                  : 'Live alerts for stock, reorder points, debts, warranty, cash drawer & backups'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {/* Instant Backup Quick Button */}
            <button
              type="button"
              data-testid="instant-backup-header-btn"
              onClick={handleInstantBackup}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold shadow-2xs transition cursor-pointer whitespace-nowrap"
              title="تنزيل نسخة احتياطية مشفرة للنظام الآن"
            >
              <HardDrive className="w-3 h-3" />
              <span>{language === 'ar' ? 'نسخ احتياطي فوري' : 'Instant Backup'}</span>
            </button>

            <button
              type="button"
              data-testid="close-notifications-dropdown-btn"
              onClick={onClose}
              aria-label="إغلاق قائمة الإشعارات"
              className="w-7.5 h-7.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 flex items-center justify-center transition cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Success Banner if backup downloaded */}
        {backupBannerSuccess && (
          <div className="px-3.5 py-2 bg-emerald-50 dark:bg-emerald-950/50 border-b border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200 text-[11px] font-bold flex items-center justify-between shrink-0">
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span>{backupBannerSuccess}</span>
            </div>
            <button
              type="button"
              onClick={() => setBackupBannerSuccess(null)}
              className="text-emerald-700 dark:text-emerald-400 font-bold cursor-pointer"
            >
              ✕
            </button>
          </div>
        )}

        {/* Action Controls & POS-Style Rounded-Full Category Filter Pills */}
        <div
          className={`px-4 py-2.5 border-b flex flex-col gap-2 shrink-0 ${
            isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100'
          }`}
        >
          <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
            {categoryTabs.map((tab) => {
              const isActive = activeCategoryFilter === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  data-testid={`notif-filter-${tab.id}`}
                  onClick={() => setActiveCategoryFilter(tab.id)}
                  className={`px-2.5 py-1 rounded-full font-semibold transition cursor-pointer flex items-center gap-1 text-[11px] border ${
                    isActive
                      ? 'bg-slate-900 border-slate-900 text-white dark:bg-emerald-600 dark:border-emerald-600 shadow-2xs'
                      : 'bg-slate-50 dark:bg-slate-800 border-slate-200/80 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100'
                  }`}
                >
                  <span>{tab.label}</span>
                  <span
                    className={`px-1.5 py-0.2 rounded-full font-mono text-[9px] ${
                      isActive
                        ? 'bg-white/20 text-white'
                        : 'bg-slate-200/80 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    {tab.count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Quick Management Row */}
          <div className="flex items-center justify-between pt-1.5 border-t border-slate-100 dark:border-slate-800/80">
            <span className="text-[10px] text-slate-500 font-medium">
              {language === 'ar'
                ? `إجمالي التنبيهات النشطة: ${filteredNotifications.length} من أصل ${activeNotifications.length}`
                : `Showing ${filteredNotifications.length} of ${activeNotifications.length} alerts`}
            </span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={handleMarkAllAsRead}
                className="px-2.5 py-1 rounded-lg border border-slate-200/80 dark:border-slate-700 text-[10px] font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition flex items-center gap-1 cursor-pointer"
              >
                <CheckCheck className="w-3 h-3 text-emerald-600" />
                <span>تحديد الكل كمقروء</span>
              </button>
              <button
                type="button"
                onClick={handleClearRead}
                className="px-2.5 py-1 rounded-lg border border-slate-200/80 dark:border-slate-700 text-[10px] font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition flex items-center gap-1 cursor-pointer"
              >
                <Trash2 className="w-3 h-3 text-slate-400" />
                <span>مسح المقروء</span>
              </button>
            </div>
          </div>
        </div>

        {/* Spacious Scrollable Notifications List Body */}
        <div
          data-testid="notifications-dropdown-list"
          className={`flex-1 overflow-y-auto p-3.5 space-y-2.5 max-h-[60vh] ${
            isDark ? 'bg-slate-950/90' : 'bg-slate-50/70'
          }`}
        >
          {filteredNotifications.length === 0 ? (
            <div className="py-10 px-4 text-center space-y-2">
              <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
              <h3 className="font-bold text-xs text-slate-800 dark:text-slate-200">
                لا توجد تنبيهات معلقة في هذا القسم
              </h3>
              <p className="text-[11px] text-slate-400">
                كافة المؤشرات التشغيلية والمالية والمخزنية تعمل بانتظام دون عوائق.
              </p>
            </div>
          ) : (
            filteredNotifications.map((notification) => {
              const isRead = notification.isRead;
              const severity = notification.severity;

              const getSeverityStyles = () => {
                switch (severity) {
                  case 'critical':
                    return {
                      border: 'border-s-4 border-s-rose-600',
                      badge: 'bg-rose-100 text-rose-800 dark:bg-rose-950/70 dark:text-rose-300',
                      badgeText: 'إجراء عاجل',
                      iconBg: 'bg-rose-50 text-rose-600 dark:bg-rose-950/50',
                      icon: AlertCircle,
                    };
                  case 'warning':
                    return {
                      border: 'border-s-4 border-s-amber-500',
                      badge: 'bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300',
                      badgeText: 'تنبيه تشغيلي',
                      iconBg: 'bg-amber-50 text-amber-600 dark:bg-amber-950/50',
                      icon: AlertTriangle,
                    };
                  case 'success':
                    return {
                      border: 'border-s-4 border-s-emerald-600',
                      badge:
                        'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300',
                      badgeText: 'مكتمل ومؤمن',
                      iconBg: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50',
                      icon: CheckCircle2,
                    };
                  default:
                    return {
                      border: 'border-s-4 border-s-indigo-500',
                      badge:
                        'bg-indigo-100 text-indigo-800 dark:bg-indigo-950/70 dark:text-indigo-300',
                      badgeText: 'معلومة نظام',
                      iconBg: 'bg-indigo-50 text-indigo-600 dark:bg-indigo-950/50',
                      icon: Clock,
                    };
                }
              };

              const style = getSeverityStyles();
              const Icon = style.icon;

              return (
                <div
                  key={notification.id}
                  data-testid={`notification-card-${notification.id}`}
                  className={`p-3 rounded-xl border transition-all ${
                    isRead
                      ? 'bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 opacity-80'
                      : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 shadow-2xs'
                  } ${style.border}`}
                >
                  <div className="flex items-start gap-2.5">
                    <div className={`p-2 rounded-xl shrink-0 ${style.iconBg}`}>
                      <Icon className="w-4 h-4" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-1.5 mb-1">
                        <span
                          className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${style.badge}`}
                        >
                          {style.badgeText}
                        </span>
                        <h4 className="font-bold text-xs text-slate-900 dark:text-slate-100 truncate">
                          {notification.titleAr}
                        </h4>
                      </div>

                      <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
                        {notification.messageAr}
                      </p>

                      {/* Footer details & Action */}
                      <div className="flex flex-wrap items-center justify-between gap-2 mt-2 pt-1.5 border-t border-slate-100 dark:border-slate-800 text-[10px] text-slate-400">
                        <span className="font-mono">
                          {new Date(notification.timestamp).toLocaleTimeString('ar-SA', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>

                        <div className="flex items-center gap-1 ms-auto">
                          {notification.actionType && notification.actionLabelAr && (
                            <button
                              type="button"
                              onClick={() => handleNotificationAction(notification)}
                              className="px-2.5 py-1 rounded-lg bg-slate-900 dark:bg-emerald-600 hover:bg-slate-800 text-white font-bold text-[10px] shadow-2xs transition flex items-center gap-1 cursor-pointer"
                            >
                              <span>{notification.actionLabelAr}</span>
                              <ArrowUpRight className="w-3 h-3" />
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => handleToggleRead(notification.id)}
                            className="px-2 py-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 font-medium transition cursor-pointer"
                            title={isRead ? 'تحديد كغير مقروء' : 'تحديد كمقروء'}
                          >
                            {isRead ? 'غير مقروء' : 'تمت القراءة'}
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDismissOne(notification.id)}
                            className="w-6 h-6 rounded-lg hover:bg-rose-50 text-slate-400 hover:text-rose-600 flex items-center justify-center transition cursor-pointer"
                            title="إخفاء التنبيه"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div
          className={`px-4 py-2.5 border-t flex items-center justify-between text-[11px] text-slate-500 shrink-0 ${
            isDark ? 'bg-slate-900/95 border-slate-800' : 'bg-slate-50 border-slate-200/80'
          }`}
        >
          <div className="flex items-center gap-1.5 truncate">
            <Sparkles className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span className="truncate">
              نظام مراقبة الأحداث والإنذار المبكر للمخزون والديون والصيانة
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-1 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold hover:bg-slate-100 dark:hover:bg-slate-700 transition cursor-pointer shrink-0"
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
};
