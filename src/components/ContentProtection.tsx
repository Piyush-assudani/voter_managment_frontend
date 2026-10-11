'use client';

import React, { useEffect } from 'react';
import { decodeJwtPayload } from '@/lib/api';

declare global {
  interface Window {
    AndroidSecurityBridge?: {
      setScreenSecurity: (enable: boolean) => void;
    };
  }
}

function isUserAdmin(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const token = window.localStorage.getItem('token');
    if (!token) return false;
    const payload = decodeJwtPayload<{ user?: { role?: string } }>(token);
    return payload?.user?.role === 'admin';
  } catch {
    return false;
  }
}

/**
 * ContentProtection Component
 * Protects frontend content from being copied, right-clicked, screenshotted, or scraped:
 * - Admin users have FULL ACCESS (allowed to screenshot, right-click, print, and copy).
 * - Non-admin users (workers, operators, guests) have silent protection enabled:
 *   - Silent right-click context menu blocking (no warning toast shown).
 *   - Silent copy and cut blocking.
 *   - Screenshot key suppression & clipboard wiping on capture shortcuts.
 *   - Print media suppression.
 *   - Native Android hardware screenshot blocking via AndroidSecurityBridge (FLAG_SECURE).
 */
export const ContentProtection: React.FC = () => {
  useEffect(() => {
    const admin = isUserAdmin();

    // 1. Hardware-level Android WebView Screenshot Protection
    if (typeof window !== 'undefined' && window.AndroidSecurityBridge?.setScreenSecurity) {
      window.AndroidSecurityBridge.setScreenSecurity(!admin);
    }

    // Admins are exempt from all restrictions
    if (admin) {
      return;
    }

    // 2. Silent Right-Click Prevention (No annoying toast popup)
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      return false;
    };

    // 3. Silent Copy & Cut Prevention (except inside inputs)
    const handleCopy = (e: ClipboardEvent) => {
      const activeEl = document.activeElement;
      const isInput =
        activeEl &&
        (activeEl.tagName === 'INPUT' ||
          activeEl.tagName === 'TEXTAREA' ||
          (activeEl as HTMLElement).isContentEditable);
      if (isInput) return;

      e.preventDefault();
      return false;
    };

    const handleCut = (e: ClipboardEvent) => {
      const activeEl = document.activeElement;
      const isInput =
        activeEl &&
        (activeEl.tagName === 'INPUT' ||
          activeEl.tagName === 'TEXTAREA' ||
          (activeEl as HTMLElement).isContentEditable);
      if (isInput) return;

      e.preventDefault();
      return false;
    };

    // 4. Prevent Image Drag & Drop
    const handleDragStart = (e: DragEvent) => {
      e.preventDefault();
      return false;
    };

    // 5. Block Screenshot Keys & DevTools Shortcuts Silently
    const handleKeyDown = (e: KeyboardEvent) => {
      const key = (e.key || '').toLowerCase();
      const isCtrlOrCmd = e.ctrlKey || e.metaKey;

      // PrintScreen Key -> Clear clipboard immediately
      if (e.key === 'PrintScreen' || key === 'printscreen') {
        e.preventDefault();
        try {
          void navigator.clipboard?.writeText('');
        } catch {
          // ignore
        }
        return false;
      }

      // Screenshot shortcuts: Win+Shift+S, Cmd+Shift+3/4/5
      if (isCtrlOrCmd && e.shiftKey && (key === 's' || key === '3' || key === '4' || key === '5')) {
        e.preventDefault();
        e.stopPropagation();
        try {
          void navigator.clipboard?.writeText('');
        } catch {
          // ignore
        }
        return false;
      }

      // F12 -> DevTools
      if (e.key === 'F12') {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }

      // Ctrl+Shift+I / J / C
      if (isCtrlOrCmd && (e.shiftKey || e.altKey) && (key === 'i' || key === 'j' || key === 'c')) {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }

      // Ctrl+U -> View Source
      if (isCtrlOrCmd && key === 'u') {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }

      // Ctrl+S -> Save Page
      if (isCtrlOrCmd && key === 's') {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }

      // Ctrl+C outside input elements
      if (isCtrlOrCmd && key === 'c') {
        const activeEl = document.activeElement;
        const isInput =
          activeEl &&
          (activeEl.tagName === 'INPUT' ||
            activeEl.tagName === 'TEXTAREA' ||
            (activeEl as HTMLElement).isContentEditable);
        if (!isInput) {
          e.preventDefault();
          return false;
        }
      }
    };

    // Inject non-admin print protection style
    const styleEl = document.createElement('style');
    styleEl.id = 'non-admin-print-protection';
    styleEl.innerHTML = '@media print { body { display: none !important; } }';
    document.head.appendChild(styleEl);

    document.addEventListener('contextmenu', handleContextMenu, { capture: true });
    document.addEventListener('copy', handleCopy, { capture: true });
    document.addEventListener('cut', handleCut, { capture: true });
    document.addEventListener('dragstart', handleDragStart, { capture: true });
    window.addEventListener('keydown', handleKeyDown, { capture: true });

    return () => {
      styleEl.remove();
      document.removeEventListener('contextmenu', handleContextMenu, { capture: true });
      document.removeEventListener('copy', handleCopy, { capture: true });
      document.removeEventListener('cut', handleCut, { capture: true });
      document.removeEventListener('dragstart', handleDragStart, { capture: true });
      window.removeEventListener('keydown', handleKeyDown, { capture: true });
    };
  }, []);

  return null;
};
