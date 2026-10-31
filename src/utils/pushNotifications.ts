// Client-side Web Push Notification utilities for Patiala PM2.5 Forecast

export const VAPID_PUBLIC_KEY =
  'BIEAXGl3zychTFiQvJgAHzKTHdW2eZqB0jPd_IdOl4Rs2hHpCjmD-oILzBzjMaGywM4utUOLsiUd2utPRUyVfiU';

export type PushNotificationStatus = 'active' | 'pending' | 'denied' | 'unsupported' | 'idle';

export interface ForecastRange {
  start: string;
  end: string;
  count: number;
  formattedRange: string;
}

export interface SubscribeResult {
  status: 'active' | 'pending' | 'denied' | 'unsupported';
  subscription: PushSubscription | null;
  error?: string;
}

/**
 * Converts a URL-safe base64 string to a Uint8Array for applicationServerKey.
 */
export function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');

  const rawData = window.atob(base64);
  const buffer = new ArrayBuffer(rawData.length);
  const outputArray = new Uint8Array(buffer);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

/**
 * Checks if browser supports ServiceWorker, PushManager, and Notification APIs.
 */
export function isPushSupported(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  );
}

/**
 * Reads /data/predictions.json and derives the real covered date range dynamically.
 * Dates are formatted into human-readable strings (e.g. "Nov 1" - "Nov 13").
 */
export async function getForecastRange(): Promise<ForecastRange | null> {
  try {
    const res = await fetch('/data/predictions.json');
    if (!res.ok) return null;
    const data = await res.json();
    if (!data || !Array.isArray(data.predictions) || data.predictions.length === 0) {
      return null;
    }

    const predictions: Array<{ date: string }> = data.predictions;
    const startIso = predictions[0].date;
    const endIso = predictions[predictions.length - 1].date;
    const count = predictions.length;

    const formatReadable = (iso: string): string => {
      try {
        const parts = iso.split('-');
        if (parts.length === 3) {
          const monthNames = [
            'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
            'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
          ];
          const mIdx = parseInt(parts[1], 10) - 1;
          const day = parseInt(parts[2], 10);
          return `${monthNames[mIdx]} ${day}`;
        }
      } catch {
        // fallback
      }
      return iso;
    };

    const startReadable = formatReadable(startIso);
    const endReadable = formatReadable(endIso);
    const formattedRange = `${startReadable}–${endReadable}`;

    return {
      start: startReadable,
      end: endReadable,
      count,
      formattedRange,
    };
  } catch (error) {
    console.error('Failed to load forecast range:', error);
    return null;
  }
}

/**
 * Polls or checks GET /api/subscribe/status?endpoint=<url-encoded endpoint>
 * Returns true if server reports active, false otherwise.
 */
export async function checkServerStatus(endpoint: string): Promise<boolean> {
  if (!endpoint) return false;
  try {
    const encoded = encodeURIComponent(endpoint);
    const response = await fetch(`/api/subscribe/status?endpoint=${encoded}`, {
      method: 'GET',
      headers: { Accept: 'application/json' },
    });
    if (response.status === 200) {
      const data = await response.json();
      return Boolean(data?.active);
    }
    return false;
  } catch {
    return false;
  }
}

/**
 * Retrieves the current push subscription from the service worker registration if available.
 */
export async function getExistingSubscription(): Promise<PushSubscription | null> {
  if (!isPushSupported()) return null;
  try {
    const registration = await navigator.serviceWorker.getRegistration();
    if (!registration) return null;
    return await registration.pushManager.getSubscription();
  } catch {
    return null;
  }
}

/**
 * Registers /sw.js, requests permission, subscribes with applicationServerKey,
 * and POSTs PushSubscription to /api/subscribe.
 *
 * Status outcomes:
 * - 'unsupported': browser lacks APIs
 * - 'denied': user denied permission
 * - 'active': subscription created AND server responded with 200
 * - 'pending': subscription created in browser BUT server endpoint returned 404 / failed / network error
 */
