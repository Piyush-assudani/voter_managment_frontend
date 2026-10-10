'use client';

import React, { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { Check, Circle, LoaderCircle, Printer, RefreshCw, Search } from 'lucide-react';
import { apiFetch, getApiError } from '@/lib/api';
import { SortButton, SortState } from '@/components/SortButton';

interface Voter {
  _id: string;
  serialNo: number;
  voted: boolean;
  nameHi: string;
  nameEn: string;
  relativeNameHi: string;
  houseNo: string;
  age: number;
  gender: string;
  phone: string;
  wardNo: string;
  partNo: string;
}

const getWardsFromToken = () => {
  if (typeof window === 'undefined') return Array.from({ length: 9 }, (_, index) => String(index + 1));
  try {
    const token = window.localStorage.getItem('token');
    if (!token) return Array.from({ length: 9 }, (_, index) => String(index + 1));
    const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
    const allowedWards = payload.user?.allowedWards;
    return Array.isArray(allowedWards) && allowedWards.length > 0 
      ? allowedWards.map((w: string) => w.replace(/[^\d]/g, '')).filter(Boolean).sort((a: string, b: string) => Number(a) - Number(b))
      : Array.from({ length: 9 }, (_, index) => String(index + 1));
  } catch {
    return Array.from({ length: 9 }, (_, index) => String(index + 1));
  }
};

const VoterGridButton = React.memo(({ voter, toggleVote, savingId }: { voter: Voter, toggleVote: (voter: Voter) => void, savingId: string }) => (
  <button 
    type="button" 
    className={voter.voted ? 'is-voted' : ''} 
    title={`${voter.nameHi || voter.nameEn || 'मतदाता'} · क्रम ${voter.serialNo} · ${voter.voted ? 'दर्ज' : 'शेष'}`} 
    aria-label={`क्रम ${voter.serialNo}, ${voter.voted ? 'मतदान दर्ज' : 'शेष'}`} 
    onClick={() => toggleVote(voter)} 
    disabled={savingId === voter._id}
  >
    {voter.serialNo}
  </button>
));
VoterGridButton.displayName = 'VoterGridButton';

const VoterTableRow = React.memo(({ voter, toggleVote, savingId }: { voter: Voter, toggleVote: (voter: Voter) => void, savingId: string }) => (
  <tr>
    <td className="voter-code">{voter.serialNo || '—'}</td>
    <td><div className="voter-name">{voter.nameHi || voter.nameEn || '—'}</div><div className="voter-subline">{voter.relativeNameHi || voter.nameEn || ''}</div></td>
    <td className="voter-code">{voter.houseNo || '—'}</td>
    <td className="voter-code">{voter.age || '—'}{voter.gender ? ` · ${voter.gender}` : ''}</td>
    <td><span className={`record-status ${voter.voted ? 'status-voted' : 'status-pending'}`}>{voter.voted ? 'दर्ज' : 'शेष'}</span></td>
    <td>
      <button className={`button-secondary vote-button ${voter.voted ? 'is-checked' : ''}`} type="button" onClick={() => toggleVote(voter)} disabled={savingId === voter._id}>
        {savingId === voter._id ? <LoaderCircle size={14} className="spin" /> : voter.voted ? <Check size={14} /> : <Circle size={14} />}
        {voter.voted ? 'वापस करें' : 'मतदान दर्ज करें'}
      </button>
    </td>
  </tr>
));
VoterTableRow.displayName = 'VoterTableRow';

export default function PollDeskPage() {
  const [wards, setWards] = useState<string[]>([]);
  const [selectedWard, setSelectedWard] = useState('');
  const [selectedPart, setSelectedPart] = useState('');
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'pending' | 'voted'>('all');
  const [voters, setVoters] = useState<Voter[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState('');
  const [error, setError] = useState('');
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);

  useEffect(() => {
    const initialWards = getWardsFromToken();
    setWards(initialWards);
    setSelectedWard(initialWards[0] || '1');
  }, []);

  const loadVoters = useCallback(async (ward: string) => {
    if (!ward) return;
    setLoading(true);
    setError('');
    try {
      const response = await apiFetch(`/voters/all?ward=${encodeURIComponent(ward)}`, { cache: 'no-store' });
      if (!response.ok) throw new Error(await getApiError(response, 'इस वार्ड के रिकॉर्ड लोड नहीं हो सके।'));
      const result: unknown = await response.json();
      if (!Array.isArray(result)) throw new Error('सर्वर से सूची का सही उत्तर नहीं मिला।');
      setVoters(result as Voter[]);
      setUpdatedAt(new Date());
    } catch (loadError) {
      setVoters([]);
      setError(loadError instanceof Error ? loadError.message : 'इस वार्ड के रिकॉर्ड लोड नहीं हो सके।');
    } finally {
      setLoading(false);
    }
  }, []);

  const [debouncedSearch, setDebouncedSearch] = useState('');

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
    }, 300); // 300ms debounce
    return () => clearTimeout(handler);
  }, [search]);

  useEffect(() => {
    if (selectedWard) void loadVoters(selectedWard);
  }, [selectedWard, loadVoters]);

  const [sort, setSort] = useState<SortState>({ field: 'serialNo', direction: 'asc' });
  const handleSort = (field: string) => {
    setSort((prev) => ({
      field,
      direction: prev.field === field && prev.direction === 'asc' ? 'desc' : 'asc',
    }));
  };

  const visibleVoters = useMemo(() => voters.filter((voter) => {
    const matchesPart = !selectedPart || voter.partNo === selectedPart;
    const matchesStatus = filter === 'all' || (filter === 'voted' ? voter.voted : !voter.voted);
    const query = debouncedSearch.trim().toLowerCase();
    const matchesSearch = !query
      || String(voter.serialNo).includes(query)
      || (voter.nameHi || '').toLowerCase().includes(query)
      || (voter.nameEn || '').toLowerCase().includes(query);
    return matchesPart && matchesStatus && matchesSearch;
  }), [filter, debouncedSearch, selectedPart, voters]);

  const sortedVisibleVoters = useMemo(() => {
    const list = [...visibleVoters];
    list.sort((a, b) => {
      let cmp = 0;
      if (sort.field === 'serialNo') {
        cmp = (Number(a.serialNo) || 0) - (Number(b.serialNo) || 0);
      } else if (sort.field === 'name') {
        const nameA = (a.nameHi || a.nameEn || '').trim();
        const nameB = (b.nameHi || b.nameEn || '').trim();
        cmp = nameA.localeCompare(nameB, 'hi-IN');
      } else if (sort.field === 'houseNo') {
        cmp = (a.houseNo || '').localeCompare(b.houseNo || '', undefined, { numeric: true });
      }
      return sort.direction === 'asc' ? cmp : -cmp;
    });
    return list;
  }, [visibleVoters, sort]);

  const parts = useMemo(() => [...new Set(voters.map((voter) => voter.partNo).filter(Boolean))].sort((a, b) => a.localeCompare(b, undefined, { numeric: true })), [voters]);
  const partVoters = useMemo(() => voters.filter((voter) => !selectedPart || voter.partNo === selectedPart), [voters, selectedPart]);
  const votedCount = partVoters.filter((voter) => voter.voted).length;
  const pendingCount = partVoters.length - votedCount;
  const turnout = partVoters.length ? Math.round((votedCount / partVoters.length) * 100) : 0;

  const toggleVote = useCallback(async (voter: Voter) => {
    setSavingId(voter._id);
    setError('');
    try {
      const response = await apiFetch(`/voters/${encodeURIComponent(voter._id)}/vote`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ voted: !voter.voted }),
      });
      if (!response.ok) throw new Error(await getApiError(response, 'मतदान स्थिति अपडेट नहीं हुई।'));
      setVoters((current) => current.map((item) => item._id === voter._id ? { ...item, voted: !voter.voted } : item));
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : 'मतदान स्थिति अपडेट नहीं हुई।');
    } finally {
      setSavingId('');
    }
  }, []);

  const handleSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!/^\d+$/.test(search.trim())) return;
    const voter = partVoters.find((item) => String(item.serialNo) === search.trim());
    if (!voter) {
      setError(`क्रमांक ${search.trim()} इस बूथ/भाग में नहीं मिला।`);
      return;
    }
    if (voter.voted) {
      setError(`क्रमांक ${voter.serialNo} पर मतदान पहले से दर्ज है।`);
      return;
    }
    void toggleVote(voter);
  };

  const printPending = () => {
    setFilter('pending');
    window.setTimeout(() => window.print(), 0);
  };

  return (
    <div className="work-page">
      <div className="page-intro">
        <div>
          <div className="eyebrow-label"><span className="eyebrow-mark" /> POLLING DESK</div>
          <h1>मतदान डेस्क</h1>
          <p>बूथ पर मतदाता की स्थिति रिकॉर्ड करें। हर बदलाव सीधे डेटाबेस में सेव होता है।</p>
        </div>
        <button className="button-secondary" type="button" onClick={() => void loadVoters(selectedWard)} disabled={loading || !selectedWard}>
          {loading ? <LoaderCircle size={15} className="spin" /> : <RefreshCw size={15} />}
          रिफ्रेश
        </button>
      </div>

      <section className="work-toolbar">
        <label className="work-select-label" htmlFor="ward-select">वार्ड</label>
        <select id="ward-select" value={selectedWard} onChange={(event) => { setSelectedWard(event.target.value); setSelectedPart(''); }}>
          {wards.map((ward) => <option key={ward} value={ward}>वार्ड {ward}</option>)}
        </select>
        <label className="work-select-label" htmlFor="part-select">भाग / बूथ</label>
        <select id="part-select" value={selectedPart} onChange={(event) => setSelectedPart(event.target.value)}>
          <option value="">सभी भाग</option>{parts.map((part) => <option key={part} value={part}>{part}</option>)}
        </select>
        <span className="work-toolbar-divider" />
        <span className="toolbar-caption">{updatedAt ? `डेटा अपडेट: ${updatedAt.toLocaleTimeString('hi-IN', { hour: '2-digit', minute: '2-digit' })}` : 'डेटा की प्रतीक्षा में'}</span>
      </section>

      <section className="metric-grid">
        <article className="metric-card"><span>मतदाता</span><strong>{loading ? '—' : partVoters.length}</strong><small>चुना गया वार्ड / भाग</small></article>
        <article className="metric-card metric-card-green"><span>मतदान दर्ज</span><strong>{loading ? '—' : votedCount}</strong><small>सर्वर पर सेव</small></article>
        <article className="metric-card"><span>अभी शेष</span><strong>{loading ? '—' : pendingCount}</strong><small>मतदान दर्ज होना बाकी</small></article>
        <article className="metric-card"><span>वार्ड प्रगति</span><strong>{loading ? '—' : `${turnout}%`}</strong><small>दर्ज मतदाता / कुल</small></article>
      </section>

      <section className="records-panel">
        <div className="records-toolbar">
          <div><h2>मतदाता रिकॉर्ड</h2><p>स्थिति बदलते ही सर्वर पर सेव होगी।</p></div>
          <form className="desk-search" onSubmit={handleSearch}>
            <Search size={15} />
            <input aria-label="नाम या क्रमांक से खोजें" placeholder="नाम खोजें या क्रमांक से जल्दी दर्ज करें" value={search} onChange={(event) => setSearch(event.target.value)} />
          </form>
          <button className="button-secondary print-control" type="button" onClick={printPending} disabled={!pendingCount}><Printer size={15} />  शेष सूची प्रिंट</button>
        </div>
        <div className="poll-number-grid" aria-label="क्रमांक के अनुसार मतदान स्थिति">
          {partVoters.map((voter) => <VoterGridButton key={voter._id} voter={voter} toggleVote={toggleVote} savingId={savingId} />)}
        </div>
        <div className="filter-tabs" aria-label="मतदाता फ़िल्टर">
          {([
            ['all', 'सभी', partVoters.length],
            ['pending', 'शेष', pendingCount],
            ['voted', 'मतदान दर्ज', votedCount],
          ] as const).map(([value, label, count]) => (
            <button className={filter === value ? 'filter-tab is-active' : 'filter-tab'} key={value} onClick={() => setFilter(value)} type="button">
              {label}<span>{count}</span>
            </button>
          ))}
        </div>

        {error ? (
          <div className="empty-state error-state"><strong>अपडेट उपलब्ध नहीं</strong><p>{error}</p><button className="button-secondary" type="button" onClick={() => void loadVoters(selectedWard)}>फिर से कोशिश करें</button></div>
        ) : loading ? (
          <div className="empty-state"><LoaderCircle size={21} className="spin" /><p>मतदाता रिकॉर्ड लोड हो रहे हैं…</p></div>
        ) : visibleVoters.length === 0 ? (
          <div className="empty-state"><span className="empty-icon"><Search size={18} /></span><strong>कोई रिकॉर्ड नहीं मिला</strong><p>वार्ड या खोज के अनुसार रिकॉर्ड उपलब्ध नहीं है।</p></div>
        ) : (
          <div className="table-scroll">
            <table className="voter-table desk-table">
              <thead>
                <tr>
                  <th>
                    <SortButton label="क्रम संख्या" field="serialNo" type="numeric" currentSort={sort} onSort={handleSort} />
                  </th>
                  <th>
                    <SortButton label="नाम" field="name" type="alpha" currentSort={sort} onSort={handleSort} />
                  </th>
                  <th>
                    <SortButton label="मकान" field="houseNo" type="numeric" currentSort={sort} onSort={handleSort} />
                  </th>
                  <th>उम्र / लिंग</th>
                  <th>मतदान स्थिति</th>
                  <th>कार्य</th>
                </tr>
              </thead>
              <tbody>
                {sortedVisibleVoters.map((voter) => <VoterTableRow key={voter._id} voter={voter} toggleVote={toggleVote} savingId={savingId} />)}
              </tbody>
            </table>
          </div>
        )}
        <div className="records-footnote">मतदान की स्थिति इस चुने गए वार्ड के रिकॉर्ड से गणना की गई है।</div>
      </section>
    </div>
  );
}
