# بروتوكول التفعيل والتواصل لنظام ASF Secure Licensing V2
## LICENSE_PROTOCOL.md

**المعيار:** Cryptographic Challenge-Response & One-Time Atomic Activation Protocol
**تاريخ الوثيقة:** 2025-11-04

---

## 1. بروتوكول التفعيل لمرة واحدة (One-Time Activation Flow)

```
[ العميل / واجهة التفعيل المكتبي ]                     [ خادم التراخيص / Backend Engine ]
             |                                                         |
             | ----- 1. إنشاء رمز طلب الجهاز (Request Token) --------> |
             |    - Hardware Fingerprint (Motherboard, CPU, Disk)      |
             |    - Client Nonce (قيمة عشوائية 128-بت)                 |
             |    - Client App Version & Timestamp                     |
             |                                                         |
             | <---- 2. تقديم مفتاح الترخيص الفريد (License Key) ------ |
             |                                                         |
             | ----- 3. إرسال طلب التفعيل الأولي (Activation Req) ----> |
             |    - License Key (UUID / Code)                          |
             |    - Composite HWID Hash                                |
             |    - Signed Challenge / Nonce                           |
             |                                                         |
             |                                        [ فحص ذري Atomic Transaction ]
             |                                        1. التحقق من حالة الترخيص: ISSUED؟
             |                                        2. هل سبق تفعيله؟ (Already Activated?)
             |                                        3. إذا تم مسبقاً -> رفض فوري برمز خطأ.
             |                                        4. إذا صالح -> ربط HWID وتحويله لـ ACTIVATED
             |                                        5. توقيع رمز الترخيص بـ Ed25519
             |                                                         |
             | <---- 4. تسليم حزمة التفعيل الموقعة (Signed Payload) -- |
             |    - Signed License Token (Ed25519)                     |
             |    - Bound HWID + Allowed Modules                       |
             |    - Expiration Epoch + Grace Period                    |
             |    - Server Time Proof (موقع رقمياً)                    |
             v                                                         v
```

---

## 2. بروتوكول التحقق الدوري (Periodic Verification & Offline Mode)

1. **الوضع المتصل (Online / LAN Verification):**
   - العميل يرسل طلب نبضات قلب دوري (Heartbeat Challenge).
   - الخادم يرسل تحديثاً موثقاً بحالة الترخيص والوقت المعتمد ومصفوفة الصلاحيات وقائمة الإلغاء (Revocation List).
   - يتم تحديث `lastTrustedEpochMs` و `serverSyncToken`.

2. **الوضع المعزول بدون اتصال (Offline Mode & Grace Period):**
   - العميل يتحقق محلياً باستخدام `Ed25519 Public Key`.
   - يتم مطابقة البصمة العتادية مع الجهاز الفعلي ومقارنة الساعة مع `lastTrustedEpochMs`.
   - يتم احتساب فترة السماح للعمل بدون اتصال (`offlineGraceDays` - افتراضياً 14 يوماً قابلة للضبط).
   - إذا تجاوزت المدة المعزولة فترة السماح، يُطلب من المستخدم الاتصال بالشبكة لتجديد الإثبات الزمني.
