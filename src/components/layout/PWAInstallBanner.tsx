import React, { useEffect, useState } from 'react';
import { Download, Wifi, WifiOff, Smartphone, CheckCircle2 } from 'lucide-react';
import { useERP } from '../../context/ERPContext';
import { useModalLayer, renderModalPortal } from '../../core/modalLayerEngine';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export function usePWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;
    setIsInstalled(isStandalone);

    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIOSDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(isIOSDevice);

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const install = async () => {
    if (!deferredPrompt) return false;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setIsInstalled(true);
      setDeferredPrompt(null);
      return true;
    }
    return false;
  };

  return {
    isInstallable: !!deferredPrompt,
    isInstalled,
    isIOS,
    install,
  };
}

export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return isOnline;
}

export const PWAInstallButton: React.FC<{
  compactForDrawer?: boolean;
  alwaysVisible?: boolean;
  className?: string;
}> = ({
  compactForDrawer = false,
  alwaysVisible = false,
  className = '',
}) => {
  const { language } = useERP();
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const isOnline = useOnlineStatus();
  const [showModal, setShowModal] = useState(false);
  const pwaModalLayer = useModalLayer(showModal, 75);

  useEffect(() => {
    if (!showModal) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && pwaModalLayer.isTopLayer) {
        setShowModal(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [showModal, pwaModalLayer.isTopLayer]);

  if (isInstalled) {
    return (
      <span
        data-testid={
          compactForDrawer
            ? 'mobile-pwa-installed-badge'
            : alwaysVisible
            ? 'inline-pwa-installed-badge'
            : 'pwa-installed-badge'
        }
        className={`${
          compactForDrawer
            ? 'inline-flex w-full justify-center py-2'
            : alwaysVisible
            ? 'inline-flex w-full justify-center py-2'
            : 'hidden xl:inline-flex'
        } items-center gap-1 px-2.5 py-1 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-[11px] font-bold ${className}`}
      >
        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
        <span className="truncate">{language === 'ar' ? 'مثبت كتطبيق' : 'Installed'}</span>
      </span>
    );
  }

  return (
    <>
      <button
        type="button"
        data-testid={
          compactForDrawer
            ? 'mobile-pwa-install-btn'
            : alwaysVisible
            ? 'inline-pwa-install-btn'
            : 'navbar-pwa-install-btn'
        }
        onClick={async () => {
          if (isInstallable) {
            await install();
          } else {
            setShowModal(true);
          }
        }}
        title={
          language === 'ar'
            ? 'تثبيت تطبيق حاسب ERP على سطح المكتب أو الجوال للعمل بدون إنترنت'
            : 'Install Haseb ERP Offline-First PWA App'
        }
        className={
          compactForDrawer
            ? `w-full px-2.5 py-2.5 rounded-xl haseb-btn-primary text-white text-[11px] font-bold flex items-center justify-center gap-1.5 cursor-pointer ${className}`
            : alwaysVisible
            ? `w-full py-2.5 px-3.5 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-white text-white dark:text-slate-900 text-xs font-bold inline-flex items-center justify-center gap-2 transition cursor-pointer whitespace-nowrap ${className}`
            : `hidden xl:inline-flex items-center gap-1.5 px-2.5 h-8 rounded-md bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-semibold transition cursor-pointer ${className}`
        }
      >
        <Download className="w-3.5 h-3.5 shrink-0" />
        <span className="truncate">{language === 'ar' ? 'تثبيت كتطبيق مستقل (PWA)' : 'Install App'}</span>
      </button>

      {showModal &&
        renderModalPortal(
          <div
            style={{ zIndex: pwaModalLayer.zIndex }}
            data-modal-top={pwaModalLayer.isTopLayer ? 'true' : undefined}
            onMouseDown={(e) => {
              if (e.target === e.currentTarget) setShowModal(false);
            }}
            className="fixed inset-0 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4"
          >
            <div className="w-full max-w-md rounded-2xl bg-white border border-slate-200 p-5 shadow-xl space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div className="flex items-center gap-2 font-bold text-sm text-slate-900">
                <Smartphone className="w-4 h-4 text-blue-600" />
                <span>
                  {language === 'ar'
                    ? 'تثبيت نظام حاسب ERP كتطبيق على الجهاز'
                    : 'Install Haseb ERP Standalone Application'}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-slate-700 font-bold text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2 text-slate-700">
              <div className="flex items-center justify-between">
                <span className="font-semibold">
                  {language === 'ar' ? 'حالة التخزين المحلي والأوفلاين:' : 'Offline Storage Status:'}
                </span>
                <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold">
                  <Wifi className="w-3.5 h-3.5" />
                  {isOnline
                    ? language === 'ar'
                      ? 'متصل وجاهز للتطبيق'
                      : 'Active & Cached'
                    : language === 'ar'
                    ? 'وضع عدم الاتصال'
                    : 'Offline Mode'}
                </span>
              </div>
              <p className="text-[11px] text-slate-600 leading-relaxed">
                {isIOS
                  ? language === 'ar'
                    ? 'لتثبيت التطبيق على أجهزة iPhone / iPad: اضغط على زر المشاركة (Share) في متصفح Safari ثم اختر "إضافة إلى الشاشة الرئيسية".'
                    : 'On iPhone / iPad: Tap Share in Safari and select "Add to Home Screen".'
                  : language === 'ar'
                  ? 'يدعم نظام حاسب التثبيت المباشر كتطبيق مستقل من قائمة المتصفح (Add to Home screen / تثبيت التطبيق) للعمل بكفاءة عالية واستقبال التنبيهات.'
                  : 'Haseb ERP is configured with a Web App Manifest and Service Worker for native app installation.'}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2.5 text-[11px]">
              <div className="p-3 rounded-md bg-slate-50 border border-slate-200 text-slate-900">
                <div className="font-bold">نقطة بيع POS بدون توقف</div>
                <div className="text-[10px] text-slate-500 mt-0.5">
                  إصدار الفواتير الحرارية والضريبية محلياً
                </div>
              </div>
              <div className="p-3 rounded-md bg-slate-50 border border-slate-200 text-slate-900">
                <div className="font-bold">مزامنة فورية تلقائية</div>
                <div className="text-[10px] text-slate-500 mt-0.5">
                  ترحيل القيود والمخزون فور اتصال الخادم
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowModal(false)}
              className="w-full py-2 rounded-md haseb-btn-primary text-white font-semibold transition cursor-pointer"
            >
              {language === 'ar' ? 'إغلاق' : 'Close'}
            </button>
          </div>
        </div>
        )}
    </>
  );
};

export const OfflineIndicator: React.FC = () => {
  const { language } = useERP();
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div
      data-testid="offline-mode-banner"
      className="fixed bottom-4 start-4 z-50 flex items-center gap-2 rounded-md bg-slate-900 border border-amber-500/60 px-3.5 py-2 text-xs font-semibold text-white shadow-lg"
    >
      <WifiOff className="w-4 h-4 text-amber-400 shrink-0" />
      <span>
        {language === 'ar'
          ? 'وضع عدم الاتصال — يتم الحفظ محلياً وستتم المزامنة تلقائياً'
          : 'Offline Mode — Changes saved locally'}
      </span>
    </div>
  );
};
