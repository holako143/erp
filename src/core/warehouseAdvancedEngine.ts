import {
  BarcodeItem,
  BranchNodeInfo,
  FixedAsset,
  FleetVehicle,
  Product,
  SalesInvoice,
  SalesPipelineDoc,
  TraceabilityEvent,
} from '../types/erp';

// ============================================================================
// 1. Real-Time Inventory Reorder Safety Threshold Alert Engine
// ============================================================================

export interface InventoryReorderAlertItem {
  productId: string;
  sku: string;
  nameAr: string;
  nameEn: string;
  stockQty: number;
  safetyThreshold: number;
  deficitQty: number;
  binLocation: string;
  severity: 'OUT_OF_STOCK' | 'CRITICAL_LOW' | 'BELOW_REORDER';
}

export interface InventoryReorderAlertSummary {
  totalAlertsCount: number;
  outOfStockCount: number;
  criticalLowCount: number;
  belowReorderCount: number;
  items: InventoryReorderAlertItem[];
}

export function computeInventoryReorderAlertSummary(
  products: Product[]
): InventoryReorderAlertSummary {
  const items: InventoryReorderAlertItem[] = [];

  for (const p of products || []) {
    const stockQty = Number(p.stockQty) || 0;
    const safetyThreshold = Math.max(Number(p.reorderPoint) || 0, Number(p.minStock) || 0, 1);

    if (stockQty <= safetyThreshold) {
      const deficitQty = Math.max(0, safetyThreshold - stockQty);
      const severity: InventoryReorderAlertItem['severity'] =
        stockQty <= 0
          ? 'OUT_OF_STOCK'
          : stockQty <= Math.ceil(safetyThreshold * 0.4)
          ? 'CRITICAL_LOW'
          : 'BELOW_REORDER';

      items.push({
        productId: p.id,
        sku: p.sku,
        nameAr: p.nameAr || p.name,
        nameEn: p.name || p.nameAr,
        stockQty,
        safetyThreshold,
        deficitQty,
        binLocation: p.binLocation || 'A-01-01',
        severity,
      });
    }
  }

  items.sort((a, b) => a.stockQty - b.stockQty || b.deficitQty - a.deficitQty);

  return {
    totalAlertsCount: items.length,
    outOfStockCount: items.filter((i) => i.severity === 'OUT_OF_STOCK').length,
    criticalLowCount: items.filter((i) => i.severity === 'CRITICAL_LOW').length,
    belowReorderCount: items.filter((i) => i.severity === 'BELOW_REORDER').length,
    items,
  };
}

// ============================================================================
// 2. BarcodeEngineView: Batch Scan Mode & AR Warehouse View Engine
// ============================================================================

export interface BatchScanBufferItem {
  id: string;
  productId: string;
  sku: string;
  barcode: string;
  nameAr: string;
  nameEn: string;
  binLocation: string;
  currentSystemStock: number;
  scannedIntakeQty: number;
  unitCost: number;
  firstScannedAt: string;
  lastScannedAt: string;
  scanHits: number;
}

export function appendScanToBatchBuffer(
  buffer: BatchScanBufferItem[],
  code: string,
  products: Product[],
  barcodes: BarcodeItem[],
  qtyIncrement = 1,
  nowIso = new Date().toISOString()
): {
  updatedBuffer: BatchScanBufferItem[];
  matchedProduct: Product | null;
  status: 'INCREMENTED' | 'ADDED' | 'UNRECOGNIZED';
} {
  const cleanCode = (code || '').trim();
  if (!cleanCode) {
    return { updatedBuffer: buffer, matchedProduct: null, status: 'UNRECOGNIZED' };
  }

  const matchedBarcode = (barcodes || []).find(
    (b) => b.code.toLowerCase() === cleanCode.toLowerCase()
  );

  const matchedProduct =
    (products || []).find(
      (p) =>
        p.id === matchedBarcode?.productId ||
        p.barcode?.toLowerCase() === cleanCode.toLowerCase() ||
        p.sku?.toLowerCase() === cleanCode.toLowerCase() ||
        p.id.toLowerCase() === cleanCode.toLowerCase()
    ) || null;

  if (!matchedProduct) {
    return { updatedBuffer: buffer, matchedProduct: null, status: 'UNRECOGNIZED' };
  }

  const existingIdx = buffer.findIndex((item) => item.productId === matchedProduct.id);
  const inc = Math.max(1, Number(qtyIncrement) || 1);

  if (existingIdx >= 0) {
    const updatedBuffer = buffer.map((item, idx) =>
      idx === existingIdx
        ? {
            ...item,
            scannedIntakeQty: item.scannedIntakeQty + inc,
            lastScannedAt: nowIso,
            scanHits: item.scanHits + 1,
          }
        : item
    );
    return { updatedBuffer, matchedProduct, status: 'INCREMENTED' };
  }

  const newItem: BatchScanBufferItem = {
    id: `batch-${matchedProduct.id}-${Date.now()}`,
    productId: matchedProduct.id,
    sku: matchedProduct.sku,
    barcode: matchedProduct.barcode || cleanCode,
    nameAr: matchedProduct.nameAr || matchedProduct.name,
    nameEn: matchedProduct.name || matchedProduct.nameAr,
    binLocation: matchedProduct.binLocation || 'Z1-A01-S1',
    currentSystemStock: Number(matchedProduct.stockQty) || 0,
    scannedIntakeQty: inc,
    unitCost: Number(matchedProduct.costPrice) || 0,
    firstScannedAt: nowIso,
    lastScannedAt: nowIso,
    scanHits: 1,
  };

  return {
    updatedBuffer: [newItem, ...buffer],
    matchedProduct,
    status: 'ADDED',
  };
}

export interface ArWarehouseNodeOverlay {
  productId: string;
  sku: string;
  nameAr: string;
  nameEn: string;
  binCode: string;
  zone: string;
  aisle: string;
  shelfLevel: number;
  stockQty: number;
  safetyThreshold: number;
  stockStatus: 'OPTIMAL' | 'LOW_STOCK' | 'CRITICAL_EMPTY';
  distanceMeters: number;
  turnDirectionAr: string;
  turnDirectionEn: string;
  hudXPercent: number;
  hudYPercent: number;
  svgPathWaypoints: Array<{ x: number; y: number }>;
}

