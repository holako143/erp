/**
 * ASF Secure Licensing V2 - License Administrator CLI & Activation Key Generator
 * Standalone tool for authorized administrators to issue, inspect, and activate licenses.
 */

import readline from 'readline';
import {
  createOfficialLicenseRecord,
  ActivationServerManager,
  generateHardwareFingerprint,
  verifySignedLicenseTokenSignature,
  SystemEdition,
  HardwareTelemetry,
} from '../src/core/licensing_core/index';

// Private Key is loaded strictly from environment variable or secure external keyfile in Developer / Issuer Environment.
// Never hardcode or bundle private keys into client builds or distributed packages.
const SERVER_AUTHORITY_PRIVATE_KEY_PEM =
  process.env.ASF_AUTHORITY_PRIVATE_KEY ||
  process.env.ASF_ISSUER_KEY ||
  '';

let authority: ActivationServerManager | null = null;
if (SERVER_AUTHORITY_PRIVATE_KEY_PEM && SERVER_AUTHORITY_PRIVATE_KEY_PEM.includes('BEGIN PRIVATE KEY')) {
  authority = new ActivationServerManager(SERVER_AUTHORITY_PRIVATE_KEY_PEM);
}

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function prompt(question: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(question, (answer) => resolve(answer.trim()));
  });
}

async function main() {
  console.log('====================================================================');
  console.log('   ASF SECURE LICENSING V2 - STANDALONE LICENSE ADMINISTRATION TOOL');
  console.log('                 (برنامج إدارة وإصدار وتفعيل التراخيص)              ');
  console.log('====================================================================\n');

  while (true) {
    console.log('\nالقائمة الرئيسية:');
    console.log('1. إصدار ترخيص رسمي جديد (Issue New License Key)');
    console.log('2. محاكاة تفعيل ترخيص لجهاز (Activate License for Hardware)');
    console.log('3. التحقق من توقيع رمز ترخيص (Verify Ed25519 Token Signature)');
    console.log('4. الخروج (Exit)');

    const choice = await prompt('\nاختر رقم العملية (1-4): ');

    if (choice === '1') {
      const customerName = (await prompt('اسم المنشأة / العميل: ')) || 'العميل التجاري المعتمد';
      console.log('اختر الإصدار: 1. STANDARD  2. PROFESSIONAL  3. ENTERPRISE  4. ULTIMATE');
      const edChoice = await prompt('رقم الإصدار (افتراضي 3 - ENTERPRISE): ');
      const edition: SystemEdition =
        edChoice === '1' ? 'STANDARD' : edChoice === '2' ? 'PROFESSIONAL' : edChoice === '4' ? 'ULTIMATE' : 'ENTERPRISE';

      const durationStr = await prompt('مدة الترخيص بالأيام (مثلاً 30 أو 365 أو 36500 لمدى الحياة): ');
      const durationDays = parseInt(durationStr, 10) || 365;

      const license = createOfficialLicenseRecord({
        customerName,
        edition,
        durationDays,
        isLifetime: durationDays >= 36500,
      });

      if (authority) {
        authority.registerIssuedLicense(license);
      }

      console.log('\n================== تفاصيل الترخيص المصدر ==================');
      console.log(`معرف الترخيص الفريد (UUID): ${license.licenseUuid}`);
      console.log(`مفتاح التفعيل المعتمد (Key): ${license.licenseKey}`);
      console.log(`العميل: ${license.claims.customerName}`);
      console.log(`الإصدار: ${license.claims.edition}`);
      console.log(`تاريخ الانتهاء: ${new Date(license.claims.expiresAtEpochMs).toLocaleDateString('ar-EG')}`);
      console.log(`سياسة الأجهزة: جهاز واحد فقط (Strict Single-Device Hardware Binding)`);
      console.log('===========================================================\n');
    } else if (choice === '2') {
      if (!authority) {
        console.log('\n[تنبيه] لم يتم تهيئة مفتاح الهيئة الخاص (ASF_AUTHORITY_PRIVATE_KEY) في متغيرات البيئة.');
        continue;
      }
      const licenseUuid = await prompt('أدخل معرف الترخيص (UUID): ');
      const mb = (await prompt('اللوحة الأم (Motherboard Serial): ')) || 'MB-DELL-OPTIPLEX-5090';
      const cpu = (await prompt('المعالج (CPU Model): ')) || 'Intel Core i5-11500';
      const disk = (await prompt('القرص (Storage Serial): ')) || 'DISK-NVME-512GB';
      const sysId = (await prompt('معرف النظام (System UUID): ')) || 'SYS-UUID-PROD-001';

      const hw: HardwareTelemetry = {
        motherboardUuid: mb,
        cpuModel: cpu,
        cpuCores: 8,
        primaryDiskSerial: disk,
        systemMachineId: sysId,
        platform: process.platform,
      };

      const result = authority.activateLicenseAtomically({
        licenseUuid,
        hardware: hw,
        clientNonce: `nonce-cli-${Date.now()}`,
        clientEpochMs: Date.now(),
        clientVersion: '2.0.0',
      });

      if (result.success && result.licenseToken) {
        console.log('\n[نجاح] تم تفعيل الترخيص وربطه بهذا الجهاز بنجاح!');
        console.log('رمز التفعيل الموقع بـ Ed25519 (Base64 Encoded Token):');
        const tokenB64 = Buffer.from(JSON.stringify(result.licenseToken)).toString('base64');
        console.log(tokenB64);
      } else {
        console.log(`\n[فشل] تعذر التفعيل: ${result.errorMessage} (رمز الخطأ: ${result.errorCode})`);
      }
    } else if (choice === '3') {
      const tokenInput = await prompt('أدخل رمز الترخيص أو التوقيع بصيغة Base64: ');
      try {
        const parsed = JSON.parse(Buffer.from(tokenInput, 'base64').toString('utf8'));
        const check = verifySignedLicenseTokenSignature(parsed);
        if (check.valid) {
          console.log('\n[صحيح 100%] التوقيع الرقمي Ed25519 سليم ومعتمد من الهيئة الرسمية!');
          console.log('بيانات الترخيص:', JSON.stringify(parsed.claims, null, 2));
        } else {
          console.log(`\n[تحذير - مزور أو تالف]: ${check.reason}`);
        }
      } catch (err: any) {
        console.log('\n[خطأ]: صيغة الرمز غير صالحة:', err.message);
      }
    } else if (choice === '4') {
      console.log('شكراً لك.');
      break;
    }
  }

  rl.close();
}

if (import.meta.main || require.main === module) {
  main().catch(console.error);
}
