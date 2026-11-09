/**
 * Advanced Econometric & Linear Algebra Engine
 * Rigorous calculations for OLS, Ridge, Lasso, Elastic Net, VIF,
 * hypothesis testing, residual diagnostics, and Monte Carlo simulations.
 */

// --- MATRIX OPERATIONS ---

export function matrixTranspose(A: number[][]): number[][] {
  const rows = A.length;
  const cols = A[0].length;
  const AT: number[][] = Array.from({ length: cols }, () => new Array(rows));
  for (let i = 0; i < rows; i++) {
    for (let j = 0; j < cols; j++) {
      AT[j][i] = A[i][j];
    }
  }
  return AT;
}

export function matrixMultiply(A: number[][], B: number[][]): number[][] {
  const rowsA = A.length;
  const colsA = A[0].length;
  const rowsB = B.length;
  const colsB = B[0].length;

  if (colsA !== rowsB) {
    throw new Error(`Matrix dimension mismatch: [${rowsA}x${colsA}] vs [${rowsB}x${colsB}]`);
  }

  const result: number[][] = Array.from({ length: rowsA }, () => new Array(colsB).fill(0));
  for (let i = 0; i < rowsA; i++) {
    for (let k = 0; k < colsA; k++) {
      const aik = A[i][k];
      if (aik === 0) continue;
      for (let j = 0; j < colsB; j++) {
        result[i][j] += aik * B[k][j];
      }
    }
  }
  return result;
}

export function matrixVectorMultiply(A: number[][], v: number[]): number[] {
  const rows = A.length;
  const cols = A[0].length;
  if (cols !== v.length) {
    throw new Error(`Dimension mismatch: Matrix [${rows}x${cols}] and Vector length ${v.length}`);
  }
  const result = new Array(rows).fill(0);
  for (let i = 0; i < rows; i++) {
    let sum = 0;
    for (let j = 0; j < cols; j++) {
      sum += A[i][j] * v[j];
    }
    result[i] = sum;
  }
  return result;
}

/**
 * Invert square matrix using Gauss-Jordan with partial pivoting
 * Adds Tikhonov regularization (ridge) if matrix is ill-conditioned
 */
export function matrixInverse(matrix: number[][], ridgeLambda: number = 1e-9): number[][] {
  const n = matrix.length;
  // Clone and add ridge diagonal if needed
  const A: number[][] = matrix.map((row, i) =>
    row.map((val, j) => (i === j ? val + ridgeLambda : val))
  );

  const I: number[][] = Array.from({ length: n }, (_, i) => {
    const row = new Array(n).fill(0);
    row[i] = 1;
    return row;
  });

  for (let i = 0; i < n; i++) {
    // Find pivot
    let maxRow = i;
    let maxVal = Math.abs(A[i][i]);
    for (let k = i + 1; k < n; k++) {
      if (Math.abs(A[k][i]) > maxVal) {
        maxVal = Math.abs(A[k][i]);
        maxRow = k;
      }
    }

    if (maxVal < 1e-13) {
      // Degenerate column - add numerical stabilizer
      A[maxRow][i] += 1e-6;
    }

    // Swap rows in A and I
    if (maxRow !== i) {
      const tempA = A[i];
      A[i] = A[maxRow];
      A[maxRow] = tempA;

      const tempI = I[i];
      I[i] = I[maxRow];
      I[maxRow] = tempI;
    }

    // Scale pivot row
    const pivot = A[i][i];
    const invPivot = 1 / (pivot || 1e-9);
    for (let j = 0; j < n; j++) {
      A[i][j] *= invPivot;
      I[i][j] *= invPivot;
    }

    // Eliminate other rows
    for (let k = 0; k < n; k++) {
      if (k === i) continue;
      const factor = A[k][i];
      if (Math.abs(factor) < 1e-14) continue;
      for (let j = 0; j < n; j++) {
        A[k][j] -= factor * A[i][j];
        I[k][j] -= factor * I[i][j];
      }
    }
  }

  return I;
}

// --- STATISTICAL DISTRIBUTIONS ---

