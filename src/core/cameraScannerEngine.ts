/**
 * Haseb Enterprise ERP — Smart Camera & Barcode Scanner Engine
 * Pure helpers for cross-device camera constraint fallback chains,
 * mobile LAN secure-context diagnostics, and error translation.
 */

export interface CameraDeviceOption {
  id: string;
  label: string;
}

export interface CameraAttemptStep {
  mode: 'DEVICE_ID' | 'FACING_ENV' | 'FACING_USER' | 'GENERIC_VIDEO';
  labelAr: string;
  /** Target passed to Html5Qrcode.start(cameraIdOrConfig, ...) */
  qrTarget: string | MediaTrackConstraints;
  /** Native getUserMedia stream constraints for Video/BarcodeDetector fallback */
  gumConstraints: MediaStreamConstraints;
  /** Only set strict aspectRatio on the primary attempt so Android sensors never throw OverconstrainedError */
  strictAspectRatio: boolean;
}

/**
 * Checks whether the current browser execution environment permits camera capture
 * (`https://`, `http://localhost`, `http://127.0.0.1`, or explicitly whitelisted Chrome flags).
 */
export function isSecureCameraContext(locationObj?: {
  isSecureContext?: boolean;
  protocol?: string;
  hostname?: string;
}): boolean {
  if (!locationObj) return false;
  if (locationObj.isSecureContext === true) return true;
  const proto = (locationObj.protocol || '').toLowerCase();
  const host = (locationObj.hostname || '').toLowerCase();
  if (proto === 'https:') return true;
  if (host === 'localhost' || host === '127.0.0.1' || host === '::1' || host === '[::1]') {
    return true;
  }
  return false;
}

/**
 * Builds an ordered fallback sequence of camera constraints so scanning succeeds
 * across desktop webcams, iOS Safari, and Android Chrome rear/front lenses without
 * failing on rigid deviceId or aspectRatio constraints.
 */
export function buildCameraAttemptSequence(
  cameras: CameraDeviceOption[],
  preferredId?: string | null
): CameraAttemptStep[] {
  const steps: CameraAttemptStep[] = [];
  const trimmedPreferred = (preferredId || '').trim();
  const matchedPreferred = trimmedPreferred
    ? cameras.find((c) => c.id === trimmedPreferred)
    : undefined;

  if (matchedPreferred) {
    steps.push({
      mode: 'DEVICE_ID',
      labelAr: matchedPreferred.label || 'الكاميرا المحددة',
      qrTarget: matchedPreferred.id,
      gumConstraints: { video: { deviceId: { exact: matchedPreferred.id } }, audio: false },
      strictAspectRatio: false,
    });
  } else if (cameras.length > 0 && !trimmedPreferred) {
    // Prefer back/environment camera by label if present
    const backCam = cameras.find((c) => /back|rear|environment|خلف/i.test(c.label));
    if (backCam) {
      steps.push({
        mode: 'DEVICE_ID',
        labelAr: backCam.label || 'الكاميرا الخلفية',
        qrTarget: backCam.id,
        gumConstraints: { video: { deviceId: { ideal: backCam.id } }, audio: false },
        strictAspectRatio: false,
      });
    }
  }

  steps.push({
    mode: 'FACING_ENV',
    labelAr: 'الكاميرا الخلفية (تلقائي)',
    qrTarget: { facingMode: 'environment' },
    gumConstraints: {
      video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } },
      audio: false,
    },
    strictAspectRatio: false,
  });

  steps.push({
    mode: 'FACING_USER',
    labelAr: 'الكاميرا الأمامية / الويب كام',
    qrTarget: { facingMode: 'user' },
    gumConstraints: { video: { facingMode: { ideal: 'user' } }, audio: false },
    strictAspectRatio: false,
  });

  steps.push({
    mode: 'GENERIC_VIDEO',
    labelAr: 'تشغيل أي كاميرا متاحة',
    qrTarget: { facingMode: 'environment' },
    gumConstraints: { video: true, audio: false },
    strictAspectRatio: false,
  });

  return steps;
}

export interface CameraErrorInfo {
  kind: 'INSECURE_CONTEXT' | 'PERMISSION_DENIED' | 'NOT_FOUND' | 'BUSY' | 'CONSTRAINT' | 'UNKNOWN';
  titleAr: string;
  messageAr: string;
}

