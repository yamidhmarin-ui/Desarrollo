import React from 'react';
import {
  ArrowRight,
  Sliders,
  Check,
  AlertCircle,
  HelpCircle,
} from 'lucide-react';
import { ColumnProfile, VariableType } from '../types';

interface VariableClassificationModuleProps {
  profiles: ColumnProfile[];
  onUpdateVariableType: (colName: string, newType: VariableType) => void;
  onNextStep: () => void;
}

export const VariableClassificationModule: React.FC<VariableClassificationModuleProps> = ({
  profiles,
  onUpdateVariableType,
  onNextStep,
}) => {
  const typeOptions: { value: VariableType; label: string }[] = [
    { value: 'numeric_continuous', label: 'Numérica Continua (Float / Rango continuo)' },
    { value: 'numeric_discrete', label: 'Numérica Discreta (Enteros / Conteos)' },
    { value: 'categorical_nominal', label: 'Categórica Nominal (Texto / Factores)' },
    { value: 'categorical_ordinal', label: 'Categórica Ordinal (Nivel / Escala)' },
    { value: 'date', label: 'Fecha / Temporal' },
    { value: 'identifier', label: 'Identificador (ID / Código único)' },
    { value: 'irrelevant', label: 'Irrelevante / Sin Varianza' },
  ];

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="text-xl font-bold text-slate-900">
              3. Identificación y Clasificación de Variables
            </h2>
            <p className="text-sm text-slate-500 mt-1">
              Revisión y ajuste del rol metodológico de cada variable. Las variables categóricas se convertirán automáticamente en variables dummy (One-Hot Encoding) eliminando la categoría de referencia para prevenir multicolinealidad perfecta (la trampa de la variable dummy).
            </p>
          </div>
        </div>

        {/* Info banner sobre la trampa de la dummy */}
        <div className="p-4 mb-6 rounded-lg bg-indigo-50/70 border border-indigo-200 text-xs text-indigo-900 flex items-start gap-3">
          <HelpCircle className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold">Regla Econométrica de Codificación Dummy (k - 1): </span>
            <span>
              Para cada variable categórica con $k$ niveles, se crean exactamente $k - 1$ variables binarias y se descarta una categoría como nivel base. Esto garantiza que la matriz de diseño no sea singular ($|X^T X| \neq 0$) y permite interpretar el coeficiente de cada categoría respecto al grupo base.
            </span>
          </div>
        </div>

        {/* Tabla interactiva de variables */}
        <div className="border border-slate-200 rounded-lg overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 font-semibold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="px-4 py-3">Variable</th>
                <th className="px-4 py-3">Valores Muestra</th>
                <th className="px-4 py-3">Valores Únicos</th>
                <th className="px-4 py-3">Clasificación Asignada</th>
                <th className="px-4 py-3">Tratamiento para Regresión</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {profiles.map((p) => {
                const sampleStr = p.sampleValues.map((v) => String(v)).join(', ');
                const isCat = p.type === 'categorical_nominal' || p.type === 'categorical_ordinal';

                return (
                  <tr key={p.name} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-4 py-3 font-medium text-slate-900 font-sans">
                      <div className="flex items-center gap-2">
                        <span>{p.name}</span>
                        {p.cardinalityTooHigh && (
                          <span className="text-[10px] text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                            Alta Cardinalidad (&gt;20)
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-500 font-mono text-[11px] max-w-xs truncate">
                      {sampleStr || '—'}
                    </td>
                    <td className="px-4 py-3 font-mono tabular-nums text-slate-600">
                      {p.uniqueCount}
                    </td>
                    <td className="px-4 py-3">
                      <select
                        value={p.type}
                        onChange={(e) =>
                          onUpdateVariableType(p.name, e.target.value as VariableType)
                        }
                        className="text-xs border border-slate-300 rounded px-2.5 py-1.5 bg-white font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-900 w-full max-w-xs"
                      >
                        {typeOptions.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-3 font-sans text-xs">
                      {isCat ? (
                        <div>
                          <span className="font-semibold text-indigo-700">
                            One-Hot Encoding ({p.uniqueCount - 1} dummies)
                          </span>
                          {p.categories && p.categories[0] && (
                            <span className="text-slate-500 block text-[11px]">
                              Categoría base omitida: "{p.categories[0].label}"
                            </span>
                          )}
                        </div>
                      ) : p.type === 'numeric_continuous' || p.type === 'numeric_discrete' ? (
                        <span className="text-emerald-700 font-medium">
                          Predictor numérico directo
                        </span>
                      ) : p.type === 'identifier' ? (
                        <span className="text-slate-400">
                          Excluido (Previene fuga de datos / data leakage)
                        </span>
                      ) : p.type === 'date' ? (
                        <span className="text-slate-500">
                          Eje temporal para tendencias y estacionalidad
                        </span>
                      ) : (
                        <span className="text-slate-400">Excluido (Varianza nula)</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex justify-end pt-4">
        <button
          onClick={onNextStep}
          className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg shadow-sm transition-colors"
        >
          <span>Avanzar a Análisis Exploratorio (AED)</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