export function buildArWarehouseOverlayData(
  products: Product[],
  targetProductIdOrQuery?: string
): ArWarehouseNodeOverlay[] {
  const query = (targetProductIdOrQuery || '').trim().toLowerCase();
  const filtered = (products || []).filter((p) => {
    if (!query) return true;
    return (
      p.id.toLowerCase() === query ||
      p.sku.toLowerCase().includes(query) ||
      p.name.toLowerCase().includes(query) ||
      p.nameAr.toLowerCase().includes(query) ||
      (p.binLocation || '').toLowerCase().includes(query) ||
      (p.barcode || '').toLowerCase().includes(query)
    );
  });

  const list = (filtered.length > 0 ? filtered : products).slice(0, 6);

  return list.map((p, idx) => {
    const binCode = p.binLocation || `Z${(idx % 3) + 1}-A0${(idx % 4) + 1}-S${(idx % 3) + 1}`;
    const parts = binCode.split('-');
    const zone = parts[0] || 'Z1';
    const aisle = parts[1] || `A0${idx + 1}`;
    const shelfLevel = Number((parts[2] || 'S2').replace(/\D/g, '')) || 2;
    const stockQty = Number(p.stockQty) || 0;
    const safetyThreshold = Math.max(Number(p.reorderPoint) || 0, Number(p.minStock) || 0, 5);

    const stockStatus: ArWarehouseNodeOverlay['stockStatus'] =
      stockQty <= 0
        ? 'CRITICAL_EMPTY'
        : stockQty <= safetyThreshold
        ? 'LOW_STOCK'
        : 'OPTIMAL';

    const distanceMeters = Math.round((4.5 + idx * 3.8) * 10) / 10;
    const isLeft = idx % 2 === 0;
    const hudXPercent = isLeft ? 22 + (idx % 3) * 8 : 68 - (idx % 3) * 7;
    const hudYPercent = 24 + (idx % 3) * 16;

    return {
      productId: p.id,
      sku: p.sku,
      nameAr: p.nameAr || p.name,
      nameEn: p.name || p.nameAr,
      binCode,
      zone,
      aisle,
      shelfLevel,
      stockQty,
      safetyThreshold,
      stockStatus,
      distanceMeters,
      turnDirectionAr: isLeft
        ? `تقدم ${distanceMeters}م ثم انعطف يساراً إلى الممر ${aisle} (الرف ${shelfLevel})`
        : `تقدم ${distanceMeters}م ثم انعطف يميناً إلى الممر ${aisle} (الرف ${shelfLevel})`,
      turnDirectionEn: isLeft
        ? `Proceed ${distanceMeters}m then turn LEFT into Aisle ${aisle} (Shelf ${shelfLevel})`
        : `Proceed ${distanceMeters}m then turn RIGHT into Aisle ${aisle} (Shelf ${shelfLevel})`,
      hudXPercent,
      hudYPercent,
      svgPathWaypoints: [
        { x: 50, y: 92 },
        { x: 50, y: hudYPercent + 18 },
        { x: hudXPercent, y: hudYPercent + 6 },
      ],
    };
  });
}

// ============================================================================
// 3. Smart Inventory Tags & Print Queue Manager
// ============================================================================

export interface SmartBinTagConfig {
  productId: string;
  sku: string;
  nameAr: string;
  nameEn: string;
  binCode: string;
  zoneName: string;
  barcode: string;
  safetyThreshold: number;
  currentStock: number;
  digitalCardDeepLink: string;
  labelSize: 'SMALL_50x25' | 'STANDARD_70x40' | 'SHELF_RAIL_100x50';
  copiesCount: number;
  includePrice: boolean;
  sellingPrice: number;
}

export interface ScheduledPrintQueueJob {
  jobId: string;
  jobTitle: string;
  scheduledAtIso: string;
  pageFormat: 'A4_GRID_2X5' | 'THERMAL_ROLL_CONTINUOUS' | 'A4_SHELF_STRIPS';
  marginMm: number;
  columnGapMm: number;
  rowGapMm: number;
  status: 'QUEUED' | 'SCHEDULED' | 'READY_TO_PRINT' | 'PRINTED';
  items: SmartBinTagConfig[];
  totalLabelsCount: number;
}

export function buildSmartBinTagForProduct(
  product: Product,
  options?: Partial<{
    labelSize: SmartBinTagConfig['labelSize'];
    copiesCount: number;
    includePrice: boolean;
  }>
): SmartBinTagConfig {
  const binCode = product.binLocation || `BIN-${product.sku.slice(-4).toUpperCase()}`;
  const zoneName = binCode.split('-')[0] || 'Z1';
  const digitalCardDeepLink = `#inventory?item=${encodeURIComponent(product.id)}&sku=${encodeURIComponent(product.sku)}&bin=${encodeURIComponent(binCode)}`;

  return {
    productId: product.id,
    sku: product.sku,
    nameAr: product.nameAr || product.name,
    nameEn: product.name || product.nameAr,
    binCode,
    zoneName,
    barcode: product.barcode || product.sku,
    safetyThreshold: Math.max(Number(product.reorderPoint) || 0, Number(product.minStock) || 0, 5),
    currentStock: Number(product.stockQty) || 0,
    digitalCardDeepLink,
    labelSize: options?.labelSize || 'STANDARD_70x40',
    copiesCount: Math.max(1, Number(options?.copiesCount) || 1),
    includePrice: options?.includePrice ?? true,
    sellingPrice: Number(product.salePrice) || 0,
  };
}

// ============================================================================
// 4. Inventory Bin Efficiency (D3.js Heatmap Matrix Builder)
// ============================================================================

export interface BinEfficiencyCell {
  binCode: string;
  zone: string;
  aisle: string;
  productId: string;
  sku: string;
  productNameAr: string;
  productNameEn: string;
  movementFrequency: number;
  unitsMoved: number;
  stockQty: number;
  utilizationScorePct: number;
  efficiencyCategory: 'HIGH_VELOCITY' | 'BALANCED' | 'UNDERUTILIZED' | 'DEAD_SPACE';
}

export interface BinEfficiencyHeatmapSummary {
  cells: BinEfficiencyCell[];
  zones: string[];
  aisles: string[];
  underutilizedBinsCount: number;
  highVelocityBinsCount: number;
  avgUtilizationPct: number;
}

