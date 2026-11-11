'use client';

import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import {
  Building2,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Clock,
  Download,
  ExternalLink,
  Filter,
  Flame,
  Home,
  Layers,
  LoaderCircle,
  MapPin,
  Mic,
  Pencil,
  Phone,
  Printer,
  RotateCcw,
  Search,
  Sparkles,
  Tag,
  UserCheck,
  UserX,
  Users,
  UsersRound,
  X,
  Eye,
} from 'lucide-react';
import Link from 'next/link';
import { apiFetch, decodeJwtPayload, getApiError } from '@/lib/api';
import { downloadBlob } from '@/lib/fileDownload';
import { createSpeechRecognition, SpeechRecognitionLike } from '@/lib/speech';
import { VoterPhotoModal } from '@/components/VoterPhotoModal';
import { toast } from '@/components/Toast';
import {
  getVoterDisplayName,
  getVoterRelativeDisplay,
  getBilingualVoterName,
  getBilingualRelativeName,
  getGenderDisplay,
  DisplayLanguage,
} from '@/lib/transliterate';

interface Voter {
  _id: string;
  nameHi: string;
  nameEn: string;
  epic: string;
  relativeNameHi: string;
  relationType: string;
  gender?: string;
  age?: number;
  wardNo: string;
  partNo: string;
  houseNo: string;
  serialNo: number;
  caste: string;
  matchType?: 'direct' | 'family';
  phone?: string;
  mobileNo?: string;
  householdCount?: number;
  voted?: boolean;
  familyId?: string;
  supportStatus?: string;
  surety?: string;
  isMigrant?: boolean;
  migrantLocation?: string;
  photoUrl?: string;
}

export interface CasteStat {
  name: string;
  total: number;
  families?: number;
  voted: number;
  pending: number;
  turnout: number;
}

export interface BreakdownSummary {
  totalCastes: number;
  configuredCastesCount: number;
  totalFamilies?: number;
  totalVoters: number;
  totalVoted: number;
  totalPending: number;
  overallTurnout: number;
}

export interface FamilyGroup {
  key: string;
  houseNo: string;
  wardNo: string;
  partNo: string;
  familyId?: string;
  caste: string;
  head: Voter;
  members: Voter[];
  votedCount: number;
  pendingCount: number;
  hasMigrant: boolean;
  migrantLocation?: string;
  phone?: string;
  supportStatus?: string;
  surety?: string;
}

