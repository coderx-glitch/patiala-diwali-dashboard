import React from 'react';
import { ArrowRight, CloudSun, Wind, LineChart } from 'lucide-react';
import { useLanguage } from '../utils/i18n';

interface Props { onEnter: () => void }

const LandingPage: React.FC<Props> = ({ onEnter }) => {
  const { t, language, setLanguage } = useLanguage();
  return (
    <div className="landing-sky relative min-h-screen overflow-hidden flex flex-col print:hidden">
      {/* clouds */}
      <div className="cloud" style={{ top: '12%', left: '6%', width: 220, height: 64 }} />
      <div className="cloud" style={{ top: '22%', right: '10%', width: 300, height: 78, animationDelay: '2s' }} />
      <div className="cloud" style={{ top: '46%', left: '14%', width: 170, height: 50, animationDelay: '4s', opacity: 0.7 }} />
      {/* sun */}
      <div className="absolute rounded-full" style={{ top: '7%', right: '14%', width: 110, height: 110,
        background: 'radial-gradient(circle, rgba(253,224,71,0.9) 0%, rgba(251,191,36,0.35) 55%, transparent 72%)', filter: 'blur(2px)' }} />

      {/* top bar */}
      <div className="relative z-10 max-w-[1440px] w-full mx-auto px-5 sm:px-8 pt-5 flex items-center justify-between">
        <div className="text-[10px] uppercase tracking-widest text-stone-500 font-semibold font-mono">{t.landing_eyebrow}</div>
        <div className="inline-flex items-center rounded-md border border-stone-300/80 bg-white/80 p-0.5 shadow-xs text-xs font-mono">
          <button type="button" onClick={() => setLanguage('en')}
            className={`px-2 py-0.5 rounded transition ${language === 'en' ? 'bg-amber-600 text-white font-bold' : 'text-stone-600 hover:text-stone-900'}`}>EN</button>
          <button type="button" onClick={() => setLanguage('hi')}
            className={`px-2 py-0.5 rounded transition ${language === 'hi' ? 'bg-amber-600 text-white font-bold' : 'text-stone-600 hover:text-stone-900'}`}>HI</button>
        </div>
      </div>

      {/* hero */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center text-center px-5 py-10">
        <div className="fade-up fade-up-1 inline-flex items-center gap-1.5 pill-premium px-3 py-1 rounded-full text-[11px] font-semibold tracking-wider text-amber-900 font-mono mb-5">
          <CloudSun className="w-3.5 h-3.5" /> {t.station_name || 'Model Town, Patiala - PPCB'}
        </div>
        <h1 className="fade-up fade-up-2 font-serif font-bold tracking-tight text-stone-900 leading-[1.05] text-4xl sm:text-6xl max-w-3xl">
          {t.title}
        </h1>
        <p className="fade-up fade-up-3 mt-4 max-w-xl text-sm sm:text-base text-stone-600 leading-relaxed">
          {t.landing_tagline}
        </p>

        <div className="fade-up fade-up-3 mt-6 flex flex-wrap items-center justify-center gap-2 text-xs">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/85 border border-stone-200 px-3 py-1.5 text-stone-700 shadow-xs"><Wind className="w-3.5 h-3.5 text-sky-600" />{t.landing_stat1}</span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/85 border border-stone-200 px-3 py-1.5 text-stone-700 shadow-xs"><LineChart className="w-3.5 h-3.5 text-orange-700" />{t.landing_stat2}</span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/85 border border-stone-200 px-3 py-1.5 text-stone-700 shadow-xs">{t.landing_stat3}</span>
        </div>

        <button onClick={onEnter}
          className="fade-up fade-up-4 group mt-9 inline-flex items-center gap-2.5 rounded-full px-8 py-3.5 text-base font-bold text-white shadow-lg transition-transform hover:scale-[1.03] active:scale-[0.98]"
          style={{ background: 'linear-gradient(135deg, #c2410c 0%, #ea580c 55%, #f59e0b 100%)', boxShadow: '0 10px 26px -8px rgba(194,65,12,0.55)' }}>
          {t.landing_cta}
          <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-0.5" />
        </button>
      </div>

      <div className="relative z-10 pb-5 text-center text-[11px] text-stone-500 font-mono">{t.landing_footer}</div>
    </div>
  );
};

export default LandingPage;
