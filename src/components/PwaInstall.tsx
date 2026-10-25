'use client';

import React, { useEffect, useState } from 'react';
import { Download, Smartphone, CheckCircle2, Share, PlusSquare, X } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

declare global {
  interface Window {
    __deferredPwaPrompt?: BeforeInstallPromptEvent | null;
  }
}

export function usePwaInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [showIOSModal, setShowIOSModal] = useState(false);

  useEffect(() => {
    // 1. Register Service Worker
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch((err) => {
        console.warn('PWA service worker registration failed:', err);
      });
    }

    // 2. Check if already running in standalone / installed mode
    if (typeof window !== 'undefined') {
      const isStandalone =
        window.matchMedia('(display-mode: standalone)').matches ||
        (navigator as unknown as { standalone?: boolean }).standalone === true ||
        document.referrer.includes('android-app://');
      setIsInstalled(Boolean(isStandalone));

      // 3. Detect iOS
      const ua = window.navigator.userAgent.toLowerCase();
      const isApple = /iphone|ipad|ipod/.test(ua) && !/crios|fxios/.test(ua);
      setIsIOS(isApple);

      // Check existing cached prompt
      if (window.__deferredPwaPrompt) {
        setDeferredPrompt(window.__deferredPwaPrompt);
      }

      const handleBeforeInstallPrompt = (e: Event) => {
        e.preventDefault();
        const promptEvent = e as BeforeInstallPromptEvent;
        window.__deferredPwaPrompt = promptEvent;
        setDeferredPrompt(promptEvent);
      };

      const handleAppInstalled = () => {
        setIsInstalled(true);
        setDeferredPrompt(null);
        window.__deferredPwaPrompt = null;
      };

      window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.addEventListener('appinstalled', handleAppInstalled);

      return () => {
        window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
        window.removeEventListener('appinstalled', handleAppInstalled);
      };
    }
  }, []);

  const triggerInstall = async () => {
    if (isInstalled) {
      alert('विजयसेतु ऐप आपके डिवाइस पर पहले से इंस्टॉल है!');
      return;
    }

    const promptEvent = deferredPrompt || window.__deferredPwaPrompt;
    if (promptEvent) {
      try {
        await promptEvent.prompt();
        const choice = await promptEvent.userChoice;
        if (choice.outcome === 'accepted') {
          setIsInstalled(true);
          setDeferredPrompt(null);
          window.__deferredPwaPrompt = null;
        }
      } catch (err) {
        console.error('PWA install prompt error:', err);
      }
      return;
    }

    if (isIOS) {
      setShowIOSModal(true);
      return;
    }

    // Fallback for Chrome / Edge / Android if prompt was already dismissed or delayed
    setShowIOSModal(true);
  };

  return {
    isInstalled,
    isIOS,
    showIOSModal,
    setShowIOSModal,
    triggerInstall,
    hasNativePrompt: Boolean(deferredPrompt || (typeof window !== 'undefined' && window.__deferredPwaPrompt)),
  };
}

// 1. Topbar Action Button
export function PwaInstallHeaderBtn() {
  const { isInstalled, triggerInstall, showIOSModal, setShowIOSModal, isIOS } = usePwaInstall();

  return (
    <>
      <button
        type="button"
        onClick={triggerInstall}
        className="pwa-header-install-btn"
        title="विजयसेतु ऐप अपने फ़ोन या कंप्यूटर पर डाउनलोड करें"
        aria-label="ऐप डाउनलोड करें"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '5px',
          padding: '5px 10px',
          borderRadius: '8px',
          background: isInstalled ? '#ecfdf5' : '#047857',
          color: isInstalled ? '#047857' : '#ffffff',
          border: isInstalled ? '1px solid #a7f3d0' : 'none',
          fontSize: '11.5px',
          fontWeight: 700,
          cursor: 'pointer',
          boxShadow: isInstalled ? 'none' : '0 2px 5px rgba(4, 120, 87, 0.25)',
          transition: 'all 0.16s ease',
          whiteSpace: 'nowrap',
          flexShrink: 0,
        }}
      >
        {isInstalled ? (
          <>
            <CheckCircle2 size={13} />
            <span className="hidden sm:inline">ऐप इंस्टॉल है</span>
            <span className="sm:hidden">इंस्टॉल</span>
          </>
        ) : (
          <>
            <Download size={13} strokeWidth={2.5} />
            <span className="hidden sm:inline">ऐप डाउनलोड</span>
            <span className="sm:hidden">ऐप</span>
          </>
        )}
      </button>

      {showIOSModal && <PwaInstallInstructionsModal onClose={() => setShowIOSModal(false)} isIOS={isIOS} />}
    </>
  );
}

