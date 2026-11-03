'use client';

import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Download,
  Home,
  LoaderCircle,
  MapPin,
  Phone,
  Printer,
  RefreshCw,
  Search,
  Sparkles,
  UserRoundX,
  Users,
  X,
  Eye,
} from 'lucide-react';
import { apiFetch, decodeJwtPayload, getApiError } from '@/lib/api';
import { downloadBlob } from '@/lib/fileDownload';
import { SortButton, SortState } from '@/components/SortButton';
import { isValidPhoneNumber, getCleanWhatsAppUrl } from '@/lib/phoneUtils';
import { VoterPhotoModal } from '@/components/VoterPhotoModal';

interface Migrant {
  _id: string;
  epic: string;
  nameHi: string;
  nameEn: string;
  relativeNameHi: string;
  relationType?: string;
  age: number;
  gender: string;
  wardNo: string;
  partNo: string;
  houseNo: string;
  serialNo: number;
  phone: string;
  migrantLocation: string;
  householdCount: number;
  voted?: boolean;
  familyId?: string;
  caste?: string;
  photoUrl?: string;
}

interface MigrantMetrics {
  total: number;
  voted: number;
  pending: number;
  families: number;
  turnout: number;
}

export default function MigrantsPage() {
  const [voters, setVoters] = useState<Migrant[]>([]);
  const [photoModalVoter, setPhotoModalVoter] = useState<Migrant | null>(null);
  const [metrics, setMetrics] = useState<MigrantMetrics | null>(null);
  const [votedFilter, setVotedFilter] = useState<'all' | 'voted' | 'pending'>('all');
  const [search, setSearch] = useState('');
  const [ward, setWard] = useState('');
  const [locations, setLocations] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [savingId, setSavingId] = useState('');
  const [togglingVoteId, setTogglingVoteId] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 50;
  const [sort, setSort] = useState<SortState>({ field: 'name', direction: 'asc' });
  const [isAdmin, setIsAdmin] = useState(false);
  const [clientName, setClientName] = useState('विजयसेतु (VijaySetu)');

  useEffect(() => {
    const token = typeof window !== 'undefined' ? window.localStorage.getItem('token') : null;
    if (token) {
      try {
        const payload = decodeJwtPayload<{ user?: { role?: string; organizationName?: string; fullName?: string } }>(token);
        setIsAdmin(payload?.user?.role === 'admin');
        if (payload?.user?.organizationName) {
          setClientName(payload.user.organizationName);
        } else if (payload?.user?.fullName) {
          setClientName(payload.user.fullName);
        }
      } catch {}
    }
  }, []);

  const handleSort = (field: string) => {
    setSort((prev) => ({
      field,
      direction: prev.field === field && prev.direction === 'asc' ? 'desc' : 'asc',
    }));
  };

  const sortedVoters = useMemo(() => {
    const list = [...voters];
    list.sort((a, b) => {
      let cmp = 0;
      if (sort.field === 'serialNo') {
        cmp = (Number(a.serialNo) || 0) - (Number(b.serialNo) || 0);
      } else if (sort.field === 'name') {
        const nameA = String(a.nameHi || a.nameEn || '').trim();
        const nameB = String(b.nameHi || b.nameEn || '').trim();
        cmp = nameA.localeCompare(nameB, 'hi-IN');
      } else if (sort.field === 'location') {
        const locA = String(locations[a._id] || a.migrantLocation || '').trim();
        const locB = String(locations[b._id] || b.migrantLocation || '').trim();
        cmp = locA.localeCompare(locB, 'hi-IN');
      }
      return sort.direction === 'asc' ? cmp : -cmp;
    });
    return list;
  }, [voters, sort, locations]);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, ward, votedFilter]);

  const totalMigrantPages = Math.ceil(sortedVoters.length / pageSize) || 1;
  const paginatedVoters = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedVoters.slice(start, start + pageSize);
  }, [sortedVoters, currentPage, pageSize]);

  const load = useCallback(
    async (q = search, selectedWard = ward, targetVotedStatus = votedFilter) => {
      setLoading(true);
      setError('');
      try {
        const params = new URLSearchParams();
        if (q.trim()) params.set('search', q.trim());
        if (selectedWard.trim()) params.set('ward', selectedWard.trim());
        if (targetVotedStatus && targetVotedStatus !== 'all') {
          params.set('votedStatus', targetVotedStatus);
        }
        const response = await apiFetch(`/features/migrants?${params}`, { cache: 'no-store' });
        if (!response.ok) throw new Error(await getApiError(response, 'प्रवासी मतदाता सूची लोड नहीं हुई।'));
        const json = await response.json();
        const result: Migrant[] = Array.isArray(json)
          ? json
          : Array.isArray(json.data)
          ? json.data
          : [];
        setVoters(result);
        setLocations(Object.fromEntries(result.map((voter) => [voter._id, voter.migrantLocation || ''])));

        if (json.metrics) {
          setMetrics(json.metrics);
        } else {
          // Fallback computation
          const total = result.length;
          const voted = result.filter((v) => v.voted).length;
          const famSet = new Set(
            result.map((v) =>
              v.familyId && v.familyId.trim() !== ''
                ? v.familyId
                : `${v.wardNo || ''}-${v.partNo || ''}-${v.houseNo || ''}`
            )
          );
          setMetrics({
            total,
            voted,
            pending: total - voted,
            families: famSet.size,
            turnout: total > 0 ? Number(((voted / total) * 100).toFixed(1)) : 0,
          });
        }
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : 'प्रवासी मतदाता सूची लोड नहीं हुई।');
        setVoters([]);
      } finally {
        setLoading(false);
      }
    },
    [search, ward, votedFilter]
  );

  useEffect(() => {
    void Promise.resolve().then(() => load());
  }, [load]);

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void load(search, ward, votedFilter);
  };

  const handleFilterChange = (newStatus: 'all' | 'voted' | 'pending') => {
    setVotedFilter(newStatus);
    void load(search, ward, newStatus);
  };

  const updateVoter = async (voter: Migrant, remove = false) => {
    if (remove) {
      const displayName = voter.nameHi || voter.nameEn || 'इस मतदाता';
      const confirmed = window.confirm(
        `क्या आप वाकई "${displayName}" को प्रवासी मतदाता सूची से हटाना चाहते हैं?`
      );
      if (!confirmed) return;
    }
    setSavingId(voter._id);
    setError('');
    setNotice('');
    try {
      const loc = (locations[voter._id] || '').trim();
      const response = await apiFetch(`/voters/${encodeURIComponent(voter._id)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          remove
            ? { isMigrant: false, migrantLocation: '' }
            : { isMigrant: true, migrantLocation: loc }
        ),
      });
      if (!response.ok) throw new Error(await getApiError(response, 'प्रवासी रिकॉर्ड अपडेट नहीं हुआ।'));
      if (remove) {
        setVoters((current) => current.filter((item) => item._id !== voter._id));
        setNotice('प्रवासी चिह्न सफलतापूर्वक हटाया गया।');
      } else {
        setVoters((current) =>
          current.map((item) =>
            item._id === voter._id ? { ...item, migrantLocation: loc } : item
          )
        );
        setNotice('स्थान विवरण सफलतापूर्वक सेव हुआ।');
      }
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'प्रवासी रिकॉर्ड अपडेट नहीं हुआ।');
    } finally {
      setSavingId('');
    }
  };

  const toggleVote = async (voter: Migrant) => {
    setTogglingVoteId(voter._id);
    const newVoted = !voter.voted;
    setError('');
    setNotice('');
    try {
      // Optimistic state update
      setVoters((prev) =>
        prev.map((v) => (v._id === voter._id ? { ...v, voted: newVoted } : v))
      );
      setMetrics((prev) => {
        if (!prev) return null;
        const delta = newVoted ? 1 : -1;
        const newVotedCount = Math.max(0, prev.voted + delta);
        const newPendingCount = Math.max(0, prev.total - newVotedCount);
        return {
          ...prev,
          voted: newVotedCount,
          pending: newPendingCount,
          turnout: prev.total > 0 ? Number(((newVotedCount / prev.total) * 100).toFixed(1)) : 0,
        };
      });

      const response = await apiFetch(`/voters/${encodeURIComponent(voter._id)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ voted: newVoted }),
      });
      if (!response.ok) throw new Error(await getApiError(response, 'मतदान स्थिति अपडेट नहीं हुई।'));
      setNotice(newVoted ? 'मतदान दर्ज किया गया (दे दिया)।' : 'मतदान स्थिति शेष (बाकी) की गई।');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'मतदान स्थिति अपडेट नहीं हुई।');
      // Rollback
      setVoters((prev) =>
        prev.map((v) => (v._id === voter._id ? { ...v, voted: voter.voted } : v))
      );
    } finally {
      setTogglingVoteId('');
    }
  };

  const exportExcel = async () => {
    setExporting(true);
    setError('');
    try {
      const params = new URLSearchParams({ export: 'excel' });
      if (search.trim()) params.set('search', search.trim());
      if (ward.trim()) params.set('ward', ward.trim());
      if (votedFilter !== 'all') params.set('votedStatus', votedFilter);

      const response = await apiFetch(`/features/migrants?${params}`);
      if (!response.ok) throw new Error(await getApiError(response, 'Excel एक्सपोर्ट नहीं हो सका।'));
      const blob = await response.blob();
      const filename = `Migrant_Voters_${votedFilter}_${Date.now()}.xlsx`;
      await downloadBlob(blob, filename);
    } catch (exportError) {
      setError(exportError instanceof Error ? exportError.message : 'Excel एक्सपोर्ट नहीं हो सका।');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="work-page" style={{ maxWidth: '1420px', margin: '0 auto', paddingBottom: '60px' }}>
      {/* ── PRINT-ONLY STYLED HEADER ── */}
      <div className="print-only" style={{ display: 'none', marginBottom: '20px' }}>
        <div style={{ textAlign: 'center', borderBottom: '2px solid #0f172a', paddingBottom: '10px' }}>
          <h1 style={{ margin: 0, fontSize: '22px', fontWeight: 800 }}>{clientName}</h1>
          <h2 style={{ margin: '4px 0', fontSize: '16px', fontWeight: 700, color: '#334155' }}>
            प्रवासी मतदाता सूची व मतदान रिपोर्ट · (शहर/गांव से बाहर)
          </h2>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '20px', fontSize: '13px', color: '#475569', marginTop: '6px' }}>
            <span><strong>स्थिति:</strong> {votedFilter === 'voted' ? 'मतदान दर्ज (दे दिया)' : votedFilter === 'pending' ? 'मतदान बाकी (नहीं दिया)' : 'समस्त प्रवासी'}</span>
            <span><strong>कुल प्रवासी:</strong> {voters.length.toLocaleString('hi-IN')}</span>
            <span><strong>प्रिंट दिनांक:</strong> {new Date().toLocaleDateString('hi-IN')}</span>
          </div>
        </div>
      </div>

      {/* ── PAGE HEADER ── */}
      <div className="page-intro" style={{ marginBottom: '20px' }}>
        <div>
          <div className="eyebrow-label" style={{ color: '#5b21b6' }}>
            <span className="eyebrow-mark" style={{ background: '#5b21b6' }} />
            MIGRANT VOTERS · प्रवासी मतदाता ट्रैकर
          </div>
          <h1 style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <span>प्रवासी मतदाता</span>
            <span className="badge-migrant-dark">
              प्रवासी ट्रैकर
            </span>
          </h1>
          <p>
            शहर से बाहर रहने वाले मतदाताओं की सूची, वर्तमान स्थान, मतदान स्थिति (दे दिया / बाकी) और कॉलिंग समन्वय।
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

          <button
            className="button-secondary"
            type="button"
            onClick={() => void load()}
            disabled={loading}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          >
            {loading ? <LoaderCircle size={15} className="spin" /> : <RefreshCw size={15} />} रिफ्रेश
          </button>

          <button
            className="button-secondary"
            type="button"
            onClick={() => void exportExcel()}
            disabled={!voters.length || exporting}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          >
            {exporting ? <LoaderCircle size={15} className="spin" /> : <Download size={15} />} Excel एक्सपोर्ट
          </button>
        </div>
      </div>

      {error && (
        <div className="inline-notice error-notice" role="alert" style={{ marginBottom: '16px' }}>
          {error}
        </div>
      )}
      {notice && (
        <div className="inline-notice" role="status" style={{ marginBottom: '16px' }}>
          {notice}
        </div>
      )}

      {/* ── TOP KPI COUNTING CARDS ── */}
      {metrics && (
        <section
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '12px',
            marginBottom: '20px',
          }}
        >
          {/* Total Migrants */}
          <div
            style={{
              background: '#ffffff',
              border: '1.5px solid #e9d5ff',
              borderRadius: '14px',
              padding: '14px 18px',
              boxShadow: '0 2px 10px rgba(91, 33, 182, 0.05)',
            }}
          >
            <div style={{ fontSize: '12px', fontWeight: 700, color: '#5b21b6', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#5b21b6' }} />
              कुल प्रवासी मतदाता
            </div>
            <div style={{ fontSize: '24px', fontWeight: 850, color: '#2e1065', marginTop: '4px' }}>
              {metrics.total.toLocaleString('hi-IN')}{' '}
              <span style={{ fontSize: '12px', fontWeight: 600, color: '#6b21a8' }}>मतदाता</span>
            </div>
            <div style={{ fontSize: '11.5px', color: '#7e22ce', marginTop: '2px' }}>
              शहर/कस्बे से बाहर चिह्नित
            </div>
          </div>

          {/* Voted (दे दिया) */}
          <div
            style={{
              background: '#ffffff',
              border: '1.5px solid #bbf7d0',
              borderRadius: '14px',
              padding: '14px 18px',
              boxShadow: '0 2px 10px rgba(22, 101, 52, 0.05)',
            }}
          >
            <div style={{ fontSize: '12px', fontWeight: 700, color: '#15803d', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <CheckCircle2 size={14} />
              मतदान दर्ज (वोट दे दिया)
            </div>
            <div style={{ fontSize: '24px', fontWeight: 850, color: '#14532d', marginTop: '4px' }}>
              {metrics.voted.toLocaleString('hi-IN')}{' '}
              <span style={{ fontSize: '13px', fontWeight: 700, color: '#16a34a' }}>
                ({metrics.turnout}%)
              </span>
            </div>
            <div style={{ fontSize: '11.5px', color: '#16a34a', marginTop: '2px' }}>
              सफलतापूर्वक मतदान संपन्न
            </div>
          </div>

          {/* Pending (नहीं दिया) */}
          <div
            style={{
              background: '#ffffff',
              border: '1.5px solid #fed7aa',
              borderRadius: '14px',
              padding: '14px 18px',
              boxShadow: '0 2px 10px rgba(194, 65, 12, 0.05)',
            }}
          >
            <div style={{ fontSize: '12px', fontWeight: 700, color: '#c2410c', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Clock size={14} />
              मतदान बाकी (नहीं दिया)
            </div>
            <div style={{ fontSize: '24px', fontWeight: 850, color: '#7c2d12', marginTop: '4px' }}>
              {metrics.pending.toLocaleString('hi-IN')}{' '}
              <span style={{ fontSize: '12px', fontWeight: 600, color: '#9a3412' }}>शेष</span>
            </div>
            <div style={{ fontSize: '11.5px', color: '#ea580c', marginTop: '2px' }}>
              कॉलिंग व यात्रा समन्वय आवश्यक
            </div>
          </div>

          {/* Total Migrant Families */}
          <div
            style={{
              background: '#ffffff',
              border: '1.5px solid #bae6fd',
              borderRadius: '14px',
              padding: '14px 18px',
              boxShadow: '0 2px 10px rgba(2, 132, 199, 0.05)',
            }}
          >
            <div style={{ fontSize: '12px', fontWeight: 700, color: '#0284c7', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Home size={14} />
              कुल प्रवासी परिवार
            </div>
            <div style={{ fontSize: '24px', fontWeight: 850, color: '#0c4a6e', marginTop: '4px' }}>
              {metrics.families.toLocaleString('hi-IN')}{' '}
              <span style={{ fontSize: '12px', fontWeight: 600, color: '#0369a1' }}>परिवार</span>
            </div>
            <div style={{ fontSize: '11.5px', color: '#0284c7', marginTop: '2px' }}>
              विशिष्ट मकान व पारिवारिक समूह
            </div>
          </div>
        </section>
      )}

      {/* ── RECORDS PANEL ── */}
      <section className="records-panel" style={{ background: '#ffffff', borderRadius: '16px', padding: '20px' }}>
        <div
          className="records-toolbar"
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '16px',
            flexWrap: 'wrap',
            gap: '12px',
          }}
        >
          <div>
            <h2 style={{ margin: 0, fontSize: '17px', fontWeight: 800, color: '#0f172a' }}>
              प्रवासी मतदाता सूची
            </h2>
            <p style={{ margin: '2px 0 0', fontSize: '12.5px', color: '#64748b' }}>
              {voters.length.toLocaleString('hi-IN')} रिकॉर्ड लोड हुए · वर्तमान स्थान अपडेट करें और मतदान स्थिति ट्रैक करें
            </p>
          </div>

          {/* ── VOTING STATUS FILTER TABS ── */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '12px', fontWeight: 600, color: '#64748b', marginRight: '4px' }}>
              मतदान स्थिति:
            </span>

            {/* All */}
            <button
              type="button"
              onClick={() => handleFilterChange('all')}
              style={{
                fontSize: '12px',
                fontWeight: votedFilter === 'all' ? 700 : 500,
                padding: '6px 13px',
                borderRadius: '8px',
                border: '1.5px solid',
                cursor: 'pointer',
                background: votedFilter === 'all' ? '#0f172a' : '#ffffff',
                color: votedFilter === 'all' ? '#ffffff' : '#334155',
                borderColor: votedFilter === 'all' ? '#0f172a' : '#cbd5e1',
                transition: 'all 0.12s ease',
              }}
            >
              सभी प्रवासी ({metrics?.total || voters.length})
            </button>

            {/* Voted (दे दिया) */}
            <button
              type="button"
              onClick={() => handleFilterChange('voted')}
              style={{
                fontSize: '12px',
                fontWeight: votedFilter === 'voted' ? 700 : 500,
                padding: '6px 13px',
                borderRadius: '8px',
                border: '1.5px solid',
                cursor: 'pointer',
                background: votedFilter === 'voted' ? '#166534' : '#f0fdf4',
                color: votedFilter === 'voted' ? '#ffffff' : '#166534',
                borderColor: votedFilter === 'voted' ? '#166534' : '#bbf7d0',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                transition: 'all 0.12s ease',
              }}
            >
              <CheckCircle2 size={13} />
              <span>मतदान दर्ज ({metrics?.voted || 0})</span>
            </button>

            {/* Pending (नहीं दिया) */}
            <button
              type="button"
              onClick={() => handleFilterChange('pending')}
              style={{
                fontSize: '12px',
                fontWeight: votedFilter === 'pending' ? 700 : 500,
                padding: '6px 13px',
                borderRadius: '8px',
                border: '1.5px solid',
                cursor: 'pointer',
                background: votedFilter === 'pending' ? '#c2410c' : '#fff7ed',
                color: votedFilter === 'pending' ? '#ffffff' : '#c2410c',
                borderColor: votedFilter === 'pending' ? '#c2410c' : '#fed7aa',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                transition: 'all 0.12s ease',
              }}
            >
              <Clock size={13} />
              <span>मतदान बाकी ({metrics?.pending || 0})</span>
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <form className="feature-filter-form" onSubmit={submit} style={{ marginBottom: '16px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <label className="search-field" style={{ flex: '2 1 240px', position: 'relative' }}>
            <Search size={15} />
            <input
              aria-label="प्रवासी मतदाता खोजें"
              placeholder="नाम, EPIC, फोन, या वर्तमान शहर..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              style={{ paddingRight: search ? '28px' : undefined }}
            />
            {search && (
              <button
                type="button"
                onClick={() => {
                  setSearch('');
                  void load('', ward, votedFilter);
                }}
                style={{
                  position: 'absolute',
                  right: '8px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  padding: '2px',
                  cursor: 'pointer',
                  color: '#94a3b8',
                  display: 'flex',
                }}
                title="सर्च हटाएं"
                aria-label="सर्च हटाएं"
              >
                <X size={14} />
              </button>
            )}
          </label>
          <label className="search-field" style={{ flex: '1 1 120px', position: 'relative' }}>
            <MapPin size={15} />
            <input
              aria-label="वार्ड"
              placeholder="वार्ड नं."
              value={ward}
              onChange={(event) => setWard(event.target.value)}
              style={{ paddingRight: ward ? '28px' : undefined }}
            />
            {ward && (
              <button
                type="button"
                onClick={() => {
                  setWard('');
                  void load(search, '', votedFilter);
                }}
                style={{
                  position: 'absolute',
                  right: '8px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  padding: '2px',
                  cursor: 'pointer',
                  color: '#94a3b8',
                  display: 'flex',
                }}
                title="वार्ड फ़िल्टर हटाएं"
                aria-label="वार्ड फ़िल्टर हटाएं"
              >
                <X size={14} />
              </button>
            )}
          </label>
          <button className="button-primary" type="submit" disabled={loading}>
            <Search size={15} /> खोजें
          </button>
          {(search || ward) && (
            <button
              className="button-secondary"
              type="button"
              onClick={() => {
                setSearch('');
                setWard('');
                void load('', '', votedFilter);
              }}
              title="खोज और वार्ड रीसेट करें"
            >
              रीसेट
            </button>
          )}
        </form>

        {loading && !voters.length ? (
          <div className="empty-state" style={{ padding: '60px 20px', textAlign: 'center' }}>
            <LoaderCircle size={24} className="spin" style={{ margin: '0 auto 8px', color: '#5b21b6' }} />
            <p>प्रवासी रिकॉर्ड लोड हो रहे हैं…</p>
          </div>
        ) : voters.length ? (
          <div className="table-scroll" style={{ overflowX: 'auto' }}>
            <table className="voter-table desk-table" style={{ width: '100%' }}>
              <thead>
                <tr style={{ background: '#f8fafc' }}>
                  <th style={{ width: '45px', textAlign: 'center' }}>क्र.</th>
                  <th>
                    <SortButton label="नाम व संबंधी" field="name" type="alpha" currentSort={sort} onSort={handleSort} />
                  </th>
                  <th>
                    <SortButton label="स्थान / विवरण" field="serialNo" type="numeric" currentSort={sort} onSort={handleSort} />
                  </th>
                  <th>पहचान पत्र (EPIC)</th>
                  <th>
                    <SortButton label="वर्तमान शहर / स्थान" field="location" type="alpha" currentSort={sort} onSort={handleSort} />
                  </th>
                  <th>संपर्क</th>
                  <th style={{ textAlign: 'center' }}>मतदान स्थिति</th>
                  <th>कार्य</th>
                </tr>
              </thead>
              <tbody>
                {paginatedVoters.map((voter, idx) => (
                  <tr key={voter._id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    {/* Index */}
                    <td style={{ textAlign: 'center', fontSize: '12px', color: '#64748b' }}>
                      {(currentPage - 1) * pageSize + idx + 1}
                    </td>

                    {/* Name & Relation */}
                    <td>
                      <div className="voter-name" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontWeight: 700, color: '#0f172a', fontSize: '13.5px' }}>
                          {voter.nameHi || voter.nameEn || '—'}
                        </span>
                        <button
                          type="button"
                          onClick={() => setPhotoModalVoter(voter)}
                          title={voter.photoUrl ? "मतदाता फोटो देखें" : "फोटो उपलब्ध नहीं"}
                          style={{
                            background: voter.photoUrl ? '#eff6ff' : '#f8fafc',
                            border: voter.photoUrl ? '1px solid #bfdbfe' : '1px solid #e2e8f0',
                            color: voter.photoUrl ? '#2563eb' : '#94a3b8',
                            borderRadius: '4px',
                            padding: '1px 5px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            cursor: 'pointer',
                            fontSize: '10px',
                            lineHeight: 1,
                          }}
                        >
                          <Eye size={11} />
                        </button>
                        <span className="badge-migrant-dark" style={{ fontSize: '10px', padding: '1px 6px' }}>
                          प्रवासी
                        </span>
                      </div>
                      <div className="voter-subline" style={{ fontSize: '11.5px', color: '#64748b', marginTop: '2px' }}>
                        {voter.relationType ? `${voter.relationType}: ` : 'पिता/पति: '}
                        {voter.relativeNameHi || '—'}
                        {voter.gender && ` · ${voter.gender}`}
                        {voter.age && ` (${voter.age} वर्ष)`}
                      </div>
                    </td>

                    {/* Location / Family / Booth */}
                    <td>
                      <div style={{ fontSize: '12.5px', fontWeight: 600, color: '#334155' }}>
                        वार्ड {voter.wardNo || '—'} · भाग {voter.partNo || '—'}
                      </div>
                      <div className="voter-subline" style={{ fontSize: '11.5px', color: '#64748b', marginTop: '2px' }}>
                        मकान #{voter.houseNo || '—'} · क्रम #{voter.serialNo || '—'}
                        {voter.householdCount ? ` · परिवार में ${voter.householdCount} सदस्य` : ''}
                      </div>
                    </td>

                    {/* EPIC */}
                    <td style={{ fontSize: '12.5px', fontWeight: 650, color: '#2563eb' }}>
                      {voter.epic || '—'}
                    </td>

                    {/* Migrant Location Input */}
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <MapPin size={13} style={{ color: '#5b21b6', flexShrink: 0 }} />
                        <input
                          className="feature-inline-input"
                          aria-label={`${voter.nameHi || voter.nameEn} का वर्तमान स्थान`}
                          placeholder="उदा. मुंबई, सूरत, दिल्ली..."
                          value={locations[voter._id] ?? ''}
                          onChange={(event) =>
                            setLocations((current) => ({ ...current, [voter._id]: event.target.value }))
                          }
                          onKeyDown={(event) => {
                            if (event.key === 'Enter') {
                              event.preventDefault();
                              void updateVoter(voter);
                            }
                          }}
                          style={{
                            fontSize: '12.5px',
                            padding: '4px 8px',
                            border: '1px solid #cbd5e1',
                            borderRadius: '6px',
                            width: '100%',
                            minWidth: '130px',
                          }}
                        />
                      </div>
                    </td>

                    {/* Contact */}
                    <td>
                      {voter.phone ? (
                        <div className="feature-actions" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <a
                            className="button-quiet"
                            href={`tel:${voter.phone.replace(/[^\d+]/g, '')}`}
                            aria-label={`${voter.nameHi || voter.nameEn} को कॉल करें`}
                            style={{
                              fontSize: '11px',
                              padding: '3px 8px',
                              borderRadius: '6px',
                              background: '#f0fdf4',
                              color: '#166534',
                              border: '1px solid #bbf7d0',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '3px',
                            }}
                          >
                            <Phone size={11} /> कॉल
                          </a>
                          {isValidPhoneNumber(voter.phone) ? (
                            <a
                              className="button-quiet"
                              href={getCleanWhatsAppUrl(
                                voter.phone,
                                `नमस्ते ${voter.nameHi || voter.nameEn || ''}, ${clientName || 'विजयसेतु (VijaySetu)'} से संपर्क।`
                              )}
                              target="_blank"
                              rel="noreferrer"
                              style={{
                                fontSize: '11px',
                                padding: '3px 8px',
                                borderRadius: '6px',
                                background: '#25d36615',
                                color: '#128c7e',
                                border: '1px solid #25d36640',
                                fontWeight: 600,
                              }}
                            >
                              WhatsApp
                            </a>
                          ) : (
                            <span
                              title="अमान्य या अधूरा मोबाइल नंबर"
                              style={{ fontSize: '10.5px', color: '#94a3b8', fontStyle: 'italic' }}
                            >
                              अमान्य
                            </span>
                          )}
                        </div>
                      ) : (
                        <span style={{ fontSize: '11.5px', color: '#94a3b8' }}>फोन दर्ज नहीं</span>
                      )}
                    </td>

                    {/* ── VOTING STATUS COLUMN (मतदान स्थिति) ── */}
                    <td style={{ textAlign: 'center' }}>
                      <button
                        type="button"
                        onClick={() => void toggleVote(voter)}
                        disabled={togglingVoteId === voter._id}
                        title={voter.voted ? 'क्लिक करके शेष मार्क करें' : 'क्लिक करके मतदान दर्ज करें'}
                        style={{
                          background: voter.voted ? '#dcfce7' : '#ffedd5',
                          color: voter.voted ? '#166534' : '#9a3412',
                          border: `1px solid ${voter.voted ? '#bbf7d0' : '#fed7aa'}`,
                          borderRadius: '20px',
                          padding: '4px 10px',
                          fontSize: '11.5px',
                          fontWeight: 750,
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '5px',
                          whiteSpace: 'nowrap',
                          boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
                          transition: 'all 0.12s ease',
                        }}
                      >
                        {togglingVoteId === voter._id ? (
                          <LoaderCircle size={12} className="spin" />
                        ) : voter.voted ? (
                          <CheckCircle2 size={13} />
                        ) : (
                          <Clock size={13} />
                        )}
                        <span>{voter.voted ? '✓ मतदान दर्ज' : 'मतदान बाकी'}</span>
                      </button>
                    </td>

                    {/* Actions */}
                    <td>
                      <div className="feature-actions" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <button
                          className="button-secondary"
                          type="button"
                          onClick={() => void updateVoter(voter)}
                          disabled={savingId === voter._id}
                          style={{
                            fontSize: '11.5px',
                            padding: '4px 8px',
                            borderRadius: '6px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                          }}
                        >
                          {savingId === voter._id ? <LoaderCircle size={12} className="spin" /> : <MapPin size={12} />}
                          सेव
                        </button>
                        <button
                          className="button-quiet"
                          type="button"
                          onClick={() => void updateVoter(voter, true)}
                          disabled={savingId === voter._id}
                          style={{
                            fontSize: '11px',
                            color: '#991b1b',
                            padding: '4px 6px',
                            borderRadius: '6px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '2px',
                          }}
                          title="प्रवासी चिह्न हटाएं"
                        >
                          <UserRoundX size={12} /> हटाएं
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Migrants Pagination Bar */}
            {totalMigrantPages > 1 && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 16px',
                  borderTop: '1px solid #e2e8f0',
                  background: '#ffffff',
                  flexWrap: 'wrap',
                  gap: '10px',
                }}
              >
                <div style={{ fontSize: '13px', color: '#64748b' }}>
                  दिखाए जा रहे हैं: <strong>{((currentPage - 1) * pageSize + 1).toLocaleString('hi-IN')}</strong> -{' '}
                  <strong>{Math.min(currentPage * pageSize, sortedVoters.length).toLocaleString('hi-IN')}</strong> (कुल{' '}
                  {sortedVoters.length.toLocaleString('hi-IN')} प्रवासी)
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
                      cursor: currentPage <= 1 ? 'not-allowed' : 'pointer',
                    }}
                  >
                    <ChevronLeft size={15} /> पिछला
                  </button>
                  <span style={{ fontSize: '13px', fontWeight: 600, color: '#334155' }}>
                    पेज {currentPage} / {totalMigrantPages}
                  </span>
                  <button
                    type="button"
                    disabled={currentPage >= totalMigrantPages}
                    onClick={() => setCurrentPage((p) => Math.min(totalMigrantPages, p + 1))}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: '5px 12px',
                      borderRadius: '6px',
                      border: '1px solid #cbd5e1',
                      background: currentPage >= totalMigrantPages ? '#e2e8f0' : '#ffffff',
                      color: currentPage >= totalMigrantPages ? '#94a3b8' : '#0f172a',
                      fontSize: '12.5px',
                      fontWeight: 600,
                      cursor: currentPage >= totalMigrantPages ? 'not-allowed' : 'pointer',
                    }}
                  >
                    अगला <ChevronRight size={15} />
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="empty-state" style={{ padding: '60px 20px', textAlign: 'center' }}>
            <div
              style={{
                width: '50px',
                height: '50px',
                borderRadius: '14px',
                background: '#f3e8ff',
                color: '#5b21b6',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 14px',
              }}
            >
              <Users size={24} />
            </div>
            <strong style={{ fontSize: '15px', color: '#1e1b4b' }}>
              {loading ? 'लोड हो रहा है…' : 'कोई प्रवासी रिकॉर्ड नहीं मिला'}
            </strong>
            <p style={{ fontSize: '13px', color: '#64748b', maxWidth: '420px', margin: '6px auto 0' }}>
              मतदाता सूची में किसी रिकॉर्ड को प्रवासी चिह्नित करने पर वह यहाँ दिखेगा, या चुने गए फ़िल्टर को बदलकर देखें।
            </p>
            {(search || ward || votedFilter !== 'all') && (
              <div style={{ marginTop: '16px' }}>
                <button
                  type="button"
                  className="button-secondary"
                  onClick={() => {
                    setSearch('');
                    setWard('');
                    setVotedFilter('all');
                    void load('', '', 'all');
                  }}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontSize: '12.5px',
                    padding: '6px 14px',
                    borderRadius: '8px',
                    cursor: 'pointer',
                  }}
                >
                  <RefreshCw size={14} /> सभी फ़िल्टर रीसेट करें (सारे प्रवासी दिखाएं)
                </button>
              </div>
            )}
          </div>
        )}
      </section>

      {/* Full Resolution Voter Photo Lightbox Modal */}
      <VoterPhotoModal
        isOpen={Boolean(photoModalVoter)}
        onClose={() => setPhotoModalVoter(null)}
        voter={photoModalVoter}
      />
    </div>
  );
}
