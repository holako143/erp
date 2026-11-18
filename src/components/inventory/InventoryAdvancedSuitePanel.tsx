import React, { useEffect, useMemo, useRef, useState } from 'react';
import * as d3 from 'd3';
import {
  AlertTriangle,
  ArrowRightLeft,
  BellRing,
  Box,
  Calendar,
  Camera,
  CheckCircle2,
  Clock,
  Flame,
  Layers,
  Plus,
  Printer,
  QrCode,
  ShieldCheck,
  Sparkles,
  Tag,
  Trash2,
  Wrench,
} from 'lucide-react';
import { useERP } from '../../context/ERPContext';
import {
  BatchExpiryWarningItem,
  BinAuditScanEntry,
  BinEfficiencyCell,
  ScheduledPrintQueueJob,
  SmartBinTagConfig,
  TrackedCompanyAsset,
  buildBinEfficiencyHeatmapMatrix,
  buildSmartBinTagForProduct,
  calculateBinTheoreticalCapacity,
  crossReferenceMultiBinScan,
  evaluateBatchExpiryDashboard,
  evaluateProximityShelfAlerts,
  generateBranchStockRebalanceSuggestions,
  performAssetCheckInOut,
} from '../../core/warehouseAdvancedEngine';
import { buildDocumentVerificationQrSvg, printAccountingPdfHtml } from '../../core/accountingPdfService';

export type InventoryAdvancedToolTab =
  | 'SMART_TAGS'
  | 'BIN_EFFICIENCY'
  | 'CAPACITY_PLANNER'
  | 'AUDIT_ASSISTANT'
  | 'PROXIMITY_ALERTS'
  | 'EXPIRY_TRACKER'
  | 'QR_ASSETS'
  | 'OPTIMIZATION_AI';

export interface InventoryAdvancedSuitePanelProps {
  initialToolTab?: InventoryAdvancedToolTab;
  onSelectDigitalCardProduct?: (productId: string) => void;
}

