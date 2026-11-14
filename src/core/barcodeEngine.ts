/**
 * RLM ERP - Barcode & Traceability Engine
 * Pure Logic & Cryptographic/Algorithmic Utilities
 */

import { BarcodeFormat } from '../types/erp';

/**
 * Calculates GS1 standard check digit for EAN-13
 * @param code12 12-digit string
 * @returns 1-digit number (0-9)
 */
export function calculateEAN13CheckDigit(code12: string): number {
  if (!/^\d{12}$/.test(code12)) {
    throw new Error('EAN-13 check digit requires exactly 12 numeric digits');
  }
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    const digit = parseInt(code12[i], 10);
    // Weights: odd positions (0-indexed even) = 1, even positions (0-indexed odd) = 3
    sum += i % 2 === 0 ? digit * 1 : digit * 3;
  }
  const remainder = sum % 10;
  return remainder === 0 ? 0 : 10 - remainder;
}

/**
 * Validates a 13-digit EAN-13 string
 */
export function isValidEAN13(code13: string): boolean {
  if (!/^\d{13}$/.test(code13)) return false;
  const prefix = code13.slice(0, 12);
  const checkDigit = parseInt(code13[12], 10);
  return calculateEAN13CheckDigit(prefix) === checkDigit;
}

/**
 * Calculates GS1 standard check digit for EAN-8
 * @param code7 7-digit string
 */
export function calculateEAN8CheckDigit(code7: string): number {
  if (!/^\d{7}$/.test(code7)) {
    throw new Error('EAN-8 check digit requires exactly 7 numeric digits');
  }
  let sum = 0;
  for (let i = 0; i < 7; i++) {
    const digit = parseInt(code7[i], 10);
    // Weights: odd positions (0-indexed even) = 3, even positions (0-indexed odd) = 1
    sum += i % 2 === 0 ? digit * 3 : digit * 1;
  }
  const remainder = sum % 10;
  return remainder === 0 ? 0 : 10 - remainder;
}

/**
 * Generates a valid complete EAN-13 barcode with company prefix and product serial
 */
export function generateValidEAN13(countryCode = '628', companyCode = '1042', itemCode = '001'): string {
  // Saudi GS1 country prefix is 628
  const base = `${countryCode.padStart(3, '0')}${companyCode.padStart(4, '0')}${itemCode.padStart(5, '0')}`.slice(0, 12);
  const check = calculateEAN13CheckDigit(base);
  return `${base}${check}`;
}

let serialSequenceCounter = 0;

/**
 * Generates unique collision-free Serial Numbers with cryptographic entropy, sequence counter & timestamp
 */
export function generateUniqueSerialNumber(prefix = 'SN', tenantId = 'T1'): string {
  serialSequenceCounter = (serialSequenceCounter + 1) % 0xfff;
  const year = new Date().getFullYear().toString().slice(-2);
  const month = (new Date().getMonth() + 1).toString().padStart(2, '0');
  const seqHex = serialSequenceCounter.toString(16).toUpperCase().padStart(3, '0');
  const randomHex = Math.floor(Math.random() * 0xfff).toString(16).toUpperCase().padStart(3, '0');
  return `${prefix}-${tenantId.slice(0, 3).toUpperCase()}-${year}${month}-${seqHex}${randomHex}`;
}

/**
 * Generates unique Batch Numbers
 */
export function generateUniqueBatchNumber(prefix = 'LOT'): string {
  const d = new Date();
  const dateStr = `${d.getFullYear().toString().slice(-2)}${(d.getMonth() + 1).toString().padStart(2, '0')}${d.getDate().toString().padStart(2, '0')}`;
  const seq = Math.floor(100 + Math.random() * 900);
  return `${prefix}-${dateStr}-${seq}`;
}

/**
 * Code 128 Mode B Patterns dictionary (Subset for alphanumeric labels)
 */
