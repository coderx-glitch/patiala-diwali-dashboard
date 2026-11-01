import React, { useState, useEffect, useCallback } from 'react';
import { Header } from './components/Header';
import { DataPendingState } from './components/DataPendingState';
import { ForecastHero } from './components/ForecastHero';
import { ForecastChart } from './components/ForecastChart';
import { BacktestChart } from './components/BacktestChart';
import { PredictionTable } from './components/PredictionTable';
import { MethodologySection } from './components/MethodologySection';
import { MapTab } from './components/MapTab';
import { DiwaliSpecial } from './components/DiwaliSpecial';
import { NotificationOptIn } from './components/NotificationOptIn';
import { FileUploaderModal } from './components/FileUploaderModal';
import { PrintReport } from './components/PrintReport';
import { LanguageProvider, useLanguage } from './utils/i18n';
import LandingPage from './components/LandingPage';
import type { BacktestData, PredictionsData } from './types/airQuality';
import {
  fetchLiveBacktest,
  fetchLivePredictions,
  validateBacktest,
  validatePredictions,
} from './utils/dataLoader';
import { RefreshCw } from 'lucide-react';

type TabKey = 'forecast' | 'special' | 'graph' | 'daily' | 'method' | 'map';

const AppContent: React.FC = () => {
  const { t } = useLanguage();
  const [entered, setEntered] = useState<boolean>(() => {
    try {
      if (new URLSearchParams(window.location.search).get('enter') === '1') return true;
      return sessionStorage.getItem('dw_entered') === '1';
    } catch { return false; }
  });
  const handleEnter = () => {
    try { sessionStorage.setItem('dw_entered', '1'); } catch { /* private mode */ }
    setEntered(true);
  };
  const [predictions, setPredictions] = useState<PredictionsData | null>(null);
  const [backtest, setBacktest] = useState<BacktestData | null>(null);
  const [predictionsError, setPredictionsError] = useState<string | null>(null);
  const [backtestError, setBacktestError] = useState<string | null>(null);
  const [isPredictionsPending, setIsPredictionsPending] = useState<boolean>(true);
  const [isBacktestPending, setIsBacktestPending] = useState<boolean>(true);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const tabs: { id: TabKey; label: string }[] = [
    { id: 'forecast', label: t.tab_forecast },
    { id: 'special', label: t.tab_special },
    { id: 'graph', label: t.tab_graph },
    { id: 'daily', label: t.tab_daily },
    { id: 'method', label: t.tab_method },
    { id: 'map', label: t.tab_map },
  ];

  // Tab navigation state
  const [activeTab, setActiveTab] = useState<TabKey>(() => {
    if (typeof window !== 'undefined') {
      const paramTab = new URLSearchParams(window.location.search).get('tab');
      if (
        paramTab === 'special' ||
        paramTab === 'graph' ||
        paramTab === 'daily' ||
        paramTab === 'method' ||
        paramTab === 'map'
      ) {
        return paramTab;
      }
    }
    return 'forecast';
  });

  // Manual toggle for reviewing the Data Pending state
  const [forcePendingView, setForcePendingView] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      return params.get('pending') === 'true' || params.get('state') === 'pending';
    }
    return false;
  });

  // Modals
  const [isMethodologyOpen, setIsMethodologyOpen] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return new URLSearchParams(window.location.search).get('modal') === 'methodology';
    }
    return false;
  });
  const [isUploadOpen, setIsUploadOpen] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return new URLSearchParams(window.location.search).get('modal') === 'upload';
    }
    return false;
  });

  // Fetch live files from /data/
  const loadData = useCallback(async () => {
    setIsLoading(true);
    setPredictionsError(null);
    setBacktestError(null);

    const [predRes, backtestRes] = await Promise.all([
      fetchLivePredictions('/data/predictions.json'),
      fetchLiveBacktest('/data/backtest.json'),
    ]);

    setPredictions(predRes.data);
    setIsPredictionsPending(predRes.isPending);
    setPredictionsError(predRes.error);

    setBacktest(backtestRes.data);
    setIsBacktestPending(backtestRes.isPending);
    setBacktestError(backtestRes.error);

    setIsLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Drag and drop single file upload
  const handleFileUpload = async (file: File) => {
    try {
      const text = await file.text();
      const json = JSON.parse(text);

      const predVal = validatePredictions(json);
      if (predVal.valid && predVal.data) {
        setPredictions(predVal.data);
        setIsPredictionsPending(false);
        setPredictionsError(null);
        setForcePendingView(false);
        return;
      }

      const backtestVal = validateBacktest(json);
      if (backtestVal.valid && backtestVal.data) {
        setBacktest(backtestVal.data);
        setIsBacktestPending(false);
        setBacktestError(null);
        setForcePendingView(false);
        return;
      }

      alert(`File "${file.name}" does not match predictions.json or backtest.json schema.`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      alert(`Error reading ${file.name}: ${msg}`);
    }
  };

  // Apply custom data from modal
  const handleApplyCustomData = (
    newPred: PredictionsData | null,
    newBacktest: BacktestData | null
  ) => {
    if (newPred) {
      setPredictions(newPred);
      setIsPredictionsPending(false);
      setPredictionsError(null);
    }
    if (newBacktest) {
      setBacktest(newBacktest);
      setIsBacktestPending(false);
      setBacktestError(null);
    }
    setForcePendingView(false);
  };

  const isDataPending = forcePendingView || (!predictions && !isLoading);
  const stationDisplayName =
    predictions?.station || backtest?.station || 'Model Town, Patiala - PPCB (site_1437)';

  return (
    <div className="min-h-screen bg-[#faf8f5] text-stone-900 flex flex-col font-sans transition-colors">
      <div className="ambient-orb" style={{ top: '18%', left: '-6%', width: 340, height: 340, background: 'rgba(251, 191, 36, 0.16)' }} />
      <div className="ambient-orb" style={{ bottom: '8%', right: '-8%', width: 420, height: 420, background: 'rgba(56, 189, 248, 0.13)', animationDelay: '6s' }} />
      {/* 1. Single-Page Printable Report (Visible ONLY in print media) */}
      {predictions && (
        <PrintReport
          predictions={predictions.predictions}
          stationName={stationDisplayName}
          generatedAt={predictions.generated_at_ist}
        />
      )}

      {/* 2. Interactive App View (Hidden during print) */}
      {!entered ? (
        <LandingPage onEnter={handleEnter} />
      ) : (
      <div className="print:hidden flex flex-col min-h-screen">
        {/* Header */}
        <Header
          stationName={stationDisplayName}
          generatedFor={predictions?.generated_for}
          isPending={isDataPending}
          onTogglePending={() => setForcePendingView(!forcePendingView)}
          onOpenUpload={() => setIsUploadOpen(true)}
          onOpenMethodology={() => setIsMethodologyOpen(true)}
          onReload={loadData}
        />

        {/* Main Content Area */}
        <main className="flex-1 max-w-[1440px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
          {isLoading ? (
            <div className="py-24 flex flex-col items-center justify-center text-center">
              <RefreshCw className="w-8 h-8 text-amber-600 animate-spin mb-3" />
              <h3 className="text-base font-semibold text-stone-900 font-serif">
                Inspecting Data Repository...
              </h3>
              <p className="text-xs text-stone-500 mt-1">
                Checking public/data/predictions.json and public/data/backtest.json
              </p>
            </div>
          ) : isDataPending ? (
            <DataPendingState
              isPredictionsPending={isPredictionsPending || forcePendingView}
              isBacktestPending={isBacktestPending || forcePendingView}
              predictionsError={predictionsError}
              backtestError={backtestError}
              onReload={loadData}
              onFileUpload={handleFileUpload}
            />
          ) : (
            <div className="space-y-6">
              {/* Push notification opt-in */}
              <NotificationOptIn />

              {/* Tab Navigation Pill Bar */}
              <div className="flex items-center justify-between border-b border-stone-200/80 pb-3">
                <nav
                  className="flex items-center gap-1.5 p-1 rounded-xl bg-stone-200/60 border border-stone-200/80 max-w-full overflow-x-auto scrollbar-none"
                  aria-label="Dashboard views"
                >
                  {tabs.map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`px-4 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer whitespace-nowrap ${
                        activeTab === tab.id
                          ? 'bg-white text-stone-900 shadow-xs font-semibold'
                          : 'text-stone-600 hover:text-stone-900 hover:bg-stone-200/40'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </nav>

                <div className="hidden sm:flex items-center gap-2 text-[11px] text-stone-500 font-mono">
                  <span>Model Town, Patiala</span>
                  <span>•</span>
                  <span>site_1437</span>
                </div>
              </div>

              {/* Tab 1: Forecast (Default) */}
              {activeTab === 'forecast' && predictions && (
                <ForecastHero
                  predictionsData={predictions}
                  backtestData={backtest}
                />
              )}

              {/* Diwali Special */}
              {activeTab === 'special' && <DiwaliSpecial />}

              {/* Tab 2: Graph */}
              {activeTab === 'graph' && predictions && (
                <ForecastChart data={predictions} />
              )}

              {/* Tab 3: Daily list */}
              {activeTab === 'daily' && predictions && (
                <PredictionTable data={predictions} />
              )}

              {/* Tab 5: Map */}
              {activeTab === 'map' && <MapTab />}

              {/* Tab 4: Model & Method */}
              {activeTab === 'method' && (
                <div className="space-y-6">
                  {backtest && <BacktestChart data={backtest} />}
                  <MethodologySection />
                </div>
              )}
            </div>
          )}
        </main>

        {/* Footer */}
        <footer className="border-t border-stone-200/90 bg-[#faf8f5]/90 py-6 text-xs text-stone-500 transition-colors">
          <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-600"></div>
              <span>
                Model Town, Patiala (CPCB CAAQMS site_1437) • Diwali Air Quality Prediction
              </span>
            </div>
            <div className="flex items-center gap-4 text-stone-500">
              <span>Units: Daily Mean PM2.5 (µg/m³)</span>
              <span>•</span>
              <span>Station-Level Only</span>
              <span>•</span>
              <span>Local Git Verified</span>
            </div>
          </div>
        </footer>

        {/* Modals */}
        <MethodologySection
          isOpenModal={isMethodologyOpen}
          onCloseModal={() => setIsMethodologyOpen(false)}
        />

        <FileUploaderModal
          isOpen={isUploadOpen}
          onClose={() => setIsUploadOpen(false)}
          onApplyData={handleApplyCustomData}
          currentPredictions={predictions}
          currentBacktest={backtest}
        />
      </div>
      )}
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <LanguageProvider>
      <AppContent />
    </LanguageProvider>
  );
};

export default App;
