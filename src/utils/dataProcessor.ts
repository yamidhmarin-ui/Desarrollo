import * as XLSX from 'xlsx';
import {
  ColumnProfile,
  DataQualityReport,
  VariableType,
} from '../types';
import { calculateSummaryStats } from './math';

/**
 * Flexible number parser supporting:
 * - Spanish/Latin American decimals with comma: "12,5" -> 12.5
 * - Thousands separator with dot: "1.250,50" -> 1250.5
 * - Currency strings: "$ 45.000,00", "COP 15000", "USD 25.5"
 * - Percentages: "15,4%" -> 15.4
 * - Standard US notation: "1,500.75" -> 1500.75
 */
export function parseFlexibleNumber(val: any): number | null {
  if (val === null || val === undefined || val === '') return null;
  if (typeof val === 'number') return isNaN(val) || !isFinite(val) ? null : val;
  if (typeof val !== 'string') return null;

  let str = val.trim();
  if (!str) return null;

  // Remove common currency symbols, codes and whitespace
  str = str.replace(/[$€£¥\s]|USD|COP|MXN|EUR|PEN|CLP/gi, '');

  // Handle percentages
  if (str.endsWith('%')) {
    str = str.slice(0, -1).trim();
  }

  // Handle commas and dots
  const lastDot = str.lastIndexOf('.');
  const lastComma = str.lastIndexOf(',');

  if (lastComma > lastDot) {
    // Spanish/European notation: "1.234,56" or "1234,56"
    str = str.replace(/\./g, '').replace(',', '.');
  } else if (lastDot > lastComma) {
    // US notation: "1,234.56"
    str = str.replace(/,/g, '');
  } else if (lastComma !== -1 && lastDot === -1) {
    // Only comma present: "123,45"
    str = str.replace(',', '.');
  }

  const num = Number(str);
  return isNaN(num) || !isFinite(num) ? null : num;
}

/**
 * Smart Excel parser that detects true header rows, cleans column names,
 * and standardizes Spanish numeric formatting.
 */
export function parseExcelFile(
  fileData: ArrayBuffer
): { sheetNames: string[]; sheets: Record<string, any[]> } {
  const workbook = XLSX.read(fileData, { type: 'array', cellDates: true });
  const sheetNames = workbook.SheetNames;
  const sheets: Record<string, any[]> = {};

  for (const name of sheetNames) {
    const worksheet = workbook.Sheets[name];
    if (!worksheet) continue;

    // Read as 2D array of rows
    const rawRows: any[][] = XLSX.utils.sheet_to_json(worksheet, {
      header: 1,
      defval: null,
      blankrows: false,
    });

    if (!rawRows || rawRows.length === 0) {
      sheets[name] = [];
      continue;
    }

    // 1. Find true header row: first row with at least 2 non-empty text cells
    let headerIdx = -1;
    for (let r = 0; r < Math.min(rawRows.length, 10); r++) {
      const nonNullCells = (rawRows[r] || []).filter(
        (c) => c !== null && c !== undefined && String(c).trim() !== ''
      );
      if (nonNullCells.length >= 2) {
        headerIdx = r;
        break;
      }
    }

    if (headerIdx === -1) headerIdx = 0;

    const rawHeaderRow = rawRows[headerIdx] || [];
    // Clean headers and ensure uniqueness
    const usedNames = new Set<string>();
    const headers: string[] = rawHeaderRow.map((h, i) => {
      let cleaned = h !== null && h !== undefined ? String(h).trim() : `Columna_${i + 1}`;
      if (!cleaned || cleaned.startsWith('__EMPTY')) {
        cleaned = `Columna_${i + 1}`;
      }
      // Deduplicate if needed
      let uniqueName = cleaned;
      let counter = 1;
      while (usedNames.has(uniqueName)) {
        uniqueName = `${cleaned}_${counter++}`;
      }
      usedNames.add(uniqueName);
      return uniqueName;
    });

    // 2. Parse data rows
    const sheetData: Record<string, any>[] = [];
    for (let r = headerIdx + 1; r < rawRows.length; r++) {
      const row = rawRows[r];
      if (!row || !Array.isArray(row)) continue;

      // Check if entire row is empty
      const hasContent = row.some(
        (c) => c !== null && c !== undefined && String(c).trim() !== ''
      );
      if (!hasContent) continue;

      const rowObj: Record<string, any> = {};
      for (let c = 0; c < headers.length; c++) {
        const colName = headers[c];
        const rawVal = row[c];

        // Check if string can be parsed as a flexible number
        const parsedNum = parseFlexibleNumber(rawVal);
        if (parsedNum !== null && (typeof rawVal === 'string' || typeof rawVal === 'number')) {
          rowObj[colName] = parsedNum;
        } else if (rawVal instanceof Date) {
          rowObj[colName] = rawVal.toISOString().split('T')[0];
        } else {
          rowObj[colName] = rawVal !== undefined ? rawVal : null;
        }
      }
      sheetData.push(rowObj);
    }

    // 3. Remove completely blank columns (100% null)
    if (sheetData.length > 0) {
      const validColumns = headers.filter((h) =>
        sheetData.some((row) => row[h] !== null && row[h] !== undefined && row[h] !== '')
      );
      const cleanedData = sheetData.map((row) => {
        const pruned: Record<string, any> = {};
        for (const col of validColumns) {
          pruned[col] = row[col];
        }
        return pruned;
      });
      sheets[name] = cleanedData;
    } else {
      sheets[name] = [];
    }
  }

  return { sheetNames, sheets };
}

