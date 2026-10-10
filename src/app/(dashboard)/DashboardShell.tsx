'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Building2,
  ChevronLeft,
  LogOut,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api';

const pageTitles = new Map([
  ['/', 'मुख्य डैशबोर्ड'],
  ['/slips', 'मतदाता खोज व पर्ची'],
  ['/voters', 'परिवार व मुखिया प्रबंधन'],
  ['/poll-desk', 'मतदान दिवस डेस्क'],
  ['/turnout', 'लाइव टर्नआउट'],
  ['/warroom', 'राजनीतिक वॉर-रूम'],
  ['/migrants', 'प्रवासी मतदाता'],
  ['/community', 'समुदाय व सामाजिक समीकरण'],
  ['/workers', 'कार्यकर्ता प्रबंधन'],
  ['/history', 'भेजी गई पर्चियाँ (ऑडिट)'],
  ['/accounts', 'खाते व अनुमतियाँ'],
  ['/admin', 'सुपर एडमिन कंसोल'],
]);

const pageModules = new Map([
  ['/', 'home'],
  ['/slips', 'voters'],
  ['/voters', 'voters'],
  ['/poll-desk', 'poll-desk'],
  ['/turnout', 'turnout'],
  ['/warroom', 'warroom'],
  ['/migrants', 'migrants'],
  ['/community', 'community'],
  ['/workers', 'workers'],
  ['/history', 'history'],
  ['/accounts', 'accounts'],
  ['/admin', 'admin'],
]);

type Health = 'checking' | 'connected' | 'offline';

