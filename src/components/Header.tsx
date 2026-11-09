import React from 'react';
import { Sparkles, FileSpreadsheet } from 'lucide-react';

interface HeaderProps {
  activeTab: string;
  onSelectTab: (tabId: string) => void;
  onOpenAICopilot: () => void;
  datasetLoaded: boolean;
  modelReady: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  onSelectTab,
  onOpenAICopilot,
  datasetLoaded,
  modelReady,
}) => {
  const navTabs = [
    { id: 'data', label: '1. Datos & Calidad', enabled: true },
    { id: 'variables', label: '2. Clasificación', enabled: datasetLoaded },
    { id: 'eda', label: '3. Exploratorio', enabled: datasetLoaded },
    { id: 'rules', label: '4. Reglas de Negocio', enabled: datasetLoaded },
    { id: 'models', label: '5. Modelos & Selección', enabled: datasetLoaded },
    { id: 'formula', label: '6. Fórmula & Coeficientes', enabled: modelReady },
    { id: 'scenarios', label: '7. Simulación Escenarios', enabled: modelReady },
    { id: 'report', label: '8. Informe Ejecutivo', enabled: modelReady },
  ];

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-8 h-16">
          {/* Zone 1: Brand wordmark (Single line, text only) */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="w-8 h-8 rounded-lg bg-slate-900 text-white flex items-center justify-center font-bold text-sm tracking-tight">
              R
            </div>
            <a
              href="#"
              onClick={(e) => {
                e.preventDefault();
                onSelectTab('data');
              }}
              className="text-lg font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0 hover:text-slate-700 transition-colors"
            >
              Regressio Business AI
            </a>
          </div>

          {/* Zone 2: Navigation Links / Process Flow */}
          <nav className="hidden lg:flex items-center gap-1 overflow-x-auto py-2 text-xs font-medium text-slate-600">
            {navTabs.map((tab) => {
              const isActive = activeTab === tab.id;
              const isDisabled = !tab.enabled;

              return (
                <button
                  key={tab.id}
                  onClick={() => !isDisabled && onSelectTab(tab.id)}
                  disabled={isDisabled}
                  className={`px-3 py-1.5 rounded-md whitespace-nowrap shrink-0 transition-colors ${
                    isActive
                      ? 'bg-slate-900 text-white font-semibold'
                      : isDisabled
                      ? 'text-slate-300 cursor-not-allowed'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </nav>

          {/* Zone 3: Primary Action */}
          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={onOpenAICopilot}
              className="inline-flex items-center gap-2 px-3.5 py-1.5 text-xs font-medium text-slate-900 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-lg transition-colors whitespace-nowrap shrink-0"
            >
              <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
              <span>Copiloto Econométrico</span>
            </button>
          </div>
        </div>

        {/* Mobile / Tablet scrollable navigation */}
        <div className="flex lg:hidden overflow-x-auto py-2 gap-1 border-t border-slate-100">
          {navTabs.map((tab) => {
            const isActive = activeTab === tab.id;
            const isDisabled = !tab.enabled;
            return (
              <button
                key={tab.id}
                onClick={() => !isDisabled && onSelectTab(tab.id)}
                disabled={isDisabled}
                className={`px-2.5 py-1 text-xs rounded whitespace-nowrap shrink-0 transition-colors ${
                  isActive
                    ? 'bg-slate-900 text-white font-semibold'
                    : isDisabled
                    ? 'text-slate-300 cursor-not-allowed'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>
    </header>
  );
};