export function parsePastedText(text: string): Record<string, any>[] {
  if (!text || !text.trim()) return [];
  const workbook = XLSX.read(text, { type: 'string' });
  const firstSheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[firstSheetName];
  const rawRows: any[][] = XLSX.utils.sheet_to_json(worksheet, {
    header: 1,
    defval: null,
    blankrows: false,
  });

  if (!rawRows || rawRows.length < 2) return [];

  const headers = (rawRows[0] || []).map((h, i) =>
    h !== null && h !== undefined ? String(h).trim() : `Columna_${i + 1}`
  );

  const result: Record<string, any>[] = [];
  for (let r = 1; r < rawRows.length; r++) {
    const row = rawRows[r];
    if (!row || !row.some((c) => c !== null && c !== undefined && String(c).trim() !== '')) {
      continue;
    }
    const rowObj: Record<string, any> = {};
    for (let c = 0; c < headers.length; c++) {
      const key = headers[c];
      const rawVal = row[c];
      const parsedNum = parseFlexibleNumber(rawVal);
      if (parsedNum !== null) {
        rowObj[key] = parsedNum;
      } else {
        rowObj[key] = rawVal !== undefined ? rawVal : null;
      }
    }
    result.push(rowObj);
  }

  return result;
}

export function profileDataset(data: Record<string, any>[]): {
  profiles: ColumnProfile[];
  quality: DataQualityReport;
} {
  const totalRows = data.length;
  if (totalRows === 0) {
    return {
      profiles: [],
      quality: {
        totalRows: 0,
        totalCols: 0,
        duplicateRows: 0,
        totalMissingCells: 0,
        overallMissingPct: 0,
        columnsWithMissing: [],
        columnsWithOutliers: [],
        inconsistenciesDetected: [],
        imputationLog: [],
      },
    };
  }

  // Extract all distinct keys across rows
  const colSet = new Set<string>();
  for (const row of data) {
    if (row && typeof row === 'object') {
      Object.keys(row).forEach((k) => colSet.add(k));
    }
  }
  const columns = Array.from(colSet);
  const totalCols = columns.length;

  // Check duplicate rows
  const rowSignatures = new Set<string>();
  let duplicateRows = 0;
  for (const row of data) {
    const sig = JSON.stringify(row);
    if (rowSignatures.has(sig)) {
      duplicateRows++;
    } else {
      rowSignatures.add(sig);
    }
  }

  const profiles: ColumnProfile[] = [];
  const columnsWithMissing: string[] = [];
  const columnsWithOutliers: string[] = [];
  const inconsistenciesDetected: string[] = [];
  let totalMissingCells = 0;

  for (const col of columns) {
    const rawValues = data.map((r) => r[col]);
    let missingCount = 0;
    const nonMissingValues: any[] = [];

    for (const v of rawValues) {
      if (
        v === null ||
        v === undefined ||
        v === '' ||
        v === 'NA' ||
        v === 'N/A' ||
        v === 'nan' ||
        v === 'NaN' ||
        (typeof v === 'number' && isNaN(v))
      ) {
        missingCount++;
      } else {
        nonMissingValues.push(v);
      }
    }

    totalMissingCells += missingCount;
    const missingPct = Number(((missingCount / totalRows) * 100).toFixed(1));
    if (missingCount > 0) {
      columnsWithMissing.push(col);
    }

    // Determine type
    const uniqueValues = Array.from(new Set(nonMissingValues));
    const uniqueCount = uniqueValues.length;

    const isDate = nonMissingValues.slice(0, 15).some((v) => {
      if (v instanceof Date) return true;
      if (typeof v === 'string') {
        const d = Date.parse(v);
        return !isNaN(d) && (v.includes('-') || v.includes('/')) && v.length >= 8;
      }
      return false;
    });

    const colLower = col.toLowerCase();
    const isExplicitIdName =
      colLower === 'id' ||
      colLower.endsWith('_id') ||
      colLower.startsWith('id_') ||
      colLower.includes('codigo') ||
      colLower.includes('código') ||
      colLower.includes('uuid') ||
      colLower.includes('rut') ||
      colLower.includes('nit') ||
      colLower.includes('dni') ||
      colLower.includes('clave');

    // Number check using parseFlexibleNumber
    const numericValues: number[] = [];
    for (const v of nonMissingValues) {
      const parsed = parseFlexibleNumber(v);
      if (parsed !== null) {
        numericValues.push(parsed);
      }
    }

    // If at least 60% of values are valid numbers, treat as numeric
    const isNumeric =
      numericValues.length >= Math.max(1, nonMissingValues.length * 0.6) && numericValues.length > 0;

    // Check if it represents an economic/operational magnitude
    const isEconomicKpi =
      colLower.includes('precio') ||
      colLower.includes('price') ||
      colLower.includes('costo') ||
      colLower.includes('cost') ||
      colLower.includes('unidad') ||
      colLower.includes('unidades') ||
      colLower.includes('mrr') ||
      colLower.includes('ingreso') ||
      colLower.includes('ventas') ||
      colLower.includes('gasto') ||
      colLower.includes('inversion') ||
      colLower.includes('inversión') ||
      colLower.includes('demanda') ||
      colLower.includes('margen') ||
      colLower.includes('tasa') ||
      colLower.includes('descuento') ||
      colLower.includes('volumen') ||
      colLower.includes('produccion') ||
      colLower.includes('inventario');

    // Identifier classification:
    // - If it is an economic magnitude or has continuous decimals, it is NEVER an identifier.
    // - Only flag as identifier if explicitly named ID/codigo, or if it is text/string with >95% unique cardinality.
    let isIdentifier = false;
    if (isExplicitIdName && !isEconomicKpi) {
      isIdentifier = true;
    } else if (!isNumeric && !isDate && uniqueCount > totalRows * 0.95 && uniqueCount > 20) {
      // High cardinality text strings (e.g., Client Names, UUIDs, addresses)
      isIdentifier = true;
    }

    let inferredType: VariableType = 'categorical_nominal';
    let outlierCount = 0;
    let minVal: number | undefined;
    let maxVal: number | undefined;
    let meanVal: number | undefined;
    let medianVal: number | undefined;
    let stdVal: number | undefined;
    let skewnessVal: number | undefined;
    let kurtosisVal: number | undefined;
    let q1Val: number | undefined;
    let q3Val: number | undefined;

    if (uniqueCount <= 1) {
      inferredType = 'irrelevant';
    } else if (isIdentifier) {
      inferredType = 'identifier';
    } else if (isDate) {
      inferredType = 'date';
    } else if (isNumeric) {
      const stats = calculateSummaryStats(numericValues);
      minVal = stats.min;
      maxVal = stats.max;
      meanVal = stats.mean;
      medianVal = stats.median;
      stdVal = stats.stdDev;
      skewnessVal = stats.skewness;
      kurtosisVal = stats.kurtosis;
      q1Val = stats.q1;
      q3Val = stats.q3;

      // Detect outliers using Tukey IQR
      const lowerFence = stats.q1 - 1.5 * stats.iqr;
      const upperFence = stats.q3 + 1.5 * stats.iqr;
      outlierCount = numericValues.filter((v) => v < lowerFence || v > upperFence).length;

      if (outlierCount > 0) {
        columnsWithOutliers.push(col);
      }

      // Check business inconsistencies: negative prices/costs/quantities
      const isBusinessQuantity =
        colLower.includes('precio') ||
        colLower.includes('price') ||
        colLower.includes('costo') ||
        colLower.includes('cost') ||
        colLower.includes('unidad') ||
        colLower.includes('unidades') ||
        colLower.includes('mrr') ||
        colLower.includes('ingreso') ||
        colLower.includes('ventas') ||
        colLower.includes('gasto') ||
        colLower.includes('inversion') ||
        colLower.includes('inventario');

      if (isBusinessQuantity && stats.min < 0) {
        inconsistenciesDetected.push(
          `Columna "${col}" contiene valores negativos (${stats.min}), atípico para una magnitud económica/física.`
        );
      }

      const allIntegers = numericValues.every((v) => Number.isInteger(v));
      if (allIntegers && uniqueCount < 20) {
        inferredType = 'numeric_discrete';
      } else {
        inferredType = 'numeric_continuous';
      }
    } else {
      // Categorical
      const lowerVals = nonMissingValues.map((v) => String(v).toLowerCase());
      const ordinalKeywords = [
        'bajo',
        'medio',
        'alto',
        'primero',
        'segundo',
        'tercero',
        'starter',
        'pro',
        'tier 1',
      ];
      const hasOrdinal = ordinalKeywords.some((kw) => lowerVals.includes(kw));

      inferredType = hasOrdinal ? 'categorical_ordinal' : 'categorical_nominal';
    }

    // Category frequency
    let categories: { label: string; count: number }[] | undefined;
    if (inferredType === 'categorical_nominal' || inferredType === 'categorical_ordinal') {
      const counts: Record<string, number> = {};
      for (const val of nonMissingValues) {
        const str = String(val);
        counts[str] = (counts[str] || 0) + 1;
      }
      categories = Object.entries(counts)
        .map(([label, count]) => ({ label, count }))
        .sort((a, b) => b.count - a.count);
    }

    profiles.push({
      name: col,
      originalName: col,
      type: inferredType,
      inferredType,
      sampleValues: nonMissingValues.slice(0, 5),
      uniqueCount,
      missingCount,
      missingPct,
      outlierCount,
      min: minVal,
      max: maxVal,
      mean: meanVal,
      median: medianVal,
      stdDev: stdVal,
      skewness: skewnessVal,
      kurtosis: kurtosisVal,
      q1: q1Val,
      q3: q3Val,
      categories,
      isIdentifier,
      isDate,
      cardinalityTooHigh:
        (inferredType === 'categorical_nominal' || inferredType === 'categorical_ordinal') &&
        uniqueCount > 20,
    });
  }

  const overallMissingPct = Number(
    ((totalMissingCells / (totalRows * totalCols)) * 100).toFixed(2)
  );

  return {
    profiles,
    quality: {
      totalRows,
      totalCols,
      duplicateRows,
      totalMissingCells,
      overallMissingPct,
      columnsWithMissing,
      columnsWithOutliers,
      inconsistenciesDetected,
      imputationLog: [],
    },
  };
}

