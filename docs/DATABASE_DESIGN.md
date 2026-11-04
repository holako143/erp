# RLM ERP — تصميم وهندسة قاعدة البيانات
## وثيقة تصميم قاعدة البيانات (DATABASE_DESIGN.md)

### 1. المبادئ الهندسية
1. **Multi-Tenancy:** كل جدول رئيسي يحتوي على `tenant_id` كـ Foreign Key وفهرس أولي.
2. **UUIDs & Serial Numbers:** استخدام معرّفات UUID للمفاتيح الأساسية لضمان عدم التعارض، مع أرقام مرجعية متسلسلة للمستندات (e.g., INV-2026-0001).
3. **Auditability:** حقول قياسية في كل الجداول: `created_at`, `updated_at`, `created_by`, `updated_by`.
4. **Soft Delete:** دعم الأرشفة للكيانات دون كسر الروابط المحاسبية والمخزنية.
5. **ACID Transactions:** ضمان ذرية العمليات المتزامنة في المبيعات والمخزون والقيود المحاسبية.

---

### 2. الكيانات والجداول الأساسية (Core Schemas)

#### A. النظام والمستأجرين (Tenants & Auth)
- `tenants` (id, name, domain, plan_id, status, max_users, max_branches, created_at)
- `companies` (id, tenant_id, legal_name, tax_number, currency, logo_url, address)
- `branches` (id, company_id, code, name, phone, email, is_active)
- `users` (id, tenant_id, email, password_hash, full_name, role_id, branch_id, is_active)
- `roles` (id, tenant_id, name, permissions_json)
- `audit_logs` (id, tenant_id, user_id, action, entity_type, entity_id, payload_before, payload_after, timestamp)

#### B. محرك الباركود والتتبع (Unique IDs & Barcodes)
- `barcode_registry` (id, tenant_id, code, format, entity_type, entity_id, is_active, created_at)
  - *Unique Index:* `(tenant_id, code)`
- `serialized_items` (id, tenant_id, product_id, serial_number, batch_number, status, warehouse_id, location_bin, current_cost, current_price, warranty_expiry)
  - *Unique Index:* `(tenant_id, serial_number)`
- `traceability_events` (id, tenant_id, serial_number, event_type, reference_doc_type, reference_doc_id, from_location, to_location, performed_by, notes, created_at)

#### C. المخزون والأصناف (Inventory & Products)
- `products` (id, tenant_id, sku, barcode, name_ar, name_en, category_id, uom, cost_price, sale_price, min_stock, max_stock, has_serials, has_batches, is_active)
- `categories` (id, tenant_id, name_ar, name_en, parent_id)
- `warehouses` (id, tenant_id, company_id, code, name, location)
- `storage_bins` (id, warehouse_id, zone, aisle, shelf, bin, code)
- `stock_levels` (id, tenant_id, product_id, warehouse_id, quantity, reserved_quantity, valuation_method)
- `stock_moves` (id, tenant_id, doc_type, doc_id, product_id, warehouse_id, qty, unit_cost, move_type, date)
- `inventory_counts` (id, tenant_id, warehouse_id, count_type, status, counted_date, approved_by)

#### D. المشتريات والموردين (Purchasing)
- `suppliers` (id, tenant_id, name, tax_number, phone, email, balance, payment_terms)
- `purchase_orders` (id, tenant_id, supplier_id, order_number, order_date, total_amount, tax_amount, status, approved_by)
- `purchase_invoices` (id, tenant_id, po_id, supplier_id, invoice_number, date, subtotal, tax, grand_total, payment_status)
- `landed_costs` (id, tenant_id, invoice_id, freight_amount, customs_amount, handling_amount, allocation_method)

#### E. المبيعات ونقاط البيع (Sales & POS)
- `customers` (id, tenant_id, name, phone, email, tax_id, loyalty_points, credit_limit, balance)
- `sales_invoices` (id, tenant_id, customer_id, branch_id, invoice_number, date, payment_method, subtotal, discount, tax, total, paid, status, cashier_id)
- `pos_shifts` (id, tenant_id, cashier_id, branch_id, start_time, end_time, starting_cash, cash_sales, card_sales, actual_closing_cash, discrepancy, status)

#### F. المحاسبة والمالية (Double-Entry Accounting)
- `chart_of_accounts` (id, tenant_id, code, name_ar, name_en, type, sub_type, parent_id, balance, currency, is_active)
- `journal_entries` (id, tenant_id, entry_number, date, description, reference_type, reference_id, is_posted, is_reversed, created_by)
- `journal_entry_lines` (id, journal_entry_id, account_id, cost_center_id, debit, credit, memo)
  - *Check Constraint:* `(debit >= 0 AND credit >= 0)`
- `cost_centers` (id, tenant_id, code, name)
- `financial_periods` (id, tenant_id, year, start_date, end_date, is_closed)

#### G. الوحدات التشغيلية (HR, Manufacturing, Projects, Assets, Fleet)
- `employees`, `payrolls`, `leave_requests`
- `fixed_assets`, `asset_depreciations`, `maintenance_tickets`
- `boms`, `production_orders`, `work_centers`
- `projects`, `project_tasks`, `timesheets`
- `fleet_vehicles`, `delivery_trips`
- `quality_inspections`
