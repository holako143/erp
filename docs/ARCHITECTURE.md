# RLM ERP — المعمارية الهندسية للنظام
## وثيقة التصميم المعماري (ARCHITECTURE.md)

### 1. النمط المعماري العام (Modular Monolith)
اعتمدنا معمارية **Modular Monolith** عالية التنظيم والتدرج. يتم تجميع جميع الوحدات الوظيفية داخل نظام متماسك وموحد هندسياً، مع عزل كل وحدة داخل مجلد خاص بها بحدود واضحة تفصل بين:
- نماذج البيانات والأنواع (Types & Interfaces)
- طبقة منطق الأعمال والخدمات (Services & Business Logic)
- العمليات الحسابية والتحقق (Validators & Calculators)
- واجهات المستخدم والمكونات التفاعلية (Views & UI Components)

هذا النموذج يمنح أقصى سرعة تنفيذ، صفر هدر في زمن استجابة الشبكة الداخلي، وسهولة تامة في استخراج أي وحدة إلى Microservice مستقلة مستقبلاً عند الحاجة.

---

### 2. تدفق البيانات وعزل المستأجرين (Tenant Isolation Model)
```
[Client App (Web / POS / Mobile / Scanner)]
                  │
                  ▼
         [Security & RBAC Layer]
                  │
        [Tenant Context Provider]
   (tenant_id, company_id, branch_id)
                  │
                  ▼
   [Business Logic & Service Layer]
   ├── Barcode & Traceability Engine
   ├── Double-Entry Accounting Engine
   ├── Inventory & WMS Engine
   ├── Sales & POS Register
   └── AI & Analytics Insights
                  │
                  ▼
     [Data Store & Transactions]
 (PostgreSQL Schema / Indexed Persistent Store)
```

كل عملية استعلام أو كتابة في النظام محكومة بـ `tenant_id` إجباري. لا يمكن لأي مستخدم الوصول إلى أي سجل لا يتبع للمستأجر الخاص به.

---

### 3. محرك الباركود والتتبع (Barcode & Traceability Architecture)
- **Check-digit Validation:** خوارزميات حساب خانة التحقق المعتمدة لمعايير EAN-13 وEAN-8 وفق معايير GS1 الدولية.
- **Code 128 Mode B Encoding:** توليد تسلسلات Code 128 بدقة عالية مع Checksum حسابي.
- **Deterministic Collision Prevention:** منع تكرار أي رمز باركود أو رقم تسلسلي على مستوى المستأجر من خلال قيد فريد (Unique Constraint).
- **Audit Traceability Log:** كل عملية توليد، طباعة، مسح، حركة مخزنية، أو بيع لقطعة تحمل رقماً تسلسلياً تُسجل في جدول زمني غير قابل للتعديل (Append-Only Event Store).

---

### 4. المحرك المالي والمحاسبي (Double-Entry Engine Architecture)
- **قيد التوازن الإجباري:**
  $$\sum \text{Debits} = \sum \text{Credits}$$
- يتم رفض أي قيد غير متوازن برمجياً قبل ترحيله.
- القيود المرحلة (Posted) **غير قابلة للتعديل أو الحذف المباشر** منعاً للفساد المالي والتهرب المحاسبي.
- التصحيح يتم حصراً عبر "قيد عكسي" (Reversing Entry) مع توثيق سبب العكس ومعرف القيد الأصلي.
- القيود الآلية (Automatic Journals) تُنشأ تلقائياً عند اعتماد فواتير المبيعات، فواتير الشراء، وصرف/استلام المخزون.
