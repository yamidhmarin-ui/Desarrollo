import {
  BusinessRule,
  ModelEvaluation,
  ScenarioDefinition,
  StrategicRecommendation,
} from '../types';
import { calculateSummaryStats, runMonteCarloSimulation } from './math';

export function generateStandardScenarios(params: {
  model: ModelEvaluation;
  featureMeans: Record<string, number>;
  featureMins: Record<string, number>;
  featureMaxs: Record<string, number>;
  businessRules: BusinessRule[];
  targetName: string;
}): ScenarioDefinition[] {
  const { model, featureMeans, businessRules, targetName } = params;

  // 1. BASE SCENARIO (Current average operations)
  const baseInputs: Record<string, number> = { ...featureMeans };
  const basePred = model.predict(baseInputs);

  const residualStats = calculateSummaryStats(model.residuals);
  const residualStd = residualStats.stdDev || 1;

  // Base Monte Carlo
  const baseMC = runMonteCarloSimulation({
    baseInputs,
    deltas: {},
    coefficients: Object.fromEntries(
      model.coefficients.map((c) => [c.variableName, c.beta])
    ),
    intercept: model.intercept,
    residualStdDev: residualStd,
  });

  const baseScenario: ScenarioDefinition = {
    id: 'scenario_base',
    name: 'Escenario Base (Statu Quo)',
    description: 'Condiciones operativas promedio registradas en el historial reciente del negocio.',
    badge: 'Referencia',
    color: 'slate',
    variableDeltas: {},
    customInputs: { ...baseInputs },
    predictedY: Number(basePred.toFixed(2)),
    deltaAbsolute: 0,
    deltaPct: 0,
    economicImpact: calculateEconomics(baseInputs, basePred, targetName),
    monteCarlo: baseMC,
  };

  // 2. CONSERVADOR (+/- 5% variaciones prudentes)
  const consInputs: Record<string, number> = {};
  const consDeltas: Record<string, { pct: number; absolute: number }> = {};

  for (const feat of model.features) {
    const meanVal = featureMeans[feat] ?? 0;
    const rule = businessRules.find((r) => r.variableName === feat);
    // Prudent change: +5% if positive expected, -3% if negative
    const pct = rule?.expectedSign === 'negative' ? -3 : 5;
    const newVal = meanVal * (1 + pct / 100);
    consInputs[feat] = Number(newVal.toFixed(2));
    consDeltas[feat] = { pct, absolute: Number(newVal.toFixed(2)) };
  }

  const consPred = model.predict(consInputs);
  const consMC = runMonteCarloSimulation({
    baseInputs,
    deltas: consDeltas,
    coefficients: Object.fromEntries(
      model.coefficients.map((c) => [c.variableName, c.beta])
    ),
    intercept: model.intercept,
    residualStdDev: residualStd,
  });

  const consScenario: ScenarioDefinition = {
    id: 'scenario_conservative',
    name: 'Escenario Conservador',
    description: 'Ajustes moderados (+3% a +5%) en variables controlables dentro de tolerancias operativas.',
    badge: 'Riesgo Bajo',
    color: 'emerald',
    variableDeltas: consDeltas,
    customInputs: consInputs,
    predictedY: Number(consPred.toFixed(2)),
    deltaAbsolute: Number((consPred - basePred).toFixed(2)),
    deltaPct: Number((((consPred - basePred) / (basePred || 1)) * 100).toFixed(2)),
    economicImpact: calculateEconomics(consInputs, consPred, targetName),
    monteCarlo: consMC,
  };

  // 3. OPTIMISTA (Expansión y crecimiento comercial)
  const optInputs: Record<string, number> = {};
  const optDeltas: Record<string, { pct: number; absolute: number }> = {};

  for (const feat of model.features) {
    const meanVal = featureMeans[feat] ?? 0;
    const rule = businessRules.find((r) => r.variableName === feat);
    const colLower = feat.toLowerCase();

    let pct = 15;
    if (colLower.includes('publicidad') || colLower.includes('marketing')) {
      pct = 35; // aggressive ad campaign
    } else if (colLower.includes('precio')) {
      pct = -5; // strategic price cut or discount
    } else if (colLower.includes('costo') || colLower.includes('defecto')) {
      pct = -12; // operational efficiency improvements
    } else if (rule?.expectedSign === 'negative') {
      pct = -10;
    }

    const newVal = Math.max(0, meanVal * (1 + pct / 100));
    optInputs[feat] = Number(newVal.toFixed(2));
    optDeltas[feat] = { pct, absolute: Number(newVal.toFixed(2)) };
  }

  const optPred = model.predict(optInputs);
  const optMC = runMonteCarloSimulation({
    baseInputs,
    deltas: optDeltas,
    coefficients: Object.fromEntries(
      model.coefficients.map((c) => [c.variableName, c.beta])
    ),
    intercept: model.intercept,
    residualStdDev: residualStd,
  });

  const optScenario: ScenarioDefinition = {
    id: 'scenario_optimistic',
    name: 'Escenario Optimista (Expansión)',
    description: 'Impulso comercial intensivo en pauta publicitaria (+35%) y optimización de eficiencias operativas.',
    badge: 'Alto Crecimiento',
    color: 'blue',
    variableDeltas: optDeltas,
    customInputs: optInputs,
    predictedY: Number(optPred.toFixed(2)),
    deltaAbsolute: Number((optPred - basePred).toFixed(2)),
    deltaPct: Number((((optPred - basePred) / (basePred || 1)) * 100).toFixed(2)),
    economicImpact: calculateEconomics(optInputs, optPred, targetName),
    monteCarlo: optMC,
  };

  // 4. PESIMISTA (Contracción de demanda o alza de costos)
  const pesInputs: Record<string, number> = {};
  const pesDeltas: Record<string, { pct: number; absolute: number }> = {};

  for (const feat of model.features) {
    const meanVal = featureMeans[feat] ?? 0;
    const colLower = feat.toLowerCase();

    let pct = -15;
    if (colLower.includes('publicidad') || colLower.includes('marketing')) {
      pct = -30; // budget restriction
    } else if (colLower.includes('costo') || colLower.includes('defecto')) {
      pct = 25; // supply chain inflation
    } else if (colLower.includes('precio')) {
      pct = 12; // forced price increase due to inflation
    }

    const newVal = Math.max(0, meanVal * (1 + pct / 100));
    pesInputs[feat] = Number(newVal.toFixed(2));
    pesDeltas[feat] = { pct, absolute: Number(newVal.toFixed(2)) };
  }

  const pesPred = model.predict(pesInputs);
  const pesMC = runMonteCarloSimulation({
    baseInputs,
    deltas: pesDeltas,
    coefficients: Object.fromEntries(
      model.coefficients.map((c) => [c.variableName, c.beta])
    ),
    intercept: model.intercept,
    residualStdDev: residualStd,
  });

  const pesScenario: ScenarioDefinition = {
    id: 'scenario_pessimistic',
    name: 'Escenario Pesimista (Estrés de Mercado)',
    description: 'Reducción de presupuesto publicitario (-30%), alza de costos operativos (+25%) y encarecimiento de precios.',
    badge: 'Prueba de Estrés',
    color: 'amber',
    variableDeltas: pesDeltas,
    customInputs: pesInputs,
    predictedY: Number(pesPred.toFixed(2)),
    deltaAbsolute: Number((pesPred - basePred).toFixed(2)),
    deltaPct: Number((((pesPred - basePred) / (basePred || 1)) * 100).toFixed(2)),
    economicImpact: calculateEconomics(pesInputs, pesPred, targetName),
    monteCarlo: pesMC,
  };

  return [baseScenario, consScenario, optScenario, pesScenario];
}