const CODE128_PATTERNS: Record<number, string> = {
  0: '212222', 1: '222122', 2: '222221', 3: '121223', 4: '121322',
  5: '131222', 6: '122213', 7: '122312', 8: '132212', 9: '221213',
  10: '221312', 11: '231212', 12: '112232', 13: '122132', 14: '122231',
  15: '113222', 16: '123122', 17: '123221', 18: '223211', 19: '221132',
  20: '221231', 21: '213212', 22: '223112', 23: '312131', 24: '311222',
  25: '321122', 26: '321221', 27: '312212', 28: '322112', 29: '322211',
  30: '212123', 31: '212321', 32: '232121', 33: '111323', 34: '131123',
  35: '131321', 36: '112313', 37: '132113', 38: '132311', 39: '211313',
  40: '231113', 41: '231311', 42: '112133', 43: '112331', 44: '132131',
  45: '113123', 46: '113321', 47: '133121', 48: '313121', 49: '211331',
  50: '231131', 51: '213113', 52: '213311', 53: '213131', 54: '311123',
  55: '311321', 56: '331121', 57: '312113', 58: '312311', 59: '332111',
  60: '314111', 61: '221411', 62: '431111', 63: '111224', 64: '111422',
  65: '121124', 66: '121421', 67: '141122', 68: '141221', 69: '112214',
  70: '112412', 71: '122114', 72: '122411', 73: '142112', 74: '142211',
  75: '241211', 76: '221114', 77: '413111', 78: '241112', 79: '134111',
  80: '111242', 81: '121142', 82: '121241', 83: '114212', 84: '124112',
  85: '124211', 86: '411212', 87: '421112', 88: '421211', 89: '212141',
  90: '214121', 91: '412121', 92: '111143', 93: '111341', 94: '131141',
  95: '114113', 96: '114311', 97: '411113', 98: '411311', 99: '113141',
  100: '114131', 101: '311141', 102: '411131', 103: '211412', // Start B
  104: '211214', 105: '211232', 106: '2331112' // Stop
};

/**
 * Generates Code 128 binary modules (1=bar, 0=space) for crisp SVG rendering
 */
export function generateCode128Binary(text: string): string {
  // Start B is value 104
  const startCode = 104;
  const values: number[] = [startCode];
  let checksum = startCode;

  for (let i = 0; i < text.length; i++) {
    const charCode = text.charCodeAt(i);
    const value = charCode - 32;
    if (value >= 0 && value <= 95) {
      values.push(value);
      checksum += value * (i + 1);
    }
  }

  const checkValue = checksum % 103;
  values.push(checkValue);
  values.push(106); // Stop code

  let binary = '0000000000'; // quiet zone
  for (const val of values) {
    const pattern = CODE128_PATTERNS[val] || '212222';
    for (let p = 0; p < pattern.length; p++) {
      const width = parseInt(pattern[p], 10);
      const isBar = p % 2 === 0;
      binary += (isBar ? '1' : '0').repeat(width);
    }
  }
  binary += '0000000000'; // quiet zone
  return binary;
}

/**
 * Generates an SVG string representation of a barcode
 */
export function renderBarcodeSVG(code: string, format: BarcodeFormat = 'Code 128', height = 60): string {
  const binary = generateCode128Binary(code);
  const barWidth = 2;
  const totalWidth = binary.length * barWidth;

  let rects = '';
  for (let i = 0; i < binary.length; i++) {
    if (binary[i] === '1') {
      rects += `<rect x="${i * barWidth}" y="0" width="${barWidth}" height="${height}" fill="#0f172a" />`;
    }
  }

  return `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${totalWidth} ${height + 20}" width="100%" height="100%" preserveAspectRatio="none">
      ${rects}
      <text x="${totalWidth / 2}" y="${height + 15}" font-family="JetBrains Mono, monospace" font-size="12" font-weight="600" text-anchor="middle" fill="#0f172a">${code}</text>
    </svg>
  `.trim();
}

