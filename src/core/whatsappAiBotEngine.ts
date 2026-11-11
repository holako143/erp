/**
 * RLM ERP — Intelligent WhatsApp AI Bot & Full-ERP Controller Engine
 * Provides instant, context-aware ERP data retrieval (Invoices, Financial Reports,
 * Live Profits, Customer Debts, Inventory Stock/Pricing, and Warranty RMA)
 * for automated and on-demand WhatsApp conversation responses.
 */

import {
  Product,
  Customer,
  SalesInvoice,
  WarrantyMaintenanceTicket,
  JournalEntry,
} from '../types/erp';

export type BotIntentCategory =
  | 'INVOICE_LOOKUP'
  | 'FINANCIAL_REPORT'
  | 'DEBT_STATEMENT'
  | 'INVENTORY_PRICING'
  | 'WARRANTY_RMA'
  | 'FULL_SYSTEM_STATUS'
  | 'GENERAL_ASSISTANCE';

export interface ErpBotContextSnapshot {
  companyName: string;
  currencySymbol: string;
  products: Product[];
  customers: Customer[];
  salesInvoices: SalesInvoice[];
  warrantyTickets: WarrantyMaintenanceTicket[];
  journalEntries?: JournalEntry[];
}

export interface SmartBotReplyResult {
  intent: BotIntentCategory;
  replyText: string;
  attachmentType: 'NONE' | 'INVOICE' | 'RECEIPT' | 'DEBT_REMINDER' | 'WARRANTY';
  referenceNumber?: string;
  executedActionLabelAr: string;
}

/**
 * Detects the primary ERP intent from an incoming customer/manager WhatsApp message.
 */
export function classifyWhatsAppBotIntent(messageText: string): BotIntentCategory {
  const normalized = (messageText || '').trim().toLowerCase();

  if (
    /فاتور|فواتير|inv-|invoice|مشترياتي|طلبية/.test(normalized)
  ) {
    return 'INVOICE_LOOKUP';
  }

  if (
    /تقرير|تقارير|ارباح|أرباح|ربح|مبيعات اليوم|ملخص مالي|السيولة|الصندوق|البنك|الميزانية|الدخل|report|profit/.test(
      normalized
    )
  ) {
    return 'FINANCIAL_REPORT';
  }

  if (
    /مديوني|مديونيات|رصيد|ذمم|حسابي|كشف حساب|مطالب|سداد|كم علي|كم باقي|debt|balance/.test(
      normalized
    )
  ) {
    return 'DEBT_STATEMENT';
  }

  if (
    /ضمان|صيان|تذكر|عطل|rma|سيريال|serial|تصليح/.test(normalized)
  ) {
    return 'WARRANTY_RMA';
  }

  if (
    /سعر|أسعار|اسعار|كم سعر|لوح|ألواح|الواح|انفرتر|إنفرتر|بطاري|شاش|مخزون|متوفر|كمية|عرض سعر|جرد|بضاع|stock|price/.test(
      normalized
    )
  ) {
    return 'INVENTORY_PRICING';
  }

  if (
    /حالة النظام|كل التقارير|ملخص شامل|تحكم|جميع التفاصيل|كل شيء/.test(normalized)
  ) {
    return 'FULL_SYSTEM_STATUS';
  }

  return 'GENERAL_ASSISTANCE';
}

function fmtNum(n: number): string {
  return Number(n || 0).toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}

/**
 * Generates an immediate, accurate ERP-backed response with live numbers, invoices,
 * profits, inventory, and customer balances.
 */
