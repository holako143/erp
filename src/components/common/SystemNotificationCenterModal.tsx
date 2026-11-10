import React, { useState, useMemo } from 'react';
import {
  Bell,
  X,
  AlertTriangle,
  AlertCircle,
  Package,
  Wrench,
  HardDrive,
  Clock,
  CheckCircle2,
  CheckCheck,
  Trash2,
  ArrowUpRight,
  Download,
  Filter,
  DollarSign,
  ShoppingCart,
  Users,
  PlayCircle,
  Network,
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
    openQuickSendModal,
  } = useERP();

  const [activeCategoryFilter, setActiveCategoryFilter] =
    useState<SystemNotificationCategory>('ALL');
  const [readNotificationIds, setReadNotificationIds] = useState<Set<string>>(new Set());
  const [dismissedNotificationIds, setDismissedNotificationIds] = useState<Set<string>>(new Set());
  const [lastBackupTimestamp, setLastBackupTimestamp] = useState<string | null>(() => {
    return localStorage.getItem('rlm_last_backup_timestamp');
  });
  const [backupBannerSuccess, setBackupBannerSuccess] = useState<string | null>(null);

  // Generate dynamic system notifications
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
        setActiveTab('reports');
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
        setActiveTab('dashboard');
        break;
    }
  };

  if (!isOpen) return null;

  return (
    <div
      data-testid="system-notification-center-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/75 backdrop-blur-sm animate-fade-in"
    >
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 shrink-0 bg-slate-50 dark:bg-slate-900/90">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-slate-900 dark:bg-emerald-600 text-white shadow-xs">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-black text-sm text-slate-900 dark:text-slate-100">
                  مركز الإشعارات والتنبيهات التشغيلية الشاملة
                </h2>
                {unreadCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300">
                    {unreadCount} تنبيه غير مقروء
                  </span>
                )}
                {criticalCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300">
                    {criticalCount} إجراء حرج
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                متابعة لحظية لمديونيات العملاء، حد إعادة الطلب، النواقص، الصيانة، والنسخ الاحتياطي
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Instant Backup Quick Button */}
            <button
              type="button"
              data-testid="instant-backup-header-btn"
              onClick={handleInstantBackup}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition cursor-pointer"
              title="تنزيل نسخة احتياطية مشفرة للنظام الآن"
            >
              <HardDrive className="w-3.5 h-3.5" />
              <span>نسخ احتياطي فوري 💾</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 flex items-center justify-center transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Success Banner if backup downloaded */}
        {backupBannerSuccess && (
          <div className="p-3 bg-emerald-50 dark:bg-emerald-950/50 border-b border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200 text-xs font-bold flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>{backupBannerSuccess}</span>
            </div>
            <button
              type="button"
              onClick={() => setBackupBannerSuccess(null)}
              className="text-emerald-700 dark:text-emerald-400 font-bold"
            >
              ✕
            </button>
          </div>
        )}

        {/* Action Controls & Category Filter Pills */}
        <div className="p-3 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-wrap items-center justify-between gap-2 shrink-0">
          {/* Categories */}
          <div className="flex flex-wrap items-center gap-1 text-xs">
            {[
              { id: 'ALL', label: 'الكل', count: activeNotifications.length },
              {
                id: 'DEBT_OVERDUE',
                label: 'الديون والائتمان',
                count: activeNotifications.filter((n) => n.category === 'DEBT_OVERDUE').length,
              },
              {
                id: 'OUT_OF_STOCK',
                label: 'النواقص الصفرية',
                count: activeNotifications.filter((n) => n.category === 'OUT_OF_STOCK').length,
              },
              {
                id: 'LOW_STOCK',
                label: 'حد إعادة الطلب',
                count: activeNotifications.filter((n) => n.category === 'LOW_STOCK').length,
              },
              {
                id: 'MAINTENANCE_RMA',
                label: 'الصيانة والضمان',
                count: activeNotifications.filter((n) => n.category === 'MAINTENANCE_RMA').length,
              },
              {
                id: 'SYSTEM_BACKUP',
                label: 'النسخ الاحتياطي',
                count: activeNotifications.filter((n) => n.category === 'SYSTEM_BACKUP').length,
              },
              {
                id: 'HELD_INVOICES',
                label: 'الفواتير المعلقة',
                count: activeNotifications.filter((n) => n.category === 'HELD_INVOICES').length,
              },
            ].map((tab) => {
              const isActive = activeCategoryFilter === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveCategoryFilter(tab.id as any)}
                  className={`px-2.5 py-1 rounded-lg font-bold transition cursor-pointer flex items-center gap-1 text-[11px] ${
                    isActive
                      ? 'bg-slate-900 text-white dark:bg-emerald-600 shadow-2xs'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                  }`}
                >
                  <span>{tab.label}</span>
                  {tab.count > 0 && (
                    <span
                      className={`px-1.5 py-0.2 rounded-full font-mono text-[9px] ${
                        isActive
                          ? 'bg-white/20 text-white'
                          : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      {tab.count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Quick Management Buttons */}
          <div className="flex items-center gap-1.5 ms-auto">
            <button
              type="button"
              onClick={handleMarkAllAsRead}
              className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 text-[11px] font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition flex items-center gap-1 cursor-pointer"
            >
              <CheckCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>تحديد الكل كمقروء</span>
            </button>
            <button
              type="button"
              onClick={handleClearRead}
              className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 text-[11px] font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition flex items-center gap-1 cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5 text-slate-400" />
              <span>مسح المقروء</span>
            </button>
          </div>
        </div>

        {/* Notifications List Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50/50 dark:bg-slate-950">
          {filteredNotifications.length === 0 ? (
            <div className="p-8 text-center space-y-2">
              <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
              <h3 className="font-bold text-sm text-slate-800 dark:text-slate-200">
                لا توجد تنبيهات معلقة في هذا القسم
              </h3>
              <p className="text-xs text-slate-400">
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
                      badge: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300',
                      badgeText: 'مكتمل ومؤمن',
                      iconBg: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50',
                      icon: CheckCircle2,
                    };
                  default:
                    return {
                      border: 'border-s-4 border-s-indigo-500',
                      badge: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950/70 dark:text-indigo-300',
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
                  className={`p-3.5 rounded-xl border transition-all ${
                    isRead
                      ? 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 opacity-80'
                      : 'bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 shadow-xs'
                  } ${style.border}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className={`p-2 rounded-xl shrink-0 ${style.iconBg}`}>
                        <Icon className="w-4 h-4" />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <span className={`text-[10px] font-bold px-2 py-0.2 rounded-full ${style.badge}`}>
                            {style.badgeText}
                          </span>
                          <h4 className="font-bold text-xs text-slate-900 dark:text-slate-100 truncate">
                            {notification.titleAr}
                          </h4>
                        </div>

                        <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                          {notification.messageAr}
                        </p>

                        {/* Footer details & Action */}
                        <div className="flex flex-wrap items-center justify-between gap-2 mt-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-[10px] text-slate-400">
                          <span className="font-mono">
                            {new Date(notification.timestamp).toLocaleTimeString('ar-SA', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>

                          <div className="flex items-center gap-1.5 ms-auto">
                            {notification.actionType && notification.actionLabelAr && (
                              <button
                                type="button"
                                onClick={() => handleNotificationAction(notification)}
                                className="px-2.5 py-1 rounded-lg bg-slate-900 dark:bg-emerald-600 hover:bg-slate-800 text-white font-bold text-[11px] shadow-2xs transition flex items-center gap-1 cursor-pointer"
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
                              className="w-6 h-6 rounded hover:bg-rose-50 text-slate-400 hover:text-rose-600 flex items-center justify-center transition cursor-pointer"
                              title="إخفاء التنبيه"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
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
        <div className="p-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 shrink-0 bg-slate-50 dark:bg-slate-900/90">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-emerald-600" />
            <span>نظام مراقبة الأحداث والإنذار المبكر RLM Early Warning Engine</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 font-bold hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
};