/**
 * Calculates high-level financial impact when price/costs are present in inputs
 */
function calculateEconomics(
  inputs: Record<string, number>,
  predictedY: number,
  targetName: string
) {
  const targetLower = targetName.toLowerCase();

  // Find price or cost if available in inputs
  let unitPrice = 0;
  let unitCost = 0;

  for (const [key, val] of Object.entries(inputs)) {
    const kLower = key.toLowerCase();
    if (kLower.includes('precio') || kLower.includes('price')) {
      unitPrice = val;
    }
    if (kLower.includes('costo') || kLower.includes('cost')) {
      unitCost = val;
    }
  }

  // If target is units sold
  if (targetLower.includes('unidad') || targetLower.includes('unidades') || targetLower.includes('demanda')) {
    if (unitPrice > 0) {
      const revenue = predictedY * unitPrice;
      const estimatedCost = unitCost > 0 ? predictedY * unitCost : revenue * 0.58;
      const profit = revenue - estimatedCost;
      const profitMarginPct = revenue > 0 ? (profit / revenue) * 100 : 0;

      return {
        revenue: Math.round(revenue),
        costs: Math.round(estimatedCost),
        profit: Math.round(profit),
        profitMarginPct: Number(profitMarginPct.toFixed(1)),
      };
    }
  }

  // If target is revenue or MRR
  if (targetLower.includes('mrr') || targetLower.includes('ingreso') || targetLower.includes('ventas')) {
    const revenue = predictedY;
    const estimatedCost = revenue * 0.42;
    const profit = revenue - estimatedCost;
    return {
      revenue: Math.round(revenue),
      costs: Math.round(estimatedCost),
      profit: Math.round(profit),
      profitMarginPct: 58.0,
    };
  }

  return undefined;
}

/**
 * Generates tailored, non-generic business recommendations per scenario
 */
