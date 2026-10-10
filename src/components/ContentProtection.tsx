'use client';

import React, { useEffect, useState, useCallback } from 'react';

/**
 * ContentProtection Component
 * Protects frontend content from being copied, right-clicked, inspected, or scraped:
 * - Disables context menu (right-click)
 * - Disables copy and cut actions
 * - Disables image drag & drop / saving
 * - Disables DevTools and View-Source shortcuts (F12, Ctrl+Shift+I, Ctrl+U, Ctrl+S)
 * - Disables text selection on non-input elements
 * - Displays a sleek security notification on blocked attempts
 */
export const ContentProtection: React.FC = () => {
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showSecurityWarning = useCallback((msg: string) => {
    setToastMessage(msg);
  }, []);

  useEffect(() => {
    if (!toastMessage) return;
    const timer = setTimeout(() => {
      setToastMessage(null);
    }, 2200);
    return () => clearTimeout(timer);
  }, [toastMessage]);

  useEffect(() => {
    // 1. Disable Right-Click Context Menu
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      showSecurityWarning('सुरक्षा नीति: राइट-क्लिक और इमेज डाउनलोड प्रतिबंधित है');
      return false;
    };

    // 2. Disable Copy & Cut (except when editing within input/textarea)
    const handleCopy = (e: ClipboardEvent) => {
      const activeEl = document.activeElement;
      const isInput = activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA' || (activeEl as HTMLElement).isContentEditable);
      if (isInput) return;
      
      // Block copying data out
      e.preventDefault();
      showSecurityWarning('डेटा सुरक्षा: सामग्री कॉपी करना प्रतिबंधित है');
      return false;
    };

    const handleCut = (e: ClipboardEvent) => {
      const activeEl = document.activeElement;
      const isInput = activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA' || (activeEl as HTMLElement).isContentEditable);
      if (isInput) return;

      e.preventDefault();
      showSecurityWarning('डेटा सुरक्षा: कट / कॉपी प्रतिबंधित है');
      return false;
    };

    // 3. Prevent Image & Element Dragging (no drag-to-desktop / save)
    const handleDragStart = (e: DragEvent) => {
      e.preventDefault();
      return false;
    };

    // 4. Disable DevTools & Page Inspection Keyboard Shortcuts
    const handleKeyDown = (e: KeyboardEvent) => {
      const key = (e.key || '').toLowerCase();
      const isCtrlOrCmd = e.ctrlKey || e.metaKey;

      // F12 -> DevTools
      if (e.key === 'F12') {
        e.preventDefault();
        e.stopPropagation();
        showSecurityWarning('सुरक्षा नीति: डेवलपर टूल्स प्रतिबंधित हैं');
        return false;
      }

      // Ctrl+Shift+I / Cmd+Option+I -> Inspect
      // Ctrl+Shift+J / Cmd+Option+J -> Console
      // Ctrl+Shift+C / Cmd+Option+C -> Inspect Element
      if (isCtrlOrCmd && (e.shiftKey || e.altKey) && (key === 'i' || key === 'j' || key === 'c')) {
        e.preventDefault();
        e.stopPropagation();
        showSecurityWarning('सुरक्षा नीति: इंस्पेक्ट टूल प्रतिबंधित है');
        return false;
      }

      // Ctrl+U / Cmd+Option+U -> View Source
      if (isCtrlOrCmd && key === 'u') {
        e.preventDefault();
        e.stopPropagation();
        showSecurityWarning('सुरक्षा नीति: सोर्स कोड देखना प्रतिबंधित है');
        return false;
      }

      // Ctrl+S / Cmd+S -> Save Page HTML
      if (isCtrlOrCmd && key === 's') {
        e.preventDefault();
        e.stopPropagation();
        showSecurityWarning('सुरक्षा नीति: पेज सेव करना प्रतिबंधित है');
        return false;
      }

      // Ctrl+C / Cmd+C on page content outside form inputs & editable elements
      if (isCtrlOrCmd && key === 'c') {
        const activeEl = document.activeElement;
        const isInput = activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA' || (activeEl as HTMLElement).isContentEditable);
        if (!isInput) {
          e.preventDefault();
          showSecurityWarning('डेटा सुरक्षा: कॉपी करना प्रतिबंधित है');
          return false;
        }
      }
    };

    // Attach listeners to document & window
    document.addEventListener('contextmenu', handleContextMenu, { capture: true });
    document.addEventListener('copy', handleCopy, { capture: true });
    document.addEventListener('cut', handleCut, { capture: true });
    document.addEventListener('dragstart', handleDragStart, { capture: true });
    window.addEventListener('keydown', handleKeyDown, { capture: true });

    return () => {
      document.removeEventListener('contextmenu', handleContextMenu, { capture: true });
      document.removeEventListener('copy', handleCopy, { capture: true });
      document.removeEventListener('cut', handleCut, { capture: true });
      document.removeEventListener('dragstart', handleDragStart, { capture: true });
      window.removeEventListener('keydown', handleKeyDown, { capture: true });
    };
  }, [showSecurityWarning]);

  if (!toastMessage) return null;

  return (
    <div
      role="alert"
      style={{
        position: 'fixed',
        bottom: '24px',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 999999,
        background: 'rgba(15, 23, 42, 0.94)',
        backdropFilter: 'blur(8px)',
        color: '#ffffff',
        padding: '10px 18px',
        borderRadius: '30px',
        boxShadow: '0 10px 30px rgba(0, 0, 0, 0.35), 0 0 0 1px rgba(255, 255, 255, 0.1)',
        fontSize: '13px',
        fontWeight: 600,
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        letterSpacing: '0.2px',
        pointerEvents: 'none',
        animation: 'securityToastSlide 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
      }}
    >
      <span>{toastMessage}</span>
    </div>
  );
};
