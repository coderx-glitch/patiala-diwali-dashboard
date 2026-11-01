import React, { useState, useEffect } from 'react';
import { Bell, BellOff, Clock, CheckCircle2, AlertCircle, Loader2, RefreshCw } from 'lucide-react';
import {
  isPushSupported,
  subscribeToPush,
  checkServerStatus,
  getExistingSubscription,
  getForecastRange,
  unsubscribeFromPush,
  getServerConfig,
  saveAlertSettings,
  type ForecastRange,
} from '../utils/pushNotifications';
import { useLanguage } from '../utils/i18n';

interface NotificationOptInProps {
  className?: string;
  initialRange?: ForecastRange | null;
}

type NotificationState = 'loading' | 'unsupported' | 'idle' | 'pending' | 'active' | 'denied';

// The 5 supported daily delivery windows (Asia/Kolkata). Backed by daily Vercel cron entries
// at UTC hours 0/1/3/13/15; Hobby cron fires within the UTC hour, landing in these IST half-hour windows.
const ALERT_WINDOWS: { utc: number; label: string }[] = [
  { utc: 0, label: 'Subah 5:30-6:29 AM' },
  { utc: 1, label: 'Subah 6:30-7:29 AM' },
  { utc: 3, label: 'Subah 8:30-9:29 AM' },
  { utc: 13, label: 'Shaam 6:30-7:29 PM' },
  { utc: 15, label: 'Raat 8:30-9:29 PM' },
];

const THRESHOLD_OPTIONS = [
  { val: null, label: 'Any level (default)' },
  { val: 60, label: '60 µg/m³ (CPCB Standard)' },
  { val: 90, label: '90 µg/m³ (Moderate)' },
  { val: 120, label: '120 µg/m³ (Poor)' },
  { val: 150, label: '150 µg/m³ (Unhealthy)' },
  { val: 200, label: '200 µg/m³ (Very High)' },
  { val: 250, label: '250 µg/m³ (Severe)' },
];

