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
  BellRing,
  BellOff,
  Search,
  Volume2,
  VolumeX,
  MessageSquare,
} from 'lucide-react';
import { useERP } from '../../context/ERPContext';
import {
  SystemNotification,
  SystemNotificationCategory,
  filterAndSortSystemNotifications,
  getThemeToastAppearance,
} from '../../core/notificationsEngine';
import {
  composeDebtReminderMessageText,
  composeWarrantyRMAMessageText,
} from '../../core/messagingEngine';
import { useAlertSound } from '../../hooks/useAlertSound';

interface SystemNotificationCenterModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SystemNotificationCenterModal: React.FC<SystemNotificationCenterModalProps> = ({
  isOpen,
  onClose,
}) => {
  const {
    language,
    setActiveTab,
    exportEncryptedDatabaseSnapshot,
    uiTheme,
    systemNotifications,
    unreadNotificationsCount,
    criticalNotificationsCount,
    markNotificationRead,
    toggleNotificationRead,
    markAllNotificationsRead,
    dismissNotification,
    clearReadNotifications,
    recordBackupCompleted,
    notificationPermission,
    browserNotificationsEnabled,
    setBrowserNotificationsEnabled,
    requestBrowserNotificationPermission,
    soundAlertPrefs,
    updateSoundAlertPrefs,
    dispatchToastAndPushNotification,
    openQuickSendModal,
    customers,
    warrantyTickets,
    products,
    company,
    currency,
    messagingGatewayConfig,
  } = useERP();

  const { playAlertSound } = useAlertSound({
    uiTheme,
    preferences: soundAlertPrefs,
  });

  const [activeCategoryFilter, setActiveCategoryFilter] =
    useState<SystemNotificationCategory>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [unreadOnly, setUnreadOnly] = useState(false);
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

  const activeNotifications = systemNotifications;

  const filteredNotifications = useMemo(
    () =>
      filterAndSortSystemNotifications(activeNotifications, {
        category: activeCategoryFilter,
        query: searchQuery,
        unreadOnly,
      }),
    [activeNotifications, activeCategoryFilter, searchQuery, unreadOnly]
  );

  const unreadCount = unreadNotificationsCount;
  const criticalCount = criticalNotificationsCount;

  const handleInstantBackup = () => {
    const backupRes = exportEncryptedDatabaseSnapshot();
    const nowIso = new Date().toISOString();
    recordBackupCompleted(nowIso);
    setBackupBannerSuccess(
      language === 'ar'
        ? `تم تنزيل النسخة الاحتياطية (${backupRes.filename}) بنجاح وتحديث حالة أمان النظام.`
        : `Database backup (${backupRes.filename}) downloaded successfully.`
    );
    setTimeout(() => setBackupBannerSuccess(null), 5000);
  };

  const handleNotificationAction = (notification: SystemNotification) => {
    markNotificationRead(notification.id);
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
      case 'SALES':
        setActiveTab('sales');
        break;
      case 'COMMUNICATIONS':
        setActiveTab('communications');
        break;
      case 'SETTINGS':
        setActiveTab('settings');
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

  const handleQuickRemindAction = (notification: SystemNotification) => {
    markNotificationRead(notification.id);
    onClose();

    if (notification.category === 'DEBT_OVERDUE') {
      const topDebtor =
        customers.find((c) => Number(c.balance) > 0) || customers[0];
      const custName = topDebtor?.nameAr || topDebtor?.name || 'عميلنا الكريم';
      const body = composeDebtReminderMessageText({
        customerName: custName,
        totalBalance: Math.max(0, Number(topDebtor?.balance || 0)),
        creditLimit: Number(topDebtor?.creditLimit || 50000),
        companyName: company.nameAr || company.name || 'منشأتنا',
        currency,
        customSignatureAr: messagingGatewayConfig.customSignatureAr,
      });
      openQuickSendModal({
        channel: 'WHATSAPP',
        category: 'DEBT_REMINDER',
        recipientName: custName,
        recipientPhone: topDebtor?.phone || '',
        referenceNumber: topDebtor ? `SOA-${topDebtor.id.slice(-4).toUpperCase()}` : 'SOA-DEBT',
        messageBody: body,
      });
      return;
    }

    if (notification.category === 'MAINTENANCE_RMA') {
      const ticket =
        warrantyTickets.find((t) => t.status === 'READY') || warrantyTickets[0];
      if (ticket) {
        const body = composeWarrantyRMAMessageText({
          ticket,
          companyName: company.nameAr || company.name || 'منشأتنا',
          currency,
        });
        openQuickSendModal({
          channel: 'WHATSAPP',
          category: 'RMA_WARRANTY',
          recipientName: ticket.customerName,
          recipientPhone: ticket.customerPhone,
          referenceNumber: ticket.ticketNumber,
          messageBody: body,
        });
        return;
      }
    }

    if (notification.category === 'LOW_STOCK' || notification.category === 'OUT_OF_STOCK') {
      const criticalItems = products
        .filter((p) => p.stockQty <= p.reorderPoint)
        .slice(0, 6);
      const summaryBody = [
        `⚠️ *تنبيه عاجل بنواقص المخزون وإعادة الطلب*`,
        `🏢 *${company.nameAr || company.name || 'منشأتنا'}*`,
        `────────────────────`,
        ...criticalItems.map(
          (item, idx) => `${idx + 1}. ${item.nameAr} (${item.sku}) — المتبقي: ${item.stockQty}`
        ),
        `────────────────────`,
        `يرجى اعتماد التوريد أو طلب الشراء فوراً.`,
      ].join('\n');
      openQuickSendModal({
        channel: 'WHATSAPP',
        category: 'LOW_STOCK_ALERT',
        recipientName: 'إدارة المشتريات والمستودعات',
        recipientPhone: messagingGatewayConfig.ownerReportPhone || company.phone || '',
        referenceNumber: `STK-${new Date().toISOString().slice(0, 10)}`,
        messageBody: summaryBody,
      });
    }
  };

  if (!isOpen) return null;

  const isDark = uiTheme === 'obsidian_dark';

  const categoryTabs: { id: SystemNotificationCategory; label: string; count: number }[] = [
    { id: 'ALL', label: 'الكل', count: activeNotifications.length },
    {
      id: 'LIVE_EVENTS',
      label: 'أحداث النظام',
      count: activeNotifications.filter((n) => n.category === 'LIVE_EVENTS').length,
    },
    {
      id: 'DEBT_OVERDUE',
      label: 'الديون',
      count: activeNotifications.filter((n) => n.category === 'DEBT_OVERDUE').length,
    },
    {
      id: 'LOW_STOCK',
      label: 'إعادة الطلب',
      count: activeNotifications.filter((n) => n.category === 'LOW_STOCK').length,
    },
    {
      id: 'OUT_OF_STOCK',
      label: 'النواقص',
      count: activeNotifications.filter((n) => n.category === 'OUT_OF_STOCK').length,
    },
    {
      id: 'WHATSAPP_INBOX',
      label: 'واتساب',
      count: activeNotifications.filter((n) => n.category === 'WHATSAPP_INBOX').length,
    },
    {
      id: 'PURCHASE_ORDERS',
      label: 'المشتريات',
      count: activeNotifications.filter((n) => n.category === 'PURCHASE_ORDERS').length,
    },
    {
      id: 'MAINTENANCE_RMA',
      label: 'الصيانة',
      count: activeNotifications.filter((n) => n.category === 'MAINTENANCE_RMA').length,
    },
    {
      id: 'CASH_DRAWER',
      label: 'الصندوق',
      count: activeNotifications.filter((n) => n.category === 'CASH_DRAWER').length,
    },
    {
      id: 'HELD_INVOICES',
      label: 'المعلقة',
      count: activeNotifications.filter((n) => n.category === 'HELD_INVOICES').length,
    },
    {
      id: 'SYSTEM_BACKUP',
      label: 'النسخ',
      count: activeNotifications.filter((n) => n.category === 'SYSTEM_BACKUP').length,
    },
  ];

  return (
    <div
      data-testid="system-notification-center-modal"
      data-navbar-popover-content="NOTIFICATIONS"
      data-notif-theme={uiTheme}
      role="dialog"
      aria-label={language === 'ar' ? 'مركز الإشعارات والتنبيهات' : 'Notifications Center'}
      className="fixed inset-x-3 top-14 sm:inset-x-auto sm:absolute sm:top-12 sm:left-0 w-auto sm:w-[560px] md:w-[600px] z-50 text-xs"
    >
      {/* Upward Caret Pointer matched to active theme surface */}
      <div
        aria-hidden="true"
        className="hidden sm:block w-3.5 h-3.5 rotate-45 absolute -top-1.5 left-3 border-t border-s z-10 bg-[var(--erp-bg-elevated)] border-[var(--erp-border)]"
      />

      {/* Inner Dropdown Surface Card */}
      <div className="relative flex flex-col max-h-[calc(100vh-4.75rem)] rounded-2xl border shadow-2xl overflow-hidden transition-all bg-[var(--erp-bg-surface)] border-[var(--erp-border)] text-[var(--erp-text-primary)]">
        {/* Header */}
        <div className="px-4 py-3 border-b flex items-center justify-between gap-2.5 shrink-0 bg-[var(--erp-bg-elevated)] border-[var(--erp-border)]">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8.5 h-8.5 rounded-xl haseb-card-gradient text-white flex items-center justify-center shrink-0">
              <Bell className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="font-bold text-xs sm:text-sm text-[var(--erp-text-primary)] truncate">
                  {language === 'ar'
                    ? 'مركز الإشعارات والتنبيهات الموحد'
                    : 'Unified Notifications Center'}
                </h2>
                <span className="text-[11px] font-mono font-bold text-[var(--erp-accent)] tabular-nums">
                  {unreadCount} {language === 'ar' ? 'غير مقروء' : 'unread'}
                  {criticalCount > 0
                    ? ` • ${criticalCount} ${language === 'ar' ? 'حرج' : 'critical'}`
                    : ''}
                </span>
              </div>
              <p className="text-[10px] text-[var(--erp-text-secondary)] truncate mt-0.5">
                {language === 'ar'
                  ? 'تنبيهات لحظية متناغمة مع ثيم النظام للمخزون والديون والواتساب والنسخ الاحتياطي'
                  : 'Theme-matched live alerts for inventory, receivables, WhatsApp & backups'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              data-testid="instant-backup-header-btn"
              onClick={handleInstantBackup}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl haseb-btn-primary text-white text-[11px] font-bold shadow-2xs transition cursor-pointer whitespace-nowrap"
              title="تنزيل نسخة احتياطية مشفرة للنظام الآن"
            >
              <HardDrive className="w-3 h-3" />
              <span className="hidden sm:inline">{language === 'ar' ? 'نسخ احتياطي فوري' : 'Instant Backup'}</span>
              <span className="sm:hidden">{language === 'ar' ? 'نسخ فوري' : 'Backup'}</span>
            </button>

            <button
              type="button"
              data-testid="close-notifications-modal-btn"
              onClick={onClose}
              aria-label="إغلاق قائمة الإشعارات"
              className="w-7.5 h-7.5 rounded-xl bg-[var(--erp-bg-surface)] border border-[var(--erp-border)] text-[var(--erp-text-secondary)] hover:text-[var(--erp-text-primary)] flex items-center justify-center transition cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Device Push + Theme Sound Controls Strip */}
        <div className="px-3.5 py-2 border-b border-[var(--erp-border)] bg-[var(--erp-bg-surface)] flex flex-wrap items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            {notificationPermission === 'granted' && browserNotificationsEnabled ? (
              <BellRing className="w-3.5 h-3.5 text-[var(--erp-accent)] shrink-0" />
            ) : (
              <BellOff className="w-3.5 h-3.5 text-amber-600 shrink-0" />
            )}
            <span className="text-[11px] font-bold text-[var(--erp-text-primary)] truncate">
              {notificationPermission === 'granted'
                ? browserNotificationsEnabled
                  ? language === 'ar'
                    ? 'إشعارات الجهاز الفورية مفعلة'
                    : 'Device Push Active'
                  : language === 'ar'
                  ? 'إشعارات الجهاز متوقفة مؤقتاً'
                  : 'Device Push Paused'
                : notificationPermission === 'denied'
                ? language === 'ar'
                  ? 'الإشعارات محظورة من المتصفح'
                  : 'Blocked in browser'
                : language === 'ar'
                ? 'تفعيل إشعارات الجوال والكمبيوتر الفورية'
                : 'Enable OS notifications'}
            </span>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              data-testid="notif-sound-toggle-btn"
              onClick={() => updateSoundAlertPrefs({ enabled: !soundAlertPrefs.enabled })}
              className="px-2 py-1 rounded-lg border border-[var(--erp-border)] bg-[var(--erp-bg-elevated)] text-[var(--erp-text-primary)] text-[10px] font-bold flex items-center gap-1 cursor-pointer hover:opacity-90"
              title="تشغيل أو كتم صوت التنبيهات"
            >
              {soundAlertPrefs.enabled ? (
                <Volume2 className="w-3 h-3 text-[var(--erp-accent)]" />
              ) : (
                <VolumeX className="w-3 h-3 text-rose-500" />
              )}
              <span>{soundAlertPrefs.enabled ? 'الصوت نشط' : 'مكتوم'}</span>
            </button>

            <button
              type="button"
              data-testid="notif-sound-test-btn"
              onClick={() => {
                playAlertSound('toast_info');
                dispatchToastAndPushNotification({
                  category: 'LIVE_EVENTS',
                  severity: 'info',
                  titleAr: 'اختبار التنبيه الموحد بثيم النظام',
                  titleEn: 'Theme-Matched Alert Preview',
                  messageAr:
                    'تظهر الآن التنبيهات والأصوات التفاعلية متطابقة تماماً مع الثيم النشط في النظام.',
                  messageEn: 'Live alerts and tones now adapt dynamically to your active ERP theme.',
                  actionType: 'COMMUNICATIONS',
                });
              }}
              className="px-2 py-1 rounded-lg border border-[var(--erp-border)] bg-[var(--erp-bg-elevated)] text-[var(--erp-accent)] text-[10px] font-bold cursor-pointer hover:opacity-90"
            >
              معاينة تنبيه
            </button>

            {notificationPermission === 'granted' ? (
              <button
                type="button"
                onClick={() => setBrowserNotificationsEnabled(!browserNotificationsEnabled)}
                className="px-2 py-1 rounded-lg border border-[var(--erp-border)] bg-[var(--erp-bg-elevated)] text-[var(--erp-text-primary)] text-[10px] font-bold cursor-pointer"
              >
                {browserNotificationsEnabled ? 'إيقاف' : 'تشغيل'}
              </button>
            ) : notificationPermission !== 'unsupported' && notificationPermission !== 'denied' ? (
              <button
                type="button"
                data-testid="enable-browser-push-btn"
                onClick={() => {
                  requestBrowserNotificationPermission().catch(() => {});
                }}
                className="px-2.5 py-1 rounded-lg haseb-btn-primary text-white text-[10px] font-bold cursor-pointer shadow-2xs"
              >
                {language === 'ar' ? 'تفعيل الإشعارات' : 'Enable Push'}
              </button>
            ) : null}
          </div>
        </div>

        {/* Success Banner if backup downloaded */}
        {backupBannerSuccess && (
          <div className="px-3.5 py-2 bg-emerald-500/10 border-b border-[var(--erp-border)] text-[var(--erp-text-primary)] text-[11px] font-bold flex items-center justify-between shrink-0">
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span>{backupBannerSuccess}</span>
            </div>
            <button
              type="button"
              onClick={() => setBackupBannerSuccess(null)}
              className="text-[var(--erp-text-secondary)] font-bold cursor-pointer"
            >
              ✕
            </button>
          </div>
        )}

        {/* Search, Unread Toggle & Category Filter Bar */}
        <div className="px-4 py-2.5 border-b border-[var(--erp-border)] bg-[var(--erp-bg-surface)] flex flex-col gap-2 shrink-0">
          <div className="flex items-center gap-2">
            <div className="relative flex-1 min-w-0">
              <Search className="w-3.5 h-3.5 text-[var(--erp-text-secondary)] absolute right-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                data-testid="notif-search-input"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={
                  language === 'ar'
                    ? 'ابحث في الإشعارات (مخزون، عميل، فاتورة، صيانة)...'
                    : 'Search alerts...'
                }
                className="w-full pr-8 pl-2.5 py-1.5 rounded-xl border border-[var(--erp-border)] bg-[var(--erp-bg-elevated)] text-[var(--erp-text-primary)] text-[11px]"
              />
            </div>

            <button
              type="button"
              data-testid="notif-unread-only-btn"
              onClick={() => setUnreadOnly((v) => !v)}
              className={`px-2.5 py-1.5 rounded-xl border text-[11px] font-bold cursor-pointer shrink-0 transition ${
                unreadOnly
                  ? 'haseb-nav-active text-white border-transparent'
                  : 'bg-[var(--erp-bg-elevated)] border-[var(--erp-border)] text-[var(--erp-text-secondary)] hover:text-[var(--erp-text-primary)]'
              }`}
            >
              {language === 'ar' ? 'غير مقروء فقط' : 'Unread Only'}
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
            {categoryTabs.map((tab) => {
              const isActive = activeCategoryFilter === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  data-testid={`notif-filter-${tab.id}`}
                  onClick={() => setActiveCategoryFilter(tab.id)}
                  className={`px-2.5 py-1 rounded-lg font-semibold transition cursor-pointer flex items-center gap-1.5 text-[11px] border ${
                    isActive
                      ? 'haseb-nav-active text-white border-transparent'
                      : 'bg-[var(--erp-bg-elevated)] border-[var(--erp-border)] text-[var(--erp-text-secondary)] hover:text-[var(--erp-text-primary)]'
                  }`}
                >
                  <span>{tab.label}</span>
                  <span
                    className={`font-mono text-[10px] tabular-nums ${
                      isActive ? 'text-white/90' : 'text-[var(--erp-text-secondary)]'
                    }`}
                  >
                    {tab.count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Quick Management Row */}
          <div className="flex items-center justify-between pt-1.5 border-t border-[var(--erp-border)]">
            <span className="text-[10px] text-[var(--erp-text-secondary)] font-medium tabular-nums">
              {language === 'ar'
                ? `المعروض: ${filteredNotifications.length} من ${activeNotifications.length}`
                : `Showing ${filteredNotifications.length} of ${activeNotifications.length}`}
            </span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                data-testid="notif-mark-all-read-btn"
                onClick={markAllNotificationsRead}
                className="px-2.5 py-1 rounded-lg border border-[var(--erp-border)] bg-[var(--erp-bg-elevated)] text-[10px] font-semibold text-[var(--erp-text-primary)] hover:opacity-90 transition flex items-center gap-1 cursor-pointer"
              >
                <CheckCheck className="w-3 h-3 text-[var(--erp-accent)]" />
                <span>تحديد الكل كمقروء</span>
              </button>
              <button
                type="button"
                data-testid="notif-clear-read-btn"
                onClick={clearReadNotifications}
                className="px-2.5 py-1 rounded-lg border border-[var(--erp-border)] bg-[var(--erp-bg-elevated)] text-[10px] font-semibold text-[var(--erp-text-secondary)] hover:text-[var(--erp-text-primary)] transition flex items-center gap-1 cursor-pointer"
              >
                <Trash2 className="w-3 h-3" />
                <span>مسح المقروء</span>
              </button>
            </div>
          </div>
        </div>

        {/* Scrollable Notifications List Body (Clean 1px hairline cards aligned with theme) */}
        <div
          data-testid="notifications-dropdown-list"
          className="flex-1 overflow-y-auto p-3.5 space-y-2.5 max-h-[55vh] bg-[var(--erp-bg-canvas)]"
        >
          {filteredNotifications.length === 0 ? (
            <div className="py-10 px-4 text-center space-y-2">
              <CheckCircle2 className="w-9 h-9 text-[var(--erp-accent)] mx-auto" />
              <h3 className="font-bold text-xs text-[var(--erp-text-primary)]">
                لا توجد تنبيهات مطابقة حالياً
              </h3>
              <p className="text-[11px] text-[var(--erp-text-secondary)]">
                كافة المؤشرات التشغيلية والمالية والمخزنية تعمل بانتظام.
              </p>
            </div>
          ) : (
            filteredNotifications.map((notification) => {
              const isRead = notification.isRead;
              const severity = notification.severity;
              const appearance = getThemeToastAppearance(uiTheme, severity);
              const Icon =
                severity === 'critical'
                  ? AlertCircle
                  : severity === 'warning'
                  ? AlertTriangle
                  : severity === 'success'
                  ? CheckCircle2
                  : Clock;
              const canQuickRemind =
                notification.category === 'DEBT_OVERDUE' ||
                notification.category === 'MAINTENANCE_RMA' ||
                notification.category === 'LOW_STOCK' ||
                notification.category === 'OUT_OF_STOCK';

              return (
                <div
                  key={notification.id}
                  data-testid={`notification-card-${notification.id}`}
                  className={`p-3 rounded-xl border transition-all bg-[var(--erp-bg-surface)] ${
                    isRead
                      ? 'border-[var(--erp-border)] opacity-75'
                      : isDark
                      ? 'border-slate-600/80 shadow-xs'
                      : 'border-[var(--erp-border)] shadow-2xs'
                  }`}
                >
                  <div className="flex items-start gap-2.5">
                    <div
                      className={`p-2 rounded-xl border shrink-0 ${appearance.iconWrapperClass}`}
                    >
                      <Icon className="w-4 h-4" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <div className="flex items-center gap-1.5 min-w-0">
                          {!isRead && (
                            <span
                              className="w-2 h-2 rounded-full bg-[var(--erp-accent)] shrink-0"
                              aria-label="غير مقروء"
                            />
                          )}
                          <h4 className="font-bold text-xs text-[var(--erp-text-primary)] truncate">
                            {notification.titleAr}
                          </h4>
                        </div>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.2 rounded shrink-0 ${appearance.badgeClass}`}
                        >
                          {appearance.badgeLabelAr}
                        </span>
                      </div>

                      <p className="text-[11px] text-[var(--erp-text-secondary)] leading-relaxed">
                        {notification.messageAr}
                      </p>

                      <div className="flex flex-wrap items-center justify-between gap-2 mt-2.5 pt-2 border-t border-[var(--erp-border)] text-[10px] text-[var(--erp-text-secondary)]">
                        <span className="font-mono tabular-nums">
                          {new Date(notification.timestamp).toLocaleTimeString('ar-SA', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>

                        <div className="flex flex-wrap items-center gap-1.5 ms-auto">
                          {canQuickRemind && (
                            <button
                              type="button"
                              data-testid={`notif-quick-remind-${notification.id}`}
                              onClick={() => handleQuickRemindAction(notification)}
                              className="px-2 py-1 rounded-lg border border-[var(--erp-border)] bg-[var(--erp-bg-elevated)] text-[var(--erp-accent)] font-bold text-[10px] flex items-center gap-1 cursor-pointer hover:opacity-90"
                            >
                              <MessageSquare className="w-3 h-3" />
                              <span>تذكير واتساب / SMS</span>
                            </button>
                          )}

                          {notification.actionType && notification.actionLabelAr && (
                            <button
                              type="button"
                              onClick={() => handleNotificationAction(notification)}
                              className="px-2.5 py-1 rounded-lg haseb-btn-primary text-white font-bold text-[10px] transition flex items-center gap-1 cursor-pointer"
                            >
                              <span>{notification.actionLabelAr}</span>
                              <ArrowUpRight className="w-3 h-3" />
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => toggleNotificationRead(notification.id)}
                            className="px-2 py-1 rounded-lg hover:bg-[var(--erp-bg-elevated)] text-[var(--erp-text-secondary)] font-medium transition cursor-pointer"
                            title={isRead ? 'تحديد كغير مقروء' : 'تحديد كمقروء'}
                          >
                            {isRead ? 'غير مقروء' : 'تمت القراءة'}
                          </button>

                          <button
                            type="button"
                            onClick={() => dismissNotification(notification.id)}
                            className="w-6 h-6 rounded-lg hover:bg-rose-500/15 text-[var(--erp-text-secondary)] hover:text-rose-600 flex items-center justify-center transition cursor-pointer"
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
        <div className="px-4 py-2.5 border-t border-[var(--erp-border)] bg-[var(--erp-bg-elevated)] flex items-center justify-between text-[11px] text-[var(--erp-text-secondary)] shrink-0">
          <div className="flex items-center gap-1.5 truncate">
            <Sparkles className="w-3.5 h-3.5 text-[var(--erp-accent)] shrink-0" />
            <span className="truncate">
              مراقبة الأحداث والإنذار المبكر متناغمة مع مظهر النظام ({uiTheme})
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-1 rounded-xl border border-[var(--erp-border)] bg-[var(--erp-bg-surface)] text-[var(--erp-text-primary)] font-bold hover:opacity-90 transition cursor-pointer shrink-0"
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
};