export default function CommunityPage() {
  const [query, setQuery] = useState('');
  const [ward, setWard] = useState('');
  const [includeFamily, setIncludeFamily] = useState(true);
  const [photoModalVoter, setPhotoModalVoter] = useState<Voter | null>(null);
  const [voters, setVoters] = useState<Voter[]>([]);
  const [family, setFamily] = useState<Voter[]>([]);
  const [selectedHouse, setSelectedHouse] = useState('');
  const [selectedVoterForFamily, setSelectedVoterForFamily] = useState<Voter | null>(null);
  const [familyLoading, setFamilyLoading] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [voiceActive, setVoiceActive] = useState(false);
  const [voiceError, setVoiceError] = useState('');
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const resultsRef = useRef<HTMLDivElement | null>(null);

  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  const [clientName, setClientName] = useState('विजयसेतु (VijaySetu)');
  const [hasSearched, setHasSearched] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 50;

  // ── Dynamic Caste Breakdown & Turnout Tracker States ──
  const [breakdownLoading, setBreakdownLoading] = useState(false);
  const [breakdownSummary, setBreakdownSummary] = useState<BreakdownSummary | null>(null);
  const [casteStats, setCasteStats] = useState<CasteStat[]>([]);
  const [otherStat, setOtherStat] = useState<CasteStat | null>(null);
  const [selectedCaste, setSelectedCaste] = useState<string | null>(null);
  const [votedFilter, setVotedFilter] = useState<'all' | 'voted' | 'pending'>('all');
  const [casteSearchTerm, setCasteSearchTerm] = useState('');

  // ── Family View & Family Edit Modal States ──
  const [viewMode, setViewMode] = useState<'voters' | 'families'>('voters');
  const [expandedFamilyKey, setExpandedFamilyKey] = useState<string | null>(null);
  const [editingFamily, setEditingFamily] = useState<FamilyGroup | null>(null);
  const [editSupportStatus, setEditSupportStatus] = useState<'core' | 'swing' | 'opposition' | 'unmarked'>('unmarked');
  const [editMobileNo, setEditMobileNo] = useState('');
  const [editIsMigrant, setEditIsMigrant] = useState(false);
  const [editMigrantLocation, setEditMigrantLocation] = useState('');
  const [editCaste, setEditCaste] = useState('');
  const [savingFamily, setSavingFamily] = useState(false);
  const [familyNotice, setFamilyNotice] = useState('');
  const [familyEditError, setFamilyEditError] = useState('');

  // 1. Fetch caste breakdown from DB
  const fetchBreakdown = async () => {
    setBreakdownLoading(true);
    try {
      const res = await apiFetch('/features/caste-breakdown', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        setBreakdownSummary(data.summary || null);
        setCasteStats(Array.isArray(data.castes) ? data.castes : []);
        setOtherStat(data.other || null);
      }
    } catch (err) {
      console.warn('Could not load caste breakdown:', err);
    } finally {
      setBreakdownLoading(false);
    }
  };

  useEffect(() => {
    let isMounted = true;
    const init = async () => {
      if (isMounted) await fetchBreakdown();
    };
    void init();

    const handleClientChange = () => {
      void fetchBreakdown();
      setSelectedCaste(null);
      setVoters([]);
      setHasSearched(false);
    };

    window.addEventListener('client-changed', handleClientChange);
    return () => {
      isMounted = false;
      window.removeEventListener('client-changed', handleClientChange);
    };
  }, []);

  // 2. Decode user token for Admin role and Client name
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

  // 3. Load recent searches
  useEffect(() => {
    void Promise.resolve().then(() => {
      try {
        const stored: unknown = JSON.parse(window.localStorage.getItem('matdata-community-searches') || '[]');
        if (Array.isArray(stored) && stored.every((item) => typeof item === 'string')) {
          setRecentSearches(stored.slice(0, 8));
        }
      } catch {}
    });
  }, []);

  useEffect(() => () => recognitionRef.current?.stop(), []);

  const rememberSearch = (term: string) => {
    const updated = [term, ...recentSearches.filter((item) => item !== term)].slice(0, 8);
    setRecentSearches(updated);
    try {
      window.localStorage.setItem('matdata-community-searches', JSON.stringify(updated));
    } catch {}
  };

  // 4. Execute search by caste, query, or voting status
  const executeSearch = async (
    targetCaste: string | null = selectedCaste,
    targetStatus: 'all' | 'voted' | 'pending' = votedFilter,
    searchTerm = query,
    targetWard = ward
  ) => {
    setLoading(true);
    setError('');
    setSelectedHouse('');
    setSelectedVoterForFamily(null);
    setFamily([]);
    setHasSearched(true);
    setCurrentPage(1);

    try {
      const params = new URLSearchParams();
      if (targetCaste) {
        params.set('caste', targetCaste);
      } else if (searchTerm.trim()) {
        params.set('q', searchTerm.trim());
      }
      if (targetStatus && targetStatus !== 'all') {
        params.set('votedStatus', targetStatus);
      }
      if (targetWard.trim()) {
        params.set('ward', targetWard.trim());
      }
      params.set('includeFamily', String(includeFamily));

      const response = await apiFetch(`/features/community?${params}`, { cache: 'no-store' });
      if (!response.ok) throw new Error(await getApiError(response, 'समुदाय खोज पूरी नहीं हो सकी।'));
      const data = (await response.json()) as Voter[];
      setVoters(Array.isArray(data) ? data : []);

      if (searchTerm.trim() && !targetCaste) {
        rememberSearch(searchTerm.trim());
      }
    } catch (searchError) {
      setVoters([]);
      const msg = searchError instanceof Error ? searchError.message : 'समुदाय खोज पूरी नहीं हो सकी।';
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleFormSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSelectedCaste(null);
    void executeSearch(null, votedFilter, query, ward);
  };

  // 5. Select a Caste Chip / Card
  const handleSelectCaste = (casteName: string) => {
    if (selectedCaste === casteName) {
      // Toggle off
      setSelectedCaste(null);
      setVoters([]);
      setHasSearched(false);
      return;
    }
    setSelectedCaste(casteName);
    setQuery('');
    setVotedFilter('all');
    void executeSearch(casteName, 'all', '', ward);

    // Smooth scroll down to table
    setTimeout(() => {
      resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 150);
  };

  // 6. Change Sub-Filter (दे दिया / नहीं दिया / सभी)
  const handleVotedFilterChange = (status: 'all' | 'voted' | 'pending') => {
    setVotedFilter(status);
    void executeSearch(selectedCaste, status, query, ward);
  };

  const startVoiceSearch = () => {
    recognitionRef.current?.stop();
    const recognition = createSpeechRecognition();
    if (!recognition) {
      setVoiceError('इस ब्राउज़र में voice search उपलब्ध नहीं है।');
      return;
    }
    setVoiceError('');
    recognition.lang = 'hi-IN';
    recognition.interimResults = false;
    recognition.onresult = (event) => {
      const transcript = event.results[0]?.[0]?.transcript?.trim();
      if (transcript) {
        setQuery(transcript);
        setSelectedCaste(null);
        void executeSearch(null, votedFilter, transcript, ward);
      }
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
      window.localStorage.removeItem('matdata-community-searches');
    } catch {}
  };

  const showHousehold = async (voter: Voter) => {
    const house = voter.houseNo || '';
    setSelectedHouse(house);
    setSelectedVoterForFamily(voter);
    setFamily([]);
    if (!house) return;

    setFamilyLoading(true);
    try {
      const params = new URLSearchParams();
      if (voter.wardNo) params.set('ward', voter.wardNo);
      if (voter.partNo) params.set('part', voter.partNo);
      const response = await apiFetch(`/voters/family/${encodeURIComponent(house)}?${params}`, { cache: 'no-store' });
      if (!response.ok) throw new Error(await getApiError(response, 'घर के अन्य रिकॉर्ड नहीं मिले।'));
      setFamily((await response.json()) as Voter[]);
    } catch (familyError) {
      const msg = familyError instanceof Error ? familyError.message : 'घर के अन्य रिकॉर्ड नहीं मिले।';
      setError(msg);
      toast.error(msg);
    } finally {
      setFamilyLoading(false);
    }
  };

  // 7. Export Excel directly
  const exportExcel = async () => {
    setExporting(true);
    setError('');
    try {
      const params = new URLSearchParams({ export: 'excel' });
      if (selectedCaste) {
        params.set('caste', selectedCaste);
      } else if (query.trim()) {
        params.set('q', query.trim());
      }
      if (votedFilter !== 'all') {
        params.set('votedStatus', votedFilter);
      }
      if (ward.trim()) {
        params.set('ward', ward.trim());
      }

      const response = await apiFetch(`/features/community?${params}`);
      if (!response.ok) throw new Error(await getApiError(response, 'Excel एक्सपोर्ट नहीं हो सका।'));
      const blob = await response.blob();
      const filename = `Caste_${selectedCaste || 'List'}_${votedFilter}_${Date.now()}.xlsx`;
      await downloadBlob(blob, filename);
      toast.success('सामुदायिक सूची Excel डाउनलोड हो गई।');
    } catch (exportError) {
      const msg = exportError instanceof Error ? exportError.message : 'Excel एक्सपोर्ट नहीं हो सका।';
      setError(msg);
      toast.error(msg);
    } finally {
      setExporting(false);
    }
  };

  // Filter caste cards locally if user types in search box
  const filteredCasteStats = useMemo(() => {
    if (!casteSearchTerm.trim()) return casteStats;
    const term = casteSearchTerm.trim().toLowerCase();
    return casteStats.filter((c) => c.name.toLowerCase().includes(term));
  }, [casteStats, casteSearchTerm]);

  // Demographic Statistics Computed from Current Results
  const stats = useMemo(() => {
    if (!voters.length) return null;
    const total = voters.length;
    const directMatches = voters.filter((v) => v.matchType !== 'family').length;
    const familyMatches = total - directMatches;

    const uniqueHouses = new Set(
      voters
        .map((v) => `${v.wardNo}-${v.partNo}-${(v.houseNo || '').trim()}`)
        .filter((h) => !h.endsWith('-') && !h.endsWith('-0') && !h.endsWith('-000'))
    ).size;

    const wards = new Set(voters.map((v) => v.wardNo).filter(Boolean)).size;
    const maleCount = voters.filter((v) => ['पुरुष', 'Male', 'M'].includes(v.gender || '')).length;
    const femaleCount = voters.filter((v) => ['महिला', 'स्त्री', 'Female', 'F'].includes(v.gender || '')).length;
    const votedCount = voters.filter((v) => v.voted).length;

    return {
      total,
      directMatches,
      familyMatches,
      uniqueHouses: uniqueHouses || 1,
      wards,
      maleCount,
      femaleCount,
      votedCount,
      turnout: total ? Math.round((votedCount / total) * 100) : 0,
    };
  }, [voters]);

  const totalCommunityPages = Math.ceil(voters.length / pageSize) || 1;
  const paginatedVoters = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return voters.slice(start, start + pageSize);
  }, [voters, currentPage, pageSize]);

  // ── FAMILY GROUPING (परिवार-वार समूहीकरण) ──
  const familyGroups = useMemo<FamilyGroup[]>(() => {
    if (!voters.length) return [];
    const map = new Map<string, Voter[]>();
    voters.forEach((v) => {
      const key =
        v.familyId && v.familyId.trim() !== ''
          ? v.familyId.trim()
          : `${v.wardNo || ''}-${v.partNo || ''}-${(v.houseNo || '').trim()}`;
      if (!map.has(key)) {
        map.set(key, []);
      }
      map.get(key)!.push(v);
    });

    const groups: FamilyGroup[] = [];
    map.forEach((members, key) => {
      // Sort members: senior/eldest first or by serial
      members.sort((a, b) => (b.age || 0) - (a.age || 0) || (a.serialNo || 0) - (b.serialNo || 0));
      const head = members[0];
      const votedCount = members.filter((m) => m.voted).length;
      const pendingCount = members.length - votedCount;
      const migrantMember = members.find((m) => m.isMigrant);
      const phoneMember = members.find((m) => m.phone || m.mobileNo);
      const supportMember = members.find((m) => m.supportStatus && m.supportStatus !== 'unmarked');

      groups.push({
        key,
        houseNo: head.houseNo || '',
        wardNo: head.wardNo || '',
        partNo: head.partNo || '',
        familyId: head.familyId || '',
        caste: head.caste || selectedCaste || '',
        head,
        members,
        votedCount,
        pendingCount,
        hasMigrant: Boolean(migrantMember),
        migrantLocation: migrantMember?.migrantLocation || '',
        phone: phoneMember?.phone || phoneMember?.mobileNo || '',
        supportStatus: supportMember?.supportStatus || head.supportStatus || 'unmarked',
        surety: supportMember?.surety || head.surety || '',
      });
    });

    // Sort families by ward, part, houseNo
    groups.sort((a, b) => {
      if (a.wardNo !== b.wardNo) return (a.wardNo || '').localeCompare(b.wardNo || '');
      if (a.partNo !== b.partNo) return (a.partNo || '').localeCompare(b.partNo || '');
      return (a.houseNo || '').localeCompare(b.houseNo || '', undefined, { numeric: true });
    });

    return groups;
  }, [voters, selectedCaste]);

  const totalFamilyPages = Math.ceil(familyGroups.length / pageSize) || 1;
  const paginatedFamilies = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return familyGroups.slice(start, start + pageSize);
  }, [familyGroups, currentPage, pageSize]);

  // Open Family Bulk Edit Modal
  const openEditFamilyModal = (fg: FamilyGroup) => {
    setEditingFamily(fg);
    setEditSupportStatus(
      (fg.supportStatus as 'core' | 'swing' | 'opposition' | 'unmarked') || 'unmarked'
    );
    setEditMobileNo(fg.phone || '');
    setEditIsMigrant(fg.hasMigrant);
    setEditMigrantLocation(fg.migrantLocation || '');
    setEditCaste(fg.caste || selectedCaste || '');
    setFamilyEditError('');
    setFamilyNotice('');
  };

  // Save Family Bulk Edit
  const handleSaveFamily = async () => {
    if (!editingFamily) return;
    setSavingFamily(true);
    setFamilyEditError('');
    try {
      const memberIds = editingFamily.members.map((m) => m._id);
      const updates: Record<string, any> = {
        supportStatus: editSupportStatus,
        surety:
          editSupportStatus === 'core'
            ? '100% पक्का'
            : editSupportStatus === 'swing'
            ? '50-50'
            : editSupportStatus === 'opposition'
            ? 'विरोधी'
            : 'सामान्य',
        isMigrant: editIsMigrant,
        migrantLocation: editIsMigrant ? editMigrantLocation.trim() : '',
      };
      if (editMobileNo.trim()) {
        const cleanPhone = editMobileNo.trim().replace(/\D/g, '').slice(-10);
        if (cleanPhone.length !== 10) {
          throw new Error('कृपया मान्य 10 अंकों का मोबाइल नंबर दर्ज करें।');
        }
        updates.mobileNo = cleanPhone;
      }
      if (editCaste.trim()) {
        updates.caste = editCaste.trim();
      }

      const res = await apiFetch('/voters/bulk-update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ids: memberIds,
          updates,
        }),
      });
      if (!res.ok) throw new Error(await getApiError(res, 'परिवार डेटा सेव नहीं हो सका।'));

      // Optimistically update voters in state
      setVoters((prev) =>
        prev.map((v) => {
          if (memberIds.includes(v._id)) {
            return {
              ...v,
              supportStatus: updates.supportStatus,
              surety: updates.surety,
              isMigrant: updates.isMigrant,
              migrantLocation: updates.migrantLocation,
              ...(updates.mobileNo ? { phone: updates.mobileNo } : {}),
              ...(updates.caste ? { caste: updates.caste } : {}),
            };
          }
          return v;
        })
      );

      setFamilyNotice(`परिवार के ${memberIds.length} सदस्यों का डेटा सफलतापूर्वक सेव हुआ।`);
      setEditingFamily(null);

      // Refresh caste & family counts in background
      void fetchBreakdown();
    } catch (err) {
      setFamilyEditError(err instanceof Error ? err.message : 'परिवार डेटा सेव नहीं हो सका।');
    } finally {
      setSavingFamily(false);
    }
  };

  return (
    <div className="work-page" style={{ maxWidth: '1420px', margin: '0 auto', paddingBottom: '60px' }}>
      {/* ── PRINT-ONLY STYLED HEADER (Visible only during window.print()) ── */}
      <div className="print-only" style={{ display: 'none', marginBottom: '20px' }}>
        <div style={{ textAlign: 'center', borderBottom: '2px solid #0f172a', paddingBottom: '10px' }}>
          <h1 style={{ margin: 0, fontSize: '22px', fontWeight: 800 }}>{clientName}</h1>
          <h2 style={{ margin: '4px 0', fontSize: '16px', fontWeight: 700, color: '#334155' }}>
            जातिगत व सामाजिक समीकरण मतदाता रिपोर्ट · {selectedCaste ? `${selectedCaste} समुदाय` : query || 'समस्त मतदाता'}
          </h2>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '20px', fontSize: '13px', color: '#475569', marginTop: '6px' }}>
            <span><strong>स्थिति:</strong> {votedFilter === 'voted' ? 'मतदान दर्ज (दे दिया)' : votedFilter === 'pending' ? 'मतदान बाकी (नहीं दिया)' : 'समस्त मतदाता'}</span>
            <span><strong>कुल रिकॉर्ड:</strong> {voters.length.toLocaleString('hi-IN')}</span>
            <span><strong>प्रिंट दिनांक:</strong> {new Date().toLocaleDateString('hi-IN')}</span>
          </div>
        </div>
      </div>

      {/* ── PAGE HEADER ── */}
      <div className="page-intro" style={{ marginBottom: '20px' }}>
        <div>
          <div className="eyebrow-label" style={{ color: '#7c3aed' }}>
            <span className="eyebrow-mark" style={{ background: '#7c3aed' }} />
            COMMUNITY & SOCIAL EQUATION · सामाजिक समीकरण
          </div>
          <h1 style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <span>जातीय व सामाजिक समीकरण</span>
            <span
              style={{
                fontSize: '13px',
                fontWeight: 600,
                color: '#7c3aed',
                background: '#f3e8ff',
                padding: '3px 10px',
                borderRadius: '20px',
                border: '1px solid #e9d5ff',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
              }}
            >
              <Users size={13} /> जातिगत मैपिंग व मतदान ट्रैकर
            </span>
          </h1>
          <p>
            क्लाइंट के अनुसार डेटाबेस से कुल जातियां, मतदाताओं की संख्या, मतदान स्थिति (दे दिया / बाकी) देखें व एक्सपोर्ट करें।
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
            onClick={() => void exportExcel()}
            disabled={!voters.length || exporting}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          >
            {exporting ? <LoaderCircle size={15} className="spin" /> : <Download size={15} />}
            Excel एक्सपोर्ट
          </button>
        </div>
      </div>

      {error && (
        <div className="inline-notice error-notice" role="alert" style={{ marginBottom: '16px' }}>
          {error}
        </div>
      )}
      {familyNotice && (
        <div
          className="inline-notice"
          role="status"
          style={{
            marginBottom: '16px',
            background: '#f0fdf4',
            borderColor: '#bbf7d0',
            color: '#166534',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <span>✓ {familyNotice}</span>
          <button
            type="button"
            onClick={() => setFamilyNotice('')}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#166534', padding: '2px' }}
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* ── SECTION 1: DYNAMIC CASTE DASHBOARD (From Client's DB) ── */}
      <section
        style={{
          background: 'linear-gradient(135deg, #ffffff 0%, #faf5ff 100%)',
          border: '1.5px solid #e9d5ff',
          borderRadius: '16px',
          padding: '20px',
          marginBottom: '24px',
          boxShadow: '0 4px 20px -3px rgba(124, 58, 237, 0.07)',
        }}
      >
        {/* Header & Metrics Strip */}
        <div
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
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '8px',
                  background: '#7c3aed',
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Layers size={17} />
              </span>
              <div>
                <h2 style={{ margin: 0, fontSize: '16.5px', fontWeight: 800, color: '#1e1b4b' }}>
                  क्लाइंट जातिगत सांख्यिकी व मतदान ट्रैकर (Database Live)
                </h2>
                <p style={{ margin: '2px 0 0', fontSize: '12.5px', color: '#6b21a8' }}>
                  किसी भी जाति या "अन्य" कार्ड पर क्लिक करके उस जाति के कुल वोट्स व मतदान सूची देखें
                </p>
              </div>
            </div>
          </div>

          {/* Quick Search in Caste Cards */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ position: 'relative' }}>
              <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#9333ea' }} />
              <input
                type="text"
                placeholder="जाति खोजें..."
                value={casteSearchTerm}
                onChange={(e) => setCasteSearchTerm(e.target.value)}
                style={{
                  padding: '6px 12px 6px 30px',
                  fontSize: '12.5px',
                  borderRadius: '20px',
                  border: '1px solid #d8b4fe',
                  outline: 'none',
                  background: '#ffffff',
                  width: '150px',
                }}
              />
            </div>

            <button
              type="button"
              onClick={() => void fetchBreakdown()}
              disabled={breakdownLoading}
              style={{
                background: '#ffffff',
                border: '1px solid #d8b4fe',
                borderRadius: '8px',
                padding: '6px 10px',
                fontSize: '12px',
                fontWeight: 600,
                color: '#7c3aed',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
              }}
              title="ताज़ा आंकड़े लोड करें"
            >
              <RotateCcw size={13} className={breakdownLoading ? 'spin' : ''} />
              <span>रिफ्रेश</span>
            </button>
          </div>
        </div>

        {/* Global Summary KPI Bar */}
        {breakdownSummary && (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
              gap: '10px',
              marginBottom: '16px',
            }}
          >
            <div style={{ background: '#ffffff', border: '1px solid #e9d5ff', borderRadius: '10px', padding: '10px 14px' }}>
              <div style={{ fontSize: '11px', fontWeight: 600, color: '#6b21a8' }}>कुल जातियां</div>
              <div style={{ fontSize: '20px', fontWeight: 800, color: '#4c1d95' }}>
                {breakdownSummary.totalCastes} जातियां
              </div>
            </div>

            <div style={{ background: '#ffffff', border: '1.5px solid #bae6fd', borderRadius: '10px', padding: '10px 14px' }}>
              <div style={{ fontSize: '11px', fontWeight: 600, color: '#0369a1', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Home size={13} /> कुल परिवार
              </div>
              <div style={{ fontSize: '20px', fontWeight: 800, color: '#0c4a6e' }}>
                {(breakdownSummary.totalFamilies || 0).toLocaleString('hi-IN')}
              </div>
            </div>

            <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '10px 14px' }}>
              <div style={{ fontSize: '11px', fontWeight: 600, color: '#64748b' }}>कुल मतदाता</div>
              <div style={{ fontSize: '20px', fontWeight: 800, color: '#0f172a' }}>
                {breakdownSummary.totalVoters.toLocaleString('hi-IN')}
              </div>
            </div>

            <div style={{ background: '#ffffff', border: '1px solid #bbf7d0', borderRadius: '10px', padding: '10px 14px' }}>
              <div style={{ fontSize: '11px', fontWeight: 600, color: '#15803d', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <CheckCircle2 size={13} /> मतदान दर्ज (दे दिया)
              </div>
              <div style={{ fontSize: '20px', fontWeight: 800, color: '#166534' }}>
                {breakdownSummary.totalVoted.toLocaleString('hi-IN')}
                <span style={{ fontSize: '12px', fontWeight: 600, color: '#15803d', marginLeft: '6px' }}>
                  ({breakdownSummary.overallTurnout}%)
                </span>
              </div>
            </div>

            <div style={{ background: '#ffffff', border: '1px solid #fed7aa', borderRadius: '10px', padding: '10px 14px' }}>
              <div style={{ fontSize: '11px', fontWeight: 600, color: '#c2410c', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Clock size={13} /> मतदान बाकी (नहीं दिया)
              </div>
              <div style={{ fontSize: '20px', fontWeight: 800, color: '#9a3412' }}>
                {breakdownSummary.totalPending.toLocaleString('hi-IN')}
              </div>
            </div>
          </div>
        )}

        {/* ── Caste Cards Carousel / Grid ── */}
        {breakdownLoading && !casteStats.length ? (
          <div style={{ padding: '30px', textAlign: 'center', color: '#7c3aed' }}>
            <LoaderCircle size={24} className="spin" style={{ margin: '0 auto 8px' }} />
            <span>डेटाबेस से जातियों का विवरण आ रहा है...</span>
          </div>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))',
              gap: '10px',
              maxHeight: '340px',
              overflowY: 'auto',
              padding: '2px',
            }}
          >
            {/* Render Each Configured Caste Card */}
            {filteredCasteStats.map((c) => {
              const isSelected = selectedCaste === c.name;
              return (
                <div
                  key={c.name}
                  onClick={() => handleSelectCaste(c.name)}
                  style={{
                    background: isSelected ? '#7c3aed' : '#ffffff',
                    color: isSelected ? '#ffffff' : '#1e293b',
                    border: isSelected ? '2px solid #5b21b6' : '1px solid #e2e8f0',
                    borderRadius: '12px',
                    padding: '12px 14px',
                    cursor: 'pointer',
                    boxShadow: isSelected
                      ? '0 6px 20px -2px rgba(124, 58, 237, 0.4)'
                      : '0 1px 3px rgba(0,0,0,0.03)',
                    transition: 'all 0.16s ease',
                    position: 'relative',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <div style={{ fontSize: '14.5px', fontWeight: 750, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {c.name}
                    </div>
                    {isSelected && (
                      <span style={{ fontSize: '10px', background: '#ffffff', color: '#7c3aed', fontWeight: 800, padding: '2px 6px', borderRadius: '10px' }}>
                        सक्रिय
                      </span>
                    )}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span style={{ fontSize: '17px', fontWeight: 800 }}>
                      {c.total.toLocaleString('hi-IN')} <span style={{ fontSize: '11px', fontWeight: 500, opacity: 0.85 }}>वोट्स</span>
                      <span style={{ fontSize: '12px', fontWeight: 700, marginLeft: '6px', opacity: 0.9 }}>
                        · {(c.families || 0).toLocaleString('hi-IN')} परिवार
                      </span>
                    </span>
                    <span style={{ fontSize: '11.5px', fontWeight: 650, opacity: 0.9 }}>
                      {c.turnout}% मतदान
                    </span>
                  </div>

                  {/* Turnout Progress Bar */}
                  <div
                    style={{
                      height: '5px',
                      borderRadius: '4px',
                      background: isSelected ? 'rgba(255,255,255,0.3)' : '#f1f5f9',
                      overflow: 'hidden',
                      marginBottom: '8px',
                    }}
                  >
                    <div
                      style={{
                        height: '100%',
                        width: `${Math.min(c.turnout, 100)}%`,
                        background: isSelected ? '#ffffff' : '#10b981',
                        borderRadius: '4px',
                      }}
                    />
                  </div>

                  {/* Sub-counts: दे दिया vs बाकी */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px' }}>
                    <span
                      style={{
                        color: isSelected ? '#bbf7d0' : '#15803d',
                        fontWeight: 650,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '2px',
                      }}
                    >
                      ✓ दे दिया: {c.voted}
                    </span>
                    <span
                      style={{
                        color: isSelected ? '#fef08a' : '#b45309',
                        fontWeight: 650,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '2px',
                      }}
                    >
                      बाकी: {c.pending}
                    </span>
                  </div>
                </div>
              );
            })}

            {/* ── अन्य (OTHER / UNCLASSIFIED) CARD ── */}
            {otherStat && (
              <div
                onClick={() => handleSelectCaste('अन्य')}
                style={{
                  background: selectedCaste === 'अन्य' ? '#475569' : '#f8fafc',
                  color: selectedCaste === 'अन्य' ? '#ffffff' : '#334155',
                  border: selectedCaste === 'अन्य' ? '2px solid #1e293b' : '1.5px dashed #cbd5e1',
                  borderRadius: '12px',
                  padding: '12px 14px',
                  cursor: 'pointer',
                  boxShadow: selectedCaste === 'अन्य'
                    ? '0 6px 20px -2px rgba(71, 85, 105, 0.4)'
                    : 'none',
                  transition: 'all 0.16s ease',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <div style={{ fontSize: '14.5px', fontWeight: 750 }}>
                    अन्य / अनिर्धारित
                  </div>
                  {selectedCaste === 'अन्य' && (
                    <span style={{ fontSize: '10px', background: '#ffffff', color: '#0f172a', fontWeight: 800, padding: '2px 6px', borderRadius: '10px' }}>
                      सक्रिय
                    </span>
                  )}
                </div>

                <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ fontSize: '17px', fontWeight: 800 }}>
                    {otherStat.total.toLocaleString('hi-IN')} <span style={{ fontSize: '11px', fontWeight: 500, opacity: 0.85 }}>वोट्स</span>
                    <span style={{ fontSize: '12px', fontWeight: 700, marginLeft: '6px', opacity: 0.9 }}>
                      · {(otherStat.families || 0).toLocaleString('hi-IN')} परिवार
                    </span>
                  </span>
                  <span style={{ fontSize: '11.5px', fontWeight: 650, opacity: 0.9 }}>
                    {otherStat.turnout}% मतदान
                  </span>
                </div>

                <div
                  style={{
                    height: '5px',
                    borderRadius: '4px',
                    background: selectedCaste === 'अन्य' ? 'rgba(255,255,255,0.3)' : '#e2e8f0',
                    overflow: 'hidden',
                    marginBottom: '8px',
                  }}
                >
                  <div
                    style={{
                      height: '100%',
                      width: `${Math.min(otherStat.turnout, 100)}%`,
                      background: selectedCaste === 'अन्य' ? '#ffffff' : '#64748b',
                      borderRadius: '4px',
                    }}
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px' }}>
                  <span style={{ color: selectedCaste === 'अन्य' ? '#bbf7d0' : '#15803d', fontWeight: 650 }}>
                    ✓ दे दिया: {otherStat.voted}
                  </span>
                  <span style={{ color: selectedCaste === 'अन्य' ? '#fef08a' : '#b45309', fontWeight: 650 }}>
                    बाकी: {otherStat.pending}
                  </span>
                </div>
              </div>
            )}
          </div>
        )}
      </section>

      {/* ── SECTION 2: SEARCH & FILTER CARD (ELEVATED) ── */}
      <section
        style={{
          background: '#ffffff',
          border: '1.5px solid #e2e8f0',
          borderRadius: '16px',
          padding: '20px',
          marginBottom: '24px',
          boxShadow: '0 4px 16px -2px rgba(15, 23, 42, 0.04)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
          <div
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              background: '#eff6ff',
              border: '1.5px solid #bfdbfe',
              color: '#2563eb',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Search size={16} />
          </div>
          <div>
            <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: '#0f172a' }}>
              उपनाम, अन्य समुदाय या नाम से विशिष्ट खोज
            </h2>
            <p style={{ margin: 0, fontSize: '12px', color: '#64748b' }}>
              एक या अधिक उपनाम/जाति कॉमा (,) लगाकर लिखें या सीधे वार्ड फ़िल्टर जोड़ें।
            </p>
          </div>
        </div>

        <form onSubmit={handleFormSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
            {/* Query Input with Mic and Clear */}
            <div style={{ position: 'relative', flex: '2 1 320px', minWidth: '260px' }}>
              <Search
                size={16}
                style={{
                  position: 'absolute',
                  left: '14px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: '#64748b',
                }}
              />
              <input
                type="text"
                placeholder="उदा. सामान्य, ओबीसी, एससी/एसटी, वार्ड-वार..."
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  if (selectedCaste) setSelectedCaste(null);
                }}
                maxLength={500}
                style={{
                  width: '100%',
                  height: '42px',
                  padding: '8px 70px 8px 40px',
                  fontSize: '13.5px',
                  fontWeight: 500,
                  border: '1.5px solid #cbd5e1',
                  borderRadius: '10px',
                  outline: 'none',
                  background: '#ffffff',
                }}
              />

              <div
                style={{
                  position: 'absolute',
                  right: '8px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                {query && (
                  <button
                    type="button"
                    onClick={() => setQuery('')}
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: '#94a3b8',
                      padding: '4px',
                    }}
                    title="साफ़ करें"
                  >
                    <X size={15} />
                  </button>
                )}

                <button
                  type="button"
                  onClick={startVoiceSearch}
                  disabled={voiceActive}
                  style={{
                    background: voiceActive ? '#ef4444' : '#f1f5f9',
                    border: '1px solid',
                    borderColor: voiceActive ? '#dc2626' : '#cbd5e1',
                    borderRadius: '6px',
                    padding: '5px 7px',
                    cursor: 'pointer',
                    color: voiceActive ? '#ffffff' : '#334155',
                    display: 'flex',
                    alignItems: 'center',
                  }}
                  title="बोलकर खोजें"
                >
                  <Mic size={14} className={voiceActive ? 'pulse' : ''} />
                </button>
              </div>
            </div>

            {/* Ward Filter */}
            <div style={{ position: 'relative', flex: '1 1 140px', minWidth: '130px' }}>
              <MapPin
                size={15}
                style={{
                  position: 'absolute',
                  left: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: '#64748b',
                }}
              />
              <input
                type="text"
                placeholder="वार्ड नं. (वैकल्पिक)"
                value={ward}
                onChange={(e) => setWard(e.target.value)}
                style={{
                  width: '100%',
                  height: '42px',
                  padding: '8px 12px 8px 34px',
                  fontSize: '13px',
                  border: '1.5px solid #cbd5e1',
                  borderRadius: '10px',
                  outline: 'none',
                  background: '#ffffff',
                }}
              />
            </div>

            {/* Family Inclusion Checkbox */}
            <label
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '13px',
                fontWeight: 650,
                color: '#1e293b',
                background: '#f8fafc',
                padding: '8px 14px',
                borderRadius: '10px',
                border: '1.5px solid #cbd5e1',
                cursor: 'pointer',
                userSelect: 'none',
              }}
            >
              <input
                type="checkbox"
                checked={includeFamily}
                onChange={(e) => setIncludeFamily(e.target.checked)}
                style={{ cursor: 'pointer', width: '16px', height: '16px', accentColor: '#2563eb' }}
              />
              <span>परिवार सदस्य शामिल करें</span>
            </label>

            {/* Analyze Action Button */}
            <button
              type="submit"
              disabled={loading}
              style={{
                height: '42px',
                padding: '0 20px',
                fontSize: '13.5px',
                fontWeight: 700,
                background: '#0f172a',
                color: '#ffffff',
                border: '1px solid #0f172a',
                borderRadius: '10px',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: '0 3px 10px rgba(15, 23, 42, 0.2)',
                whiteSpace: 'nowrap',
              }}
            >
              {loading ? (
                <>
                  <LoaderCircle size={16} className="spin" />
                  <span>खोज रहे हैं...</span>
                </>
              ) : (
                <>
                  <Sparkles size={16} />
                  <span>समीकरण खोजें</span>
                </>
              )}
            </button>
          </div>

          {voiceError && (
            <div style={{ fontSize: '12px', color: '#b91c1c', marginTop: '2px' }}>
              {voiceError}
            </div>
          )}

          {/* RECENT SEARCHES */}
          {recentSearches.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginTop: '4px' }}>
              <span style={{ fontSize: '11.5px', color: '#64748b' }}>हालिया खोज:</span>
              {recentSearches.map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => {
                    setQuery(item);
                    setSelectedCaste(null);
                    void executeSearch(null, votedFilter, item, ward);
                  }}
                  style={{
                    fontSize: '11px',
                    padding: '2px 8px',
                    borderRadius: '6px',
                    background: '#f1f5f9',
                    color: '#475569',
                    border: '1px solid #e2e8f0',
                    cursor: 'pointer',
                  }}
                >
                  {item.length > 25 ? `${item.slice(0, 25)}…` : item}
                </button>
              ))}

              <button
                type="button"
                onClick={clearRecentSearches}
                style={{
                  fontSize: '11px',
                  color: '#94a3b8',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  textDecoration: 'underline',
                  marginLeft: 'auto',
                }}
              >
                इतिहास साफ़ करें
              </button>
            </div>
          )}
        </form>
      </section>

      {/* ── SECTION 3: VOTER RECORDS TABLE WITH TURNOUT SUB-FILTERS ── */}
      <section
        ref={resultsRef}
        style={{
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '16px',
          padding: '20px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
        }}
      >
        {/* Results Header + Sub-Filter Tabs (दे दिया / नहीं दिया / सभी) */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '16px',
            paddingBottom: '14px',
            borderBottom: '1.5px solid #f1f5f9',
            flexWrap: 'wrap',
            gap: '12px',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <h2 style={{ margin: 0, fontSize: '17px', fontWeight: 800, color: '#0f172a' }}>
                {selectedCaste ? (
                  <span>
                    <span style={{ color: '#7c3aed' }}>{selectedCaste}</span> समुदाय मतदाता सूची
                  </span>
                ) : query ? (
                  <span>खोज परिणाम: "{query}"</span>
                ) : (
                  <span>खोज परिणाम (Demographic Records)</span>
                )}
              </h2>

              {selectedCaste && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedCaste(null);
                    setVoters([]);
                    setHasSearched(false);
                  }}
                  style={{
                    background: '#f1f5f9',
                    border: '1px solid #cbd5e1',
                    borderRadius: '20px',
                    padding: '2px 8px',
                    fontSize: '11px',
                    color: '#475569',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  <X size={12} /> जाति चयन हटाएं
                </button>
              )}
            </div>

            <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#64748b' }}>
              {voters.length
                ? `${voters.length.toLocaleString('hi-IN')} मतदाता रिकॉर्ड लोड हुए · मतदान स्थिति अनुसार फ़िल्टर करें`
                : 'ऊपर किसी भी जाति पर क्लिक करें या उपनाम लिखकर खोजें'}
            </p>
          </div>

          {/* ── VIEW MODE TOGGLE & VOTING STATUS SUB-FILTERS ── */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            {/* View Mode Toggle: मतदाता सूची vs परिवार सूची */}
            <div
              style={{
                display: 'inline-flex',
                background: '#f1f5f9',
                padding: '3px',
                borderRadius: '10px',
                border: '1px solid #cbd5e1',
              }}
            >
              <button
                type="button"
                onClick={() => {
                  setViewMode('voters');
                  setCurrentPage(1);
                }}
                style={{
                  padding: '5px 12px',
                  fontSize: '12px',
                  fontWeight: viewMode === 'voters' ? 750 : 550,
                  background: viewMode === 'voters' ? '#ffffff' : 'transparent',
                  color: viewMode === 'voters' ? '#0f172a' : '#64748b',
                  borderRadius: '7px',
                  border: 'none',
                  cursor: 'pointer',
                  boxShadow: viewMode === 'voters' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                  transition: 'all 0.12s ease',
                }}
              >
                <Users size={13} />
                <span>मतदाता सूची ({voters.length})</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setViewMode('families');
                  setCurrentPage(1);
                }}
                style={{
                  padding: '5px 12px',
                  fontSize: '12px',
                  fontWeight: viewMode === 'families' ? 750 : 550,
                  background: viewMode === 'families' ? '#ffffff' : 'transparent',
                  color: viewMode === 'families' ? '#7c3aed' : '#64748b',
                  borderRadius: '7px',
                  border: 'none',
                  cursor: 'pointer',
                  boxShadow: viewMode === 'families' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                  transition: 'all 0.12s ease',
                }}
              >
                <Home size={13} />
                <span>परिवार सूची ({familyGroups.length})</span>
              </button>
            </div>

            {/* Voting Filter Pills */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <button
                type="button"
                onClick={() => handleVotedFilterChange('all')}
                style={{
                  fontSize: '12px',
                  fontWeight: votedFilter === 'all' ? 700 : 500,
                  padding: '5px 11px',
                  borderRadius: '8px',
                  border: '1.5px solid',
                  cursor: 'pointer',
                  background: votedFilter === 'all' ? '#0f172a' : '#ffffff',
                  color: votedFilter === 'all' ? '#ffffff' : '#334155',
                  borderColor: votedFilter === 'all' ? '#0f172a' : '#cbd5e1',
                }}
              >
                सभी
              </button>

              <button
                type="button"
                onClick={() => handleVotedFilterChange('voted')}
                style={{
                  fontSize: '12px',
                  fontWeight: votedFilter === 'voted' ? 700 : 500,
                  padding: '5px 11px',
                  borderRadius: '8px',
                  border: '1.5px solid',
                  cursor: 'pointer',
                  background: votedFilter === 'voted' ? '#166534' : '#f0fdf4',
                  color: votedFilter === 'voted' ? '#ffffff' : '#166534',
                  borderColor: votedFilter === 'voted' ? '#166534' : '#bbf7d0',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                <CheckCircle2 size={12} /> दे दिया
              </button>

              <button
                type="button"
                onClick={() => handleVotedFilterChange('pending')}
                style={{
                  fontSize: '12px',
                  fontWeight: votedFilter === 'pending' ? 700 : 500,
                  padding: '5px 11px',
                  borderRadius: '8px',
                  border: '1.5px solid',
                  cursor: 'pointer',
                  background: votedFilter === 'pending' ? '#c2410c' : '#fff7ed',
                  color: votedFilter === 'pending' ? '#ffffff' : '#c2410c',
                  borderColor: votedFilter === 'pending' ? '#c2410c' : '#fed7aa',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                <Clock size={12} /> बाकी
              </button>
            </div>
          </div>
        </div>

        {/* ── Table / Family Cards / Loading / Empty States ── */}
        {loading ? (
          <div style={{ padding: '60px 20px', textAlign: 'center' }}>
            <LoaderCircle size={30} className="spin" style={{ margin: '0 auto 12px', color: '#7c3aed' }} />
            <p style={{ fontWeight: 600, color: '#334155' }}>डेटा लोड हो रहा है…</p>
          </div>
        ) : voters.length ? (
          viewMode === 'voters' ? (
            /* ════════════════ VIEW 1: VOTERS TABLE ════════════════ */
            <div className="table-scroll" style={{ overflowX: 'auto' }}>
              <table className="voter-table desk-table" style={{ width: '100%', margin: 0 }}>
                <thead>
                  <tr style={{ background: '#f8fafc' }}>
                    <th style={{ padding: '10px 14px' }}>क्र.</th>
                    <th style={{ padding: '10px 14px' }}>मतदाता का नाम</th>
                    <th style={{ padding: '10px 14px' }}>जाति / समुदाय</th>
                    <th style={{ padding: '10px 14px' }}>पहचान पत्र (EPIC)</th>
                    <th style={{ padding: '10px 14px' }}>वार्ड / भाग</th>
                    <th style={{ padding: '10px 14px' }}>मकान व परिवार</th>
                    <th style={{ padding: '10px 14px' }}>मोबाइल नं.</th>
                    <th style={{ padding: '10px 14px' }}>मतदान स्थिति</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedVoters.map((voter, index) => (
                    <tr key={voter._id || index} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '10px 14px', fontSize: '12px', color: '#64748b' }}>
                        {(currentPage - 1) * pageSize + index + 1}
                      </td>

                      <td style={{ padding: '10px 14px' }}>
                        <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '13.5px', display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                          {(() => {
                            const bName = getBilingualVoterName(voter);
                            return (
                              <>
                                <span>{bName.hi}</span>
                                {bName.en && bName.en !== bName.hi && (
                                  <span
                                    style={{
                                      fontSize: '11px',
                                      fontWeight: 700,
                                      color: '#1d4ed8',
                                      background: '#eff6ff',
                                      border: '1px solid #bfdbfe',
                                      borderRadius: '4px',
                                      padding: '1px 5px',
                                    }}
                                  >
                                    {bName.en}
                                  </span>
                                )}
                              </>
                            );
                          })()}
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
                          {voter.isMigrant && (
                            <span className="badge-migrant-dark">
                              प्रवासी {voter.migrantLocation ? `(${voter.migrantLocation})` : ''}
                            </span>
                          )}
                          {voter.supportStatus && voter.supportStatus !== 'unmarked' && (
                            <span
                              style={{
                                fontSize: '10px',
                                fontWeight: 750,
                                padding: '1px 6px',
                                borderRadius: '4px',
                                background: voter.supportStatus === 'core' ? '#dcfce7' : voter.supportStatus === 'swing' ? '#fef9c3' : '#fee2e2',
                                color: voter.supportStatus === 'core' ? '#166534' : voter.supportStatus === 'swing' ? '#854d0e' : '#991b1b',
                              }}
                            >
                              {voter.supportStatus === 'core' ? '100% अपना' : voter.supportStatus === 'swing' ? '50-50' : 'विरोधी'}
                            </span>
                          )}
                        </div>
                        {(() => {
                          const bRel = getBilingualRelativeName(voter);
                          return (
                            <div style={{ fontSize: '11.5px', color: '#64748b' }}>
                              {voter.relationType ? `${voter.relationType}: ` : 'पिता/पति: '}
                              <strong>{bRel.hi}</strong>
                              {bRel.en && bRel.en !== bRel.hi && ` (${bRel.en})`}
                              {voter.gender && ` · ${voter.gender}`}
                              {voter.age && ` (${voter.age} वर्ष)`}
                            </div>
                          );
                        })()}
                      </td>

                      <td style={{ padding: '10px 14px' }}>
                        <span
                          style={{
                            fontSize: '11.5px',
                            fontWeight: 700,
                            color: '#7c3aed',
                            background: '#f3e8ff',
                            padding: '3px 9px',
                            borderRadius: '6px',
                            border: '1px solid #e9d5ff',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {voter.caste || selectedCaste || 'अन्य'}
                        </span>
                      </td>

                      <td style={{ padding: '10px 14px', fontSize: '12.5px', fontWeight: 600, color: '#2563eb' }}>
                        {voter.epic || '—'}
                      </td>

                      <td style={{ padding: '10px 14px', fontSize: '12px', color: '#475569' }}>
                        वार्ड {voter.wardNo || '—'} · भाग {voter.partNo || '—'}
                      </td>

                      <td style={{ padding: '10px 14px' }}>
                        <button
                          type="button"
                          onClick={() => void showHousehold(voter)}
                          style={{
                            background: '#f0fdf4',
                            border: '1px solid #bbf7d0',
                            borderRadius: '6px',
                            padding: '3px 8px',
                            fontSize: '11.5px',
                            fontWeight: 600,
                            color: '#166534',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                          }}
                          title="इस घर के सभी सदस्य देखें"
                        >
                          <Home size={11} /> #{voter.houseNo || '—'} ({voter.householdCount || 1} सदस्य)
                        </button>
                      </td>

                      <td style={{ padding: '10px 14px', fontSize: '12px', color: '#334155' }}>
                        {voter.phone ? (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#047857', fontWeight: 600 }}>
                            <Phone size={11} /> {voter.phone}
                          </span>
                        ) : (
                          <span style={{ color: '#94a3b8' }}>—</span>
                        )}
                      </td>

                      <td style={{ padding: '10px 14px' }}>
                        <span
                          className={`record-status ${voter.voted ? 'status-voted' : 'status-pending'}`}
                          style={{
                            fontSize: '11.5px',
                            fontWeight: 700,
                            padding: '4px 10px',
                            borderRadius: '12px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            background: voter.voted ? '#dcfce7' : '#fee2e2',
                            color: voter.voted ? '#166534' : '#991b1b',
                            border: `1px solid ${voter.voted ? '#bbf7d0' : '#fecaca'}`,
                          }}
                        >
                          {voter.voted ? '✓ मतदान दर्ज' : 'मतदान बाकी'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Voter Pagination Controls */}
              {totalCommunityPages > 1 && (
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
                    <strong>{Math.min(currentPage * pageSize, voters.length).toLocaleString('hi-IN')}</strong> (कुल{' '}
                    {voters.length.toLocaleString('hi-IN')} मतदाता)
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
                      पेज {currentPage} / {totalCommunityPages}
                    </span>
                    <button
                      type="button"
                      disabled={currentPage >= totalCommunityPages}
                      onClick={() => setCurrentPage((p) => Math.min(totalCommunityPages, p + 1))}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        padding: '5px 12px',
                        borderRadius: '6px',
                        border: '1px solid #cbd5e1',
                        background: currentPage >= totalCommunityPages ? '#e2e8f0' : '#ffffff',
                        color: currentPage >= totalCommunityPages ? '#94a3b8' : '#0f172a',
                        fontSize: '12.5px',
                        fontWeight: 600,
                        cursor: currentPage >= totalCommunityPages ? 'not-allowed' : 'pointer',
                      }}
                    >
                      अगला <ChevronRight size={15} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* ════════════════ VIEW 2: FAMILIES CARDS LIST ════════════════ */
            <div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '16px' }}>
                {paginatedFamilies.map((fg) => {
                  const isExpanded = expandedFamilyKey === fg.key;
                  return (
                    <div
                      key={fg.key}
                      style={{
                        background: '#ffffff',
                        border: '1.5px solid #e2e8f0',
                        borderRadius: '14px',
                        overflow: 'hidden',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
                        transition: 'all 0.16s ease',
                      }}
                    >
                      {/* Family Card Header */}
                      <div
                        style={{
                          padding: '14px 18px',
                          background: isExpanded ? '#faf5ff' : '#f8fafc',
                          borderBottom: isExpanded ? '1.5px solid #e9d5ff' : 'none',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          flexWrap: 'wrap',
                          gap: '12px',
                        }}
                      >
                        {/* Left: House No, Head, Details */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
                          <div
                            style={{
                              width: '42px',
                              height: '42px',
                              borderRadius: '10px',
                              background: '#eff6ff',
                              color: '#2563eb',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontWeight: 800,
                              border: '1px solid #bfdbfe',
                              fontSize: '18px',
                            }}
                          >
                            <Home size={20} />
                          </div>

                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                              <span style={{ fontSize: '15.5px', fontWeight: 800, color: '#0f172a' }}>
                                मकान #{fg.houseNo || '—'}
                              </span>
                              <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 600 }}>
                                वार्ड {fg.wardNo || '—'} · भाग {fg.partNo || '—'}
                              </span>
                              <span
                                style={{
                                  fontSize: '11px',
                                  fontWeight: 750,
                                  color: '#7c3aed',
                                  background: '#f3e8ff',
                                  padding: '2px 8px',
                                  borderRadius: '6px',
                                  border: '1px solid #e9d5ff',
                                }}
                              >
                                {fg.caste || selectedCaste || 'अन्य'}
                              </span>
                              {fg.hasMigrant && (
                                <span className="badge-migrant-dark">
                                  प्रवासी {fg.migrantLocation ? `(${fg.migrantLocation})` : ''}
                                </span>
                              )}
                            </div>

                            <div style={{ fontSize: '12.5px', color: '#475569', marginTop: '3px' }}>
                              मुखिया: <strong>{fg.head.nameHi || fg.head.nameEn}</strong>
                              {fg.head.relativeNameHi && ` · (${fg.head.relationType || 'पिता/पति'}: ${fg.head.relativeNameHi})`}
                              {fg.head.age && ` · ${fg.head.age} वर्ष`}
                              {fg.head.gender && ` · ${fg.head.gender}`}
                            </div>
                          </div>
                        </div>

                        {/* Right: Support Status, Phone, Turnout & Actions */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                          {/* Support Status Badge */}
                          <span
                            style={{
                              fontSize: '12px',
                              fontWeight: 750,
                              padding: '4px 10px',
                              borderRadius: '8px',
                              border: '1px solid',
                              background:
                                fg.supportStatus === 'core'
                                  ? '#dcfce7'
                                  : fg.supportStatus === 'swing'
                                  ? '#fef9c3'
                                  : fg.supportStatus === 'opposition'
                                  ? '#fee2e2'
                                  : '#f1f5f9',
                              color:
                                fg.supportStatus === 'core'
                                  ? '#166534'
                                  : fg.supportStatus === 'swing'
                                  ? '#854d0e'
                                  : fg.supportStatus === 'opposition'
                                  ? '#991b1b'
                                  : '#475569',
                              borderColor:
                                fg.supportStatus === 'core'
                                  ? '#bbf7d0'
                                  : fg.supportStatus === 'swing'
                                  ? '#fef08a'
                                  : fg.supportStatus === 'opposition'
                                  ? '#fecaca'
                                  : '#cbd5e1',
                            }}
                          >
                            {fg.supportStatus === 'core'
                              ? '100% अपना'
                              : fg.supportStatus === 'swing'
                              ? '50-50'
                              : fg.supportStatus === 'opposition'
                              ? 'विरोधी'
                              : 'सामान्य'}
                          </span>

                          {/* Family Phone */}
                          {fg.phone ? (
                            <a
                              href={`tel:${fg.phone}`}
                              style={{
                                fontSize: '12px',
                                color: '#166534',
                                background: '#f0fdf4',
                                border: '1px solid #bbf7d0',
                                padding: '4px 8px',
                                borderRadius: '6px',
                                textDecoration: 'none',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                fontWeight: 650,
                              }}
                            >
                              <Phone size={12} /> {fg.phone}
                            </a>
                          ) : (
                            <span style={{ fontSize: '11.5px', color: '#94a3b8' }}>फोन नहीं</span>
                          )}

                          {/* Voting Turnout Pill */}
                          <div
                            style={{
                              fontSize: '12px',
                              fontWeight: 700,
                              background: '#ffffff',
                              border: '1px solid #cbd5e1',
                              padding: '4px 10px',
                              borderRadius: '8px',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                            }}
                          >
                            <span style={{ color: '#166534' }}>✓ {fg.votedCount}</span>
                            <span style={{ color: '#cbd5e1' }}>/</span>
                            <span style={{ color: '#0f172a' }}>{fg.members.length} वोट्स</span>
                            <span style={{ fontSize: '11px', color: '#64748b' }}>({fg.pendingCount} शेष)</span>
                          </div>

                          {/* Action: Edit Family Data */}
                          <button
                            type="button"
                            onClick={() => openEditFamilyModal(fg)}
                            style={{
                              background: '#0f172a',
                              color: '#ffffff',
                              border: 'none',
                              padding: '6px 12px',
                              borderRadius: '8px',
                              fontSize: '12px',
                              fontWeight: 700,
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '5px',
                              boxShadow: '0 2px 6px rgba(15,23,42,0.15)',
                            }}
                            title="परिवार समर्थन, मोबाइल, प्रवासी स्थिति एडिट करें"
                          >
                            <Pencil size={12} /> परिवार डेटा एडिट
                          </button>

                          {/* Action: Expand/Collapse Members */}
                          <button
                            type="button"
                            onClick={() => setExpandedFamilyKey(isExpanded ? null : fg.key)}
                            style={{
                              background: isExpanded ? '#e2e8f0' : '#ffffff',
                              color: '#334155',
                              border: '1px solid #cbd5e1',
                              padding: '6px 10px',
                              borderRadius: '8px',
                              fontSize: '12px',
                              fontWeight: 650,
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                            }}
                          >
                            <Users size={12} />
                            <span>सदस्य ({fg.members.length})</span>
                            {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                          </button>
                        </div>
                      </div>

                      {/* Expanded Family Members Table */}
                      {isExpanded && (
                        <div style={{ padding: '12px 16px', background: '#ffffff', overflowX: 'auto' }}>
                          <table className="voter-table desk-table" style={{ width: '100%', margin: 0 }}>
                            <thead>
                              <tr style={{ background: '#f8fafc' }}>
                                <th style={{ width: '40px' }}>क्र.</th>
                                <th>सदस्य का नाम</th>
                                <th>संबंधी</th>
                                <th>EPIC</th>
                                <th>आयु / लिंग</th>
                                <th>मोबाइल</th>
                                <th>मतदान स्थिति</th>
                              </tr>
                            </thead>
                            <tbody>
                              {fg.members.map((m, mIdx) => (
                                <tr key={m._id || mIdx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                  <td style={{ fontSize: '11.5px', color: '#64748b' }}>{m.serialNo || mIdx + 1}</td>
                                  <td>
                                    <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                      <span>{m.nameHi || m.nameEn}</span>
                                      {m.isMigrant && (
                                        <span className="badge-migrant-dark" style={{ fontSize: '9.5px', padding: '1px 5px' }}>
                                          प्रवासी
                                        </span>
                                      )}
                                    </div>
                                  </td>
                                  <td style={{ fontSize: '12px', color: '#475569' }}>
                                    {m.relativeNameHi || '—'} {m.relationType ? `(${m.relationType})` : ''}
                                  </td>
                                  <td style={{ fontSize: '12px', color: '#2563eb', fontWeight: 650 }}>{m.epic || '—'}</td>
                                  <td style={{ fontSize: '12px', color: '#475569' }}>
                                    {m.age ? `${m.age} वर्ष` : '—'} · {m.gender || '—'}
                                  </td>
                                  <td style={{ fontSize: '12px', color: '#334155' }}>
                                    {m.phone ? (
                                      <span style={{ color: '#166534', fontWeight: 600 }}>{m.phone}</span>
                                    ) : (
                                      <span style={{ color: '#94a3b8' }}>—</span>
                                    )}
                                  </td>
                                  <td>
                                    <span
                                      style={{
                                        fontSize: '11px',
                                        fontWeight: 750,
                                        padding: '3px 8px',
                                        borderRadius: '12px',
                                        background: m.voted ? '#dcfce7' : '#fee2e2',
                                        color: m.voted ? '#166534' : '#991b1b',
                                        border: `1px solid ${m.voted ? '#bbf7d0' : '#fecaca'}`,
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '4px',
                                      }}
                                    >
                                      {m.voted ? '✓ मतदान दर्ज' : 'मतदान बाकी'}
                                    </span>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Family Pagination Controls */}
              {totalFamilyPages > 1 && (
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
                    <strong>{Math.min(currentPage * pageSize, familyGroups.length).toLocaleString('hi-IN')}</strong> (कुल{' '}
                    {familyGroups.length.toLocaleString('hi-IN')} परिवार)
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
                      पेज {currentPage} / {totalFamilyPages}
                    </span>
                    <button
                      type="button"
                      disabled={currentPage >= totalFamilyPages}
                      onClick={() => setCurrentPage((p) => Math.min(totalFamilyPages, p + 1))}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        padding: '5px 12px',
                        borderRadius: '6px',
                        border: '1px solid #cbd5e1',
                        background: currentPage >= totalFamilyPages ? '#e2e8f0' : '#ffffff',
                        color: currentPage >= totalFamilyPages ? '#94a3b8' : '#0f172a',
                        fontSize: '12.5px',
                        fontWeight: 600,
                        cursor: currentPage >= totalFamilyPages ? 'not-allowed' : 'pointer',
                      }}
                    >
                      अगला <ChevronRight size={15} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )
        ) : (
          /* Empty state */
          <div style={{ padding: '60px 20px', textAlign: 'center' }}>
            <div
              style={{
                width: '56px',
                height: '56px',
                borderRadius: '16px',
                background: '#f3e8ff',
                color: '#7c3aed',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px',
              }}
            >
              <UsersRound size={28} />
            </div>

            <h3 style={{ margin: '0 0 8px', fontSize: '16px', fontWeight: 700, color: '#1e1b4b' }}>
              {hasSearched ? 'इस फ़िल्टर में कोई मतदाता नहीं मिला' : 'जाति का चयन करें या खोजें'}
            </h3>
            <p style={{ margin: '0 0 16px', fontSize: '13px', color: '#64748b', maxWidth: '440px', marginInline: 'auto' }}>
              {hasSearched
                ? 'चयनित फ़िल्टर के अनुसार कोई मतदाता रिकॉर्ड उपलब्ध नहीं है। कृपया "सभी मतदाता" विकल्प चुनें या अन्य जाति देखें।'
                : 'ऊपर दिए गए जातिगत सांख्यिकी ट्रैकर में से किसी एक जाति पर क्लिक करें ताकि उसके सभी मतदाताओं की सूची व मतदान स्थिति तुरंत देख सकें।'}
            </p>
          </div>
        )}
      </section>

      {/* ── HOUSEHOLD MODAL ── */}
      {selectedHouse && (
        <div
          className="modal-backdrop"
          onClick={() => setSelectedHouse('')}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            background: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
          }}
        >
          <section
            className="form-modal"
            onClick={(e) => e.stopPropagation()}
            style={{
              maxWidth: '780px',
              width: '100%',
              background: '#ffffff',
              borderRadius: '16px',
              padding: '24px',
              maxHeight: '85vh',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              border: '1px solid #e2e8f0',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingBottom: '16px',
                borderBottom: '1px solid #e2e8f0',
                marginBottom: '16px',
              }}
            >
              <div>
                <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 700, color: '#0f172a' }}>
                  मकान #{selectedHouse} · घर के सभी सदस्य
                </h3>
                <p style={{ margin: '3px 0 0', fontSize: '12.5px', color: '#64748b' }}>
                  {selectedVoterForFamily
                    ? `वार्ड ${selectedVoterForFamily.wardNo || '—'} · भाग ${selectedVoterForFamily.partNo || '—'} · कुल ${family.length} सदस्य`
                    : `कुल ${family.length} सदस्य`}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setSelectedHouse('')}
                style={{
                  background: '#f1f5f9',
                  border: 'none',
                  borderRadius: '50%',
                  width: '32px',
                  height: '32px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  color: '#64748b',
                }}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', overflowX: 'auto', WebkitOverflowScrolling: 'touch', minHeight: '200px' }}>
              {familyLoading ? (
                <div style={{ padding: '40px 20px', textAlign: 'center' }}>
                  <LoaderCircle size={24} className="spin" style={{ margin: '0 auto 10px', color: '#047857' }} />
                  घर के सदस्य लोड हो रहे हैं…
                </div>
              ) : family.length ? (
                <table className="voter-table desk-table" style={{ width: '100%', margin: 0 }}>
                  <thead style={{ position: 'sticky', top: 0, background: '#f8fafc' }}>
                    <tr>
                      <th style={{ padding: '8px 12px' }}>क्र.</th>
                      <th style={{ padding: '8px 12px' }}>मतदाता</th>
                      <th style={{ padding: '8px 12px' }}>पिता / पति</th>
                      <th style={{ padding: '8px 12px' }}>EPIC</th>
                      <th style={{ padding: '8px 12px' }}>आयु / जेंडर</th>
                      <th style={{ padding: '8px 12px' }}>स्थिति</th>
                    </tr>
                  </thead>
                  <tbody>
                    {family.map((member, idx) => (
                      <tr key={member._id || idx}>
                        <td style={{ padding: '8px 12px', fontSize: '12px', color: '#64748b' }}>
                          {member.serialNo || idx + 1}
                        </td>
                        <td style={{ padding: '8px 12px', fontWeight: 600, color: '#0f172a' }}>
                          {member.nameHi || member.nameEn}
                        </td>
                        <td style={{ padding: '8px 12px', fontSize: '12px', color: '#475569' }}>
                          {member.relativeNameHi || '—'}
                        </td>
                        <td style={{ padding: '8px 12px', fontSize: '12px', color: '#2563eb', fontWeight: 600 }}>
                          {member.epic || '—'}
                        </td>
                        <td style={{ padding: '8px 12px', fontSize: '12px', color: '#475569' }}>
                          {member.age ? `${member.age} वर्ष` : '—'} · {member.gender || '—'}
                        </td>
                        <td style={{ padding: '8px 12px' }}>
                          <span
                            className={`record-status ${member.voted ? 'status-voted' : 'status-pending'}`}
                            style={{ fontSize: '11px', padding: '2px 8px' }}
                          >
                            {member.voted ? '✓ मतदान दर्ज' : 'शेष'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div style={{ padding: '30px 20px', textAlign: 'center', color: '#64748b' }}>
                  इस मकान के लिए अन्य सदस्य नहीं मिले।
                </div>
              )}
            </div>

            <div style={{ marginTop: '16px', paddingTop: '12px', borderTop: '1px solid #f1f5f9', textAlign: 'right' }}>
              <button className="button-secondary" type="button" onClick={() => setSelectedHouse('')}>
                बंद करें
              </button>
            </div>
          </section>
        </div>
      )}

      {/* ── FAMILY BULK EDIT MODAL (परिवार डेटा बल्क एडिट) ── */}
      {editingFamily && (
        <div
          className="modal-backdrop"
          onClick={() => !savingFamily && setEditingFamily(null)}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            background: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
          }}
        >
          <section
            className="form-modal"
            onClick={(e) => e.stopPropagation()}
            style={{
              maxWidth: '640px',
              width: '100%',
              background: '#ffffff',
              borderRadius: '16px',
              padding: '24px',
              maxHeight: '90vh',
              overflowY: 'auto',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              border: '1px solid #e2e8f0',
            }}
          >
            {/* Modal Header */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingBottom: '14px',
                borderBottom: '1px solid #e2e8f0',
                marginBottom: '16px',
              }}
            >
              <div>
                <h3
                  style={{
                    margin: 0,
                    fontSize: '17.5px',
                    fontWeight: 800,
                    color: '#0f172a',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    flexWrap: 'wrap',
                  }}
                >
                  <span>परिवार डेटा एडिट</span>
                  <span
                    style={{
                      fontSize: '12px',
                      background: '#eff6ff',
                      color: '#2563eb',
                      padding: '2px 8px',
                      borderRadius: '6px',
                      border: '1px solid #bfdbfe',
                    }}
                  >
                    मकान #{editingFamily.houseNo || '—'}
                  </span>
                </h3>
                <p style={{ margin: '3px 0 0', fontSize: '12.5px', color: '#64748b' }}>
                  मुखिया: <strong>{editingFamily.head.nameHi || editingFamily.head.nameEn}</strong> ·{' '}
                  कुल {editingFamily.members.length} सदस्य · वार्ड {editingFamily.wardNo || '—'} (भाग {editingFamily.partNo || '—'})
                </p>
              </div>

              <button
                type="button"
                onClick={() => setEditingFamily(null)}
                disabled={savingFamily}
                style={{
                  background: '#f1f5f9',
                  border: 'none',
                  borderRadius: '50%',
                  width: '32px',
                  height: '32px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  color: '#64748b',
                }}
              >
                <X size={18} />
              </button>
            </div>

            {familyEditError && (
              <div className="inline-notice error-notice" style={{ marginBottom: '14px' }}>
                {familyEditError}
              </div>
            )}

            {/* Field 1: Support Status (100% अपना / 50-50 / विरोधी / सामान्य) */}
            <div style={{ marginBottom: '16px' }}>
              <label
                style={{
                  display: 'block',
                  fontSize: '13px',
                  fontWeight: 750,
                  color: '#1e293b',
                  marginBottom: '8px',
                }}
              >
                1. पारिवारिक समर्थन स्थिति (पूरे परिवार पर लागू)
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => setEditSupportStatus('core')}
                  style={{
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: `2px solid ${editSupportStatus === 'core' ? '#16a34a' : '#bbf7d0'}`,
                    background: editSupportStatus === 'core' ? '#dcfce7' : '#f0fdf4',
                    color: '#166534',
                    fontWeight: 750,
                    fontSize: '12.5px',
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'all 0.12s ease',
                  }}
                >
                  100% अपना (पक्का)
                </button>

                <button
                  type="button"
                  onClick={() => setEditSupportStatus('swing')}
                  style={{
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: `2px solid ${editSupportStatus === 'swing' ? '#ca8a04' : '#fef08a'}`,
                    background: editSupportStatus === 'swing' ? '#fef9c3' : '#fefce8',
                    color: '#854d0e',
                    fontWeight: 750,
                    fontSize: '12.5px',
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'all 0.12s ease',
                  }}
                >
                  50-50 (झुकाव)
                </button>

                <button
                  type="button"
                  onClick={() => setEditSupportStatus('opposition')}
                  style={{
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: `2px solid ${editSupportStatus === 'opposition' ? '#dc2626' : '#fecaca'}`,
                    background: editSupportStatus === 'opposition' ? '#fee2e2' : '#fef2f2',
                    color: '#991b1b',
                    fontWeight: 750,
                    fontSize: '12.5px',
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'all 0.12s ease',
                  }}
                >
                  विरोधी (विपक्ष)
                </button>

                <button
                  type="button"
                  onClick={() => setEditSupportStatus('unmarked')}
                  style={{
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: `2px solid ${editSupportStatus === 'unmarked' ? '#64748b' : '#e2e8f0'}`,
                    background: editSupportStatus === 'unmarked' ? '#f1f5f9' : '#ffffff',
                    color: '#334155',
                    fontWeight: 750,
                    fontSize: '12.5px',
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'all 0.12s ease',
                  }}
                >
                  सामान्य / अनिर्धारित
                </button>
              </div>
            </div>

            {/* Field 2: Family Phone (10-Digit Mobile) */}
            <div style={{ marginBottom: '16px' }}>
              <label
                style={{
                  display: 'block',
                  fontSize: '13px',
                  fontWeight: 750,
                  color: '#1e293b',
                  marginBottom: '6px',
                }}
              >
                2. पारिवारिक मोबाइल नंबर (10 अंक)
              </label>
              <div style={{ position: 'relative' }}>
                <Phone
                  size={15}
                  style={{
                    position: 'absolute',
                    left: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: '#64748b',
                  }}
                />
                <input
                  type="tel"
                  maxLength={10}
                  placeholder="10 अंकों का फोन नंबर (उदा. 9876543210)"
                  value={editMobileNo}
                  onChange={(e) => setEditMobileNo(e.target.value.replace(/\D/g, '').slice(0, 10))}
                  style={{
                    width: '100%',
                    height: '42px',
                    padding: '8px 12px 8px 36px',
                    fontSize: '14px',
                    borderRadius: '8px',
                    border: '1.5px solid #cbd5e1',
                    outline: 'none',
                  }}
                />
              </div>
              <span style={{ fontSize: '11.5px', color: '#64748b', display: 'block', marginTop: '4px' }}>
                यह नंबर इस परिवार के सभी {editingFamily.members.length} सदस्यों में एक साथ अपडेट हो जाएगा।
              </span>
            </div>

            {/* Field 3: Parwasi (Migrant) Status & Location */}
            <div
              style={{
                marginBottom: '16px',
                background: '#faf5ff',
                border: '1.5px solid #e9d5ff',
                borderRadius: '10px',
                padding: '12px 14px',
              }}
            >
              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  cursor: 'pointer',
                  fontSize: '13px',
                  fontWeight: 750,
                  color: '#4c1d95',
                  userSelect: 'none',
                }}
              >
                <input
                  type="checkbox"
                  checked={editIsMigrant}
                  onChange={(e) => setEditIsMigrant(e.target.checked)}
                  style={{ width: '16px', height: '16px', accentColor: '#5b21b6', cursor: 'pointer' }}
                />
                <span>इस परिवार / सदस्यों को प्रवासी चिह्नित करें (शहर से बाहर)</span>
              </label>

              {editIsMigrant && (
                <div style={{ marginTop: '10px' }}>
                  <label
                    style={{
                      display: 'block',
                      fontSize: '12px',
                      fontWeight: 600,
                      color: '#6b21a8',
                      marginBottom: '4px',
                    }}
                  >
                    वर्तमान स्थान / शहर का नाम:
                  </label>
                  <div style={{ position: 'relative' }}>
                    <MapPin
                      size={14}
                      style={{
                        position: 'absolute',
                        left: '10px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        color: '#7c3aed',
                      }}
                    />
                    <input
                      type="text"
                      placeholder="उदा. मुंबई, सूरत, दिल्ली, अहमदाबाद, जयपुर..."
                      value={editMigrantLocation}
                      onChange={(e) => setEditMigrantLocation(e.target.value)}
                      style={{
                        width: '100%',
                        height: '38px',
                        padding: '6px 10px 6px 32px',
                        fontSize: '13px',
                        borderRadius: '6px',
                        border: '1px solid #d8b4fe',
                        outline: 'none',
                        background: '#ffffff',
                      }}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Field 4: Caste Assignment */}
            <div style={{ marginBottom: '20px' }}>
              <label
                style={{
                  display: 'block',
                  fontSize: '13px',
                  fontWeight: 750,
                  color: '#1e293b',
                  marginBottom: '6px',
                }}
              >
                4. पारिवारिक जाति (Caste)
              </label>
              <input
                type="text"
                placeholder="उदा. जाट, राजपूत, ब्राह्मण, गुर्जर, कुमावत..."
                value={editCaste}
                onChange={(e) => setEditCaste(e.target.value)}
                list="caste-suggestions"
                style={{
                  width: '100%',
                  height: '40px',
                  padding: '8px 12px',
                  fontSize: '13.5px',
                  borderRadius: '8px',
                  border: '1.5px solid #cbd5e1',
                  outline: 'none',
                }}
              />
              <datalist id="caste-suggestions">
                {casteStats.map((c) => (
                  <option key={c.name} value={c.name} />
                ))}
              </datalist>
              <span style={{ fontSize: '11.5px', color: '#64748b', display: 'block', marginTop: '4px' }}>
                चयन करने पर पूरे परिवार के सभी सदस्यों की जाति यह अपडेट होगी।
              </span>
            </div>

            {/* Actions */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'flex-end',
                gap: '10px',
                borderTop: '1px solid #f1f5f9',
                paddingTop: '14px',
              }}
            >
              <button
                type="button"
                className="button-secondary"
                onClick={() => setEditingFamily(null)}
                disabled={savingFamily}
              >
                रद्द करें
              </button>

              <button
                type="button"
                onClick={() => void handleSaveFamily()}
                disabled={savingFamily}
                style={{
                  padding: '8px 20px',
                  borderRadius: '8px',
                  background: '#0f172a',
                  color: '#ffffff',
                  fontWeight: 750,
                  fontSize: '13.5px',
                  border: 'none',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  boxShadow: '0 2px 8px rgba(15,23,42,0.2)',
                }}
              >
                {savingFamily ? <LoaderCircle size={15} className="spin" /> : <Sparkles size={15} />}
                <span>पूरे परिवार में सेव करें</span>
              </button>
            </div>
          </section>
        </div>
      )}

      {/* Full Resolution Voter Photo Lightbox Modal */}
      <VoterPhotoModal
        isOpen={Boolean(photoModalVoter)}
        onClose={() => setPhotoModalVoter(null)}
        voter={photoModalVoter}
      />
    </div>
  );
}
