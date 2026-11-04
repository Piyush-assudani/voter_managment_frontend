'use client';

import React, { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Circle,
  Columns2,
  Grid,
  Languages,
  LoaderCircle,
  MapPin,
  Printer,
  RefreshCw,
  Search,
  Table,
  Vote,
  X,
  Eye,
} from 'lucide-react';
import { apiFetch, getApiError, decodeJwtPayload } from '@/lib/api';
import { SortButton, SortState } from '@/components/SortButton';
import { VoterPhotoModal } from '@/components/VoterPhotoModal';
import { toast } from '@/components/Toast';
import {
  DisplayLanguage,
  getGenderLabel,
  getVoterDisplayName,
  getVoterRelativeDisplay,
  matchVoterSearch,
} from '@/lib/transliterate';

export type ViewMode = 'both' | 'grid' | 'table';

interface Voter {
  _id: string;
  serialNo: number;
  voted: boolean;
  nameHi: string;
  nameEn: string;
  relativeNameHi: string;
  relativeNameEn?: string;
  epic?: string;
  houseNo: string;
  age: number;
  gender: string;
  phone: string;
  wardNo: string;
  partNo: string;
  photoUrl?: string;
}

interface WardInfo {
  id: string;
  count: number;
}

const VoterGridButton = React.memo(({
  voter,
  toggleVote,
  isSaving,
  showWardBadge,
  language = 'hi',
}: {
  voter: Voter;
  toggleVote: (voter: Voter) => void;
  isSaving: boolean;
  showWardBadge?: boolean;
  language?: DisplayLanguage;
}) => (
  <button
    type="button"
    className={voter.voted ? 'is-voted' : ''}
    title={`${getVoterDisplayName(voter, language).primary} · क्रम ${voter.serialNo}${voter.wardNo ? ` · वार्ड ${voter.wardNo}` : ''} · ${voter.voted ? 'मतदान दर्ज' : 'शेष'}`}
    aria-label={`क्रम ${voter.serialNo}, ${voter.voted ? 'मतदान दर्ज' : 'शेष'}`}
    onClick={() => toggleVote(voter)}
    disabled={isSaving}
  >
    <span>{voter.serialNo}</span>
    {showWardBadge && voter.wardNo && (
      <small className="grid-btn-ward">W{voter.wardNo}</small>
    )}
  </button>
));
VoterGridButton.displayName = 'VoterGridButton';

const VoterTableRow = React.memo(({
  voter,
  toggleVote,
  isSaving,
  language,
  showWardBadge,
  onOpenPhoto,
}: {
  voter: Voter;
  toggleVote: (voter: Voter) => void;
  isSaving: boolean;
  language: DisplayLanguage;
  showWardBadge?: boolean;
  onOpenPhoto?: (voter: Voter) => void;
}) => {
  const name = getVoterDisplayName(voter, language);
  const rel = getVoterRelativeDisplay(voter, language);
  const gender = getGenderLabel(voter.gender, language);

  return (
    <tr>
      <td className="voter-code">
        <div style={{ fontWeight: 700 }}>{voter.serialNo || '—'}</div>
        {showWardBadge && voter.wardNo && (
          <span className="desk-ward-tag" title={`वार्ड संख्या ${voter.wardNo}`}>
            W-{voter.wardNo}
          </span>
        )}
      </td>
      <td>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {voter.photoUrl ? (
            <div
              onClick={() => onOpenPhoto?.(voter)}
              style={{
                width: '32px',
                height: '40px',
                borderRadius: '4px',
                overflow: 'hidden',
                border: '1px solid #cbd5e1',
                flexShrink: 0,
                background: '#f8fafc',
                cursor: 'pointer',
              }}
              title="फोटो देखने के लिए क्लिक करें"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={voter.photoUrl}
                alt={voter.nameHi || ''}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                loading="lazy"
                onError={(e) => {
                  const parent = e.currentTarget.parentElement;
                  if (parent) parent.style.display = 'none';
                }}
              />
            </div>
          ) : null}
          <div>
            <div className="voter-name" style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
              <span style={{ fontWeight: 700, color: '#0f172a' }}>{name.primary}</span>
              {name.secondary && (
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    color: '#1d4ed8',
                    background: '#eff6ff',
                    border: '1px solid #bfdbfe',
                    borderRadius: '4px',
                    padding: '1px 5px',
                    letterSpacing: '0.01em',
                  }}
                >
                  {name.secondary}
                </span>
              )}
              {onOpenPhoto && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpenPhoto(voter);
                  }}
                  title={voter.photoUrl ? "मतदाता फोटो देखें" : "फोटो उपलब्ध नहीं"}
                  style={{
                    background: voter.photoUrl ? '#eff6ff' : '#f8fafc',
                    border: voter.photoUrl ? '1px solid #bfdbfe' : '1px solid #e2e8f0',
                    color: voter.photoUrl ? '#2563eb' : '#94a3b8',
                    borderRadius: '4px',
                    padding: '2px 4px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    cursor: 'pointer',
                    fontSize: '10px',
                    lineHeight: 1,
                  }}
                >
                  <Eye size={11} />
                </button>
              )}
            </div>
            <div className="voter-subline" style={{ display: 'flex', alignItems: 'center', gap: '4px', flexWrap: 'wrap' }}>
              <span>{rel.primary}</span>
              {rel.secondary && (
                <span style={{ fontSize: '10.5px', color: '#475569', fontWeight: 600 }}>
                  ({rel.secondary})
                </span>
              )}
            </div>
          </div>
        </div>
      </td>
      <td className="voter-code">{voter.houseNo || '—'}</td>
      <td className="voter-code">{voter.age ? `${voter.age} · ` : ''}{gender}</td>
      <td>
        <span className={`record-status ${voter.voted ? 'status-voted' : 'status-pending'}`}>
          {voter.voted ? 'दर्ज' : 'शेष'}
        </span>
      </td>
      <td>
        <button
          className={`button-secondary vote-button ${voter.voted ? 'is-checked' : ''}`}
          type="button"
          onClick={() => toggleVote(voter)}
          disabled={isSaving}
        >
          {isSaving ? <LoaderCircle size={14} className="spin" /> : voter.voted ? <Check size={14} /> : <Circle size={14} />}
          {voter.voted ? 'वापस करें' : 'मतदान दर्ज करें'}
        </button>
      </td>
    </tr>
  );
});
VoterTableRow.displayName = 'VoterTableRow';

