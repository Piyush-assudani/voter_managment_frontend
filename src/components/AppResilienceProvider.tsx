'use client';

import { useEffect } from 'react';
import { apiFetch } from '@/lib/api';
import { ensureClientSchemaVersion, flushOfflineQueue } from '@/lib/offlineSync';

/**
 * Global Client Resilience Provider:
 *  - Client cache schema version migration (prevents broken old cached state after deploys)
 *  - Virtual keyboard / visualViewport resize handling on iOS & Android so inputs never hide behind keyboard
 *  - Background resume recovery (visibilitychange + pageshow after sleeping/minimizing for hours)
 *  - Automatic offline outbox sync replay when network comes back online
 */
export function AppResilienceProvider() {
  useEffect(() => {
    ensureClientSchemaVersion();

    const syncNow = () => {
      void flushOfflineQueue(apiFetch);
    };

    // 1. Background/Offline sync triggers
    syncNow();
    window.addEventListener('online', syncNow);

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        syncNow();
        window.dispatchEvent(new CustomEvent('app-resumed'));
      }
    };
    const handlePageShow = (e: PageTransitionEvent) => {
      if (e.persisted) {
        syncNow();
        window.dispatchEvent(new CustomEvent('app-resumed'));
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('pageshow', handlePageShow);

    // 2. Mobile virtual keyboard awareness (iOS Safari / Android WebView)
    const vv = window.visualViewport;
    const handleViewportResize = () => {
      if (!vv) return;
      const keyboardHeight = Math.max(0, window.innerHeight - vv.height);
      const root = document.documentElement;
      if (keyboardHeight > 120) {
        root.classList.add('keyboard-open');
        root.style.setProperty('--keyboard-inset', `${keyboardHeight}px`);
      } else {
        root.classList.remove('keyboard-open');
        root.style.setProperty('--keyboard-inset', '0px');
      }
    };
    if (vv) {
      vv.addEventListener('resize', handleViewportResize);
      handleViewportResize();
    }

    // Ensure focused input smoothly scrolls clear of the on-screen keyboard
    const handleFocusIn = (event: FocusEvent) => {
      const target = event.target as HTMLElement | null;
      if (!target) return;
      const tag = target.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') {
        window.setTimeout(() => {
          try {
            target.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
          } catch {
            // ignore unsupported scrollIntoView options on very old WebViews
          }
        }, 180);
      }
    };
    document.addEventListener('focusin', handleFocusIn);

    return () => {
      window.removeEventListener('online', syncNow);
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('pageshow', handlePageShow);
      document.removeEventListener('focusin', handleFocusIn);
      if (vv) vv.removeEventListener('resize', handleViewportResize);
    };
  }, []);

  return null;
}