/**
 * Impute missing data according to variable nature
 */
export function imputeDataset(
  data: Record<string, any>[],
  profiles: ColumnProfile[],
  dependentVariable?: string
): {
  imputedData: Record<string, any>[];
  imputationLog: DataQualityReport['imputationLog'];
} {
  const imputedData = data.map((r) => ({ ...r }));
  const imputationLog: DataQualityReport['imputationLog'] = [];

  for (const profile of profiles) {
    if (profile.missingCount === 0) continue;
    const col = profile.name;

    if (col === dependentVariable) {
      let imputedCount = 0;
      const medianVal = profile.median ?? 0;
      for (let i = 0; i < imputedData.length; i++) {
        const val = imputedData[i][col];
        if (
          val === null ||
          val === undefined ||
          val === '' ||
          (typeof val === 'number' && isNaN(val))
        ) {
          imputedData[i][col] = medianVal;
          imputedCount++;
        }
      }
      imputationLog.push({
        column: col,
        method: 'median',
        valuesImputed: imputedCount,
        reason:
          'Variable Dependiente (Y): Imputada con mediana muestral para preservar tamaño de muestra. Se sugiere verificar filas con valores originales nulos para evitar sesgos.',
      });
      continue;
    }

    if (profile.type === 'numeric_continuous' || profile.type === 'numeric_discrete') {
      const useMedian =
        (profile.skewness && Math.abs(profile.skewness) > 1) || profile.outlierCount > 0;
      const replacement = useMedian ? profile.median ?? profile.mean ?? 0 : profile.mean ?? 0;
      let count = 0;

      for (let i = 0; i < imputedData.length; i++) {
        const val = imputedData[i][col];
        if (
          val === null ||
          val === undefined ||
          val === '' ||
          (typeof val === 'number' && isNaN(val))
        ) {
          imputedData[i][col] = Number(replacement.toFixed(2));
          count++;
        }
      }

      imputationLog.push({
        column: col,
        method: useMedian ? 'median' : 'mean',
        valuesImputed: count,
        reason: useMedian
          ? `Distribución asimétrica (Asim=${profile.skewness?.toFixed(2)}) o presencia de atípicos; se empleó Mediana (${replacement.toFixed(2)}) por ser estadístico robusto.`
          : `Distribución simétrica; se imputó con la Media muestral (${replacement.toFixed(2)}).`,
      });
    } else if (profile.type === 'date') {
      let count = 0;
      let lastValid: any = null;
      for (let i = 0; i < imputedData.length; i++) {
        const val = imputedData[i][col];
        if (val !== null && val !== undefined && val !== '') {
          lastValid = val;
        } else if (lastValid !== null) {
          imputedData[i][col] = lastValid;
          count++;
        }
      }
      imputationLog.push({
        column: col,
        method: 'linear_interpolation',
        valuesImputed: count,
        reason:
          'Variable temporal: Imputación por arrastre de fecha previa (forward fill) para mantener continuidad en la serie.',
      });
    } else {
      const topCat =
        profile.categories && profile.categories[0]
          ? profile.categories[0].label
          : 'Desconocido';
      let count = 0;
      for (let i = 0; i < imputedData.length; i++) {
        const val = imputedData[i][col];
        if (val === null || val === undefined || val === '') {
          imputedData[i][col] = topCat;
          count++;
        }
      }
      imputationLog.push({
        column: col,
        method: 'mode',
        valuesImputed: count,
        reason: `Variable categórica: Imputada con la moda poblacional ("${topCat}") que representa la categoría más frecuente.`,
      });
    }
  }

  return { imputedData, imputationLog };
}