export function buildBinEfficiencyHeatmapMatrix(
  products: Product[],
  salesInvoices: SalesInvoice[],
  traceabilityEvents: TraceabilityEvent[] = []
): BinEfficiencyHeatmapSummary {
  const salesHitsByProduct = new Map<string, { hits: number; units: number }>();

  for (const inv of salesInvoices || []) {
    if (!inv || inv.status === 'VOID') continue;
    for (const item of inv.items || []) {
      const prev = salesHitsByProduct.get(item.productId) || { hits: 0, units: 0 };
      prev.hits += 1;
      prev.units += Math.max(1, Number(item.quantity) || 1);
      salesHitsByProduct.set(item.productId, prev);
    }
  }

  for (const evt of traceabilityEvents || []) {
    const matchedProd = (products || []).find((p) => p.nameAr === evt.productName || p.name === evt.productName);
    if (matchedProd) {
      const prev = salesHitsByProduct.get(matchedProd.id) || { hits: 0, units: 0 };
      prev.hits += 1;
      prev.units += 1;
      salesHitsByProduct.set(matchedProd.id, prev);
    }
  }

  const zonesSet = new Set<string>();
  const aislesSet = new Set<string>();

  const cells: BinEfficiencyCell[] = (products || []).map((p, idx) => {
    const defaultZone = `Z${(idx % 3) + 1}`;
    const defaultAisle = `A0${(idx % 4) + 1}`;
    const rawBin = p.binLocation || `${defaultZone}-${defaultAisle}-S${(idx % 3) + 1}`;
    const parts = rawBin.split('-');
    const zone = parts[0] || defaultZone;
    const aisle = parts[1] || defaultAisle;

    zonesSet.add(zone);
    aislesSet.add(aisle);

    const movement = salesHitsByProduct.get(p.id) || { hits: 0, units: 0 };
    const stockQty = Math.max(0, Number(p.stockQty) || 0);
    const maxCap = Math.max(Number(p.maxStock) || 100, stockQty, 20);
    const utilizationScorePct = Math.min(
      100,
      Math.round(((movement.units * 2.5 + stockQty * 0.6) / maxCap) * 100)
    );

    let efficiencyCategory: BinEfficiencyCell['efficiencyCategory'] = 'BALANCED';
    if (movement.hits >= 3 || utilizationScorePct >= 75) {
      efficiencyCategory = 'HIGH_VELOCITY';
    } else if (movement.hits === 0 && stockQty > 0) {
      efficiencyCategory = 'UNDERUTILIZED';
    } else if (movement.hits === 0 && stockQty === 0) {
      efficiencyCategory = 'DEAD_SPACE';
    }

    return {
      binCode: rawBin,
      zone,
      aisle,
      productId: p.id,
      sku: p.sku,
      productNameAr: p.nameAr || p.name,
      productNameEn: p.name || p.nameAr,
      movementFrequency: movement.hits,
      unitsMoved: movement.units,
      stockQty,
      utilizationScorePct,
      efficiencyCategory,
    };
  });

  const underutilizedBinsCount = cells.filter(
    (c) => c.efficiencyCategory === 'UNDERUTILIZED' || c.efficiencyCategory === 'DEAD_SPACE'
  ).length;
  const highVelocityBinsCount = cells.filter(
    (c) => c.efficiencyCategory === 'HIGH_VELOCITY'
  ).length;
  const avgUtilizationPct =
    cells.length > 0
      ? Math.round(cells.reduce((s, c) => s + c.utilizationScorePct, 0) / cells.length)
      : 0;

  return {
    cells,
    zones: Array.from(zonesSet).sort(),
    aisles: Array.from(aislesSet).sort(),
    underutilizedBinsCount,
    highVelocityBinsCount,
    avgUtilizationPct,
  };
}

// ============================================================================
// 5. Bin Capacity Planner (Physical 3D Shelf Simulation)
// ============================================================================

export interface BinDimensionsSpec {
  binCode: string;
  shelfWidthCm: number;
  shelfDepthCm: number;
  shelfHeightCm: number;
  maxLoadWeightKg: number;
  safetyClearancePct: number;
}

export interface ProductPhysicalSpec {
  productId: string;
  sku: string;
  nameAr: string;
  nameEn: string;
  unitLengthCm: number;
  unitWidthCm: number;
  unitHeightCm: number;
  unitWeightKg: number;
  currentStockQty: number;
  stackableLayersMax?: number;
}

export interface BinCapacitySimulationResult {
  binCode: string;
  productId: string;
  sku: string;
  unitsPerRowX: number;
  unitsPerDepthY: number;
  unitsPerHeightZ: number;
  maxUnitsByVolume: number;
  maxUnitsByWeight: number;
  theoreticalMaxCapacity: number;
  limitingFactor: 'VOLUME_GEOMETRY' | 'WEIGHT_LIMIT';
  currentStockQty: number;
  remainingUnitsCapacity: number;
  volumeUtilizationPct: number;
  weightUtilizationPct: number;
  status: 'UNDER_CAPACITY' | 'OPTIMAL_FIT' | 'NEAR_FULL' | 'OVERFLOW_WARNING';
}

