import React, { useMemo, useState, useEffect } from 'react';
import { useERP } from '../../context/ERPContext';
import { generateQRMatrix } from '../../core/barcodeEngine';
import {
  Wifi,
  Smartphone,
  QrCode,
  Copy,
  CheckCircle2,
  RefreshCw,
  ShieldCheck,
  Monitor,
  X,
  Laptop,
  Download,
  ExternalLink,
  HardDrive,
  Server,
  Terminal,
  Share2,
  Zap,
  Globe,
} from 'lucide-react';

export const MobileLanPortalModal: React.FC = () => {
  const {
    isLanPortalOpen,
    closeLanPortal,
    networkInfo,
    refreshNetworkInfo,
    dbRevision,
    syncLatencyMs,
    backendConnected,
  } = useERP();

  const [copiedUrl, setCopiedUrl] = useState(false);
  const [copiedCmd, setCopiedCmd] = useState(false);
  const [selectedUrlOverride, setSelectedUrlOverride] = useState<string>('');
  const [customIpInput, setCustomIpInput] = useState<string>('');
  const [instantAutoLogin, setInstantAutoLogin] = useState<boolean>(true);
  const [syncPulse, setSyncPulse] = useState<boolean>(false);

  // Build all candidate URLs (Live browser origin + detected physical Wi-Fi/LAN IPs)
  const candidateEndpoints = useMemo(() => {
    const list: { label: string; url: string; badge: string }[] = [];
    const browserOrigin =
      typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';
    const port = networkInfo?.port || 3000;

    // 1. If browser origin is not localhost/127.0.0.1, it is directly routable across devices!
    if (
      browserOrigin &&
      !browserOrigin.includes('localhost') &&
      !browserOrigin.includes('127.0.0.1')
    ) {
      list.push({
        label: 'الرابط المباشر النشط (متاح لجميع الجوالات والأجهزة فوراً)',
        url: browserOrigin,
        badge: 'نشط وموصى به',
      });
    }

    // 2. Physical LAN / Wi-Fi IPv4 addresses reported by the server
    if (networkInfo?.lanAddresses && networkInfo.lanAddresses.length > 0) {
      networkInfo.lanAddresses.forEach((ip, idx) => {
        const candidateUrl = ip.startsWith('http') ? ip : `http://${ip}:${port}`;
        if (!list.some((item) => item.url === candidateUrl)) {
          const isPrivateLan =
            ip.startsWith('192.168.') || ip.startsWith('10.') || ip.startsWith('172.');
          list.push({
            label: isPrivateLan
              ? `شبكة Wi-Fi / LAN المحلية (${ip})`
              : `عنوان الشبكة (${ip})`,
            url: candidateUrl,
            badge: idx === 0 ? 'IP الشبكة' : `منفذ ${idx + 1}`,
          });
        }
      });
    }

    // 3. Fallback if running strictly on localhost
    if (list.length === 0) {
      list.push({
        label: 'الخادم المحلي على هذا الجهاز',
        url: networkInfo?.primaryLanUrl || browserOrigin,
        badge: 'محلي',
      });
    }

    return list;
  }, [networkInfo]);

  const baseLanUrl = useMemo(() => {
    if (customIpInput.trim()) {
      const clean = customIpInput.trim().replace(/\/+$/, '');
      if (clean.startsWith('http://') || clean.startsWith('https://')) {
        return clean;
      }
      const port = networkInfo?.port || 3000;
      return clean.includes(':') ? `http://${clean}` : `http://${clean}:${port}`;
    }
    if (selectedUrlOverride) {
      return selectedUrlOverride;
    }
    return candidateEndpoints[0]?.url || 'http://localhost:3000';
  }, [customIpInput, selectedUrlOverride, candidateEndpoints, networkInfo]);

  const activeShareUrl = useMemo(() => {
    if (!instantAutoLogin) return baseLanUrl;
    const sep = baseLanUrl.includes('?') ? '&' : '?';
    return `${baseLanUrl}${sep}autostart=1`;
  }, [baseLanUrl, instantAutoLogin]);

  const qrMatrix = useMemo(() => generateQRMatrix(activeShareUrl, 25), [activeShareUrl]);

  useEffect(() => {
    if (isLanPortalOpen) {
      refreshNetworkInfo();
    }
  }, [isLanPortalOpen]);

  if (!isLanPortalOpen) return null;

  const handleCopyUrl = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(activeShareUrl).catch(() => {});
    }
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2500);
  };

  const handleShareNative = async () => {
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: 'حاسب ERP — الدخول عبر الشبكة',
          text: 'افتح الرابط للدخول المباشر إلى نظام حاسب ERP المتزامن:',
          url: activeShareUrl,
        });
        return;
      } catch {
        // fallback to copy
      }
    }
    handleCopyUrl();
  };

  const windowsCmdSnippet = `msedge.exe --app="${activeShareUrl}" --start-maximized`;

  const handleCopyCmd = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(windowsCmdSnippet).catch(() => {});
    }
    setCopiedCmd(true);
    setTimeout(() => setCopiedCmd(false), 2500);
  };

  const handleLaunchFramelessPopup = () => {
    const width = Math.min(window.screen.availWidth || 1440, 1600);
    const height = Math.min(window.screen.availHeight || 900, 960);
    window.open(
      activeShareUrl,
      'HasebEnterpriseDesktopWindow',
      `width=${width},height=${height},left=20,top=20,menubar=no,toolbar=no,location=no,status=no,resizable=yes,scrollbars=yes`
    );
  };

  const handleInstantSyncPulse = () => {
    setSyncPulse(true);
    refreshNetworkInfo();
    setTimeout(() => setSyncPulse(false), 800);
  };

  return (
    <div
      data-testid="mobile-lan-portal-modal"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) closeLanPortal();
      }}
      className="fixed inset-0 bg-slate-900/70 backdrop-blur-xs z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
    >
      <div className="bg-white rounded-t-3xl sm:rounded-2xl border border-slate-200/80 max-w-4xl w-full max-h-[92dvh] flex flex-col overflow-hidden shadow-2xl">
        {/* Sticky Top Header */}
        <div className="px-4 sm:px-6 py-3.5 bg-slate-50/95 border-b border-slate-200/80 text-slate-900 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center shrink-0 shadow-2xs">
              <Wifi className="w-5 h-5 text-emerald-400" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-bold text-xs sm:text-sm text-slate-900 truncate">
                  بوابة الربط الشبكي الفوري وتعدد الأجهزة (Wi-Fi / LAN & Multi-Device Sync)
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/80 shrink-0">
                  متصل ومفعل تلقائياً
                </span>
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5 truncate">
                ادخل للنظام فوراً من أي جوال (iPhone / Android) أو آيباد أو كمبيوتر آخر بدون إعدادات معقدة
              </p>
            </div>
          </div>

          <button
            type="button"
            data-testid="close-lan-portal-btn"
            onClick={closeLanPortal}
            className="w-8 h-8 rounded-full border border-slate-200/80 bg-white hover:bg-slate-100 flex items-center justify-center text-slate-500 hover:text-slate-900 transition cursor-pointer shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5 flex-1">
          {/* Top Multi-Device Connection Card (QR + Instant Link + Endpoint Selector) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
            {/* Left: Scannable QR Code for Phones & Tablets */}
            <div className="lg:col-span-5 bg-slate-50 rounded-2xl border border-slate-200/90 p-4 flex flex-col items-center justify-between text-center space-y-3">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900">
                <QrCode className="w-4 h-4 text-emerald-600" />
                <span>امسح بكاميرا الجوال أو الآيباد للدخول الفوري</span>
              </div>

              <div
                data-testid="lan-qr-code-svg"
                className="p-3 bg-white rounded-2xl border-2 border-slate-900 shadow-sm"
              >
                <svg
                  viewBox={`0 0 ${qrMatrix.length} ${qrMatrix.length}`}
                  className="w-40 h-40 sm:w-44 sm:h-44"
                  shapeRendering="crispEdges"
                >
                  {qrMatrix.map((row, rIdx) =>
                    row.map((cell, cIdx) =>
                      cell ? (
                        <rect
                          key={`${rIdx}-${cIdx}`}
                          x={cIdx}
                          y={rIdx}
                          width={1}
                          height={1}
                          fill="#0f172a"
                        />
                      ) : null
                    )
                  )}
                </svg>
              </div>

              <label className="flex items-center gap-2 text-[11px] font-bold text-slate-700 bg-white px-3 py-1.5 rounded-xl border border-slate-200 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={instantAutoLogin}
                  onChange={(e) => setInstantAutoLogin(e.target.checked)}
                  className="rounded text-emerald-600 focus:ring-0"
                />
                <span>دخول مباشر سريع للجوال بدون شاشة قفل</span>
              </label>

              <div className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
                <span>يدعم iOS Safari • Android Chrome • iPad • Windows • Mac</span>
              </div>
            </div>

            {/* Right: URL Copy, Endpoint Switcher & Custom Wi-Fi IP */}
            <div className="lg:col-span-7 flex flex-col justify-between space-y-3">
              <div className="p-4 rounded-2xl bg-slate-900 text-white space-y-3 shadow-xs">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] font-bold text-emerald-400 flex items-center gap-1.5">
                    <Globe className="w-3.5 h-3.5" />
                    <span>رابط الدخول الموحد للأجهزة والجوالات:</span>
                  </span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    Port {networkInfo?.port || 3000} • 0.0.0.0
                  </span>
                </div>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                  <code
                    data-testid="lan-primary-url-text"
                    className="font-mono text-xs sm:text-sm font-bold text-emerald-300 select-all truncate flex-1 py-1 px-1"
                    dir="ltr"
                  >
                    {activeShareUrl}
                  </code>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      data-testid="copy-lan-url-btn"
                      onClick={handleCopyUrl}
                      className="flex-1 sm:flex-initial px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer shrink-0"
                    >
                      {copiedUrl ? (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>تم النسخ!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>نسخ الرابط</span>
                        </>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={handleShareNative}
                      title="مشاركة الرابط عبر واتساب أو الجوال"
                      className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center justify-center gap-1 transition cursor-pointer"
                    >
                      <Share2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Endpoint Selector Pills */}
                <div className="space-y-1.5">
                  <div className="text-[10px] text-slate-400 font-semibold">
                    اختر منفذ الشبكة أو اكتب الـ IP المحلي لجهاز السيرفر (مثلاً 192.168.1.100):
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {candidateEndpoints.map((ep) => {
                      const isSelected = !customIpInput.trim() && baseLanUrl === ep.url;
                      return (
                        <button
                          key={ep.url}
                          type="button"
                          onClick={() => {
                            setCustomIpInput('');
                            setSelectedUrlOverride(ep.url);
                          }}
                          className={`px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold border transition cursor-pointer flex items-center gap-1.5 ${
                            isSelected
                              ? 'bg-emerald-600 text-white border-emerald-500'
                              : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                          }`}
                          dir="ltr"
                        >
                          <span>{ep.url.replace(/^https?:\/\//, '')}</span>
                          <span className="px-1 py-0.2 rounded bg-black/25 text-[9px] font-sans">
                            {ep.badge}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Optional Custom IPv4 Override for Local Router setups */}
                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="text"
                    value={customIpInput}
                    onChange={(e) => setCustomIpInput(e.target.value)}
                    placeholder="أو أدخل IP الشبكة يدوياً (مثال: 192.168.1.50)..."
                    dir="ltr"
                    className="flex-1 bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-lg px-2.5 py-1.5 text-xs font-mono text-white placeholder:text-slate-500 outline-hidden"
                  />
                  {customIpInput && (
                    <button
                      type="button"
                      onClick={() => setCustomIpInput('')}
                      className="px-2.5 py-1.5 rounded-lg bg-slate-800 text-slate-300 text-[10px] font-bold cursor-pointer"
                    >
                      افتراضي
                    </button>
                  )}
                </div>
              </div>

              {/* Live Multi-Device Sync Telemetry & Instant Sync Trigger */}
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/90 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5 text-emerald-600" />
                    <span>حالة المزامنة الفورية بين الأجهزة المتصلة</span>
                  </span>
                  <button
                    type="button"
                    data-testid="refresh-lan-info-btn"
                    onClick={handleInstantSyncPulse}
                    className="px-2.5 py-1 rounded-lg bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 text-[11px] font-bold flex items-center gap-1 cursor-pointer transition shadow-2xs"
                  >
                    <RefreshCw className={`w-3 h-3 ${syncPulse ? 'animate-spin text-emerald-600' : ''}`} />
                    <span>تحديث ومزامنة الآن</span>
                  </button>
                </div>

                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="p-2 rounded-xl bg-white border border-slate-200/80">
                    <div className="text-[10px] text-slate-400">حالة الخادم</div>
                    <div className="text-xs font-bold text-emerald-700 mt-0.5 flex items-center justify-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      <span>{backendConnected ? 'نشط (Online)' : 'ذاكرة فورية'}</span>
                    </div>
                  </div>
                  <div className="p-2 rounded-xl bg-white border border-slate-200/80">
                    <div className="text-[10px] text-slate-400">رقم مراجعة البيانات</div>
                    <div className="text-xs font-mono font-bold text-slate-900 mt-0.5" dir="ltr">
                      Rev #{dbRevision}
                    </div>
                  </div>
                  <div className="p-2 rounded-xl bg-white border border-slate-200/80">
                    <div className="text-[10px] text-slate-400">سرعة الاستجابة</div>
                    <div className="text-xs font-mono font-bold text-emerald-700 mt-0.5" dir="ltr">
                      {syncLatencyMs || 1} ms
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Windows Native Desktop Launcher Section */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Laptop className="w-4 h-4 text-slate-800" />
                <h4 className="text-xs font-bold text-slate-900">
                  تشغيل كبرنامج سطح مكتب مستقل على Windows + فتح جدار الحماية للشبكة (Port 3000)
                </h4>
              </div>
              <span className="text-[10px] font-mono bg-white border border-slate-200 px-2 py-0.5 rounded text-slate-600">
                Windows 10 / 11 Native App
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <a
                href="/api/v1/desktop/windows-launcher.bat"
                download="Haseb_Windows_Desktop_App.bat"
                data-testid="download-windows-launcher-btn"
                className="py-2.5 px-3.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-2xs transition cursor-pointer"
              >
                <Download className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>تنزيل مشغل سطح المكتب ومفعل الشبكة (.bat)</span>
              </a>

              <button
                type="button"
                data-testid="launch-frameless-window-btn"
                onClick={handleLaunchFramelessPopup}
                className="py-2.5 px-3.5 rounded-xl bg-white hover:bg-slate-100 text-slate-800 border border-slate-200 font-bold text-xs flex items-center justify-center gap-2 transition cursor-pointer"
              >
                <ExternalLink className="w-4 h-4 text-blue-600 shrink-0" />
                <span>فتح في نافذة كاشير مستقلة الآن</span>
              </button>
            </div>

            <div className="flex items-center justify-between gap-2 bg-white px-3 py-2 rounded-xl border border-slate-200/80">
              <div className="flex items-center gap-2 min-w-0">
                <Terminal className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <code className="font-mono text-[10px] text-slate-600 truncate" dir="ltr">
                  {windowsCmdSnippet}
                </code>
              </div>
              <button
                type="button"
                onClick={handleCopyCmd}
                className="px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-bold shrink-0 cursor-pointer"
              >
                {copiedCmd ? 'تم النسخ' : 'نسخ الأمر'}
              </button>
            </div>
          </div>
        </div>

        {/* Sticky Footer */}
        <div className="px-4 sm:px-6 py-3 bg-slate-50 border-t border-slate-200/80 flex items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-2 text-[11px] text-slate-500">
            <HardDrive className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span className="truncate">
              جميع الفواتير والمخزون تتزامن لحظياً بين الكمبيوتر والجوالات المتصلة
            </span>
          </div>
          <button
            type="button"
            onClick={closeLanPortal}
            className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition cursor-pointer shrink-0"
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
};
