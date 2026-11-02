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
  Sparkles,
  UserCheck,
} from 'lucide-react';
import { apiFetch, getApiError, decodeJwtPayload } from '@/lib/api';
import { createSpeechRecognition, SpeechRecognitionLike } from '@/lib/speech';
import { downloadSlip, downloadBulkSlipsAsZip, generateSlipImage, downloadFamilySlip, generateFamilySlipImage } from '@/lib/downloadSlip';
import { shareVoterSlipToWhatsApp, shareFamilySlipToWhatsApp } from '@/lib/whatsappShare';
import { VoterSlipTemplate, SlipConfig, SlipFormat, defaultSlipConfig } from '@/components/VoterSlipTemplate';
import { FamilyVoterSlipTemplate } from '@/components/FamilyVoterSlipTemplate';
import { WhatsAppLogo } from '@/components/WhatsAppLogo';
import { WhatsAppWebHelperModal } from '@/components/WhatsAppWebHelperModal';
import { attachEnglishNames, transliterateHindiToEnglish, matchesVoterQuery } from '@/lib/transliteration';

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
  mobileNo?: string;
  boothName?: string;
  villageName?: string;
  villageNameHi?: string;
  occupation?: string;
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

interface Household {
  key: string;
  houseNo: string;
  wardNo: string;
  partNo: string;
  members: Voter[];
  memberCount: number;
  headName: string;
}

const DEFAULT_CASTE_PRESETS: string[] = [
  'जंज राजपूत',
  'फ़िटक राजपूत',
  'खालत राजपूत',
  'तंवर राजपूत',
  'अन्य राजपूत',
  'रावना राजपूत',
  'मेघवाल जयपाल',
  'मेघवाल वानर',
  'मेघवाल पंवार',
  'मेघवाल बडल',
  'भील',
  'भील सिंध',
  'बेलदार',
  'सुथार',
  'कुंभार',
  'दर्जी',
  'मुसलमान',
  'जाट',
  'बिश्नोई',
  'गवारिया',
  'भाट',
  'ब्राह्मण',
  'शर्मा',
  'पालीवाल',
  'जोगी',
  'कुष्ठ कॉलोनी',
  'खत्री',
  'गर्ग',
  'माली',
  'साध',
  'सोनी',
  'लोहार',
  'सांसी',
  'गोस्वामी',
  'नाई',
  'दिशांत्री',
  'अन्य',
];