export function calculateBinTheoreticalCapacity(
  bin: BinDimensionsSpec,
  product: ProductPhysicalSpec
): BinCapacitySimulationResult {
  const clearanceFactor = Math.max(0.5, 1 - (Number(bin.safetyClearancePct) || 5) / 100);
  const usableW = Math.max(1, bin.shelfWidthCm * clearanceFactor);
  const usableD = Math.max(1, bin.shelfDepthCm * clearanceFactor);
  const usableH = Math.max(1, bin.shelfHeightCm * clearanceFactor);

  const uW = Math.max(1, Number(product.unitWidthCm) || 10);
  const uD = Math.max(1, Number(product.unitLengthCm) || 10);
  const uH = Math.max(1, Number(product.unitHeightCm) || 10);
  const uWeight = Math.max(0.05, Number(product.unitWeightKg) || 0.5);

  const unitsPerRowX = Math.max(1, Math.floor(usableW / uW));
  const unitsPerDepthY = Math.max(1, Math.floor(usableD / uD));
  const rawLayersZ = Math.max(1, Math.floor(usableH / uH));
  const unitsPerHeightZ = product.stackableLayersMax
    ? Math.min(rawLayersZ, product.stackableLayersMax)
    : rawLayersZ;

  const maxUnitsByVolume = unitsPerRowX * unitsPerDepthY * unitsPerHeightZ;
  const maxUnitsByWeight = Math.max(1, Math.floor((Number(bin.maxLoadWeightKg) || 200) / uWeight));

  const theoreticalMaxCapacity = Math.min(maxUnitsByVolume, maxUnitsByWeight);
  const limitingFactor =
    maxUnitsByWeight < maxUnitsByVolume ? 'WEIGHT_LIMIT' : 'VOLUME_GEOMETRY';

  const currentStockQty = Math.max(0, Number(product.currentStockQty) || 0);
  const remainingUnitsCapacity = Math.max(0, theoreticalMaxCapacity - currentStockQty);

  const volumeUtilizationPct = Math.min(
    150,
    Math.round((currentStockQty / Math.max(1, maxUnitsByVolume)) * 1000) / 10
  );
  const weightUtilizationPct = Math.min(
    150,
    Math.round(((currentStockQty * uWeight) / Math.max(1, bin.maxLoadWeightKg)) * 1000) / 10
  );

  const effectivePct = Math.round((currentStockQty / Math.max(1, theoreticalMaxCapacity)) * 100);
  let status: BinCapacitySimulationResult['status'] = 'OPTIMAL_FIT';
  if (currentStockQty > theoreticalMaxCapacity) status = 'OVERFLOW_WARNING';
  else if (effectivePct >= 88) status = 'NEAR_FULL';
  else if (effectivePct < 35) status = 'UNDER_CAPACITY';

  return {
    binCode: bin.binCode,
    productId: product.productId,
    sku: product.sku,
    unitsPerRowX,
    unitsPerDepthY,
    unitsPerHeightZ,
    maxUnitsByVolume,
    maxUnitsByWeight,
    theoreticalMaxCapacity,
    limitingFactor,
    currentStockQty,
    remainingUnitsCapacity,
    volumeUtilizationPct,
    weightUtilizationPct,
    status,
  };
}

// ============================================================================
// 6. Inventory Audit Assistant (Multi-Bin Camera Scan vs System Stock)
// ============================================================================

export interface BinAuditScanEntry {
  binCode: string;
  productId: string;
  physicalCountedQty: number;
  scannedAtIso?: string;
}

export interface BinAuditDiscrepancyRow {
  binCode: string;
  productId: string;
  sku: string;
  nameAr: string;
  nameEn: string;
  systemStockQty: number;
  physicalCountedQty: number;
  varianceQty: number;
  varianceValueCost: number;
  status: 'MATCHED' | 'SHORTAGE' | 'SURPLUS';
}

export function crossReferenceMultiBinScan(
  scanEntries: BinAuditScanEntry[],
  products: Product[]
): {
  rows: BinAuditDiscrepancyRow[];
  matchedCount: number;
  discrepancyCount: number;
  netVarianceValue: number;
} {
  const prodMap = new Map<string, Product>();
  for (const p of products || []) {
    prodMap.set(p.id, p);
  }

  const rows: BinAuditDiscrepancyRow[] = (scanEntries || []).map((entry) => {
    const prod =
      prodMap.get(entry.productId) ||
      (products || []).find((p) => (p.binLocation || '').toLowerCase() === entry.binCode.toLowerCase());

    const systemStockQty = Number(prod?.stockQty) || 0;
    const physicalCountedQty = Math.max(0, Number(entry.physicalCountedQty) || 0);
    const varianceQty = physicalCountedQty - systemStockQty;
    const unitCost = Number(prod?.costPrice) || 0;
    const varianceValueCost = Math.round(varianceQty * unitCost * 100) / 100;

    const status: BinAuditDiscrepancyRow['status'] =
      varianceQty === 0 ? 'MATCHED' : varianceQty < 0 ? 'SHORTAGE' : 'SURPLUS';

    return {
      binCode: entry.binCode || prod?.binLocation || 'Z1-A01-S1',
      productId: prod?.id || entry.productId,
      sku: prod?.sku || 'UNKNOWN',
      nameAr: prod?.nameAr || prod?.name || 'صنف غير معروف',
      nameEn: prod?.name || prod?.nameAr || 'Unknown Item',
      systemStockQty,
      physicalCountedQty,
      varianceQty,
      varianceValueCost,
      status,
    };
  });

  return {
    rows,
    matchedCount: rows.filter((r) => r.status === 'MATCHED').length,
    discrepancyCount: rows.filter((r) => r.status !== 'MATCHED').length,
    netVarianceValue: Math.round(rows.reduce((s, r) => s + r.varianceValueCost, 0) * 100) / 100,
  };
}

// ============================================================================
// 7. Inventory Proximity Alert Service (Mobile Push Notification on Shelf Scan)
// ============================================================================

export interface ProximityAlertNotification {
  alertId: string;
  binCode: string;
  zone: string;
  productId: string;
  sku: string;
  productNameAr: string;
  productNameEn: string;
  triggerType: 'CRITICAL_LOW_STOCK' | 'PENDING_PICK_ORDER' | 'BOTH_CRITICAL_AND_PICK';
  priority: 'URGENT' | 'HIGH';
  currentStockQty: number;
  reorderSafetyPoint: number;
  pendingPickQty: number;
  pickOrderReferences: string[];
  messageAr: string;
  messageEn: string;
  triggeredAtIso: string;
}

