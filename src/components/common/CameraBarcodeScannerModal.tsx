import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import {
  Camera,
  X,
  Volume2,
  Layers,
  CheckCircle2,
  AlertCircle,
  Plus,
  Minus,
  Trash2,
  RefreshCw,
  Zap,
  Package,
  Barcode as BarcodeIcon,
  Check,
  ImagePlus,
  Keyboard,
  ShieldCheck,
  ExternalLink,
  Copy,
} from 'lucide-react';
import { Product } from '../../types/erp';
import { playScannerBeep } from '../../core/notificationsEngine';
import { useERP } from '../../context/ERPContext';
import {
  buildCameraAttemptSequence,
  isSecureCameraContext,
  mapCameraErrorToArabicMessage,
  resolvePreferredLanCameraUrl,
} from '../../core/cameraScannerEngine';
import { useModalLayer, renderModalPortal } from '../../core/modalLayerEngine';

export interface ScannedBatchItem {
  barcode: string;
  product?: Product;
  quantity: number;
  matchedName: string;
  price: number;
  sku: string;
}

interface CameraBarcodeScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScan: (barcode: string, product?: Product, quantity?: number) => void;
  onBatchScanComplete?: (items: ScannedBatchItem[]) => void;
  title?: string;
  contextMode?: 'POS' | 'INVENTORY' | 'STOCK_TAKE' | 'PURCHASING' | 'GENERAL' | 'INVOICE_RETURN';
  initialScanMode?: 'SINGLE' | 'CONTINUOUS';
}

const SUPPORTED_FORMATS = [
  Html5QrcodeSupportedFormats.EAN_13,
  Html5QrcodeSupportedFormats.EAN_8,
  Html5QrcodeSupportedFormats.CODE_128,
  Html5QrcodeSupportedFormats.CODE_39,
  Html5QrcodeSupportedFormats.QR_CODE,
  Html5QrcodeSupportedFormats.UPC_A,
  Html5QrcodeSupportedFormats.UPC_E,
];

