import { api } from '@/api/apiClient';
import { useAuth } from '@/lib/AuthContext';
import { app } from '@/lib/firebase';
import { getMessaging, getToken, isSupported, onMessage } from 'firebase/messaging';
import { useEffect, useRef } from 'react';

const VAPID_KEY = (typeof import.meta !== 'undefined' && import.meta?.env?.VITE_FIREBASE_VAPID_KEY) || '';

export default function PushNotificationsManager() {
  const { user, isAuthenticated } = useAuth();
  const lastTokenRef = useRef(null);
  const didInitRef = useRef(false);

  useEffect(() => {
    if (!isAuthenticated || !user?.email) return;
    if (didInitRef.current) return;
    didInitRef.current = true;

    let unsubscribe = null;

    const run = async () => {
      try {
        const supported = await isSupported();
        if (!supported) return;
        if (!VAPID_KEY) return;

        if (!('serviceWorker' in navigator)) return;
        const reg = await navigator.serviceWorker.register('/firebase-messaging-sw.js');

        const perm = await Notification.requestPermission();
        if (perm !== 'granted') return;

        const messaging = getMessaging(app);
        const token = await getToken(messaging, { vapidKey: VAPID_KEY, serviceWorkerRegistration: reg });
        if (!token) return;

        const prev = localStorage.getItem('fcm_token');
        if (prev && prev !== token) {
          try { await api.push.unsubscribe({ token: prev }); } catch {}
        }

        if (prev !== token) {
          await api.push.subscribe({ token, platform: 'web', user_agent: navigator.userAgent });
          localStorage.setItem('fcm_token', token);
        }
        lastTokenRef.current = token;

        unsubscribe = onMessage(messaging, (payload) => {
          try {
            const data = payload?.data || {};
            const title = data._title || payload?.notification?.title || 'SpeakUp';
            const body = data._body || payload?.notification?.body || '';
            let actions = [];
            try {
              if (data.actions) actions = JSON.parse(data.actions);
            } catch {}
            if (!Array.isArray(actions) || actions.length === 0) {
              actions = [
                { action: 'open_admin', title: 'Open Admin' },
                { action: 'dismiss', title: 'Dismiss' },
              ];
            }

            const options = {
              body,
              icon: data.icon || '/logo.png',
              badge: data.badge || '/logo.png',
              image: (data.image && String(data.image).trim()) ? String(data.image) : undefined,
              actions,
              requireInteraction: String(data.requireInteraction || '') === 'true',
              data: {
                url: data.url || '/Dashboard',
                actionUrls: (() => {
                  try { return data.actionUrls ? JSON.parse(data.actionUrls) : {}; } catch { return {}; }
                })(),
                raw: data,
              },
            };

            navigator.serviceWorker?.ready
              .then((r) => r.showNotification(title, options))
              .catch(() => {
                if (Notification.permission === 'granted') new Notification(title, { body });
              });
          } catch {}
        });
      } catch (e) {
        console.warn('push init failed', e && e.message ? e.message : e);
      }
    };

    run();

    return () => {
      try {
        if (typeof unsubscribe === 'function') unsubscribe();
      } catch {}
    };
  }, [isAuthenticated, user?.email]);

  return null;
}
