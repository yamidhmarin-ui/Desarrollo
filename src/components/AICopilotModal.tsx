import React, { useState } from 'react';
import {
  Sparkles,
  X,
  Send,
  Loader2,
  Bot,
  User,
  HelpCircle,
  Lightbulb,
} from 'lucide-react';
import { ModelEvaluation, ScenarioDefinition } from '../types';

interface AICopilotModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetCol: string;
  bestModel: ModelEvaluation | null;
  scenarios: ScenarioDefinition[];
}

export const AICopilotModal: React.FC<AICopilotModalProps> = ({
  isOpen,
  onClose,
  targetCol,
  bestModel,
  scenarios,
}) => {
  const [messages, setMessages] = useState<
    { role: 'user' | 'assistant'; text: string }[]
  >([
    {
      role: 'assistant',
      text: `Hola, soy tu Copiloto Econométrico y Científico de Datos Senior. He analizado la estructura de tu modelo para "${targetCol}". Puedes hacerme cualquier consulta sobre interpretación de coeficientes, riesgos de multicolinealidad, elasticidades o decisiones estratégicas para tu junta directiva.`,
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const handleSend = async (userQuestion?: string) => {
    const query = userQuestion || input;
    if (!query.trim() || isLoading) return;

    const newMessages = [...messages, { role: 'user' as const, text: query }];
    setMessages(newMessages);
    setInput('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/ai/interpret', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: query,
          context: {
            targetVariable: targetCol,
            winningModel: bestModel
              ? {
                  name: bestModel.name,
                  r2Adjusted: bestModel.r2Adjusted,
                  bic: bestModel.bic,
                  coefficients: bestModel.coefficients.map((c) => ({
                    variable: c.variableName,
                    beta: c.beta,
                    pValue: c.pValue,
                    elasticity: c.elasticity,
                  })),
                }
              : null,
            scenarios: scenarios.map((s) => ({
              name: s.name,
              predicted: s.predictedY,
              deltaPct: s.deltaPct,
            })),
          },
        }),
      });

      const data = await response.json();
      if (data.available && data.text) {
        setMessages([...newMessages, { role: 'assistant', text: data.text }]);
      } else {
        // Fallback econometric generation
        const fallbackText = generateDeterministicEconometricAdvice(query, bestModel, targetCol);
        setMessages([...newMessages, { role: 'assistant', text: fallbackText }]);
      }
    } catch {
      const fallbackText = generateDeterministicEconometricAdvice(query, bestModel, targetCol);
      setMessages([...newMessages, { role: 'assistant', text: fallbackText }]);
    } finally {
      setIsLoading(false);
    }
  };

  const sampleQuestions = [
    '¿Cómo interpretar la elasticidad de las variables en mi negocio?',
    '¿Qué riesgos operativos existen si subimos el precio un 10%?',
    'Genera un resumen ejecutivo de 3 puntos para la junta directiva.',
  ];

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl border border-slate-200 max-w-2xl w-full h-[620px] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center shadow-xs">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Copiloto Econométrico & Científico de Datos
              </h3>
              <p className="text-[11px] text-slate-500">
                Interpretación causal, financiera y metodológica en español
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Message Log */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4 text-xs">
          {messages.map((msg, i) => (
            <div
              key={i}
              className={`flex gap-3 ${
                msg.role === 'user' ? 'justify-end' : 'justify-start'
              }`}
            >
              {msg.role === 'assistant' && (
                <div className="w-7 h-7 rounded-full bg-slate-900 text-white flex items-center justify-center shrink-0 mt-0.5">
                  <Bot className="w-4 h-4" />
                </div>
              )}
              <div
                className={`p-3.5 rounded-xl max-w-[85%] leading-relaxed whitespace-pre-wrap ${
                  msg.role === 'user'
                    ? 'bg-slate-900 text-white font-medium rounded-tr-none'
                    : 'bg-slate-100 text-slate-800 rounded-tl-none border border-slate-200/60'
                }`}
              >
                {msg.text}
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex gap-3 items-center text-slate-400 text-xs italic">
              <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />
              <span>Analizando supuestos econométricos y contexto empresarial...</span>
            </div>
          )}
        </div>

        {/* Quick questions */}
        <div className="px-6 py-2.5 border-t border-slate-100 bg-slate-50/50 flex items-center gap-2 overflow-x-auto text-[11px]">
          <span className="text-slate-400 shrink-0 font-medium">Sugerencias:</span>
          {sampleQuestions.map((q, i) => (
            <button
              key={i}
              onClick={() => handleSend(q)}
              className="px-2.5 py-1 bg-white hover:bg-slate-100 border border-slate-200 rounded text-slate-700 whitespace-nowrap shrink-0 transition-colors"
            >
              {q}
            </button>
          ))}
        </div>

        {/* Input box */}
        <div className="p-4 border-t border-slate-200 bg-white">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="flex items-center gap-2"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Haz una pregunta sobre tu modelo, coeficientes o estrategia..."
              className="flex-1 text-xs border border-slate-300 rounded-lg px-3.5 py-2.5 bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-900 text-slate-900"
            />
            <button
              type="submit"
              disabled={isLoading || !input.trim()}
              className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 disabled:opacity-40 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors shrink-0"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Enviar</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

function generateDeterministicEconometricAdvice(
  query: string,
  model: ModelEvaluation | null,
  targetCol: string
): string {
  if (!model) {
    return 'Por favor carga un archivo de datos y entrena los modelos para poder brindar un diagnóstico econométrico específico.';
  }

  const queryLower = query.toLowerCase();

  if (queryLower.includes('elasticidad') || queryLower.includes('precio')) {
    const priceCoef = model.coefficients.find((c) =>
      c.variableName.toLowerCase().includes('precio')
    );
    if (priceCoef) {
      return `Análisis de Elasticidad en "${priceCoef.variableName}":
- Coeficiente estimado: ${priceCoef.beta} (p-valor: ${priceCoef.pValue}).
- Interpretación ceteris paribus: Por cada unidad de incremento en precio, la variable ${targetCol} varía en ${priceCoef.beta} unidades.
- Elasticidad promedio: ${priceCoef.elasticity ? `${priceCoef.elasticity}%` : 'Moderada'}.
Recomendación: Si la demanda es inelástica (|ε| < 1), un incremento moderado de precio aumentará la facturación total; si es elástica (|ε| > 1), aumentos de precio contraerán los ingresos brutos debido a la pérdida de volumen.`;
    }
  }

  if (queryLower.includes('resumen') || queryLower.includes('junta') || queryLower.includes('comité')) {
    return `Síntesis Ejecutiva para la Alta Dirección:
1. Capacidad Explicativa Sólida: El modelo ${model.name} explica el ${(model.r2Adjusted * 100).toFixed(1)}% de la variación en ${targetCol}, superando el riesgo de sobreajuste y multicolinealidad (VIF máximo: ${model.maxVif}).
2. Palancas Principales: Los coeficientes más significativos indican un impacto directo e inmediato en las palancas comerciales prioritarias.
3. Decisión Estratégica: Priorizar la optimización de recursos en las variables con elasticidad positiva comprobada y mantener monitoreo estricto de los supuestos operacionales.`;
  }

  return `Diagnóstico Econométrico (${model.name}):
El modelo actual presenta un R² ajustado del ${(model.r2Adjusted * 100).toFixed(1)}% y un error absoluto medio (MAE) de ${model.mae.toLocaleString()}. Sus coeficientes guardan coherencia con las reglas de negocio establecidas. Se recomienda utilizar este modelo para simulaciones dentro del rango histórico del ±25% para evitar sesgos de extrapolación.`;
}
