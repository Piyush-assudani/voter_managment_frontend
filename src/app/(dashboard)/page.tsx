'use client';

import React, { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import {
  CheckSquare,
  Activity,
  TrendingUp,
  Tag,
  ContactRound,
  Plane,
  Send,
  UserCog,
  Database,
  ShieldCheck,
  Ticket,
  Users,
  ArrowRight,
  Vote,
  Sparkles,
} from 'lucide-react';
import { apiFetch, decodeJwtPayload } from '@/lib/api';
import { PwaInstallDashboardCard } from '@/components/PwaInstall';

interface NavModule {
  id: string;
  name: string;
  subtitle: string;
  href: string;
  icon: React.ComponentType<{ size?: number; className?: string; color?: string; strokeWidth?: number }>;
  color: string;
  module: string;
  metaBadge?: string;
  adminOnly?: boolean;
  highlight?: boolean;
}

// Section A: Core Election Operations & Management
const coreAndWarroomModules: NavModule[] = [
  {
    id: 'voters',
    name: 'मतदाता खोज व पर्ची',
    subtitle: 'मतदाता खोज, परिवार व 1-क्लिक WhatsApp पर्ची',
    href: '/voters',
    icon: Ticket,
    color: '#2563eb', // Royal Blue
    module: 'voters',
    metaBadge: '1-क्लिक पर्ची',
  },
  {
    id: 'poll-desk',
    name: 'मतदान दिवस डेस्क',
    subtitle: 'बूथ-वार मतदाताओं की तुरंत लाइव मार्किंग',
    href: '/poll-desk',
    icon: CheckSquare,
    color: '#059669', // Emerald Green (Featured in Screenshot)
    module: 'poll-desk',
    metaBadge: 'लाइव पोलिंग',
    highlight: true,
  },
  {
    id: 'turnout',
    name: 'लाइव टर्नआउट ट्रैकर',
    subtitle: 'बूथ-वार मतदान प्रतिशत, रुझान व गति विश्लेषण',
    href: '/turnout',
    icon: Activity,
    color: '#0284c7', // Cyan Blue
    module: 'turnout',
    metaBadge: 'रियल-टाइम ग्राफ',
  },
  {
    id: 'warroom',
    name: 'इलेक्शन मैनेजमेंट',
    subtitle: 'जीत-हार समीकरण, निर्णायक बढ़त व प्रमुख आंकड़े',
    href: '/warroom',
    icon: TrendingUp,
    color: '#db2777', // Rose Pink
    module: 'warroom',
    metaBadge: 'समीकरण व बढ़त',
  },
  {
    id: 'community',
    name: 'समुदाय व सामाजिक समीकरण',
    subtitle: 'वार्ड व बूथ अनुसार जातिगत मतदाता समीकरण व बाहुल्यता',
    href: '/community',
    icon: Tag,
    color: '#7c3aed', // Purple
    module: 'community',
    metaBadge: 'जातिगत जनसांख्यिकी',
  },
];

// Section B: Field Operations, Distribution & Administration
const fieldAndAdminModules: NavModule[] = [
  {
    id: 'slips',
    name: 'बल्क पर्ची प्रिंट शीट',
    subtitle: 'A4 कागज़ पर 8-8 मतदाता पर्चियाँ एक साथ प्रिंट करें',
    href: '/slips',
    icon: Users,
    color: '#f97316', // Amber Coral
    module: 'voters',
    metaBadge: '8-in-1 A4 शीट',
  },
  {
    id: 'workers',
    name: 'कार्यकर्ता व पन्ना प्रमुख',
    subtitle: 'कार्यकर्ताओं को पन्ना, बूथ व वार्ड की ज़िम्मेदारी सौंपें',
    href: '/workers',
    icon: ContactRound,
    color: '#4f46e5', // Indigo
    module: 'workers',
    metaBadge: 'फील्ड टीम',
  },
  {
    id: 'migrants',
    name: 'प्रवासी मतदाता सूची',
    subtitle: 'गाँव/शहर से बाहर रहने वाले मतदाताओं की कॉलिंग लिस्ट',
    href: '/migrants',
    icon: Plane,
    color: '#0d9488', // Teal
    module: 'migrants',
    metaBadge: 'कॉलिंग समन्वय',
  },
  {
    id: 'history',
    name: 'भेजी गई पर्चियाँ ऑडिट',
    subtitle: 'WhatsApp पर्ची वितरण रिकॉर्ड, स्थिति व डिलीवरी लॉग',
    href: '/history',
    icon: Send,
    color: '#ea580c', // Orange
    module: 'history',
    metaBadge: 'डिस्पैच लॉग',
  },
  {
    id: 'accounts',
    name: 'खाते व अनुमतियाँ',
    subtitle: 'प्रत्याशी टीम, व्यवस्थापक व कार्यकर्ताओं के सुरक्षित लॉगिन',
    href: '/accounts',
    icon: UserCog,
    color: '#dc2626', // Red
    module: 'accounts',
    metaBadge: 'सुरक्षित एक्सेस',
  },
  {
    id: 'admin',
    name: 'सुपर एडमिन कंसोल',
    subtitle: 'वोटर लिस्ट OCR, पर्ची ब्रांडिंग व संपूर्ण सिस्टम सेटिंग्स',
    href: '/admin',
    icon: Database,
    color: '#065f46', // Forest Teal
    module: 'admin',
    adminOnly: true,
    highlight: true,
    metaBadge: 'सिस्टम कंट्रोल',
  },
];

export default function DashboardHomePage() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [allowedModules, setAllowedModules] = useState<string[] | null>(null);
  const [userInfo, setUserInfo] = useState<{
    name?: string;
    organizationName?: string;
    role?: string;
  }>({});
  const [stats, setStats] = useState<{
    totalVoters: number;
    wardCount: number;
    votedCount: number;
    turnoutPercent: number;
    dispatchesCount: number;
  }>({
    totalVoters: 0,
    wardCount: 0,
    votedCount: 0,
    turnoutPercent: 0,
    dispatchesCount: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      const token = window.localStorage.getItem('token');
      if (token) {
        const payload = decodeJwtPayload<{
          user?: { name?: string; organizationName?: string; role?: string; modules?: string[] };
        }>(token);
        const user = payload?.user;
        if (user) {
          setUserInfo({
            name: user.name,
            organizationName: user.organizationName,
            role: user.role,
          });
          setIsAdmin(user.role === 'admin');
          if (user.role !== 'admin' && Array.isArray(user.modules)) {
            setAllowedModules(user.modules);
          }
        }
      }
    } catch {}
  }, []);

  const isWorker = userInfo.role === 'worker';

  // Filter modules helper: workers ONLY see modules explicitly assigned to them
  const filterList = (list: NavModule[]) => {
    return list.filter((mod) => {
      if (mod.adminOnly && !isAdmin) return false;
      if (isWorker) {
        if (mod.module === 'accounts' || mod.module === 'admin') return false;
        return Array.isArray(allowedModules) && allowedModules.includes(mod.module);
      }
      if (allowedModules && !allowedModules.includes(mod.module) && !isAdmin) return false;
      return true;
    });
  };

  const visibleCore = useMemo(() => filterList(coreAndWarroomModules), [isAdmin, isWorker, allowedModules]);
  const visibleField = useMemo(() => filterList(fieldAndAdminModules), [isAdmin, isWorker, allowedModules]);

  // Load real data stats
  const loadStats = async () => {
    setLoading(true);
    const start = Date.now();
    try {
      const res = await apiFetch('/features/dashboard', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        if (data) {
          setStats({
            totalVoters: typeof data.totalVoters === 'number' ? data.totalVoters : 0,
            wardCount: typeof data.wardCount === 'number' ? data.wardCount : 0,
            votedCount: typeof data.votedCount === 'number' ? data.votedCount : 0,
            turnoutPercent: typeof data.turnoutPercent === 'number' ? data.turnoutPercent : 0,
            dispatchesCount: typeof data.dispatchesCount === 'number' ? data.dispatchesCount : 0,
          });
        }
      } else {
        const vRes = await apiFetch('/voters?page=1&pageSize=1', { cache: 'no-store' });
        if (vRes.ok) {
          const vData = await vRes.json();
          if (vData && typeof vData.total === 'number') {
            setStats((prev) => ({ ...prev, totalVoters: vData.total }));
          }
        }
      }
    } catch {
    } finally {
      const elapsed = Date.now() - start;
      const remaining = Math.max(0, 200 - elapsed);
      setTimeout(() => setLoading(false), remaining);
    }
  };

  useEffect(() => {
    void loadStats();

    const handleClientChange = () => {
      void loadStats();
    };
    window.addEventListener('client-changed', handleClientChange);
    return () => window.removeEventListener('client-changed', handleClientChange);
  }, []);

  const renderCard = (item: NavModule) => {
    const Icon = item.icon;
    const isFeatured = item.id === 'voters';
    return (
      <Link
        key={item.id}
        href={item.href}
        className={`matdata-item-card ${isFeatured ? 'is-featured' : ''}`}
        style={{ '--card-color': item.color } as React.CSSProperties}
      >
        <div className="matdata-item-card-top">
          <div
            className="matdata-item-card-icon"
            style={{
              background: item.color,
              boxShadow: `0 6px 16px ${item.color}40`,
            }}
          >
            <Icon size={28} strokeWidth={2.3} />
          </div>
          <span className={`matdata-item-card-btn ${isFeatured ? 'is-featured-btn' : ''}`}>
            खोलें
            <ArrowRight size={13.5} />
          </span>
        </div>

        <div>
          <h3 className="matdata-item-card-title">{item.name}</h3>
          <p className="matdata-item-card-desc">{item.subtitle}</p>

          {item.metaBadge && (
            <div className="matdata-item-card-meta">
              <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: item.color }} />
              <span>{item.metaBadge}</span>
            </div>
          )}
        </div>
      </Link>
    );
  };

  return (
    <div
      style={{
        maxWidth: '1360px',
        margin: '0 auto',
        padding: '20px 20px 80px',
        width: '100%',
        color: '#0f172a',
        position: 'relative',
      }}
    >
      {/* 1. OPEN CANVAS EXECUTIVE HEADER */}
      <div className="matdata-top-deck">
        <div className="matdata-top-deck-left">
          <div className="matdata-sovereign-tag">
            <Sparkles size={12} />
            <span>भारत निर्वाचन प्रबंधन तंत्र • BHARAT ELECTION OS</span>
          </div>
          <h1 className="matdata-title">
            चुनाव संचालन मुख्य कंसोल
            <span className="matdata-title-badge">VijaySetu (विजयसेतु)</span>
          </h1>
          <p className="matdata-subtitle">
            <span>{userInfo.organizationName || 'सक्रिय चुनाव क्षेत्र'}</span>
            <span>•</span>
            <span>कुल {stats.totalVoters > 0 ? stats.totalVoters.toLocaleString('hi-IN') : '...'} पंजीकृत मतदाता</span>
            <span>•</span>
            <span>लाइव पोलिंग व डिजिटल पर्ची इलेक्शन मैनेजमेंट</span>
          </p>
        </div>

        <div className="matdata-top-deck-right">
          <div className="matdata-live-pill">
            <span className="pulse-dot" style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981', display: 'inline-block' }} />
            <span>लाइव सिंक सक्रिय</span>
          </div>
          {(!isWorker || (Array.isArray(allowedModules) && allowedModules.includes('poll-desk'))) && (
            <Link href="/poll-desk" className="matdata-action-btn-primary">
              <Vote size={15} />
              <span>लाइव मतदान डेस्क ➔</span>
            </Link>
          )}
        </div>
      </div>

      {/* 2. PANORAMIC TELEMETRY RIBBON (4 SEAMLESS METRICS) */}
      <div className="matdata-telemetry-ribbon">
        {/* Item 1: कुल मतदाता */}
        <div className="matdata-telemetry-item">
          <div className="matdata-telemetry-icon" style={{ background: '#eff6ff', color: '#2563eb' }}>
            <Users size={20} strokeWidth={2.4} />
          </div>
          <div>
            <div className="matdata-telemetry-label">कुल मतदाता</div>
            <div className="matdata-telemetry-value">
              {stats.totalVoters > 0 ? stats.totalVoters.toLocaleString('hi-IN') : '...'} वोटर
            </div>
          </div>
        </div>

        {/* Item 2: डिजिटल पर्ची इंजन */}
        <div className="matdata-telemetry-item">
          <div className="matdata-telemetry-icon" style={{ background: '#fffbeb', color: '#d97706' }}>
            <Ticket size={20} strokeWidth={2.4} />
          </div>
          <div>
            <div className="matdata-telemetry-label">पर्ची वितरण इंजन</div>
            <div className="matdata-telemetry-value" style={{ color: '#d97706' }}>
              1-क्लिक WhatsApp
            </div>
          </div>
        </div>

        {/* Item 3: पोलिंग डेस्क स्थिति */}
        <div className="matdata-telemetry-item">
          <div className="matdata-telemetry-icon" style={{ background: '#ecfdf5', color: '#059669' }}>
            <Activity size={20} strokeWidth={2.4} />
          </div>
          <div>
            <div className="matdata-telemetry-label">मतदान दिवस डेस्क</div>
            <div className="matdata-telemetry-value" style={{ color: '#059669' }}>
              लाइव ट्रैकर सक्रिय
            </div>
          </div>
        </div>

        {/* Item 4: डेटा गोपनीयता व सुरक्षा */}
        <div className="matdata-telemetry-item">
          <div className="matdata-telemetry-icon" style={{ background: '#faf5ff', color: '#7c3aed' }}>
            <ShieldCheck size={20} strokeWidth={2.4} />
          </div>
          <div>
            <div className="matdata-telemetry-label">डेटा गोपनीयता</div>
            <div className="matdata-telemetry-value" style={{ color: '#7c3aed' }}>
              100% एन्क्रिप्टेड
            </div>
          </div>
        </div>
      </div>

      {/* 3. WORKSPACE SECTION A: मुख्य चुनाव ऑपरेशन्स व इलेक्शन मैनेजमेंट */}
      {visibleCore.length > 0 && (
        <div>
          <div className="matdata-workspace-head">
            <h2 className="matdata-workspace-title">
              <TrendingUp size={18} style={{ color: '#2563eb' }} />
              <span>मुख्य चुनाव ऑपरेशन्स व इलेक्शन मैनेजमेंट</span>
            </h2>
            <span className="matdata-workspace-badge">{visibleCore.length} कोर टूल्स</span>
          </div>

          <div className="matdata-workspace-grid-3">
            {visibleCore.map((item) => renderCard(item))}
          </div>
        </div>
      )}

      {/* 4. WORKSPACE SECTION B: फील्ड टीम, पर्ची प्रिंट व व्यवस्थापक */}
      {visibleField.length > 0 && (
        <div>
          <div className="matdata-workspace-head" style={{ marginTop: visibleCore.length > 0 ? '36px' : '0px' }}>
            <h2 className="matdata-workspace-title">
              <ContactRound size={18} style={{ color: '#4f46e5' }} />
              <span>फील्ड टीम, पर्ची प्रिंट व सिस्टम प्रबंधन</span>
            </h2>
            <span className="matdata-workspace-badge">{visibleField.length} प्रबंधन टूल्स</span>
          </div>

          <div className="matdata-workspace-grid-3">
            {visibleField.map((item) => renderCard(item))}
            <PwaInstallDashboardCard />
          </div>
        </div>
      )}

      {visibleField.length === 0 && (
        <div style={{ marginTop: '30px' }}>
          <div className="matdata-workspace-grid-3">
            <PwaInstallDashboardCard />
          </div>
        </div>
      )}
    </div>
  );
}
