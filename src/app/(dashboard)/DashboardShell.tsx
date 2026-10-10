'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Activity,
  Building2,
  ChevronLeft,
  ChevronRight,
  Command,
  ContactRound,
  Database,
  History,
  LayoutDashboard,
  LogOut,
  MapPin,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  ShieldCheck,
  Ticket,
  UserCog,
  UsersRound,
  X,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api';

const navigation = [
  { module: 'voters', label: 'मतदाता सूची', subtitle: 'Voter directory', href: '/', icon: UsersRound },
  { module: 'voters', label: 'मतदाता पर्ची', subtitle: 'Slip studio & print', href: '/slips', icon: Ticket },
  { module: 'poll-desk', label: 'मतदान डेस्क', subtitle: 'Booth operations', href: '/poll-desk', icon: LayoutDashboard },
  { module: 'turnout', label: 'मतदान स्थिति', subtitle: 'Turnout overview', href: '/turnout', icon: Activity },
  { module: 'warroom', label: 'वॉर रूम', subtitle: 'Field overview', href: '/warroom', icon: ShieldCheck },
  { module: 'migrants', label: 'प्रवासी मतदाता', subtitle: 'Migrant voters', href: '/migrants', icon: MapPin },
  { module: 'community', label: 'समुदाय खोज', subtitle: 'Household lookup', href: '/community', icon: UsersRound },
  { module: 'workers', label: 'कार्यकर्ता', subtitle: 'Field team', href: '/workers', icon: ContactRound },
  { module: 'history', label: 'पर्ची इतिहास', subtitle: 'Dispatch audit', href: '/history', icon: History },
  { module: 'accounts', label: 'यूज़र व एक्सेस', subtitle: 'Roles & permissions', href: '/accounts', icon: UserCog },
  { module: 'admin', label: 'एडमिन पैनल', subtitle: 'Master data & access', href: '/admin', icon: Database },
];

