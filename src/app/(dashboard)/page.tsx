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
  Sparkles,
  Smartphone,
  X,
} from 'lucide-react';

interface LauncherModule {
  id: string;
  name: string;
  subtitle: string;
  tagline: string;
  href: string;
  icon: React.ComponentType<{ size?: number; className?: string; color?: string }>;
  iconBg: string;
  module: string;
  badge?: string;
  adminOnly?: boolean;
  highlight?: boolean;
}

const launcherModules: LauncherModule[] = [
  {
    id: 'slips',
    name: 'मतदाता खोज व पर्ची',
    subtitle: 'पर्ची वितरण व त्वरित खोज',
    tagline: 'WhatsApp डिजिटल पर्ची, EVM क्रमांक व प्रिंट',
    href: '/slips',
    icon: Ticket,
    iconBg: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
    module: 'voters',
    badge: 'EVM पर्ची',
  },
  {
    id: 'poll-desk',
    name: 'मतदान दिवस डेस्क',
    subtitle: 'बूथ-वार लाइव मार्किंग',
    tagline: 'मतदाता उपस्थिति व वोट डालने की लाइव ट्रैकिंग',
    href: '/poll-desk',
    icon: CheckSquare,
    iconBg: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
    module: 'poll-desk',
    badge: 'बूथ पोलिंग',
  },
  {
    id: 'turnout',
    name: 'लाइव टर्नआउट',
    subtitle: 'रियल-टाइम मतदान दर',
    tagline: 'घंटे-वार वोटिंग प्रतिशत, पुरुष/महिला आंकड़े',
    href: '/turnout',
    icon: Activity,
    iconBg: 'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)',
    module: 'turnout',
    badge: 'लाइव प्रतिशत',
  },
  {
    id: 'warroom',
    name: 'राजनीतिक वॉर-रूम',
    subtitle: 'रणनीतिक विश्लेषण व आंकड़े',
    tagline: 'बूथ-वार रुझान, पन्ना स्थिति व लीड एनालिसिस',
    href: '/warroom',
    icon: TrendingUp,
    iconBg: 'linear-gradient(135deg, #ec4899 0%, #db2777 100%)',
    module: 'warroom',
    badge: 'वॉर रूम',
  },
  {
    id: 'history',
    name: 'भेजी गई पर्चियाँ',
    subtitle: 'WhatsApp डिस्पैच ऑडिट',
    tagline: 'मतदाताओं को भेजी गई पर्चियों की वितरण हिस्ट्री',
    href: '/history',
    icon: Send,
    iconBg: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
    module: 'history',
    badge: 'WhatsApp ऑडिट',
  },
  {
    id: 'community',
    name: 'समुदाय व सामाजिक समीकरण',
    subtitle: 'Community Demographics & Analytics',
    tagline: 'जातीय, सामाजिक व वर्ग-वार सांख्यिकी',
    href: '/community',
    icon: Tag,
    iconBg: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
    module: 'community',
    badge: 'सामाजिक आंकड़े',
  },
  {
    id: 'voters',
    name: 'परिवार व मुखिया प्रबंधन',
    subtitle: 'Family & Household Directory',
    tagline: 'मकान-वार वोटर डायरेक्टरी, मुखिया व सदस्य सूची',
    href: '/voters',
    icon: UsersRound,
    iconBg: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
    module: 'voters',
    badge: 'परिवार डायरेक्टरी',
  },
  {
    id: 'workers',
    name: 'कार्यकर्ता प्रबंधन',
    subtitle: 'पन्ना प्रमुख व दायित्व ट्रैकिंग',
    tagline: 'बूथ प्रभारियों का आवंटन व कार्य रिपोर्टिंग',
    href: '/workers',
    icon: ContactRound,
    iconBg: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
    module: 'workers',
    badge: 'पन्ना प्रमुख',
  },
  {
    id: 'migrants',
    name: 'प्रवासी मतदाता',
    subtitle: 'कॉलिंग व यात्रा समन्वय सूची',
    tagline: 'बाहर रहने वाले मतदाताओं का संपर्क व आगमन स्थिति',
    href: '/migrants',
    icon: Plane,
    iconBg: 'linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)',
    module: 'migrants',
    badge: 'प्रवासी वोटर',
  },
  {
    id: 'accounts',
    name: 'खाते व अनुमतियाँ',
    subtitle: 'उप-खाते व दल प्रबंधन',
    tagline: 'कार्यकर्ता व टीम के लॉगिन आईडी व रोल सेटिंग्स',
    href: '/accounts',
    icon: UserCog,
    iconBg: 'linear-gradient(135deg, #f43f5e 0%, #e11d48 100%)',
    module: 'accounts',
    badge: 'सब-अकाउंट्स',
  },
  {
    id: 'admin',
    name: 'सुपर एडमिन कंसोल',
    subtitle: 'सिस्टम, टेनेंट्स व डेटा इम्पोर्ट',
    tagline: 'Excel/PDF अपलोड, क्लाइंट्स, पर्ची ब्रांडिंग व मास्टर कंट्रोल',
    href: '/admin',
    icon: Database,
    iconBg: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
    module: 'admin',
    badge: '★ केवल एडमिन (Admin)',
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
  const [showPwaBanner, setShowPwaBanner] = useState(true);

  useEffect(() => {
    try {
      const token = window.localStorage.getItem('token');
      if (token) {
        const payload = JSON.parse(
          atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))
        );
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

  // Filter modules based on user permissions & admin role
  const visibleModules = launcherModules.filter((mod) => {
    if (mod.adminOnly && !isAdmin) return false;
    if (allowedModules && !allowedModules.includes(mod.module) && !isAdmin) {
      return false;
    }
    return true;
  });

  return (
    <div style={{ maxWidth: '1440px', margin: '0 auto', padding: '16px 20px 48px' }}>
      {/* Optional Dismissible PWA / Smart Booth Banner (Matches Screenshot) */}
      {showPwaBanner && (
        <div
          style={{
            background: 'linear-gradient(90deg, #1e3a8a 0%, #2563eb 50%, #1d4ed8 100%)',
            color: '#ffffff',
            borderRadius: '12px',
            padding: '12px 18px',
            marginBottom: '24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
            boxShadow: '0 4px 12px rgba(37, 99, 235, 0.2)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13.5px', fontWeight: 600 }}>
            <span style={{ fontSize: '18px' }}>📱</span>
            <span>
              विजयसेतु स्मार्ट बूथ (Smart Booth Web App) &bull; तेज़, सुरक्षित एवं मोबाइल-अनुकूलित
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button
              type="button"
              onClick={() => {
                // If beforeinstallprompt exists or prompt bookmark
                alert('आप अपने मोबाइल या क्रोम ब्राउज़र के मेन्यू से "Add to Home Screen" दबाकर इस ऐप को इंस्टॉल कर सकते हैं।');
              }}
              style={{
                background: '#ffffff',
                color: '#1e3a8a',
                border: 'none',
                borderRadius: '6px',
                padding: '6px 14px',
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'pointer',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
              }}
            >
              ऐप इंस्टॉल करें
            </button>
            <button
              type="button"
              onClick={() => setShowPwaBanner(false)}
              style={{
                background: 'rgba(255, 255, 255, 0.15)',
                border: 'none',
                borderRadius: '6px',
                color: '#ffffff',
                padding: '5px',
                cursor: 'pointer',
                display: 'flex',
              }}
              title="बंद करें"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Main Open Cards Grid ("खुले-खुले बटन") */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
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
                border: item.highlight ? '2px solid #10b981' : '1px solid #e2e8f0',
                borderRadius: '16px',
                padding: '24px 22px',
                boxShadow: item.highlight
                  ? '0 6px 20px rgba(16, 185, 129, 0.12)'
                  : '0 2px 8px rgba(15, 23, 42, 0.04)',
                transition: 'all 0.22s cubic-bezier(0.4, 0, 0.2, 1)',
                cursor: 'pointer',
                position: 'relative',
                minHeight: '165px',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-4px)';
                e.currentTarget.style.boxShadow = item.highlight
                  ? '0 12px 28px rgba(16, 185, 129, 0.2)'
                  : '0 12px 24px -4px rgba(0, 0, 0, 0.08), 0 4px 8px -2px rgba(0, 0, 0, 0.04)';
                if (!item.highlight) {
                  e.currentTarget.style.borderColor = '#93c5fd';
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = item.highlight
                  ? '0 6px 20px rgba(16, 185, 129, 0.12)'
                  : '0 2px 8px rgba(15, 23, 42, 0.04)';
                if (!item.highlight) {
                  e.currentTarget.style.borderColor = '#e2e8f0';
                }
              }}
            >
              {/* Card Header: Icon + "खोलें →" link */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
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
                    boxShadow: '0 4px 10px rgba(0, 0, 0, 0.12)',
                    flexShrink: 0,
                  }}
                >
                  <Icon size={26} />
                </div>

                {/* "खोलें →" Link (Exact match to Screenshot) */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    fontSize: '12px',
                    fontWeight: 600,
                    color: item.highlight ? '#059669' : '#64748b',
                    background: item.highlight ? '#ecfdf5' : '#f8fafc',
                    padding: '4px 10px',
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
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    marginBottom: '4px',
                  }}
                >
                  <h3
                    style={{
                      margin: 0,
                      fontSize: '16.5px',
                      fontWeight: 700,
                      color: '#0f172a',
                      letterSpacing: '-0.2px',
                    }}
                  >
                    {item.name}
                  </h3>
                </div>

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

                {/* Tagline / Sub-description */}
                <div
                  style={{
                    fontSize: '11px',
                    color: '#94a3b8',
                    marginTop: '6px',
                    lineHeight: 1.35,
                  }}
                >
                  {item.tagline}
                </div>
              </div>

              {/* Bottom Badge */}
              {item.badge && (
                <div
                  style={{
                    marginTop: '14px',
                    paddingTop: '10px',
                    borderTop: '1px solid #f1f5f9',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <span
                    style={{
                      fontSize: '10.5px',
                      fontWeight: 700,
                      color: item.highlight ? '#047857' : '#475569',
                      background: item.highlight ? '#d1fae5' : '#f1f5f9',
                      padding: '2px 8px',
                      borderRadius: '6px',
                    }}
                  >
                    {item.badge}
                  </span>
                  <span style={{ fontSize: '11px', color: '#94a3b8' }}>
                    क्लिक करें &rarr;
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