// 2. Footer Action Button
export function PwaInstallFooterBtn() {
  const { isInstalled, triggerInstall, showIOSModal, setShowIOSModal, isIOS } = usePwaInstall();

  return (
    <>
      <button
        type="button"
        onClick={triggerInstall}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          padding: '5px 12px',
          borderRadius: '20px',
          background: isInstalled ? '#ecfdf5' : '#064e3b',
          color: isInstalled ? '#047857' : '#ffffff',
          border: isInstalled ? '1px solid #a7f3d0' : '1px solid #047857',
          fontSize: '12px',
          fontWeight: 700,
          cursor: 'pointer',
          transition: 'all 0.15s ease',
          marginLeft: '4px',
          marginRight: '4px',
        }}
      >
        <Smartphone size={14} />
        <span>{isInstalled ? '✓ विजयसेतु ऐप सक्रिय' : '📲 ऐप डाउनलोड करें (Install PWA)'}</span>
      </button>

      {showIOSModal && <PwaInstallInstructionsModal onClose={() => setShowIOSModal(false)} isIOS={isIOS} />}
    </>
  );
}

// 3. Dashboard Launcher Card
export function PwaInstallDashboardCard() {
  const { isInstalled, triggerInstall, showIOSModal, setShowIOSModal, isIOS } = usePwaInstall();

  return (
    <>
      <div
        role="button"
        tabIndex={0}
        onClick={triggerInstall}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') triggerInstall(); }}
        className="dashboard-module-card is-highlighted"
        style={{
          border: isInstalled ? '2px solid #059669' : '2px dashed #0284c7',
          background: isInstalled ? '#f0fdf4' : '#f0f9ff',
          cursor: 'pointer',
        }}
      >
        <div className="card-top-row">
          <div
            className="card-icon-tile"
            style={{
              background: isInstalled
                ? 'linear-gradient(135deg, #059669 0%, #047857 100%)'
                : 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
            }}
          >
            {isInstalled ? <CheckCircle2 size={26} /> : <Download size={26} />}
          </div>

          <div
            className="card-action-badge"
            style={{
              background: isInstalled ? '#dcfce7' : '#e0f2fe',
              color: isInstalled ? '#15803d' : '#0369a1',
              borderColor: isInstalled ? '#86efac' : '#bae6fd',
            }}
          >
            <span>{isInstalled ? 'इंस्टॉल है ✓' : 'डाउनलोड करें'}</span>
          </div>
        </div>

        <div>
          <h3 className="card-title" style={{ color: isInstalled ? '#166534' : '#0369a1' }}>
            {isInstalled ? 'विजयसेतु ऐप इंस्टॉल है' : 'विजयसेतु ऐप डाउनलोड करें'}
          </h3>
          <div className="card-subtitle">
            {isInstalled
              ? 'ऐप होम स्क्रीन पर सक्रिय है, ऑफलाइन भी काम करेगा'
              : 'बिना प्ले स्टोर के सीधे मोबाइल/PC पर 1-टैप में ऐप इंस्टॉल करें'}
          </div>
        </div>

        <div className="card-admin-tag" style={{ borderTopColor: isInstalled ? '#bbf7d0' : '#bae6fd', color: isInstalled ? '#15803d' : '#0284c7' }}>
          <Smartphone size={13} />
          <span>{isInstalled ? 'PWA Standalone Active' : '⚡ 1-Click PWA App Download'}</span>
        </div>
      </div>

      {showIOSModal && <PwaInstallInstructionsModal onClose={() => setShowIOSModal(false)} isIOS={isIOS} />}
    </>
  );
}

