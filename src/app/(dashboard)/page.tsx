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
  Trash2
} from 'lucide-react';
import { apiFetch, getApiError } from '@/lib/api';
import { createSpeechRecognition, SpeechRecognitionLike } from '@/lib/speech';
import { downloadSlip } from '@/lib/downloadSlip';
import { VoterSlipTemplate, SlipConfig, defaultSlipConfig } from '@/components/VoterSlipTemplate';

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
  const [isAdmin, setIsAdmin] = useState(false);
  const [whatsappQuota, setWhatsappQuota] = useState<{
    whatsappEnabled: boolean;
    whatsappCredits: number;
    whatsappUsed: number;
    canSend: boolean;
    metaConfigured: boolean;
  } | null>(null);
  const [slipConfig, setSlipConfig] = useState<SlipConfig>(defaultSlipConfig);
  const [organizationName, setOrganizationName] = useState<string>('');

  const loadOrgDetails = useCallback(async () => {
    try {
      const selectedOrgId = typeof window !== 'undefined' ? window.localStorage.getItem('selectedClientOrgId') : null;
      const res = await apiFetch('/auth/clients', { cache: 'no-store' });
      if (res.ok) {
        const clients = await res.json();
        if (Array.isArray(clients) && clients.length > 0) {
          if (selectedOrgId && selectedOrgId !== 'all') {
            const matched = clients.find((c: { id: string; name: string }) => c.id === selectedOrgId);
            if (matched) {
              setOrganizationName(matched.name);
              return;
            }
          } else if (clients.length === 1) {
            setOrganizationName(clients[0].name);
            return;
          } else if (!selectedOrgId || selectedOrgId === 'all') {
            setOrganizationName('सभी क्षेत्र / पंचायतें');
            return;
          }
        }
      }
    } catch {}

    const token = typeof window !== 'undefined' ? window.localStorage.getItem('token') : null;
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))) as {
          user?: { organizationName?: string; role?: string };
        };
        if (payload.user?.organizationName) {
          setOrganizationName(payload.user.organizationName);
        }
      } catch {}
    }
  }, []);

  const loadSlipConfig = useCallback(async () => {
    try {
      const res = await apiFetch('/features/slip-config');
      if (res.ok) {
        const data = await res.json();
        if (data.slipConfig) setSlipConfig({ ...defaultSlipConfig, ...data.slipConfig });
        if (data.organizationName && data.organizationName !== 'Default Organization') {
          setOrganizationName((prev) => prev || data.organizationName);
        }
      }
    } catch {}
  }, []);

  const loadWhatsappQuota = useCallback(async () => {
    try {
      const res = await apiFetch('/whatsapp/quota');
      if (res.ok) {
        const data = await res.json();
        setWhatsappQuota(data);
      }
    } catch {}
  }, []);

  useEffect(() => {
    void loadOrgDetails();
    void loadSlipConfig();
    const token = typeof window !== 'undefined' ? window.localStorage.getItem('token') : null;
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))) as {
          user?: { role?: string };
        };
        setIsAdmin(payload?.user?.role === 'admin');
      } catch {}
    }
  }, [loadOrgDetails, loadSlipConfig]);

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

  useEffect(() => {
    const handleClientChange = () => {
      void loadOrgDetails();
      void loadSlipConfig();
      void loadVoters();
    };
    window.addEventListener('client-changed', handleClientChange);
    return () => window.removeEventListener('client-changed', handleClientChange);
  }, [loadOrgDetails, loadSlipConfig, loadVoters]);

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
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.message || 'WhatsApp पर्ची नहीं भेजी जा सकी।');
      }
      void loadWhatsappQuota();
      setSlipVoter(null);
      setActionMessage('Meta API द्वारा पर्ची सफलतापूर्वक भेज दी गई है।');
    } catch (sendError) {
      setActionMessage(sendError instanceof Error ? sendError.message : 'WhatsApp पर्ची नहीं भेजी जा सकी।');
    } finally {
      setSending(false);
    }
  };

  const sendManualSlip = async () => {
    if (!slipVoter) return;
    setSending(true);
    setActionMessage('');
    try {
      const response = await apiFetch('/whatsapp/send-manual', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ voterId: slipVoter._id, phoneNumber: slipPhone }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'WhatsApp पर्ची नहीं भेजी जा सकी।');
      }
      if (typeof data.remainingCredits === 'number') {
        setWhatsappQuota((prev) => prev ? { ...prev, whatsappCredits: data.remainingCredits, whatsappUsed: (prev.whatsappUsed || 0) + 1 } : prev);
      }
      setActionMessage('1 क्रेडिट काटा गया। WhatsApp चैट खोली जा रही है...');
      if (data.waLink) {
        window.open(data.waLink, '_blank');
      }
      setTimeout(() => {
        setSlipVoter(null);
      }, 1200);
    } catch (err) {
      setActionMessage(err instanceof Error ? err.message : 'मैनुअल WhatsApp संदेश नहीं भेजा जा सका।');
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
      await downloadSlip(voter, slipConfig);
      await new Promise(r => setTimeout(r, 400));
    }
    
    setIsDownloading(false);
    setActionMessage(`${selectedVoters.length} पर्चियां सफलतापूर्वक डाउनलोड की गईं।`);
    setSelectedIds([]);
  };

  const deleteSingleVoter = async (voter: Voter) => {
    if (!isAdmin) return;
    const voterName = voter.nameHi || voter.nameEn || voter.epic;
    if (!window.confirm(`क्या आप मतदाता "${voterName}" (EPIC: ${voter.epic}) को निश्चित रूप से हटाना चाहते हैं?`)) {
      return;
    }
    setActionMessage('मतदाता रिकॉर्ड डिलीट किया जा रहा है...');
    try {
      const response = await apiFetch(`/voters/${encodeURIComponent(voter._id)}`, { method: 'DELETE' });
      if (!response.ok) {
        throw new Error(await getApiError(response, 'मतदाता हटाया नहीं जा सका।'));
      }
      setVoters((current) => current.filter((v) => v._id !== voter._id));
      setTotalRecords((prev) => Math.max(0, prev - 1));
      setActionMessage(`मतदाता "${voterName}" सफलतापूर्वक डिलीट कर दिया गया।`);
    } catch (delError) {
      setActionMessage(delError instanceof Error ? delError.message : 'मतदाता हटाया नहीं जा सका।');
    }
  };

  const handleBulkDelete = async () => {
    if (!isAdmin || selectedIds.length === 0) return;
    if (!window.confirm(`क्या आप चुने गए ${selectedIds.length} मतदाताओं को निश्चित रूप से डिलीट करना चाहते हैं?`)) {
      return;
    }
    setActionMessage('रिकॉर्ड्स डिलीट किए जा रहे हैं...');
    try {
      const response = await apiFetch('/voters/bulk-delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: selectedIds }),
      });
      if (!response.ok) {
        throw new Error(await getApiError(response, 'रिकॉर्ड्स डिलीट नहीं हो सके।'));
      }
      setVoters((current) => current.filter((v) => !selectedIds.includes(v._id)));
      setTotalRecords((prev) => Math.max(0, prev - selectedIds.length));
      setActionMessage(`${selectedIds.length} मतदाता सफलतापूर्वक डिलीट कर दिए गए।`);
      setSelectedIds([]);
    } catch (bulkError) {
      setActionMessage(bulkError instanceof Error ? bulkError.message : 'डेटा डिलीट करने में त्रुटि आई।');
    }
  };

  return (
    <div className="directory-page">
      <div className="page-intro">
        <div>
          <div className="eyebrow-label"><span className="eyebrow-mark" /> DIRECTORY</div>
          <h1>मतदाता सूची</h1>
          <p>अपनी क्षेत्रीय मतदाता जानकारी खोजें और अपडेट करें।</p>
        </div>
        <div className="location-chip" title="सक्रिय संगठन / पंचायत (Database से डायनामिक)">
          <MapPin size={14} />
          <span>
            {organizationName || 'क्षेत्रीय पंचायत / वार्ड'}
            {wardFilter ? ` · वार्ड ${wardFilter}` : ''}
          </span>
        </div>
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
              <>
                <button className="button-secondary" type="button" onClick={() => void handleBulkDownload()} disabled={isDownloading}>
                  {isDownloading ? <LoaderCircle size={15} className="spin" /> : <Download size={15} />} पर्चियां डाउनलोड ({selectedIds.length})
                </button>
                {isAdmin && (
                  <button className="button-secondary" style={{ color: '#b91c1c', borderColor: '#fca5a5', background: '#fef2f2' }} type="button" onClick={() => void handleBulkDelete()}>
                    <Trash2 size={15} /> चुने गए हटाएं ({selectedIds.length})
                  </button>
                )}
              </>
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
                    <button className="vc-btn-slip" onClick={() => { setSlipPhone(voter.phone || ''); setSlipVoter(voter); setActionMessage(''); void loadWhatsappQuota(); }} title="WhatsApp पर्ची">💬</button>
                    <button className="vc-btn-slip" style={{ marginLeft: '4px', background: '#eff6ff', color: '#1e3a8a', borderColor: '#bfdbfe' }} onClick={() => void downloadSlip(voter, slipConfig)} title="पर्ची डाउनलोड करें">⬇️</button>
                    {isAdmin && (
                      <button className="vc-btn-slip" style={{ marginLeft: '4px', background: '#fef2f2', color: '#b91c1c', borderColor: '#fecaca' }} onClick={() => void deleteSingleVoter(voter)} title="मतदाता हटाएं">
                        <Trash2 size={15} />
                      </button>
                    )}
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
        <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setEditVoter(null); }}>
          <section className="form-modal" role="dialog" aria-modal="true" aria-labelledby="edit-title" style={{ maxWidth: '680px', width: '95%', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
            <div className="modal-heading">
              <div>
                <span className="eyebrow-label">VOTER DETAILS</span>
                <h2 id="edit-title">मतदाता जानकारी संपादित करें</h2>
                <p style={{ margin: 0, fontSize: '13px', color: '#64748b' }}>{editVoter.nameHi || editVoter.nameEn} · {editVoter.epic}</p>
              </div>
              <button className="icon-button" onClick={() => setEditVoter(null)} aria-label="बंद करें"><X size={18} /></button>
            </div>
            <form onSubmit={saveVoter} className="modal-form" style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              <div style={{ maxHeight: '65vh', overflowY: 'auto', paddingRight: '8px', paddingBottom: '12px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                
                {/* 1. व्यक्तिगत जानकारी */}
                <fieldset style={{ border: 'none', padding: 0, margin: 0 }}>
                  <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.05em', color: '#64748b', textTransform: 'uppercase', marginBottom: '10px' }}>
                    1. व्यक्तिगत जानकारी
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {/* Row 1: EPIC, Age, Gender */}
                    <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1.2fr', gap: '12px' }}>
                      <label style={{ margin: 0, fontSize: '12px', fontWeight: 600, color: '#334155' }}>
                        EPIC (Voter ID)
                        <input value={editValues.epic} onChange={(event) => setEditValues({ ...editValues, epic: event.target.value.toUpperCase().trim() })} style={{ marginTop: '4px', height: '38px' }} />
                      </label>
                      <label style={{ margin: 0, fontSize: '12px', fontWeight: 600, color: '#334155' }}>
                        उम्र
                        <input type="text" inputMode="numeric" pattern="[0-9]*" value={editValues.age} onChange={(event) => setEditValues({ ...editValues, age: event.target.value.replace(/\D/g, '').slice(0, 3) })} placeholder="उदा. 35" style={{ marginTop: '4px', height: '38px' }} />
                      </label>
                      <label style={{ margin: 0, fontSize: '12px', fontWeight: 600, color: '#334155' }}>
                        लिंग
                        <select value={editValues.gender} onChange={(event) => setEditValues({ ...editValues, gender: event.target.value })} style={{ marginTop: '4px', height: '38px' }}>
                          <option value="">चुनें</option>
                          <option value="पुरुष">पुरुष</option>
                          <option value="स्त्री">स्त्री</option>
                          <option value="अन्य">अन्य</option>
                        </select>
                      </label>
                    </div>

                    {/* Row 2: Names */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                      <label style={{ margin: 0, fontSize: '12px', fontWeight: 600, color: '#334155' }}>
                        नाम (English)
                        <input value={editValues.nameEn} onChange={(event) => setEditValues({ ...editValues, nameEn: event.target.value })} style={{ marginTop: '4px', height: '38px' }} />
                      </label>
                      <label style={{ margin: 0, fontSize: '12px', fontWeight: 600, color: '#334155' }}>
                        नाम (हिंदी - केवल देवनागरी)
                        <input value={editValues.nameHi} onChange={(event) => setEditValues({ ...editValues, nameHi: event.target.value.replace(/[a-zA-Z\d]/g, '').replace(/[^\u0900-\u097F\s]/g, '') })} placeholder="केवल हिंदी" style={{ marginTop: '4px', height: '38px' }} />
                      </label>
                    </div>

                    {/* Row 3: Relation, Relative Names */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr 1.2fr', gap: '12px' }}>
                      <label style={{ margin: 0, fontSize: '12px', fontWeight: 600, color: '#334155' }}>
                        संबंध प्रकार
                        <select value={editValues.relationType} onChange={(event) => setEditValues({ ...editValues, relationType: event.target.value })} style={{ marginTop: '4px', height: '38px' }}>
                          <option value="">चुनें</option>
                          <option value="पिता">पिता</option>
                          <option value="पति">पति</option>
                          <option value="माता">माता</option>
                          <option value="पत्नी">पत्नी</option>
                          <option value="अन्य">अन्य</option>
                        </select>
                      </label>
                      <label style={{ margin: 0, fontSize: '12px', fontWeight: 600, color: '#334155' }}>
                        रिश्तेदार का नाम (En)
                        <input value={editValues.relativeNameEn} onChange={(event) => setEditValues({ ...editValues, relativeNameEn: event.target.value })} style={{ marginTop: '4px', height: '38px' }} />
                      </label>
                      <label style={{ margin: 0, fontSize: '12px', fontWeight: 600, color: '#334155' }}>
                        रिश्तेदार का नाम (Hi)
                        <input value={editValues.relativeNameHi} onChange={(event) => setEditValues({ ...editValues, relativeNameHi: event.target.value.replace(/[a-zA-Z\d]/g, '').replace(/[^\u0900-\u097F\s]/g, '') })} placeholder="केवल हिंदी" style={{ marginTop: '4px', height: '38px' }} />
                      </label>
                    </div>
                  </div>
                </fieldset>

                {/* 2. मतदान व निवास */}
                <fieldset style={{ border: 'none', padding: 0, margin: 0 }}>
                  <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.05em', color: '#64748b', textTransform: 'uppercase', marginBottom: '10px' }}>
                    2. मतदान व निवास
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
                    <label style={{ margin: 0, fontSize: '12px', fontWeight: 600, color: '#334155' }}>
                      मकान नंबर
                      <input value={editValues.houseNo} onChange={(event) => setEditValues({ ...editValues, houseNo: event.target.value.replace(/[^\w\d\/\-]/g, '') })} style={{ marginTop: '4px', height: '38px' }} />
                    </label>
                    <label style={{ margin: 0, fontSize: '12px', fontWeight: 600, color: '#334155' }}>
                      वार्ड नं.
                      <input value={editValues.wardNo} onChange={(event) => setEditValues({ ...editValues, wardNo: event.target.value })} style={{ marginTop: '4px', height: '38px' }} />
                    </label>
                    <label style={{ margin: 0, fontSize: '12px', fontWeight: 600, color: '#334155' }}>
                      भाग (Part) नं.
                      <input value={editValues.partNo} onChange={(event) => setEditValues({ ...editValues, partNo: event.target.value })} style={{ marginTop: '4px', height: '38px' }} />
                    </label>
                    <label style={{ margin: 0, fontSize: '12px', fontWeight: 600, color: '#334155' }}>
                      क्रम (Serial) नं.
                      <input type="text" inputMode="numeric" pattern="[0-9]*" value={editValues.serialNo} onChange={(event) => setEditValues({ ...editValues, serialNo: event.target.value.replace(/\D/g, '') })} style={{ marginTop: '4px', height: '38px' }} />
                    </label>
                  </div>
                </fieldset>

                {/* 3. संपर्क व चुनाव प्रबंधन */}
                <fieldset style={{ border: 'none', padding: 0, margin: 0 }}>
                  <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.05em', color: '#64748b', textTransform: 'uppercase', marginBottom: '10px' }}>
                    3. संपर्क व चुनाव प्रबंधन
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                      <label style={{ margin: 0, fontSize: '12px', fontWeight: 600, color: '#334155' }}>
                        फोन नंबर
                        <input type="tel" value={editValues.phone} onChange={(event) => setEditValues({ ...editValues, phone: event.target.value.replace(/\D/g, '').slice(0, 10) })} placeholder="10 अंक" style={{ marginTop: '4px', height: '38px' }} />
                      </label>
                      <label style={{ margin: 0, fontSize: '12px', fontWeight: 600, color: '#334155' }}>
                        जाति / समुदाय
                        <input value={editValues.caste} onChange={(event) => setEditValues({ ...editValues, caste: event.target.value })} style={{ marginTop: '4px', height: '38px' }} />
                      </label>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                      <label style={{ margin: 0, fontSize: '12px', fontWeight: 600, color: '#334155' }}>
                        समर्थन वर्ग
                        <select value={editValues.supportStatus} onChange={(event) => setEditValues({ ...editValues, supportStatus: event.target.value })} style={{ marginTop: '4px', height: '38px' }}>
                          <option value="unmarked">अवर्गीकृत</option>
                          <option value="core">समर्थन चिह्नित</option>
                          <option value="swing">अनिर्णीत चिह्नित</option>
                          <option value="opposition">विरोध चिह्नित</option>
                        </select>
                      </label>
                      <label style={{ margin: 0, fontSize: '12px', fontWeight: 600, color: '#334155' }}>
                        मतदाता स्थिति
                        <select value={editValues.surety} onChange={(event) => setEditValues({ ...editValues, surety: event.target.value })} style={{ marginTop: '4px', height: '38px' }}>
                          <option value="">चुनें</option>
                          <option value="100% पक्का">100% पक्का</option>
                          <option value="50-50">50-50</option>
                          <option value="विरोधी">विरोधी</option>
                          <option value="सामान्य">सामान्य</option>
                        </select>
                      </label>
                      <label style={{ margin: 0, fontSize: '12px', fontWeight: 600, color: '#334155' }}>
                        जिम्मेदार कार्यकर्ता
                        <input value={editValues.assignedWorker} onChange={(event) => setEditValues({ ...editValues, assignedWorker: event.target.value })} style={{ marginTop: '4px', height: '38px' }} />
                      </label>
                    </div>

                    <div style={{ padding: '10px 14px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                      <label className="checkbox-label" style={{ fontWeight: 600, margin: 0, cursor: 'pointer' }}>
                        <input type="checkbox" checked={editValues.isMigrant} onChange={(event) => setEditValues({ ...editValues, isMigrant: event.target.checked })} /> 
                        प्रवासी मतदाता (शहर से बाहर)
                      </label>
                      {editValues.isMigrant && (
                        <label style={{ marginTop: '8px', fontSize: '12px', fontWeight: 600, color: '#334155' }}>
                          वर्तमान स्थान
                          <input value={editValues.migrantLocation} onChange={(event) => setEditValues({ ...editValues, migrantLocation: event.target.value })} placeholder="वैकल्पिक स्थान (उदा. सूरत)" style={{ marginTop: '4px', height: '36px' }} />
                        </label>
                      )}
                    </div>

                    <label className="notes-field" style={{ margin: 0, fontSize: '12px', fontWeight: 600, color: '#334155' }}>
                      अतिरिक्त नोट्स
                      <textarea value={editValues.notes} onChange={(event) => setEditValues({ ...editValues, notes: event.target.value })} rows={2} style={{ marginTop: '4px' }} />
                    </label>
                  </div>
                </fieldset>

              </div>

              {actionMessage && <p className="form-error" role="alert">{actionMessage}</p>}
              <div className="modal-actions">
                <button className="button-secondary" type="button" onClick={() => setEditVoter(null)}>रद्द करें</button>
                <button className="button-primary" type="submit" disabled={saving}>{saving ? <LoaderCircle size={15} className="spin" /> : <Check size={15} />} सेव करें</button>
              </div>
            </form>
          </section>
        </div>
      )}

      {slipVoter && (
        <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setSlipVoter(null); }}>
          <section className="form-modal slip-modal" role="dialog" aria-modal="true" aria-labelledby="slip-title" style={{ maxWidth: '620px', width: '95%', maxHeight: '90vh', overflowY: 'auto' }}>
            <div className="modal-heading">
              <div><span className="eyebrow-label">VOTER SLIP</span><h2 id="slip-title">डिजिटल मतदाता पर्ची</h2><p>भेजने या प्रिंट करने से पहले नीचे पर्ची का पूर्वावलोकन जाँचें।</p></div>
              <button className="icon-button" onClick={() => setSlipVoter(null)} aria-label="बंद करें"><X size={18} /></button>
            </div>

            {whatsappQuota && (
              <div style={{
                margin: '10px 0',
                padding: '10px 14px',
                borderRadius: '8px',
                background: !whatsappQuota.whatsappEnabled ? '#fee2e2' : whatsappQuota.whatsappCredits <= 0 ? '#fef3c7' : '#f0fdf4',
                border: !whatsappQuota.whatsappEnabled ? '1px solid #fecaca' : whatsappQuota.whatsappCredits <= 0 ? '1px solid #fde68a' : '1px solid #bbf7d0',
                fontSize: '13px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '8px'
              }}>
                <span style={{ fontWeight: 600, color: !whatsappQuota.whatsappEnabled ? '#991b1b' : whatsappQuota.whatsappCredits <= 0 ? '#92400e' : '#166534' }}>
                  {!whatsappQuota.whatsappEnabled
                    ? '🚫 संगठन के लिए WhatsApp मैसेजिंग सेवा बंद (Disabled) है'
                    : whatsappQuota.whatsappCredits <= 0
                    ? '⚠️ WhatsApp क्रेडिट समाप्त (0 शेष)'
                    : `💬 उपलब्ध WhatsApp क्रेडिट: ${whatsappQuota.whatsappCredits}`}
                </span>
                <span style={{ fontSize: '11px', color: '#64748b' }}>
                  प्रयुक्त: {whatsappQuota.whatsappUsed || 0} संदेश
                </span>
              </div>
            )}

            <div style={{ margin: '8px 0', width: '100%', display: 'flex', justifyContent: 'center' }}>
              <VoterSlipTemplate voter={slipVoter} config={slipConfig} isInline={true} />
            </div>

            <form onSubmit={sendSlip} className="modal-form">
              <label>WhatsApp नंबर<input required inputMode="tel" value={slipPhone} onChange={(event) => setSlipPhone(event.target.value)} placeholder="+91 98765 43210" /></label>
              {actionMessage && <p className="form-error" role="alert" style={{ whiteSpace: 'pre-wrap' }}>{actionMessage}</p>}
              <div className="modal-actions" style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', justifyContent: 'flex-end', marginTop: '16px' }}>
                <button className="button-secondary" type="button" onClick={() => window.print()}><Printer size={15} /> प्रिंट</button>
                <button
                  type="button"
                  className="button-primary"
                  style={{ background: '#25D366', borderColor: '#22c55e', color: '#fff' }}
                  onClick={() => void sendManualSlip()}
                  disabled={sending || whatsappQuota?.whatsappEnabled === false || (whatsappQuota ? whatsappQuota.whatsappCredits <= 0 : false)}
                  title="WhatsApp Web या App पर सीधे संदेश खोलें (1 क्रेडिट कटेगा)"
                >
                  {sending ? <LoaderCircle size={15} className="spin" /> : <Send size={15} />}
                  WhatsApp चैट खोलें (मैनुअल)
                </button>
                {whatsappQuota?.metaConfigured && (
                  <button
                    className="button-secondary"
                    type="submit"
                    disabled={sending || whatsappQuota?.whatsappEnabled === false || (whatsappQuota ? whatsappQuota.whatsappCredits <= 0 : false)}
                    title="Meta Cloud API से बैकग्राउंड में भेजें"
                  >
                    {sending ? <LoaderCircle size={15} className="spin" /> : <Send size={15} />}
                    Meta API से भेजें
                  </button>
                )}
              </div>
            </form>
          </section>
        </div>
      )}
    </div>
  );
}
