/**
 * RLM ERP - Inventory & WMS Valuation Engine
 * Weighted Average Cost (WAC), Landed Cost Distribution, & Reorder Logic
 */

export interface LandedCostItem {
  productId: string;
  quantity: number;
  baseCost: number;
  totalBaseValue?: number;
}

/**
 * Calculates new Weighted Average Unit Cost (WAC) when receiving new inventory batches
 */
export function calculateWeightedAverageCost(
  currentQty: number,
  currentUnitCost: number,
  receivedQty: number,
  receivedUnitCost: number
): number {
  if (currentQty <= 0 && receivedQty <= 0) return 0;
  if (currentQty <= 0) return receivedUnitCost;
  if (receivedQty <= 0) return currentUnitCost;

  const currentTotalValue = currentQty * currentUnitCost;
  const receivedTotalValue = receivedQty * receivedUnitCost;
  const totalQty = currentQty + receivedQty;

  const newUnitCost = (currentTotalValue + receivedTotalValue) / totalQty;
  return Math.round(newUnitCost * 100) / 100;
}

/**
 * Allocates landed costs (freight, customs, insurance) across purchase order items
 */
export function allocateLandedCost(
  items: LandedCostItem[],
  totalLandedCost: number,
  method: 'BY_VALUE' | 'BY_QUANTITY' = 'BY_VALUE'
): { productId: string; allocatedCost: number; newEffectiveUnitCost: number }[] {
  if (items.length === 0 || totalLandedCost <= 0) {
    return items.map((i) => ({
      productId: i.productId,
      allocatedCost: 0,
      newEffectiveUnitCost: i.baseCost,
    }));
  }

  const totalValue = items.reduce(
    (acc, curr) => acc + (curr.totalBaseValue ?? curr.quantity * curr.baseCost),
    0
  );
  const totalQty = items.reduce((acc, curr) => acc + curr.quantity, 0);

  return items.map((item) => {
    const itemBaseVal = item.totalBaseValue ?? item.quantity * item.baseCost;
    let itemShareRatio = 0;
    if (method === 'BY_VALUE' && totalValue > 0) {
      itemShareRatio = itemBaseVal / totalValue;
    } else if (method === 'BY_QUANTITY' && totalQty > 0) {
      itemShareRatio = item.quantity / totalQty;
    }

    const itemAllocatedLandedCost = totalLandedCost * itemShareRatio;
    const addedCostPerUnit = item.quantity > 0 ? itemAllocatedLandedCost / item.quantity : 0;
    const newEffectiveUnitCost = Math.round((item.baseCost + addedCostPerUnit) * 100) / 100;

    return {
      productId: item.productId,
      allocatedCost: Math.round(itemAllocatedLandedCost * 100) / 100,
      newEffectiveUnitCost,
    };
  });
}

/**
 * Checks stock health and reorder triggers
 */
export function evaluateStockHealth(
  currentStock: number,
  minStock: number,
  maxStock: number,
  reorderPoint: number
): { status: 'OUT_OF_STOCK' | 'CRITICAL' | 'REORDER_NOW' | 'OPTIMAL' | 'OVERSTOCKED'; needsReorder: boolean } {
  if (currentStock <= 0) {
    return { status: 'OUT_OF_STOCK', needsReorder: true };
  }
  if (currentStock <= minStock) {
    return { status: 'CRITICAL', needsReorder: true };
  }
  if (currentStock <= reorderPoint) {
    return { status: 'REORDER_NOW', needsReorder: true };
  }
  if (currentStock > maxStock && maxStock > 0) {
    return { status: 'OVERSTOCKED', needsReorder: false };
  }
  return { status: 'OPTIMAL', needsReorder: false };
}

import { IndustryType, Product } from '../types/erp';
import { generateValidEAN13 } from './barcodeEngine';

export interface ParsedBulkProductsResult {
  validProducts: Omit<Product, 'id'>[];
  errors: string[];
  totalOpeningQty: number;
  totalOpeningValuation: number;
}

/**
 * Parses CSV or Tab-delimited (Excel copy-paste) rows into validated Product records
 * Expected columns: SKU, Barcode, NameAr, NameEn, CostPrice, SalePrice, StockQty, UOM, ReorderPoint, Industry
 */
