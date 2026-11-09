import React, { useRef, useState } from 'react';
import {
  Upload,
  FileSpreadsheet,
  AlertTriangle,
  CheckCircle2,
  Database,
  ArrowRight,
  Sparkles,
  Layers,
  ClipboardPaste,
  Info,
} from 'lucide-react';
import { ColumnProfile, DataQualityReport } from '../types';
import { SAMPLE_DATASETS } from '../utils/sampleDatasets';
import { parseExcelFile, parsePastedText } from '../utils/dataProcessor';

interface DataUploadModuleProps {
  onDataLoaded: (
    data: Record<string, any>[],
    sourceName: string,
    allSheets?: Record<string, any[]>,
    sheetNames?: string[]
  ) => void;
  onImputeData: () => void;
  rawFilename: string | null;
  sheetNames: string[];
  currentSheet: string;
  onSelectSheet: (sheetName: string) => void;
  data: Record<string, any>[];
  profiles: ColumnProfile[];
  quality: DataQualityReport;
  onRemoveDuplicates: () => void;
  onNextStep: () => void;
}

export const DataUploadModule: React.FC<DataUploadModuleProps> = ({
  onDataLoaded,
  onImputeData,
  rawFilename,
  sheetNames,
  currentSheet,
  onSelectSheet,
  data,
  profiles,
  quality,
  onRemoveDuplicates,
  onNextStep,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);
  const [activePreviewTab, setActivePreviewTab] = useState<'head' | 'tail'>('head');
  const [showPasteModal, setShowPasteModal] = useState(false);
  const [pastedContent, setPastedContent] = useState('');
  const [uploadError, setUploadError] = useState<string | null>(null);

  const processBuffer = (buffer: ArrayBuffer, fileName: string) => {
    try {
      setUploadError(null);
      const { sheetNames: sheets, sheets: sheetData } = parseExcelFile(buffer);
      if (sheets.length === 0) {
        setUploadError('El archivo Excel no contiene hojas con datos válidos.');
        return;
      }
      const firstSheet = sheets[0];
      const rows = sheetData[firstSheet];
      if (!rows || rows.length === 0) {
        setUploadError(`La hoja "${firstSheet}" está vacía.`);
        return;
      }
      onDataLoaded(rows, fileName, sheetData, sheets);
    } catch (err: any) {
      console.error('Error procesando archivo Excel:', err);
      setUploadError(
        'No se pudo leer el archivo Excel. Asegúrate de que no esté protegido con contraseña o dañado.'
      );
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const buffer = event.target?.result as ArrayBuffer;
      processBuffer(buffer, file.name);
    };
    reader.onerror = () => {
      setUploadError('Error al leer el archivo desde tu dispositivo.');
    };
    reader.readAsArrayBuffer(file);
    // Reset input so same file can be reloaded if needed
    e.target.value = '';
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const file = e.dataTransfer.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const buffer = event.target?.result as ArrayBuffer;
      processBuffer(buffer, file.name);
    };
    reader.readAsArrayBuffer(file);
  };

  const handleProcessPastedData = () => {
    if (!pastedContent.trim()) return;
    try {
      setUploadError(null);
      const rows = parsePastedText(pastedContent);
      if (!rows || rows.length === 0) {
        setUploadError('No se detectaron filas o columnas válidas en el texto pegado.');
        return;
      }
      onDataLoaded(rows, 'Datos_Pegados_Excel.xlsx');
      setShowPasteModal(false);
      setPastedContent('');
    } catch (err) {
      setUploadError('Error al interpretar las celdas pegadas. Asegúrate de copiar incluyendo la fila de encabezados.');
    }
  };

  const headRows = data.slice(0, 5);
  const tailRows = data.slice(-5);
  const displayRows = activePreviewTab === 'head' ? headRows : tailRows;
  const columns = data.length > 0 ? Object.keys(data[0]) : [];

  return (
    <div className="space-y-8">
      {/* SECTION 1: CARGA DE ARCHIVO & BANCO DE CASOS */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
          <div>
            <h2 className="text-xl font-bold text-slate-900">
              1. Carga y Reconocimiento de Datos (.xlsx / .xls)
            </h2>
            <p className="text-sm text-slate-500 mt-1">
              Sube el archivo Excel de tu empresa o selecciona un dataset industrial de prueba pre-configurado.
            </p>
          </div>
          {rawFilename && (
            <div className="text-xs text-slate-500">
              <span>Archivo activo: </span>
              <span className="font-semibold text-slate-900">{rawFilename}</span>
              {sheetNames.length > 1 && (
                <>
                  <span className="mx-1.5 text-slate-300">·</span>
                  <span>Hoja: </span>
                  <select
                    value={currentSheet}
                    onChange={(e) => onSelectSheet(e.target.value)}
                    className="ml-1 text-xs border border-slate-300 rounded px-2 py-1 bg-white font-medium text-slate-800"
                  >
                    {sheetNames.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </>
              )}
            </div>
          )}
        </div>

        {/* GUÍA IMPORTANTE PARA EL USUARIO SOBRE CARGA */}
        <div className="p-3.5 mb-5 rounded-lg bg-indigo-50/70 border border-indigo-200/80 text-xs text-indigo-950 flex items-start gap-2.5">
          <Info className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
          <div className="leading-relaxed">
            <span className="font-bold text-indigo-900">¿Dónde cargar tu archivo Excel? </span>
            <span>
              Sube tu archivo <strong className="font-semibold">directamente aquí dentro de la aplicación</strong> utilizando el recuadro punteado o el botón negro de abajo. <em className="not-italic text-indigo-800">Nota: No lo adjuntes en la barra de chat de la plataforma</em>, ya que el chat general de IA solo admite texto e imágenes, mientras que este cargador procesa libros Excel de forma nativa e inmediata.
            </span>
          </div>
        </div>

        {/* Error notice if upload failed */}
        {uploadError && (
          <div className="mb-4 p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{uploadError}</span>
          </div>
        )}

        {/* Dropzone interactivo */}
        <div
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
            dragActive
              ? 'border-indigo-600 bg-indigo-50/60'
              : 'border-slate-300 hover:border-slate-500 bg-slate-50/80'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx, .xls, .csv, .xlsm, .xlsb, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel, text/csv, application/csv, text/plain"
            onChange={handleFileUpload}
            className="hidden"
          />
          <div className="w-14 h-14 mx-auto rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-700 mb-3 shadow-xs">
            <Upload className="w-6 h-6 text-indigo-600" />
          </div>

          <p className="text-base font-bold text-slate-900">
            Arrastra tu archivo Excel (.xlsx / .xls) aquí
          </p>
          <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
            Compatible con libros de cálculo de Microsoft Excel, archivos CSV y hojas con múltiples pestañas.
          </p>

          <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                fileInputRef.current?.click();
              }}
              className="px-5 py-2.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg shadow-sm transition-colors"
            >
              Seleccionar archivo Excel de mi equipo
            </button>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setShowPasteModal(true);
              }}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg transition-colors"
            >
              <ClipboardPaste className="w-3.5 h-3.5 text-slate-600" />
              <span>O pegar celdas copiadas (Ctrl+V)</span>
            </button>
          </div>
        </div>

        {/* Datasets de prueba predefinidos */}
        <div className="mt-6 pt-6 border-t border-slate-100">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-3">
            O explora con un dataset empresarial representativo precargado:
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {SAMPLE_DATASETS.map((sample) => (
              <button
                key={sample.id}
                onClick={() => onDataLoaded(sample.data, `${sample.title}.xlsx`)}
                className="text-left p-3.5 rounded-lg border border-slate-200 hover:border-indigo-500 hover:bg-indigo-50/30 transition-all group"
              >
                <div className="flex items-center justify-between text-xs font-semibold text-slate-900 group-hover:text-indigo-600">
                  <span>{sample.title}</span>
                  <span className="font-mono text-slate-400">{sample.rows} filas</span>
                </div>
                <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                  {sample.description}
                </p>
                <div className="text-[11px] text-slate-400 mt-2">
                  Sector: {sample.sector}
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* MODAL PARA PEGAR CELDAS DIRECTAMENTE DESDE EXCEL */}
      {showPasteModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl border border-slate-200 max-w-xl w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <ClipboardPaste className="w-5 h-5 text-indigo-600" />
                <span>Pegar Datos Directamente desde Excel</span>
              </h3>
              <button
                onClick={() => setShowPasteModal(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-semibold"
              >
                ✕
              </button>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Abre tu hoja en Microsoft Excel, selecciona el rango de celdas que deseas analizar (asegurándote de incluir la fila de encabezados), presiona <kbd className="px-1 py-0.5 bg-slate-100 border rounded font-mono text-[11px]">Ctrl+C</kbd> y pega el contenido aquí abajo con <kbd className="px-1 py-0.5 bg-slate-100 border rounded font-mono text-[11px]">Ctrl+V</kbd>:
            </p>

            <textarea
              rows={8}
              value={pastedContent}
              onChange={(e) => setPastedContent(e.target.value)}
              placeholder="Pega tus celdas de Excel aquí (formato TSV o CSV con cabeceras)..."
              className="w-full text-xs font-mono p-3 border border-slate-300 rounded-lg bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-900"
            />

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setShowPasteModal(false)}
                className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Cancelar
              </button>
              <button
                onClick={handleProcessPastedData}
                disabled={!pastedContent.trim()}
                className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 disabled:opacity-40 rounded-lg shadow-sm"
              >
                Cargar Celdas Pegadas
              </button>
            </div>
          </div>
        </div>
      )}

      {/* METRICAS DE DIMENSIÓN Y VISTA PREVIA (HEAD / TAIL) */}
      {data.length > 0 && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl border border-slate-200 p-4">
              <span className="text-xs text-slate-500 block">Total de Filas (N)</span>
              <span className="text-2xl font-bold text-slate-900 font-mono tabular-nums">
                {quality.totalRows.toLocaleString()}
              </span>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-4">
              <span className="text-xs text-slate-500 block">Columnas / Variables (P)</span>
              <span className="text-2xl font-bold text-slate-900 font-mono tabular-nums">
                {quality.totalCols}
              </span>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-4">
              <span className="text-xs text-slate-500 block">Filas Duplicadas</span>
              <div className="flex items-baseline justify-between">
                <span className={`text-2xl font-bold font-mono tabular-nums ${quality.duplicateRows > 0 ? 'text-amber-600' : 'text-slate-900'}`}>
                  {quality.duplicateRows}
                </span>
                {quality.duplicateRows > 0 && (
                  <button
                    onClick={onRemoveDuplicates}
                    className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold"
                  >
                    Eliminar
                  </button>
                )}
              </div>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-4">
              <span className="text-xs text-slate-500 block">Celdas Faltantes</span>
              <span className={`text-2xl font-bold font-mono tabular-nums ${quality.totalMissingCells > 0 ? 'text-amber-600' : 'text-slate-900'}`}>
                {quality.totalMissingCells} ({quality.overallMissingPct}%)
              </span>
            </div>
          </div>

          {/* VISTA PREVIA HEAD (5) Y TAIL (5) */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-slate-900">
                  Exploración de Filas Iniciales y Finales
                </h3>
                <p className="text-xs text-slate-500">
                  Inspección directa de los primeros y últimos registros para verificar consistencia de cabeceras.
                </p>
              </div>

              {/* Segmented control for Head / Tail */}
              <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg text-xs font-medium">
                <button
                  onClick={() => setActivePreviewTab('head')}
                  className={`px-3 py-1 rounded-md transition-colors ${
                    activePreviewTab === 'head'
                      ? 'bg-white text-slate-900 shadow-xs font-semibold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Primeras 5 filas (Head)
                </button>
                <button
                  onClick={() => setActivePreviewTab('tail')}
                  className={`px-3 py-1 rounded-md transition-colors ${
                    activePreviewTab === 'tail'
                      ? 'bg-white text-slate-900 shadow-xs font-semibold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Últimas 5 filas (Tail)
                </button>
              </div>
            </div>

            <div className="overflow-x-auto max-h-72">
              <table className="w-full text-xs text-left border-collapse">
                <thead className="bg-slate-50 border-b border-slate-200 sticky top-0 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="px-4 py-2.5 font-mono text-slate-400">#</th>
                    {columns.map((col) => (
                      <th key={col} className="px-4 py-2.5 whitespace-nowrap">
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono tabular-nums text-slate-700">
                  {displayRows.map((row, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-4 py-2 text-slate-400 font-mono">
                        {activePreviewTab === 'head' ? idx + 1 : data.length - 5 + idx + 1}
                      </td>
                      {columns.map((col) => (
                        <td key={col} className="px-4 py-2 whitespace-nowrap">
                          {row[col] === null || row[col] === undefined
                            ? <span className="text-amber-500 font-sans italic">Nulo</span>
                            : String(row[col])}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* SECTION 2: DIAGNÓSTICO DE CALIDAD & IMPUTACIÓN */}
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  2. Diagnóstico de Calidad, Atípicos e Imputación Adaptada
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Evaluación de valores nulos, registros fuera de rango y tratamiento especial para la variable dependiente.
                </p>
              </div>

              {quality.totalMissingCells > 0 ? (
                <button
                  onClick={onImputeData}
                  className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs transition-colors whitespace-nowrap shrink-0"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Ejecutar Imputación Inteligente</span>
                </button>
              ) : (
                <div className="flex items-center gap-2 text-xs text-emerald-700 font-medium">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Dataset completo: sin valores nulos detectados</span>
                </div>
              )}
            </div>

            {/* Inconsistencias detectadas */}
            {quality.inconsistenciesDetected.length > 0 && (
              <div className="mb-6 p-4 rounded-lg bg-amber-50/80 border border-amber-200 text-xs text-amber-900">
                <div className="flex items-center gap-2 font-semibold mb-1">
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                  <span>Inconsistencias económicas o físicas detectadas:</span>
                </div>
                <ul className="list-disc pl-5 space-y-1">
                  {quality.inconsistenciesDetected.map((inc, i) => (
                    <li key={i}>{inc}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Tabla de variables con diagnóstico de calidad */}
            <div className="border border-slate-200 rounded-lg overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 font-semibold uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="px-4 py-2.5">Variable</th>
                    <th className="px-4 py-2.5">Tipo Detectado</th>
                    <th className="px-4 py-2.5">Valores Faltantes</th>
                    <th className="px-4 py-2.5">% Nulos</th>
                    <th className="px-4 py-2.5">Atípicos (IQR)</th>
                    <th className="px-4 py-2.5">Método Sugerido</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono tabular-nums text-slate-700">
                  {profiles.map((p) => {
                    let suggestedMethod = 'Ninguno (Completo)';
                    if (p.missingCount > 0) {
                      if (p.type === 'numeric_continuous' || p.type === 'numeric_discrete') {
                        suggestedMethod = (p.skewness && Math.abs(p.skewness) > 1) || p.outlierCount > 0 ? 'Mediana (Robustez)' : 'Media';
                      } else if (p.type === 'date') {
                        suggestedMethod = 'Interpolación / Arrastre';
                      } else {
                        suggestedMethod = 'Moda / Categoría Frecuente';
                      }
                    }

                    return (
                      <tr key={p.name} className="hover:bg-slate-50/70 transition-colors">
                        <td className="px-4 py-2 font-sans font-medium text-slate-900">
                          {p.name}
                        </td>
                        <td className="px-4 py-2 font-sans text-slate-600">
                          {p.type.replace('_', ' ')}
                        </td>
                        <td className="px-4 py-2">
                          {p.missingCount > 0 ? (
                            <span className="text-amber-600 font-semibold">{p.missingCount}</span>
                          ) : (
                            <span className="text-slate-400">0</span>
                          )}
                        </td>
                        <td className="px-4 py-2">
                          {p.missingPct > 0 ? (
                            <span className="text-amber-600 font-semibold">{p.missingPct}%</span>
                          ) : (
                            <span className="text-slate-400">0.0%</span>
                          )}
                        </td>
                        <td className="px-4 py-2">
                          {p.outlierCount > 0 ? (
                            <span className="text-slate-700">{p.outlierCount} obs.</span>
                          ) : (
                            <span className="text-slate-400">0</span>
                          )}
                        </td>
                        <td className="px-4 py-2 font-sans text-slate-600">
                          {suggestedMethod}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Imputation Log si ya se ejecutó */}
            {quality.imputationLog.length > 0 && (
              <div className="mt-6 pt-6 border-t border-slate-100">
                <h4 className="text-xs font-semibold text-slate-900 uppercase tracking-wider mb-3">
                  Registro de Trazabilidad de Imputaciones Realizadas:
                </h4>
                <div className="space-y-2">
                  {quality.imputationLog.map((log, i) => (
                    <div
                      key={i}
                      className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-700 flex flex-col md:flex-row md:items-center justify-between gap-2"
                    >
                      <div>
                        <span className="font-semibold text-slate-900">{log.column}: </span>
                        <span>{log.reason}</span>
                      </div>
                      <span className="font-mono text-slate-500 shrink-0">
                        {log.valuesImputed} registros imputados
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Action button to continue to Next Module */}
          <div className="flex justify-end pt-4">
            <button
              onClick={onNextStep}
              className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg shadow-sm transition-colors"
            >
              <span>Avanzar a Clasificación de Variables</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </>
      )}
    </div>
  );
};
