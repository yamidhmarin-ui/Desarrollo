import React, { useState, useEffect, useMemo } from 'react';
import { Header } from './components/Header';
import { DataUploadModule } from './components/DataUploadModule';
import { VariableClassificationModule } from './components/VariableClassificationModule';
import { ExploratoryAnalysisModule } from './components/ExploratoryAnalysisModule';
import { BusinessRulesModule } from './components/BusinessRulesModule';
import { ModelComparisonModule } from './components/ModelComparisonModule';
import { EquationInterpretationModule } from './components/EquationInterpretationModule';
import { ScenarioSimulationModule } from './components/ScenarioSimulationModule';
import { ExecutiveReportModule } from './components/ExecutiveReportModule';
import { AICopilotModal } from './components/AICopilotModal';

import {
  ColumnProfile,
  DataQualityReport,
  BusinessRule,
  ModelEvaluation,
  ScenarioDefinition,
  StrategicRecommendation,
  VariableType,
} from './types';
import {
  profileDataset,
  imputeDataset,
  buildOneHotEncodedDataset,
} from './utils/dataProcessor';
import { inferBusinessRules } from './utils/businessRulesEngine';
import { trainAndEvaluateModels } from './utils/modelFactory';
import {
  generateStandardScenarios,
  generateStrategicRecommendations,
} from './utils/scenarioEngine';
import { SAMPLE_DATASETS } from './utils/sampleDatasets';