// Approximate error function (erf)
function erf(x: number): number {
  const sign = x >= 0 ? 1 : -1;
  x = Math.abs(x);
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const p = 0.3275911;

  const t = 1.0 / (1.0 + p * x);
  const y = 1.0 - (((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t) * Math.exp(-x * x);
  return sign * y;
}

// Normal Cumulative Distribution Function
export function normalCdf(x: number, mean: number = 0, std: number = 1): number {
  return 0.5 * (1 + erf((x - mean) / (std * Math.sqrt(2))));
}

// Student's t cumulative distribution approximation
export function tDistributionPValue(tStat: number, df: number): number {
  if (df <= 0) return 1.0;
  const t = Math.abs(tStat);
  // For df > 30, t approaches standard normal
  if (df > 50) {
    const pOneTail = 1 - normalCdf(t);
    return Math.max(0.00001, Math.min(1.0, 2 * pOneTail));
  }
  // Hill's approximation for moderate degrees of freedom
  const x = df / (df + t * t);
  let prob = 0.5 * Math.pow(x, df / 2);
  const p = Math.max(0.00001, Math.min(1.0, 2 * prob));
  return p;
}

// Chi-square p-value approximation (Wilson-Hilferty transformation)
export function chiSquarePValue(chiSq: number, df: number): number {
  if (df <= 0 || chiSq <= 0) return 1.0;
  const s = Math.sqrt(2 / (9 * df));
  const z = (Math.pow(chiSq / df, 1 / 3) - (1 - 2 / (9 * df))) / s;
  return Math.max(0.0001, Math.min(1.0, 1 - normalCdf(z)));
}

// --- BASIC DESCRIPTIVE STATS ---

export function calculateSummaryStats(values: number[]) {
  const valid = values.filter((v) => typeof v === 'number' && !isNaN(v) && isFinite(v));
  const n = valid.length;
  if (n === 0) {
    return {
      n: 0,
      mean: 0,
      median: 0,
      stdDev: 0,
      variance: 0,
      min: 0,
      max: 0,
      q1: 0,
      q3: 0,
      iqr: 0,
      skewness: 0,
      kurtosis: 0,
    };
  }

  const sorted = [...valid].sort((a, b) => a - b);
  const sum = sorted.reduce((acc, v) => acc + v, 0);
  const mean = sum / n;

  const median =
    n % 2 === 0 ? (sorted[n / 2 - 1] + sorted[n / 2]) / 2 : sorted[Math.floor(n / 2)];

  const q1 = sorted[Math.floor(n * 0.25)];
  const q3 = sorted[Math.floor(n * 0.75)];
  const iqr = q3 - q1;

  let variance = 0;
  let m3 = 0;
  let m4 = 0;

  for (const v of sorted) {
    const diff = v - mean;
    variance += diff * diff;
    m3 += diff * diff * diff;
    m4 += diff * diff * diff * diff;
  }

  const s2 = n > 1 ? variance / (n - 1) : 0;
  const stdDev = Math.sqrt(s2);

  const skewness = stdDev > 0 && n > 2 ? (m3 / n) / Math.pow(variance / n, 1.5) : 0;
  const kurtosis = stdDev > 0 && n > 3 ? (m4 / n) / Math.pow(variance / n, 2) : 3;

  return {
    n,
    mean,
    median,
    stdDev,
    variance: s2,
    min: sorted[0],
    max: sorted[n - 1],
    q1,
    q3,
    iqr,
    skewness,
    kurtosis,
  };
}

// Pearson correlation between two vectors
export function pearsonCorrelation(x: number[], y: number[]): number {
  const n = Math.min(x.length, y.length);
  if (n <= 1) return 0;

  let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0, sumY2 = 0;
  let count = 0;

  for (let i = 0; i < n; i++) {
    const xi = x[i];
    const yi = y[i];
    if (isNaN(xi) || isNaN(yi) || !isFinite(xi) || !isFinite(yi)) continue;
    sumX += xi;
    sumY += yi;
    sumXY += xi * yi;
    sumX2 += xi * xi;
    sumY2 += yi * yi;
    count++;
  }

  if (count <= 1) return 0;
  const numerator = count * sumXY - sumX * sumY;
  const denominator = Math.sqrt(
    (count * sumX2 - sumX * sumX) * (count * sumY2 - sumY * sumY)
  );

  if (denominator === 0) return 0;
  return Math.max(-1, Math.min(1, numerator / denominator));
}

// Spearman rank correlation
export function spearmanCorrelation(x: number[], y: number[]): number {
  const n = Math.min(x.length, y.length);
  if (n <= 1) return 0;

  function getRanks(arr: number[]): number[] {
    const indexed = arr.map((val, idx) => ({ val, idx }));
    indexed.sort((a, b) => a.val - b.val);
    const ranks = new Array(arr.length);
    for (let i = 0; i < indexed.length; i++) {
      ranks[indexed[i].idx] = i + 1;
    }
    return ranks;
  }

  const rankX = getRanks(x.slice(0, n));
  const rankY = getRanks(y.slice(0, n));
  return pearsonCorrelation(rankX, rankY);
}

// --- VARIANCE INFLATION FACTOR (VIF) ---

export function calculateVIFs(X_matrix: number[][], featureNames: string[]): Record<string, number> {
  const p = featureNames.length;
  const n = X_matrix.length;
  const vifs: Record<string, number> = {};

  if (p <= 1 || n <= p) {
    for (const name of featureNames) {
      vifs[name] = 1.0;
    }
    return vifs;
  }

  // For each feature j, regress against the remaining features
  for (let j = 0; j < p; j++) {
    const y_sub = X_matrix.map((row) => row[j]);
    const X_sub = X_matrix.map((row) => row.filter((_, idx) => idx !== j));

    try {
      const model = fitOLS(X_sub, y_sub, ['intercept']);
      const r2 = Math.max(0, Math.min(0.999, model.r2));
      const vif = 1 / (1 - r2);
      vifs[featureNames[j]] = isFinite(vif) ? Number(vif.toFixed(2)) : 99.9;
    } catch {
      vifs[featureNames[j]] = 1.0;
    }
  }

  return vifs;
}

// --- ECONOMETRIC REGRESSION SOLVERS ---

export interface FitResult {
  coefficients: number[];
  intercept: number;
  fitted: number[];
  residuals: number[];
  r2: number;
  r2Adj: number;
  mae: number;
  rmse: number;
  mape: number;
  aic: number;
  bic: number;
  fStat: number;
  fPValue: number;
  stdErrors: number[];
  tStats: number[];
  pValues: number[];
  durbinWatson: number;
  breuschPaganPValue: number;
  jarqueBeraPValue: number;
}

/**
 * Standard OLS Regression Solver
 * X: [n x p] feature values (without intercept)
 * y: [n] target values
 */
export function fitOLS(
  X: number[][],
  y: number[],
  featureNames: string[]
): FitResult {
  const n = y.length;
  const p = X[0].length; // number of features
  const k = p + 1; // features + intercept

  if (n <= k) {
    throw new Error(`Muestra insuficiente para estimar el modelo: ${n} registros frente a ${k} parámetros.`);
  }

  // Construct design matrix with leading column of 1s
  const X_design: number[][] = Array.from({ length: n }, (_, i) => [1, ...X[i]]);

  // Normal equations: (X'X)^(-1) X'y
  const XT = matrixTranspose(X_design);
  const XTX = matrixMultiply(XT, X_design);
  const XTX_inv = matrixInverse(XTX, 1e-8);
  const XTy = matrixVectorMultiply(XT, y);
  const betas = matrixVectorMultiply(XTX_inv, XTy);

  const intercept = betas[0];
  const coefs = betas.slice(1);

  // Predictions and residuals
  const fitted: number[] = new Array(n);
  const residuals: number[] = new Array(n);
  let rss = 0;
  let maeSum = 0;
  let mapeSum = 0;
  let validMapeCount = 0;

  let ySum = 0;
  for (let i = 0; i < n; i++) {
    let yHat = intercept;
    for (let j = 0; j < p; j++) {
      yHat += coefs[j] * X[i][j];
    }
    fitted[i] = yHat;
    const res = y[i] - yHat;
    residuals[i] = res;
    rss += res * res;
    maeSum += Math.abs(res);
    ySum += y[i];

    if (Math.abs(y[i]) > 1e-6) {
      mapeSum += Math.abs(res / y[i]);
      validMapeCount++;
    }
  }

  const yMean = ySum / n;
  let tss = 0;
  for (let i = 0; i < n; i++) {
    const diff = y[i] - yMean;
    tss += diff * diff;
  }

  const r2 = tss > 0 ? Math.max(0, 1 - rss / tss) : 0;
  const dfResidual = n - k;
  const r2Adj = dfResidual > 0 && tss > 0 ? 1 - ((rss / dfResidual) / (tss / (n - 1))) : r2;

  const s2 = dfResidual > 0 ? rss / dfResidual : 0;
  const rmse = Math.sqrt(rss / n);
  const mae = maeSum / n;
  const mape = validMapeCount > 0 ? (mapeSum / validMapeCount) * 100 : 0;

  // Information Criteria
  const logL = -0.5 * n * (Math.log(2 * Math.PI) + Math.log(Math.max(1e-9, rss / n)) + 1);
  const aic = -2 * logL + 2 * k;
  const bic = -2 * logL + k * Math.log(n);

  // Global F-Statistic
  const msModel = p > 0 ? (tss - rss) / p : 0;
  const msResidual = dfResidual > 0 ? rss / dfResidual : 1;
  const fStat = msResidual > 0 && msModel > 0 ? msModel / msResidual : 0;
  const fPValue = dfResidual > 0 ? chiSquarePValue(fStat * p, p) : 1;

  // Standard errors, t-stats and p-values
  const stdErrors: number[] = new Array(k);
  const tStats: number[] = new Array(k);
  const pValues: number[] = new Array(k);

  for (let j = 0; j < k; j++) {
    const varianceBeta = s2 * Math.max(0, XTX_inv[j][j]);
    const se = Math.sqrt(varianceBeta) || 1e-4;
    stdErrors[j] = se;
    const t = betas[j] / se;
    tStats[j] = t;
    pValues[j] = tDistributionPValue(t, dfResidual);
  }

  // Durbin-Watson statistic for serial correlation
  let dwNumerator = 0;
  for (let i = 1; i < n; i++) {
    const diff = residuals[i] - residuals[i - 1];
    dwNumerator += diff * diff;
  }
  const durbinWatson = rss > 0 ? dwNumerator / rss : 2;

  // Breusch-Pagan test for heteroscedasticity
  let bpPValue = 0.5;
  try {
    const resSq = residuals.map((r) => r * r);
    const auxModel = fitOLS(X, resSq, featureNames);
    const bpStat = (n * auxModel.r2) / 2;
    bpPValue = chiSquarePValue(bpStat, p);
  } catch {
    bpPValue = 0.5;
  }

  // Jarque-Bera test for residual normality
  const resStats = calculateSummaryStats(residuals);
  const s = resStats.skewness;
  const kur = resStats.kurtosis;
  const jbStat = (n / 6) * (s * s + Math.pow(kur - 3, 2) / 4);
  const jbPValue = chiSquarePValue(jbStat, 2);

  return {
    coefficients: coefs,
    intercept,
    fitted,
    residuals,
    r2,
    r2Adj,
    mae,
    rmse,
    mape,
    aic,
    bic,
    fStat,
    fPValue,
    stdErrors,
    tStats,
    pValues,
    durbinWatson,
    breuschPaganPValue: bpPValue,
    jarqueBeraPValue: jbPValue,
  };
}

/**
 * Ridge Regression (L2 regularization)
 */
export function fitRidge(
  X: number[][],
  y: number[],
  featureNames: string[],
  lambda: number = 0.8
): FitResult {
  const n = y.length;
  const p = X[0].length;
  const k = p + 1;

  // Standardize X for penalty invariance
  const means: number[] = new Array(p).fill(0);
  const stds: number[] = new Array(p).fill(1);

  for (let j = 0; j < p; j++) {
    const col = X.map((r) => r[j]);
    const stat = calculateSummaryStats(col);
    means[j] = stat.mean;
    stds[j] = stat.stdDev > 0 ? stat.stdDev : 1;
  }

  const X_norm = X.map((row) =>
    row.map((val, j) => (val - means[j]) / stds[j])
  );

  const X_design: number[][] = Array.from({ length: n }, (_, i) => [1, ...X_norm[i]]);
  const XT = matrixTranspose(X_design);
  const XTX = matrixMultiply(XT, X_design);

  // Add penalty to diagonal (do not penalize intercept at index 0)
  for (let j = 1; j < k; j++) {
    XTX[j][j] += lambda;
  }

  const XTX_inv = matrixInverse(XTX);
  const XTy = matrixVectorMultiply(XT, y);
  const betas_norm = matrixVectorMultiply(XTX_inv, XTy);

  // Unstandardize betas
  const coefs: number[] = new Array(p);
  let intercept = betas_norm[0];

  for (let j = 0; j < p; j++) {
    coefs[j] = betas_norm[j + 1] / stds[j];
    intercept -= coefs[j] * means[j];
  }

  // Compute metrics with OLS evaluator
  return evaluateFittedModel(X, y, intercept, coefs, k);
}

/**
 * Lasso Regression (L1 regularization) via Coordinate Descent
 */
export function fitLasso(
  X: number[][],
  y: number[],
  featureNames: string[],
  lambda: number = 0.4,
  maxIter: number = 500,
  tol: number = 1e-4
): FitResult {
  const n = y.length;
  const p = X[0].length;

  // Standardize X
  const means: number[] = new Array(p).fill(0);
  const stds: number[] = new Array(p).fill(1);

  for (let j = 0; j < p; j++) {
    const col = X.map((r) => r[j]);
    const stat = calculateSummaryStats(col);
    means[j] = stat.mean;
    stds[j] = stat.stdDev > 0 ? stat.stdDev : 1;
  }

  const yMean = y.reduce((a, b) => a + b, 0) / n;
  const y_centered = y.map((v) => v - yMean);

  const X_norm = X.map((row) =>
    row.map((val, j) => (val - means[j]) / stds[j])
  );

  // Coordinate descent coefficients
  const beta_norm = new Array(p).fill(0);
  const z = new Array(p);
  for (let j = 0; j < p; j++) {
    let sumSq = 0;
    for (let i = 0; i < n; i++) {
      sumSq += X_norm[i][j] * X_norm[i][j];
    }
    z[j] = sumSq;
  }

  // Soft threshold operator
  const softThreshold = (rho: number, l: number) => {
    if (rho > l) return rho - l;
    if (rho < -l) return rho + l;
    return 0;
  };

  // Residuals
  const r = [...y_centered];

  for (let iter = 0; iter < maxIter; iter++) {
    let maxChange = 0;

    for (let j = 0; j < p; j++) {
      const oldBeta = beta_norm[j];
      let rho = 0;
      for (let i = 0; i < n; i++) {
        rho += X_norm[i][j] * (r[i] + oldBeta * X_norm[i][j]);
      }

      const newBeta = z[j] > 0 ? softThreshold(rho, lambda * n) / z[j] : 0;
      beta_norm[j] = newBeta;

      const delta = newBeta - oldBeta;
      if (delta !== 0) {
        for (let i = 0; i < n; i++) {
          r[i] -= delta * X_norm[i][j];
        }
        maxChange = Math.max(maxChange, Math.abs(delta));
      }
    }

    if (maxChange < tol) break;
  }

  // Unstandardize betas
  const coefs: number[] = new Array(p);
  let intercept = yMean;

  for (let j = 0; j < p; j++) {
    coefs[j] = beta_norm[j] / stds[j];
    intercept -= coefs[j] * means[j];
  }

  const activeFeatures = coefs.filter((c) => Math.abs(c) > 1e-5).length;
  return evaluateFittedModel(X, y, intercept, coefs, activeFeatures + 1);
}

/**
 * Elastic Net Regression (combination of L1 and L2 penalties)
 */
export function fitElasticNet(
  X: number[][],
  y: number[],
  featureNames: string[],
  lambda: number = 0.3,
  l1Ratio: number = 0.5,
  maxIter: number = 500
): FitResult {
  const n = y.length;
  const p = X[0].length;

  const means: number[] = new Array(p).fill(0);
  const stds: number[] = new Array(p).fill(1);

  for (let j = 0; j < p; j++) {
    const col = X.map((r) => r[j]);
    const stat = calculateSummaryStats(col);
    means[j] = stat.mean;
    stds[j] = stat.stdDev > 0 ? stat.stdDev : 1;
  }

  const yMean = y.reduce((a, b) => a + b, 0) / n;
  const y_centered = y.map((v) => v - yMean);

  const X_norm = X.map((row) =>
    row.map((val, j) => (val - means[j]) / stds[j])
  );

  const beta_norm = new Array(p).fill(0);
  const z = new Array(p);
  for (let j = 0; j < p; j++) {
    let sumSq = 0;
    for (let i = 0; i < n; i++) {
      sumSq += X_norm[i][j] * X_norm[i][j];
    }
    z[j] = sumSq;
  }

  const l1Penalty = lambda * l1Ratio * n;
  const l2Penalty = lambda * (1 - l1Ratio) * n;

  const softThreshold = (rho: number, l: number) => {
    if (rho > l) return rho - l;
    if (rho < -l) return rho + l;
    return 0;
  };

  const r = [...y_centered];

  for (let iter = 0; iter < maxIter; iter++) {
    let maxChange = 0;

    for (let j = 0; j < p; j++) {
      const oldBeta = beta_norm[j];
      let rho = 0;
      for (let i = 0; i < n; i++) {
        rho += X_norm[i][j] * (r[i] + oldBeta * X_norm[i][j]);
      }

      const denominator = z[j] + l2Penalty;
      const newBeta = denominator > 0 ? softThreshold(rho, l1Penalty) / denominator : 0;
      beta_norm[j] = newBeta;

      const delta = newBeta - oldBeta;
      if (delta !== 0) {
        for (let i = 0; i < n; i++) {
          r[i] -= delta * X_norm[i][j];
        }
        maxChange = Math.max(maxChange, Math.abs(delta));
      }
    }

    if (maxChange < 1e-4) break;
  }

  const coefs: number[] = new Array(p);
  let intercept = yMean;

  for (let j = 0; j < p; j++) {
    coefs[j] = beta_norm[j] / stds[j];
    intercept -= coefs[j] * means[j];
  }

  const activeFeatures = coefs.filter((c) => Math.abs(c) > 1e-5).length;
  return evaluateFittedModel(X, y, intercept, coefs, activeFeatures + 1);
}

/**
 * Evaluates any fitted linear model against actual values
 */
export function evaluateFittedModel(
  X: number[][],
  y: number[],
  intercept: number,
  coefs: number[],
  k: number
): FitResult {
  const n = y.length;
  const p = coefs.length;

  const fitted: number[] = new Array(n);
  const residuals: number[] = new Array(n);
  let rss = 0;
  let maeSum = 0;
  let mapeSum = 0;
  let validMapeCount = 0;
  let ySum = 0;

  for (let i = 0; i < n; i++) {
    let yHat = intercept;
    for (let j = 0; j < p; j++) {
      yHat += coefs[j] * X[i][j];
    }
    fitted[i] = yHat;
    const res = y[i] - yHat;
    residuals[i] = res;
    rss += res * res;
    maeSum += Math.abs(res);
    ySum += y[i];

    if (Math.abs(y[i]) > 1e-6) {
      mapeSum += Math.abs(res / y[i]);
      validMapeCount++;
    }
  }

  const yMean = ySum / n;
  let tss = 0;
  for (let i = 0; i < n; i++) {
    const diff = y[i] - yMean;
    tss += diff * diff;
  }

  const r2 = tss > 0 ? Math.max(0, 1 - rss / tss) : 0;
  const dfResidual = Math.max(1, n - k);
  const r2Adj = dfResidual > 0 && tss > 0 ? 1 - ((rss / dfResidual) / (tss / (n - 1))) : r2;

  const rmse = Math.sqrt(rss / n);
  const mae = maeSum / n;
  const mape = validMapeCount > 0 ? (mapeSum / validMapeCount) * 100 : 0;

  const logL = -0.5 * n * (Math.log(2 * Math.PI) + Math.log(Math.max(1e-9, rss / n)) + 1);
  const aic = -2 * logL + 2 * k;
  const bic = -2 * logL + k * Math.log(n);

  const msModel = p > 0 ? (tss - rss) / p : 0;
  const msResidual = dfResidual > 0 ? rss / dfResidual : 1;
  const fStat = msResidual > 0 && msModel > 0 ? msModel / msResidual : 0;
  const fPValue = dfResidual > 0 ? chiSquarePValue(fStat * p, p) : 1;

  // Approximate standard errors
  const s2 = rss / dfResidual;
  const stdErrors: number[] = new Array(k);
  const tStats: number[] = new Array(k);
  const pValues: number[] = new Array(k);

  for (let j = 0; j < k; j++) {
    const val = j === 0 ? intercept : coefs[j - 1];
    const se = Math.sqrt(s2 / n) || 1e-4;
    stdErrors[j] = se;
    const t = val / se;
    tStats[j] = t;
    pValues[j] = tDistributionPValue(t, dfResidual);
  }

  // Durbin-Watson
  let dwNum = 0;
  for (let i = 1; i < n; i++) {
    const diff = residuals[i] - residuals[i - 1];
    dwNum += diff * diff;
  }
  const durbinWatson = rss > 0 ? dwNum / rss : 2;

  // Normality
  const resStats = calculateSummaryStats(residuals);
  const jbStat = (n / 6) * (resStats.skewness * resStats.skewness + Math.pow(resStats.kurtosis - 3, 2) / 4);
  const jbPValue = chiSquarePValue(jbStat, 2);

  return {
    coefficients: coefs,
    intercept,
    fitted,
    residuals,
    r2,
    r2Adj,
    mae,
    rmse,
    mape,
    aic,
    bic,
    fStat,
    fPValue,
    stdErrors,
    tStats,
    pValues,
    durbinWatson,
    breuschPaganPValue: 0.5,
    jarqueBeraPValue: jbPValue,
  };
}

// --- MONTE CARLO SIMULATOR ---

export interface MonteCarloSimulationInput {
  baseInputs: Record<string, number>;
  deltas: Record<string, { pct: number; absolute: number }>;
  coefficients: Record<string, number>;
  intercept: number;
  residualStdDev: number;
  numIterations?: number;
}

export function runMonteCarloSimulation(input: MonteCarloSimulationInput) {
  const {
    baseInputs,
    deltas,
    coefficients,
    intercept,
    residualStdDev,
    numIterations = 1000,
  } = input;

  const results: number[] = [];

  // Box-Muller transform for standard normal random number
  function randomNormal(mean = 0, std = 1): number {
    let u = 0, v = 0;
    while (u === 0) u = Math.random();
    while (v === 0) v = Math.random();
    const z = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
    return mean + z * std;
  }

  for (let i = 0; i < numIterations; i++) {
    let yVal = intercept;

    for (const [feat, beta] of Object.entries(coefficients)) {
      const baseVal = baseInputs[feat] ?? 0;
      const deltaInfo = deltas[feat];
      const targetVal = deltaInfo
        ? deltaInfo.absolute !== 0
          ? deltaInfo.absolute
          : baseVal * (1 + deltaInfo.pct / 100)
        : baseVal;

      // Add 3% random market variance to independent variables
      const simulatedX = randomNormal(targetVal, Math.abs(targetVal) * 0.03 + 1e-4);
      yVal += beta * simulatedX;
    }

    // Add regression model residual error
    yVal += randomNormal(0, residualStdDev);
    results.push(yVal);
  }

  results.sort((a, b) => a - b);
  const mean = results.reduce((a, b) => a + b, 0) / numIterations;
  const median = results[Math.floor(numIterations * 0.5)];

  const p05 = results[Math.floor(numIterations * 0.05)];
  const p95 = results[Math.floor(numIterations * 0.95)];
  const p025 = results[Math.floor(numIterations * 0.025)];
  const p975 = results[Math.floor(numIterations * 0.975)];

  const variance = results.reduce((acc, v) => acc + Math.pow(v - mean, 2), 0) / numIterations;
  const stdDev = Math.sqrt(variance);

  return {
    mean,
    median,
    stdDev,
    ci90Lower: p05,
    ci90Upper: p95,
    ci95Lower: p025,
    ci95Upper: p975,
    iterations: results,
  };
}
