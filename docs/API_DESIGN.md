# RLM ERP — تصميم واجهات برمجة التطبيقات (API_DESIGN.md)

### 1. معايير الـ RESTful API
- **Base URL:** `/api/v1`
- **Authentication:** `Authorization: Bearer <jwt-token>`
- **Tenant Context Header:** `X-Tenant-ID: <tenant-uuid>` (أو مأخوذ تلقائياً من JWT Claims)
- **Response Format:**
```json
{
  "success": true,
  "data": { ... },
  "message": "Operation completed successfully",
  "meta": {
    "page": 1,
    "limit": 25,
    "total": 120
  }
}
```

### 2. نقاط النهاية الأساسية (Core Endpoints)
- **Auth & Tenants:**
  - `POST /api/v1/auth/login`
  - `POST /api/v1/auth/refresh`
  - `GET /api/v1/auth/me`
  - `GET /api/v1/tenants/current`
  - `POST /api/v1/tenants/switch-branch`
- **Barcode & Traceability Engine:**
  - `POST /api/v1/barcode/generate` (format, entity_type, count)
  - `POST /api/v1/barcode/validate` (code, format)
  - `GET /api/v1/barcode/trace/:code` (Full movement history)
  - `POST /api/v1/barcode/print-labels` (template, items, printer_type)
- **Inventory & WMS:**
  - `GET /api/v1/inventory/products`
  - `POST /api/v1/inventory/products`
  - `POST /api/v1/inventory/stock-moves`
  - `POST /api/v1/inventory/transfers`
  - `POST /api/v1/inventory/adjustments`
  - `POST /api/v1/inventory/counts`
- **Purchasing:**
  - `GET /api/v1/purchasing/suppliers`
  - `POST /api/v1/purchasing/orders`
  - `POST /api/v1/purchasing/invoices`
  - `POST /api/v1/purchasing/payments`
- **Sales & POS:**
  - `GET /api/v1/sales/customers`
  - `POST /api/v1/sales/invoices`
  - `POST /api/v1/pos/shifts/open`
  - `POST /api/v1/pos/shifts/close`
  - `POST /api/v1/pos/checkout`
  - `POST /api/v1/pos/sync-offline`
- **Accounting:**
  - `GET /api/v1/accounting/chart-of-accounts`
  - `GET /api/v1/accounting/journal-entries`
  - `POST /api/v1/accounting/journal-entries` (Balanced check)
  - `POST /api/v1/accounting/journal-entries/:id/reverse`
  - `GET /api/v1/accounting/reports/trial-balance`
  - `GET /api/v1/accounting/reports/income-statement`
  - `GET /api/v1/accounting/reports/balance-sheet`
  - `GET /api/v1/accounting/reports/cash-flow`
  - `GET /api/v1/accounting/reports/vat-return`
- **AI Engine:**
  - `POST /api/v1/ai/assistant/query` (Natural Language Query)
  - `POST /api/v1/ai/forecast/stock`
  - `POST /api/v1/ai/ocr/parse-invoice`