export async function subscribeToPush(): Promise<SubscribeResult> {
  if (!isPushSupported()) {
    return { status: 'unsupported', subscription: null };
  }

  // Check current permission or request it
  if (Notification.permission === 'denied') {
    return { status: 'denied', subscription: null };
  }

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') {
    return { status: 'denied', subscription: null };
  }

  try {
    // 1. Register service worker
    const registration = await navigator.serviceWorker.register('/sw.js', {
      scope: '/',
    });
    await navigator.serviceWorker.ready;

    // 2. Subscribe with VAPID key
    const applicationServerKey = urlBase64ToUint8Array(VAPID_PUBLIC_KEY);
    let subscription = await registration.pushManager.getSubscription();
    if (!subscription) {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: applicationServerKey as unknown as BufferSource,
      });
    }

    // 3. POST subscription JSON to server
    let serverActive = false;
    try {
      const res = await fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(subscription.toJSON()),
      });
      if (res.status === 200) {
        serverActive = true;
      }
    } catch {
      // 404 or network error -> pending activation
      serverActive = false;
    }

    return {
      status: serverActive ? 'active' : 'pending',
      subscription,
    };
  } catch (error: any) {
    console.error('Push subscription failed:', error);
    return {
      status: 'pending',
      subscription: null,
      error: error?.message || 'Subscription failed',
    };
  }
}

/**
 * Unsubscribes the browser push subscription and removes it server-side.
 * Returns true when the browser unsubscribe succeeded (server cleanup is best-effort).
 */
export async function unsubscribeFromPush(subscription: PushSubscription): Promise<boolean> {
  const endpoint = subscription.endpoint;
  let browserOk = false;
  try {
    browserOk = await subscription.unsubscribe();
  } catch {
    browserOk = false;
  }
  try {
    await fetch(`/api/subscribe?endpoint=${encodeURIComponent(endpoint)}`, { method: 'DELETE' });
  } catch {
    // server cleanup best-effort; browser unsubscribe is the user-visible guarantee
  }
  return browserOk;
}

export interface ServerConfig {
  active: boolean;
  alert_hour_utc: number | null;
  pm25_threshold: number | null;
}

/** Reads the device's own server-side registration config (scoped by exact endpoint). */
export async function getServerConfig(endpoint: string): Promise<ServerConfig> {
  if (!endpoint) return { active: false, alert_hour_utc: null, pm25_threshold: null };
  try {
    const response = await fetch(`/api/subscribe/status?endpoint=${encodeURIComponent(endpoint)}`, {
      method: 'GET',
      headers: { Accept: 'application/json' },
    });
    if (response.status === 200) {
      const data = await response.json();
      return {
        active: Boolean(data?.active),
        alert_hour_utc: typeof data?.alert_hour_utc === 'number' ? data.alert_hour_utc : null,
        pm25_threshold: typeof data?.pm25_threshold === 'number' ? data.pm25_threshold : null,
      };
    }
  } catch { /* fall through */ }
  return { active: false, alert_hour_utc: null, pm25_threshold: null };
}

/** Persists the chosen alert window (UTC hour) and optional PM2.5 threshold for this device. */
export async function saveAlertSettings(
  subscription: PushSubscription,
  alertHourUtc: number | null,
  pm25Threshold: number | null
): Promise<boolean> {
  try {
    const body = {
      ...subscription.toJSON(),
      alert_hour_utc: alertHourUtc,
      pm25_threshold: pm25Threshold,
    };
    const res = await fetch('/api/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    return res.status === 200;
  } catch {
    return false;
  }
}

/** Persists the chosen alert window (UTC hour) for this device's registration. */
export async function saveAlertWindow(subscription: PushSubscription, alertHourUtc: number | null): Promise<boolean> {
  return saveAlertSettings(subscription, alertHourUtc, null);
}