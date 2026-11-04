# التصميم المعماري لنظام الترخيص والحماية المتقدم ASF Secure Licensing V2
## LICENSE_ARCHITECTURE.md

**الإصدار:** 2.0.0-ENTERPRISE
**المعيار الأمني:** High-Assurance Commercial Licensing & Tamper Resistance
**تاريخ الاعتماد:** 2025-11-04

---

## 1. الرؤية المعمارية وحدود الثقة (Architecture & Trust Boundaries)

تم تصميم معمارية `ASF Secure Licensing V2` لفصل مسؤوليات التوقيع والإصدار عن مسؤوليات التحقق، مع القضاء التام على وجود أي مفتاح خاص (Private Key) داخل برنامج العميل أو كود الواجهة الأمامية أو مستودع Git.

### 1.1 مكونات المعمارية التسعة المستقلة (Under `src/core/licensing_core/`)

```
+-----------------------------------------------------------------------------------+
|                        ASF SECURE LICENSING V2 ARCHITECTURE                       |
+-----------------------------------------------------------------------------------+
|                                                                                   |
|  [ 1. License Issuer (Secure Env) ]               [ 2. Activation Manager ]       |
|  - Ed25519 Private Key (Isolated)                 - One-Time Atomic Activation    |
|  - Signs License Claims & Entitlements            - Replay Prevention (Nonce/Hash)|
|  - Issues Encrypted Activation Tokens             - Concurrency & Race-Guard Lock |
|                            \                     /                                |
|                             v                   v                                 |
|                       +-------------------------------+                           |
|                       |   Central Licensing DB Engine |                           |
|                       |   (Licenses, Devices, Events) |                           |
|                       +-------------------------------+                           |
|                                       ^                                           |
|                                       | (TLS / Local IPC)                         |
|  [ 3. License Verification Engine ]   |   [ 4. Hardware Fingerprint Engine ]      |
|  - Public Key (Ed25519) Only          |   - Composite Weighted Silicon Digest     |
|  - Cryptographic Signature Verify     |   - Motherboard, CPU, Storage, System     |
|  - Module Entitlement Check           |   - Critical vs Non-Critical Tolerances   |
|                                       |                                           |
|  [ 5. Time Integrity Engine ]         |   [ 6. License State Manager ]            |
|  - Monotonic Clock & Server Proofs    |   - State Machine: ISSUED -> ACTIVATED    |
|  - Anti-Rollback Secure Registry      |   - EXPIRED, SUSPENDED, REVOKED, MISMATCH |
|                                       |                                           |
|  [ 7. Entitlement Manager ]           |   [ 8. License Audit Logger ]             |
|  - POS, Inventory, Accounts, Comms    |   - Tamper-Proof Audit Trail              |
|  - Backend Middleware Enforcement     |   - High-Severity Security Alerts         |
|                                                                                   |
|  [ 9. License Administration (Portal & Desktop Installer / Launcher Engine) ]     |
|  - Standalone Activation Tool, Key Generator for authorized license managers     |
|  - Desktop Automated Installer & Multi-Node LAN Sync Gateway                      |
+-----------------------------------------------------------------------------------+
```

### 1.2 حدود الثقة (Trust Boundaries)
1. **بيئة الإصدار (License Issuer - Level 0 - Trusted Core):**
   - تحتفظ بالمفتاح الخاص `Ed25519 Private Key`.
   - لا تتواجد في حزم العميل ولا في متصفح المستخدم النهائي.
   - تقوم بإنشاء وتوقيع حمولات التراخيص (`SignedLicenseToken`).

2. **بيئة خادم التفعيل والشبكة المحلية (Activation & ERP Server - Level 1 - Protected Boundary):**
   - يعمل على جهاز الخادم المحلي أو عبر الإنترنت مع قاعدة بيانات محلية آمنة ومحمية من السباق (Atomic Transactions).
   - يحافظ على جدول الحالات المعتمدة، وسجل الأجهزة، ومفاتيح التفعيل المستهلكة (Single-Use Tokens).

3. **بيئة العميل والواجهة الأمامية (Client App & Desktop UI - Level 2 - Untrusted Perimeter):**
   - تحتوي فقط على `Ed25519 Public Key` للتحقق الحسابي من سلامة التوقيع.
   - تجمع البصمة العتادية وترسلها مشفرة.
   - لا تملك القدرة على تغيير مدة الاشتراك أو تغيير الوحدات أو تزوير التوقيع.

4. **حماية مسارات الخادم (Backend API Enforcement - Strict Gateway):**
   - التحقق من حالة الترخيص والوقت الموثوق قبل تنفيذ أي عملية مالية أو تجارية (إنشاء فاتورة، ترحيل قيد، تعديل مخزون، إرسال رسائل).

---

## 2. بروتوكول التشفير والتوقيع المعتمد (Cryptographic Suite)

- **التوقيع الرقمي:** `Ed25519` (RFC 8032) - سرعة فائقة، أمان متقدم ضد القنوات الجانبية، طول مفتاح 32 بايت، وتوقيع 64 بايت.
- **تجزئة البيانات والربط:** `SHA-256` للمعرفات وسجلات التدقيق وقيم الـ Nonce.
- **حماية السرية والتشفير المحلي:** `AES-256-GCM` مع IV عشوائي للمعلومات الحساسة وبيانات التثبيت المحلية.
- **تأكيد هوية المستخدمين والمشرفين:** `Argon2id` لكلمات المرور الحساسة.
- **توليد العشوائية:** `crypto.getRandomValues` / Node.js `crypto.randomBytes` الموثقة أمنياً (Cryptographically Secure Pseudo-Random Number Generator).

---

## 3. آلة الحالات المنضبطة للترخيص (License State Machine)

```
       [ ISSUED ]
           |
   (Initial Activation)
           v
    [ ACTIVATED ] <--------------------+ (Approved Hardware Renewal)
      |    |    |                      |
      |    |    +---> [ HARDWARE_MISMATCH ]
      |    |
      |    +--------> [ TIME_TAMPERING_DETECTED ]
      v
 [ EXPIRED ] ---------> [ REVOKED / SUSPENDED ]
```

- **قواعد الانتقال:**
  - الانتقال من `ISSUED` إلى `ACTIVATED` يتم مرة واحدة فقط ذرية (Atomic Transaction).
  - لا يمكن الرجوع من `EXPIRED` إلا بتجديد رسمي موقّع برقم تسلسلي جديد.
  - أي تعديل في توقيع الترخيص أو انتهاء التوقيع يضع النظام فوراً في حالة قفل آمن `TAMPERED_LOCK`.