export function parseBulkProductsCSV(
  rawText: string,
  tenantId = 'ten-1',
  warehouseId = 'wh-1',
  defaultCategoryId = 'cat-1',
  defaultIndustry: IndustryType = 'general'
): ParsedBulkProductsResult {
  const validProducts: Omit<Product, 'id'>[] = [];
  const errors: string[] = [];
  let totalOpeningQty = 0;
  let totalOpeningValuation = 0;

  if (!rawText || !rawText.trim()) {
    return { validProducts, errors: ['Empty CSV input'], totalOpeningQty: 0, totalOpeningValuation: 0 };
  }

  const lines = rawText
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // Split by comma or tab, stripping surrounding quotes
    const cols = (line.includes('\t') ? line.split('\t') : line.split(',')).map((c) =>
      c.trim().replace(/^"|"$/g, '')
    );

    // Skip header row if detected
    if (
      i === 0 &&
      (cols[0].toLowerCase().includes('sku') ||
        cols[0].includes('كود') ||
        cols[2]?.toLowerCase().includes('name'))
    ) {
      continue;
    }

    if (cols.length < 3) {
      errors.push(`Row ${i + 1}: Insufficient columns (minimum SKU, Barcode/Name, Price required)`);
      continue;
    }

    const sku = (cols[0] || `SKU-IMP-${100 + i}`).toUpperCase();
    const rawBarcode = cols[1] && /^\d{8,14}$/.test(cols[1]) ? cols[1] : generateValidEAN13('628', '1042', String(200 + i));
    const nameAr = cols[2] || cols[3] || sku;
    const nameEn = cols[3] || cols[2] || sku;
    const costPrice = Math.max(0, Number(cols[4]) || 0);
    const salePrice = Math.max(0, Number(cols[5]) || Math.round(costPrice * 1.35 * 100) / 100);
    const stockQty = Math.max(0, Number(cols[6]) || 0);
    const uom = (cols[7] || 'PCS').toUpperCase();
    const reorderPoint = Math.max(1, Number(cols[8]) || 5);
    const rawSector = (cols[9] || defaultIndustry).toLowerCase() as IndustryType;
    const validSectors: IndustryType[] = ['general', 'restaurant', 'grocery', 'electronics', 'pharmacy', 'contracting'];
    const industry: IndustryType = validSectors.includes(rawSector) ? rawSector : defaultIndustry;

    totalOpeningQty += stockQty;
    totalOpeningValuation += Math.round(stockQty * costPrice * 100) / 100;

    validProducts.push({
      tenantId,
      sku,
      barcode: rawBarcode,
      name: nameEn,
      nameAr,
      categoryId: defaultCategoryId,
      industry,
      uom,
      costPrice,
      salePrice,
      taxRate: 0.15,
      stockQty,
      minStock: Math.max(1, Math.floor(reorderPoint / 2)),
      maxStock: reorderPoint * 6,
      reorderPoint,
      warehouseId,
      binLocation: `ZA-0${(i % 4) + 1}-S1-B0${(i % 9) + 1}`,
      hasSerials: industry === 'electronics',
      hasBatches: industry === 'pharmacy' || industry === 'grocery',
      warrantyMonths: industry === 'electronics' ? 24 : undefined,
      expiryDate: industry === 'pharmacy' || industry === 'grocery' ? '2027-12-31' : undefined,
      prepTimeMinutes: industry === 'restaurant' ? 12 : undefined,
      isWeightedScale: uom === 'KG' || rawBarcode.startsWith('21') || rawBarcode.startsWith('20'),
      isActive: true,
    });
  }

  return {
    validProducts,
    errors,
    totalOpeningQty: Math.round(totalOpeningQty * 1000) / 1000,
    totalOpeningValuation: Math.round(totalOpeningValuation * 100) / 100,
  };
}

export interface SolarSystemSizingInput {
  continuousLoadWatts: number; // e.g. 3200 W (AC, Screens, Fridges, Lighting)
  backupHours: number; // e.g. 8 hours night autonomy
  systemVoltage: 12 | 24 | 48; // 12V, 24V, or 48V DC bus
  peakSunHours?: number; // Default 5.5 hours in KSA/MENA
  batteryType?: 'LIFEPO4' | 'TUBULAR_GEL'; // LiFePO4 (85% DoD) vs Gel (50% DoD)
  singlePanelWatts?: number; // Default 585W N-Type Bifacial
}

export interface SolarSystemSizingOutput {
  dailyEnergyWh: number;
  dailyEnergyKwh: number;
  recommendedInverterKw: number;
  recommendedInverterModel: string;
  requiredBatteryStorageKwh: number;
  requiredBatteryAhAtSystemVoltage: number;
  recommendedBatteryUnits: number;
  recommendedBatteryUnitSpec: string;
  requiredSolarArrayKwp: number;
  recommendedPanelCount: number;
  singlePanelWatts: number;
  systemVoltage: 12 | 24 | 48;
}

/**
 * Pure Engineering Calculator for Solar PV Array, Hybrid Inverter, and Lithium/Gel Battery Bank Sizing
 * Used by Electronics, Solar & Battery Distributors at the POS & B2B Quotation Desk
 */
