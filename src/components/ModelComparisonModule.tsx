import React, { useState } from 'react';
import {
  Trophy,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Sparkles,
  Info,
  TrendingUp,
} from 'lucide-react';
import { ColumnProfile, ModelEvaluation } from '../types';

interface ModelComparisonModuleProps {
  profiles: ColumnProfile[];
  targetCol: string;
  onSelectTarget: (col: string) => void;
  selectedFeatures: string[];
  onToggleFeature: (col: string) => void;
  models: ModelEvaluation[];
  bestModelId: string;
  selectionRationale: string;
  onTrainModels: () => void;
  onNextStep: () => void;
  isTraining: boolean;
}

export const ModelComparisonModule: React.FC<ModelComparisonModuleProps> = ({
  profiles,
  targetCol,
  onSelectTarget,
  selectedFeatures,
  onToggleFeature,
  models,
  bestModelId,
  selectionRationale,
  onTrainModels,
  onNextStep,
  isTraining,
}) => {
  const [selectedResidualModelId, setSelectedResidualModelId] = useState<string>(
    bestModelId || models[0]?.id || ''
  );

  const availableTargets = profiles.filter(
    (p) =>
      (p.type === 'numeric_continuous' || p.type === 'numeric_discrete') &&
      !p.isIdentifier
  );

  const candidatePredictors = profiles.filter(
    (p) => p.name !== targetCol && !p.isIdentifier && p.type !== 'irrelevant'
  );

  const activeModel = models.find((m) => m.id === selectedResidualModelId) || models[0];

  return (
    <div className="space-y-8">
      {/* SELECCIÓN DE VARIABLE DEPENDIENTE E INDEPENDIENTES */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="text-xl font-bold text-slate-900">
              6. Selección de Variable Dependiente (Y) e Independientes (X)
            </h2>
            <p className="text-sm text-slate-500 mt-1">
              Configura el objetivo del negocio y los factores causales que se someterán a estimación econométrica.
            </p>
          </div>
          <button
            onClick={onTrainModels}
            disabled={isTraining || selectedFeatures.length === 0}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-lg shadow-sm transition-colors whitespace-nowrap shrink-0"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>{isTraining ? 'Entrenando Modelos...' : 'Re-Entrenar y Comparar Modelos'}</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
          {/* Col 1: Variable Dependiente Y */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
            <span className="text-xs font-bold text-slate-900 uppercase tracking-wider block mb-2">
              Variable Dependiente (Y)
            </span>
            <p className="text-xs text-slate-500 mb-3">
              Métrica clave de desempeño (KPI) que se busca explicar y simular.
            </p>
            <select
              value={targetCol}
              onChange={(e) => onSelectTarget(e.target.value)}
              className="w-full text-xs font-semibold border border-slate-300 rounded px-3 py-2 bg-white text-slate-900 focus:ring-1 focus:ring-slate-900"
            >
              {availableTargets.map((t) => (
                <option key={t.name} value={t.name}>
                  {t.name} ({t.type === 'numeric_continuous' ? 'Continua' : 'Discreta'})
                </option>
              ))}
            </select>
          </div>

          {/* Col 2 & 3: Variables Independientes X */}
          <div className="md:col-span-2 p-4 rounded-xl bg-slate-50 border border-slate-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Variables Independientes Explicativas (X)
              </span>
              <span className="text-xs font-mono text-slate-500">
                {selectedFeatures.length} seleccionadas de {candidatePredictors.length}
              </span>
            </div>
            <p className="text-xs text-slate-500 mb-3">
              Selecciona los inductores con justificación económica. Se omiten identificadores para evitar fuga de datos (data leakage).
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-48 overflow-y-auto pr-1">
              {candidatePredictors.map((p) => {
                const isSelected = selectedFeatures.includes(p.name);
                return (
                  <label
                    key={p.name}
                    className={`flex items-center gap-2 p-2 rounded-lg border text-xs cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-white border-slate-900 text-slate-900 font-medium shadow-2xs'
                        : 'bg-slate-100 border-slate-200 text-slate-600 hover:bg-slate-200/50'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => onToggleFeature(p.name)}
                      className="rounded border-slate-300 text-slate-900 focus:ring-0"
                    />
                    <span className="truncate">{p.name}</span>
                  </label>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* COMPARATIVA DE MODELOS Y SELECCIÓN DEL MEJOR */}
      {models.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-6">
          <div>
            <h2 className="text-xl font-bold text-slate-900">
              7. Evaluación Comparativa y Selección del Mejor Modelo
            </h2>
            <p className="text-sm text-slate-500 mt-1">
              Estimación rigurosa a través de múltiples metodologías de regresión lineal y regularizada.
            </p>
          </div>

          {/* RATIONALE GANADOR */}
          <div className="p-4 rounded-xl bg-amber-50/70 border border-amber-200/90 text-xs text-amber-950 flex items-start gap-3">
            <Trophy className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="font-bold text-sm text-amber-900">
                  Modelo Ganador Seleccionado por Criterio Multidimensional
                </span>
              </div>
              <p className="leading-relaxed text-amber-900/90">{selectionRationale}</p>
            </div>
          </div>

          {/* TABLA COMPARATIVA DE MÉTRICAS */}
          <div className="border border-slate-200 rounded-lg overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-700 border-b border-slate-200 font-semibold uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="px-4 py-3">Modelo</th>
                  <th className="px-3 py-3">R²</th>
                  <th className="px-3 py-3">R² Ajustado</th>
                  <th className="px-3 py-3">MAE</th>
                  <th className="px-3 py-3">RMSE</th>
                  <th className="px-3 py-3">AIC</th>
                  <th className="px-3 py-3">BIC</th>
                  <th className="px-3 py-3">VIF Máx</th>
                  <th className="px-3 py-3">P-Valor F</th>
                  <th className="px-4 py-3">Propósito Principal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono tabular-nums text-slate-700">
                {models.map((m) => {
                  const isWinner = m.isBest;

                  return (
                    <tr
                      key={m.id}
                      className={`hover:bg-slate-50/80 transition-colors ${
                        isWinner ? 'bg-amber-50/30 font-medium' : ''
                      }`}
                    >
                      <td className="px-4 py-3 font-sans">
                        <div className="flex items-center gap-2">
                          {isWinner && (
                            <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-1.5 py-0.5 rounded">
                              Ganador
                            </span>
                          )}
                          <span className="font-semibold text-slate-900">{m.name}</span>
                        </div>
                        <span className="text-[11px] text-slate-500 block font-normal">
                          {m.description}
                        </span>
                      </td>
                      <td className="px-3 py-3 font-semibold text-slate-900">
                        {(m.r2 * 100).toFixed(1)}%
                      </td>
                      <td className="px-3 py-3 text-indigo-700 font-semibold">
                        {(m.r2Adjusted * 100).toFixed(1)}%
                      </td>
                      <td className="px-3 py-3">{m.mae.toLocaleString()}</td>
                      <td className="px-3 py-3">{m.rmse.toLocaleString()}</td>
                      <td className="px-3 py-3">{m.aic.toFixed(1)}</td>
                      <td className="px-3 py-3 font-semibold text-slate-900">{m.bic.toFixed(1)}</td>
                      <td className="px-3 py-3">
                        <span className={m.maxVif > 5 ? 'text-amber-600 font-semibold' : 'text-slate-700'}>
                          {m.maxVif.toFixed(1)}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-emerald-700">
                        {m.fPValue < 0.001 ? '<0.001' : m.fPValue.toFixed(3)}
                      </td>
                      <td className="px-4 py-3 font-sans text-slate-600 text-[11px]">
                        {m.businessRecommendation}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* DIAGNÓSTICO ECONOMÉTRICO DE RESIDUOS */}
          <div className="pt-4 border-t border-slate-100">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Diagnóstico de Supuestos Econométricos de Residuos
                </h3>
                <p className="text-xs text-slate-500">
                  Pruebas formales de independencia (Durbin-Watson), heterocedasticidad (Breusch-Pagan) y normalidad (Jarque-Bera).
                </p>
              </div>

              <select
                value={selectedResidualModelId}
                onChange={(e) => setSelectedResidualModelId(e.target.value)}
                className="text-xs border border-slate-300 rounded px-2.5 py-1.5 bg-white font-medium text-slate-800"
              >
                {models.map((m) => (
                  <option key={m.id} value={m.id}>
                    Ver residuos: {m.name}
                  </option>
                ))}
              </select>
            </div>

            {activeModel && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-xs text-slate-500 block">Independencia de Errores</span>
                  <span className="text-base font-bold font-mono text-slate-900">
                    Durbin-Watson: {activeModel.residualDiagnostics.durbinWatson}
                  </span>
                  <p className="text-xs text-slate-600 mt-1">
                    {Math.abs(activeModel.residualDiagnostics.durbinWatson - 2) < 0.5
                      ? 'Sin evidencia de autocorrelación serial (óptimo cercano a 2.0).'
                      : 'Posible autocorrelación de primer orden en los residuos.'}
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-xs text-slate-500 block">Homocedasticidad (Breusch-Pagan)</span>
                  <span className="text-base font-bold font-mono text-slate-900">
                    p-valor: {activeModel.residualDiagnostics.breuschPaganPValue}
                  </span>
                  <p className="text-xs text-slate-600 mt-1">
                    {activeModel.residualDiagnostics.breuschPaganPValue >= 0.05
                      ? 'Varianza de error constante (homocedasticidad validada).'
                      : 'Presencia de heterocedasticidad; se recomienda errores robustos o Ridge.'}
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-xs text-slate-500 block">Normalidad de Residuos (Jarque-Bera)</span>
                  <span className="text-base font-bold font-mono text-slate-900">
                    p-valor: {activeModel.residualDiagnostics.jarqueBeraPValue}
                  </span>
                  <p className="text-xs text-slate-600 mt-1">
                    {activeModel.residualDiagnostics.jarqueBeraPValue >= 0.05
                      ? 'Residuos siguen distribución aproximadamente normal.'
                      : 'Asimetría en colas; inferencia válida por teorema del límite central.'}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="flex justify-end pt-4">
        <button
          onClick={onNextStep}
          className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg shadow-sm transition-colors"
        >
          <span>Avanzar a Ecuación Matemática e Interpretación</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