export function evaluateProximityShelfAlerts(
  approachedZoneOrBinCode: string,
  products: Product[],
  salesPipelineDocs: SalesPipelineDoc[] = [],
  nowIso = new Date().toISOString()
): ProximityAlertNotification[] {
  const query = (approachedZoneOrBinCode || '').trim().toUpperCase();
  const zonePrefix = query.split('-')[0] || 'Z1';

  const pendingPickMap = new Map<string, { qty: number; refs: string[] }>();
  for (const doc of salesPipelineDocs || []) {
    if (doc.stage === 'CANCELLED' || doc.stage === 'INVOICED') continue;
    const docRef = doc.salesOrderNumber || doc.quoteNumber;
    for (const line of doc.items || []) {
      const prev = pendingPickMap.get(line.productId) || { qty: 0, refs: [] };
      prev.qty += Math.max(1, Number(line.quantity) || 1);
      if (docRef && !prev.refs.includes(docRef)) prev.refs.push(docRef);
      pendingPickMap.set(line.productId, prev);
    }
  }

  const alerts: ProximityAlertNotification[] = [];

  for (const p of products || []) {
    const binCode = (p.binLocation || 'Z1-A01-S1').toUpperCase();
    const isNearby =
      !query ||
      binCode === query ||
      binCode.startsWith(zonePrefix) ||
      p.sku.toUpperCase() === query ||
      (p.barcode || '').toUpperCase() === query;

    if (!isNearby) continue;

    const currentStockQty = Number(p.stockQty) || 0;
    const safetyPoint = Math.max(Number(p.reorderPoint) || 0, Number(p.minStock) || 0, 5);
    const isCriticalLow = currentStockQty <= safetyPoint;

    const pickInfo = pendingPickMap.get(p.id);
    const pendingPickQty = pickInfo?.qty || 0;
    const hasPendingPick = pendingPickQty > 0;

    if (!isCriticalLow && !hasPendingPick) continue;

    const triggerType: ProximityAlertNotification['triggerType'] =
      isCriticalLow && hasPendingPick
        ? 'BOTH_CRITICAL_AND_PICK'
        : isCriticalLow
        ? 'CRITICAL_LOW_STOCK'
        : 'PENDING_PICK_ORDER';

    alerts.push({
      alertId: `prox-${p.id}-${Date.now()}`,
      binCode,
      zone: binCode.split('-')[0] || 'Z1',
      productId: p.id,
      sku: p.sku,
      productNameAr: p.nameAr || p.name,
      productNameEn: p.name || p.nameAr,
      triggerType,
      priority: isCriticalLow && currentStockQty <= 2 ? 'URGENT' : 'HIGH',
      currentStockQty,
      reorderSafetyPoint: safetyPoint,
      pendingPickQty,
      pickOrderReferences: pickInfo?.refs || [],
      messageAr:
        triggerType === 'BOTH_CRITICAL_AND_PICK'
          ? `تنبيه اقتراب للرف [${binCode}]: الصنف "${p.nameAr || p.name}" في مستوى حرج (${currentStockQty}) ومطلوب سحبه لأمر تحضير (${pendingPickQty} وحدة)!`
          : triggerType === 'CRITICAL_LOW_STOCK'
          ? `تنبيه اقتراب للرف [${binCode}]: رصيد حرج للصنف "${p.nameAr || p.name}" (${currentStockQty} متبقي مقابل حد الأمان ${safetyPoint}).`
          : `إشعار تحضير فوري عند الرف [${binCode}]: مطلوب السحب (${pendingPickQty} وحدة) للصنف "${p.nameAr || p.name}".`,
      messageEn:
        triggerType === 'BOTH_CRITICAL_AND_PICK'
          ? `Proximity Alert [${binCode}]: "${p.name}" has critical low stock (${currentStockQty}) AND pending pick order (${pendingPickQty} units)!`
          : triggerType === 'CRITICAL_LOW_STOCK'
          ? `Proximity Alert [${binCode}]: Critical low stock for "${p.name}" (${currentStockQty} left vs safety ${safetyPoint}).`
          : `Pick-List Proximity [${binCode}]: Pending pick of ${pendingPickQty} units for "${p.name}".`,
      triggeredAtIso: nowIso,
    });
  }

  return alerts;
}

// ============================================================================
// 8. Expiry Tracker (Batch-Tracked Items Warning + Clearance/Disposal)
// ============================================================================

export interface BatchExpiryWarningItem {
  batchId: string;
  productId: string;
  sku: string;
  nameAr: string;
  nameEn: string;
  batchNumber: string;
  expiryDate: string;
  daysRemaining: number;
  stockQty: number;
  unitCost: number;
  sellingPrice: number;
  atRiskValueCost: number;
  status: 'EXPIRED' | 'CRITICAL_7_DAYS' | 'WARNING_30_DAYS' | 'APPROACHING_90_DAYS' | 'SAFE';
  recommendedClearanceDiscountPct: number;
  actionTaken?: 'NONE' | 'CLEARANCE_SALE' | 'DISPOSED';
}

export function evaluateBatchExpiryDashboard(
  products: Product[],
  barcodes: BarcodeItem[] = [],
  referenceDateIso = new Date().toISOString().slice(0, 10)
): BatchExpiryWarningItem[] {
  const refMs = Date.parse(referenceDateIso) || Date.now();
  const results: BatchExpiryWarningItem[] = [];

  for (const p of products || []) {
    const relatedBarcode = (barcodes || []).find((b) => b.productId === p.id && b.batchNumber);
    const expiryDate = p.expiryDate;
    if (!expiryDate) continue;

    const expMs = Date.parse(expiryDate);
    if (!Number.isFinite(expMs)) continue;

    const daysRemaining = Math.ceil((expMs - refMs) / 86_400_000);
    const stockQty = Math.max(0, Number(p.stockQty) || 0);
    const unitCost = Math.max(0, Number(p.costPrice) || 0);
    const sellingPrice = Math.max(0, Number(p.salePrice) || 0);

    let status: BatchExpiryWarningItem['status'] = 'SAFE';
    let recommendedClearanceDiscountPct = 0;

    if (daysRemaining <= 0) {
      status = 'EXPIRED';
      recommendedClearanceDiscountPct = 100;
    } else if (daysRemaining <= 7) {
      status = 'CRITICAL_7_DAYS';
      recommendedClearanceDiscountPct = 50;
    } else if (daysRemaining <= 30) {
      status = 'WARNING_30_DAYS';
      recommendedClearanceDiscountPct = 30;
    } else if (daysRemaining <= 90) {
      status = 'APPROACHING_90_DAYS';
      recommendedClearanceDiscountPct = 15;
    }

    results.push({
      batchId: `batch-exp-${p.id}`,
      productId: p.id,
      sku: p.sku,
      nameAr: p.nameAr || p.name,
      nameEn: p.name || p.nameAr,
      batchNumber: p.batchNumber || relatedBarcode?.batchNumber || `LOT-${p.sku}`,
      expiryDate: expiryDate.slice(0, 10),
      daysRemaining,
      stockQty,
      unitCost,
      sellingPrice,
      atRiskValueCost: Math.round(stockQty * unitCost * 100) / 100,
      status,
      recommendedClearanceDiscountPct,
      actionTaken: 'NONE',
    });
  }

  return results.sort((a, b) => a.daysRemaining - b.daysRemaining);
}