export const CameraBarcodeScannerModal: React.FC<CameraBarcodeScannerModalProps> = ({
  isOpen,
  onClose,
  onScan,
  onBatchScanComplete,
  title = 'مسح الباركود والكود بالكاميرا',
  contextMode = 'POS',
  initialScanMode = 'SINGLE',
}) => {
  const { products, currency, language, networkInfo, refreshNetworkInfo } = useERP();
  const { zIndex, isTopLayer } = useModalLayer(isOpen, 75);

  const [scanMode, setScanMode] = useState<'SINGLE' | 'CONTINUOUS'>(initialScanMode);
  const [cameraActive, setCameraActive] = useState(false);
  const [isInitializingCamera, setIsInitializingCamera] = useState(false);
  const [usingNativeFallbackVideo, setUsingNativeFallbackVideo] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [cameraErrorTitle, setCameraErrorTitle] = useState<string | null>(null);
  const [isInsecureHttpBlocked, setIsInsecureHttpBlocked] = useState(false);
  const [copiedChromeFlag, setCopiedChromeFlag] = useState(false);
  const [availableCameras, setAvailableCameras] = useState<{ id: string; label: string }[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string>('');
  const [torchOn, setTorchOn] = useState(false);
  const [hasTorch, setHasTorch] = useState(false);
  const [manualCodeInput, setManualCodeInput] = useState('');
  const [isScanningPhoto, setIsScanningPhoto] = useState(false);

  // Batch collection for Continuous Mode
  const [batchItems, setBatchItems] = useState<ScannedBatchItem[]>([]);
  const [lastScannedCode, setLastScannedCode] = useState<string | null>(null);
  const [lastScannedItemName, setLastScannedItemName] = useState<string | null>(null);
  const [flashSuccess, setFlashSuccess] = useState(false);

  const scannerRef = useRef<Html5Qrcode | null>(null);
  const nativeVideoRef = useRef<HTMLVideoElement | null>(null);
  const nativeStreamRef = useRef<MediaStream | null>(null);
  const nativeScanRafRef = useRef<number | null>(null);
  const opLockRef = useRef<Promise<void>>(Promise.resolve());
  const isOpenRef = useRef<boolean>(isOpen);
  isOpenRef.current = isOpen;

  const photoInputRef = useRef<HTMLInputElement | null>(null);
  const lastScanTimestampRef = useRef<{ code: string; time: number }>({ code: '', time: 0 });
  const html5QrCodeId = 'interactive-camera-barcode-viewport';

  const preferredLanHttpsUrl = resolvePreferredLanCameraUrl(networkInfo);
  const currentOrigin = typeof window !== 'undefined' ? window.location.origin : '';

  // Helper to match barcode to a product
  const findProductByCode = (code: string): Product | undefined => {
    const clean = code.trim().toLowerCase();
    return products.find(
      (p) =>
        p.barcode?.toLowerCase() === clean ||
        p.sku?.toLowerCase() === clean ||
        p.id.toLowerCase() === clean
    );
  };

  const stopCameraInternal = useCallback(async () => {
    if (nativeScanRafRef.current !== null) {
      window.clearTimeout(nativeScanRafRef.current);
      nativeScanRafRef.current = null;
    }
    if (nativeStreamRef.current) {
      nativeStreamRef.current.getTracks().forEach((track) => track.stop());
      nativeStreamRef.current = null;
    }
    if (nativeVideoRef.current) {
      nativeVideoRef.current.srcObject = null;
    }
    setUsingNativeFallbackVideo(false);

    if (scannerRef.current) {
      try {
        if (scannerRef.current.isScanning) {
          await scannerRef.current.stop();
        }
        scannerRef.current.clear();
      } catch {
        // ignore stop errors
      }
      scannerRef.current = null;
    }
    setCameraActive(false);
    setTorchOn(false);
    setHasTorch(false);
  }, []);

  const stopCamera = useCallback(() => {
    opLockRef.current = opLockRef.current.then(() => stopCameraInternal()).catch(() => {});
    return opLockRef.current;
  }, [stopCameraInternal]);

  const startNativeFallbackStream = async (
    constraints: MediaStreamConstraints
  ): Promise<boolean> => {
    if (!navigator.mediaDevices?.getUserMedia) return false;
    try {
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      if (!isOpenRef.current) {
        stream.getTracks().forEach((t) => t.stop());
        return false;
      }
      nativeStreamRef.current = stream;
      setUsingNativeFallbackVideo(true);
      setCameraActive(true);
      setCameraError(null);
      setCameraErrorTitle(null);
      setIsInsecureHttpBlocked(false);

      // Attach stream after React mounts fallback <video>
      setTimeout(() => {
        const videoEl = nativeVideoRef.current;
        if (!videoEl) return;
        videoEl.srcObject = stream;
        videoEl.setAttribute('playsinline', 'true');
        videoEl.muted = true;
        videoEl.play().catch(() => {});

        // Check torch capability on active track
        try {
          const track = stream.getVideoTracks()[0];
          const caps = track?.getCapabilities?.() as any;
          if (caps?.torch) setHasTorch(true);
        } catch {
          // ignore
        }

        // Start native BarcodeDetector loop if supported
        if (typeof (window as any).BarcodeDetector === 'function') {
          try {
            const detector = new (window as any).BarcodeDetector({
              formats: ['ean_13', 'ean_8', 'code_128', 'code_39', 'qr_code', 'upc_a', 'upc_e'],
            });
            const pollFrame = async () => {
              if (!isOpenRef.current || !nativeStreamRef.current || !nativeVideoRef.current) return;
              try {
                if (nativeVideoRef.current.readyState >= 2) {
                  const codes = await detector.detect(nativeVideoRef.current);
                  if (Array.isArray(codes) && codes.length > 0 && codes[0]?.rawValue) {
                    handleCodeDetected(String(codes[0].rawValue));
                  }
                }
              } catch {
                // ignore frame errors
              }
              nativeScanRafRef.current = window.setTimeout(pollFrame, 180);
            };
            nativeScanRafRef.current = window.setTimeout(pollFrame, 250);
          } catch {
            // BarcodeDetector formats not supported; video still works for live framing
          }
        }
      }, 60);

      return true;
    } catch {
      return false;
    }
  };

  const initAndStartCamera = useCallback(
    (preferredCameraId?: string) => {
      opLockRef.current = opLockRef.current.then(async () => {
        if (!isOpenRef.current) return;
        await stopCameraInternal();
        if (!isOpenRef.current) return;

        setIsInitializingCamera(true);
        setCameraError(null);
        setCameraErrorTitle(null);

        const secure =
          typeof window !== 'undefined' && isSecureCameraContext(window.location);
        if (
          !secure ||
          typeof navigator === 'undefined' ||
          !navigator.mediaDevices?.getUserMedia
        ) {
          refreshNetworkInfo();
          setIsInitializingCamera(false);
          setCameraActive(false);
          const info = mapCameraErrorToArabicMessage(
            new Error('MediaDevices requires HTTPS on LAN'),
            secure
          );
          setIsInsecureHttpBlocked(true);
          setCameraErrorTitle(info.titleAr);
          setCameraError(info.messageAr);
          return;
        }

        setIsInsecureHttpBlocked(false);

        // Request permission early via a quick throwaway stream ONLY if enumerateDevices labels are empty
        let cameras: { id: string; label: string }[] = [];
        try {
          cameras = await Html5Qrcode.getCameras();
          if (!isOpenRef.current) return;
          if (cameras && cameras.length > 0) {
            setAvailableCameras(cameras);
          }
        } catch {
          // Proceed cleanly to facingMode constraint fallbacks
        }

        const attempts = buildCameraAttemptSequence(cameras, preferredCameraId);
        let lastErr: unknown = null;

        for (const step of attempts) {
          if (!isOpenRef.current) break;
          try {
            const html5QrCode = new Html5Qrcode(html5QrCodeId, {
              formatsToSupport: SUPPORTED_FORMATS,
              experimentalFeatures: { useBarCodeDetectorIfSupported: true },
              verbose: false,
            });
            scannerRef.current = html5QrCode;

            const config = {
              fps: 15,
              qrbox: (viewfinderWidth: number, viewfinderHeight: number) => {
                const w = Math.max(160, Math.min(300, Math.floor(viewfinderWidth * 0.78)));
                const h = Math.max(110, Math.min(200, Math.floor(viewfinderHeight * 0.56)));
                return { width: w, height: h };
              },
            };

            await html5QrCode.start(
              step.qrTarget,
              config,
              (decodedText) => handleCodeDetected(decodedText),
              () => {}
            );

            if (!isOpenRef.current) {
              await stopCameraInternal();
              return;
            }

            setCameraActive(true);
            setIsInitializingCamera(false);
            setCameraError(null);
            setCameraErrorTitle(null);

            if (typeof step.qrTarget === 'string') {
              setSelectedCameraId(step.qrTarget);
            }

            // Refresh camera labels after permission is active
            try {
              const postCameras = await Html5Qrcode.getCameras();
              if (postCameras && postCameras.length > 0) {
                setAvailableCameras(postCameras);
              }
              const capabilities = html5QrCode.getRunningTrackCapabilities();
              if (capabilities && (capabilities as any).torch) {
                setHasTorch(true);
              }
            } catch {
              // ignore post-start metadata check
            }
            return;
          } catch (err) {
            lastErr = err;
            await stopCameraInternal();
          }
        }

        // Last-resort native HTML5 <video> + BarcodeDetector fallback if Html5Qrcode failed on sensor aspect
        for (const step of attempts) {
          if (!isOpenRef.current) break;
          const ok = await startNativeFallbackStream(step.gumConstraints);
          if (ok) {
            setIsInitializingCamera(false);
            return;
          }
        }

        setIsInitializingCamera(false);
        setCameraActive(false);
        refreshNetworkInfo();
        const errInfo = mapCameraErrorToArabicMessage(lastErr, secure);
        setIsInsecureHttpBlocked(errInfo.kind === 'INSECURE_CONTEXT');
        setCameraErrorTitle(errInfo.titleAr);
        setCameraError(errInfo.messageAr);
      });
    },
    [stopCameraInternal, refreshNetworkInfo]
  );

  // Start Camera Scanning on Open
  useEffect(() => {
    if (!isOpen) {
      stopCamera();
      return;
    }

    const timer = setTimeout(() => {
      initAndStartCamera();
    }, 180);

    return () => {
      clearTimeout(timer);
      stopCamera();
    };
  }, [isOpen, initAndStartCamera, stopCamera]);

  // Toggle Torch
  const handleToggleTorch = async () => {
    const nextTorch = !torchOn;
    try {
      if (nativeStreamRef.current) {
        const track = nativeStreamRef.current.getVideoTracks()[0];
        if (track) {
          await track.applyConstraints({ advanced: [{ torch: nextTorch } as any] });
          setTorchOn(nextTorch);
          return;
        }
      }
      if (scannerRef.current) {
        await scannerRef.current.applyVideoConstraints({
          advanced: [{ torch: nextTorch } as any],
        });
        setTorchOn(nextTorch);
      }
    } catch {
      // ignore unsupported torch
    }
  };

  // Switch Active Camera
  const handleCameraChange = async (newCamId: string) => {
    setSelectedCameraId(newCamId);
    initAndStartCamera(newCamId);
  };

  // Native Photo / Image Barcode+QR Decoder (works even over plain HTTP LAN on mobile phones!)
  const handlePhotoFileScan = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setIsScanningPhoto(true);
    setCameraError(null);

    try {
      // Try native BarcodeDetector first if available in modern Chromium/Android
      if (typeof (window as any).BarcodeDetector === 'function') {
        try {
          const bitmap = await createImageBitmap(file);
          const detector = new (window as any).BarcodeDetector();
          const detected = await detector.detect(bitmap);
          bitmap.close?.();
          if (Array.isArray(detected) && detected.length > 0 && detected[0]?.rawValue) {
            handleCodeDetected(String(detected[0].rawValue));
            setIsScanningPhoto(false);
            return;
          }
        } catch {
          // fallback to html5-qrcode scanFile
        }
      }

      const fileScanner =
        scannerRef.current ||
        new Html5Qrcode(html5QrCodeId, {
          formatsToSupport: SUPPORTED_FORMATS,
          experimentalFeatures: { useBarCodeDetectorIfSupported: true },
          verbose: false,
        });
      const wasStreaming = Boolean(scannerRef.current?.isScanning);
      if (wasStreaming && scannerRef.current) {
        await scannerRef.current.stop();
      }
      const decodedText = await fileScanner.scanFile(file, false);
      handleCodeDetected(decodedText);
    } catch {
      setCameraError(
        language === 'ar'
          ? 'لم يتم العثور على باركود أو رمز QR واضح داخل الصورة الملتقطة — حاول التقريب وإضاءة الكود جيداً.'
          : 'No readable barcode or QR code detected in the captured image.'
      );
    } finally {
      setIsScanningPhoto(false);
    }
  };

  // Core handler when a barcode is detected by camera, photo, or manual entry
  const handleCodeDetected = (decodedText: string) => {
    const cleanCode = decodedText.trim();
    if (!cleanCode) return;

    const now = Date.now();
    if (
      lastScanTimestampRef.current.code === cleanCode &&
      now - lastScanTimestampRef.current.time < 1200
    ) {
      return;
    }

    lastScanTimestampRef.current = { code: cleanCode, time: now };

    const matchedProduct = findProductByCode(cleanCode);
    const itemName = matchedProduct
      ? matchedProduct.nameAr || matchedProduct.name
      : `كود: ${cleanCode}`;

    playScannerBeep(!!matchedProduct);
    if (navigator.vibrate) {
      navigator.vibrate(80);
    }

    setLastScannedCode(cleanCode);
    setLastScannedItemName(itemName);
    setFlashSuccess(true);
    setTimeout(() => setFlashSuccess(false), 700);

    if (scanMode === 'SINGLE') {
      onScan(cleanCode, matchedProduct, 1);
      setTimeout(() => {
        onClose();
      }, 320);
    } else {
      setBatchItems((prev) => {
        const existingIdx = prev.findIndex((item) => item.barcode === cleanCode);
        if (existingIdx >= 0) {
          const updated = [...prev];
          updated[existingIdx] = {
            ...updated[existingIdx],
            quantity: updated[existingIdx].quantity + 1,
          };
          return updated;
        } else {
          return [
            ...prev,
            {
              barcode: cleanCode,
              product: matchedProduct,
              quantity: 1,
              matchedName: itemName,
              price: matchedProduct?.salePrice || 0,
              sku: matchedProduct?.sku || cleanCode,
            },
          ];
        }
      });
      onScan(cleanCode, matchedProduct, 1);
    }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualCodeInput.trim()) return;
    handleCodeDetected(manualCodeInput);
    setManualCodeInput('');
  };

  const updateBatchQty = (barcode: string, delta: number) => {
    setBatchItems((prev) =>
      prev
        .map((item) => {
          if (item.barcode === barcode) {
            return { ...item, quantity: Math.max(1, item.quantity + delta) };
          }
          return item;
        })
        .filter((item) => item.quantity > 0)
    );
  };

  const removeBatchItem = (barcode: string) => {
    setBatchItems((prev) => prev.filter((item) => item.barcode !== barcode));
  };

  const handleApplyBatch = () => {
    if (onBatchScanComplete) {
      onBatchScanComplete(batchItems);
    }
    onClose();
  };

  const sampleTestProducts = products.slice(0, 4);

  if (!isOpen) return null;

  const totalBatchQuantity = batchItems.reduce((sum, i) => sum + i.quantity, 0);
  const totalBatchAmount = batchItems.reduce((sum, i) => sum + i.quantity * i.price, 0);

  return renderModalPortal(
    <div
      data-testid="camera-barcode-scanner-modal"
      data-modal-top={isTopLayer ? 'true' : 'false'}
      style={{ zIndex }}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 flex items-center justify-center p-2.5 sm:p-5 bg-slate-950/80 backdrop-blur-sm animate-fade-in"
    >
      {/* Guarantee html5-qrcode inner video fills viewport cleanly */}
      <style>{`
        #${html5QrCodeId} video {
          width: 100% !important;
          height: 100% !important;
          object-fit: cover !important;
          border-radius: 0.75rem;
        }
      `}</style>

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-2xl max-h-[94dvh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header Bar */}
        <div className="p-3 sm:p-4 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2.5 shrink-0 bg-slate-50 dark:bg-slate-900/90">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="p-2 rounded-xl bg-emerald-600 text-white shadow-xs shrink-0">
              <Camera className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h2 className="font-black text-xs sm:text-sm text-slate-900 dark:text-slate-100 flex items-center gap-2 flex-wrap">
                <span className="truncate">{title}</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-400">
                  {contextMode === 'POS'
                    ? 'نقطة البيع (POS)'
                    : contextMode === 'STOCK_TAKE'
                    ? 'الجرد الفعلي'
                    : contextMode === 'INVENTORY'
                    ? 'إدارة المخزون'
                    : contextMode === 'INVOICE_RETURN'
                    ? 'إرجاع فاتورة بالكود / QR'
                    : 'الباركود العام'}
                </span>
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                قراءة فورية لباركود EAN-13, Code-128, QR عبر الكاميرا أو التقاط صورة
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {/* Mode Toggle Pills */}
            <div className="bg-slate-200 dark:bg-slate-800 p-0.5 rounded-xl flex items-center text-[11px] font-bold">
              <button
                type="button"
                data-testid="scanner-mode-single"
                onClick={() => setScanMode('SINGLE')}
                className={`px-2.5 py-1.5 rounded-lg transition cursor-pointer flex items-center gap-1 ${
                  scanMode === 'SINGLE'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                <BarcodeIcon className="w-3.5 h-3.5" />
                <span>مفرد</span>
              </button>
              <button
                type="button"
                data-testid="scanner-mode-continuous"
                onClick={() => setScanMode('CONTINUOUS')}
                className={`px-2.5 py-1.5 rounded-lg transition cursor-pointer flex items-center gap-1 ${
                  scanMode === 'CONTINUOUS'
                    ? 'bg-emerald-600 text-white shadow-2xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>مستمر</span>
                {batchItems.length > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full font-mono text-[10px] bg-white text-emerald-700">
                    {totalBatchQuantity}
                  </span>
                )}
              </button>
            </div>

            <button
              type="button"
              data-testid="camera-scanner-close-btn"
              onClick={onClose}
              aria-label="إغلاق الماسح"
              className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 flex items-center justify-center transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Body Workspace */}
        <div className="flex-1 overflow-y-auto p-3.5 sm:p-4 space-y-3.5">
          {/* Camera Viewport Container */}
          <div className="relative w-full rounded-2xl overflow-hidden bg-slate-950 border-2 border-slate-800 aspect-4/3 max-h-64 sm:max-h-76 mx-auto flex items-center justify-center shadow-inner">
            <div
              id={html5QrCodeId}
              className={`w-full h-full min-h-[210px] object-cover ${
                usingNativeFallbackVideo ? 'hidden' : 'block'
              }`}
            />

            {usingNativeFallbackVideo && (
              <video
                ref={nativeVideoRef}
                autoPlay
                playsInline
                muted
                data-testid="native-camera-fallback-video"
                className="w-full h-full object-cover"
              />
            )}

            {isInitializingCamera && !cameraActive && !cameraError && (
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-2 bg-slate-950/80 text-white z-10">
                <RefreshCw className="w-6 h-6 text-emerald-400 animate-spin" />
                <span className="text-xs font-bold text-slate-200">
                  جاري تهيئة عدسة الكاميرا...
                </span>
              </div>
            )}

            {/* Visual Reticle & Laser Overlay */}
            {cameraActive && (
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <div className="relative w-60 h-32 border-2 border-emerald-400/80 rounded-xl shadow-[0_0_15px_rgba(16,185,129,0.3)] flex items-center justify-center">
                  <span className="absolute -top-1 -start-1 w-4 h-4 border-t-2 border-s-2 border-emerald-400" />
                  <span className="absolute -top-1 -end-1 w-4 h-4 border-t-2 border-e-2 border-emerald-400" />
                  <span className="absolute -bottom-1 -start-1 w-4 h-4 border-b-2 border-s-2 border-emerald-400" />
                  <span className="absolute -bottom-1 -end-1 w-4 h-4 border-b-2 border-e-2 border-emerald-400" />
                  <div className="w-full h-0.5 bg-emerald-400 shadow-[0_0_8px_#10b981] animate-pulse" />
                </div>
              </div>
            )}

            {/* Flash Effect on Successful Scan */}
            {flashSuccess && (
              <div className="pointer-events-none absolute inset-0 bg-emerald-500/25 animate-fade-in flex items-center justify-center z-20">
                <div className="bg-slate-900/95 text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 border border-emerald-500 shadow-xl">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>تم المسح: {lastScannedItemName}</span>
                </div>
              </div>
            )}

            {/* Error or HTTPS Secure Context Fallback Overlay */}
            {cameraError && (
              <div
                data-testid="camera-error-fallback-panel"
                className="absolute inset-0 p-3.5 sm:p-4 bg-slate-950/95 text-white flex flex-col items-center justify-center text-center space-y-2.5 z-10 overflow-y-auto"
              >
                <AlertCircle className="w-7 h-7 text-amber-400 shrink-0" />
                {cameraErrorTitle && (
                  <div className="text-xs font-black text-amber-300 max-w-md">
                    {cameraErrorTitle}
                  </div>
                )}
                <p className="text-[11px] font-medium text-slate-200 max-w-md leading-relaxed">
                  {cameraError}
                </p>

                <div className="flex flex-wrap items-center justify-center gap-2 pt-0.5">
                  {isInsecureHttpBlocked && preferredLanHttpsUrl && (
                    <a
                      href={preferredLanHttpsUrl}
                      data-testid="open-https-camera-portal-btn"
                      className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-sm"
                    >
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>فتح بالرابط الآمن (HTTPS)</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                  <button
                    type="button"
                    data-testid="retry-camera-btn"
                    onClick={() => initAndStartCamera()}
                    className="px-3.5 py-2 rounded-xl haseb-btn-primary text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>إعادة تشغيل الكاميرا</span>
                  </button>
                  <button
                    type="button"
                    data-testid="camera-capture-photo-btn"
                    onClick={() => photoInputRef.current?.click()}
                    disabled={isScanningPhoto}
                    className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                  >
                    <ImagePlus className="w-3.5 h-3.5" />
                    <span>{isScanningPhoto ? 'جاري القراءة...' : 'تصوير بالكاميرا / صورة'}</span>
                  </button>
                </div>

                {isInsecureHttpBlocked && currentOrigin.startsWith('http://') && (
                  <div className="w-full max-w-md bg-slate-900 border border-slate-700/80 rounded-xl px-2.5 py-1.5 text-[10px] text-slate-300 flex items-center justify-between gap-2">
                    <span className="truncate text-start" dir="rtl">
                      أو فعّل <code className="text-amber-300 font-mono">unsafely-treat-insecure-origin</code> للرابط:
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard?.writeText(currentOrigin).catch(() => {});
                        setCopiedChromeFlag(true);
                        setTimeout(() => setCopiedChromeFlag(false), 2000);
                      }}
                      className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-emerald-300 font-mono font-bold flex items-center gap-1 shrink-0 cursor-pointer"
                      dir="ltr"
                    >
                      <Copy className="w-3 h-3" />
                      <span>{copiedChromeFlag ? 'Copied!' : currentOrigin.replace(/^http:\/\//, '')}</span>
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Floating Camera Controls */}
            <div className="absolute top-2.5 start-2.5 end-2.5 flex items-center justify-between pointer-events-auto z-20 gap-1.5">
              {availableCameras.length > 1 && (
                <select
                  value={selectedCameraId}
                  onChange={(e) => handleCameraChange(e.target.value)}
                  className="bg-black/75 backdrop-blur-md text-white text-[11px] font-bold px-2.5 py-1.5 rounded-lg border border-white/20 outline-hidden cursor-pointer max-w-[160px]"
                >
                  {availableCameras.map((cam) => (
                    <option key={cam.id} value={cam.id}>
                      {cam.label || `كاميرا ${cam.id.slice(0, 5)}`}
                    </option>
                  ))}
                </select>
              )}

              <div className="flex items-center gap-1.5 ms-auto">
                <button
                  type="button"
                  data-testid="toolbar-photo-scan-btn"
                  onClick={() => photoInputRef.current?.click()}
                  className="px-2.5 py-1.5 rounded-lg bg-black/75 backdrop-blur-md text-white hover:bg-black/90 text-[11px] font-bold flex items-center gap-1 cursor-pointer border border-white/15"
                  title="التقاط صورة للباركود أو اختيار صورة"
                >
                  <ImagePlus className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="hidden sm:inline">مسح صورة</span>
                </button>

                {hasTorch && (
                  <button
                    type="button"
                    onClick={handleToggleTorch}
                    className={`p-2 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
                      torchOn
                        ? 'bg-amber-500 text-black'
                        : 'bg-black/75 backdrop-blur-md text-white hover:bg-black/90'
                    }`}
                    title="تشغيل/إطفاء فلاش الكاميرا"
                  >
                    <Zap className="w-3.5 h-3.5" />
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => playScannerBeep(true)}
                  className="p-2 rounded-lg bg-black/75 backdrop-blur-md text-white hover:bg-black/90 text-xs transition cursor-pointer"
                  title="اختبار نغمة المسح"
                >
                  <Volume2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>

          <input
            ref={photoInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            data-testid="camera-photo-file-input"
            onChange={handlePhotoFileScan}
            className="sr-only"
          />

          {/* Manual Barcode / SKU / QR Input Form (Works even without camera or HTTPS) */}
          <form
            onSubmit={handleManualSubmit}
            className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 flex flex-col sm:flex-row items-stretch sm:items-center gap-2"
          >
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <Keyboard className="w-4 h-4 text-blue-600 shrink-0" />
              <input
                type="text"
                data-testid="scanner-manual-barcode-input"
                value={manualCodeInput}
                onChange={(e) => setManualCodeInput(e.target.value)}
                placeholder="أدخل أو امسح كود الباركود / QR / SKU يدوياً واضغط Enter..."
                dir="ltr"
                className="flex-1 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-mono font-bold text-slate-900 dark:text-white outline-hidden focus:border-blue-600"
              />
            </div>
            <button
              type="submit"
              data-testid="scanner-manual-submit-btn"
              className="px-4 py-2 rounded-xl haseb-btn-primary text-white text-xs font-bold cursor-pointer shrink-0"
            >
              إدراج الكود
            </button>
          </form>

          {/* Quick Catalog Chips (Only shown if catalog already has products and not in invoice-return scan) */}
          {contextMode !== 'INVOICE_RETURN' && sampleTestProducts.length > 0 && (
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <BarcodeIcon className="w-4 h-4 text-emerald-600" />
                  <span>إدخال سريع من أصناف المستودع:</span>
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {sampleTestProducts.map((prod) => (
                  <button
                    key={prod.id}
                    type="button"
                    onClick={() => handleCodeDetected(prod.barcode || prod.sku)}
                    className="px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 hover:border-emerald-300 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-800 dark:text-slate-200 transition shadow-2xs cursor-pointer flex items-center gap-1.5"
                  >
                    <Package className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>{prod.nameAr}</span>
                    <span
                      className="font-mono text-[10px] text-slate-400 bg-slate-100 dark:bg-slate-700 px-1 py-0.2 rounded"
                      dir="ltr"
                    >
                      {prod.barcode || prod.sku}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Continuous Batch Scanned Items Table */}
          {scanMode === 'CONTINUOUS' && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-emerald-600" />
                  <span>قائمة الأصناف الممسوحة بالدفعة الحالية ({batchItems.length} صنف):</span>
                </span>
                {batchItems.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setBatchItems([])}
                    className="text-rose-600 hover:text-rose-700 text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>تفريغ القائمة</span>
                  </button>
                )}
              </div>

              {batchItems.length === 0 ? (
                <div className="p-4 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 text-center text-xs text-slate-400">
                  وجه الكاميرا نحو باركودات الأصناف أو أدخلها يدوياً وسيتم تجميعها تلقائياً.
                </div>
              ) : (
                <div className="max-h-44 overflow-y-auto rounded-xl border border-slate-200 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900">
                  {batchItems.map((item) => (
                    <div
                      key={item.barcode}
                      className="p-2.5 flex items-center justify-between gap-3 text-xs hover:bg-slate-50 dark:hover:bg-slate-800/50 transition"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="font-bold text-slate-900 dark:text-slate-100 truncate">
                          {item.matchedName}
                        </div>
                        <div className="flex items-center gap-2 text-[10px] text-slate-500 font-mono mt-0.5">
                          <span>{item.barcode}</span>
                          <span>•</span>
                          <span>
                            {item.price.toLocaleString()} {currency}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => updateBatchQty(item.barcode, -1)}
                          className="w-6 h-6 rounded bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 flex items-center justify-center cursor-pointer"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="w-8 text-center font-mono font-bold text-sm text-slate-900 dark:text-white">
                          {item.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => updateBatchQty(item.barcode, 1)}
                          className="w-6 h-6 rounded bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 flex items-center justify-center cursor-pointer"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => removeBatchItem(item.barcode)}
                          className="w-6 h-6 rounded text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 flex items-center justify-center ms-1 cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-3.5 sm:p-4 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2.5 shrink-0 bg-slate-50 dark:bg-slate-900/90">
          <div className="text-xs">
            {scanMode === 'CONTINUOUS' ? (
              <div className="flex items-center gap-2 font-bold text-slate-700 dark:text-slate-300">
                <span>
                  إجمالي: <strong className="font-mono text-emerald-600">{totalBatchQuantity}</strong>
                </span>
                <span>•</span>
                <span>
                  القيمة:{' '}
                  <strong className="font-mono text-slate-900 dark:text-white">
                    {totalBatchAmount.toLocaleString()} {currency}
                  </strong>
                </span>
              </div>
            ) : (
              <span className="text-slate-500">
                {lastScannedCode
                  ? `آخر صنف ممسوح: ${lastScannedItemName}`
                  : 'وجه الكاميرا نحو الباركود أو استخدم المسح بالصورة'}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
            >
              إلغاء
            </button>

            {scanMode === 'CONTINUOUS' && (
              <button
                type="button"
                data-testid="apply-batch-scan-btn"
                disabled={batchItems.length === 0}
                onClick={handleApplyBatch}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <Check className="w-4 h-4" />
                <span>
                  {contextMode === 'POS'
                    ? 'إضافة الدفعة إلى السلة'
                    : contextMode === 'STOCK_TAKE'
                    ? 'تطبيق على محضر الجرد'
                    : 'اعتماد الأصناف الممسوحة'}
                </span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
