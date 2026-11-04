import React, { useEffect, useState } from 'react';
import { Download, Wifi, WifiOff, Smartphone, CheckCircle2 } from 'lucide-react';
import { useERP } from '../../context/ERPContext';

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

export const PWAInstallButton: React.FC = () => {
  const { language } = useERP();
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const isOnline = useOnlineStatus();
  const [showModal, setShowModal] = useState(false);

  if (isInstalled) {
    return (
      <span
        data-testid="pwa-installed-badge"
        className="hidden xl:inline-flex items-center gap-1 px-2 py-1 rounded-md bg-slate-100 border border-slate-200 text-slate-700 text-[11px] font-medium"
      >
        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
        <span>{language === 'ar' ? 'تطبيق مثبت' : 'Installed'}</span>
      </span>
    );
  }

  return (
    <>
      <button
        type="button"
        data-testid="navbar-pwa-install-btn"
        onClick={async () => {
          if (isInstallable) {
            await install();
          } else {
            setShowModal(true);
          }
        }}
        title={
          language === 'ar'
            ? 'تثبيت تطبيق RLM ERP على سطح المكتب أو الجوال للعمل بدون إنترنت'
            : 'Install RLM ERP Offline-First PWA App'
        }
        className="hidden xl:inline-flex items-center gap-1.5 px-2.5 h-8 rounded-md bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-semibold transition cursor-pointer"
      >
        <Download className="w-3.5 h-3.5 text-slate-500 shrink-0" />
        <span>{language === 'ar' ? 'تثبيت النظام' : 'Install'}</span>
      </button>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-lg bg-white border border-slate-200 p-6 shadow-xl space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div className="flex items-center gap-2 font-bold text-sm text-slate-900">
                <Smartphone className="w-4 h-4 text-slate-700" />
                <span>
                  {language === 'ar'
                    ? 'تثبيت نظام RLM ERP كتطبيق سطح مكتب مستقل'
                    : 'Install RLM ERP Standalone Application'}
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

            <div className="p-3.5 rounded-md bg-slate-50 border border-slate-200 space-y-2 text-slate-700">
              <div className="flex items-center justify-between">
                <span className="font-semibold">
                  {language === 'ar' ? 'حالة التخزين المحلي والعمل دون اتصال:' : 'Offline Storage Status:'}
                </span>
                <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold">
                  <Wifi className="w-3.5 h-3.5" />
                  {isOnline
                    ? language === 'ar'
                      ? 'متصل وجاهز للأوفلاين'
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
                  ? 'يدعم النظام التثبيت المباشر كتطبيق سطح مكتب مستقل مع حفظ الفواتير والمخزون محلياً والعمل حتى عند انقطاع الشبكة.'
                  : 'RLM ERP is configured with a Web App Manifest and Service Worker for offline operation.'}
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
              className="w-full py-2 rounded-md bg-slate-900 hover:bg-slate-800 text-white font-semibold transition cursor-pointer"
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
