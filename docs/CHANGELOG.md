# سجل التغييرات الهندسية (CHANGELOG)

## [v4.3.0] - 2026-11-02 — الجولة الثانية من التدقيق الصارم ومنع الاعتماد الوهمي (Deep Cross-Module Audit)

### إصلاحات جذرية إضافية في المحاسبة، المخزون، الإعدادات، والعمليات الصناعية
- **قيد تكلفة البضاعة المباعة للجرد المستمر (`src/context/ERPContext.tsx`):**
  - ربط كل من `addSalesInvoice` (الفواتير الضريبية المباشرة) و `checkoutPOS` (نقطة البيع POS) بتوليد قيد تكلفة البضاعة المباعة آلياً (`createDeliveryNoteCOGSJournalEntry`: مدين حـ/ تكلفة المبيعات `5101` / دائن حـ/ المخزون السلعي `1104`) بالتزامن مع قيد الإيرادات والضريبة.
- **رسملة التكاليف الإضافية للشحن والجمارك Landed Cost (`src/context/ERPContext.tsx`, `src/views/PurchasingView.tsx`, `src/core/inventoryEngine.ts`):**
  - تحديث `applyLandedCostToProducts` لتوليد قيد محاسبي متوازن (`JE-LC-*`: مدين حـ/ المخزون السلعي `1104` / دائن حـ/ البنك `1102`) بقيمة الزيادة الرأسمالية في تقييم المخزون، وعرض شريط تأكيد برقم القيد في `PurchasingView.tsx`.
  - تحديث `allocateLandedCost` ليحسب `totalBaseValue` تلقائياً (`quantity * baseCost`) عند عدم تمريره صراحة.
- **الربط المحاسبي لأوامر التصنيع والمشاريع الهندسية (`src/context/ERPContext.tsx`):**
  - ربط `advanceProductionOrder` بتوليد قيد رسملة الإنتاج التام (`JE-MFG-*`: مدين حـ/ المخزون التام `1104` / دائن حـ/ تكاليف التشغيل والبنك `1102`) حسب تكلفة قائمة المواد `BOM`.
  - ربط `advanceProjectProgress` بتوليد قيد مصروفات مركز تكلفة المشروع (`JE-PRJ-*`: مدين حـ/ مصروفات المشاريع `5203` / دائن حـ/ البنك `1102`).
- **إصلاح شاشة الإعدادات واستعادة النسخ الاحتياطية (`src/views/SettingsView.tsx`, `src/context/ERPContext.tsx`):**
  - إصلاح مرجع أيقونة `Sparkles` غير المستوردة في `SettingsView.tsx` واستبدالها بـ `Layers` لمنع أي خطأ وقت التشغيل عند فتح الإعدادات.
  - توسيع `importBackupJSON` لاستعادة جميع الجداول الـ 29 عبر `applyHydratedState`.
- **الاختبارات الآلية (`src/core/erp.test.ts`):**
  - رفع عدد الاختبارات الآلية إلى **33 اختباراً شاملاً** (`33 PASSED / 0 FAILED`).

## [v4.4.0] - 2026-11-02 — الجولة الثالثة من التدقيق الصارم (AI OCR, Opening Stock Journal & SaaS Persistence)

- **المحلل الديناميكي لفواتير الموردين OCR وتحويلها لأمر شراء (`src/core/inventoryEngine.ts`, `server.ts`, `src/views/AIInsightsView.tsx`):**
  - بناء `parseStructuredVendorInvoiceText` لاستخراج اسم المورد، رقم الفاتورة، الأصناف، الضريبة، والإجمالي ديناميكياً من النص المدخل، وإضافة زر تحويل مباشر لأمر شراء فعلي (`ocr-create-po-btn`).
- **قيد الرصيد الافتتاحي للأصناف الفردية وحارس منع تكرار SKU (`src/context/ERPContext.tsx`, `src/views/InventoryView.tsx`):**
  - تحديث `addProduct` لتوليد قيد رصيد افتتاحي متوازن (`JE-OB-PRD-*`: مدين حـ/ مخزون البضاعة `1104` / دائن حـ/ رأس المال والأرصدة الافتتاحية `3101`) عند إدخال رصيد افتتاحي وتكلفة أكبر من صفر، مع منع تكرار `SKU` أو الباركود.
- **حفظ باقات المستأجرين والقطاع النشط في بوابة SaaS (`src/views/SaaSAdminView.tsx`, `src/context/ERPContext.tsx`):**
  - ربط `SaaSAdminView` بالحالة العامة `activeIndustry` وإضافة `updateTenantPlan` مع مزامنة `currentTenant` داخل `applyHydratedState` لضمان بقاء الباقة المفعلة بعد إعادة تحميل الصفحة (`page.reload()`).

