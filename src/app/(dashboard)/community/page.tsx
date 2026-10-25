'use client';

import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import {
  Building2,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Download,
  ExternalLink,
  Filter,
  Home,
  LoaderCircle,
  MapPin,
  Mic,
  Phone,
  Printer,
  Search,
  Sparkles,
  Tag,
  UserCheck,
  Users,
  UsersRound,
  X,
} from 'lucide-react';
import Link from 'next/link';
import { apiFetch, decodeJwtPayload, getApiError } from '@/lib/api';
import { downloadBlob } from '@/lib/fileDownload';
import { createSpeechRecognition, SpeechRecognitionLike } from '@/lib/speech';
import { attachEnglishNames } from '@/lib/transliteration';

interface Voter {
  _id: string;
  nameHi: string;
  nameEn: string;
  epic: string;
  relativeNameHi: string;
  relativeNameEn?: string;
  relationType: string;
  gender?: string;
  age?: number;
  wardNo: string;
  partNo: string;
  houseNo: string;
  serialNo: number;
  caste: string;
  matchType: 'direct' | 'family';
  phone: string;
  householdCount: number;
  voted?: boolean;
}

// Popular Demographic Presets in Election Campaigns
const POPULAR_COMMUNITIES = [
  { label: 'राजपूत', query: 'राजपूत, सिंह, राठौड़, शेखावत, चौहान, तंवर, जंज, फ़िटक, खालत, रावना' },
  { label: 'मेघवाल / SC', query: 'मेघवाल, जयपाल, वानर, पंवार, बडल, बेरवा, जाटव, रैगर' },
  { label: 'भील', query: 'भील, भील सिंध' },
  { label: 'जाट', query: 'जाट, चौधरी, गोदारा, पूनिया, बेनीवाल' },
  { label: 'ब्राह्मण', query: 'ब्राह्मण, शर्मा, तिवारी, जोशी, पुरोहित' },
  { label: 'पालीवाल', query: 'पालीवाल' },
  { label: 'मुसलमान / मुस्लिम', query: 'मुसलमान, मुस्लिम, खान, मोहम्मद, कुरैशी, अंसारी' },
  { label: 'विश्नोई', query: 'विश्नोई, जांभो' },
  { label: 'सुथार', query: 'सुथार, जांगिड़' },
  { label: 'कुंभार', query: 'कुंभार, प्रजापत, वर्मा' },
  { label: 'दर्जी', query: 'दर्जी' },
  { label: 'बेलदार', query: 'बेलदार' },
  { label: 'जोगी', query: 'जोगी, नाथ' },
  { label: 'भाट', query: 'भाट' },
  { label: 'गवारिया', query: 'गवारिया' },
  { label: 'वैश्य / महाजन', query: 'वैश्य, अग्रवाल, गुप्ता, जैन, माहेश्वरी' },
  { label: 'गुर्जर', query: 'गुर्जर, बैंसला, पोसवाल, भड़ाना' },
  { label: 'माली / सैनी', query: 'माली, सैनी, गहलोत, कच्छावा' },
  { label: 'यादव / अहीर', query: 'यादव, अहीर' },
  { label: 'मीणा / ST', query: 'मीणा, रावत' },
];