/**
 * One-Hot Encoding transformation
 */
export function buildOneHotEncodedDataset(
  data: Record<string, any>[],
  profiles: ColumnProfile[],
  selectedFeatureCols: string[],
  targetCol: string
): {
  encodedData: Record<string, number>[];
  featureNames: string[];
  dummyMap: Record<string, { originalCol: string; category: string; referenceCategory: string }>;
  droppedCategories: Record<string, string>;
} {
  const dummyMap: Record<
    string,
    { originalCol: string; category: string; referenceCategory: string }
  > = {};
  const droppedCategories: Record<string, string> = {};
  const featureNames: string[] = [];

  const categoricalFeatures: { col: string; categories: string[]; refCat: string }[] = [];
  const numericFeatures: string[] = [];

  for (const colName of selectedFeatureCols) {
    if (colName === targetCol) continue;
    const prof = profiles.find((p) => p.name === colName);
    if (!prof) continue;

    if (prof.type === 'categorical_nominal' || prof.type === 'categorical_ordinal') {
      const distinctCats = (prof.categories || []).map((c) => c.label);
      if (distinctCats.length <= 1 || distinctCats.length > 20) continue;

      const refCat = distinctCats[0];
      droppedCategories[colName] = refCat;

      // Limit to at most 4 active categories to preserve degrees of freedom
      const activeCats = distinctCats.slice(1, 5);
      categoricalFeatures.push({ col: colName, categories: activeCats, refCat });

      for (const cat of activeCats) {
        const dummyName = `${colName}__${cat.replace(/[^a-zA-Z0-9_]/g, '_')}`;
        featureNames.push(dummyName);
        dummyMap[dummyName] = {
          originalCol: colName,
          category: cat,
          referenceCategory: refCat,
        };
      }
    } else if (prof.type === 'numeric_continuous' || prof.type === 'numeric_discrete') {
      numericFeatures.push(colName);
      featureNames.push(colName);
    }
  }

  // Construct numeric records
  const encodedData: Record<string, number>[] = data.map((row) => {
    const encRow: Record<string, number> = {};

    for (const numCol of numericFeatures) {
      const val = parseFlexibleNumber(row[numCol]);
      encRow[numCol] = val !== null ? val : 0;
    }

    for (const catFeat of categoricalFeatures) {
      const rowVal = String(row[catFeat.col]);
      for (const cat of catFeat.categories) {
        const dummyName = `${catFeat.col}__${cat.replace(/[^a-zA-Z0-9_]/g, '_')}`;
        encRow[dummyName] = rowVal === cat ? 1 : 0;
      }
    }

    const targetVal = parseFlexibleNumber(row[targetCol]);
    encRow[targetCol] = targetVal !== null ? targetVal : 0;

    return encRow;
  });

  return {
    encodedData,
    featureNames,
    dummyMap,
    droppedCategories,
  };
}