const pageTitles = new Map([
  ['/', 'मतदाता सूची'],
  ['/slips', 'मतदाता पर्ची'],
  ['/poll-desk', 'मतदान डेस्क'],
  ['/turnout', 'मतदान स्थिति'],
  ['/warroom', 'वॉर रूम'],
  ['/migrants', 'प्रवासी मतदाता'],
  ['/community', 'समुदाय खोज'],
  ['/workers', 'कार्यकर्ता'],
  ['/history', 'पर्ची इतिहास'],
  ['/accounts', 'यूज़र व एक्सेस'],
  ['/admin', 'एडमिन पैनल'],
]);
const pageModules = new Map([
  ['/', 'voters'],
  ['/slips', 'voters'],
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
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [health, setHealth] = useState<Health>('checking');
  const [allowedModules, setAllowedModules] = useState<string[] | null>(null);
  const [userInfo, setUserInfo] = useState<{ role?: string; name?: string; email?: string; organizationId?: string; organizationName?: string }>({});
  const [clients, setClients] = useState<Array<{ id: string; name: string; candidateName?: string; voterCount?: number }>>([]);
  const [selectedClientId, setSelectedClientId] = useState<string>('');

  useEffect(() => {
    if (pathname === '/') return;
    const timeout = window.setTimeout(() => setMobileOpen(false), 0);
    return () => window.clearTimeout(timeout);
  }, [pathname]);

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
    if (requiredModule && !allowedModules.includes(requiredModule)) {
      const fallback = navigation.find(({ module }) => module !== 'admin' && allowedModules.includes(module));
      router.replace(fallback?.href ?? '/login');
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
  const selectedClient = clients.find((c) => c.id === selectedClientId);
  const activeWorkspaceTitle = selectedClient
    ? `${selectedClient.name.toUpperCase()} · FIELD WORKSPACE`
    : userInfo.organizationName
    ? `${userInfo.organizationName.toUpperCase()} · FIELD WORKSPACE`
    : userInfo.role === 'admin'
    ? 'ALL CLIENTS · CENTRAL WORKSPACE'
    : 'VIJAYSETU · FIELD WORKSPACE';

  const signOut = () => {
    window.localStorage.removeItem('token');
    router.push('/login');
  };

  return (
    <div className="app-shell">
      {mobileOpen && (
        <button
          aria-label="Close navigation"
          className="mobile-scrim"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <aside className={`app-sidebar ${collapsed ? 'is-collapsed' : ''} ${mobileOpen ? 'is-mobile-open' : ''}`}>
        <div className="brand-lockup">
          <div className="brand-mark" aria-hidden="true" style={{ padding: '4px', overflow: 'hidden' }}>
            <img src="/logo.png" alt="VijaySetu Logo" style={{ width: '100%', height: '100%', objectFit: 'contain', borderRadius: '4px' }} />
          </div>
          <div className="brand-copy">
            <span className="brand-name">VijaySetu</span>
            <span className="brand-caption">FIELD OPERATIONS</span>
          </div>
          <button
            className="icon-button sidebar-mobile-close"
            aria-label="Close navigation"
            onClick={() => setMobileOpen(false)}
          >
            <X size={18} />
          </button>
        </div>

        <div className="nav-section-label">WORKSPACE</div>
        <nav className="primary-nav" aria-label="Primary navigation">
          {navigation.filter(({ module }) => !allowedModules || allowedModules.includes(module)).map(({ label, subtitle, href, icon: Icon }) => {
            const isActive = pathname === href;
            return (
              <Link
                className={`nav-link ${isActive ? 'is-active' : ''}`}
                href={href}
                key={href}
                onClick={() => setMobileOpen(false)}
                title={collapsed ? `${label} · ${subtitle}` : undefined}
                aria-current={isActive ? 'page' : undefined}
              >
                <span className="nav-icon"><Icon size={18} strokeWidth={1.8} /></span>
                <span className="nav-copy">
                  <span className="nav-label">{label}</span>
                  <span className="nav-subtitle">{subtitle}</span>
                </span>
                {isActive && <span className="nav-indicator" />}
              </Link>
            );
          })}
        </nav>

        <div className="sidebar-spacer" />
        <button className="sign-out-button" onClick={signOut} title={collapsed ? 'लॉगआउट' : undefined}>
          <LogOut size={17} strokeWidth={1.8} />
          <span>लॉगआउट</span>
        </button>
        <div className="sidebar-bottom">
          <span className="profile-avatar">{userInfo.name ? userInfo.name.charAt(0).toUpperCase() : 'U'}</span>
          <span className="profile-copy">
            <strong>{userInfo.name || userInfo.email || 'User'}</strong>
            <small>{userInfo.role === 'admin' ? 'System Admin' : 'Operations desk'}</small>
          </span>
          <button
            className="collapse-button"
            onClick={() => setCollapsed((value) => !value)}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            aria-expanded={!collapsed}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? <PanelLeftOpen size={17} /> : <PanelLeftClose size={17} />}
          </button>
        </div>
      </aside>

      <div className="app-main">
        <header className="topbar">
          <div className="topbar-start">
            <button className="icon-button mobile-menu-button" aria-label="Open navigation" onClick={() => setMobileOpen(true)}>
              <Menu size={20} />
            </button>
            <button
              className="icon-button desktop-menu-button"
              aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              onClick={() => setCollapsed((value) => !value)}
              title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {collapsed ? <PanelLeftOpen size={19} /> : <PanelLeftClose size={19} />}
            </button>
            <div className="topbar-heading">
              <span className="topbar-eyebrow">{activeWorkspaceTitle}</span>
              <span className="topbar-title">{activePage}</span>
            </div>
          </div>

          {/* TOPBAR CLIENT SELECTOR (Admin) OR BADGE (Client) */}
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
                  <option value="">🌐 सभी क्लाइंट्स ({clients.length} सक्रिय)</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      🏢 {c.name} {c.candidateName ? `(${c.candidateName})` : ''} • {c.voterCount ? `${c.voterCount.toLocaleString('hi-IN')} वोटर` : '0 वोटर'}
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
                    ✕
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

          <div className="topbar-meta">
            <span className={`connection-pill ${health}`}>
              <span className={`status-dot status-${health}`} />
              {health === 'connected' ? 'Live data' : health === 'offline' ? 'Offline' : 'Checking'}
            </span>
            <span className="topbar-divider" />
            <span className="topbar-date">Election operations</span>
          </div>
          <button className="icon-button mobile-collapse-spacer" aria-hidden="true" tabIndex={-1}>
            <ChevronLeft size={18} />
          </button>
        </header>
        <main className="page-content" key={selectedClientId || 'all'}>{children}</main>
        <footer className="app-footer" style={{ justifyContent: 'center' }}>
          <span>©️ 2026 VijaySetu. All Rights Reserved. | Powered by <a href="https://morihix.com/" target="_blank" rel="noopener noreferrer" style={{ color: '#27332d', fontWeight: 600, textDecoration: 'none' }}>Morihix Pvt. Ltd</a></span>
        </footer>
      </div>
    </div>
  );
}
