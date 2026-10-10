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
    <div className="app-shell" style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: '#f8fafc' }}>
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
          minHeight: '64px',
          padding: '0 24px',
          background: '#ffffff',
          borderBottom: '1px solid #e2e8f0',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
        }}
      >
        {/* Left: Brand Identity (Logo + VijaySetu Name) & Back Button */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none' }}>
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '8px',
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
                boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo.png" alt="VijaySetu Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '18px', fontWeight: 900, color: '#0f172a', letterSpacing: '-0.3px', lineHeight: 1.1 }}>
                  VijaySetu
                </span>
                <span
                  style={{
                    fontSize: '10.5px',
                    fontWeight: 700,
                    color: '#047857',
                    background: '#ecfdf5',
                    border: '1px solid #a7f3d0',
                    padding: '1px 6px',
                    borderRadius: '10px',
                  }}
                >
                  विजयसेतु
                </span>
              </div>
              <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>
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
                gap: '6px',
                padding: '6px 14px',
                borderRadius: '8px',
                background: '#047857',
                color: '#ffffff',
                fontSize: '12.5px',
                fontWeight: 700,
                textDecoration: 'none',
                boxShadow: '0 2px 6px rgba(4, 120, 87, 0.25)',
                marginLeft: '12px',
                cursor: 'pointer',
                transition: 'background 0.15s ease',
              }}
              title="मुख्य मेन्यू पर वापस जाएं"
            >
              <ChevronLeft size={16} />
              <span>मुख्य मेन्यू</span>
            </Link>
          )}

          {/* Subpage Title */}
          {pathname !== '/' && (
            <div style={{ marginLeft: '8px', borderLeft: '1px solid #cbd5e1', paddingLeft: '12px' }}>
              <span style={{ fontSize: '13.5px', fontWeight: 700, color: '#1e293b' }}>
                {activePage}
              </span>
            </div>
          )}
        </div>

        {/* Center: Client Selector (Admin) or Client Badge (Non-Admin) */}
        <div className="topbar-client-container">
          {userInfo.role === 'admin' ? (
            <div className="topbar-client-selector-box" title="सक्रिय क्लाइंट चुनें (डेटा केवल इस क्लाइंट का दिखेगा)">
              <Building2 size={15} className="text-emerald-700 shrink-0" />
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
              <Building2 size={14} className="text-emerald-600 shrink-0" />
              <span className="fixed-client-name">
                {userInfo.organizationName || 'आपका चुनावी क्षेत्र'}
              </span>
              <span className="fixed-client-tag">क्लाइंट डेटा</span>
            </div>
          )}
        </div>

        {/* Right: Live Status + User Profile + Logout */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span className={`connection-pill ${health}`}>
            <span className={`status-dot status-${health}`} />
            {health === 'connected' ? 'Live data' : health === 'offline' ? 'Offline' : 'Checking'}
          </span>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              paddingLeft: '10px',
              borderLeft: '1px solid #e2e8f0',
            }}
          >
            <span
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                background: '#ecfdf5',
                color: '#047857',
                border: '1.5px solid #a7f3d0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 800,
                fontSize: '13px',
              }}
            >
              {userInfo.name ? userInfo.name.charAt(0).toUpperCase() : 'U'}
            </span>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '12px', fontWeight: 700, color: '#0f172a' }}>
                {userInfo.name || userInfo.email || 'User'}
              </span>
              <span style={{ fontSize: '10.5px', color: '#64748b' }}>
                {userInfo.role === 'admin' ? 'Super Admin' : 'Operations Desk'}
              </span>
            </div>
          </div>

          <button
            onClick={signOut}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              padding: '6px 12px',
              borderRadius: '8px',
              background: '#fef2f2',
              border: '1px solid #fecaca',
              color: '#dc2626',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
              marginLeft: '4px',
            }}
            title="लॉगआउट"
          >
            <LogOut size={14} />
            <span>लॉगआउट</span>
          </button>
        </div>
      </header>

      {/* Main Full-Width Content Container */}
      <main className="page-content" style={{ flex: 1, padding: 0, width: '100%', maxWidth: '100%' }} key={selectedClientId || 'all'}>
        {children}
      </main>

      {/* Footer */}
      <footer className="app-footer" style={{ justifyContent: 'center' }}>
        <span>&copy; 2026 VijaySetu. All Rights Reserved. &bull; <a href="/privacy" style={{ color: '#27332d', fontWeight: 600, textDecoration: 'underline' }}>Privacy Policy</a> &bull; <a href="/terms" style={{ color: '#27332d', fontWeight: 600, textDecoration: 'underline' }}>Terms of Service</a></span>
      </footer>
    </div>
  );
}
