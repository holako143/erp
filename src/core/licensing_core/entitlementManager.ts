/**
 * ASF Secure Licensing V2 - Entitlement & Module Protection Manager
 * Enforces module access rights strictly based on cryptographically signed license tokens.
 */

import { SignedLicenseToken, SystemModuleKey } from './licensingTypes';

export const ALL_SYSTEM_MODULES: { key: SystemModuleKey; labelAr: string; labelEn: string }[] = [
  { key: 'pos', labelAr: 'نقطة البيع ونظام الكاشير', labelEn: 'Point of Sale (POS)' },
  { key: 'inventory', labelAr: 'إدارة المخزون والمستودعات', labelEn: 'Inventory & Warehousing' },
  { key: 'accounting', labelAr: 'المحاسبة العامة وشجرة الحسابات', labelEn: 'General Ledger & Accounting' },
  { key: 'repairs', labelAr: 'مركز الصيانة وتتبع الأجهزة', labelEn: 'Repairs & Service Center' },
  { key: 'ai_advisor', labelAr: 'المساعد الذكي والمستشار المالي', labelEn: 'AI Copilot & Smart Advisor' },
  { key: 'lan_sync', labelAr: 'المزامنة والربط عبر الشبكة الداخلية', labelEn: 'Local LAN High-Speed Sync' },
  { key: 'multi_branch', labelAr: 'الربط الشبكي بين الفروع وفحص المخزون', labelEn: 'Multi-Branch Network Matrix' },
  { key: 'whatsapp_sms', labelAr: 'قسم الواتساب ومودم رسائل SMS بالكيبل', labelEn: 'WhatsApp Web & Cable USB SMS' },
];

export function isModuleEntitled(
  token: SignedLicenseToken | null | undefined,
  moduleKey: SystemModuleKey
): { entitled: boolean; reason?: string } {
  if (!token || !token.claims) {
    return {
      entitled: false,
      reason: 'NO_ACTIVE_LICENSE_FOUND',
    };
  }

  const allowed = token.claims.allowedModules || [];
  if (allowed.includes(moduleKey)) {
    return { entitled: true };
  }

  return {
    entitled: false,
    reason: `Module [${moduleKey}] is not entitled under the active license edition (${token.claims.edition}).`,
  };
}