/**
 * Multi-sheet Excel workbook exporter
 */
export function exportAnalysisToExcel(params: {
  filename: string;
  processedData: Record<string, any>[];
  modelSummary: Record<string, any>[];
  coefficients: Record<string, any>[];
  scenarios: Record<string, any>[];
  recommendations: Record<string, any>[];
}) {
  const wb = XLSX.utils.book_new();

  const wsModels = XLSX.utils.json_to_sheet(params.modelSummary);
  XLSX.utils.book_append_sheet(wb, wsModels, 'Resumen de Modelos');

  const wsCoefs = XLSX.utils.json_to_sheet(params.coefficients);
  XLSX.utils.book_append_sheet(wb, wsCoefs, 'Coeficientes e Impactos');

  const wsScenarios = XLSX.utils.json_to_sheet(params.scenarios);
  XLSX.utils.book_append_sheet(wb, wsScenarios, 'Simulaciones de Negocio');

  const wsRecs = XLSX.utils.json_to_sheet(params.recommendations);
  XLSX.utils.book_append_sheet(wb, wsRecs, 'Recomendaciones Estrategicas');

  const wsData = XLSX.utils.json_to_sheet(params.processedData);
  XLSX.utils.book_append_sheet(wb, wsData, 'Dataset Procesado');

  XLSX.writeFile(wb, `${params.filename}.xlsx`);
}