// ============================================================================
// 9. QR Asset Tracking (High-Value Assets Check-In/Out & Maintenance)
// ============================================================================

export interface AssetCustodyHistoryLog {
  logId: string;
  action: 'CHECK_OUT' | 'CHECK_IN' | 'MAINTENANCE_SCHEDULED' | 'INSPECTION_PASSED';
  holderName: string;
  department: string;
  timestampIso: string;
  notes: string;
}

export interface TrackedCompanyAsset {
  assetId: string;
  assetTagCode: string;
  nameAr: string;
  nameEn: string;
  category: string;
  serialNumber: string;
  locationBin: string;
  purchaseValue: number;
  status: 'AVAILABLE' | 'CHECKED_OUT' | 'IN_MAINTENANCE';
  currentCustodian: string;
  nextMaintenanceDate: string;
  qrPayloadUrl: string;
  history: AssetCustodyHistoryLog[];
}

export function performAssetCheckInOut(
  asset: TrackedCompanyAsset,
  action: 'CHECK_OUT' | 'CHECK_IN',
  custodianName: string,
  department: string,
  notes: string,
  nowIso = new Date().toISOString()
): TrackedCompanyAsset {
  const nextStatus: TrackedCompanyAsset['status'] =
    action === 'CHECK_OUT' ? 'CHECKED_OUT' : 'AVAILABLE';

  const newLog: AssetCustodyHistoryLog = {
    logId: `custody-${Date.now()}`,
    action,
    holderName: custodianName || (action === 'CHECK_IN' ? 'Warehouse Vault' : 'Staff Member'),
    department: department || 'Operations',
    timestampIso: nowIso,
    notes: notes || (action === 'CHECK_OUT' ? 'Assigned via QR scan' : 'Returned & verified'),
  };

  return {
    ...asset,
    status: nextStatus,
    currentCustodian: action === 'CHECK_OUT' ? custodianName : 'المستودع المركزي (Available)',
    history: [newLog, ...(asset.history || [])],
  };
}

// ============================================================================
// 10. Inventory Optimization Assistant (AI Inter-Branch Stock Rebalancing)
// ============================================================================

export interface BranchRebalanceSuggestion {
  suggestionId: string;
  productId: string;
  sku: string;
  productNameAr: string;
  productNameEn: string;
  sourceBranchId: string;
  sourceBranchName: string;
  sourceAvailableStock: number;
  targetBranchId: string;
  targetBranchName: string;
  targetCurrentStock: number;
  targetDailyVelocity: number;
  recommendedTransferQty: number;
  estimatedRevenueProtection: number;
  confidenceScorePct: number;
  rationaleAr: string;
  rationaleEn: string;
}

export function generateBranchStockRebalanceSuggestions(
  products: Product[],
  salesInvoices: SalesInvoice[],
  branches: BranchNodeInfo[]
): BranchRebalanceSuggestion[] {
  const sourceBranch = branches?.[0] || {
    branchId: 'branch-main-01',
    branchNameAr: 'الفرع الرئيسي - المركز',
  };
  const targetBranch = branches?.[1] || {
    branchId: 'branch-regional-02',
    branchNameAr: 'الفرع الإقليمي الثاني',
  };

  const soldByProduct = new Map<string, number>();
  for (const inv of salesInvoices || []) {
    if (!inv || inv.status === 'VOID') continue;
    for (const item of inv.items || []) {
      soldByProduct.set(
        item.productId,
        (soldByProduct.get(item.productId) || 0) + (Number(item.quantity) || 1)
      );
    }
  }

  const suggestions: BranchRebalanceSuggestion[] = [];

  for (const p of (products || []).slice(0, 8)) {
    const totalStock = Math.max(0, Number(p.stockQty) || 0);
    if (totalStock < 4) continue;

    const unitsSold = soldByProduct.get(p.id) || 3;
    const sourceStock = Math.ceil(totalStock * 0.78);
    const targetStock = Math.max(0, totalStock - sourceStock);
    const recommendedTransferQty = Math.max(2, Math.min(Math.floor(sourceStock * 0.35), unitsSold * 2));
    const unitMargin = Math.max(10, (Number(p.salePrice) || 100) - (Number(p.costPrice) || 70));

    suggestions.push({
      suggestionId: `rebal-${p.id}`,
      productId: p.id,
      sku: p.sku,
      productNameAr: p.nameAr || p.name,
      productNameEn: p.name || p.nameAr,
      sourceBranchId: sourceBranch.branchId,
      sourceBranchName: sourceBranch.branchNameAr,
      sourceAvailableStock: sourceStock,
      targetBranchId: targetBranch.branchId,
      targetBranchName: targetBranch.branchNameAr,
      targetCurrentStock: targetStock,
      targetDailyVelocity: Math.round((unitsSold / 14) * 10) / 10,
      recommendedTransferQty,
      estimatedRevenueProtection: Math.round(recommendedTransferQty * unitMargin),
      confidenceScorePct: Math.min(98, 82 + (unitsSold % 15)),
      rationaleAr: `ارتفاع الطلب المحلي في ${targetBranch.branchNameAr} مع توفر فائض آمن (${sourceStock} وحدة) في ${sourceBranch.branchNameAr}.`,
      rationaleEn: `High localized demand velocity at ${targetBranch.branchNameAr} while ${sourceBranch.branchNameAr} holds surplus stock (${sourceStock} units).`,
    });
  }

  return suggestions.sort((a, b) => b.estimatedRevenueProtection - a.estimatedRevenueProtection);
}

// ============================================================================
// 11. Predictive Maintenance Engine (Fleet & Machinery Usage Analysis)
// ============================================================================