export default function CommunityPage() {
  const [query, setQuery] = useState('');
  const [ward, setWard] = useState('');
  const [includeFamily, setIncludeFamily] = useState(true);
  const [voters, setVoters] = useState<Voter[]>([]);
  const [family, setFamily] = useState<Voter[]>([]);
  const [selectedHouse, setSelectedHouse] = useState('');
  const [selectedVoterForFamily, setSelectedVoterForFamily] = useState<Voter | null>(null);
  const [familyLoading, setFamilyLoading] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [voiceActive, setVoiceActive] = useState(false);
  const [voiceError, setVoiceError] = useState('');
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [dbCastes, setDbCastes] = useState<string[]>([]);
  const pageSize = 50;

  useEffect(() => {
    const token = typeof window !== 'undefined' ? window.localStorage.getItem('token') : null;
    if (token) {
      try {
        const payload = decodeJwtPayload<{ user?: { role?: string } }>(token);
        setIsAdmin(payload?.user?.role === 'admin');
      } catch {}
    }

    const loadCastes = async () => {
      try {
        const res = await apiFetch('/voters/castes');
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data.castes) && data.castes.length > 0) {
            setDbCastes(data.castes);
          }
        }
      } catch {
        // ignore
      }
    };
    void loadCastes();
  }, []);

  useEffect(() => {
    void Promise.resolve().then(() => {
      try {
        const stored: unknown = JSON.parse(window.localStorage.getItem('vijaysetu-community-searches') || '[]');
        if (Array.isArray(stored) && stored.every((item) => typeof item === 'string')) {
          setRecentSearches(stored.slice(0, 8));
        }
      } catch {
        // ignore
      }
    });
  }, []);

  useEffect(() => () => recognitionRef.current?.stop(), []);

  const rememberSearch = (term: string) => {
    const updated = [term, ...recentSearches.filter((item) => item !== term)].slice(0, 8);
    setRecentSearches(updated);
    try {
      window.localStorage.setItem('vijaysetu-community-searches', JSON.stringify(updated));
    } catch {}
  };

  const executeSearch = async (searchTerm: string, targetWard = ward) => {
    if (!searchTerm.trim()) {
      setError('कृपया समुदाय, उपनाम या जाति का नाम दर्ज करें।');
      return;
    }
    setLoading(true);
    setError('');
    setSelectedHouse('');
    setSelectedVoterForFamily(null);
    setFamily([]);
    setHasSearched(true);
    setCurrentPage(1);

    try {
      const params = new URLSearchParams({
        q: searchTerm.trim(),
        includeFamily: String(includeFamily),
      });
      if (targetWard.trim()) params.set('ward', targetWard.trim());

      const response = await apiFetch(`/features/community?${params}`, { cache: 'no-store' });
      if (!response.ok) throw new Error(await getApiError(response, 'समुदाय खोज पूरी नहीं हो सकी।'));
      const data = (await response.json()) as Voter[];
      setVoters(Array.isArray(data) ? data.map(attachEnglishNames) : []);
      rememberSearch(searchTerm.trim());
    } catch (searchError) {
      setVoters([]);
      setError(searchError instanceof Error ? searchError.message : 'समुदाय खोज पूरी नहीं हो सकी।');
    } finally {
      setLoading(false);
    }
  };

  const handleFormSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void executeSearch(query, ward);
  };

  const handlePresetClick = (presetQuery: string, presetLabel: string) => {
    setQuery(presetQuery);
    void executeSearch(presetQuery, ward);
  };

  const startVoiceSearch = () => {
    recognitionRef.current?.stop();
    const recognition = createSpeechRecognition();
    if (!recognition) {
      setVoiceError('इस ब्राउज़र में voice search उपलब्ध नहीं है।');
      return;
    }
    setVoiceError('');
    recognition.lang = 'hi-IN';
    recognition.interimResults = false;
    recognition.onresult = (event) => {
      const transcript = event.results[0]?.[0]?.transcript?.trim();
      if (transcript) {
        setQuery(transcript);
        void executeSearch(transcript, ward);
      }
    };
    recognition.onerror = () => setVoiceError('आवाज़ पहचानी नहीं गई। माइक्रोफ़ोन अनुमति जाँचकर फिर बोलें।');
    recognition.onend = () => {
      setVoiceActive(false);
      recognitionRef.current = null;
    };
    recognitionRef.current = recognition;
    setVoiceActive(true);
    try {
      recognition.start();
    } catch {
      recognitionRef.current = null;
      setVoiceActive(false);
      setVoiceError('Voice search शुरू नहीं हो सकी। कृपया फिर कोशिश करें।');
    }
  };

  const clearRecentSearches = () => {
    setRecentSearches([]);
    try {
      window.localStorage.removeItem('vijaysetu-community-searches');
    } catch {}
  };

  const showHousehold = async (voter: Voter) => {
    const house = voter.houseNo || '';
    setSelectedHouse(house);
    setSelectedVoterForFamily(voter);
    setFamily([]);
    const invalidHouses = ['-', '—', "'—", "'0", '0', '00', '000', 'na', 'n/a', 'null', 'undefined', 'लागू नहीं', 'उपलब्ध नहीं'];
    if (!house || invalidHouses.includes(house.trim().toLowerCase())) return;

    setFamilyLoading(true);
    try {
      const params = new URLSearchParams();
      if (voter.wardNo) params.set('ward', voter.wardNo);
      if (voter.partNo) params.set('part', voter.partNo);
      const response = await apiFetch(`/voters/family/${encodeURIComponent(house)}?${params}`, { cache: 'no-store' });
      if (!response.ok) throw new Error(await getApiError(response, 'घर के अन्य रिकॉर्ड नहीं मिले।'));
      const famData = (await response.json()) as Voter[];
      setFamily(Array.isArray(famData) ? famData.map(attachEnglishNames) : []);
    } catch (familyError) {
      setError(familyError instanceof Error ? familyError.message : 'घर के अन्य रिकॉर्ड नहीं मिले।');
    } finally {
      setFamilyLoading(false);
    }
  };

  const exportExcel = async () => {
    if (!isAdmin) return;
    setExporting(true);
    setError('');
    try {
      const params = new URLSearchParams({
        dataset: 'community',
        q: query.trim(),
        includeFamily: String(includeFamily),
      });
      if (ward.trim()) params.set('ward', ward.trim());
      const response = await apiFetch(`/features/export.xlsx?${params}`);
      if (!response.ok) throw new Error(await getApiError(response, 'Excel एक्सपोर्ट नहीं हो सका।'));
      await downloadBlob(await response.blob(), `community-${query.slice(0, 15)}.xlsx`);
    } catch (exportError) {
      setError(exportError instanceof Error ? exportError.message : 'Excel एक्सपोर्ट नहीं हो सका।');
    } finally {
      setExporting(false);
    }
  };

  // Demographic Statistics Computed from Results
  const stats = useMemo(() => {
    if (!voters.length) return null;
    const total = voters.length;
    const directMatches = voters.filter((v) => v.matchType !== 'family').length;
    const familyMatches = total - directMatches;

    const uniqueHouses = new Set(
      voters
        .map((v) => `${v.wardNo}-${v.partNo}-${(v.houseNo || '').trim()}`)
        .filter((h) => !h.endsWith('-') && !h.endsWith('-0') && !h.endsWith('-000'))
    ).size;

    const wards = new Set(voters.map((v) => v.wardNo).filter(Boolean)).size;

    const maleCount = voters.filter((v) => ['पुरुष', 'Male', 'M'].includes(v.gender || '')).length;
    const femaleCount = voters.filter((v) => ['महिला', 'स्त्री', 'Female', 'F'].includes(v.gender || '')).length;
    const votedCount = voters.filter((v) => v.voted).length;

    return {
      total,
      directMatches,
      familyMatches,
      uniqueHouses: uniqueHouses || 1,
      wards,
      maleCount,
      femaleCount,
      votedCount,
      turnout: total ? Math.round((votedCount / total) * 100) : 0,
    };
  }, [voters]);

  const totalCommunityPages = Math.ceil(voters.length / pageSize) || 1;
  const paginatedVoters = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return voters.slice(start, start + pageSize);
  }, [voters, currentPage, pageSize]);

  return (
    <div className="work-page" style={{ maxWidth: '1360px', margin: '0 auto', paddingBottom: '50px' }}>
      {/* PAGE HEADER */}
      <div className="page-intro" style={{ marginBottom: '20px' }}>
        <div>
          <div className="eyebrow-label" style={{ color: '#7c3aed' }}>
            <span className="eyebrow-mark" style={{ background: '#7c3aed' }} />
            COMMUNITY & SOCIAL EQUATION · सामाजिक समीकरण
          </div>
          <h1 style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span>जातीय व सामाजिक समीकरण</span>
            <span
              style={{
                fontSize: '13px',
                fontWeight: 600,
                color: '#7c3aed',
                background: '#f3e8ff',
                padding: '3px 10px',
                borderRadius: '20px',
                border: '1px solid #e9d5ff',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
              }}
            >
              <Users size={13} /> जातिगत मैपिंग
            </span>
          </h1>
          <p>
            उपनाम, जाति व सामाजिक वर्ग के आधार पर मतदाताओं का सटीक विश्लेषण करें तथा परिवार ID से जुड़े सदस्यों को मैप करें।
          </p>
        </div>

        <div className="feature-actions">
          <button
            className="button-secondary"
            type="button"
            onClick={() => window.print()}
            disabled={!voters.length}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          >
            <Printer size={15} /> प्रिंट रिपोर्ट
          </button>

          {isAdmin && (
            <button
              className="button-secondary"
              type="button"
              onClick={() => void exportExcel()}
              disabled={!voters.length || exporting}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            >
              {exporting ? <LoaderCircle size={15} className="spin" /> : <Download size={15} />}
              Excel एक्सपोर्ट
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="inline-notice error-notice" role="alert" style={{ marginBottom: '16px' }}>
          {error}
        </div>
      )}

      {/* SEARCH CARD (ELEVATED & INTUITIVE) */}
      <section
        style={{
          background: 'linear-gradient(180deg, #ffffff 0%, #faf5ff 100%)',
          border: '1px solid #e9d5ff',
          borderRadius: '16px',
          padding: '22px',
          marginBottom: '24px',
          boxShadow: '0 4px 14px -3px rgba(124, 58, 237, 0.08)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
          <div
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              background: '#7c3aed',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Search size={16} />
          </div>
          <div>
            <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#1e1b4b' }}>
              समुदाय, उपनाम या जाति से खोजें
            </h2>
            <p style={{ margin: 0, fontSize: '12.5px', color: '#6b7280' }}>
              एक या अधिक उपनाम/जाति कॉमा (,) लगाकर लिखें।
            </p>
          </div>
        </div>

        <form onSubmit={handleFormSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
            {/* Query Input with Mic and Clear */}
            <div style={{ position: 'relative', flex: '2 1 320px', minWidth: '260px' }}>
              <Search
                size={16}
                style={{
                  position: 'absolute',
                  left: '14px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: '#9333ea',
                }}
              />
              <input
                type="text"
                placeholder="उदा. राठौड़, शेखावत, जाट, शर्मा, गुर्जर, मुस्लिम, कुमावत..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                maxLength={500}
                style={{
                  width: '100%',
                  height: '42px',
                  padding: '8px 70px 8px 40px',
                  fontSize: '14px',
                  fontWeight: 500,
                  border: '1.5px solid #d8b4fe',
                  borderRadius: '10px',
                  outline: 'none',
                  background: '#ffffff',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                }}
              />

              <div
                style={{
                  position: 'absolute',
                  right: '8px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                {query && (
                  <button
                    type="button"
                    onClick={() => setQuery('')}
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: '#94a3b8',
                      padding: '4px',
                    }}
                    title="साफ़ करें"
                  >
                    <X size={15} />
                  </button>
                )}

                <button
                  type="button"
                  onClick={startVoiceSearch}
                  disabled={voiceActive}
                  style={{
                    background: voiceActive ? '#ef4444' : '#f3e8ff',
                    border: '1px solid',
                    borderColor: voiceActive ? '#dc2626' : '#d8b4fe',
                    borderRadius: '6px',
                    padding: '5px 7px',
                    cursor: 'pointer',
                    color: voiceActive ? '#ffffff' : '#7c3aed',
                    display: 'flex',
                    alignItems: 'center',
                  }}
                  title="बोलकर खोजें"
                >
                  <Mic size={14} className={voiceActive ? 'pulse' : ''} />
                </button>
              </div>
            </div>

            {/* Ward Filter */}
            <div style={{ position: 'relative', flex: '1 1 140px', minWidth: '130px' }}>
              <MapPin
                size={15}
                style={{
                  position: 'absolute',
                  left: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: '#6b7280',
                }}
              />
              <input
                type="text"
                placeholder="वार्ड नं. (वैकल्पिक)"
                value={ward}
                onChange={(e) => setWard(e.target.value)}
                style={{
                  width: '100%',
                  height: '42px',
                  padding: '8px 12px 8px 34px',
                  fontSize: '13px',
                  border: '1.5px solid #d8b4fe',
                  borderRadius: '10px',
                  outline: 'none',
                  background: '#ffffff',
                }}
              />
            </div>

            {/* Family Inclusion Checkbox */}
            <label
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '13px',
                fontWeight: 600,
                color: '#4c1d95',
                background: '#f3e8ff',
                padding: '8px 14px',
                borderRadius: '10px',
                border: '1px solid #d8b4fe',
                cursor: 'pointer',
                userSelect: 'none',
              }}
            >
              <input
                type="checkbox"
                checked={includeFamily}
                onChange={(e) => setIncludeFamily(e.target.checked)}
                style={{ cursor: 'pointer', width: '16px', height: '16px', accentColor: '#7c3aed' }}
              />
              <span>👨‍👩‍👧‍👦 परिवार सदस्य शामिल करें</span>
            </label>

            {/* Analyze Action Button */}
            <button
              type="submit"
              disabled={loading}
              style={{
                height: '42px',
                padding: '0 20px',
                fontSize: '13.5px',
                fontWeight: 700,
                background: 'linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)',
                color: '#ffffff',
                border: 'none',
                borderRadius: '10px',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: '0 3px 10px rgba(109, 40, 217, 0.3)',
                whiteSpace: 'nowrap',
              }}
            >
              {loading ? (
                <>
                  <LoaderCircle size={16} className="spin" />
                  <span>विश्लेषण हो रहा है...</span>
                </>
              ) : (
                <>
                  <Sparkles size={16} />
                  <span>सामाजिक समीकरण खोजें</span>
                </>
              )}
            </button>
          </div>

          {voiceError && (
            <div style={{ fontSize: '12px', color: '#b91c1c', marginTop: '2px' }}>
              {voiceError}
            </div>
          )}

          {/* QUICK PRESETS CHIPS (1-CLICK SEARCH) */}
          <div style={{ marginTop: '8px', paddingTop: '12px', borderTop: '1px dashed #e9d5ff' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
              <Tag size={13} style={{ color: '#7c3aed' }} />
              <span style={{ fontSize: '12px', fontWeight: 600, color: '#5b21b6' }}>
                त्वरित समुदाय चयन (1-क्लिक खोज):
              </span>
            </div>

            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              {/* Dynamic Database Castes */}
              {dbCastes.length > 0 &&
                dbCastes.map((casteName) => {
                  const isActive = query === casteName;
                  return (
                    <button
                      key={`db-${casteName}`}
                      type="button"
                      onClick={() => handlePresetClick(casteName, casteName)}
                      style={{
                        fontSize: '12px',
                        padding: '4px 11px',
                        borderRadius: '8px',
                        border: '1.5px solid',
                        cursor: 'pointer',
                        fontWeight: isActive ? 800 : 600,
                        background: isActive ? '#059669' : '#ecfdf5',
                        color: isActive ? '#ffffff' : '#065f46',
                        borderColor: isActive ? '#047857' : '#a7f3d0',
                        transition: 'all 120ms ease',
                      }}
                      title="डेटाबेस से सक्रिय जाति"
                    >
                      ⚡ {casteName}
                    </button>
                  );
                })}

              {POPULAR_COMMUNITIES.map((p) => {
                const isActive = query === p.query;
                return (
                  <button
                    key={p.label}
                    type="button"
                    onClick={() => handlePresetClick(p.query, p.label)}
                    style={{
                      fontSize: '12px',
                      padding: '4px 11px',
                      borderRadius: '8px',
                      border: '1px solid',
                      cursor: 'pointer',
                      fontWeight: isActive ? 700 : 500,
                      background: isActive ? '#7c3aed' : '#ffffff',
                      color: isActive ? '#ffffff' : '#4c1d95',
                      borderColor: isActive ? '#7c3aed' : '#ddd6fe',
                      transition: 'all 120ms ease',
                    }}
                  >
                    {p.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* RECENT SEARCHES (IF ANY) */}
          {recentSearches.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginTop: '4px' }}>
              <span style={{ fontSize: '11.5px', color: '#64748b' }}>हालिया खोज:</span>
              {recentSearches.map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => {
                    setQuery(item);
                    void executeSearch(item, ward);
                  }}
                  style={{
                    fontSize: '11px',
                    padding: '2px 8px',
                    borderRadius: '6px',
                    background: '#f1f5f9',
                    color: '#475569',
                    border: '1px solid #e2e8f0',
                    cursor: 'pointer',
                  }}
                >
                  {item.length > 25 ? `${item.slice(0, 25)}…` : item}
                </button>
              ))}

              <button
                type="button"
                onClick={clearRecentSearches}
                style={{
                  fontSize: '11px',
                  color: '#94a3b8',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  textDecoration: 'underline',
                  marginLeft: 'auto',
                }}
              >
                इतिहास साफ़ करें
              </button>
            </div>
          )}
        </form>
      </section>

      {/* DEMOGRAPHIC KPI SUMMARY CARDS (ONCE SEARCHED) */}
      {stats && (
        <section
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '14px',
            marginBottom: '24px',
          }}
        >
          <article
            style={{
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '14px',
              padding: '16px 20px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
              <span style={{ fontSize: '12px', fontWeight: 600, color: '#64748b' }}>कुल मतदाता</span>
              <span
                style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '8px',
                  background: '#f3e8ff',
                  color: '#7c3aed',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Users size={15} />
              </span>
            </div>
            <strong style={{ fontSize: '26px', fontWeight: 700, color: '#0f172a' }}>
              {stats.total.toLocaleString('hi-IN')}
            </strong>
            <div style={{ fontSize: '11.5px', color: '#64748b', marginTop: '4px' }}>
              {stats.directMatches} प्रत्यक्ष + {stats.familyMatches} परिवार विस्तार
            </div>
          </article>

          <article
            style={{
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '14px',
              padding: '16px 20px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
              <span style={{ fontSize: '12px', fontWeight: 600, color: '#64748b' }}>कुल घराने (परिवार)</span>
              <span
                style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '8px',
                  background: '#ecfdf5',
                  color: '#047857',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Home size={15} />
              </span>
            </div>
            <strong style={{ fontSize: '26px', fontWeight: 700, color: '#047857' }}>
              {stats.uniqueHouses.toLocaleString('hi-IN')}
            </strong>
            <div style={{ fontSize: '11.5px', color: '#64748b', marginTop: '4px' }}>
              औसत {Math.round((stats.total / stats.uniqueHouses) * 10) / 10} मतदाता प्रति घर
            </div>
          </article>

          <article
            style={{
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '14px',
              padding: '16px 20px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
              <span style={{ fontSize: '12px', fontWeight: 600, color: '#64748b' }}>जेंडर अनुपात</span>
              <span
                style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '8px',
                  background: '#eff6ff',
                  color: '#2563eb',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <UsersRound size={15} />
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
              <strong style={{ fontSize: '20px', fontWeight: 700, color: '#1e40af' }}>
                👨 {stats.maleCount}
              </strong>
              <span style={{ color: '#94a3b8' }}>/</span>
              <strong style={{ fontSize: '20px', fontWeight: 700, color: '#db2777' }}>
                👩 {stats.femaleCount}
              </strong>
            </div>
            <div style={{ fontSize: '11.5px', color: '#64748b', marginTop: '4px' }}>
              {Math.round((stats.femaleCount / (stats.total || 1)) * 100)}% महिला मतदाता
            </div>
          </article>

          <article
            style={{
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '14px',
              padding: '16px 20px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
              <span style={{ fontSize: '12px', fontWeight: 600, color: '#64748b' }}>वार्ड फैलाव</span>
              <span
                style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '8px',
                  background: '#fef3c7',
                  color: '#b45309',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <MapPin size={15} />
              </span>
            </div>
            <strong style={{ fontSize: '26px', fontWeight: 700, color: '#b45309' }}>
              {stats.wards} वार्ड
            </strong>
            <div style={{ fontSize: '11.5px', color: '#64748b', marginTop: '4px' }}>
              मतदान दर्ज: {stats.votedCount} ({stats.turnout}%)
            </div>
          </article>
        </section>
      )}

      {/* RESULTS LISTING */}
      <section
        style={{
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '16px',
          padding: '20px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '16px',
            paddingBottom: '12px',
            borderBottom: '1px solid #f1f5f9',
            flexWrap: 'wrap',
            gap: '10px',
          }}
        >
          <div>
            <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#0f172a' }}>
              खोज परिणाम (Demographic Records)
            </h2>
            <p style={{ margin: 0, fontSize: '12px', color: '#64748b' }}>
              {voters.length
                ? `${voters.length} मतदाता रिकॉर्ड मिले · परिवार विस्तार आधिकारिक फैमिली ID व मकान से`
                : 'समुदाय या उपनाम डालकर खोजें'}
            </p>
          </div>

          {voters.length > 0 && (
            <span
              style={{
                fontSize: '12px',
                fontWeight: 700,
                color: '#7c3aed',
                background: '#f3e8ff',
                padding: '4px 12px',
                borderRadius: '20px',
                border: '1px solid #e9d5ff',
              }}
            >
              {voters.length} मतदाता मिले
            </span>
          )}
        </div>

        {loading ? (
          <div style={{ padding: '60px 20px', textAlign: 'center' }}>
            <LoaderCircle size={30} className="spin" style={{ margin: '0 auto 12px', color: '#7c3aed' }} />
            <p style={{ fontWeight: 600, color: '#334155' }}>सामाजिक समीकरण खोजे जा रहे हैं…</p>
          </div>
        ) : voters.length ? (
          <div className="table-scroll" style={{ overflowX: 'auto' }}>
            <table className="voter-table desk-table" style={{ width: '100%', margin: 0 }}>
              <thead>
                <tr style={{ background: '#f8fafc' }}>
                  <th style={{ padding: '10px 14px' }}>क्र.</th>
                  <th style={{ padding: '10px 14px' }}>मतदाता का नाम</th>
                  <th style={{ padding: '10px 14px' }}>जाति / समुदाय</th>
                  <th style={{ padding: '10px 14px' }}>पहचान पत्र (EPIC)</th>
                  <th style={{ padding: '10px 14px' }}>वार्ड / भाग</th>
                  <th style={{ padding: '10px 14px' }}>मकान व परिवार</th>
                  <th style={{ padding: '10px 14px' }}>मिलान प्रकार</th>
                  <th style={{ padding: '10px 14px' }}>मतदान स्थिति</th>
                </tr>
              </thead>
              <tbody>
                {paginatedVoters.map((voter, index) => (
                  <tr key={voter._id || index} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '10px 14px', fontSize: '12px', color: '#64748b' }}>
                      {voter.serialNo || index + 1}
                    </td>

                    <td style={{ padding: '10px 14px' }}>
                      <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '13.5px', display: 'flex', flexWrap: 'wrap', alignItems: 'baseline', gap: '4px' }}>
                        <span>{voter.nameHi || voter.nameEn || '—'}</span>
                        {voter.nameEn && voter.nameEn !== voter.nameHi && (
                          <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>
                            ({voter.nameEn})
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: '11.5px', color: '#64748b' }}>
                        {voter.relationType ? `${voter.relationType}: ` : 'पिता/पति: '}
                        {voter.relativeNameHi || '—'}
                        {voter.relativeNameEn && voter.relativeNameEn !== voter.relativeNameHi && (
                          <span style={{ color: '#94a3b8', marginLeft: '4px' }}>
                            ({voter.relativeNameEn})
                          </span>
                        )}
                        {voter.gender && ` · ${voter.gender}`}
                        {voter.age && ` (${voter.age} वर्ष)`}
                      </div>
                    </td>

                    <td style={{ padding: '10px 14px' }}>
                      <span
                        style={{
                          fontSize: '11px',
                          fontWeight: 600,
                          color: '#7c3aed',
                          background: '#f3e8ff',
                          padding: '2px 8px',
                          borderRadius: '6px',
                          border: '1px solid #e9d5ff',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {voter.caste || query.split(',')[0]?.trim() || '—'}
                      </span>
                    </td>

                    <td style={{ padding: '10px 14px', fontSize: '12.5px', fontWeight: 600, color: '#2563eb' }}>
                      {voter.epic || '—'}
                    </td>

                    <td style={{ padding: '10px 14px', fontSize: '12px', color: '#475569' }}>
                      वार्ड {voter.wardNo || '—'} · भाग {voter.partNo || '—'}
                    </td>

                    <td style={{ padding: '10px 14px' }}>
                      <button
                        type="button"
                        onClick={() => void showHousehold(voter)}
                        style={{
                          background: '#f0fdf4',
                          border: '1px solid #bbf7d0',
                          borderRadius: '6px',
                          padding: '3px 8px',
                          fontSize: '11.5px',
                          fontWeight: 600,
                          color: '#166534',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                        }}
                        title="इस घर के सभी सदस्य देखें"
                      >
                        <Home size={11} /> #{voter.houseNo || '—'} ({voter.householdCount || 1} सदस्य)
                      </button>
                    </td>

                    <td style={{ padding: '10px 14px' }}>
                      <span
                        style={{
                          fontSize: '11px',
                          fontWeight: 600,
                          padding: '2px 8px',
                          borderRadius: '12px',
                          background: voter.matchType === 'family' ? '#ecfdf5' : '#eff6ff',
                          color: voter.matchType === 'family' ? '#047857' : '#1d4ed8',
                          border: `1px solid ${voter.matchType === 'family' ? '#a7f3d0' : '#bfdbfe'}`,
                        }}
                      >
                        {voter.matchType === 'family' ? '👨‍👩‍👧‍👦 परिवार ID से' : '🎯 सीधा मिलान'}
                      </span>
                    </td>

                    <td style={{ padding: '10px 14px' }}>
                      <span
                        className={`record-status ${voter.voted ? 'status-voted' : 'status-pending'}`}
                        style={{ fontSize: '11px', padding: '2px 8px' }}
                      >
                        {voter.voted ? '✓ मतदान दर्ज' : 'शेष'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Community Pagination Bar */}
            {totalCommunityPages > 1 && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px 16px',
                borderTop: '1px solid #e2e8f0',
                background: '#ffffff',
                flexWrap: 'wrap',
                gap: '10px'
              }}>
                <div style={{ fontSize: '13px', color: '#64748b' }}>
                  दिखाए जा रहे हैं: <strong>{((currentPage - 1) * pageSize + 1).toLocaleString('hi-IN')}</strong> - <strong>{Math.min(currentPage * pageSize, voters.length).toLocaleString('hi-IN')}</strong> (कुल {voters.length.toLocaleString('hi-IN')} मतदाता)
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <button
                    type="button"
                    disabled={currentPage <= 1}
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: '5px 12px',
                      borderRadius: '6px',
                      border: '1px solid #cbd5e1',
                      background: currentPage <= 1 ? '#e2e8f0' : '#ffffff',
                      color: currentPage <= 1 ? '#94a3b8' : '#0f172a',
                      fontSize: '12.5px',
                      fontWeight: 600,
                      cursor: currentPage <= 1 ? 'not-allowed' : 'pointer'
                    }}
                  >
                    <ChevronLeft size={15} /> पिछला
                  </button>
                  <span style={{ fontSize: '13px', fontWeight: 600, color: '#334155' }}>
                    पेज {currentPage} / {totalCommunityPages}
                  </span>
                  <button
                    type="button"
                    disabled={currentPage >= totalCommunityPages}
                    onClick={() => setCurrentPage((p) => Math.min(totalCommunityPages, p + 1))}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: '5px 12px',
                      borderRadius: '6px',
                      border: '1px solid #cbd5e1',
                      background: currentPage >= totalCommunityPages ? '#e2e8f0' : '#ffffff',
                      color: currentPage >= totalCommunityPages ? '#94a3b8' : '#0f172a',
                      fontSize: '12.5px',
                      fontWeight: 600,
                      cursor: currentPage >= totalCommunityPages ? 'not-allowed' : 'pointer'
                    }}
                  >
                    अगला <ChevronRight size={15} />
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          /* POLISHED EMPTY STATE */
          <div style={{ padding: '60px 20px', textAlign: 'center' }}>
            <div
              style={{
                width: '56px',
                height: '56px',
                borderRadius: '16px',
                background: '#f3e8ff',
                color: '#7c3aed',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px',
              }}
            >
              <UsersRound size={28} />
            </div>

            <h3 style={{ margin: '0 0 8px', fontSize: '16px', fontWeight: 700, color: '#1e1b4b' }}>
              {hasSearched ? 'कोई मिलान नहीं मिला' : 'सामाजिक समीकरण खोज शुरू करें'}
            </h3>
            <p style={{ margin: '0 0 16px', fontSize: '13px', color: '#64748b', maxWidth: '440px', marginInline: 'auto' }}>
              {hasSearched
                ? `"${query}" के लिए डेटाबेस में कोई मतदाता रिकॉर्ड नहीं मिला। कृपया अन्य उपनाम या जाति लिखकर खोजें।`
                : 'ऊपर दिए गए खोज बॉक्स में उपनाम लिखें या त्वरित समुदाय बटनों में से किसी एक पर क्लिक करके तुरंत मतदाताओं का सामाजिक समीकरण देखें।'}
            </p>
          </div>
        )}
      </section>

      {/* HOUSEHOLD MODAL / SLIDE-OUT */}
      {selectedHouse && (
        <div
          className="modal-backdrop"
          onClick={() => setSelectedHouse('')}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            background: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
          }}
        >
          <section
            className="form-modal"
            onClick={(e) => e.stopPropagation()}
            style={{
              maxWidth: '780px',
              width: '100%',
              background: '#ffffff',
              borderRadius: '16px',
              padding: '24px',
              maxHeight: '85vh',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              border: '1px solid #e2e8f0',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingBottom: '16px',
                borderBottom: '1px solid #e2e8f0',
                marginBottom: '16px',
              }}
            >
              <div>
                <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 700, color: '#0f172a' }}>
                  मकान #{selectedHouse} · घर के सभी सदस्य
                </h3>
                <p style={{ margin: '3px 0 0', fontSize: '12.5px', color: '#64748b' }}>
                  {selectedVoterForFamily
                    ? `वार्ड ${selectedVoterForFamily.wardNo || '—'} · भाग ${selectedVoterForFamily.partNo || '—'} · कुल ${family.length} सदस्य`
                    : `कुल ${family.length} सदस्य`}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setSelectedHouse('')}
                style={{
                  background: '#f1f5f9',
                  border: 'none',
                  borderRadius: '50%',
                  width: '32px',
                  height: '32px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  color: '#64748b',
                }}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', overflowX: 'auto', WebkitOverflowScrolling: 'touch', minHeight: '200px' }}>
              {familyLoading ? (
                <div style={{ padding: '40px 20px', textAlign: 'center' }}>
                  <LoaderCircle size={24} className="spin" style={{ margin: '0 auto 10px', color: '#047857' }} />
                  घर के सदस्य लोड हो रहे हैं…
                </div>
              ) : family.length ? (
                <table className="voter-table desk-table" style={{ width: '100%', margin: 0 }}>
                  <thead style={{ position: 'sticky', top: 0, background: '#f8fafc' }}>
                    <tr>
                      <th style={{ padding: '8px 12px' }}>क्र.</th>
                      <th style={{ padding: '8px 12px' }}>मतदाता</th>
                      <th style={{ padding: '8px 12px' }}>पिता / पति</th>
                      <th style={{ padding: '8px 12px' }}>EPIC</th>
                      <th style={{ padding: '8px 12px' }}>आयु / जेंडर</th>
                      <th style={{ padding: '8px 12px' }}>स्थिति</th>
                    </tr>
                  </thead>
                  <tbody>
                    {family.map((member, idx) => (
                      <tr key={member._id || idx}>
                        <td style={{ padding: '8px 12px', fontSize: '12px', color: '#64748b' }}>
                          {member.serialNo || idx + 1}
                        </td>
                        <td style={{ padding: '8px 12px', fontWeight: 600, color: '#0f172a' }}>
                          <span>{member.nameHi || member.nameEn}</span>
                          {member.nameEn && member.nameEn !== member.nameHi && (
                            <span style={{ fontSize: '11px', color: '#64748b', marginLeft: '5px', fontWeight: 500 }}>
                              ({member.nameEn})
                            </span>
                          )}
                        </td>
                        <td style={{ padding: '8px 12px', fontSize: '12px', color: '#475569' }}>
                          <span>{member.relativeNameHi || '—'}</span>
                          {member.relativeNameEn && member.relativeNameEn !== member.relativeNameHi && (
                            <span style={{ color: '#94a3b8', marginLeft: '4px' }}>
                              ({member.relativeNameEn})
                            </span>
                          )}
                        </td>
                        <td style={{ padding: '8px 12px', fontSize: '12px', color: '#2563eb', fontWeight: 600 }}>
                          {member.epic || '—'}
                        </td>
                        <td style={{ padding: '8px 12px', fontSize: '12px', color: '#475569' }}>
                          {member.age ? `${member.age} वर्ष` : '—'} · {member.gender || '—'}
                        </td>
                        <td style={{ padding: '8px 12px' }}>
                          <span
                            className={`record-status ${member.voted ? 'status-voted' : 'status-pending'}`}
                            style={{ fontSize: '11px', padding: '2px 8px' }}
                          >
                            {member.voted ? '✓ मतदान दर्ज' : 'शेष'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div style={{ padding: '30px 20px', textAlign: 'center', color: '#64748b' }}>
                  इस मकान के लिए अन्य सदस्य नहीं मिले।
                </div>
              )}
            </div>

            <div style={{ marginTop: '16px', paddingTop: '12px', borderTop: '1px solid #f1f5f9', textAlign: 'right' }}>
              <button className="button-secondary" type="button" onClick={() => setSelectedHouse('')}>
                बंद करें
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