export default function VoterDirectoryPage() {
  const [voters, setVoters] = useState<Voter[]>([]);
  const [orgCustomCastes, setOrgCustomCastes] = useState<string[]>(() => {
    try {
      const cached = typeof window !== 'undefined' ? localStorage.getItem('org_custom_castes') : null;
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return [];
  });
  const [isCustomCasteOpen, setIsCustomCasteOpen] = useState(false);
  const [casteFilter, setCasteFilter] = useState('');
  const customCasteInputRef = useRef<HTMLInputElement | null>(null);

  const activeCastePresets = useMemo(() => {
    return orgCustomCastes.length > 0 ? orgCustomCastes : DEFAULT_CASTE_PRESETS;
  }, [orgCustomCastes]);

  const filteredCastes = useMemo(() => {
    const q = casteFilter.trim().toLowerCase();
    if (!q) return activeCastePresets;
    return activeCastePresets.filter((chip) => chip.toLowerCase().includes(q));
  }, [casteFilter, activeCastePresets]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [relativeNameQuery, setRelativeNameQuery] = useState('');

  // Real-time instant bilingual search filter (English and Hindi)
  const displayedVoters = useMemo(() => {
    const q = searchQuery.trim();
    const relQ = relativeNameQuery.trim();
    if (!q && !relQ) return voters;
    return voters.filter((v) => {
      if (q && !matchesVoterQuery(q, v)) return false;
      if (relQ && !matchesVoterQuery(relQ, { nameHi: v.relativeNameHi, nameEn: v.relativeNameEn })) return false;
      return true;
    });
  }, [voters, searchQuery, relativeNameQuery]);

  const [voiceError, setVoiceError] = useState('');
  const [voiceActiveField, setVoiceActiveField] = useState<'search' | 'relative' | null>(null);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const [houseQuery, setHouseQuery] = useState('');
  const [wardFilter, setWardFilter] = useState('');
  const [selectedCaste, setSelectedCaste] = useState('');
  const [selectedGender, setSelectedGender] = useState('');
  const [totalFamilies, setTotalFamilies] = useState<number>(0);
  const [isFamilyMode, setIsFamilyMode] = useState<boolean>(false);
  const [households, setHouseholds] = useState<Household[]>([]);
  const [householdLoading, setHouseholdLoading] = useState<boolean>(false);
  const [householdPage, setHouseholdPage] = useState<number>(1);
  const [householdTotalPages, setHouseholdTotalPages] = useState<number>(1);
  const [householdTotal, setHouseholdTotal] = useState<number>(0);

  // Bulk Tag and Bulk Caste modal states
  const [isBulkTagOpen, setIsBulkTagOpen] = useState(false);
  const [isBulkCasteOpen, setIsBulkCasteOpen] = useState(false);
  const [bulkTagFormData, setBulkTagFormData] = useState({
    supportStatus: '',
    surety: '',
    assignedWorker: '',
    notes: '',
    isMigrant: false,
    migrantLocation: '',
  });
  const [bulkCasteInput, setBulkCasteInput] = useState('');
  const [bulkCasteSearch, setBulkCasteSearch] = useState('');
  const [isBulkSubmitting, setIsBulkSubmitting] = useState(false);

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
  const latestSearchRequestIdRef = useRef(0);
  const searchAbortControllerRef = useRef<AbortController | null>(null);

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
    boothName: '',
    villageName: '',
    familyId: '',
  });

  // Slip modal state
  const [slipVoter, setSlipVoter] = useState<Voter | null>(null);
  const [modalSlipFormat, setModalSlipFormat] = useState<SlipFormat>('full');
  const [cachedSlipImageDataUrl, setCachedSlipImageDataUrl] = useState<string | null>(null);
  const modalSlipRef = useRef<HTMLDivElement>(null);
  const [isDownloadingSingleSlip, setIsDownloadingSingleSlip] = useState(false);

  // Family slip modal state
  const [familySlipData, setFamilySlipData] = useState<{
    members: Voter[];
    houseNo: string;
    wardNo: string;
    partNo: string;
  } | null>(null);
  const [familySlipPhone, setFamilySlipPhone] = useState('');
  const [cachedFamilySlipDataUrl, setCachedFamilySlipDataUrl] = useState<string | null>(null);
  const [isDownloadingFamilySlip, setIsDownloadingFamilySlip] = useState(false);
  const [familySlipSending, setFamilySlipSending] = useState(false);
  const [familySlipMessage, setFamilySlipMessage] = useState('');
  const modalFamilySlipRef = useRef<HTMLDivElement>(null);

  const [workersList, setWorkersList] = useState<Array<{ id: string; name: string }>>([]);
  const [slipPhone, setSlipPhone] = useState('');
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [actionMessage, setActionMessage] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  const [whatsappHelperData, setWhatsappHelperData] = useState<{
    isOpen: boolean;
    voterName: string;
    epic?: string;
    imageDataUrl?: string;
    waLink?: string;
  } | null>(null);

  const [whatsappQuota, setWhatsappQuota] = useState<{
    whatsappEnabled: boolean;
    whatsappCredits: number;
    whatsappUsed: number;
    canSend: boolean;
    metaConfigured: boolean;
  } | null>(null);

  const [slipConfig, setSlipConfig] = useState<SlipConfig>(defaultSlipConfig);
  const [organizationName, setOrganizationName] = useState<string>('');
  const [hidePartNo, setHidePartNo] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const val = localStorage.getItem('sys_hide_part_no');
      if (val !== null) return val === 'true';
    }
    return true; // Default to true in ward/panchayat elections
  });

  // Load organization details
  const loadOrgDetails = useCallback(async () => {
    try {
      const selectedOrgId = typeof window !== 'undefined' ? window.localStorage.getItem('selectedClientOrgId') : null;
      const res = await apiFetch('/auth/clients', { cache: 'no-store' });
      if (res.ok) {
        const clients = await res.json();
        if (Array.isArray(clients) && clients.length > 0) {
          const matched = selectedOrgId && selectedOrgId !== 'all'
            ? clients.find((c: any) => c.id === selectedOrgId)
            : clients[0];
          if (matched) {
            setOrganizationName(matched.name);
            if (matched.settings?.hidePartNo !== undefined) {
              setHidePartNo(matched.settings.hidePartNo);
              if (typeof window !== 'undefined') localStorage.setItem('sys_hide_part_no', String(matched.settings.hidePartNo));
            }
            const orgCastes = Array.isArray(matched.customCastes) && matched.customCastes.length > 0
              ? matched.customCastes
              : Array.isArray(matched.settings?.customCastes) && matched.settings.customCastes.length > 0
              ? matched.settings.customCastes
              : [];
            if (orgCastes.length > 0) {
              setOrgCustomCastes(orgCastes);
              if (typeof window !== 'undefined') {
                localStorage.setItem('org_custom_castes', JSON.stringify(orgCastes));
              }
            } else {
              setOrgCustomCastes([]);
              if (typeof window !== 'undefined') {
                localStorage.removeItem('org_custom_castes');
              }
            }
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
        if (data.slipConfig) {
          const loadedCfg = { ...defaultSlipConfig, ...data.slipConfig };
          setSlipConfig(loadedCfg);
          if (loadedCfg.slipFormat) {
            setModalSlipFormat(loadedCfg.slipFormat);
          }
        }
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
        if (typeof data.totalFamilies === 'number') {
          setTotalFamilies(data.totalFamilies);
        }
      }
    } catch {}
  }, []);

  // Load dynamic castes from backend database
  const loadCastes = useCallback(async () => {
    try {
      const res = await apiFetch('/voters/castes', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.castes) && data.castes.length > 0) {
          setOrgCustomCastes(data.castes);
          if (typeof window !== 'undefined') {
            localStorage.setItem('org_custom_castes', JSON.stringify(data.castes));
          }
        }
      }
    } catch {}
  }, []);

  // Load paginated households for family directory mode
  const loadHouseholds = useCallback(async (targetPage = 1, ward = '', search = '') => {
    setHouseholdLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(targetPage),
        limit: '30',
        ...(ward ? { ward } : {}),
        ...(search ? { search } : {}),
      });
      const res = await apiFetch(`/voters/households?${params.toString()}`, { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        setHouseholds(data.households || []);
        setHouseholdPage(data.pagination?.page || 1);
        setHouseholdTotalPages(data.pagination?.totalPages || 1);
        setHouseholdTotal(data.pagination?.total || (data.households || []).length);
        if (data.pagination?.total && (!totalFamilies || totalFamilies === 0)) {
          setTotalFamilies(data.pagination.total);
        }
      }
    } catch {
      setHouseholds([]);
    } finally {
      setHouseholdLoading(false);
    }
  }, [totalFamilies]);

  useEffect(() => {
    void loadOrgDetails();
    void loadWardsSummary();
    void loadCastes();
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
  }, [loadOrgDetails, loadWardsSummary, loadCastes, loadSlipConfig]);

  // Load voter records
  const loadVoters = useCallback(async (
    search = '',
    house = '',
    nextPage = 1,
    selectedWard = '',
    householdPart = '',
    relative = '',
    casteParam?: string,
    genderParam?: string,
  ) => {
    const isSearching = Boolean((search && search.trim()) || (relative && relative.trim()));
    // When actively searching by name/EPIC/relative, release any family/house lock
    const effectiveHouse = isSearching ? '' : house;
    if (isSearching) {
      setFamilyHouse('');
      setFamilyWard('');
      setFamilyPart('');
      setHouseQuery('');
    } else {
      setFamilyHouse(effectiveHouse);
    }

    const requestId = ++latestSearchRequestIdRef.current;
    if (searchAbortControllerRef.current) {
      try {
        searchAbortControllerRef.current.abort();
      } catch {}
    }
    const controller = new AbortController();
    searchAbortControllerRef.current = controller;

    setLoading(true);
    setError('');
    setSelectedIds([]);
    setPage(nextPage);

    const activeWard = selectedWard !== undefined ? selectedWard : filtersRef.current.ward;
    const activeCaste = casteParam !== undefined ? casteParam : selectedCaste;
    const activeGender = genderParam !== undefined ? genderParam : selectedGender;

    const familyParams = new URLSearchParams();
    if (activeWard) familyParams.set('ward', activeWard);
    if (householdPart) familyParams.set('part', householdPart);

    const path = effectiveHouse
      ? `/voters/family/${encodeURIComponent(effectiveHouse)}${familyParams.toString() ? `?${familyParams.toString()}` : ''}`
      : `/voters?${new URLSearchParams({
          ...(search && search.trim() ? { search: search.trim() } : {}),
          ...(relative && relative.trim() ? { relative: relative.trim() } : {}),
          ...(activeWard ? { ward: activeWard } : {}),
          ...(activeCaste ? { caste: activeCaste } : {}),
          ...(activeGender ? { gender: activeGender } : {}),
          ...(filtersRef.current.supportStatus ? { supportStatus: filtersRef.current.supportStatus } : {}),
          ...(filtersRef.current.isMigrant ? { isMigrant: filtersRef.current.isMigrant } : {}),
          page: String(nextPage),
          pageSize: String(pageSizeRef.current),
        })}`;

    try {
      const response = await apiFetch(path, { cache: 'no-store', signal: controller.signal });
      if (requestId !== latestSearchRequestIdRef.current) return;

      if (!response.ok) {
        throw new Error(await getApiError(response, 'मतदाता सूची लोड नहीं हो सकी।'));
      }
      const result: unknown = await response.json();
      if (requestId !== latestSearchRequestIdRef.current) return;

      const records = Array.isArray(result)
        ? result
        : result && typeof result === 'object' && 'data' in result && Array.isArray(result.data)
          ? result.data
          : null;
      if (!records) {
        throw new Error('सर्वर से सूची का सही उत्तर नहीं मिला।');
      }
      const normalizedRecords = (records as Array<Record<string, unknown>>).map((r) => {
        const voterObj = {
          ...r,
          phone: String(r.phone || r.mobileNo || ''),
          mobileNo: String(r.mobileNo || r.phone || ''),
        } as Voter;
        return attachEnglishNames(voterObj);
      });

      setVoters(normalizedRecords);
      setTotalRecords(
        result && typeof result === 'object' && 'total' in result && typeof result.total === 'number'
          ? result.total
          : records.length,
      );
    } catch (loadError: any) {
      if (loadError?.name === 'AbortError') return;
      if (requestId !== latestSearchRequestIdRef.current) return;
      setVoters([]);
      setTotalRecords(0);
      setError(loadError instanceof Error ? loadError.message : 'मतदाता सूची लोड नहीं हो सकी।');
    } finally {
      if (requestId === latestSearchRequestIdRef.current) {
        setLoading(false);
      }
    }
  }, [selectedCaste, selectedGender]);

  const isInitialSearchMount = useRef(true);
  useEffect(() => {
    if (isInitialSearchMount.current) {
      isInitialSearchMount.current = false;
      return;
    }
    const timer = setTimeout(() => {
      const trimmedSearch = searchQuery.trim();
      const trimmedRelative = relativeNameQuery.trim();
      const effectiveHouse = trimmedSearch || trimmedRelative ? '' : houseQuery.trim();
      void loadVoters(trimmedSearch, effectiveHouse, 1, wardFilter, '', trimmedRelative, selectedCaste, selectedGender);
    }, 200);
    return () => clearTimeout(timer);
  }, [searchQuery, relativeNameQuery, loadVoters, houseQuery, wardFilter, selectedCaste, selectedGender]);

  useEffect(() => {
    void Promise.resolve().then(() => loadVoters());
  }, [loadVoters]);

  // Client switch listener
  useEffect(() => {
    const handleClientChange = () => {
      void loadOrgDetails();
      void loadWardsSummary();
      void loadCastes();
      void loadSlipConfig();
      void loadVoters();
    };
    window.addEventListener('client-changed', handleClientChange);
    return () => window.removeEventListener('client-changed', handleClientChange);
  }, [loadOrgDetails, loadWardsSummary, loadCastes, loadSlipConfig, loadVoters]);

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
    if (isFamilyMode) {
      void loadHouseholds(1, newWard, searchQuery || houseQuery);
    } else {
      void loadVoters(searchQuery.trim(), houseQuery.trim(), 1, newWard, '', relativeNameQuery.trim(), selectedCaste, selectedGender);
    }
  };

  // Handle Caste filter change
  const handleCasteChange = (newCaste: string) => {
    setSelectedCaste(newCaste);
    setPage(1);
    setIsFamilyMode(false);
    void loadVoters(searchQuery.trim(), houseQuery.trim(), 1, wardFilter, '', relativeNameQuery.trim(), newCaste, selectedGender);
  };

  // Handle Gender filter change
  const handleGenderChange = (newGender: string) => {
    setSelectedGender(newGender);
    setPage(1);
    setIsFamilyMode(false);
    void loadVoters(searchQuery.trim(), houseQuery.trim(), 1, wardFilter, '', relativeNameQuery.trim(), selectedCaste, newGender);
  };

  // Toggle Family Directory View mode
  const toggleFamilyViewMode = () => {
    if (isFamilyMode) {
      setIsFamilyMode(false);
      setFamilyHouse('');
      setFamilyWard('');
      setFamilyPart('');
      void loadVoters(searchQuery.trim(), '', 1, wardFilter, '', relativeNameQuery.trim(), selectedCaste, selectedGender);
    } else {
      setIsFamilyMode(true);
      void loadHouseholds(1, wardFilter, searchQuery || houseQuery);
    }
  };

  // Click on a family card in family mode
  const handleSelectFamily = (household: Household) => {
    setIsFamilyMode(false);
    setFamilyHouse(household.houseNo);
    setFamilyWard(household.wardNo);
    setFamilyPart(household.partNo);
    setHouseQuery(household.houseNo);
    setSearchQuery('');
    setRelativeNameQuery('');
    void loadVoters('', household.houseNo, 1, household.wardNo, household.partNo, '', '', '');
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
    const defaultSurety =
      voter.surety ||
      (voter.supportStatus === 'core'
        ? '100% पक्का'
        : voter.supportStatus === 'swing'
        ? '50-50'
        : voter.supportStatus === 'opposition'
        ? 'विरोधी'
        : 'सामान्य');

    const rawCaste = (voter.caste || '').trim();
    const isPreset = activeCastePresets.includes(rawCaste);
    setIsCustomCasteOpen(Boolean(rawCaste && !isPreset));
    setCasteFilter('');

    setTagFormData({
      caste: rawCaste,
      surety: defaultSurety,
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
    const cleanEn = voter.nameEn && !/[\u0900-\u097F]/.test(voter.nameEn)
      ? voter.nameEn
      : transliterateHindiToEnglish(voter.nameHi);
    const cleanRelEn = voter.relativeNameEn && !/[\u0900-\u097F]/.test(voter.relativeNameEn)
      ? voter.relativeNameEn
      : transliterateHindiToEnglish(voter.relativeNameHi);
    setEditFormData({
      nameEn: cleanEn,
      nameHi: voter.nameHi || '',
      relativeNameEn: cleanRelEn,
      relativeNameHi: voter.relativeNameHi || '',
      relationType: voter.relationType || 'पिता',
      age: voter.age?.toString() || '',
      gender: voter.gender || '',
      epic: (voter.epic && !voter.epic.startsWith('VOTER_') && !voter.epic.startsWith('UNREADABLE_')) ? voter.epic : '',
      houseNo: voter.houseNo || '',
      wardNo: voter.wardNo || '',
      partNo: voter.partNo || '',
      serialNo: voter.serialNo?.toString() || '',
      phone: voter.phone || voter.mobileNo || '',
      boothName: voter.boothName || '',
      villageName: voter.villageName || '',
      familyId: voter.familyId || '',
    });
    setEditVoter(voter);
  };

  const saveEdit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editVoter) return;
    setSaving(true);
    setActionMessage('');

    try {
      const payload = {
        ...editFormData,
        mobileNo: editFormData.phone,
      };
      const response = await apiFetch(`/voters/${encodeURIComponent(editVoter._id)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(await getApiError(response, 'मतदाता विवरण सेव नहीं हुए।'));
      }

      const updatedRecord: Partial<Voter> = {
        ...editFormData,
        phone: editFormData.phone,
        mobileNo: editFormData.phone,
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

  // Pre-generate slip image as soon as voter is opened for instantaneous WhatsApp share
  useEffect(() => {
    let active = true;
    if (slipVoter) {
      setCachedSlipImageDataUrl(null);
      const effective = { ...slipConfig, slipFormat: modalSlipFormat };
      generateSlipImage(slipVoter, effective, modalSlipRef.current)
        .then((dataUrl) => {
          if (active) setCachedSlipImageDataUrl(dataUrl);
        })
        .catch((err) => {
          console.warn('Pre-rendering slip image failed:', err);
        });
    } else {
      setCachedSlipImageDataUrl(null);
    }
    return () => {
      active = false;
    };
  }, [slipVoter, slipConfig, modalSlipFormat]);

  // Pre-generate family slip image as soon as family slip modal is opened
  useEffect(() => {
    let active = true;
    if (familySlipData && familySlipData.members.length > 0) {
      setCachedFamilySlipDataUrl(null);
      generateFamilySlipImage(familySlipData.members, slipConfig, {
        houseNo: familySlipData.houseNo,
        wardNo: familySlipData.wardNo,
        partNo: familySlipData.partNo,
      })
        .then((dataUrl) => {
          if (active) setCachedFamilySlipDataUrl(dataUrl);
        })
        .catch((err) => {
          console.warn('Pre-rendering family slip failed:', err);
        });
    } else {
      setCachedFamilySlipDataUrl(null);
    }
    return () => {
      active = false;
    };
  }, [familySlipData, slipConfig]);

  // Open Family Slip Modal
  const openFamilySlipModal = async (houseNo: string, wardNo = '', partNo = '') => {
    const h = (houseNo || '').trim().replace(/^#/, '');
    const invalidHouses = ['-', '—', "'—", "'0", '0', '00', '000', 'NA', 'N/A', 'लागू नहीं', 'null', 'undefined'];
    if (!h || invalidHouses.includes(h.toUpperCase())) {
      alert('इस मतदाता के पास मान्य मकान संख्या दर्ज नहीं है।');
      return;
    }
    setFamilySlipMessage('');
    setFamilySlipSending(false);

    let members: Voter[] = [];
    try {
      const params = new URLSearchParams();
      if (wardNo) params.set('ward', wardNo);
      if (partNo) params.set('part', partNo);
      const res = await apiFetch(`/voters/family/${encodeURIComponent(h)}?${params}`);
      if (res.ok) {
        const data = await res.json();
        members = Array.isArray(data) ? data : data.voters || [];
      }
    } catch (e) {
      console.warn('Family fetch error:', e);
    }

    if (members.length === 0) {
      // In-memory fallback strictly for this house and this specific ward
      members = voters.filter((v) => {
        if ((v.houseNo || '').trim().replace(/^#/, '') !== h) return false;
        if (wardNo && String(v.wardNo || '').trim() !== String(wardNo).trim()) return false;
        if (partNo && String(v.partNo || '').trim() !== String(partNo).trim()) return false;
        return true;
      });
    }

    // Ensure strict ward isolation
    if (wardNo && members.length > 0) {
      members = members.filter((m) => String(m.wardNo || '').trim() === String(wardNo).trim());
    }

    if (members.length === 0) {
      alert(`वार्ड ${wardNo || '—'} के मकान #${h} में कोई मतदाता सदस्य नहीं मिले।`);
      return;
    }

    const phone = members.find((m) => m.phone)?.phone || members[0]?.phone || '';
    setFamilySlipPhone(phone);
    setFamilySlipData({
      members,
      houseNo: h,
      wardNo: wardNo || members[0]?.wardNo || '',
      partNo: partNo || members[0]?.partNo || '',
    });
    void loadWhatsappQuota();
  };

  // Download Family Slip as JPG
  const handleDownloadFamilySlipModal = async () => {
    if (!familySlipData) return;
    setIsDownloadingFamilySlip(true);
    try {
      await downloadFamilySlip(familySlipData.members, slipConfig, {
        houseNo: familySlipData.houseNo,
        wardNo: familySlipData.wardNo,
        partNo: familySlipData.partNo,
      });
    } catch {
      alert('परिवार पर्ची डाउनलोड नहीं हो सकी');
    } finally {
      setIsDownloadingFamilySlip(false);
    }
  };

  // Direct WhatsApp Family Slip
  const handleSendFamilySlipDirectWhatsApp = async () => {
    if (!familySlipData) return;
    setFamilySlipSending(true);
    setFamilySlipMessage('परिवार पर्ची तैयार की जा रही है...');
    try {
      const result = await shareFamilySlipToWhatsApp({
        familyMembers: familySlipData.members,
        slipConfig,
        metadata: {
          houseNo: familySlipData.houseNo,
          wardNo: familySlipData.wardNo,
          partNo: familySlipData.partNo,
        },
        phoneNumber: familySlipPhone,
        preGeneratedImageDataUrl: cachedFamilySlipDataUrl || undefined,
        onStatusUpdate: (msg) => setFamilySlipMessage(msg),
      });

      if (typeof result.remainingCredits === 'number') {
        const remaining = result.remainingCredits;
        setWhatsappQuota((prev) =>
          prev ? { ...prev, whatsappCredits: remaining, whatsappUsed: (prev.whatsappUsed || 0) + 1 } : prev
        );
      }

      setFamilySlipMessage(result.message);
      if (result.method === 'desktop_clipboard') {
        setFamilySlipData(null);
        setWhatsappHelperData({
          isOpen: true,
          voterName: result.voterName || `मकान #${familySlipData.houseNo} परिवार`,
          epic: result.epic || `House #${familySlipData.houseNo}`,
          imageDataUrl: result.imageDataUrl || cachedFamilySlipDataUrl || undefined,
          waLink: result.waLink,
        });
      } else if (result.success) {
        setTimeout(() => setFamilySlipData(null), 2200);
      }
    } catch (err) {
      setFamilySlipMessage(err instanceof Error ? err.message : 'परिवार पर्ची भेजने में त्रुटि हुई');
    } finally {
      setFamilySlipSending(false);
    }
  };

  // Filter by family / houseNo
  const filterByFamily = (houseNo: string, wardNo = '', partNo = '') => {
    const h = (houseNo || '').trim().replace(/^#/, '');
    const invalidHouses = ['-', '—', "'—", "'0", '0', '00', '000', 'NA', 'N/A', 'लागू नहीं', 'null', 'undefined'];
    if (!h || invalidHouses.includes(h.toUpperCase())) {
      alert('इस मतदाता के पास मान्य मकान संख्या दर्ज नहीं है।');
      return;
    }
    setIsFamilyMode(false);
    setFamilyHouse(h);
    setFamilyWard(wardNo);
    setFamilyPart(partNo);
    setHouseQuery(h);
    setSearchQuery('');
    setRelativeNameQuery('');
    void loadVoters('', h, 1, wardNo, partNo, '', '', '');
  };

  // Toggle family filter in top bar
  const toggleFamilyFilter = () => {
    if (familyHouse) {
      setFamilyHouse('');
      setFamilyWard('');
      setFamilyPart('');
      setHouseQuery('');
      if (isFamilyMode) {
        void loadHouseholds(1, wardFilter, '');
      } else {
        void loadVoters(searchQuery.trim(), '', 1, wardFilter, '', relativeNameQuery.trim(), selectedCaste, selectedGender);
      }
    } else {
      toggleFamilyViewMode();
    }
  };

  // Bulk Tag Submit
  const handleBulkTagSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedIds.length === 0) return;
    setIsBulkSubmitting(true);
    try {
      const updates: any = {};
      if (bulkTagFormData.supportStatus) updates.supportStatus = bulkTagFormData.supportStatus;
      if (bulkTagFormData.surety) updates.surety = bulkTagFormData.surety;
      if (bulkTagFormData.assignedWorker !== undefined && bulkTagFormData.assignedWorker !== '') {
        updates.assignedWorker = bulkTagFormData.assignedWorker;
      }
      if (bulkTagFormData.notes) updates.notes = bulkTagFormData.notes;
      if (bulkTagFormData.isMigrant) {
        updates.isMigrant = true;
        if (bulkTagFormData.migrantLocation) updates.migrantLocation = bulkTagFormData.migrantLocation;
      }

      const res = await apiFetch('/voters/bulk-update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: selectedIds, updates }),
      });

      if (!res.ok) {
        throw new Error(await getApiError(res, 'बल्क टैग अपडेट नहीं हो सके।'));
      }

      const data = await res.json();
      setActionMessage(data.message || `${selectedIds.length} मतदाताओं का विवरण अपडेट हो गया।`);
      setVoters((prev) =>
        prev.map((v) => (selectedIds.includes(v._id) ? { ...v, ...updates } : v))
      );
      setIsBulkTagOpen(false);
      setBulkTagFormData({
        supportStatus: '',
        surety: '',
        assignedWorker: '',
        notes: '',
        isMigrant: false,
        migrantLocation: '',
      });
      setTimeout(() => setActionMessage(''), 5000);
    } catch (err: any) {
      alert(err.message || 'बल्क टैग अपडेट में त्रुटि आई।');
    } finally {
      setIsBulkSubmitting(false);
    }
  };

  // Bulk Caste Assign
  const handleBulkCasteAssign = async (casteToAssign: string) => {
    const finalCaste = casteToAssign.trim();
    if (!finalCaste || selectedIds.length === 0) return;
    setIsBulkSubmitting(true);
    try {
      const res = await apiFetch('/voters/bulk-update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: selectedIds, updates: { caste: finalCaste } }),
      });

      if (!res.ok) {
        throw new Error(await getApiError(res, 'जाति असाइन नहीं हो सकी।'));
      }

      const data = await res.json();
      setActionMessage(`${selectedIds.length} मतदाताओं को जाति "${finalCaste}" सफलतापूर्वक असाइन कर दी गई।`);
      setVoters((prev) =>
        prev.map((v) => (selectedIds.includes(v._id) ? { ...v, caste: finalCaste } : v))
      );
      setIsBulkCasteOpen(false);
      setBulkCasteInput('');
      setBulkCasteSearch('');
      if (!activeCastePresets.includes(finalCaste)) {
        setOrgCustomCastes((prev) => [finalCaste, ...prev]);
      }
      setTimeout(() => setActionMessage(''), 5000);
    } catch (err: any) {
      alert(err.message || 'जाति असाइन करने में त्रुटि आई।');
    } finally {
      setIsBulkSubmitting(false);
    }
  };

  // WhatsApp send slip (Meta API with photo)
  const sendSlip = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!slipVoter) return;
    setSending(true);
    setActionMessage('पर्ची की फोटो और संदेश Meta API द्वारा भेजा जा रहा है...');
    try {
      let slipImageDataUrl = cachedSlipImageDataUrl || undefined;
      if (!slipImageDataUrl) {
        try {
          const effective = { ...slipConfig, slipFormat: modalSlipFormat };
          slipImageDataUrl = await generateSlipImage(slipVoter, effective, modalSlipRef.current);
        } catch (imgErr) {
          console.warn('Failed to pre-render slip image for Meta API:', imgErr);
        }
      }

      const response = await apiFetch('/whatsapp/send-slip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          voterId: slipVoter._id,
          phoneNumber: slipPhone,
          slipImageDataUrl
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.message || 'WhatsApp पर्ची नहीं भेजी जा सकी।');
      }
      void loadWhatsappQuota();
      setSlipVoter(null);
      setActionMessage(data.message || 'Meta API द्वारा पर्ची फोटो व विवरण सफलतापूर्वक भेज दिया गया है!');
      setTimeout(() => setActionMessage(''), 4500);
    } catch (sendError) {
      setActionMessage(sendError instanceof Error ? sendError.message : 'WhatsApp पर्ची नहीं भेजी जा सकी।');
    } finally {
      setSending(false);
    }
  };

  // Direct WhatsApp (Mobile Share with Photo + Desktop Clipboard Paste + Android Native Bridge)
  const sendManualSlip = async () => {
    if (!slipVoter) return;
    setSending(true);
    try {
      const effective = { ...slipConfig, slipFormat: modalSlipFormat };
      const result = await shareVoterSlipToWhatsApp({
        voter: slipVoter,
        slipConfig: effective,
        phoneNumber: slipPhone,
        preGeneratedImageDataUrl: cachedSlipImageDataUrl || undefined,
        existingElement: modalSlipRef.current,
        onStatusUpdate: (msg) => setActionMessage(msg),
      });

      if (typeof result.remainingCredits === 'number') {
        const remaining = result.remainingCredits;
        setWhatsappQuota((prev) =>
          prev ? { ...prev, whatsappCredits: remaining, whatsappUsed: (prev.whatsappUsed || 0) + 1 } : prev
        );
      }

      setActionMessage(result.message);
      if (result.method === 'desktop_clipboard') {
        setWhatsappHelperData({
          isOpen: true,
          voterName: result.voterName || slipVoter.nameHi || slipVoter.nameEn,
          epic: result.epic || slipVoter.epic,
          imageDataUrl: result.imageDataUrl || cachedSlipImageDataUrl || undefined,
          waLink: result.waLink,
        });
      } else if (result.success) {
        setTimeout(() => setSlipVoter(null), 2200);
      }
    } catch (err) {
      setActionMessage(err instanceof Error ? err.message : 'WhatsApp शेयर करने में त्रुटि हुई');
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
            className={`smartbooth-pill-btn smartbooth-pill-amber ${familyHouse || isFamilyMode ? 'is-active' : ''}`}
            title={familyHouse ? 'परिवार फ़िल्टर हटाएं' : isFamilyMode ? 'मतदाता सूची पर वापस जाएं' : 'सभी परिवार देखें'}
            style={{ fontWeight: 700 }}
          >
            <UsersRound size={14} /> कुल परिवार {totalFamilies > 0 ? `(${totalFamilies.toLocaleString('hi-IN')})` : ''} {familyHouse ? `[#${familyHouse} ✕]` : ''}
          </button>
          <div className="smartbooth-count-pill">
            {loading ? (
              'लोड हो रहा है...'
            ) : isFamilyMode ? (
              `कुल ${householdTotal.toLocaleString('en-IN')} परिवार मिले`
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
              const val = e.target.value;
              setSearchQuery(val);
              setPage(1);
              if (familyHouse || houseQuery) {
                setFamilyHouse('');
                setFamilyWard('');
                setFamilyPart('');
                setHouseQuery('');
              }
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                setFamilyHouse('');
                setFamilyWard('');
                setFamilyPart('');
                setHouseQuery('');
                void loadVoters(e.currentTarget.value.trim(), '', 1, wardFilter, '', relativeNameQuery.trim());
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
                  setFamilyHouse('');
                  setFamilyWard('');
                  setFamilyPart('');
                  setHouseQuery('');
                  void loadVoters('', '', 1, wardFilter, '', relativeNameQuery.trim());
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
              const val = e.target.value;
              setRelativeNameQuery(val);
              setPage(1);
              if (familyHouse || houseQuery) {
                setFamilyHouse('');
                setFamilyWard('');
                setFamilyPart('');
                setHouseQuery('');
              }
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                setFamilyHouse('');
                setFamilyWard('');
                setFamilyPart('');
                setHouseQuery('');
                void loadVoters(searchQuery.trim(), '', 1, wardFilter, '', e.currentTarget.value.trim());
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
                  setFamilyHouse('');
                  setFamilyWard('');
                  setFamilyPart('');
                  setHouseQuery('');
                  void loadVoters(searchQuery.trim(), '', 1, wardFilter, '', '');
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

      {/* 3. Filter Bar (Ward, Caste from Database, Gender) */}
      <div className="smartbooth-ward-bar" style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
        {/* Ward Filter */}
        <div className="smartbooth-ward-select-wrapper" style={{ flex: '1 1 200px' }}>
          <MapPin size={16} className="smartbooth-ward-icon" />
          <span className="smartbooth-ward-label">वार्ड:</span>
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

        {/* Caste Filter Dropdown (Database Castes) */}
        <div className="smartbooth-ward-select-wrapper" style={{ flex: '1 1 180px' }}>
          <Tag size={15} className="smartbooth-ward-icon" style={{ color: '#7c3aed' }} />
          <span className="smartbooth-ward-label">जाति:</span>
          <select
            value={selectedCaste}
            onChange={(e) => handleCasteChange(e.target.value)}
            className="smartbooth-ward-select"
            aria-label="जाति फ़िल्टर चुनें"
          >
            <option value="">सभी जातियां (All Castes)</option>
            {activeCastePresets.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <ChevronDown size={16} className="smartbooth-ward-arrow" />
        </div>

        {/* Gender Filter Dropdown */}
        <div className="smartbooth-ward-select-wrapper" style={{ flex: '1 1 150px' }}>
          <UserCheck size={15} className="smartbooth-ward-icon" style={{ color: '#0284c7' }} />
          <span className="smartbooth-ward-label">लिंग:</span>
          <select
            value={selectedGender}
            onChange={(e) => handleGenderChange(e.target.value)}
            className="smartbooth-ward-select"
            aria-label="लिंग फ़िल्टर चुनें"
          >
            <option value="">सभी लिंग (All)</option>
            <option value="पुरुष">पुरुष (Male)</option>
            <option value="महिला">महिला (Female)</option>
            <option value="अन्य">अन्य (Other)</option>
          </select>
          <ChevronDown size={16} className="smartbooth-ward-arrow" />
        </div>

        {/* Clear filters button if active */}
        {(selectedCaste || selectedGender || wardFilter || searchQuery || relativeNameQuery) && (
          <button
            type="button"
            className="button-secondary"
            onClick={() => {
              setSelectedCaste('');
              setSelectedGender('');
              setWardFilter('');
              setSearchQuery('');
              setRelativeNameQuery('');
              filtersRef.current.ward = '';
              setPage(1);
              void loadVoters('', '', 1, '', '', '', '', '');
            }}
            style={{
              padding: '6px 12px',
              fontSize: '12px',
              borderRadius: '8px',
              fontWeight: 600,
              height: '38px',
              whiteSpace: 'nowrap',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
            }}
            title="सभी फ़िल्टर हटाएं"
          >
            <X size={14} /> फ़िल्टर हटाएं
          </button>
        )}
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

      {/* 4. Family Directory Mode OR Voter Cards Grid */}
      {isFamilyMode ? (
        <div className="smartbooth-family-container" style={{ marginTop: '6px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
            <div>
              <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a', margin: '0 0 4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <UsersRound size={20} /> ग्राम / वार्ड परिवार डायरेक्टरी (Family Directory)
              </h3>
              <p style={{ fontSize: '13px', color: '#64748b', margin: 0 }}>
                कुल {householdTotal || households.length} परिवार मिले • किसी भी परिवार पर क्लिक करके उनके सभी सदस्य देखें
              </p>
            </div>
            <button
              type="button"
              className="button-secondary"
              onClick={() => setIsFamilyMode(false)}
              style={{ padding: '7px 14px', fontSize: '12.5px', fontWeight: 700, borderRadius: '8px', display: 'inline-flex', alignItems: 'center', gap: '5px' }}
            >
              <X size={14} /> मतदाता सूची दृश्य पर वापस जाएं
            </button>
          </div>

          {householdLoading ? (
            <div style={{ textAlign: 'center', padding: '60px 20px', color: '#64748b' }}>
              <LoaderCircle size={28} className="spin" style={{ margin: '0 auto 12px' }} />
              <p style={{ fontSize: '14px', fontWeight: 600 }}>परिवार लोड हो रहे हैं…</p>
            </div>
          ) : households.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '50px 20px', background: '#f8fafc', borderRadius: '12px' }}>
              <p style={{ color: '#64748b', fontSize: '14px', fontWeight: 600 }}>कोई परिवार नहीं मिला।</p>
            </div>
          ) : (
            <div className="smartbooth-family-grid">
              {households.map((h) => (
                <div
                  key={h.key || `${h.wardNo}_${h.houseNo}`}
                  className="smartbooth-family-card"
                  onClick={() => handleSelectFamily(h)}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                    <div>
                      <span style={{ fontSize: '11px', fontWeight: 700, color: '#2563eb', background: '#eff6ff', border: '1px solid #bfdbfe', padding: '2px 8px', borderRadius: '6px' }}>
                        वार्ड {h.wardNo || '—'} {h.partNo ? `• भाग ${h.partNo}` : ''}
                      </span>
                      <h4 style={{ fontSize: '16px', fontWeight: 800, color: '#0f172a', margin: '6px 0 0' }}>
                        मकान #{h.houseNo}
                      </h4>
                    </div>
                    <span style={{ fontSize: '12px', fontWeight: 700, background: '#f0fdf4', color: '#166534', border: '1px solid #bbf7d0', padding: '3px 10px', borderRadius: '20px', whiteSpace: 'nowrap' }}>
                      {h.memberCount} सदस्य
                    </span>
                  </div>

                  <div style={{ fontSize: '13px', color: '#334155' }}>
                    <span style={{ color: '#64748b', fontSize: '12px' }}>परिवार प्रमुख / सदस्य: </span>
                    <strong>{h.headName}</strong>
                  </div>

                  {/* Member preview names */}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: 'auto' }}>
                    {(h.members || []).slice(0, 4).map((m) => (
                      <span
                        key={m._id}
                        style={{ fontSize: '11px', background: '#f1f5f9', color: '#475569', padding: '2px 6px', borderRadius: '4px', whiteSpace: 'nowrap' }}
                      >
                        {m.nameHi || m.nameEn} ({m.age || '—'})
                      </span>
                    ))}
                    {(h.members || []).length > 4 && (
                      <span style={{ fontSize: '11px', color: '#64748b', padding: '2px 4px' }}>
                        +{h.members.length - 4} और
                      </span>
                    )}
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '10px', borderTop: '1px solid #f1f5f9', marginTop: '6px' }}>
                    <span style={{ fontSize: '12px', color: '#2563eb', fontWeight: 700 }}>
                      सदस्य देखें ({h.memberCount}) →
                    </span>
                    <button
                      type="button"
                      className="sb-btn-parchi"
                      onClick={(e) => {
                        e.stopPropagation();
                        openFamilySlipModal(h.houseNo, h.wardNo, h.partNo);
                      }}
                      style={{ padding: '4px 10px', fontSize: '11.5px' }}
                    >
                      <Ticket size={13} color="#fff" /> परिवार पर्ची
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Household Pagination */}
          {!householdLoading && householdTotalPages > 1 && (
            <div className="smartbooth-pagination-bar" style={{ marginTop: '20px' }}>
              <div style={{ fontSize: '12.5px', color: '#64748b', fontWeight: 600 }}>
                कुल {householdTotal} परिवार • पृष्ठ {householdPage} / {householdTotalPages}
              </div>
              <div className="smartbooth-pagination-controls" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button
                  type="button"
                  className="smartbooth-pill-btn smartbooth-pill-blue"
                  onClick={() => void loadHouseholds(householdPage - 1, wardFilter, searchQuery)}
                  disabled={householdPage <= 1}
                >
                  <ChevronLeft size={14} /> पिछला
                </button>
                <button
                  type="button"
                  className="smartbooth-pill-btn smartbooth-pill-blue"
                  onClick={() => void loadHouseholds(householdPage + 1, wardFilter, searchQuery)}
                  disabled={householdPage >= householdTotalPages}
                >
                  अगला <ChevronRight size={14} />
                </button>
              </div>
            </div>
          )}
        </div>
      ) : loading ? (
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
      ) : displayedVoters.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', background: '#f8fafc', borderRadius: '12px' }}>
          <FileText size={32} color="#94a3b8" style={{ margin: '0 auto 10px' }} />
          <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#334155', margin: '0 0 6px' }}>कोई मतदाता नहीं मिला</h3>
          <p style={{ fontSize: '13px', color: '#64748b', margin: 0 }}>खोज या फ़िल्टर बदलकर दोबारा कोशिश करें।</p>
          {(wardFilter || familyHouse || houseQuery || searchQuery || selectedCaste || selectedGender) && (
            <div style={{ marginTop: '14px', display: 'flex', gap: '8px', justifyContent: 'center', flexWrap: 'wrap' }}>
              {searchQuery && (
                <button
                  type="button"
                  className="smartbooth-pill-btn smartbooth-pill-blue"
                  onClick={() => setSearchQuery('')}
                >
                  खोज फ़िल्टर साफ़ करें
                </button>
              )}
              {wardFilter && (
                <button
                  type="button"
                  className="smartbooth-pill-btn smartbooth-pill-blue"
                  onClick={() => handleWardChange('')}
                >
                  वार्ड फ़िल्टर हटाएं
                </button>
              )}
              {selectedCaste && (
                <button
                  type="button"
                  className="smartbooth-pill-btn smartbooth-pill-blue"
                  onClick={() => handleCasteChange('')}
                >
                  जाति फ़िल्टर हटाएं
                </button>
              )}
              {selectedGender && (
                <button
                  type="button"
                  className="smartbooth-pill-btn smartbooth-pill-blue"
                  onClick={() => handleGenderChange('')}
                >
                  लिंग फ़िल्टर हटाएं
                </button>
              )}
              {(familyHouse || houseQuery) && (
                <button
                  type="button"
                  className="smartbooth-pill-btn smartbooth-pill-amber"
                  onClick={toggleFamilyFilter}
                >
                  परिवार मोड हटाएं
                </button>
              )}
            </div>
          )}
        </div>
      ) : (
        <>
          {/* Family Filter Banner (ss5) */}
          {familyHouse && (
            <div className="smartbooth-family-banner">
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
                <div
                  style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '10px',
                    background: 'rgba(255, 255, 255, 0.1)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#ffffff',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    flexShrink: 0,
                  }}
                >
                  <UsersRound size={20} />
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <h2 style={{ fontSize: '16px', fontWeight: 800, color: '#ffffff', margin: 0, lineHeight: 1.25 }}>
                      परिवार फ़िल्टर दृश्य (Family Filter View)
                    </h2>
                    <span
                      style={{
                        fontSize: '11px',
                        fontWeight: 700,
                        background: '#2563eb',
                        color: '#ffffff',
                        padding: '2px 8px',
                        borderRadius: '20px',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {displayedVoters.filter((v) => v.houseNo === familyHouse).length || displayedVoters.length} सदस्य
                    </span>
                  </div>
                  <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                    <span>वार्ड {familyWard || wardFilter || 'सभी'}</span>
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

              <div className="smartbooth-family-actions">
                <button
                  type="button"
                  className="button-primary"
                  style={{
                    background: 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)',
                    borderColor: '#15803d',
                    color: '#ffffff',
                    padding: '7px 14px',
                    fontSize: '12.5px',
                    fontWeight: 700,
                    borderRadius: '8px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    whiteSpace: 'nowrap',
                    boxShadow: '0 2px 6px rgba(22, 163, 74, 0.35)',
                  }}
                  onClick={() => openFamilySlipModal(familyHouse, familyWard, familyPart)}
                  title="इस मकान के सभी सदस्यों की संयुक्त परिवार पर्ची बनाएं व WhatsApp भेजें"
                >
                  <Ticket size={14} /> परिवार पर्ची बनाएं
                </button>

                <button
                  type="button"
                  className="button-primary"
                  style={{
                    background: '#2563eb',
                    borderColor: '#1d4ed8',
                    color: '#ffffff',
                    padding: '7px 12px',
                    fontSize: '12px',
                    fontWeight: 700,
                    borderRadius: '8px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '5px',
                    whiteSpace: 'nowrap',
                  }}
                  onClick={() => {
                    setSelectedIds(displayedVoters.map((v) => v._id));
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
                    padding: '7px 12px',
                    fontSize: '12px',
                    fontWeight: 600,
                    borderRadius: '8px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '5px',
                    whiteSpace: 'nowrap',
                  }}
                  onClick={toggleFamilyFilter}
                >
                  <X size={14} /> खोज पर वापस जाएं
                </button>
              </div>
            </div>
          )}

          {/* Top Selection & Bulk Action Toolbar */}
          <div className="smartbooth-selection-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <label style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontWeight: 700, fontSize: '13px', color: '#1e293b' }}>
                <input
                  type="checkbox"
                  checked={displayedVoters.length > 0 && displayedVoters.every((v) => selectedIds.includes(v._id))}
                  onChange={() => {
                    const allSelected = displayedVoters.length > 0 && displayedVoters.every((v) => selectedIds.includes(v._id));
                    if (allSelected) {
                      setSelectedIds([]);
                    } else {
                      setSelectedIds(displayedVoters.map((v) => v._id));
                    }
                  }}
                  className="sb-checkbox"
                  aria-label="सभी मतदाता चुनें"
                />
                <span>सभी चुनें (Select All • {displayedVoters.length})</span>
              </label>
              {selectedIds.length > 0 && (
                <span style={{ fontSize: '12px', fontWeight: 700, color: '#2563eb', background: '#eff6ff', padding: '2px 9px', borderRadius: '12px', border: '1px solid #bfdbfe' }}>
                  {selectedIds.length} मतदाता चुने गए
                </span>
              )}
            </div>

            {selectedIds.length > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  className="button-primary"
                  style={{ background: '#7c3aed', borderColor: '#6d28d9', color: '#ffffff', padding: '6px 12px', fontSize: '12px', fontWeight: 700, borderRadius: '8px', display: 'inline-flex', alignItems: 'center', gap: '5px' }}
                  onClick={() => setIsBulkTagOpen(true)}
                  title="चुने गए सभी मतदाताओं को एक साथ समर्थन/कार्यकर्ता/प्रवासी टैग दें"
                >
                  <Tag size={13} /> बल्क टैग दें ({selectedIds.length})
                </button>
                <button
                  type="button"
                  className="button-primary"
                  style={{ background: '#d97706', borderColor: '#b45309', color: '#ffffff', padding: '6px 12px', fontSize: '12px', fontWeight: 700, borderRadius: '8px', display: 'inline-flex', alignItems: 'center', gap: '5px' }}
                  onClick={() => setIsBulkCasteOpen(true)}
                  title="चुने गए सभी मतदाताओं को डेटाबेस से जाति असाइन करें"
                >
                  <UsersRound size={13} /> जाति असाइन करें ({selectedIds.length})
                </button>
                <button
                  type="button"
                  className="button-secondary"
                  style={{ padding: '6px 10px', fontSize: '12px', borderRadius: '8px' }}
                  onClick={() => setSelectedIds([])}
                  title="चयन हटाएं"
                >
                  चयन हटाएं
                </button>
              </div>
            )}
          </div>

          <div className="smartbooth-voter-grid">
            {displayedVoters.map((voter, idx) => {
              const isSelected = selectedIds.includes(voter._id);
              const isFirstProbable = Boolean(familyHouse && voter.houseNo !== familyHouse && (idx === 0 || displayedVoters[idx - 1]?.houseNo === familyHouse));
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
                        संभावित संबंधी / नजदीकी सदस्य ({displayedVoters.filter((v) => v.houseNo !== familyHouse).length})
                      </h3>
                    </div>
                  )}

                  <div
                    className={`smartbooth-voter-card ${isSelected ? 'is-selected' : ''}`}
                    onClick={() => toggleSelected(voter._id)}
                  >
                    {/* Top Header Row with Checkbox, Ward, Part/Serial, and EPIC */}
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
                        <span className="sb-badge-serial">क्र. {voter.serialNo || '—'}</span>
                        {!hidePartNo && voter.partNo && (
                          <span className="sb-badge-part">भाग {voter.partNo}</span>
                        )}
                      </div>
                      <span className="sb-badge-epic" title="मतदाता पहचान पत्र संख्या (EPIC)">
                        {(voter.epic && !voter.epic.startsWith('VOTER_') && !voter.epic.startsWith('UNREADABLE_')) ? voter.epic : '—'}
                      </span>
                    </div>

                    {/* Middle Detail Rows matching reference layout */}
                    <div className="sb-card-details">
                      {/* Name Row */}
                      <div className="sb-detail-row">
                        <span className="sb-label">नाम:</span>
                        <span className="sb-val-name">{voter.nameHi || voter.nameEn || '—'}</span>
                        {voter.nameEn && voter.nameEn !== voter.nameHi && (
                          <span className="sb-badge-name-en">{voter.nameEn}</span>
                        )}
                      </div>

                      {/* Relative Row */}
                      <div className="sb-detail-row">
                        <span className="sb-label">
                          {voter.relationType ? `${voter.relationType} का नाम:` : 'पिता का नाम:'}
                        </span>
                        <span className="sb-val-relative">{voter.relativeNameHi || voter.relativeNameEn || '—'}</span>
                        {voter.relativeNameEn && voter.relativeNameEn !== voter.relativeNameHi && (
                          <span className="sb-badge-relative-en">({voter.relativeNameEn})</span>
                        )}
                      </div>

                      {/* House Row */}
                      <div className="sb-detail-row">
                        <span className="sb-label">मकान संख्या:</span>
                        <span className="sb-val-bold">{voter.houseNo || '—'}</span>
                      </div>

                      {/* Age & Gender Row */}
                      <div className="sb-detail-row">
                        <span className="sb-label">आयु:</span>
                        <span className="sb-val-bold">{voter.age || '—'} वर्ष</span>
                        <span className="sb-label" style={{ marginLeft: '12px' }}>लिंग:</span>
                        <span
                          className={`sb-badge-gender-clean ${
                            voter.gender === 'महिला' || voter.gender === 'स्त्री' || voter.gender === 'Female' || voter.gender === 'F'
                              ? 'gender-female'
                              : voter.gender === 'अन्य' || voter.gender === 'Other'
                              ? 'gender-other'
                              : 'gender-male'
                          }`}
                        >
                          {voter.gender === 'महिला' || voter.gender === 'स्त्री' || voter.gender === 'Female' || voter.gender === 'F'
                            ? '♀ महिला'
                            : voter.gender === 'अन्य' || voter.gender === 'Other'
                            ? 'अन्य'
                            : '♂ पुरुष'}
                        </span>
                      </div>
                    </div>

                    {/* Tags Row */}
                    <div className="sb-card-tags">
                      {familyHouse && voter.houseNo !== familyHouse && (
                        <span style={{ fontSize: '11px', fontWeight: 600, background: '#fef3c7', color: '#92400e', padding: '2px 7px', borderRadius: '4px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          संबंधी · क्र. {voter.serialNo || '—'}
                        </span>
                      )}
                      {voter.caste && (
                        <span className="sb-tag-caste-clean" title={`जाति: ${voter.caste}`}>
                          {voter.caste}
                        </span>
                      )}
                      {voter.phone && (
                        <a
                          href={`tel:${voter.phone}`}
                          onClick={(e) => e.stopPropagation()}
                          className="sb-tag-phone"
                          title="कॉल करें"
                        >
                          <Phone size={10} /> {voter.phone}
                        </a>
                      )}
                      {((voter.surety && voter.surety !== '' && voter.surety !== 'सामान्य') || (voter.supportStatus && voter.supportStatus !== 'unmarked')) && (
                        <span
                          className={`sb-tag-support sb-support-${
                            voter.surety === '100% पक्का' || voter.supportStatus === 'core'
                              ? 'core'
                              : voter.surety === '50-50' || voter.supportStatus === 'swing'
                              ? 'swing'
                              : voter.surety === 'विरोधी' || voter.supportStatus === 'opposition'
                              ? 'opposition'
                              : 'unmarked'
                          }`}
                        >
                          {voter.surety === '100% पक्का' || voter.supportStatus === 'core'
                            ? '100% पक्का'
                            : voter.surety === '50-50' || voter.supportStatus === 'swing'
                            ? '50-50'
                            : voter.surety === 'विरोधी' || voter.supportStatus === 'opposition'
                            ? 'विरोधी'
                            : 'सामान्य'}
                        </span>
                      )}
                      {voter.isMigrant && (
                        <span className="sb-tag-migrant">
                          प्रवासी {voter.migrantLocation ? `(${voter.migrantLocation})` : ''}
                        </span>
                      )}
                      {voter.assignedWorker && (
                        <span className="sb-tag-worker" title={`कार्यकर्ता: ${voter.assignedWorker}`}>
                          <UserCheck size={10} /> {voter.assignedWorker}
                        </span>
                      )}
                      {voter.notes && (
                        <span className="sb-tag-notes" title={`टिप्पणी: ${voter.notes}`}>
                          नोट: {voter.notes}
                        </span>
                      )}
                    </div>

                    {/* Divider Line */}
                    <div className="sb-card-divider" />

                    {/* Bottom Actions Row: TAG, EDIT, FAMILY, PARCHI */}
                    <div className="sb-card-bottom">
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            openTagModal(voter);
                          }}
                          className="sb-btn-card-action"
                          title="मतदाता चुनाव टैग व प्रबंधन"
                        >
                          <Tag size={13} /> टैग
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            openEditModal(voter);
                          }}
                          className="sb-btn-card-action"
                          title="मतदाता विवरण संपादित करें"
                        >
                          <Pencil size={13} /> एडिट
                        </button>
                      </div>

                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            filterByFamily(voter.houseNo, voter.wardNo, voter.partNo);
                          }}
                          className="sb-btn-card-family"
                          title={`मकान ${voter.houseNo} का परिवार देखें`}
                        >
                          <UsersRound size={14} /> परिवार
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            openSlipModal(voter);
                          }}
                          className="sb-btn-card-slip"
                          title="डिजिटल मतदाता पर्ची देखें व WhatsApp भेजें"
                        >
                          <Ticket size={14} /> डिजिटल पर्ची
                        </button>
                      </div>
                    </div>

                    {/* Selected Indicator Row */}
                    {isSelected && (
                      <div className="sb-selected-row">
                        <span className="sb-selected-status">चुना गया (Selected)</span>
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
        <div className="smartbooth-pagination-bar">
          <div style={{ fontSize: '12.5px', color: '#64748b', fontWeight: 600 }}>
            {startRecord}–{endRecord} / कुल {totalRecords.toLocaleString('en-IN')} मतदाता
          </div>
          <div className="smartbooth-pagination-controls" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              type="button"
              className="smartbooth-pill-btn"
              style={{ background: '#f8fafc', border: '1px solid #cbd5e1', color: page <= 1 ? '#94a3b8' : '#334155' }}
              onClick={() => void loadVoters(searchQuery.trim(), houseQuery.trim(), page - 1, wardFilter, '', relativeNameQuery.trim())}
              disabled={page <= 1}
            >
              <ChevronLeft size={14} /> पिछला
            </button>
            <span style={{ fontSize: '13px', fontWeight: 700, color: '#1e293b', padding: '0 4px', whiteSpace: 'nowrap' }}>
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
            <span className="sb-floating-dot" /> {selectedIds.length}&nbsp;<span className="hidden sm:inline">चुना गया</span><span className="sm:hidden">चुना</span>
          </div>

          <button
            type="button"
            className="sb-floating-btn"
            style={{ background: '#7c3aed', color: '#ffffff', borderColor: '#6d28d9' }}
            onClick={() => setIsBulkTagOpen(true)}
            title="चुने गए सभी मतदाताओं को एक साथ टैग दें"
          >
            <Tag size={13} /> <span className="hidden sm:inline">बल्क टैग</span>
          </button>

          <button
            type="button"
            className="sb-floating-btn"
            style={{ background: '#d97706', color: '#ffffff', borderColor: '#b45309' }}
            onClick={() => setIsBulkCasteOpen(true)}
            title="चुने गए सभी मतदाताओं को जाति असाइन करें"
          >
            <UsersRound size={13} /> <span className="hidden sm:inline">जाति असाइन</span>
          </button>

          <button
            type="button"
            className="sb-floating-btn sb-floating-edit"
            onClick={() => {
              const target = voters.find((v) => selectedIds.includes(v._id));
              if (target) openEditModal(target);
            }}
            title="चुने गए मतदाता को संपादित करें"
          >
            <Pencil size={13} /> <span className="hidden sm:inline">एडिट</span>
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
            <UsersRound size={14} /> <span className="hidden sm:inline">परिवार</span>
          </button>

          {/* Action button: 1 voter = View/Send slip (all users); >1 voter = Bulk ZIP Download (admin only) */}
          {selectedIds.length === 1 ? (
            <button
              type="button"
              className="sb-floating-btn sb-floating-parchi"
              onClick={() => {
                const target = voters.find((v) => selectedIds.includes(v._id));
                if (target) openSlipModal(target);
              }}
              title="पर्ची देखें व WhatsApp भेजें"
              disabled={isDownloading}
            >
              <WhatsAppLogo size={14} color="#ffffff" />
              <span>
                <span className="hidden sm:inline">पर्ची देखें / भेजें</span>
                <span className="sm:hidden">पर्ची</span>
              </span>
            </button>
          ) : isAdmin ? (
            <button
              type="button"
              className="sb-floating-btn sb-floating-parchi"
              onClick={() => void handleBulkDownload()}
              title={`${selectedIds.length} पर्चियों का बल्क ZIP डाउनलोड करें`}
              disabled={isDownloading}
            >
              {isDownloading ? (
                <LoaderCircle size={14} className="spin" />
              ) : (
                <Download size={14} color="#ffffff" />
              )}
              <span>
                {isDownloading ? (
                  'ZIP बन रहा...'
                ) : (
                  <>
                    <span className="hidden sm:inline">बल्क ZIP डाउनलोड ({selectedIds.length})</span>
                    <span className="sm:hidden">ZIP ({selectedIds.length})</span>
                  </>
                )}
              </span>
            </button>
          ) : (
            <span style={{ fontSize: '12px', color: '#64748b', padding: '0 8px' }}>
              ({selectedIds.length} चुने गए)
            </span>
          )}

          {isAdmin && (
            <button
              type="button"
              className="sb-floating-btn sb-floating-delete"
              onClick={() => void handleBulkDelete()}
              title="चुने गए रिकॉर्ड हटाएं"
            >
              <Trash2 size={13} /> <span className="hidden sm:inline">हटाएं</span>
            </button>
          )}

          <button
            type="button"
            className="sb-floating-close"
            onClick={() => setSelectedIds([])}
            title="चयन हटाएं"
            aria-label="चयन हटाएं"
          >
            <X size={15} />
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

            {/* Slip Format Switcher */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', background: '#f8fafc', padding: '6px 12px', borderRadius: '8px', border: '1px solid #e2e8f0', margin: '4px 0 8px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '12px', fontWeight: 700, color: '#334155' }}>
                पर्ची प्रारूप:
              </span>
              <div style={{ display: 'inline-flex', background: '#e2e8f0', padding: '2px', borderRadius: '6px', gap: '3px' }}>
                <button
                  type="button"
                  onClick={() => {
                    setModalSlipFormat('full');
                    setCachedSlipImageDataUrl(null);
                  }}
                  style={{
                    padding: '4px 10px',
                    borderRadius: '5px',
                    border: 'none',
                    background: modalSlipFormat === 'full' ? '#ffffff' : 'transparent',
                    color: modalSlipFormat === 'full' ? '#0f172a' : '#64748b',
                    fontWeight: modalSlipFormat === 'full' ? 800 : 600,
                    fontSize: '11.5px',
                    cursor: 'pointer',
                    boxShadow: modalSlipFormat === 'full' ? '0 1px 2px rgba(0,0,0,0.1)' : 'none',
                  }}
                >
                  🏷️ पूर्ण प्रचार पर्ची
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setModalSlipFormat('compact');
                    setCachedSlipImageDataUrl(null);
                  }}
                  style={{
                    padding: '4px 10px',
                    borderRadius: '5px',
                    border: 'none',
                    background: modalSlipFormat === 'compact' ? '#ffffff' : 'transparent',
                    color: modalSlipFormat === 'compact' ? '#166534' : '#64748b',
                    fontWeight: modalSlipFormat === 'compact' ? 800 : 600,
                    fontSize: '11.5px',
                    cursor: 'pointer',
                    boxShadow: modalSlipFormat === 'compact' ? '0 1px 2px rgba(0,0,0,0.1)' : 'none',
                  }}
                >
                  📄 सादी / केवल विवरण पर्ची
                </button>
              </div>
            </div>

            {/* Voter Slip Preview */}
            <div ref={modalSlipRef} style={{ margin: '8px 0', width: '100%', display: 'flex', justifyContent: 'center' }}>
              <VoterSlipTemplate
                voter={slipVoter}
                config={{ ...slipConfig, slipFormat: modalSlipFormat }}
                format={modalSlipFormat}
                isInline={true}
              />
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
                      const effective = { ...slipConfig, slipFormat: modalSlipFormat };
                      await downloadSlip(slipVoter, effective, modalSlipRef.current);
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
                  title="WhatsApp पर पर्ची की फोटो व संदेश साथ में भेजें"
                >
                  <WhatsAppLogo size={15} color="#25D366" /> डायरेक्ट WhatsApp (फोटो + पर्ची)
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

      {/* 6B. Digital Family Slip Preview Modal */}
      {familySlipData && (
        <div
          className="modal-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setFamilySlipData(null);
          }}
        >
          <section
            className="form-modal slip-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="family-slip-title"
            style={{ maxWidth: '640px', width: '95%', maxHeight: '92vh', overflowY: 'auto' }}
          >
            <div className="modal-heading">
              <div>
                <span className="eyebrow-label" style={{ color: '#047857' }}>FAMILY VOTER SLIP</span>
                <h2 id="family-slip-title" style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: '4px 0' }}>
                  <UsersRound size={18} color="#047857" />
                  संयुक्त परिवार मतदाता पर्ची
                </h2>
                <p style={{ margin: 0 }}>
                  मकान #{familySlipData.houseNo} · {familySlipData.members.length} सदस्य · वार्ड {familySlipData.wardNo || '—'}
                </p>
              </div>
              <button className="icon-button" onClick={() => setFamilySlipData(null)} aria-label="बंद करें">
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

            {/* Family Voter Slip Preview */}
            <div ref={modalFamilySlipRef} style={{ margin: '8px 0', width: '100%', display: 'flex', justifyContent: 'center' }}>
              <FamilyVoterSlipTemplate
                familyMembers={familySlipData.members}
                config={slipConfig}
                metadata={{
                  houseNo: familySlipData.houseNo,
                  wardNo: familySlipData.wardNo,
                  partNo: familySlipData.partNo,
                }}
                isInline={true}
              />
            </div>

            <div className="modal-form">
              <label>
                परिवार मुखिया का WhatsApp नंबर
                <input
                  required
                  inputMode="tel"
                  value={familySlipPhone}
                  onChange={(event) => setFamilySlipPhone(event.target.value)}
                  placeholder="+91 98765 43210"
                />
              </label>

              {familySlipMessage && (
                <p className="form-error" role="alert" style={{ whiteSpace: 'pre-wrap', color: familySlipMessage.includes('कटा') ? '#166534' : '#dc2626' }}>
                  {familySlipMessage}
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
                  disabled={isDownloadingFamilySlip}
                  onClick={handleDownloadFamilySlipModal}
                >
                  {isDownloadingFamilySlip ? <LoaderCircle size={15} className="spin" /> : <Download size={15} />}
                  {isDownloadingFamilySlip ? 'डाउनलोड हो रहा है...' : 'JPG डाउनलोड'}
                </button>
                <button
                  type="button"
                  className="button-primary"
                  style={{ background: '#25D366', borderColor: '#22c55e', color: '#fff', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                  onClick={handleSendFamilySlipDirectWhatsApp}
                  disabled={familySlipSending || !familySlipPhone.trim()}
                  title="WhatsApp पर परिवार पर्ची की फोटो व सभी सदस्यों का विवरण भेजें"
                >
                  {familySlipSending ? <LoaderCircle size={15} className="spin" /> : <WhatsAppLogo size={16} color="#ffffff" />}
                  डायरेक्ट WhatsApp (फोटो + पर्ची)
                </button>
              </div>
            </div>
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
                  {tagVoter.nameHi || tagVoter.nameEn}
                  {tagVoter.nameEn && tagVoter.nameEn !== tagVoter.nameHi && (
                    <span style={{ fontWeight: 600, color: '#475569', marginLeft: '4px' }}>
                      ({tagVoter.nameEn})
                    </span>
                  )} • EPIC: {tagVoter.epic || 'N/A'} • भाग: {tagVoter.partNo || '-'} / क्र.: {tagVoter.serialNo || '-'}
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

                {/* 2. Community / Caste Tag Selection & Custom Caste (ss2) */}
                <div style={{ background: '#ffffff', borderRadius: '10px', border: '1px solid #e2e8f0', padding: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <label style={{ margin: 0, fontSize: '13px', fontWeight: 700, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Tag size={14} color="#7c3aed" /> जाति / समुदाय टैग (COMMUNITY / CASTE TAG):
                    </label>
                    <span style={{ fontSize: '11px', color: '#64748b' }}>
                      सुझाव चिप चुनें या 'अन्य' पर टैप करें
                    </span>
                  </div>

                  {/* Active Selected Caste Banner */}
                  {tagFormData.caste ? (
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '6px 12px',
                        background: '#f3e8ff',
                        border: '1.5px solid #d8b4fe',
                        borderRadius: '8px',
                        marginBottom: '10px',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12.5px' }}>
                        <span style={{ color: '#6b21a8', fontWeight: 600 }}>चयनित जाति:</span>
                        <span
                          style={{
                            fontWeight: 700,
                            color: '#581c87',
                            background: '#ffffff',
                            padding: '2px 10px',
                            borderRadius: '12px',
                            border: '1px solid #c084fc',
                            fontSize: '13px',
                          }}
                        >
                          {tagFormData.caste}
                        </span>
                        {isCustomCasteOpen && (
                          <span style={{ fontSize: '11px', color: '#9333ea', fontStyle: 'italic', fontWeight: 600 }}>
                            (कस्टम जाति)
                          </span>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setTagFormData({ ...tagFormData, caste: '' });
                          setIsCustomCasteOpen(false);
                        }}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#9333ea',
                          fontSize: '12px',
                          fontWeight: 700,
                          cursor: 'pointer',
                          padding: '2px 6px',
                        }}
                        title="जाति हटाएं"
                      >
                        ✕ हटाएं
                      </button>
                    </div>
                  ) : null}

                  {/* Quick Search / Filter Input */}
                  <div style={{ position: 'relative', marginBottom: '8px' }}>
                    <Search
                      size={14}
                      color="#94a3b8"
                      style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }}
                    />
                    <input
                      type="text"
                      value={casteFilter}
                      onChange={(e) => setCasteFilter(e.target.value)}
                      placeholder="जाति खोजें / फ़िल्टर करें (उदा: राजपूत, मेघवाल, भील, सुथार...)"
                      style={{
                        width: '100%',
                        height: '34px',
                        borderRadius: '6px',
                        border: '1px solid #cbd5e1',
                        padding: '0 30px 0 30px',
                        fontSize: '12px',
                        outline: 'none',
                        background: '#f8fafc',
                      }}
                    />
                    {casteFilter && (
                      <button
                        type="button"
                        onClick={() => setCasteFilter('')}
                        style={{
                          position: 'absolute',
                          right: '8px',
                          top: '50%',
                          transform: 'translateY(-50%)',
                          background: 'none',
                          border: 'none',
                          color: '#94a3b8',
                          cursor: 'pointer',
                          fontSize: '13px',
                          padding: '2px',
                        }}
                      >
                        ✕
                      </button>
                    )}
                  </div>

                  {/* Caste Chips Container */}
                  <div
                    style={{
                      display: 'flex',
                      flexWrap: 'wrap',
                      gap: '6px',
                      maxHeight: '160px',
                      overflowY: 'auto',
                      padding: '2px',
                      marginBottom: '8px',
                    }}
                  >
                    {filteredCastes.map((chip) => {
                      const isSelected = tagFormData.caste === chip && !isCustomCasteOpen;
                      return (
                        <button
                          key={chip}
                          type="button"
                          onClick={() => {
                            if (tagFormData.caste === chip && !isCustomCasteOpen) {
                              setTagFormData({ ...tagFormData, caste: '' });
                            } else {
                              setTagFormData({ ...tagFormData, caste: chip });
                              setIsCustomCasteOpen(false);
                            }
                          }}
                          style={{
                            padding: '5px 11px',
                            borderRadius: '16px',
                            fontSize: '12px',
                            fontWeight: isSelected ? 700 : 500,
                            border: isSelected ? '1.5px solid #9333ea' : '1px solid #e2e8f0',
                            background: isSelected ? '#f3e8ff' : '#f8fafc',
                            color: isSelected ? '#6b21a8' : '#334155',
                            cursor: 'pointer',
                            transition: 'all 0.15s ease',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                          }}
                        >
                          {isSelected && <Check size={12} strokeWidth={3} />}
                          {chip}
                        </button>
                      );
                    })}

                    {/* "अन्य / Other (कस्टम जाति)" button */}
                    <button
                      type="button"
                      onClick={() => {
                        const nextState = !isCustomCasteOpen;
                        setIsCustomCasteOpen(nextState);
                        if (nextState) {
                          if (activeCastePresets.includes(tagFormData.caste)) {
                            setTagFormData({ ...tagFormData, caste: '' });
                          } else if (!tagFormData.caste && casteFilter.trim()) {
                            setTagFormData({ ...tagFormData, caste: casteFilter.trim() });
                          }
                          setTimeout(() => customCasteInputRef.current?.focus(), 60);
                        }
                      }}
                      style={{
                        padding: '5px 12px',
                        borderRadius: '16px',
                        fontSize: '12px',
                        fontWeight: 700,
                        border: isCustomCasteOpen ? '1.5px solid #9333ea' : '1.5px dashed #a855f7',
                        background: isCustomCasteOpen ? '#7e22ce' : '#faf5ff',
                        color: isCustomCasteOpen ? '#ffffff' : '#7e22ce',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '5px',
                      }}
                    >
                      <Sparkles size={12} />
                      {isCustomCasteOpen ? '✓ अन्य (कस्टम सक्रिय)' : '+ अन्य / Other (कस्टम जाति)'}
                    </button>
                  </div>

                  {filteredCastes.length === 0 && (
                    <div style={{ fontSize: '11.5px', color: '#64748b', marginBottom: '8px', padding: '4px' }}>
                      '{casteFilter}' सूची में नहीं मिली। कस्टम जाति लिखने के लिए ऊपर '+ अन्य / Other' बटन दबाएं।
                    </div>
                  )}

                  {/* Dedicated Custom Caste Input Box when Other is selected */}
                  {isCustomCasteOpen && (
                    <div
                      style={{
                        padding: '10px 12px',
                        background: '#faf5ff',
                        border: '1.5px solid #c084fc',
                        borderRadius: '8px',
                        marginTop: '4px',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                        <label
                          style={{
                            fontSize: '12px',
                            fontWeight: 700,
                            color: '#6b21a8',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '5px',
                            margin: 0,
                          }}
                        >
                          <Pencil size={12} color="#9333ea" /> कस्टम जाति का नाम लिखें (CUSTOM CASTE):
                        </label>
                        <button
                          type="button"
                          onClick={() => {
                            setIsCustomCasteOpen(false);
                            if (!activeCastePresets.includes(tagFormData.caste)) {
                              setTagFormData({ ...tagFormData, caste: '' });
                            }
                          }}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: '#9333ea',
                            fontSize: '11px',
                            cursor: 'pointer',
                            textDecoration: 'underline',
                            fontWeight: 600,
                          }}
                        >
                          बंद करें (Close)
                        </button>
                      </div>
                      <input
                        ref={customCasteInputRef}
                        type="text"
                        value={tagFormData.caste}
                        onChange={(e) => setTagFormData({ ...tagFormData, caste: e.target.value })}
                        placeholder="यहाँ अपनी कस्टम जाति टाइप करें (उदा: चारण, सोनी, घांची, गोस्वामी...)"
                        style={{
                          width: '100%',
                          height: '38px',
                          borderRadius: '6px',
                          border: '1.5px solid #a855f7',
                          padding: '0 12px',
                          fontSize: '13px',
                          background: '#ffffff',
                          outline: 'none',
                          color: '#0f172a',
                        }}
                      />
                      <p style={{ margin: '4px 0 0', fontSize: '11px', color: '#7e22ce' }}>
                        यह कस्टम जाति इस मतदाता के प्रोफाइल पर टैग के रूप में सेव होगी।
                      </p>
                    </div>
                  )}
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

                {/* 5. Political Sentiment Pill Selector (ss2) */}
                <div style={{ marginTop: '2px' }}>
                  <label
                    style={{
                      display: 'block',
                      fontSize: '13px',
                      fontWeight: 800,
                      color: '#1e293b',
                      letterSpacing: '0.02em',
                      marginBottom: '8px',
                    }}
                  >
                    राजनीतिक रुझान (POLITICAL SENTIMENT):
                  </label>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      flexWrap: 'wrap',
                    }}
                  >
                    {[
                      {
                        key: 'core',
                        surety: '100% पक्का',
                        supportStatus: 'core',
                        label: '100% पक्का',
                        emoji: '🟢',
                      },
                      {
                        key: 'swing',
                        surety: '50-50',
                        supportStatus: 'swing',
                        label: '50-50',
                        emoji: '🟡',
                      },
                      {
                        key: 'opposition',
                        surety: 'विरोधी',
                        supportStatus: 'opposition',
                        label: 'विरोधी',
                        emoji: '🔴',
                      },
                      {
                        key: 'unmarked',
                        surety: 'सामान्य',
                        supportStatus: 'unmarked',
                        label: 'सामान्य',
                        emoji: '⚪',
                      },
                    ].map((item) => {
                      const isSelected =
                        tagFormData.surety === item.surety ||
                        (!tagFormData.surety && tagFormData.supportStatus === item.supportStatus) ||
                        (!tagFormData.surety && !tagFormData.supportStatus && item.key === 'unmarked');

                      return (
                        <button
                          key={item.key}
                          type="button"
                          className="sb-sentiment-pill"
                          onClick={() => {
                            setTagFormData({
                              ...tagFormData,
                              surety: item.surety,
                              supportStatus: item.supportStatus,
                            });
                          }}
                          style={{
                            background: isSelected ? '#334155' : '#ffffff',
                            color: isSelected ? '#ffffff' : '#1e293b',
                            border: isSelected ? '1.5px solid #1e293b' : '1.5px solid #cbd5e1',
                            boxShadow: isSelected
                              ? '0 2px 6px rgba(15, 23, 42, 0.25)'
                              : '0 1px 2px rgba(0, 0, 0, 0.04)',
                          }}
                        >
                          <span style={{ fontSize: '14px', lineHeight: 1 }}>{item.emoji}</span>
                          <span>{item.label}</span>
                        </button>
                      );
                    })}
                  </div>
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
                  {editVoter.nameHi || editVoter.nameEn}
                  {editVoter.nameEn && editVoter.nameEn !== editVoter.nameHi && (
                    <span style={{ fontWeight: 600, color: '#475569', marginLeft: '4px' }}>
                      ({editVoter.nameEn})
                    </span>
                  )} • EPIC: {editVoter.epic}
                </p>
              </div>
              <button className="icon-button" onClick={() => setEditVoter(null)} aria-label="बंद करें">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={saveEdit} className="modal-form" style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              <div
                style={{
                  maxHeight: '68vh',
                  overflowY: 'auto',
                  paddingRight: '6px',
                  paddingBottom: '12px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '16px',
                }}
              >
                {/* 1. DEDICATED PROMINENT MOBILE NO SECTION */}
                <div
                  style={{
                    background: '#f0fdf4',
                    border: '1.5px solid #86efac',
                    borderRadius: '12px',
                    padding: '14px 16px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px',
                    boxShadow: '0 1px 3px rgba(22, 101, 52, 0.08)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <label
                      htmlFor="edit-phone-input"
                      style={{
                        margin: 0,
                        fontSize: '13px',
                        fontWeight: 800,
                        color: '#166534',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        letterSpacing: '0.02em',
                      }}
                    >
                      <Phone size={16} color="#16a34a" /> मोबाइल नंबर (MOBILE / WHATSAPP NO.)
                    </label>
                    <span
                      style={{
                        fontSize: '11.5px',
                        fontWeight: 700,
                        padding: '2px 8px',
                        borderRadius: '12px',
                        background: editFormData.phone.length === 10 ? '#dcfce7' : '#fef3c7',
                        color: editFormData.phone.length === 10 ? '#15803d' : '#b45309',
                      }}
                    >
                      {editFormData.phone.length === 10 ? '✓ 10 अंक मान्य' : `${editFormData.phone.length}/10 अंक`}
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <div
                      style={{
                        background: '#ffffff',
                        border: '1.5px solid #86efac',
                        borderRadius: '8px',
                        padding: '0 12px',
                        height: '42px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '5px',
                        fontSize: '13px',
                        fontWeight: 800,
                        color: '#166534',
                        userSelect: 'none',
                        flexShrink: 0,
                      }}
                    >
                      🇮🇳 +91
                    </div>
                    <div style={{ position: 'relative', flex: '1 1 180px', minWidth: 0 }}>
                      <input
                        id="edit-phone-input"
                        type="tel"
                        inputMode="numeric"
                        value={editFormData.phone}
                        onChange={(e) =>
                          setEditFormData({
                            ...editFormData,
                            phone: e.target.value.replace(/\D/g, '').slice(0, 10),
                          })
                        }
                        placeholder="10 अंकों का मोबाइल नंबर दर्ज करें (उदा. 9829012345)"
                        style={{
                          width: '100%',
                          height: '42px',
                          borderRadius: '8px',
                          border: '1.5px solid #86efac',
                          background: '#ffffff',
                          padding: '0 36px 0 12px',
                          fontSize: '14.5px',
                          fontWeight: 700,
                          color: '#0f172a',
                          outline: 'none',
                          letterSpacing: '0.04em',
                        }}
                      />
                      {editFormData.phone && (
                        <button
                          type="button"
                          onClick={() => setEditFormData({ ...editFormData, phone: '' })}
                          style={{
                            position: 'absolute',
                            right: '8px',
                            top: '50%',
                            transform: 'translateY(-50%)',
                            background: 'none',
                            border: 'none',
                            color: '#94a3b8',
                            cursor: 'pointer',
                            padding: '4px',
                          }}
                          title="नंबर हटाएँ"
                        >
                          <X size={15} />
                        </button>
                      )}
                    </div>
                  </div>
                  <p style={{ margin: 0, fontSize: '11.5px', color: '#166534' }}>
                    * यह नंबर डिजिटल मतदाता पर्ची व्हाट्सएप पर भेजने एवं अभियान संपर्क के लिए प्रयुक्त होगा।
                  </p>
                </div>

                {/* 2. SECTION: पहचान व मतदान केंद्र विवरण (Polling & Identity) */}
                <div style={{ border: '1px solid #e2e8f0', borderRadius: '10px', padding: '12px 14px', background: '#f8fafc' }}>
                  <div style={{ fontSize: '12px', fontWeight: 800, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '10px' }}>
                    📋 पहचान व मतदान केंद्र विवरण (POLLING & IDENTITY)
                  </div>

                  <div className="sb-modal-grid-polling" style={{ marginBottom: '10px' }}>
                    <label style={{ margin: 0, fontSize: '12px', fontWeight: 600, color: '#334155' }}>
                      EPIC (पहचान पत्र क्रमांक)
                      <input
                        value={editFormData.epic}
                        onChange={(e) => setEditFormData({ ...editFormData, epic: e.target.value.toUpperCase().trim() })}
                        style={{ marginTop: '4px', height: '38px', textTransform: 'uppercase', fontWeight: 700 }}
                      />
                    </label>
                    <label style={{ margin: 0, fontSize: '12px', fontWeight: 600, color: '#334155' }}>
                      भाग नं. (Part No)
                      <input
                        value={editFormData.partNo}
                        onChange={(e) => setEditFormData({ ...editFormData, partNo: e.target.value })}
                        style={{ marginTop: '4px', height: '38px' }}
                      />
                    </label>
                    <label style={{ margin: 0, fontSize: '12px', fontWeight: 600, color: '#334155' }}>
                      क्रम नं. (Serial No)
                      <input
                        type="text"
                        inputMode="numeric"
                        value={editFormData.serialNo}
                        onChange={(e) => setEditFormData({ ...editFormData, serialNo: e.target.value.replace(/\D/g, '') })}
                        style={{ marginTop: '4px', height: '38px' }}
                      />
                    </label>
                    <label style={{ margin: 0, fontSize: '12px', fontWeight: 600, color: '#334155' }}>
                      वार्ड नं. (Ward No)
                      <input
                        value={editFormData.wardNo}
                        onChange={(e) => setEditFormData({ ...editFormData, wardNo: e.target.value })}
                        style={{ marginTop: '4px', height: '38px' }}
                      />
                    </label>
                    <label style={{ margin: 0, fontSize: '12px', fontWeight: 600, color: '#334155' }}>
                      मकान नं. (House No)
                      <input
                        value={editFormData.houseNo}
                        onChange={(e) => setEditFormData({ ...editFormData, houseNo: e.target.value })}
                        style={{ marginTop: '4px', height: '38px' }}
                      />
                    </label>
                  </div>

                  <div className="sb-modal-grid-2">
                    <label style={{ margin: 0, fontSize: '12px', fontWeight: 600, color: '#334155' }}>
                      मतदान केंद्र / बूथ (Booth Name)
                      <input
                        value={editFormData.boothName}
                        onChange={(e) => setEditFormData({ ...editFormData, boothName: e.target.value })}
                        placeholder="उदा: रा.उ.मा.वि. कमरा नं. 1"
                        style={{ marginTop: '4px', height: '38px' }}
                      />
                    </label>
                    <label style={{ margin: 0, fontSize: '12px', fontWeight: 600, color: '#334155' }}>
                      गाँव / मोहल्ला / क्षेत्र (Village / Area)
                      <input
                        value={editFormData.villageName}
                        onChange={(e) => setEditFormData({ ...editFormData, villageName: e.target.value })}
                        placeholder="उदा: जेलातरा"
                        style={{ marginTop: '4px', height: '38px' }}
                      />
                    </label>
                  </div>
                </div>

                {/* 3. SECTION: व्यक्तिगत विवरण (Personal Details) */}
                <div style={{ border: '1px solid #e2e8f0', borderRadius: '10px', padding: '12px 14px', background: '#f8fafc' }}>
                  <div style={{ fontSize: '12px', fontWeight: 800, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '10px' }}>
                    👤 व्यक्तिगत विवरण (PERSONAL DETAILS)
                  </div>

                  <div className="sb-modal-grid-2" style={{ marginBottom: '10px' }}>
                    <label style={{ margin: 0, fontSize: '12px', fontWeight: 600, color: '#334155' }}>
                      नाम (हिंदी में)
                      <input
                        value={editFormData.nameHi}
                        onChange={(e) => setEditFormData({ ...editFormData, nameHi: e.target.value })}
                        placeholder="उदा: हंसराज"
                        style={{ marginTop: '4px', height: '38px', fontWeight: 600 }}
                      />
                    </label>
                    <label style={{ margin: 0, fontSize: '12px', fontWeight: 600, color: '#334155' }}>
                      नाम (English में)
                      <input
                        value={editFormData.nameEn}
                        onChange={(e) => setEditFormData({ ...editFormData, nameEn: e.target.value })}
                        placeholder="e.g. Hansraj"
                        style={{ marginTop: '4px', height: '38px' }}
                      />
                    </label>
                  </div>

                  <div className="sb-modal-grid-2">
                    <label style={{ margin: 0, fontSize: '12px', fontWeight: 600, color: '#334155' }}>
                      उम्र (Age)
                      <input
                        type="text"
                        inputMode="numeric"
                        value={editFormData.age}
                        onChange={(e) => setEditFormData({ ...editFormData, age: e.target.value.replace(/\D/g, '').slice(0, 3) })}
                        placeholder="उदा: 35"
                        style={{ marginTop: '4px', height: '38px' }}
                      />
                    </label>
                    <label style={{ margin: 0, fontSize: '12px', fontWeight: 600, color: '#334155' }}>
                      लिंग (Gender)
                      <select
                        value={editFormData.gender}
                        onChange={(e) => setEditFormData({ ...editFormData, gender: e.target.value })}
                        style={{ marginTop: '4px', height: '38px' }}
                      >
                        <option value="">चुनें</option>
                        <option value="पुरुष">पुरुष (Male)</option>
                        <option value="स्त्री">स्त्री (Female)</option>
                        <option value="अन्य">अन्य (Other)</option>
                      </select>
                    </label>
                  </div>
                </div>

                {/* 4. SECTION: संबंधी व परिवार विवरण (Relation & Family) */}
                <div style={{ border: '1px solid #e2e8f0', borderRadius: '10px', padding: '12px 14px', background: '#f8fafc' }}>
                  <div style={{ fontSize: '12px', fontWeight: 800, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '10px' }}>
                    👨‍👩‍👧 संबंधी व परिवार विवरण (RELATION & FAMILY)
                  </div>

                  <div className="sb-modal-grid-3" style={{ marginBottom: '10px' }}>
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
                      संबंधी का नाम (हिंदी में)
                      <input
                        value={editFormData.relativeNameHi}
                        onChange={(e) => setEditFormData({ ...editFormData, relativeNameHi: e.target.value })}
                        placeholder="संबंधी का हिंदी नाम"
                        style={{ marginTop: '4px', height: '38px' }}
                      />
                    </label>
                    <label style={{ margin: 0, fontSize: '12px', fontWeight: 600, color: '#334155' }}>
                      संबंधी का नाम (English)
                      <input
                        value={editFormData.relativeNameEn}
                        onChange={(e) => setEditFormData({ ...editFormData, relativeNameEn: e.target.value })}
                        placeholder="Relative English Name"
                        style={{ marginTop: '4px', height: '38px' }}
                      />
                    </label>
                  </div>

                  <label style={{ margin: 0, fontSize: '12px', fontWeight: 600, color: '#334155' }}>
                    परिवार आईडी / मुखिया (Family ID / Head)
                    <input
                      value={editFormData.familyId}
                      onChange={(e) => setEditFormData({ ...editFormData, familyId: e.target.value })}
                      placeholder="उदा: जीवराज नाथू कुम्हार"
                      style={{ marginTop: '4px', height: '38px' }}
                    />
                  </label>
                </div>
              </div>

              {actionMessage && <p className="form-error" role="alert">{actionMessage}</p>}

              <div className="modal-actions" style={{ marginTop: '14px', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setEditVoter(null)}
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
                    background: '#2563eb',
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
                  {saving ? <LoaderCircle size={15} className="spin" /> : <Check size={15} />} विवरण सेव करें
                </button>
              </div>
            </form>
          </section>
        </div>
      )}

      {/* 9. WhatsApp Web Helper Modal */}
      {whatsappHelperData && (
        <WhatsAppWebHelperModal
          isOpen={whatsappHelperData.isOpen}
          onClose={() => setWhatsappHelperData(null)}
          voterName={whatsappHelperData.voterName}
          epic={whatsappHelperData.epic}
          imageDataUrl={whatsappHelperData.imageDataUrl}
          waLink={whatsappHelperData.waLink}
        />
      )}

      {/* 10. Bulk Tag Modal */}
      {isBulkTagOpen && (
        <div
          className="modal-backdrop"
          role="presentation"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget && !isBulkSubmitting) setIsBulkTagOpen(false);
          }}
        >
          <section
            className="form-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="bulk-tag-title"
            style={{ maxWidth: '540px', width: '95%', maxHeight: '90vh', overflowY: 'auto' }}
          >
            <div className="modal-heading">
              <div>
                <span className="eyebrow-label" style={{ color: '#7c3aed' }}>BULK ACTIONS</span>
                <h2 id="bulk-tag-title">बल्क टैग प्रबंधन ({selectedIds.length} मतदाता)</h2>
                <p>चुने गए सभी {selectedIds.length} मतदाताओं को एक साथ स्थिति, कार्यकर्ता या टिप्पणी असाइन करें।</p>
              </div>
              <button
                type="button"
                className="icon-button"
                onClick={() => setIsBulkTagOpen(false)}
                disabled={isBulkSubmitting}
                aria-label="बंद करें"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleBulkTagSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '16px' }}>
              {/* Support Status / Surety */}
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#1e293b', marginBottom: '8px' }}>
                  समर्थन स्थिति (Support Status / Surety):
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: '8px' }}>
                  {[
                    { label: '100% पक्का', surety: '100% पक्का', supportStatus: 'core', color: '#16a34a', bg: '#f0fdf4', border: '#bbf7d0' },
                    { label: '50-50', surety: '50-50', supportStatus: 'swing', color: '#d97706', bg: '#fefce8', border: '#fef08a' },
                    { label: 'विरोधी', surety: 'विरोधी', supportStatus: 'opposition', color: '#dc2626', bg: '#fef2f2', border: '#fecaca' },
                    { label: 'सामान्य', surety: 'सामान्य', supportStatus: 'unmarked', color: '#475569', bg: '#f8fafc', border: '#cbd5e1' },
                  ].map((s) => {
                    const isSelected = bulkTagFormData.surety === s.surety;
                    return (
                      <button
                        key={s.surety}
                        type="button"
                        onClick={() =>
                          setBulkTagFormData({
                            ...bulkTagFormData,
                            surety: isSelected ? '' : s.surety,
                            supportStatus: isSelected ? '' : s.supportStatus,
                          })
                        }
                        style={{
                          padding: '8px 10px',
                          borderRadius: '8px',
                          fontSize: '12.5px',
                          fontWeight: isSelected ? 800 : 600,
                          background: isSelected ? s.bg : '#ffffff',
                          border: isSelected ? `2px solid ${s.color}` : `1px solid ${s.border}`,
                          color: isSelected ? s.color : '#334155',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '6px',
                        }}
                      >
                        {isSelected && <Check size={14} strokeWidth={3} />}
                        {s.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Assigned Worker */}
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#1e293b', marginBottom: '6px' }}>
                  दायित्व सौंपा गया कार्यकर्ता (Assigned Worker):
                </label>
                <div style={{ position: 'relative' }}>
                  <select
                    value={bulkTagFormData.assignedWorker}
                    onChange={(e) => setBulkTagFormData({ ...bulkTagFormData, assignedWorker: e.target.value })}
                    style={{
                      width: '100%',
                      height: '42px',
                      borderRadius: '8px',
                      border: '1.5px solid #cbd5e1',
                      padding: '0 36px 0 14px',
                      fontSize: '13.5px',
                      background: '#ffffff',
                      color: bulkTagFormData.assignedWorker ? '#0f172a' : '#64748b',
                      fontWeight: bulkTagFormData.assignedWorker ? 600 : 400,
                      cursor: 'pointer',
                      appearance: 'none',
                    }}
                  >
                    <option value="">-- कोई बदलाव नहीं / Unassigned --</option>
                    {workersList.map((w) => (
                      <option key={w.id} value={w.name}>
                        {w.name}
                      </option>
                    ))}
                  </select>
                  <ChevronDown
                    size={18}
                    style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: '#64748b' }}
                  />
                </div>
              </div>

              {/* Migrant Status */}
              <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <label style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: 700, color: '#1e293b' }}>
                  <input
                    type="checkbox"
                    checked={bulkTagFormData.isMigrant}
                    onChange={(e) => setBulkTagFormData({ ...bulkTagFormData, isMigrant: e.target.checked })}
                    className="sb-checkbox"
                  />
                  <span>प्रवासी मतदाता मार्क करें (Mark as Migrant)</span>
                </label>
                {bulkTagFormData.isMigrant && (
                  <input
                    type="text"
                    value={bulkTagFormData.migrantLocation}
                    onChange={(e) => setBulkTagFormData({ ...bulkTagFormData, migrantLocation: e.target.value })}
                    placeholder="वर्तमान शहर / स्थान (उदा: सूरत, अहमदाबाद, मुंबई...)"
                    style={{ width: '100%', height: '38px', borderRadius: '6px', border: '1px solid #cbd5e1', padding: '0 12px', fontSize: '13px', marginTop: '8px', background: '#ffffff' }}
                  />
                )}
              </div>

              {/* Notes */}
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#1e293b', marginBottom: '6px' }}>
                  टिप्पणी / विशेष नोट (Notes):
                </label>
                <textarea
                  value={bulkTagFormData.notes}
                  onChange={(e) => setBulkTagFormData({ ...bulkTagFormData, notes: e.target.value })}
                  placeholder="उदा: संपर्क किया गया, परिवार समर्थन में है, आदि..."
                  rows={2}
                  style={{ width: '100%', borderRadius: '8px', border: '1.5px solid #cbd5e1', padding: '8px 12px', fontSize: '13px', resize: 'vertical', fontFamily: 'inherit' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '8px', paddingTop: '12px', borderTop: '1px solid #e2e8f0' }}>
                <button
                  type="button"
                  onClick={() => setIsBulkTagOpen(false)}
                  disabled={isBulkSubmitting}
                  style={{ background: '#ffffff', border: '1px solid #cbd5e1', color: '#334155', padding: '8px 18px', borderRadius: '8px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}
                >
                  रद्द करें
                </button>
                <button
                  type="submit"
                  disabled={isBulkSubmitting}
                  style={{
                    background: '#7c3aed',
                    border: 'none',
                    color: '#ffffff',
                    padding: '8px 22px',
                    borderRadius: '8px',
                    fontSize: '13px',
                    fontWeight: 700,
                    cursor: isBulkSubmitting ? 'not-allowed' : 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    boxShadow: '0 2px 6px rgba(124, 58, 237, 0.35)',
                  }}
                >
                  {isBulkSubmitting ? <LoaderCircle size={15} className="spin" /> : <Check size={15} />}
                  {selectedIds.length} मतदाताओं पर लागू करें
                </button>
              </div>
            </form>
          </section>
        </div>
      )}

      {/* 11. Bulk Caste Assign Modal */}
      {isBulkCasteOpen && (
        <div
          className="modal-backdrop"
          role="presentation"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget && !isBulkSubmitting) setIsBulkCasteOpen(false);
          }}
        >
          <section
            className="form-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="bulk-caste-title"
            style={{ maxWidth: '560px', width: '95%', maxHeight: '90vh', overflowY: 'auto' }}
          >
            <div className="modal-heading">
              <div>
                <span className="eyebrow-label" style={{ color: '#d97706' }}>BULK CASTE ASSIGNMENT</span>
                <h2 id="bulk-caste-title">जाति असाइन करें ({selectedIds.length} मतदाता)</h2>
                <p>डेटाबेस से किसी जाति को चुनें या नई जाति टाइप करके एक साथ सभी {selectedIds.length} मतदाताओं को असाइन करें।</p>
              </div>
              <button
                type="button"
                className="icon-button"
                onClick={() => setIsBulkCasteOpen(false)}
                disabled={isBulkSubmitting}
                aria-label="बंद करें"
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {/* Dynamic Search / Custom Input */}
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#1e293b', marginBottom: '6px' }}>
                  जाति खोजें या नई जाति दर्ज करें:
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="text"
                    value={bulkCasteInput}
                    onChange={(e) => {
                      setBulkCasteInput(e.target.value);
                      setBulkCasteSearch(e.target.value);
                    }}
                    placeholder="उदा: राजपूत, जाट, कुम्हार, चारण, ब्राह्मण..."
                    style={{
                      width: '100%',
                      height: '42px',
                      borderRadius: '8px',
                      border: '1.5px solid #d97706',
                      padding: '0 14px',
                      fontSize: '14px',
                      background: '#ffffff',
                      color: '#0f172a',
                      fontWeight: 600,
                    }}
                  />
                  {bulkCasteInput && (
                    <button
                      type="button"
                      onClick={() => {
                        setBulkCasteInput('');
                        setBulkCasteSearch('');
                      }}
                      style={{
                        position: 'absolute',
                        right: '10px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'none',
                        border: 'none',
                        color: '#94a3b8',
                        cursor: 'pointer',
                        fontSize: '14px',
                      }}
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>

              {/* Caste presets loaded dynamically from database */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span style={{ fontSize: '12px', fontWeight: 700, color: '#64748b' }}>
                    डेटाबेस से उपलब्ध जातियां ({activeCastePresets.length}):
                  </span>
                  {activeCastePresets.length > 0 && (
                    <span style={{ fontSize: '11px', color: '#94a3b8' }}>क्लिक करके चुनें</span>
                  )}
                </div>
                <div
                  style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '6px',
                    maxHeight: '180px',
                    overflowY: 'auto',
                    padding: '6px',
                    background: '#f8fafc',
                    borderRadius: '8px',
                    border: '1px solid #e2e8f0',
                  }}
                >
                  {activeCastePresets
                    .filter((c) => !bulkCasteSearch || c.toLowerCase().includes(bulkCasteSearch.toLowerCase().trim()))
                    .map((caste) => {
                      const isSelected = bulkCasteInput === caste;
                      return (
                        <button
                          key={caste}
                          type="button"
                          onClick={() => {
                            setBulkCasteInput(caste);
                            setBulkCasteSearch('');
                          }}
                          style={{
                            padding: '6px 12px',
                            borderRadius: '16px',
                            fontSize: '12.5px',
                            fontWeight: isSelected ? 800 : 600,
                            border: isSelected ? '1.5px solid #d97706' : '1px solid #cbd5e1',
                            background: isSelected ? '#fef3c7' : '#ffffff',
                            color: isSelected ? '#92400e' : '#334155',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            transition: 'all 0.15s ease',
                          }}
                        >
                          {isSelected && <Check size={12} strokeWidth={3} />}
                          {caste}
                        </button>
                      );
                    })}
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px', paddingTop: '12px', borderTop: '1px solid #e2e8f0' }}>
                <button
                  type="button"
                  onClick={() => setIsBulkCasteOpen(false)}
                  disabled={isBulkSubmitting}
                  style={{ background: '#ffffff', border: '1px solid #cbd5e1', color: '#334155', padding: '8px 18px', borderRadius: '8px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}
                >
                  रद्द करें
                </button>
                <button
                  type="button"
                  disabled={!bulkCasteInput.trim() || isBulkSubmitting}
                  onClick={() => void handleBulkCasteAssign(bulkCasteInput)}
                  style={{
                    background: '#d97706',
                    border: 'none',
                    color: '#ffffff',
                    padding: '8px 22px',
                    borderRadius: '8px',
                    fontSize: '13px',
                    fontWeight: 700,
                    cursor: !bulkCasteInput.trim() || isBulkSubmitting ? 'not-allowed' : 'pointer',
                    opacity: !bulkCasteInput.trim() ? 0.6 : 1,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    boxShadow: '0 2px 6px rgba(217, 119, 6, 0.35)',
                  }}
                >
                  {isBulkSubmitting ? <LoaderCircle size={15} className="spin" /> : <Check size={15} />}
                  "{bulkCasteInput.trim() || 'जाति'}" असाइन करें ({selectedIds.length})
                </button>
              </div>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