export interface PredictiveMaintenanceAlert {
  alertId: string;
  assetId: string;
  assetCode: string;
  assetNameAr: string;
  assetNameEn: string;
  assetType: 'FLEET_VEHICLE' | 'INDUSTRIAL_MACHINERY';
  currentUsageMetric: number;
  serviceThresholdMetric: number;
  metricUnit: 'KM' | 'HOURS';
  usageRatioPct: number;
  remainingUntilService: number;
  predictedServiceDateIso: string;
  urgency: 'MAINTENANCE_DUE_NOW' | 'UPCOMING_SOON' | 'HEALTHY';
  assignedTeam: string;
  recommendedTaskAr: string;
  recommendedTaskEn: string;
  icsCalendarPayload: string;
}

export function evaluateFleetAndMachineryMaintenance(
  fleetVehicles: FleetVehicle[],
  fixedAssets: FixedAsset[] = [],
  referenceDateIso = new Date().toISOString().slice(0, 10)
): PredictiveMaintenanceAlert[] {
  const refMs = Date.parse(referenceDateIso) || Date.now();
  const alerts: PredictiveMaintenanceAlert[] = [];

  for (const v of fleetVehicles || []) {
    const currentKm = Math.max(0, Number(v.mileageKm) || 14200);
    const targetKm = Math.max(15000, Math.ceil(Math.max(1, currentKm) / 5000) * 5000);
    const remainingKm = targetKm - currentKm;
    const usageRatioPct = Math.min(125, Math.round((currentKm / targetKm) * 100));

    const daysUntilDue = Math.max(0, Math.round(remainingKm / 120));
    const dueDateIso = new Date(refMs + daysUntilDue * 86_400_000).toISOString().slice(0, 10);

    const urgency: PredictiveMaintenanceAlert['urgency'] =
      remainingKm <= 1000 || v.status === 'MAINTENANCE'
        ? 'MAINTENANCE_DUE_NOW'
        : remainingKm <= 2500
        ? 'UPCOMING_SOON'
        : 'HEALTHY';

    const summaryText = `Maintenance Due: ${v.model} (${v.plateNumber})`;
    const icsPayload = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'BEGIN:VEVENT',
      `SUMMARY:${summaryText}`,
      `DTSTART:${dueDateIso.replace(/-/g, '')}T090000Z`,
      `DTEND:${dueDateIso.replace(/-/g, '')}T110000Z`,
      `DESCRIPTION:Scheduled preventive maintenance at ${targetKm} KM for ${v.plateNumber}`,
      'END:VEVENT',
      'END:VCALENDAR',
    ].join('\n');

    alerts.push({
      alertId: `pm-fleet-${v.id}`,
      assetId: v.id,
      assetCode: v.plateNumber,
      assetNameAr: `${v.model} (${v.plateNumber})`,
      assetNameEn: `${v.model} (${v.plateNumber})`,
      assetType: 'FLEET_VEHICLE',
      currentUsageMetric: currentKm,
      serviceThresholdMetric: targetKm,
      metricUnit: 'KM',
      usageRatioPct,
      remainingUntilService: remainingKm,
      predictedServiceDateIso: dueDateIso,
      urgency,
      assignedTeam: 'فريق صيانة الأسطول والمحركات (Fleet Workshop)',
      recommendedTaskAr:
        urgency === 'MAINTENANCE_DUE_NOW'
          ? 'تغيير الزيوت والفلاتر وفحص المكابح الفوري (تجاوز حد المسافة)'
          : 'فحص دوري مجدول للمحرك وناقل الحركة',
      recommendedTaskEn:
        urgency === 'MAINTENANCE_DUE_NOW'
          ? 'Immediate oil, filter & brake overhaul (Service interval reached)'
          : 'Scheduled preventive powertrain & telemetry inspection',
      icsCalendarPayload: icsPayload,
    });
  }

  for (const fa of fixedAssets || []) {
    const cost = Number(fa.purchaseCost) || 50000;
    const simulatedHours = Math.round((cost % 4500) + 1920);
    const thresholdHours = 2000;
    const remainingHours = thresholdHours - simulatedHours;
    const usageRatioPct = Math.min(120, Math.round((simulatedHours / thresholdHours) * 100));
    const dueDateIso = new Date(refMs + Math.max(1, remainingHours) * 3_600_000)
      .toISOString()
      .slice(0, 10);

    const urgency: PredictiveMaintenanceAlert['urgency'] =
      remainingHours <= 100
        ? 'MAINTENANCE_DUE_NOW'
        : remainingHours <= 350
        ? 'UPCOMING_SOON'
        : 'HEALTHY';

    alerts.push({
      alertId: `pm-mach-${fa.id}`,
      assetId: fa.id,
      assetCode: fa.assetCode,
      assetNameAr: fa.nameAr || fa.name,
      assetNameEn: fa.name || fa.nameAr,
      assetType: 'INDUSTRIAL_MACHINERY',
      currentUsageMetric: simulatedHours,
      serviceThresholdMetric: thresholdHours,
      metricUnit: 'HOURS',
      usageRatioPct,
      remainingUntilService: remainingHours,
      predictedServiceDateIso: dueDateIso,
      urgency,
      assignedTeam: 'فريق الهندسة الميكانيكية والمعدات (Machinery Team)',
      recommendedTaskAr: 'معايرة المحاور الهيدروليكية وتشحيم التروس التشغيلية',
      recommendedTaskEn: 'Hydraulic axis calibration & industrial bearing lubrication',
      icsCalendarPayload: `BEGIN:VCALENDAR\nVERSION:2.0\nBEGIN:VEVENT\nSUMMARY:Machinery Service - ${fa.name}\nDTSTART:${dueDateIso.replace(/-/g, '')}T080000Z\nEND:VEVENT\nEND:VCALENDAR`,
    });
  }

  return alerts.sort((a, b) => b.usageRatioPct - a.usageRatioPct);
}

// ============================================================================
// 12. Voice-Command Interface Natural Language Command Parser (Arabic & English)
// ============================================================================

export interface ParsedVoiceCommand {
  recognized: boolean;
  rawTranscript: string;
  intent:
    | 'NAVIGATE_MODULE'
    | 'CREATE_INVOICE'
    | 'START_SCAN'
    | 'OPEN_BATCH_SCAN'
    | 'OPEN_AR_WAREHOUSE'
    | 'CHECK_LOW_STOCK'
    | 'UNKNOWN';
  targetTab?: string;
  targetModuleId?: string;
  feedbackAr: string;
  feedbackEn: string;
  feedbackMessageAr: string;
  feedbackMessageEn: string;
}

