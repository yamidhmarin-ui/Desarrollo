import React from 'react';
import {
  Calculator,
  ArrowRight,
  TrendingDown,
  TrendingUp,
  HelpCircle,
  Percent,
} from 'lucide-react';
import { ModelEvaluation } from '../types';

interface EquationInterpretationModuleProps {
  model: ModelEvaluation;
  targetName: string;
  onNextStep: () => void;
}

export const EquationInterpretationModule: React.FC<EquationInterpretationModuleProps> = ({
  model,
  targetName,
  onNextStep,
}) => {
  // Format math equation
  const equationTerms = model.coefficients.map((c) => {
    const sign = c.beta >= 0 ? '+' : '-';
    return `${sign} ${Math.abs(c.beta).toFixed(3)} \\cdot \\text{${c.term}}`;
  });

  const fullEquationStr = `\\hat{Y}_{\\text{${targetName}}} = ${model.intercept.toFixed(3)} ${equationTerms.join(' ')}`;

  return (
    <div className="space-y-8">
      {/* SECTION HEADER & MATHEMATICAL EQUATION BOX */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-6">
        <div>
          <h2 className="text-xl font-bold text-slate-900">
            8. Ecuación Matemática Estimada e Interpretación de Coeficientes
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Fórmula econométrica calibrada con datos reales y traducción ejecutiva para la toma de decisiones empresariales.
          </p>
        </div>

        {/* ECUACIÓN FORMAL */}
        <div className="p-5 rounded-xl bg-slate-900 text-white font-mono text-xs sm:text-sm leading-relaxed overflow-x-auto shadow-inner">
          <div className="text-[11px] uppercase tracking-wider text-slate-400 mb-2 font-sans font-semibold">
            Ecuación de Regresión Parametrizada ({model.name}):
          </div>
          <div className="text-indigo-300 font-bold whitespace-nowrap">
            {fullEquationStr}
          </div>
        </div>

        {/* INTERPRETACIÓN DEL INTERCEPTO */}
        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800 space-y-1">
          <span className="font-bold text-sm text-slate-900 block">
            Término Constante / Intercepto (&beta;₀ = {model.intercept.toFixed(3)}):
          </span>
          <p className="text-slate-600 leading-relaxed">
            Representa el valor estimado esperado de <span className="font-semibold text-slate-900">{targetName}</span> cuando todas las variables continuas son iguales a cero y las variables categóricas se encuentran en su categoría de referencia. Proporciona el ancla base de la función de respuesta del negocio.
          </p>
        </div>
      </div>

      {/* TABLA DE PARÁMETROS Y ELASTICIDADES */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-6">
        <div>
          <h3 className="text-base font-bold text-slate-900">
            Tabla Detallada de Parámetros, Significancia y Elasticidades
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Evaluación individual de cada inductor ceteris paribus (manteniendo todas las demás variables constantes).
          </p>
        </div>

        <div className="border border-slate-200 rounded-lg overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 text-slate-700 border-b border-slate-200 font-semibold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="px-4 py-3">Variable / Término</th>
                <th className="px-3 py-3">Coeficiente (&beta;)</th>
                <th className="px-3 py-3">Error Estándar</th>
                <th className="px-3 py-3">Estadístico t</th>
                <th className="px-3 py-3">P-Valor</th>
                <th className="px-3 py-3">IC 95%</th>
                <th className="px-3 py-3">VIF</th>
                <th className="px-3 py-3">Elasticidad (%/%)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono tabular-nums text-slate-700">
              {model.coefficients.map((c) => {
                const isSig = c.pValue < 0.05;
                const isPos = c.beta >= 0;

                return (
                  <tr key={c.term} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-4 py-3 font-sans font-medium text-slate-900">
                      <div className="flex items-center gap-2">
                        {isPos ? (
                          <TrendingUp className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        ) : (
                          <TrendingDown className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                        )}
                        <span>{c.term}</span>
                        {c.isDummy && (
                          <span className="text-[10px] text-indigo-700 bg-indigo-50 px-1 py-0.2 rounded border border-indigo-200">
                            Dummy
                          </span>
                        )}
                      </div>
                    </td>
                    <td className={`px-3 py-3 font-bold ${isPos ? 'text-emerald-700' : 'text-rose-700'}`}>
                      {c.beta.toFixed(3)}
                    </td>
                    <td className="px-3 py-3 text-slate-500">{c.standardError.toFixed(3)}</td>
                    <td className="px-3 py-3">{c.tStatistic.toFixed(2)}</td>
                    <td className="px-3 py-3">
                      <span className={isSig ? 'text-emerald-700 font-semibold' : 'text-slate-400'}>
                        {c.pValue < 0.001 ? '<0.001' : c.pValue.toFixed(3)}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-slate-600">
                      [{c.ciLower.toFixed(2)}, {c.ciUpper.toFixed(2)}]
                    </td>
                    <td className="px-3 py-3">
                      <span className={c.vif > 5 ? 'text-amber-600 font-semibold' : 'text-slate-600'}>
                        {c.vif.toFixed(1)}
                      </span>
                    </td>
                    <td className="px-3 py-3 font-semibold text-slate-900">
                      {c.elasticity !== undefined ? `${c.elasticity > 0 ? '+' : ''}${c.elasticity.toFixed(2)}%` : '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* NARRATIVAS EMPRESARIALES DE CADA COEFICIENTE */}
        <div className="space-y-3 pt-4 border-t border-slate-100">
          <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
            Interpretación Ejecutiva en Lenguaje de Negocio:
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {model.coefficients.map((c) => (
              <div
                key={c.term}
                className="p-3.5 rounded-lg border border-slate-200 bg-white hover:border-slate-300 transition-colors text-xs text-slate-700 space-y-1.5"
              >
                <div className="flex items-center justify-between font-semibold text-slate-900">
                  <span>{c.term}</span>
                  <span className={c.pValue < 0.05 ? 'text-emerald-700' : 'text-slate-400'}>
                    {c.pValue < 0.05 ? 'Significativo (p < 0.05)' : 'No significativo'}
                  </span>
                </div>
                <p className="text-slate-600 leading-relaxed">{c.interpretation}</p>
                {c.elasticity !== undefined && (
                  <p className="text-[11px] text-indigo-700 font-medium">
                    Elasticidad estimada: Por cada 1% de aumento en esta variable, se espera un cambio de {c.elasticity > 0 ? '+' : ''}{c.elasticity}% en {targetName}.
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex justify-end pt-4">
        <button
          onClick={onNextStep}
          className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg shadow-sm transition-colors"
        >
          <span>Avanzar a Simulación de Escenarios de Negocio</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
