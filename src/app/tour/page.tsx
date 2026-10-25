'use client';

import React, { useState, useEffect } from 'react';
import {
  Vote,
  Ticket,
  CheckSquare,
  Activity,
  UsersRound,
  ShieldAlert,
  PieChart,
  Settings,
  Search,
  Users,
  Building,
  CheckCircle2,
  Clock,
  Send,
  Phone,
  Download,
  Share2,
  TrendingUp,
  MapPin,
  ChevronRight,
  Sparkles,
  BarChart3,
  Calendar,
  AlertCircle,
  FileSpreadsheet,
} from 'lucide-react';
import { VoterSlipTemplate, defaultSlipConfig } from '@/components/VoterSlipTemplate';

export default function TourPage() {
  // Current active scene: 0 = Dashboard, 1 = Voters, 2 = Slips & WhatsApp, 3 = Turnout, 4 = Workers, 5 = Reports, 6 = CTA
  const [currentScene, setCurrentScene] = useState<number>(0);
  const [searchQuery, setSearchQuery] = useState<string>('रमेश');
  const [showFamily, setShowFamily] = useState<boolean>(true);
  const [activeTurnoutBooth, setActiveTurnoutBooth] = useState<string>('all');
  const [votedFilter, setVotedFilter] = useState<'all' | 'voted' | 'unvoted'>('all');
  const [whatsAppModal, setWhatsAppModal] = useState<boolean>(false);

  // Subtitles synchronized to the audio track
  const subtitles = [
    {
      scene: 0,
      title: 'मुख्य डैशबोर्ड (Main Dashboard)',
      hindi: 'क्या आप जिला परिषद, पंचायत समिति या सरपंच प्रत्याशी हैं? चुनावी मैनेजमेंट का यह तरीका आपको जरूर देखना चाहिए! हम लेकर आए हैं India का सबसे एडवांस इलेक्शन मैनेजमेंट सॉल्यूशन - विजयसेतु (VijaySetu)!',
      time: '0:00 - 0:13',
    },
    {
      scene: 1,
      title: 'मतदाता खोज व परिवार मैपिंग (Voter Search & Family Explorer)',
      hindi: 'जहाँ किसी भी वोटर का नाम सर्च करते ही एक क्लिक में मिलेगी उसकी पूरी डिटेल्स, परिवारजनों की जानकारी, मकान संख्या और वोटर पर्ची!',
      time: '0:13 - 0:22',
    },
    {
      scene: 2,
      title: '1-क्लिक बल्क पर्ची व व्हाट्सएप शेयरिंग (Bulk Slips & WhatsApp Share)',
      hindi: 'चुनाव चिन्ह मिलते ही सिर्फ एक क्लिक में सभी मतदाताओं तक पहुँचाएँ उनकी वोटर पर्ची! अब कागज़ों और फाइलों के झंझट से सम्पूर्ण छुटकारा!',
      time: '0:22 - 0:35',
    },
    {
      scene: 3,
      title: 'मतदान दिवस लाइव डेस्क व टर्नआउट (Live Turnout & Polling Desk)',
      hindi: 'और मतदान के दिन हर सेकंड की पोलिंग अपडेट पर रखें नज़र! कितना मतदान हुआ, किन मतदाताओं ने अभी तक वोट नहीं डाला - पूरी लाइव डिटेल्स आपके सामने!',
      time: '0:35 - 0:46',
    },
    {
      scene: 4,
      title: 'कार्यकर्ता व वॉर-रूम प्रबंधन (Field Workers & War-Room)',
      hindi: 'सिर्फ वोटर डेटा ही नहीं, अपने सभी कार्यकर्ता और पूरी चुनावी टीम को भी मैनेज कीजिए ऑनलाइन!',
      time: '0:46 - 0:53',
    },
    {
      scene: 5,
      title: 'चुनावी रुझान व सामाजिक समीकरण (Community Equations & Final Report)',
      hindi: 'चुनाव खत्म होते ही एक क्लिक में देखें कुल मतदान और चुनावी रुझानों की पूरी रिपोर्ट!',
      time: '0:53 - 0:59',
    },
    {
      scene: 6,
      title: 'लाइव डेमो व विजयसेतु ऑनबोर्डिंग (Book Your Live Demo)',
      hindi: 'लेकिन असली कमाल सिर्फ सुनने में नहीं, इसे काम करते हुए देखने में है! आज ही बुक कीजिए विजयसेतु ऐप का लाइव डेमो और अपनी जीत सुनिश्चित कीजिए!',
      time: '0:59 - 1:09',
    },
  ];

  const currentSub = subtitles[currentScene] || subtitles[0];

  // Expose global scene setter for automation
  useEffect(() => {
    (window as any).setTourScene = (idx: number) => {
      setCurrentScene(idx);
    };
    (window as any).setTourSearch = (q: string) => {
      setSearchQuery(q);
    };
    (window as any).setTourFamily = (v: boolean) => {
      setShowFamily(v);
    };
    (window as any).setTourWhatsApp = (v: boolean) => {
      setWhatsAppModal(v);
    };
    (window as any).setTourFilter = (f: 'all' | 'voted' | 'unvoted') => {
      setVotedFilter(f);
    };
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: '#f8fafc', overflow: 'hidden', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      {/* 1. Global App Header */}
      <header
        style={{
          height: '62px',
          background: 'linear-gradient(90deg, #0f172a 0%, #1e293b 100%)',
          borderBottom: '1px solid #334155',
          padding: '0 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexShrink: 0,
          zIndex: 50,
        }}
      >
        {/* Left: Branding */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div
            style={{
              width: '38px',
              height: '38px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(234, 88, 12, 0.4)',
            }}
          >
            <Vote size={22} color="#ffffff" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '18px', fontWeight: 900, color: '#ffffff', letterSpacing: '-0.3px' }}>
                VijaySetu <span style={{ color: '#fb923c' }}>विजयसेतु</span>
              </span>
              <span
                style={{
                  background: 'rgba(234, 88, 12, 0.25)',
                  border: '1px solid #ea580c',
                  color: '#fdba74',
                  fontSize: '10px',
                  fontWeight: 800,
                  padding: '2px 8px',
                  borderRadius: '20px',
                  letterSpacing: '0.4px',
                }}
              >
                ELECTION OS 2026
              </span>
            </div>
            <div style={{ fontSize: '11px', color: '#94a3b8' }}>
              हर वोट • सही दिशा • जीत की ओर अग्रसर
            </div>
          </div>
        </div>

        {/* Center: Active Candidate Badge */}
        <div
          style={{
            background: 'rgba(255, 255, 255, 0.08)',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            padding: '5px 16px',
            borderRadius: '24px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
          }}
        >
          <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#22c55e', boxShadow: '0 0 8px #22c55e' }} />
          <div style={{ fontSize: '12px', color: '#e2e8f0' }}>
            प्रत्याशी: <strong style={{ color: '#ffffff' }}>विजय कुमार राठौड़</strong> (वार्ड 82 Jodhpur)
          </div>
          <span style={{ background: '#3b82f6', color: '#ffffff', fontSize: '10px', fontWeight: 800, padding: '2px 7px', borderRadius: '10px' }}>
            लाइव वॉर-रूम
          </span>
        </div>

        {/* Right: Quick Stats & Navigation Pills */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {[
            { id: 0, label: 'डैशबोर्ड' },
            { id: 1, label: 'मतदाता खोज' },
            { id: 2, label: 'बल्क पर्ची' },
            { id: 3, label: 'लाइव टर्नआउट' },
            { id: 4, label: 'कार्यकर्ता' },
            { id: 5, label: 'रिपोर्ट्स' },
            { id: 6, label: 'डेमो बुक' },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setCurrentScene(item.id)}
              style={{
                background: currentScene === item.id ? '#ea580c' : 'rgba(255, 255, 255, 0.06)',
                border: currentScene === item.id ? '1px solid #f97316' : '1px solid rgba(255, 255, 255, 0.1)',
                color: currentScene === item.id ? '#ffffff' : '#cbd5e1',
                padding: '5px 11px',
                borderRadius: '8px',
                fontSize: '11px',
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              {item.label}
            </button>
          ))}
        </div>
      </header>

      {/* 2. Main Workspace Layout */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Left Sidebar */}
        <aside
          style={{
            width: '230px',
            background: '#ffffff',
            borderRight: '1px solid #e2e8f0',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            flexShrink: 0,
            padding: '16px 10px',
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <div style={{ fontSize: '10px', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', padding: '0 12px 6px', letterSpacing: '0.5px' }}>
              मुख्य नेविगेशन
            </div>

            {[
              { id: 0, label: 'मुख्य डैशबोर्ड', icon: Vote },
              { id: 1, label: 'मतदाता खोज व पर्ची', icon: Ticket },
              { id: 2, label: 'बल्क पर्ची प्रिंट शीट', icon: Share2 },
              { id: 3, label: 'लाइव टर्नआउट डेस्क', icon: Activity },
              { id: 4, label: 'कार्यकर्ता प्रबंधन', icon: UsersRound },
              { id: 5, label: 'सामाजिक समीकरण', icon: PieChart },
              { id: 6, label: 'सुपर एडमिन कंसोल', icon: Settings },
            ].map((menu) => {
              const Icon = menu.icon;
              const isActive = currentScene === menu.id;
              return (
                <div
                  key={menu.id}
                  onClick={() => setCurrentScene(menu.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '9px 12px',
                    borderRadius: '9px',
                    fontSize: '13px',
                    fontWeight: isActive ? 800 : 600,
                    color: isActive ? '#ea580c' : '#475569',
                    background: isActive ? '#fff7ed' : 'transparent',
                    borderLeft: isActive ? '3.5px solid #ea580c' : '3.5px solid transparent',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <Icon size={17} color={isActive ? '#ea580c' : '#64748b'} />
                  <span>{menu.label}</span>
                </div>
              );
            })}
          </div>

          {/* Sidebar Bottom Box */}
          <div
            style={{
              background: '#f1f5f9',
              borderRadius: '12px',
              padding: '12px',
              border: '1px solid #e2e8f0',
            }}
          >
            <div style={{ fontSize: '11px', fontWeight: 800, color: '#334155' }}>24/7 वॉर-रूम सपोर्ट</div>
            <div style={{ fontSize: '10px', color: '#64748b', marginTop: '2px' }}>क्लाउड सर्वर 99.9% अपटाइम</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '8px', fontSize: '11px', color: '#047857', fontWeight: 700 }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981' }} />
              सक्रिय सिंक्रोनाइज़्ड
            </div>
          </div>
        </aside>

        {/* Center Main Stage */}
        <main
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            overflowY: 'auto',
            background: '#f8fafc',
            padding: '20px 24px',
            position: 'relative',
          }}
        >
          {/* SCENE 0: MAIN DASHBOARD */}
          {currentScene === 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* Top Welcome Card */}
              <div
                style={{
                  background: 'linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%)',
                  borderRadius: '16px',
                  padding: '24px 28px',
                  color: '#ffffff',
                  boxShadow: '0 8px 24px rgba(37, 99, 235, 0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <div>
                  <span style={{ background: 'rgba(255,255,255,0.2)', padding: '3px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: 700 }}>
                    चुनावी कमान केंद्र (Election Command Center)
                  </span>
                  <h2 style={{ fontSize: '24px', fontWeight: 900, margin: '8px 0 4px', letterSpacing: '-0.4px' }}>
                    नमस्ते विजय जी, आपका चुनावी समीकरण मजबूत स्थिति में है!
                  </h2>
                  <p style={{ margin: 0, fontSize: '13px', color: '#bfdbfe', maxWidth: '640px' }}>
                    वार्ड नंबर 82 के सभी 15 बूथों का डेटा पूर्ण रूप से तैयार है। 89% मतदाताओं तक डिजिटल वोटर पर्ची पहुँच चुकी है।
                  </p>
                </div>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <div style={{ background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.25)', padding: '12px 18px', borderRadius: '12px', textAlign: 'center' }}>
                    <div style={{ fontSize: '22px', fontWeight: 900 }}>68.4%</div>
                    <div style={{ fontSize: '11px', color: '#bfdbfe' }}>प्रत्याशित समर्थन</div>
                  </div>
                </div>
              </div>

              {/* 4 Stat Cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
                {[
                  { label: 'कुल पंजीकृत मतदाता', val: '1,24,500', sub: '25 वार्डों में विभाजित', color: '#2563eb', bg: '#eff6ff' },
                  { label: 'सक्रिय मतदान केंद्र (Booths)', val: '82 बूथ', sub: '100% जीपीएस मैप्ड', color: '#059669', bg: '#ecfdf5' },
                  { label: 'वितरित वोटर पर्चियाँ', val: '89,420', sub: '71.8% कवरेज पूर्ण', color: '#ea580c', bg: '#fff7ed' },
                  { label: 'ऑन-फील्ड कार्यकर्ता', val: '245 वॉलिंटियर', sub: 'लाइव वॉर-रूम कनेक्टेड', color: '#7c3aed', bg: '#f5f3ff' },
                ].map((s, idx) => (
                  <div
                    key={idx}
                    style={{
                      background: '#ffffff',
                      border: '1px solid #e2e8f0',
                      borderRadius: '14px',
                      padding: '18px',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
                    }}
                  >
                    <div style={{ fontSize: '12px', fontWeight: 700, color: '#64748b' }}>{s.label}</div>
                    <div style={{ fontSize: '24px', fontWeight: 900, color: s.color, margin: '6px 0 2px' }}>{s.val}</div>
                    <div style={{ fontSize: '11px', color: '#94a3b8' }}>{s.sub}</div>
                  </div>
                ))}
              </div>

              {/* Middle Section: Quick Launch Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '20px' }}>
                <div style={{ background: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', padding: '20px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                    <div style={{ fontSize: '15px', fontWeight: 800, color: '#0f172a' }}>⚡ त्वरित चुनावी कार्य (Quick Actions)</div>
                    <span style={{ fontSize: '11px', color: '#2563eb', fontWeight: 700 }}>1-क्लिक एक्सेस</span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
                    {[
                      { title: 'मतदाता खोजें व पर्ची निकालें', desc: 'नाम या EPIC से तुरंत खोजें', scene: 1, icon: Ticket, c: '#2563eb', bg: '#eff6ff' },
                      { title: 'व्हाट्सएप पर बल्क पर्ची भेजें', desc: 'एक क्लिक में हजारों को शेयर', scene: 2, icon: Share2, c: '#059669', bg: '#ecfdf5' },
                      { title: 'मतदान दिवस लाइव डेस्क', desc: 'वोटिंग प्रतिशत रियल-टाइम', scene: 3, icon: Activity, c: '#ea580c', bg: '#fff7ed' },
                      { title: 'कार्यकर्ता व बूथ इंचार्ज', desc: 'टीम को ऑनलाइन टास्क दें', scene: 4, icon: UsersRound, c: '#7c3aed', bg: '#f5f3ff' },
                    ].map((item, i) => {
                      const Icon = item.icon;
                      return (
                        <div
                          key={i}
                          onClick={() => setCurrentScene(item.scene)}
                          style={{
                            border: '1px solid #e2e8f0',
                            borderRadius: '12px',
                            padding: '14px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '12px',
                            transition: 'all 0.15s ease',
                          }}
                        >
                          <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: item.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Icon size={20} color={item.c} />
                          </div>
                          <div>
                            <div style={{ fontSize: '13px', fontWeight: 800, color: '#1e293b' }}>{item.title}</div>
                            <div style={{ fontSize: '11px', color: '#64748b' }}>{item.desc}</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Right Mini Widget: Booth Readiness */}
                <div style={{ background: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', padding: '20px' }}>
                  <div style={{ fontSize: '15px', fontWeight: 800, color: '#0f172a', marginBottom: '14px' }}>
                    📍 प्रमुख मतदान केंद्र कवरेज
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {[
                      { name: 'राजकीय उच्च प्राथमिक विद्यालय', ward: 'वार्ड 1-3', pct: 92, col: '#10b981' },
                      { name: 'सामुदायिक भवन, मुख्य चौक', ward: 'वार्ड 4-6', pct: 88, col: '#3b82f6' },
                      { name: 'महात्मा गांधी राजकीय विद्यालय', ward: 'वार्ड 7-10', pct: 76, col: '#f59e0b' },
                      { name: 'बालिका सीनियर सेकेंडरी स्कूल', ward: 'वार्ड 11-15', pct: 84, col: '#8b5cf6' },
                    ].map((b, idx) => (
                      <div key={idx} style={{ padding: '8px 10px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #f1f5f9' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: 700 }}>
                          <span style={{ color: '#1e293b' }}>{b.name}</span>
                          <span style={{ color: b.col }}>{b.pct}%</span>
                        </div>
                        <div style={{ width: '100%', height: '6px', background: '#e2e8f0', borderRadius: '3px', marginTop: '6px', overflow: 'hidden' }}>
                          <div style={{ width: `${b.pct}%`, height: '100%', background: b.col, borderRadius: '3px' }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* SCENE 1: VOTER SEARCH & FAMILY EXPLORER */}
          {currentScene === 1 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Search Bar Bar */}
              <div
                style={{
                  background: '#ffffff',
                  padding: '16px 20px',
                  borderRadius: '14px',
                  border: '1.5px solid #cbd5e1',
                  boxShadow: '0 4px 14px rgba(0,0,0,0.04)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '16px',
                }}
              >
                <div style={{ position: 'relative', flex: 1 }}>
                  <Search size={18} color="#94a3b8" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }} />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="वोटर का नाम, पहचान पत्र (EPIC) या मकान संख्या टाइप करें..."
                    style={{
                      width: '100%',
                      padding: '12px 16px 12px 42px',
                      fontSize: '15px',
                      fontWeight: 700,
                      border: '1.5px solid #3b82f6',
                      borderRadius: '10px',
                      outline: 'none',
                      background: '#f0f9ff',
                      color: '#0f172a',
                    }}
                  />
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <span style={{ background: '#ecfdf5', color: '#047857', border: '1px solid #a7f3d0', padding: '8px 14px', borderRadius: '8px', fontSize: '13px', fontWeight: 800 }}>
                    कुल 1 मैच पाया गया
                  </span>
                </div>
              </div>

              {/* Result Voter & Family Card */}
              <div style={{ display: 'grid', gridTemplateColumns: '1.25fr 0.95fr', gap: '20px' }}>
                {/* Left: Voter Details Card */}
                <div style={{ background: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', padding: '20px', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid #f1f5f9', paddingBottom: '14px' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <h3 style={{ fontSize: '20px', fontWeight: 900, color: '#0f172a', margin: 0 }}>
                          रमेश कुमार शर्मा
                        </h3>
                        <span style={{ fontSize: '12px', color: '#64748b' }}>(Ramesh Kumar Sharma)</span>
                      </div>
                      <div style={{ fontSize: '12px', color: '#0284c7', fontWeight: 800, marginTop: '2px' }}>
                        EPIC: VJY8923412 • क्र. सं. 148
                      </div>
                    </div>
                    <span style={{ background: '#dcfce7', color: '#15803d', padding: '4px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: 800 }}>
                      वोटर पर्ची तैयार
                    </span>
                  </div>

                  {/* Grid of details */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', margin: '16px 0' }}>
                    <div style={{ background: '#f8fafc', padding: '10px', borderRadius: '8px' }}>
                      <div style={{ fontSize: '11px', color: '#64748b' }}>पिता का नाम:</div>
                      <div style={{ fontSize: '13px', fontWeight: 800, color: '#1e293b' }}>रामस्वरूप शर्मा</div>
                    </div>
                    <div style={{ background: '#f8fafc', padding: '10px', borderRadius: '8px' }}>
                      <div style={{ fontSize: '11px', color: '#64748b' }}>मकान संख्या:</div>
                      <div style={{ fontSize: '13px', fontWeight: 800, color: '#1e293b' }}>B-104 (वार्ड 82)</div>
                    </div>
                    <div style={{ background: '#f8fafc', padding: '10px', borderRadius: '8px' }}>
                      <div style={{ fontSize: '11px', color: '#64748b' }}>आयु / लिंग:</div>
                      <div style={{ fontSize: '13px', fontWeight: 800, color: '#1e293b' }}>42 वर्ष / पुरुष</div>
                    </div>
                  </div>

                  <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '10px', padding: '12px', marginBottom: '16px' }}>
                    <div style={{ fontSize: '11px', fontWeight: 700, color: '#1e40af' }}>मतदान केंद्र (Polling Station):</div>
                    <div style={{ fontSize: '13px', fontWeight: 800, color: '#1e3a8a', marginTop: '2px' }}>
                      📍 569 - राजकीय उच्च प्राथमिक विद्यालय, कमरा नं. 1, जोधपुर
                    </div>
                  </div>

                  {/* Family Members Accordion */}
                  <div style={{ border: '1.5px solid #93c5fd', borderRadius: '12px', padding: '14px', background: '#f0f9ff' }}>
                    <div
                      onClick={() => setShowFamily(!showFamily)}
                      style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Users size={18} color="#0284c7" />
                        <span style={{ fontSize: '14px', fontWeight: 800, color: '#0369a1' }}>
                          एक ही परिवार के 5 सदस्य (Family Members):
                        </span>
                      </div>
                      <span style={{ fontSize: '11px', background: '#0284c7', color: '#ffffff', padding: '2px 8px', borderRadius: '10px', fontWeight: 700 }}>
                        मकान नं. B-104
                      </span>
                    </div>

                    {showFamily && (
                      <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {[
                          { name: 'रामस्वरूप शर्मा', relation: 'पिता', age: 68, epic: 'VJY8923410' },
                          { name: 'सुनीता शर्मा', relation: 'पत्नी', age: 38, epic: 'VJY8923413' },
                          { name: 'राहुल शर्मा', relation: 'पुत्र', age: 21, epic: 'VJY8923414' },
                          { name: 'प्रिया शर्मा', relation: 'पुत्री', age: 19, epic: 'VJY8923415' },
                        ].map((m, idx) => (
                          <div
                            key={idx}
                            style={{
                              background: '#ffffff',
                              padding: '8px 12px',
                              borderRadius: '8px',
                              border: '1px solid #bae6fd',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                            }}
                          >
                            <div>
                              <span style={{ fontSize: '13px', fontWeight: 800, color: '#0f172a' }}>{m.name}</span>
                              <span style={{ fontSize: '11px', color: '#64748b', marginLeft: '6px' }}>({m.relation}, {m.age} वर्ष)</span>
                            </div>
                            <span style={{ fontSize: '11px', fontWeight: 700, color: '#0284c7' }}>{m.epic}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Right: Rendered Voter Slip */}
                <div style={{ background: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', padding: '16px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <div style={{ fontSize: '13px', fontWeight: 800, color: '#0f172a', marginBottom: '10px', width: '100%', display: 'flex', justifyContent: 'space-between' }}>
                    <span>🖨️ जनरेटेड वोटर पर्ची</span>
                    <span style={{ color: '#059669', fontSize: '11px' }}>1-क्लिक प्रिंट रेडी</span>
                  </div>
                  <div style={{ transform: 'scale(0.85)', transformOrigin: 'top center' }}>
                    <VoterSlipTemplate
                      voter={{
                        epic: 'VJY8923412',
                        nameHi: 'रमेश कुमार शर्मा',
                        nameEn: 'Ramesh Kumar Sharma',
                        relativeNameHi: 'रामस्वरूप शर्मा',
                        relativeNameEn: 'Ramswaroop Sharma',
                        relationType: 'पिता',
                        age: 42,
                        gender: 'M',
                        houseNo: 'B-104',
                        wardNo: '82',
                        serialNo: 148,
                        boothName: '569 - राजकीय उच्च प्राथमिक विद्यालय, कमरा 1',
                      }}
                      config={{
                        ...defaultSlipConfig,
                        candidateName: 'विजय कुमार राठौड़',
                        partyName: 'भारतीय जनता पार्टी (भाजपा) प्रत्याशी',
                        partySymbolName: 'कमल का फूल',
                        evmNumber: '1',
                      }}
                      format="full"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* SCENE 2: BULK SLIPS & WHATSAPP SHARING */}
          {currentScene === 2 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* Header Box */}
              <div style={{ background: '#ffffff', borderRadius: '14px', border: '1px solid #e2e8f0', padding: '18px 22px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h3 style={{ fontSize: '18px', fontWeight: 900, color: '#0f172a', margin: 0 }}>
                    ⚡ डिजिटल वोटर पर्ची वितरण इंजन (Digital Slip Distribution)
                  </h3>
                  <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#64748b' }}>
                    कागज़ और फाइलों के झंझट से सम्पूर्ण मुक्ति! एक क्लिक में सभी मतदाताओं को उनके व्यक्तिगत मोबाइल पर पर्ची भेजें।
                  </p>
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button
                    onClick={() => setWhatsAppModal(true)}
                    style={{
                      background: '#16a34a',
                      color: '#ffffff',
                      border: 'none',
                      padding: '10px 18px',
                      borderRadius: '10px',
                      fontSize: '13px',
                      fontWeight: 800,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      cursor: 'pointer',
                      boxShadow: '0 4px 12px rgba(22, 163, 74, 0.3)',
                    }}
                  >
                    <Send size={16} />
                    <span>व्हाट्सएप पर बल्क भेजें</span>
                  </button>
                  <button
                    style={{
                      background: '#eff6ff',
                      color: '#2563eb',
                      border: '1px solid #bfdbfe',
                      padding: '10px 16px',
                      borderRadius: '10px',
                      fontSize: '13px',
                      fontWeight: 800,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      cursor: 'pointer',
                    }}
                  >
                    <Download size={16} />
                    <span>PDF ज़िप डाउनलोड</span>
                  </button>
                </div>
              </div>

              {/* 3 Step Pipeline Visualizer */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
                <div style={{ background: '#ffffff', border: '1.5px solid #93c5fd', borderRadius: '14px', padding: '18px' }}>
                  <div style={{ fontSize: '12px', fontWeight: 800, color: '#2563eb', marginBottom: '8px' }}>कदम 1: चुनाव चिन्ह व प्रत्याशी</div>
                  <div style={{ fontSize: '15px', fontWeight: 900, color: '#0f172a' }}>विजय कुमार राठौड़</div>
                  <div style={{ fontSize: '12px', color: '#059669', fontWeight: 700, marginTop: '4px' }}>✓ ईवीएम क्रम संख्या: 1</div>
                  <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>चिन्ह: कमल का फूल (स्वीकृत)</div>
                </div>

                <div style={{ background: '#ffffff', border: '1.5px solid #86efac', borderRadius: '14px', padding: '18px' }}>
                  <div style={{ fontSize: '12px', fontWeight: 800, color: '#059669', marginBottom: '8px' }}>कदम 2: बूथ मैपिंग स्थिति</div>
                  <div style={{ fontSize: '15px', fontWeight: 900, color: '#0f172a' }}>82 / 82 बूथ पूर्ण रूप से मैप्ड</div>
                  <div style={{ fontSize: '12px', color: '#0284c7', fontWeight: 700, marginTop: '4px' }}>✓ 1-क्लिक बल्क असाइनमेंट इंजन</div>
                  <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>सभी 25 वार्डों के केंद्र कॉन्फिगर हैं</div>
                </div>

                <div style={{ background: '#ffffff', border: '1.5px solid #fdba74', borderRadius: '14px', padding: '18px' }}>
                  <div style={{ fontSize: '12px', fontWeight: 800, color: '#ea580c', marginBottom: '8px' }}>कदम 3: वितरण प्रोग्रेस</div>
                  <div style={{ fontSize: '15px', fontWeight: 900, color: '#0f172a' }}>89,420 पर्चियाँ डिलीवर</div>
                  <div style={{ fontSize: '12px', color: '#ea580c', fontWeight: 700, marginTop: '4px' }}>✓ 98.4% डिलीवरी सफलता दर</div>
                  <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>ऑडिट हिस्ट्री लॉग उपलब्ध</div>
                </div>
              </div>

              {/* Bulk Queue Table */}
              <div style={{ background: '#ffffff', borderRadius: '14px', border: '1px solid #e2e8f0', padding: '18px' }}>
                <div style={{ fontSize: '14px', fontWeight: 800, color: '#0f172a', marginBottom: '12px' }}>
                  📋 हालिया भेजे गए बल्क बैच (Recent WhatsApp Dispatches)
                </div>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                  <thead>
                    <tr style={{ background: '#f8fafc', color: '#64748b', textAlign: 'left', borderBottom: '1px solid #e2e8f0' }}>
                      <th style={{ padding: '8px 12px' }}>वार्ड</th>
                      <th style={{ padding: '8px 12px' }}>मतदान केंद्र</th>
                      <th style={{ padding: '8px 12px' }}>कुल मतदाता</th>
                      <th style={{ padding: '8px 12px' }}>व्हाट्सएप भेजे</th>
                      <th style={{ padding: '8px 12px' }}>स्थिति</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { ward: 'वार्ड 82', booth: 'राजकीय स्कूल, कमरा 1', total: '1,420', sent: '1,380', st: 'सफल पूर्ण (97%)' },
                      { ward: 'वार्ड 83', booth: 'सामुदायिक भवन, मुख्य चौक', total: '1,650', sent: '1,610', st: 'सफल पूर्ण (98%)' },
                      { ward: 'वार्ड 84', booth: 'महात्मा गांधी विद्यालय', total: '1,280', sent: '1,220', st: 'सफल पूर्ण (95%)' },
                      { ward: 'वार्ड 85', booth: 'बालिका सीनियर सेकेंडरी स्कूल', total: '1,510', sent: '1,490', st: 'सफल पूर्ण (99%)' },
                    ].map((r, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '10px 12px', fontWeight: 800, color: '#1e293b' }}>{r.ward}</td>
                        <td style={{ padding: '10px 12px', color: '#475569' }}>{r.booth}</td>
                        <td style={{ padding: '10px 12px', fontWeight: 700 }}>{r.total}</td>
                        <td style={{ padding: '10px 12px', fontWeight: 800, color: '#16a34a' }}>{r.sent}</td>
                        <td style={{ padding: '10px 12px' }}>
                          <span style={{ background: '#ecfdf5', color: '#047857', padding: '3px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: 800 }}>
                            {r.st}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* SCENE 3: LIVE TURNOUT & POLLING DESK */}
          {currentScene === 3 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* Live Status Bar */}
              <div style={{ background: '#0f172a', borderRadius: '14px', padding: '18px 24px', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#ef4444', animation: 'pulse 1.5s infinite' }} />
                  <div>
                    <h3 style={{ fontSize: '18px', fontWeight: 900, margin: 0 }}>🔴 लाइव पोलिंग डे डेस्क (Live Election Day Turnout)</h3>
                    <div style={{ fontSize: '12px', color: '#94a3b8' }}>हर सेकंड की रियल-टाइम वोटिंग अपडेट • 82 बूथ लाइव कनेक्टेड</div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '11px', color: '#94a3b8' }}>कुल मतदान दर:</div>
                    <div style={{ fontSize: '26px', fontWeight: 900, color: '#22c55e' }}>68.4%</div>
                  </div>
                  <div style={{ height: '36px', width: '1px', background: '#334155' }} />
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '11px', color: '#94a3b8' }}>कुल वोट पड़े:</div>
                    <div style={{ fontSize: '22px', fontWeight: 900, color: '#38bdf8' }}>85,158</div>
                  </div>
                </div>
              </div>

              {/* Turnout Filters & Booth Table */}
              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '20px' }}>
                <div style={{ background: '#ffffff', borderRadius: '14px', border: '1px solid #e2e8f0', padding: '18px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                    <div style={{ fontSize: '14px', fontWeight: 800, color: '#0f172a' }}>📊 घंटे-वार मतदान दर (Hourly Turnout)</div>
                    <span style={{ fontSize: '11px', color: '#64748b' }}>शाम 5:00 बजे तक</span>
                  </div>

                  {/* Hourly Chart Bar Visuals */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {[
                      { time: '07:00 AM - 09:00 AM', votes: '14,940', pct: 12, col: '#38bdf8' },
                      { time: '09:00 AM - 11:00 AM', votes: '34,860', pct: 28, col: '#38bdf8' },
                      { time: '11:00 AM - 01:00 PM', votes: '56,025', pct: 45, col: '#3b82f6' },
                      { time: '01:00 PM - 03:00 PM', votes: '72,210', pct: 58, col: '#2563eb' },
                      { time: '03:00 PM - 05:00 PM', votes: '85,158', pct: 68.4, col: '#16a34a' },
                    ].map((h, i) => (
                      <div key={i}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: 700, marginBottom: '3px' }}>
                          <span style={{ color: '#334155' }}>{h.time}</span>
                          <span style={{ color: h.col, fontWeight: 900 }}>{h.pct}% ({h.votes} वोट)</span>
                        </div>
                        <div style={{ width: '100%', height: '8px', background: '#f1f5f9', borderRadius: '4px', overflow: 'hidden' }}>
                          <div style={{ width: `${h.pct}%`, height: '100%', background: h.col, borderRadius: '4px' }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Right: Unvoted Real-time Action List */}
                <div style={{ background: '#ffffff', borderRadius: '14px', border: '1px solid #e2e8f0', padding: '18px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                    <div style={{ fontSize: '14px', fontWeight: 800, color: '#dc2626' }}>
                      ⚠️ किसने वोट नहीं डाला (Pending Voters)
                    </div>
                    <span style={{ background: '#fee2e2', color: '#b91c1c', padding: '2px 8px', borderRadius: '10px', fontSize: '11px', fontWeight: 800 }}>
                      तत्काल संपर्क
                    </span>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {[
                      { name: 'महेश चंद्र जोशी', house: 'A-42', ward: 'वार्ड 82', phone: '98290-XXXXX' },
                      { name: 'भावना गहलोत', house: 'C-18', ward: 'वार्ड 82', phone: '94141-XXXXX' },
                      { name: 'सुरेश कुमार बिश्नोई', house: 'D-89', ward: 'वार्ड 82', phone: '97823-XXXXX' },
                      { name: 'सीमा परिहार', house: 'B-31', ward: 'वार्ड 82', phone: '99281-XXXXX' },
                    ].map((p, i) => (
                      <div key={i} style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', padding: '8px 10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <div style={{ fontSize: '12px', fontWeight: 800, color: '#991b1b' }}>{p.name}</div>
                          <div style={{ fontSize: '10px', color: '#7f1d1d' }}>{p.house} • {p.ward}</div>
                        </div>
                        <button style={{ background: '#dc2626', color: '#ffffff', border: 'none', padding: '4px 8px', borderRadius: '6px', fontSize: '10px', fontWeight: 700, cursor: 'pointer' }}>
                          कॉल करें
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* SCENE 4: WORKER MANAGEMENT & WAR ROOM */}
          {currentScene === 4 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div style={{ background: '#ffffff', borderRadius: '14px', border: '1px solid #e2e8f0', padding: '18px 22px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h3 style={{ fontSize: '18px', fontWeight: 900, color: '#0f172a', margin: 0 }}>
                    👥 कार्यकर्ता व चुनावी टीम प्रबंधन (Worker & Booth Captains)
                  </h3>
                  <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#64748b' }}>
                    सभी 245 वॉलिंटियर्स को ऑनलाइन बूथ सौंपें, उनकी लाइव रिपोर्ट ट्रैक करें और फील्ड ऑपरेशंस नियंत्रित करें।
                  </p>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <span style={{ background: '#ecfdf5', color: '#059669', border: '1px solid #a7f3d0', padding: '6px 14px', borderRadius: '8px', fontSize: '12px', fontWeight: 800 }}>
                    245 ऑन-फील्ड सक्रिय
                  </span>
                </div>
              </div>

              {/* Workers Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
                {[
                  { name: 'अनिल जांगिड़', role: 'बूथ 1 प्रभारी', assigned: 'वार्ड 82 (राजकीय स्कूल)', coverage: '94% पर्ची वितरित', phone: '98291-XXXXX', st: 'फील्ड में सक्रिय' },
                  { name: 'राकेश चौधरी', role: 'बूथ 2 प्रभारी', assigned: 'वार्ड 82 (सामुदायिक भवन)', coverage: '88% पर्ची वितरित', phone: '94142-XXXXX', st: 'फील्ड में सक्रिय' },
                  { name: 'विक्रम सिंह राठौड़', role: 'बूथ 3 प्रभारी', assigned: 'वार्ड 83 (बालिका विद्यालय)', coverage: '96% पर्ची वितरित', phone: '97825-XXXXX', st: 'फील्ड में सक्रिय' },
                  { name: 'मनोज सांखला', role: 'बूथ 4 प्रभारी', assigned: 'वार्ड 83 (महात्मा गांधी स्कूल)', coverage: '91% पर्ची वितरित', phone: '99283-XXXXX', st: 'फील्ड में सक्रिय' },
                  { name: 'दिनेश परिहार', role: 'बूथ 5 प्रभारी', assigned: 'वार्ड 84 (जोधपुर क्लब हॉल)', coverage: '89% पर्ची वितरित', phone: '96101-XXXXX', st: 'फील्ड में सक्रिय' },
                  { name: 'सुरेंद्र विश्नोई', role: 'बूथ 6 प्रभारी', assigned: 'वार्ड 84 (पंचायत भवन)', coverage: '95% पर्ची वितरित', phone: '95874-XXXXX', st: 'फील्ड में सक्रिय' },
                ].map((w, i) => (
                  <div key={i} style={{ background: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '16px', boxShadow: '0 2px 6px rgba(0,0,0,0.02)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <div style={{ fontSize: '15px', fontWeight: 900, color: '#1e293b' }}>{w.name}</div>
                        <div style={{ fontSize: '11px', color: '#2563eb', fontWeight: 700 }}>{w.role}</div>
                      </div>
                      <span style={{ background: '#dcfce7', color: '#15803d', padding: '2px 8px', borderRadius: '10px', fontSize: '10px', fontWeight: 800 }}>
                        {w.st}
                      </span>
                    </div>

                    <div style={{ margin: '12px 0', fontSize: '11px', color: '#64748b' }}>
                      <div>स्थान: <strong style={{ color: '#334155' }}>{w.assigned}</strong></div>
                      <div style={{ marginTop: '2px' }}>प्रगति: <strong style={{ color: '#059669' }}>{w.coverage}</strong></div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #f1f5f9', paddingTop: '10px' }}>
                      <span style={{ fontSize: '11px', fontWeight: 700, color: '#64748b' }}>{w.phone}</span>
                      <button style={{ background: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe', padding: '4px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: 700, cursor: 'pointer' }}>
                        टास्क भेजें
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* SCENE 5: COMMUNITY EQUATIONS & FINAL REPORTS */}
          {currentScene === 5 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div style={{ background: '#ffffff', borderRadius: '14px', border: '1px solid #e2e8f0', padding: '18px 22px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h3 style={{ fontSize: '18px', fontWeight: 900, color: '#0f172a', margin: 0 }}>
                    📈 सामाजिक समीकरण व अंतिम चुनावी रुझान रिपोर्ट
                  </h3>
                  <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#64748b' }}>
                    चुनाव संपन्न होते ही 1-क्लिक में कुल मतदान, बूथ-वार रुझान और सामाजिक समीकरणों की विस्तृत रिपोर्ट प्राप्त करें।
                  </p>
                </div>
                <button
                  style={{
                    background: '#2563eb',
                    color: '#ffffff',
                    border: 'none',
                    padding: '10px 18px',
                    borderRadius: '10px',
                    fontSize: '13px',
                    fontWeight: 800,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    cursor: 'pointer',
                  }}
                >
                  <Download size={16} />
                  <span>एक्सल / पीडीएफ रिपोर्ट डाउनलोड</span>
                </button>
              </div>

              {/* Two Column Analysis */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                {/* Community Equation Table */}
                <div style={{ background: '#ffffff', borderRadius: '14px', border: '1px solid #e2e8f0', padding: '18px' }}>
                  <div style={{ fontSize: '14px', fontWeight: 800, color: '#0f172a', marginBottom: '12px' }}>
                    🏛️ जातिगत व सामाजिक समीकरण (Demographic Breakdown)
                  </div>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                    <thead>
                      <tr style={{ background: '#f8fafc', color: '#64748b', textAlign: 'left', borderBottom: '1px solid #e2e8f0' }}>
                        <th style={{ padding: '8px 10px' }}>समुदाय / वर्ग</th>
                        <th style={{ padding: '8px 10px' }}>कुल वोटर</th>
                        <th style={{ padding: '8px 10px' }}>वोट प्रतिशत</th>
                        <th style={{ padding: '8px 10px' }}>रुझान</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[
                        { group: 'वर्ग A (सामान्य)', total: '42,500', pct: '34.1%', trend: 'मजबूत बढ़त (74%)', col: '#059669' },
                        { group: 'वर्ग B (ओबीसी)', total: '48,200', pct: '38.7%', trend: 'सकारात्मक (68%)', col: '#2563eb' },
                        { group: 'वर्ग C (एससी/एसटी)', total: '21,800', pct: '17.5%', trend: 'समान समर्थन (58%)', col: '#d97706' },
                        { group: 'वर्ग D (अल्पसंख्यक व अन्य)', total: '12,000', pct: '9.7%', trend: 'संतुलित (52%)', col: '#7c3aed' },
                      ].map((r, i) => (
                        <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '10px 10px', fontWeight: 800, color: '#1e293b' }}>{r.group}</td>
                          <td style={{ padding: '10px 10px', fontWeight: 700 }}>{r.total}</td>
                          <td style={{ padding: '10px 10px', color: '#64748b' }}>{r.pct}</td>
                          <td style={{ padding: '10px 10px', fontWeight: 800, color: r.col }}>{r.trend}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Final Prediction Metrics */}
                <div style={{ background: '#ffffff', borderRadius: '14px', border: '1px solid #e2e8f0', padding: '18px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: 800, color: '#0f172a', marginBottom: '8px' }}>
                      🏆 अंतिम चुनावी रुझान सारांश
                    </div>
                    <p style={{ fontSize: '12px', color: '#64748b', lineHeight: 1.5 }}>
                      वार्ड 82 के सभी 15 मतदान केंद्रों से प्राप्त लाइव डेटा के अनुसार आपके पक्ष में भारी जनसमर्थन और निर्णायक बढ़त दर्ज की गई है।
                    </p>
                  </div>

                  <div style={{ background: '#ecfdf5', border: '1.5px solid #a7f3d0', borderRadius: '12px', padding: '16px', textAlign: 'center' }}>
                    <div style={{ fontSize: '12px', fontWeight: 800, color: '#047857' }}>प्रत्याशित विजय अंतर</div>
                    <div style={{ fontSize: '32px', fontWeight: 900, color: '#059669', margin: '4px 0' }}>+8,450 वोट</div>
                    <div style={{ fontSize: '11px', color: '#065f46' }}>ऐतिहासिक बढ़त के साथ विजय सुनिश्चित</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* SCENE 6: GRAND CLOSING & LIVE DEMO CTA */}
          {currentScene === 6 && (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                height: '100%',
                textAlign: 'center',
                padding: '20px',
              }}
            >
              <div
                style={{
                  maxWidth: '780px',
                  background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
                  borderRadius: '24px',
                  padding: '48px 40px',
                  color: '#ffffff',
                  boxShadow: '0 20px 50px rgba(0,0,0,0.3)',
                  border: '1px solid #334155',
                }}
              >
                <div
                  style={{
                    width: '64px',
                    height: '64px',
                    borderRadius: '16px',
                    background: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 20px',
                    boxShadow: '0 10px 25px rgba(234, 88, 12, 0.4)',
                  }}
                >
                  <Vote size={36} color="#ffffff" />
                </div>

                <h1 style={{ fontSize: '34px', fontWeight: 900, margin: '0 0 12px', letterSpacing: '-0.5px' }}>
                  विजयसेतु <span style={{ color: '#fb923c' }}>(VijaySetu)</span>
                </h1>
                <p style={{ fontSize: '18px', color: '#cbd5e1', margin: '0 0 24px', fontWeight: 600 }}>
                  India का सबसे एडवांस इलेक्शन मैनेजमेंट सिस्टम
                </p>

                <div style={{ background: 'rgba(255, 255, 255, 0.08)', borderRadius: '16px', padding: '20px', border: '1px solid rgba(255, 255, 255, 0.15)', marginBottom: '28px' }}>
                  <div style={{ fontSize: '15px', color: '#fdba74', fontWeight: 800 }}>
                    🔥 "असली कमाल सिर्फ सुनने में नहीं, इसे काम करते हुए देखने में है!"
                  </div>
                  <div style={{ fontSize: '13px', color: '#94a3b8', marginTop: '6px' }}>
                    आज ही बुक कीजिए विजयसेतु ऐप का लाइव डेमो और अपनी ऐतिहासिक जीत सुनिश्चित कीजिए!
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'center', gap: '16px' }}>
                  <button
                    style={{
                      background: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
                      color: '#ffffff',
                      border: 'none',
                      padding: '14px 32px',
                      borderRadius: '12px',
                      fontSize: '16px',
                      fontWeight: 800,
                      cursor: 'pointer',
                      boxShadow: '0 6px 20px rgba(234, 88, 12, 0.4)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                    }}
                  >
                    <Phone size={18} />
                    <span>लाइव डेमो बुक करें: 98290-XXXXX</span>
                  </button>
                  <button
                    style={{
                      background: 'rgba(255,255,255,0.1)',
                      color: '#ffffff',
                      border: '1px solid rgba(255,255,255,0.2)',
                      padding: '14px 28px',
                      borderRadius: '12px',
                      fontSize: '16px',
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    <span>vijaysetu.com</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* 3. Audio Synchronized Subtitle / Voiceover Banner */}
      <footer
        style={{
          height: '74px',
          background: '#090d16',
          borderTop: '2px solid #ea580c',
          padding: '0 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexShrink: 0,
          color: '#ffffff',
          boxShadow: '0 -4px 20px rgba(0,0,0,0.25)',
          zIndex: 100,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flex: 1 }}>
          <div
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              background: '#ea580c',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <Sparkles size={18} color="#ffffff" />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ fontSize: '11px', color: '#fb923c', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.4px' }}>
              🎙️ {currentSub.title} ({currentSub.time})
            </div>
            <div style={{ fontSize: '13px', fontWeight: 700, color: '#f1f5f9', marginTop: '2px', lineHeight: 1.3 }}>
              "{currentSub.hindi}"
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '11px', fontWeight: 800, background: '#1e293b', border: '1px solid #334155', color: '#94a3b8', padding: '4px 10px', borderRadius: '12px' }}>
            सीन {currentScene + 1} / 7
          </span>
        </div>
      </footer>
    </div>
  );
}