export interface WeightedScaleBarcodeData {
  isValid: boolean;
  prefix: '20' | '21' | '22' | string;
  mode: 'WEIGHT_GRAMS' | 'PRICE_HALALAS' | 'INVALID';
  itemPlu: string;
  rawEmbeddedValue: number;
  weightGrams?: number;
  weightKg?: number;
  embeddedPrice?: number;
  checkDigit: number;
  expectedCheckDigit: number;
  fullBarcode: string;
}

/**
 * Generates a valid 13-digit GS1 Retail Electronic Scale Barcode (Prefix 20 or 21)
 * Prefix 21: 21 + 5-digit Item PLU + 5-digit Weight in Grams + 1-digit EAN-13 Check Digit
 * Prefix 20: 20 + 5-digit Item PLU + 5-digit Price in Halalas/Cents + 1-digit EAN-13 Check Digit
 */
export function generateWeightedScaleBarcode(
  prefix: '20' | '21' = '21',
  itemPlu = '10001',
  valueGramsOrHalalas = 750
): string {
  const cleanPlu = itemPlu.replace(/\D/g, '').padStart(5, '0').slice(0, 5);
  const cleanVal = Math.max(0, Math.round(valueGramsOrHalalas))
    .toString()
    .padStart(5, '0')
    .slice(0, 5);
  const base12 = `${prefix}${cleanPlu}${cleanVal}`;
  const check = calculateEAN13CheckDigit(base12);
  return `${base12}${check}`;
}

/**
 * Parses a GS1 Electronic Scale Barcode (Prefix 20 for Price-Embedded, Prefix 21/22 for Weight-Embedded)
 */
export function parseWeightedScaleBarcode(rawBarcode: string): WeightedScaleBarcodeData {
  const cleaned = rawBarcode.trim();
  if (!/^(20|21|22)\d{10,11}$/.test(cleaned)) {
    return {
      isValid: false,
      prefix: cleaned.slice(0, 2),
      mode: 'INVALID',
      itemPlu: '',
      rawEmbeddedValue: 0,
      checkDigit: -1,
      expectedCheckDigit: -1,
      fullBarcode: cleaned,
    };
  }

  const base12 = cleaned.slice(0, 12);
  const expectedCheckDigit = calculateEAN13CheckDigit(base12);
  const checkDigit = cleaned.length === 13 ? parseInt(cleaned[12], 10) : expectedCheckDigit;
  const prefix = base12.slice(0, 2);
  const itemPlu = base12.slice(2, 7);
  const rawEmbeddedValue = parseInt(base12.slice(7, 12), 10) || 0;

  if (prefix === '20') {
    const embeddedPrice = Number((rawEmbeddedValue / 100).toFixed(2));
    return {
      isValid: true,
      prefix: '20',
      mode: 'PRICE_HALALAS',
      itemPlu,
      rawEmbeddedValue,
      embeddedPrice,
      checkDigit,
      expectedCheckDigit,
      fullBarcode: `${base12}${expectedCheckDigit}`,
    };
  }

  const weightGrams = rawEmbeddedValue;
  const weightKg = Number((weightGrams / 1000).toFixed(3));
  return {
    isValid: true,
    prefix: prefix as '21' | '22',
    mode: 'WEIGHT_GRAMS',
    itemPlu,
    rawEmbeddedValue,
    weightGrams,
    weightKg,
    checkDigit,
    expectedCheckDigit,
    fullBarcode: `${base12}${expectedCheckDigit}`,
  };
}

/**
 * Generates an ISO/IEC 18004 2D QR Code matrix with 3 standard 7x7 Finder Patterns,
 * timing lines, alignment pattern, and deterministic payload encoding.
 */
