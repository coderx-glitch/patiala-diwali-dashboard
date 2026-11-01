import React from 'react';
import { FileText, UploadCloud, RefreshCw, EyeOff, BarChart3, Printer } from 'lucide-react';
import { useLanguage } from '../utils/i18n';

interface HeaderProps {
  stationName: string;
  generatedFor?: string;
  isPending: boolean;
  onTogglePending: () => void;
  onOpenUpload: () => void;
  onOpenMethodology: () => void;
  onReload: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  stationName,
  generatedFor,
  isPending,
  onTogglePending,
  onOpenUpload,
  onOpenMethodology,
  onReload,
}) => {
  const { language, setLanguage, t } = useLanguage();

  const handlePrint = () => {
    window.print();
  };

  return (
    <header className="relative border-b border-stone-200/90 bg-[#faf8f5]/90 backdrop-blur sticky top-0 z-40 transition-colors print:hidden">
      <div className="festive-ribbon" />
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 pt-4 pb-4">
        {/* Eyebrow line */}
        <div className="text-[10px] uppercase tracking-widest text-stone-500 font-semibold mb-1 font-mono">
          DATA: CPCB CAAQMS (PPCB STATION) VIA XKDR, CC-BY 4.0
        </div>

        {/* Title & Station Badge */}
        <div className="flex flex-col md:flex-row md:items-baseline md:justify-between gap-3">
          <div>
            <h1 className="font-serif text-2xl sm:text-3.5xl font-bold tracking-tight leading-tight bg-gradient-to-r from-orange-800 via-amber-700 to-orange-800 bg-clip-text text-transparent">
              {t.title}
            </h1>
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-stone-600 mt-1">
              <span className="font-medium text-stone-800">{stationName}</span>
              <span>|</span>
              <span className="text-stone-700">{generatedFor || 'Diwali 2026 (Nov 8)'}</span>
              <span>|</span>
              <span className="font-mono text-stone-600">PM2.5 µg/m³</span>
            </div>
          </div>

          {/* Right side: Station Pill & Action Controls */}
          <div className="flex flex-wrap items-center gap-2 self-start md:self-auto">
            {/* Language toggle */}
            <div className="inline-flex items-center rounded-md border border-stone-300 bg-white p-0.5 shadow-xs text-xs font-mono">
              <button
                type="button"
                onClick={() => setLanguage('en')}
                className={`px-2 py-0.5 rounded transition ${
                  language === 'en'
                    ? 'bg-amber-600 text-white font-bold'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
                title="Switch to English"
              >
                EN
              </button>
              <button
                type="button"
                onClick={() => setLanguage('hi')}
                className={`px-2 py-0.5 rounded transition ${
                  language === 'hi'
                    ? 'bg-amber-600 text-white font-bold'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
                title="हिंदी में बदलें"
              >
                HI
              </button>
            </div>

            <span className="pill-premium inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold tracking-wider uppercase text-amber-900 font-mono">
              STATION-LEVEL · SITE_1437
            </span>

            <div className="flex items-center gap-1.5 ml-1">
              {/* Print Report Button */}
              <button
                onClick={handlePrint}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium text-stone-700 hover:text-stone-900 bg-white hover:bg-stone-50 border border-stone-200 shadow-xs transition cursor-pointer"
                title="Print single-page PDF report"
              >
                <Printer className="w-3.5 h-3.5 text-amber-700" />
                <span className="hidden sm:inline">{t.btn_print_report}</span>
              </button>

              <button
                onClick={onOpenMethodology}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium text-stone-700 hover:text-stone-900 bg-white hover:bg-stone-50 border border-stone-200 shadow-xs transition cursor-pointer"
                title="View Methodology, Source Dates, and Limitations"
              >
                <FileText className="w-3.5 h-3.5 text-amber-700" />
                <span className="hidden sm:inline">{t.btn_methodology}</span>
              </button>

              <button
                onClick={onOpenUpload}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium text-stone-700 hover:text-stone-900 bg-white hover:bg-stone-50 border border-stone-200 shadow-xs transition cursor-pointer"
                title="Upload custom predictions.json or backtest.json"
              >
                <UploadCloud className="w-3.5 h-3.5 text-amber-700" />
                <span className="hidden sm:inline">Ingest JSON</span>
              </button>

              <button
                onClick={onTogglePending}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium border shadow-xs transition cursor-pointer ${
                  isPending
                    ? 'bg-amber-100 text-amber-900 border-amber-300 hover:bg-amber-200'
                    : 'bg-white text-stone-700 border-stone-200 hover:bg-stone-50'
                }`}
                title="Toggle between Data-Pending state and Dashboard view"
              >
                {isPending ? (
                  <>
                    <BarChart3 className="w-3.5 h-3.5 text-emerald-700" />
                    <span>Show Forecast</span>
                  </>
                ) : (
                  <>
                    <EyeOff className="w-3.5 h-3.5 text-amber-700" />
                    <span className="hidden sm:inline">Test Pending</span>
                  </>
                )}
              </button>

              <button
                onClick={onReload}
                className="p-1 rounded-md text-stone-600 hover:text-stone-900 bg-white hover:bg-stone-50 border border-stone-200 shadow-xs transition cursor-pointer"
                title="Reload live data from public/data/"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Saffron Accent Bar & Station-Level Truth Banner */}
        <div className="mt-2.5 pt-2 border-t border-stone-200/80 flex flex-wrap items-center justify-between text-[11px] text-stone-600 gap-2">
          <div className="flex items-center gap-2">
            <span className="w-1 h-3.5 bg-amber-600 rounded-xs shrink-0"></span>
            <span>
              <strong className="text-stone-800 font-medium">Station-level truth:</strong> single CPCB monitoring station (Model Town, Patiala). Results are station-level, not neighbourhood-exact.
            </span>
          </div>
          <div className="text-stone-500 font-mono text-[10px]">
            CPCB 24-hr standard: <span className="text-amber-800 font-bold">60 µg/m³</span> | WHO 24-hr guideline: <span className="text-emerald-800 font-bold">15 µg/m³</span>
          </div>
        </div>
      </div>
    </header>
  );
};
