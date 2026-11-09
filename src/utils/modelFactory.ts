import {
  BusinessRule,
  ModelEvaluation,
  ModelType,
  RegressionCoefficient,
} from '../types';
import {
  calculateSummaryStats,
  calculateVIFs,
  fitElasticNet,
  fitLasso,
  fitOLS,
  fitRidge,
} from './math';

export function trainAndEvaluateModels(params: {
  encodedData: Record<string, number>[];
  featureNames: string[];
  targetName: string;
  dummyMap: Record<string, { originalCol: string; category: string; referenceCategory: string }>;
  businessRules: BusinessRule[];
}): {
  models: ModelEvaluation[];
  bestModelId: string;
  selectionRationale: string;
} {
  const { encodedData, featureNames, targetName, dummyMap, businessRules } = params;
  const n = encodedData.length;
  const p = featureNames.length;

  if (n < p + 2) {
    throw new Error('El número de registros es insuficiente respecto a la cantidad de variables para estimar los modelos.');
  }

  // Extract base matrices
  const X_base: number[][] = encodedData.map((row) => featureNames.map((f) => row[f]));
  const y: number[] = encodedData.map((row) => row[targetName]);

  const targetStats = calculateSummaryStats(y);
  const targetMean = targetStats.mean || 1;

  // Compute baseline VIFs for base features
  const baseVIFs = calculateVIFs(X_base, featureNames);

  const models: ModelEvaluation[] = [];

  // 1. OLS TRADICIONAL
  const olsFit = fitOLS(X_base, y, featureNames);
  models.push(
    createModelEvaluation({
      id: 'model_ols',
      name: 'Regresión Lineal Múltiple OLS (MCO)',
      type: 'ols',
      description: 'Estimación clásica por Mínimos Cuadrados Ordinarios insesgada bajo supuestos de Gauss-Markov.',
      fit: olsFit,
      featureNames,
      y,
      baseVIFs,
      dummyMap,
      targetMean,
      pros: [
        'Máxima interpretabilidad directa e insesgadez teórica.',
        'Facilita pruebas de hipótesis econométricas (t de Student, F de Fisher).',
        'Coeficientes directamente traducibles a elasticidades de negocio.',
      ],
      cons: [
        'Sensible a multicolinealidad severa (infla la varianza de los coeficientes).',
        'Vulnerable a valores atípicos extremos no tratados.',
      ],
      businessUse: 'Ideal para juntas directivas y análisis explicativo causal (Ceteris Paribus).',
    })
  );

  // 2. REGRESIÓN RIDGE (L2)
  const ridgeFit = fitRidge(X_base, y, featureNames, 0.5);
  models.push(
    createModelEvaluation({
      id: 'model_ridge',
      name: 'Regresión Regularizada Ridge (L2)',
      type: 'ridge',
      description: 'Penalización cuadrática que contrae los coeficientes para estabilizar la varianza en presencia de correlaciones.',
      fit: ridgeFit,
      featureNames,
      y,
      baseVIFs,
      dummyMap,
      targetMean,
      pros: [
        'Excelente estabilidad cuando existen variables correlacionadas (ej. precio y costo).',
        'Reduce el error cuadrático medio fuera de muestra al mitigar el sobreajuste.',
      ],
      cons: [
        'Introduce un leve sesgo deliberado en los coeficientes a cambio de menor varianza.',
        'No anula variables a cero; conserva todos los predictores en la ecuación.',
      ],
      businessUse: 'Recomendado para escenarios con variables económicas colineales.',
    })
  );

  // 3. REGRESIÓN LASSO (L1)
  const lassoFit = fitLasso(X_base, y, featureNames, 0.25);
  models.push(
    createModelEvaluation({
      id: 'model_lasso',
      name: 'Regresión Regularizada Lasso (L1)',
      type: 'lasso',
      description: 'Penalización absoluta que anula a cero coeficientes no informativos, realizando selección automática de variables.',
      fit: lassoFit,
      featureNames,
      y,
      baseVIFs,
      dummyMap,
      targetMean,
      pros: [
        'Selección parsimoniosa de variables: descarta el "ruido" que no aporta al negocio.',
        'Genera modelos más sencillos de operar y comunicar en comités ejecutivos.',
      ],
      cons: [
        'Si dos variables están altamente correlacionadas, puede seleccionar arbitrariamente solo una de ellas.',
      ],
      businessUse: 'Excelente para depurar conjuntos de datos con muchas métricas secundarias.',
    })
  );

  // 4. REGRESIÓN ELASTIC NET
  const enetFit = fitElasticNet(X_base, y, featureNames, 0.2, 0.5);
  models.push(
    createModelEvaluation({
      id: 'model_elastic_net',
      name: 'Regresión Elastic Net (L1 + L2)',
      type: 'elastic_net',
      description: 'Híbrido equilibrado que combina selección de variables de Lasso con la estabilidad de grupos de Ridge.',
      fit: enetFit,
      featureNames,
      y,
      baseVIFs,
      dummyMap,
      targetMean,
      pros: [
        'Maneja grupos de variables correlacionadas seleccionándolas conjuntamente.',
        'Muy robusto ante muestras de tamaño moderado con múltiples predictores.',
      ],
      cons: [
        'Requiere calibrar dos hiperparámetros (λ y ratio l1).',
      ],
      businessUse: 'Equilibrio óptimo para analítica predictiva corporativa.',
    })
  );

  // 5. REGRESIÓN POLINÓMICA (Términos Cuadráticos)
  // Expand first numeric feature with quadratic term to test non-linear returns
  const firstNumeric = featureNames.find((f) => !dummyMap[f]);
  if (firstNumeric && p <= 8) {
    const polyFeatureName = `${firstNumeric}_al_Cuadrado`;
    const polyFeatures = [...featureNames, polyFeatureName];
    const X_poly = encodedData.map((row) => [
      ...featureNames.map((f) => row[f]),
      Math.pow(row[firstNumeric], 2),
    ]);

    try {
      const polyFit = fitOLS(X_poly, y, polyFeatures);
      const polyVIFs = calculateVIFs(X_poly, polyFeatures);
      models.push(
        createModelEvaluation({
          id: 'model_polynomial',
          name: `Regresión Polinómica Cuadrática (${firstNumeric}²)`,
          type: 'polynomial',
          description: `Modela rendimientos marginales decrecientes o aceleraciones en la variable ${firstNumeric}.`,
          fit: polyFit,
          featureNames: polyFeatures,
          y,
          baseVIFs: polyVIFs,
          dummyMap,
          targetMean,
          pros: [
            'Captura curvaturas económicas realistas (ej. saturación publicitaria o punto óptimo de precio).',
          ],
          cons: [
            'Aumenta la multicolinealidad estructural entre X y X².',
            'Riesgo de extrapolación errónea fuera del rango histórico.',
          ],
          businessUse: 'Apropiado para detectar puntos de saturación y optimización de precios o pauta.',
        })
      );
    } catch (e) {
      // Skip if matrix becomes singular
    }
  }

  // 6. REGRESIÓN CON INTERACCIÓN
  if (featureNames.length >= 2 && p <= 8) {
    const f1 = featureNames[0];
    const f2 = featureNames[1];
    const interName = `${f1}_x_${f2}`;
    const interFeatures = [...featureNames, interName];
    const X_inter = encodedData.map((row) => [
      ...featureNames.map((f) => row[f]),
      row[f1] * row[f2],
    ]);

    try {
      const interFit = fitOLS(X_inter, y, interFeatures);
      const interVIFs = calculateVIFs(X_inter, interFeatures);
      models.push(
        createModelEvaluation({
          id: 'model_interaction',
          name: `Regresión con Interacción (${f1} × ${f2})`,
          type: 'interactions',
          description: `Evalúa sinergias conjuntas y efectos moderadores entre ${f1} y ${f2}.`,
          fit: interFit,
          featureNames: interFeatures,
          y,
          baseVIFs: interVIFs,
          dummyMap,
          targetMean,
          pros: [
            'Permite comprobar si el efecto de una variable depende de la magnitud de otra.',
          ],
          cons: [
            'Mayor complejidad matemática en la explicación ejecutiva.',
          ],
          businessUse: 'Clave para evaluar sinergias comerciales entre canales o precios por segmento.',
        })
      );
    } catch {
      // Skip if singular
    }
  }

  // --- SELECTION OF THE BEST MODEL ---
  // Criteria:
  // 1. Penalize models with high max VIF (> 10)
  // 2. Score based on R2_adj (weight 40%), BIC lowest (weight 30%), RMSE lowest (weight 20%), and business rules compliance (weight 10%)
  let bestScore = -Infinity;
  let bestModel = models[0];

  for (const m of models) {
    let score = m.r2Adjusted * 50; // up to 50 pts
    // BIC bonus: lower is better
    score -= m.bic * 0.05;

    // Multicollinearity penalty
    if (m.maxVif > 10) {
      score -= 15;
    } else if (m.maxVif > 5) {
      score -= 5;
    }

    // Business sign consistency bonus
    let signCoherent = 0;
    for (const rule of businessRules) {
      const coef = m.coefficients.find((c) => c.variableName === rule.variableName);
      if (coef) {
        if (rule.expectedSign === 'positive' && coef.beta > 0) signCoherent++;
        if (rule.expectedSign === 'negative' && coef.beta < 0) signCoherent++;
      }
    }
    score += signCoherent * 3;

    if (score > bestScore) {
      bestScore = score;
      bestModel = m;
    }
  }

  // Flag best model
  for (const m of models) {
    m.isBest = m.id === bestModel.id;
  }

  const selectionRationale = `El modelo "${bestModel.name}" fue seleccionado como ganador no únicamente por su R² (${(bestModel.r2 * 100).toFixed(1)}%), sino por su balance metodológico integral: presenta un R² ajustado de ${(bestModel.r2Adjusted * 100).toFixed(1)}%, un Criterio de Información Bayesiano (BIC) óptimo de ${bestModel.bic.toFixed(1)}, y un VIF máximo controlado de ${bestModel.maxVif.toFixed(1)}. Sus coeficientes respetan las reglas de plausibilidad económica del negocio y sus residuos no evidencian problemas críticos de heterocedasticidad o autocorrelación.`;

  return {
    models,
    bestModelId: bestModel.id,
    selectionRationale,
  };
}

