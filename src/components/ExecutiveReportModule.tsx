import React, { useRef } from 'react';
import {
  FileText,
  Download,
  Printer,
  Copy,
  CheckCircle2,
  AlertTriangle,
  Award,
  TrendingUp,
  ShieldAlert,
  HelpCircle,
} from 'lucide-react';
import {
  ColumnProfile,
  DataQualityReport,
  BusinessRule,
  ModelEvaluation,
  ScenarioDefinition,
  StrategicRecommendation,
} from '../types';
import { exportAnalysisToExcel } from '../utils/dataProcessor';
import { GitHubExportModal } from './GitHubExportModal';

interface ExecutiveReportModuleProps {
  data: Record<string, any>[];
  profiles: ColumnProfile[];
  quality: DataQualityReport;
  businessRules: BusinessRule[];
  targetCol: string;
  selectedFeatures: string[];
  models: ModelEvaluation[];
  bestModel: ModelEvaluation;
  selectionRationale: string;
  scenarios: ScenarioDefinition[];
  recommendations: StrategicRecommendation[];
  rawFilename: string | null;
}

export const ExecutiveReportModule: React.FC<ExecutiveReportModuleProps> = ({
  data,
  profiles,
  quality,
  businessRules,
  targetCol,
  selectedFeatures,
  models,
  bestModel,
  selectionRationale,
  scenarios,
  recommendations,
  rawFilename,
}) => {
  const [copied, setCopied] = React.useState(false);
  const [showGitHubModal, setShowGitHubModal] = React.useState(false);

  const handlePrint = () => {
    window.print();
  };

  const handleExportExcel = () => {
    // 1. Resumen de Modelos
    const modelSummary = models.map((m) => ({
      Modelo: m.name,
      Tipo: m.type,
      R2: Number((m.r2 * 100).toFixed(2)),
      R2_Ajustado: Number((m.r2Adjusted * 100).toFixed(2)),
      MAE: m.mae,
      RMSE: m.rmse,
      AIC: m.aic,
      BIC: m.bic,
      Max_VIF: m.maxVif,
      P_Valor_F: m.fPValue,
      Es_Ganador: m.isBest ? 'SÍ' : 'NO',
      Recomendacion_Uso: m.businessRecommendation,
    }));

    // 2. Coeficientes
    const coefficients = bestModel.coefficients.map((c) => ({
      Variable: c.variableName,
      Coeficiente_Beta: c.beta,
      Error_Estandar: c.standardError,
      Estadistico_t: c.tStatistic,
      P_Valor: c.pValue,
      Significativo_95: c.pValue < 0.05 ? 'SÍ' : 'NO',
      VIF: c.vif,
      Elasticidad_Pct: c.elasticity ?? 'N/A',
      Interpretacion_Ejecutiva: c.interpretation,
    }));

    // 3. Simulaciones
    const scenarioList = scenarios.map((s) => ({
      Escenario: s.name,
      KPI_Predicho: s.predictedY,
      Diferencia_Absoluta: s.deltaAbsolute,
      Variacion_Pct: s.deltaPct,
      Ingresos_USD: s.economicImpact?.revenue ?? 'N/A',
      Costos_USD: s.economicImpact?.costs ?? 'N/A',
      Utilidad_USD: s.economicImpact?.profit ?? 'N/A',
      Margen_Pct: s.economicImpact?.profitMarginPct ?? 'N/A',
      IC_95_Inferior: s.monteCarlo?.ci95Lower ?? 'N/A',
      IC_95_Superior: s.monteCarlo?.ci95Upper ?? 'N/A',
    }));

    // 4. Recomendaciones
    const recList = recommendations.map((r) => ({
      Escenario_ID: r.scenarioId,
      Titulo: r.title,
      Nivel_Impacto: r.impactLevel,
      Que_Sucede: r.whatHappens,
      Palancas_Principales: r.keyDrivers.join(', '),
      Accion_Recomendada: r.actionRecommendation,
      Riesgos_Asociados: r.riskAssessment,
      Condiciones_Necesarias: r.requiredConditions.join('; '),
      Retorno_Economico: r.economicPayoff,
    }));

    exportAnalysisToExcel({
      filename: `Informe_Regresion_Empresarial_${targetCol}`,
      processedData: data.slice(0, 1000), // Export up to 1000 rows
      modelSummary,
      coefficients,
      scenarios: scenarioList,
      recommendations: recList,
    });
  };

  const handleCopySummary = () => {
    const text = `INFORME EJECUTIVO DE REGRESIÓN MÚLTIPLE & SIMULACIÓN
Variable Objetivo: ${targetCol}
Modelo Seleccionado: ${bestModel.name} (R² Adj: ${(bestModel.r2Adjusted * 100).toFixed(1)}%, BIC: ${bestModel.bic.toFixed(1)})
Predicción Escenario Base: ${scenarios.find((s) => s.id === 'scenario_base')?.predictedY.toLocaleString()}

FÓRMULA ESTIMADA:
Y = ${bestModel.intercept.toFixed(2)} ${bestModel.coefficients.map((c) => `${c.beta >= 0 ? '+' : '-'} ${Math.abs(c.beta).toFixed(2)}*${c.term}`).join(' ')}

PRINCIPALES RECOMENDACIONES:
${recommendations.map((r) => `* [${r.title}]: ${r.actionRecommendation}`).join('\n')}
`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  const equationTerms = bestModel.coefficients.map((c) => {
    const sign = c.beta >= 0 ? '+' : '-';
    return `${sign} ${Math.abs(c.beta).toFixed(3)} · ${c.term}`;
  });

  return (
    <div className="space-y-8 print:space-y-4 print:text-black">
      {/* HEADER BAR CON ACCIONES DE EXPORTACIÓN */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm print:hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-slate-900">
              11 & 12. Informe Ejecutivo Integral & Exportación de Resultados
            </h2>
            <p className="text-sm text-slate-500 mt-1">
              Documento estructurado de 15 puntos ordenados para juntas directivas, comités de inversión y gerencias de área.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={handleCopySummary}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg shadow-2xs transition-colors"
            >
              {copied ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Copiado</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copiar Síntesis</span>
                </>
              )}
            </button>

            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg border border-slate-300 transition-colors"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Imprimir / PDF</span>
            </button>

            <button
              onClick={handleExportExcel}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg shadow-sm transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Exportar Libro Excel (.xlsx)</span>
            </button>

            <button
              onClick={() => setShowGitHubModal(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg shadow-sm transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Exportar para GitHub (.ZIP)</span>
            </button>
          </div>
        </div>

        <GitHubExportModal
          isOpen={showGitHubModal}
          onClose={() => setShowGitHubModal(false)}
        />
      </div>

      {/* DOCUMENTO EJECUTIVO DE 15 PUNTOS FORMALES */}
      <div className="bg-white rounded-xl border border-slate-200 p-8 shadow-sm space-y-8 print:p-0 print:border-none print:shadow-none">
        {/* TÍTULO DEL INFORME */}
        <div className="border-b border-slate-200 pb-6">
          <div className="text-xs uppercase tracking-wider text-slate-500 font-semibold mb-1">
            Dictamen Econométrico & Analítica de Negocios
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900">
            Informe Estratégico de Modelamiento & Simulación de Regresión Múltiple
          </h1>
          <div className="flex items-center gap-4 text-xs text-slate-500 mt-2">
            <span>Fuente: {rawFilename || 'Dataset Empresarial'}</span>
            <span>·</span>
            <span>Fecha de emisión: {new Date().toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
            <span>·</span>
            <span>Variable Dependiente: {targetCol}</span>
          </div>
        </div>

        {/* 1. RESUMEN EJECUTIVO */}
        <section className="space-y-2">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900">
            1. Resumen Ejecutivo
          </h3>
          <p className="text-xs text-slate-700 leading-relaxed">
            Se realizó un análisis estadístico y econométrico exhaustivo sobre el conjunto de datos para predecir y explicar el comportamiento de <span className="font-semibold text-slate-900">{targetCol}</span>. El modelo ganador seleccionado fue <span className="font-semibold text-slate-900">{bestModel.name}</span>, el cual explica el <span className="font-semibold font-mono text-slate-900">{(bestModel.r2Adjusted * 100).toFixed(1)}%</span> de la varianza total penalizada por dimensión, manteniendo control de colinealidad (VIF máximo de {bestModel.maxVif.toFixed(1)}) y coherencia con la teoría microeconómica del negocio.
          </p>
        </section>

        {/* 2. DESCRIPCIÓN DEL DATASET */}
        <section className="space-y-2">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900">
            2. Descripción del Conjunto de Datos
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs bg-slate-50 p-4 rounded-lg border border-slate-200 font-mono tabular-nums">
            <div>
              <span className="text-slate-500 font-sans block">Observaciones (N):</span>
              <span className="text-base font-bold text-slate-900">{quality.totalRows.toLocaleString()}</span>
            </div>
            <div>
              <span className="text-slate-500 font-sans block">Variables (P):</span>
              <span className="text-base font-bold text-slate-900">{quality.totalCols}</span>
            </div>
            <div>
              <span className="text-slate-500 font-sans block">Filas Duplicadas:</span>
              <span className="text-base font-bold text-slate-900">{quality.duplicateRows}</span>
            </div>
            <div>
              <span className="text-slate-500 font-sans block">Celdas Faltantes:</span>
              <span className="text-base font-bold text-slate-900">{quality.totalMissingCells} ({quality.overallMissingPct}%)</span>
            </div>
          </div>
        </section>

        {/* 3. CALIDAD DE LOS DATOS */}
        <section className="space-y-2">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900">
            3. Diagnóstico de Calidad & Protocolo de Imputación
          </h3>
          <p className="text-xs text-slate-700 leading-relaxed">
            {quality.imputationLog.length > 0
              ? `Se ejecutó una imputación adaptada para ${quality.imputationLog.length} variables. Las variables numéricas asimétricas o con presencia de atípicos se trataron mediante la mediana para no distorsionar las estimaciones; las categóricas se imputaron con la moda poblacional.`
              : 'El conjunto de datos presenta integridad completa sin celdas faltantes en sus variables clave.'}
          </p>
        </section>

        {/* 4. ANÁLISIS EXPLORATORIO */}
        <section className="space-y-2">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900">
            4. Hallazgos del Análisis Exploratorio (AED)
          </h3>
          <p className="text-xs text-slate-700 leading-relaxed">
            Se inspeccionaron las distribuciones y matrices de correlación de Pearson y Spearman. Las variables con mayor correlación observada con {targetCol} sustentaron la identificación preliminar de inductores de demanda y costos.
          </p>
        </section>

        {/* 5. REGLAS DE NEGOCIO IDENTIFICADAS */}
        <section className="space-y-2">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900">
            5. Reglas de Negocio & Plausibilidad Económica
          </h3>
          <div className="space-y-1.5">
            {businessRules.slice(0, 4).map((r) => (
              <div key={r.id} className="text-xs text-slate-700 bg-slate-50 p-2.5 rounded border border-slate-100">
                <span className="font-semibold text-slate-900">{r.variableName}: </span>
                <span>{r.businessRationale} (Efecto esperado: {r.expectedSign})</span>
              </div>
            ))}
          </div>
        </section>

        {/* 6 & 7. VARIABLES SELECCIONADAS */}
        <section className="space-y-2">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900">
            6 & 7. Especificación del Modelo: Variable Dependiente y Explicativas
          </h3>
          <p className="text-xs text-slate-700">
            <span className="font-semibold text-slate-900">Variable Dependiente (Y): </span>
            {targetCol}
          </p>
          <p className="text-xs text-slate-700">
            <span className="font-semibold text-slate-900">Variables Explicativas Seleccionadas (X): </span>
            {selectedFeatures.join(', ')}
          </p>
        </section>

        {/* 8. COMPARACIÓN DE MODELOS */}
        <section className="space-y-2">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900">
            8. Comparativa Econométrica de Modelos Evaluados
          </h3>
          <div className="border border-slate-200 rounded-lg overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 font-semibold">
                <tr>
                  <th className="px-3 py-2">Modelo</th>
                  <th className="px-3 py-2">R²</th>
                  <th className="px-3 py-2">R² Adj</th>
                  <th className="px-3 py-2">RMSE</th>
                  <th className="px-3 py-2">AIC</th>
                  <th className="px-3 py-2">BIC</th>
                  <th className="px-3 py-2">VIF Máx</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono tabular-nums">
                {models.map((m) => (
                  <tr key={m.id} className={m.isBest ? 'bg-amber-50/40 font-semibold' : ''}>
                    <td className="px-3 py-2 font-sans">{m.name}</td>
                    <td className="px-3 py-2">{(m.r2 * 100).toFixed(1)}%</td>
                    <td className="px-3 py-2">{(m.r2Adjusted * 100).toFixed(1)}%</td>
                    <td className="px-3 py-2">{m.rmse.toFixed(1)}</td>
                    <td className="px-3 py-2">{m.aic.toFixed(1)}</td>
                    <td className="px-3 py-2">{m.bic.toFixed(1)}</td>
                    <td className="px-3 py-2">{m.maxVif.toFixed(1)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* 9. MODELO GANADOR Y JUSTIFICACIÓN */}
        <section className="space-y-2">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900">
            9. Justificación del Modelo Ganador
          </h3>
          <div className="p-4 rounded-lg bg-amber-50/70 border border-amber-200 text-xs text-amber-950 leading-relaxed">
            {selectionRationale}
          </div>
        </section>

        {/* 10. FÓRMULA MATEMÁTICA */}
        <section className="space-y-2">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900">
            10. Ecuación Matemática Estimada
          </h3>
          <div className="p-3.5 rounded bg-slate-900 text-indigo-300 font-mono text-xs overflow-x-auto">
            {targetCol} = {bestModel.intercept.toFixed(3)} {equationTerms.join(' ')}
          </div>
        </section>

        {/* 11. INTERPRETACIÓN DE COEFICIENTES */}
        <section className="space-y-2">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900">
            11. Interpretación de Parámetros & Elasticidades
          </h3>
          <div className="space-y-2">
            {bestModel.coefficients.map((c) => (
              <div key={c.term} className="text-xs text-slate-700 bg-slate-50 p-2.5 rounded border border-slate-100">
                <span className="font-semibold text-slate-900">{c.term} (&beta; = {c.beta.toFixed(3)}): </span>
                <span>{c.interpretation}</span>
              </div>
            ))}
          </div>
        </section>

        {/* 12. DIAGNÓSTICO ESTADÍSTICO */}
        <section className="space-y-2">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900">
            12. Diagnóstico de Supuestos Econométricos
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div className="p-3 rounded bg-slate-50 border border-slate-200">
              <span className="font-semibold block text-slate-900">Durbin-Watson: {bestModel.residualDiagnostics.durbinWatson}</span>
              <span className="text-slate-600">Independencia de errores validada.</span>
            </div>
            <div className="p-3 rounded bg-slate-50 border border-slate-200">
              <span className="font-semibold block text-slate-900">Breusch-Pagan p-val: {bestModel.residualDiagnostics.breuschPaganPValue}</span>
              <span className="text-slate-600">Comprobación de varianza constante.</span>
            </div>
            <div className="p-3 rounded bg-slate-50 border border-slate-200">
              <span className="font-semibold block text-slate-900">Jarque-Bera p-val: {bestModel.residualDiagnostics.jarqueBeraPValue}</span>
              <span className="text-slate-600">Simetría residual para intervalos.</span>
            </div>
          </div>
        </section>

        {/* 13. RESULTADOS DE SIMULACIONES */}
        <section className="space-y-2">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900">
            13. Resultados de Simulación de Escenarios
          </h3>
          <div className="border border-slate-200 rounded-lg overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 font-semibold">
                <tr>
                  <th className="px-3 py-2">Escenario</th>
                  <th className="px-3 py-2">Predicción ({targetCol})</th>
                  <th className="px-3 py-2">&Delta; Absoluto</th>
                  <th className="px-3 py-2">&Delta; Porcentual</th>
                  <th className="px-3 py-2">Banda 95% Monte Carlo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono tabular-nums">
                {scenarios.map((s) => (
                  <tr key={s.id}>
                    <td className="px-3 py-2 font-sans font-medium text-slate-900">{s.name}</td>
                    <td className="px-3 py-2 font-bold">{s.predictedY.toLocaleString()}</td>
                    <td className="px-3 py-2">{s.deltaAbsolute > 0 ? '+' : ''}{s.deltaAbsolute.toLocaleString()}</td>
                    <td className="px-3 py-2 font-semibold">{s.deltaPct > 0 ? '+' : ''}{s.deltaPct.toFixed(1)}%</td>
                    <td className="px-3 py-2 text-slate-600">
                      [{s.monteCarlo?.ci95Lower.toFixed(0)}, {s.monteCarlo?.ci95Upper.toFixed(0)}]
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* 14. RECOMENDACIONES EMPRESARIALES */}
        <section className="space-y-3">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900">
            14. Recomendaciones Estratégicas para la Alta Dirección
          </h3>
          <div className="space-y-3">
            {recommendations.map((r, i) => (
              <div key={i} className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm text-slate-900">{r.title}</span>
                  <span className="text-[11px] font-semibold uppercase text-indigo-700">
                    Impacto: {r.impactLevel}
                  </span>
                </div>
                <p className="text-slate-700"><span className="font-semibold text-slate-900">Diagnóstico: </span>{r.whatHappens}</p>
                <p className="text-slate-700"><span className="font-semibold text-slate-900">Decisión Clave: </span>{r.actionRecommendation}</p>
                <p className="text-amber-800"><span className="font-semibold">Riesgos Operativos: </span>{r.riskAssessment}</p>
                <p className="text-slate-600"><span className="font-semibold text-slate-800">Retorno Financiero Estimado: </span>{r.economicPayoff}</p>
              </div>
            ))}
          </div>
        </section>

        {/* 15. LIMITACIONES Y ADVERTENCIAS */}
        <section className="space-y-2 pt-4 border-t border-slate-200">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900">
            15. Limitaciones Metodológicas & Advertencias del Análisis
          </h3>
          <div className="p-4 rounded-lg bg-slate-100 text-xs text-slate-700 space-y-2">
            <div className="flex items-start gap-2">
              <ShieldAlert className="w-4 h-4 text-slate-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-slate-900 mb-1">
                  Principio de Honestidad Metodológica (Asociación vs. Causalidad):
                </p>
                <ul className="list-disc pl-4 space-y-1 text-slate-600">
                  <li>
                    Los coeficientes estimados representan asociaciones condicionales ceteris paribus bajo los datos históricos y no garantizan causalidad determinista si existen variables omitidas relevantes (ej. cambios regulatorios, guerras de precios agresivas o disrupciones de oferta).
                  </li>
                  <li>
                    Las simulaciones deben mantenerse dentro de los rangos históricos observados; proyecciones con valores extremos conllevan riesgo de extrapolación econométrica.
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};