export default function App() {
  const [data, setData] = useState<Record<string, any>[]>([]);
  const [rawFilename, setRawFilename] = useState<string | null>(null);
  const [sheetNames, setSheetNames] = useState<string[]>(['Datos']);
  const [currentSheet, setCurrentSheet] = useState<string>('Datos');
  const [allSheetsData, setAllSheetsData] = useState<Record<string, Record<string, any>[]>>({});

  const [profiles, setProfiles] = useState<ColumnProfile[]>([]);
  const [quality, setQuality] = useState<DataQualityReport>({
    totalRows: 0,
    totalCols: 0,
    duplicateRows: 0,
    totalMissingCells: 0,
    overallMissingPct: 0,
    columnsWithMissing: [],
    columnsWithOutliers: [],
    inconsistenciesDetected: [],
    imputationLog: [],
  });

  const [businessRules, setBusinessRules] = useState<BusinessRule[]>([]);
  const [targetCol, setTargetCol] = useState<string>('');
  const [selectedFeatures, setSelectedFeatures] = useState<string[]>([]);

  const [models, setModels] = useState<ModelEvaluation[]>([]);
  const [bestModelId, setBestModelId] = useState<string>('');
  const [selectionRationale, setSelectionRationale] = useState<string>('');
  const [isTraining, setIsTraining] = useState(false);

  const [scenarios, setScenarios] = useState<ScenarioDefinition[]>([]);
  const [activeScenarioId, setActiveScenarioId] = useState<string>('scenario_base');
  const [recommendations, setRecommendations] = useState<StrategicRecommendation[]>([]);

  const [activeTab, setActiveTab] = useState<string>('data');
  const [isAICopilotOpen, setIsAICopilotOpen] = useState(false);

  // Initialize with preloaded sample dataset on first load
  useEffect(() => {
    const sample = SAMPLE_DATASETS[0];
    handleProcessLoadedData(sample.data, `${sample.title}.xlsx`, sample.suggestedTarget);
  }, []);

  const handleProcessLoadedData = (
    rawRows: Record<string, any>[],
    filename: string,
    forcedTarget?: string,
    allSheetsMap?: Record<string, any[]>,
    availableSheets?: string[]
  ) => {
    if (!rawRows || rawRows.length === 0) return;

    setRawFilename(filename);
    if (availableSheets && availableSheets.length > 0) {
      setSheetNames(availableSheets);
      setCurrentSheet(availableSheets[0]);
    } else {
      setSheetNames(['Datos']);
      setCurrentSheet('Datos');
    }

    if (allSheetsMap) {
      setAllSheetsData(allSheetsMap);
    } else {
      setAllSheetsData({ Datos: rawRows });
    }

    const { profiles: initialProfiles, quality: initialQuality } = profileDataset(rawRows);
    setData(rawRows);
    setProfiles(initialProfiles);
    setQuality(initialQuality);

    // Pick target: forcedTarget or continuous numeric with business KPI name
    let chosenTarget = forcedTarget || '';
    if (!chosenTarget) {
      const candidates = initialProfiles.filter(
        (p) =>
          (p.type === 'numeric_continuous' || p.type === 'numeric_discrete') &&
          !p.isIdentifier
      );
      const kpiMatch = candidates.find((p) => {
        const name = p.name.toLowerCase();
        return (
          name.includes('unidad') ||
          name.includes('venta') ||
          name.includes('ingreso') ||
          name.includes('mrr') ||
          name.includes('demanda') ||
          name.includes('costo') ||
          name.includes('utilidad') ||
          name.includes('margen') ||
          name.includes('precio') ||
          name.includes('target') ||
          name.includes('output') ||
          name.includes('resultado') ||
          name === 'y'
        );
      });
      chosenTarget =
        kpiMatch?.name ||
        candidates[candidates.length - 1]?.name ||
        initialProfiles.find((p) => p.type === 'numeric_continuous' || p.type === 'numeric_discrete')?.name ||
        initialProfiles[initialProfiles.length - 1]?.name ||
        '';
    }
    setTargetCol(chosenTarget);

    // Candidate predictors
    let features = initialProfiles
      .filter((p) => p.name !== chosenTarget && !p.isIdentifier && p.type !== 'irrelevant')
      .map((p) => p.name);
    if (features.length === 0 && initialProfiles.length > 1) {
      // Fallback: take all remaining columns
      features = initialProfiles.filter((p) => p.name !== chosenTarget).map((p) => p.name);
    }
    setSelectedFeatures(features);

    // Infer rules
    const rules = inferBusinessRules(initialProfiles, chosenTarget);
    setBusinessRules(rules);

    // Run model training & scenarios
    executeTrainingPipeline(rawRows, initialProfiles, chosenTarget, features, rules);
  };

  const executeTrainingPipeline = (
    currentData: Record<string, any>[],
    currentProfiles: ColumnProfile[],
    target: string,
    features: string[],
    rules: BusinessRule[]
  ) => {
    if (!target || features.length === 0 || currentData.length < 5) return;
    setIsTraining(true);

    try {
      // 1. One-hot encoding
      const { encodedData, featureNames, dummyMap } = buildOneHotEncodedDataset(
        currentData,
        currentProfiles,
        features,
        target
      );

      // 2. Train models
      const {
        models: trainedModels,
        bestModelId: winnerId,
        selectionRationale: rationale,
      } = trainAndEvaluateModels({
        encodedData,
        featureNames,
        targetName: target,
        dummyMap,
        businessRules: rules,
      });

      setModels(trainedModels);
      setBestModelId(winnerId);
      setSelectionRationale(rationale);

      const winningModel = trainedModels.find((m) => m.id === winnerId) || trainedModels[0];

      // 3. Compute feature means, mins, maxs
      const means: Record<string, number> = {};
      const mins: Record<string, number> = {};
      const maxs: Record<string, number> = {};

      for (const f of winningModel.features) {
        const vals = encodedData.map((row) => row[f]);
        const sum = vals.reduce((a, b) => a + b, 0);
        means[f] = vals.length > 0 ? Number((sum / vals.length).toFixed(2)) : 0;
        mins[f] = vals.length > 0 ? Math.min(...vals) : 0;
        maxs[f] = vals.length > 0 ? Math.max(...vals) : 1000;
      }

      // 4. Scenarios
      const standardScenarios = generateStandardScenarios({
        model: winningModel,
        featureMeans: means,
        featureMins: mins,
        featureMaxs: maxs,
        businessRules: rules,
        targetName: target,
      });
      setScenarios(standardScenarios);

      // 5. Strategic Recommendations
      const baseSc = standardScenarios[0];
      const allRecs: StrategicRecommendation[] = [];
      for (const sc of standardScenarios) {
        const recs = generateStrategicRecommendations({
          scenario: sc,
          baseScenario: baseSc,
          model: winningModel,
          businessRules: rules,
          targetName: target,
        });
        allRecs.push(...recs);
      }
      setRecommendations(allRecs);
    } catch (err) {
      console.error('Error during model training pipeline:', err);
    } finally {
      setIsTraining(false);
    }
  };

  // Sheet switcher handler
  const handleSelectSheet = (sheetName: string) => {
    setCurrentSheet(sheetName);
    const sheetRows = allSheetsData[sheetName];
    if (sheetRows && sheetRows.length > 0) {
      const { profiles: newProfiles, quality: newQuality } = profileDataset(sheetRows);
      setData(sheetRows);
      setProfiles(newProfiles);
      setQuality(newQuality);

      // Recalculate target
      const candidates = newProfiles.filter(
        (p) => (p.type === 'numeric_continuous' || p.type === 'numeric_discrete') && !p.isIdentifier
      );
      const newTarget = candidates[candidates.length - 1]?.name || '';
      setTargetCol(newTarget);

      const features = newProfiles
        .filter((p) => p.name !== newTarget && !p.isIdentifier && p.type !== 'irrelevant')
        .map((p) => p.name);
      setSelectedFeatures(features);

      const rules = inferBusinessRules(newProfiles, newTarget);
      setBusinessRules(rules);

      executeTrainingPipeline(sheetRows, newProfiles, newTarget, features, rules);
    }
  };

  // Impute dataset handler
  const handleImputeData = () => {
    const { imputedData, imputationLog } = imputeDataset(data, profiles, targetCol);
    const { profiles: newProfiles, quality: newQuality } = profileDataset(imputedData);
    newQuality.imputationLog = imputationLog;
    setData(imputedData);
    setProfiles(newProfiles);
    setQuality(newQuality);
    executeTrainingPipeline(imputedData, newProfiles, targetCol, selectedFeatures, businessRules);
  };

  // Remove duplicates handler
  const handleRemoveDuplicates = () => {
    const rowSignatures = new Set<string>();
    const uniqueRows: Record<string, any>[] = [];

    for (const row of data) {
      const sig = JSON.stringify(row);
      if (!rowSignatures.has(sig)) {
        rowSignatures.add(sig);
        uniqueRows.push(row);
      }
    }

    const { profiles: newProfiles, quality: newQuality } = profileDataset(uniqueRows);
    setData(uniqueRows);
    setProfiles(newProfiles);
    setQuality(newQuality);
    executeTrainingPipeline(uniqueRows, newProfiles, targetCol, selectedFeatures, businessRules);
  };

  // Update variable type
  const handleUpdateVariableType = (colName: string, newType: VariableType) => {
    const updated = profiles.map((p) =>
      p.name === colName ? { ...p, type: newType } : p
    );
    setProfiles(updated);
  };

  // Update business rule
  const handleUpdateRule = (updatedRule: BusinessRule) => {
    const updated = businessRules.map((r) =>
      r.id === updatedRule.id ? updatedRule : r
    );
    setBusinessRules(updated);
  };

  const handleAddRule = (newRule: BusinessRule) => {
    setBusinessRules([...businessRules, newRule]);
  };

  const handleDeleteRule = (ruleId: string) => {
    setBusinessRules(businessRules.filter((r) => r.id !== ruleId));
  };

  // Select Target Y
  const handleSelectTarget = (newTarget: string) => {
    setTargetCol(newTarget);
    const newFeatures = selectedFeatures.filter((f) => f !== newTarget);
    setSelectedFeatures(newFeatures);
    const newRules = inferBusinessRules(profiles, newTarget);
    setBusinessRules(newRules);
    executeTrainingPipeline(data, profiles, newTarget, newFeatures, newRules);
  };

  // Toggle Feature X
  const handleToggleFeature = (feat: string) => {
    const updated = selectedFeatures.includes(feat)
      ? selectedFeatures.filter((f) => f !== feat)
      : [...selectedFeatures, feat];
    setSelectedFeatures(updated);
    executeTrainingPipeline(data, profiles, targetCol, updated, businessRules);
  };

  // Update Custom Scenario inputs
  const handleUpdateCustomScenario = (inputs: Record<string, number>) => {
    const winningModel = models.find((m) => m.id === bestModelId) || models[0];
    if (!winningModel) return;

    const baseSc = scenarios.find((s) => s.id === 'scenario_base') || scenarios[0];
    const pred = winningModel.predict(inputs);
    const diffAbs = pred - baseSc.predictedY;
    const diffPct = baseSc.predictedY !== 0 ? (diffAbs / baseSc.predictedY) * 100 : 0;

    const customIndex = scenarios.findIndex((s) => s.id === 'scenario_custom');
    const customSc: ScenarioDefinition = {
      id: 'scenario_custom',
      name: 'Escenario Personalizado',
      description: 'Ajuste manual interactivo de las variables independientes.',
      badge: 'Interactivo',
      color: 'indigo',
      variableDeltas: {},
      customInputs: inputs,
      predictedY: Number(pred.toFixed(2)),
      deltaAbsolute: Number(diffAbs.toFixed(2)),
      deltaPct: Number(diffPct.toFixed(2)),
    };

    if (customIndex >= 0) {
      const updated = [...scenarios];
      updated[customIndex] = customSc;
      setScenarios(updated);
    } else {
      setScenarios([...scenarios, customSc]);
    }
  };

  // Calculate means, mins, maxs for current winning model
  const winningModel = useMemo(() => {
    return models.find((m) => m.id === bestModelId) || models[0] || null;
  }, [models, bestModelId]);

  const featureMeans = useMemo(() => {
    const map: Record<string, number> = {};
    if (!winningModel) return map;
    for (const f of winningModel.features) {
      const prof = profiles.find((p) => p.name === f);
      map[f] = prof?.mean ?? 0;
    }
    return map;
  }, [winningModel, profiles]);

  const featureMins = useMemo(() => {
    const map: Record<string, number> = {};
    if (!winningModel) return map;
    for (const f of winningModel.features) {
      const prof = profiles.find((p) => p.name === f);
      map[f] = prof?.min ?? 0;
    }
    return map;
  }, [winningModel, profiles]);

  const featureMaxs = useMemo(() => {
    const map: Record<string, number> = {};
    if (!winningModel) return map;
    for (const f of winningModel.features) {
      const prof = profiles.find((p) => p.name === f);
      map[f] = prof?.max ?? 1000;
    }
    return map;
  }, [winningModel, profiles]);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col selection:bg-indigo-500 selection:text-white">
      {/* 3-Zone Header Contract */}
      <Header
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        onOpenAICopilot={() => setIsAICopilotOpen(true)}
        datasetLoaded={data.length > 0}
        modelReady={models.length > 0}
      />

      {/* Main Content Workspace */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'data' && (
          <DataUploadModule
            onDataLoaded={(loadedData, fname, allSheetsMap, availableSheets) =>
              handleProcessLoadedData(loadedData, fname, undefined, allSheetsMap, availableSheets)
            }
            onImputeData={handleImputeData}
            rawFilename={rawFilename}
            sheetNames={sheetNames}
            currentSheet={currentSheet}
            onSelectSheet={handleSelectSheet}
            data={data}
            profiles={profiles}
            quality={quality}
            onRemoveDuplicates={handleRemoveDuplicates}
            onNextStep={() => setActiveTab('variables')}
          />
        )}

        {activeTab === 'variables' && (
          <VariableClassificationModule
            profiles={profiles}
            onUpdateVariableType={handleUpdateVariableType}
            onNextStep={() => setActiveTab('eda')}
          />
        )}

        {activeTab === 'eda' && (
          <ExploratoryAnalysisModule
            data={data}
            profiles={profiles}
            onNextStep={() => setActiveTab('rules')}
          />
        )}

        {activeTab === 'rules' && (
          <BusinessRulesModule
            businessRules={businessRules}
            onUpdateRule={handleUpdateRule}
            onAddRule={handleAddRule}
            onDeleteRule={handleDeleteRule}
            targetCol={targetCol}
            profiles={profiles}
            onNextStep={() => setActiveTab('models')}
          />
        )}

        {activeTab === 'models' && (
          <ModelComparisonModule
            profiles={profiles}
            targetCol={targetCol}
            onSelectTarget={handleSelectTarget}
            selectedFeatures={selectedFeatures}
            onToggleFeature={handleToggleFeature}
            models={models}
            bestModelId={bestModelId}
            selectionRationale={selectionRationale}
            onTrainModels={() =>
              executeTrainingPipeline(data, profiles, targetCol, selectedFeatures, businessRules)
            }
            onNextStep={() => setActiveTab('formula')}
            isTraining={isTraining}
          />
        )}

        {activeTab === 'formula' && winningModel && (
          <EquationInterpretationModule
            model={winningModel}
            targetName={targetCol}
            onNextStep={() => setActiveTab('scenarios')}
          />
        )}

        {activeTab === 'scenarios' && winningModel && (
          <ScenarioSimulationModule
            scenarios={scenarios}
            activeScenarioId={activeScenarioId}
            onSelectScenario={setActiveScenarioId}
            onUpdateCustomScenario={handleUpdateCustomScenario}
            model={winningModel}
            businessRules={businessRules}
            targetName={targetCol}
            featureMeans={featureMeans}
            featureMins={featureMins}
            featureMaxs={featureMaxs}
            onNextStep={() => setActiveTab('report')}
          />
        )}

        {activeTab === 'report' && winningModel && (
          <ExecutiveReportModule
            data={data}
            profiles={profiles}
            quality={quality}
            businessRules={businessRules}
            targetCol={targetCol}
            selectedFeatures={selectedFeatures}
            models={models}
            bestModel={winningModel}
            selectionRationale={selectionRationale}
            scenarios={scenarios}
            recommendations={recommendations}
            rawFilename={rawFilename}
          />
        )}
      </main>

      {/* AI Copilot Drawer / Modal */}
      <AICopilotModal
        isOpen={isAICopilotOpen}
        onClose={() => setIsAICopilotOpen(false)}
        targetCol={targetCol}
        bestModel={winningModel}
        scenarios={scenarios}
      />

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-6 mt-12 print:hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-3">
          <p>© 2026 Regressio Business AI · Plataforma de Modelamiento Econométrico & Toma de Decisiones</p>
          <div className="flex items-center gap-4">
            <span>Rigor Estadístico</span>
            <span aria-hidden="true">·</span>
            <span>Interpretación Causal Ceteris Paribus</span>
            <span aria-hidden="true">·</span>
            <span>Simulación Monte Carlo</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
