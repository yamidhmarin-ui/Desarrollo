import React, { useState } from 'react';
import {
  Sliders,
  DollarSign,
  TrendingUp,
  TrendingDown,
  ArrowRight,
  Shield,
  Activity,
  BarChart,
  RotateCcw,
} from 'lucide-react';
import {
  BusinessRule,
  ModelEvaluation,
  ScenarioDefinition,
} from '../types';
import { runMonteCarloSimulation } from '../utils/math';

interface ScenarioSimulationModuleProps {
  scenarios: ScenarioDefinition[];
  activeScenarioId: string;
  onSelectScenario: (id: string) => void;
  onUpdateCustomScenario: (inputs: Record<string, number>) => void;
  model: ModelEvaluation;
  businessRules: BusinessRule[];
  targetName: string;
  featureMeans: Record<string, number>;
  featureMins: Record<string, number>;
  featureMaxs: Record<string, number>;
  onNextStep: () => void;
}

export const ScenarioSimulationModule: React.FC<ScenarioSimulationModuleProps> = ({
  scenarios,
  activeScenarioId,
  onSelectScenario,
  onUpdateCustomScenario,
  model,
  businessRules,
  targetName,
  featureMeans,
  featureMins,
  featureMaxs,
  onNextStep,
}) => {
  const activeScenario =
    scenarios.find((s) => s.id === activeScenarioId) || scenarios[0];
  const baseScenario = scenarios.find((s) => s.id === 'scenario_base') || scenarios[0];

  const [customInputs, setCustomInputs] = useState<Record<string, number>>({
    ...activeScenario.customInputs,
  });

  const handleSliderChange = (feat: string, val: number) => {
    const updated = { ...customInputs, [feat]: val };
    setCustomInputs(updated);
    onUpdateCustomScenario(updated);
  };

  const handleResetToBase = () => {
    setCustomInputs({ ...baseScenario.customInputs });
    onUpdateCustomScenario({ ...baseScenario.customInputs });
  };

  // Monte Carlo distribution curve visualization
  const mc = activeScenario.monteCarlo;
  const iterations = mc?.iterations || [];
  let mcBins: { range: string; count: number; heightPct: number }[] = [];

  if (iterations.length > 0) {
    const minVal = iterations[0];
    const maxVal = iterations[iterations.length - 1];
    const binCount = 14;
    const step = (maxVal - minVal) / binCount || 1;
    const counts = new Array(binCount).fill(0);

    for (const val of iterations) {
      const idx = Math.min(binCount - 1, Math.floor((val - minVal) / step));
      counts[idx]++;
    }

    const maxCount = Math.max(...counts, 1);
    mcBins = counts.map((count, i) => {
      const start = minVal + i * step;
      const end = start + step;
      return {
        range: `${start.toFixed(0)} - ${end.toFixed(0)}`,
        count,
        heightPct: (count / maxCount) * 100,
      };
    });
  }

  return (
    <div className="space-y-8">
      {/* SELECTOR DE ESCENARIOS ESTÁNDAR Y PERSONALIZADO */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="text-xl font-bold text-slate-900">
              9 & 10. Simulación de Escenarios y Modelamiento de Incertidumbre
            </h2>
            <p className="text-sm text-slate-500 mt-1">
              Modela el impacto de decisiones operativas y fluctuaciones externas. Incluye simulación estocástica Monte Carlo (1.000 iteraciones).
            </p>
          </div>
          <button
            onClick={handleResetToBase}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg border border-slate-200 transition-colors shrink-0"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Restablecer a Valores Base</span>
          </button>
        </div>

        {/* Tarjetas de Selección de Escenario */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {scenarios.map((sc) => {
            const isSelected = sc.id === activeScenarioId;

            return (
              <button
                key={sc.id}
                onClick={() => {
                  onSelectScenario(sc.id);
                  setCustomInputs({ ...sc.customInputs });
                }}
                className={`text-left p-4 rounded-xl border transition-all ${
                  isSelected
                    ? 'border-indigo-600 bg-indigo-50/40 shadow-xs'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="font-semibold text-slate-900">{sc.name}</span>
                  <span className="text-[10px] text-slate-500 font-medium">
                    {sc.badge}
                  </span>
                </div>
                <div className="text-xl font-bold text-slate-900 font-mono tabular-nums my-1">
                  {sc.predictedY.toLocaleString()}
                </div>
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-500">{targetName}</span>
                  <span
                    className={`font-semibold font-mono ${
                      sc.deltaPct > 0
                        ? 'text-emerald-700'
                        : sc.deltaPct < 0
                        ? 'text-rose-700'
                        : 'text-slate-500'
                    }`}
                  >
                    {sc.deltaPct > 0 ? '+' : ''}
                    {sc.deltaPct.toFixed(1)}%
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* DASHBOARD DE RESULTADOS DEL ESCENARIO ACTIVO */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* KPI PREDICHO & IMPACTO ECONÓMICO */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-6">
          <div>
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">
              Resultado Proyectado ({activeScenario.name})
            </span>
            <div className="text-3xl font-extrabold text-slate-900 font-mono tabular-nums">
              {activeScenario.predictedY.toLocaleString()}{' '}
              <span className="text-xs font-sans font-normal text-slate-500">
                {targetName}
              </span>
            </div>
            <div className="flex items-center gap-2 mt-2 text-xs font-semibold">
              <span
                className={
                  activeScenario.deltaPct > 0
                    ? 'text-emerald-700'
                    : activeScenario.deltaPct < 0
                    ? 'text-rose-700'
                    : 'text-slate-500'
                }
              >
                {activeScenario.deltaPct > 0 ? '+' : ''}
                {activeScenario.deltaPct.toFixed(2)}% vs Base
              </span>
              <span className="text-slate-300">·</span>
              <span className="text-slate-600 font-mono">
                {activeScenario.deltaAbsolute > 0 ? '+' : ''}
                {activeScenario.deltaAbsolute.toLocaleString()} unidades/USD
              </span>
            </div>
          </div>

          {/* Impacto económico detallado si está disponible */}
          {activeScenario.economicImpact && (
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
              <span className="text-xs font-bold text-slate-900 uppercase tracking-wider block">
                Impacto en Margen & Rentabilidad
              </span>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-slate-500 block">Facturación / Ingresos</span>
                  <span className="font-bold font-mono text-slate-900">
                    ${activeScenario.economicImpact.revenue?.toLocaleString()}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block">Costos Estimados</span>
                  <span className="font-bold font-mono text-slate-900">
                    ${activeScenario.economicImpact.costs?.toLocaleString()}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block">Utilidad Operativa</span>
                  <span className="font-bold font-mono text-emerald-700">
                    ${activeScenario.economicImpact.profit?.toLocaleString()}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block">Margen Neto %</span>
                  <span className="font-bold font-mono text-indigo-700">
                    {activeScenario.economicImpact.profitMarginPct}%
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Bandas de confianza Monte Carlo */}
          {mc && (
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-900">Intervalo de Confianza 95%</span>
                <span className="text-[11px] text-slate-500 font-mono">1.000 iteraciones</span>
              </div>
              <div className="font-mono text-slate-700">
                [{mc.ci95Lower.toFixed(0)}, {mc.ci95Upper.toFixed(0)}]
              </div>
              <p className="text-[11px] text-slate-500">
                Existe un 95% de certeza estocástica de que el resultado real se ubique dentro de esta banda, considerando variabilidad conjunta y error del modelo.
              </p>
            </div>
          )}
        </div>

        {/* SLIDERS INTERACTIVOS PARA MODIFICAR VARIABLES */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Palancas de Decisión y Variables del Negocio
              </h3>
              <p className="text-xs text-slate-500">
                Ajusta las magnitudes individuales y observa la respuesta del modelo en tiempo real.
              </p>
            </div>
          </div>

          <div className="space-y-4 max-h-[460px] overflow-y-auto pr-2">
            {model.features.map((feat) => {
              const rule = businessRules.find((r) => r.variableName === feat);
              const minVal = rule?.minAllowedValue ?? featureMins[feat] ?? 0;
              const maxVal = rule?.maxAllowedValue ?? featureMaxs[feat] ?? 1000;
              const currentVal = customInputs[feat] ?? featureMeans[feat] ?? 0;
              const baseVal = baseScenario.customInputs[feat] ?? featureMeans[feat] ?? 0;
              const diffPct = baseVal !== 0 ? ((currentVal - baseVal) / baseVal) * 100 : 0;

              return (
                <div key={feat} className="p-3 rounded-lg bg-slate-50 border border-slate-200 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-900">{feat}</span>
                      <span
                        className={`text-[10px] px-1.5 py-0.2 rounded font-medium ${
                          rule?.isControllable
                            ? 'bg-blue-50 text-blue-700 border border-blue-200'
                            : 'bg-slate-200 text-slate-600'
                        }`}
                      >
                        {rule?.isControllable ? 'Controlable' : 'Exógena'}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-slate-400 font-mono text-[11px]">
                        Base: {baseVal.toLocaleString()}
                      </span>
                      <span className="text-slate-300">·</span>
                      <span className="font-bold text-slate-900 font-mono tabular-nums">
                        {currentVal.toLocaleString()}
                      </span>
                      <span
                        className={`font-mono text-[11px] font-semibold ${
                          diffPct > 0
                            ? 'text-emerald-700'
                            : diffPct < 0
                            ? 'text-rose-700'
                            : 'text-slate-400'
                        }`}
                      >
                        ({diffPct > 0 ? '+' : ''}
                        {diffPct.toFixed(1)}%)
                      </span>
                    </div>
                  </div>

                  {/* Slider Control */}
                  <input
                    type="range"
                    min={minVal}
                    max={maxVal}
                    step={(maxVal - minVal) / 100 || 1}
                    value={currentVal}
                    onChange={(e) => handleSliderChange(feat, Number(e.target.value))}
                    className="w-full accent-slate-900 cursor-pointer h-1.5 bg-slate-200 rounded-lg"
                  />
                  <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                    <span>Mín: {minVal.toLocaleString()}</span>
                    <span>Máx: {maxVal.toLocaleString()}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* CURVA DE DENSIDAD MONTE CARLO */}
      {mcBins.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Distribución de Probabilidad Monte Carlo (1.000 Corridas)
              </h3>
              <p className="text-xs text-slate-500">
                Curva empírica de frecuencias para la predicción de {targetName} bajo este escenario.
              </p>
            </div>
            <div className="text-xs text-slate-600 font-mono">
              Media: <span className="font-semibold text-slate-900">{mc?.mean.toFixed(1)}</span> · Desv: {mc?.stdDev.toFixed(1)}
            </div>
          </div>

          <div className="h-44 flex items-end gap-1 pt-6 pb-2 px-2 bg-slate-50/70 rounded-lg border border-slate-100">
            {mcBins.map((bin, i) => (
              <div key={i} className="flex-1 flex flex-col items-center h-full justify-end group relative">
                <div
                  style={{ height: `${Math.max(5, bin.heightPct)}%` }}
                  className="w-full bg-indigo-600/75 hover:bg-indigo-800 rounded-t transition-all"
                />
                <div className="hidden group-hover:block absolute bottom-full mb-1 z-20 bg-slate-900 text-white text-[10px] p-1.5 rounded whitespace-nowrap shadow-md pointer-events-none">
                  {bin.range}: {bin.count} iteraciones
                </div>
              </div>
            ))}
          </div>
          <div className="flex justify-between text-xs text-slate-500">
            <span>Peor 2.5% (Pesimista): {mc?.ci95Lower.toFixed(0)}</span>
            <span>Mediana: {mc?.median.toFixed(0)}</span>
            <span>Mejor 2.5% (Optimista): {mc?.ci95Upper.toFixed(0)}</span>
          </div>
        </div>
      )}

      <div className="flex justify-end pt-4">
        <button
          onClick={onNextStep}
          className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg shadow-sm transition-colors"
        >
          <span>Avanzar a Informe Ejecutivo y Exportación</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
