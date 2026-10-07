'use client';

import { FormEvent, useState } from 'react';
import { Download, LoaderCircle, Printer, Search, UsersRound } from 'lucide-react';
import { apiFetch, getApiError } from '@/lib/api';

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
  phone: string;
  householdCount: number;
}

export default function CommunityPage() {
  const [query, setQuery] = useState('');
  const [ward, setWard] = useState('');
  const [voters, setVoters] = useState<Voter[]>([]);
  const [family, setFamily] = useState<Voter[]>([]);
  const [selectedHouse, setSelectedHouse] = useState('');
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState('');

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
      const params = new URLSearchParams({ q: query.trim() });
      if (ward.trim()) params.set('ward', ward.trim());
      const response = await apiFetch(`/features/communities?${params}`, { cache: 'no-store' });
      if (!response.ok) throw new Error(await getApiError(response, 'समुदाय खोज पूरी नहीं हो सकी।'));
      setVoters(await response.json() as Voter[]);
    } catch (searchError) {
      setVoters([]);
      setError(searchError instanceof Error ? searchError.message : 'समुदाय खोज पूरी नहीं हो सकी।');
    } finally {
      setLoading(false);
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
      const params = new URLSearchParams({ dataset: 'community', search: query.trim() });
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
        <div><div className="eyebrow-label"><span className="eyebrow-mark" /> COMMUNITY LOOKUP</div><h1>समुदाय व परिवार खोज</h1><p>दर्ज समुदाय/उपनाम, क्षेत्र और मौजूदा परिवार रिकॉर्ड से खोजें। कोई अनुमानित जनसांख्यिकीय आँकड़ा नहीं जोड़ा जाता।</p></div>
        <div className="feature-actions">
          <button className="button-secondary" type="button" onClick={() => window.print()} disabled={!voters.length}><Printer size={15} /> प्रिंट</button>
          <button className="button-secondary" type="button" onClick={() => void exportExcel()} disabled={!voters.length || exporting}>{exporting ? <LoaderCircle size={15} className="spin" /> : <Download size={15} />} Excel एक्सपोर्ट</button>
        </div>
      </div>

      <section className="records-panel">
        <div className="panel-heading"><div><h2>रिकॉर्ड में खोजें</h2><p>समुदाय टैग, मतदाता या परिजन के नाम से मिलान।</p></div></div>
        <form className="feature-filter-form community-search-form" onSubmit={search}>
          <label className="search-field"><Search size={15} /><input aria-label="समुदाय या उपनाम" placeholder="जैसे: समुदाय या उपनाम" value={query} onChange={(event) => setQuery(event.target.value)} /></label>
          <label className="search-field"><UsersRound size={15} /><input aria-label="वार्ड फ़िल्टर" placeholder="वैकल्पिक वार्ड" value={ward} onChange={(event) => setWard(event.target.value)} /></label>
          <button className="button-primary" type="submit" disabled={loading}>{loading ? <LoaderCircle size={15} className="spin" /> : <Search size={15} />} खोजें</button>
        </form>
      </section>

      {error && <div className="inline-notice error-notice" role="alert">{error}</div>}
      <section className="records-panel">
        <div className="records-toolbar"><div><h2>खोज परिणाम</h2><p>{voters.length} मिलान रिकॉर्ड · मकान संख्या से परिवार विस्तार</p></div><span className="panel-count">{voters.length} records</span></div>
        {loading ? <div className="empty-state"><LoaderCircle size={20} className="spin" /><p>रिकॉर्ड खोज रहे हैं…</p></div> : voters.length ? (
          <div className="table-scroll"><table className="voter-table desk-table"><thead><tr><th>मतदाता</th><th>समुदाय टैग</th><th>वार्ड / भाग</th><th>मकान / परिवार</th><th>क्रमांक</th><th>संपर्क</th></tr></thead><tbody>
            {voters.map((voter) => <tr key={voter._id}><td><div className="voter-name">{voter.nameHi || voter.nameEn || '—'}</div><div className="voter-subline">{voter.relationType ? `${voter.relationType}: ` : ''}{voter.relativeNameHi || '—'}</div></td><td>{voter.caste || '—'}</td><td>{voter.wardNo || '—'} · {voter.partNo || '—'}</td><td><button className="button-quiet" type="button" onClick={() => void showHousehold(voter)}>{voter.houseNo || '—'} · {voter.householdCount || 1} रिकॉर्ड</button></td><td>{voter.serialNo || '—'}</td><td>{voter.phone || '—'}</td></tr>)}
          </tbody></table></div>
        ) : <div className="empty-state"><strong>{query ? 'कोई मिलान नहीं मिला' : 'खोज शुरू करें'}</strong><p>परिणाम केवल डेटाबेस में दर्ज जानकारी से आते हैं।</p></div>}
      </section>

      {selectedHouse && <section className="records-panel">
        <div className="records-toolbar"><div><h2>मकान {selectedHouse} · परिवार रिकॉर्ड</h2><p>परिवार समूह मौजूदा वार्ड/भाग/मकान डेटा से निकाला गया है, आधिकारिक family ID नहीं।</p></div><button className="button-quiet" type="button" onClick={() => setSelectedHouse('')}>बंद करें</button></div>
        {family.length ? <div className="table-scroll"><table className="voter-table desk-table"><thead><tr><th>नाम</th><th>EPIC</th><th>क्रमांक</th><th>वार्ड / भाग</th></tr></thead><tbody>{family.map((person) => <tr key={person._id}><td>{person.nameHi || person.nameEn}</td><td>{person.epic}</td><td>{person.serialNo}</td><td>{person.wardNo} · {person.partNo}</td></tr>)}</tbody></table></div> : <div className="empty-state"><p>इस मकान के लिए अतिरिक्त रिकॉर्ड उपलब्ध नहीं हैं।</p></div>}
      </section>}
    </div>
  );
}
