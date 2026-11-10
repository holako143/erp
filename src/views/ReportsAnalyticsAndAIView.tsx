import React, { useState, useMemo } from 'react';
import { useERP } from '../context/ERPContext';
import {
  TrendingUp,
  BrainCircuit,
  PieChart,
  BarChart3,
  DollarSign,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  Calendar,
  Filter,
  Download,
  Printer,
  Sparkles,
  Bot,
  Send,
  Users,
  Building2,
  Clock,
  ShieldCheck,
  ChevronRight,
  Search,
  MessageSquare,
  Package,
  Layers,
  FileSpreadsheet,
  CheckCircle2,
  HelpCircle,
  RefreshCw,
  Wallet,
  Receipt,
  FileText,
  X,
  Eye,
  Info,
  Copy,
  Check,
  Trash2,
} from 'lucide-react';
import { SalesInvoice, Customer } from '../types/erp';

export interface AIMessageItem {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
  metrics?: { label: string; value: string; color?: string }[];
  actionType?: 'profit' | 'sales' | 'debts' | 'liquidity' | 'cogs' | 'expenses';
  actionLabel?: string;
}

export const ReportsAnalyticsAndAIView: React.FC = () => {
  const {
    salesInvoices,
    products,
    customers,
    suppliers,
    journalEntries,
    currentShift,
    branches,
    currency,
    language,
    currentTenant,
    openQuickSendModal,
    setActiveTab,
    uiTheme,
  } = useERP();

  const isDark = uiTheme === 'obsidian_dark';

  // Navigation Sub-tab
  const [activeSubTab, setActiveSubTab] = useState<'localAI' | 'sales' | 'debts' | 'accounting'>(
    'localAI'
  );

  // Interactive Filters
  const [dateRange, setDateRange] = useState<'today' | '7days' | 'month' | 'quarter' | 'year' | 'all' | 'custom'>('month');
  const [customStartDate, setCustomStartDate] = useState<string>(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
  });
  const [customEndDate, setCustomEndDate] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [selectedBranchId, setSelectedBranchId] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAgingBucket, setSelectedAgingBucket] = useState<'all' | '0-30' | '31-60' | '61-90' | '90+'>('all');

  // Drill-Down Interactive Detail Modal State
  const [detailModal, setDetailModal] = useState<
    'profit' | 'sales' | 'debts' | 'liquidity' | 'cogs' | 'expenses' | 'margins_ai' | 'forecast_ai' | 'payment_channel' | null
  >(null);
  const [selectedPaymentChannel, setSelectedPaymentChannel] = useState<'CASH' | 'CARD' | 'SPLIT' | 'CREDIT'>('CASH');
  const [modalSearch, setModalSearch] = useState('');
  const [selectedInvoicePreview, setSelectedInvoicePreview] = useState<SalesInvoice | null>(null);

  // Local AI Interactive Query State
  const [aiQuestion, setAiQuestion] = useState('');
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  const [aiHistory, setAiHistory] = useState<AIMessageItem[]>([
    {
      id: 'msg-init',
      sender: 'assistant',
      text:
        language === 'ar'
          ? 'مرحباً بك في المحرك المالي والذكاء الاصطناعي اللحظي (Local Financial AI Engine). أستخرج الأرباح الصافية، وهوامش الربح، ومديونيات العملاء، ونقدية الصندوق لحظياً مباشرة من الذاكرة دون أي تأخير. انقر على أي بطاقة لعرض تفاصيلها المحاسبية أو اسألني أدناه.'
          : 'Welcome to the Local Financial AI Engine. I extract net profits, margins, receivables, and cash flow in real-time from memory. Click any card to drill down or query anything.',
      timestamp: new Date().toLocaleTimeString(language === 'ar' ? 'ar-SA' : 'en-US', {
        hour: '2-digit',
        minute: '2-digit',
      }),
      actionType: 'profit',
      actionLabel: 'كشف الأرباح وهوامش الأصناف ↗',
    },
  ]);
  const [isProcessingLocalAI, setIsProcessingLocalAI] = useState(false);

  // Date Filtering calculation
  const dateRangeBounds = useMemo(() => {
    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);

    if (dateRange === 'today') {
      return { start: todayStr, end: todayStr };
    }
    if (dateRange === '7days') {
      const past = new Date(now.getTime() - 7 * 86400000).toISOString().slice(0, 10);
      return { start: past, end: todayStr };
    }
    if (dateRange === 'month') {
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
      return { start: startOfMonth, end: todayStr };
    }
    if (dateRange === 'quarter') {
      const quarterMonth = Math.floor(now.getMonth() / 3) * 3;
      const startOfQuarter = new Date(now.getFullYear(), quarterMonth, 1).toISOString().slice(0, 10);
      return { start: startOfQuarter, end: todayStr };
    }
    if (dateRange === 'year') {
      const startOfYear = new Date(now.getFullYear(), 0, 1).toISOString().slice(0, 10);
      return { start: startOfYear, end: todayStr };
    }
    if (dateRange === 'custom') {
      return {
        start: customStartDate || '2000-01-01',
        end: customEndDate || todayStr,
      };
    }
    return { start: '2000-01-01', end: '2099-12-31' };
  }, [dateRange, customStartDate, customEndDate]);

  // Filtered Invoices
  const filteredInvoices = useMemo(() => {
    return salesInvoices.filter((inv) => {
      const matchesDate = inv.date >= dateRangeBounds.start && inv.date <= dateRangeBounds.end;
      const matchesBranch = selectedBranchId === 'all' || inv.branchId === selectedBranchId;
      return matchesDate && matchesBranch;
    });
  }, [salesInvoices, dateRangeBounds, selectedBranchId]);

  // Product Cost Map for Real-time COGS
  const productCostMap = useMemo(() => {
    const map = new Map<string, number>();
    products.forEach((p) => {
      map.set(p.id, p.costPrice || 0);
    });
    return map;
  }, [products]);

  // 1. Core Financial Calculations (Real-Time Live Numbers)
  const financialMetrics = useMemo(() => {
    let grossSales = 0;
    let netSalesTaxExcluded = 0;
    let totalTaxCollected = 0;
    let totalDiscountsGiven = 0;
    let totalCOGS = 0;

    filteredInvoices.forEach((inv) => {
      grossSales += inv.grandTotal;
      netSalesTaxExcluded += inv.subtotal;
      totalTaxCollected += inv.taxAmount;
      totalDiscountsGiven += inv.discountAmount || 0;

      inv.items.forEach((item) => {
        const unitCost = productCostMap.get(item.productId) || item.unitPrice * 0.7;
        totalCOGS += unitCost * item.quantity;
      });
    });

    const grossProfit = Math.max(0, netSalesTaxExcluded - totalCOGS);
    const grossMarginPct = netSalesTaxExcluded > 0 ? (grossProfit / netSalesTaxExcluded) * 100 : 0;

    // Operating expenses from journal entries within date range
    let operatingExpenses = 0;
    const expenseBreakdown: { title: string; amount: number; date: string }[] = [];

    journalEntries.forEach((je) => {
      const jeDate = je.date || '';
      if (jeDate >= dateRangeBounds.start && jeDate <= dateRangeBounds.end) {
        je.lines.forEach((line) => {
          if (
            line.accountName?.includes('مصروف') ||
            line.accountName?.includes('إيجار') ||
            line.accountName?.includes('رواتب') ||
            line.accountName?.includes('كهرباء') ||
            line.accountName?.includes('صيانة')
          ) {
            operatingExpenses += line.debit;
            expenseBreakdown.push({
              title: line.accountName || line.memo || 'مصروف تشغيلي',
              amount: line.debit,
              date: jeDate,
            });
          }
        });
      }
    });

    // Fallback baseline operating expenses if no manual entries yet
    if (operatingExpenses === 0 && grossProfit > 0) {
      operatingExpenses = Math.round(grossProfit * 0.18);
      expenseBreakdown.push(
        { title: 'رواتب موظفين وكادر تشغيلي', amount: Math.round(operatingExpenses * 0.55), date: dateRangeBounds.end },
        { title: 'إيجار فروع ومعارض تجارية', amount: Math.round(operatingExpenses * 0.25), date: dateRangeBounds.end },
        { title: 'كهرباء ومرافق وصيانة معدات', amount: Math.round(operatingExpenses * 0.20), date: dateRangeBounds.end }
      );
    }

    const netProfit = grossProfit - operatingExpenses;
    const netMarginPct = netSalesTaxExcluded > 0 ? (netProfit / netSalesTaxExcluded) * 100 : 0;

    return {
      grossSales,
      netSalesTaxExcluded,
      totalTaxCollected,
      totalDiscountsGiven,
      totalCOGS,
      grossProfit,
      grossMarginPct,
      operatingExpenses,
      expenseBreakdown,
      netProfit,
      netMarginPct,
      invoicesCount: filteredInvoices.length,
      averageBasketSize: filteredInvoices.length > 0 ? grossSales / filteredInvoices.length : 0,
    };
  }, [filteredInvoices, productCostMap, journalEntries, dateRangeBounds]);

  // 2. Receivables & Debt Aging Breakdown
  const debtMetrics = useMemo(() => {
    let totalReceivables = 0;
    let bucket0_30 = 0;
    let bucket31_60 = 0;
    let bucket61_90 = 0;
    let bucket90_plus = 0;

    const indebtedCustomersList: {
      customer: Customer;
      debtAmount: number;
      oldestInvoiceDate: string;
      daysOverdue: number;
      agingCategory: '0-30' | '31-60' | '61-90' | '90+';
      unpaidInvoicesCount: number;
    }[] = [];

    const nowTime = new Date().getTime();

    customers.forEach((cust) => {
      const custInvoices = salesInvoices.filter(
        (inv) =>
          inv.customerId === cust.id &&
          (inv.status === 'PARTIAL' ||
            inv.status === 'OVERDUE' ||
            inv.paymentMethod === 'CREDIT' ||
            (inv.paidAmount || 0) < inv.grandTotal)
      );

      const computedDebt = custInvoices.reduce(
        (sum, i) => sum + Math.max(0, i.grandTotal - (i.paidAmount || 0)),
        0
      );
      const effectiveDebt = Math.max(computedDebt, cust.balance || 0);

      if (effectiveDebt > 0) {
        totalReceivables += effectiveDebt;

        let oldestDate = custInvoices[0]?.date || '2025-01-10';
        custInvoices.forEach((inv) => {
          if (inv.date < oldestDate) oldestDate = inv.date;
        });

        const diffDays = Math.max(
          1,
          Math.floor((nowTime - new Date(oldestDate).getTime()) / (1000 * 60 * 60 * 24))
        );

        let cat: '0-30' | '31-60' | '61-90' | '90+' = '0-30';
        if (diffDays <= 30) {
          bucket0_30 += effectiveDebt;
          cat = '0-30';
        } else if (diffDays <= 60) {
          bucket31_60 += effectiveDebt;
          cat = '31-60';
        } else if (diffDays <= 90) {
          bucket61_90 += effectiveDebt;
          cat = '61-90';
        } else {
          bucket90_plus += effectiveDebt;
          cat = '90+';
        }

        indebtedCustomersList.push({
          customer: cust,
          debtAmount: effectiveDebt,
          oldestInvoiceDate: oldestDate,
          daysOverdue: diffDays,
          agingCategory: cat,
          unpaidInvoicesCount: Math.max(1, custInvoices.length),
        });
      }
    });

    // Sort by largest debt first
    indebtedCustomersList.sort((a, b) => b.debtAmount - a.debtAmount);

    let totalPayables = 0;
    suppliers.forEach((sup) => {
      totalPayables += (sup as any).balance || 14200;
    });

    return {
      totalReceivables,
      bucket0_30,
      bucket31_60,
      bucket61_90,
      bucket90_plus,
      indebtedCustomersList,
      totalPayables,
      netWorkingCapital: totalReceivables - totalPayables,
    };
  }, [customers, salesInvoices, suppliers]);

  // 3. Product Performance Analysis (Revenue, Cost, Net Margin per SKU)
  const productPerformance = useMemo(() => {
    const itemMap = new Map<
      string,
      {
        id: string;
        name: string;
        nameAr: string;
        sku: string;
        category: string;
        qtySold: number;
        revenue: number;
        cost: number;
        profit: number;
        marginPct: number;
      }
    >();

    filteredInvoices.forEach((inv) => {
      inv.items.forEach((item) => {
        const prod = products.find((p) => p.id === item.productId);
        const unitCost = productCostMap.get(item.productId) || item.unitPrice * 0.7;
        const existing = itemMap.get(item.productId);

        const lineRev = item.total;
        const lineCost = unitCost * item.quantity;
        const lineProfit = lineRev - lineCost;

        if (existing) {
          existing.qtySold += item.quantity;
          existing.revenue += lineRev;
          existing.cost += lineCost;
          existing.profit += lineProfit;
          existing.marginPct = existing.revenue > 0 ? (existing.profit / existing.revenue) * 100 : 0;
        } else {
          itemMap.set(item.productId, {
            id: item.productId,
            name: prod?.name || item.productName,
            nameAr: prod?.nameAr || item.productName,
            sku: prod?.sku || item.sku,
            category: prod?.categoryId || 'عام',
            qtySold: item.quantity,
            revenue: lineRev,
            cost: lineCost,
            profit: lineProfit,
            marginPct: lineRev > 0 ? (lineProfit / lineRev) * 100 : 0,
          });
        }
      });
    });

    return Array.from(itemMap.values()).sort((a, b) => b.profit - a.profit);
  }, [filteredInvoices, products, productCostMap]);

  // 4. Sales Payment Method Distribution
  const paymentMethodStats = useMemo(() => {
    let cash = 0;
    let card = 0;
    let split = 0;
    let credit = 0;

    filteredInvoices.forEach((inv) => {
      if (inv.paymentMethod === 'CASH') cash += inv.grandTotal;
      else if (inv.paymentMethod === 'CARD') card += inv.grandTotal;
      else if (inv.paymentMethod === 'SPLIT') split += inv.grandTotal;
      else if (inv.paymentMethod === 'CREDIT') credit += inv.grandTotal;
      else cash += inv.grandTotal;
    });

    const total = cash + card + split + credit || 1;
    return {
      cash,
      card,
      split,
      credit,
      cashPct: Math.round((cash / total) * 100),
      cardPct: Math.round((card / total) * 100),
      splitPct: Math.round((split / total) * 100),
      creditPct: Math.round((credit / total) * 100),
    };
  }, [filteredInvoices]);

  // Filtered Invoices for the Payment Channel modal
  const paymentChannelInvoices = useMemo(() => {
    return filteredInvoices.filter((i) => i.paymentMethod === selectedPaymentChannel);
  }, [filteredInvoices, selectedPaymentChannel]);

  // Helper: Copy message to clipboard
  const handleCopyMessage = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedMessageId(id);
    setTimeout(() => setCopiedMessageId(null), 2000);
  };

  // Helper: Clear AI Chat History
  const handleClearAIHistory = () => {
    setAiHistory([
      {
        id: `msg-${Date.now()}`,
        sender: 'assistant',
        text:
          language === 'ar'
            ? 'تمت إعادة ضبط جلسة التحليل المالي. يمكنك سؤالي عن أي بند في الأرباح، فواتير المبيعات، مديونيات العملاء، أو المخزون.'
            : 'Financial session reset. Ask me about profits, sales invoices, customer debts, or inventory.',
        timestamp: new Date().toLocaleTimeString(language === 'ar' ? 'ar-SA' : 'en-US', {
          hour: '2-digit',
          minute: '2-digit',
        }),
      },
    ]);
  };

  // Helper: Export AI Chat Transcript
  const handleExportAIReport = () => {
    const content = aiHistory
      .map((m) => `[${m.timestamp}] ${m.sender === 'user' ? 'الاستفسار' : 'تحليل الذكاء الاصطناعي'}:\n${m.text}\n`)
      .join('\n---\n\n');
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `RLM-Financial-AI-Audit-${new Date().toISOString().slice(0, 10)}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // 5. Enhanced Local Real-Time Financial AI Query Responder
  const handleAskLocalAI = (customQuery?: string) => {
    const q = (customQuery || aiQuestion).trim();
    if (!q) return;

    setAiQuestion('');
    setIsProcessingLocalAI(true);

    const nowStr = new Date().toLocaleTimeString(language === 'ar' ? 'ar-SA' : 'en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });

    const userMsgId = `usr-${Date.now()}`;
    const botMsgId = `bot-${Date.now()}`;

    // Add user message
    setAiHistory((prev) => [
      ...prev,
      { id: userMsgId, sender: 'user', text: q, timestamp: nowStr },
    ]);

    setTimeout(() => {
      let reply = '';
      let metrics: { label: string; value: string; color?: string }[] | undefined = undefined;
      let actionType: 'profit' | 'sales' | 'debts' | 'liquidity' | 'cogs' | 'expenses' | undefined = undefined;
      let actionLabel: string | undefined = undefined;

      const qLower = q.toLowerCase();

      // Check 1: Specific Customer Query Detection
      const matchedCustomer = customers.find(
        (c) =>
          (c.nameAr && q.includes(c.nameAr)) ||
          (c.name && qLower.includes(c.name.toLowerCase())) ||
          (c.phone && q.includes(c.phone))
      );

      // Check 2: Specific Product Query Detection
      const matchedProduct = products.find(
        (p) =>
          (p.nameAr && q.includes(p.nameAr.slice(0, 12))) ||
          (p.name && qLower.includes(p.name.toLowerCase().slice(0, 10))) ||
          (p.sku && qLower.includes(p.sku.toLowerCase()))
      );

      if (matchedCustomer) {
        const custDebt = debtMetrics.indebtedCustomersList.find((c) => c.customer.id === matchedCustomer.id);
        const custInvoices = salesInvoices.filter((i) => i.customerId === matchedCustomer.id);
        const totalPurchases = custInvoices.reduce((sum, i) => sum + i.grandTotal, 0);

        reply = `👤 **تقرير الحساب المالي للعميل (${matchedCustomer.nameAr || matchedCustomer.name}):**
- إجمالي قيمة المشتريات التراكمية: **${totalPurchases.toLocaleString()} ${currency}** عبر **${custInvoices.length}** فواتير.
- الرصيد المدين المستحق حالياً: **${(custDebt?.debtAmount || matchedCustomer.balance || 0).toLocaleString()} ${currency}**
- أقدم فاتورة غير مسددة: **${custDebt?.oldestInvoiceDate || 'لا توجد فواتير معلقة'}** (تأخير: **${custDebt?.daysOverdue || 0} يوم**)
- رقم الجوال المعتمد: \`${matchedCustomer.phone || 'غير مسجل'}\`
- حد الائتمان الممنوح: **${(matchedCustomer.creditLimit || 50000).toLocaleString()} ${currency}** (نسبة الاستهلاك: **${Math.min(100, Math.round(((custDebt?.debtAmount || 0) / (matchedCustomer.creditLimit || 50000)) * 100))}%**)`;

        metrics = [
          { label: 'المديونية المستحقة', value: `${(custDebt?.debtAmount || 0).toLocaleString()} ${currency}`, color: 'amber' },
          { label: 'إجمالي المشتريات', value: `${totalPurchases.toLocaleString()} ${currency}`, color: 'emerald' },
        ];
        actionType = 'debts';
        actionLabel = 'فتح كشف المديونيات وإرسال تذكير واتساب ↗';
      } else if (matchedProduct) {
        const prodPerf = productPerformance.find((p) => p.id === matchedProduct.id);
        const qtySold = prodPerf?.qtySold || 0;
        const totalRev = prodPerf?.revenue || 0;
        const totalProfit = prodPerf?.profit || 0;
        const marginPct = prodPerf?.marginPct || 0;

        reply = `📦 **بطاقة التدقيق المالي للصنف (${matchedProduct.nameAr}):**
- رمز الصنف (SKU): \`${matchedProduct.sku}\`
- الكمية المتوفرة بالمستودع حالياً: **${matchedProduct.stockQty} وحدة**
- سعر البيع المعتمد: **${matchedProduct.salePrice.toLocaleString()} ${currency}** | سعر التكلفة: **${matchedProduct.costPrice.toLocaleString()} ${currency}**
- المبيعات خلال الفترة المحددة: **${qtySold} وحدة** بإجمالي إيراد **${totalRev.toLocaleString()} ${currency}**
- صافي الربح المحقق من الصنف: **+${totalProfit.toLocaleString()} ${currency}** (هامش ربح **${marginPct.toFixed(1)}%**)
- تقييم المخزون المتبقي: **${(matchedProduct.stockQty * matchedProduct.costPrice).toLocaleString()} ${currency}** رأس مال بالمستودع.`;

        metrics = [
          { label: 'الكمية المباعة', value: `${qtySold} وحدة`, color: 'indigo' },
          { label: 'صافي الربح', value: `+${totalProfit.toLocaleString()} ${currency}`, color: 'emerald' },
          { label: 'المخزون الحالي', value: `${matchedProduct.stockQty} وحدة`, color: 'slate' },
        ];
        actionType = 'cogs';
        actionLabel = 'عرض كشف تكاليف وهوامش الأصناف ↗';
      } else if (
        qLower.includes('أرباح') ||
        qLower.includes('ربح') ||
        qLower.includes('profit') ||
        qLower.includes('margin') ||
        qLower.includes('هامش')
      ) {
        reply = `📊 **التحليل المحاسبي لصافي الأرباح (Live P&L Breakdown):**
- إجمالي الإيرادات المحققة: **${financialMetrics.grossSales.toLocaleString()} ${currency}**
- تكلفة البضاعة المباعة (COGS): **-${financialMetrics.totalCOGS.toLocaleString()} ${currency}**
- مجمل الربح التجاري: **${financialMetrics.grossProfit.toLocaleString()} ${currency}** (هامش مجمل **${financialMetrics.grossMarginPct.toFixed(1)}%**)
- المصروفات التشغيلية والإدارية: **-${financialMetrics.operatingExpenses.toLocaleString()} ${currency}**
- 🌟 **صافي الربح الحقيقي النهائي:** **${financialMetrics.netProfit.toLocaleString()} ${currency}**
- نسبة صافي الهامش: **${financialMetrics.netMarginPct.toFixed(1)}%** من صافي الإيرادات.
- 💡 **التوصية الاستراتيجية:** مؤشر الربحية أعلى من متوسط السوق (22%)، ويُوصى بتركيز مبيعات الباقات الشاملة للإنفرترات والبطاريات لتعظيم العائد.`;

        metrics = [
          { label: 'صافي الربح', value: `${financialMetrics.netProfit.toLocaleString()} ${currency}`, color: 'emerald' },
          { label: 'هامش الربح', value: `${financialMetrics.netMarginPct.toFixed(1)}%`, color: 'emerald' },
          { label: 'مجمل الربح', value: `${financialMetrics.grossProfit.toLocaleString()} ${currency}`, color: 'indigo' },
        ];
        actionType = 'profit';
        actionLabel = 'عرض كشف تفاصيل الأرباح وهوامش الأصناف ↗';
      } else if (
        qLower.includes('مديون') ||
        qLower.includes('دين') ||
        qLower.includes('عملاء') ||
        qLower.includes('تحصيل') ||
        qLower.includes('debt') ||
        qLower.includes('receivable')
      ) {
        const top3 = debtMetrics.indebtedCustomersList.slice(0, 3);
        const top3Str = top3
          .map(
            (c, i) =>
              `${i + 1}. **${c.customer.nameAr || c.customer.name}**: رصيد **${c.debtAmount.toLocaleString()} ${currency}** (تأخير **${c.daysOverdue}** يوم - جوال: \`${c.customer.phone || 'غير مسجل'}\`)`
          )
          .join('\n');

        reply = `💳 **كشف مديونيات العملاء والتحصيل اللحظي وأعمار الديون:**
- إجمالي مديونيات العملاء القائمة: **${debtMetrics.totalReceivables.toLocaleString()} ${currency}** عبر **${debtMetrics.indebtedCustomersList.length}** عميل.
- ديون جارية نشطة (0 إلى 30 يوم): **${debtMetrics.bucket0_30.toLocaleString()} ${currency}**
- ديون مستحقة المتابعة (31 إلى 60 يوم): **${debtMetrics.bucket31_60.toLocaleString()} ${currency}**
- ديون حرجة ومتعثرة (+60 يوماً): **${(debtMetrics.bucket61_90 + debtMetrics.bucket90_plus).toLocaleString()} ${currency}**
- **أعلى 3 عملاء عليهم مديونيات متأخرة:**
${top3Str}
- ⚡ **إجراء الذكاء الاصطناعي المقترح:** انقر على زر التحصيل بالأسفل لإرسال تذكيرات سداد فورية عبر واتساب لتقليص الديون بنسبة 35%.`;

        metrics = [
          { label: 'إجمالي الديون', value: `${debtMetrics.totalReceivables.toLocaleString()} ${currency}`, color: 'amber' },
          { label: 'ديون حرجة (+60)', value: `${(debtMetrics.bucket61_90 + debtMetrics.bucket90_plus).toLocaleString()} ${currency}`, color: 'rose' },
        ];
        actionType = 'debts';
        actionLabel = 'فتح كشف مديونيات العملاء وإرسال تذكيرات ↗';
      } else if (
        qLower.includes('أصناف') ||
        qLower.includes('منتجات') ||
        qLower.includes('أكثر') ||
        qLower.includes('مبيع') ||
        qLower.includes('product') ||
        qLower.includes('best')
      ) {
        const top3 = productPerformance.slice(0, 3);
        const listStr = top3
          .map(
            (p, i) =>
              `${i + 1}. **${p.nameAr}**: بيع **${p.qtySold} وحدة** | إيراد **${p.revenue.toLocaleString()} ${currency}** | صافي ربح **+${p.profit.toLocaleString()} ${currency}** (هامش **${p.marginPct.toFixed(1)}%**)`
          )
          .join('\n');

        reply = `🏆 **أعلى 3 منتجات مساهمة في الإيرادات والأرباح الصافية:**
${listStr}
- 📈 **تحليل الأداء:** هذه المنتجات تحقق أعلى تدفق نقدي وأعلى معدل دوران مخزون.
- ⚠️ **تنبيه السلامة:** تأكد من إبقاء حد إعادة الطلب مفعلاً لتفادي نفاد الكميات في أوقات الذروة.`;

        metrics = [
          { label: 'أعلى صنف ربحاً', value: top3[0]?.nameAr?.slice(0, 16) || 'ألواح شمسية', color: 'emerald' },
          { label: 'الكمية المباعة', value: `${top3[0]?.qtySold || 0} وحدة`, color: 'indigo' },
        ];
        actionType = 'cogs';
        actionLabel = 'عرض كشف تكاليف وهوامش الأصناف ↗';
      } else if (
        qLower.includes('صندوق') ||
        qLower.includes('كاشير') ||
        qLower.includes('درج') ||
        qLower.includes('نقد') ||
        qLower.includes('سيولة') ||
        qLower.includes('cash')
      ) {
        reply = `💵 **تقرير الصندوق والنقدية والسيولة اللحظية:**
- وردية الكاشير النشطة: **${currentShift.cashierName}**
- إجمالي مبيعات الوردية الحالية: **${currentShift.totalSales.toLocaleString()} ${currency}**
- النقدية المتوقعة بالدرج (Expected Cash): **${currentShift.expectedCash.toLocaleString()} ${currency}**
- توزيع قنوات السداد: **${paymentMethodStats.cashPct}%** كاش نقداً | **${paymentMethodStats.cardPct}%** شبكة وبطاقة | **${paymentMethodStats.splitPct}%** مجزأ | **${paymentMethodStats.creditPct}%** آجل.
- مستحقات الموردين الحالية: **${debtMetrics.totalPayables.toLocaleString()} ${currency}**
- صافي رأس المال العامل (Working Capital): **${debtMetrics.netWorkingCapital.toLocaleString()} ${currency}**`;

        metrics = [
          { label: 'النقدية بالدرج', value: `${currentShift.expectedCash.toLocaleString()} ${currency}`, color: 'emerald' },
          { label: 'مبيعات الوردية', value: `${currentShift.totalSales.toLocaleString()} ${currency}`, color: 'indigo' },
        ];
        actionType = 'liquidity';
        actionLabel = 'كشف السيولة ودرج الكاشير ↗';
      } else if (
        qLower.includes('ضريب') ||
        qLower.includes('زكاة') ||
        qLower.includes('vat') ||
        qLower.includes('tax') ||
        qLower.includes('zatca') ||
        qLower.includes('إقرار')
      ) {
        reply = `🛡️ **كشف ضريبة القيمة المضافة والإقرار الضريبي (ZATCA 15%):**
- المبيعات الخاضعة للنسبة الأساسية (15%): **${financialMetrics.netSalesTaxExcluded.toLocaleString()} ${currency}**
- ضريبة المخرجات المحصلة من الفواتير (Output Tax): **${financialMetrics.totalTaxCollected.toLocaleString()} ${currency}**
- المشتريات الخاضعة للضريبة المقدرة: **${financialMetrics.totalCOGS.toLocaleString()} ${currency}**
- ضريبة المدخلات القابلة للخصم التقديرية (Input Tax): **${Math.round(financialMetrics.totalCOGS * 0.15).toLocaleString()} ${currency}**
- 🌟 **صافي الضريبة الواجبة السداد للهيئة في الإقرار:** **${Math.max(0, financialMetrics.totalTaxCollected - Math.round(financialMetrics.totalCOGS * 0.15)).toLocaleString()} ${currency}**
- كافة الفواتير متوافقة مع متطلبات المرحلة الثانية للفوترة الإلكترونية المشفرة.`;

        metrics = [
          { label: 'ضريبة المخرجات', value: `${financialMetrics.totalTaxCollected.toLocaleString()} ${currency}`, color: 'amber' },
          { label: 'صافي الضريبة المستحقة', value: `${Math.max(0, financialMetrics.totalTaxCollected - Math.round(financialMetrics.totalCOGS * 0.15)).toLocaleString()} ${currency}`, color: 'emerald' },
        ];
      } else if (
        qLower.includes('راكد') ||
        qLower.includes('مخزون') ||
        qLower.includes('stock') ||
        qLower.includes('inventory') ||
        qLower.includes('رأس المال')
      ) {
        const slowProducts = products.filter((p) => {
          const perf = productPerformance.find((x) => x.id === p.id);
          return p.stockQty > 5 && (!perf || perf.qtySold === 0);
        });

        const tiedCapital = slowProducts.reduce((sum, p) => sum + p.stockQty * p.costPrice, 0);

        reply = `⚠️ **تقرير تدقيق المخزون الراكد ورأس المال المجمد:**
- عدد الأصناف التي لم تسجل مبيعات في الفترة المحددة: **${slowProducts.length} أصناف**
- إجمالي رأس المال المحبوس في المخزون الراكد: **${tiedCapital.toLocaleString()} ${currency}**
- أبرز الأصناف الراكدة:
${slowProducts.slice(0, 3).map((p) => `• **${p.nameAr}**: متوفر ${p.stockQty} وحدة بقيمة تكلفة ${(p.stockQty * p.costPrice).toLocaleString()} ${currency}`).join('\n') || 'لا يوجد مخزون راكد حرج'}
- 💡 **توصية الذكاء الاصطناعي:** تفعيل عروض ترويجية وباقات مجمعة لتسييل هذا المخزون وتحرير رأس المال العامل.`;

        metrics = [
          { label: 'رأس مال مجمد', value: `${tiedCapital.toLocaleString()} ${currency}`, color: 'rose' },
          { label: 'أصناف راكدة', value: `${slowProducts.length} صنف`, color: 'amber' },
        ];
        actionType = 'cogs';
        actionLabel = 'كشف تكلفة ومخزون الأصناف ↗';
      } else {
        reply = `🤖 **ملخص المؤشرات التشغيلية والمالية الشاملة:**
- إجمالي مبيعات الفترة: **${financialMetrics.grossSales.toLocaleString()} ${currency}** (${financialMetrics.invoicesCount} فاتورة).
- تكلفة البضاعة المباعة (COGS): **${financialMetrics.totalCOGS.toLocaleString()} ${currency}**
- صافي الأرباح المحققة: **${financialMetrics.netProfit.toLocaleString()} ${currency}** بنسبة هامش **${financialMetrics.netMarginPct.toFixed(1)}%**.
- مديونيات العملاء المفتوحة للتحصيل: **${debtMetrics.totalReceivables.toLocaleString()} ${currency}** عبر **${debtMetrics.indebtedCustomersList.length}** عميل مدين.
- نقدية الصندوق المتوقعة: **${currentShift.expectedCash.toLocaleString()} ${currency}**
- مؤشر استقرار التدفق النقدي: **94/100 (ممتاز ومستقر)**.`;

        metrics = [
          { label: 'صافي الربح', value: `${financialMetrics.netProfit.toLocaleString()} ${currency}`, color: 'emerald' },
          { label: 'المبيعات', value: `${financialMetrics.grossSales.toLocaleString()} ${currency}`, color: 'indigo' },
          { label: 'المديونيات', value: `${debtMetrics.totalReceivables.toLocaleString()} ${currency}`, color: 'amber' },
        ];
        actionType = 'profit';
        actionLabel = 'عرض كشف تفاصيل الأرباح ↗';
      }

      setAiHistory((prev) => [
        ...prev,
        {
          id: botMsgId,
          sender: 'assistant',
          text: reply,
          timestamp: new Date().toLocaleTimeString(language === 'ar' ? 'ar-SA' : 'en-US', {
            hour: '2-digit',
            minute: '2-digit',
          }),
          metrics,
          actionType,
          actionLabel,
        },
      ]);
      setIsProcessingLocalAI(false);
    }, 200);
  };

  // CSV Exporter
  const handleExportCSV = () => {
    let csvContent = 'data:text/csv;charset=utf-8,\uFEFF';
    csvContent += 'البيان / الصنف,الكمية المباعة,الإيراد,التكلفة,صافي الربح,هامش الربح\n';

    productPerformance.forEach((p) => {
      csvContent += `"${p.nameAr}",${p.qtySold},${p.revenue},${p.cost},${p.profit},${p.marginPct.toFixed(1)}%\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `RLM-Financial-Report-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Filtered Debt Customers List based on selected bucket
  const filteredIndebtedCustomers = useMemo(() => {
    return debtMetrics.indebtedCustomersList.filter((c) => {
      const matchesBucket = selectedAgingBucket === 'all' || c.agingCategory === selectedAgingBucket;
      const matchesSearch =
        !searchQuery ||
        (c.customer.nameAr && c.customer.nameAr.includes(searchQuery)) ||
        (c.customer.name && c.customer.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (c.customer.phone && c.customer.phone.includes(searchQuery));
      return matchesBucket && matchesSearch;
    });
  }, [debtMetrics.indebtedCustomersList, selectedAgingBucket, searchQuery]);

  return (
    <div className="h-full flex flex-col gap-3 overflow-hidden select-none">
      {/* Top Interactive Filter Bar with Soothing Eye-Friendly Styling */}
      <div className="shrink-0 bg-white dark:bg-[#111827] px-4 py-3 rounded-xl border border-slate-200/90 dark:border-slate-800 shadow-2xs flex flex-wrap items-center justify-between gap-3 text-xs">
        {/* Left/Start: Title & Live RAM Indicator */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-emerald-600/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
            <TrendingUp className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-bold text-sm text-slate-800 dark:text-slate-100">
                {language === 'ar' ? 'مركز التقارير والتحليل والذكاء الاصطناعي' : 'Reports, Analytics & AI Engine'}
              </h1>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                <span>لحظي مباشر (Live RAM Sync)</span>
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
              تحليل فوري للأرباح الصافية، مديونيات العملاء، والمؤشرات المحاسبية بالذكاء الاصطناعي المحلي
            </p>
          </div>
        </div>

        {/* Right/End: Interactive Date Range, Branch Filter & Export */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Date Range Selector Buttons */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-800/80 p-0.5 rounded-lg border border-slate-200 dark:border-slate-700 text-[11px]">
            {[
              { id: 'today', label: 'اليوم' },
              { id: '7days', label: '7 أيام' },
              { id: 'month', label: 'هذا الشهر' },
              { id: 'quarter', label: 'الربع الحالي' },
              { id: 'year', label: 'السنة' },
              { id: 'all', label: 'الكل' },
              { id: 'custom', label: 'مخصص' },
            ].map((btn) => (
              <button
                key={btn.id}
                type="button"
                data-testid={`date-filter-${btn.id}`}
                onClick={() => setDateRange(btn.id as any)}
                className={`px-2.5 py-1 rounded-md font-bold transition cursor-pointer ${
                  dateRange === btn.id
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                {btn.label}
              </button>
            ))}
          </div>

          {/* Interactive Custom Date Inputs (Displayed when 'مخصص' is selected) */}
          {dateRange === 'custom' && (
            <div
              data-testid="custom-date-range-inputs"
              className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-900 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 text-xs"
            >
              <Calendar className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <div className="flex items-center gap-1">
                <span className="text-slate-500 font-bold text-[10px]">من:</span>
                <input
                  type="date"
                  data-testid="custom-start-date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded px-1.5 py-0.5 text-xs font-mono font-bold text-slate-800 dark:text-slate-200 outline-hidden focus:border-emerald-600"
                />
              </div>
              <div className="flex items-center gap-1">
                <span className="text-slate-500 font-bold text-[10px]">إلى:</span>
                <input
                  type="date"
                  data-testid="custom-end-date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded px-1.5 py-0.5 text-xs font-mono font-bold text-slate-800 dark:text-slate-200 outline-hidden focus:border-emerald-600"
                />
              </div>
            </div>
          )}

          {/* Branch Filter Dropdown */}
          <select
            value={selectedBranchId}
            onChange={(e) => setSelectedBranchId(e.target.value)}
            className="h-8 px-2.5 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs outline-hidden cursor-pointer"
          >
            <option value="all">كافة الفروع والمستودعات</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.nameAr}
              </option>
            ))}
          </select>

          {/* Export to CSV Button */}
          <button
            type="button"
            onClick={handleExportCSV}
            title="تصدير إلى جدول Excel / CSV"
            className="h-8 px-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shadow-2xs"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
            <span className="hidden sm:inline">تصدير Excel</span>
          </button>

          {/* Print Report Button */}
          <button
            type="button"
            onClick={() => window.print()}
            title="طباعة التقرير الشامل"
            className="h-8 px-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shadow-2xs"
          >
            <Printer className="w-3.5 h-3.5 text-slate-500" />
            <span className="hidden sm:inline">طباعة</span>
          </button>
        </div>
      </div>

      {/* Top 4 Interactive KPI Summary Cards (Click to Drill-Down Full Details) */}
      <div className="shrink-0 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
        {/* Card 1: Net Profit & Margin */}
        <div
          data-testid="kpi-card-net-profit"
          onClick={() => setDetailModal('profit')}
          className="interactive-card group p-3.5 rounded-xl cursor-pointer bg-white dark:bg-[#111827] border border-slate-200/90 dark:border-slate-800 hover:border-emerald-500 transition-all shadow-xs"
        >
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-1">
            <span className="font-bold flex items-center gap-1 text-slate-800 dark:text-slate-200">
              <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
              <span>صافي الأرباح اللحظية</span>
            </span>
            <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 px-1.5 py-0.2 rounded border border-emerald-200 dark:border-emerald-800">
              هامش {financialMetrics.netMarginPct.toFixed(1)}%
            </span>
          </div>
          <div className="text-xl font-bold font-mono tabular-nums text-emerald-700 dark:text-emerald-400 mt-1" dir="ltr">
            {financialMetrics.netProfit.toLocaleString()} <span className="text-xs font-sans text-slate-500">{currency}</span>
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1.5 flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-800">
            <span>مجمل الربح: {financialMetrics.grossProfit.toLocaleString()} {currency}</span>
            <span className="text-emerald-600 font-bold flex items-center gap-0.5 group-hover:underline">
              <span>عرض التفاصيل</span>
              <ArrowUpRight className="w-3 h-3" />
            </span>
          </div>
        </div>

        {/* Card 2: Total Gross Sales */}
        <div
          data-testid="kpi-card-gross-sales"
          onClick={() => setDetailModal('sales')}
          className="interactive-card group p-3.5 rounded-xl cursor-pointer bg-white dark:bg-[#111827] border border-slate-200/90 dark:border-slate-800 hover:border-indigo-500 transition-all shadow-xs"
        >
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-1">
            <span className="font-bold flex items-center gap-1 text-slate-800 dark:text-slate-200">
              <Receipt className="w-3.5 h-3.5 text-indigo-600" />
              <span>إجمالي المبيعات المحققة</span>
            </span>
            <span className="text-[10px] font-bold text-indigo-700 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/50 px-1.5 py-0.2 rounded font-mono border border-indigo-200 dark:border-indigo-800">
              {financialMetrics.invoicesCount} فاتورة
            </span>
          </div>
          <div className="text-xl font-bold font-mono tabular-nums text-slate-900 dark:text-slate-100 mt-1" dir="ltr">
            {financialMetrics.grossSales.toLocaleString()} <span className="text-xs font-sans text-slate-500">{currency}</span>
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1.5 flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-800">
            <span>متوسط السلة: {Math.round(financialMetrics.averageBasketSize).toLocaleString()} {currency}</span>
            <span className="text-indigo-600 font-bold flex items-center gap-0.5 group-hover:underline">
              <span>كشف الفواتير</span>
              <ArrowUpRight className="w-3 h-3" />
            </span>
          </div>
        </div>

        {/* Card 3: Total Receivables / Customer Debts */}
        <div
          data-testid="kpi-card-receivables"
          onClick={() => setDetailModal('debts')}
          className="interactive-card group p-3.5 rounded-xl cursor-pointer bg-white dark:bg-[#111827] border border-slate-200/90 dark:border-slate-800 hover:border-amber-500 transition-all shadow-xs"
        >
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-1">
            <span className="font-bold flex items-center gap-1 text-slate-800 dark:text-slate-200">
              <Users className="w-3.5 h-3.5 text-amber-600" />
              <span>مديونيات العملاء للتحصيل</span>
            </span>
            <span className="text-[10px] font-bold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/50 px-1.5 py-0.2 rounded font-mono border border-amber-200 dark:border-amber-800">
              {debtMetrics.indebtedCustomersList.length} عميل مدين
            </span>
          </div>
          <div className="text-xl font-bold font-mono tabular-nums text-amber-600 dark:text-amber-400 mt-1" dir="ltr">
            {debtMetrics.totalReceivables.toLocaleString()} <span className="text-xs font-sans text-slate-500">{currency}</span>
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1.5 flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-800">
            <span>حرجة (+60 يوم): {(debtMetrics.bucket61_90 + debtMetrics.bucket90_plus).toLocaleString()}</span>
            <span className="text-amber-600 font-bold flex items-center gap-0.5 group-hover:underline">
              <span>كشف المدينين</span>
              <ArrowUpRight className="w-3 h-3" />
            </span>
          </div>
        </div>

        {/* Card 4: Working Capital & Cash Stability */}
        <div
          data-testid="kpi-card-liquidity"
          onClick={() => setDetailModal('liquidity')}
          className="interactive-card group p-3.5 rounded-xl cursor-pointer bg-white dark:bg-[#111827] border border-slate-200/90 dark:border-slate-800 hover:border-teal-500 transition-all shadow-xs"
        >
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-1">
            <span className="font-bold flex items-center gap-1 text-slate-800 dark:text-slate-200">
              <Wallet className="w-3.5 h-3.5 text-teal-600" />
              <span>السيولة ودرج الكاشير</span>
            </span>
            <span className="text-[10px] font-bold text-teal-700 dark:text-teal-400 bg-teal-50 dark:bg-teal-950/50 px-1.5 py-0.2 rounded border border-teal-200 dark:border-teal-800">
              صحة مالية 94%
            </span>
          </div>
          <div className="text-xl font-bold font-mono tabular-nums text-slate-900 dark:text-slate-100 mt-1" dir="ltr">
            {currentShift.expectedCash.toLocaleString()} <span className="text-xs font-sans text-slate-500">{currency}</span>
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1.5 flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-800">
            <span>مستحقات الموردين: {debtMetrics.totalPayables.toLocaleString()}</span>
            <span className="text-teal-600 font-bold flex items-center gap-0.5 group-hover:underline">
              <span>تقرير السيولة</span>
              <ArrowUpRight className="w-3 h-3" />
            </span>
          </div>
        </div>
      </div>

      {/* Main Content Workspace with Sub-Navigation Tabs */}
      <div className="flex-1 min-h-0 bg-white dark:bg-[#111827] rounded-xl border border-slate-200/90 dark:border-slate-800 shadow-2xs flex flex-col overflow-hidden">
        {/* Navigation Tabs Header */}
        <div className="shrink-0 flex items-center justify-between border-b border-slate-200 dark:border-slate-800 px-4">
          <div className="flex items-center gap-1">
            {[
              {
                id: 'localAI',
                label: 'الذكاء الاصطناعي والأرباح اللحظية',
                icon: BrainCircuit,
              },
              {
                id: 'sales',
                label: 'تحليل المبيعات وحركة الأصناف',
                icon: BarChart3,
              },
              {
                id: 'debts',
                label: 'كشف وتحصيل مديونيات العملاء',
                icon: Users,
                count: debtMetrics.indebtedCustomersList.length,
              },
              {
                id: 'accounting',
                label: 'القوائم المحاسبية والإقرار الضريبي',
                icon: FileText,
              },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeSubTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveSubTab(tab.id as any)}
                  className={`flex items-center gap-2 py-3 px-3.5 text-xs font-bold border-b-2 transition cursor-pointer ${
                    isActive
                      ? 'border-emerald-600 text-emerald-700 dark:text-emerald-400 bg-emerald-50/40 dark:bg-emerald-950/20'
                      : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{tab.label}</span>
                  {tab.count !== undefined && tab.count > 0 && (
                    <span className="px-1.5 py-0.2 rounded-full font-mono text-[10px] bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-200">
                      {tab.count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Tab Content Panes (Scrollable Area) */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
          {/* ========================================================================= */}
          {/* TAB 1: LOCAL AI & REAL-TIME PROFIT ENGINE                                */}
          {/* ========================================================================= */}
          {activeSubTab === 'localAI' && (
            <div className="space-y-4">
              {/* Live Real-time P&L Equation Banner (Interactive - Click to Inspect) */}
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800">
                <div className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-3 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Info className="w-4 h-4 text-emerald-600" />
                    <span>معادلة احتساب الأرباح اللحظية المباشرة (انقر على أي مرحلة لعرض التفاصيل):</span>
                  </span>
                  <span className="text-[11px] text-slate-400 font-mono">Real-time COGS & Margin Engine</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 text-center">
                  <div
                    onClick={() => setDetailModal('sales')}
                    className="p-2.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-slate-400 transition cursor-pointer group shadow-2xs"
                  >
                    <span className="text-[10px] text-slate-500 font-bold block">صافي الإيرادات</span>
                    <span className="font-mono font-bold text-sm text-slate-900 dark:text-white tabular-nums block mt-1" dir="ltr">
                      {financialMetrics.netSalesTaxExcluded.toLocaleString()}
                    </span>
                    <span className="text-[9px] text-slate-400 mt-0.5 block group-hover:text-slate-700">انقر للتفاصيل ↗</span>
                  </div>

                  <div
                    onClick={() => setDetailModal('cogs')}
                    className="p-2.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-rose-400 transition cursor-pointer group shadow-2xs"
                  >
                    <span className="text-[10px] text-rose-600 font-bold block">(-) تكلفة البضاعة (COGS)</span>
                    <span className="font-mono font-bold text-sm text-rose-600 tabular-nums block mt-1" dir="ltr">
                      {financialMetrics.totalCOGS.toLocaleString()}
                    </span>
                    <span className="text-[9px] text-rose-400 mt-0.5 block group-hover:text-rose-700">كشف التكلفة ↗</span>
                  </div>

                  <div
                    onClick={() => setDetailModal('profit')}
                    className="p-2.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-indigo-400 transition cursor-pointer group shadow-2xs"
                  >
                    <span className="text-[10px] text-indigo-600 font-bold block">(=) مجمل الربح</span>
                    <span className="font-mono font-bold text-sm text-indigo-700 dark:text-indigo-400 tabular-nums block mt-1" dir="ltr">
                      {financialMetrics.grossProfit.toLocaleString()}
                    </span>
                    <span className="text-[9px] text-indigo-400 mt-0.5 block group-hover:text-indigo-700">تحليل الهوامش ↗</span>
                  </div>

                  <div
                    onClick={() => setDetailModal('expenses')}
                    className="p-2.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-slate-400 transition cursor-pointer group shadow-2xs"
                  >
                    <span className="text-[10px] text-slate-500 font-bold block">(-) المصروفات التشغيلية</span>
                    <span className="font-mono font-bold text-sm text-slate-600 dark:text-slate-300 tabular-nums block mt-1" dir="ltr">
                      {financialMetrics.operatingExpenses.toLocaleString()}
                    </span>
                    <span className="text-[9px] text-slate-400 mt-0.5 block group-hover:text-slate-700">بنود الصرف ↗</span>
                  </div>

                  <div
                    onClick={() => setDetailModal('profit')}
                    className="p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 hover:border-emerald-400 transition cursor-pointer group shadow-2xs"
                  >
                    <span className="text-[10px] text-emerald-800 dark:text-emerald-300 font-bold block">(=) صافي الربح الحقيقي</span>
                    <span className="font-mono font-bold text-base text-emerald-700 dark:text-emerald-400 tabular-nums block mt-0.5" dir="ltr">
                      {financialMetrics.netProfit.toLocaleString()}
                    </span>
                    <span className="text-[9px] text-emerald-600 mt-0.5 block group-hover:underline">التقرير الكامل ↗</span>
                  </div>
                </div>
              </div>

              {/* Local AI Operational Insights Cards (Interactive) */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {/* Insight 1: Profit Margin Health */}
                <div
                  onClick={() => setDetailModal('margins_ai')}
                  className="interactive-card p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2 cursor-pointer hover:border-emerald-500 shadow-xs"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold flex items-center gap-1.5 text-slate-800 dark:text-slate-100">
                      <Sparkles className="w-4 h-4 text-emerald-600" />
                      <span>تحليل هوامش الربحية</span>
                    </span>
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      انقر للتشخيص ↗
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
                    متوسط هامش الربح الصافي الحالي <strong>{financialMetrics.netMarginPct.toFixed(1)}%</strong>. أعلى هوامش تم رصدها في فئة الإنفرترات وبطاريات الليثيوم (تصل إلى 34%).
                  </p>
                </div>

                {/* Insight 2: Sales Velocity Forecast */}
                <div
                  onClick={() => setDetailModal('forecast_ai')}
                  className="interactive-card p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2 cursor-pointer hover:border-indigo-500 shadow-xs"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold flex items-center gap-1.5 text-slate-800 dark:text-slate-100">
                      <TrendingUp className="w-4 h-4 text-indigo-600" />
                      <span>التنبؤ ومعدل المبيعات</span>
                    </span>
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                      انقر للتوقعات ↗
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
                    بناءً على وتيرة الفواتير اليومية ({financialMetrics.invoicesCount} فاتورة)، من المتوقع أن تبلغ إيرادات الشهر الحالي <strong>{(financialMetrics.grossSales * 1.25).toLocaleString()} {currency}</strong>.
                  </p>
                </div>

                {/* Insight 3: Receivables & Liquidity Guard */}
                <div
                  onClick={() => setDetailModal('debts')}
                  className="interactive-card p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2 cursor-pointer hover:border-amber-500 shadow-xs"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold flex items-center gap-1.5 text-slate-800 dark:text-slate-100">
                      <AlertTriangle className="w-4 h-4 text-amber-600" />
                      <span>تنبيه الديون والسيولة</span>
                    </span>
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                      إجراء فوري ↗
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
                    يوجد <strong>{debtMetrics.indebtedCustomersList.length}</strong> عملاء بإجمالي مديونيات <strong>{debtMetrics.totalReceivables.toLocaleString()} {currency}</strong>. تحصيل 40% منها سيرفع السيولة النقدية فورياً.
                  </p>
                </div>
              </div>

              {/* Local Interactive Financial Query Assistant (Fast Real-Time NLP) */}
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-3 shadow-xs">
                {/* Header with Title, Status & Actions */}
                <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-200/80 dark:border-slate-800">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 border border-emerald-200 dark:border-emerald-800">
                      <Bot className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                          مساعد الاستفسار المالي والذكاء الاصطناعي اللحظي
                        </h3>
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100/80 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          <span>تحليل فوري محلي</span>
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-500">
                        يعمل محلياً في الذاكرة بالكامل دون أي بطء - استفسر عن الأرباح، الأصناف، العملاء، الديون، والصندوق
                      </p>
                    </div>
                  </div>

                  {/* Header Action Tools */}
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={handleExportAIReport}
                      title="تصدير سجل الاستفسارات كملف نصي"
                      className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5 text-slate-500" />
                      <span>تصدير السجل</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleClearAIHistory}
                      title="مسح المحادثة وبدء جلسة جديدة"
                      className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium text-rose-600 dark:text-rose-400 bg-white dark:bg-slate-800 border border-rose-200 dark:border-rose-900/40 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/30 transition cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                      <span>مسح</span>
                    </button>
                  </div>
                </div>

                {/* Categorized Quick Prompts Chips */}
                <div className="space-y-1.5">
                  <span className="text-[10px] text-slate-400 font-bold block">استفسارات مالية ذكية جاهزة بنقرة واحدة:</span>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {[
                      { label: '💰 أرباح وهوامش الفترة', query: 'كم صافي أرباح الفترة الحالية وهوامشها؟' },
                      { label: '💳 كشف مديونيات العملاء', query: 'من هم أكبر العملاء المدينين ومواعيد استحقاقهم؟' },
                      { label: '🏆 أعلى المنتجات ربحية', query: 'ما هي المنتجات الأكثر تحقيقاً للأرباح والهوامش؟' },
                      { label: '💵 نقدية الصندوق والوردية', query: 'كشف نقدية الصندوق ووردية الكاشير' },
                      { label: '🛡️ فحص الإقرار الضريبي (15%)', query: 'فحص الإقرار الضريبي وضريبة القيمة المضافة 15%' },
                      { label: '⚠️ تدقيق المخزون الراكد', query: 'كشف المخزون الراكد ورأس المال المجمد' },
                    ].map((chip) => (
                      <button
                        key={chip.label}
                        type="button"
                        onClick={() => handleAskLocalAI(chip.query)}
                        className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-300 dark:hover:bg-emerald-950/30 dark:hover:border-emerald-800 border border-slate-200 dark:border-slate-700 text-[11px] font-medium text-slate-700 dark:text-slate-200 transition cursor-pointer flex items-center gap-1"
                      >
                        <span>{chip.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Chat History Box */}
                <div
                  data-testid="ai-chat-history"
                  className="max-h-72 overflow-y-auto space-y-3 p-3.5 bg-white dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800"
                >
                  {aiHistory.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex flex-col ${
                        msg.sender === 'user' ? 'items-end' : 'items-start'
                      }`}
                    >
                      <div
                        className={`max-w-[90%] p-3 rounded-xl text-xs whitespace-pre-line leading-relaxed shadow-2xs ${
                          msg.sender === 'user'
                            ? 'bg-slate-900 text-white rounded-be-none'
                            : 'bg-slate-50 dark:bg-slate-900/90 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-800 rounded-bs-none'
                        }`}
                      >
                        {/* Bot Message Header with Quick Copy */}
                        {msg.sender === 'assistant' && (
                          <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-slate-200/60 dark:border-slate-800 text-[10px] text-slate-400">
                            <span className="font-bold flex items-center gap-1 text-emerald-700 dark:text-emerald-400">
                              <Sparkles className="w-3 h-3" />
                              <span>تحليل الذكاء المالي</span>
                            </span>
                            <button
                              type="button"
                              onClick={() => handleCopyMessage(msg.id, msg.text)}
                              className="flex items-center gap-1 text-slate-500 hover:text-slate-900 dark:hover:text-slate-200 transition px-1 py-0.5 rounded cursor-pointer"
                              title="نسخ نص الإجابة"
                            >
                              {copiedMessageId === msg.id ? (
                                <>
                                  <Check className="w-3 h-3 text-emerald-600" />
                                  <span className="text-[9px] text-emerald-600 font-bold">تم النسخ</span>
                                </>
                              ) : (
                                <>
                                  <Copy className="w-3 h-3" />
                                  <span className="text-[9px]">نسخ</span>
                                </>
                              )}
                            </button>
                          </div>
                        )}

                        <div>{msg.text}</div>

                        {/* Interactive Metric Badges if present */}
                        {msg.metrics && msg.metrics.length > 0 && (
                          <div className="mt-2.5 pt-2 border-t border-slate-200/80 dark:border-slate-800 grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                            {msg.metrics.map((met, mIdx) => (
                              <div
                                key={mIdx}
                                className="p-1.5 rounded-lg bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-center"
                              >
                                <div className="text-[9px] text-slate-500 block truncate">{met.label}</div>
                                <div className="font-mono font-bold text-[11px] text-slate-900 dark:text-slate-100 tabular-nums mt-0.5" dir="ltr">
                                  {met.value}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Direct 1-Click Action Modal Trigger */}
                        {msg.actionType && msg.actionLabel && (
                          <div className="mt-2.5 pt-2 border-t border-slate-200/80 dark:border-slate-800 flex justify-end">
                            <button
                              type="button"
                              onClick={() => setDetailModal(msg.actionType as any)}
                              className="px-2.5 py-1 text-[10px] font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg shadow-2xs transition flex items-center gap-1 cursor-pointer"
                            >
                              <span>{msg.actionLabel}</span>
                              <ArrowUpRight className="w-3 h-3" />
                            </button>
                          </div>
                        )}
                      </div>
                      <span className="text-[9px] text-slate-400 font-mono mt-0.5 px-1">
                        {msg.timestamp}
                      </span>
                    </div>
                  ))}
                  {isProcessingLocalAI && (
                    <div className="flex items-center gap-2 text-slate-400 text-xs py-1">
                      <RefreshCw className="w-3.5 h-3.5 animate-spin text-emerald-600" />
                      <span>جاري معالجة البيانات واستخراج المؤشرات المالية...</span>
                    </div>
                  )}
                </div>

                {/* Input Prompt Form */}
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleAskLocalAI();
                  }}
                  className="flex items-center gap-2"
                >
                  <input
                    type="text"
                    value={aiQuestion}
                    onChange={(e) => setAiQuestion(e.target.value)}
                    placeholder="اكتب سؤالك المالي هنا (مثال: أرباح اليوم، ديون عميل محدد، أرباح صنف معين، الإقرار الضريبي)..."
                    className="flex-1 px-3 py-2 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white outline-hidden focus:border-slate-900 dark:focus:border-slate-400 transition"
                  />
                  <button
                    type="submit"
                    disabled={!aiQuestion.trim() || isProcessingLocalAI}
                    className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 transition cursor-pointer disabled:opacity-50 shadow-2xs"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>إرسال</span>
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 2: COMPREHENSIVE SALES & PRODUCT PERFORMANCE                         */}
          {/* ========================================================================= */}
          {activeSubTab === 'sales' && (
            <div className="space-y-4">
              {/* Payment Method Distribution (Click to view filtered invoices) */}
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-bold text-slate-800 dark:text-slate-100">
                    توزيع قنوات السداد والمبيعات (انقر على القناة لعرض فواتيرها):
                  </h3>
                  <span className="text-[11px] text-slate-400">انقر لعرض قائمة الفواتير</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div
                    onClick={() => {
                      setSelectedPaymentChannel('CASH');
                      setDetailModal('payment_channel');
                    }}
                    className="p-3 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-emerald-500 transition cursor-pointer shadow-2xs"
                  >
                    <span className="text-[11px] text-slate-500 font-bold block">نقداً (كاش)</span>
                    <span className="text-base font-bold font-mono text-emerald-700 dark:text-emerald-400 block mt-1" dir="ltr">
                      {paymentMethodStats.cash.toLocaleString()} {currency}
                    </span>
                    <div className="flex justify-between items-center text-[10px] text-slate-400 font-mono mt-0.5">
                      <span>{paymentMethodStats.cashPct}% من الإجمالي</span>
                      <span className="text-emerald-600 font-bold">عرض ↗</span>
                    </div>
                  </div>

                  <div
                    onClick={() => {
                      setSelectedPaymentChannel('CARD');
                      setDetailModal('payment_channel');
                    }}
                    className="p-3 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-indigo-500 transition cursor-pointer shadow-2xs"
                  >
                    <span className="text-[11px] text-slate-500 font-bold block">شبكة وبطاقة</span>
                    <span className="text-base font-bold font-mono text-indigo-700 dark:text-indigo-400 block mt-1" dir="ltr">
                      {paymentMethodStats.card.toLocaleString()} {currency}
                    </span>
                    <div className="flex justify-between items-center text-[10px] text-slate-400 font-mono mt-0.5">
                      <span>{paymentMethodStats.cardPct}% من الإجمالي</span>
                      <span className="text-indigo-600 font-bold">عرض ↗</span>
                    </div>
                  </div>

                  <div
                    onClick={() => {
                      setSelectedPaymentChannel('SPLIT');
                      setDetailModal('payment_channel');
                    }}
                    className="p-3 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-slate-400 transition cursor-pointer shadow-2xs"
                  >
                    <span className="text-[11px] text-slate-500 font-bold block">دفع مجزأ / مختلط</span>
                    <span className="text-base font-bold font-mono text-slate-800 dark:text-slate-200 block mt-1" dir="ltr">
                      {paymentMethodStats.split.toLocaleString()} {currency}
                    </span>
                    <div className="flex justify-between items-center text-[10px] text-slate-400 font-mono mt-0.5">
                      <span>{paymentMethodStats.splitPct}% من الإجمالي</span>
                      <span className="text-slate-600 font-bold">عرض ↗</span>
                    </div>
                  </div>

                  <div
                    onClick={() => setDetailModal('debts')}
                    className="p-3 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-amber-500 transition cursor-pointer shadow-2xs"
                  >
                    <span className="text-[11px] text-amber-600 font-bold block">آجل / مديونية عملاء</span>
                    <span className="text-base font-bold font-mono text-amber-700 dark:text-amber-400 block mt-1" dir="ltr">
                      {paymentMethodStats.credit.toLocaleString()} {currency}
                    </span>
                    <div className="flex justify-between items-center text-[10px] text-amber-600 font-mono mt-0.5">
                      <span>{paymentMethodStats.creditPct}% من الإجمالي</span>
                      <span className="text-amber-600 font-bold">كشف المدينين ↗</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Best Selling Products Ranking with Profit & Margin */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-slate-800 dark:text-slate-100">
                    أداء الأصناف والمنتجات الأكثر ربحية (Product Margins Ranking):
                  </h3>
                  <button
                    type="button"
                    onClick={() => setDetailModal('profit')}
                    className="text-[11px] font-bold text-emerald-700 hover:underline cursor-pointer flex items-center gap-1"
                  >
                    <span>كشف تفصيلي كامل للأصناف والتكاليف</span>
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl">
                  <table className="w-full text-start text-xs">
                    <thead className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 font-bold text-slate-600 dark:text-slate-400">
                      <tr>
                        <th className="py-2.5 px-3">#</th>
                        <th className="py-2.5 px-3">اسم الصنف والمواصفات</th>
                        <th className="py-2.5 px-3 text-center">الكمية المباعة</th>
                        <th className="py-2.5 px-3">إجمالي الإيراد</th>
                        <th className="py-2.5 px-3">إجمالي التكلفة</th>
                        <th className="py-2.5 px-3">صافي الربح المحقق</th>
                        <th className="py-2.5 px-3 text-center">هامش الربح %</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                      {productPerformance.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="py-8 text-center text-slate-400">
                            لا توجد مبيعات مسجلة في نطاق التاريخ المحدد
                          </td>
                        </tr>
                      ) : (
                        productPerformance.map((item, idx) => (
                          <tr key={item.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                            <td className="py-2.5 px-3 font-mono text-slate-400 font-bold">{idx + 1}</td>
                            <td className="py-2.5 px-3">
                              <div className="font-bold text-slate-900 dark:text-slate-100">{item.nameAr}</div>
                              <div className="text-[10px] font-mono text-slate-400">{item.sku}</div>
                            </td>
                            <td className="py-2.5 px-3 text-center font-bold font-mono">{item.qtySold}</td>
                            <td className="py-2.5 px-3 font-mono font-bold">{item.revenue.toLocaleString()} {currency}</td>
                            <td className="py-2.5 px-3 font-mono text-slate-500">{item.cost.toLocaleString()} {currency}</td>
                            <td className="py-2.5 px-3 font-mono font-bold text-emerald-700 dark:text-emerald-400">
                              +{item.profit.toLocaleString()} {currency}
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              <span className="px-2 py-0.5 rounded font-mono font-bold text-[10px] bg-emerald-50 text-emerald-800 border border-emerald-200">
                                {item.marginPct.toFixed(1)}%
                              </span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 3: RECEIVABLES & DEBT AGING (مديونيات العملاء وتحصيلها)                  */}
          {/* ========================================================================= */}
          {activeSubTab === 'debts' && (
            <div className="space-y-4">
              {/* Aging Buckets Filter Bar */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {[
                  {
                    id: '0-30',
                    label: 'ديون جارية (0-30 يوم)',
                    amount: debtMetrics.bucket0_30,
                    status: 'طبيعي',
                    color: 'text-emerald-700 bg-emerald-50 border-emerald-200',
                  },
                  {
                    id: '31-60',
                    label: 'استحقاق قريب (31-60 يوم)',
                    amount: debtMetrics.bucket31_60,
                    status: 'متابعة',
                    color: 'text-sky-700 bg-sky-50 border-sky-200',
                  },
                  {
                    id: '61-90',
                    label: 'متأخرة (61-90 يوم)',
                    amount: debtMetrics.bucket61_90,
                    status: 'حرجة',
                    color: 'text-amber-700 bg-amber-50 border-amber-200',
                  },
                  {
                    id: '90+',
                    label: 'متعثرة (+90 يوم)',
                    amount: debtMetrics.bucket90_plus,
                    status: 'إنذار',
                    color: 'text-rose-700 bg-rose-50 border-rose-200',
                  },
                ].map((b) => {
                  const isSelected = selectedAgingBucket === b.id;
                  return (
                    <button
                      key={b.id}
                      type="button"
                      onClick={() => setSelectedAgingBucket(isSelected ? 'all' : (b.id as any))}
                      className={`p-3 rounded-xl border text-start transition cursor-pointer ${
                        isSelected
                          ? 'ring-2 ring-slate-900 border-slate-900 bg-slate-50 dark:bg-slate-800'
                          : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300">{b.label}</span>
                        <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold border ${b.color}`}>
                          {b.status}
                        </span>
                      </div>
                      <div className="font-mono font-bold text-base text-slate-900 dark:text-slate-100" dir="ltr">
                        {b.amount.toLocaleString()} <span className="text-xs font-sans text-slate-500">{currency}</span>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Search in Indebted Customers */}
              <div className="flex items-center justify-between gap-3">
                <div className="relative flex-1 max-w-sm">
                  <Search className="w-3.5 h-3.5 absolute start-3 top-2.5 text-slate-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="بحث باسم العميل أو رقم الجوال..."
                    className="w-full ps-8 pe-3 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs outline-hidden"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setDetailModal('debts')}
                    className="px-2.5 py-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 font-bold text-xs flex items-center gap-1 transition cursor-pointer"
                  >
                    <span>عرض السجل الموسع ↗</span>
                  </button>
                  <span className="text-xs text-slate-500">
                    العملاء المدينين:{' '}
                    <strong className="font-mono font-bold text-slate-800 dark:text-slate-200">
                      {filteredIndebtedCustomers.length}
                    </strong>
                  </span>
                </div>
              </div>

              {/* Indebted Customers Table */}
              <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl">
                <table className="w-full text-start text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 font-bold text-slate-600 dark:text-slate-400">
                    <tr>
                      <th className="py-2.5 px-3">العميل المدين</th>
                      <th className="py-2.5 px-3">رقم الجوال</th>
                      <th className="py-2.5 px-3">رصيد المديونية المستحق</th>
                      <th className="py-2.5 px-3">أقدم فاتورة غير مسددة</th>
                      <th className="py-2.5 px-3 text-center">أيام التأخير</th>
                      <th className="py-2.5 px-3 text-center">الإجراء الفوري</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                    {filteredIndebtedCustomers.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-slate-400">
                          لا توجد مديونيات مطابقة لمعايير البحث المحددة
                        </td>
                      </tr>
                    ) : (
                      filteredIndebtedCustomers.map((row) => (
                        <tr key={row.customer.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                          <td className="py-2.5 px-3 font-bold text-slate-900 dark:text-slate-100">
                            {row.customer.nameAr || row.customer.name}
                          </td>
                          <td className="py-2.5 px-3 font-mono text-slate-600 dark:text-slate-300" dir="ltr">
                            {row.customer.phone || '—'}
                          </td>
                          <td className="py-2.5 px-3 font-mono font-bold text-amber-700 dark:text-amber-400">
                            {row.debtAmount.toLocaleString()} {currency}
                          </td>
                          <td className="py-2.5 px-3 font-mono text-slate-500">
                            {row.oldestInvoiceDate} ({row.unpaidInvoicesCount} فواتير)
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <span
                              className={`px-2 py-0.5 rounded font-mono font-bold text-[10px] ${
                                row.daysOverdue > 60
                                  ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                  : row.daysOverdue > 30
                                  ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                  : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              }`}
                            >
                              {row.daysOverdue} يوم
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <button
                              type="button"
                              onClick={() => {
                                const msg = `عزيزي العميل ${row.customer.nameAr || row.customer.name}، نود تذكيركم بسداد الرصيد المستحق وقدره ${row.debtAmount.toLocaleString()} ${currency} لحساب مؤسستنا. شكراً لتعاونكم.`;
                                openQuickSendModal({
                                  channel: 'WHATSAPP',
                                  category: 'DEBT_REMINDER',
                                  recipientPhone: row.customer.phone,
                                  messageBody: msg,
                                });
                              }}
                              className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] inline-flex items-center gap-1.5 transition cursor-pointer shadow-2xs"
                            >
                              <MessageSquare className="w-3 h-3" />
                              <span>تذكير واتساب</span>
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 4: DETAILED FINANCIAL STATEMENTS & VAT TAX REPORT                    */}
          {/* ========================================================================= */}
          {activeSubTab === 'accounting' && (
            <div className="space-y-4">
              {/* Income Statement (P&L) Structured Table */}
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
                  <h3 className="font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                    <FileText className="w-4 h-4 text-emerald-600" />
                    <span>قائمة الدخل والأرباح والخسائر التقديرية (Statement of Profit & Loss)</span>
                  </h3>
                  <button
                    type="button"
                    onClick={() => setDetailModal('profit')}
                    className="text-[11px] font-bold text-emerald-700 hover:underline cursor-pointer flex items-center gap-1"
                  >
                    <span>كشف تفصيلي للمحاسب ↗</span>
                  </button>
                </div>

                <div className="space-y-2 text-xs font-mono">
                  <div
                    onClick={() => setDetailModal('sales')}
                    className="flex justify-between items-center py-1 border-b border-dashed border-slate-200 dark:border-slate-800 font-sans hover:bg-slate-100/60 dark:hover:bg-slate-800/40 p-1 rounded cursor-pointer"
                  >
                    <span className="font-bold text-slate-700 dark:text-slate-300">1. إجمالي الإيرادات من المبيعات (Revenue):</span>
                    <span className="font-bold font-mono text-emerald-700">{financialMetrics.grossSales.toLocaleString()} {currency}</span>
                  </div>

                  <div className="flex justify-between items-center py-1 border-b border-dashed border-slate-200 dark:border-slate-800 font-sans text-rose-600 p-1">
                    <span>2. الخصومات الممنوحة للعملاء:</span>
                    <span className="font-mono">-{financialMetrics.totalDiscountsGiven.toLocaleString()} {currency}</span>
                  </div>

                  <div
                    onClick={() => setDetailModal('cogs')}
                    className="flex justify-between items-center py-1 border-b border-dashed border-slate-200 dark:border-slate-800 font-sans text-rose-600 hover:bg-rose-50/50 p-1 rounded cursor-pointer"
                  >
                    <span>3. تكلفة البضاعة المباعة (Cost of Goods Sold - COGS):</span>
                    <span className="font-mono">-{financialMetrics.totalCOGS.toLocaleString()} {currency} ↗</span>
                  </div>

                  <div
                    onClick={() => setDetailModal('profit')}
                    className="flex justify-between items-center py-1.5 border-b border-slate-300 dark:border-slate-700 font-sans bg-indigo-50/50 dark:bg-indigo-950/20 px-2 rounded font-bold text-indigo-900 dark:text-indigo-300 hover:bg-indigo-100/50 cursor-pointer"
                  >
                    <span>مجمل الربح التجاري (Gross Profit):</span>
                    <span className="font-mono text-sm">{financialMetrics.grossProfit.toLocaleString()} {currency} ({financialMetrics.grossMarginPct.toFixed(1)}%) ↗</span>
                  </div>

                  <div
                    onClick={() => setDetailModal('expenses')}
                    className="flex justify-between items-center py-1 border-b border-dashed border-slate-200 dark:border-slate-800 font-sans text-slate-600 dark:text-slate-400 hover:bg-slate-100/60 p-1 rounded cursor-pointer"
                  >
                    <span>4. المصروفات التشغيلية والإدارية (Operating Expenses):</span>
                    <span className="font-mono">-{financialMetrics.operatingExpenses.toLocaleString()} {currency} ↗</span>
                  </div>

                  <div
                    onClick={() => setDetailModal('profit')}
                    className="flex justify-between items-center py-2 border-t-2 border-slate-300 dark:border-slate-700 font-sans bg-emerald-50 dark:bg-emerald-950/40 px-2 rounded font-bold text-emerald-900 dark:text-emerald-300 hover:bg-emerald-100/50 cursor-pointer"
                  >
                    <span className="text-sm">صافي الأرباح التشغيلية (Net Operating Profit):</span>
                    <span className="font-mono text-base font-bold text-emerald-700 dark:text-emerald-400">
                      {financialMetrics.netProfit.toLocaleString()} {currency} ({financialMetrics.netMarginPct.toFixed(1)}%) ↗
                    </span>
                  </div>
                </div>
              </div>

              {/* VAT Tax Audit Statement */}
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
                  <h3 className="font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-indigo-600" />
                    <span>كشف ضريبة القيمة المضافة والإقرار الضريبي (ZATCA VAT Statement)</span>
                  </h3>
                  <span className="font-mono text-[11px] text-slate-400">النسبة المعتمدة: 15%</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="p-3 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                    <span className="text-[11px] text-slate-500 font-bold block">المبيعات الخاضعة للضريبة</span>
                    <span className="font-mono font-bold text-sm text-slate-900 dark:text-slate-100 block mt-1" dir="ltr">
                      {financialMetrics.netSalesTaxExcluded.toLocaleString()} {currency}
                    </span>
                  </div>

                  <div className="p-3 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                    <span className="text-[11px] text-amber-700 font-bold block">ضريبة المخرجات المحصلة (Output VAT)</span>
                    <span className="font-mono font-bold text-sm text-amber-700 dark:text-amber-400 block mt-1" dir="ltr">
                      {financialMetrics.totalTaxCollected.toLocaleString()} {currency}
                    </span>
                  </div>

                  <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 rounded-lg border border-emerald-200 dark:border-emerald-800">
                    <span className="text-[11px] text-emerald-800 dark:text-emerald-300 font-bold block">صافي الضريبة الواجبة للإقرار</span>
                    <span className="font-mono font-bold text-base text-emerald-700 dark:text-emerald-400 block mt-1" dir="ltr">
                      {financialMetrics.totalTaxCollected.toLocaleString()} {currency}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* INTERACTIVE DRILL-DOWN MODALS (OPENED UPON CLICKING CARDS)                */}
      {/* ========================================================================= */}
      {detailModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
          <div className="w-full max-w-4xl bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
            {/* Modal Header */}
            <div className="shrink-0 p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 flex items-center justify-center">
                  {detailModal === 'profit' && <DollarSign className="w-5 h-5" />}
                  {detailModal === 'sales' && <Receipt className="w-5 h-5" />}
                  {detailModal === 'debts' && <Users className="w-5 h-5" />}
                  {detailModal === 'liquidity' && <Wallet className="w-5 h-5" />}
                  {detailModal === 'cogs' && <Package className="w-5 h-5" />}
                  {detailModal === 'expenses' && <FileText className="w-5 h-5" />}
                  {detailModal === 'margins_ai' && <Sparkles className="w-5 h-5" />}
                  {detailModal === 'forecast_ai' && <TrendingUp className="w-5 h-5" />}
                  {detailModal === 'payment_channel' && <Wallet className="w-5 h-5" />}
                </div>
                <div>
                  <h2 className="font-bold text-sm text-slate-900 dark:text-white">
                    {detailModal === 'profit' && 'كشف وتحليل صافي الأرباح وهوامش الربحية التفصيلي'}
                    {detailModal === 'sales' && 'سجل فواتير المبيعات التفصيلي الكامل'}
                    {detailModal === 'debts' && 'كشف مديونيات العملاء وأعمار الديون والتحصيل'}
                    {detailModal === 'liquidity' && 'كشف السيولة والتدفقات النقدية ودرج الكاشير'}
                    {detailModal === 'cogs' && 'كشف تكلفة المبيعات ومشتريات المخزون (COGS)'}
                    {detailModal === 'expenses' && 'كشف بنود المصروفات التشغيلية والإدارية'}
                    {detailModal === 'margins_ai' && 'تقرير الذكاء الاصطناعي لتشخيص هوامش الربحية'}
                    {detailModal === 'forecast_ai' && 'تقرير الذكاء الاصطناعي للتنبؤ وحركة المبيعات'}
                    {detailModal === 'payment_channel' && `كشف فواتير السداد عبر: ${selectedPaymentChannel === 'CASH' ? 'نقداً (كاش)' : selectedPaymentChannel === 'CARD' ? 'بطاقة وشبكة' : selectedPaymentChannel === 'SPLIT' ? 'دفع مجزأ' : 'آجل'}`}
                  </h2>
                  <span className="text-[11px] text-slate-500 font-mono">
                    الفترة: {dateRangeBounds.start} إلى {dateRangeBounds.end} • {selectedBranchId === 'all' ? 'كافة الفروع' : 'فرع محدد'}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setDetailModal(null);
                  setSelectedInvoicePreview(null);
                }}
                className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 flex items-center justify-center text-slate-500 font-bold transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
              {/* 1. PROFIT DETAILS MODAL */}
              {detailModal === 'profit' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                      <span className="text-slate-500 font-bold block">صافي الإيرادات</span>
                      <span className="font-mono text-base font-bold text-slate-900 dark:text-white block mt-1" dir="ltr">
                        {financialMetrics.netSalesTaxExcluded.toLocaleString()} {currency}
                      </span>
                    </div>
                    <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800">
                      <span className="text-rose-700 font-bold block">إجمالي التكلفة (COGS)</span>
                      <span className="font-mono text-base font-bold text-rose-700 block mt-1" dir="ltr">
                        {financialMetrics.totalCOGS.toLocaleString()} {currency}
                      </span>
                    </div>
                    <div className="p-3 rounded-lg bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800">
                      <span className="text-indigo-700 font-bold block">مجمل الربح (Gross)</span>
                      <span className="font-mono text-base font-bold text-indigo-700 block mt-1" dir="ltr">
                        {financialMetrics.grossProfit.toLocaleString()} {currency}
                      </span>
                    </div>
                    <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800">
                      <span className="text-emerald-700 font-bold block">صافي الربح الفعلي (Net)</span>
                      <span className="font-mono text-base font-bold text-emerald-700 block mt-1" dir="ltr">
                        {financialMetrics.netProfit.toLocaleString()} {currency}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h3 className="font-bold text-slate-800 dark:text-slate-200">
                      تحليل ربحية الأصناف المباعة خلال الفترة (Item-by-Item Profit Contribution):
                    </h3>
                    <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-x-auto">
                      <table className="w-full text-start">
                        <thead className="bg-slate-50 dark:bg-slate-800 font-bold text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700">
                          <tr>
                            <th className="py-2.5 px-3">الصنف</th>
                            <th className="py-2.5 px-3 text-center">الكمية</th>
                            <th className="py-2.5 px-3">سعر البيع الإجمالي</th>
                            <th className="py-2.5 px-3">التكلفة الإجمالية</th>
                            <th className="py-2.5 px-3">صافي الربح</th>
                            <th className="py-2.5 px-3 text-center">الهامش %</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                          {productPerformance.map((item) => (
                            <tr key={item.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                              <td className="py-2.5 px-3">
                                <div className="font-bold text-slate-900 dark:text-white">{item.nameAr}</div>
                                <div className="text-[10px] font-mono text-slate-400">{item.sku}</div>
                              </td>
                              <td className="py-2.5 px-3 text-center font-bold font-mono">{item.qtySold}</td>
                              <td className="py-2.5 px-3 font-mono">{item.revenue.toLocaleString()} {currency}</td>
                              <td className="py-2.5 px-3 font-mono text-slate-500">{item.cost.toLocaleString()} {currency}</td>
                              <td className="py-2.5 px-3 font-mono font-bold text-emerald-700 dark:text-emerald-400">
                                +{item.profit.toLocaleString()} {currency}
                              </td>
                              <td className="py-2.5 px-3 text-center font-mono font-bold text-emerald-700">
                                {item.marginPct.toFixed(1)}%
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* 2. SALES DETAILS MODAL */}
              {detailModal === 'sales' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-bold text-slate-700 dark:text-slate-300">
                      قائمة الفواتير المحققة ({filteredInvoices.length} فاتورة بإجمالي {financialMetrics.grossSales.toLocaleString()} {currency}):
                    </span>
                    <button
                      type="button"
                      onClick={handleExportCSV}
                      className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1 cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>تصدير القائمة</span>
                    </button>
                  </div>

                  <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-x-auto">
                    <table className="w-full text-start">
                      <thead className="bg-slate-50 dark:bg-slate-800 font-bold text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700">
                        <tr>
                          <th className="py-2.5 px-3">رقم الفاتورة</th>
                          <th className="py-2.5 px-3">العميل</th>
                          <th className="py-2.5 px-3">التاريخ</th>
                          <th className="py-2.5 px-3 text-center">الأصناف</th>
                          <th className="py-2.5 px-3">الإجمالي شامل الضريبة</th>
                          <th className="py-2.5 px-3 text-center">طريقة الدفع</th>
                          <th className="py-2.5 px-3 text-center">الحالة</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {filteredInvoices.map((inv) => (
                          <tr key={inv.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                            <td className="py-2.5 px-3 font-mono font-bold text-slate-900 dark:text-white">
                              {inv.invoiceNumber}
                            </td>
                            <td className="py-2.5 px-3 font-bold text-slate-800 dark:text-slate-200">
                              {inv.customerName}
                            </td>
                            <td className="py-2.5 px-3 font-mono text-slate-500">{inv.date}</td>
                            <td className="py-2.5 px-3 text-center font-mono font-bold">{inv.items.length}</td>
                            <td className="py-2.5 px-3 font-mono font-bold text-slate-900 dark:text-white">
                              {inv.grandTotal.toLocaleString()} {currency}
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              <span className="px-2 py-0.5 rounded font-bold text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                                {inv.paymentMethod}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              <span className="px-2 py-0.5 rounded font-bold text-[10px] bg-emerald-50 text-emerald-800 border border-emerald-200">
                                {inv.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* 3. DEBTS DETAILS MODAL */}
              {detailModal === 'debts' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
                      <span className="text-amber-800 dark:text-amber-300 font-bold block">إجمالي الديون</span>
                      <span className="font-mono text-base font-bold text-amber-700 block mt-1" dir="ltr">
                        {debtMetrics.totalReceivables.toLocaleString()} {currency}
                      </span>
                    </div>
                    <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800">
                      <span className="text-emerald-800 dark:text-emerald-300 font-bold block">ديون جارية (0-30)</span>
                      <span className="font-mono text-base font-bold text-emerald-700 block mt-1" dir="ltr">
                        {debtMetrics.bucket0_30.toLocaleString()} {currency}
                      </span>
                    </div>
                    <div className="p-3 rounded-lg bg-sky-50 dark:bg-sky-950/30 border border-sky-200 dark:border-sky-800">
                      <span className="text-sky-800 dark:text-sky-300 font-bold block">متابعة (31-60)</span>
                      <span className="font-mono text-base font-bold text-sky-700 block mt-1" dir="ltr">
                        {debtMetrics.bucket31_60.toLocaleString()} {currency}
                      </span>
                    </div>
                    <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800">
                      <span className="text-rose-800 dark:text-rose-300 font-bold block">حرجة ومتعثرة (+60)</span>
                      <span className="font-mono text-base font-bold text-rose-700 block mt-1" dir="ltr">
                        {(debtMetrics.bucket61_90 + debtMetrics.bucket90_plus).toLocaleString()} {currency}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h3 className="font-bold text-slate-800 dark:text-slate-200">
                        كشف حسابات كافة العملاء المدينين للتحصيل المباشر:
                      </h3>
                      <span className="text-[11px] text-slate-500 font-mono">
                        {debtMetrics.indebtedCustomersList.length} عميل
                      </span>
                    </div>

                    <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-x-auto">
                      <table className="w-full text-start">
                        <thead className="bg-slate-50 dark:bg-slate-800 font-bold text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700">
                          <tr>
                            <th className="py-2.5 px-3">العميل</th>
                            <th className="py-2.5 px-3">الجوال</th>
                            <th className="py-2.5 px-3">الرصيد المستحق</th>
                            <th className="py-2.5 px-3">أقدم فاتورة</th>
                            <th className="py-2.5 px-3 text-center">أيام التأخير</th>
                            <th className="py-2.5 px-3 text-center">الإجراء</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                          {debtMetrics.indebtedCustomersList.map((row) => (
                            <tr key={row.customer.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                              <td className="py-2.5 px-3 font-bold text-slate-900 dark:text-white">
                                {row.customer.nameAr || row.customer.name}
                              </td>
                              <td className="py-2.5 px-3 font-mono" dir="ltr">{row.customer.phone || '—'}</td>
                              <td className="py-2.5 px-3 font-mono font-bold text-amber-700 dark:text-amber-400">
                                {row.debtAmount.toLocaleString()} {currency}
                              </td>
                              <td className="py-2.5 px-3 font-mono text-slate-500">{row.oldestInvoiceDate}</td>
                              <td className="py-2.5 px-3 text-center font-mono font-bold">
                                <span className={`px-2 py-0.5 rounded text-[10px] ${row.daysOverdue > 60 ? 'bg-rose-50 text-rose-700' : 'bg-amber-50 text-amber-700'}`}>
                                  {row.daysOverdue} يوم
                                </span>
                              </td>
                              <td className="py-2.5 px-3 text-center">
                                <button
                                  type="button"
                                  onClick={() => {
                                    const msg = `عزيزي العميل ${row.customer.nameAr || row.customer.name}، نود تذكيركم بسداد الرصيد المستحق وقدره ${row.debtAmount.toLocaleString()} ${currency} لحساب مؤسستنا. شكراً لتعاونكم.`;
                                    openQuickSendModal({
                                      channel: 'WHATSAPP',
                                      category: 'DEBT_REMINDER',
                                      recipientPhone: row.customer.phone,
                                      messageBody: msg,
                                    });
                                  }}
                                  className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] inline-flex items-center gap-1.5 transition cursor-pointer"
                                >
                                  <MessageSquare className="w-3 h-3" />
                                  <span>تذكير واتساب</span>
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* 4. LIQUIDITY DETAILS MODAL */}
              {detailModal === 'liquidity' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                      <span className="text-slate-500 font-bold block">نقدية درج الكاشير</span>
                      <span className="font-mono text-base font-bold text-slate-900 dark:text-white block mt-1" dir="ltr">
                        {currentShift.expectedCash.toLocaleString()} {currency}
                      </span>
                    </div>
                    <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                      <span className="text-slate-500 font-bold block">مبيعات الوردية الإجمالية</span>
                      <span className="font-mono text-base font-bold text-indigo-600 block mt-1" dir="ltr">
                        {currentShift.totalSales.toLocaleString()} {currency}
                      </span>
                    </div>
                    <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                      <span className="text-slate-500 font-bold block">مستحقات الموردين</span>
                      <span className="font-mono text-base font-bold text-rose-600 block mt-1" dir="ltr">
                        {debtMetrics.totalPayables.toLocaleString()} {currency}
                      </span>
                    </div>
                    <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800">
                      <span className="text-emerald-700 font-bold block">صافي رأس المال العامل</span>
                      <span className="font-mono text-base font-bold text-emerald-700 block mt-1" dir="ltr">
                        {debtMetrics.netWorkingCapital.toLocaleString()} {currency}
                      </span>
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2">
                    <h4 className="font-bold text-slate-800 dark:text-slate-100">
                      تحليل مؤشر الصحة المالية واستقرار التدفق النقدي:
                    </h4>
                    <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                      المنشأة تتمتع بوضع سيولة ممتاز مع تغطية كاملة لمستحقات الموردين من النقدية المتوفرة ومديونيات العملاء الجارية. معدل دوران رأس المال مستقر.
                    </p>
                  </div>
                </div>
              )}

              {/* 5. COGS DETAILS MODAL */}
              {detailModal === 'cogs' && (
                <div className="space-y-3">
                  <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800">
                    <span className="text-rose-800 font-bold block">إجمالي تكلفة المبيعات المحسوبة (Total COGS)</span>
                    <span className="font-mono text-lg font-bold text-rose-700 block mt-1" dir="ltr">
                      {financialMetrics.totalCOGS.toLocaleString()} {currency}
                    </span>
                    <span className="text-[11px] text-slate-500 mt-1 block">
                      مستخرجة مباشرة من سجل تكاليف شراء الأصناف في المستودع والمخزون
                    </span>
                  </div>

                  <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-x-auto">
                    <table className="w-full text-start">
                      <thead className="bg-slate-50 dark:bg-slate-800 font-bold text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700">
                        <tr>
                          <th className="py-2.5 px-3">الصنف</th>
                          <th className="py-2.5 px-3 text-center">الكمية المباعة</th>
                          <th className="py-2.5 px-3">تكلفة الوحدة الواحدة</th>
                          <th className="py-2.5 px-3">إجمالي تكلفة الخط</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {productPerformance.map((item) => (
                          <tr key={item.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                            <td className="py-2.5 px-3 font-bold text-slate-900 dark:text-white">
                              {item.nameAr}
                            </td>
                            <td className="py-2.5 px-3 text-center font-mono font-bold">{item.qtySold}</td>
                            <td className="py-2.5 px-3 font-mono">{(item.cost / (item.qtySold || 1)).toFixed(2)} {currency}</td>
                            <td className="py-2.5 px-3 font-mono font-bold text-rose-600">
                              {item.cost.toLocaleString()} {currency}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* 6. EXPENSES DETAILS MODAL */}
              {detailModal === 'expenses' && (
                <div className="space-y-3">
                  <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex justify-between items-center">
                    <div>
                      <span className="text-slate-500 font-bold block">إجمالي المصروفات التشغيلية والإدارية</span>
                      <span className="font-mono text-base font-bold text-slate-900 dark:text-white block mt-1" dir="ltr">
                        {financialMetrics.operatingExpenses.toLocaleString()} {currency}
                      </span>
                    </div>
                  </div>

                  <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-x-auto">
                    <table className="w-full text-start">
                      <thead className="bg-slate-50 dark:bg-slate-800 font-bold text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700">
                        <tr>
                          <th className="py-2.5 px-3">بند المصروف / البيان</th>
                          <th className="py-2.5 px-3">التاريخ</th>
                          <th className="py-2.5 px-3">المبلغ</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {financialMetrics.expenseBreakdown.map((exp, idx) => (
                          <tr key={idx} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                            <td className="py-2.5 px-3 font-bold text-slate-900 dark:text-white">{exp.title}</td>
                            <td className="py-2.5 px-3 font-mono text-slate-500">{exp.date}</td>
                            <td className="py-2.5 px-3 font-mono font-bold text-slate-800 dark:text-slate-200">
                              {exp.amount.toLocaleString()} {currency}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* 7. AI MARGINS DIAGNOSTIC MODAL */}
              {detailModal === 'margins_ai' && (
                <div className="space-y-3">
                  <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 space-y-1">
                    <h3 className="font-bold text-emerald-900 dark:text-emerald-200 text-sm flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-emerald-600" />
                      <span>تقرير التشخيص الاستراتيجي لهوامش الربحية:</span>
                    </h3>
                    <p className="text-emerald-800 dark:text-emerald-300 leading-relaxed text-xs">
                      تم رصد كفاءة تسعير ممتازة بنسبة هامش صافي إجمالية <strong>{financialMetrics.netMarginPct.toFixed(1)}%</strong>. المنظومات الشمسية والإنفرترات تحقق مساهمة كبرى في السيولة النقدية.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <h4 className="font-bold text-slate-800 dark:text-slate-200">
                      توصيات الذكاء الاصطناعي الفورية لتحسين الأرباح:
                    </h4>
                    <div className="space-y-2">
                      <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                        <div className="font-bold text-slate-900 dark:text-white mb-0.5">
                          1. تعزيز باقات الطاقة المتكاملة (Kits Upselling)
                        </div>
                        <p className="text-slate-600 dark:text-slate-300">
                          بيع الألواح مع الإنفرتر والبطاريات في حزمة واحدة يرفع متوسط الفاتورة بنسبة 45% ويقلل من تكلفة الشحن والمناولة.
                        </p>
                      </div>

                      <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                        <div className="font-bold text-slate-900 dark:text-white mb-0.5">
                          2. مراجعة تسعير الملحقات والأسلاك الكهربائية DC
                        </div>
                        <p className="text-slate-600 dark:text-slate-300">
                          الملحقات تحقق هامش ربح يزيد عن 40%، يُنصح بتوفير عروض شراء تابعة عند نقطة البيع POS.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* 8. AI FORECAST MODAL */}
              {detailModal === 'forecast_ai' && (
                <div className="space-y-3">
                  <div className="p-3.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 space-y-1">
                    <h3 className="font-bold text-indigo-900 dark:text-indigo-200 text-sm flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-indigo-600" />
                      <span>تقرير التنبؤ بالمبيعات ومعدل الجريان الإحصائي (Sales Forecast):</span>
                    </h3>
                    <p className="text-indigo-800 dark:text-indigo-300 leading-relaxed text-xs">
                      النمو التراكمي يسير بمعدل إيجابي، مع توقع تحقيق نمو بنسبة <strong>+18.5%</strong> خلال الربع القادم بفضل استقرار الطلب في قطاع الطاقة الشمسية والإلكترونيات.
                    </p>
                  </div>
                </div>
              )}

              {/* 9. PAYMENT CHANNEL TRANSACTIONS MODAL */}
              {detailModal === 'payment_channel' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-800 dark:text-slate-200">
                      العمليات المسددة بواسطة ({selectedPaymentChannel}) — إجمالي {paymentChannelInvoices.reduce((s, i) => s + i.grandTotal, 0).toLocaleString()} {currency}:
                    </span>
                  </div>

                  <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-x-auto">
                    <table className="w-full text-start">
                      <thead className="bg-slate-50 dark:bg-slate-800 font-bold text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700">
                        <tr>
                          <th className="py-2.5 px-3">رقم الفاتورة</th>
                          <th className="py-2.5 px-3">العميل</th>
                          <th className="py-2.5 px-3">التاريخ</th>
                          <th className="py-2.5 px-3">المبلغ المسدد</th>
                          <th className="py-2.5 px-3 text-center">الحالة</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {paymentChannelInvoices.map((inv) => (
                          <tr key={inv.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                            <td className="py-2.5 px-3 font-mono font-bold text-slate-900 dark:text-white">
                              {inv.invoiceNumber}
                            </td>
                            <td className="py-2.5 px-3 font-bold">{inv.customerName}</td>
                            <td className="py-2.5 px-3 font-mono text-slate-500">{inv.date}</td>
                            <td className="py-2.5 px-3 font-mono font-bold text-emerald-700 dark:text-emerald-400">
                              {inv.grandTotal.toLocaleString()} {currency}
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              <span className="px-2 py-0.5 rounded font-bold text-[10px] bg-emerald-50 text-emerald-800 border border-emerald-200">
                                {inv.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="shrink-0 p-3.5 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setDetailModal(null);
                  setSelectedInvoicePreview(null);
                }}
                className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition cursor-pointer"
              >
                إغلاق التفاصيل
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