/**
 * Translates raw DOMException / Html5Qrcode errors into actionable Arabic guidance.
 */
export function mapCameraErrorToArabicMessage(
  err: unknown,
  secureContext: boolean
): CameraErrorInfo {
  const rawName = (err as any)?.name ? String((err as any).name) : '';
  const rawMsg = (err as any)?.message ? String((err as any).message) : String(err || '');
  const combined = `${rawName} ${rawMsg}`.toLowerCase();

  if (!secureContext || combined.includes('mediadevices') || combined.includes('secure context')) {
    return {
      kind: 'INSECURE_CONTEXT',
      titleAr: 'المتصفح يحجب الكاميرا على روابط الشبكة غير المشفرة (HTTP)',
      messageAr:
        'تمنع متصفحات الجوال والكمبيوتر فتح الكاميرا عبر http:// في الشبكة المحلية حتى بعد منح الصلاحية. افتح الرابط المشفر HTTPS أدناه بضغطة واحدة لتعمل الكاميرا والإشعارات فوراً.',
    };
  }

  if (combined.includes('notallowed') || combined.includes('permission') || combined.includes('denied')) {
    return {
      kind: 'PERMISSION_DENIED',
      titleAr: 'تم رفض صلاحية الكاميرا من المتصفح',
      messageAr:
        'اسمح بالوصول للكاميرا من أيقونة القفل بجانب شريط العنوان ثم اضغط "إعادة تشغيل الكاميرا"، أو استخدم التقاط صورة الباركود أدناه.',
    };
  }

  if (combined.includes('notreadable') || combined.includes('in use') || combined.includes('busy')) {
    return {
      kind: 'BUSY',
      titleAr: 'الكاميرا مستخدمة من تطبيق أو تبويب آخر',
      messageAr:
        'أغلق أي تطبيق آخر يستخدم الكاميرا ثم اضغط "إعادة المحاولة".',
    };
  }

  if (combined.includes('overconstrained') || combined.includes('constraint')) {
    return {
      kind: 'CONSTRAINT',
      titleAr: 'دقة الكاميرا المطلوبة غير متوافقة مع العدسة',
      messageAr:
        'اضغط "إعادة المحاولة" لاختيار الدقة التلقائية المتوافقة مع الجهاز أو استخدم الكاميرا البديلة.',
    };
  }

  if (combined.includes('notfound') || combined.includes('no camera') || combined.includes('device not found')) {
    return {
      kind: 'NOT_FOUND',
      titleAr: 'لم يتم العثور على عدسة كاميرا متصلة',
      messageAr:
        'تأكد من توصيل الكاميرا أو فعّلها في إعدادات الجهاز، ويمكنك أيضاً مسح الباركود برفع صورة أو عبر الماسح الليزري.',
    };
  }

  return {
    kind: 'UNKNOWN',
    titleAr: 'تعذر بدء بث الكاميرا المباشر',
    messageAr:
      rawMsg
        ? `حدث عائق أثناء تشغيل الكاميرا (${rawMsg.slice(0, 90)}). يمكنك استخدام زر التقاط صورة الباركود أو فتح رابط HTTPS للشبكة.`
        : 'تعذر تهيئة الكاميرا. يمكنك المحاولة مجدداً أو التقاط صورة مباشرة للباركود.',
  };
}

/**
 * Picks the best HTTPS URL for LAN camera access from `/api/v1/network/info`.
 */
export function resolvePreferredLanCameraUrl(
  networkInfo: {
    primaryLanHttpsUrl?: string | null;
    lanHttpsAddresses?: Array<{ httpsUrl?: string | null }>;
  } | null
): string | null {
  if (!networkInfo) return null;
  if (networkInfo.primaryLanHttpsUrl && networkInfo.primaryLanHttpsUrl.startsWith('https://')) {
    return networkInfo.primaryLanHttpsUrl;
  }
  const firstFromList = networkInfo.lanHttpsAddresses?.find((a) =>
    a.httpsUrl?.startsWith('https://')
  )?.httpsUrl;
  return firstFromList || null;
}
