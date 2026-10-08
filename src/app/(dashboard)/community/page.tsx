'use client';

import { FormEvent, useEffect, useRef, useState } from 'react';
import { Download, LoaderCircle, Mic, Printer, Search, UsersRound, X, ChevronRight, UserSearch } from 'lucide-react';
import { apiFetch, getApiError } from '@/lib/api';
import { createSpeechRecognition, SpeechRecognitionLike } from '@/lib/speech';

interface Voter {
  _id: string;
  nameHi: string;
  nameEn: string;
  epic: string;
  relativeNameHi: string;
  relationType: string;
  wardNo: string;
  partNo: string;
  houseNo: string;
  serialNo: number;
  caste: string;
  matchType: 'direct' | 'family';
  phone: string;
  householdCount: number;
}

export default function CommunityPage() {
  const [query, setQuery] = useState('');
  const [ward, setWard] = useState('');
  const [includeFamily, setIncludeFamily] = useState(true);
  const [voters, setVoters] = useState<Voter[]>([]);
  const [family, setFamily] = useState<Voter[]>([]);
  const [selectedHouse, setSelectedHouse] = useState('');
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [voiceActive, setVoiceActive] = useState(false);
  const [voiceError, setVoiceError] = useState('');
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    void Promise.resolve().then(() => {
      try {
        const stored: unknown = JSON.parse(window.localStorage.getItem('vijaysetu-community-searches') || '[]');
        if (Array.isArray(stored) && stored.every((item) => typeof item === 'string')) setRecentSearches(stored.slice(0, 8));
      } catch {
        setError('हालिया खोज इतिहास पढ़ा नहीं जा सका।');
      }
    });
  }, []);

  useEffect(() => () => recognitionRef.current?.stop(), []);

  const rememberSearch = (term: string) => {
    const updated = [term, ...recentSearches.filter((item) => item !== term)].slice(0, 8);
    setRecentSearches(updated);
    try {
      window.localStorage.setItem('vijaysetu-community-searches', JSON.stringify(updated));
    } catch {
      setError('खोज पूरी हुई, लेकिन हालिया खोज इतिहास सेव नहीं हो सका।');
    }
  };

  const search = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!query.trim()) {
      setError('समुदाय या उपनाम दर्ज करें।');
      return;
    }
    setLoading(true);
    setError('');
    setSelectedHouse('');
    setFamily([]);
    try {
      const params = new URLSearchParams({ q: query.trim(), includeFamily: String(includeFamily) });
      if (ward.trim()) params.set('ward', ward.trim());
      const response = await apiFetch(`/features/community?${params}`, { cache: 'no-store' });
      if (!response.ok) throw new Error(await getApiError(response, 'समुदाय खोज पूरी नहीं हो सकी।'));
      setVoters(await response.json() as Voter[]);
      rememberSearch(query.trim());
    } catch (searchError) {
      setVoters([]);
      setError(searchError instanceof Error ? searchError.message : 'समुदाय खोज पूरी नहीं हो सकी।');
    } finally {
      setLoading(false);
    }
  };

  const startVoiceSearch = () => {
    recognitionRef.current?.stop();
    const recognition = createSpeechRecognition();
    if (!recognition) {
      setVoiceError('इस browser में voice search उपलब्ध नहीं है।');
      return;
    }
    setVoiceError('');
    recognition.lang = 'hi-IN';
    recognition.interimResults = false;
    recognition.onresult = (event) => {
      const transcript = event.results[0]?.[0]?.transcript?.trim();
      if (transcript) setQuery(transcript);
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
    } catch {
      setError('हालिया खोज सूची इस browser में साफ़ नहीं हो सकी।');
    }
  };

  const showHousehold = async (voter: Voter) => {
    const house = voter.houseNo || '';
    setSelectedHouse(house);
    setFamily([]);
    if (!house) return;
    try {
      const params = new URLSearchParams();
      if (voter.wardNo) params.set('ward', voter.wardNo);
      if (voter.partNo) params.set('part', voter.partNo);
      const response = await apiFetch(`/voters/family/${encodeURIComponent(house)}?${params}`, { cache: 'no-store' });
      if (!response.ok) throw new Error(await getApiError(response, 'घर के अन्य रिकॉर्ड नहीं मिले।'));
      setFamily(await response.json() as Voter[]);
    } catch (familyError) {
      setError(familyError instanceof Error ? familyError.message : 'घर के अन्य रिकॉर्ड नहीं मिले।');
    }
  };

  const exportExcel = async () => {
    setExporting(true);
    setError('');
    try {
      const params = new URLSearchParams({ dataset: 'community', q: query.trim(), includeFamily: String(includeFamily) });
      if (ward.trim()) params.set('ward', ward.trim());
      const response = await apiFetch(`/features/export.xlsx?${params}`);
      if (!response.ok) throw new Error(await getApiError(response, 'Excel एक्सपोर्ट नहीं हो सका।'));
      const url = URL.createObjectURL(await response.blob());
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = 'community-search.xlsx';
      anchor.click();
      URL.revokeObjectURL(url);
    } catch (exportError) {
      setError(exportError instanceof Error ? exportError.message : 'Excel एक्सपोर्ट नहीं हो सका।');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="work-page">
      <div className="page-intro" style={{ borderBottom: 'none', paddingBottom: '0' }}>
        <div>
          <div className="eyebrow-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <UserSearch size={14} className="text-primary-600" />
            <span style={{ color: '#6366f1', fontWeight: '700' }}>COMMUNITY LOOKUP</span>
          </div>
          <h1 style={{ fontSize: '28px', fontWeight: '800', letterSpacing: '-0.5px', marginTop: '8px' }}>समुदाय व परिवार खोज</h1>
          <p style={{ color: '#64748b', fontSize: '15px' }}>समुदाय या उपनाम से समाज के लोगों को खोजें और उनके परिवार देखें।</p>
        </div>
      </div>

      <section style={{ 
        background: 'linear-gradient(145deg, #ffffff 0%, #f8fafc 100%)', 
        borderRadius: '24px', 
        padding: '32px', 
        boxShadow: '0 10px 30px -10px rgba(0,0,0,0.05), 0 0 0 1px rgba(226,232,240,0.8)',
        marginBottom: '32px'
      }}>
        <form onSubmit={search} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
            <div style={{ 
              flex: '2', 
              position: 'relative', 
              display: 'flex', 
              alignItems: 'center',
              background: '#ffffff',
              border: '2px solid #e2e8f0',
              borderRadius: '16px',
              padding: '8px 20px',
              transition: 'all 0.2s ease',
              boxShadow: '0 4px 12px rgba(0,0,0,0.02)'
            }}>
              <Search size={20} color="#94a3b8" />
              <input 
                autoFocus
                aria-label="समुदाय या उपनाम" 
                placeholder="उदा. राठौड़, चौहान, मेघवाल, भील..." 
                maxLength={500} 
                value={query} 
                onChange={(event) => setQuery(event.target.value)} 
                style={{ border: 'none', outline: 'none', width: '100%', padding: '12px', fontSize: '16px', background: 'transparent' }}
              />
              <button 
                type="button" 
                onClick={startVoiceSearch} 
                disabled={voiceActive} 
                title="बोलकर खोजें"
                style={{ background: voiceActive ? '#ef4444' : '#f1f5f9', color: voiceActive ? '#fff' : '#64748b', border: 'none', borderRadius: '12px', padding: '10px', cursor: 'pointer', transition: 'all 0.2s', display: 'flex', alignItems: 'center' }}
              >
                <Mic size={18} />
              </button>
              {query && (
                <button 
                  type="button" 
                  onClick={() => setQuery('')} 
                  style={{ background: 'transparent', border: 'none', color: '#94a3b8', padding: '10px', cursor: 'pointer' }}
                >
                  <X size={18} />
                </button>
              )}
            </div>

            <div style={{ 
              flex: '1', 
              display: 'flex', 
              alignItems: 'center',
              background: '#ffffff',
              border: '2px solid #e2e8f0',
              borderRadius: '16px',
              padding: '8px 20px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.02)'
            }}>
              <UsersRound size={20} color="#94a3b8" />
              <input 
                aria-label="वार्ड फ़िल्टर" 
                placeholder="वार्ड नंबर (वैकल्पिक)" 
                value={ward} 
                onChange={(event) => setWard(event.target.value)} 
                style={{ border: 'none', outline: 'none', width: '100%', padding: '12px', fontSize: '16px', background: 'transparent' }}
              />
            </div>

            <button 
              type="submit" 
              disabled={loading}
              style={{
                background: 'linear-gradient(135deg, #4f46e5 0%, #6366f1 100%)',
                color: 'white',
                border: 'none',
                borderRadius: '16px',
                padding: '0 32px',
                fontSize: '16px',
                fontWeight: '600',
                cursor: loading ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: '0 10px 20px -10px rgba(79, 70, 229, 0.5)',
                transition: 'all 0.2s'
              }}
            >
              {loading ? <LoaderCircle size={20} className="spin" /> : <Search size={20} />}
              विश्लेषण करें (Analyze)
            </button>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', paddingLeft: '8px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '14px', color: '#475569', fontWeight: '500' }}>
              <input 
                type="checkbox" 
                checked={includeFamily} 
                onChange={(event) => setIncludeFamily(event.target.checked)} 
                style={{ width: '18px', height: '18px', accentColor: '#4f46e5', cursor: 'pointer' }}
              /> 
              परिवार ID से जुड़े सभी सदस्यों को शामिल करें
            </label>
          </div>
        </form>

        {voiceError && <div className="inline-notice error-notice" style={{ marginTop: '16px' }} role="status">{voiceError}</div>}
        
        {recentSearches.length > 0 && (
          <div style={{ marginTop: '24px', paddingTop: '20px', borderTop: '1px solid #e2e8f0' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
              <span style={{ fontSize: '13px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>हालिया खोजें</span>
              <button 
                type="button" 
                onClick={clearRecentSearches} 
                style={{ background: 'none', border: 'none', color: '#ef4444', fontSize: '13px', fontWeight: '500', cursor: 'pointer' }}
              >
                इतिहास साफ़ करें
              </button>
            </div>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {recentSearches.map((item) => (
                <button 
                  key={item} 
                  type="button" 
                  onClick={() => { setQuery(item); document.querySelector('form')?.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true })) }}
                  style={{ background: '#f1f5f9', border: '1px solid #e2e8f0', padding: '6px 14px', borderRadius: '20px', fontSize: '14px', color: '#334155', cursor: 'pointer', transition: 'all 0.2s' }}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>
        )}
      </section>

      {error && <div className="inline-notice error-notice" style={{ marginBottom: '24px' }} role="alert">{error}</div>}
      
      <section className="records-panel" style={{ borderRadius: '20px', overflow: 'hidden', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
        <div className="records-toolbar" style={{ background: '#ffffff', padding: '20px 24px', borderBottom: '1px solid #f1f5f9' }}>
          <div>
            <h2 style={{ fontSize: '20px', fontWeight: '700', color: '#0f172a' }}>खोज परिणाम</h2>
            <p style={{ color: '#64748b', marginTop: '4px' }}>{voters.length > 0 ? `${voters.length} रिकॉर्ड मिले` : 'समाज के लोगों की सूची यहाँ दिखेगी'}</p>
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
             <button className="button-secondary" type="button" onClick={() => window.print()} disabled={!voters.length} style={{ borderRadius: '12px' }}><Printer size={15} /> प्रिंट</button>
             <button className="button-secondary" type="button" onClick={() => void exportExcel()} disabled={!voters.length || exporting} style={{ borderRadius: '12px' }}>{exporting ? <LoaderCircle size={15} className="spin" /> : <Download size={15} />} Excel</button>
          </div>
        </div>
        
        {loading ? (
          <div style={{ padding: '60px', textAlign: 'center' }}>
            <LoaderCircle size={40} className="spin" style={{ color: '#4f46e5', margin: '0 auto 16px auto' }} />
            <h3 style={{ fontSize: '18px', color: '#334155', fontWeight: '600' }}>डेटाबेस स्कैन हो रहा है...</h3>
            <p style={{ color: '#64748b' }}>कृपया प्रतीक्षा करें</p>
          </div>
        ) : voters.length ? (
          <div className="table-scroll" style={{ background: '#ffffff' }}>
            <table className="voter-table desk-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f8fafc' }}>
                  <th style={{ padding: '16px 24px', textAlign: 'left', fontSize: '13px', color: '#64748b', fontWeight: '600', borderBottom: '1px solid #e2e8f0' }}>मतदाता</th>
                  <th style={{ padding: '16px 24px', textAlign: 'left', fontSize: '13px', color: '#64748b', fontWeight: '600', borderBottom: '1px solid #e2e8f0' }}>समुदाय टैग</th>
                  <th style={{ padding: '16px 24px', textAlign: 'left', fontSize: '13px', color: '#64748b', fontWeight: '600', borderBottom: '1px solid #e2e8f0' }}>वार्ड / भाग</th>
                  <th style={{ padding: '16px 24px', textAlign: 'left', fontSize: '13px', color: '#64748b', fontWeight: '600', borderBottom: '1px solid #e2e8f0' }}>परिवार मिलान</th>
                  <th style={{ padding: '16px 24px', textAlign: 'left', fontSize: '13px', color: '#64748b', fontWeight: '600', borderBottom: '1px solid #e2e8f0' }}>मकान</th>
                  <th style={{ padding: '16px 24px', textAlign: 'left', fontSize: '13px', color: '#64748b', fontWeight: '600', borderBottom: '1px solid #e2e8f0' }}>संपर्क</th>
                </tr>
              </thead>
              <tbody>
                {voters.map((voter) => (
                  <tr key={voter._id} style={{ borderBottom: '1px solid #f1f5f9', transition: 'background 0.2s', cursor: 'default' }} onMouseOver={(e) => e.currentTarget.style.background = '#f8fafc'} onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}>
                    <td style={{ padding: '16px 24px' }}>
                      <div style={{ fontWeight: '700', color: '#0f172a', fontSize: '15px' }}>{voter.nameHi || voter.nameEn || '—'}</div>
                      <div style={{ color: '#64748b', fontSize: '13px', marginTop: '4px' }}>{voter.relationType ? `${voter.relationType}: ` : ''}{voter.relativeNameHi || '—'}</div>
                    </td>
                    <td style={{ padding: '16px 24px' }}>
                      <span style={{ background: '#e0e7ff', color: '#4338ca', padding: '4px 10px', borderRadius: '6px', fontSize: '13px', fontWeight: '600' }}>{voter.caste || 'टैग नहीं'}</span>
                    </td>
                    <td style={{ padding: '16px 24px', color: '#475569', fontSize: '14px' }}>वार्ड {voter.wardNo || '—'} <span style={{ color: '#cbd5e1' }}>•</span> भाग {voter.partNo || '—'}</td>
                    <td style={{ padding: '16px 24px' }}>
                       {voter.matchType === 'family' ? (
                         <span style={{ color: '#10b981', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '13px', fontWeight: '500' }}>परिवार ID से</span>
                       ) : (
                         <span style={{ color: '#f59e0b', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '13px', fontWeight: '500' }}>सीधा नाम/उपनाम से</span>
                       )}
                    </td>
                    <td style={{ padding: '16px 24px' }}>
                      <button 
                        type="button" 
                        onClick={() => void showHousehold(voter)}
                        style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#f1f5f9', border: '1px solid #e2e8f0', padding: '6px 12px', borderRadius: '8px', color: '#334155', fontWeight: '500', cursor: 'pointer', transition: 'all 0.2s' }}
                      >
                        {voter.houseNo || '—'} 
                        <span style={{ background: '#e2e8f0', color: '#475569', padding: '2px 6px', borderRadius: '4px', fontSize: '11px' }}>{voter.householdCount || 1} सदस्य</span>
                      </button>
                    </td>
                    <td style={{ padding: '16px 24px', color: '#475569', fontSize: '14px', fontWeight: '500' }}>{voter.phone || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div style={{ padding: '80px 20px', textAlign: 'center', background: '#ffffff' }}>
            <div style={{ width: '64px', height: '64px', background: '#f1f5f9', borderRadius: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px auto' }}>
              <UsersRound size={32} color="#94a3b8" />
            </div>
            <h3 style={{ fontSize: '18px', color: '#0f172a', fontWeight: '700', marginBottom: '8px' }}>{query ? 'कोई समाज बंधु नहीं मिले' : 'समाज खोज शुरू करें'}</h3>
            <p style={{ color: '#64748b', maxWidth: '400px', margin: '0 auto' }}>
              उपनाम (जैसे: राठौड़, चौहान, मेघवाल) या समुदाय का नाम दर्ज करके Analyze बटन दबाएं।
            </p>
          </div>
        )}
      </section>

      {selectedHouse && (
        <section className="records-panel" style={{ marginTop: '24px', borderRadius: '20px', border: '1px solid #c7d2fe', overflow: 'hidden', boxShadow: '0 10px 25px -5px rgba(99, 102, 241, 0.1)' }}>
          <div className="records-toolbar" style={{ background: '#eef2ff', padding: '16px 24px', borderBottom: '1px solid #c7d2fe' }}>
            <div>
              <h2 style={{ fontSize: '18px', fontWeight: '700', color: '#3730a3' }}>मकान {selectedHouse} (परिवार के सदस्य)</h2>
              <p style={{ color: '#4f46e5', fontSize: '13px', marginTop: '4px' }}>इस घर में रहने वाले सभी मतदाता</p>
            </div>
            <button 
              type="button" 
              onClick={() => setSelectedHouse('')}
              style={{ background: '#ffffff', border: '1px solid #c7d2fe', padding: '8px 16px', borderRadius: '10px', color: '#4f46e5', fontWeight: '600', cursor: 'pointer', transition: 'all 0.2s' }}
            >
              बंद करें
            </button>
          </div>
          
          {family.length ? (
            <div className="table-scroll" style={{ background: '#ffffff' }}>
              <table className="voter-table desk-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#f8fafc' }}>
                    <th style={{ padding: '12px 24px', textAlign: 'left', fontSize: '13px', color: '#64748b', borderBottom: '1px solid #e2e8f0' }}>नाम</th>
                    <th style={{ padding: '12px 24px', textAlign: 'left', fontSize: '13px', color: '#64748b', borderBottom: '1px solid #e2e8f0' }}>पिता/पति</th>
                    <th style={{ padding: '12px 24px', textAlign: 'left', fontSize: '13px', color: '#64748b', borderBottom: '1px solid #e2e8f0' }}>EPIC</th>
                    <th style={{ padding: '12px 24px', textAlign: 'left', fontSize: '13px', color: '#64748b', borderBottom: '1px solid #e2e8f0' }}>आयु/लिंग</th>
                  </tr>
                </thead>
                <tbody>
                  {family.map((person) => (
                    <tr key={person._id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '12px 24px', fontWeight: '600', color: '#1e293b' }}>{person.nameHi || person.nameEn}</td>
                      <td style={{ padding: '12px 24px', color: '#475569' }}>{person.relationType ? `${person.relationType}: ` : ''}{person.relativeNameHi || '—'}</td>
                      <td style={{ padding: '12px 24px', color: '#6366f1', fontWeight: '500' }}>{person.epic}</td>
                      <td style={{ padding: '12px 24px', color: '#475569' }}>{person.age} वर्ष, {person.gender}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="empty-state" style={{ padding: '40px', background: '#ffffff' }}><p>इस मकान के लिए अतिरिक्त रिकॉर्ड उपलब्ध नहीं हैं।</p></div>
          )}
        </section>
      )}
    </div>
  );
}