// 3. Instructions Modal for iOS Safari / Manual Installation
function PwaInstallInstructionsModal({ onClose, isIOS }: { onClose: () => void; isIOS: boolean }) {
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 999999,
        background: 'rgba(15, 23, 42, 0.75)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
      }}
      onClick={onClose}
    >
      <div
        style={{
          maxWidth: '460px',
          width: '100%',
          background: '#ffffff',
          borderRadius: '20px',
          padding: '24px 22px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          border: '1px solid #e2e8f0',
          position: 'relative',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '16px',
            right: '16px',
            width: '32px',
            height: '32px',
            borderRadius: '50%',
            background: '#f1f5f9',
            border: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#64748b',
            cursor: 'pointer',
          }}
          aria-label="बंद करें"
        >
          <X size={16} />
        </button>

        {/* Modal Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
          <div
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '12px',
              background: '#ecfdf5',
              border: '1.5px solid #a7f3d0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#047857',
              flexShrink: 0,
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.png" alt="VijaySetu" style={{ width: '34px', height: '34px', objectFit: 'contain' }} />
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 800, color: '#0f172a' }}>
              विजयसेतु ऐप डाउनलोड करें
            </h3>
            <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 500 }}>
              सीधे होम स्क्रीन पर 1-टैप में इंस्टॉल करें
            </span>
          </div>
        </div>

        {/* Instructions Body */}
        {isIOS ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', background: '#f8fafc', padding: '12px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
              <span style={{ width: '24px', height: '24px', borderRadius: '50%', background: '#2563eb', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 800, flexShrink: 0 }}>1</span>
              <div style={{ fontSize: '13px', color: '#1e293b', lineHeight: 1.5 }}>
                Safari ब्राउज़र में नीचे दिए गए <strong>Share (साझा करें)</strong> बटन पर टैप करें।
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: '#eff6ff', color: '#2563eb', padding: '2px 8px', borderRadius: '6px', marginTop: '4px', fontWeight: 700, fontSize: '12px' }}>
                  <Share size={13} /> Share Icon
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', background: '#f8fafc', padding: '12px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
              <span style={{ width: '24px', height: '24px', borderRadius: '50%', background: '#059669', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 800, flexShrink: 0 }}>2</span>
              <div style={{ fontSize: '13px', color: '#1e293b', lineHeight: 1.5 }}>
                नीचे स्क्रॉल करें और <strong>&quot;Add to Home Screen (होम स्क्रीन में जोड़ें)&quot;</strong> विकल्प चुनें।
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: '#ecfdf5', color: '#047857', padding: '2px 8px', borderRadius: '6px', marginTop: '4px', fontWeight: 700, fontSize: '12px' }}>
                  <PlusSquare size={13} /> Add to Home Screen
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', background: '#f8fafc', padding: '12px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
              <span style={{ width: '24px', height: '24px', borderRadius: '50%', background: '#059669', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 800, flexShrink: 0 }}>✓</span>
              <div style={{ fontSize: '13px', color: '#1e293b', lineHeight: 1.5 }}>
                Chrome / Browser मेनू (ऊपर दायें कोने में <strong>तीन डॉट्स ⋮</strong>) पर टैप करें और <strong>&quot;Install app&quot;</strong> या <strong>&quot;Add to Home Screen&quot;</strong> चुनें।
              </div>
            </div>
          </div>
        )}

        <button
          type="button"
          onClick={onClose}
          style={{
            width: '100%',
            padding: '12px',
            borderRadius: '12px',
            background: '#047857',
            color: '#ffffff',
            border: 'none',
            fontWeight: 700,
            fontSize: '14px',
            cursor: 'pointer',
          }}
        >
          समझ गया (Got it)
        </button>
      </div>
    </div>
  );
}
