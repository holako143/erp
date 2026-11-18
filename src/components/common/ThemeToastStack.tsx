import React from 'react';
import {
  AlertCircle,
  AlertTriangle,
  ArrowUpLeft,
  BellRing,
  CheckCircle2,
  ShieldAlert,
  X,
} from 'lucide-react';
import {
  NotificationActionType,
  NotificationSeverity,
  RemoteSyncToastSpec,
  getThemeToastAppearance,
} from '../../core/notificationsEngine';
import { renderModalPortal } from '../../core/modalLayerEngine';

interface ThemeToastStackProps {
  uiTheme: string;
  language: 'ar' | 'en';
  toastQueue: RemoteSyncToastSpec[];
  lastSecurityAlert: string | null;
  onDismissToast: (toastId?: string) => void;
  onPauseToastTimer?: (toastId: string, paused: boolean) => void;
  onNavigateAction: (actionType: NotificationActionType) => void;
  onOpenNotificationsCenter?: () => void;
}

const renderSeverityIcon = (severity: NotificationSeverity) => {
  switch (severity) {
    case 'critical':
      return <AlertCircle className="w-4 h-4 shrink-0" />;
    case 'warning':
      return <AlertTriangle className="w-4 h-4 shrink-0" />;
    case 'success':
      return <CheckCircle2 className="w-4 h-4 shrink-0" />;
    default:
      return <BellRing className="w-4 h-4 shrink-0" />;
  }
};

export const ThemeToastStack: React.FC<ThemeToastStackProps> = ({
  uiTheme,
  language,
  toastQueue,
  lastSecurityAlert,
  onDismissToast,
  onPauseToastTimer,
  onNavigateAction,
}) => {
  const securityAppearance = getThemeToastAppearance(uiTheme, 'critical');

  return renderModalPortal(
    <div
      data-testid="realtime-toast-stack"
      className="fixed top-16 sm:top-16 end-3 start-3 sm:start-auto sm:w-[375px] z-[500] flex flex-col gap-2 pointer-events-none"
    >
      {lastSecurityAlert && (
        <div
          data-testid="security-shield-toast"
          data-toast-theme={securityAppearance.themeId}
          role="alert"
          className={`pointer-events-auto rounded-2xl border overflow-hidden animate-fade-in ${securityAppearance.surfaceClass}`}
        >
          <div className={`h-1 w-full ${securityAppearance.accentBarClass}`} />
          <div className="px-3.5 py-2.5 flex items-center gap-2.5 text-xs font-semibold">
            <div
              className={`w-8 h-8 rounded-xl border flex items-center justify-center shrink-0 ${securityAppearance.iconWrapperClass}`}
            >
              <ShieldAlert className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 mb-0.5">
                <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${securityAppearance.badgeClass}`}>
                  {language === 'ar' ? 'تنبيه حماية' : 'Security Alert'}
                </span>
              </div>
              <p className={`text-xs font-bold leading-snug ${securityAppearance.titleClass}`}>
                {lastSecurityAlert}
              </p>
            </div>
          </div>
        </div>
      )}

      {toastQueue.map((toast, idx) => {
        const appearance = getThemeToastAppearance(uiTheme, toast.severity);
        const isPrimary = idx === 0;
        return (
          <div
            key={toast.id}
            data-testid={isPrimary ? 'realtime-toast-banner' : `realtime-toast-item-${idx}`}
            data-toast-theme={appearance.themeId}
            onMouseEnter={() => onPauseToastTimer?.(toast.id, true)}
            onMouseLeave={() => onPauseToastTimer?.(toast.id, false)}
            role="status"
            className={`pointer-events-auto rounded-2xl border overflow-hidden transition-all animate-fade-in ${appearance.surfaceClass}`}
          >
            <div className={`h-1 w-full ${appearance.accentBarClass}`} />
            <div className="px-3.5 py-2.5 flex items-start gap-2.5">
              <div
                className={`w-8 h-8 rounded-xl border flex items-center justify-center shrink-0 mt-0.5 ${appearance.iconWrapperClass}`}
              >
                {renderSeverityIcon(toast.severity)}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span
                    className={`text-[10px] font-bold px-1.5 py-0.2 rounded shrink-0 ${appearance.badgeClass}`}
                  >
                    {language === 'ar' ? appearance.badgeLabelAr : appearance.badgeLabelEn}
                  </span>
                  <div className={`text-xs font-bold truncate ${appearance.titleClass}`}>
                    {language === 'ar' ? toast.titleAr : toast.titleEn}
                  </div>
                </div>
                <p
                  className={`text-[11px] leading-snug line-clamp-2 mt-1 ${appearance.bodyClass}`}
                >
                  {language === 'ar' ? toast.messageAr : toast.messageEn}
                </p>
                {toast.actionType && (
                  <button
                    type="button"
                    onClick={() => {
                      onNavigateAction(toast.actionType!);
                      onDismissToast(toast.id);
                    }}
                    className={`mt-1.5 inline-flex items-center gap-1 text-[10px] font-bold cursor-pointer transition ${appearance.actionButtonClass}`}
                  >
                    <span>{language === 'ar' ? 'فتح القسم الآن' : 'Open now'}</span>
                    <ArrowUpLeft className="w-3 h-3" />
                  </button>
                )}
              </div>

              <button
                type="button"
                data-testid={
                  isPrimary
                    ? 'dismiss-realtime-toast-btn'
                    : `dismiss-realtime-toast-btn-${idx}`
                }
                onClick={() => onDismissToast(toast.id)}
                aria-label={language === 'ar' ? 'إغلاق التنبيه' : 'Dismiss alert'}
                className={`p-1 rounded-lg transition cursor-pointer shrink-0 ${appearance.dismissButtonClass}`}
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
};
