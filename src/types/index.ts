export type VariableType =
  | 'numeric_continuous'
  | 'numeric_discrete'
  | 'categorical_nominal'
  | 'categorical_ordinal'
  | 'date'
  | 'identifier'
  | 'irrelevant';

export interface ColumnProfile {
  name: string;
  originalName: string;
  type: VariableType;
  inferredType: VariableType;
  sampleValues: any[];
  uniqueCount: number;
  missingCount: number;
  missingPct: number;
  outlierCount: number;
  min?: number;
  max?: number;
  mean?: number;
  median?: number;
  stdDev?: number;
  skewness?: number;
  kurtosis?: number;
  q1?: number;
  q3?: number;
  categories?: { label: string; count: number }[];
  isIdentifier: boolean;
  isDate: boolean;
  cardinalityTooHigh?: boolean;
}

export interface DataQualityReport {
  totalRows: number;
  totalCols: number;
  duplicateRows: number;
  totalMissingCells: number;
  overallMissingPct: number;
  columnsWithMissing: string[];
  columnsWithOutliers: string[];
  inconsistenciesDetected: string[];
  imputationLog: {
    column: string;
    method: 'mean' | 'median' | 'mode' | 'knn_nearest' | 'linear_interpolation' | 'drop_rows' | 'unknown_category';
    valuesImputed: number;
    reason: string;
  }[];
}

export interface BusinessRule {
  id: string;
  variableName: string;
  targetVariable: string;
  expectedSign: 'positive' | 'negative' | 'ambiguous';
  businessRationale: string;
  minAllowedValue?: number;
  maxAllowedValue?: number;
  isControllable: boolean; // Company controllable (e.g. price, marketing) vs external (inflation, season)
  confirmedByUser: boolean;
}

export interface RegressionCoefficient {
  term: string;
  variableName: string;
  beta: number;
  standardError: number;
  tStatistic: number;
  pValue: number;
  ciLower: number;
  ciUpper: number;
  vif: number;
  elasticity?: number;
  interpretation: string;
  isDummy: boolean;
  baseCategory?: string;
}

export type ModelType =
  | 'ols'
  | 'ridge'
  | 'lasso'
  | 'elastic_net'
  | 'polynomial'
  | 'interactions';

export interface ModelEvaluation {
  id: string;
  name: string;
  type: ModelType;
  description: string;
  r2: number;
  r2Adjusted: number;
  mae: number;
  rmse: number;
  mape?: number;
  aic: number;
  bic: number;
  fStatistic: number;
  fPValue: number;
  maxVif: number;
  coefficients: RegressionCoefficient[];
  intercept: number;
  residualDiagnostics: {
    durbinWatson: number;
    breuschPaganPValue: number;
    isHeteroscedastic: boolean;
    jarqueBeraPValue: number;
    isResidNormal: boolean;
  };
  features: string[];
  predict: (inputs: Record<string, number>) => number;
  residuals: number[];
  fittedValues: number[];
  actualValues: number[];
  pros: string[];
  cons: string[];
  businessRecommendation: string;
  isBest?: boolean;
}

export interface ScenarioDefinition {
  id: string;
  name: string;
  description: string;
  badge: string;
  color: string;
  variableDeltas: Record<string, { pct: number; absolute: number }>; // % change from base mean
  customInputs: Record<string, number>;
  predictedY: number;
  deltaAbsolute: number;
  deltaPct: number;
  economicImpact?: {
    revenue?: number;
    costs?: number;
    profit?: number;
    profitMarginPct?: number;
  };
  monteCarlo?: {
    mean: number;
    median: number;
    stdDev: number;
    ci90Lower: number;
    ci90Upper: number;
    ci95Lower: number;
    ci95Upper: number;
    iterations: number[];
  };
}

export interface StrategicRecommendation {
  scenarioId: string;
  title: string;
  impactLevel: 'alto' | 'medio' | 'critico' | 'oportunidad';
  whatHappens: string;
  keyDrivers: string[];
  actionRecommendation: string;
  riskAssessment: string;
  requiredConditions: string[];
  economicPayoff: string;
}

export interface SampleDatasetInfo {
  id: string;
  title: string;
  sector: string;
  description: string;
  rows: number;
  suggestedTarget: string;
  data: Record<string, any>[];
}