export function parseErpVoiceCommand(transcript: string): ParsedVoiceCommand {
  const raw = (transcript || '').trim();
  const norm = raw
    .toLowerCase()
    .replace(/[أإآ]/g, 'ا')
    .replace(/ة/g, 'ه');

  const buildResult = (
    recognized: boolean,
    intent: ParsedVoiceCommand['intent'],
    feedbackAr: string,
    feedbackEn: string,
    targetTab?: string
  ): ParsedVoiceCommand => ({
    recognized,
    rawTranscript: raw,
    intent,
    targetTab,
    targetModuleId: targetTab,
    feedbackAr,
    feedbackEn,
    feedbackMessageAr: feedbackAr,
    feedbackMessageEn: feedbackEn,
  });

  if (!norm) {
    return buildResult(
      false,
      'UNKNOWN',
      'لم يتم التقاط أمر صوتي واضح.',
      'No clear voice command detected.'
    );
  }

  // Action: Create Invoice
  if (
    norm.includes('create invoice') ||
    norm.includes('new invoice') ||
    norm.includes('انشاء فاتور') ||
    norm.includes('فاتوره جديده') ||
    norm.includes('اصدار فاتور')
  ) {
    return buildResult(
      true,
      'CREATE_INVOICE',
      'تم تنفيذ الأمر الصوتي: فتح شاشة المبيعات وإنشاء فاتورة جديدة.',
      'Voice command executed: Opening Sales & creating a new invoice.',
      'sales'
    );
  }

  // Action: AR Warehouse
  if (
    norm.includes('ar warehouse') ||
    norm.includes('augmented reality') ||
    norm.includes('الواقع المعزز') ||
    norm.includes('ملاحه المستودع')
  ) {
    return buildResult(
      true,
      'OPEN_AR_WAREHOUSE',
      'تم تنفيذ الأمر الصوتي: تشغيل منظور المستودع بالواقع المعزز (AR).',
      'Voice command executed: Launching AR Warehouse View.',
      'barcodeEngine'
    );
  }

  // Action: Start Scan / Barcode
  if (
    norm.includes('start scan') ||
    norm.includes('batch scan') ||
    norm.includes('scan barcode') ||
    norm.includes('بدء المسح') ||
    norm.includes('ابدا المسح') ||
    norm.includes('مسح الباركود') ||
    norm.includes('مسح مجمع')
  ) {
    return buildResult(
      true,
      norm.includes('batch') || norm.includes('مجمع') ? 'OPEN_BATCH_SCAN' : 'START_SCAN',
      'تم تنفيذ الأمر الصوتي: الانتقال إلى محرك الباركود وبدء المسح الفوري.',
      'Voice command executed: Starting Barcode Scanner.',
      'barcodeEngine'
    );
  }

  // Module Navigation Mappings
  const moduleKeywords: Array<{ tab: string; keywords: string[]; ar: string; en: string }> = [
    {
      tab: 'dashboard',
      keywords: ['dashboard', 'home', 'الرئيسية', 'لوحة التحكم', 'لوحة القيادة'],
      ar: 'لوحة التحكم الرئيسية',
      en: 'Executive Dashboard',
    },
    {
      tab: 'pos',
      keywords: ['pos', 'point of sale', 'cashier', 'نقاط البيع', 'كاشير'],
      ar: 'نقاط البيع والكاشير',
      en: 'Point of Sale (POS)',
    },
    {
      tab: 'inventory',
      keywords: ['inventory', 'warehouse', 'stock', 'المخزون', 'المستودع', 'المستودعات'],
      ar: 'إدارة المخزون والمستودعات',
      en: 'Inventory & Warehouse',
    },
    {
      tab: 'accounting',
      keywords: ['accounting', 'ledger', 'finance', 'المحاسبة', 'المالية', 'الحسابات'],
      ar: 'المحاسبة العامة والدفاتر',
      en: 'Financial Accounting',
    },
    {
      tab: 'sales',
      keywords: ['sales', 'المبيعات', 'فواتير المبيعات'],
      ar: 'إدارة المبيعات',
      en: 'Sales Management',
    },
    {
      tab: 'purchasing',
      keywords: ['purchases', 'purchasing', 'procurement', 'المشتريات', 'الموردين'],
      ar: 'إدارة المشتريات',
      en: 'Purchasing & Procurement',
    },
    {
      tab: 'businessModules',
      keywords: [
        'projects',
        'tasks',
        'onboarding',
        'predictive maintenance',
        'business modules',
        'المشاريع',
        'المهام',
        'تأهيل الموظفين',
        'الصيانة التنبؤية',
      ],
      ar: 'منظومة الأعمال والمشاريع والموارد البشرية',
      en: 'Business Modules & Projects',
    },
    {
      tab: 'reportsAndAI',
      keywords: ['reports', 'analytics', 'التقارير', 'التحليلات'],
      ar: 'التقارير والتحليلات الذكية',
      en: 'Reports & AI Analytics',
    },
    {
      tab: 'settings',
      keywords: ['settings', 'theme', 'الإعدادات', 'الاعدادات', 'المظهر'],
      ar: 'إعدادات النظام والمظهر',
      en: 'System Settings',
    },
    {
      tab: 'masterAdmin',
      keywords: ['master admin', 'system activity', 'الادارة العليا', 'الإدارة العليا', 'سجل النشاط'],
      ar: 'بوابة الإدارة العليا',
      en: 'Master Admin Control',
    },
  ];

  for (const entry of moduleKeywords) {
    if (
      entry.keywords.some((kw) =>
        norm.includes(kw.toLowerCase().replace(/[أإآ]/g, 'ا').replace(/ة/g, 'ه'))
      )
    ) {
      return buildResult(
        true,
        'NAVIGATE_MODULE',
        `تم الانتقال صوتياً إلى: ${entry.ar}`,
        `Navigated by voice to: ${entry.en}`,
        entry.tab
      );
    }
  }

  return buildResult(
    false,
    'UNKNOWN',
    `لم يتم التعرف على الأمر "${raw}". جرب: "إنشاء فاتورة" أو "بدء المسح" أو "افتح المخزون".`,
    `Unrecognized command "${raw}". Try: "create invoice", "start scan", or "go to inventory".`
  );
}
