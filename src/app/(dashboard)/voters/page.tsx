'use client';

import React, { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
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
  Trash2,
  Tag,
  Pencil,
  Ticket,
  ChevronDown,
  Phone,
  Wrench,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { apiFetch, getApiError, decodeJwtPayload } from '@/lib/api';
import { createSpeechRecognition, SpeechRecognitionLike } from '@/lib/speech';
import { downloadSlip, downloadBulkSlipsAsZip } from '@/lib/downloadSlip';
import { VoterSlipTemplate, SlipConfig, defaultSlipConfig } from '@/components/VoterSlipTemplate';
import { WhatsAppLogo } from '@/components/WhatsAppLogo';

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
  familyId?: string;
  familyHead?: string;
  notes: string;
  voted: boolean;
}

export default function VoterDirectoryPage() {
  const [voters, setVoters] = useState<Voter[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [relativeNameQuery, setRelativeNameQuery] = useState('');
  const [voiceError, setVoiceError] = useState('');
  const [voiceActiveField, setVoiceActiveField] = useState<'search' | 'relative' | null>(null);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const [houseQuery, setHouseQuery] = useState('');
  const [wardFilter, setWardFilter] = useState('');
  const [supportFilter, setSupportFilter] = useState('');
  const [migrantFilter, setMigrantFilter] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const pageSizeRef = useRef(50);
  const filtersRef = useRef({ ward: '', supportStatus: '', isMigrant: '' });
  const [totalRecords, setTotalRecords] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [familyHouse, setFamilyHouse] = useState('');
  const [familyWard, setFamilyWard] = useState('');
  const [familyPart, setFamilyPart] = useState('');

  // Wards summary from backend
  const [wardsList, setWardsList] = useState<Array<{ _id: string; count: number }>>([]);
  const [totalOrgVoters, setTotalOrgVoters] = useState<number>(0);

  // Separate Modal states for TAG and EDIT
  const [tagVoter, setTagVoter] = useState<Voter | null>(null);
  const [tagFormData, setTagFormData] = useState({
    caste: '',
    surety: '',
    supportStatus: 'unmarked',
    assignedWorker: '',
    familyHead: '',
    isMigrant: false,
    migrantLocation: '',
    notes: '',
  });

  const [editVoter, setEditVoter] = useState<Voter | null>(null);
  const [editFormData, setEditFormData] = useState({
    nameEn: '',
    nameHi: '',
    relativeNameEn: '',
    relativeNameHi: '',
    relationType: 'पिता',
    age: '',
    gender: '',
    epic: '',
    houseNo: '',
    wardNo: '',
    partNo: '',
    serialNo: '',
    phone: '',
  });

  // Slip modal state
  const [slipVoter, setSlipVoter] = useState<Voter | null>(null);
  const modalSlipRef = useRef<HTMLDivElement>(null);
  const [isDownloadingSingleSlip, setIsDownloadingSingleSlip] = useState(false);
  const [workersList, setWorkersList] = useState<Array<{ id: string; name: string }>>([]);
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

  // Load organization details
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
            setOrganizationName('ग्राम पंचायत जेलातरा');
            return;
          }
        }
      }
    } catch {}

    const token = typeof window !== 'undefined' ? window.localStorage.getItem('token') : null;
    if (token) {
      try {
        const payload = decodeJwtPayload<{
          user?: { organizationName?: string; role?: string };
        }>(token);
        if (payload?.user?.organizationName) {
          setOrganizationName(payload.user.organizationName);
        }
      } catch {}
    }
  }, []);

  // Load slip configuration
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

  // Load WhatsApp credits quota
  const loadWhatsappQuota = useCallback(async () => {
    try {
      const res = await apiFetch('/whatsapp/quota');
      if (res.ok) {
        const data = await res.json();
        setWhatsappQuota(data);
      }
    } catch {}
  }, []);

  // Load Wards list and counts
  const loadWardsSummary = useCallback(async () => {
    try {
      const res = await apiFetch('/voters/wards-summary', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.wards)) {
          setWardsList(data.wards);
        }
        if (typeof data.total === 'number') {
          setTotalOrgVoters(data.total);
        }
      }
    } catch {}
  }, []);

  useEffect(() => {
    void loadOrgDetails();
    void loadWardsSummary();
    void loadSlipConfig();

    try {
      const cached = localStorage.getItem('cachedSlipConfig');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed && typeof parsed === 'object') {
          setSlipConfig((prev) => ({ ...prev, ...parsed }));
        }
      }
    } catch {}

    const token = typeof window !== 'undefined' ? window.localStorage.getItem('token') : null;
    if (token) {
      try {
        const payload = decodeJwtPayload<{
          user?: { role?: string };
        }>(token);
        setIsAdmin(payload?.user?.role === 'admin');
      } catch {}
    }
  }, [loadOrgDetails, loadWardsSummary, loadSlipConfig]);

  // Load voter records
  const loadVoters = useCallback(async (
    search = '',
    house = '',
    nextPage = 1,
    selectedWard = '',
    householdPart = '',
    relative = '',
  ) => {
    setLoading(true);
    setError('');
    setSelectedIds([]);
    setFamilyHouse(house);
    setPage(nextPage);

    const activeWard = selectedWard !== undefined ? selectedWard : filtersRef.current.ward;

    const path = house
      ? `/voters/family/${encodeURIComponent(house)}?${new URLSearchParams({ ward: activeWard, part: householdPart })}`
      : `/voters?${new URLSearchParams({
          ...(search ? { search } : {}),
          ...(relative ? { relative } : {}),
          ...(activeWard ? { ward: activeWard } : {}),
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

  // Client switch listener
  useEffect(() => {
    const handleClientChange = () => {
      void loadOrgDetails();
      void loadWardsSummary();
      void loadSlipConfig();
      void loadVoters();
    };
    window.addEventListener('client-changed', handleClientChange);
    return () => window.removeEventListener('client-changed', handleClientChange);
  }, [loadOrgDetails, loadWardsSummary, loadSlipConfig, loadVoters]);

  useEffect(() => () => recognitionRef.current?.stop(), []);

  // Fetch workers list
  useEffect(() => {
    void apiFetch('/users/workers', { cache: 'no-store' })
      .then((res) => (res.ok ? res.json() : []))
      .then((data: unknown) => {
        if (Array.isArray(data)) {
          setWorkersList(
            data
              .map((w: Record<string, unknown>) => ({
                id: String(w.id || w._id || ''),
                name: String(w.name || w.fullName || w.email || ''),
              }))
              .filter((w) => w.name.trim().length > 0)
          );
        }
      })
      .catch(() => {});
  }, []);

  // Calculate dynamic ward range badge (e.g. Ward 1-9)
  const wardRangeText = useMemo(() => {
    if (wardsList.length === 0) return 'Ward 1-9';
    const nums = wardsList.map((w) => Number(w._id)).filter((n) => !isNaN(n));
    if (nums.length > 0) {
      const min = Math.min(...nums);
      const max = Math.max(...nums);
      return `Ward ${min}-${max}`;
    }
    return `Ward 1-${wardsList.length}`;
  }, [wardsList]);

  const allWardsLabel = useMemo(() => {
    if (wardsList.length === 0) return 'All 9 Wards';
    return `All ${wardsList.length} Wards`;
  }, [wardsList]);

  // Handle Ward selector change
  const handleWardChange = (newWard: string) => {
    setWardFilter(newWard);
    filtersRef.current.ward = newWard;
    setPage(1);
    void loadVoters(searchQuery.trim(), houseQuery.trim(), 1, newWard, '', relativeNameQuery.trim());
  };

  // Handle Voice Search
  const startVoiceSearch = (field: 'search' | 'relative') => {
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
      if (transcript) {
        if (field === 'search') {
          setSearchQuery(transcript);
          void loadVoters(transcript, houseQuery.trim(), 1, wardFilter, '', relativeNameQuery.trim());
        } else {
          setRelativeNameQuery(transcript);
          void loadVoters(searchQuery.trim(), houseQuery.trim(), 1, wardFilter, '', transcript);
        }
      }
    };
    recognition.onerror = () => setVoiceError('आवाज़ पहचानी नहीं गई। माइक्रोफ़ोन अनुमति जाँचकर फिर बोलें।');
    recognition.onend = () => {
      setVoiceActiveField(null);
      recognitionRef.current = null;
    };
    recognitionRef.current = recognition;
    setVoiceActiveField(field);
    try {
      recognition.start();
    } catch {
      recognitionRef.current = null;
      setVoiceActiveField(null);
      setVoiceError('Voice search शुरू नहीं हो सकी। कृपया फिर कोशिश करें।');
    }
  };

  const toggleSelected = (id: string) => {
    setSelectedIds((current) =>
      current.includes(id) ? current.filter((selectedId) => selectedId !== id) : [...current, id]
    );
  };

  const selectAll = () => {
    setSelectedIds((current) => (current.length === voters.length ? [] : voters.map((voter) => voter._id)));
  };

  // ===================== SEPARATE TAG MODAL =====================
  const openTagModal = (voter: Voter) => {
    setActionMessage('');
    setTagFormData({
      caste: voter.caste || '',
      surety: voter.surety || '',
      supportStatus: voter.supportStatus || 'unmarked',
      assignedWorker: voter.assignedWorker || '',
      familyHead: voter.familyId || voter.familyHead || '',
      isMigrant: Boolean(voter.isMigrant),
      migrantLocation: voter.migrantLocation || '',
      notes: voter.notes || '',
    });
    setTagVoter(voter);
  };

  const saveTag = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!tagVoter) return;
    setSaving(true);
    setActionMessage('');

    try {
      const payload = {
        ...tagFormData,
        familyId: tagFormData.familyHead,
      };
      const response = await apiFetch(`/voters/${encodeURIComponent(tagVoter._id)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(await getApiError(response, 'टैग विवरण सेव नहीं हुए।'));
      }

      setVoters((current) =>
        current.map((v) => (v._id === tagVoter._id ? { ...v, ...payload } : v))
      );

      setTagVoter(null);
      setActionMessage('मतदाता टैग सफलतापूर्वक अपडेट हो गए!');
      setTimeout(() => setActionMessage(''), 3500);
    } catch (saveError) {
      setActionMessage(saveError instanceof Error ? saveError.message : 'टैग विवरण सेव नहीं हुए।');
    } finally {
      setSaving(false);
    }
  };

  // ===================== SEPARATE EDIT MODAL =====================
  const openEditModal = (voter: Voter) => {
    setActionMessage('');
    setEditFormData({
      nameEn: voter.nameEn || '',
      nameHi: voter.nameHi || '',
      relativeNameEn: voter.relativeNameEn || '',
      relativeNameHi: voter.relativeNameHi || '',
      relationType: voter.relationType || 'पिता',
      age: voter.age?.toString() || '',
      gender: voter.gender || '',
      epic: voter.epic || '',
      houseNo: voter.houseNo || '',
      wardNo: voter.wardNo || '',
      partNo: voter.partNo || '',
      serialNo: voter.serialNo?.toString() || '',
      phone: voter.phone || '',
    });
    setEditVoter(voter);
  };

  const saveEdit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editVoter) return;
    setSaving(true);
    setActionMessage('');

    try {
      const response = await apiFetch(`/voters/${encodeURIComponent(editVoter._id)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editFormData),
      });

      if (!response.ok) {
        throw new Error(await getApiError(response, 'मतदाता विवरण सेव नहीं हुए।'));
      }

      const updatedRecord: Partial<Voter> = {
        ...editFormData,
        age: Number(editFormData.age) || 0,
        serialNo: Number(editFormData.serialNo) || 0,
      };

      setVoters((current) =>
        current.map((v) => (v._id === editVoter._id ? ({ ...v, ...updatedRecord } as Voter) : v))
      );

      setEditVoter(null);
      setActionMessage('मतदाता विवरण सफलतापूर्वक अपडेट हो गए!');
      setTimeout(() => setActionMessage(''), 3500);
    } catch (saveError) {
      setActionMessage(saveError instanceof Error ? saveError.message : 'मतदाता विवरण सेव नहीं हुए।');
    } finally {
      setSaving(false);
    }
  };

  // Open Slip Modal
  const openSlipModal = (voter: Voter) => {
    setActionMessage('');
    setSlipPhone(voter.phone || '');
    setSlipVoter(voter);
    void loadWhatsappQuota();
  };

  // Filter by family / houseNo
  const filterByFamily = (houseNo: string, wardNo = '', partNo = '') => {
    if (!houseNo) return;
    setFamilyHouse(houseNo);
    setFamilyWard(wardNo);
    setFamilyPart(partNo);
    setHouseQuery(houseNo);
    setSearchQuery('');
    setRelativeNameQuery('');
    void loadVoters('', houseNo, 1, wardNo, partNo, '');
  };

  // Toggle family filter in top bar
  const toggleFamilyFilter = () => {
    if (familyHouse) {
      setFamilyHouse('');
      setFamilyWard('');
      setFamilyPart('');
      setHouseQuery('');
      void loadVoters(searchQuery.trim(), '', 1, wardFilter, '', relativeNameQuery.trim());
    } else {
      setActionMessage('परिवार देखने के लिए किसी मतदाता कार्ड पर "👥" बटन दबाएं।');
      setTimeout(() => setActionMessage(''), 4000);
    }
  };

  // WhatsApp send slip
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
      setTimeout(() => setActionMessage(''), 4000);
    } catch (sendError) {
      setActionMessage(sendError instanceof Error ? sendError.message : 'WhatsApp पर्ची नहीं भेजी जा सकी।');
    } finally {
      setSending(false);
    }
  };

  // Manual WhatsApp fallback
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
        setWhatsappQuota((prev) =>
          prev ? { ...prev, whatsappCredits: data.remainingCredits, whatsappUsed: (prev.whatsappUsed || 0) + 1 } : prev
        );
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

  // Bulk download
  const handleBulkDownload = async () => {
    if (selectedIds.length === 0) return;
    setIsDownloading(true);
    setActionMessage('पर्चियों का ZIP तैयार हो रहा है, कृपया प्रतीक्षा करें...');
    const selectedVoters = voters.filter((v) => selectedIds.includes(v._id));

    const success = await downloadBulkSlipsAsZip(selectedVoters, slipConfig, (current, total) => {
      setActionMessage(`ZIP तैयार हो रहा: ${current}/${total} पर्चियां...`);
    });

    setIsDownloading(false);
    if (success) {
      setActionMessage(`${selectedVoters.length} पर्चियों का ZIP सफलतापूर्वक डाउनलोड हुआ।`);
    }
    setSelectedIds([]);
  };

  // Bulk delete (Admin Only)
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

  const totalPages = Math.max(1, Math.ceil(totalRecords / pageSize));
  const startRecord = voters.length > 0 ? (page - 1) * pageSize + 1 : 0;
  const endRecord = voters.length > 0 ? Math.min(page * pageSize, totalRecords) : 0;

  return (
    <div className="smartbooth-container">
      {/* 1. Top Header Bar (PWA banner completely removed) */}
      <div className="smartbooth-top-bar">
        <div className="smartbooth-top-left">
          <div className="smartbooth-org-title">
            <span style={{ fontSize: '18px' }}>🏛️</span>
            <h2>{organizationName || 'ग्राम पंचायत जेलातरा'}</h2>
            <span className="smartbooth-ward-range-pill">{wardRangeText}</span>
          </div>
        </div>

        <div className="smartbooth-top-right">
          <Link href="/workers" className="smartbooth-pill-btn smartbooth-pill-blue">
            <UsersRound size={14} /> कार्यकर्ता
          </Link>
          <Link href="/migrants" className="smartbooth-pill-btn smartbooth-pill-blue">
            <Wrench size={14} /> प्रवासी सूची
          </Link>
          <button
            type="button"
            onClick={toggleFamilyFilter}
            className={`smartbooth-pill-btn smartbooth-pill-amber ${familyHouse ? 'is-active' : ''}`}
            title={familyHouse ? 'परिवार फ़िल्टर हटाएं' : 'परिवार मोड'}
          >
            <span>🏛️</span> परिवार {familyHouse ? `(${familyHouse} ✕)` : ''}
          </button>
          <div className="smartbooth-count-pill">
            {loading ? (
              'लोड हो रहा है...'
            ) : (
              `${totalRecords.toLocaleString('en-IN')} मतदाता मिले • पृष्ठ ${page}/${totalPages} (${startRecord}-${endRecord})`
            )}
          </div>
        </div>
      </div>

      {/* 2. Side-by-Side Search Row */}
      <div className="smartbooth-search-row">
        {/* Name / EPIC Search */}
        <div className="smartbooth-search-field">
          <Search size={16} className="smartbooth-field-icon" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setPage(1);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                void loadVoters(searchQuery.trim(), houseQuery.trim(), 1, wardFilter, '', relativeNameQuery.trim());
              }
            }}
            placeholder="मतदाता का नाम या EPIC लिखें..."
            aria-label="मतदाता का नाम या EPIC लिखें"
          />
          <div className="smartbooth-field-actions">
            <button
              type="button"
              onClick={() => startVoiceSearch('search')}
              className={`smartbooth-icon-btn ${voiceActiveField === 'search' ? 'is-recording' : ''}`}
              title="बोलकर खोजें"
              aria-label="बोलकर खोजें"
            >
              <Mic size={15} />
            </button>
            {searchQuery && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  void loadVoters('', houseQuery.trim(), 1, wardFilter, '', relativeNameQuery.trim());
                }}
                className="smartbooth-icon-btn"
                title="साफ़ करें"
                aria-label="साफ़ करें"
              >
                <X size={15} />
              </button>
            )}
          </div>
        </div>

        {/* Relative Name Search */}
        <div className="smartbooth-search-field">
          <UsersRound size={16} className="smartbooth-field-icon" />
          <input
            type="text"
            value={relativeNameQuery}
            onChange={(e) => {
              setRelativeNameQuery(e.target.value);
              setPage(1);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                void loadVoters(searchQuery.trim(), houseQuery.trim(), 1, wardFilter, '', relativeNameQuery.trim());
              }
            }}
            placeholder="पिता / पति का नाम (वैकल्पिक)..."
            aria-label="पिता / पति का नाम"
          />
          <div className="smartbooth-field-actions">
            <button
              type="button"
              onClick={() => startVoiceSearch('relative')}
              className={`smartbooth-icon-btn ${voiceActiveField === 'relative' ? 'is-recording' : ''}`}
              title="बोलकर खोजें"
              aria-label="बोलकर खोजें"
            >
              <Mic size={15} />
            </button>
            {relativeNameQuery && (
              <button
                type="button"
                onClick={() => {
                  setRelativeNameQuery('');
                  void loadVoters(searchQuery.trim(), houseQuery.trim(), 1, wardFilter, '', '');
                }}
                className="smartbooth-icon-btn"
                title="साफ़ करें"
                aria-label="साफ़ करें"
              >
                <X size={15} />
              </button>
            )}
          </div>
        </div>
      </div>

      {voiceError && (
        <div style={{ color: '#dc2626', fontSize: '12.5px', marginBottom: '8px', padding: '0 4px' }}>
          {voiceError}
        </div>
      )}

      {/* 3. Full-width Ward Selector Bar */}
      <div className="smartbooth-ward-bar">
        <div className="smartbooth-ward-select-wrapper">
          <MapPin size={16} className="smartbooth-ward-icon" />
          <span className="smartbooth-ward-label">वार्ड (Ward):</span>
          <select
            value={wardFilter}
            onChange={(e) => handleWardChange(e.target.value)}
            className="smartbooth-ward-select"
            aria-label="वार्ड चुनें"
          >
            <option value="">
              सभी वार्ड ({allWardsLabel} — कुल {(totalOrgVoters || totalRecords).toLocaleString('en-IN')} मतदाता)
            </option>
            {wardsList.map((w) => (
              <option key={w._id} value={w._id}>
                वार्ड {w._id} ({w.count.toLocaleString('en-IN')} मतदाता)
              </option>
            ))}
          </select>
          <ChevronDown size={16} className="smartbooth-ward-arrow" />
        </div>
      </div>

      {/* Action Notice */}
      {actionMessage && (
        <div
          style={{
            padding: '10px 14px',
            background: '#ecfdf5',
            border: '1px solid #a7f3d0',
            color: '#065f46',
            borderRadius: '8px',
            fontSize: '13px',
            marginBottom: '14px',
            fontWeight: 600,
          }}
        >
          {actionMessage}
        </div>
      )}

      {/* 4. 3-Column Voter Cards Grid */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: '#64748b' }}>
          <LoaderCircle size={28} className="spin" style={{ margin: '0 auto 12px' }} />
          <p style={{ fontSize: '14px', fontWeight: 600 }}>मतदाता रिकॉर्ड लोड हो रहे हैं…</p>
        </div>
      ) : error ? (
        <div style={{ textAlign: 'center', padding: '50px 20px', background: '#fef2f2', borderRadius: '12px' }}>
          <p style={{ color: '#b91c1c', fontWeight: 600, marginBottom: '10px' }}>{error}</p>
          <button
            type="button"
            className="smartbooth-pill-btn smartbooth-pill-blue"
            onClick={() => void loadVoters()}
          >
            फिर से कोशिश करें
          </button>
        </div>
      ) : voters.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', background: '#f8fafc', borderRadius: '12px' }}>
          <FileText size={32} color="#94a3b8" style={{ margin: '0 auto 10px' }} />
          <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#334155', margin: '0 0 6px' }}>कोई मतदाता नहीं मिला</h3>
          <p style={{ fontSize: '13px', color: '#64748b', margin: 0 }}>खोज या वार्ड बदलकर दोबारा कोशिश करें।</p>
        </div>
      ) : (
        <>
          {/* Family Filter Banner (ss5) */}
          {familyHouse && (
            <div
              style={{
                background: '#0f172a',
                borderRadius: '16px',
                border: '1px solid #334155',
                padding: '16px 20px',
                marginBottom: '20px',
                boxShadow: '0 8px 24px rgba(15, 23, 42, 0.35)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '14px',
                fontFamily: "var(--font-anek-devanagari), 'Anek Devanagari', sans-serif",
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div
                  style={{
                    width: '44px',
                    height: '44px',
                    borderRadius: '12px',
                    background: 'rgba(255, 255, 255, 0.1)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#ffffff',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                  }}
                >
                  <UsersRound size={22} />
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <h2 style={{ fontSize: '17px', fontWeight: 800, color: '#ffffff', margin: 0 }}>
                      परिवार फ़िल्टर दृश्य (Family Filter View)
                    </h2>
                    <span
                      style={{
                        fontSize: '11px',
                        fontWeight: 700,
                        background: '#2563eb',
                        color: '#ffffff',
                        padding: '2px 9px',
                        borderRadius: '20px',
                      }}
                    >
                      {voters.filter((v) => v.houseNo === familyHouse).length || voters.length} सदस्य
                    </span>
                  </div>
                  <div style={{ fontSize: '12.5px', color: '#94a3b8', marginTop: '3px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span>🏡 वार्ड {familyWard || wardFilter || 'सभी'}</span>
                    <span>·</span>
                    <span>मकान #{familyHouse}</span>
                    {familyPart && (
                      <>
                        <span>·</span>
                        <span>भाग {familyPart}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  className="button-primary"
                  style={{
                    background: '#2563eb',
                    borderColor: '#1d4ed8',
                    color: '#ffffff',
                    padding: '7px 14px',
                    fontSize: '12.5px',
                    fontWeight: 700,
                    borderRadius: '8px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                  onClick={() => {
                    setSelectedIds(voters.map((v) => v._id));
                  }}
                >
                  <Check size={14} /> सभी परिवार चुनें
                </button>

                <button
                  type="button"
                  className="button-secondary"
                  style={{
                    background: 'rgba(255, 255, 255, 0.1)',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    color: '#f8fafc',
                    padding: '7px 14px',
                    fontSize: '12.5px',
                    fontWeight: 600,
                    borderRadius: '8px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                  onClick={toggleFamilyFilter}
                >
                  <X size={14} /> खोज पर वापस जाएं
                </button>
              </div>
            </div>
          )}

          <div className="smartbooth-voter-grid">
            {voters.map((voter, idx) => {
              const isSelected = selectedIds.includes(voter._id);
              const isFirstProbable = Boolean(familyHouse && voter.houseNo !== familyHouse && (idx === 0 || voters[idx - 1]?.houseNo === familyHouse));
              return (
                <React.Fragment key={voter._id}>
                  {isFirstProbable && (
                    <div
                      style={{
                        gridColumn: '1 / -1',
                        margin: '18px 0 6px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        borderTop: '1px dashed #cbd5e1',
                        paddingTop: '16px',
                      }}
                    >
                      <span style={{ fontSize: '15px' }}>🔗</span>
                      <h3 style={{ fontSize: '14.5px', fontWeight: 700, color: '#334155', margin: 0 }}>
                        संभावित संबंधी / नजदीकी सदस्य ({voters.filter((v) => v.houseNo !== familyHouse).length})
                      </h3>
                    </div>
                  )}

                  <div
                    className={`smartbooth-voter-card ${isSelected ? 'is-selected' : ''}`}
                    onClick={() => toggleSelected(voter._id)}
                  >
                    {/* Top Header Row */}
                    <div className="sb-card-top">
                      <div className="sb-card-badges">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelected(voter._id)}
                          onClick={(e) => e.stopPropagation()}
                          className="sb-checkbox"
                          aria-label={`${voter.nameHi || voter.nameEn} चुनें`}
                        />
                        <span className="sb-badge-ward">वार्ड {voter.wardNo || '—'}</span>
                        <span className="sb-badge-part">
                          भाग {voter.partNo || '—'} • क्र. {voter.serialNo || '—'}
                        </span>
                      </div>
                      <div className="sb-card-meta">
                        <span>
                          मकान: <strong>{voter.houseNo || '—'}</strong>
                        </span>
                        <span>
                          उम्र: <strong>{voter.age || '—'} वर्ष</strong>
                        </span>
                      </div>
                    </div>

                    {/* Middle Info (shows En / Hi format as in ss5) */}
                    <div className="sb-card-info">
                      <h3 className="sb-voter-name">
                        {voter.nameEn && voter.nameHi ? `${voter.nameEn} / ${voter.nameHi}` : (voter.nameHi || voter.nameEn || '—')}
                      </h3>
                      <p className="sb-voter-relative">
                        <span className="sb-relative-label">{voter.relationType || 'पिता'}: </span>
                        <span className="sb-relative-val">
                          {voter.relativeNameEn && voter.relativeNameHi ? `${voter.relativeNameEn} / ${voter.relativeNameHi}` : (voter.relativeNameHi || voter.relativeNameEn || '—')}
                        </span>
                      </p>
                    </div>

                    {/* Tags Row */}
                    <div className="sb-card-tags">
                      {familyHouse && voter.houseNo !== familyHouse && (
                        <span style={{ fontSize: '11px', fontWeight: 600, background: '#fef3c7', color: '#92400e', padding: '2px 7px', borderRadius: '4px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          🔗 संबंधी · निकटवर्ती क्र. {voter.serialNo || '—'}
                        </span>
                      )}
                      {voter.caste && <span className="sb-tag-caste">{voter.caste}</span>}
                      {voter.phone && (
                        <span className="sb-tag-phone">
                          <Phone size={10} /> {voter.phone}
                        </span>
                      )}
                      {voter.supportStatus && voter.supportStatus !== 'unmarked' && (
                        <span className={`sb-tag-support sb-support-${voter.supportStatus}`}>
                          {voter.supportStatus === 'core'
                            ? '1- 100% पक्का समर्थक'
                            : voter.supportStatus === 'swing'
                            ? '2- 50/50 स्विंग वोटर'
                            : voter.supportStatus === 'opposition'
                            ? '3- एंटी वोटर'
                            : '4- सामान्य'}
                        </span>
                      )}
                      {voter.isMigrant && (
                        <span className="sb-tag-migrant">
                          प्रवासी {voter.migrantLocation ? `(${voter.migrantLocation})` : ''}
                        </span>
                      )}
                    </div>

                    {/* Bottom Actions Row: TAG / EDIT, FAMILY, PARCHI */}
                    <div className="sb-card-bottom">
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            openTagModal(voter);
                          }}
                          className="sb-btn-tag"
                          title="मतदाता चुनाव टैग व संपादन"
                          style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                        >
                          <Pencil size={12} /> टैग / एडिट
                        </button>
                      </div>

                      <div className="sb-card-bottom-right">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            filterByFamily(voter.houseNo, voter.wardNo, voter.partNo);
                          }}
                          className="sb-btn-family"
                          title={`मकान ${voter.houseNo} का परिवार देखें`}
                        >
                          <UsersRound size={15} />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            openSlipModal(voter);
                          }}
                          className="sb-btn-parchi"
                          title="मतदाता पर्ची देखें व WhatsApp भेजें"
                          style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}
                        >
                          <WhatsAppLogo size={14} color="#ffffff" /> पर्ची
                        </button>
                      </div>
                    </div>

                    {/* Selected Indicator Row (ss2) */}
                    {isSelected && (
                      <div className="sb-selected-row">
                        <span className="sb-selected-status">✓ चुना गया (Selected)</span>
                        <span className="sb-selected-hint">टैप कर हटाएं</span>
                      </div>
                    )}
                  </div>
                </React.Fragment>
              );
            })}
          </div>
        </>
      )}

      {/* 5. Pagination Bar */}
      {!loading && totalRecords > pageSize && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '10px',
            padding: '10px 16px',
            marginTop: '16px',
            flexWrap: 'wrap',
            gap: '10px',
          }}
        >
          <div style={{ fontSize: '13px', color: '#64748b', fontWeight: 600 }}>
            {startRecord}–{endRecord} / कुल {totalRecords.toLocaleString('en-IN')} मतदाता
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              type="button"
              className="smartbooth-pill-btn"
              style={{ background: '#f8fafc', border: '1px solid #cbd5e1', color: page <= 1 ? '#94a3b8' : '#334155' }}
              onClick={() => void loadVoters(searchQuery.trim(), houseQuery.trim(), page - 1, wardFilter, '', relativeNameQuery.trim())}
              disabled={page <= 1}
            >
              <ChevronLeft size={14} /> पिछला
            </button>
            <span style={{ fontSize: '13px', fontWeight: 700, color: '#1e293b', padding: '0 6px' }}>
              पृष्ठ {page} / {totalPages}
            </span>
            <button
              type="button"
              className="smartbooth-pill-btn"
              style={{
                background: '#f8fafc',
                border: '1px solid #cbd5e1',
                color: page >= totalPages ? '#94a3b8' : '#334155',
              }}
              onClick={() => void loadVoters(searchQuery.trim(), houseQuery.trim(), page + 1, wardFilter, '', relativeNameQuery.trim())}
              disabled={page >= totalPages}
            >
              अगला <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}

      {/* Floating Bottom Action Toolbar (ss2) */}
      {selectedIds.length > 0 && (
        <div className="sb-floating-bottom-bar" role="toolbar" aria-label="चुने गए मतदाताओं के लिए क्रियाएं">
          <div className="sb-floating-count">
            <span className="sb-floating-dot" /> {selectedIds.length} चुना गया
          </div>

          <button
            type="button"
            className="sb-floating-btn sb-floating-edit"
            onClick={() => {
              const target = voters.find((v) => selectedIds.includes(v._id));
              if (target) openEditModal(target);
            }}
            title="चुने गए मतदाता को संपादित करें"
          >
            <Pencil size={13} /> एडिट
          </button>

          <button
            type="button"
            className="sb-floating-btn sb-floating-family"
            onClick={() => {
              const target = voters.find((v) => selectedIds.includes(v._id));
              if (target) filterByFamily(target.houseNo, target.wardNo, target.partNo);
            }}
            title="चुने गए मतदाता का परिवार देखें"
          >
            <UsersRound size={14} /> परिवार
          </button>

          <button
            type="button"
            className="sb-floating-btn sb-floating-parchi"
            onClick={() => {
              if (selectedIds.length === 1) {
                const target = voters.find((v) => selectedIds.includes(v._id));
                if (target) openSlipModal(target);
              } else {
                void handleBulkDownload();
              }
            }}
            title={selectedIds.length === 1 ? 'पर्ची देखें व WhatsApp भेजें' : `${selectedIds.length} पर्चियों का बल्क ZIP डाउनलोड करें`}
            disabled={isDownloading}
          >
            {isDownloading ? (
              <LoaderCircle size={14} className="spin" />
            ) : selectedIds.length > 1 ? (
              <Download size={14} color="#ffffff" />
            ) : (
              <WhatsAppLogo size={14} color="#ffffff" />
            )}
            <span>
              {isDownloading
                ? 'ZIP बन रहा...'
                : selectedIds.length > 1
                ? `बल्क ZIP डाउनलोड (${selectedIds.length})`
                : 'पर्ची देखें / भेजें'}
            </span>
          </button>

          {isAdmin && (
            <button
              type="button"
              className="sb-floating-btn sb-floating-delete"
              onClick={() => void handleBulkDelete()}
              title="चुने गए रिकॉर्ड हटाएं"
            >
              <Trash2 size={13} /> हटाएं
            </button>
          )}

          <button
            type="button"
            className="sb-floating-close"
            onClick={() => setSelectedIds([])}
            title="चयन हटाएं"
            aria-label="चयन हटाएं"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* 6. Digital Slip Preview Modal */}
      {slipVoter && (
        <div
          className="modal-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setSlipVoter(null);
          }}
        >
          <section
            className="form-modal slip-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="slip-title"
            style={{ maxWidth: '620px', width: '95%', maxHeight: '90vh', overflowY: 'auto' }}
          >
            <div className="modal-heading">
              <div>
                <span className="eyebrow-label">VOTER SLIP PREVIEW</span>
                <h2 id="slip-title">डिजिटल मतदाता पर्ची</h2>
                <p>भेजने या प्रिंट करने से पहले नीचे पर्ची का पूर्वावलोकन जाँचें।</p>
              </div>
              <button className="icon-button" onClick={() => setSlipVoter(null)} aria-label="बंद करें">
                <X size={18} />
              </button>
            </div>

            {whatsappQuota && (
              <div
                style={{
                  margin: '10px 0',
                  padding: '10px 14px',
                  borderRadius: '8px',
                  background: !whatsappQuota.whatsappEnabled
                    ? '#fee2e2'
                    : whatsappQuota.whatsappCredits <= 0
                    ? '#fef3c7'
                    : '#f0fdf4',
                  border: !whatsappQuota.whatsappEnabled
                    ? '1px solid #fecaca'
                    : whatsappQuota.whatsappCredits <= 0
                    ? '1px solid #fde68a'
                    : '1px solid #bbf7d0',
                  fontSize: '13px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '8px',
                }}
              >
                <span
                  style={{
                    fontWeight: 600,
                    color: !whatsappQuota.whatsappEnabled
                      ? '#991b1b'
                      : whatsappQuota.whatsappCredits <= 0
                      ? '#92400e'
                      : '#166534',
                  }}
                >
                  {!whatsappQuota.whatsappEnabled
                    ? 'संगठन के लिए WhatsApp सेवा बंद है'
                    : whatsappQuota.whatsappCredits <= 0
                    ? 'WhatsApp क्रेडिट समाप्त (0 शेष)'
                    : `उपलब्ध WhatsApp क्रेडिट: ${whatsappQuota.whatsappCredits}`}
                </span>
                <span style={{ fontSize: '11px', color: '#64748b' }}>
                  प्रयुक्त: {whatsappQuota.whatsappUsed || 0} संदेश
                </span>
              </div>
            )}

            {/* Voter Slip Preview */}
            <div ref={modalSlipRef} style={{ margin: '8px 0', width: '100%', display: 'flex', justifyContent: 'center' }}>
              <VoterSlipTemplate voter={slipVoter} config={slipConfig} isInline={true} />
            </div>

            <form onSubmit={sendSlip} className="modal-form">
              <label>
                WhatsApp नंबर
                <input
                  required
                  inputMode="tel"
                  value={slipPhone}
                  onChange={(event) => setSlipPhone(event.target.value)}
                  placeholder="+91 98765 43210"
                />
              </label>

              {actionMessage && (
                <p className="form-error" role="alert" style={{ whiteSpace: 'pre-wrap' }}>
                  {actionMessage}
                </p>
              )}

              <div
                className="modal-actions"
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '8px',
                  justifyContent: 'flex-end',
                  marginTop: '16px',
                }}
              >
                <button className="button-secondary" type="button" onClick={() => window.print()}>
                  <Printer size={15} /> प्रिंट
                </button>
                <button
                  type="button"
                  className="button-secondary"
                  disabled={isDownloadingSingleSlip}
                  onClick={async () => {
                    setIsDownloadingSingleSlip(true);
                    try {
                      await downloadSlip(slipVoter, slipConfig, modalSlipRef.current);
                    } finally {
                      setIsDownloadingSingleSlip(false);
                    }
                  }}
                >
                  {isDownloadingSingleSlip ? <LoaderCircle size={15} className="spin" /> : <Download size={15} />}
                  {isDownloadingSingleSlip ? 'डाउनलोड हो रहा है...' : 'डाउनलोड'}
                </button>
                <button
                  type="button"
                  className="button-secondary"
                  style={{ borderColor: '#22c55e', color: '#166534', background: '#f0fdf4', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                  onClick={() => void sendManualSlip()}
                  title="सीधे WhatsApp में पर्ची संदेश खोलें"
                >
                  <WhatsAppLogo size={15} color="#25D366" /> डायरेक्ट WhatsApp
                </button>
                <button
                  type="submit"
                  className="button-primary"
                  style={{ background: '#25D366', borderColor: '#22c55e', color: '#fff', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                  disabled={
                    sending ||
                    whatsappQuota?.whatsappEnabled === false ||
                    (whatsappQuota ? whatsappQuota.whatsappCredits <= 0 : false)
                  }
                  title="Meta Cloud API से आधिकारिक WhatsApp पर्ची भेजें"
                >
                  {sending ? <LoaderCircle size={15} className="spin" /> : <WhatsAppLogo size={16} color="#ffffff" />}
                  WhatsApp पर्ची भेजें (Meta API)
                </button>
              </div>
            </form>
          </section>
        </div>
      )}

      {/* 7. DEDICATED TAG MODAL (ss3 UI) */}
      {tagVoter && (
        <div
          className="modal-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setTagVoter(null);
          }}
        >
          <section
            className="form-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="tag-title"
            style={{ maxWidth: '580px', width: '95%', maxHeight: '90vh', display: 'flex', flexDirection: 'column', borderRadius: '12px' }}
          >
            <div className="modal-heading">
              <div>
                <span className="eyebrow-label" style={{ color: '#047857', fontWeight: 700, fontSize: '11px', letterSpacing: '0.05em' }}>
                  VOTER CAMPAIGN TAGS
                </span>
                <h2 id="tag-title" style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '18px', fontWeight: 700, color: '#0f172a', margin: '4px 0' }}>
                  <Tag size={18} color="#047857" /> मतदाता चुनाव टैग व प्रबंधन
                </h2>
                <p style={{ margin: 0, fontSize: '13px', color: '#64748b' }}>
                  {tagVoter.nameHi || tagVoter.nameEn} • EPIC: {tagVoter.epic || 'N/A'} • भाग: {tagVoter.partNo || '-'} / क्र.: {tagVoter.serialNo || '-'}
                </p>
              </div>
              <button className="icon-button" onClick={() => setTagVoter(null)} aria-label="बंद करें">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={saveTag} className="modal-form" style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', paddingTop: '14px' }}>
              <div
                style={{
                  maxHeight: '62vh',
                  overflowY: 'auto',
                  paddingRight: '6px',
                  paddingBottom: '12px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '14px',
                }}
              >
                {/* 1. Voter Slip Studio Quick Action (ss1) */}
                <div
                  style={{
                    background: '#f0fdf4',
                    border: '1px solid #bbf7d0',
                    borderRadius: '10px',
                    padding: '12px 14px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '10px',
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', fontWeight: 700, color: '#166534', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      <Ticket size={13} /> VOTER SLIP STUDIO
                    </div>
                    <div style={{ fontSize: '14px', fontWeight: 700, color: '#14532d', marginTop: '2px' }}>
                      डिजिटल मतदाता पर्ची
                    </div>
                    <div style={{ fontSize: '12px', color: '#166534' }}>
                      आधिकारिक चुनाव आयोग प्रारूप व प्रत्याशी ब्रांडिंग के साथ पर्ची देखें व भेजें
                    </div>
                  </div>
                  <button
                    type="button"
                    className="button-primary"
                    style={{
                      background: '#059669',
                      borderColor: '#047857',
                      fontSize: '12.5px',
                      padding: '7px 14px',
                      borderRadius: '8px',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                    onClick={() => {
                      if (tagVoter) {
                        const target = tagVoter;
                        setTagVoter(null);
                        openSlipModal(target);
                      }
                    }}
                  >
                    <WhatsAppLogo size={14} color="#fff" /> पर्ची देखें / भेजें
                  </button>
                </div>

                {/* 2. Community Tag Input & Chips (ss2) */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '6px' }}>
                    <label style={{ margin: 0, fontSize: '12.5px', fontWeight: 700, color: '#1e293b' }}>
                      समुदाय / उपनाम टैग (COMMUNITY TAG):
                    </label>
                    <span style={{ fontSize: '11.5px', color: '#64748b' }}>
                      सुझाव चिप पर टैप करें
                    </span>
                  </div>

                  <input
                    value={tagFormData.caste}
                    onChange={(e) => setTagFormData({ ...tagFormData, caste: e.target.value })}
                    placeholder="उदा: जाट, गुर्जर, भील, कुम्हार, खाती, राजपूत..."
                    style={{
                      width: '100%',
                      height: '42px',
                      borderRadius: '8px',
                      border: '1.5px solid #cbd5e1',
                      padding: '0 14px',
                      fontSize: '13.5px',
                      marginBottom: '10px',
                      outline: 'none',
                    }}
                  />

                  {/* Suggestion Chips */}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {[
                      'चौधरी (Choudhary)',
                      'भील (Bheel)',
                      'Aggarwal / Bania',
                      'राजपूत (Rajput)',
                      'ब्राह्मण (Brahmin)',
                      'राव',
                      'लोहार (Lohar)',
                      'देवासी (Dewasi/Rabari)',
                      'Maheshwari',
                      'जाट (Jat)',
                      'बिश्नोई (Bishnoi)',
                    ].map((chip) => {
                      const isSelected = tagFormData.caste === chip || (tagFormData.caste && tagFormData.caste.includes(chip.split(' ')[0]));
                      return (
                        <button
                          key={chip}
                          type="button"
                          onClick={() => {
                            if (tagFormData.caste === chip) {
                              setTagFormData({ ...tagFormData, caste: '' });
                            } else {
                              setTagFormData({ ...tagFormData, caste: chip });
                            }
                          }}
                          style={{
                            padding: '6px 12px',
                            borderRadius: '20px',
                            fontSize: '12px',
                            fontWeight: 600,
                            border: isSelected ? '1.5px solid #a855f7' : '1px solid #e2e8f0',
                            background: isSelected ? '#f3e8ff' : '#f8fafc',
                            color: isSelected ? '#6b21a8' : '#334155',
                            cursor: 'pointer',
                            transition: 'all 0.15s ease',
                          }}
                        >
                          {chip}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 3. Assigned Worker Dropdown (ss3) */}
                <div>
                  <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, color: '#1e293b', marginBottom: '6px' }}>
                    दायित्व सौंपा गया कार्यकर्ता (ASSIGNED WORKER):
                  </label>
                  <div style={{ position: 'relative' }}>
                    <select
                      value={tagFormData.assignedWorker}
                      onChange={(e) => setTagFormData({ ...tagFormData, assignedWorker: e.target.value })}
                      style={{
                        width: '100%',
                        height: '42px',
                        borderRadius: '8px',
                        border: '1.5px solid #cbd5e1',
                        padding: '0 36px 0 14px',
                        fontSize: '13.5px',
                        background: '#ffffff',
                        color: tagFormData.assignedWorker ? '#0f172a' : '#64748b',
                        fontWeight: tagFormData.assignedWorker ? 600 : 400,
                        cursor: 'pointer',
                        appearance: 'none',
                      }}
                    >
                      <option value="">-- कोई कार्यकर्ता नहीं (Unassigned) --</option>
                      {workersList.map((w) => (
                        <option key={w.id} value={w.name}>
                          {w.name}
                        </option>
                      ))}
                    </select>
                    <ChevronDown
                      size={18}
                      style={{
                        position: 'absolute',
                        right: '12px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        pointerEvents: 'none',
                        color: '#64748b',
                      }}
                    />
                  </div>
                </div>

                {/* 4. Family / Head Name & Notes (ss4) */}
                <div>
                  <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, color: '#1e293b', marginBottom: '6px' }}>
                    👨‍👩‍👧‍👦 परिवार / मुखिया का नाम (FAMILY / HEAD NAME):
                  </label>
                  <input
                    value={tagFormData.familyHead}
                    onChange={(e) => setTagFormData({ ...tagFormData, familyHead: e.target.value })}
                    placeholder="उदा: जीवराज नाथू कुम्हार का घर"
                    style={{
                      width: '100%',
                      height: '42px',
                      borderRadius: '8px',
                      border: '1.5px solid #cbd5e1',
                      padding: '0 14px',
                      fontSize: '13.5px',
                      outline: 'none',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, color: '#1e293b', marginBottom: '6px' }}>
                    टिप्पणी / नोट्स (NOTES):
                  </label>
                  <input
                    value={tagFormData.notes}
                    onChange={(e) => setTagFormData({ ...tagFormData, notes: e.target.value })}
                    placeholder="उदा: 8 बजे कॉल करें / बाहर रहते हैं / वाहन चाहिए"
                    style={{
                      width: '100%',
                      height: '42px',
                      borderRadius: '8px',
                      border: '1.5px solid #cbd5e1',
                      padding: '0 14px',
                      fontSize: '13.5px',
                      outline: 'none',
                    }}
                  />
                </div>

                {/* Support & Surety Class in 2 columns */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
                  <label style={{ margin: 0, fontSize: '12px', fontWeight: 600, color: '#334155', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    समर्थन वर्ग
                    <select
                      value={tagFormData.supportStatus}
                      onChange={(e) => setTagFormData({ ...tagFormData, supportStatus: e.target.value })}
                      style={{ height: '38px', borderRadius: '6px', border: '1px solid #cbd5e1', padding: '0 8px' }}
                    >
                      <option value="unmarked">4- सामान्य</option>
                      <option value="core">1- 100% पक्का समर्थक</option>
                      <option value="swing">2- 50/50 स्विंग वोटर</option>
                      <option value="opposition">3- एंटी वोटर</option>
                    </select>
                  </label>

                  <label style={{ margin: 0, fontSize: '12px', fontWeight: 600, color: '#334155', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    मतदाता स्थिति
                    <select
                      value={tagFormData.surety}
                      onChange={(e) => setTagFormData({ ...tagFormData, surety: e.target.value })}
                      style={{ height: '38px', borderRadius: '6px', border: '1px solid #cbd5e1', padding: '0 8px' }}
                    >
                      <option value="">चुनें</option>
                      <option value="100% पक्का">100% पक्का</option>
                      <option value="50-50">50-50</option>
                      <option value="विरोधी">विरोधी</option>
                      <option value="सामान्य">सामान्य</option>
                    </select>
                  </label>
                </div>

                {/* Migrant Box */}
                <div
                  style={{
                    padding: '14px 18px',
                    background: '#f8fafc',
                    borderRadius: '8px',
                    border: '1px solid #e2e8f0',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '10px',
                  }}
                >
                  <label
                    style={{
                      fontWeight: 600,
                      margin: 0,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '12px',
                      color: '#0f172a',
                      fontSize: '13.5px',
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={tagFormData.isMigrant}
                      onChange={(e) => setTagFormData({ ...tagFormData, isMigrant: e.target.checked })}
                      style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                    />
                    प्रवासी मतदाता (शहर से बाहर)
                  </label>
                  {tagFormData.isMigrant && (
                    <div style={{ width: '100%', marginTop: '6px' }}>
                      <label style={{ fontSize: '12px', fontWeight: 600, color: '#334155', display: 'block' }}>
                        वर्तमान स्थान
                        <input
                          value={tagFormData.migrantLocation}
                          onChange={(e) => setTagFormData({ ...tagFormData, migrantLocation: e.target.value })}
                          placeholder="वैकल्पिक स्थान (उदा. सूरत, मुंबई, दिल्ली)"
                          style={{ marginTop: '4px', height: '38px', width: '100%', borderRadius: '6px', border: '1px solid #cbd5e1', padding: '0 10px' }}
                        />
                      </label>
                    </div>
                  )}
                </div>
              </div>

              {actionMessage && <p className="form-error" role="alert">{actionMessage}</p>}

              <div className="modal-actions" style={{ marginTop: '14px', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setTagVoter(null)}
                  style={{
                    background: '#ffffff',
                    border: '1px solid #cbd5e1',
                    color: '#334155',
                    padding: '8px 18px',
                    borderRadius: '8px',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  रद्द करें
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  style={{
                    background: '#047857',
                    border: 'none',
                    color: '#ffffff',
                    padding: '8px 20px',
                    borderRadius: '8px',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: saving ? 'not-allowed' : 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  {saving ? <LoaderCircle size={15} className="spin" /> : <Check size={15} />} टैग सेव करें
                </button>
              </div>
            </form>
          </section>
        </div>
      )}

      {/* 8. DEDICATED EDIT MODAL */}
      {editVoter && (
        <div
          className="modal-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setEditVoter(null);
          }}
        >
          <section
            className="form-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="edit-title"
            style={{ maxWidth: '640px', width: '95%', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}
          >
            <div className="modal-heading">
              <div>
                <span className="eyebrow-label">VOTER DETAILS</span>
                <h2 id="edit-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Pencil size={18} color="#334155" /> मतदाता विवरण संपादित करें
                </h2>
                <p style={{ margin: 0, fontSize: '13px', color: '#64748b' }}>
                  {editVoter.nameHi || editVoter.nameEn} • EPIC: {editVoter.epic}
                </p>
              </div>
              <button className="icon-button" onClick={() => setEditVoter(null)} aria-label="बंद करें">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={saveEdit} className="modal-form" style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              <div
                style={{
                  maxHeight: '62vh',
                  overflowY: 'auto',
                  paddingRight: '6px',
                  paddingBottom: '12px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '14px',
                }}
              >
                {/* Row 1: EPIC, Age, Gender */}
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1.2fr', gap: '12px' }}>
                  <label style={{ margin: 0, fontSize: '12px', fontWeight: 600, color: '#334155' }}>
                    EPIC (Voter ID)
                    <input
                      value={editFormData.epic}
                      onChange={(e) => setEditFormData({ ...editFormData, epic: e.target.value.toUpperCase().trim() })}
                      style={{ marginTop: '4px', height: '38px' }}
                    />
                  </label>
                  <label style={{ margin: 0, fontSize: '12px', fontWeight: 600, color: '#334155' }}>
                    उम्र
                    <input
                      type="text"
                      inputMode="numeric"
                      value={editFormData.age}
                      onChange={(e) => setEditFormData({ ...editFormData, age: e.target.value.replace(/\D/g, '').slice(0, 3) })}
                      placeholder="उदा. 35"
                      style={{ marginTop: '4px', height: '38px' }}
                    />
                  </label>
                  <label style={{ margin: 0, fontSize: '12px', fontWeight: 600, color: '#334155' }}>
                    लिंग
                    <select
                      value={editFormData.gender}
                      onChange={(e) => setEditFormData({ ...editFormData, gender: e.target.value })}
                      style={{ marginTop: '4px', height: '38px' }}
                    >
                      <option value="">चुनें</option>
                      <option value="पुरुष">पुरुष</option>
                      <option value="स्त्री">स्त्री</option>
                      <option value="अन्य">अन्य</option>
                    </select>
                  </label>
                </div>

                {/* Row 2: Names En & Hi */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <label style={{ margin: 0, fontSize: '12px', fontWeight: 600, color: '#334155' }}>
                    नाम (English)
                    <input
                      value={editFormData.nameEn}
                      onChange={(e) => setEditFormData({ ...editFormData, nameEn: e.target.value })}
                      style={{ marginTop: '4px', height: '38px' }}
                    />
                  </label>
                  <label style={{ margin: 0, fontSize: '12px', fontWeight: 600, color: '#334155' }}>
                    नाम (हिंदी)
                    <input
                      value={editFormData.nameHi}
                      onChange={(e) => setEditFormData({ ...editFormData, nameHi: e.target.value })}
                      placeholder="हिंदी में नाम"
                      style={{ marginTop: '4px', height: '38px' }}
                    />
                  </label>
                </div>

                {/* Row 3: Relation & Relatives */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr 1.2fr', gap: '12px' }}>
                  <label style={{ margin: 0, fontSize: '12px', fontWeight: 600, color: '#334155' }}>
                    संबंध प्रकार
                    <select
                      value={editFormData.relationType}
                      onChange={(e) => setEditFormData({ ...editFormData, relationType: e.target.value })}
                      style={{ marginTop: '4px', height: '38px' }}
                    >
                      <option value="पिता">पिता</option>
                      <option value="पति">पति</option>
                      <option value="माता">माता</option>
                      <option value="पत्नी">पत्नी</option>
                      <option value="अन्य">अन्य</option>
                    </select>
                  </label>
                  <label style={{ margin: 0, fontSize: '12px', fontWeight: 600, color: '#334155' }}>
                    संबंधी (English)
                    <input
                      value={editFormData.relativeNameEn}
                      onChange={(e) => setEditFormData({ ...editFormData, relativeNameEn: e.target.value })}
                      style={{ marginTop: '4px', height: '38px' }}
                    />
                  </label>
                  <label style={{ margin: 0, fontSize: '12px', fontWeight: 600, color: '#334155' }}>
                    संबंधी (हिंदी)
                    <input
                      value={editFormData.relativeNameHi}
                      onChange={(e) => setEditFormData({ ...editFormData, relativeNameHi: e.target.value })}
                      style={{ marginTop: '4px', height: '38px' }}
                    />
                  </label>
                </div>

                {/* Row 4: Phone */}
                <label style={{ margin: 0, fontSize: '12px', fontWeight: 600, color: '#334155' }}>
                  फ़ोन नंबर (Mobile No)
                  <input
                    type="tel"
                    value={editFormData.phone}
                    onChange={(e) => setEditFormData({ ...editFormData, phone: e.target.value.replace(/\D/g, '').slice(0, 10) })}
                    placeholder="10 अंकों का मोबाइल नंबर"
                    style={{ marginTop: '4px', height: '38px' }}
                  />
                </label>

                {/* Row 5: House, Ward, Part, Serial */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px' }}>
                  <label style={{ margin: 0, fontSize: '12px', fontWeight: 600, color: '#334155' }}>
                    मकान नं.
                    <input
                      value={editFormData.houseNo}
                      onChange={(e) => setEditFormData({ ...editFormData, houseNo: e.target.value })}
                      style={{ marginTop: '4px', height: '38px' }}
                    />
                  </label>
                  <label style={{ margin: 0, fontSize: '12px', fontWeight: 600, color: '#334155' }}>
                    वार्ड नं.
                    <input
                      value={editFormData.wardNo}
                      onChange={(e) => setEditFormData({ ...editFormData, wardNo: e.target.value })}
                      style={{ marginTop: '4px', height: '38px' }}
                    />
                  </label>
                  <label style={{ margin: 0, fontSize: '12px', fontWeight: 600, color: '#334155' }}>
                    भाग नं.
                    <input
                      value={editFormData.partNo}
                      onChange={(e) => setEditFormData({ ...editFormData, partNo: e.target.value })}
                      style={{ marginTop: '4px', height: '38px' }}
                    />
                  </label>
                  <label style={{ margin: 0, fontSize: '12px', fontWeight: 600, color: '#334155' }}>
                    क्रम नं.
                    <input
                      type="text"
                      inputMode="numeric"
                      value={editFormData.serialNo}
                      onChange={(e) => setEditFormData({ ...editFormData, serialNo: e.target.value.replace(/\D/g, '') })}
                      style={{ marginTop: '4px', height: '38px' }}
                    />
                  </label>
                </div>
              </div>

              {actionMessage && <p className="form-error" role="alert">{actionMessage}</p>}

              <div className="modal-actions" style={{ marginTop: '12px' }}>
                <button className="button-secondary" type="button" onClick={() => setEditVoter(null)}>
                  रद्द करें
                </button>
                <button className="button-primary" type="submit" disabled={saving}>
                  {saving ? <LoaderCircle size={15} className="spin" /> : <Check size={15} />} विवरण सेव करें
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </div>
  );
}
