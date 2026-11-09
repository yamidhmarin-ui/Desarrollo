import React, { useState } from 'react';
import {
  Briefcase,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ShieldCheck,
  Plus,
  Trash2,
} from 'lucide-react';
import { BusinessRule, ColumnProfile } from '../types';

interface BusinessRulesModuleProps {
  businessRules: BusinessRule[];
  onUpdateRule: (updatedRule: BusinessRule) => void;
  onAddRule: (newRule: BusinessRule) => void;
  onDeleteRule: (ruleId: string) => void;
  targetCol: string;
  profiles: ColumnProfile[];
  onNextStep: () => void;
}

export const BusinessRulesModule: React.FC<BusinessRulesModuleProps> = ({
  businessRules,
  onUpdateRule,
  onAddRule,
  onDeleteRule,
  targetCol,
  profiles,
  onNextStep,
}) => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [newVarName, setNewVarName] = useState(profiles[0]?.name || '');
  const [newSign, setNewSign] = useState<'positive' | 'negative' | 'ambiguous'>('positive');
  const [newRationale, setNewRationale] = useState('');
  const [newControllable, setNewControllable] = useState(true);

  const handleCreateRule = () => {
    if (!newVarName) return;
    const rule: BusinessRule = {
      id: `rule_custom_${Date.now()}`,
      variableName: newVarName,
      targetVariable: targetCol,
      expectedSign: newSign,
      businessRationale: newRationale || 'Regla establecida por juicio experto del usuario.',
      minAllowedValue: 0,
      maxAllowedValue: 100000,
      isControllable: newControllable,
      confirmedByUser: true,
    };
    onAddRule(rule);
    setShowAddModal(false);
    setNewRationale('');
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="text-xl font-bold text-slate-900">
              5. Identificación y Validación de Reglas de Negocio
            </h2>
            <p className="text-sm text-slate-500 mt-1">
              La econometría aplicada exige que los modelos respeten la lógica económica y operativa de la empresa. Aquí se verifican los signos esperados de las palancas y se establecen restricciones para las simulaciones.
            </p>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 text-xs font-semibold text-slate-900 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-lg transition-colors whitespace-nowrap shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Agregar Regla Personalizada</span>
          </button>
        </div>

        {/* REGLAS INFERIDAS Y EDITABLES */}
        <div className="space-y-4">
          {businessRules.map((rule) => {
            return (
              <div
                key={rule.id}
                className="p-4 rounded-xl border border-slate-200 hover:border-slate-300 bg-white transition-all space-y-3"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <span className="font-semibold text-sm text-slate-900">
                      {rule.variableName} &rarr; {rule.targetVariable}
                    </span>
                    <span
                      className={`text-[11px] px-2 py-0.5 rounded font-medium ${
                        rule.expectedSign === 'positive'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : rule.expectedSign === 'negative'
                          ? 'bg-rose-50 text-rose-700 border border-rose-200'
                          : 'bg-slate-100 text-slate-600 border border-slate-200'
                      }`}
                    >
                      Efecto Esperado:{' '}
                      {rule.expectedSign === 'positive'
                        ? 'Positivo (+)'
                        : rule.expectedSign === 'negative'
                        ? 'Negativo (-)'
                        : 'Ambiguo / No lineal'}
                    </span>
                    <span
                      className={`text-[11px] px-2 py-0.5 rounded font-medium ${
                        rule.isControllable
                          ? 'bg-blue-50 text-blue-700 border border-blue-200'
                          : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      {rule.isControllable ? 'Controlable por la Empresa' : 'Variable Exógena / Contexto'}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onDeleteRule(rule.id)}
                      className="text-slate-400 hover:text-rose-600 p-1"
                      title="Eliminar regla"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <p className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                  <span className="font-medium text-slate-800">Fundamento Económico / Operativo: </span>
                  {rule.businessRationale}
                </p>

                {/* Restricciones para simulación */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 text-xs">
                  <div>
                    <label className="text-slate-500 block mb-1">Signo Esperado en Modelo:</label>
                    <select
                      value={rule.expectedSign}
                      onChange={(e) =>
                        onUpdateRule({
                          ...rule,
                          expectedSign: e.target.value as any,
                        })
                      }
                      className="w-full text-xs border border-slate-300 rounded px-2 py-1.5 bg-white font-medium text-slate-800"
                    >
                      <option value="positive">Positivo (+) (Relación directa)</option>
                      <option value="negative">Negativo (-) (Ley de demanda / costo inverso)</option>
                      <option value="ambiguous">Ambiguo / Por estimar</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-slate-500 block mb-1">Mínimo Permitido en Simulación:</label>
                    <input
                      type="number"
                      value={rule.minAllowedValue ?? 0}
                      onChange={(e) =>
                        onUpdateRule({
                          ...rule,
                          minAllowedValue: Number(e.target.value),
                        })
                      }
                      className="w-full text-xs border border-slate-300 rounded px-2 py-1.5 bg-white font-mono tabular-nums text-slate-800"
                    />
                  </div>
                  <div>
                    <label className="text-slate-500 block mb-1">Máximo Límite Operativo:</label>
                    <input
                      type="number"
                      value={rule.maxAllowedValue ?? 100000}
                      onChange={(e) =>
                        onUpdateRule({
                          ...rule,
                          maxAllowedValue: Number(e.target.value),
                        })
                      }
                      className="w-full text-xs border border-slate-300 rounded px-2 py-1.5 bg-white font-mono tabular-nums text-slate-800"
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Modal para agregar regla */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl border border-slate-200 max-w-md w-full p-6 shadow-xl space-y-4">
            <h3 className="text-base font-bold text-slate-900">Nueva Regla de Negocio</h3>
            <div className="space-y-3 text-xs">
              <div>
                <label className="text-slate-600 block mb-1 font-medium">Variable Predictora:</label>
                <select
                  value={newVarName}
                  onChange={(e) => setNewVarName(e.target.value)}
                  className="w-full border border-slate-300 rounded px-3 py-2 bg-white text-slate-800"
                >
                  {profiles
                    .filter((p) => p.name !== targetCol && !p.isIdentifier)
                    .map((p) => (
                      <option key={p.name} value={p.name}>
                        {p.name}
                      </option>
                    ))}
                </select>
              </div>
              <div>
                <label className="text-slate-600 block mb-1 font-medium">Efecto Esperado:</label>
                <select
                  value={newSign}
                  onChange={(e) => setNewSign(e.target.value as any)}
                  className="w-full border border-slate-300 rounded px-3 py-2 bg-white text-slate-800"
                >
                  <option value="positive">Positivo (+) - Aumenta el KPI</option>
                  <option value="negative">Negativo (-) - Reduce el KPI</option>
                  <option value="ambiguous">Ambiguo</option>
                </select>
              </div>
              <div>
                <label className="text-slate-600 block mb-1 font-medium">Fundamento Comercial / Operativo:</label>
                <textarea
                  rows={3}
                  value={newRationale}
                  onChange={(e) => setNewRationale(e.target.value)}
                  placeholder="Explica por qué esta variable debe comportarse así según la estrategia de la empresa..."
                  className="w-full border border-slate-300 rounded px-3 py-2 bg-white text-slate-800"
                />
              </div>
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="ctrlCheck"
                  checked={newControllable}
                  onChange={(e) => setNewControllable(e.target.checked)}
                  className="rounded border-slate-300"
                />
                <label htmlFor="ctrlCheck" className="text-slate-700 cursor-pointer">
                  Variable controlable directamente por la gerencia
                </label>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <button
                onClick={() => setShowAddModal(false)}
                className="px-3.5 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Cancelar
              </button>
              <button
                onClick={handleCreateRule}
                className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg shadow-sm"
              >
                Guardar Regla
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex justify-end pt-4">
        <button
          onClick={onNextStep}
          className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg shadow-sm transition-colors"
        >
          <span>Avanzar a Selección de Variables y Modelamiento</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