export default function DashboardShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [health, setHealth] = useState<Health>('checking');
  const [allowedModules, setAllowedModules] = useState<string[] | null>(null);
  const [userInfo, setUserInfo] = useState<{ role?: string; name?: string; email?: string; organizationId?: string; organizationName?: string }>({});
  const [clients, setClients] = useState<Array<{ id: string; name: string; candidateName?: string; voterCount?: number }>>([]);
  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const [isSuspended, setIsSuspended] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return window.localStorage.getItem('account_suspended') === 'true';
    }
    return false;
  });

  useEffect(() => {
    const handleSuspended = () => {
      setIsSuspended(true);
    };
    window.addEventListener('account-suspended', handleSuspended);
    return () => window.removeEventListener('account-suspended', handleSuspended);
  }, []);

  // Periodic active status verification (Heartbeat every 10s)
  useEffect(() => {
    let active = true;
    const verifyStatus = async () => {
      const token = window.localStorage.getItem('token');
      if (!token) return;
      try {
        const res = await apiFetch('/auth/status', { cache: 'no-store' });
        if (res.status === 403) {
          if (active) setIsSuspended(true);
        } else if (res.ok) {
          if (active && window.localStorage.getItem('account_suspended') === 'true') {
            window.localStorage.removeItem('account_suspended');
            setIsSuspended(false);
          }
        }
      } catch {
        // ignore network error
      }
    };

    void verifyStatus();
    const interval = window.setInterval(verifyStatus, 10_000);
    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    let active = true;
    void Promise.resolve().then(() => {
      const token = window.localStorage.getItem('token');
      if (!token) {
        window.location.href = '/login';
        return;
      }
      try {
        const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))) as {
          user?: { role?: string; modules?: unknown; name?: string; email?: string; organizationId?: string; organizationName?: string };
        };
        if (payload.user) {
          setUserInfo(payload.user);
          if (payload.user.role !== 'admin') {
            window.localStorage.removeItem('selectedClientOrgId');
            setSelectedClientId('');
          }
        }
        if (payload.user?.role === 'admin') return;
        if (active) setAllowedModules(Array.isArray(payload.user?.modules)
          ? payload.user.modules.filter((module): module is string => typeof module === 'string')
          : []);
      } catch {
        if (active) setAllowedModules([]);
      }
    });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    const saved = typeof window !== 'undefined' ? window.localStorage.getItem('selectedClientOrgId') || '' : '';
    setSelectedClientId(saved);

    const loadClients = async () => {
      try {
        const res = await apiFetch('/auth/clients', { cache: 'no-store' });
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data)) setClients(data);
        }
      } catch {
        // ignore
      }
    };
    void loadClients();
  }, []);

  const handleClientSwitch = (newId: string) => {
    setSelectedClientId(newId);
    if (!newId || newId === 'all') {
      window.localStorage.removeItem('selectedClientOrgId');
    } else {
      window.localStorage.setItem('selectedClientOrgId', newId);
    }
    window.dispatchEvent(new CustomEvent('client-changed', { detail: { organizationId: newId } }));
  };

  useEffect(() => {
    if (!allowedModules) return;
    const requiredModule = pageModules.get(pathname);
    if (requiredModule && requiredModule !== 'home' && !allowedModules.includes(requiredModule)) {
      router.replace('/');
    }
  }, [allowedModules, pathname, router]);

  useEffect(() => {
    let active = true;
    const checkHealth = async () => {
      try {
        const response = await apiFetch('/health', { cache: 'no-store' });
        const result = response.ok ? await response.json() : null;
        if (active) setHealth(result?.database === 'connected' ? 'connected' : 'offline');
      } catch {
        if (active) setHealth('offline');
      }
    };

    void checkHealth();
    const interval = window.setInterval(checkHealth, 30_000);
    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, []);

  const activePage = pageTitles.get(pathname) ?? 'Workspace';

  const signOut = () => {
    window.localStorage.removeItem('token');
    router.push('/login');
  };

  return (
    <div className="app-shell" style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: '#f8fafc', overflowX: 'hidden' }}>
      {/* Top Header Bar with VijaySetu Logo, Name, Back Button & Controls */}
      <header
        className="topbar"
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 40,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          minHeight: '60px',
          background: '#ffffff',
          borderBottom: '1px solid #e2e8f0',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
        }}
      >
        {/* Left: Brand Identity (Logo + VijaySetu Name) & Back Button */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
          <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '8px', textDecoration: 'none', flexShrink: 0 }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
                boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
                flexShrink: 0,
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo.png" alt="VijaySetu Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <span style={{ fontSize: '17px', fontWeight: 900, color: '#0f172a', letterSpacing: '-0.3px', lineHeight: 1.1 }}>
                  VijaySetu
                </span>
                <span
                  className="hidden sm:inline-block"
                  style={{
                    fontSize: '10px',
                    fontWeight: 700,
                    color: '#047857',
                    background: '#ecfdf5',
                    border: '1px solid #a7f3d0',
                    padding: '1px 5px',
                    borderRadius: '8px',
                  }}
                >
                  विजयसेतु
                </span>
              </div>
              <span className="hidden md:inline-block" style={{ fontSize: '10.5px', color: '#64748b', fontWeight: 600 }}>
                चुनाव प्रबंधन प्रणाली
              </span>
            </div>
          </Link>

          {/* When on Subpage: Prominent "← मुख्य मेन्यू" Back Button */}
          {pathname !== '/' && (
            <Link
              href="/"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                padding: '5px 10px',
                borderRadius: '7px',
                background: '#047857',
                color: '#ffffff',
                fontSize: '11.5px',
                fontWeight: 700,
                textDecoration: 'none',
                boxShadow: '0 2px 5px rgba(4, 120, 87, 0.2)',
                marginLeft: '6px',
                cursor: 'pointer',
                flexShrink: 0,
              }}
              title="मुख्य मेन्यू पर वापस जाएं"
            >
              <ChevronLeft size={15} />
              <span className="hidden sm:inline">मुख्य मेन्यू</span>
              <span className="sm:hidden">मेन्यू</span>
            </Link>
          )}

          {/* Subpage Title (Visible on larger screens) */}
          {pathname !== '/' && (
            <div className="hidden lg:block" style={{ marginLeft: '6px', borderLeft: '1px solid #cbd5e1', paddingLeft: '10px' }}>
              <span style={{ fontSize: '13px', fontWeight: 700, color: '#1e293b', whiteSpace: 'nowrap' }}>
                {activePage}
              </span>
            </div>
          )}
        </div>

        {/* Center: Client Selector (Admin) or Client Badge (Non-Admin) */}
        <div className="topbar-client-container" style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
          {userInfo.role === 'admin' ? (
            <div className="topbar-client-selector-box" title="सक्रिय क्लाइंट चुनें (डेटा केवल इस क्लाइंट का दिखेगा)">
              <Building2 size={14} className="text-emerald-700 shrink-0" />
              <span className="client-select-label">क्लाइंट:</span>
              <select
                value={selectedClientId}
                onChange={(e) => handleClientSwitch(e.target.value)}
                className="topbar-client-select"
                aria-label="क्लाइंट चुनें"
              >
                <option value="">सभी क्लाइंट्स ({clients.length} सक्रिय)</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} {c.candidateName ? `(${c.candidateName})` : ''} • {c.voterCount ? `${c.voterCount.toLocaleString('hi-IN')} वोटर` : '0 वोटर'}
                  </option>
                ))}
              </select>
              {selectedClientId && (
                <button
                  type="button"
                  className="client-clear-btn"
                  onClick={() => handleClientSwitch('')}
                  title="सभी क्लाइंट्स देखें"
                  aria-label="फिल्टर हटाएं"
                >
                  ×
                </button>
              )}
            </div>
          ) : (
            <div className="topbar-client-fixed-badge" title="आप केवल अपने अधिकृत क्लाइंट का डेटा देख सकते हैं">
              <Building2 size={13} className="text-emerald-600 shrink-0" />
              <span className="fixed-client-name" style={{ maxWidth: '140px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {userInfo.organizationName || 'आपका चुनावी क्षेत्र'}
              </span>
              <span className="fixed-client-tag hidden sm:inline-block">क्लाइंट डेटा</span>
            </div>
          )}
        </div>

        {/* Right: Live Status + User Profile + Logout */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
          <span className={`connection-pill ${health}`} style={{ padding: '6px 10px', fontSize: '11px' }}>
            <span className={`status-dot status-${health}`} />
            <span className="hidden sm:inline">
              {health === 'connected' ? 'Live data' : health === 'offline' ? 'Offline' : 'Checking'}
            </span>
          </span>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              paddingLeft: '6px',
              borderLeft: '1px solid #e2e8f0',
            }}
          >
            <span
              style={{
                width: '30px',
                height: '30px',
                borderRadius: '50%',
                background: '#ecfdf5',
                color: '#047857',
                border: '1.5px solid #a7f3d0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 800,
                fontSize: '12px',
                flexShrink: 0,
              }}
            >
              {userInfo.name ? userInfo.name.charAt(0).toUpperCase() : 'U'}
            </span>
            <div className="hidden md:flex" style={{ flexDirection: 'column' }}>
              <span style={{ fontSize: '12px', fontWeight: 700, color: '#0f172a', maxWidth: '110px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {userInfo.name || userInfo.email || 'User'}
              </span>
              <span style={{ fontSize: '10px', color: '#64748b' }}>
                {userInfo.role === 'admin' ? 'Super Admin' : 'Operations Desk'}
              </span>
            </div>
          </div>

          <button
            onClick={signOut}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              padding: '6px 10px',
              borderRadius: '7px',
              background: '#fef2f2',
              border: '1px solid #fecaca',
              color: '#dc2626',
              fontSize: '11.5px',
              fontWeight: 600,
              cursor: 'pointer',
              marginLeft: '2px',
            }}
            title="लॉगआउट"
          >
            <LogOut size={13} />
            <span className="hidden sm:inline">लॉगआउट</span>
          </button>
        </div>
      </header>

      {/* Main Full-Width Content Container */}
      <main className="page-content" style={{ flex: 1, padding: 0, width: '100%', maxWidth: '100%' }} key={selectedClientId || 'all'}>
        {children}
      </main>

      {/* Footer */}
      <footer className="app-footer" style={{ justifyContent: 'center', textAlign: 'center', flexWrap: 'wrap', gap: '6px' }}>
        <span>&copy; 2026 VijaySetu &bull; Roots Reach Media. All Rights Reserved. &bull; <a href="/privacy" style={{ color: '#27332d', fontWeight: 600, textDecoration: 'underline' }}>Privacy Policy</a> &bull; <a href="/terms" style={{ color: '#27332d', fontWeight: 600, textDecoration: 'underline' }}>Terms of Service</a> &bull; 📞 7231077770</span>
      </footer>

      {/* FULL-SCREEN SUSPENSION LOCKOUT MODAL */}
      {isSuspended && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999999,
            background: 'rgba(15, 23, 42, 0.94)',
            backdropFilter: 'blur(14px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
          }}
          role="dialog"
          aria-modal="true"
        >
          <div
            style={{
              maxWidth: '520px',
              width: '100%',
              maxHeight: '92vh',
              overflowY: 'auto',
              background: '#ffffff',
              borderRadius: '20px',
              padding: '28px 22px',
              textAlign: 'center',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
              border: '2px solid #ef4444',
            }}
          >
            <div
              style={{
                width: '76px',
                height: '76px',
                margin: '0 auto 20px',
                background: '#fef2f2',
                border: '2px solid #fecaca',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#dc2626',
                fontSize: '36px',
              }}
            >
              ⛔
            </div>

            <span
              style={{
                display: 'inline-block',
                padding: '4px 14px',
                borderRadius: '20px',
                fontSize: '12px',
                fontWeight: 800,
                letterSpacing: '0.05em',
                background: '#fef2f2',
                color: '#b91c1c',
                border: '1px solid #fca5a5',
                marginBottom: '14px',
              }}
            >
              खाता बंद / निलंबित (ACCOUNT SUSPENDED)
            </span>

            <h2 style={{ fontSize: '22px', fontWeight: 900, color: '#0f172a', marginBottom: '12px', lineHeight: 1.35 }}>
              आपका खाता एडमिन द्वारा बंद किया गया है
            </h2>

            <p style={{ fontSize: '15px', color: '#475569', lineHeight: 1.6, marginBottom: '22px' }}>
              इस खाते की सेवाएं अस्थायी रूप से रोक दी गई हैं। कृपया आगे की सेवा व खाता पुनः सक्रिय करने के लिए तुरंत एडमिन से संपर्क करें।
            </p>

            <div
              style={{
                background: '#f8fafc',
                border: '1.5px solid #e2e8f0',
                borderRadius: '16px',
                padding: '18px 20px',
                marginBottom: '24px',
                textAlign: 'left',
              }}
            >
              <div style={{ fontSize: '11px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>
                एडमिन संपर्क विवरण
              </div>
              <div style={{ fontSize: '19px', fontWeight: 900, color: '#0f172a', marginBottom: '4px' }}>
                Roots Reach Media
              </div>
              <div style={{ fontSize: '17px', fontWeight: 800, color: '#2563eb' }}>
                📞 +91 72310 77770
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <a
                href="tel:7231077770"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  padding: '14px',
                  borderRadius: '12px',
                  background: '#2563eb',
                  color: '#ffffff',
                  fontWeight: 800,
                  fontSize: '15px',
                  textDecoration: 'none',
                  boxShadow: '0 4px 12px rgba(37, 99, 235, 0.3)',
                }}
              >
                📞 तुरंत कॉल करें (+91 72310 77770)
              </a>

              <a
                href="https://wa.me/917231077770?text=%E0%A4%A8%E0%A4%AE%E0%A4%B8%E0%A5%8D%E0%A4%A4%E0%A5%87%20Roots%20Reach%20Media%2C%20%E0%A4%AE%E0%A5%87%E0%A4%B0%E0%A4%BE%20%E0%A4%B5%E0%A4%BF%E0%A4%9C%E0%A4%AF%E0%A4%B8%E0%A5%87%E0%A4%A4%E0%A5%81%20%E0%A4%96%E0%A4%BE%E0%A4%A4%E0%A4%BE%20%E0%A4%8F%E0%A4%A1%E0%A4%AE%E0%A4%BF%E0%A4%A8%20%E0%A4%A6%E0%A5%8D%E0%A4%B5%E0%A4%BE%E0%A4%B0%E0%A4%BE%20%E0%A4%AC%E0%A4%82%E0%A4%A6%20(%E0%A4%A8%E0%A4%BF%E0%A4%B2%E0%A4%82%E0%A4%AC%E0%A4%BF%E0%A4%A4)%20%E0%A4%95%E0%A4%BF%E0%A4%AF%E0%A4%BE%20%E0%A4%97%E0%A4%AF%E0%A4%BE%20%E0%A4%B9%E0%A5%88%E0%A5%A4%20%E0%A4%95%E0%A5%83%E0%A4%AA%E0%A4%AF%E0%A4%BE%20%E0%A4%87%E0%A4%B8%E0%A5%87%20%E0%A4%AA%E0%A5%81%E0%A4%A8%E0%A4%83%20%E0%A4%9A%E0%A4%BE%E0%A4%B2%E0%A5%82%20%E0%A4%95%E0%A4%B0%E0%A5%87%E0%A4%82%E0%A5%A4"
                target="_blank"
                rel="noreferrer"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  padding: '14px',
                  borderRadius: '12px',
                  background: '#16a34a',
                  color: '#ffffff',
                  fontWeight: 800,
                  fontSize: '15px',
                  textDecoration: 'none',
                  boxShadow: '0 4px 12px rgba(22, 163, 74, 0.3)',
                }}
              >
                💬 WhatsApp पर सहायता प्राप्त करें
              </a>

              <button
                type="button"
                onClick={signOut}
                style={{
                  padding: '12px',
                  borderRadius: '12px',
                  background: '#f1f5f9',
                  color: '#64748b',
                  fontWeight: 700,
                  fontSize: '14px',
                  border: '1px solid #cbd5e1',
                  cursor: 'pointer',
                  marginTop: '4px',
                }}
              >
                साइन आउट (लॉगआउट)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
