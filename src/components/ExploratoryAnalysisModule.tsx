import React, { useState } from 'react';
import {
  BarChart2,
  TrendingUp,
  AlertCircle,
  HelpCircle,
  ArrowRight,
  Filter,
} from 'lucide-react';
import { ColumnProfile } from '../types';
import { pearsonCorrelation, spearmanCorrelation } from '../utils/math';

interface ExploratoryAnalysisModuleProps {
  data: Record<string, any>[];
  profiles: ColumnProfile[];
  onNextStep: () => void;
}

export const ExploratoryAnalysisModule: React.FC<ExploratoryAnalysisModuleProps> = ({
  data,
  profiles,
  onNextStep,
}) => {
  const numericProfiles = profiles.filter(
    (p) => p.type === 'numeric_continuous' || p.type === 'numeric_discrete'
  );
  const categoricalProfiles = profiles.filter(
    (p) => p.type === 'categorical_nominal' || p.type === 'categorical_ordinal'
  );
  const dateProfile = profiles.find((p) => p.type === 'date');

  const [selectedNumVar, setSelectedNumVar] = useState<string>(
    numericProfiles[0]?.name || ''
  );
  const [scatterXVar, setScatterXVar] = useState<string>(
    numericProfiles[0]?.name || ''
  );
  const [scatterYVar, setScatterYVar] = useState<string>(
    numericProfiles[1]?.name || numericProfiles[0]?.name || ''
  );
  const [corrMethod, setCorrMethod] = useState<'pearson' | 'spearman'>('pearson');

  // Compute correlation matrix
  const numNames = numericProfiles.map((p) => p.name);
  const corrMatrix: Record<string, Record<string, number>> = {};
  const highCorrelations: { v1: string; v2: string; corr: number }[] = [];

  for (let i = 0; i < numNames.length; i++) {
    const v1 = numNames[i];
    corrMatrix[v1] = {};
    const arr1 = data.map((d) => Number(d[v1]));

    for (let j = 0; j < numNames.length; j++) {
      const v2 = numNames[j];
      const arr2 = data.map((d) => Number(d[v2]));

      const r =
        corrMethod === 'pearson'
          ? pearsonCorrelation(arr1, arr2)
          : spearmanCorrelation(arr1, arr2);

      corrMatrix[v1][v2] = Number(r.toFixed(3));

      if (i < j && Math.abs(r) >= 0.7) {
        highCorrelations.push({ v1, v2, corr: Number(r.toFixed(3)) });
      }
    }
  }

  // Active numeric variable stats
  const activeProfile = profiles.find((p) => p.name === selectedNumVar);
  const activeValues = activeProfile
    ? data.map((d) => Number(d[selectedNumVar])).filter((v) => !isNaN(v))
    : [];

  // Generate 12 histogram bins
  let histBins: { range: string; count: number; heightPct: number }[] = [];
  if (activeValues.length > 0 && activeProfile?.min !== undefined && activeProfile?.max !== undefined) {
    const min = activeProfile.min;
    const max = activeProfile.max;
    const binCount = 10;
    const step = (max - min) / binCount || 1;

    const counts = new Array(binCount).fill(0);
    for (const v of activeValues) {
      const idx = Math.min(binCount - 1, Math.floor((v - min) / step));
      counts[idx]++;
    }

    const maxCount = Math.max(...counts, 1);
    histBins = counts.map((count, i) => {
      const start = min + i * step;
      const end = start + step;
      return {
        range: `${start.toFixed(1)} - ${end.toFixed(1)}`,
        count,
        heightPct: (count / maxCount) * 100,
      };
    });
  }

  // Scatter plot points (normalized to 100x100 SVG viewbox)
  const xValues = data.map((d) => Number(d[scatterXVar])).filter((v) => !isNaN(v));
  const yValues = data.map((d) => Number(d[scatterYVar])).filter((v) => !isNaN(v));
  const xMin = Math.min(...xValues);
  const xMax = Math.max(...xValues);
  const yMin = Math.min(...yValues);
  const yMax = Math.max(...yValues);

  const scatterPoints = data
    .map((d) => {
      const x = Number(d[scatterXVar]);
      const y = Number(d[scatterYVar]);
      if (isNaN(x) || isNaN(y)) return null;
      const svgX = xMax > xMin ? ((x - xMin) / (xMax - xMin)) * 88 + 6 : 50;
      const svgY = yMax > yMin ? 94 - ((y - yMin) / (yMax - yMin)) * 88 : 50;
      return { x, y, svgX, svgY };
    })
    .filter(Boolean);

  // Scatter linear trendline
  const rScatter = pearsonCorrelation(xValues, yValues);
  const trendY1 = yMax > yMin ? 94 - ((yValues[0] - yMin) / (yMax - yMin)) * 88 : 50;
  const trendY2 = yMax > yMin ? 94 - ((yValues[yValues.length - 1] - yMin) / (yMax - yMin)) * 88 : 50;

  return (
    <div className="space-y-8">
      {/* SECTION HEADER */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
        <h2 className="text-xl font-bold text-slate-900">
          4. Análisis Exploratorio de Datos (AED)
        </h2>
        <p className="text-sm text-slate-500 mt-1">
          Diagnóstico de distribución, asimetría, relaciones no lineales y multicolinealidad entre variables del negocio.
        </p>

        {/* TABLA DE RESUMEN DESCRIPTIVO */}
        <div className="mt-6 border border-slate-200 rounded-lg overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 font-semibold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="px-4 py-2.5">Variable</th>
                <th className="px-4 py-2.5">Media</th>
                <th className="px-4 py-2.5">Mediana</th>
                <th className="px-4 py-2.5">Desv. Est.</th>
                <th className="px-4 py-2.5">Mín</th>
                <th className="px-4 py-2.5">Q1 (25%)</th>
                <th className="px-4 py-2.5">Q3 (75%)</th>
                <th className="px-4 py-2.5">Máx</th>
                <th className="px-4 py-2.5">Asimetría</th>
                <th className="px-4 py-2.5">Curtosis</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono tabular-nums text-slate-700">
              {numericProfiles.map((p) => (
                <tr key={p.name} className="hover:bg-slate-50/70 transition-colors">
                  <td className="px-4 py-2 font-sans font-medium text-slate-900">
                    {p.name}
                  </td>
                  <td className="px-4 py-2">{p.mean?.toFixed(2) ?? '—'}</td>
                  <td className="px-4 py-2">{p.median?.toFixed(2) ?? '—'}</td>
                  <td className="px-4 py-2">{p.stdDev?.toFixed(2) ?? '—'}</td>
                  <td className="px-4 py-2">{p.min?.toFixed(2) ?? '—'}</td>
                  <td className="px-4 py-2">{p.q1?.toFixed(2) ?? '—'}</td>
                  <td className="px-4 py-2">{p.q3?.toFixed(2) ?? '—'}</td>
                  <td className="px-4 py-2">{p.max?.toFixed(2) ?? '—'}</td>
                  <td className="px-4 py-2">
                    <span className={Math.abs(p.skewness || 0) > 1 ? 'text-amber-600 font-semibold' : ''}>
                      {p.skewness?.toFixed(2) ?? '—'}
                    </span>
                  </td>
                  <td className="px-4 py-2">{p.kurtosis?.toFixed(2) ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* HISTOGRAMA & BOXPLOT INTERACTIVO */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Histograma de Frecuencia & Forma de Distribución
              </h3>
              <p className="text-xs text-slate-500">
                Evalúa si la distribución es simétrica o sesgada hacia valores altos/bajos.
              </p>
            </div>
            <select
              value={selectedNumVar}
              onChange={(e) => setSelectedNumVar(e.target.value)}
              className="text-xs border border-slate-300 rounded px-2.5 py-1 bg-white font-medium text-slate-800"
            >
              {numericProfiles.map((p) => (
                <option key={p.name} value={p.name}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          {/* Histograma SVG */}
          <div className="h-56 flex items-end gap-1.5 pt-6 pb-2 px-2 bg-slate-50/70 rounded-lg border border-slate-100">
            {histBins.map((bin, i) => (
              <div key={i} className="flex-1 flex flex-col items-center h-full justify-end group relative">
                <div
                  style={{ height: `${Math.max(6, bin.heightPct)}%` }}
                  className="w-full bg-indigo-600/80 hover:bg-indigo-700 rounded-t transition-all"
                />
                <span className="text-[9px] font-mono text-slate-400 mt-1 truncate max-w-full">
                  {bin.count}
                </span>
                {/* Tooltip */}
                <div className="hidden group-hover:block absolute bottom-full mb-1 z-20 bg-slate-900 text-white text-[10px] p-1.5 rounded whitespace-nowrap shadow-md pointer-events-none">
                  {bin.range}: <span className="font-semibold">{bin.count} obs</span>
                </div>
              </div>
            ))}
          </div>
          <div className="text-xs text-slate-500 mt-3 flex justify-between">
            <span>Mín: {activeProfile?.min?.toFixed(1)}</span>
            <span>Media: {activeProfile?.mean?.toFixed(1)}</span>
            <span>Máx: {activeProfile?.max?.toFixed(1)}</span>
          </div>
        </div>

        {/* SCATTER PLOT BIDIMENSIONAL */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Gráfico de Dispersión (Scatter Plot) & Tendencia
              </h3>
              <p className="text-xs text-slate-500">
                Correlación lineal observada: <span className="font-mono font-semibold text-slate-800">{rScatter.toFixed(3)}</span>
              </p>
            </div>
            <div className="flex items-center gap-2">
              <select
                value={scatterXVar}
                onChange={(e) => setScatterXVar(e.target.value)}
                className="text-xs border border-slate-300 rounded px-2 py-1 bg-white font-medium text-slate-800"
              >
                {numericProfiles.map((p) => (
                  <option key={p.name} value={p.name}>
                    X: {p.name}
                  </option>
                ))}
              </select>
              <select
                value={scatterYVar}
                onChange={(e) => setScatterYVar(e.target.value)}
                className="text-xs border border-slate-300 rounded px-2 py-1 bg-white font-medium text-slate-800"
              >
                {numericProfiles.map((p) => (
                  <option key={p.name} value={p.name}>
                    Y: {p.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Scatter Canvas SVG */}
          <div className="h-56 bg-slate-50/70 rounded-lg border border-slate-100 relative p-2">
            <svg viewBox="0 0 100 100" className="w-full h-full overflow-visible">
              {/* Grid lines */}
              <line x1="6" y1="50" x2="94" y2="50" stroke="#e2e8f0" strokeDasharray="2" strokeWidth="0.5" />
              <line x1="50" y1="6" x2="50" y2="94" stroke="#e2e8f0" strokeDasharray="2" strokeWidth="0.5" />

              {/* Data points */}
              {scatterPoints.map((pt, i) =>
                pt ? (
                  <circle
                    key={i}
                    cx={pt.svgX}
                    cy={pt.svgY}
                    r="1.8"
                    className="fill-indigo-600/70 hover:fill-indigo-900 transition-colors"
                  />
                ) : null
              )}
            </svg>
          </div>
          <div className="text-xs text-slate-500 mt-3 flex justify-between">
            <span>Eje X ({scatterXVar})</span>
            <span>Eje Y ({scatterYVar})</span>
          </div>
        </div>
      </div>

      {/* MATRIZ DE CORRELACIÓN (HEATMAP) */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
          <div>
            <h3 className="text-base font-bold text-slate-900">
              Matriz de Correlación Térmica
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Identificación de relaciones directas (+), inversas (-) y detección temprana de multicolinealidad.
            </p>
          </div>

          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg text-xs font-medium">
            <button
              onClick={() => setCorrMethod('pearson')}
              className={`px-3 py-1 rounded-md transition-colors ${
                corrMethod === 'pearson'
                  ? 'bg-white text-slate-900 shadow-xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Pearson (Lineal)
            </button>
            <button
              onClick={() => setCorrMethod('spearman')}
              className={`px-3 py-1 rounded-md transition-colors ${
                corrMethod === 'spearman'
                  ? 'bg-white text-slate-900 shadow-xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Spearman (Rangos / Monótono)
            </button>
          </div>
        </div>

        {/* Advertencias de alta correlación */}
        {highCorrelations.length > 0 && (
          <div className="mb-4 p-3 rounded-lg bg-amber-50/70 border border-amber-200 text-xs text-amber-900 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold">Alerta de Colinealidad Elevada (|r| &ge; 0.70): </span>
              {highCorrelations.map((hc, idx) => (
                <span key={idx}>
                  {hc.v1} y {hc.v2} (r={hc.corr})
                  {idx < highCorrelations.length - 1 ? '; ' : '.'}
                </span>
              ))}
              <p className="mt-1 text-slate-600">
                Se recomienda evaluar regularización Ridge o Lasso para evitar sobre-inflación de la varianza en los coeficientes.
              </p>
            </div>
          </div>
        )}

        {/* Heatmap Grid */}
        <div className="border border-slate-200 rounded-lg overflow-x-auto">
          <table className="w-full text-xs text-center border-collapse">
            <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
              <tr>
                <th className="px-3 py-2 text-left bg-slate-100">Variable</th>
                {numNames.map((col) => (
                  <th key={col} className="px-3 py-2 whitespace-nowrap font-medium">
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono tabular-nums">
              {numNames.map((rowVar) => (
                <tr key={rowVar}>
                  <td className="px-3 py-2 text-left font-sans font-medium text-slate-900 bg-slate-50 whitespace-nowrap">
                    {rowVar}
                  </td>
                  {numNames.map((colVar) => {
                    const r = corrMatrix[rowVar]?.[colVar] ?? 0;
                    const isDiag = rowVar === colVar;

                    // Color cell based on correlation
                    let bgClass = 'bg-white text-slate-700';
                    if (!isDiag) {
                      if (r > 0.6) bgClass = 'bg-indigo-100 text-indigo-900 font-semibold';
                      else if (r > 0.3) bgClass = 'bg-indigo-50/60 text-indigo-800';
                      else if (r < -0.6) bgClass = 'bg-rose-100 text-rose-900 font-semibold';
                      else if (r < -0.3) bgClass = 'bg-rose-50/60 text-rose-800';
                    } else {
                      bgClass = 'bg-slate-100 text-slate-400';
                    }

                    return (
                      <td key={colVar} className={`px-3 py-2 ${bgClass}`}>
                        {r.toFixed(2)}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex justify-end pt-4">
        <button
          onClick={onNextStep}
          className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg shadow-sm transition-colors"
        >
          <span>Avanzar a Reglas de Negocio</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