## [v4.5.0] - 2026-11-03 — العضوية السيادية المخفية، النظام العالمي والعملات (YER/SAR/USD)، الكوبونات والعروض، الشبكة المحلية LAN، وفصل وتشفير التفعيل أحادي الجهاز ضد تغيير القطع وإرجاع الوقت

- **العضوية الإدارية العليا المخفية (`sysadmin` / `RLM-ROOT-9999`) (`src/context/ERPContext.tsx`, `src/views/MasterAdminControlView.tsx`, `src/components/security/LoginGate.tsx`, `src/views/SecurityCenterView.tsx`):**
  - إنشاء عضوية سيادية مخفية تماماً (`isHiddenMasterAdmin: true`, `role: 'MASTER_SYSTEM_ADMIN'`) لا تظهر في بطاقات الدخول السريع ولا في قوائم المستخدمين العادية، ويمكن الدخول إليها يدوياً أو عبر الاختصار السري (`Ctrl+Shift+M`).
  - لوحة تحكم شاملة لإخفاء/إظهار أي قسم رئيسي (`visibleModules`) أو عنصر فرعي في الواجهات (`uiElementsVisibility`)، وقفل النظام على **نشاط واحد فقط (`SINGLE_LOCKED`)** أو تعدد الأنشطة (`MULTI_SELECTABLE`).
- **النظام العالمي وتعدد العملات (`YER` / `SAR` / `USD`) (`src/core/systemConfigEngine.ts`, `src/components/layout/Navbar.tsx`, `src/views/POSView.tsx`):**
  - دعم كامل للريال اليمني (`YER - ر.ي`)، الريال السعودي (`SAR - ر.س`)، والدولار الأمريكي (`USD - $`)، واستبدال مسميات الدفع المحلية (`مدى`) بمسميات عالمية قابلة للتخصيص (`بطاقة بنكية / دفع إلكتروني POS Card`) مع نسب ضريبة مرنة (`0%`، `5%`، `15%`).
- **محرك كوبونات الخصم والعروض الترويجية (`src/core/promotionsEngine.ts`, `src/views/POSView.tsx`, `src/views/MasterAdminControlView.tsx`):**
  - بناء محرك مستقل للتحقق من الكوبونات (`validateAndCalculateCouponDiscount`) والعروض التلقائية (`evaluateAutomaticPromotionalOffers`) وربطه بشاشة الكاشير `POSView` والفواتير مع تحديث عداد الاستخدام (`usedCount`) لحظياً.
- **الدخول عبر الشبكة الداخلية LAN والاختصارات السريعة (`server.ts`, `src/App.tsx`):**
  - إضافة نقطة النهاية `/api/v1/network/info` لاكتشاف عناوين الشبكة المحلية (`IPv4 LAN URLs`) للدخول الفوري من الجوال والكمبيوتر والتابلت على نفس الشبكة مع اختصارات لوحة المفاتيح (`F1`–`F7`, `Ctrl+K`, `Ctrl+Shift+M`, `Ctrl+Shift+L`).
- **فصل نظام التفعيل وتشفير القطع الداخلية الخمس ومنع إرجاع الوقت (`src/core/securityEngine.ts`, `src/views/StandaloneActivationPortal.tsx`, `src/components/security/HardwareLockModal.tsx`):**
  - فصل مولد السريالات نهائياً عن النظام المحاسبي إلى بوابة مستقلة محمية برمز المطور (`RLM-DEV-9999`).
  - فحص كل قطعة داخلية على حدة (`verifyHardwareComponentIntegrity` للوحة الأم `MOTHERBOARD`، المعالج `CPU`، كرت الشاشة `GPU`، القرص `DISK_NVME`، ومعرف النظام `SYSTEM_UUID`) بحيث يتوقف البرنامج فوراً (`DEVICE_MISMATCH`) عند تغير أو تعطل أي قطعة.
  - إضافة حارس الزمن الرتيب (`evaluateMonotonicClockGuard`) لإقفال النظام فوراً (`CLOCK_TAMPERED`) عند محاولة إرجاع ساعة أو تاريخ الجهاز للخلف.
- **الاختبارات الآلية والتحقق الفعلي (`src/core/erp.test.ts`):**
  - رفع الاختبارات الآلية إلى **36 اختباراً شاملاً** (`36 PASSED / 0 FAILED`) مع تحقق E2E عبر متصفح Playwright الفعلي (`0 Console Errors`).