export function generateSmartErpBotResponse(params: {
  incomingText: string;
  contactName: string;
  contactPhone: string;
  erpSnapshot: ErpBotContextSnapshot;
  forcedIntent?: BotIntentCategory;
}): SmartBotReplyResult {
  const { incomingText, contactName, contactPhone, erpSnapshot, forcedIntent } = params;
  const intent = forcedIntent || classifyWhatsAppBotIntent(incomingText);
  const sym = erpSnapshot.currencySymbol || 'ر.س';
  const company = erpSnapshot.companyName || 'شركة النور للتجارة والطاقة';

  const cleanContactPhone = (contactPhone || '').replace(/\D/g, '').slice(-9);
  const matchedCustomer = erpSnapshot.customers.find((c) => {
    const cPhone = (c.phone || '').replace(/\D/g, '').slice(-9);
    return (
      (cleanContactPhone && cPhone && cPhone === cleanContactPhone) ||
      (contactName &&
        (c.nameAr?.includes(contactName) ||
          c.name?.toLowerCase().includes(contactName.toLowerCase())))
    );
  });

  // Compute live financial aggregates
  const totalSalesRevenue = erpSnapshot.salesInvoices.reduce(
    (sum, inv) => sum + (Number(inv.grandTotal) || 0),
    0
  );
  const totalCollected = erpSnapshot.salesInvoices.reduce(
    (sum, inv) => sum + (Number(inv.paidAmount) || 0),
    0
  );
  const totalCogs = erpSnapshot.salesInvoices.reduce((sum, inv) => {
    const invCost = (inv.items || []).reduce((iSum, item) => {
      const prod = erpSnapshot.products.find((p) => p.id === item.productId);
      const unitCost = prod ? Number(prod.costPrice) || 0 : Number(item.unitPrice) * 0.72;
      return iSum + unitCost * (Number(item.quantity) || 1);
    }, 0);
    return sum + invCost;
  }, 0);
  const grossProfit = Math.max(0, totalSalesRevenue - totalCogs);
  const totalReceivables = erpSnapshot.customers.reduce(
    (sum, c) => sum + Math.max(0, Number(c.balance) || 0),
    0
  );
  const lowStockItems = erpSnapshot.products.filter(
    (p) => Number(p.stockQty) <= Number(p.reorderPoint || p.minStock || 15)
  );

  if (intent === 'INVOICE_LOOKUP') {
    // Check if a specific invoice number is mentioned
    const invMatch = incomingText.match(/INV-[\w-]+/i);
    const targetInv =
      (invMatch
        ? erpSnapshot.salesInvoices.find(
            (i) => i.invoiceNumber.toLowerCase() === invMatch[0].toLowerCase()
          )
        : null) ||
      erpSnapshot.salesInvoices.find(
        (i) =>
          (matchedCustomer && i.customerId === matchedCustomer.id) ||
          (contactName && i.customerName.includes(contactName))
      ) ||
      erpSnapshot.salesInvoices[0];

    if (targetInv) {
      const remaining = Math.max(0, Number(targetInv.grandTotal) - Number(targetInv.paidAmount));
      const itemsSummary = (targetInv.items || [])
        .map(
          (it, idx) =>
            `${idx + 1}. ${it.productName} × ${it.quantity} = ${fmtNum(it.total)} ${sym}`
        )
        .join('\n');

      return {
        intent: 'INVOICE_LOOKUP',
        attachmentType: 'INVOICE',
        referenceNumber: targetInv.invoiceNumber,
        executedActionLabelAr: `جلب وإرسال الفاتورة (${targetInv.invoiceNumber}) تلقائياً`,
        replyText:
          `🤖 *الرد الآلي الذكي — ${company}*\n` +
          `مرحباً *${contactName}*، تم استخراج بيانات الفاتورة لحظياً من النظام:\n\n` +
          `📄 *رقم الفاتورة:* ${targetInv.invoiceNumber}\n` +
          `👤 *العميل:* ${targetInv.customerName}\n` +
          `📅 *التاريخ:* ${targetInv.date}\n` +
          `📦 *الأصناف:*\n${itemsSummary || 'أصناف طاقة شمسية وإلكترونيات معتمدة'}\n` +
          `━━━━━━━━━━━━━━\n` +
          `💰 *الإجمالي الشامل للضريبة:* ${fmtNum(targetInv.grandTotal)} ${sym}\n` +
          `✅ *المبلغ المسدد:* ${fmtNum(targetInv.paidAmount)} ${sym}\n` +
          `📌 *المتبقي:* ${fmtNum(remaining)} ${sym} (${
            remaining === 0 ? 'مسددة بالكامل ✓' : 'آجل / جزئي'
          })`,
      };
    }
  }

  if (intent === 'FINANCIAL_REPORT' || intent === 'FULL_SYSTEM_STATUS') {
    const topInvoicesText = erpSnapshot.salesInvoices
      .slice(0, 3)
      .map((i) => `• ${i.invoiceNumber} (${i.customerName}): ${fmtNum(i.grandTotal)} ${sym}`)
      .join('\n');

    return {
      intent,
      attachmentType: 'NONE',
      referenceNumber: `REP-AI-${new Date().toISOString().slice(0, 10)}`,
      executedActionLabelAr: 'توليد التقرير المالي وتقرير الأرباح والمبيعات اللحظي',
      replyText:
        `🤖 *تقرير الروبوت المالي والتشغيلي اللحظي — ${company}*\n` +
        `تم جلب المؤشرات الحية من قاعدة بيانات النظام مباشرة:\n\n` +
        `📈 *إجمالي المبيعات والفواتير (${erpSnapshot.salesInvoices.length} فاتورة):* ${fmtNum(totalSalesRevenue)} ${sym}\n` +
        `💎 *صافي الربح التشغيلي المحقق:* ${fmtNum(grossProfit)} ${sym} (هامش ${
          totalSalesRevenue > 0 ? Math.round((grossProfit / totalSalesRevenue) * 100) : 0
        }%)\n` +
        `💵 *التحصيل النقدي الفعلي:* ${fmtNum(totalCollected)} ${sym}\n` +
        `💳 *إجمالي المديونيات والذمم المدينة:* ${fmtNum(totalReceivables)} ${sym}\n` +
        `📦 *حالة المخزون:* ${erpSnapshot.products.length} صنف نشط (${lowStockItems.length} أصناف قرب حد إعادة الطلب)\n` +
        `🔧 *تذاكر الضمان والصيانة (RMA):* ${erpSnapshot.warrantyTickets.length} تذاكر\n` +
        `━━━━━━━━━━━━━━\n` +
        `🧾 *أحدث الفواتير المسجلة:*\n${topInvoicesText}`,
    };
  }

  if (intent === 'DEBT_STATEMENT') {
    const targetCustomer = matchedCustomer || erpSnapshot.customers[0];
    if (targetCustomer) {
      const custInvoices = erpSnapshot.salesInvoices.filter(
        (i) => i.customerId === targetCustomer.id || i.customerName === targetCustomer.nameAr
      );
      return {
        intent: 'DEBT_STATEMENT',
        attachmentType: 'DEBT_REMINDER',
        referenceNumber: `SOA-${targetCustomer.id.slice(-4).toUpperCase()}`,
        executedActionLabelAr: `إصدار كشف حساب ومديونية (${targetCustomer.nameAr})`,
        replyText:
          `🤖 *كشف الحساب والمديونية اللحظي — ${company}*\n` +
          `السادة / *${targetCustomer.nameAr}* المحترمين،\n\n` +
          `📊 *الرصيد القائم المستحق حالياً:* ${fmtNum(targetCustomer.balance)} ${sym}\n` +
          `🛡️ *السقف الائتماني المعتمد:* ${fmtNum(targetCustomer.creditLimit)} ${sym}\n` +
          `🧾 *عدد الفواتير المرتبطة بالحساب:* ${custInvoices.length} فاتورة\n` +
          `━━━━━━━━━━━━━━\n` +
          `لإصدار سند قبض إلكتروني أو جدولة السداد، يرجى الرد بتأكيد التحويل وسيقوم النظام بترحيل القيد المحاسبي فوراً.`,
      };
    }
  }

  if (intent === 'WARRANTY_RMA') {
    const rma =
      erpSnapshot.warrantyTickets.find(
        (t) =>
          (contactName && t.customerName.includes(contactName)) ||
          incomingText.toUpperCase().includes(t.ticketNumber.toUpperCase())
      ) || erpSnapshot.warrantyTickets[0];

    if (rma) {
      return {
        intent: 'WARRANTY_RMA',
        attachmentType: 'WARRANTY',
        referenceNumber: rma.ticketNumber,
        executedActionLabelAr: `فحص تذكرة الضمان والصيانة (${rma.ticketNumber})`,
        replyText:
          `🤖 *تقرير مركز الصيانة والضمان الآلي — ${company}*\n` +
          `تم فحص حالة الضمان والرقم التسلسلي في النظام:\n\n` +
          `🔖 *رقم التذكرة:* ${rma.ticketNumber}\n` +
          `🔌 *الجهاز:* ${rma.productName}\n` +
          `🔢 *الرقم التسلسلي (S/N):* ${rma.serialNumber}\n` +
          `🛡️ *حالة الضمان:* ${rma.isUnderWarranty ? 'ساري تحت الضمان المعتمد ✓' : 'خارج فترة الضمان'}\n` +
          `📋 *التقرير الفني:* ${rma.technicianReport}\n` +
          `💵 *الرسوم المستحقة:* ${fmtNum(rma.totalCustomerCharge)} ${sym}`,
      };
    }
  }

  if (intent === 'INVENTORY_PRICING') {
    const topProducts = erpSnapshot.products
      .slice(0, 5)
      .map(
        (p) =>
          `• *${p.nameAr}* (${p.sku}): السعر *${fmtNum(p.salePrice)} ${sym}* | المتوفر: *${p.stockQty} ${p.uom}*`
      )
      .join('\n');

    return {
      intent: 'INVENTORY_PRICING',
      attachmentType: 'NONE',
      referenceNumber: 'CAT-LIVE-PRICES',
      executedActionLabelAr: 'جلب قائمة الأسعار والكميات المتوفرة في المستودع',
      replyText:
        `🤖 *الرد الآلي الفوري للمخزون والأسعار — ${company}*\n` +
        `أهلاً بك *${contactName}*، إليك الأسعار والكميات المتوفرة لحظياً في المستودع:\n\n` +
        `${topProducts}\n` +
        `━━━━━━━━━━━━━━\n` +
        `✨ جميع الأصناف مشمولة بالضمان الإلكتروني عبر السيريال. أرسل اسم الصنف والكمية المطلوبة لإصدار فاتورتك فوراً!`,
    };
  }

  // Default intelligent ERP assistant reply with live awareness
  return {
    intent: 'GENERAL_ASSISTANCE',
    attachmentType: 'NONE',
    executedActionLabelAr: 'رد ذكي فوري متصل بقاعدة بيانات النظام',
    replyText:
      `🤖 *المساعد الذكي المتصل بنظام ${company}*\n` +
      `أهلاً بك *${contactName}*! أنا الروبوت الذكي المتصل مباشرة بقاعدة بيانات النظام.\n\n` +
      `📌 *ملخص حسابك والنظام اللحظي:*\n` +
      `• الرصيد المسجل: *${fmtNum(matchedCustomer?.balance || 0)} ${sym}*\n` +
      `• إجمالي الأصناف المتوفرة بالمستودع: *${erpSnapshot.products.length} صنف*\n` +
      `• الفواتير المعتمدة بالنظام: *${erpSnapshot.salesInvoices.length} فاتورة* بإجمالي *${fmtNum(totalSalesRevenue)} ${sym}*\n\n` +
      `يمكنك طلب: *"أرسل فاتورتي"*، *"كشف حسابي"*، *"تقرير الأرباح والمبيعات"*، أو *"أسعار الألواح والإنفرترات"* وسأقوم بإرسالها لك في الحال!`,
  };
}