export default function PollDeskPage() {
  const [availableWards, setAvailableWards] = useState<WardInfo[]>([]);
  const [totalOrgVoters, setTotalOrgVoters] = useState<number>(0);
  const [selectedWards, setSelectedWards] = useState<string[]>(['all']);
  const [selectedPart, setSelectedPart] = useState('');
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'pending' | 'voted'>('all');
  const [voters, setVoters] = useState<Voter[]>([]);
  const [photoModalVoter, setPhotoModalVoter] = useState<Voter | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingIds, setSavingIds] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
  const [language, setLanguage] = useState<DisplayLanguage>('hi');
  const [viewMode, setViewMode] = useState<ViewMode>('both');

  const [hidePartNo] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const val = localStorage.getItem('sys_hide_part_no');
      if (val !== null) return val === 'true';
    }
    return true;
  });

  const loadWardsSummary = useCallback(async () => {
    try {
      const res = await apiFetch('/voters/wards-summary', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.wards) && data.wards.length > 0) {
          const list: WardInfo[] = data.wards
            .map((w: any) => ({
              id: String(w._id).trim(),
              count: typeof w.count === 'number' ? w.count : 0,
            }))
            .filter((w: WardInfo) => Boolean(w.id));
          setAvailableWards(list);
        }
        if (typeof data.total === 'number') {
          setTotalOrgVoters(data.total);
        }
      }
    } catch {
      // ignore
    }
  }, []);

  const loadVoters = useCallback(async (wardsList: string[]) => {
    if (!wardsList || wardsList.length === 0) return;
    setLoading(true);
    setError('');
    try {
      const wardQuery = wardsList.includes('all') ? 'all' : wardsList.join(',');
      const response = await apiFetch(`/voters/all?ward=${encodeURIComponent(wardQuery)}`, { cache: 'no-store' });
      if (!response.ok) throw new Error(await getApiError(response, 'वार्ड रिकॉर्ड लोड नहीं हो सके।'));
      const result: unknown = await response.json();
      if (!Array.isArray(result)) throw new Error('सर्वर से सूची का सही उत्तर नहीं मिला।');
      setVoters(result as Voter[]);
      setUpdatedAt(new Date());
    } catch (loadError) {
      setVoters([]);
      setError(loadError instanceof Error ? loadError.message : 'वार्ड रिकॉर्ड लोड नहीं हो सके।');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // If worker token has strictly assigned wards, respect them
    const token = typeof window !== 'undefined' ? window.localStorage.getItem('token') : null;
    if (token) {
      try {
        const payload = decodeJwtPayload<{ user?: { allowedWards?: string[] } }>(token);
        const allowedWards = payload?.user?.allowedWards;
        if (Array.isArray(allowedWards) && allowedWards.length > 0) {
          const cleanWards = allowedWards.map((w: string) => String(w).trim()).filter(Boolean);
          if (cleanWards.length > 0) {
            setSelectedWards(cleanWards);
            setAvailableWards(cleanWards.map((w) => ({ id: w, count: 0 })));
          }
        }
      } catch {}
    }

    void loadWardsSummary();
    void loadVoters(selectedWards.length > 0 ? selectedWards : ['all']);

    if (typeof window !== 'undefined') {
      const savedLang = localStorage.getItem('poll_desk_lang');
      if (savedLang === 'en' || savedLang === 'hinglish' || savedLang === 'hi') {
        setLanguage(savedLang);
      }
      const savedView = localStorage.getItem('poll_desk_view_mode');
      if (savedView === 'both' || savedView === 'grid' || savedView === 'table') {
        setViewMode(savedView);
      }
    }
  }, [loadWardsSummary]);

  const handleLanguageChange = (newLang: DisplayLanguage) => {
    setLanguage(newLang);
    if (typeof window !== 'undefined') {
      localStorage.setItem('poll_desk_lang', newLang);
    }
  };

  const handleViewModeChange = (mode: ViewMode) => {
    setViewMode(mode);
    if (typeof window !== 'undefined') {
      localStorage.setItem('poll_desk_view_mode', mode);
    }
  };

  const toggleWard = (wardNo: string) => {
    setSelectedWards((prev) => {
      if (wardNo === 'all') {
        if (prev.includes('all')) {
          return availableWards.length > 0 ? [availableWards[0].id] : ['all'];
        }
        return ['all'];
      }
      const withoutAll = prev.filter((w) => w !== 'all');
      if (withoutAll.includes(wardNo)) {
        const next = withoutAll.filter((w) => w !== wardNo);
        return next.length > 0 ? next : ['all'];
      } else {
        const next = [...withoutAll, wardNo];
        if (availableWards.length > 0 && next.length === availableWards.length) return ['all'];
        return next;
      }
    });
    setSelectedPart('');
  };

  const [debouncedSearch, setDebouncedSearch] = useState('');

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
    }, 250);
    return () => clearTimeout(handler);
  }, [search]);

  useEffect(() => {
    if (selectedWards.length > 0) {
      void loadVoters(selectedWards);
    }
  }, [selectedWards, loadVoters]);

  useEffect(() => {
    const handleClientChange = () => {
      setSelectedWards(['all']);
      setSelectedPart('');
      setSearch('');
      void loadWardsSummary();
      void loadVoters(['all']);
    };
    window.addEventListener('client-changed', handleClientChange);
    return () => window.removeEventListener('client-changed', handleClientChange);
  }, [loadWardsSummary, loadVoters]);

  const [sort, setSort] = useState<SortState>({ field: 'serialNo', direction: 'asc' });
  const handleSort = (field: string) => {
    setSort((prev) => ({
      field,
      direction: prev.field === field && prev.direction === 'asc' ? 'desc' : 'asc',
    }));
  };

  const isMultipleWards = selectedWards.includes('all') || selectedWards.length > 1;

  // Multilingual Search Filter
  const visibleVoters = useMemo(() => voters.filter((voter) => {
    const matchesPart = !selectedPart || voter.partNo === selectedPart;
    const matchesStatus = filter === 'all' || (filter === 'voted' ? voter.voted : !voter.voted);
    const matchesSearch = matchVoterSearch(voter, debouncedSearch);
    return matchesPart && matchesStatus && matchesSearch;
  }), [filter, debouncedSearch, selectedPart, voters]);

  const sortedVisibleVoters = useMemo(() => {
    const list = [...visibleVoters];
    list.sort((a, b) => {
      let cmp = 0;
      if (sort.field === 'serialNo') {
        cmp = (Number(a.serialNo) || 0) - (Number(b.serialNo) || 0);
      } else if (sort.field === 'name') {
        const nameA = getVoterDisplayName(a, language).primary;
        const nameB = getVoterDisplayName(b, language).primary;
        cmp = nameA.localeCompare(nameB, language === 'en' ? 'en' : 'hi-IN');
      } else if (sort.field === 'houseNo') {
        cmp = String(a.houseNo || '').localeCompare(String(b.houseNo || ''), undefined, { numeric: true });
      }
      return sort.direction === 'asc' ? cmp : -cmp;
    });
    return list;
  }, [visibleVoters, sort, language]);

  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 50;

  useEffect(() => {
    setCurrentPage(1);
  }, [filter, debouncedSearch, selectedPart, selectedWards]);

  const totalDeskPages = Math.ceil(sortedVisibleVoters.length / pageSize) || 1;
  const paginatedVisibleVoters = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedVisibleVoters.slice(start, start + pageSize);
  }, [sortedVisibleVoters, currentPage, pageSize]);

  const parts = useMemo(() => [...new Set(voters.map((voter) => voter.partNo).filter(Boolean))].sort((a, b) => a.localeCompare(b, undefined, { numeric: true })), [voters]);
  const partVoters = useMemo(() => voters.filter((voter) => !selectedPart || voter.partNo === selectedPart), [voters, selectedPart]);
  const pendingVoters = useMemo(() => partVoters.filter((voter) => !voter.voted).sort((a, b) => (Number(a.serialNo) || 0) - (Number(b.serialNo) || 0)), [partVoters]);
  const votedCount = partVoters.filter((voter) => voter.voted).length;
  const pendingCount = partVoters.length - votedCount;
  const turnout = partVoters.length ? Math.round((votedCount / partVoters.length) * 100) : 0;

  const toggleVote = useCallback(async (voter: Voter) => {
    if (savingIds.includes(voter._id)) return; // Prevent double-triggering on same voter
    setSavingIds((prev) => [...prev, voter._id]);
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
      setSavingIds((prev) => prev.filter((id) => id !== voter._id));
    }
  }, [savingIds]);

  const handleSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setDebouncedSearch(search);
    const trimmed = search.trim();
    if (!trimmed) return;
    const asNum = Number(trimmed);
    if (!Number.isNaN(asNum) && asNum > 0) {
      const voter = partVoters.find((item) => Number(item.serialNo) === asNum);
      if (!voter) {
        setError(`क्रमांक ${trimmed} इस बूथ/वार्ड में नहीं मिला।`);
        return;
      }
      if (voter.voted) {
        setError(`क्रमांक ${voter.serialNo} पर मतदान पहले से दर्ज है।`);
        return;
      }
      void toggleVote(voter);
    }
  };

  const printPending = () => {
    if (pendingVoters.length === 0) {
      toast.info('इस वार्ड / बूथ में कोई शेष मतदाता नहीं है।');
      return;
    }
    window.print();
  };

  const getWardDisplayText = () => {
    if (selectedWards.includes('all') || (availableWards.length > 0 && selectedWards.length === availableWards.length)) {
      return 'सभी वार्ड';
    }
    return selectedWards.map((w) => `वार्ड ${w}`).join(', ');
  };

  return (
    <div className="work-page poll-desk-expanded">
      {/* 1. TOP HEADER WITH VIEW SWITCHER */}
      <div className="page-intro" style={{ flexWrap: 'wrap', gap: '14px', alignItems: 'center' }}>
        <div>
          <div className="eyebrow-label">
            <span className="eyebrow-mark" />
            <Vote size={12} strokeWidth={2.5} />
            LIVE POLLING BOOTH DESK
          </div>
          <h1>मतदान दिवस डेस्क</h1>
          <p>बूथ पर मतदाता की स्थिति रिकॉर्ड करें। हर बदलाव सीधे डेटाबेस में सेव होता है।</p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', marginLeft: 'auto' }}>
          {/* VIEW SWITCHER TABS (SIDE-BY-SIDE / GRID / TABLE) */}
          <div className="desk-view-switcher" role="tablist" aria-label="दृश्य चयन">
            <button
              type="button"
              className={`desk-view-tab ${viewMode === 'both' ? 'is-active' : ''}`}
              onClick={() => handleViewModeChange('both')}
              title="नंबर ग्रिड और विस्तृत सूची दोनों साथ-साथ देखें"
            >
              <Columns2 size={15} />
              <span>दोनों साथ (स्प्लिट)</span>
            </button>
            <button
              type="button"
              className={`desk-view-tab ${viewMode === 'grid' ? 'is-active' : ''}`}
              onClick={() => handleViewModeChange('grid')}
              title="केवल नंबर ग्रिड पूरे पेज पर देखें (SS1)"
            >
              <Grid size={15} />
              <span>नंबर ग्रिड (SS1)</span>
            </button>
            <button
              type="button"
              className={`desk-view-tab ${viewMode === 'table' ? 'is-active' : ''}`}
              onClick={() => handleViewModeChange('table')}
              title="केवल विस्तृत सूची पूरे पेज पर देखें (SS2)"
            >
              <Table size={15} />
              <span>विस्तृत सूची (SS2)</span>
            </button>
          </div>

          <button
            className="button-secondary"
            type="button"
            onClick={() => void loadVoters(selectedWards)}
            disabled={loading || selectedWards.length === 0}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontWeight: 600 }}
          >
            {loading ? <LoaderCircle size={15} className="spin" /> : <RefreshCw size={15} />}
            रिफ्रेश
          </button>
        </div>
      </div>

      {/* 2. ADVANCED TOOLBAR: MULTI-WARD SELECTION & MULTILINGUAL TOGGLE */}
      <section className="work-toolbar" style={{ flexWrap: 'wrap', gap: '12px' }}>
        {/* Multi-Ward Selector */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '7px', flexWrap: 'wrap' }}>
          <span className="work-select-label" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
            <MapPin size={14} style={{ color: '#0f766e' }} />
            वार्ड चयन:
          </span>
          <button
            type="button"
            className={`ward-pill-btn ${selectedWards.includes('all') || (availableWards.length > 0 && selectedWards.length === availableWards.length) ? 'is-active' : ''}`}
            onClick={() => toggleWard('all')}
            title="सभी वार्ड एक साथ देखें"
          >
            सभी वार्ड ({totalOrgVoters > 0 ? totalOrgVoters.toLocaleString('hi-IN') : availableWards.length || voters.length})
          </button>
          {availableWards.map((wardItem) => {
            const isSelected = !selectedWards.includes('all') && selectedWards.includes(wardItem.id);
            return (
              <button
                key={wardItem.id}
                type="button"
                className={`ward-pill-btn ${isSelected ? 'is-active' : ''}`}
                onClick={() => toggleWard(wardItem.id)}
                title={`वार्ड ${wardItem.id} (${wardItem.count} मतदाता)`}
              >
                वार्ड {wardItem.id}
                {wardItem.count > 0 && (
                  <span style={{ fontSize: '11px', opacity: 0.85, marginLeft: '4px', fontWeight: 600 }}>
                    ({wardItem.count.toLocaleString('hi-IN')})
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Booth / Part selection if applicable */}
        {!hidePartNo && parts.length > 1 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span className="work-toolbar-divider" />
            <label className="work-select-label" htmlFor="part-select">भाग / बूथ</label>
            <select id="part-select" value={selectedPart} onChange={(event) => setSelectedPart(event.target.value)}>
              <option value="">सभी भाग ({parts.length})</option>
              {parts.map((part) => <option key={part} value={part}>भाग {part}</option>)}
            </select>
          </div>
        )}

        <span className="work-toolbar-divider" />

        {/* Right side: Language Switcher & Update Time */}
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          {/* MULTILINGUAL TOGGLE: HINDI, ENGLISH, HINGLISH */}
          <div className="desk-lang-switcher" aria-label="मतदाता विवरण भाषा">
            <span className="desk-lang-caption">
              <Languages size={13} />
              भाषा:
            </span>
            <button
              type="button"
              className={`desk-lang-btn ${language === 'hi' ? 'is-active' : ''}`}
              onClick={() => handleLanguageChange('hi')}
              title="मतदाता नाम व विवरण शुद्ध हिंदी में देखें"
            >
              अ हिंदी
            </button>
            <button
              type="button"
              className={`desk-lang-btn ${language === 'en' ? 'is-active' : ''}`}
              onClick={() => handleLanguageChange('en')}
              title="मतदाता नाम व विवरण शुद्ध English में देखें"
            >
              A English
            </button>
            <button
              type="button"
              className={`desk-lang-btn ${language === 'hinglish' ? 'is-active' : ''}`}
              onClick={() => handleLanguageChange('hinglish')}
              title="मतदाता नाम English + (हिंदी) हिंग्लिश में देखें"
            >
              Aa हिंग्लिश
            </button>
          </div>

          <span className="toolbar-caption" style={{ whiteSpace: 'nowrap' }}>
            {updatedAt ? `अपडेट: ${updatedAt.toLocaleTimeString('hi-IN', { hour: '2-digit', minute: '2-digit' })}` : 'डेटा की प्रतीक्षा में'}
          </span>
        </div>
      </section>

      {/* 3. METRIC KPI CARDS */}
      <section className="metric-grid">
        <article className="metric-card">
          <span>मतदाता</span>
          <strong>{loading ? '—' : partVoters.length.toLocaleString('hi-IN')}</strong>
          <small>{getWardDisplayText()}</small>
        </article>
        <article className="metric-card metric-card-green">
          <span>मतदान दर्ज</span>
          <strong>{loading ? '—' : votedCount.toLocaleString('hi-IN')}</strong>
          <small>सर्वर पर सेव</small>
        </article>
        <article className="metric-card metric-card-amber">
          <span>अभी शेष</span>
          <strong>{loading ? '—' : pendingCount.toLocaleString('hi-IN')}</strong>
          <small>मतदान दर्ज होना बाकी</small>
        </article>
        <article className="metric-card metric-card-sky">
          <span>वार्ड प्रगति</span>
          <strong>{loading ? '—' : `${turnout}%`}</strong>
          <small>दर्ज मतदाता / कुल</small>
        </article>
      </section>

      {/* 4. MAIN RECORDS PANEL WITH CONDITIONAL VIEW MODES */}
      <section className="records-panel">
        <div className="records-toolbar" style={{ flexWrap: 'wrap', gap: '10px' }}>
          <div>
            <h2>मतदाता रिकॉर्ड ({getWardDisplayText()})</h2>
            <p>स्थिति बदलते ही सर्वर पर सेव होगी। नाम व विवरण: <strong>{language === 'hi' ? 'हिंदी' : language === 'en' ? 'English' : 'हिंग्लिश'}</strong></p>
          </div>

          {/* SEARCH FORM WITH DEDICATED SEARCH BUTTON */}
          <form
            className="desk-search-form"
            onSubmit={handleSearch}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              marginLeft: 'auto',
            }}
          >
            <div className="desk-search" style={{ margin: 0, minWidth: '270px' }}>
              <Search size={15} />
              <input
                aria-label="नाम, क्रमांक या EPIC से खोजें"
                placeholder="नाम, क्रमांक, EPIC खोजें (हिंदी/Eng/Hinglish)..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
              {search && (
                <button
                  type="button"
                  onClick={() => {
                    setSearch('');
                    setDebouncedSearch('');
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: '2px',
                    color: '#94a3b8',
                    display: 'flex',
                    alignItems: 'center',
                  }}
                  title="साफ़ करें"
                >
                  <X size={14} />
                </button>
              )}
            </div>
            <button
              type="submit"
              className="button-primary"
              style={{
                height: '34px',
                padding: '0 14px',
                fontSize: '13px',
                fontWeight: 600,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                borderRadius: '6px',
                whiteSpace: 'nowrap',
                cursor: 'pointer',
              }}
              title="खोजें या क्रमांक दर्ज करें"
            >
              <Search size={13} />
              <span>खोजें</span>
            </button>
          </form>

          {/* STATUS FILTER TABS */}
          <div className="filter-tabs" aria-label="मतदाता फ़िल्टर" style={{ margin: 0 }}>
            {([
              ['all', 'सभी', partVoters.length],
              ['pending', 'शेष', pendingCount],
              ['voted', 'मतदान दर्ज', votedCount],
            ] as const).map(([value, label, count]) => (
              <button
                className={filter === value ? 'filter-tab is-active' : 'filter-tab'}
                key={value}
                onClick={() => setFilter(value)}
                type="button"
              >
                {label}<span>{count}</span>
              </button>
            ))}
          </div>

          <button
            className="button-secondary print-control"
            type="button"
            onClick={printPending}
            disabled={!pendingCount}
            title="A4 PDF / प्रिंट शेष मतदाता सूची"
          >
            <Printer size={15} /> शेष सूची प्रिंट / PDF
          </button>
        </div>

        {error && (
          <div className="empty-state error-state" style={{ margin: '14px 18px' }}>
            <strong>अपडेट उपलब्ध नहीं</strong>
            <p>{error}</p>
            <button className="button-secondary" type="button" onClick={() => void loadVoters(selectedWards)}>
              फिर से कोशिश करें
            </button>
          </div>
        )}

        {loading ? (
          <div className="empty-state">
            <LoaderCircle size={21} className="spin" />
            <p>मतदाता रिकॉर्ड लोड हो रहे हैं…</p>
          </div>
        ) : visibleVoters.length === 0 ? (
          <div className="empty-state">
            <span className="empty-icon"><Search size={22} /></span>
            <strong>कोई रिकॉर्ड नहीं मिला</strong>
            <p>
              {search
                ? `खोज '${search}' के लिए कोई मतदाता नहीं मिला।`
                : selectedWards.includes('all')
                ? 'इस संगठन/क्लाइंट में कोई मतदाता रिकॉर्ड उपलब्ध नहीं है।'
                : `चुने गए ${getWardDisplayText()} में कोई मतदाता रिकॉर्ड नहीं मिला।`}
            </p>
            {(!selectedWards.includes('all') || Boolean(search)) && (
              <div style={{ display: 'flex', gap: '8px', marginTop: '12px', justifyContent: 'center' }}>
                {search && (
                  <button
                    type="button"
                    className="button-secondary"
                    onClick={() => {
                      setSearch('');
                      setDebouncedSearch('');
                    }}
                  >
                    खोज साफ़ करें
                  </button>
                )}
                {!selectedWards.includes('all') && (
                  <button
                    type="button"
                    className="button-primary"
                    onClick={() => toggleWard('all')}
                  >
                    सभी वार्ड देखें ({totalOrgVoters > 0 ? totalOrgVoters.toLocaleString('hi-IN') : 'सभी'})
                  </button>
                )}
              </div>
            )}
          </div>
        ) : (
          <>
            {/* VIEW MODE 1: BOTH SIDE BY SIDE (SPLIT VIEW) */}
            {viewMode === 'both' && (
              <div className="desk-split-layout">
                {/* Left Column: Dense Number Grid (SS1) */}
                <div className="desk-split-col-grid">
                  <div className="desk-subhead">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Grid size={15} style={{ color: '#059669' }} />
                      <strong style={{ fontSize: '13px', color: '#0f172a' }}>त्वरित क्रमांक ग्रिड (SS1)</strong>
                    </div>
                    <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>
                      कुल {partVoters.length} क्रमांक
                    </span>
                  </div>
                  <div className="poll-number-grid poll-number-grid-split" aria-label="क्रमांक के अनुसार मतदान स्थिति">
                    {partVoters.map((voter) => (
                      <VoterGridButton
                        key={voter._id}
                        voter={voter}
                        toggleVote={toggleVote}
                        isSaving={savingIds.includes(voter._id)}
                        showWardBadge={isMultipleWards}
                        language={language}
                      />
                    ))}
                  </div>
                </div>

                {/* Right Column: Detailed Voter Table (SS2) */}
                <div className="desk-split-col-table">
                  <div className="desk-subhead">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Table size={15} style={{ color: '#2563eb' }} />
                      <strong style={{ fontSize: '13px', color: '#0f172a' }}>विस्तृत मतदाता सूची (SS2)</strong>
                    </div>
                    <span style={{ fontSize: '11px', color: '#64748b' }}>
                      {sortedVisibleVoters.length} मतदाता मिले
                    </span>
                  </div>
                  <div className="table-scroll">
                    <table className="voter-table desk-table">
                      <thead>
                        <tr>
                          <th>
                            <SortButton label="क्रम" field="serialNo" type="numeric" currentSort={sort} onSort={handleSort} />
                          </th>
                          <th>
                            <SortButton label="नाम व संबंधी" field="name" type="alpha" currentSort={sort} onSort={handleSort} />
                          </th>
                          <th>
                            <SortButton label="मकान" field="houseNo" type="numeric" currentSort={sort} onSort={handleSort} />
                          </th>
                          <th>उम्र / लिंग</th>
                          <th>स्थिति</th>
                          <th>कार्य</th>
                        </tr>
                      </thead>
                      <tbody>
                        {paginatedVisibleVoters.map((voter) => (
                          <VoterTableRow
                            key={voter._id}
                            voter={voter}
                            toggleVote={toggleVote}
                            isSaving={savingIds.includes(voter._id)}
                            language={language}
                            showWardBadge={isMultipleWards}
                            onOpenPhoto={setPhotoModalVoter}
                          />
                        ))}
                      </tbody>
                    </table>

                    {/* Pagination */}
                    {totalDeskPages > 1 && (
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '10px 14px',
                        borderTop: '1px solid #e2e8f0',
                        background: '#f8fafc',
                        flexWrap: 'wrap',
                        gap: '8px'
                      }}>
                        <div style={{ fontSize: '12px', color: '#64748b' }}>
                          पेज <strong>{currentPage}</strong> / <strong>{totalDeskPages}</strong> (कुल {sortedVisibleVoters.length.toLocaleString('hi-IN')})
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <button
                            type="button"
                            disabled={currentPage <= 1}
                            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                            className="button-secondary"
                            style={{ padding: '4px 10px', fontSize: '12px' }}
                          >
                            <ChevronLeft size={13} /> पिछला
                          </button>
                          <button
                            type="button"
                            disabled={currentPage >= totalDeskPages}
                            onClick={() => setCurrentPage((p) => Math.min(totalDeskPages, p + 1))}
                            className="button-secondary"
                            style={{ padding: '4px 10px', fontSize: '12px' }}
                          >
                            अगला <ChevronRight size={13} />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* VIEW MODE 2: FULL PAGE NUMBER GRID (SS1 EXACT) */}
            {viewMode === 'grid' && (
              <div>
                <div className="poll-number-grid poll-number-grid-full" aria-label="क्रमांक के अनुसार मतदान स्थिति">
                  {partVoters.map((voter) => (
                    <VoterGridButton
                      key={voter._id}
                      voter={voter}
                      toggleVote={toggleVote}
                      isSaving={savingIds.includes(voter._id)}
                      showWardBadge={isMultipleWards}
                      language={language}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* VIEW MODE 3: FULL PAGE DETAILED TABLE (SS2 EXACT) */}
            {viewMode === 'table' && (
              <div className="table-scroll">
                <table className="voter-table desk-table">
                  <thead>
                    <tr>
                      <th>
                        <SortButton label="क्रम संख्या" field="serialNo" type="numeric" currentSort={sort} onSort={handleSort} />
                      </th>
                      <th>
                        <SortButton label="नाम व संबंधी" field="name" type="alpha" currentSort={sort} onSort={handleSort} />
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
                    {paginatedVisibleVoters.map((voter) => (
                      <VoterTableRow
                        key={voter._id}
                        voter={voter}
                        toggleVote={toggleVote}
                        isSaving={savingIds.includes(voter._id)}
                        language={language}
                        showWardBadge={isMultipleWards}
                        onOpenPhoto={setPhotoModalVoter}
                      />
                    ))}
                  </tbody>
                </table>

                {/* Pagination Controls */}
                {totalDeskPages > 1 && (
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 16px',
                    borderTop: '1px solid #e2e8f0',
                    background: '#f8fafc',
                    flexWrap: 'wrap',
                    gap: '10px'
                  }}>
                    <div style={{ fontSize: '13px', color: '#64748b' }}>
                      दिखाए जा रहे हैं: <strong>{((currentPage - 1) * pageSize + 1).toLocaleString('hi-IN')}</strong> - <strong>{Math.min(currentPage * pageSize, sortedVisibleVoters.length).toLocaleString('hi-IN')}</strong> (कुल {sortedVisibleVoters.length.toLocaleString('hi-IN')} मतदाता)
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
                        पेज {currentPage} / {totalDeskPages}
                      </span>
                      <button
                        type="button"
                        disabled={currentPage >= totalDeskPages}
                        onClick={() => setCurrentPage((p) => Math.min(totalDeskPages, p + 1))}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          padding: '5px 12px',
                          borderRadius: '6px',
                          border: '1px solid #cbd5e1',
                          background: currentPage >= totalDeskPages ? '#e2e8f0' : '#ffffff',
                          color: currentPage >= totalDeskPages ? '#94a3b8' : '#0f172a',
                          fontSize: '12.5px',
                          fontWeight: 600,
                          cursor: currentPage >= totalDeskPages ? 'not-allowed' : 'pointer'
                        }}
                      >
                        अगला <ChevronRight size={15} />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        )}

        <div className="records-footnote">मतदान की स्थिति चुने गए {getWardDisplayText()} के रिकॉर्ड से लाइव गणना की गई है।</div>
      </section>

      {/* DEDICATED OFFICIAL PRINTABLE REPORT (VISIBLE ONLY ON PRINT / PDF) */}
      <div className="poll-desk-print-sheet" aria-hidden="true">
        <div className="poll-print-header">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: '11px', fontWeight: 700, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                भारत निर्वाचन प्रबंधन • LIVE POLLING BOOTH REPORT
              </div>
              <h1 style={{ fontSize: '19px', fontWeight: 800, margin: '2px 0 4px 0', color: '#0f172a' }}>
                मतदान दिवस डेस्क — शेष (बकाया) मतदाता सूची
              </h1>
              <div style={{ fontSize: '12px', color: '#334155', fontWeight: 600 }}>
                <span>वार्ड: <strong>{getWardDisplayText()}</strong></span>
                {!hidePartNo && selectedPart && <span> | भाग / बूथ: <strong>{selectedPart}</strong></span>}
                <span> | कुल शेष मतदाता: <strong>{pendingVoters.length}</strong></span>
                <span> | मतदान दर्ज: <strong>{votedCount}</strong></span>
                <span> | टर्नआउट: <strong>{turnout}%</strong></span>
              </div>
            </div>
            <div style={{ textAlign: 'right', fontSize: '11px', color: '#64748b', lineHeight: 1.5 }}>
              <div>प्रिंट दिनांक: <strong>{new Date().toLocaleDateString('hi-IN')}</strong></div>
              <div>समय: <strong>{new Date().toLocaleTimeString('hi-IN', { hour: '2-digit', minute: '2-digit' })}</strong></div>
              <div style={{ fontSize: '10px', color: '#94a3b8' }}>VijaySetu (विजयसेतु) Polling Sheet</div>
            </div>
          </div>
        </div>

        <table className="poll-print-table">
          <thead>
            <tr>
              <th style={{ width: '45px', textAlign: 'center' }}>क्र.सं.</th>
              <th style={{ width: '170px' }}>मतदाता का नाम</th>
              <th style={{ width: '160px' }}>पिता / पति का नाम</th>
              <th style={{ width: '60px', textAlign: 'center' }}>मकान नं.</th>
              <th style={{ width: '75px', textAlign: 'center' }}>उम्र / लिंग</th>
              <th style={{ width: '120px' }}>पहचान पत्र (EPIC)</th>
              <th style={{ width: '85px', textAlign: 'center' }}>मतदान टिक (✓)</th>
            </tr>
          </thead>
          <tbody>
            {pendingVoters.map((voter) => {
              const pName = getVoterDisplayName(voter, language);
              const pRel = getVoterRelativeDisplay(voter, language);
              const pGender = getGenderLabel(voter.gender, language);

              return (
                <tr key={voter._id}>
                  <td style={{ textAlign: 'center', fontWeight: 700 }}>
                    {voter.serialNo}
                    {isMultipleWards && voter.wardNo && (
                      <div style={{ fontSize: '9px', color: '#64748b' }}>W-{voter.wardNo}</div>
                    )}
                  </td>
                  <td>
                    <div style={{ fontWeight: 700 }}>{pName.primary}</div>
                    {pName.secondary && (
                      <div style={{ fontSize: '10px', color: '#475569' }}>{pName.secondary}</div>
                    )}
                  </td>
                  <td>
                    <div>{pRel.primary || '—'}</div>
                    {pRel.secondary && (
                      <div style={{ fontSize: '10px', color: '#475569' }}>{pRel.secondary}</div>
                    )}
                  </td>
                  <td style={{ textAlign: 'center' }}>{voter.houseNo || '—'}</td>
                  <td style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>
                    {voter.age ? `${voter.age} ` : ''}{pGender}
                  </td>
                  <td style={{ fontFamily: 'monospace', fontSize: '11px', fontWeight: 600 }}>{voter.epic || '—'}</td>
                  <td style={{ textAlign: 'center' }}>
                    <span
                      style={{
                        display: 'inline-block',
                        width: '16px',
                        height: '16px',
                        border: '1.5px solid #0f172a',
                        borderRadius: '3px',
                        verticalAlign: 'middle',
                      }}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        <div className="poll-print-footer">
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '24px', paddingTop: '10px', borderTop: '1px solid #cbd5e1', fontSize: '11px', color: '#475569' }}>
            <div>मतदान केंद्र प्रभारी हस्ताक्षर: ______________________</div>
            <div>बूथ एजेंट हस्ताक्षर: ______________________</div>
            <div>VijaySetu (विजयसेतु) Live Polling Desk</div>
          </div>
        </div>
      </div>

      {/* Full Resolution Voter Photo Lightbox Modal */}
      <VoterPhotoModal
        isOpen={Boolean(photoModalVoter)}
        onClose={() => setPhotoModalVoter(null)}
        voter={photoModalVoter}
      />
    </div>
  );
}