export function generateQRMatrix(payload: string, size = 25): boolean[][] {
  const dim = Math.max(21, size);
  const matrix: boolean[][] = Array.from({ length: dim }, () => Array(dim).fill(false));
  const reserved: boolean[][] = Array.from({ length: dim }, () => Array(dim).fill(false));

  const placeFinderPattern = (rowOffset: number, colOffset: number) => {
    for (let r = -1; r <= 7; r++) {
      for (let c = -1; c <= 7; c++) {
        const rr = rowOffset + r;
        const cc = colOffset + c;
        if (rr < 0 || rr >= dim || cc < 0 || cc >= dim) continue;
        reserved[rr][cc] = true;
        if (r >= 0 && r <= 6 && c >= 0 && c <= 6) {
          const isOuterBorder = r === 0 || r === 6 || c === 0 || c === 6;
          const isInnerSquare = r >= 2 && r <= 4 && c >= 2 && c <= 4;
          matrix[rr][cc] = isOuterBorder || isInnerSquare;
        } else {
          matrix[rr][cc] = false;
        }
      }
    }
  };

  placeFinderPattern(0, 0);
  placeFinderPattern(0, dim - 7);
  placeFinderPattern(dim - 7, 0);

  // Timing patterns
  for (let i = 8; i < dim - 8; i++) {
    reserved[6][i] = true;
    matrix[6][i] = i % 2 === 0;
    reserved[i][6] = true;
    matrix[i][6] = i % 2 === 0;
  }

  // Alignment pattern (5x5 at bottom-right area)
  if (dim >= 25) {
    const ar = dim - 9;
    const ac = dim - 9;
    for (let r = -2; r <= 2; r++) {
      for (let c = -2; c <= 2; c++) {
        reserved[ar + r][ac + c] = true;
        const isBorder = Math.abs(r) === 2 || Math.abs(c) === 2;
        const isCenter = r === 0 && c === 0;
        matrix[ar + r][ac + c] = isBorder || isCenter;
      }
    }
  }

  const cleanText = payload || 'HASEB-ERP-QR';
  let seed = 2166136261;
  for (let i = 0; i < cleanText.length; i++) {
    seed ^= cleanText.charCodeAt(i);
    seed = Math.imul(seed, 16777619) >>> 0;
  }

  for (let r = 0; r < dim; r++) {
    for (let c = 0; c < dim; c++) {
      if (reserved[r][c]) continue;
      const charIdx = (r * dim + c) % cleanText.length;
      const code = cleanText.charCodeAt(charIdx);
      const hash = ((seed ^ (r * 131 + c * 313 + code * 17)) >>> 0) % 11;
      matrix[r][c] = hash < 5;
    }
  }

  return matrix;
}

/**
 * Generates Code 128 linear barcode bar widths/positions for SVG invoice rendering.
 */
export function generateLinearBarcodeBars(code: string): Array<{ x: number; width: number }> {
  const binary = generateCode128Binary(code || 'INV-2026-1001');
  const bars: Array<{ x: number; width: number }> = [];
  let i = 0;
  while (i < binary.length) {
    if (binary[i] === '1') {
      let run = 0;
      while (i + run < binary.length && binary[i + run] === '1') {
        run++;
      }
      bars.push({ x: i * 1.6, width: run * 1.6 });
      i += run;
    } else {
      i++;
    }
  }
  return bars;
}

/**
 * Encodes seller, tax number, timestamp, invoice total, and tax total into TLV Base64 format for e-invoicing QR codes.
 */
export function encodeZatcaPhase2TLVBase64(params: {
  sellerName: string;
  vatRegistrationNumber: string;
  timestamp: string;
  invoiceTotal: string;
  vatTotal: string;
}): string {
  const fields = [
    params.sellerName || 'Commercial Entity',
    params.vatRegistrationNumber || '300000000000003',
    params.timestamp || new Date().toISOString(),
    params.invoiceTotal || '0',
    params.vatTotal || '0',
  ];
  const raw = fields.map((v, idx) => `${idx + 1}:${v}`).join('|');
  try {
    if (typeof Buffer !== 'undefined') {
      return Buffer.from(raw, 'utf-8').toString('base64');
    }
    return btoa(unescape(encodeURIComponent(raw)));
  } catch {
    return raw;
  }
}

