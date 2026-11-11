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
  const [searchQuery, setSearchQuery] = useState<string>('मतदाता');
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
    <div className="flex flex-col min-h-[100dvh] w-full max-w-full overflow-x-hidden bg-[#f8fafc] font-sans">
      {/* 1. Global App Header */}
      <header
        className="px-3 sm:px-6 py-2.5 flex flex-wrap items-center justify-between gap-2.5 shrink-0 z-50 border-b border-[#334155]"
        style={{
          background: 'linear-gradient(90deg, #0f172a 0%, #1e293b 100%)',
        }}
      >
        {/* Left: Branding */}
        <div className="flex items-center gap-3 min-w-0">
          <div
            className="w-9 h-9 rounded-[10px] flex items-center justify-center shrink-0"
            style={{
              background: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
              boxShadow: '0 4px 12px rgba(234, 88, 12, 0.4)',
            }}
          >
            <Vote size={20} color="#ffffff" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[16px] sm:text-[18px] font-black text-white tracking-tight">
                VijaySetu <span className="text-[#fb923c]">विजयसेतु</span>
              </span>
              <span
                className="text-[10px] font-extrabold px-2 py-0.5 rounded-full tracking-wide shrink-0"
                style={{
                  background: 'rgba(234, 88, 12, 0.25)',
                  border: '1px solid #ea580c',
                  color: '#fdba74',
                }}
              >
                ELECTION OS
              </span>
            </div>
            <div className="text-[11px] text-[#94a3b8] truncate">
              हर वोट • सही दिशा • व्यवस्थित चुनावी प्रबंधन
            </div>
          </div>
        </div>

        {/* Center: Active Candidate Badge */}
        <div
          className="hidden lg:flex items-center gap-3 px-4 py-1.5 rounded-full"
          style={{
            background: 'rgba(255, 255, 255, 0.08)',
            border: '1px solid rgba(255, 255, 255, 0.15)',
          }}
        >
          <div className="w-2 h-2 rounded-full bg-[#22c55e]" style={{ boxShadow: '0 0 8px #22c55e' }} />
          <div className="text-[12px] text-[#e2e8f0]">
            प्रत्याशी: <strong className="text-white">प्रत्याशी का नाम (डेमो)</strong> (वार्ड 01)
          </div>
          <span className="bg-[#3b82f6] text-white text-[10px] font-extrabold px-2 py-0.5 rounded-full">
            लाइव वॉर-रूम
          </span>
        </div>

        {/* Right: Quick Stats & Navigation Pills (Horizontally scrollable on mobile) */}
        <div className="flex items-center gap-1.5 w-full md:w-auto overflow-x-auto pb-0.5 no-scrollbar">
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
              className="shrink-0 px-2.5 py-1.5 rounded-lg text-[11px] font-bold cursor-pointer transition-all"
              style={{
                background: currentScene === item.id ? '#ea580c' : 'rgba(255, 255, 255, 0.06)',
                border: currentScene === item.id ? '1px solid #f97316' : '1px solid rgba(255, 255, 255, 0.1)',
                color: currentScene === item.id ? '#ffffff' : '#cbd5e1',
              }}
            >
              {item.label}
            </button>
          ))}
        </div>
      </header>

      {/* 2. Main Workspace Layout */}
      <div className="flex flex-1 min-w-0">
        {/* Left Sidebar (Desktop Only — mobile uses header scrollable pills) */}
        <aside
          className="hidden md:flex flex-col justify-between shrink-0 bg-white border-r border-[#e2e8f0] w-[230px] px-2.5 py-4"
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
            <div style={{ fontSize: '11px', fontWeight: 800, color: '#334155' }}>वॉर-रूम तकनीकी सहायता</div>
            <div style={{ fontSize: '10px', color: '#64748b', marginTop: '2px' }}>ऑफ़लाइन-फर्स्ट • सुरक्षित सिंक</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '8px', fontSize: '11px', color: '#047857', fontWeight: 700 }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981' }} />
              सक्रिय सिंक्रोनाइज़्ड
            </div>
          </div>
        </aside>

        {/* Center Main Stage */}
        <main
          className="flex-1 flex flex-col min-w-0 bg-[#f8fafc] p-3 sm:p-5 lg:p-6 relative"
        >
          {/* SCENE 0: MAIN DASHBOARD */}
          {currentScene === 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* Top Welcome Card */}
              <div
                className="rounded-2xl p-5 sm:px-7 sm:py-6 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                style={{
                  background: 'linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%)',
                  boxShadow: '0 8px 24px rgba(37, 99, 235, 0.2)',
                }}
              >
                <div className="min-w-0">
                  <span style={{ background: 'rgba(255,255,255,0.2)', padding: '3px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: 700 }}>
                    चुनावी कमान केंद्र (Election Command Center)
                  </span>
                  <h2 className="text-[19px] sm:text-[24px] font-black mt-2 mb-1 tracking-tight leading-snug">
                    नमस्ते, आपका चुनावी प्रबंधन डैशबोर्ड तैयार है!
                  </h2>
                  <p className="m-0 text-[13px] text-[#bfdbfe] max-w-[640px]">
                    सभी वार्डों व मतदान केंद्रों का नमूना डेटा सुव्यवस्थित है। आप एक क्लिक में मतदाता सूची, पर्ची प्रिंट व टर्नआउट देख सकते हैं।
                  </p>
                </div>
                <div className="flex gap-3 shrink-0">
                  <div className="bg-white/15 border border-white/25 px-4 py-3 rounded-xl text-center">
                    <div className="text-[20px] sm:text-[22px] font-black">डेमो मोड</div>
                    <div className="text-[11px] text-[#bfdbfe]">लाइव सिमुलेशन</div>
                  </div>
                </div>
              </div>

              {/* 4 Stat Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                {[
                  { label: 'मतदाता सूची प्रबंधन', val: 'वार्ड व बूथ वार', sub: 'नमूना डेटा प्रिव्यू', color: '#2563eb', bg: '#eff6ff' },
                  { label: 'मतदान केंद्र (Booths)', val: 'पोलिंग स्टेशन मैप', sub: 'कमरा व पता विवरण', color: '#059669', bg: '#ecfdf5' },
                  { label: 'डिजिटल वोटर पर्ची', val: 'प्रिंट व WhatsApp', sub: 'A4 बल्क + 1-क्लिक शेयर', color: '#ea580c', bg: '#fff7ed' },
                  { label: 'ऑन-फील्ड कार्यकर्ता', val: 'भूमिका आधारित लॉगिन', sub: 'वॉर-रूम व बूथ डेस्क', color: '#7c3aed', bg: '#f5f3ff' },
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
              <div className="grid grid-cols-1 lg:grid-cols-[1.5fr_1fr] gap-5">
                <div style={{ background: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', padding: '20px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', gap: '8px', flexWrap: 'wrap' }}>
                    <div style={{ fontSize: '15px', fontWeight: 800, color: '#0f172a' }}>⚡ त्वरित चुनावी कार्य (Quick Actions)</div>
                    <span style={{ fontSize: '11px', color: '#2563eb', fontWeight: 700 }}>1-क्लिक एक्सेस</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                      { name: 'मतदान केंद्र 01 (नमूना स्कूल)', ward: 'वार्ड 1', pct: 92, col: '#10b981' },
                      { name: 'मतदान केंद्र 02 (सामुदायिक भवन)', ward: 'वार्ड 2', pct: 88, col: '#3b82f6' },
                      { name: 'मतदान केंद्र 03 (राजकीय विद्यालय)', ward: 'वार्ड 3', pct: 76, col: '#f59e0b' },
                      { name: 'मतदान केंद्र 04 (पंचायत भवन)', ward: 'वार्ड 4', pct: 84, col: '#8b5cf6' },
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
                className="bg-white p-3.5 sm:px-5 sm:py-4 rounded-[14px] border-[1.5px] border-[#cbd5e1] flex flex-col sm:flex-row sm:items-center gap-3"
                style={{ boxShadow: '0 4px 14px rgba(0,0,0,0.04)' }}
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
                    नमूना मैच प्रदर्शित
                  </span>
                </div>
              </div>

              {/* Result Voter & Family Card */}
              <div className="grid grid-cols-1 lg:grid-cols-[1.25fr_0.95fr] gap-5">
                {/* Left: Voter Details Card */}
                <div className="bg-white rounded-2xl border border-[#e2e8f0] p-4 sm:p-5 min-w-0" style={{ boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
                  <div className="flex flex-wrap justify-between items-start gap-2 border-b border-[#f1f5f9] pb-3.5">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-[18px] sm:text-[20px] font-black text-[#0f172a] m-0">
                          मतदाता का नाम (नमूना)
                        </h3>
                        <span className="text-[12px] text-[#64748b]">(Sample Voter Record)</span>
                      </div>
                      <div style={{ fontSize: '12px', color: '#0284c7', fontWeight: 800, marginTop: '2px' }}>
                        EPIC: EPIC0000148 • क्र. सं. 148
                      </div>
                    </div>
                    <span style={{ background: '#dcfce7', color: '#15803d', padding: '4px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: 800 }}>
                      वोटर पर्ची तैयार
                    </span>
                  </div>

                  {/* Grid of details */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 my-4">
                    <div style={{ background: '#f8fafc', padding: '10px', borderRadius: '8px' }}>
                      <div style={{ fontSize: '11px', color: '#64748b' }}>पिता / अभिभावक:</div>
                      <div style={{ fontSize: '13px', fontWeight: 800, color: '#1e293b' }}>अभिभावक का नाम (नमूना)</div>
                    </div>
                    <div style={{ background: '#f8fafc', padding: '10px', borderRadius: '8px' }}>
                      <div style={{ fontSize: '11px', color: '#64748b' }}>मकान संख्या:</div>
                      <div style={{ fontSize: '13px', fontWeight: 800, color: '#1e293b' }}>M-104 (वार्ड 01)</div>
                    </div>
                    <div style={{ background: '#f8fafc', padding: '10px', borderRadius: '8px' }}>
                      <div style={{ fontSize: '11px', color: '#64748b' }}>आयु / लिंग:</div>
                      <div style={{ fontSize: '13px', fontWeight: 800, color: '#1e293b' }}>42 वर्ष / पुरुष</div>
                    </div>
                  </div>

                  <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '10px', padding: '12px', marginBottom: '16px' }}>
                    <div style={{ fontSize: '11px', fontWeight: 700, color: '#1e40af' }}>मतदान केंद्र (Polling Station):</div>
                    <div style={{ fontSize: '13px', fontWeight: 800, color: '#1e3a8a', marginTop: '2px' }}>
                      📍 01 - राजकीय विद्यालय, कमरा नं. 1 (नमूना केंद्र)
                    </div>
                  </div>

                  {/* Family Members Accordion */}
                  <div style={{ border: '1.5px solid #93c5fd', borderRadius: '12px', padding: '14px', background: '#f0f9ff' }}>
                    <div
                      onClick={() => setShowFamily(!showFamily)}
                      style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', flexWrap: 'wrap', gap: '8px' }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Users size={18} color="#0284c7" />
                        <span style={{ fontSize: '14px', fontWeight: 800, color: '#0369a1' }}>
                          एक ही परिवार के सदस्य (Family Members):
                        </span>
                      </div>
                      <span style={{ fontSize: '11px', background: '#0284c7', color: '#ffffff', padding: '2px 8px', borderRadius: '10px', fontWeight: 700 }}>
                        मकान नं. M-104
                      </span>
                    </div>

                    {showFamily && (
                      <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {[
                          { name: 'परिवार सदस्य 1 (नमूना)', relation: 'पिता', age: 68, epic: 'EPIC0000147' },
                          { name: 'परिवार सदस्य 2 (नमूना)', relation: 'पत्नी', age: 38, epic: 'EPIC0000149' },
                          { name: 'परिवार सदस्य 3 (नमूना)', relation: 'पुत्र', age: 21, epic: 'EPIC0000150' },
                          { name: 'परिवार सदस्य 4 (नमूना)', relation: 'पुत्री', age: 19, epic: 'EPIC0000151' },
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
                              flexWrap: 'wrap',
                              gap: '6px',
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
                <div className="bg-white rounded-2xl border border-[#e2e8f0] p-4 flex flex-col items-center min-w-0">
                  <div style={{ fontSize: '13px', fontWeight: 800, color: '#0f172a', marginBottom: '10px', width: '100%', display: 'flex', justifyContent: 'space-between' }}>
                    <span>🖨️ जनरेटेड वोटर पर्ची</span>
                    <span style={{ color: '#059669', fontSize: '11px' }}>1-क्लिक प्रिंट रेडी</span>
                  </div>
                  <div className="w-full overflow-x-auto flex justify-center">
                    <VoterSlipTemplate
                      isInline={true}
                      voter={{
                        epic: 'EPIC0000148',
                        nameHi: 'मतदाता का नाम (नमूना)',
                        nameEn: 'Sample Voter',
                        relativeNameHi: 'अभिभावक का नाम',
                        relativeNameEn: 'Guardian Name',
                        relationType: 'पिता',
                        age: 42,
                        gender: 'M',
                        houseNo: 'M-104',
                        wardNo: '01',
                        serialNo: 148,
                        boothName: '01 - राजकीय विद्यालय, कमरा 1 (नमूना)',
                      }}
                      config={{
                        ...defaultSlipConfig,
                        candidateName: 'प्रत्याशी का नाम',
                        partyName: 'पार्टी / पैनल का नाम',
                        partySymbolName: 'चुनाव चिन्ह',
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
              <div className="bg-white rounded-[14px] border border-[#e2e8f0] p-4 sm:px-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <div>
                  <h3 style={{ fontSize: '18px', fontWeight: 900, color: '#0f172a', margin: 0 }}>
                    ⚡ डिजिटल वोटर पर्ची वितरण इंजन (Digital Slip Distribution)
                  </h3>
                  <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#64748b' }}>
                    कागज़ और फाइलों के झंझट से सम्पूर्ण मुक्ति! एक क्लिक में सभी मतदाताओं को उनके व्यक्तिगत मोबाइल पर पर्ची भेजें।
                  </p>
                </div>
                <div className="flex flex-wrap gap-2.5">
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
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div style={{ background: '#ffffff', border: '1.5px solid #93c5fd', borderRadius: '14px', padding: '18px' }}>
                  <div style={{ fontSize: '12px', fontWeight: 800, color: '#2563eb', marginBottom: '8px' }}>कदम 1: चुनाव चिन्ह व प्रत्याशी</div>
                  <div style={{ fontSize: '15px', fontWeight: 900, color: '#0f172a' }}>प्रत्याशी का नाम (डेमो)</div>
                  <div style={{ fontSize: '12px', color: '#059669', fontWeight: 700, marginTop: '4px' }}>✓ ईवीएम क्रम संख्या: 1</div>
                  <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>चिन्ह व हेडर कस्टमाइजेशन</div>
                </div>

                <div style={{ background: '#ffffff', border: '1.5px solid #86efac', borderRadius: '14px', padding: '18px' }}>
                  <div style={{ fontSize: '12px', fontWeight: 800, color: '#059669', marginBottom: '8px' }}>कदम 2: बूथ मैपिंग स्थिति</div>
                  <div style={{ fontSize: '15px', fontWeight: 900, color: '#0f172a' }}>सभी बूथ पूर्ण रूप से मैप्ड</div>
                  <div style={{ fontSize: '12px', color: '#0284c7', fontWeight: 700, marginTop: '4px' }}>✓ 1-क्लिक बल्क असाइनमेंट इंजन</div>
                  <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>वार्ड-वार केंद्र कॉन्फिगर हैं</div>
                </div>

                <div style={{ background: '#ffffff', border: '1.5px solid #fdba74', borderRadius: '14px', padding: '18px' }}>
                  <div style={{ fontSize: '12px', fontWeight: 800, color: '#ea580c', marginBottom: '8px' }}>कदम 3: वितरण प्रोग्रेस</div>
                  <div style={{ fontSize: '15px', fontWeight: 900, color: '#0f172a' }}>बल्क PDF + WhatsApp लॉग</div>
                  <div style={{ fontSize: '12px', color: '#ea580c', fontWeight: 700, marginTop: '4px' }}>✓ रीयल-टाइम डिलीवरी ट्रैकिंग</div>
                  <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>ऑडिट हिस्ट्री लॉग उपलब्ध</div>
                </div>
              </div>

              {/* Bulk Queue Table */}
              <div className="bg-white rounded-[14px] border border-[#e2e8f0] p-4 sm:p-5 overflow-x-auto">
                <div style={{ fontSize: '14px', fontWeight: 800, color: '#0f172a', marginBottom: '12px' }}>
                  📋 हालिया भेजे गए बल्क बैच (Sample WhatsApp Dispatch Format)
                </div>
                <table className="w-full min-w-[540px] border-collapse text-[12px]">
                  <thead>
                    <tr style={{ background: '#f8fafc', color: '#64748b', textAlign: 'left', borderBottom: '1px solid #e2e8f0' }}>
                      <th style={{ padding: '8px 12px' }}>वार्ड</th>
                      <th style={{ padding: '8px 12px' }}>मतदान केंद्र</th>
                      <th style={{ padding: '8px 12px' }}>मोड</th>
                      <th style={{ padding: '8px 12px' }}>माध्यम</th>
                      <th style={{ padding: '8px 12px' }}>स्थिति</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { ward: 'वार्ड 01', booth: 'मतदान केंद्र 1 (नमूना स्कूल)', total: 'PDF + PNG', sent: 'WhatsApp', st: 'कतार सक्रिय' },
                      { ward: 'वार्ड 02', booth: 'मतदान केंद्र 2 (सामुदायिक भवन)', total: 'A4 शीट', sent: 'प्रिंट + शेयर', st: 'पूर्ण' },
                      { ward: 'वार्ड 03', booth: 'मतदान केंद्र 3 (राजकीय विद्यालय)', total: 'परिवार कार्ड', sent: 'WhatsApp', st: 'पूर्ण' },
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
              <div className="bg-[#0f172a] rounded-[14px] p-4 sm:px-6 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#ef4444', flexShrink: 0 }} />
                  <div>
                    <h3 style={{ fontSize: '18px', fontWeight: 900, margin: 0 }}>🔴 लाइव पोलिंग डे डेस्क (Live Election Day Turnout)</h3>
                    <div style={{ fontSize: '12px', color: '#94a3b8' }}>रियल-टाइम वोटिंग अपडेट • बूथ-वार टर्नआउट ट्रैकिंग</div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                  <div>
                    <div style={{ fontSize: '11px', color: '#94a3b8' }}>नमूना मतदान दर:</div>
                    <div style={{ fontSize: '24px', fontWeight: 900, color: '#22c55e' }}>68.4%</div>
                  </div>
                  <div style={{ height: '36px', width: '1px', background: '#334155' }} />
                  <div>
                    <div style={{ fontSize: '11px', color: '#94a3b8' }}>सिंक स्थिति:</div>
                    <div style={{ fontSize: '18px', fontWeight: 900, color: '#38bdf8' }}>ऑनलाइन + ऑफ़लाइन</div>
                  </div>
                </div>
              </div>

              {/* Turnout Filters & Booth Table */}
              <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_0.8fr] gap-5">
                <div style={{ background: '#ffffff', borderRadius: '14px', border: '1px solid #e2e8f0', padding: '18px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
                    <div style={{ fontSize: '14px', fontWeight: 800, color: '#0f172a' }}>📊 घंटे-वार मतदान दर (Hourly Turnout Preview)</div>
                    <span style={{ fontSize: '11px', color: '#64748b' }}>नमूना ग्राफ़</span>
                  </div>

                  {/* Hourly Chart Bar Visuals */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {[
                      { time: '07:00 AM - 09:00 AM', votes: 'सुबह का चरण', pct: 12, col: '#38bdf8' },
                      { time: '09:00 AM - 11:00 AM', votes: 'प्रथम गति', pct: 28, col: '#38bdf8' },
                      { time: '11:00 AM - 01:00 PM', votes: 'दोपहर अपडेट', pct: 45, col: '#3b82f6' },
                      { time: '01:00 PM - 03:00 PM', votes: 'तीसरा चरण', pct: 58, col: '#2563eb' },
                      { time: '03:00 PM - 05:00 PM', votes: 'अंतिम चरण', pct: 68.4, col: '#16a34a' },
                    ].map((h, i) => (
                      <div key={i}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: 700, marginBottom: '3px', gap: '8px', flexWrap: 'wrap' }}>
                          <span style={{ color: '#334155' }}>{h.time}</span>
                          <span style={{ color: h.col, fontWeight: 900 }}>{h.pct}% ({h.votes})</span>
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
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', flexWrap: 'wrap', gap: '8px' }}>
                    <div style={{ fontSize: '14px', fontWeight: 800, color: '#dc2626' }}>
                      ⚠️ शेष मतदाता (Pending Voters Preview)
                    </div>
                    <span style={{ background: '#fee2e2', color: '#b91c1c', padding: '2px 8px', borderRadius: '10px', fontSize: '11px', fontWeight: 800 }}>
                      तत्काल संपर्क
                    </span>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {[
                      { name: 'मतदाता नमूना #1', house: 'M-042', ward: 'वार्ड 01' },
                      { name: 'मतदाता नमूना #2', house: 'M-018', ward: 'वार्ड 01' },
                      { name: 'मतदाता नमूना #3', house: 'M-089', ward: 'वार्ड 02' },
                      { name: 'मतदाता नमूना #4', house: 'M-031', ward: 'वार्ड 02' },
                    ].map((p, i) => (
                      <div key={i} style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', padding: '8px 10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                        <div>
                          <div style={{ fontSize: '12px', fontWeight: 800, color: '#991b1b' }}>{p.name}</div>
                          <div style={{ fontSize: '10px', color: '#7f1d1d' }}>{p.house} • {p.ward}</div>
                        </div>
                        <button style={{ background: '#dc2626', color: '#ffffff', border: 'none', padding: '4px 8px', borderRadius: '6px', fontSize: '10px', fontWeight: 700, cursor: 'pointer', flexShrink: 0 }}>
                          रिमाइंडर
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
              <div className="bg-white rounded-[14px] border border-[#e2e8f0] p-4 sm:px-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <div>
                  <h3 style={{ fontSize: '18px', fontWeight: 900, color: '#0f172a', margin: 0 }}>
                    👥 कार्यकर्ता व चुनावी टीम प्रबंधन (Worker & Booth Captains)
                  </h3>
                  <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#64748b' }}>
                    वॉलिंटियर्स को ऑनलाइन बूथ सौंपें, उनकी लाइव रिपोर्ट ट्रैक करें और फील्ड ऑपरेशंस नियंत्रित करें।
                  </p>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <span style={{ background: '#ecfdf5', color: '#059669', border: '1px solid #a7f3d0', padding: '6px 14px', borderRadius: '8px', fontSize: '12px', fontWeight: 800 }}>
                    भूमिका-आधारित लॉगिन
                  </span>
                </div>
              </div>

              {/* Workers Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {[
                  { name: 'बूथ प्रभारी #1 (नमूना)', role: 'बूथ 1 प्रभारी', assigned: 'वार्ड 01 (मतदान केंद्र 1)', coverage: 'लाइव पर्ची ट्रैकिंग', code: 'ID: WRK-01', st: 'ऑन-फील्ड सक्रिय' },
                  { name: 'बूथ प्रभारी #2 (नमूना)', role: 'बूथ 2 प्रभारी', assigned: 'वार्ड 01 (मतदान केंद्र 2)', coverage: 'ऑफ़लाइन सिंक रेडी', code: 'ID: WRK-02', st: 'ऑन-फील्ड सक्रिय' },
                  { name: 'बूथ प्रभारी #3 (नमूना)', role: 'बूथ 3 प्रभारी', assigned: 'वार्ड 02 (मतदान केंद्र 3)', coverage: 'वोटर सूची एक्सेस', code: 'ID: WRK-03', st: 'ऑन-फील्ड सक्रिय' },
                  { name: 'बूथ प्रभारी #4 (नमूना)', role: 'बूथ 4 प्रभारी', assigned: 'वार्ड 02 (मतदान केंद्र 4)', coverage: 'WhatsApp शेयरिंग', code: 'ID: WRK-04', st: 'ऑन-फील्ड सक्रिय' },
                  { name: 'बूथ प्रभारी #5 (नमूना)', role: 'बूथ 5 प्रभारी', assigned: 'वार्ड 03 (मतदान केंद्र 5)', coverage: 'टर्नआउट मार्किंग', code: 'ID: WRK-05', st: 'ऑन-फील्ड सक्रिय' },
                  { name: 'बूथ प्रभारी #6 (नमूना)', role: 'बूथ 6 प्रभारी', assigned: 'वार्ड 03 (मतदान केंद्र 6)', coverage: 'परिवार मैपिंग', code: 'ID: WRK-06', st: 'ऑन-फील्ड सक्रिय' },
                ].map((w, i) => (
                  <div key={i} style={{ background: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '16px', boxShadow: '0 2px 6px rgba(0,0,0,0.02)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                      <div>
                        <div style={{ fontSize: '15px', fontWeight: 900, color: '#1e293b' }}>{w.name}</div>
                        <div style={{ fontSize: '11px', color: '#2563eb', fontWeight: 700 }}>{w.role}</div>
                      </div>
                      <span style={{ background: '#dcfce7', color: '#15803d', padding: '2px 8px', borderRadius: '10px', fontSize: '10px', fontWeight: 800, whiteSpace: 'nowrap' }}>
                        {w.st}
                      </span>
                    </div>

                    <div style={{ margin: '12px 0', fontSize: '11px', color: '#64748b' }}>
                      <div>स्थान: <strong style={{ color: '#334155' }}>{w.assigned}</strong></div>
                      <div style={{ marginTop: '2px' }}>सुविधा: <strong style={{ color: '#059669' }}>{w.coverage}</strong></div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #f1f5f9', paddingTop: '10px' }}>
                      <span style={{ fontSize: '11px', fontWeight: 700, color: '#64748b' }}>{w.code}</span>
                      <button style={{ background: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe', padding: '4px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: 700, cursor: 'pointer' }}>
                        टास्क देखें
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
              <div className="bg-white rounded-[14px] border border-[#e2e8f0] p-4 sm:px-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <div>
                  <h3 style={{ fontSize: '18px', fontWeight: 900, color: '#0f172a', margin: 0 }}>
                    📈 सामाजिक समीकरण व अंतिम चुनावी रुझान रिपोर्ट
                  </h3>
                  <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#64748b' }}>
                    वार्ड-वार कुल मतदान, बूथ-वार रुझान और सामाजिक समीकरणों की विस्तृत रिपोर्ट एक्सपोर्ट करें।
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
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                {/* Community Equation Table */}
                <div className="bg-white rounded-[14px] border border-[#e2e8f0] p-4 sm:p-5 overflow-x-auto">
                  <div style={{ fontSize: '14px', fontWeight: 800, color: '#0f172a', marginBottom: '12px' }}>
                    🏛️ वर्ग-वार विश्लेषण (Sample Demographic Breakdown)
                  </div>
                  <table className="w-full min-w-[440px] border-collapse text-[12px]">
                    <thead>
                      <tr style={{ background: '#f8fafc', color: '#64748b', textAlign: 'left', borderBottom: '1px solid #e2e8f0' }}>
                        <th style={{ padding: '8px 10px' }}>समुदाय / वर्ग</th>
                        <th style={{ padding: '8px 10px' }}>स्थिति</th>
                        <th style={{ padding: '8px 10px' }}>कवरेज</th>
                        <th style={{ padding: '8px 10px' }}>रिपोर्ट प्रारूप</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[
                        { group: 'वर्ग A (नमूना)', total: 'वार्ड 1-5', pct: 'कस्टमाइजेबल', trend: 'बूथ-वार विश्लेषण', col: '#059669' },
                        { group: 'वर्ग B (नमूना)', total: 'वार्ड 1-5', pct: 'फ़िल्टर रेडी', trend: 'परिवार-वार समेकन', col: '#2563eb' },
                        { group: 'वर्ग C (नमूना)', total: 'वार्ड 1-5', pct: 'रियल-टाइम', trend: 'वॉर-रूम एक्सपोर्ट', col: '#d97706' },
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
                <div style={{ background: '#ffffff', borderRadius: '14px', border: '1px solid #e2e8f0', padding: '18px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '16px' }}>
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: 800, color: '#0f172a', marginBottom: '8px' }}>
                      🏆 डेटा-आधारित बूथ प्रबंधन
                    </div>
                    <p style={{ fontSize: '12px', color: '#64748b', lineHeight: 1.5 }}>
                      आपकी वास्तविक मतदाता सूची अपलोड होने के बाद यह अनुभाग हर वार्ड व मतदान केंद्र का सटीक आंकड़ा और प्राथमिकता सूची दिखाता है।
                    </p>
                  </div>

                  <div style={{ background: '#ecfdf5', border: '1.5px solid #a7f3d0', borderRadius: '12px', padding: '16px', textAlign: 'center' }}>
                    <div style={{ fontSize: '12px', fontWeight: 800, color: '#047857' }}>ऑडिट व पारदर्शिता</div>
                    <div style={{ fontSize: '22px', fontWeight: 900, color: '#059669', margin: '4px 0' }}>Excel + Print PDF</div>
                    <div style={{ fontSize: '11px', color: '#065f46' }}>100% सटीक वार्ड-वार रिपोर्टिंग</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* SCENE 6: GRAND CLOSING & LIVE DEMO CTA */}
          {currentScene === 6 && (
            <div className="flex flex-col items-center justify-center py-6 sm:py-10 text-center">
              <div
                className="w-full max-w-[780px] rounded-3xl p-6 sm:p-10 text-white border border-[#334155]"
                style={{
                  background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
                  boxShadow: '0 20px 50px rgba(0,0,0,0.3)',
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

                <h1 className="text-[26px] sm:text-[34px] font-black m-0 mb-3 tracking-tight">
                  विजयसेतु <span style={{ color: '#fb923c' }}>(VijaySetu)</span>
                </h1>
                <p className="text-[15px] sm:text-[18px] text-[#cbd5e1] m-0 mb-6 font-semibold">
                  आधुनिक डिजिटल इलेक्शन मैनेजमेंट प्लेटफ़ॉर्म
                </p>

                <div style={{ background: 'rgba(255, 255, 255, 0.08)', borderRadius: '16px', padding: '18px', border: '1px solid rgba(255, 255, 255, 0.15)', marginBottom: '24px' }}>
                  <div style={{ fontSize: '15px', color: '#fdba74', fontWeight: 800 }}>
                    &ldquo;असली ताकत आपके बूथ और मतदाता डेटा के सही प्रबंधन में है!&rdquo;
                  </div>
                  <div style={{ fontSize: '13px', color: '#94a3b8', marginTop: '6px' }}>
                    Roots Reach Media द्वारा संचालित — आज ही लाइव डेमो शेड्यूल करें।
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row justify-center gap-3 sm:gap-4">
                  <a
                    href="tel:+917231077770"
                    className="no-underline inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl text-[15px] font-extrabold text-white"
                    style={{
                      background: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
                      boxShadow: '0 6px 20px rgba(234, 88, 12, 0.4)',
                    }}
                  >
                    <Phone size={18} />
                    <span>डेमो कॉल: +91 72310 77770</span>
                  </a>
                  <a
                    href="https://vijaysetu-website.vercel.app"
                    target="_blank"
                    rel="noreferrer"
                    className="no-underline inline-flex items-center justify-center px-6 py-3.5 rounded-xl text-[15px] font-bold text-white border border-white/20 bg-white/10"
                  >
                    <span>vijaysetu-website.vercel.app</span>
                  </a>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* 3. Audio Synchronized Subtitle / Voiceover Banner */}
      <footer
        className="min-h-[74px] bg-[#090d16] border-t-2 border-[#ea580c] px-4 sm:px-6 py-2.5 flex flex-wrap items-center justify-between gap-3 shrink-0 text-white z-[100]"
        style={{ boxShadow: '0 -4px 20px rgba(0,0,0,0.25)' }}
      >
        <div className="flex items-center gap-3 flex-1 min-w-0">
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
          <div className="flex flex-col min-w-0">
            <div style={{ fontSize: '11px', color: '#fb923c', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.4px' }}>
              🎙️ {currentSub.title} ({currentSub.time})
            </div>
            <div className="text-[12px] sm:text-[13px] font-bold text-[#f1f5f9] mt-0.5 leading-snug">
              &ldquo;{currentSub.hindi}&rdquo;
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span style={{ fontSize: '11px', fontWeight: 800, background: '#1e293b', border: '1px solid #334155', color: '#94a3b8', padding: '4px 10px', borderRadius: '12px' }}>
            सीन {currentScene + 1} / 7
          </span>
        </div>
      </footer>
    </div>
  );
}