export const NotificationOptIn: React.FC<NotificationOptInProps> = ({
  className = '',
  initialRange = null,
}) => {
  const { t, language } = useLanguage();
  const [state, setState] = useState<NotificationState>('loading');
  const [forecastRange, setForecastRange] = useState<ForecastRange | null>(initialRange);
  const [subscription, setSubscription] = useState<PushSubscription | null>(null);
  const [isActionLoading, setIsActionLoading] = useState<boolean>(false);
  const [statusCheckMsg, setStatusCheckMsg] = useState<string | null>(null);
  const [alertHour, setAlertHour] = useState<number | null>(null);
  const [alertThreshold, setAlertThreshold] = useState<number | null>(null);
  const isCancelledRef = React.useRef<boolean>(false);
  React.useEffect(() => () => { isCancelledRef.current = true; }, []);
  const [isSavingSettings, setIsSavingSettings] = useState<boolean>(false);
  const [settingsMsg, setSettingsMsg] = useState<string | null>(null);

  // Initialize and check current status on mount
  useEffect(() => {
    let isCancelled = false;

    async function checkInitial() {
      if (!isPushSupported()) {
        if (!isCancelled) setState('unsupported');
        return;
      }

      // Fetch forecast range dynamically if not supplied
      if (!initialRange) {
        const range = await getForecastRange();
        if (!isCancelled && range) {
          setForecastRange(range);
        }
      }

      if (Notification.permission === 'denied') {
        if (!isCancelled) setState('denied');
        return;
      }

      try {
        const existingSub = await getExistingSubscription();
        if (!isCancelled) {
          if (existingSub) {
            setSubscription(existingSub);
            const cfg = await getServerConfig(existingSub.endpoint);
            setAlertHour(cfg.alert_hour_utc);
            setAlertThreshold(cfg.pm25_threshold);
            setState(cfg.active ? 'active' : 'pending');
          } else {
            setState('idle');
          }
        }
      } catch {
        if (!isCancelled) setState('idle');
      }
    }

    checkInitial();

    return () => {
      isCancelled = true;
    };
  }, [initialRange]);

  // Handle user subscription request
  const handleSubscribe = async () => {
    setIsActionLoading(true);
    setStatusCheckMsg(null);
    try {
      const result = await subscribeToPush();
      if (result.subscription) {
        setSubscription(result.subscription);
      }

      if (result.status === 'active') {
        setState('active');
      } else if (result.status === 'pending') {
        setState('pending');
      } else if (result.status === 'denied') {
        setState('denied');
      } else {
        setState('unsupported');
      }
    } catch (err: any) {
      console.error('Subscription error:', err);
      setState('pending');
    } finally {
      setIsActionLoading(false);
    }
  };

  // Save the chosen daily alert window
  const handleWindowChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    if (!subscription) return;
    const v = e.target.value;
    const hour = v === 'off' ? null : parseInt(v, 10);
    setIsSavingSettings(true);
    setSettingsMsg(null);
    const ok = await saveAlertSettings(subscription, hour, alertThreshold);
    if (!isCancelledRef.current) {
      if (ok) {
        setAlertHour(hour);
        setSettingsMsg(
          hour === null
            ? (language === 'hi' ? 'दैनिक अलर्ट बंद कर दिए गए।' : 'Daily alerts off (registration saved).')
            : (language === 'hi'
                ? `सेटिंग सहेजी गई - डिलीवरी ${ALERT_WINDOWS.find((w) => w.utc === hour)?.label} विंडो में होगी।`
                : `Saved - delivery inside ${ALERT_WINDOWS.find((w) => w.utc === hour)?.label} window.`)
        );
      } else {
        setSettingsMsg(language === 'hi' ? 'सेटिंग सहेजी नहीं जा सकी।' : 'Failed to save settings.');
      }
      setIsSavingSettings(false);
    }
  };

  // Save the chosen PM2.5 alert threshold
  const handleThresholdChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    if (!subscription) return;
    const v = e.target.value;
    const thresh = v === 'any' ? null : parseInt(v, 10);
    setIsSavingSettings(true);
    setSettingsMsg(null);
    const ok = await saveAlertSettings(subscription, alertHour, thresh);
    if (!isCancelledRef.current) {
      if (ok) {
        setAlertThreshold(thresh);
        setSettingsMsg(
          thresh === null
            ? (language === 'hi' ? 'अलर्ट सीमा: कोई भी स्तर (डिफ़ॉल्ट)' : 'Alert threshold set to: Any level (default).')
            : (language === 'hi'
                ? `अलर्ट सीमा सेट की गई: केवल जब पूर्वानुमान ≥ ${thresh} µg/m³ हो।`
                : `Alert threshold set: Notify only when forecast is ≥ ${thresh} µg/m³.`)
        );
      } else {
        setSettingsMsg(language === 'hi' ? 'सेटिंग सहेजी नहीं जा सकी।' : 'Failed to save settings.');
      }
      setIsSavingSettings(false);
    }
  };

  // Unsubscribe (opt out) - browser + server
  const handleUnsubscribe = async () => {
    if (!subscription) return;
    setIsActionLoading(true);
    try {
      await unsubscribeFromPush(subscription);
      setSubscription(null);
      setState('idle');
    } catch {
      setState('idle');
    } finally {
      setIsActionLoading(false);
    }
  };

  // Re-check server status for pending subscriptions
  const handleRecheckStatus = async () => {
    if (!subscription) return;
    setIsActionLoading(true);
    setStatusCheckMsg('Checking server...');
    try {
      const isActive = await checkServerStatus(subscription.endpoint);
      if (isActive) {
        setState('active');
        setStatusCheckMsg(null);
      } else {
        setStatusCheckMsg('Server not responding yet (activation still pending).');
      }
    } catch {
      setStatusCheckMsg('Connection error; server still pending.');
    } finally {
      setIsActionLoading(false);
    }
  };

  if (state === 'unsupported' || state === 'loading') {
    return null;
  }

  const rangeDisplay = forecastRange ? forecastRange.formattedRange : 'Nov 1–13';

  return (
    <div
      className={`rounded-xl bg-white border border-stone-200 border-l-[3px] border-l-orange-400 p-4.5 sm:p-5 shadow-xs transition hover:border-stone-300 ${className}`}
    >
      {/* 2. State: Not subscribed (idle) */}
      {state === 'idle' && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold text-stone-500 uppercase tracking-wider font-mono">
                DAILY FORECAST NOTIFICATIONS
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold border border-stone-300 text-stone-600 bg-stone-50 font-mono">
                OPT-IN
              </span>
            </div>
            <h3 className="text-base font-serif font-bold text-stone-900 tracking-tight">
              {t.notif_optin_title}
            </h3>
            <p className="text-xs text-stone-500 font-sans">
              {t.notif_optin_desc} ({rangeDisplay})
            </p>
          </div>

          <div className="flex-shrink-0">
            <button
              onClick={handleSubscribe}
              disabled={isActionLoading}
              className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold text-white bg-[#c2410c] hover:bg-[#9a3412] active:bg-[#7c2d12] transition shadow-xs cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isActionLoading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Connecting...</span>
                </>
              ) : (
                <>
                  <Bell className="w-3.5 h-3.5" />
                  <span>{t.notif_optin_title}</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* 3. State: Subscribed in browser BUT server not confirmed (Pending) */}
      {state === 'pending' && (
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="space-y-1.5 flex-1">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold text-stone-500 uppercase tracking-wider font-mono">
                DAILY FORECAST NOTIFICATIONS
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold border border-amber-500/70 text-amber-900 bg-amber-50/80 font-mono">
                ACTIVATION PENDING
              </span>
            </div>

            <div className="flex items-start gap-2 pt-0.5">
              <Clock className="w-4 h-4 text-amber-700 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="text-sm font-serif font-bold text-stone-900">
                  Notification request bheji gayi - activation pending
                </h3>
                <p className="text-xs text-stone-600 mt-0.5">
                  Browser push subscription successfully registered. Server-side notification scheduler pending activation for {rangeDisplay}.
                </p>
                {statusCheckMsg && (
                  <p className="text-[11px] text-amber-800 font-mono mt-1">
                    {statusCheckMsg}
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="flex-shrink-0 self-start sm:self-center">
            <button
              onClick={handleRecheckStatus}
              disabled={isActionLoading}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium text-stone-700 hover:text-stone-900 bg-stone-100 hover:bg-stone-200 border border-stone-200 transition cursor-pointer disabled:opacity-60"
              title="Check server endpoint status"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-stone-600 ${isActionLoading ? 'animate-spin' : ''}`} />
              <span>Status check karo</span>
            </button>
          </div>
        </div>
      )}

      {/* 4. State: Active (Server confirmed) */}
      {state === 'active' && (
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="space-y-1.5 flex-1">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold text-stone-500 uppercase tracking-wider font-mono">
                DAILY FORECAST NOTIFICATIONS
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold border border-emerald-500/70 text-emerald-800 bg-emerald-50/80 font-mono">
                REGISTERED
              </span>
            </div>

            <div className="flex items-start gap-2 pt-0.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-700 flex-shrink-0 mt-0.5" />
              <div className="space-y-2">
                <h3 className="text-sm font-serif font-bold text-stone-900">
                  Browser alerts registered ({rangeDisplay})
                </h3>
                <p className="text-xs text-stone-600">
                  Registration save ho gaya ({rangeDisplay}). Daily alert window aur optional PM2.5 threshold set karein:
                </p>
                <div className="flex flex-wrap items-center gap-4 pt-1">
                  {/* Delivery window selector */}
                  <div className="flex items-center gap-2">
                    <label htmlFor="alert-window" className="text-[11px] font-semibold text-stone-600">
                      {t.notif_window_label}
                    </label>
                    <select
                      id="alert-window"
                      value={alertHour === null ? 'off' : String(alertHour)}
                      onChange={handleWindowChange}
                      disabled={isSavingSettings}
                      className="text-xs rounded-md border border-stone-300 bg-white px-2 py-1 text-stone-800 cursor-pointer disabled:opacity-60"
                    >
                      <option value="off">Alerts off</option>
                      {ALERT_WINDOWS.map((w) => (
                        <option key={w.utc} value={String(w.utc)}>{w.label}</option>
                      ))}
                    </select>
                  </div>

                  {/* Optional PM2.5 threshold dropdown */}
                  <div className="flex items-center gap-2">
                    <label htmlFor="alert-threshold" className="text-[11px] font-semibold text-stone-600">
                      {t.notif_threshold_label}
                    </label>
                    <select
                      id="alert-threshold"
                      value={alertThreshold === null ? 'any' : String(alertThreshold)}
                      onChange={handleThresholdChange}
                      disabled={isSavingSettings}
                      className="text-xs rounded-md border border-stone-300 bg-white px-2 py-1 text-stone-800 cursor-pointer disabled:opacity-60"
                    >
                      {THRESHOLD_OPTIONS.map((opt) => (
                        <option key={opt.val ?? 'any'} value={opt.val === null ? 'any' : String(opt.val)}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {isSavingSettings && <Loader2 className="w-3.5 h-3.5 animate-spin text-stone-500" />}
                </div>

                {settingsMsg && (
                  <p className="text-[11px] text-stone-600 font-mono mt-1">{settingsMsg}</p>
                )}
              </div>
            </div>
          </div>

          <div className="flex-shrink-0 self-start sm:self-center flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-mono font-medium text-emerald-800 bg-emerald-50 border border-emerald-200">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse"></span>
              Subscribed
            </span>
            <button
              onClick={handleUnsubscribe}
              disabled={isActionLoading}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium text-stone-600 hover:text-stone-900 bg-stone-100 hover:bg-stone-200 border border-stone-200 transition cursor-pointer disabled:opacity-60"
            >
              <BellOff className="w-3.5 h-3.5" />
              <span>{t.notif_btn_disable}</span>
            </button>
          </div>
        </div>
      )}

      {/* State: Permission Denied */}
      {state === 'denied' && (
        <div className="flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold text-stone-500 uppercase tracking-wider font-mono">
                NOTIFICATIONS BLOCKED
              </span>
            </div>
            <p className="text-xs text-stone-700 font-medium">
              Browser notification permission has been blocked.
            </p>
            <p className="text-[11px] text-stone-500 font-mono">
              To receive daily Patiala PM2.5 alerts for {rangeDisplay}, please reset notification permissions in your browser address bar.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