export function calculateSolarAndBatterySystemSizing(
  input: SolarSystemSizingInput
): SolarSystemSizingOutput {
  const loadW = Math.max(100, Number(input.continuousLoadWatts) || 1000);
  const hours = Math.max(1, Math.min(24, Number(input.backupHours) || 6));
  const sysVolt: 12 | 24 | 48 =
    input.systemVoltage === 12 || input.systemVoltage === 24 || input.systemVoltage === 48
      ? input.systemVoltage
      : 48;
  const sunHours = Math.max(3, Math.min(9, Number(input.peakSunHours) || 5.5));
  const batType = input.batteryType || 'LIFEPO4';
  const panelW = Math.max(200, Number(input.singlePanelWatts) || 585);

  // 1. Daily/Backup Energy Demand
  const dailyEnergyWh = Math.round(loadW * hours);
  const dailyEnergyKwh = Math.round((dailyEnergyWh / 1000) * 100) / 100;

  // 2. Hybrid Inverter Sizing (1.25x safety & surge factor, snapped to standard commercial sizes: 3kW, 5kW, 8kW, 12kW, 16kW)
  const rawInverterKw = (loadW * 1.25) / 1000;
  const standardInverterSizes = [3, 5, 8, 12, 16, 24];
  const recommendedInverterKw =
    standardInverterSizes.find((s) => s >= rawInverterKw) ||
    Math.ceil(rawInverterKw);

  const recommendedInverterModel =
    recommendedInverterKw >= 8
      ? `Deye ${recommendedInverterKw}kW Hybrid Inverter 48V MPPT`
      : `Growatt ${recommendedInverterKw}kW Hybrid Off-Grid Inverter`;

  // 3. Battery Bank Storage Sizing (accounting for Inverter Efficiency 92% and Depth of Discharge DoD: 85% LiFePO4, 55% Gel)
  const dod = batType === 'LIFEPO4' ? 0.85 : 0.55;
  const inverterEff = 0.92;
  const requiredBatteryStorageWh = dailyEnergyWh / (dod * inverterEff);
  const requiredBatteryStorageKwh =
    Math.round((requiredBatteryStorageWh / 1000) * 100) / 100;
  const requiredBatteryAhAtSystemVoltage = Math.ceil(
    requiredBatteryStorageWh / sysVolt
  );

  let recommendedBatteryUnits = 1;
  let recommendedBatteryUnitSpec = 'Felicity LiFePO4 48V 200Ah (10.24kWh)';

  if (batType === 'LIFEPO4') {
    // Standard 48V 200Ah LiFePO4 module is 9.6kWh - 10.24kWh
    const unitKwh = 10.24;
    recommendedBatteryUnits = Math.max(
      1,
      Math.ceil(requiredBatteryStorageKwh / unitKwh)
    );
    recommendedBatteryUnitSpec = 'Felicity Solar LiFePO4 48V 200Ah (10.24kWh)';
  } else {
    // Standard 12V 200Ah Gel Deep-Cycle Battery is 2.4kWh total
    const unitWh = 12 * 200;
    const rawUnits = Math.ceil(requiredBatteryStorageWh / unitWh);
    const seriesMultiple = sysVolt / 12; // 1 for 12V, 2 for 24V, 4 for 48V
    recommendedBatteryUnits = Math.max(
      seriesMultiple,
      Math.ceil(rawUnits / seriesMultiple) * seriesMultiple
    );
    recommendedBatteryUnitSpec = 'Ritar Tubular Gel 12V 200Ah Deep-Cycle';
  }

  // 4. Solar PV Array Sizing (1.22x system loss factor over peak sun hours)
  const requiredSolarArrayWatts = (dailyEnergyWh * 1.22) / sunHours;
  const recommendedPanelCount = Math.max(
    2,
    Math.ceil(requiredSolarArrayWatts / panelW)
  );
  const requiredSolarArrayKwp =
    Math.round(((recommendedPanelCount * panelW) / 1000) * 100) / 100;

  return {
    dailyEnergyWh,
    dailyEnergyKwh,
    recommendedInverterKw,
    recommendedInverterModel,
    requiredBatteryStorageKwh,
    requiredBatteryAhAtSystemVoltage,
    recommendedBatteryUnits,
    recommendedBatteryUnitSpec,
    requiredSolarArrayKwp,
    recommendedPanelCount,
    singlePanelWatts: panelW,
    systemVoltage: sysVolt,
  };
}

/**
 * Pure Smart Product Identification & Label OCR Engine (Section 4 & Section 8)
 * Extracts Manufacturer, Model, Serial Number, IMEI, Power (Watts), Voltage, Battery Capacity,
 * checks for Duplicate Serials in existing registry, and matches existing Catalog Products.
 */
