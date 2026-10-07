'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';
import { Download, LoaderCircle, MapPin, Phone, RefreshCw, Search, UserRoundX } from 'lucide-react';
import { apiFetch, getApiError } from '@/lib/api';

interface Migrant {
  _id: string;
  epic: string;
  nameHi: string;
  nameEn: string;
  relativeNameHi: string;
  age: number;
  gender: string;
  wardNo: string;
  partNo: string;
  houseNo: string;
  serialNo: number;
  phone: string;
  migrantLocation: string;
  householdCount: number;
}

export default function MigrantsPage() {
  const [voters, setVoters] = useState<Migrant[]>([]);
  const [search, setSearch] = useState('');
  const [ward, setWard] = useState('');
  const [locations, setLocations] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [savingId, setSavingId] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const load = useCallback(async (q = search, selectedWard = ward) => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      if (q.trim()) params.set('search', q.trim());
      if (selectedWard.trim()) params.set('ward', selectedWard.trim());
      const response = await apiFetch(`/features/migrants?${params}`, { cache: 'no-store' });
      if (!response.ok) throw new Error(await getApiError(response, 'प्रवासी मतदाता सूची लोड नहीं हुई।'));
      const result = await response.json() as Migrant[];
      setVoters(result);
      setLocations(Object.fromEntries(result.map((voter) => [voter._id, voter.migrantLocation || ''])));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'प्रवासी मतदाता सूची लोड नहीं हुई।');
      setVoters([]);
    } finally {
      setLoading(false);
    }
  }, [search, ward]);

  useEffect(() => { void Promise.resolve().then(() => load()); }, [load]);

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void load(search, ward);
  };

  const updateVoter = async (voter: Migrant, remove = false) => {
    setSavingId(voter._id);
    setError('');
    setNotice('');
    try {
      const response = await apiFetch(`/voters/${encodeURIComponent(voter._id)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(remove
          ? { isMigrant: false, migrantLocation: '' }
          : { isMigrant: true, migrantLocation: locations[voter._id] || '' }),
      });
      if (!response.ok) throw new Error(await getApiError(response, 'प्रवासी रिकॉर्ड अपडेट नहीं हुआ।'));
      if (remove) setVoters((current) => current.filter((item) => item._id !== voter._id));
      else setVoters((current) => current.map((item) => item._id === voter._id ? { ...item, migrantLocation: locations[voter._id] || '' } : item));
      setNotice(remove ? 'प्रवासी चिह्न हटाया गया।' : 'स्थान विवरण सेव हुआ।');
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'प्रवासी रिकॉर्ड अपडेट नहीं हुआ।');
    } finally {
      setSavingId('');
    }
  };

  const exportExcel = async () => {
    setExporting(true);
    setError('');
    try {
      const params = new URLSearchParams({ dataset: 'migrants' });
      if (search.trim()) params.set('search', search.trim());
      if (ward.trim()) params.set('ward', ward.trim());
      const response = await apiFetch(`/features/export.xlsx?${params}`);
      if (!response.ok) throw new Error(await getApiError(response, 'Excel एक्सपोर्ट नहीं हो सका।'));
      const url = URL.createObjectURL(await response.blob());
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = 'migrant-voters.xlsx';
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
        <div><div className="eyebrow-label"><span className="eyebrow-mark" /> MIGRANT VOTERS</div><h1>प्रवासी मतदाता</h1><p>प्रवासी चिह्नित रिकॉर्ड देखें, वर्तमान स्थान अपडेट करें और संपर्क सूची एक्सपोर्ट करें।</p></div>
        <div className="feature-actions">
          <button className="button-secondary" type="button" onClick={() => void load()} disabled={loading}>{loading ? <LoaderCircle size={15} className="spin" /> : <RefreshCw size={15} />} रिफ्रेश</button>
          <button className="button-secondary" type="button" onClick={() => void exportExcel()} disabled={!voters.length || exporting}>{exporting ? <LoaderCircle size={15} className="spin" /> : <Download size={15} />} Excel एक्सपोर्ट</button>
        </div>
      </div>
      {error && <div className="inline-notice error-notice" role="alert">{error}</div>}
      {notice && <div className="inline-notice" role="status">{notice}</div>}
      <section className="records-panel">
        <div className="records-toolbar"><div><h2>प्रवासी सूची</h2><p>{voters.length} रिकॉर्ड · परिवार गणना मकान/भाग/वार्ड से</p></div><span className="panel-count">{voters.length} voters</span></div>
        <form className="feature-filter-form" onSubmit={submit}>
          <label className="search-field"><Search size={15} /><input aria-label="प्रवासी मतदाता खोजें" placeholder="नाम, EPIC, फोन या स्थान" value={search} onChange={(event) => setSearch(event.target.value)} /></label>
          <label className="search-field"><MapPin size={15} /><input aria-label="वार्ड" placeholder="वार्ड" value={ward} onChange={(event) => setWard(event.target.value)} /></label>
          <button className="button-primary" type="submit" disabled={loading}><Search size={15} /> खोजें</button>
        </form>
        {loading && !voters.length ? <div className="empty-state"><LoaderCircle size={20} className="spin" /><p>प्रवासी रिकॉर्ड लोड हो रहे हैं…</p></div> : voters.length ? (
          <div className="table-scroll"><table className="voter-table desk-table"><thead><tr><th>मतदाता</th><th>मतदाता विवरण</th><th>संपर्क</th><th>वर्तमान स्थान</th><th>कार्य</th></tr></thead><tbody>
            {voters.map((voter) => <tr key={voter._id}>
              <td><div className="voter-name">{voter.nameHi || voter.nameEn || '—'}</div><div className="voter-subline">{voter.relativeNameHi || '—'}</div></td>
              <td>{voter.wardNo} · {voter.partNo} · मकान {voter.houseNo || '—'}<div className="voter-subline">क्रम {voter.serialNo || '—'} · परिवार में {voter.householdCount || 1}</div></td>
              <td>{voter.phone ? <div className="feature-actions"><a className="button-quiet" href={`tel:${voter.phone}`} aria-label={`${voter.nameHi || voter.nameEn} को कॉल करें`}><Phone size={14} /> कॉल</a><a className="button-quiet" href={`https://wa.me/${voter.phone.replace(/\D/g, '')}`} target="_blank" rel="noreferrer">WhatsApp</a></div> : 'फोन दर्ज नहीं'}</td>
              <td><input className="feature-inline-input" aria-label={`${voter.nameHi || voter.nameEn} का वर्तमान स्थान`} placeholder="स्थान दर्ज करें" value={locations[voter._id] || ''} onChange={(event) => setLocations((current) => ({ ...current, [voter._id]: event.target.value }))} /></td>
              <td><div className="feature-actions"><button className="button-secondary" type="button" onClick={() => void updateVoter(voter)} disabled={savingId === voter._id}>{savingId === voter._id ? <LoaderCircle size={14} className="spin" /> : <MapPin size={14} />} सेव</button><button className="button-quiet" type="button" onClick={() => void updateVoter(voter, true)} disabled={savingId === voter._id}><UserRoundX size={14} /> चिह्न हटाएँ</button></div></td>
            </tr>)}
          </tbody></table></div>
        ) : <div className="empty-state"><strong>{loading ? 'लोड हो रहा है…' : 'कोई प्रवासी रिकॉर्ड नहीं'}</strong><p>मतदाता सूची में किसी रिकॉर्ड को प्रवासी चिह्नित करने पर वह यहाँ दिखेगा।</p></div>}
      </section>
    </div>
  );
}
