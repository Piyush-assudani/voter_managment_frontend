'use client';

import { FormEvent, useCallback, useEffect, useRef, useState } from 'react';
import {
  Check,
  FileText,
  LoaderCircle,
  MapPin,
  Mic,
  Printer,
  Search,
  Send,
  UsersRound,
  X,
  Download,
  User
} from 'lucide-react';
import { apiFetch, getApiError } from '@/lib/api';
import { createSpeechRecognition, SpeechRecognitionLike } from '@/lib/speech';
import { downloadSlip } from '@/lib/downloadSlip';

interface Voter {
  _id: string;
  epic: string;
  nameEn: string;
  nameHi: string;
  relativeNameEn: string;
  relativeNameHi: string;
  relationType: string;
  age: number;
  gender: string;
  houseNo: string;
  wardNo: string;
  partNo: string;
  serialNo: number;
  phone: string;
  caste: string;
  surety: string;
  supportStatus: string;
  isMigrant: boolean;
  migrantLocation: string;
  assignedWorker: string;
  notes: string;
  voted: boolean;
}

export default function DashboardPage() {
  const [voters, setVoters] = useState<Voter[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [relativeNameQuery, setRelativeNameQuery] = useState('');
  const [voiceError, setVoiceError] = useState('');
  const [voiceActive, setVoiceActive] = useState(false);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const [houseQuery, setHouseQuery] = useState('');
  const [wardFilter, setWardFilter] = useState('');
  const [supportFilter, setSupportFilter] = useState('');
  const [migrantFilter, setMigrantFilter] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const pageSizeRef = useRef(25);
  const filtersRef = useRef({ ward: '', supportStatus: '', isMigrant: '' });
  const [totalRecords, setTotalRecords] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [familyHouse, setFamilyHouse] = useState('');
  const [editVoter, setEditVoter] = useState<Voter | null>(null);
  const [slipVoter, setSlipVoter] = useState<Voter | null>(null);
  const [editValues, setEditValues] = useState({
    nameEn: '',
    nameHi: '',
    relativeNameEn: '',
    relativeNameHi: '',
    relationType: '',
    age: '',
    gender: '',
    epic: '',
    houseNo: '',
    wardNo: '',
    partNo: '',
    serialNo: '',
    phone: '',
    caste: '',
    surety: '',
    supportStatus: 'unmarked',
    assignedWorker: '',
    isMigrant: false,
    migrantLocation: '',
    notes: '',
  });
  const [slipPhone, setSlipPhone] = useState('');
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [actionMessage, setActionMessage] = useState('');

  const loadVoters = useCallback(async (
    search = '',
    house = '',
    nextPage = 1,
    householdWard = '',
    householdPart = '',
    relative = '',
  ) => {
    setLoading(true);
    setError('');
    setSelectedIds([]);
    setFamilyHouse(house);
    setPage(nextPage);

    const path = house
      ? `/voters/family/${encodeURIComponent(house)}?${new URLSearchParams({ ward: householdWard, part: householdPart })}`
      : `/voters?${new URLSearchParams({
          ...(search ? { search } : {}),
          ...(relative ? { relative } : {}),
          ...(filtersRef.current.ward ? { ward: filtersRef.current.ward } : {}),
          ...(filtersRef.current.supportStatus ? { supportStatus: filtersRef.current.supportStatus } : {}),
          ...(filtersRef.current.isMigrant ? { isMigrant: filtersRef.current.isMigrant } : {}),
          page: String(nextPage),
          pageSize: String(pageSizeRef.current),
        })}`;

    try {
      const response = await apiFetch(path, { cache: 'no-store' });
      if (!response.ok) {
        throw new Error(await getApiError(response, 'मतदाता सूची लोड नहीं हो सकी।'));
      }
      const result: unknown = await response.json();
      const records = Array.isArray(result)
        ? result
        : result && typeof result === 'object' && 'data' in result && Array.isArray(result.data)
          ? result.data
          : null;
      if (!records) {
        throw new Error('सर्वर से सूची का सही उत्तर नहीं मिला।');
      }
      setVoters(records as Voter[]);
      setTotalRecords(
        result && typeof result === 'object' && 'total' in result && typeof result.total === 'number'
          ? result.total
          : records.length,
      );
    } catch (loadError) {
      setVoters([]);
      setTotalRecords(0);
      setError(loadError instanceof Error ? loadError.message : 'मतदाता सूची लोड नहीं हो सकी।');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void Promise.resolve().then(() => loadVoters());
  }, [loadVoters]);

  useEffect(() => () => recognitionRef.current?.stop(), []);

  const handleSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    filtersRef.current = {
      ward: wardFilter.trim(),
      supportStatus: supportFilter,
      isMigrant: migrantFilter,
    };
    setVoiceError('');
    void loadVoters(searchQuery.trim(), houseQuery.trim(), 1, '', '', relativeNameQuery.trim());
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
      if (transcript) setSearchQuery(transcript);
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

  const toggleSelected = (id: string) => {
    setSelectedIds((current) => current.includes(id)
      ? current.filter((selectedId) => selectedId !== id)
      : [...current, id]);
  };

  const selectAll = () => {
    setSelectedIds((current) => current.length === voters.length ? [] : voters.map((voter) => voter._id));
  };

  const openEditor = (voter: Voter) => {
    setActionMessage('');
    setEditValues({
      nameEn: voter.nameEn || '',
      nameHi: voter.nameHi || '',
      relativeNameEn: voter.relativeNameEn || '',
      relativeNameHi: voter.relativeNameHi || '',
      relationType: voter.relationType || '',
      age: voter.age?.toString() || '',
      gender: voter.gender || '',
      epic: voter.epic || '',
      houseNo: voter.houseNo || '',
      wardNo: voter.wardNo || '',
      partNo: voter.partNo || '',
      serialNo: voter.serialNo?.toString() || '',
      phone: voter.phone || '',
      caste: voter.caste || '',
      surety: voter.surety || '',
      supportStatus: voter.supportStatus || 'unmarked',
      assignedWorker: voter.assignedWorker || '',
      isMigrant: Boolean(voter.isMigrant),
      migrantLocation: voter.migrantLocation || '',
      notes: voter.notes || '',
    });
    setEditVoter(voter);
  };

  const saveVoter = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editVoter) return;
    setSaving(true);
    setActionMessage('');
    try {
      const response = await apiFetch(`/voters/${encodeURIComponent(editVoter._id)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editValues),
      });
      if (!response.ok) {
        throw new Error(await getApiError(response, 'मतदाता विवरण सेव नहीं हुए।'));
      }
      const updatedValues = { ...editValues, age: Number(editValues.age) || 0, serialNo: Number(editValues.serialNo) || 0 };
      setVoters((current) => current.map((voter) => voter._id === editVoter._id ? { ...voter, ...updatedValues } : voter));
      setEditVoter(null);
      setActionMessage('मतदाता विवरण सेव हो गए।');
    } catch (saveError) {
      setActionMessage(saveError instanceof Error ? saveError.message : 'मतदाता विवरण सेव नहीं हुए।');
    } finally {
      setSaving(false);
    }
  };

  const sendSlip = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!slipVoter) return;
    setSending(true);
    setActionMessage('');
    try {
      const response = await apiFetch('/whatsapp/send-slip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ voterId: slipVoter._id, phoneNumber: slipPhone }),
      });
      if (!response.ok) {
        throw new Error(await getApiError(response, 'WhatsApp पर्ची नहीं भेजी जा सकी।'));
      }
      setSlipVoter(null);
      setActionMessage('Meta API ने पर्ची भेजने का अनुरोध स्वीकार किया। डिलीवरी की पुष्टि उपलब्ध नहीं है।');
    } catch (sendError) {
      setActionMessage(sendError instanceof Error ? sendError.message : 'WhatsApp पर्ची नहीं भेजी जा सकी।');
    } finally {
      setSending(false);
    }
  };

  const handleBulkDownload = async () => {
    if (selectedIds.length === 0) return;
    setIsDownloading(true);
    setActionMessage('पर्चियां डाउनलोड हो रही हैं, कृपया प्रतीक्षा करें...');
    const selectedVoters = voters.filter(v => selectedIds.includes(v._id));
    
    for (const voter of selectedVoters) {
      await downloadSlip(voter);
      await new Promise(r => setTimeout(r, 400));
    }
    
    setIsDownloading(false);
    setActionMessage(`${selectedVoters.length} पर्चियां सफलतापूर्वक डाउनलोड की गईं।`);
    setSelectedIds([]);
  };

  return (
    <div className="directory-page">
      <div className="page-intro">
        <div>
          <div className="eyebrow-label"><span className="eyebrow-mark" /> DIRECTORY</div>
          <h1>मतदाता सूची</h1>
          <p>अपनी क्षेत्रीय मतदाता जानकारी खोजें और अपडेट करें।</p>
        </div>
        <div className="location-chip"><MapPin size={14} /> ग्राम पंचायत जैलातरा</div>
      </div>

      <section className="directory-summary">
        <div className="summary-copy">
          <span className="summary-icon"><UsersRound size={17} /></span>
          <span><strong>{loading ? '—' : totalRecords}</strong><small>{familyHouse ? `मकान ${familyHouse} · परिवार` : 'मिलते रिकॉर्ड'}</small></span>
        </div>
        <span className="summary-separator" />
        <div className="summary-copy">
          <span className="summary-icon summary-icon-neutral"><Check size={17} /></span>
          <span><strong>{selectedIds.length}</strong><small>चुने गए मतदाता</small></span>
        </div>
        <span className="summary-note">{familyHouse ? 'परिवार · मकान, वार्ड और भाग' : `${voters.length} दिखाए गए · प्रति पृष्ठ ${pageSize}`}</span>
      </section>

      <section className="directory-panel">
        <div className="panel-heading">
          <div>
            <h2>रिकॉर्ड खोजें</h2>
            <p>नाम, EPIC नंबर या मकान नंबर से खोजें।</p>
          </div>
          <span className="panel-count">{voters.length} रिकॉर्ड</span>
        </div>
        <form className="search-form" onSubmit={handleSearch}>
          <label className="search-field">
            <Search size={17} />
            <input
              aria-label="मतदाता का नाम या EPIC"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="नाम या EPIC नंबर"
            />
          </label>
          <label className="search-field">
            <UsersRound size={16} />
            <input
              aria-label="पिता या संबंधी का नाम"
              value={relativeNameQuery}
              onChange={(event) => setRelativeNameQuery(event.target.value)}
              placeholder="पिता / संबंधी का नाम"
            />
          </label>
          <label className="search-field house-search-field">
            <MapPin size={16} />
            <input
              aria-label="मकान नंबर"
              value={houseQuery}
              onChange={(event) => setHouseQuery(event.target.value)}
              placeholder="मकान नंबर"
            />
          </label>
          <label className="search-field directory-filter-field">
            <MapPin size={15} />
            <input aria-label="वार्ड फ़िल्टर" value={wardFilter} onChange={(event) => setWardFilter(event.target.value)} placeholder="वार्ड फ़िल्टर" />
          </label>
          <select className="directory-select-filter" aria-label="समर्थन वर्ग फ़िल्टर" value={supportFilter} onChange={(event) => setSupportFilter(event.target.value)}>
            <option value="">सभी support tags</option><option value="core">समर्थन चिह्नित</option><option value="swing">अनिर्णीत चिह्नित</option><option value="opposition">विरोध चिह्नित</option><option value="unmarked">अवर्गीकृत</option>
          </select>
          <select className="directory-select-filter" aria-label="प्रवासी फ़िल्टर" value={migrantFilter} onChange={(event) => setMigrantFilter(event.target.value)}>
            <option value="">सभी मतदाता</option><option value="true">प्रवासी</option><option value="false">गैर-प्रवासी</option>
          </select>
          <button className="button-primary search-submit" type="submit" disabled={loading}>
            {loading ? <LoaderCircle size={16} className="spin" /> : <Search size={16} />}
            खोजें
          </button>
          <button className="button-secondary" type="button" onClick={startVoiceSearch} disabled={voiceActive} aria-label="बोलकर खोजें" title="बोलकर खोजें">
            <Mic size={15} /> {voiceActive ? 'सुन रहे हैं…' : 'बोलकर खोजें'}
          </button>
          {(searchQuery || relativeNameQuery || houseQuery || familyHouse || wardFilter || supportFilter || migrantFilter) && (
            <button
              className="button-quiet"
              type="button"
              onClick={() => {
                setSearchQuery('');
                setRelativeNameQuery('');
                setHouseQuery('');
                setVoiceError('');
                setWardFilter('');
                setSupportFilter('');
                setMigrantFilter('');
                filtersRef.current = { ward: '', supportStatus: '', isMigrant: '' };
                void loadVoters();
              }}
            >
              साफ़ करें
            </button>
          )}
        </form>
        {voiceError && <p className="inline-notice error-notice" role="status">{voiceError}</p>}
      </section>

      {actionMessage && <div className="inline-notice" role="status">{actionMessage}</div>}

      <section className="records-panel">
        <div className="records-toolbar">
          <div>
            <h2>{familyHouse ? `मकान ${familyHouse} का परिवार` : searchQuery ? 'खोज परिणाम' : 'सभी मतदाता'}</h2>
            <p>{loading ? 'रिकॉर्ड लोड हो रहे हैं…' : `${voters.length} रिकॉर्ड`}</p>
          </div>
          <div className="records-toolbar-actions">
            {selectedIds.length > 0 && (
              <button className="button-secondary" type="button" onClick={() => void handleBulkDownload()} disabled={isDownloading}>
                {isDownloading ? <LoaderCircle size={15} className="spin" /> : <Download size={15} />} पर्चियां डाउनलोड ({selectedIds.length})
              </button>
            )}
            <button className="button-secondary" type="button" onClick={selectAll} disabled={loading || !voters.length}>
              {selectedIds.length === voters.length ? 'चयन हटाएँ' : 'सभी चुनें'}
            </button>
            <button className="button-secondary" type="button" onClick={() => window.print()} disabled={!voters.length}>
              <Printer size={15} /> प्रिंट
            </button>
          </div>
        </div>

        {error ? (
          <div className="empty-state error-state">
            <span className="empty-icon"><X size={20} /></span>
            <strong>डेटा लोड नहीं हो पाया</strong>
            <p>{error}</p>
            <button className="button-secondary" onClick={() => void loadVoters()} type="button">फिर से कोशिश करें</button>
          </div>
        ) : loading ? (
          <div className="empty-state"><LoaderCircle size={22} className="spin" /><p>मतदाता रिकॉर्ड लोड हो रहे हैं…</p></div>
        ) : voters.length === 0 ? (
          <div className="empty-state">
            <span className="empty-icon"><FileText size={20} /></span>
            <strong>कोई रिकॉर्ड नहीं मिला</strong>
            <p>खोज बदलकर दोबारा कोशिश करें।</p>
          </div>
        ) : (
          <div className="voter-cards-grid">
            {voters.map((voter) => (
              <div key={voter._id} className="voter-card">
                <div className="vc-header">
                  <div className="vc-header-left">
                    <input aria-label={`${voter.nameHi || voter.nameEn} चुनें`} type="checkbox" className="vc-checkbox" checked={selectedIds.includes(voter._id)} onChange={() => toggleSelected(voter._id)} />
                    <span className="vc-badge vc-ward">वार्ड {voter.wardNo || '—'}</span>
                    <span className="vc-badge vc-part">भाग {voter.partNo || '—'} • क्र. {voter.serialNo || '—'}</span>
                  </div>
                  <div className="vc-header-meta">
                    <span>मकान <strong>{voter.houseNo || '—'}</strong></span>
                    {voter.age ? <span><strong>{voter.age}</strong> वर्ष</span> : null}
                  </div>
                </div>
                
                <div className="vc-body">
                  <h3 className="vc-name">{voter.nameHi || voter.nameEn || '—'}</h3>
                  {voter.nameHi && voter.nameEn && <p className="vc-name-latin">{voter.nameEn}</p>}
                  <p className="vc-relative">{voter.relationType || 'पिता'}: {voter.relativeNameEn || voter.relativeNameHi || '—'}{voter.relativeNameEn && voter.relativeNameHi ? ` / ${voter.relativeNameHi}` : ''}</p>
                  <p className="vc-epic">EPIC <strong>{voter.epic || '—'}</strong></p>
                </div>

                <div className="vc-tags">
                  <span className={`vc-tag vc-tag-support vc-tag-${voter.supportStatus || 'unmarked'}`}>
                    <span className="vc-status-dot" aria-hidden="true" />
                    {voter.supportStatus === 'core' ? 'समर्थन चिह्नित' :
                     voter.supportStatus === 'swing' ? 'अनिर्णीत' :
                     voter.supportStatus === 'opposition' ? 'विरोध चिह्नित' : 'अवर्गीकृत'}
                  </span>
                  {voter.caste && <span className="vc-tag vc-tag-caste">समुदाय · {voter.caste}</span>}
                  {voter.phone && <span className="vc-tag vc-tag-phone">फ़ोन · {voter.phone}</span>}
                  {voter.isMigrant ? <span className="vc-tag vc-tag-migrant">प्रवासी</span> : null}
                  {voter.assignedWorker && <span className="vc-tag vc-tag-worker">कार्यकर्ता · {voter.assignedWorker}</span>}
                </div>

                <div className="vc-footer">
                  <button className="vc-btn-edit" onClick={() => openEditor(voter)}>✏️ टैग / एडिट</button>
                  <div className="vc-footer-right">
                    <button className="vc-btn-family" onClick={() => {
                      setHouseQuery(voter.houseNo || '');
                      setSearchQuery('');
                      void loadVoters('', voter.houseNo || '', 1, voter.wardNo || '', voter.partNo || '');
                    }} title="परिवार देखें"><UsersRound size={16} /></button>
                    <button className="vc-btn-slip" onClick={() => { setSlipPhone(voter.phone || ''); setSlipVoter(voter); setActionMessage(''); }} title="WhatsApp पर्ची">💬</button>
                    <button className="vc-btn-slip" style={{ marginLeft: '4px', background: '#eff6ff', color: '#1e3a8a', borderColor: '#bfdbfe' }} onClick={() => void downloadSlip(voter)} title="पर्ची डाउनलोड करें">⬇️</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        {!loading && !familyHouse && totalRecords > pageSize && (
          <div className="pagination-bar">
            <span>{(page - 1) * pageSize + 1}–{Math.min(page * pageSize, totalRecords)} / {totalRecords}</span>
            <label>प्रति पृष्ठ<select value={pageSize} onChange={(event) => { const size = Number(event.target.value); pageSizeRef.current = size; setPageSize(size); void loadVoters(searchQuery.trim(), '', 1, '', '', relativeNameQuery.trim()); }}><option value={25}>25</option><option value={50}>50</option><option value={100}>100</option><option value={250}>250</option></select></label>
            <button className="button-secondary" type="button" onClick={() => void loadVoters(searchQuery.trim(), '', page - 1, '', '', relativeNameQuery.trim())} disabled={page <= 1}>पिछला</button>
            <button className="button-secondary" type="button" onClick={() => void loadVoters(searchQuery.trim(), '', page + 1, '', '', relativeNameQuery.trim())} disabled={page * pageSize >= totalRecords}>अगला</button>
          </div>
        )}
        <div className="records-footnote">रिकॉर्ड और अपडेट आपके कॉन्फ़िगर किए गए डेटाबेस से आते हैं।</div>
      </section>

      {editVoter && (
        <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setEditVoter(null); }} style={{ backdropFilter: 'blur(4px)', background: 'rgba(15, 23, 42, 0.4)' }}>
          <section className="form-modal" role="dialog" aria-modal="true" aria-labelledby="edit-title" style={{ maxWidth: '640px', width: '90%', borderRadius: '24px', overflow: 'hidden', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)' }}>
            <div className="modal-heading" style={{ background: '#f8fafc', padding: '24px 32px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <span className="eyebrow-label" style={{ color: '#4f46e5', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                  <User size={14} /> VOTER PROFILE
                </span>
                <h2 id="edit-title" style={{ fontSize: '22px', fontWeight: '700', color: '#0f172a', margin: '0 0 4px 0' }}>मतदाता जानकारी संपादित करें</h2>
                <p style={{ color: '#64748b', fontSize: '14px', margin: 0 }}>
                  <span style={{ fontWeight: '600', color: '#334155' }}>{editVoter.nameHi || editVoter.nameEn}</span> • {editVoter.epic}
                </p>
              </div>
              <button className="icon-button" onClick={() => setEditVoter(null)} aria-label="बंद करें" style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '50%', padding: '8px', color: '#64748b' }}>
                <X size={18} />
              </button>
            </div>
            
            <form onSubmit={saveVoter} className="modal-form" style={{ padding: '0' }}>
              <div style={{ maxHeight: '65vh', overflowY: 'auto', padding: '32px' }}>
                
                {/* SECTION 1: Personal Info */}
                <h3 style={{ fontSize: '13px', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '16px' }}>व्यक्तिगत जानकारी (Personal)</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '32px' }}>
                  <label style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '13px', fontWeight: '600', color: '#475569' }}>
                    नाम (English)
                    <input value={editValues.nameEn} onChange={(event) => setEditValues({ ...editValues, nameEn: event.target.value })} style={{ padding: '10px 14px', borderRadius: '10px', border: '1px solid #cbd5e1', background: '#f8fafc', fontSize: '14px' }} />
                  </label>
                  <label style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '13px', fontWeight: '600', color: '#475569' }}>
                    नाम (हिंदी)
                    <input value={editValues.nameHi} onChange={(event) => setEditValues({ ...editValues, nameHi: event.target.value })} style={{ padding: '10px 14px', borderRadius: '10px', border: '1px solid #cbd5e1', background: '#f8fafc', fontSize: '14px' }} />
                  </label>
                  
                  <label style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '13px', fontWeight: '600', color: '#475569' }}>
                    संबंध प्रकार
                    <select value={editValues.relationType} onChange={(event) => setEditValues({ ...editValues, relationType: event.target.value })} style={{ padding: '10px 14px', borderRadius: '10px', border: '1px solid #cbd5e1', background: '#f8fafc', fontSize: '14px' }}>
                      <option value="">चुनें</option><option value="पिता">पिता</option><option value="पति">पति</option><option value="माता">माता</option><option value="पत्नी">पत्नी</option><option value="अन्य">अन्य</option>
                    </select>
                  </label>
                  <label style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '13px', fontWeight: '600', color: '#475569' }}>
                    रिश्तेदार का नाम (हिंदी)
                    <input value={editValues.relativeNameHi} onChange={(event) => setEditValues({ ...editValues, relativeNameHi: event.target.value })} style={{ padding: '10px 14px', borderRadius: '10px', border: '1px solid #cbd5e1', background: '#f8fafc', fontSize: '14px' }} />
                  </label>
                  
                  <label style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '13px', fontWeight: '600', color: '#475569' }}>
                    उम्र (Age)
                    <input type="number" value={editValues.age} onChange={(event) => setEditValues({ ...editValues, age: event.target.value })} style={{ padding: '10px 14px', borderRadius: '10px', border: '1px solid #cbd5e1', background: '#f8fafc', fontSize: '14px' }} />
                  </label>
                  <label style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '13px', fontWeight: '600', color: '#475569' }}>
                    लिंग (Gender)
                    <select value={editValues.gender} onChange={(event) => setEditValues({ ...editValues, gender: event.target.value })} style={{ padding: '10px 14px', borderRadius: '10px', border: '1px solid #cbd5e1', background: '#f8fafc', fontSize: '14px' }}>
                      <option value="">चुनें</option><option value="पुरुष">पुरुष</option><option value="स्त्री">स्त्री</option><option value="अन्य">अन्य</option>
                    </select>
                  </label>
                </div>

                {/* SECTION 2: Electoral & Location */}
                <h3 style={{ fontSize: '13px', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '16px' }}>मतदान व निवास (Electoral)</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '32px' }}>
                  <label style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '13px', fontWeight: '600', color: '#475569' }}>
                    EPIC (Voter ID)
                    <input value={editValues.epic} onChange={(event) => setEditValues({ ...editValues, epic: event.target.value })} style={{ padding: '10px 14px', borderRadius: '10px', border: '1px solid #cbd5e1', background: '#f8fafc', fontSize: '14px' }} />
                  </label>
                  <label style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '13px', fontWeight: '600', color: '#475569' }}>
                    मकान नंबर (House No)
                    <input value={editValues.houseNo} onChange={(event) => setEditValues({ ...editValues, houseNo: event.target.value })} style={{ padding: '10px 14px', borderRadius: '10px', border: '1px solid #cbd5e1', background: '#f8fafc', fontSize: '14px' }} />
                  </label>

                  <label style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '13px', fontWeight: '600', color: '#475569' }}>
                    वार्ड (Ward)
                    <input value={editValues.wardNo} onChange={(event) => setEditValues({ ...editValues, wardNo: event.target.value })} style={{ padding: '10px 14px', borderRadius: '10px', border: '1px solid #cbd5e1', background: '#f8fafc', fontSize: '14px' }} />
                  </label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <label style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '13px', fontWeight: '600', color: '#475569' }}>
                      भाग (Part)
                      <input value={editValues.partNo} onChange={(event) => setEditValues({ ...editValues, partNo: event.target.value })} style={{ padding: '10px 14px', borderRadius: '10px', border: '1px solid #cbd5e1', background: '#f8fafc', fontSize: '14px' }} />
                    </label>
                    <label style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '13px', fontWeight: '600', color: '#475569' }}>
                      क्रम (Serial)
                      <input type="number" value={editValues.serialNo} onChange={(event) => setEditValues({ ...editValues, serialNo: event.target.value })} style={{ padding: '10px 14px', borderRadius: '10px', border: '1px solid #cbd5e1', background: '#f8fafc', fontSize: '14px' }} />
                    </label>
                  </div>
                </div>

                {/* SECTION 3: Campaign & Tracking */}
                <h3 style={{ fontSize: '13px', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '16px' }}>प्रचार व संपर्क (Campaign)</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', background: '#eff6ff', padding: '20px', borderRadius: '16px', border: '1px solid #bfdbfe' }}>
                  <label style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '13px', fontWeight: '600', color: '#1e3a8a' }}>
                    फ़ोन नंबर
                    <input value={editValues.phone} onChange={(event) => setEditValues({ ...editValues, phone: event.target.value })} style={{ padding: '10px 14px', borderRadius: '10px', border: '1px solid #93c5fd', background: '#ffffff', fontSize: '14px' }} />
                  </label>
                  <label style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '13px', fontWeight: '600', color: '#1e3a8a' }}>
                    समुदाय / जाति (Tag)
                    <input value={editValues.caste} onChange={(event) => setEditValues({ ...editValues, caste: event.target.value })} style={{ padding: '10px 14px', borderRadius: '10px', border: '1px solid #93c5fd', background: '#ffffff', fontSize: '14px' }} placeholder="उदा. राठौड़" />
                  </label>
                  
                  <label style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '13px', fontWeight: '600', color: '#1e3a8a' }}>
                    समर्थन (Support Status)
                    <select value={editValues.supportStatus} onChange={(event) => setEditValues({ ...editValues, supportStatus: event.target.value })} style={{ padding: '10px 14px', borderRadius: '10px', border: '1px solid #93c5fd', background: '#ffffff', fontSize: '14px' }}>
                      <option value="unmarked">अवर्गीकृत (Unmarked)</option><option value="core">हमारा समर्थन (Core)</option><option value="swing">अनिर्णीत (Swing)</option><option value="opposition">विरोधी (Opposition)</option>
                    </select>
                  </label>
                  <label style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '13px', fontWeight: '600', color: '#1e3a8a' }}>
                    मतदान स्थिति (Surety)
                    <select value={editValues.surety} onChange={(event) => setEditValues({ ...editValues, surety: event.target.value })} style={{ padding: '10px 14px', borderRadius: '10px', border: '1px solid #93c5fd', background: '#ffffff', fontSize: '14px' }}>
                      <option value="">चुनें</option><option value="100% पक्का">100% पक्का</option><option value="50-50">50-50</option><option value="विरोधी">विरोधी</option>
                    </select>
                  </label>

                  <div style={{ gridColumn: '1 / -1', marginTop: '8px' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '14px', color: '#1e40af', fontWeight: '600' }}>
                      <input type="checkbox" checked={editValues.isMigrant} onChange={(event) => setEditValues({ ...editValues, isMigrant: event.target.checked })} style={{ width: '18px', height: '18px', accentColor: '#2563eb' }} />
                      यह एक प्रवासी (Migrant) मतदाता है
                    </label>
                    {editValues.isMigrant && (
                      <div style={{ marginTop: '12px', paddingLeft: '26px' }}>
                        <input value={editValues.migrantLocation} onChange={(event) => setEditValues({ ...editValues, migrantLocation: event.target.value })} placeholder="वर्तमान स्थान (उदा. सूरत, मुंबई)" style={{ padding: '10px 14px', borderRadius: '10px', border: '1px solid #93c5fd', background: '#ffffff', fontSize: '14px', width: '100%' }} />
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {actionMessage && <div style={{ padding: '0 32px' }}><p className="form-error" role="alert" style={{ borderRadius: '8px' }}>{actionMessage}</p></div>}
              
              <div className="modal-actions" style={{ background: '#f8fafc', padding: '24px 32px', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end', gap: '12px', margin: 0 }}>
                <button className="button-secondary" type="button" onClick={() => setEditVoter(null)} style={{ padding: '10px 24px', borderRadius: '12px', fontWeight: '600' }}>रद्द करें</button>
                <button className="button-primary" type="submit" disabled={saving} style={{ padding: '10px 24px', borderRadius: '12px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {saving ? <LoaderCircle size={18} className="spin" /> : <Check size={18} />} सेव करें
                </button>
              </div>
            </form>
          </section>
        </div>
      )}

      {slipVoter && (
        <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setSlipVoter(null); }}>
          <section className="form-modal slip-modal" role="dialog" aria-modal="true" aria-labelledby="slip-title">
            <div className="modal-heading">
              <div><span className="eyebrow-label">VOTER SLIP</span><h2 id="slip-title">डिजिटल मतदाता पर्ची</h2><p>भेजने से पहले नीचे दी गई जानकारी जाँचें।</p></div>
              <button className="icon-button" onClick={() => setSlipVoter(null)} aria-label="बंद करें"><X size={18} /></button>
            </div>
            <div className="slip-preview">
              <div className="slip-preview-title"><strong>{slipVoter.nameHi || slipVoter.nameEn}</strong><span>{slipVoter.epic}</span></div>
              <div className="slip-details">
                <span>वार्ड<strong>{slipVoter.wardNo || '—'}</strong></span>
                <span>मकान<strong>{slipVoter.houseNo || '—'}</strong></span>
                <span>भाग / क्रम<strong>{slipVoter.partNo || '—'} · {slipVoter.serialNo || '—'}</strong></span>
                <span>आयु / लिंग<strong>{slipVoter.age || '—'} · {slipVoter.gender || '—'}</strong></span>
              </div>
            </div>
            <form onSubmit={sendSlip} className="modal-form">
              <label>WhatsApp नंबर<input required inputMode="tel" value={slipPhone} onChange={(event) => setSlipPhone(event.target.value)} placeholder="+91 98765 43210" /></label>
              {actionMessage && <p className="form-error" role="alert">{actionMessage}</p>}
              <div className="modal-actions">
                <button className="button-secondary" type="button" onClick={() => window.print()}><Printer size={15} /> प्रिंट</button>
                <button className="button-primary" type="submit" disabled={sending}>{sending ? <LoaderCircle size={15} className="spin" /> : <Send size={15} />} WhatsApp पर भेजें</button>
              </div>
            </form>
          </section>
        </div>
      )}
    </div>
  );
}