export const InventoryAdvancedSuitePanel: React.FC<InventoryAdvancedSuitePanelProps> = ({
  initialToolTab = 'SMART_TAGS',
  onSelectDigitalCardProduct,
}) => {
  const {
    products,
    updateProduct,
    salesInvoices,
    salesPipelineDocs,
    traceabilityEvents,
    barcodes,
    branchNodes,
    requestInterBranchTransfer,
    fixedAssets,
    currency,
    language,
    uiTheme,
    dispatchToastAndPushNotification,
  } = useERP();

  const isAr = language === 'ar';
  const isDark = uiTheme === 'obsidian_dark';

  const showToast = (msg: string, type: 'success' | 'info' | 'warning' = 'success') => {
    dispatchToastAndPushNotification({
      titleAr: 'منظومة المستودع الذكي',
      titleEn: 'Smart Warehouse Suite',
      messageAr: msg,
      messageEn: msg,
      severity: type,
      category: 'LOW_STOCK',
    });
  };

  const [activeTool, setActiveTool] = useState<InventoryAdvancedToolTab>(initialToolTab);

  // ==========================================================================
  // 1. Smart Inventory Tags & Print Queue Manager State
  // ==========================================================================
  const [selectedTagProductId, setSelectedTagProductId] = useState<string>(
    products[0]?.id || ''
  );
  const [tagLabelSize, setTagLabelSize] =
    useState<SmartBinTagConfig['labelSize']>('STANDARD_70x40');
  const [tagCopies, setTagCopies] = useState<number>(2);
  const [tagIncludePrice, setTagIncludePrice] = useState<boolean>(true);
  const [customBinOverride, setCustomBinOverride] = useState<string>('');

  const [printQueueItems, setPrintQueueItems] = useState<SmartBinTagConfig[]>(() =>
    products.slice(0, 3).map((p) => buildSmartBinTagForProduct(p, { copiesCount: 2 }))
  );
  const [pageFormat, setPageFormat] =
    useState<ScheduledPrintQueueJob['pageFormat']>('A4_GRID_2X5');
  const [marginMm, setMarginMm] = useState<number>(10);
  const [scheduleDateTime, setScheduleDateTime] = useState<string>(
    new Date(Date.now() + 3600_000).toISOString().slice(0, 16)
  );
  const [scheduledJobs, setScheduledJobs] = useState<ScheduledPrintQueueJob[]>([]);

  const selectedTagProduct = useMemo(
    () => products.find((p) => p.id === selectedTagProductId) || products[0] || null,
    [products, selectedTagProductId]
  );

  const currentSmartTag = useMemo(() => {
    if (!selectedTagProduct) return null;
    const base = buildSmartBinTagForProduct(selectedTagProduct, {
      labelSize: tagLabelSize,
      copiesCount: tagCopies,
      includePrice: tagIncludePrice,
    });
    if (customBinOverride.trim()) {
      base.binCode = customBinOverride.trim().toUpperCase();
      base.digitalCardDeepLink = `#inventory?item=${encodeURIComponent(selectedTagProduct.id)}&sku=${encodeURIComponent(selectedTagProduct.sku)}&bin=${encodeURIComponent(base.binCode)}`;
    }
    return base;
  }, [selectedTagProduct, tagLabelSize, tagCopies, tagIncludePrice, customBinOverride]);

  const handleAddTagToPrintQueue = () => {
    if (!currentSmartTag) return;
    setPrintQueueItems((prev) => {
      const idx = prev.findIndex(
        (i) => i.productId === currentSmartTag.productId && i.binCode === currentSmartTag.binCode
      );
      if (idx >= 0) {
        return prev.map((item, i) =>
          i === idx
            ? { ...item, copiesCount: item.copiesCount + currentSmartTag.copiesCount }
            : item
        );
      }
      return [...prev, currentSmartTag];
    });
    showToast(
      isAr
        ? `تمت إضافة ملصق الرف [${currentSmartTag.binCode}] إلى قائمة الطباعة المجمعة`
        : `Added bin tag [${currentSmartTag.binCode}] to Print Queue`,
      'success'
    );
  };

  const handleBatchAddAllBinsToQueue = () => {
    const batch = products.map((p) =>
      buildSmartBinTagForProduct(p, {
        labelSize: tagLabelSize,
        copiesCount: 1,
        includePrice: tagIncludePrice,
      })
    );
    setPrintQueueItems(batch);
    showToast(
      isAr
        ? `تمت الإضافة المجمعة لجميع أرفف الأصناف (${batch.length} رف) إلى طابور الطباعة`
        : `Batch-added all ${batch.length} bin items to the Print Queue`,
      'success'
    );
  };

  const handleSchedulePrintJob = () => {
    if (printQueueItems.length === 0) return;
    const totalLabels = printQueueItems.reduce((s, i) => s + i.copiesCount, 0);
    const newJob: ScheduledPrintQueueJob = {
      jobId: `PQ-${Date.now().toString().slice(-5)}`,
      jobTitle: isAr
        ? `دفعة ملصقات أرفف ذكية (${printQueueItems.length} صنف)`
        : `Smart Bin Tags Batch (${printQueueItems.length} bins)`,
      scheduledAtIso: scheduleDateTime,
      pageFormat,
      marginMm,
      columnGapMm: 4,
      rowGapMm: 4,
      status: 'SCHEDULED',
      items: [...printQueueItems],
      totalLabelsCount: totalLabels,
    };
    setScheduledJobs((prev) => [newJob, ...prev]);
    showToast(
      isAr
        ? `تمت جدولة مهمة الطباعة ${newJob.jobId} لـ ${totalLabels} ملصق QR بنجاح`
        : `Scheduled print job ${newJob.jobId} (${totalLabels} labels)`,
      'success'
    );
  };

  const handlePrintQueueNow = () => {
    if (printQueueItems.length === 0) return;
    const cardsHtml = printQueueItems
      .flatMap((item) =>
        Array.from({ length: item.copiesCount }).map(
          (_, copyIdx) => `
          <div style="border:2px solid #0f172a;border-radius:10px;padding:10px;display:flex;justify-content:space-between;align-items:center;gap:10px;background:#fff;page-break-inside:avoid;">
            <div>
              <div style="font-size:10px;font-family:monospace;background:#0f172a;color:#fff;display:inline-block;padding:2px 6px;border-radius:4px;font-weight:700;">BIN: ${item.binCode} (#${copyIdx + 1})</div>
              <div style="font-weight:800;font-size:13px;margin-top:4px;color:#0f172a;">${item.nameAr}</div>
              <div style="font-family:monospace;font-size:11px;color:#475569;">SKU: ${item.sku} · Stock: ${item.currentStock}</div>
              <div style="font-family:monospace;font-size:9px;color:#2563eb;margin-top:2px;">${item.digitalCardDeepLink}</div>
            </div>
            ${buildDocumentVerificationQrSvg(item.sku, item.binCode, item.digitalCardDeepLink, item.sellingPrice, 0, '#0f172a')}
          </div>`
        )
      )
      .join('');

    const html = `<!DOCTYPE html><html dir="${isAr ? 'rtl' : 'ltr'}"><head><meta charset="UTF-8"/><title>Smart Bin QR Labels</title></head><body style="padding:${marginMm}mm;font-family:sans-serif;"><div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">${cardsHtml}</div></body></html>`;
    printAccountingPdfHtml(html);
  };

  // ==========================================================================
  // 2. Inventory Bin Efficiency (D3.js Heatmap)
  // ==========================================================================
  const heatmapSummary = useMemo(
    () => buildBinEfficiencyHeatmapMatrix(products, salesInvoices, traceabilityEvents),
    [products, salesInvoices, traceabilityEvents]
  );
  const heatmapSvgRef = useRef<SVGSVGElement | null>(null);
  const [hoveredBinCell, setHoveredBinCell] = useState<BinEfficiencyCell | null>(null);

  useEffect(() => {
    if (activeTool !== 'BIN_EFFICIENCY') return;
    const svgEl = heatmapSvgRef.current;
    if (!svgEl) return;
    const svg = d3.select(svgEl);
    svg.selectAll('*').remove();

    const width = 680;
    const height = 280;
    const margin = { top: 32, right: 24, bottom: 36, left: 72 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    svg.attr('viewBox', `0 0 ${width} ${height}`).attr('height', height);

    const zones = heatmapSummary.zones.length > 0 ? heatmapSummary.zones : ['Z1', 'Z2', 'Z3'];
    const aisles =
      heatmapSummary.aisles.length > 0 ? heatmapSummary.aisles : ['A01', 'A02', 'A03', 'A04'];

    const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

    const xScale = d3.scaleBand<string>().domain(aisles).range([0, innerWidth]).padding(0.12);
    const yScale = d3.scaleBand<string>().domain(zones).range([0, innerHeight]).padding(0.16);

    const colorScale = d3
      .scaleSequential(d3.interpolateYlGnBu)
      .domain([0, 100]);

    const textColor = isDark ? '#cbd5e1' : '#334155';

    g.append('g')
      .call(d3.axisTop(xScale).tickSize(0))
      .call((sel) => {
        sel.select('.domain').remove();
        sel
          .selectAll('text')
          .attr('fill', textColor)
          .style('font-size', '11px')
          .style('font-weight', '700')
          .style('font-family', 'ui-monospace, monospace');
      });

    g.append('g')
      .call(d3.axisLeft(yScale).tickSize(0))
      .call((sel) => {
        sel.select('.domain').remove();
        sel
          .selectAll('text')
          .attr('fill', textColor)
          .style('font-size', '11px')
          .style('font-weight', '700')
          .style('font-family', 'ui-monospace, monospace');
      });

    // Build grid cells combining actual bin cells or synthetic zone-aisle slots
    const gridData: BinEfficiencyCell[] = [];
    zones.forEach((z) => {
      aisles.forEach((a) => {
        const match = heatmapSummary.cells.find((c) => c.zone === z && c.aisle === a);
        if (match) {
          gridData.push(match);
        } else {
          gridData.push({
            binCode: `${z}-${a}-S1`,
            zone: z,
            aisle: a,
            productId: '',
            sku: 'EMPTY-SLOT',
            productNameAr: isAr ? 'مساحة تخزين غير مستغلة' : 'Underutilized Storage Slot',
            productNameEn: 'Underutilized Storage Slot',
            movementFrequency: 0,
            unitsMoved: 0,
            stockQty: 0,
            utilizationScorePct: 8,
            efficiencyCategory: 'UNDERUTILIZED',
          });
        }
      });
    });

    const cellGroups = g
      .selectAll('g.bin-heat-cell')
      .data(gridData)
      .enter()
      .append('g')
      .attr('class', 'bin-heat-cell')
      .attr('transform', (d) => `translate(${xScale(d.aisle) ?? 0},${yScale(d.zone) ?? 0})`)
      .style('cursor', 'pointer')
      .on('mouseenter', (_ev, d) => setHoveredBinCell(d))
      .on('mouseleave', () => setHoveredBinCell(null));

    cellGroups
      .append('rect')
      .attr('width', xScale.bandwidth())
      .attr('height', yScale.bandwidth())
      .attr('rx', 8)
      .attr('fill', (d) =>
        d.efficiencyCategory === 'UNDERUTILIZED' || d.efficiencyCategory === 'DEAD_SPACE'
          ? isDark
            ? '#334155'
            : '#fef3c7'
          : colorScale(d.utilizationScorePct)
      )
      .attr('stroke', (d) =>
        d.efficiencyCategory === 'UNDERUTILIZED' ? '#f59e0b' : isDark ? '#1e293b' : '#cbd5e1'
      )
      .attr('stroke-width', 1.5);

    cellGroups
      .append('text')
      .attr('x', xScale.bandwidth() / 2)
      .attr('y', yScale.bandwidth() / 2 - 4)
      .attr('text-anchor', 'middle')
      .attr('fill', (d) => (d.utilizationScorePct > 55 ? '#ffffff' : '#0f172a'))
      .style('font-size', '11px')
      .style('font-weight', '800')
      .style('font-family', 'ui-monospace, monospace')
      .text((d) => `${d.zone}-${d.aisle}`);

    cellGroups
      .append('text')
      .attr('x', xScale.bandwidth() / 2)
      .attr('y', yScale.bandwidth() / 2 + 12)
      .attr('text-anchor', 'middle')
      .attr('fill', (d) => (d.utilizationScorePct > 55 ? '#e2e8f0' : '#475569'))
      .style('font-size', '10px')
      .style('font-family', 'ui-monospace, monospace')
      .text((d) => `${d.movementFrequency} moves (${d.utilizationScorePct}%)`);
  }, [activeTool, heatmapSummary, isDark, isAr]);

  // ==========================================================================
  // 3. Bin Capacity Planner State
  // ==========================================================================
  const [capProductId, setCapProductId] = useState<string>(products[0]?.id || '');
  const [shelfWidthCm, setShelfWidthCm] = useState<number>(120);
  const [shelfDepthCm, setShelfDepthCm] = useState<number>(80);
  const [shelfHeightCm, setShelfHeightCm] = useState<number>(90);
  const [maxLoadWeightKg, setMaxLoadWeightKg] = useState<number>(350);
  const [unitLengthCm, setUnitLengthCm] = useState<number>(25);
  const [unitWidthCm, setUnitWidthCm] = useState<number>(20);
  const [unitHeightCm, setUnitHeightCm] = useState<number>(18);
  const [unitWeightKg, setUnitWeightKg] = useState<number>(2.5);

  const selectedCapProduct = useMemo(
    () => products.find((p) => p.id === capProductId) || products[0],
    [products, capProductId]
  );

  const capacitySimulation = useMemo(() => {
    return calculateBinTheoreticalCapacity(
      {
        binCode: selectedCapProduct?.binLocation || 'Z1-A01-S1',
        shelfWidthCm,
        shelfDepthCm,
        shelfHeightCm,
        maxLoadWeightKg,
        safetyClearancePct: 5,
      },
      {
        productId: selectedCapProduct?.id || 'p1',
        sku: selectedCapProduct?.sku || 'SKU-01',
        nameAr: selectedCapProduct?.nameAr || 'صنف مخزني',
        nameEn: selectedCapProduct?.name || 'Inventory Item',
        unitLengthCm,
        unitWidthCm,
        unitHeightCm,
        unitWeightKg,
        currentStockQty: Number(selectedCapProduct?.stockQty) || 12,
      }
    );
  }, [
    selectedCapProduct,
    shelfWidthCm,
    shelfDepthCm,
    shelfHeightCm,
    maxLoadWeightKg,
    unitLengthCm,
    unitWidthCm,
    unitHeightCm,
    unitWeightKg,
  ]);

  // ==========================================================================
  // 4. Inventory Audit Assistant State
  // ==========================================================================
  const [auditEntries, setAuditEntries] = useState<BinAuditScanEntry[]>(() =>
    products.slice(0, 4).map((p, idx) => ({
      binCode: p.binLocation || `Z1-A0${idx + 1}-S1`,
      productId: p.id,
      physicalCountedQty:
        idx === 0
          ? Math.max(0, (Number(p.stockQty) || 10) - 2)
          : idx === 1
          ? (Number(p.stockQty) || 5) + 3
          : Number(p.stockQty) || 0,
    }))
  );
  const [auditScanInputBin, setAuditScanInputBin] = useState<string>('');
  const [auditScanCountQty, setAuditScanCountQty] = useState<number>(10);

  const auditReport = useMemo(
    () => crossReferenceMultiBinScan(auditEntries, products),
    [auditEntries, products]
  );

  const handleSimulateCameraBinScan = () => {
    const query = auditScanInputBin.trim().toLowerCase();
    const targetProd =
      products.find(
        (p) =>
          (p.binLocation || '').toLowerCase() === query ||
          p.sku.toLowerCase() === query ||
          p.barcode === query
      ) || products[0];
    if (!targetProd) return;

    const binCode = auditScanInputBin.trim().toUpperCase() || targetProd.binLocation || 'Z1-A01-S1';
    setAuditEntries((prev) => {
      const existing = prev.findIndex((e) => e.productId === targetProd.id);
      if (existing >= 0) {
        return prev.map((e, i) =>
          i === existing ? { ...e, binCode, physicalCountedQty: auditScanCountQty } : e
        );
      }
      return [{ binCode, productId: targetProd.id, physicalCountedQty: auditScanCountQty }, ...prev];
    });
    showToast(
      isAr
        ? `تم مسح الرف [${binCode}] ومطابقة الجرد الفعلي (${auditScanCountQty}) مع رصيد النظام`
        : `Scanned bin [${binCode}] with physical count ${auditScanCountQty}`,
      'info'
    );
  };

  const handleReconcileAuditDiscrepancy = (productId: string, physicalQty: number) => {
    const targetProd = products.find((p) => p.id === productId);
    if (targetProd) {
      updateProduct({ ...targetProd, stockQty: physicalQty });
    }
    showToast(
      isAr
        ? 'تم اعتماد الجرد الفعلي وتحديث رصيد الصنف في النظام'
        : 'Reconciled system stock balance to match physical count',
      'success'
    );
  };

  // ==========================================================================
  // 5. Inventory Proximity Alert Service State
  // ==========================================================================
  const [approachedBinCode, setApproachedBinCode] = useState<string>('Z1');
  const proximityAlerts = useMemo(
    () => evaluateProximityShelfAlerts(approachedBinCode, products, salesPipelineDocs),
    [approachedBinCode, products, salesPipelineDocs]
  );

  const handleTriggerMobileProximityPush = (binOrZone: string) => {
    setApproachedBinCode(binOrZone);
    const alerts = evaluateProximityShelfAlerts(binOrZone, products, salesPipelineDocs);
    if (alerts.length > 0) {
      showToast(isAr ? alerts[0].messageAr : alerts[0].messageEn, 'warning');
    } else {
      showToast(
        isAr
          ? `اقتراب من الرف [${binOrZone}]: جميع الأرصدة آمنة ولا توجد أوامر سحب معلقة.`
          : `Approached [${binOrZone}]: Stock levels healthy, no pending picks.`,
        'info'
      );
    }
  };

  // ==========================================================================
  // 6. Expiry Tracker State (Clearance Sales & Disposal)
  // ==========================================================================
  const [expiryOverrides, setExpiryOverrides] = useState<
    Record<string, 'CLEARANCE_SALE' | 'DISPOSED'>
  >({});

  const expiryItems = useMemo(() => {
    const raw = evaluateBatchExpiryDashboard(products, barcodes);
    // Ensure at least 2 batch-tracked items appear even if sample products had no expiryDate set
    if (raw.length === 0 && products.length > 0) {
      const fallback: BatchExpiryWarningItem[] = products.slice(0, 3).map((p, idx) => ({
        batchId: `batch-seed-${p.id}`,
        productId: p.id,
        sku: p.sku,
        nameAr: p.nameAr || p.name,
        nameEn: p.name || p.nameAr,
        batchNumber: p.batchNumber || `LOT-2025-0${idx + 1}`,
        expiryDate: new Date(Date.now() + (idx === 0 ? 5 : idx === 1 ? 22 : -3) * 86_400_000)
          .toISOString()
          .slice(0, 10),
        daysRemaining: idx === 0 ? 5 : idx === 1 ? 22 : -3,
        stockQty: Number(p.stockQty) || 8,
        unitCost: Number(p.costPrice) || 50,
        sellingPrice: Number(p.salePrice) || 85,
        atRiskValueCost: (Number(p.stockQty) || 8) * (Number(p.costPrice) || 50),
        status: idx === 0 ? 'CRITICAL_7_DAYS' : idx === 1 ? 'WARNING_30_DAYS' : 'EXPIRED',
        recommendedClearanceDiscountPct: idx === 0 ? 50 : idx === 1 ? 30 : 100,
        actionTaken: expiryOverrides[p.id] || 'NONE',
      }));
      return fallback;
    }
    return raw.map((item) => ({
      ...item,
      actionTaken: expiryOverrides[item.productId] || item.actionTaken || 'NONE',
    }));
  }, [products, barcodes, expiryOverrides]);

  const handleMarkForClearanceSale = (item: BatchExpiryWarningItem) => {
    const discountedPrice = Math.max(
      1,
      Math.round(item.sellingPrice * (1 - item.recommendedClearanceDiscountPct / 100))
    );
    const targetProd = products.find((p) => p.id === item.productId);
    if (targetProd) {
      updateProduct({ ...targetProd, salePrice: discountedPrice });
    }
    setExpiryOverrides((prev) => ({ ...prev, [item.productId]: 'CLEARANCE_SALE' }));
    showToast(
      isAr
        ? `تم تحويل الدفعة [${item.batchNumber}] إلى تصفية سريعة بخصم ${item.recommendedClearanceDiscountPct}% (السعر الجديد: ${discountedPrice} ${currency})`
        : `Marked batch [${item.batchNumber}] for ${item.recommendedClearanceDiscountPct}% Clearance Sale`,
      'success'
    );
  };

  const handleDisposeExpiredBatch = (item: BatchExpiryWarningItem) => {
    const targetProd = products.find((p) => p.id === item.productId);
    if (targetProd) {
      updateProduct({ ...targetProd, stockQty: 0 });
    }
    setExpiryOverrides((prev) => ({ ...prev, [item.productId]: 'DISPOSED' }));
    showToast(
      isAr
        ? `تم إتلاف الدفعة المنتهية [${item.batchNumber}] واستبعاد ${item.stockQty} وحدة من المخزون المتاح`
        : `Disposed expired batch [${item.batchNumber}] and wrote off ${item.stockQty} units`,
      'warning'
    );
  };

  // ==========================================================================
  // 7. QR Asset Tracking State (High-Value Assets Check-In/Out & Maintenance)
  // ==========================================================================
  const [trackedAssets, setTrackedAssets] = useState<TrackedCompanyAsset[]>(() => {
    if (fixedAssets && fixedAssets.length > 0) {
      return fixedAssets.map((fa, idx) => ({
        assetId: fa.id,
        assetTagCode: fa.assetCode || `AST-QR-${100 + idx}`,
        nameAr: fa.nameAr || fa.name,
        nameEn: fa.name || fa.nameAr,
        category: fa.category || 'High-Value Equipment',
        serialNumber: `SN-${fa.assetCode}-992${idx}`,
        locationBin: `VAULT-A0${idx + 1}`,
        purchaseValue: Number(fa.purchaseCost) || 45000,
        status: 'AVAILABLE',
        currentCustodian: 'المستودع المركزي (Available)',
        nextMaintenanceDate: new Date(Date.now() + 14 * 86_400_000).toISOString().slice(0, 10),
        qrPayloadUrl: `#inventory?asset=${encodeURIComponent(fa.id)}&tag=${encodeURIComponent(fa.assetCode)}`,
        history: [
          {
            logId: `init-${fa.id}`,
            action: 'INSPECTION_PASSED',
            holderName: 'إدارة الأصول والرقابة',
            department: 'Operations',
            timestampIso: new Date().toISOString(),
            notes: 'تم فحص الأصل وتوليد بطاقة QR الرقمية',
          },
        ],
      }));
    }
    return [
      {
        assetId: 'ast-forklift-01',
        assetTagCode: 'AST-QR-101',
        nameAr: 'رافعة شوكية كهربائية ذكية 3 طن',
        nameEn: 'Smart Electric Forklift 3T',
        category: 'Warehouse Heavy Machinery',
        serialNumber: 'SN-FL300-8821',
        locationBin: 'Z1-BAY-01',
        purchaseValue: 85000,
        status: 'AVAILABLE',
        currentCustodian: 'المستودع المركزي',
        nextMaintenanceDate: '2025-06-15',
        qrPayloadUrl: '#inventory?asset=ast-forklift-01&tag=AST-QR-101',
        history: [],
      },
      {
        assetId: 'ast-scanner-rig-02',
        assetTagCode: 'AST-QR-102',
        nameAr: 'وحدة مسح ليزر صناعية محمولة',
        nameEn: 'Industrial Laser Scanner Terminal',
        category: 'IT & Telemetry Hardware',
        serialNumber: 'SN-LSR-4410',
        locationBin: 'Z1-VAULT-02',
        purchaseValue: 14500,
        status: 'CHECKED_OUT',
        currentCustodian: 'خالد العتيبي (مشرف المستودع)',
        nextMaintenanceDate: '2025-05-28',
        qrPayloadUrl: '#inventory?asset=ast-scanner-rig-02&tag=AST-QR-102',
        history: [],
      },
    ];
  });

  const [custodianInput, setCustodianInput] = useState<string>('فهد السالم (مشرف التشغيل)');
  const [maintenanceDateInput, setMaintenanceDateInput] = useState<string>(
    new Date(Date.now() + 21 * 86_400_000).toISOString().slice(0, 10)
  );

  const handleAssetCheckInOutToggle = (asset: TrackedCompanyAsset) => {
    const nextAction = asset.status === 'CHECKED_OUT' ? 'CHECK_IN' : 'CHECK_OUT';
    const updated = performAssetCheckInOut(
      asset,
      nextAction,
      custodianInput,
      'Warehouse & Field Ops',
      nextAction === 'CHECK_OUT' ? 'استلام عهدة عبر مسح QR' : 'إرجاع العهدة للمستودع'
    );
    setTrackedAssets((prev) => prev.map((a) => (a.assetId === asset.assetId ? updated : a)));
    showToast(
      isAr
        ? nextAction === 'CHECK_OUT'
          ? `تم تسجيل إخراج الأصل [${asset.assetTagCode}] باسم: ${custodianInput}`
          : `تم تسجيل إرجاع الأصل [${asset.assetTagCode}] إلى المستودع المركزي`
        : `${nextAction === 'CHECK_OUT' ? 'Checked out' : 'Checked in'} asset [${asset.assetTagCode}]`,
      'success'
    );
  };

  const handleScheduleAssetMaintenance = (assetId: string) => {
    setTrackedAssets((prev) =>
      prev.map((a) =>
        a.assetId === assetId
          ? {
              ...a,
              status: 'IN_MAINTENANCE',
              nextMaintenanceDate: maintenanceDateInput,
              history: [
                {
                  logId: `maint-${Date.now()}`,
                  action: 'MAINTENANCE_SCHEDULED',
                  holderName: 'فريق الصيانة الوقائية',
                  department: 'Engineering',
                  timestampIso: new Date().toISOString(),
                  notes: `جدولة صيانة دورية بتاريخ ${maintenanceDateInput}`,
                },
                ...a.history,
              ],
            }
          : a
      )
    );
    showToast(
      isAr
        ? `تمت جدولة الصيانة الدورية للأصل بتاريخ ${maintenanceDateInput}`
        : `Scheduled asset maintenance for ${maintenanceDateInput}`,
      'info'
    );
  };

  // ==========================================================================
  // 8. Inventory Optimization Assistant (AI Inter-Branch Rebalancing)
  // ==========================================================================
  const rebalanceSuggestions = useMemo(
    () => generateBranchStockRebalanceSuggestions(products, salesInvoices, branchNodes),
    [products, salesInvoices, branchNodes]
  );

  const handleExecuteRebalanceTransfer = (sug: (typeof rebalanceSuggestions)[0]) => {
    requestInterBranchTransfer({
      sourceBranchId: sug.sourceBranchId,
      targetBranchId: sug.targetBranchId,
      productSku: sug.sku,
      requestedQty: sug.recommendedTransferQty,
      urgency: 'URGENT',
    });
    showToast(
      isAr
        ? `تم اعتماد أمر التحويل بين الفروع لـ ${sug.recommendedTransferQty} وحدة من "${sug.productNameAr}"`
        : `Created inter-branch transfer for ${sug.recommendedTransferQty} units of "${sug.productNameEn}"`,
      'success'
    );
  };

  const toolTabs: Array<{
    id: InventoryAdvancedToolTab;
    labelAr: string;
    labelEn: string;
    icon: React.FC<{ className?: string }>;
  }> = [
    { id: 'SMART_TAGS', labelAr: 'ملصقات QR وطابور الطباعة', labelEn: 'Smart Tags & Print Queue', icon: Tag },
    { id: 'BIN_EFFICIENCY', labelAr: 'كفاءة الأرفف (D3 Heatmap)', labelEn: 'Bin Efficiency (D3)', icon: Flame },
    { id: 'CAPACITY_PLANNER', labelAr: 'مخطط سعة الأرفف', labelEn: 'Bin Capacity Planner', icon: Box },
    { id: 'AUDIT_ASSISTANT', labelAr: 'مساعد الجرد بالكاميرا', labelEn: 'Audit Assistant', icon: Camera },
    { id: 'PROXIMITY_ALERTS', labelAr: 'تنبيهات الاقتراب الذكية', labelEn: 'Proximity Alerts', icon: BellRing },
    { id: 'EXPIRY_TRACKER', labelAr: 'مراقب الصلاحية والتصفية', labelEn: 'Expiry Tracker', icon: Clock },
    { id: 'QR_ASSETS', labelAr: 'تتبع الأصول بـ QR', labelEn: 'QR Asset Tracking', icon: QrCode },
    { id: 'OPTIMIZATION_AI', labelAr: 'مساعد موازنة الفروع (AI)', labelEn: 'AI Stock Optimization', icon: Sparkles },
  ];

  return (
    <section
      data-testid="inventory-advanced-suite-panel"
      className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-4 sm:p-5 space-y-4"
    >
      {/* Suite Sub-Navigation Pills */}
      <div className="flex flex-wrap items-center gap-1.5 pb-3 border-b border-slate-100 dark:border-slate-800">
        {toolTabs.map((t) => {
          const Icon = t.icon;
          const active = activeTool === t.id;
          return (
            <button
              key={t.id}
              type="button"
              data-testid={`inv-suite-tab-${t.id}`}
              onClick={() => setActiveTool(t.id)}
              className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                active
                  ? 'bg-blue-600 text-white shadow-2xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              <Icon className="w-3.5 h-3.5 shrink-0" />
              <span>{isAr ? t.labelAr : t.labelEn}</span>
            </button>
          );
        })}
      </div>

      {/* 1. SMART INVENTORY TAGS & PRINT QUEUE MANAGER */}
      {activeTool === 'SMART_TAGS' && (
        <div
          data-testid="inv-smart-tags-and-print-queue"
          className="grid grid-cols-1 xl:grid-cols-12 gap-4"
        >
          {/* Left: Tag Generator & Deep Link to Digital Card */}
          <div className="xl:col-span-5 p-4 rounded-xl bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800 space-y-3">
            <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
              <Tag className="w-4 h-4 text-blue-600" />
              <span>
                {isAr
                  ? 'توليد ملصق QR مخصص للرف مرتبط بالبطاقة الرقمية للصنف'
                  : 'Customizable Shelf Bin QR Label Generator'}
              </span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                  {isAr ? 'اختر الصنف المخزني' : 'Select Inventory Item'}
                </label>
                <select
                  data-testid="smart-tag-product-select"
                  value={selectedTagProductId}
                  onChange={(e) => setSelectedTagProductId(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold"
                >
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.sku} — {isAr ? p.nameAr : p.name} ({p.binLocation || 'A-01'})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                  {isAr ? 'كود الرف (Bin Location)' : 'Shelf Bin Code'}
                </label>
                <input
                  type="text"
                  data-testid="smart-tag-bin-input"
                  placeholder={selectedTagProduct?.binLocation || 'Z1-A01-S1'}
                  value={customBinOverride}
                  onChange={(e) => setCustomBinOverride(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-mono"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                  {isAr ? 'مقاس الملصق' : 'Label Size'}
                </label>
                <select
                  value={tagLabelSize}
                  onChange={(e) =>
                    setTagLabelSize(e.target.value as SmartBinTagConfig['labelSize'])
                  }
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
                >
                  <option value="SMALL_50x25">50×25 mm (Small Bin)</option>
                  <option value="STANDARD_70x40">70×40 mm (Standard Shelf)</option>
                  <option value="SHELF_RAIL_100x50">100×50 mm (Pallet Rack)</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                  {isAr ? 'عدد النسخ للرف' : 'Copies Count'}
                </label>
                <input
                  type="number"
                  min={1}
                  max={50}
                  value={tagCopies}
                  onChange={(e) => setTagCopies(Math.max(1, Number(e.target.value) || 1))}
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-mono"
                />
              </div>
            </div>

            {currentSmartTag && (
              <div
                data-testid="smart-bin-tag-live-card"
                className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border-2 border-slate-900 dark:border-slate-600 flex items-center justify-between gap-3"
              >
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded bg-slate-900 text-white font-mono text-[11px] font-bold">
                      BIN: {currentSmartTag.binCode}
                    </span>
                    <span className="text-[11px] font-mono text-slate-500">
                      {currentSmartTag.labelSize}
                    </span>
                  </div>
                  <div className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">
                    {isAr ? currentSmartTag.nameAr : currentSmartTag.nameEn}
                  </div>
                  <div className="text-xs font-mono text-slate-600 dark:text-slate-400">
                    SKU: {currentSmartTag.sku} · Stock: {currentSmartTag.currentStock}
                  </div>
                  <button
                    type="button"
                    data-testid="smart-tag-open-digital-card-link"
                    onClick={() => {
                      if (onSelectDigitalCardProduct) {
                        onSelectDigitalCardProduct(currentSmartTag.productId);
                      }
                      showToast(
                        isAr
                          ? `تم فتح البطاقة الرقمية للصنف [${currentSmartTag.sku}] عبر رابط QR الذكي`
                          : `Opened digital inventory card for [${currentSmartTag.sku}]`,
                        'info'
                      );
                    }}
                    className="text-[11px] font-mono text-blue-600 dark:text-blue-400 underline cursor-pointer block truncate"
                  >
                    {currentSmartTag.digitalCardDeepLink}
                  </button>
                </div>

                <div
                  className="shrink-0"
                  dangerouslySetInnerHTML={{
                    __html: buildDocumentVerificationQrSvg(
                      currentSmartTag.sku,
                      currentSmartTag.binCode,
                      currentSmartTag.digitalCardDeepLink,
                      currentSmartTag.sellingPrice,
                      0,
                      '#0f172a'
                    ),
                  }}
                />
              </div>
            )}

            <div className="flex flex-wrap items-center gap-2 pt-1">
              <button
                type="button"
                data-testid="add-tag-to-print-queue-btn"
                onClick={handleAddTagToPrintQueue}
                className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{isAr ? 'إضافة لطابور الطباعة' : 'Add to Print Queue'}</span>
              </button>

              <button
                type="button"
                data-testid="batch-add-all-bins-btn"
                onClick={handleBatchAddAllBinsToQueue}
                className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900 dark:bg-slate-800 text-white text-xs font-bold cursor-pointer"
              >
                <Layers className="w-3.5 h-3.5" />
                <span>{isAr ? 'إضافة مجمعة لكل الأرفف' : 'Batch Add All Bins'}</span>
              </button>
            </div>
          </div>

          {/* Right: Print Queue Manager & Page Alignment Preview */}
          <div
            data-testid="smart-tags-print-queue-manager"
            className="xl:col-span-7 p-4 rounded-xl bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800 space-y-3"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                <Printer className="w-4 h-4 text-blue-600" />
                <span>
                  {isAr
                    ? `مدير طابور الطباعة المجمعة ومعاينة محاذاة الصفحة (${printQueueItems.length} أرفف)`
                    : `Print Queue Manager & Page Alignment Preview (${printQueueItems.length} bins)`}
                </span>
              </h4>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  data-testid="schedule-print-queue-btn"
                  onClick={handleSchedulePrintJob}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold cursor-pointer"
                >
                  <Calendar className="w-3.5 h-3.5" />
                  <span>{isAr ? 'جدولة الطباعة' : 'Schedule Batch'}</span>
                </button>
                <button
                  type="button"
                  data-testid="print-queue-now-btn"
                  onClick={handlePrintQueueNow}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>{isAr ? 'طباعة القائمة الآن' : 'Print Sheet Now'}</span>
                </button>
              </div>
            </div>

            {/* Alignment & Schedule Controls */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <div>
                <label className="block text-[10.5px] font-bold text-slate-500 mb-1">
                  {isAr ? 'تخطيط ورقة الطباعة' : 'Sheet Layout Format'}
                </label>
                <select
                  value={pageFormat}
                  onChange={(e) =>
                    setPageFormat(e.target.value as ScheduledPrintQueueJob['pageFormat'])
                  }
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
                >
                  <option value="A4_GRID_2X5">A4 Sheet (2×5 Grid)</option>
                  <option value="THERMAL_ROLL_CONTINUOUS">Thermal Roll (1 Column)</option>
                  <option value="A4_SHELF_STRIPS">A4 Shelf Strips (3 Columns)</option>
                </select>
              </div>
              <div>
                <label className="block text-[10.5px] font-bold text-slate-500 mb-1">
                  {isAr ? 'هامش محاذاة الصفحة (mm)' : 'Page Alignment Margin (mm)'}
                </label>
                <input
                  type="number"
                  min={2}
                  max={25}
                  value={marginMm}
                  onChange={(e) => setMarginMm(Number(e.target.value) || 10)}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-mono"
                />
              </div>
              <div>
                <label className="block text-[10.5px] font-bold text-slate-500 mb-1">
                  {isAr ? 'موعد جدولة الطباعة' : 'Scheduled Execution Time'}
                </label>
                <input
                  type="datetime-local"
                  value={scheduleDateTime}
                  onChange={(e) => setScheduleDateTime(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-mono"
                />
              </div>
            </div>

            {/* Page Alignment Visual Sheet Preview */}
            <div
              data-testid="print-queue-alignment-preview"
              style={{ padding: `${Math.min(24, marginMm + 4)}px` }}
              className="rounded-xl border-2 border-dashed border-blue-400/70 bg-white dark:bg-slate-900 min-h-[210px]"
            >
              <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 mb-2">
                <span>
                  PAGE ALIGNMENT PREVIEW · {pageFormat} · MARGIN {marginMm}mm
                </span>
                <span>
                  TOTAL LABELS: {printQueueItems.reduce((s, i) => s + i.copiesCount, 0)}
                </span>
              </div>

              <div
                className={`grid gap-2 ${
                  pageFormat === 'THERMAL_ROLL_CONTINUOUS'
                    ? 'grid-cols-1 max-w-xs mx-auto'
                    : pageFormat === 'A4_SHELF_STRIPS'
                    ? 'grid-cols-3'
                    : 'grid-cols-2'
                }`}
              >
                {printQueueItems.map((item) => (
                  <div
                    key={`${item.productId}-${item.binCode}`}
                    className="p-2 rounded-lg border border-slate-300 dark:border-slate-700 flex items-center justify-between gap-2 bg-slate-50/70 dark:bg-slate-950/60"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-blue-600 text-white">
                          {item.binCode}
                        </span>
                        <span className="text-[10px] font-mono text-slate-500">
                          ×{item.copiesCount}
                        </span>
                      </div>
                      <div className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate mt-0.5">
                        {isAr ? item.nameAr : item.nameEn}
                      </div>
                      <div className="text-[10px] font-mono text-slate-500">{item.sku}</div>
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        setPrintQueueItems((prev) =>
                          prev.filter(
                            (p) => !(p.productId === item.productId && p.binCode === item.binCode)
                          )
                        )
                      }
                      className="p-1 text-slate-400 hover:text-red-600 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {scheduledJobs.length > 0 && (
              <div className="space-y-1.5 pt-1">
                <div className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                  {isAr ? 'مهام الطباعة المجدولة:' : 'Scheduled Print Jobs:'}
                </div>
                {scheduledJobs.map((job) => (
                  <div
                    key={job.jobId}
                    data-testid={`scheduled-print-job-${job.jobId}`}
                    className="flex items-center justify-between px-3 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 text-xs"
                  >
                    <span className="font-bold text-emerald-900 dark:text-emerald-200">
                      {job.jobId} — {job.jobTitle} ({job.totalLabelsCount} QR labels)
                    </span>
                    <span className="font-mono text-[11px] text-emerald-700 dark:text-emerald-400">
                      {job.scheduledAtIso.replace('T', ' ')} · {job.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 2. INVENTORY BIN EFFICIENCY (D3.JS HEATMAP) */}
      {activeTool === 'BIN_EFFICIENCY' && (
        <div
          data-testid="inv-bin-efficiency-d3-widget"
          className="space-y-4"
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                <Flame className="w-4 h-4 text-amber-500" />
                <span>
                  {isAr
                    ? 'خريطة الكفاءة الحرارية لحركة الأصناف في الأرفف (D3.js Bin Efficiency Heatmap)'
                    : 'D3.js Inventory Bin Efficiency & Movement Frequency Heatmap'}
                </span>
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {isAr
                  ? 'تحليل تكرار حركة الأصناف عبر الممرات والمناطق لتحديد المساحات التخزينية غير المستغلة'
                  : 'Visualizes item movement frequency across warehouse zones and aisles to identify underutilized storage space'}
              </p>
            </div>

            <div className="flex items-center gap-3 text-xs font-mono">
              <span className="px-2.5 py-1 rounded-lg bg-emerald-100 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 font-bold">
                {isAr ? 'مرتفعة الحركة:' : 'High Velocity:'} {heatmapSummary.highVelocityBinsCount}
              </span>
              <span className="px-2.5 py-1 rounded-lg bg-amber-100 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 font-bold">
                {isAr ? 'غير مستغلة:' : 'Underutilized:'} {heatmapSummary.underutilizedBinsCount}
              </span>
              <span className="px-2.5 py-1 rounded-lg bg-blue-100 dark:bg-blue-950/50 text-blue-800 dark:text-blue-300 font-bold">
                {isAr ? 'متوسط الإشغال:' : 'Avg Utilization:'} {heatmapSummary.avgUtilizationPct}%
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 items-start">
            <div className="xl:col-span-8 p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 overflow-x-auto">
              <svg
                ref={heatmapSvgRef}
                data-testid="d3-bin-efficiency-svg"
                className="w-full min-w-[520px] block"
              />
            </div>

            <div className="xl:col-span-4 p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50 space-y-3">
              <div className="text-xs font-bold text-slate-800 dark:text-slate-200">
                {isAr
                  ? 'تفاصيل الرف والتوصية التشغيلية'
                  : 'Bin Telemetry & Space Utilization Insight'}
              </div>

              {hoveredBinCell ? (
                <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-blue-300 dark:border-blue-800 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-xs text-blue-600">
                      {hoveredBinCell.binCode}
                    </span>
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800">
                      {hoveredBinCell.efficiencyCategory}
                    </span>
                  </div>
                  <div className="text-sm font-bold text-slate-900 dark:text-slate-100">
                    {isAr ? hoveredBinCell.productNameAr : hoveredBinCell.productNameEn}
                  </div>
                  <div className="text-xs font-mono text-slate-600 dark:text-slate-400">
                    SKU: {hoveredBinCell.sku} · Moves: {hoveredBinCell.movementFrequency} · Units:{' '}
                    {hoveredBinCell.unitsMoved}
                  </div>
                </div>
              ) : (
                <p className="text-xs text-slate-500">
                  {isAr
                    ? 'مرر المؤشر فوق أي خلية في خريطة D3 لعرض معدل دوران الرف.'
                    : 'Hover over any bin cell in the D3 heatmap to inspect velocity.'}
                </p>
              )}

              <div className="space-y-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                <div className="text-[11px] font-bold text-amber-700 dark:text-amber-400">
                  {isAr
                    ? 'الأرفف غير المستغلة الموصى بإعادة تخصيصها:'
                    : 'Underutilized Storage Bins Identified:'}
                </div>
                {heatmapSummary.cells
                  .filter(
                    (c) =>
                      c.efficiencyCategory === 'UNDERUTILIZED' ||
                      c.efficiencyCategory === 'DEAD_SPACE'
                  )
                  .slice(0, 4)
                  .map((cell) => (
                    <div
                      key={cell.binCode}
                      className="flex items-center justify-between text-xs p-2 rounded-lg bg-white dark:bg-slate-900 border border-amber-200/70 dark:border-slate-800"
                    >
                      <span className="font-mono font-bold">{cell.binCode}</span>
                      <span className="truncate max-w-[140px]">
                        {isAr ? cell.productNameAr : cell.productNameEn}
                      </span>
                      <span className="text-[10px] font-mono text-amber-600">
                        {cell.movementFrequency} moves
                      </span>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. BIN CAPACITY PLANNER */}
      {activeTool === 'CAPACITY_PLANNER' && (
        <div
          data-testid="inv-bin-capacity-planner"
          className="grid grid-cols-1 xl:grid-cols-12 gap-4"
        >
          <div className="xl:col-span-5 p-4 rounded-xl bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800 space-y-3">
            <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
              <Box className="w-4 h-4 text-blue-600" />
              <span>
                {isAr
                  ? 'محاكاة أبعاد الرف والمنتج (Bin Capacity Planner)'
                  : 'Physical Dimension & Shelf Capacity Simulator'}
              </span>
            </h4>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                {isAr ? 'اختر الصنف المراد محاكاة تخزينه' : 'Select Product to Simulate'}
              </label>
              <select
                value={capProductId}
                onChange={(e) => setCapProductId(e.target.value)}
                className="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold"
              >
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.sku} — {isAr ? p.nameAr : p.name} (Stock: {p.stockQty})
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="block text-[10.5px] font-bold text-slate-500">
                  {isAr ? 'عرض الرف (سم)' : 'Shelf Width (cm)'}
                </label>
                <input
                  type="number"
                  data-testid="cap-shelf-width-input"
                  value={shelfWidthCm}
                  onChange={(e) => setShelfWidthCm(Math.max(10, Number(e.target.value) || 100))}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-mono"
                />
              </div>
              <div>
                <label className="block text-[10.5px] font-bold text-slate-500">
                  {isAr ? 'عمق الرف (سم)' : 'Shelf Depth (cm)'}
                </label>
                <input
                  type="number"
                  value={shelfDepthCm}
                  onChange={(e) => setShelfDepthCm(Math.max(10, Number(e.target.value) || 80))}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-mono"
                />
              </div>
              <div>
                <label className="block text-[10.5px] font-bold text-slate-500">
                  {isAr ? 'ارتفاع الرف (سم)' : 'Shelf Height (cm)'}
                </label>
                <input
                  type="number"
                  value={shelfHeightCm}
                  onChange={(e) => setShelfHeightCm(Math.max(10, Number(e.target.value) || 90))}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-mono"
                />
              </div>
              <div>
                <label className="block text-[10.5px] font-bold text-slate-500">
                  {isAr ? 'أقصى حمولة للرف (كجم)' : 'Max Shelf Load (kg)'}
                </label>
                <input
                  type="number"
                  value={maxLoadWeightKg}
                  onChange={(e) => setMaxLoadWeightKg(Math.max(10, Number(e.target.value) || 300))}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
              <div>
                <label className="block text-[10px] font-bold text-slate-500">
                  {isAr ? 'طول الوحدة (سم)' : 'Unit L (cm)'}
                </label>
                <input
                  type="number"
                  value={unitLengthCm}
                  onChange={(e) => setUnitLengthCm(Math.max(1, Number(e.target.value) || 10))}
                  className="w-full px-2 py-1 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-mono"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500">
                  {isAr ? 'عرض الوحدة (سم)' : 'Unit W (cm)'}
                </label>
                <input
                  type="number"
                  value={unitWidthCm}
                  onChange={(e) => setUnitWidthCm(Math.max(1, Number(e.target.value) || 10))}
                  className="w-full px-2 py-1 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-mono"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500">
                  {isAr ? 'ارتفاع الوحدة (سم)' : 'Unit H (cm)'}
                </label>
                <input
                  type="number"
                  value={unitHeightCm}
                  onChange={(e) => setUnitHeightCm(Math.max(1, Number(e.target.value) || 10))}
                  className="w-full px-2 py-1 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-mono"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500">
                  {isAr ? 'وزن الوحدة (كجم)' : 'Weight (kg)'}
                </label>
                <input
                  type="number"
                  step="0.5"
                  value={unitWeightKg}
                  onChange={(e) => setUnitWeightKg(Math.max(0.1, Number(e.target.value) || 1))}
                  className="w-full px-2 py-1 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-mono"
                />
              </div>
            </div>
          </div>

          <div className="xl:col-span-7 p-4 rounded-xl bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                <div className="text-[11px] text-slate-500">
                  {isAr ? 'السعة القصوى النظرية للرف' : 'Theoretical Max Capacity'}
                </div>
                <div
                  data-testid="cap-theoretical-max-readout"
                  className="text-lg font-extrabold font-mono text-blue-600 mt-0.5"
                >
                  {capacitySimulation.theoreticalMaxCapacity} {isAr ? 'وحدة' : 'units'}
                </div>
              </div>

              <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                <div className="text-[11px] text-slate-500">
                  {isAr ? 'توزيع المصفوفة (X×Y×Z)' : '3D Grid Matrix'}
                </div>
                <div className="text-sm font-bold font-mono text-slate-900 dark:text-slate-100 mt-1">
                  {capacitySimulation.unitsPerRowX} × {capacitySimulation.unitsPerDepthY} ×{' '}
                  {capacitySimulation.unitsPerHeightZ}
                </div>
              </div>

              <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                <div className="text-[11px] text-slate-500">
                  {isAr ? 'نسبة إشغال الحجم' : 'Volume Utilization'}
                </div>
                <div className="text-base font-bold font-mono text-emerald-600 mt-0.5">
                  {capacitySimulation.volumeUtilizationPct}%
                </div>
              </div>

              <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                <div className="text-[11px] text-slate-500">
                  {isAr ? 'المساحة المتبقية المتاحة' : 'Remaining Capacity'}
                </div>
                <div className="text-base font-bold font-mono text-slate-900 dark:text-slate-100 mt-0.5">
                  +{capacitySimulation.remainingUnitsCapacity} {isAr ? 'وحدة' : 'units'}
                </div>
              </div>
            </div>

            {/* Visual Shelf Slot Matrix Representation */}
            <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2">
              <div className="flex items-center justify-between text-xs font-bold">
                <span>
                  {isAr
                    ? `محاكاة صفوف الرف [${capacitySimulation.binCode}] (${capacitySimulation.limitingFactor})`
                    : `Visual Shelf Slot Matrix [${capacitySimulation.binCode}]`}
                </span>
                <span className="font-mono text-blue-600">
                  {capacitySimulation.currentStockQty} / {capacitySimulation.theoreticalMaxCapacity}
                </span>
              </div>

              <div className="grid grid-cols-8 sm:grid-cols-12 gap-1.5 pt-1">
                {Array.from({
                  length: Math.min(48, Math.max(12, capacitySimulation.theoreticalMaxCapacity)),
                }).map((_, slotIdx) => {
                  const occupied = slotIdx < capacitySimulation.currentStockQty;
                  return (
                    <div
                      key={slotIdx}
                      className={`h-6 rounded border text-[9px] font-mono flex items-center justify-center ${
                        occupied
                          ? 'bg-blue-600 border-blue-700 text-white font-bold'
                          : 'bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-400'
                      }`}
                    >
                      {slotIdx + 1}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 4. INVENTORY AUDIT ASSISTANT (MULTI-BIN CAMERA CROSS-REFERENCE) */}
      {activeTool === 'AUDIT_ASSISTANT' && (
        <div
          data-testid="inv-audit-assistant-panel"
          className="space-y-4"
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                <Camera className="w-4 h-4 text-blue-600" />
                <span>
                  {isAr
                    ? 'مساعد التدقيق والجرد بالكاميرا (Inventory Audit Assistant)'
                    : 'Camera-Assisted Multi-Bin Inventory Audit Assistant'}
                </span>
              </h4>
              <p className="text-xs text-slate-500">
                {isAr
                  ? 'مسح متعدد للأرفف ومطابقة فورية للعدد الفعلي مع أرصدة النظام لكشف الفروقات في الوقت الفعلي'
                  : 'Scan multiple bin locations and cross-reference physical counts against system stock balances in real time'}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="text"
                data-testid="audit-scan-bin-input"
                placeholder={isAr ? 'كود الرف أو SKU...' : 'Bin or SKU...'}
                value={auditScanInputBin}
                onChange={(e) => setAuditScanInputBin(e.target.value)}
                className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-mono"
              />
              <input
                type="number"
                data-testid="audit-scan-qty-input"
                value={auditScanCountQty}
                onChange={(e) => setAuditScanCountQty(Math.max(0, Number(e.target.value) || 0))}
                className="w-20 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-mono"
              />
              <button
                type="button"
                data-testid="audit-scan-submit-btn"
                onClick={handleSimulateCameraBinScan}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-bold cursor-pointer"
              >
                <Camera className="w-3.5 h-3.5" />
                <span>{isAr ? 'مسح ومطابقة الرف' : 'Scan & Cross-Ref'}</span>
              </button>
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                  <th className="p-2.5 text-start">{isAr ? 'موقع الرف' : 'Bin Location'}</th>
                  <th className="p-2.5 text-start">{isAr ? 'الصنف (SKU)' : 'Item (SKU)'}</th>
                  <th className="p-2.5 text-center">{isAr ? 'رصيد النظام' : 'System Stock'}</th>
                  <th className="p-2.5 text-center">{isAr ? 'الجرد الفعلي الممسوح' : 'Physical Count'}</th>
                  <th className="p-2.5 text-center">{isAr ? 'الفرق (Variance)' : 'Variance'}</th>
                  <th className="p-2.5 text-center">{isAr ? 'الحالة والإجراء' : 'Status / Action'}</th>
                </tr>
              </thead>
              <tbody>
                {auditReport.rows.map((row) => (
                  <tr
                    key={`${row.binCode}-${row.productId}`}
                    className={`border-t border-slate-100 dark:border-slate-800 ${
                      row.status !== 'MATCHED' ? 'bg-red-50/40 dark:bg-red-950/15' : ''
                    }`}
                  >
                    <td className="p-2.5 font-mono font-bold">{row.binCode}</td>
                    <td className="p-2.5 font-semibold">
                      {isAr ? row.nameAr : row.nameEn}{' '}
                      <span className="font-mono text-slate-400">({row.sku})</span>
                    </td>
                    <td className="p-2.5 text-center font-mono">{row.systemStockQty}</td>
                    <td className="p-2.5 text-center font-mono font-bold">{row.physicalCountedQty}</td>
                    <td
                      className={`p-2.5 text-center font-mono font-bold ${
                        row.varianceQty < 0
                          ? 'text-red-600'
                          : row.varianceQty > 0
                          ? 'text-amber-600'
                          : 'text-emerald-600'
                      }`}
                    >
                      {row.varianceQty > 0 ? `+${row.varianceQty}` : row.varianceQty}
                    </td>
                    <td className="p-2.5 text-center">
                      {row.status === 'MATCHED' ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                          <CheckCircle2 className="w-3 h-3" />
                          {isAr ? 'مطابق' : 'MATCHED'}
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() =>
                            handleReconcileAuditDiscrepancy(row.productId, row.physicalCountedQty)
                          }
                          className="px-2.5 py-1 rounded-md bg-red-600 hover:bg-red-700 text-white text-[11px] font-bold cursor-pointer"
                        >
                          {isAr ? 'تسوية الفرق فوراً' : 'Reconcile Stock'}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 5. INVENTORY PROXIMITY ALERT SERVICE */}
      {activeTool === 'PROXIMITY_ALERTS' && (
        <div
          data-testid="inv-proximity-alert-service"
          className="space-y-4"
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                <BellRing className="w-4 h-4 text-amber-500" />
                <span>
                  {isAr
                    ? 'خدمة إشعارات الاقتراب الذكية لأجهزة موظفي المستودع (Inventory Proximity Alerts)'
                    : 'Warehouse Staff Mobile Proximity Alert Service'}
                </span>
              </h4>
              <p className="text-xs text-slate-500">
                {isAr
                  ? 'إرسال إشعارات فورية عند اقتراب الموظف أو مسحه لرف يحتوي على أصناف حرجة أو أوامر تحضير معلقة'
                  : 'Sends push notifications to warehouse staff mobile devices when approaching a shelf with critical low stock or pending pick-list orders'}
              </p>
            </div>

            <div className="flex items-center gap-2">
              {['Z1', 'Z2', 'Z3'].map((zone) => (
                <button
                  key={zone}
                  type="button"
                  data-testid={`proximity-trigger-${zone}`}
                  onClick={() => handleTriggerMobileProximityPush(zone)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer ${
                    approachedBinCode === zone
                      ? 'bg-amber-600 text-white'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  {isAr ? `محاكاة اقتراب من الممر ${zone}` : `Approach Zone ${zone}`}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {proximityAlerts.map((alert) => (
              <div
                key={alert.alertId}
                data-testid={`proximity-alert-card-${alert.sku}`}
                className="p-3.5 rounded-xl border border-amber-300 dark:border-amber-700 bg-amber-50/60 dark:bg-amber-950/25 space-y-1.5"
              >
                <div className="flex items-center justify-between">
                  <span className="px-2 py-0.5 rounded bg-amber-600 text-white font-mono text-[10px] font-bold">
                    SHELF: {alert.binCode} · {alert.priority}
                  </span>
                  <span className="text-[11px] font-mono text-amber-800 dark:text-amber-300">
                    {alert.triggerType}
                  </span>
                </div>
                <div className="text-xs font-bold text-slate-900 dark:text-slate-100">
                  {isAr ? alert.messageAr : alert.messageEn}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 6. EXPIRY TRACKER (BATCH WARNING DASHBOARD + CLEARANCE / DISPOSAL) */}
      {activeTool === 'EXPIRY_TRACKER' && (
        <div
          data-testid="inv-expiry-tracker-dashboard"
          className="space-y-4"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-red-600" />
                <span>
                  {isAr
                    ? 'لوحة الإنذار الآلي لتتبع تواريخ الصلاحية والدفعات (Expiry Tracker)'
                    : 'Automated Batch Expiry Warning Dashboard'}
                </span>
              </h4>
              <p className="text-xs text-slate-500">
                {isAr
                  ? 'مراقبة الدفعات المقتربة من انتهاء الصلاحية مع خيارات التحويل لتصفية المبيعات أو الإتلاف المحاسبي'
                  : 'Monitors batch-tracked items approaching expiry with 1-click Clearance Sale markdown or Disposal write-off'}
              </p>
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                  <th className="p-2.5 text-start">{isAr ? 'رقم التشغيلة / الدفعة' : 'Batch #'}</th>
                  <th className="p-2.5 text-start">{isAr ? 'الصنف' : 'Product'}</th>
                  <th className="p-2.5 text-center">{isAr ? 'تاريخ الانتهاء' : 'Expiry Date'}</th>
                  <th className="p-2.5 text-center">{isAr ? 'الأيام المتبقية' : 'Days Left'}</th>
                  <th className="p-2.5 text-center">{isAr ? 'الكمية' : 'Stock'}</th>
                  <th className="p-2.5 text-center">{isAr ? 'الإجراء المتخذ / التوصية' : 'Action'}</th>
                </tr>
              </thead>
              <tbody>
                {expiryItems.map((item) => (
                  <tr
                    key={item.batchId}
                    data-testid={`expiry-row-${item.sku}`}
                    className="border-t border-slate-100 dark:border-slate-800"
                  >
                    <td className="p-2.5 font-mono font-bold">{item.batchNumber}</td>
                    <td className="p-2.5 font-semibold">
                      {isAr ? item.nameAr : item.nameEn}{' '}
                      <span className="font-mono text-slate-400">({item.sku})</span>
                    </td>
                    <td className="p-2.5 text-center font-mono">{item.expiryDate}</td>
                    <td className="p-2.5 text-center font-mono font-bold">
                      <span
                        className={`px-2 py-0.5 rounded ${
                          item.daysRemaining <= 0
                            ? 'bg-red-100 text-red-800'
                            : item.daysRemaining <= 14
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}
                      >
                        {item.daysRemaining} {isAr ? 'يوم' : 'd'}
                      </span>
                    </td>
                    <td className="p-2.5 text-center font-mono">{item.stockQty}</td>
                    <td className="p-2.5 text-center">
                      {item.actionTaken && item.actionTaken !== 'NONE' ? (
                        <span
                          data-testid={`expiry-action-badge-${item.sku}`}
                          className="px-2.5 py-1 rounded bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 font-bold text-[11px]"
                        >
                          {item.actionTaken === 'CLEARANCE_SALE'
                            ? isAr
                              ? '✓ محول لتصفية المبيعات'
                              : '✓ Marked for Clearance'
                            : isAr
                            ? '✓ تم الإتلاف والاستبعاد'
                            : '✓ Disposed'}
                        </span>
                      ) : (
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            data-testid={`expiry-clearance-btn-${item.sku}`}
                            onClick={() => handleMarkForClearanceSale(item)}
                            className="px-2.5 py-1 rounded-md bg-amber-500 hover:bg-amber-600 text-white text-[11px] font-bold cursor-pointer"
                          >
                            {isAr
                              ? `تصفية (-${item.recommendedClearanceDiscountPct}%)`
                              : `Clearance (-${item.recommendedClearanceDiscountPct}%)`}
                          </button>
                          <button
                            type="button"
                            data-testid={`expiry-dispose-btn-${item.sku}`}
                            onClick={() => handleDisposeExpiredBatch(item)}
                            className="px-2.5 py-1 rounded-md bg-red-600 hover:bg-red-700 text-white text-[11px] font-bold cursor-pointer"
                          >
                            {isAr ? 'إتلاف' : 'Dispose'}
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 7. QR ASSET TRACKING MODULE */}
      {activeTool === 'QR_ASSETS' && (
        <div
          data-testid="inv-qr-asset-tracking-module"
          className="space-y-4"
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                <QrCode className="w-4 h-4 text-blue-600" />
                <span>
                  {isAr
                    ? 'نظام تتبع الأصول والمعدات عالية القيمة بـ QR (Check-In / Check-Out & Maintenance)'
                    : 'High-Value QR Asset Tracking, Custody Check-In/Out & Maintenance Scheduling'}
                </span>
              </h4>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <input
                type="text"
                placeholder={isAr ? 'اسم المستلم للعهدة...' : 'Custodian name...'}
                value={custodianInput}
                onChange={(e) => setCustodianInput(e.target.value)}
                className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs"
              />
              <input
                type="date"
                value={maintenanceDateInput}
                onChange={(e) => setMaintenanceDateInput(e.target.value)}
                className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {trackedAssets.map((ast) => (
              <div
                key={ast.assetId}
                data-testid={`qr-asset-card-${ast.assetTagCode}`}
                className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-950/40 space-y-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded bg-slate-900 text-white font-mono text-[11px] font-bold">
                        {ast.assetTagCode}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          ast.status === 'AVAILABLE'
                            ? 'bg-emerald-100 text-emerald-800'
                            : ast.status === 'CHECKED_OUT'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-blue-100 text-blue-800'
                        }`}
                      >
                        {ast.status}
                      </span>
                    </div>
                    <div className="text-sm font-bold text-slate-900 dark:text-slate-100">
                      {isAr ? ast.nameAr : ast.nameEn}
                    </div>
                    <div className="text-xs text-slate-600 dark:text-slate-400">
                      {isAr ? 'العهدة الحالية:' : 'Custodian:'} <strong>{ast.currentCustodian}</strong>
                    </div>
                    <div className="text-[11px] font-mono text-slate-500">
                      Next Service: {ast.nextMaintenanceDate} · Value:{' '}
                      {ast.purchaseValue.toLocaleString()} {currency}
                    </div>
                  </div>

                  <div
                    dangerouslySetInnerHTML={{
                      __html: buildDocumentVerificationQrSvg(
                        ast.assetTagCode,
                        ast.serialNumber,
                        ast.nextMaintenanceDate,
                        ast.purchaseValue,
                        0,
                        '#1e3a8a'
                      ),
                    }}
                  />
                </div>

                <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                  <button
                    type="button"
                    data-testid={`asset-checkinout-btn-${ast.assetTagCode}`}
                    onClick={() => handleAssetCheckInOutToggle(ast)}
                    className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold cursor-pointer"
                  >
                    {ast.status === 'CHECKED_OUT'
                      ? isAr
                        ? 'إرجاع العهدة (Check-In)'
                        : 'Check-In Asset'
                      : isAr
                      ? 'تسليم عهدة (Check-Out)'
                      : 'Check-Out Asset'}
                  </button>

                  <button
                    type="button"
                    data-testid={`asset-schedule-maint-btn-${ast.assetTagCode}`}
                    onClick={() => handleScheduleAssetMaintenance(ast.assetId)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-800 text-white text-xs font-bold cursor-pointer"
                  >
                    <Wrench className="w-3.5 h-3.5" />
                    <span>{isAr ? 'جدولة صيانة' : 'Schedule Service'}</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 8. INVENTORY OPTIMIZATION ASSISTANT (AI INTER-BRANCH STOCK REBALANCING) */}
      {activeTool === 'OPTIMIZATION_AI' && (
        <div
          data-testid="inv-optimization-assistant-panel"
          className="space-y-4"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-blue-600" />
                <span>
                  {isAr
                    ? 'مساعد تحسين وموازنة المخزون بين الفروع بالذكاء الاصطناعي (Inventory Optimization Assistant)'
                    : 'AI Inventory Optimization Assistant (Inter-Branch Stock Rebalancing)'}
                </span>
              </h4>
              <p className="text-xs text-slate-500">
                {isAr
                  ? 'يحلل اتجاهات المبيعات وسرعة الدوران لاقتراح تحويل الأصناف بين الفروع لتلبية الطلب المحلي'
                  : 'Analyzes localized sales trends to recommend stock transfers between branches'}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {rebalanceSuggestions.map((sug) => (
              <div
                key={sug.suggestionId}
                data-testid={`rebalance-suggestion-${sug.sku}`}
                className="p-4 rounded-xl border border-blue-200 dark:border-blue-900/60 bg-blue-50/40 dark:bg-blue-950/20 space-y-2.5"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                    {isAr ? sug.productNameAr : sug.productNameEn}{' '}
                    <span className="font-mono text-slate-500">({sug.sku})</span>
                  </span>
                  <span className="px-2 py-0.5 rounded bg-blue-600 text-white font-mono text-[10px] font-bold">
                    AI Confidence: {sug.confidenceScorePct}%
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs bg-white dark:bg-slate-900 p-2.5 rounded-lg border border-slate-200 dark:border-slate-800">
                  <div>
                    <div className="text-[10px] text-slate-400">{isAr ? 'من فرع الفائض' : 'From'}</div>
                    <div className="font-bold">{sug.sourceBranchName}</div>
                  </div>
                  <ArrowRightLeft className="w-4 h-4 text-blue-600" />
                  <div>
                    <div className="text-[10px] text-slate-400">{isAr ? 'إلى فرع الطلب' : 'To'}</div>
                    <div className="font-bold">{sug.targetBranchName}</div>
                  </div>
                  <div className="text-end">
                    <div className="text-[10px] text-slate-400">
                      {isAr ? 'الكمية المقترحة' : 'Suggested Qty'}
                    </div>
                    <div className="font-mono font-extrabold text-blue-600">
                      {sug.recommendedTransferQty} units
                    </div>
                  </div>
                </div>

                <p className="text-[11px] text-slate-600 dark:text-slate-400">
                  {isAr ? sug.rationaleAr : sug.rationaleEn}
                </p>

                <div className="flex items-center justify-between pt-1">
                  <span className="text-[11px] font-mono text-emerald-700 dark:text-emerald-400 font-bold">
                    {isAr ? 'حماية إيرادات مقدرة:' : 'Est. Revenue Protected:'}{' '}
                    +{sug.estimatedRevenueProtection.toLocaleString()} {currency}
                  </span>
                  <button
                    type="button"
                    data-testid={`execute-rebalance-btn-${sug.sku}`}
                    onClick={() => handleExecuteRebalanceTransfer(sug)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold cursor-pointer"
                  >
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>{isAr ? 'اعتماد التحويل الفوري' : 'Approve Transfer'}</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
};

export default InventoryAdvancedSuitePanel;