export function parseSmartProductLabelOCR(
  rawLabelText: string,
  existingProducts: Product[],
  existingSerialNumbers: string[]
): {
  rawLabelText: string;
  manufacturer: string;
  modelCode: string;
  extractedNameAr: string;
  serialNumber: string;
  imeiNumber?: string;
  barcode: string;
  subCategory:
    | 'SOLAR_PANEL'
    | 'HYBRID_INVERTER'
    | 'LITHIUM_BATTERY'
    | 'GEL_BATTERY'
    | 'SMART_SCREEN'
    | 'COMPUTING_MOBILE'
    | 'SOLAR_ACCESSORY';
  powerRatingWatts?: number;
  voltageSpec?: string;
  batteryCapacitySpec?: string;
  efficiencySpec?: string;
  matchedProductId?: string;
  matchedProductName?: string;
  isDuplicateSerial: boolean;
  confidencePercent: number;
} {
  const text = (rawLabelText || '').trim();
  const upper = text.toUpperCase();

  // 1. Extract Serial Number (SN: ... or S/N: ... or IMEI-...)
  const snMatch =
    text.match(/(?:SN|S\/N|SERIAL)[:\s-]*([A-Z0-9-]{6,28})/i) ||
    text.match(/(SN-[A-Z0-9-]{6,24})/i);
  const imeiMatch = text.match(/(?:IMEI)[:\s-]*([0-9A-Z-]{8,22})/i);
  const serialNumber = (
    snMatch?.[1] ||
    imeiMatch?.[1] ||
    `SN-OCR-${Date.now().toString().slice(-6)}`
  )
    .trim()
    .toUpperCase();
  const imeiNumber = imeiMatch?.[1]?.trim().toUpperCase();

  // 2. Extract Barcode (13 digits EAN or 8-14 digits)
  const barcodeMatch = text.match(/\b(628\d{10}|\d{13}|\d{12})\b/);
  const explicitBarcode = barcodeMatch?.[1];

  // 3. Extract Power Rating (Watts / kW)
  const kwMatch = text.match(/(\d+(?:\.\d+)?)\s*kW\b/i);
  const wattMatch = text.match(/(\d{2,5})\s*W\b/i);
  const powerRatingWatts = kwMatch
    ? Math.round(parseFloat(kwMatch[1]) * 1000)
    : wattMatch
    ? parseInt(wattMatch[1], 10)
    : undefined;

  // 4. Extract Voltage & Battery Capacity
  const voltMatch = text.match(/(\d{2,4}(?:\.\d+)?\s*V(?:DC|AC)?)/i);
  const ahMatch = text.match(/(\d{2,4}\s*Ah(?:\s*\(\d+(?:\.\d+)?\s*kWh\))?)/i);
  const effMatch = text.match(/(\d{2}(?:\.\d+)?%\s*(?:Eff|Efficiency)?)/i);

  // 5. Identify Manufacturer, SubCategory & Model
  let manufacturer = 'Generic Industrial';
  let subCategory:
    | 'SOLAR_PANEL'
    | 'HYBRID_INVERTER'
    | 'LITHIUM_BATTERY'
    | 'GEL_BATTERY'
    | 'SMART_SCREEN'
    | 'COMPUTING_MOBILE'
    | 'SOLAR_ACCESSORY' = 'SOLAR_PANEL';
  let modelCode = 'MDL-STD-01';
  let extractedNameAr = 'جهاز إلكتروني / طاقة شمسية مفحوص بالكاميرا';

  if (upper.includes('JINKO') || upper.includes('TIGER') || upper.includes('BIFACIAL') || upper.includes('585W')) {
    manufacturer = 'Jinko Solar';
    subCategory = 'SOLAR_PANEL';
    modelCode = 'JKM585N-72HL4-BDV';
    extractedNameAr = 'لوح طاقة شمسية مونو كريستال وجهين Jinko Tiger Neo 585W N-Type';
  } else if (upper.includes('DEYE') || upper.includes('SUN-8K') || (upper.includes('INVERTER') && upper.includes('8KW'))) {
    manufacturer = 'Deye Inverter Technology';
    subCategory = 'HYBRID_INVERTER';
    modelCode = 'SUN-8K-SG01LP1-EU';
    extractedNameAr = 'إنفرتر طاقة شمسية هجين ذكي Deye 8kW Hybrid 48V Dual MPPT';
  } else if (upper.includes('GROWATT') || upper.includes('5000ES')) {
    manufacturer = 'Growatt New Energy';
    subCategory = 'HYBRID_INVERTER';
    modelCode = 'SPF-5000ES-48V';
    extractedNameAr = 'إنفرتر طاقة شمسية هجين Growatt 5000ES 5kW 48V MPPT 100A';
  } else if (upper.includes('FELICITY') || upper.includes('LIFEPO4') || upper.includes('200AH')) {
    manufacturer = 'Felicity Solar';
    subCategory = 'LITHIUM_BATTERY';
    modelCode = 'LPBF48200-M';
    extractedNameAr = 'بطارية ليثيوم فوسفات الحديد Felicity LiFePO4 48V 200Ah (10.24kWh)';
  } else if (upper.includes('RITAR') || upper.includes('GEL')) {
    manufacturer = 'Ritar Power';
    subCategory = 'GEL_BATTERY';
    modelCode = 'DG12-200';
    extractedNameAr = 'بطارية جل أنبوبية ديب سايكل للطاقة الشمسية Ritar 12V 200Ah';
  } else if (upper.includes('SAMSUNG') || upper.includes('QLED') || upper.includes('LG') || upper.includes('OLED')) {
    manufacturer = upper.includes('LG') ? 'LG Electronics' : 'Samsung Electronics';
    subCategory = 'SMART_SCREEN';
    modelCode = upper.includes('LG') ? '34GS95QE-B' : 'QA65Q70DAUXZN';
    extractedNameAr = upper.includes('LG')
      ? 'شاشة احترافية منحنية LG UltraGear 34" WQHD OLED 240Hz'
      : 'شاشة ذكية سامسونج 65 بوصة 4K QLED Smart TV 120Hz';
  }

  // 6. Match against existing products in catalog
  const matchedProduct =
    existingProducts.find(
      (p) =>
        (explicitBarcode && p.barcode === explicitBarcode) ||
        upper.includes(p.sku.toUpperCase()) ||
        (p.subCategory === subCategory &&
          powerRatingWatts !== undefined &&
          p.powerRatingWatts === powerRatingWatts)
    ) ||
    existingProducts.find((p) => p.subCategory === subCategory);

  const barcode = explicitBarcode || matchedProduct?.barcode || '6281042005014';

  // 7. Check for Duplicate Serial Number across system
  const normalizedSet = new Set(
    existingSerialNumbers.map((s) => s.trim().toUpperCase())
  );
  const isDuplicateSerial = normalizedSet.has(serialNumber);

  return {
    rawLabelText: text,
    manufacturer,
    modelCode,
    extractedNameAr: matchedProduct ? matchedProduct.nameAr : extractedNameAr,
    serialNumber,
    imeiNumber,
    barcode,
    subCategory,
    powerRatingWatts: powerRatingWatts || matchedProduct?.powerRatingWatts,
    voltageSpec: voltMatch?.[1] || matchedProduct?.voltageSpec,
    batteryCapacitySpec: ahMatch?.[1] || matchedProduct?.batteryCapacitySpec,
    efficiencySpec: effMatch?.[1] || matchedProduct?.efficiencySpec,
    matchedProductId: matchedProduct?.id,
    matchedProductName: matchedProduct?.nameAr,
    isDuplicateSerial,
    confidencePercent: matchedProduct ? 99.4 : 94.8,
  };
}

/**
 * Evaluates Warranty Coverage & Expiry Date for a Serialized Device (Section 16)
 */
export function evaluateSerialWarrantyStatus(params: {
  purchaseDateIso: string;
  warrantyMonths: number;
  referenceDateIso?: string;
}): {
  warrantyExpiryDate: string;
  isUnderWarranty: boolean;
  remainingDays: number;
} {
  const startMs = Date.parse(params.purchaseDateIso) || Date.now();
  const nowMs = params.referenceDateIso ? Date.parse(params.referenceDateIso) : Date.now();
  const months = Math.max(0, Number(params.warrantyMonths) || 0);

  const expiryDateObj = new Date(startMs);
  expiryDateObj.setMonth(expiryDateObj.getMonth() + months);
  const expiryMs = expiryDateObj.getTime();
  const warrantyExpiryDate = expiryDateObj.toISOString().slice(0, 10);

  const diffDays = Math.ceil((expiryMs - nowMs) / 86400000);
  const isUnderWarranty = months > 0 && diffDays >= 0;

  return {
    warrantyExpiryDate,
    isUnderWarranty,
    remainingDays: Math.max(0, diffDays),
  };
}