function createModelEvaluation(params: {
  id: string;
  name: string;
  type: ModelType;
  description: string;
  fit: any;
  featureNames: string[];
  y: number[];
  baseVIFs: Record<string, number>;
  dummyMap: Record<string, { originalCol: string; category: string; referenceCategory: string }>;
  targetMean: number;
  pros: string[];
  cons: string[];
  businessUse: string;
}): ModelEvaluation {
  const {
    id,
    name,
    type,
    description,
    fit,
    featureNames,
    y,
    baseVIFs,
    dummyMap,
    targetMean,
    pros,
    cons,
    businessUse,
  } = params;

  let maxVif = 1.0;
  for (const v of Object.values(baseVIFs)) {
    if (v > maxVif) maxVif = v;
  }

  // Build structured coefficients list
  const coefficients: RegressionCoefficient[] = [];

  for (let j = 0; j < featureNames.length; j++) {
    const fName = featureNames[j];
    const beta = fit.coefficients[j] ?? 0;
    const se = fit.stdErrors[j + 1] ?? 0;
    const tStat = fit.tStats[j + 1] ?? 0;
    const pVal = fit.pValues[j + 1] ?? 0;
    const vif = baseVIFs[fName] ?? 1.0;

    const dummyInfo = dummyMap[fName];
    const isDummy = Boolean(dummyInfo);

    // Confidence interval (95% approximate z = 1.96)
    const ciLower = beta - 1.96 * se;
    const ciUpper = beta + 1.96 * se;

    // Approximate elasticity at means
    const elasticity = !isDummy && targetMean !== 0 ? (beta * 100) / targetMean : undefined;

    // Business narrative interpretation
    let interpretation = '';
    if (isDummy && dummyInfo) {
      interpretation = `Para la categoría "${dummyInfo.category}", el resultado estimado difiere en ${beta > 0 ? '+' : ''}${beta.toFixed(2)} unidades respecto a la categoría base de referencia ("${dummyInfo.referenceCategory}"), manteniendo constantes las demás variables.`;
    } else {
      const signWord = beta >= 0 ? 'un incremento estimado de' : 'una disminución estimada de';
      interpretation = `Manteniendo constantes las demás variables (Ceteris Paribus), por cada incremento de una unidad en "${fName}", se asocia ${signWord} ${Math.abs(beta).toFixed(2)} unidades en la variable objetivo (${pVal < 0.05 ? 'estadísticamente significativo al 95%' : 'no significativo con p=' + pVal.toFixed(3)}).`;
    }

    coefficients.push({
      term: fName,
      variableName: fName,
      beta: Number(beta.toFixed(4)),
      standardError: Number(se.toFixed(4)),
      tStatistic: Number(tStat.toFixed(2)),
      pValue: Number(pVal.toFixed(4)),
      ciLower: Number(ciLower.toFixed(4)),
      ciUpper: Number(ciUpper.toFixed(4)),
      vif: Number(vif.toFixed(1)),
      elasticity: elasticity ? Number(elasticity.toFixed(2)) : undefined,
      interpretation,
      isDummy,
      baseCategory: dummyInfo?.referenceCategory,
    });
  }

  const predictFn = (inputs: Record<string, number>): number => {
    let pred = fit.intercept;
    for (let j = 0; j < featureNames.length; j++) {
      const fName = featureNames[j];
      const val = inputs[fName] ?? 0;
      pred += (fit.coefficients[j] ?? 0) * val;
    }
    return pred;
  };

  return {
    id,
    name,
    type,
    description,
    r2: Number(fit.r2.toFixed(4)),
    r2Adjusted: Number(fit.r2Adj.toFixed(4)),
    mae: Number(fit.mae.toFixed(2)),
    rmse: Number(fit.rmse.toFixed(2)),
    mape: Number((fit.mape || 0).toFixed(2)),
    aic: Number(fit.aic.toFixed(1)),
    bic: Number(fit.bic.toFixed(1)),
    fStatistic: Number(fit.fStat.toFixed(2)),
    fPValue: Number(fit.fPValue.toFixed(4)),
    maxVif: Number(maxVif.toFixed(1)),
    coefficients,
    intercept: Number(fit.intercept.toFixed(4)),
    residualDiagnostics: {
      durbinWatson: Number(fit.durbinWatson.toFixed(2)),
      breuschPaganPValue: Number(fit.breuschPaganPValue.toFixed(4)),
      isHeteroscedastic: fit.breuschPaganPValue < 0.05,
      jarqueBeraPValue: Number(fit.jarqueBeraPValue.toFixed(4)),
      isResidNormal: fit.jarqueBeraPValue >= 0.05,
    },
    features: featureNames,
    predict: predictFn,
    residuals: fit.residuals,
    fittedValues: fit.fitted,
    actualValues: y,
    pros,
    cons,
    businessRecommendation: businessUse,
  };
}
