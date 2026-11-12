'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  Download,
  LoaderCircle,
  Printer,
  RefreshCw,
  Search,
  Send,
  Ticket,
  X,
  Layers,
  Sparkles,
  Sliders,
  Check,
  Upload,
  Trash2,
  Building,
  UsersRound,
} from 'lucide-react';
import { apiFetch, getApiError, decodeJwtPayload } from '@/lib/api';
import { VoterSlipTemplate, SlipConfig, SlipFormat, defaultSlipConfig } from '@/components/VoterSlipTemplate';
import { FamilyVoterSlipTemplate } from '@/components/FamilyVoterSlipTemplate';
import { WardPollingStationEditor } from '@/components/WardPollingStationEditor';
import { ImageCropModal } from '@/components/ImageCropModal';
import { downloadSlip, downloadBulkSlipsAsZip, generateSlipImage, downloadFamilySlip, generateFamilySlipImage } from '@/lib/downloadSlip';
import { shareVoterSlipToWhatsApp, shareFamilySlipToWhatsApp } from '@/lib/whatsappShare';
import { SortButton, SortState } from '@/components/SortButton';
import { WhatsAppLogo } from '@/components/WhatsAppLogo';
import { WhatsAppWebHelperModal } from '@/components/WhatsAppWebHelperModal';
import { attachEnglishNames, matchesVoterQuery } from '@/lib/transliteration';
import { toast } from '@/components/Toast';

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
  phone?: string;
  caste?: string;
  voted?: boolean;
  boothName?: string;
}

const partyPresets: Record<string, Partial<SlipConfig>> = {
  bjp: {
    partyName: 'भारतीय जनता पार्टी (भाजपा) प्रत्याशी',
    partySymbolName: 'कमल का फूल',
    evmNumber: '1',
    appealHeadline: '(1 नंबर पर कमल का फूल का बटन दबाएं)',
    appealText: 'वार्ड से भाजपा प्रत्याशी को अपना अमूल्य वोट देकर भारी मतों से विजयी बनाएं।',
    footerAppeal: 'कमल का बटन दबाएं और भारी मतों से विजयी बनाएं',
  },
  inc: {
    partyName: 'भारतीय राष्ट्रीय कांग्रेस (INC) प्रत्याशी',
    partySymbolName: 'हाथ का पंजा',
    evmNumber: '2',
    appealHeadline: '(2 नंबर पर हाथ के पंजे का बटन दबाएं)',
    appealText: 'वार्ड से कांग्रेस प्रत्याशी को अपना अमूल्य वोट देकर भारी मतों से विजयी बनाएं।',
    footerAppeal: 'हाथ के पंजे का बटन दबाएं और भारी मतों से विजयी बनाएं',
  },
  ind_kite: {
    partyName: 'निर्दलीय प्रत्याशी',
    partySymbolName: 'पतंग',
    evmNumber: '4',
    appealHeadline: '(4 नंबर पर पतंग का बटन दबाएं)',
    appealText: 'वार्ड से निर्दलीय प्रत्याशी को अपना अमूल्य वोट देकर भारी मतों से विजयी बनाएं।',
    footerAppeal: 'पतंग का बटन दबाएं और भारी मतों से विजयी बनाएं',
  },
  ind_bat: {
    partyName: 'निर्दलीय प्रत्याशी',
    partySymbolName: 'बल्ला',
    evmNumber: '5',
    appealHeadline: '(5 नंबर पर बल्ले का बटन दबाएं)',
    appealText: 'वार्ड से निर्दलीय प्रत्याशी को अपना अमूल्य वोट देकर भारी मतों से विजयी बनाएं।',
    footerAppeal: 'बल्ले का बटन दबाएं और भारी मतों से विजयी बनाएं',
  },
  ind_key: {
    partyName: 'निर्दलीय प्रत्याशी',
    partySymbolName: 'चाबी',
    evmNumber: '6',
    appealHeadline: '(6 नंबर पर चाबी का बटन दबाएं)',
    appealText: 'वार्ड से निर्दलीय प्रत्याशी को अपना अमूल्य वोट देकर भारी मतों से विजयी बनाएं।',
    footerAppeal: 'चाबी का बटन दबाएं और भारी मतों से विजयी बनाएं',
  },
  aap: {
    partyName: 'आम आदमी पार्टी (आप) प्रत्याशी',
    partySymbolName: 'झाड़ू',
    evmNumber: '3',
    appealHeadline: '(3 नंबर पर झाड़ू का बटन दबाएं)',
    appealText: 'वार्ड से आप प्रत्याशी को अपना अमूल्य वोट देकर भारी मतों से विजयी बनाएं।',
    footerAppeal: 'झाड़ू का बटन दबाएं और भारी मतों से विजयी बनाएं',
  },
};

interface Household {
  key: string;
  houseNo: string;
  wardNo: string;
  partNo: string;
  members: Voter[];
  headName: string;
}

const VoterCardItem = React.memo(function VoterCardItem({
  voter,
  isSelected,
  onSelect,
}: {
  voter: Voter;
  isSelected: boolean;
  onSelect: (voter: Voter) => void;
}) {
  return (
    <div
      onClick={() => onSelect(voter)}
      style={{
        padding: '10px 12px',
        borderRadius: '8px',
        marginBottom: '6px',
        cursor: 'pointer',
        background: isSelected ? '#eff6ff' : '#ffffff',
        border: isSelected ? '1.5px solid #3b82f6' : '1px solid #f1f5f9',
        transition: 'background 0.1s ease',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <strong style={{ color: isSelected ? '#1e40af' : '#0f172a', fontSize: '14px', display: 'flex', flexWrap: 'wrap', alignItems: 'baseline', gap: '4px' }}>
          <span>{voter.nameHi || voter.nameEn || 'मतदाता'}</span>
          {voter.nameEn && voter.nameEn !== voter.nameHi && (
            <span style={{ fontSize: '11px', color: isSelected ? '#3b82f6' : '#64748b', fontWeight: 600 }}>
              ({voter.nameEn})
            </span>
          )}
        </strong>
        <span
          style={{
            fontSize: '11px',
            fontWeight: 700,
            color: '#ea580c',
            background: '#fff7ed',
            padding: '1px 6px',
            borderRadius: '4px',
            border: '1px solid #fed7aa',
          }}
        >
          क्र. {voter.serialNo || '-'}
        </span>
      </div>

      <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
        {voter.relationType === 'husband' ? 'पति' : 'पिता'}: {voter.relativeNameHi || voter.relativeNameEn || '-'}
        {voter.relativeNameEn && voter.relativeNameEn !== voter.relativeNameHi && (
          <span style={{ fontSize: '11px', color: '#94a3b8', marginLeft: '4px' }}>
            ({voter.relativeNameEn})
          </span>
        )}
      </div>

      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          fontSize: '11px',
          color: '#94a3b8',
          marginTop: '4px',
        }}
      >
        <span style={{ color: '#2563eb', fontWeight: 600 }}>{(voter.epic && !voter.epic.startsWith('VOTER_') && !voter.epic.startsWith('UNREADABLE_')) ? voter.epic : 'EPIC: N/A'}</span>
        <span>भाग: {voter.partNo || '-'} · मकान: {voter.houseNo || '-'}</span>
      </div>
    </div>
  );
});

