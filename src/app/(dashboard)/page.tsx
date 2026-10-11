'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Ticket,
  CheckSquare,
  Activity,
  TrendingUp,
  Send,
  Tag,
  UsersRound,
  ContactRound,
  Plane,
  UserCog,
  Database,
  ArrowRight,
  ShieldCheck,
  Building2,
} from 'lucide-react';
import { apiFetch, decodeJwtPayload } from '@/lib/api';

interface LauncherModule {
  id: string;
  name: string;
  subtitle: string;
  href: string;
  icon: React.ComponentType<{ size?: number; className?: string; color?: string }>;
  iconBg: string;
  module: string;
  adminOnly?: boolean;
  highlight?: boolean;
}

const launcherModules: LauncherModule[] = [
  {
    id: 'voters',
    name: 'मतदाता खोज व पर्ची',
    subtitle: 'मतदाता खोज, परिवार व पर्ची',
    href: '/voters',
    icon: Ticket,
    iconBg: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
    module: 'voters',
  },
  {
    id: 'poll-desk',
    name: 'मतदान दिवस डेस्क',
    subtitle: 'बूथ-वार लाइव मार्किंग',
    href: '/poll-desk',
    icon: CheckSquare,
    iconBg: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
    module: 'poll-desk',
  },
  {
    id: 'turnout',
    name: 'लाइव टर्नआउट',
    subtitle: 'रियल-टाइम मतदान दर',
    href: '/turnout',
    icon: Activity,
    iconBg: 'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)',
    module: 'turnout',
  },
  {
    id: 'warroom',
    name: 'राजनीतिक वॉर-रूम',
    subtitle: 'रणनीतिक विश्लेषण व आंकड़े',
    href: '/warroom',
    icon: TrendingUp,
    iconBg: 'linear-gradient(135deg, #ec4899 0%, #db2777 100%)',
    module: 'warroom',
  },
  {
    id: 'history',
    name: 'भेजी गई पर्चियाँ',
    subtitle: 'WhatsApp डिस्पैच ऑडिट',
    href: '/history',
    icon: Send,
    iconBg: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
    module: 'history',
  },
  {
    id: 'community',
    name: 'समुदाय व सामाजिक समीकरण',
    subtitle: 'Community Demographics & Analytics',
    href: '/community',
    icon: Tag,
    iconBg: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
    module: 'community',
  },
  {
    id: 'slips',
    name: 'बल्क पर्ची प्रिंट शीट',
    subtitle: 'A4 प्रिंट शीट्स व बल्क पर्ची',
    href: '/slips',
    icon: UsersRound,
    iconBg: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
    module: 'voters',
  },
  {
    id: 'workers',
    name: 'कार्यकर्ता प्रबंधन',
    subtitle: 'पन्ना प्रमुख व दायित्व ट्रैकिंग',
    href: '/workers',
    icon: ContactRound,
    iconBg: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
    module: 'workers',
  },
  {
    id: 'migrants',
    name: 'प्रवासी मतदाता',
    subtitle: 'कॉलिंग व यात्रा समन्वय सूची',
    href: '/migrants',
    icon: Plane,
    iconBg: 'linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)',
    module: 'migrants',
  },
  {
    id: 'accounts',
    name: 'खाते व अनुमतियाँ',
    subtitle: 'उप-खाते व दल प्रबंधन',
    href: '/accounts',
    icon: UserCog,
    iconBg: 'linear-gradient(135deg, #f43f5e 0%, #e11d48 100%)',
    module: 'accounts',
  },
  {
    id: 'admin',
    name: 'सुपर एडमिन कंसोल',
    subtitle: 'सिस्टम, टेनेंट्स व डेटा इम्पोर्ट',
    href: '/admin',
    icon: Database,
    iconBg: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
    module: 'admin',
    adminOnly: true,
    highlight: true,
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

  const [stats, setStats] = useState<{ totalVoters: number }>({ totalVoters: 0 });

  // Filter modules based on user permissions & admin role
  const visibleModules = launcherModules.filter((mod) => {
    if (mod.adminOnly && !isAdmin) return false;
    if (allowedModules && !allowedModules.includes(mod.module) && !isAdmin) {
      return false;
    }
    return true;
  });

  useEffect(() => {
    const loadStats = async () => {
      try {
        const res = await apiFetch('/voters?page=1&pageSize=1', { cache: 'no-store' });
        if (res.ok) {
          const data = await res.json();
          if (data && typeof data.total === 'number') {
            setStats({ totalVoters: data.total });
          }
        }
      } catch {}
    };
    void loadStats();
  }, []);

  return (
    <div style={{ maxWidth: '1680px', margin: '0 auto', padding: '20px 16px 60px', width: '100%' }}>
      {/* Top Banner / Heading: VijaySetu Brand & Context */}
      <div
        style={{
          background: 'linear-gradient(135deg, #064e3b 0%, #047857 60%, #0f766e 100%)',
          borderRadius: '16px',
          padding: '20px 24px',
          marginBottom: '20px',
          color: '#ffffff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '16px',
          boxShadow: '0 8px 24px -4px rgba(4, 120, 87, 0.25)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', minWidth: 0 }}>
          <div
            style={{
              width: '52px',
              height: '52px',
              borderRadius: '12px',
              background: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
              overflow: 'hidden',
              flexShrink: 0,
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.png" alt="VijaySetu" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <h1 style={{ margin: 0, fontSize: '20px', fontWeight: 900, letterSpacing: '-0.4px', color: '#ffffff' }}>
                विजयसेतु (VijaySetu)
              </h1>
              <span
                style={{
                  background: 'rgba(255, 255, 255, 0.2)',
                  border: '1px solid rgba(255, 255, 255, 0.35)',
                  color: '#ffffff',
                  fontSize: '10.5px',
                  fontWeight: 700,
                  padding: '2px 8px',
                  borderRadius: '12px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.4px',
                }}
              >
                इलेक्शन मैनेजमेंट सिस्टम
              </span>
            </div>
            <p style={{ margin: '3px 0 0', fontSize: '12.5px', color: '#d1fae5', fontWeight: 500 }}>
              मतदाता खोज, डिजिटल पर्ची वितरण, वॉर-रूम व फील्ड ऑपरेशन कंसोल
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <div
            style={{
              background: 'rgba(255, 255, 255, 0.15)',
              backdropFilter: 'blur(8px)',
              border: '1px solid rgba(255, 255, 255, 0.25)',
              borderRadius: '10px',
              padding: '6px 12px',
              fontSize: '12px',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              color: '#ffffff',
            }}
          >
            <Building2 size={14} />
            <span>{userInfo.organizationName || 'सक्रिय चुनाव क्षेत्र'}</span>
          </div>
          <div
            style={{
              background: '#ffffff',
              color: '#065f46',
              borderRadius: '10px',
              padding: '6px 12px',
              fontSize: '12px',
              fontWeight: 800,
              boxShadow: '0 2px 6px rgba(0,0,0,0.1)',
            }}
          >
            Roots Reach Media &bull; 📞 7231077770
          </div>
        </div>
      </div>

      {/* Quick Summary / Status Strip (Fills wide screen nicely, stacks on mobile) */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '14px',
          marginBottom: '24px',
        }}
      >
        <div
          style={{
            background: '#ffffff',
            borderRadius: '12px',
            border: '1px solid #e2e8f0',
            padding: '14px 18px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
          }}
        >
          <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: '#eff6ff', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <UsersRound size={20} />
          </div>
          <div>
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>पंजीकृत मतदाता</div>
            <div style={{ fontSize: '18px', fontWeight: 900, color: '#0f172a' }}>
              {stats.totalVoters > 0 ? stats.totalVoters.toLocaleString('hi-IN') : 'डेटाबेस कनेक्टेड'}
            </div>
          </div>
        </div>

        <div
          style={{
            background: '#ffffff',
            borderRadius: '12px',
            border: '1px solid #e2e8f0',
            padding: '14px 18px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
          }}
        >
          <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: '#ecfdf5', color: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <CheckSquare size={20} />
          </div>
          <div>
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>मतदान दिवस डेस्क</div>
            <div style={{ fontSize: '18px', fontWeight: 900, color: '#059669' }}>लाइव ट्रैकिंग सक्रिय</div>
          </div>
        </div>

        <div
          style={{
            background: '#ffffff',
            borderRadius: '12px',
            border: '1px solid #e2e8f0',
            padding: '14px 18px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
          }}
        >
          <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: '#fef3c7', color: '#d97706', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Ticket size={20} />
          </div>
          <div>
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>डिजिटल मतदाता पर्ची</div>
            <div style={{ fontSize: '18px', fontWeight: 900, color: '#d97706' }}>ECI मानक + फ़ोटो</div>
          </div>
        </div>

        <div
          style={{
            background: '#ffffff',
            borderRadius: '12px',
            border: '1px solid #e2e8f0',
            padding: '14px 18px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
          }}
        >
          <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: '#f3e8ff', color: '#7c3aed', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <ShieldCheck size={20} />
          </div>
          <div>
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>सर्वर व डेटा सुरक्षा</div>
            <div style={{ fontSize: '18px', fontWeight: 900, color: '#7c3aed' }}>100% एन्क्रिप्टेड</div>
          </div>
        </div>
      </div>

      {/* Main Open Cards Grid ("खुले-खुले बटन") */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(290px, 1fr))',
          gap: '20px',
        }}
      >
        {visibleModules.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.id}
              href={item.href}
              style={{
                textDecoration: 'none',
                color: 'inherit',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                background: '#ffffff',
                border: item.highlight ? '2px solid #059669' : '1px solid #e2e8f0',
                borderRadius: '16px',
                padding: '24px 22px',
                boxShadow: item.highlight
                  ? '0 4px 16px rgba(5, 150, 105, 0.14)'
                  : '0 1px 4px rgba(15, 23, 42, 0.05)',
                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                cursor: 'pointer',
                minHeight: '150px',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-4px)';
                e.currentTarget.style.boxShadow = item.highlight
                  ? '0 12px 28px rgba(5, 150, 105, 0.22)'
                  : '0 12px 24px -4px rgba(0, 0, 0, 0.08), 0 4px 8px -2px rgba(0, 0, 0, 0.04)';
                if (!item.highlight) {
                  e.currentTarget.style.borderColor = '#93c5fd';
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = item.highlight
                  ? '0 4px 16px rgba(5, 150, 105, 0.14)'
                  : '0 1px 4px rgba(15, 23, 42, 0.05)';
                if (!item.highlight) {
                  e.currentTarget.style.borderColor = '#e2e8f0';
                }
              }}
            >
              {/* Card Header: Icon + "खोलें →" link */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '16px',
                }}
              >
                {/* Large Colorful Icon Tile */}
                <div
                  style={{
                    width: '52px',
                    height: '52px',
                    borderRadius: '14px',
                    background: item.iconBg,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#ffffff',
                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.12)',
                    flexShrink: 0,
                  }}
                >
                  <Icon size={26} />
                </div>

                {/* "खोलें →" Link */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    fontSize: '12px',
                    fontWeight: 700,
                    color: item.highlight ? '#047857' : '#64748b',
                    background: item.highlight ? '#ecfdf5' : '#f8fafc',
                    padding: '4px 11px',
                    borderRadius: '20px',
                    border: item.highlight ? '1px solid #a7f3d0' : '1px solid #e2e8f0',
                  }}
                >
                  <span>खोलें</span>
                  <ArrowRight size={13} />
                </div>
              </div>

              {/* Card Body: Title & Subtitle */}
              <div>
                <h3
                  style={{
                    margin: '0 0 4px 0',
                    fontSize: '16.5px',
                    fontWeight: 800,
                    color: '#0f172a',
                    letterSpacing: '-0.3px',
                  }}
                >
                  {item.name}
                </h3>

                <div
                  style={{
                    fontSize: '12.5px',
                    color: '#64748b',
                    fontWeight: 500,
                    lineHeight: 1.4,
                  }}
                >
                  {item.subtitle}
                </div>
              </div>

              {/* Special Tag for Admin Only Card */}
              {item.highlight && (
                <div
                  style={{
                    marginTop: '12px',
                    paddingTop: '10px',
                    borderTop: '1px solid #ecfdf5',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <span
                    style={{
                      fontSize: '10.5px',
                      fontWeight: 800,
                      color: '#047857',
                      background: '#d1fae5',
                      padding: '2px 8px',
                      borderRadius: '6px',
                    }}
                  >
                    ★ केवल एडमिन (Admin Only)
                  </span>
                  <span style={{ fontSize: '11px', color: '#059669', fontWeight: 600 }}>
                    कंसोल खोलें &rarr;
                  </span>
                </div>
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