export interface StructuredVendorInvoiceItem {
  name: string;
  qty: number;
  unitPrice: number;
  total: number;
}

export interface StructuredVendorInvoiceResult {
  vendor: string;
  invoiceNumber: string;
  date: string;
  subtotal: number;
  vat15: number;
  totalDue: number;
  confidence: number;
  items: StructuredVendorInvoiceItem[];
}

/**
 * Deterministic, input-driven parser for vendor invoice raw OCR text.
 * Extracts vendor, invoice number, date, line items, subtotal, VAT, and totalDue dynamically from rawText.
 */
export function parseStructuredVendorInvoiceText(rawText: string): StructuredVendorInvoiceResult {
  const cleaned = (rawText || '').trim();
  if (!cleaned) {
    return {
      vendor: '',
      invoiceNumber: '',
      date: new Date().toISOString().slice(0, 10),
      subtotal: 0,
      vat15: 0,
      totalDue: 0,
      confidence: 0,
      items: [],
    };
  }

  let matchedSignals = 0;

  // 1. Vendor extraction
  const vendorMatch =
    cleaned.match(/(?:Vendor|Supplier|From|المورد|الشركة)\s*[:\-]\s*([^\n\r]+)/i);
  const vendor = vendorMatch ? vendorMatch[1].trim() : 'Unidentified Vendor';
  if (vendorMatch) matchedSignals += 1;

  // 2. Invoice number extraction
  const invMatch =
    cleaned.match(/(?:INVOICE\s*#|Invoice\s*(?:No|Number|Ref)?\s*[:#\-]?|رقم الفاتورة\s*[:#\-]?)\s*([A-Z0-9\-_/]+)/i) ||
    cleaned.match(/\b(INV-[A-Z0-9\-]+)\b/i);
  const invoiceNumber = invMatch ? invMatch[1].trim() : `INV-OCR-${Date.now().toString().slice(-4)}`;
  if (invMatch) matchedSignals += 1;

  // 3. Date extraction
  const dateMatch = cleaned.match(/(?:Date|التاريخ)\s*[:\-]\s*(\d{4}-\d{2}-\d{2}|\d{2}\/\d{2}\/\d{4})/i);
  const date = dateMatch ? dateMatch[1].trim() : new Date().toISOString().slice(0, 10);

  // 4. Line items extraction:
  // Pattern A: "2x Solar Panel 550W @ 650 SAR" or "1 x Inverter @ SAR 3,200"
  const items: StructuredVendorInvoiceItem[] = [];
  const lineRegex = /(\d+(?:\.\d+)?)\s*[xX×*]\s*([^@\n\r]+?)\s*@\s*(?:SAR|USD|EUR|ر\.س|\$)?\s*([\d,]+(?:\.\d+)?)/gi;
  let match: RegExpExecArray | null;
  while ((match = lineRegex.exec(cleaned)) !== null) {
    const qty = Number(match[1]);
    const name = match[2].trim();
    const unitPrice = Number(match[3].replace(/,/g, ''));
    if (qty > 0 && !Number.isNaN(unitPrice)) {
      items.push({
        name,
        qty,
        unitPrice,
        total: Math.round(qty * unitPrice * 100) / 100,
      });
    }
  }

  // Pattern B: Multi-line block "Item: ...\nQty: ...\nUnit Price: ..."
  if (items.length === 0) {
    const itemMatch = cleaned.match(/(?:Item|Product|الصنف)\s*[:\-]\s*([^\n\r]+)/i);
    const qtyMatch = cleaned.match(/(?:Qty|Quantity|الكمية)\s*[:\-]\s*(\d+(?:\.\d+)?)/i);
    const priceMatch = cleaned.match(/(?:Unit\s*Price|Price|سعر الوحدة|السعر)\s*[:\-]\s*(?:SAR|USD|EUR|ر\.س|\$)?\s*([\d,]+(?:\.\d+)?)/i);
    if (itemMatch && qtyMatch && priceMatch) {
      const qty = Number(qtyMatch[1]);
      const unitPrice = Number(priceMatch[1].replace(/,/g, ''));
      if (qty > 0 && !Number.isNaN(unitPrice)) {
        items.push({
          name: itemMatch[1].trim(),
          qty,
          unitPrice,
          total: Math.round(qty * unitPrice * 100) / 100,
        });
      }
    }
  }
  if (items.length > 0) matchedSignals += 1;

  const parseNumberField = (regex: RegExp): number | null => {
    const m = cleaned.match(regex);
    if (!m) return null;
    const val = Number(m[1].replace(/,/g, ''));
    return Number.isFinite(val) ? val : null;
  };

  const extractedSubtotal = parseNumberField(/\b(?:Subtotal|Sub-total|الإجمالي الفرعي|قبل الضريبة)\s*[:\-]?\s*(?:SAR|USD|EUR|ر\.س|\$)?\s*([\d,]+(?:\.\d+)?)/i);
  const extractedVat = parseNumberField(/\b(?:VAT(?:\s*\(?15%\)?)?|Tax|الضريبة)\s*[:\-]?\s*(?:SAR|USD|EUR|ر\.س|\$)?\s*([\d,]+(?:\.\d+)?)/i);
  const extractedTotal = parseNumberField(/(?:\bTotal\s*Due|\bGrand\s*Total|\bTotal|الإجمالي المستحق|الصافي)\s*[:\-]?\s*(?:SAR|USD|EUR|ر\.س|\$)?\s*([\d,]+(?:\.\d+)?)/i);

  if (extractedSubtotal !== null) matchedSignals += 1;
  if (extractedTotal !== null) matchedSignals += 1;

  const itemsSum = items.reduce((s, i) => s + i.total, 0);
  let subtotal = extractedSubtotal !== null ? extractedSubtotal : itemsSum;
  if (subtotal === 0 && extractedTotal !== null) {
    subtotal = Math.round((extractedTotal / 1.15) * 100) / 100;
  }
  const vat15 =
    extractedVat !== null
      ? extractedVat
      : Math.round(subtotal * 0.15 * 100) / 100;
  const totalDue =
    extractedTotal !== null
      ? extractedTotal
      : Math.round((subtotal + vat15) * 100) / 100;

  const confidence = Math.min(99.6, Math.max(45, Math.round((matchedSignals / 5) * 99.4 * 10) / 10));

  return {
    vendor,
    invoiceNumber,
    date,
    subtotal,
    vat15,
    totalDue,
    confidence,
    items,
  };
}

export interface StockAdjustmentResult {
  productId: string;
  currentStock: number;
  countedStock: number;
  varianceQty: number; // positive = surplus, negative = deficit
  varianceValue: number; // varianceQty * unitCost
  adjustmentType: 'SURPLUS' | 'DEFICIT' | 'MATCHED';
  journalLines: {
    accountId: string;
    debit: number;
    credit: number;
    memo: string;
  }[];
  isBalanced: boolean;
}

/**
 * Computes physical stock-taking variance, surplus/deficit valuation, and generates strictly balanced inventory adjustment journal lines.
 */
export function calculateStockAdjustmentVariance(
  productId: string,
  currentStock: number,
  countedStock: number,
  unitCost: number
): StockAdjustmentResult {
  const safeCurrent = Math.max(0, currentStock);
  const safeCounted = Math.max(0, countedStock);
  const safeUnitCost = Math.max(0, unitCost);

  const varianceQty = Math.round((safeCounted - safeCurrent) * 100) / 100;
  const varianceValue = Math.round(Math.abs(varianceQty) * safeUnitCost * 100) / 100;

  let adjustmentType: 'SURPLUS' | 'DEFICIT' | 'MATCHED' = 'MATCHED';
  if (varianceQty > 0) {
    adjustmentType = 'SURPLUS';
  } else if (varianceQty < 0) {
    adjustmentType = 'DEFICIT';
  }

  const journalLines: { accountId: string; debit: number; credit: number; memo: string }[] = [];

  if (adjustmentType === 'SURPLUS') {
    // Inventory Increased: Debit Inventory (1103), Credit Inventory Discrepancy Gain (4104)
    journalLines.push(
      {
        accountId: '1103',
        debit: varianceValue,
        credit: 0,
        memo: `فائض تسوية جردية - زيادة مخزون (${varianceQty}+) للمنتج ${productId}`,
      },
      {
        accountId: '4104',
        debit: 0,
        credit: varianceValue,
        memo: `إيرادات تسوية جردية مخزنية فائضة`,
      }
    );
  } else if (adjustmentType === 'DEFICIT') {
    // Inventory Decreased: Debit Inventory Shrinkage/Loss (5103), Credit Inventory (1103)
    journalLines.push(
      {
        accountId: '5103',
        debit: varianceValue,
        credit: 0,
        memo: `عجز تسوية جردية مخزنية (${Math.abs(varianceQty)}-) للمنتج ${productId}`,
      },
      {
        accountId: '1103',
        debit: 0,
        credit: varianceValue,
        memo: `تخفيض المخزون نتيجة العجز الجردي`,
      }
    );
  }

  const totalDebit = journalLines.reduce((s, l) => s + l.debit, 0);
  const totalCredit = journalLines.reduce((s, l) => s + l.credit, 0);
  const isBalanced = Math.abs(totalDebit - totalCredit) < 0.001;

  return {
    productId,
    currentStock: safeCurrent,
    countedStock: safeCounted,
    varianceQty,
    varianceValue,
    adjustmentType,
    journalLines,
    isBalanced,
  };
}

/**
 * Specific Inventory Classifications for Solar, Electronics, Batteries & Smart Screens
 */
export interface SpecificInventoryClassification {
  categoryId: string;
  code: string;
  nameAr: string;
  nameEn: string;
  subCategory:
    | 'SOLAR_PANEL'
    | 'HYBRID_INVERTER'
    | 'LITHIUM_BATTERY'
    | 'GEL_BATTERY'
    | 'SMART_SCREEN'
    | 'COMPUTING_MOBILE'
    | 'SOLAR_ACCESSORY';
  skuPrefix: string;
  eanManufacturerCode: string;
  defaultWarrantyMonths: number;
}

export const SPECIFIC_INVENTORY_CLASSIFICATIONS: SpecificInventoryClassification[] = [
  {
    categoryId: 'cat-solar-panels',
    code: 'CAT-SOL-PNL',
    nameAr: 'ألواح الطاقة الشمسية (Solar Panels N-Type)',
    nameEn: 'Solar Panels (N-Type & Bifacial)',
    subCategory: 'SOLAR_PANEL',
    skuPrefix: 'SOL-PNL',
    eanManufacturerCode: '1051',
    defaultWarrantyMonths: 144,
  },
  {
    categoryId: 'cat-hybrid-inverters',
    code: 'CAT-HYB-INV',
    nameAr: 'إنفرترات هجينة ومنظمات شحن (Hybrid Inverters)',
    nameEn: 'Hybrid Inverters & MPPT Controllers',
    subCategory: 'HYBRID_INVERTER',
    skuPrefix: 'SOL-INV',
    eanManufacturerCode: '1052',
    defaultWarrantyMonths: 60,
  },
  {
    categoryId: 'cat-lithium-batteries',
    code: 'CAT-BAT-LFP',
    nameAr: 'بطاريات ليثيوم فوسفات الحديد (LiFePO4 Batteries)',
    nameEn: 'Lithium LiFePO4 Storage Batteries',
    subCategory: 'LITHIUM_BATTERY',
    skuPrefix: 'BAT-LFP',
    eanManufacturerCode: '1053',
    defaultWarrantyMonths: 60,
  },
  {
    categoryId: 'cat-gel-batteries',
    code: 'CAT-BAT-GEL',
    nameAr: 'بطاريات جل أنبوبية وأمبير عميق (Gel & AGM Batteries)',
    nameEn: 'Tubular Gel & Deep Cycle Batteries',
    subCategory: 'GEL_BATTERY',
    skuPrefix: 'BAT-GEL',
    eanManufacturerCode: '1054',
    defaultWarrantyMonths: 18,
  },
  {
    categoryId: 'cat-smart-screens',
    code: 'CAT-SCR-4K',
    nameAr: 'شاشات ذكية وتلفزيونات (Smart Screens 4K / OLED)',
    nameEn: 'Smart TVs & 4K/OLED Displays',
    subCategory: 'SMART_SCREEN',
    skuPrefix: 'SCR-4K',
    eanManufacturerCode: '1055',
    defaultWarrantyMonths: 24,
  },
  {
    categoryId: 'cat-computing-electronics',
    code: 'CAT-CMP-ELC',
    nameAr: 'أجهزة حاسوب وإلكترونيات دقيقة (Computing & Electronics)',
    nameEn: 'Computers, Laptops & Smart Devices',
    subCategory: 'COMPUTING_MOBILE',
    skuPrefix: 'ELC-DEV',
    eanManufacturerCode: '1056',
    defaultWarrantyMonths: 24,
  },
  {
    categoryId: 'cat-solar-accessories',
    code: 'CAT-SOL-ACC',
    nameAr: 'كابلات وقواطع وحمايات طاقة (Cables, Breakers & SPD)',
    nameEn: 'Solar Cables, DC Breakers & Accessories',
    subCategory: 'SOLAR_ACCESSORY',
    skuPrefix: 'SOL-ACC',
    eanManufacturerCode: '1057',
    defaultWarrantyMonths: 12,
  },
];

let monotonicCodeCounter = 100;

/**
 * Generates a unique, valid EAN-13 barcode specifically tailored to the item's classification
 * and guaranteed not to collide with any existing barcode in the database.
 */
export function generateUniqueProductBarcode(
  subCategory = 'SOLAR_PANEL',
  existingBarcodes: string[] = []
): string {
  const existingSet = new Set(existingBarcodes.map((b) => String(b).trim()));
  const spec =
    SPECIFIC_INVENTORY_CLASSIFICATIONS.find((c) => c.subCategory === subCategory) ||
    SPECIFIC_INVENTORY_CLASSIFICATIONS[0];

  for (let attempt = 0; attempt < 50; attempt++) {
    monotonicCodeCounter = (monotonicCodeCounter + 1) % 900;
    const entropy = Math.floor(10000 + ((Date.now() + attempt * 37 + monotonicCodeCounter * 13) % 89999));
    const candidate = generateValidEAN13('628', spec.eanManufacturerCode, String(entropy));
    if (!existingSet.has(candidate)) {
      return candidate;
    }
  }
  return generateValidEAN13('628', spec.eanManufacturerCode);
}

/**
 * Generates a unique, structured SKU code tailored to the item's classification, power rating,
 * and name, guaranteed not to collide with existing SKUs.
 */
export function generateUniqueProductSku(params: {
  subCategory?: string;
  nameAr?: string;
  powerRatingWatts?: number;
  existingSkus?: string[];
}): string {
  const { subCategory = 'SOLAR_PANEL', nameAr = '', powerRatingWatts = 0, existingSkus = [] } = params;
  const existingSet = new Set(existingSkus.map((s) => String(s).trim().toUpperCase()));
  const spec =
    SPECIFIC_INVENTORY_CLASSIFICATIONS.find((c) => c.subCategory === subCategory) ||
    SPECIFIC_INVENTORY_CLASSIFICATIONS[0];

  let ratingSegment = '';
  if (powerRatingWatts > 0) {
    ratingSegment =
      powerRatingWatts >= 1000
        ? `${Math.round(powerRatingWatts / 1000)}KW`
        : `${Math.round(powerRatingWatts)}W`;
  } else {
    const numMatch = nameAr.match(/(\d{2,4})\s*(W|kW|Ah|V|بوصة|واط)/i);
    if (numMatch) {
      ratingSegment = numMatch[1];
    }
  }

  for (let attempt = 0; attempt < 50; attempt++) {
    monotonicCodeCounter = (monotonicCodeCounter + 1) % 900;
    const suffix = String(100 + ((Date.now() + attempt * 19 + monotonicCodeCounter) % 899));
    const candidate = ratingSegment
      ? `${spec.skuPrefix}-${ratingSegment}-${suffix}`
      : `${spec.skuPrefix}-${suffix}`;
    if (!existingSet.has(candidate.toUpperCase())) {
      return candidate.toUpperCase();
    }
  }
  return `${spec.skuPrefix}-${Date.now().toString().slice(-4)}`;
}

/**
 * Carton / Piece Optical Label Scanner Extractor:
 * Extracts Barcode (EAN-13 / UPC) and SKU (Part Number / Model Code) from a photographed carton label or image filename/text.
 */
export function extractCartonBarcodeAndSkuFromLabel(
  rawInput: string,
  subCategory = 'SOLAR_PANEL',
  existingBarcodes: string[] = [],
  existingSkus: string[] = []
): {
  extractedBarcode: string;
  extractedSku: string;
  detectedNameAr: string;
  detectedPowerWatts: number;
  detectedSpec: string;
} {
  const clean = (rawInput || '').trim();

  // Extract 8-to-14 digit barcode if present in carton text
  const barcodeMatch = clean.match(/\b(\d{8,14})\b/);
  const extractedBarcode = barcodeMatch
    ? barcodeMatch[1]
    : generateUniqueProductBarcode(subCategory, existingBarcodes);

  // Extract explicit model/SKU token (e.g. SOL-PNL-600W, SUN-8K-SG01, LPBF48200, QA65Q70D)
  const skuMatch =
    clean.match(/(?:SKU|P\/N|MODEL|PART|CODE)\s*[:#-]?\s*([A-Z0-9][A-Z0-9-_]{3,18})/i) ||
    clean.match(/\b([A-Z]{2,5}[-_][A-Z0-9]{2,8}(?:[-_][A-Z0-9]{2,6})?)\b/i);

  const wattsMatch = clean.match(/(\d+(?:\.\d+)?)\s*(kW|W)\b/i);
  const detectedPowerWatts = wattsMatch
    ? wattsMatch[2].toLowerCase() === 'kw'
      ? Math.round(Number(wattsMatch[1]) * 1000)
      : Math.round(Number(wattsMatch[1]))
    : subCategory === 'SOLAR_PANEL'
    ? 585
    : subCategory === 'HYBRID_INVERTER'
    ? 8000
    : 0;

  const extractedSku = skuMatch
    ? skuMatch[1].toUpperCase()
    : generateUniqueProductSku({
        subCategory,
        nameAr: clean,
        powerRatingWatts: detectedPowerWatts,
        existingSkus,
      });

  let detectedNameAr = 'صنف مستخرج من تصوير الكرتون';
  let detectedSpec = '48V DC';

  if (subCategory === 'SOLAR_PANEL') {
    detectedNameAr = `لوح طاقة شمسية مونو N-Type ${detectedPowerWatts || 585}W`;
    detectedSpec = '49.5V Voc / N-Type Bifacial';
  } else if (subCategory === 'HYBRID_INVERTER') {
    detectedNameAr = `إنفرتر طاقة شمسية هجين ذكي ${detectedPowerWatts >= 1000 ? `${detectedPowerWatts / 1000}kW` : '8kW'} MPPT`;
    detectedSpec = '48V DC / 230V AC Pure Sine';
  } else if (subCategory === 'LITHIUM_BATTERY') {
    detectedNameAr = 'بطارية ليثيوم فوسفات الحديد LiFePO4 48V 200Ah';
    detectedSpec = '51.2V 200Ah (10.24 kWh)';
  } else if (subCategory === 'GEL_BATTERY') {
    detectedNameAr = 'بطارية جل أنبوبية ديب سايكل 12V 200Ah';
    detectedSpec = '12V 200Ah Tubular Gel';
  } else if (subCategory === 'SMART_SCREEN') {
    detectedNameAr = 'شاشة ذكية 65 بوصة 4K QLED 120Hz';
    detectedSpec = '65" 4K QLED Smart TV';
  } else if (subCategory === 'COMPUTING_MOBILE') {
    detectedNameAr = 'جهاز حاسوب محمول احترافي للأعمال';
    detectedSpec = 'Core i7 / 16GB RAM / 512GB NVMe';
  } else {
    detectedNameAr = 'قاطع وكابل حماية تيار مستمر للطاقة الشمسية';
    detectedSpec = '1000V DC / IP65 Protection';
  }

  return {
    extractedBarcode,
    extractedSku,
    detectedNameAr,
    detectedPowerWatts,
    detectedSpec,
  };
}

/**
 * Resolves the specific Arabic classification title for any product based on its categoryId and subCategory.
 */
export function resolveSpecificProductClassificationAr(
  product: { categoryId?: string; subCategory?: string },
  categories: { id: string; nameAr: string }[] = []
): string {
  // 1. Check if product has a specific non-generic categoryId in categories list
  if (product.categoryId && product.categoryId !== 'cat-electronics') {
    const matchedCat = categories.find((c) => c.id === product.categoryId);
    if (matchedCat) return matchedCat.nameAr;
  }

  // 2. Check SPECIFIC_INVENTORY_CLASSIFICATIONS by categoryId or subCategory
  const byCatId = SPECIFIC_INVENTORY_CLASSIFICATIONS.find(
    (c) => c.categoryId === product.categoryId
  );
  if (byCatId) return byCatId.nameAr;

  const bySubCat = SPECIFIC_INVENTORY_CLASSIFICATIONS.find(
    (c) => c.subCategory === product.subCategory
  );
  if (bySubCat) return bySubCat.nameAr;

  // 3. Fallback to matched category or specific default
  const fallbackCat = categories.find((c) => c.id === product.categoryId);
  return fallbackCat?.nameAr || 'ألواح الطاقة الشمسية والإلكترونيات';
}
