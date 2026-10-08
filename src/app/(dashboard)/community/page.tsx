'use client';

import { FormEvent, useEffect, useRef, useState } from 'react';
import { Download, LoaderCircle, Mic, Printer, Search, UsersRound, X } from 'lucide-react';
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
      const response = await apiFetch(`/features/communities?${params}`, { cache: 'no-store' });
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
      <div className="page-intro">
        <div><div className="eyebrow-label"><span className="eyebrow-mark" /> COMMUNITY LOOKUP</div><h1>समुदाय व परिवार खोज</h1><p>समुदाय/उपनाम से खोजें और चाहें तो आधिकारिक परिवार ID से जुड़े सदस्यों को शामिल करें।</p></div>
        <div className="feature-actions">
          <button className="button-secondary" type="button" onClick={() => window.print()} disabled={!voters.length}><Printer size={15} /> प्रिंट</button>
          <button className="button-secondary" type="button" onClick={() => void exportExcel()} disabled={!voters.length || exporting}>{exporting ? <LoaderCircle size={15} className="spin" /> : <Download size={15} />} Excel एक्सपोर्ट</button>
        </div>
      </div>

      <section className="records-panel">
        <div className="panel-heading"><div><h2>रिकॉर्ड में खोजें</h2><p>समुदाय टैग, मतदाता या परिजन के नाम से मिलान।</p></div></div>
        <form className="feature-filter-form community-search-form" onSubmit={search}>
          <label className="search-field"><Search size={15} /><input aria-label="समुदाय या उपनाम" placeholder="उदा. राठौड़, चौहान, भील" maxLength={500} value={query} onChange={(event) => setQuery(event.target.value)} /><button className="button-quiet" type="button" onClick={startVoiceSearch} disabled={voiceActive} aria-label="बोलकर खोजें" title="बोलकर खोजें"><Mic size={15} /></button>{query && <button className="button-quiet" type="button" onClick={() => setQuery('')} aria-label="खोज साफ़ करें"><X size={15} /></button>}</label>
          <label className="search-field"><UsersRound size={15} /><input aria-label="वार्ड फ़िल्टर" placeholder="वैकल्पिक वार्ड" value={ward} onChange={(event) => setWard(event.target.value)} /></label>
          <label className="community-family-toggle"><input type="checkbox" checked={includeFamily} onChange={(event) => setIncludeFamily(event.target.checked)} /> परिवार ID से जुड़े सदस्य</label>
          <button className="button-primary" type="submit" disabled={loading}>{loading ? <LoaderCircle size={15} className="spin" /> : <Search size={15} />} Analyze</button>
        </form>
        {voiceError && <div className="inline-notice error-notice" role="status">{voiceError}</div>}
        <div className="community-recent-searches">
          <div className="records-toolbar"><div><h3>हालिया समुदाय खोज</h3><p>इस browser में हाल की खोजें</p></div><button className="button-quiet" type="button" onClick={clearRecentSearches} disabled={!recentSearches.length}>इतिहास साफ़ करें</button></div>
          {recentSearches.length ? <div className="feature-actions">{recentSearches.map((item) => <button className="button-quiet" type="button" key={item} onClick={() => setQuery(item)}>{item}</button>)}</div> : <p>अभी कोई खोज इतिहास नहीं।</p>}
        </div>
      </section>

      {error && <div className="inline-notice error-notice" role="alert">{error}</div>}
      <section className="records-panel">
        <div className="records-toolbar"><div><h2>खोज परिणाम</h2><p>{voters.length} रिकॉर्ड · परिवार विस्तार आधिकारिक family ID से</p></div><span className="panel-count">{voters.length} records</span></div>
        {loading ? <div className="empty-state"><LoaderCircle size={20} className="spin" /><p>रिकॉर्ड खोज रहे हैं…</p></div> : voters.length ? (
          <div className="table-scroll"><table className="voter-table desk-table"><thead><tr><th>मतदाता</th><th>समुदाय टैग</th><th>वार्ड / भाग</th><th>परिवार मिलान</th><th>मकान</th><th>क्रमांक</th><th>संपर्क</th></tr></thead><tbody>
            {voters.map((voter) => <tr key={voter._id}><td><div className="voter-name">{voter.nameHi || voter.nameEn || '—'}</div><div className="voter-subline">{voter.relationType ? `${voter.relationType}: ` : ''}{voter.relativeNameHi || '—'}</div></td><td>{voter.caste || '—'}</td><td>{voter.wardNo || '—'} · {voter.partNo || '—'}</td><td>{voter.matchType === 'family' ? 'परिवार ID से' : 'सीधा मिलान'}</td><td><button className="button-quiet" type="button" onClick={() => void showHousehold(voter)}>{voter.houseNo || '—'} · {voter.householdCount || 1} रिकॉर्ड</button></td><td>{voter.serialNo || '—'}</td><td>{voter.phone || '—'}</td></tr>)}
          </tbody></table></div>
        ) : <div className="empty-state"><strong>{query ? 'कोई मिलान नहीं मिला' : 'खोज शुरू करें'}</strong><p>परिणाम केवल डेटाबेस में दर्ज जानकारी से आते हैं।</p></div>}
      </section>

      {selectedHouse && <section className="records-panel">
        <div className="records-toolbar"><div><h2>मकान {selectedHouse} · घर के रिकॉर्ड</h2><p>यह अलग सुविधा वार्ड/भाग/मकान नंबर से घर के रिकॉर्ड दिखाती है।</p></div><button className="button-quiet" type="button" onClick={() => setSelectedHouse('')}>बंद करें</button></div>
        {family.length ? <div className="table-scroll"><table className="voter-table desk-table"><thead><tr><th>नाम</th><th>EPIC</th><th>क्रमांक</th><th>वार्ड / भाग</th></tr></thead><tbody>{family.map((person) => <tr key={person._id}><td>{person.nameHi || person.nameEn}</td><td>{person.epic}</td><td>{person.serialNo}</td><td>{person.wardNo} · {person.partNo}</td></tr>)}</tbody></table></div> : <div className="empty-state"><p>इस मकान के लिए अतिरिक्त रिकॉर्ड उपलब्ध नहीं हैं।</p></div>}
      </section>}
    </div>
  );
}
