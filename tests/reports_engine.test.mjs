import test from 'node:test';
import assert from 'node:assert/strict';

// Pure logic: calculation of gross profit, net margin, and debt aging
function calculateFinancials(invoices, productCosts, operatingExpenses = 0) {
  let grossSales = 0;
  let netSalesTaxExcluded = 0;
  let totalTaxCollected = 0;
  let totalCOGS = 0;

  invoices.forEach((inv) => {
    grossSales += inv.grandTotal;
    netSalesTaxExcluded += inv.subtotal;
    totalTaxCollected += inv.taxAmount;

    inv.items.forEach((item) => {
      const unitCost = productCosts[item.productId] ?? item.unitPrice * 0.7;
      totalCOGS += unitCost * item.quantity;
    });
  });

  const grossProfit = Math.max(0, netSalesTaxExcluded - totalCOGS);
  const grossMarginPct = netSalesTaxExcluded > 0 ? (grossProfit / netSalesTaxExcluded) * 100 : 0;
  const netProfit = grossProfit - operatingExpenses;
  const netMarginPct = netSalesTaxExcluded > 0 ? (netProfit / netSalesTaxExcluded) * 100 : 0;

  return {
    grossSales,
    netSalesTaxExcluded,
    totalTaxCollected,
    totalCOGS,
    grossProfit,
    grossMarginPct: Number(grossMarginPct.toFixed(1)),
    netProfit,
    netMarginPct: Number(netMarginPct.toFixed(1)),
  };
}

function classifyDebtAging(daysOverdue) {
  if (daysOverdue <= 30) return '0-30';
  if (daysOverdue <= 60) return '31-60';
  if (daysOverdue <= 90) return '61-90';
  return '90+';
}

test('calculateFinancials computes accurate COGS, Gross Profit, and Net Margin', () => {
  const mockInvoices = [
    {
      grandTotal: 1150,
      subtotal: 1000,
      taxAmount: 150,
      items: [
        { productId: 'p1', quantity: 2, unitPrice: 500 },
      ],
    },
  ];
  const mockCosts = { p1: 300 }; // 2 * 300 = 600 cost
  const res = calculateFinancials(mockInvoices, mockCosts, 100);

  assert.equal(res.grossSales, 1150);
  assert.equal(res.netSalesTaxExcluded, 1000);
  assert.equal(res.totalCOGS, 600);
  assert.equal(res.grossProfit, 400); // 1000 - 600
  assert.equal(res.grossMarginPct, 40.0);
  assert.equal(res.netProfit, 300); // 400 - 100
  assert.equal(res.netMarginPct, 30.0);
});

test('classifyDebtAging correctly buckets overdue days', () => {
  assert.equal(classifyDebtAging(15), '0-30');
  assert.equal(classifyDebtAging(30), '0-30');
  assert.equal(classifyDebtAging(45), '31-60');
  assert.equal(classifyDebtAging(75), '61-90');
  assert.equal(classifyDebtAging(120), '90+');
});