const HouseholdCardItem = React.memo(function HouseholdCardItem({
  household,
  isSelected,
  onSelect,
}: {
  household: Household;
  isSelected: boolean;
  onSelect: (household: Household) => void;
}) {
  return (
    <div
      onClick={() => onSelect(household)}
      style={{
        padding: '10px 12px',
        borderRadius: '8px',
        marginBottom: '6px',
        cursor: 'pointer',
        background: isSelected ? '#ecfdf5' : '#ffffff',
        border: isSelected ? '1.5px solid #059669' : '1px solid #f1f5f9',
        transition: 'background 0.15s ease',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <strong style={{ color: isSelected ? '#065f46' : '#0f172a', fontSize: '13.5px', display: 'block' }}>
            {household.headName || 'परिवार मुखिया'}
          </strong>
          <span style={{ fontSize: '11.5px', color: '#64748b' }}>
            मकान नं. <strong>#{household.houseNo}</strong> · वार्ड <strong>{household.wardNo || '—'}</strong>
          </span>
        </div>
        <span
          style={{
            fontSize: '11px',
            fontWeight: 700,
            color: isSelected ? '#047857' : '#0284c7',
            background: isSelected ? '#d1fae5' : '#e0f2fe',
            padding: '2px 8px',
            borderRadius: '12px',
            border: `1px solid ${isSelected ? '#a7f3d0' : '#bae6fd'}`,
            whiteSpace: 'nowrap',
          }}
        >
          👨‍👩‍👧‍👦 {household.members.length} सदस्य
        </span>
      </div>
    </div>
  );
});

export default function SlipsPage() {
  const [voters, setVoters] = useState<Voter[]>([]);
  const [selectedVoter, setSelectedVoter] = useState<Voter | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [wardFilter, setWardFilter] = useState('');
  const [partFilter, setPartFilter] = useState('');
  const [availableWards, setAvailableWards] = useState<string[]>([]);
  const [availableParts, setAvailableParts] = useState<string[]>([]);
  const [slipConfig, setSlipConfig] = useState<SlipConfig>(defaultSlipConfig);
  const [orgName, setOrgName] = useState('विजयसेतु चुनाव वॉर रूम');

  // Admin access & Client management state
  const [isAdmin, setIsAdmin] = useState(false);
  const [clientsList, setClientsList] = useState<Array<{ id: string; name: string; slipConfig?: SlipConfig }>>([]);
  const [activeOrgId, setActiveOrgId] = useState<string>('');

  // Branding Customization Modal state (Admin only)
  const [isCustomizing, setIsCustomizing] = useState(false);
  const [editingConfig, setEditingConfig] = useState<SlipConfig>(defaultSlipConfig);
  const [selectedTargetOrgId, setSelectedTargetOrgId] = useState<string>('');
  const [previewWard, setPreviewWard] = useState<string>('');
  const [savingBranding, setSavingBranding] = useState(false);
  const [brandingSaveMsg, setBrandingSaveMsg] = useState('');

  // WhatsApp Quota state
  const [whatsappQuota, setWhatsappQuota] = useState<{
    whatsappEnabled: boolean;
    whatsappCredits: number;
    whatsappUsed: number;
    canSend: boolean;
    metaConfigured: boolean;
  } | null>(null);

  // WhatsApp Modal
  const [isWpModalOpen, setIsWpModalOpen] = useState(false);
  const [cachedSlipImageDataUrl, setCachedSlipImageDataUrl] = useState<string | null>(null);
  const [wpPhone, setWpPhone] = useState('');
  const [wpSending, setWpSending] = useState(false);
  const [wpMessage, setWpMessage] = useState('');
  const [whatsappHelperData, setWhatsappHelperData] = useState<{
    isOpen: boolean;
    voterName: string;
    epic: string;
    imageDataUrl: string;
    waLink?: string;
  } | null>(null);

  // Modes: 'single' | 'family' | 'bulk'
  const [slipMode, setSlipMode] = useState<'single' | 'family' | 'bulk'>('single');
  const [bulkMode, setBulkMode] = useState(false);
  const [perA4, setPerA4] = useState<4 | 8 | 12 | 16>(4);
  const [selectedSlipFormat, setSelectedSlipFormat] = useState<SlipFormat>('full');
  const [isDownloading, setIsDownloading] = useState(false);
  const [isDownloadingBulkZip, setIsDownloadingBulkZip] = useState(false);
  const [bulkZipProgress, setBulkZipProgress] = useState({ current: 0, total: 0 });
  const [sort, setSort] = useState<SortState>({ field: 'serialNo', direction: 'asc' });

  // Single Voter Pagination state
  const [voterPage, setVoterPage] = useState(1);
  const [voterPageSize, setVoterPageSize] = useState(40);
  const [totalVotersCount, setTotalVotersCount] = useState(0);

  // Family Mode State & Pagination
  const [selectedHouseKey, setSelectedHouseKey] = useState<string>('');
  const [familySearch, setFamilySearch] = useState<string>('');
  const [cachedFamilySlipImageDataUrl, setCachedFamilySlipImageDataUrl] = useState<string | null>(null);
  const [familyPage, setFamilyPage] = useState(1);
  const [familyPageSize, setFamilyPageSize] = useState(30);
  const [totalHouseholdsCount, setTotalHouseholdsCount] = useState(0);
  const [householdsList, setHouseholdsList] = useState<Household[]>([]);
  const [isLoadingHouseholds, setIsLoadingHouseholds] = useState(false);
  const [selectedHouseholdData, setSelectedHouseholdData] = useState<Household | null>(null);

  // Debounced Search states (300ms)
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [debouncedFamilySearch, setDebouncedFamilySearch] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setVoterPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedFamilySearch(familySearch);
      setFamilyPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [familySearch]);

  const voterTotalPages = Math.max(1, Math.ceil(totalVotersCount / voterPageSize));
  const familyTotalPages = Math.max(1, Math.ceil(totalHouseholdsCount / familyPageSize));

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
        const nameA = (a.nameHi || a.nameEn || '').trim();
        const nameB = (b.nameHi || b.nameEn || '').trim();
        cmp = nameA.localeCompare(nameB, 'hi-IN');
      } else if (sort.field === 'houseNo') {
        cmp = (a.houseNo || '').localeCompare(b.houseNo || '', undefined, { numeric: true });
      }
      return sort.direction === 'asc' ? cmp : -cmp;
    });
    return list;
  }, [voters, sort]);

  const visibleVotersList = useMemo(() => {
    const q = searchQuery.trim();
    if (!q) return sortedVoters;
    return sortedVoters.filter((v) => matchesVoterQuery(q, v));
  }, [sortedVoters, searchQuery]);

  const selectedHousehold = useMemo(() => {
    if (selectedHouseholdData) return selectedHouseholdData;
    if (householdsList.length > 0) return householdsList[0];
    return null;
  }, [selectedHouseholdData, householdsList]);

  const handleSelectVoter = useCallback((voter: Voter) => {
    setSelectedVoter(voter);
  }, []);

  const handleSelectHousehold = useCallback(async (household: Household) => {
    setSelectedHouseholdData(household);
    setSelectedHouseKey(household.key);
    // If members list is empty or partial, fetch complete household from /voters/family/:houseNo
    if (!household.members || household.members.length === 0) {
      try {
        const res = await apiFetch(
          `/voters/family/${encodeURIComponent(household.houseNo)}?ward=${encodeURIComponent(household.wardNo || '')}&part=${encodeURIComponent(household.partNo || '')}`
        );
        if (res.ok) {
          const fresh = await res.json();
          if (Array.isArray(fresh) && fresh.length > 0) {
            setSelectedHouseholdData({
              ...household,
              members: fresh,
            });
          }
        }
      } catch {}
    }
  }, []);

  const printContainerRef = useRef<HTMLDivElement>(null);

  // Check Admin Role
  useEffect(() => {
    try {
      const token = window.localStorage.getItem('token');
      if (token) {
        const payload = decodeJwtPayload<{ user?: { role?: string } }>(token);
        setIsAdmin(payload?.user?.role === 'admin');
      } else {
        setIsAdmin(false);
      }
    } catch {
      setIsAdmin(false);
    }
  }, []);

  // Load Slip Configuration
  const loadSlipConfig = useCallback(async () => {
    try {
      const res = await apiFetch('/features/slip-config', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        if (data.slipConfig) {
          const loadedCfg = { ...defaultSlipConfig, ...data.slipConfig };
          setSlipConfig(loadedCfg);
          if (loadedCfg.slipFormat) {
            setSelectedSlipFormat(loadedCfg.slipFormat);
          }
        }
        if (data.organizationName) {
          setOrgName(data.organizationName);
        }
        if (data.organizationId) {
          setActiveOrgId(data.organizationId);
        }
      }
    } catch (e) {
      console.warn('Slip config load warning:', e);
    }
  }, []);

  // Load WhatsApp Quota
  const loadWhatsappQuota = useCallback(async () => {
    try {
      const res = await apiFetch('/whatsapp/quota', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        setWhatsappQuota(data);
      }
    } catch {}
  }, []);

  // Load Admin Clients List
  const loadClientsList = useCallback(async () => {
    try {
      const res = await apiFetch('/admin/organizations', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        const list: Array<{ _id: string; name: string; slipConfig?: SlipConfig }> = Array.isArray(data) ? data : data.organizations || [];
        setClientsList(
          list.map((org) => ({
            id: org._id,
            name: org.name,
            slipConfig: org.slipConfig,
          }))
        );
      }
    } catch {}
  }, []);

  // Load Wards list and counts (Cached)
  const loadWardsSummary = useCallback(async () => {
    try {
      const res = await apiFetch('/voters/wards-summary', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.wards)) {
          const ws = data.wards.map((w: any) => String(w._id)).filter(Boolean);
          if (ws.length > 0) setAvailableWards(ws);
        }
        if (typeof data.total === 'number' && data.total > 0) {
          setTotalVotersCount((prev) => (prev > 0 ? prev : data.total));
        }
      }
    } catch {}
  }, []);

  const latestSearchRequestIdRef = useRef(0);
  const searchAbortControllerRef = useRef<AbortController | null>(null);

  // Load Voters with Server-side Pagination
  const loadVoters = useCallback(async (targetPage = 1, customPageSize?: number) => {
    const requestId = ++latestSearchRequestIdRef.current;
    if (searchAbortControllerRef.current) {
      try {
        searchAbortControllerRef.current.abort();
      } catch {}
    }
    const controller = new AbortController();
    searchAbortControllerRef.current = controller;

    const sizeToUse = customPageSize || voterPageSize;

    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({
        page: String(targetPage),
        pageSize: String(sizeToUse),
      });
      if (debouncedSearch.trim()) params.set('search', debouncedSearch.trim());
      if (wardFilter) params.set('ward', wardFilter);
      if (partFilter) params.set('part', partFilter);

      const res = await apiFetch(`/voters?${params.toString()}`, { cache: 'no-store', signal: controller.signal });
      if (requestId !== latestSearchRequestIdRef.current) return;

      if (!res.ok) throw new Error(await getApiError(res, 'मतदाता लोड नहीं हो सके'));
      const data = await res.json();
      if (requestId !== latestSearchRequestIdRef.current) return;

      const rawList: Voter[] = Array.isArray(data) ? data : data.data || data.voters || [];
      const list = rawList.map((v) => attachEnglishNames(v));
      const total = typeof data.total === 'number' ? data.total : list.length;
      setVoters(list);
      setTotalVotersCount(total);
      setVoterPage(targetPage);

      // Extract unique parts
      const parts = Array.from(new Set(list.map((v) => v.partNo).filter(Boolean))) as string[];
      if (parts.length) setAvailableParts((prev) => Array.from(new Set([...prev, ...parts])).sort());

      // Select first voter by default if not set
      if (list.length > 0) {
        setSelectedVoter((prev) => {
          if (!prev) return list[0];
          const exists = list.find((v) => v._id === prev._id);
          return exists || list[0];
        });
      } else {
        setSelectedVoter(null);
      }
    } catch (err: any) {
      if (err?.name === 'AbortError') return;
      if (requestId !== latestSearchRequestIdRef.current) return;
      setError(err instanceof Error ? err.message : 'डेटा लोड करने में त्रुटि हुई');
    } finally {
      if (requestId === latestSearchRequestIdRef.current) {
        setLoading(false);
      }
    }
  }, [debouncedSearch, wardFilter, partFilter, voterPageSize]);

  // Fallback for households if remote server hasn't restarted with /households route yet
  const loadHouseholdsFallback = useCallback(async (targetPage: number) => {
    try {
      const params = new URLSearchParams({
        page: '1',
        pageSize: '1000',
      });
      if (debouncedFamilySearch.trim()) params.set('search', debouncedFamilySearch.trim());
      if (wardFilter) params.set('ward', wardFilter);
      if (partFilter) params.set('part', partFilter);

      const res = await apiFetch(`/voters?${params.toString()}`, { cache: 'no-store' });
      if (!res.ok) return;
      const data = await res.json();
      const list: Voter[] = Array.isArray(data) ? data : data.data || data.voters || [];

      const map = new Map<string, Household>();
      list.forEach((v) => {
        const h = (v.houseNo || '—').trim();
        const w = (v.wardNo || '').trim();
        const p = (v.partNo || '').trim();
        const key = `${w}_${p}_${h}`;
        if (!map.has(key)) {
          map.set(key, {
            key,
            houseNo: h,
            wardNo: w,
            partNo: p,
            members: [],
            headName: v.nameHi || v.nameEn || 'मुखिया',
          });
        }
        map.get(key)!.members.push(v);
      });

      const allHouseholds = Array.from(map.values()).sort((a, b) => b.members.length - a.members.length);
      setTotalHouseholdsCount(allHouseholds.length);
      const start = (targetPage - 1) * familyPageSize;
      const pageItems = allHouseholds.slice(start, start + familyPageSize);
      setHouseholdsList(pageItems);
      setFamilyPage(targetPage);
      if (pageItems.length > 0 && !selectedHouseholdData) {
        setSelectedHouseholdData(pageItems[0]);
      }
    } catch (e) {
      console.warn('Household fallback failed:', e);
    }
  }, [debouncedFamilySearch, wardFilter, partFilter, familyPageSize, selectedHouseholdData]);

  // Load Paginated Households (Primary: /voters/households with fallback)
  const loadHouseholds = useCallback(async (targetPage = 1) => {
    setIsLoadingHouseholds(true);
    try {
      const params = new URLSearchParams({
        page: String(targetPage),
        limit: String(familyPageSize),
      });
      if (debouncedFamilySearch.trim()) params.set('search', debouncedFamilySearch.trim());
      if (wardFilter) params.set('ward', wardFilter);
      if (partFilter) params.set('part', partFilter);

      const res = await apiFetch(`/voters/households?${params.toString()}`, { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        const list: Household[] = data.households || [];
        const total = data.pagination?.total ?? list.length;
        setHouseholdsList(list);
        setTotalHouseholdsCount(total);
        setFamilyPage(targetPage);
        if (list.length > 0) {
          setSelectedHouseholdData((prev) => {
            if (!prev) return list[0];
            const exists = list.find((h) => h.key === prev.key);
            return exists || list[0];
          });
        }
        return;
      }
      await loadHouseholdsFallback(targetPage);
    } catch {
      await loadHouseholdsFallback(targetPage);
    } finally {
      setIsLoadingHouseholds(false);
    }
  }, [debouncedFamilySearch, wardFilter, partFilter, familyPageSize, loadHouseholdsFallback]);

  // Initial load
  useEffect(() => {
    void loadSlipConfig();
    void loadWhatsappQuota();
    void loadClientsList();
    void loadWardsSummary();
  }, [loadSlipConfig, loadWhatsappQuota, loadClientsList, loadWardsSummary]);

  // Load voters when single/bulk mode is active or when single filters change
  useEffect(() => {
    if (slipMode === 'single' || slipMode === 'bulk') {
      void loadVoters(1);
    }
  }, [slipMode, debouncedSearch, wardFilter, partFilter, loadVoters]);

  // Load households when family mode is active or when family filters change
  useEffect(() => {
    if (slipMode === 'family') {
      void loadHouseholds(1);
    }
  }, [slipMode, debouncedFamilySearch, wardFilter, partFilter, loadHouseholds]);

  // Listen to Client Switch event from Dashboard Shell
  useEffect(() => {
    const handleClientChange = () => {
      void loadSlipConfig();
      void loadWhatsappQuota();
      void loadWardsSummary();
      if (slipMode === 'family') {
        void loadHouseholds(1);
      } else {
        void loadVoters(1);
      }
    };
    const handleSlipConfigChange = (e: any) => {
      if (e.detail) {
        const updated = { ...defaultSlipConfig, ...e.detail };
        setSlipConfig(updated);
        if (updated.slipFormat) {
          setSelectedSlipFormat(updated.slipFormat);
        }
      } else {
        void loadSlipConfig();
      }
    };
    window.addEventListener('client-changed', handleClientChange);
    window.addEventListener('slip-config-changed', handleSlipConfigChange);
    return () => {
      window.removeEventListener('client-changed', handleClientChange);
      window.removeEventListener('slip-config-changed', handleSlipConfigChange);
    };
  }, [loadSlipConfig, loadWhatsappQuota, loadWardsSummary, loadVoters, loadHouseholds, slipMode]);

  // Image Cropper Modal state (Meta style)
  const [cropModalOpen, setCropModalOpen] = useState(false);
  const [cropImageSrc, setCropImageSrc] = useState('');
  const [cropField, setCropField] = useState<'partySymbolImage' | 'candidateImage' | 'headerGraphicImage'>('candidateImage');

  // Image Upload handler - Opens Meta-style interactive Cropper
  const handleImageUpload = (
    e: React.ChangeEvent<HTMLInputElement>,
    field: 'partySymbolImage' | 'candidateImage' | 'headerGraphicImage'
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 15 * 1024 * 1024) {
      toast.error('फाइल 15MB से छोटी होनी चाहिए।');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      setCropImageSrc(base64);
      setCropField(field);
      setCropModalOpen(true);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleCropComplete = (croppedBase64: string) => {
    setEditingConfig((prev) => ({
      ...prev,
      [cropField]: croppedBase64,
      ...(cropField === 'headerGraphicImage' ? { useHeaderGraphic: true } : {}),
    }));
  };

  // Open Customization Modal
  const openCustomizing = () => {
    setEditingConfig({ ...slipConfig });
    const currentSelected = typeof window !== 'undefined' ? window.localStorage.getItem('selectedClientOrgId') || '' : '';
    setSelectedTargetOrgId(currentSelected || activeOrgId || 'org_default');
    setBrandingSaveMsg('');
    setIsCustomizing(true);
  };

  // Change target client inside modal
  const handleTargetClientSelect = async (orgId: string) => {
    setSelectedTargetOrgId(orgId);
    try {
      const res = await apiFetch(`/admin/organizations/${orgId}/slip-config`);
      if (res.ok) {
        const data = await res.json();
        setEditingConfig({ ...defaultSlipConfig, ...data });
      } else {
        const found = clientsList.find((c) => c.id === orgId);
        if (found?.slipConfig) {
          setEditingConfig({ ...defaultSlipConfig, ...found.slipConfig });
        }
      }
    } catch {}
  };

  // Apply Party Preset
  const applyPreset = (presetKey: string) => {
    const preset = partyPresets[presetKey];
    if (preset) {
      setEditingConfig((prev) => ({
        ...prev,
        ...preset,
      }));
    }
  };

  // Save Branding (Admin only)
  const handleSaveBranding = async () => {
    if (savingBranding) return;
    setSavingBranding(true);
    setBrandingSaveMsg('');
    try {
      const orgId = selectedTargetOrgId || activeOrgId || 'org_default';
      const res = await apiFetch('/features/slip-config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organizationId: orgId,
          slipConfig: editingConfig,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'पर्ची ब्रांडिंग सहेजी नहीं जा सकी।');
      }

      setSlipConfig(editingConfig);
      if (editingConfig.slipFormat) {
        setSelectedSlipFormat(editingConfig.slipFormat);
      }
      if (typeof window !== 'undefined') {
        localStorage.setItem('cachedSlipConfig', JSON.stringify(editingConfig));
        window.dispatchEvent(new CustomEvent('slip-config-changed', { detail: editingConfig }));
      }
      setBrandingSaveMsg('पर्ची ब्रांडिंग सफलतापूर्वक अपडेट हो गई!');
      toast.success('पर्ची ब्रांडिंग सफलतापूर्वक अपडेट हो गई!');
      setTimeout(() => {
        setIsCustomizing(false);
        setBrandingSaveMsg('');
      }, 1100);
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'ब्रांडिंग सहेजने में त्रुटि हुई';
      toast.error(errorMsg);
    } finally {
      setSavingBranding(false);
    }
  };

  // Auto-save phone number permanently to voter record
  const handleAutoSaveWpPhone = async (newPhone: string) => {
    if (!selectedVoter) return;
    const clean = newPhone.replace(/\D/g, '').slice(-10);
    if (clean && clean.length === 10 && clean !== (selectedVoter.phone || (selectedVoter as any).mobileNo)) {
      try {
        await apiFetch(`/voters/${selectedVoter._id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phone: clean, mobileNo: clean }),
        });
        setSelectedVoter((prev) => (prev ? { ...prev, phone: clean, mobileNo: clean } : null));
        setVoters((prev) => prev.map((v) => (v._id === selectedVoter._id ? { ...v, phone: clean, mobileNo: clean } : v)));
      } catch (err) {
        console.warn('Auto-save voter phone failed:', err);
      }
    }
  };

  // Official WhatsApp Send (Meta Cloud API with Photo)
  const handleSendWhatsAppViaApi = async () => {
    if (wpSending) return;
    void handleAutoSaveWpPhone(wpPhone);
    setWpSending(true);
    setWpMessage('पर्ची की फोटो और संदेश Meta API द्वारा भेजा जा रहा है...');
    try {
      if (slipMode === 'family' && selectedHousehold) {
        let slipImageDataUrl = cachedFamilySlipImageDataUrl || undefined;
        if (!slipImageDataUrl) {
          try {
            slipImageDataUrl = await generateFamilySlipImage(selectedHousehold.members, slipConfig, {
              houseNo: selectedHousehold.houseNo,
              wardNo: selectedHousehold.wardNo,
              partNo: selectedHousehold.partNo,
            });
          } catch (e) {
            console.warn('Family slip render failed:', e);
          }
        }
        const first = selectedHousehold.members[0];
        const response = await apiFetch('/whatsapp/send-slip', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            voterId: first?._id,
            phoneNumber: wpPhone || selectedHousehold.members.find((m) => m.phone)?.phone || '',
            slipImageDataUrl,
            slipType: 'family',
            templateName: slipConfig?.whatsappTemplateName || undefined,
          }),
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(data.message || 'WhatsApp परिवार पर्ची नहीं भेजी जा सकी');
        }
        if (typeof data.remainingCredits === 'number') {
          setWhatsappQuota((prev) =>
            prev ? { ...prev, whatsappCredits: data.remainingCredits, whatsappUsed: (prev.whatsappUsed || 0) + 1 } : prev
          );
        }
        setWpMessage(data.message || 'Meta API ने परिवार पर्ची स्वीकार कर ली है (वितरण कतार में)।');
        setTimeout(() => setIsWpModalOpen(false), 2000);
      } else {
        if (!selectedVoter) return;
        const effectiveConfig: SlipConfig = {
          ...slipConfig,
          slipFormat: selectedSlipFormat,
        };
        let slipImageDataUrl = cachedSlipImageDataUrl || undefined;
        if (!slipImageDataUrl) {
          try {
            slipImageDataUrl = await generateSlipImage(selectedVoter, effectiveConfig, printContainerRef.current);
          } catch (imgErr) {
            console.warn('Failed to pre-render slip image for Meta API:', imgErr);
          }
        }

        const response = await apiFetch('/whatsapp/send-slip', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            voterId: selectedVoter._id,
            phoneNumber: wpPhone || selectedVoter.phone || '',
            slipImageDataUrl,
            templateName: effectiveConfig?.whatsappTemplateName || undefined,
          }),
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(data.message || 'WhatsApp पर्ची नहीं भेजी जा सकी');
        }
        if (typeof data.remainingCredits === 'number') {
          setWhatsappQuota((prev) =>
            prev ? { ...prev, whatsappCredits: data.remainingCredits, whatsappUsed: (prev.whatsappUsed || 0) + 1 } : prev
          );
        }
        setWpMessage(data.message || 'Meta API ने पर्ची स्वीकार कर ली है (वितरण कतार में)।');
        setTimeout(() => {
          setIsWpModalOpen(false);
        }, 2000);
      }
    } catch (err) {
      setWpMessage(err instanceof Error ? err.message : 'संदेश भेजने में त्रुटि हुई');
    } finally {
      setWpSending(false);
    }
  };

  // Direct WhatsApp (Mobile Share with Photo + Desktop Clipboard Paste + Android Native Bridge)
  const handleSendDirectWhatsApp = async () => {
    if (wpSending) return;
    void handleAutoSaveWpPhone(wpPhone);
    setWpSending(true);
    try {
      if (slipMode === 'family' && selectedHousehold) {
        const result = await shareFamilySlipToWhatsApp({
          familyMembers: selectedHousehold.members,
          slipConfig,
          metadata: {
            houseNo: selectedHousehold.houseNo,
            wardNo: selectedHousehold.wardNo,
            partNo: selectedHousehold.partNo,
          },
          phoneNumber: wpPhone || selectedHousehold.members.find((m) => m.phone)?.phone || '',
          preGeneratedImageDataUrl: cachedFamilySlipImageDataUrl || undefined,
          onStatusUpdate: (msg) => setWpMessage(msg),
        });

        if (typeof result.remainingCredits === 'number') {
          const remaining = result.remainingCredits;
          setWhatsappQuota((prev) =>
            prev ? { ...prev, whatsappCredits: remaining, whatsappUsed: (prev.whatsappUsed || 0) + 1 } : prev
          );
        }

        setWpMessage(result.message);
        if (result.success) {
          if (result.method === 'desktop_clipboard' && result.imageDataUrl) {
            setIsWpModalOpen(false);
            setWhatsappHelperData({
              isOpen: true,
              voterName: result.voterName || `मकान #${selectedHousehold.houseNo} परिवार`,
              epic: result.epic || `House #${selectedHousehold.houseNo}`,
              imageDataUrl: result.imageDataUrl,
              waLink: result.waLink,
            });
          } else {
            setTimeout(() => setIsWpModalOpen(false), 2200);
          }
        }
      } else {
        if (!selectedVoter) return;
        const effectiveConfig: SlipConfig = {
          ...slipConfig,
          slipFormat: selectedSlipFormat,
        };
        const result = await shareVoterSlipToWhatsApp({
          voter: selectedVoter,
          slipConfig: effectiveConfig,
          phoneNumber: wpPhone || selectedVoter.phone || '',
          preGeneratedImageDataUrl: cachedSlipImageDataUrl || undefined,
          existingElement: printContainerRef.current,
          onStatusUpdate: (msg) => setWpMessage(msg),
        });

        if (typeof result.remainingCredits === 'number') {
          const remaining = result.remainingCredits;
          setWhatsappQuota((prev) =>
            prev ? { ...prev, whatsappCredits: remaining, whatsappUsed: (prev.whatsappUsed || 0) + 1 } : prev
          );
        }

        setWpMessage(result.message);
        if (result.success) {
          if (result.method === 'desktop_clipboard' && result.imageDataUrl) {
            setIsWpModalOpen(false);
            setWhatsappHelperData({
              isOpen: true,
              voterName: result.voterName || selectedVoter.nameHi || selectedVoter.nameEn,
              epic: result.epic || selectedVoter.epic,
              imageDataUrl: result.imageDataUrl,
              waLink: result.waLink,
            });
          } else {
            setTimeout(() => setIsWpModalOpen(false), 2200);
          }
        }
      }
    } catch (err) {
      setWpMessage(err instanceof Error ? err.message : 'संदेश भेजने में त्रुटि हुई');
    } finally {
      setWpSending(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadImage = async () => {
    if (slipMode === 'family' && selectedHousehold) {
      setIsDownloading(true);
      try {
        const ok = await downloadFamilySlip(selectedHousehold.members, slipConfig, {
          houseNo: selectedHousehold.houseNo,
          wardNo: selectedHousehold.wardNo,
          partNo: selectedHousehold.partNo,
        });
        if (ok) toast.success('परिवार पर्ची डाउनलोड हो गई।');
      } catch {
        toast.error('परिवार पर्ची डाउनलोड नहीं हो सकी');
      } finally {
        setIsDownloading(false);
      }
    } else if (selectedVoter) {
      setIsDownloading(true);
      try {
        const effectiveConfig: SlipConfig = {
          ...slipConfig,
          slipFormat: selectedSlipFormat,
        };
        const ok = await downloadSlip(selectedVoter, effectiveConfig, printContainerRef.current);
        if (ok) toast.success('मतदाता पर्ची डाउनलोड हो गई।');
      } catch {
        toast.error('पर्ची इमेज डाउनलोड नहीं हो सकी');
      } finally {
        setIsDownloading(false);
      }
    }
  };

  const handleDownloadBulkZip = async () => {
    setIsDownloadingBulkZip(true);
    setBulkZipProgress({ current: 0, total: totalVotersCount || 1 });
    try {
      const allVoters: Voter[] = [];
      let p = 1;
      const batchSize = 100;
      while (true) {
        const params = new URLSearchParams({
          page: String(p),
          pageSize: String(batchSize),
        });
        if (debouncedSearch.trim()) params.set('search', debouncedSearch.trim());
        if (wardFilter) params.set('ward', wardFilter);
        if (partFilter) params.set('part', partFilter);

        const res = await apiFetch(`/voters?${params.toString()}`);
        if (!res.ok) break;
        const json = await res.json();
        const batch: Voter[] = Array.isArray(json) ? json : json.data || json.voters || [];
        if (!batch.length) break;
        allVoters.push(...batch);
        const total = typeof json.total === 'number' ? json.total : allVoters.length;
        setBulkZipProgress({ current: allVoters.length, total });
        if (batch.length < batchSize || allVoters.length >= total) break;
        p++;
        await new Promise((r) => setTimeout(r, 20));
      }

      if (allVoters.length === 0) {
        toast.warning('कोई मतदाता नहीं मिला');
        return;
      }

      setBulkZipProgress({ current: 0, total: allVoters.length });
      const effectiveConfig: SlipConfig = {
        ...slipConfig,
        slipFormat: selectedSlipFormat,
      };
      const zipOk = await downloadBulkSlipsAsZip(allVoters, effectiveConfig, (current, total) => {
        setBulkZipProgress({ current, total });
      });
      if (zipOk) toast.success(`${allVoters.length} पर्चियों की ZIP फ़ाइल तैयार होकर डाउनलोड हुई।`);
    } catch {
      toast.error('बल्क ZIP डाउनलोड करने में समस्या आई');
    } finally {
      setIsDownloadingBulkZip(false);
    }
  };

  return (
    <div className={`work-page slips-studio-page ${bulkMode ? `slips-bulk-print-mode slips-per-a4-${perA4} slips-format-${selectedSlipFormat}` : 'slips-single-print-mode'}`}>
      {/* Print & Screen CSS styling */}
      <style>{`
        /* ================= SCREEN STYLING FOR BULK PREVIEW ================= */
        @media screen {
          .slips-bulk-sheets-wrapper {
            display: flex;
            flex-direction: column;
            gap: 28px;
            width: 100%;
          }
          .a4-sheet-page {
            background: #ffffff;
            border-radius: 14px;
            border: 1.5px solid #cbd5e1;
            box-shadow: 0 4px 18px rgba(0, 0, 0, 0.06);
            padding: 16px;
            box-sizing: border-box;
            max-width: 100%;
            overflow-x: auto;
            -webkit-overflow-scrolling: touch;
          }
          .a4-sheet-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 8px 14px;
            background: #f1f5f9;
            border-radius: 8px;
            margin-bottom: 16px;
            border: 1px solid #e2e8f0;
          }
          .slips-per-a4-16 .a4-sheet-grid {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 10px;
          }
          .slips-per-a4-12 .a4-sheet-grid {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 14px;
          }
          .slips-per-a4-8 .a4-sheet-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 16px;
          }
          .slips-per-a4-4 .a4-sheet-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 20px;
          }

          .slips-per-a4-4 .slips-bulk-print-item .voter-slip-printable-card {
            zoom: 0.82;
            width: 560px !important;
            max-width: 560px !important;
          }
          .slips-per-a4-8 .slips-bulk-print-item .voter-slip-printable-card {
            zoom: 0.64;
            width: 560px !important;
            max-width: 560px !important;
          }
          .slips-per-a4-12 .slips-bulk-print-item .voter-slip-printable-card {
            zoom: 0.54;
            width: 560px !important;
            max-width: 560px !important;
          }
          .slips-per-a4-16 .slips-bulk-print-item .voter-slip-printable-card {
            zoom: 0.44;
            width: 530px !important;
            max-width: 530px !important;
          }
        }

        /* ================= PRINT STYLING ================= */
        @media print {
          @page {
            size: A4 portrait;
            margin: 4mm 5mm;
          }

          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          /* Hide all application chrome, toolbars, headers, and info bars */
          .no-print,
          .slips-branding-info-bar,
          .records-toolbar,
          .bulk-header-bar,
          .page-intro,
          .feature-actions,
          .inline-notice,
          .app-sidebar,
          .topbar,
          .app-footer,
          .modal-actions,
          .modal-backdrop,
          button {
            display: none !important;
          }

          html, body {
            background: #ffffff !important;
            margin: 0 !important;
            padding: 0 !important;
            height: auto !important;
            overflow: visible !important;
          }

          .app-shell,
          .app-main,
          .page-content,
          .work-page,
          .slips-studio-page {
            display: block !important;
            margin: 0 !important;
            padding: 0 !important;
            width: 100% !important;
            min-height: auto !important;
            overflow: visible !important;
            background: #ffffff !important;
          }

          /* ================= BULK PRINT MODE ================= */
          .slips-bulk-print-mode .slips-bulk-print-container {
            display: block !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            border: none !important;
            background: transparent !important;
            box-shadow: none !important;
          }

          .slips-bulk-print-mode .bulk-header-bar {
            display: none !important;
          }

          .slips-bulk-sheets-wrapper {
            display: block !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
          }

          /* Strict A4 Sheet Pagination Container - centered on page with safe printable height (prevents blank overflow pages) */
          .a4-sheet-page {
            width: 198mm !important;
            height: 274mm !important;
            max-height: 274mm !important;
            page-break-after: always !important;
            break-after: page !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
            overflow: hidden !important;
            box-sizing: border-box !important;
            margin: 0 auto !important;
            padding: 0 !important;
            display: flex !important;
            flex-direction: column !important;
            justify-content: center !important;
            align-items: center !important;
            background: transparent !important;
            border: none !important;
            box-shadow: none !important;
          }
          .a4-sheet-page:last-child {
            page-break-after: auto !important;
            break-after: auto !important;
          }

          .slips-bulk-print-mode .slips-bulk-print-item {
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            position: static !important;
            break-inside: avoid !important;
            page-break-inside: avoid !important;
            margin: 0 !important;
            padding: 0 !important;
            background: transparent !important;
            box-sizing: border-box !important;
            overflow: visible !important;
            border: none !important;
            box-shadow: none !important;
          }

          .slips-bulk-print-mode .voter-slip-printable-card {
            position: relative !important;
            left: auto !important;
            top: auto !important;
            margin: 0 auto !important;
            padding: 0 !important;
            box-shadow: none !important;
            break-inside: avoid !important;
            page-break-inside: avoid !important;
          }

          /* Compact inner card spacing for bulk sheet printing */
          .slips-bulk-print-mode .voter-slip-inner-card {
            box-shadow: none !important;
          }

          /* 4 in 1 A4: 2 columns × 2 rows (strictly 4 per sheet, generous scissor cutting space) */
          .slips-per-a4-4 .a4-sheet-grid {
            display: grid !important;
            grid-template-columns: repeat(2, 95mm) !important;
            grid-template-rows: repeat(2, 132mm) !important;
            gap: 6mm 6mm !important;
            width: 196mm !important;
            height: 270mm !important;
            max-height: 270mm !important;
            box-sizing: border-box !important;
            overflow: hidden !important;
            margin: 0 auto !important;
            padding: 0 !important;
          }
          .slips-per-a4-4 .slips-bulk-print-item {
            width: 95mm !important;
            height: 132mm !important;
            max-height: 132mm !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            overflow: hidden !important;
          }
          .slips-per-a4-4 .slips-bulk-print-item .voter-slip-printable-card {
            zoom: 0.65 !important;
            width: 520px !important;
            max-width: 520px !important;
          }

          /* 8 in 1 A4: 2 columns × 4 rows (strictly 8 per sheet, 4mm scissor cutting margin) */
          .slips-per-a4-8 .a4-sheet-grid {
            display: grid !important;
            grid-template-columns: repeat(2, 95mm) !important;
            grid-template-rows: repeat(4, 65mm) !important;
            gap: 3mm 6mm !important;
            width: 196mm !important;
            height: 270mm !important;
            max-height: 270mm !important;
            box-sizing: border-box !important;
            overflow: hidden !important;
            margin: 0 auto !important;
            padding: 0 !important;
          }
          .slips-per-a4-8 .slips-bulk-print-item {
            width: 95mm !important;
            height: 65mm !important;
            max-height: 65mm !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            overflow: visible !important;
          }
          .slips-per-a4-8 .slips-bulk-print-item .voter-slip-printable-card {
            zoom: 0.43 !important;
            width: 760px !important;
            max-width: 760px !important;
          }
          .slips-per-a4-8 .voter-slip-inner-card {
            padding: 6px 12px 7px 12px !important;
            gap: 4px !important;
            border-width: 2px !important;
            border-radius: 8px !important;
            box-shadow: none !important;
            width: 100% !important;
          }
          .slips-per-a4-8 .voter-slip-symbol-box,
          .slips-per-a4-8 .voter-slip-photo-box {
            width: 74px !important;
            min-width: 74px !important;
            max-width: 74px !important;
            height: 84px !important;
            min-height: 84px !important;
            max-height: 84px !important;
          }
          .slips-per-a4-8 .voter-slip-ribbon {
            min-height: 32px !important;
            padding: 3px 10px !important;
          }
          .slips-per-a4-8 .voter-slip-metric-card {
            padding: 3px 8px !important;
          }
          .slips-per-a4-8 .voter-slip-metric-num {
            font-size: 20px !important;
            line-height: 1.1 !important;
          }
          .slips-per-a4-8 .voter-slip-voter-table {
            padding: 3px 8px !important;
            gap: 1px !important;
          }
          .slips-per-a4-8 .voter-slip-voter-row {
            padding: 2px 4px !important;
            line-height: 1.2 !important;
          }
          .slips-per-a4-8 .voter-slip-voter-label {
            width: 110px !important;
            min-width: 110px !important;
            font-size: 11px !important;
          }
          .slips-per-a4-8 .voter-slip-voter-value {
            font-size: 11.5px !important;
          }
          .slips-per-a4-8 .voter-slip-polling-box {
            padding: 4px 8px !important;
          }
          .slips-per-a4-8 .voter-slip-footer-appeal {
            padding: 3px 8px !important;
          }

          /* 12 in 1 A4: 3 columns × 4 rows (strictly 12 per sheet, 3mm scissor cutting gap, NO cut-off, perfectly centered) */
          .slips-per-a4-12 .a4-sheet-grid {
            display: grid !important;
            grid-template-columns: repeat(3, 63mm) !important;
            grid-template-rows: repeat(4, 65mm) !important;
            gap: 3mm 3.5mm !important;
            width: 196mm !important;
            height: 270mm !important;
            max-height: 270mm !important;
            box-sizing: border-box !important;
            overflow: hidden !important;
            margin: 0 auto !important;
            padding: 0 !important;
          }
          .slips-per-a4-12 .slips-bulk-print-item {
            width: 63mm !important;
            height: 65mm !important;
            max-height: 65mm !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            overflow: hidden !important;
            background: transparent !important;
          }
          .slips-per-a4-12 .slips-bulk-print-item .voter-slip-printable-card {
            zoom: 0.41 !important;
            width: 520px !important;
            max-width: 520px !important;
          }

          /* Dedicated Compact Styles for 12-in-1 Slips to Prevent Overflow and Cut-off */
          .slips-per-a4-12 .voter-slip-inner-card {
            padding: 7px 10px 9px 10px !important;
            gap: 5px !important;
            border-width: 1.5px !important;
            border-radius: 6px !important;
            box-shadow: none !important;
            width: 100% !important;
            box-sizing: border-box !important;
          }
          .slips-per-a4-12 .voter-slip-header-row {
            gap: 6px !important;
          }
          .slips-per-a4-12 .voter-slip-symbol-box,
          .slips-per-a4-12 .voter-slip-photo-box {
            width: 78px !important;
            min-width: 78px !important;
            max-width: 78px !important;
            height: 96px !important;
            min-height: 96px !important;
            max-height: 96px !important;
            border-radius: 6px !important;
            border-width: 1.5px !important;
          }
          .slips-per-a4-12 .voter-slip-serial-badge {
            height: 19px !important;
            font-size: 10px !important;
          }
          .slips-per-a4-12 .voter-slip-symbol-caption {
            min-height: 18px !important;
            font-size: 8.5px !important;
            padding: 1px 2px !important;
          }
          .slips-per-a4-12 .voter-slip-party-headline {
            font-size: 11.5px !important;
            line-height: 1.2 !important;
          }
          .slips-per-a4-12 .voter-slip-appeal-headline {
            font-size: 9.5px !important;
          }
          .slips-per-a4-12 .voter-slip-candidate-name {
            font-size: 17px !important;
            line-height: 1.15 !important;
          }
          .slips-per-a4-12 .voter-slip-candidate-name-en {
            font-size: 11px !important;
          }
          .slips-per-a4-12 .voter-slip-subtitle {
            font-size: 9.5px !important;
          }
          .slips-per-a4-12 .voter-slip-header-banner-card {
            min-height: 80px !important;
            max-height: 105px !important;
          }
          .slips-per-a4-12 .voter-slip-header-banner-card img {
            max-height: 105px !important;
          }
          .slips-per-a4-12 .voter-slip-ribbon {
            min-height: 38px !important;
            padding: 4px 8px !important;
            gap: 6px !important;
            border-radius: 6px !important;
          }
          .slips-per-a4-12 .voter-slip-ribbon-evm-badge {
            width: 26px !important;
            height: 26px !important;
            font-size: 15px !important;
            border-radius: 4px !important;
          }
          .slips-per-a4-12 .voter-slip-ribbon-content div:first-child {
            font-size: 10px !important;
          }
          .slips-per-a4-12 .voter-slip-ribbon-content div:last-child {
            font-size: 11px !important;
          }
          .slips-per-a4-12 .voter-slip-ribbon-pill {
            min-height: 22px !important;
            padding: 2px 6px !important;
            font-size: 9.5px !important;
          }
          .slips-per-a4-12 .voter-slip-metric-grid {
            gap: 6px !important;
          }
          .slips-per-a4-12 .voter-slip-metric-card {
            padding: 3px 6px !important;
            border-radius: 6px !important;
            border-width: 1px !important;
          }
          .slips-per-a4-12 .voter-slip-metric-label {
            font-size: 9.5px !important;
          }
          .slips-per-a4-12 .voter-slip-metric-num {
            font-size: 20px !important;
            line-height: 1.1 !important;
          }
          .slips-per-a4-12 .voter-slip-voter-table {
            padding: 4px 6px !important;
            gap: 2px !important;
            border-radius: 6px !important;
          }
          .slips-per-a4-12 .voter-slip-voter-row {
            padding: 2px 2px !important;
            font-size: 11px !important;
            line-height: 1.2 !important;
          }
          .slips-per-a4-12 .voter-slip-voter-label {
            width: 82px !important;
            min-width: 82px !important;
            font-size: 10.5px !important;
          }
          .slips-per-a4-12 .voter-slip-voter-value {
            font-size: 11px !important;
          }
          .slips-per-a4-12 .voter-slip-polling-box {
            padding: 3px 6px !important;
            border-radius: 5px !important;
            font-size: 10px !important;
            line-height: 1.2 !important;
          }
          .slips-per-a4-12 .voter-slip-polling-box div:first-child {
            font-size: 9.5px !important;
          }
          .slips-per-a4-12 .voter-slip-polling-box div:last-child {
            font-size: 10px !important;
          }
          .slips-per-a4-12 .voter-slip-footer-appeal {
            margin-top: 1px !important;
            gap: 2px !important;
          }
          .slips-per-a4-12 .voter-slip-footer-appeal div:first-child {
            font-size: 10.5px !important;
          }
          .slips-per-a4-12 .voter-slip-footer-appeal div:last-child {
            font-size: 9px !important;
          }

          /* 16 in 1 A4: 4 columns × 4 rows (16 per sheet, ultra-compact) */
          .slips-per-a4-16 .a4-sheet-grid {
            display: grid !important;
            grid-template-columns: repeat(4, 47mm) !important;
            grid-template-rows: repeat(4, 65mm) !important;
            gap: 2.5mm 2.5mm !important;
            width: 196mm !important;
            height: 270mm !important;
            max-height: 270mm !important;
            box-sizing: border-box !important;
            overflow: hidden !important;
            margin: 0 auto !important;
            padding: 0 !important;
          }
          .slips-per-a4-16 .slips-bulk-print-item {
            width: 47mm !important;
            height: 65mm !important;
            max-height: 65mm !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            overflow: hidden !important;
            background: transparent !important;
          }
          .slips-per-a4-16 .slips-bulk-print-item .voter-slip-printable-card {
            zoom: 0.33 !important;
            width: 500px !important;
            max-width: 500px !important;
          }
          .slips-per-a4-16.slips-format-compact .slips-bulk-print-item .voter-slip-printable-card {
            zoom: 0.35 !important;
          }
          .slips-per-a4-16 .voter-slip-inner-card {
            padding: 5px 8px !important;
            gap: 3px !important;
            border-width: 1.5px !important;
            border-radius: 6px !important;
          }
          .slips-per-a4-16 .voter-slip-metric-num {
            font-size: 18px !important;
          }
          .slips-per-a4-16 .voter-slip-metric-label {
            font-size: 8.5px !important;
          }
          .slips-per-a4-16 .voter-slip-voter-row {
            padding: 1px 2px !important;
            font-size: 10px !important;
            line-height: 1.15 !important;
          }
          .slips-per-a4-16 .voter-slip-voter-label {
            width: 72px !important;
            min-width: 72px !important;
            font-size: 9px !important;
          }
          .slips-per-a4-16 .voter-slip-voter-value {
            font-size: 9.5px !important;
          }
          .slips-per-a4-16 .voter-slip-symbol-box,
          .slips-per-a4-16 .voter-slip-photo-box {
            width: 65px !important;
            min-width: 65px !important;
            max-width: 65px !important;
            height: 80px !important;
            min-height: 80px !important;
            max-height: 80px !important;
            border-radius: 5px !important;
            border-width: 1px !important;
          }
          .slips-per-a4-16 .voter-slip-ribbon {
            min-height: 32px !important;
            padding: 2px 6px !important;
            gap: 4px !important;
            border-radius: 5px !important;
          }
          .slips-per-a4-16 .voter-slip-ribbon-evm-badge {
            width: 22px !important;
            height: 22px !important;
            font-size: 13px !important;
          }
          .slips-per-a4-16 .voter-slip-candidate-name {
            font-size: 14px !important;
            line-height: 1.15 !important;
          }
          .slips-per-a4-16 .voter-slip-candidate-name-en {
            font-size: 9px !important;
          }

          /* Compact Format Specific Print Rules (SS2-style tight 2-column grid, 2-3mm scissor gap, zero wasted space) */
          .slips-format-compact .voter-slip-inner-card {
            padding: 7px 10px !important;
            gap: 5px !important;
            border-width: 1.5px !important;
            border-radius: 6px !important;
            box-shadow: none !important;
          }
          .slips-format-compact .voter-slip-metric-card {
            padding: 3px 8px !important;
            border-radius: 6px !important;
          }
          .slips-format-compact .voter-slip-metric-label {
            font-size: 9.5px !important;
          }
          .slips-format-compact .voter-slip-metric-num {
            font-size: 18px !important;
            line-height: 1.1 !important;
          }
          .slips-format-compact .voter-slip-voter-table {
            padding: 3px 6px !important;
            gap: 1px !important;
          }
          .slips-format-compact .voter-slip-voter-row {
            padding: 2px 4px !important;
            line-height: 1.18 !important;
          }
          .slips-format-compact.slips-per-a4-4 .slips-bulk-print-item .voter-slip-printable-card {
            zoom: 0.65 !important;
            width: 540px !important;
            max-width: 540px !important;
          }
          .slips-format-compact.slips-per-a4-8 .a4-sheet-grid {
            grid-template-columns: repeat(2, 96mm) !important;
            grid-template-rows: repeat(4, 66mm) !important;
            gap: 2mm 3mm !important;
          }
          .slips-format-compact.slips-per-a4-8 .slips-bulk-print-item {
            width: 96mm !important;
            height: 66mm !important;
            max-height: 66mm !important;
          }
          .slips-format-compact.slips-per-a4-8 .slips-bulk-print-item .voter-slip-printable-card {
            zoom: 0.90 !important;
            width: 395px !important;
            max-width: 395px !important;
          }
          /* 12-per-A4 Compact: 2 columns × 6 rows (big readable text, ~2mm scissor gap, zero wasted space) */
          .slips-format-compact.slips-per-a4-12 .a4-sheet-grid {
            grid-template-columns: repeat(2, 96mm) !important;
            grid-template-rows: repeat(6, 44mm) !important;
            gap: 1.5mm 3mm !important;
            width: 195mm !important;
            height: 271.5mm !important;
            max-height: 271.5mm !important;
          }
          .slips-format-compact.slips-per-a4-12 .slips-bulk-print-item {
            width: 96mm !important;
            height: 44mm !important;
            max-height: 44mm !important;
            overflow: visible !important;
          }
          .slips-format-compact.slips-per-a4-12 .slips-bulk-print-item .voter-slip-printable-card {
            zoom: 0.80 !important;
            width: 440px !important;
            max-width: 440px !important;
          }
          /* 16-per-A4 Compact: 2 columns × 8 rows (ultra-tight 2-col printed sheet) */
          .slips-format-compact.slips-per-a4-16 .a4-sheet-grid {
            grid-template-columns: repeat(2, 96mm) !important;
            grid-template-rows: repeat(8, 32.5mm) !important;
            gap: 1.5mm 3mm !important;
            width: 195mm !important;
            height: 270.5mm !important;
            max-height: 270.5mm !important;
          }
          .slips-format-compact.slips-per-a4-16 .slips-bulk-print-item {
            width: 96mm !important;
            height: 32.5mm !important;
            max-height: 32.5mm !important;
            overflow: visible !important;
          }
          .slips-format-compact.slips-per-a4-16 .slips-bulk-print-item .voter-slip-printable-card {
            zoom: 0.65 !important;
            width: 540px !important;
            max-width: 540px !important;
          }

          /* ================= SINGLE SLIP PRINT MODE ================= */
          .slips-single-print-mode .slips-studio-layout > section:first-child {
            display: none !important;
          }

          .slips-single-print-mode .slips-studio-layout {
            display: block !important;
            margin: 0 !important;
            padding: 0 !important;
          }

          .slips-single-print-mode .slips-studio-layout > section:last-child {
            display: block !important;
            width: 100% !important;
            border: none !important;
            box-shadow: none !important;
            padding: 0 !important;
            margin: 0 !important;
          }

          .slips-single-print-mode .slips-studio-layout > section:last-child > div:first-child {
            display: none !important;
          }

          .slips-single-print-mode .voter-slip-printable-card,
          .slips-single-print-mode .family-voter-slip-printable-card {
            position: relative !important;
            left: auto !important;
            top: auto !important;
            margin: 20px auto 0 !important;
            max-width: 600px !important;
            width: 100% !important;
            box-shadow: none !important;
          }
        }
      `}</style>

      {/* Page Header */}
      <div className="page-intro no-print" style={{ marginBottom: '16px' }}>
        <div>
          <div className="eyebrow-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span className="eyebrow-mark" />
            <Ticket size={14} /> VOTER SLIP STUDIO
          </div>
          <h1 style={{ margin: '4px 0' }}>डिजिटल मतदाता पर्ची</h1>
          <p style={{ margin: 0 }}>
            आधिकारिक चुनाव आयोग प्रारूप व प्रत्याशी ब्रांडिंग के साथ व्यक्तिगत और थोक पर्ची जेनरेटर।
          </p>
        </div>

        <div className="feature-actions no-print" style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {/* Customize Button */}
          <button
            className="button-primary"
            type="button"
            onClick={openCustomizing}
            style={{ background: '#047857', borderColor: '#059669', color: '#fff' }}
            title="प्रत्याशी, पार्टी, चुनाव चिन्ह, दोनों फ़ोटो व अपील कस्टमाइज़ करें"
          >
            <Sliders size={15} />
            <span>पर्ची कस्टमाइज़ करें</span>
          </button>

          <button
            className="button-secondary"
            type="button"
            onClick={() => {
              void loadSlipConfig();
              void loadWhatsappQuota();
              void loadVoters();
            }}
            disabled={loading}
          >
            {loading ? <LoaderCircle size={15} className="spin" /> : <RefreshCw size={15} />}
            रिफ्रेश
          </button>

          <div
            style={{
              display: 'inline-flex',
              background: '#f1f5f9',
              padding: '3px',
              borderRadius: '10px',
              border: '1px solid #cbd5e1',
              gap: '4px',
            }}
          >
            <button
              type="button"
              onClick={() => {
                setSlipMode('single');
                setBulkMode(false);
              }}
              style={{
                padding: '6px 14px',
                borderRadius: '8px',
                border: 'none',
                background: slipMode === 'single' && !bulkMode ? '#ffffff' : 'transparent',
                color: slipMode === 'single' && !bulkMode ? '#15803d' : '#64748b',
                fontWeight: slipMode === 'single' && !bulkMode ? 700 : 600,
                fontSize: '13px',
                boxShadow: slipMode === 'single' && !bulkMode ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                cursor: 'pointer',
              }}
            >
              <Ticket size={14} />
              <span>एकल पर्ची</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setSlipMode('family');
                setBulkMode(false);
              }}
              style={{
                padding: '6px 14px',
                borderRadius: '8px',
                border: 'none',
                background: slipMode === 'family' ? '#ffffff' : 'transparent',
                color: slipMode === 'family' ? '#047857' : '#64748b',
                fontWeight: slipMode === 'family' ? 700 : 600,
                fontSize: '13px',
                boxShadow: slipMode === 'family' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                cursor: 'pointer',
              }}
            >
              <UsersRound size={14} />
              <span>परिवार पर्ची</span>
              <span style={{ fontSize: '11px', background: '#dcfce7', color: '#15803d', padding: '1px 6px', borderRadius: '10px', fontWeight: 800 }}>
                {totalHouseholdsCount || householdsList.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                setSlipMode('bulk');
                setBulkMode(true);
              }}
              style={{
                padding: '6px 14px',
                borderRadius: '8px',
                border: 'none',
                background: bulkMode || slipMode === 'bulk' ? '#ffffff' : 'transparent',
                color: bulkMode || slipMode === 'bulk' ? '#15803d' : '#64748b',
                fontWeight: bulkMode || slipMode === 'bulk' ? 700 : 600,
                fontSize: '13px',
                boxShadow: bulkMode || slipMode === 'bulk' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                cursor: 'pointer',
              }}
            >
              <Layers size={14} />
              <span>A4 बल्क शीट</span>
            </button>
          </div>

          {isAdmin && (
            <button
              className="button-primary"
              type="button"
              disabled={isDownloadingBulkZip || (totalVotersCount === 0 && voters.length === 0)}
              onClick={handleDownloadBulkZip}
              style={{
                background: 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)',
                borderColor: '#16a34a',
                color: '#ffffff',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                boxShadow: '0 2px 6px rgba(22, 163, 74, 0.25)',
              }}
              title="सभी फ़िल्टर किए गए मतदाताओं की पर्चियां एक साथ ZIP फ़ाइल में डाउनलोड करें"
            >
              {isDownloadingBulkZip ? (
                <>
                  <LoaderCircle size={15} className="spin" />
                  <span>ZIP बन रहा ({bulkZipProgress.current}/{bulkZipProgress.total})...</span>
                </>
              ) : (
                <>
                  <Download size={15} />
                  <span>बल्क ZIP डाउनलोड ({totalVotersCount || voters.length})</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {error && <div className="inline-notice error-notice no-print" role="alert">{error}</div>}

      {/* Slip Branding Info Bar */}
      <div
        className="slips-branding-info-bar no-print"
        style={{
          background: '#ffffff',
          borderRadius: '14px',
          border: '1px solid #e2e8f0',
          padding: '12px 18px',
          marginBottom: '20px',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700, color: '#166534', fontSize: '12.5px', background: '#f0fdf4', padding: '5px 12px', borderRadius: '8px', border: '1px solid #bbf7d0' }}>
            <Sparkles size={14} color="#16a34a" />
            <span>संगठन: {orgName}</span>
          </div>
          <div style={{ fontSize: '12.5px', color: '#475569', background: '#f8fafc', padding: '5px 12px', borderRadius: '8px', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span>पार्टी:</span> <strong style={{ color: '#0f172a' }}>{slipConfig.partyName || 'प्रत्याशी'}</strong>
          </div>
          <div style={{ fontSize: '12.5px', color: '#475569', background: '#f8fafc', padding: '5px 12px', borderRadius: '8px', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span>प्रत्याशी:</span> <strong style={{ color: '#0f172a' }}>{slipConfig.candidateName || 'प्रत्याशी'}</strong>
          </div>
          <div style={{ fontSize: '12.5px', color: '#9a3412', background: '#fff7ed', padding: '5px 12px', borderRadius: '8px', border: '1px solid #fed7aa', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span>चुनाव चिन्ह:</span> <strong style={{ color: '#c2410c' }}>{slipConfig.partySymbolName || 'कमल का फूल'}</strong>
          </div>
          <div style={{ fontSize: '12.5px', color: '#166534', background: '#f0fdf4', padding: '5px 12px', borderRadius: '8px', border: '1px solid #bbf7d0', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span>EVM क्रम:</span> <strong style={{ color: '#16a34a' }}>#{slipConfig.evmNumber || '1'}</strong>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            onClick={openCustomizing}
            style={{
              fontSize: '12.5px',
              fontWeight: 700,
              color: '#15803d',
              background: '#ecfdf5',
              border: '1px solid #a7f3d0',
              padding: '6px 14px',
              borderRadius: '8px',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.15s ease',
            }}
          >
            <Sliders size={13} />
            <span>बदलाव करें</span>
          </button>

          {/* WhatsApp Quota Pill */}
          {whatsappQuota && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '5px 12px',
                borderRadius: '20px',
                background: !whatsappQuota.whatsappEnabled ? '#fee2e2' : whatsappQuota.whatsappCredits <= 0 ? '#fef3c7' : '#f0fdf4',
                border: !whatsappQuota.whatsappEnabled ? '1px solid #fecaca' : whatsappQuota.whatsappCredits <= 0 ? '1px solid #fde68a' : '1px solid #bbf7d0',
                fontSize: '12px',
                fontWeight: 700,
                color: !whatsappQuota.whatsappEnabled ? '#991b1b' : whatsappQuota.whatsappCredits <= 0 ? '#92400e' : '#166534',
              }}
            >
              <span>कोटा: {whatsappQuota.whatsappCredits} क्रेडिट</span>
            </div>
          )}
        </div>
      </div>

      {/* Filter Toolbar */}
      <div
        className="records-toolbar no-print"
        style={{
          background: '#ffffff',
          borderRadius: '14px',
          border: '1px solid #e2e8f0',
          padding: '14px 18px',
          marginBottom: '20px',
          display: 'flex',
          flexWrap: 'wrap',
          gap: '12px',
          alignItems: 'center',
          justifyContent: 'space-between',
          boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
        }}
      >
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', flex: 1, minWidth: '280px' }}>
          <div className="search-field" style={{ flex: '1 1 240px' }}>
            <Search size={15} />
            <input
              placeholder="मतदाता खोजें (नाम, EPIC, क्रमांक, मकान)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <select
            value={wardFilter}
            onChange={(e) => setWardFilter(e.target.value)}
            style={{ padding: '8px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', fontWeight: 600, color: '#334155', background: '#fff' }}
          >
            <option value="">सभी वार्ड</option>
            {availableWards.map((w) => (
              <option key={w} value={w}>
                वार्ड {w}
              </option>
            ))}
          </select>

          <select
            value={partFilter}
            onChange={(e) => setPartFilter(e.target.value)}
            style={{ padding: '8px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', fontWeight: 600, color: '#334155', background: '#fff' }}
          >
            <option value="">सभी भाग (Part)</option>
            {availableParts.map((p) => (
              <option key={p} value={p}>
                भाग संख्या {p}
              </option>
            ))}
          </select>
        </div>

        <div style={{ fontSize: '13px', color: '#64748b', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
          <span>कुल मतदाता:</span> <strong style={{ color: '#0f172a', fontSize: '14px' }}>{(totalVotersCount || voters.length).toLocaleString('hi-IN')}</strong>
        </div>
      </div>

      {/* Main Studio Content */}
      {bulkMode || slipMode === 'bulk' ? (
        /* ================= BULK PRINT VIEW ================= */
        <section
          className="slips-bulk-print-container"
          style={{
            background: '#ffffff',
            borderRadius: '14px',
            border: '1px solid #e2e8f0',
            padding: '24px',
          }}
        >
          <div
            className="bulk-header-bar no-print"
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
              marginBottom: '24px',
              paddingBottom: '16px',
              borderBottom: '1px solid #e2e8f0',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '12px',
              }}
            >
              <div>
                <h2 style={{ fontSize: '19px', fontWeight: 800, margin: 0, color: '#0f172a' }}>
                  बल्क पर्ची A4 प्रिंट शीट ({sortedVoters.length} मतदाता)
                </h2>
                <div style={{ fontSize: '12.5px', color: '#64748b', marginTop: '2px' }}>
                  A4 शीट पर प्रिंट करने के लिए अपनी पसंद अनुसार 4, 8 या 12 पर्ची प्रति पेज का लेआउट चुनें।
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <SortButton label="क्रम संख्या" field="serialNo" type="numeric" currentSort={sort} onSort={handleSort} />
                  <SortButton label="नाम" field="name" type="alpha" currentSort={sort} onSort={handleSort} />
                </div>

                <button
                  className="button-primary"
                  type="button"
                  onClick={handlePrint}
                  style={{
                    background: 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)',
                    borderColor: '#16a34a',
                    padding: '8px 18px',
                    fontSize: '13.5px',
                    fontWeight: 700,
                    boxShadow: '0 2px 6px rgba(22, 163, 74, 0.25)',
                  }}
                >
                  <Printer size={16} /> A4 प्रिंट करें ({perA4} पर्ची/पेज)
                </button>

                {isAdmin && (
                  <button
                    className="button-primary"
                    type="button"
                    disabled={isDownloadingBulkZip || (totalVotersCount === 0 && voters.length === 0)}
                    onClick={handleDownloadBulkZip}
                    style={{ background: 'linear-gradient(135deg, #059669 0%, #047857 100%)', borderColor: '#059669', padding: '8px 16px', fontSize: '13px', fontWeight: 600, color: '#ffffff', boxShadow: '0 2px 6px rgba(5, 150, 105, 0.25)' }}
                  >
                    {isDownloadingBulkZip ? (
                      <><LoaderCircle size={15} className="spin" /> ZIP बन रहा... ({bulkZipProgress.current}/{bulkZipProgress.total})</>
                    ) : (
                      <><Download size={15} /> सभी JPG डाउनलोड (.zip)</>
                    )}
                  </button>
                )}
              </div>
            </div>

            {/* A4 Format Selector Strip */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '12px',
                background: '#f8fafc',
                padding: '10px 14px',
                borderRadius: '10px',
                border: '1.5px solid #e2e8f0',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
                {/* 1. Format Toggle: Full vs Compact */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '12.5px', fontWeight: 800, color: '#334155' }}>
                    पर्ची प्रारूप:
                  </span>
                  <div
                    style={{
                      display: 'inline-flex',
                      background: '#e2e8f0',
                      padding: '3px',
                      borderRadius: '8px',
                      gap: '4px',
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedSlipFormat('full');
                        setCachedSlipImageDataUrl(null);
                      }}
                      style={{
                        padding: '6px 12px',
                        borderRadius: '6px',
                        border: 'none',
                        background: selectedSlipFormat === 'full' ? '#ffffff' : 'transparent',
                        color: selectedSlipFormat === 'full' ? '#0f172a' : '#64748b',
                        fontWeight: selectedSlipFormat === 'full' ? 800 : 600,
                        fontSize: '12.5px',
                        cursor: 'pointer',
                        boxShadow: selectedSlipFormat === 'full' ? '0 1px 3px rgba(0,0,0,0.12)' : 'none',
                      }}
                    >
                      🏷️ पूर्ण प्रचार पर्ची
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedSlipFormat('compact');
                        setCachedSlipImageDataUrl(null);
                      }}
                      style={{
                        padding: '6px 12px',
                        borderRadius: '6px',
                        border: 'none',
                        background: selectedSlipFormat === 'compact' ? '#ffffff' : 'transparent',
                        color: selectedSlipFormat === 'compact' ? '#166534' : '#64748b',
                        fontWeight: selectedSlipFormat === 'compact' ? 800 : 600,
                        fontSize: '12.5px',
                        cursor: 'pointer',
                        boxShadow: selectedSlipFormat === 'compact' ? '0 1px 3px rgba(0,0,0,0.12)' : 'none',
                      }}
                    >
                      📄 सादी / केवल विवरण पर्ची
                    </button>
                  </div>
                </div>

                {/* 2. Number of Slips per A4 */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '12.5px', fontWeight: 800, color: '#334155' }}>
                    A4 शीट पर संख्या:
                  </span>

                  <div
                    style={{
                      display: 'inline-flex',
                      background: '#e2e8f0',
                      padding: '3px',
                      borderRadius: '8px',
                      gap: '4px',
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => setPerA4(4)}
                      style={{
                        padding: '6px 12px',
                        borderRadius: '6px',
                        border: 'none',
                        background: perA4 === 4 ? '#ffffff' : 'transparent',
                        color: perA4 === 4 ? '#0f172a' : '#64748b',
                        fontWeight: perA4 === 4 ? 800 : 600,
                        fontSize: '12.5px',
                        cursor: 'pointer',
                        boxShadow: perA4 === 4 ? '0 1px 3px rgba(0,0,0,0.12)' : 'none',
                        transition: 'all 0.15s ease',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                    >
                      <span>4 / A4</span>
                      <span style={{ fontSize: '10px', color: perA4 === 4 ? '#2563eb' : '#94a3b8', fontWeight: 700 }}>(2×2)</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setPerA4(8)}
                      style={{
                        padding: '6px 12px',
                        borderRadius: '6px',
                        border: 'none',
                        background: perA4 === 8 ? '#ffffff' : 'transparent',
                        color: perA4 === 8 ? '#0f172a' : '#64748b',
                        fontWeight: perA4 === 8 ? 800 : 600,
                        fontSize: '12.5px',
                        cursor: 'pointer',
                        boxShadow: perA4 === 8 ? '0 1px 3px rgba(0,0,0,0.12)' : 'none',
                        transition: 'all 0.15s ease',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                    >
                      <span>8 / A4</span>
                      <span style={{ fontSize: '10px', color: perA4 === 8 ? '#2563eb' : '#94a3b8', fontWeight: 700 }}>(2×4)</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setPerA4(12)}
                      style={{
                        padding: '6px 12px',
                        borderRadius: '6px',
                        border: 'none',
                        background: perA4 === 12 ? '#ffffff' : 'transparent',
                        color: perA4 === 12 ? '#ea580c' : '#64748b',
                        fontWeight: perA4 === 12 ? 900 : 600,
                        fontSize: '12.5px',
                        cursor: 'pointer',
                        boxShadow: perA4 === 12 ? '0 1px 3px rgba(0,0,0,0.12)' : 'none',
                        transition: 'all 0.15s ease',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                    >
                      <span>12 / A4</span>
                      <span style={{ fontSize: '10px', color: perA4 === 12 ? '#ea580c' : '#94a3b8', fontWeight: 700 }}>(3×4)</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setPerA4(16)}
                      style={{
                        padding: '6px 12px',
                        borderRadius: '6px',
                        border: 'none',
                        background: perA4 === 16 ? '#ffffff' : 'transparent',
                        color: perA4 === 16 ? '#16a34a' : '#64748b',
                        fontWeight: perA4 === 16 ? 900 : 600,
                        fontSize: '12.5px',
                        cursor: 'pointer',
                        boxShadow: perA4 === 16 ? '0 1px 3px rgba(0,0,0,0.12)' : 'none',
                        transition: 'all 0.15s ease',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                    >
                      <span>16 / A4</span>
                      <span style={{ fontSize: '10px', color: perA4 === 16 ? '#16a34a' : '#94a3b8', fontWeight: 700 }}>(4×4)</span>
                    </button>
                  </div>
                </div>
              </div>

              <div
                style={{
                  fontSize: '12px',
                  fontWeight: 700,
                  color: '#475569',
                  background: '#ffffff',
                  padding: '5px 12px',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                }}
              >
                कुल अनुमानित कागज:{' '}
                <strong style={{ color: '#0f172a' }}>{Math.ceil(sortedVoters.length / perA4)} A4 शीट</strong>{' '}
                ({sortedVoters.length} पर्चियां)
              </div>
            </div>

            {/* 3. Bulk Batch Size & Batch Pagination Strip (Ground Worker & Cyber Cafe Friendly) */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '12px',
                background: '#ffffff',
                padding: '8px 14px',
                borderRadius: '10px',
                border: '1.5px solid #cbd5e1',
                boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '12px', fontWeight: 800, color: '#334155' }}>
                  लोडिंग बैच साइज़:
                </span>
                <div style={{ display: 'inline-flex', background: '#f1f5f9', padding: '2px', borderRadius: '6px', gap: '3px' }}>
                  {[40, 80, 160, 320].map((size) => (
                    <button
                      key={size}
                      type="button"
                      onClick={() => {
                        setVoterPageSize(size);
                        setVoterPage(1);
                        void loadVoters(1, size);
                      }}
                      style={{
                        padding: '4px 10px',
                        borderRadius: '5px',
                        border: 'none',
                        background: voterPageSize === size ? '#16a34a' : 'transparent',
                        color: voterPageSize === size ? '#ffffff' : '#475569',
                        fontWeight: voterPageSize === size ? 800 : 600,
                        fontSize: '11.5px',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      {size}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => {
                      const allCount = Math.min(Math.max(totalVotersCount, 100), 1000);
                      setVoterPageSize(allCount);
                      setVoterPage(1);
                      void loadVoters(1, allCount);
                    }}
                    style={{
                      padding: '4px 10px',
                      borderRadius: '5px',
                      border: 'none',
                      background: voterPageSize >= totalVotersCount && totalVotersCount > 0 ? '#16a34a' : 'transparent',
                      color: voterPageSize >= totalVotersCount && totalVotersCount > 0 ? '#ffffff' : '#475569',
                      fontWeight: voterPageSize >= totalVotersCount && totalVotersCount > 0 ? 800 : 600,
                      fontSize: '11.5px',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    सभी ({totalVotersCount || 'All'})
                  </button>
                </div>
              </div>

              {/* Batch Pagination Navigator */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button
                  type="button"
                  className="button-secondary"
                  disabled={voterPage <= 1 || loading}
                  onClick={() => loadVoters(Math.max(1, voterPage - 1))}
                  style={{ padding: '4px 10px', fontSize: '11.5px', borderRadius: '6px', fontWeight: 600 }}
                >
                  ◀ पिछला बैच
                </button>
                <span style={{ fontWeight: 700, color: '#334155', fontSize: '12px' }}>
                  बैच <strong style={{ color: '#16a34a' }}>{voterPage}</strong> / {voterTotalPages}
                  <span style={{ color: '#64748b', fontSize: '11px', marginLeft: '6px' }}>
                    ({totalVotersCount > 0 ? `${((voterPage - 1) * voterPageSize) + 1} - ${Math.min(voterPage * voterPageSize, totalVotersCount)}` : '0'} / {totalVotersCount})
                  </span>
                </span>
                <button
                  type="button"
                  className="button-secondary"
                  disabled={voterPage >= voterTotalPages || loading}
                  onClick={() => loadVoters(Math.min(voterTotalPages, voterPage + 1))}
                  style={{ padding: '4px 10px', fontSize: '11.5px', borderRadius: '6px', fontWeight: 600 }}
                >
                  अगला बैच ▶
                </button>
              </div>
            </div>
          </div>

          {/* A4 Sheet Chunking: Exactly perA4 slips per single page sheet */}
          <div className="slips-bulk-sheets-wrapper">
            {Array.from({ length: Math.ceil(sortedVoters.length / perA4) }, (_, pageIndex) => {
              const startIdx = pageIndex * perA4;
              const pageVoters = sortedVoters.slice(startIdx, startIdx + perA4);
              return (
                <div key={pageIndex} className="a4-sheet-page">
                  <div className="a4-sheet-header no-print">
                    <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#16a34a' }}></span>
                      <strong>A4 शीट #{pageIndex + 1}</strong>
                      <span style={{ color: '#64748b', fontWeight: 500 }}>
                        (पर्चियां {startIdx + 1} से {startIdx + pageVoters.length})
                      </span>
                    </span>
                    <span style={{ color: '#475569', fontSize: '11.5px', background: '#e2e8f0', padding: '2px 8px', borderRadius: '4px' }}>
                      {pageVoters.length} / {perA4} पर्ची इस पेज पर प्रिंट होगी
                    </span>
                  </div>

                  <div className="a4-sheet-grid">
                    {pageVoters.map((voter) => (
                      <div
                        key={voter._id}
                        className="slips-bulk-print-item"
                        style={{
                          background: '#ffffff',
                          borderRadius: '8px',
                          overflow: 'hidden',
                          display: 'flex',
                          justifyContent: 'center',
                          alignItems: 'center',
                        }}
                      >
                        <VoterSlipTemplate
                          voter={voter}
                          config={{ ...slipConfig, slipFormat: selectedSlipFormat }}
                          format={selectedSlipFormat}
                          isInline={true}
                          perA4={perA4}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      ) : slipMode === 'family' ? (
        /* ================= FAMILY VOTER SLIP STUDIO VIEW ================= */
        <div className="slips-studio-layout">
          {/* LEFT: Households List */}
          <section
            style={{
              background: '#ffffff',
              borderRadius: '14px',
              border: '1px solid #e2e8f0',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              maxHeight: 'calc(100vh - 260px)',
            }}
          >
            <div
              style={{
                padding: '12px 16px',
                borderBottom: '1px solid #f1f5f9',
                background: '#f8fafc',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '13px', fontWeight: 800, color: '#065f46', letterSpacing: '0.02em', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <UsersRound size={15} color="#047857" />
                  परिवार सूची ({totalHouseholdsCount || householdsList.length} परिवार)
                </span>
                <span style={{ fontSize: '11px', color: '#64748b' }}>क्लिक कर पर्ची देखें</span>
              </div>
              <div className="search-field" style={{ width: '100%' }}>
                <Search size={14} />
                <input
                  placeholder="मकान नं., मुखिया या सदस्य खोजें..."
                  value={familySearch}
                  onChange={(e) => setFamilySearch(e.target.value)}
                  style={{ fontSize: '12.5px', padding: '6px 10px' }}
                />
              </div>
            </div>

            <div
              style={{ overflowY: 'auto', flex: 1, padding: '8px' }}
            >
              {isLoadingHouseholds ? (
                <div style={{ padding: '30px', textAlign: 'center', color: '#64748b' }}>
                  <LoaderCircle size={20} className="spin" style={{ margin: '0 auto 8px' }} />
                  परिवार लोड हो रहे हैं...
                </div>
              ) : householdsList.length === 0 ? (
                <div style={{ padding: '30px', textAlign: 'center', color: '#64748b', fontSize: '13px' }}>
                  कोई परिवार नहीं मिला
                </div>
              ) : (
                householdsList.map((household) => (
                  <HouseholdCardItem
                    key={household.key}
                    household={household}
                    isSelected={selectedHousehold?.key === household.key}
                    onSelect={handleSelectHousehold}
                  />
                ))
              )}
            </div>

            {/* Pagination Controls for Family Mode */}
            {totalHouseholdsCount > familyPageSize && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '8px 12px',
                  background: '#f8fafc',
                  borderTop: '1px solid #e2e8f0',
                  fontSize: '12px',
                  flexShrink: 0,
                }}
              >
                <button
                  type="button"
                  className="button-secondary"
                  disabled={familyPage <= 1 || isLoadingHouseholds}
                  onClick={() => loadHouseholds(Math.max(1, familyPage - 1))}
                  style={{ padding: '4px 10px', fontSize: '11.5px', borderRadius: '6px', fontWeight: 600 }}
                >
                  ◀ पिछला
                </button>
                <span style={{ fontWeight: 700, color: '#334155', fontSize: '12px' }}>
                  पेज <strong style={{ color: '#047857' }}>{familyPage}</strong> / {familyTotalPages}
                </span>
                <button
                  type="button"
                  className="button-secondary"
                  disabled={familyPage >= familyTotalPages || isLoadingHouseholds}
                  onClick={() => loadHouseholds(Math.min(familyTotalPages, familyPage + 1))}
                  style={{ padding: '4px 10px', fontSize: '11.5px', borderRadius: '6px', fontWeight: 600 }}
                >
                  अगला ▶
                </button>
              </div>
            )}
          </section>

          {/* RIGHT: Live Family Slip Preview & Actions */}
          <section
            className="slips-live-preview-section"
            style={{
              background: '#ffffff',
              borderRadius: '14px',
              border: '1px solid #e2e8f0',
              padding: '24px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
            }}
          >
            {/* Action Bar */}
            <div
              style={{
                width: '100%',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '12px',
                marginBottom: '20px',
                paddingBottom: '16px',
                borderBottom: '1px solid #f1f5f9',
              }}
            >
              <div>
                <h3 style={{ margin: 0, fontSize: '16px', color: '#0f172a' }}>
                  {selectedHousehold ? (
                    <>
                      मकान #{selectedHousehold.houseNo} ·{' '}
                      <span style={{ color: '#059669' }}>{selectedHousehold.members.length} मतदाता</span>
                      {selectedHousehold.wardNo && (
                        <span style={{ color: '#64748b', fontSize: '13px', marginLeft: '6px' }}>
                          (वार्ड {selectedHousehold.wardNo})
                        </span>
                      )}
                    </>
                  ) : (
                    'परिवार पर्ची पूर्वावलोकन (Family Slip Preview)'
                  )}
                </h3>
                <span style={{ fontSize: '12px', color: '#64748b' }}>
                  एक ही मकान के सभी सदस्यों की संयुक्त आधिकारिक पर्ची
                </span>
              </div>

              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <button
                  className="button-secondary"
                  type="button"
                  onClick={handlePrint}
                  disabled={!selectedHousehold || selectedHousehold.members.length === 0}
                >
                  <Printer size={15} /> प्रिंट
                </button>

                <button
                  className="button-secondary"
                  type="button"
                  onClick={handleDownloadImage}
                  disabled={!selectedHousehold || selectedHousehold.members.length === 0 || isDownloading}
                >
                  {isDownloading ? <LoaderCircle size={15} className="spin" /> : <Download size={15} />}
                  JPG डाउनलोड
                </button>

                <button
                  className="button-primary"
                  type="button"
                  style={{
                    background: '#25D366',
                    borderColor: '#22c55e',
                    color: '#fff',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                  onClick={() => {
                    if (!selectedHousehold) return;
                    const phoneWithNum = selectedHousehold.members.find((m) => m.phone)?.phone || '';
                    setWpPhone(phoneWithNum);
                    setWpMessage('');
                    setIsWpModalOpen(true);
                  }}
                  disabled={
                    !selectedHousehold ||
                    whatsappQuota?.whatsappEnabled === false ||
                    (whatsappQuota ? whatsappQuota.whatsappCredits <= 0 : false)
                  }
                  title="परिवार के मुखिया को सीधे WhatsApp भेजें"
                >
                  <WhatsAppLogo size={15} color="#ffffff" /> WhatsApp
                </button>
              </div>
            </div>

            {/* The Actual Family Voter Slip Card */}
            <div style={{ width: '100%', display: 'flex', justifyContent: 'center' }}>
              {selectedHousehold && selectedHousehold.members.length > 0 ? (
                <FamilyVoterSlipTemplate
                  familyMembers={selectedHousehold.members}
                  config={slipConfig}
                  metadata={{
                    houseNo: selectedHousehold.houseNo,
                    wardNo: selectedHousehold.wardNo,
                    partNo: selectedHousehold.partNo,
                  }}
                  isInline={true}
                  forwardedRef={printContainerRef}
                />
              ) : (
                <div style={{ padding: '60px 20px', textAlign: 'center', color: '#94a3b8' }}>
                  कृपया बाईं ओर से कोई परिवार चुनें
                </div>
              )}
            </div>
          </section>
        </div>
      ) : (
        /* ================= SINGLE VOTER SLIP STUDIO VIEW ================= */
        <div className="slips-studio-layout">
          {/* LEFT: Voter List */}
          <section
            style={{
              background: '#ffffff',
              borderRadius: '14px',
              border: '1px solid #e2e8f0',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              maxHeight: 'calc(100vh - 260px)',
            }}
          >
            <div
              style={{
                padding: '12px 16px',
                borderBottom: '1px solid #f1f5f9',
                background: '#f8fafc',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '12px', fontWeight: 700, color: '#475569', letterSpacing: '0.05em' }}>
                  मतदाता सूची ({totalVotersCount || voters.length})
                </span>
                <span style={{ fontSize: '11px', color: '#94a3b8' }}>क्लिक कर पर्ची देखें</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <SortButton label="क्रम संख्या" field="serialNo" type="numeric" currentSort={sort} onSort={handleSort} />
                <SortButton label="नाम" field="name" type="alpha" currentSort={sort} onSort={handleSort} />
              </div>
            </div>

            <div
              style={{ overflowY: 'auto', flex: 1, padding: '8px' }}
            >
              {loading && voters.length === 0 ? (
                <div style={{ padding: '30px', textAlign: 'center', color: '#64748b' }}>
                  <LoaderCircle size={20} className="spin" style={{ margin: '0 auto 8px' }} />
                  मतदाता लोड हो रहे हैं...
                </div>
              ) : visibleVotersList.length === 0 ? (
                <div style={{ padding: '30px', textAlign: 'center', color: '#64748b' }}>
                  कोई मतदाता नहीं मिला
                </div>
              ) : (
                visibleVotersList.map((voter) => (
                  <VoterCardItem
                    key={voter._id}
                    voter={voter}
                    isSelected={selectedVoter?._id === voter._id}
                    onSelect={handleSelectVoter}
                  />
                ))
              )}
            </div>

            {/* Pagination Controls for Single Voter Mode */}
            {totalVotersCount > voterPageSize && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '8px 12px',
                  background: '#f8fafc',
                  borderTop: '1px solid #e2e8f0',
                  fontSize: '12px',
                  flexShrink: 0,
                }}
              >
                <button
                  type="button"
                  className="button-secondary"
                  disabled={voterPage <= 1 || loading}
                  onClick={() => loadVoters(Math.max(1, voterPage - 1))}
                  style={{ padding: '4px 10px', fontSize: '11.5px', borderRadius: '6px', fontWeight: 600 }}
                >
                  ◀ पिछला
                </button>
                <span style={{ fontWeight: 700, color: '#334155', fontSize: '12px' }}>
                  पेज <strong style={{ color: '#2563eb' }}>{voterPage}</strong> / {voterTotalPages}
                </span>
                <button
                  type="button"
                  className="button-secondary"
                  disabled={voterPage >= voterTotalPages || loading}
                  onClick={() => loadVoters(Math.min(voterTotalPages, voterPage + 1))}
                  style={{ padding: '4px 10px', fontSize: '11.5px', borderRadius: '6px', fontWeight: 600 }}
                >
                  अगला ▶
                </button>
              </div>
            )}
          </section>

          {/* RIGHT: Live Voter Slip Preview & Actions */}
          <section
            className="slips-live-preview-section"
            style={{
              background: '#ffffff',
              borderRadius: '14px',
              border: '1px solid #e2e8f0',
              padding: '24px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
            }}
          >
            {/* Action Bar */}
            <div
              style={{
                width: '100%',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '12px',
                marginBottom: '20px',
                paddingBottom: '16px',
                borderBottom: '1px solid #f1f5f9',
              }}
            >
              <div>
                <h3 style={{ margin: 0, fontSize: '16px', color: '#0f172a' }}>
                  {selectedVoter ? (
                    <>
                      {selectedVoter.nameHi || selectedVoter.nameEn} ·{' '}
                      <span style={{ color: '#2563eb' }}>{selectedVoter.epic}</span>
                    </>
                  ) : (
                    'प्रारूप पूर्वावलोकन (Live Slip Preview)'
                  )}
                </h3>
                <span style={{ fontSize: '12px', color: '#64748b' }}>
                  निचले मतदाता विवरण डेटाबेस से स्वचालित व गतिशील (Dynamic) हैं
                </span>
              </div>

              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <button className="button-secondary" type="button" onClick={handlePrint} disabled={!selectedVoter}>
                  <Printer size={15} /> प्रिंट
                </button>

                <button
                  className="button-secondary"
                  type="button"
                  onClick={handleDownloadImage}
                  disabled={!selectedVoter || isDownloading}
                >
                  {isDownloading ? <LoaderCircle size={15} className="spin" /> : <Download size={15} />}
                  JPG डाउनलोड
                </button>

                <button
                  className="button-primary"
                  type="button"
                  style={{ background: '#25D366', borderColor: '#22c55e', color: '#fff', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                  onClick={() => {
                    if (!selectedVoter) return;
                    setWpPhone(selectedVoter.phone || (selectedVoter as any).mobileNo || '');
                    setWpMessage('');
                    setIsWpModalOpen(true);
                  }}
                  disabled={!selectedVoter || whatsappQuota?.whatsappEnabled === false || (whatsappQuota ? whatsappQuota.whatsappCredits <= 0 : false)}
                  title="WhatsApp Web या App पर सीधे संदेश खोलें (1 क्रेडिट कटेगा)"
                >
                  <WhatsAppLogo size={15} color="#ffffff" /> WhatsApp
                </button>
              </div>
            </div>

            {/* Slip Format Switcher Bar */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '10px',
                background: '#f8fafc',
                padding: '8px 12px',
                borderRadius: '8px',
                border: '1px solid #e2e8f0',
                marginBottom: '16px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '12px', fontWeight: 700, color: '#334155' }}>
                  पर्ची प्रारूप (Slip Format):
                </span>
                <div style={{ display: 'inline-flex', background: '#e2e8f0', padding: '2px', borderRadius: '6px', gap: '3px' }}>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedSlipFormat('full');
                      setCachedSlipImageDataUrl(null);
                    }}
                    style={{
                      padding: '4px 10px',
                      borderRadius: '5px',
                      border: 'none',
                      background: selectedSlipFormat === 'full' ? '#ffffff' : 'transparent',
                      color: selectedSlipFormat === 'full' ? '#0f172a' : '#64748b',
                      fontWeight: selectedSlipFormat === 'full' ? 800 : 600,
                      fontSize: '11.5px',
                      cursor: 'pointer',
                      boxShadow: selectedSlipFormat === 'full' ? '0 1px 2px rgba(0,0,0,0.1)' : 'none',
                    }}
                  >
                    🏷️ पूर्ण प्रचार पर्ची
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedSlipFormat('compact');
                      setCachedSlipImageDataUrl(null);
                    }}
                    style={{
                      padding: '4px 10px',
                      borderRadius: '5px',
                      border: 'none',
                      background: selectedSlipFormat === 'compact' ? '#ffffff' : 'transparent',
                      color: selectedSlipFormat === 'compact' ? '#166534' : '#64748b',
                      fontWeight: selectedSlipFormat === 'compact' ? 800 : 600,
                      fontSize: '11.5px',
                      cursor: 'pointer',
                      boxShadow: selectedSlipFormat === 'compact' ? '0 1px 2px rgba(0,0,0,0.1)' : 'none',
                    }}
                  >
                    📄 सादी / केवल विवरण पर्ची
                  </button>
                </div>
              </div>

              <span style={{ fontSize: '11px', color: '#64748b' }}>
                {selectedSlipFormat === 'compact'
                  ? '⚡ केवल वार्ड/भाग, क्रम व विवरण — डाउनलोड/प्रिंट हेतु कॉम्पैक्ट साइज़'
                  : '🏷️ सम्पूर्ण प्रचार हेडर, प्रत्याशी फ़ोटो व अपील सहित'}
              </span>
            </div>

            {/* The Actual Voter Slip Card */}
            <div style={{ width: '100%', display: 'flex', justifyContent: 'center' }}>
              <VoterSlipTemplate
                voter={selectedVoter || undefined}
                config={{ ...slipConfig, slipFormat: selectedSlipFormat }}
                format={selectedSlipFormat}
                isInline={true}
                forwardedRef={printContainerRef}
              />
            </div>
          </section>
        </div>
      )}

      {/* ================= ADMIN SLIP BRANDING CUSTOMIZATION MODAL ================= */}
      {isCustomizing && isAdmin && (
        <div
          className="modal-backdrop"
          role="presentation"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setIsCustomizing(false);
          }}
        >
          <section
            className="form-modal"
            role="dialog"
            style={{ maxWidth: '980px', width: '96%', maxHeight: '92vh', overflowY: 'auto' }}
          >
            {/* Modal Heading */}
            <div className="modal-heading" style={{ borderBottom: '1px solid #e2e8f0', paddingBottom: '14px' }}>
              <div>
                <span className="eyebrow-label" style={{ color: '#059669' }}>
                  ADMIN ACCESS ONLY · BRANDING STUDIO
                </span>
                <h2 style={{ fontSize: '20px', margin: '4px 0', color: '#0f172a' }}>
                  पर्ची ब्रांडिंग व प्रत्याशी सेटिंग्स
                </h2>
                <p style={{ margin: 0, fontSize: '13px', color: '#64748b' }}>
                  प्रत्याशी, पार्टी, चुनाव चिन्ह, दोनों फ़ोटो व अपील कस्टमाइज़ करें। यहाँ के बदलाव लाइव पर्ची पर तुरंत लागू होंगे।
                </p>
              </div>
              <button className="icon-button" type="button" onClick={() => setIsCustomizing(false)}>
                <X size={18} />
              </button>
            </div>

            {/* Client Organization Selector */}
            {clientsList.length > 0 && (
              <div
                style={{
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '10px',
                  padding: '10px 14px',
                  margin: '16px 0 12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  flexWrap: 'wrap',
                }}
              >
                <Building size={16} color="#059669" />
                <span style={{ fontSize: '13px', fontWeight: 700, color: '#334155' }}>क्लाइंट / संगठन चुनें:</span>
                <select
                  value={selectedTargetOrgId}
                  onChange={(e) => void handleTargetClientSelect(e.target.value)}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '6px',
                    border: '1.5px solid #cbd5e1',
                    fontSize: '13px',
                    fontWeight: 600,
                    background: '#fff',
                    flex: '1 1 200px',
                  }}
                >
                  {clientsList.map((c, idx) => (
                    <option key={`${c.id}-${idx}`} value={c.id}>
                      {c.name} ({c.id})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Quick Party Presets */}
            <div style={{ marginBottom: '16px' }}>
              <div style={{ fontSize: '12px', fontWeight: 700, color: '#475569', marginBottom: '8px' }}>
                त्वरित पार्टी प्रीसेट्स (Quick Presets):
              </div>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={() => applyPreset('bjp')}
                  style={{
                    padding: '5px 12px',
                    borderRadius: '20px',
                    fontSize: '12px',
                    fontWeight: 700,
                    background: '#fff7ed',
                    border: '1.5px solid #fb923c',
                    color: '#ea580c',
                    cursor: 'pointer',
                  }}
                >
                  भाजपा (BJP - कमल)
                </button>

                <button
                  type="button"
                  onClick={() => applyPreset('inc')}
                  style={{
                    padding: '5px 12px',
                    borderRadius: '20px',
                    fontSize: '12px',
                    fontWeight: 700,
                    background: '#eff6ff',
                    border: '1.5px solid #60a5fa',
                    color: '#1d4ed8',
                    cursor: 'pointer',
                  }}
                >
                  कांग्रेस (INC - हाथ)
                </button>

                <button
                  type="button"
                  onClick={() => applyPreset('ind_kite')}
                  style={{
                    padding: '5px 12px',
                    borderRadius: '20px',
                    fontSize: '12px',
                    fontWeight: 700,
                    background: '#fef3c7',
                    border: '1.5px solid #f59e0b',
                    color: '#b45309',
                    cursor: 'pointer',
                  }}
                >
                  निर्दलीय (पतंग)
                </button>

                <button
                  type="button"
                  onClick={() => applyPreset('ind_bat')}
                  style={{
                    padding: '5px 12px',
                    borderRadius: '20px',
                    fontSize: '12px',
                    fontWeight: 700,
                    background: '#f0fdf4',
                    border: '1.5px solid #4ade80',
                    color: '#15803d',
                    cursor: 'pointer',
                  }}
                >
                  निर्दलीय (बल्ला)
                </button>

                <button
                  type="button"
                  onClick={() => applyPreset('ind_key')}
                  style={{
                    padding: '5px 12px',
                    borderRadius: '20px',
                    fontSize: '12px',
                    fontWeight: 700,
                    background: '#faf5ff',
                    border: '1.5px solid #c084fc',
                    color: '#7e22ce',
                    cursor: 'pointer',
                  }}
                >
                  निर्दलीय (चाबी)
                </button>

                <button
                  type="button"
                  onClick={() => applyPreset('aap')}
                  style={{
                    padding: '5px 12px',
                    borderRadius: '20px',
                    fontSize: '12px',
                    fontWeight: 700,
                    background: '#fefce8',
                    border: '1.5px solid #facc15',
                    color: '#a16207',
                    cursor: 'pointer',
                  }}
                >
                  आप (AAP - झाड़ू)
                </button>
              </div>
            </div>

            {/* 2-Column Layout: Left Controls, Right Real-time Live Preview */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 300px), 1fr))',
                gap: '24px',
                alignItems: 'start',
              }}
            >
              {/* LEFT COLUMN: Input Fields & Uploaders */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                
                {/* 📐 Image Dimension & Header Guidance Box */}
                <div
                  style={{
                    background: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)',
                    border: '1.5px solid #86efac',
                    borderRadius: '12px',
                    padding: '12px 16px',
                    fontSize: '12.5px',
                    color: '#166534',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 800, fontSize: '13px', marginBottom: '8px' }}>
                    <Sparkles size={16} color="#16a34a" />
                    <span>📐 पर्ची हेडर व फोटो साइज़ गाइडलाइंस (Recommended Image Dimensions):</span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '8px', fontSize: '12px', lineHeight: 1.4 }}>
                    <div style={{ background: '#ffffff', padding: '7px 10px', borderRadius: '8px', border: '1px solid #bbf7d0' }}>
                      <strong style={{ color: '#0f172a' }}>1. चुनाव चिन्ह (Symbol):</strong><br />
                      <span style={{ color: '#ea580c', fontWeight: 700 }}>120 × 120 px</span> (Square 1:1, Transparent PNG)
                    </div>
                    <div style={{ background: '#ffffff', padding: '7px 10px', borderRadius: '8px', border: '1px solid #bbf7d0' }}>
                      <strong style={{ color: '#0f172a' }}>2. प्रत्याशी फ़ोटो (Candidate):</strong><br />
                      <span style={{ color: '#2563eb', fontWeight: 700 }}>120 × 150 px</span> (Passport 4:5 अनुपात, HD Portrait)
                    </div>
                    <div style={{ background: '#ffffff', padding: '7px 10px', borderRadius: '8px', border: '1px solid #bbf7d0' }}>
                      <strong style={{ color: '#0f172a' }}>3. पूरा हेडर ग्राफ़िक (Full Banner):</strong><br />
                      <span style={{ color: '#7c3aed', fontWeight: 700 }}>560 × 120 px</span> (14:3 अनुपात, Banner Graphic)
                    </div>
                  </div>
                </div>

                {/* 0. Slip Format Selector (Full Campaign vs Compact Details-only) */}
                <div
                  style={{
                    border: '1.5px solid #93c5fd',
                    background: '#f0f9ff',
                    borderRadius: '12px',
                    padding: '12px 14px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                    <span style={{ fontSize: '13px', fontWeight: 800, color: '#0369a1' }}>
                      📋 पर्ची प्रारूप (Default Slip Format):
                    </span>
                    <span style={{ fontSize: '11px', color: '#0284c7', background: '#e0f2fe', padding: '2px 8px', borderRadius: '6px', fontWeight: 700 }}>
                      नया फ़ीचर
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '12.5px', color: '#0f172a', fontWeight: 600 }}>
                      <input
                        type="radio"
                        name="slipFormat"
                        checked={editingConfig.slipFormat !== 'compact'}
                        onChange={() => setEditingConfig((prev) => ({ ...prev, slipFormat: 'full' }))}
                      />
                      <span>🏷️ पूर्ण प्रचार पर्ची (Full Campaign)</span>
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '12.5px', color: '#0f172a', fontWeight: 600 }}>
                      <input
                        type="radio"
                        name="slipFormat"
                        checked={editingConfig.slipFormat === 'compact'}
                        onChange={() => setEditingConfig((prev) => ({ ...prev, slipFormat: 'compact' }))}
                      />
                      <span>📄 सादी / केवल विवरण पर्ची (Compact Details Only)</span>
                    </label>
                  </div>
                  <p style={{ margin: 0, fontSize: '11px', color: '#64748b', lineHeight: 1.4 }}>
                    सादी पर्ची में केवल वार्ड/भाग संख्या, क्रम संख्या और मतदाता विवरण रहता है (अभियान हेडर/अपील नहीं)।
                  </p>
                </div>

                {/* 1. Photos & Symbol Upload (Both Sides) */}
                <div
                  style={{
                    border: '1.5px solid #fed7aa',
                    background: '#fffaf5',
                    borderRadius: '12px',
                    padding: '14px',
                  }}
                >
                  <span style={{ fontSize: '13px', fontWeight: 800, color: '#c2410c', display: 'block', marginBottom: '10px' }}>
                    दोनों साइड की फोटो अपलोड (Left & Right Column Images)
                  </span>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 140px), 1fr))', gap: '14px' }}>
                    {/* Left: Party Symbol */}
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                        <label style={{ fontSize: '12px', fontWeight: 700, color: '#334155' }}>
                          बायां: चुनाव चिन्ह
                        </label>
                        <span style={{ fontSize: '10px', fontWeight: 700, color: '#ea580c', background: '#ffedd5', padding: '1px 5px', borderRadius: '4px' }}>
                          120×120 px
                        </span>
                      </div>
                      <div
                        style={{
                          border: '2px dashed #fdba74',
                          borderRadius: '8px',
                          padding: '10px',
                          textAlign: 'center',
                          background: '#fff',
                        }}
                      >
                        {editingConfig.partySymbolImage ? (
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={editingConfig.partySymbolImage}
                              alt="Symbol"
                              style={{ height: '54px', objectFit: 'contain' }}
                            />
                            <button
                              type="button"
                              onClick={() => setEditingConfig((prev) => ({ ...prev, partySymbolImage: '' }))}
                              style={{
                                fontSize: '11px',
                                color: '#dc2626',
                                background: '#fee2e2',
                                border: 'none',
                                borderRadius: '4px',
                                padding: '2px 8px',
                                cursor: 'pointer',
                              }}
                            >
                              <Trash2 size={12} style={{ display: 'inline', marginRight: '3px' }} /> हटाएं
                            </button>
                          </div>
                        ) : (
                          <label style={{ cursor: 'pointer', display: 'block' }}>
                            <Upload size={22} color="#ea580c" style={{ margin: '0 auto 4px' }} />
                            <span style={{ fontSize: '11px', color: '#ea580c', fontWeight: 700, display: 'block' }}>
                              चिन्ह फोटो अपलोड करें
                            </span>
                            <span style={{ fontSize: '10px', color: '#64748b', display: 'block', marginTop: '2px' }}>
                              120×120 px (Square PNG/JPG)
                            </span>
                            <input
                              type="file"
                              accept="image/*"
                              style={{ display: 'none' }}
                              onChange={(e) => handleImageUpload(e, 'partySymbolImage')}
                            />
                          </label>
                        )}
                      </div>
                    </div>

                    {/* Right: Candidate Photo */}
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                        <label style={{ fontSize: '12px', fontWeight: 700, color: '#334155' }}>
                          दायां: प्रत्याशी फ़ोटो
                        </label>
                        <span style={{ fontSize: '10px', fontWeight: 700, color: '#2563eb', background: '#dbeafe', padding: '1px 5px', borderRadius: '4px' }}>
                          120×150 px
                        </span>
                      </div>
                      <div
                        style={{
                          border: '2px dashed #fdba74',
                          borderRadius: '8px',
                          padding: '10px',
                          textAlign: 'center',
                          background: '#fff',
                        }}
                      >
                        {editingConfig.candidateImage ? (
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={editingConfig.candidateImage}
                              alt="Candidate"
                              style={{ height: '54px', width: '54px', borderRadius: '4px', objectFit: 'cover' }}
                            />
                            <button
                              type="button"
                              onClick={() => setEditingConfig((prev) => ({ ...prev, candidateImage: '' }))}
                              style={{
                                fontSize: '11px',
                                color: '#dc2626',
                                background: '#fee2e2',
                                border: 'none',
                                borderRadius: '4px',
                                padding: '2px 8px',
                                cursor: 'pointer',
                              }}
                            >
                              <Trash2 size={12} style={{ display: 'inline', marginRight: '3px' }} /> हटाएं
                            </button>
                          </div>
                        ) : (
                          <label style={{ cursor: 'pointer', display: 'block' }}>
                            <Upload size={22} color="#ea580c" style={{ margin: '0 auto 4px' }} />
                            <span style={{ fontSize: '11px', color: '#ea580c', fontWeight: 700, display: 'block' }}>
                              प्रत्याशी फोटो अपलोड करें
                            </span>
                            <span style={{ fontSize: '10px', color: '#64748b', display: 'block', marginTop: '2px' }}>
                              120×150 px (पासपोर्ट साइज)
                            </span>
                            <input
                              type="file"
                              accept="image/*"
                              style={{ display: 'none' }}
                              onChange={(e) => handleImageUpload(e, 'candidateImage')}
                            />
                          </label>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Option for Full Custom Header Banner Graphic (560x120px) */}
                  <div style={{ marginTop: '14px', paddingTop: '12px', borderTop: '1px dashed #fed7aa' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                      <label style={{ fontSize: '12px', fontWeight: 700, color: '#334155' }}>
                        🎨 या पूरा कस्टम हेडर बैनर अपलोड करें (Full Header Graphic Banner)
                      </label>
                      <span style={{ fontSize: '10px', fontWeight: 700, color: '#7c3aed', background: '#ede9fe', padding: '1px 5px', borderRadius: '4px' }}>
                        560×120 px
                      </span>
                    </div>

                    <div
                      style={{
                        border: '2px dashed #c084fc',
                        borderRadius: '8px',
                        padding: '10px',
                        textAlign: 'center',
                        background: '#faf5ff',
                      }}
                    >
                      {editingConfig.headerGraphicImage ? (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={editingConfig.headerGraphicImage}
                            alt="Header Banner"
                            style={{ height: '48px', maxWidth: '100%', objectFit: 'contain', borderRadius: '4px' }}
                          />
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <button
                              type="button"
                              onClick={() => setEditingConfig((prev) => ({ ...prev, headerGraphicImage: '', useHeaderGraphic: false }))}
                              style={{
                                fontSize: '11px',
                                color: '#dc2626',
                                background: '#fee2e2',
                                border: 'none',
                                borderRadius: '4px',
                                padding: '2px 8px',
                                cursor: 'pointer',
                              }}
                            >
                              <Trash2 size={12} style={{ display: 'inline', marginRight: '3px' }} /> बैनर हटाएं
                            </button>
                            <label style={{ fontSize: '11px', color: '#475569', display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
                              <input
                                type="checkbox"
                                checked={!!editingConfig.useHeaderGraphic}
                                onChange={(e) => setEditingConfig((prev) => ({ ...prev, useHeaderGraphic: e.target.checked }))}
                              />
                              बैनर सक्रिय रखें
                            </label>
                          </div>
                        </div>
                      ) : (
                        <label style={{ cursor: 'pointer', display: 'block' }}>
                          <Upload size={22} color="#7c3aed" style={{ margin: '0 auto 4px' }} />
                          <span style={{ fontSize: '11px', color: '#7c3aed', fontWeight: 700, display: 'block' }}>
                            तैयार हेडर बैनर ग्राफ़िक अपलोड करें (560×120 px)
                          </span>
                          <span style={{ fontSize: '10px', color: '#64748b' }}>
                            यदि ग्राफ़िक डिज़ाइनर से तैयार बैनर है, तो यहाँ अपलोड करें
                          </span>
                          <input
                            type="file"
                            accept="image/*"
                            style={{ display: 'none' }}
                            onChange={(e) => handleImageUpload(e, 'headerGraphicImage')}
                          />
                        </label>
                      )}
                    </div>
                  </div>
                </div>

                {/* 2. Candidate & Party Details */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: '#334155' }}>
                    प्रत्याशी का नाम (हिंदी):
                    <input
                      type="text"
                      placeholder="उदा. प्रत्याशी का नाम"
                      value={editingConfig.candidateName || ''}
                      onChange={(e) => setEditingConfig({ ...editingConfig, candidateName: e.target.value })}
                      style={{ marginTop: '4px' }}
                    />
                  </label>

                  <label style={{ fontSize: '12px', fontWeight: 600, color: '#334155' }}>
                    Candidate Name (English):
                    <input
                      type="text"
                      placeholder="e.g. Candidate Name"
                      value={editingConfig.candidateNameEn || ''}
                      onChange={(e) => setEditingConfig({ ...editingConfig, candidateNameEn: e.target.value })}
                      style={{ marginTop: '4px' }}
                    />
                  </label>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr 0.6fr', gap: '10px' }}>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: '#334155' }}>
                    पार्टी का नाम (Party Name):
                    <input
                      type="text"
                      placeholder="उदा. पार्टी या निर्दलीय प्रत्याशी"
                      value={editingConfig.partyName || ''}
                      onChange={(e) => setEditingConfig({ ...editingConfig, partyName: e.target.value })}
                      style={{ marginTop: '4px' }}
                    />
                  </label>

                  <label style={{ fontSize: '12px', fontWeight: 600, color: '#334155' }}>
                    चुनाव चिन्ह (Symbol):
                    <input
                      type="text"
                      placeholder="उदा. चुनाव चिन्ह का नाम"
                      value={editingConfig.partySymbolName || ''}
                      onChange={(e) => setEditingConfig({ ...editingConfig, partySymbolName: e.target.value })}
                      style={{ marginTop: '4px' }}
                    />
                  </label>

                  <label style={{ fontSize: '12px', fontWeight: 600, color: '#334155' }}>
                    EVM क्र.:
                    <input
                      type="text"
                      placeholder="1"
                      value={editingConfig.evmNumber || ''}
                      onChange={(e) => setEditingConfig({ ...editingConfig, evmNumber: e.target.value })}
                      style={{ marginTop: '4px' }}
                    />
                  </label>
                </div>

                {/* 3. Headlines and Appeals */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: '#334155' }}>
                    शीर्ष अपील (Top Headline):
                    <input
                      type="text"
                      placeholder="उदा. बटन दबाकर भारी मतों से विजयी बनाएं"
                      value={editingConfig.appealHeadline || ''}
                      onChange={(e) => setEditingConfig({ ...editingConfig, appealHeadline: e.target.value })}
                      style={{ marginTop: '4px' }}
                    />
                  </label>

                  <label style={{ fontSize: '12px', fontWeight: 600, color: '#334155' }}>
                    वार्ड / क्षेत्र सब-टाइटल:
                    <input
                      type="text"
                      placeholder="मतदाता सूचना पर्ची · वार्ड नंबर 82"
                      value={editingConfig.subTitle || ''}
                      onChange={(e) => setEditingConfig({ ...editingConfig, subTitle: e.target.value })}
                      style={{ marginTop: '4px' }}
                    />
                  </label>
                </div>

                {/* EVM Ribbon Toggle */}
                <div style={{ background: '#f8fafc', padding: '12px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', margin: '4px 0' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontSize: '13px', fontWeight: 700, color: '#1e293b' }}>
                    <input
                      type="checkbox"
                      checked={!editingConfig.hideEvmRibbon}
                      onChange={(e) => setEditingConfig({ ...editingConfig, hideEvmRibbon: !e.target.checked })}
                      style={{ width: '18px', height: '18px', accentColor: '#ea580c', cursor: 'pointer' }}
                    />
                    <span>ईवीएम / मतपत्र क्रम संख्या पट्टी दिखाएं (Show EVM Ribbon)</span>
                  </label>
                  <p style={{ margin: '4px 0 0 28px', fontSize: '11.5px', color: '#64748b', lineHeight: 1.4 }}>
                    {editingConfig.hideEvmRibbon 
                      ? 'पट्टी छिपी हुई है — ऊपर का प्रत्याशी फ़ोटो, चुनाव चिन्ह व नाम सेक्शन नीचे तक विस्तृत (extend) रहेगा।'
                      : 'पट्टी दिख रही है — हटाने पर ऊपर का सेक्शन नीचे तक बड़ा हो जाएगा।'}
                  </p>
                </div>

                {/* Highlight Metric Card Selection: Ward No. vs Part No. */}
                <div style={{ background: '#f0fdf4', padding: '12px 14px', borderRadius: '8px', border: '1.5px solid #86efac', margin: '4px 0' }}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#166534', marginBottom: '8px' }}>
                    हाईलाइट मुख्य कार्ड (Highlight Metric): वार्ड संख्या या भाग संख्या
                  </label>
                  <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '7px', cursor: 'pointer', fontSize: '13px', fontWeight: 700, color: '#0f172a' }}>
                      <input
                        type="radio"
                        name="slipMetricType"
                        value="ward"
                        checked={editingConfig.metricType !== 'part' && editingConfig.showWardInsteadOfPart !== false}
                        onChange={() => setEditingConfig({ ...editingConfig, metricType: 'ward', showWardInsteadOfPart: true })}
                        style={{ width: '17px', height: '17px', accentColor: '#16a34a', cursor: 'pointer' }}
                      />
                      <span>🏛️ वार्ड संख्या (WARD NO.) <span style={{ fontSize: '11px', color: '#15803d', background: '#dcfce7', padding: '1px 6px', borderRadius: '4px' }}>पंचायत / वार्ड चुनाव</span></span>
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '7px', cursor: 'pointer', fontSize: '13px', fontWeight: 600, color: '#475569' }}>
                      <input
                        type="radio"
                        name="slipMetricType"
                        value="part"
                        checked={editingConfig.metricType === 'part' || editingConfig.showWardInsteadOfPart === false}
                        onChange={() => setEditingConfig({ ...editingConfig, metricType: 'part', showWardInsteadOfPart: false })}
                        style={{ width: '17px', height: '17px', accentColor: '#2563eb', cursor: 'pointer' }}
                      />
                      <span>📋 भाग संख्या (PART NO.) <span style={{ fontSize: '11px', color: '#64748b' }}>विधानसभा / लोकसभा</span></span>
                    </label>
                  </div>
                  <p style={{ margin: '6px 0 0 0', fontSize: '11.5px', color: '#166534', lineHeight: 1.4 }}>
                    पर्ची के मुख्य बाएं कार्ड में <strong>'वार्ड संख्या'</strong> दिखेगी या <strong>'भाग संख्या'</strong>, इसे यहाँ से कभी भी बदल सकते हैं।
                  </p>
                </div>

                {!editingConfig.hideEvmRibbon && (
                  <label style={{ fontSize: '12px', fontWeight: 600, color: '#334155' }}>
                    EVM बैनर अपील (EVM Banner Appeal Text):
                    <input
                      type="text"
                      placeholder="उदा. अपने प्रत्याशी को अपना अमूल्य वोट देकर भारी मतों से विजयी बनाएं।"
                      value={editingConfig.appealText || ''}
                      onChange={(e) => setEditingConfig({ ...editingConfig, appealText: e.target.value })}
                      style={{ marginTop: '4px' }}
                    />
                  </label>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 200px), 1fr))', gap: '12px' }}>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: '#334155' }}>
                    फुटर अपील (Bottom Footer Appeal):
                    <input
                      type="text"
                      placeholder="कमल का बटन दबाएं और भारी मतों से विजयी बनाएं"
                      value={editingConfig.footerAppeal || ''}
                      onChange={(e) => setEditingConfig({ ...editingConfig, footerAppeal: e.target.value })}
                      style={{ marginTop: '4px' }}
                    />
                  </label>
                </div>

                {/* Ward-wise Polling Stations Management Component */}
                <WardPollingStationEditor
                  config={editingConfig}
                  onChange={setEditingConfig}
                  availableWards={availableWards}
                  selectedPreviewWard={previewWard || selectedVoter?.wardNo || availableWards[0] || '82'}
                  onPreviewWardChange={setPreviewWard}
                  organizationName={clientsList.find((c) => c.id === selectedTargetOrgId)?.name || 'आपका संगठन'}
                  isCompact={true}
                />
              </div>

              {/* RIGHT COLUMN: Real-Time Live Preview */}
              <div
                style={{
                  background: '#f8fafc',
                  border: '1.5px solid #cbd5e1',
                  borderRadius: '14px',
                  padding: '16px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                }}
              >
                <div
                  style={{
                    width: '100%',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '12px',
                    paddingBottom: '8px',
                    borderBottom: '1px solid #e2e8f0',
                  }}
                >
                  <div style={{ fontSize: '13px', fontWeight: 800, color: '#1e3a8a', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Sparkles size={16} color="#ea580c" />
                    <span>रियल-टाइम लाइव प्रीव्यू (Live Preview)</span>
                  </div>
                  <span style={{ fontSize: '11px', color: '#16a34a', fontWeight: 700 }}>
                    लाइव अपडेट
                  </span>
                </div>

                <div style={{ width: '100%', display: 'flex', justifyContent: 'center' }}>
                  <VoterSlipTemplate
                    voter={{
                      ...(selectedVoter || voters[0] || {
                        epic: 'RLJ1213180',
                        nameHi: 'जबरा राम',
                        nameEn: 'Jabra Ram',
                        relativeNameHi: 'नरिगा राम',
                        relativeNameEn: 'Nariga Ram',
                        relationType: 'पिता',
                        age: 28,
                        gender: 'पुरुष',
                        houseNo: '279',
                        partNo: '1',
                        serialNo: 1,
                      }),
                      wardNo: previewWard || selectedVoter?.wardNo || availableWards[0] || '82',
                      boothName: '', // Dynamically resolves to wardPollingStations[previewWard]!
                    }}
                    config={editingConfig}
                    format={editingConfig.slipFormat || 'full'}
                    isInline={true}
                    isEditable={true}
                    onConfigChange={setEditingConfig}
                  />
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div
              className="modal-actions"
              style={{
                marginTop: '20px',
                paddingTop: '16px',
                borderTop: '1px solid #e2e8f0',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <div>
                {brandingSaveMsg && (
                  <span style={{ fontSize: '13px', color: '#16a34a', fontWeight: 700 }}>
                    {brandingSaveMsg}
                  </span>
                )}
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button className="button-secondary" type="button" onClick={() => setIsCustomizing(false)}>
                  रद्द करें
                </button>
                <button
                  type="button"
                  className="button-primary"
                  style={{ background: '#047857', borderColor: '#059669', color: '#fff' }}
                  onClick={handleSaveBranding}
                  disabled={savingBranding}
                >
                  {savingBranding ? <LoaderCircle size={15} className="spin" /> : <Check size={15} />}
                  ब्रांडिंग सहेजें (Save Branding)
                </button>
              </div>
            </div>
          </section>
        </div>
      )}

      {/* WhatsApp Modal */}
      {isWpModalOpen && (selectedVoter || (slipMode === 'family' && selectedHousehold)) && (
        <div
          className="modal-backdrop"
          role="presentation"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setIsWpModalOpen(false);
          }}
        >
          <section className="form-modal" role="dialog" style={{ maxWidth: '440px', width: '95%' }}>
            <div className="modal-heading">
              <div>
                <span className="eyebrow-label">WHATSAPP DISPATCH</span>
                <h2 style={{ fontSize: '18px', margin: '4px 0' }}>
                  {slipMode === 'family' ? 'संयुक्त परिवार पर्ची WhatsApp' : 'WhatsApp पर्ची भेजें'}
                </h2>
                <p style={{ margin: 0, fontSize: '13px', color: '#64748b' }}>
                  {slipMode === 'family' && selectedHousehold
                    ? `मकान #${selectedHousehold.houseNo} परिवार (${selectedHousehold.members.length} सदस्य) · वार्ड ${selectedHousehold.wardNo || '—'}`
                    : selectedVoter
                    ? `${selectedVoter.nameHi || selectedVoter.nameEn} (${selectedVoter.epic})`
                    : ''}
                </p>
              </div>
              <button className="icon-button" type="button" onClick={() => setIsWpModalOpen(false)}>
                <X size={18} />
              </button>
            </div>

            <div style={{ padding: '16px 0', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {whatsappQuota && (
                <div
                  style={{
                    padding: '8px 12px',
                    borderRadius: '8px',
                    background: '#f0fdf4',
                    border: '1px solid #bbf7d0',
                    fontSize: '12px',
                    color: '#166534',
                    fontWeight: 600,
                  }}
                >
                  उपलब्ध कोटा: {whatsappQuota.whatsappCredits} क्रेडिट शेष (1 क्रेडिट कटेगा)
                </div>
              )}

              <label style={{ fontSize: '12px', fontWeight: 600, color: '#334155' }}>
                WhatsApp मोबाइल नंबर:
                <input
                  type="tel"
                  placeholder="+91 98765 43210"
                  value={wpPhone}
                  onChange={(e) => setWpPhone(e.target.value)}
                  onBlur={() => handleAutoSaveWpPhone(wpPhone)}
                  style={{ marginTop: '6px', height: '38px' }}
                />
              </label>

              {wpMessage && (
                (() => {
                  const isSuccessMsg = (wpMessage.includes('सफलतापूर्वक') || wpMessage.includes('सफल')) && !wpMessage.includes('नहीं') && !wpMessage.includes('विफल') && !wpMessage.includes('त्रुटि') && !wpMessage.includes('नीति');
                  return (
                    <div
                      role="alert"
                      style={{
                        margin: '10px 0',
                        padding: '8px 12px',
                        borderRadius: '8px',
                        fontSize: '12.5px',
                        lineHeight: '1.4',
                        background: isSuccessMsg ? '#f0fdf4' : '#fef2f2',
                        border: `1px solid ${isSuccessMsg ? '#bbf7d0' : '#fecaca'}`,
                        color: isSuccessMsg ? '#166534' : '#991b1b',
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '8px'
                      }}
                    >
                      <span style={{ flexShrink: 0, marginTop: '2px' }}>
                        {isSuccessMsg ? (
                          <Check size={15} color="#16a34a" />
                        ) : (
                          <AlertCircle size={15} color="#dc2626" />
                        )}
                      </span>
                      <span style={{ fontWeight: 500 }}>{wpMessage}</span>
                    </div>
                  );
                })()
              )}

              <div className="modal-actions" style={{ marginTop: '14px', display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                <button className="button-secondary" type="button" onClick={() => setIsWpModalOpen(false)}>
                  रद्द करें
                </button>
                <button
                  type="button"
                  className="button-secondary"
                  style={{ borderColor: '#22c55e', color: '#166534', background: '#f0fdf4', display: 'inline-flex', alignItems: 'center', gap: '6px', fontWeight: 600 }}
                  onClick={handleSendDirectWhatsApp}
                  disabled={wpSending || !wpPhone.trim()}
                  title="सीधे WhatsApp में फोटो और विवरण भेजें (1 क्रेडिट कटेगा)"
                >
                  <WhatsAppLogo size={15} color="#25D366" /> डायरेक्ट WhatsApp (फोटो + मैसेज)
                </button>
                <button
                  type="button"
                  className="button-primary"
                  style={{ background: '#25D366', borderColor: '#22c55e', color: '#fff', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                  onClick={handleSendWhatsAppViaApi}
                  disabled={wpSending || !wpPhone.trim()}
                  title="Meta Cloud API से फोटो पर्ची भेजें"
                >
                  {wpSending ? <LoaderCircle size={15} className="spin" /> : <WhatsAppLogo size={16} color="#ffffff" />}
                  WhatsApp पर्ची भेजें (Meta API)
                </button>
              </div>
            </div>
          </section>
        </div>
      )}

      {/* Interactive Meta-style Image Crop Modal */}
      <ImageCropModal
        isOpen={cropModalOpen}
        imageSrc={cropImageSrc}
        title={
          cropField === 'candidateImage'
            ? 'प्रत्याशी फ़ोटो क्रॉप करें (Crop Candidate Photo)'
            : cropField === 'partySymbolImage'
            ? 'चुनाव चिन्ह फ़ोटो क्रॉप करें (Crop Symbol Photo)'
            : 'हेडर ग्राफ़िक क्रॉप करें (Crop Header Banner)'
        }
        subtitle="फोटो को सही स्थिति में लाने के लिए ड्रैग करें, ज़ूम स्लाइडर से आकार सेट करें और एरिया चुनें।"
        initialAspectRatio={cropField === 'candidateImage' ? 1 : 0}
        onCropComplete={handleCropComplete}
        onClose={() => setCropModalOpen(false)}
      />

      {/* WhatsApp Web Helper Modal for Desktop Clipboard */}
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
    </div>
  );
}