export function generateStrategicRecommendations(params: {
  scenario: ScenarioDefinition;
  baseScenario: ScenarioDefinition;
  model: ModelEvaluation;
  businessRules: BusinessRule[];
  targetName: string;
}): StrategicRecommendation[] {
  const { scenario, baseScenario, model, targetName } = params;
  const recs: StrategicRecommendation[] = [];

  const deltaPct = scenario.deltaPct;
  const deltaAbs = scenario.deltaAbsolute;

  // Rank independent variables by impact magnitude in this scenario
  const variableImpacts: { name: string; impact: number; beta: number }[] = [];

  for (const coef of model.coefficients) {
    const inputVal = scenario.customInputs[coef.variableName];
    const baseVal = baseScenario.customInputs[coef.variableName];
    if (inputVal !== undefined && baseVal !== undefined) {
      const diff = inputVal - baseVal;
      const impact = coef.beta * diff;
      variableImpacts.push({
        name: coef.variableName,
        impact,
        beta: coef.beta,
      });
    }
  }

  variableImpacts.sort((a, b) => Math.abs(b.impact) - Math.abs(a.impact));
  const topDrivers = variableImpacts.slice(0, 3).map((v) => v.name);

  if (scenario.id === 'scenario_base') {
    recs.push({
      scenarioId: scenario.id,
      title: 'Monitoreo de Estabilidad Operativa',
      impactLevel: 'medio',
      whatHappens: `El negocio se mantiene en su nivel promedio de ${baseScenario.predictedY.toLocaleString()} en ${targetName}, absorbiendo la volatilidad residual típica del sector.`,
      keyDrivers: topDrivers.length > 0 ? topDrivers : ['Promedios históricos'],
      actionRecommendation:
        'Mantener la asignación de recursos actual mientras se ejecutan pruebas A/B en canales de pauta y ajustes de precios graduales.',
      riskAssessment:
        'Crecimiento estancado ante posibles movimientos agresivos de la competencia en descuentos o publicidad.',
      requiredConditions: [
        'Estabilidad macroeconómica sin incrementos drásticos en inflación o tasas.',
        'Mantenimiento de la calidad de servicio y disponibilidad de inventario.',
      ],
      economicPayoff: 'Preservación del margen histórico y flujo de caja estable.',
    });
  } else if (deltaPct > 0) {
    // Growth scenario
    const primaryDriver = variableImpacts[0];
    const driverText = primaryDriver
      ? `el ajuste en "${primaryDriver.name}" (que aporta ${primaryDriver.impact > 0 ? '+' : ''}${primaryDriver.impact.toFixed(1)} al resultado)`
      : 'la combinación favorable de palancas';

    recs.push({
      scenarioId: scenario.id,
      title: `Estrategia de Crecimiento & Captura de Demanda (+${deltaPct.toFixed(1)}%)`,
      impactLevel: deltaPct > 15 ? 'oportunidad' : 'alto',
      whatHappens: `Se estima un incremento de ${deltaAbs.toLocaleString()} unidades/USD en "${targetName}", impulsado principalmente por ${driverText}.`,
      keyDrivers: topDrivers,
      actionRecommendation:
        'Aprobar el incremento presupuestal enfocado en las palancas con mayor elasticidad. Calibrar inventarios y capacidad operativa para evitar roturas de stock.',
      riskAssessment:
        'Canibalización de margen si el incremento en volumen fue motivado por descuentos excesivos, o desabastecimiento si la cadena de suministro no responde a tiempo.',
      requiredConditions: [
        'Asegurar capacidad instalada de producción/despacho para atender el volumen adicional.',
        'Supervisar que el Costo de Adquisición de Clientes (CAC) marginal no supere el margen de contribución generado.',
      ],
      economicPayoff: scenario.economicImpact
        ? `Ingresos proyectados de $${scenario.economicImpact.revenue?.toLocaleString()} con una utilidad operativa estimada de $${scenario.economicImpact.profit?.toLocaleString()}.`
        : `Incremento directo del ${deltaPct.toFixed(1)}% en el KPI estratégico del negocio.`,
    });
  } else {
    // Contraction scenario
    const negativeDriver = variableImpacts.find((v) => v.impact < 0) || variableImpacts[0];

    recs.push({
      scenarioId: scenario.id,
      title: `Plan de Mitigación y Contingencia ante Estrés (-${Math.abs(deltaPct).toFixed(1)}%)`,
      impactLevel: 'critico',
      whatHappens: `Bajo estas condiciones adversas, "${targetName}" se contraería en ${Math.abs(deltaAbs).toLocaleString()} unidades/USD (-${Math.abs(deltaPct).toFixed(1)}%), afectado de forma prioritaria por ${negativeDriver?.name || 'factores de mercado'}.`,
      keyDrivers: topDrivers,
      actionRecommendation:
        'Activar medidas de contención de costos fijos, renegociar contratos de materia prima/proveedores y enfocar la inversión de marketing exclusivamente en clientes de alto valor (LTV).',
      riskAssessment:
        'Deterioro acelerado del flujo de caja y pérdida de cuota de mercado si la contracción se extiende más de dos trimestres.',
      requiredConditions: [
        'Definir un fondo de reserva de liquidez operativa.',
        'Ajustar la política de precios de forma elástica para no destruir volumen innecesariamente.',
      ],
      economicPayoff: 'Protección del punto de equilibrio y contención de pérdidas operativas.',
    });
  }

  return recs;
}
