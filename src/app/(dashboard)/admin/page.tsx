'use client';

import { FormEvent, Fragment, useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertCircle, AlertTriangle, Building2, Check, CheckCheck, CheckCircle, CheckCircle2, ChevronDown, ChevronLeft, ChevronRight, Copy, Database, Download, Edit3, Eye, EyeOff, FileSpreadsheet,
  FileText, Info, KeyRound, Layers, LayoutDashboard, LoaderCircle, MapPin, MessageCircle, MessageSquareCode, Phone, Plus, RefreshCw, Search, Send,
  Settings2, ShieldCheck, Activity, Cpu, Sliders, Smartphone, Sparkles, Tag, Ticket, ToggleLeft, ToggleRight, Trash2, Upload, User, UserPlus, UsersRound, X,
} from 'lucide-react';
import DashboardShell from '@/app/(dashboard)/DashboardShell';
import AccountsManager from '@/components/AccountsManager';
import { apiFetch, getApiError, decodeJwtPayload } from '@/lib/api';
import { downloadBlob } from '@/lib/fileDownload';
import { VoterSlipTemplate, SlipConfig, defaultSlipConfig } from '@/components/VoterSlipTemplate';
import { WardPollingStationEditor } from '@/components/WardPollingStationEditor';
import { ImageCropModal } from '@/components/ImageCropModal';
import { SortButton, SortState } from '@/components/SortButton';
import { attachEnglishNames, matchesVoterQuery } from '@/lib/transliteration';

const partyPresets: Record<string, { label: string; config: Partial<SlipConfig> }> = {
  bjp: {
    label: 'भाजपा (कमल)',
    config: {
      partyName: 'भारतीय जनता पार्टी (भाजपा) प्रत्याशी',
      partySymbolName: 'कमल का फूल',
      evmNumber: '1',
      appealHeadline: '(1 नंबर पर कमल का फूल का बटन दबाएं)',
      appealText: 'वार्ड से भाजपा प्रत्याशी को अपना अमूल्य वोट देकर भारी मतों से विजयी बनाएं।',
      footerAppeal: 'कमल का बटन दबाएं और भारी मतों से विजयी बनाएं',
    },
  },
  inc: {
    label: 'कांग्रेस (पंजा)',
    config: {
      partyName: 'भारतीय राष्ट्रीय कांग्रेस (INC) प्रत्याशी',
      partySymbolName: 'हाथ का पंजा',
      evmNumber: '2',
      appealHeadline: '(2 नंबर पर हाथ के पंजे का बटन दबाएं)',
      appealText: 'वार्ड से कांग्रेस प्रत्याशी को अपना अमूल्य वोट देकर भारी मतों से विजयी बनाएं।',
      footerAppeal: 'हाथ के पंजे का बटन दबाएं और भारी मतों से विजयी बनाएं',
    },
  },
  aap: {
    label: 'आप (झाड़ू)',
    config: {
      partyName: 'आम आदमी पार्टी (आप) प्रत्याशी',
      partySymbolName: 'झाड़ू',
      evmNumber: '3',
      appealHeadline: '(3 नंबर पर झाड़ू का बटन दबाएं)',
      appealText: 'वार्ड से आप प्रत्याशी को अपना अमूल्य वोट देकर भारी मतों से विजयी बनाएं।',
      footerAppeal: 'झाड़ू का बटन दबाएं और भारी मतों से विजयी बनाएं',
    },
  },
  ind_kite: {
    label: 'निर्दलीय (पतंग)',
    config: {
      partyName: 'निर्दलीय प्रत्याशी',
      partySymbolName: 'पतंग',
      evmNumber: '4',
      appealHeadline: '(4 नंबर पर पतंग का बटन दबाएं)',
      appealText: 'वार्ड से निर्दलीय प्रत्याशी को अपना अमूल्य वोट देकर भारी मतों से विजयी बनाएं।',
      footerAppeal: 'पतंग का बटन दबाएं और भारी मतों से विजयी बनाएं',
    },
  },
  ind_bat: {
    label: 'निर्दलीय (बल्ला)',
    config: {
      partyName: 'निर्दलीय प्रत्याशी',
      partySymbolName: 'बल्ला',
      evmNumber: '5',
      appealHeadline: '(5 नंबर पर बल्ले का बटन दबाएं)',
      appealText: 'वार्ड से निर्दलीय प्रत्याशी को अपना अमूल्य वोट देकर भारी मतों से विजयी बनाएं।',
      footerAppeal: 'बल्ले का बटन दबाएं और भारी मतों से विजयी बनाएं',
    },
  },
  ind_key: {
    label: 'निर्दलीय (चाबी)',
    config: {
      partyName: 'निर्दलीय प्रत्याशी',
      partySymbolName: 'चाबी',
      evmNumber: '6',
      appealHeadline: '(6 नंबर पर चाबी का बटन दबाएं)',
      appealText: 'वार्ड से निर्दलीय प्रत्याशी को अपना अमूल्य वोट देकर भारी मतों से विजयी बनाएं।',
      footerAppeal: 'चाबी का बटन दबाएं और भारी मतों से विजयी बनाएं',
    },
  },
};

const moduleOptions = [
  ['voters', 'मतदाता सूची'],
  ['poll-desk', 'मतदान डेस्क'],
  ['turnout', 'टर्नआउट'],
  ['warroom', 'वॉर रूम'],
  ['history', 'पर्ची इतिहास'],
  ['community', 'समुदाय खोज'],
  ['workers', 'कार्यकर्ता'],
  ['migrants', 'प्रवासी मतदाता'],
] as const;

interface Tenant {
  id: string;
  name: string;
  modules: string[];
  enabledModules?: string[];
  wards: string[];
  isActive: boolean;
  activeWorkers: number;
  voterCount: number;
  whatsappEnabled?: boolean;
  whatsappCredits?: number;
  whatsappUsed?: number;
  candidateName?: string;
  slipConfig?: SlipConfig;
  district?: string;
  ulbPanchayatSamiti?: string;
  ulbWardGramPanchayat?: string;
  adminEmail?: string;
  initialPassword?: string;
  customCastes?: string[];
}

interface AdminVoter {
  _id: string;
  epic: string;
  nameEn: string;
  nameHi: string;
  relativeNameHi?: string;
  relativeNameEn?: string;
  relationType?: string;
  houseNo?: string;
  wardNo: string;
  partNo: string;
  serialNo: number;
  phone: string;
  organizationId: string;
}


interface UploadJob {
  id: string;
  filename: string;
  fileType?: 'excel' | 'pdf';
  organizationId: string;
  wardNo?: string;
  boothNo?: string;
  uploadedBy?: string;
  listDescription?: string;
  status: 'processing' | 'completed' | 'failed';
  progress?: number;
  stageMessage?: string;
  extractedCount: number;
  uploadedAt: string;
  excelFilename?: string;
  hasExcel?: boolean;
  errorMessage?: string;
}

interface DictionaryStats {
  totalKnownGlyphs: number;
  totalKnownWords: number;
  learnedGlyphsCount: number;
  learnedWordsCount: number;
  lastUpdated: string;
}

interface LeadRecord {
  _id: string;
  name: string;
  phone: string;
  constituency: string;
  electionType: string;
  status: 'new' | 'contacted' | 'converted' | 'closed';
  notes?: string;
  createdAt: string;
}

interface DemoUserRecord {
  id: string;
  userId?: string;
  name: string;
  email: string;
  password: string;
  isActive: boolean;
  voterCount: number;
  createdAt: string;
}

interface ToastNotification {
  id: string;
  type: 'success' | 'error' | 'info';
  title?: string;
  message: string;
}

interface CreatedClientDetails {
  name: string;
  email: string;
  password?: string;
  modules: string[];
  wards: string[];
  whatsappCredits: number;
  district?: string;
  ulbPanchayatSamiti?: string;
  ulbWardGramPanchayat?: string;
}

type AdminView = 'dashboard' | 'tenants' | 'castes' | 'demo' | 'branding' | 'templates' | 'leads' | 'records' | 'users' | 'import' | 'export';

const SAMANDAR_SINGH_CASTES: string[] = [
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

const DEFAULT_RAJASTHAN_CASTES: string[] = [
  'राजपूत',
  'जाट',
  'ब्राह्मण',
  'मेघवाल',
  'भील',
  'बिश्नोई',
  'गुर्जर',
  'माली / सैनी',
  'कुमावत / प्रजापत',
  'वैश्य / महाजन',
  'मुस्लिम',
  'यादव',
  'मीणा',
  'देवासी / रबारी',
  'सुथार / खाती',
  'लोहार',
  'चारण',
  'सोनी',
];

export default function AdminPanel() {
  const [activeView, setActiveView] = useState<AdminView>('dashboard');
  const [organizations, setOrganizations] = useState<Tenant[]>([]);
  const [casteSelectedOrgId, setCasteSelectedOrgId] = useState<string>('');
  const [orgCastesList, setOrgCastesList] = useState<string[]>([]);
  const [newCasteInput, setNewCasteInput] = useState('');
  const [savingCastes, setSavingCastes] = useState(false);
  const [deletingTenant, setDeletingTenant] = useState<Tenant | null>(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [isDeletingClient, setIsDeletingClient] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [toast, setToast] = useState<ToastNotification | null>(null);
  const [createdClientInfo, setCreatedClientInfo] = useState<CreatedClientDetails | null>(null);
  const [isCreateClientModalOpen, setIsCreateClientModalOpen] = useState(false);
  const [copiedClientCreds, setCopiedClientCreds] = useState(false);
  const [showCreatedClientPassword, setShowCreatedClientPassword] = useState(true);

  const showToast = useCallback((type: 'success' | 'error' | 'info', message: string, title?: string) => {
    if (!message) return;
    const id = Math.random().toString(36).substring(2, 9);
    setToast({
      id,
      type,
      message,
      title: title || (type === 'success' ? 'सफलतापूर्वक संपन्न!' : type === 'error' ? 'त्रुटि / ध्यान दें' : 'सूचना'),
    });
  }, []);

  // Synchronize notice and error state changes to auto-show floating toast pop-up
  useEffect(() => {
    if (notice) {
      showToast('success', notice, 'सफलता');
      const timer = setTimeout(() => {
        setNotice('');
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [notice, showToast]);

  useEffect(() => {
    if (error) {
      showToast('error', error, 'त्रुटि');
    }
  }, [error, showToast]);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => {
      setToast(null);
    }, 5500);
    return () => clearTimeout(timer);
  }, [toast]);

  const [copiedTenantId, setCopiedTenantId] = useState<string | null>(null);
  const [recentCreatedClient, setRecentCreatedClient] = useState<CreatedClientDetails | null>(null);

  const formatClientShareMessage = (details: {
    name: string;
    email?: string;
    password?: string;
    district?: string;
    ulbPanchayatSamiti?: string;
    ulbWardGramPanchayat?: string;
    whatsappCredits?: number;
    wards?: string[];
  }) => {
    const portalUrl = 'https://vijaysetu.vercel.app/';
    const emailStr = details.email || '';
    const passStr = details.password || '(सुरक्षित / पूर्व सेट)';
    const creditsCount = typeof details.whatsappCredits === 'number' ? details.whatsappCredits : 500;
    const regionParts = [details.district, details.ulbPanchayatSamiti, details.ulbWardGramPanchayat].filter(Boolean);

    const lines: string[] = [
      '*विजयसेतु - क्लाइंट लॉगिन विवरण*',
      '==============================',
      `*क्लाइंट / संगठन:* ${details.name}`,
    ];

    if (regionParts.length > 0) {
      lines.push(` *क्षेत्र:* ${regionParts.join(' - ')}`);
    }

    if (emailStr) {
      lines.push(` *लॉगिन ईमेल:* ${emailStr}`);
    }

    lines.push(` *पासवर्ड:* ${passStr}`);
    lines.push(` *लॉगिन पोर्टल:* ${portalUrl}`);
    lines.push(` *WhatsApp क्रेडिट:* ${creditsCount} संदेश`);

    if (details.wards && details.wards.length > 0) {
      lines.push(` *वार्ड:* ${details.wards.join(', ')}`);
    }

    lines.push('==============================');
    lines.push(' *नोट:* कृपया लॉगिन करने के बाद पासवर्ड सुरक्षित रखें।');

    return lines.join('\n');
  };

  const copyTenantDetails = (tenant: Tenant) => {
    const text = formatClientShareMessage({
      name: tenant.name,
      email: tenant.adminEmail,
      password: tenant.initialPassword,
      district: tenant.district,
      ulbPanchayatSamiti: tenant.ulbPanchayatSamiti,
      ulbWardGramPanchayat: tenant.ulbWardGramPanchayat,
      whatsappCredits: tenant.whatsappCredits,
      wards: tenant.wards,
    });
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(text);
    }
    setCopiedTenantId(tenant.id);
    showToast('success', `'${tenant.name}' का लॉगिन विवरण व क्रेडेंशियल्स कॉपी कर लिए गए!`, 'विवरण कॉपी');
    setTimeout(() => setCopiedTenantId(null), 3000);
  };

  const shareTenantWhatsApp = (tenant: Tenant) => {
    const text = formatClientShareMessage({
      name: tenant.name,
      email: tenant.adminEmail,
      password: tenant.initialPassword,
      district: tenant.district,
      ulbPanchayatSamiti: tenant.ulbPanchayatSamiti,
      ulbWardGramPanchayat: tenant.ulbWardGramPanchayat,
      whatsappCredits: tenant.whatsappCredits,
      wards: tenant.wards,
    });
    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
    if (typeof window !== 'undefined') {
      window.open(url, '_blank');
    }
    showToast('success', `'${tenant.name}' का विवरण WhatsApp पर शेयर करने हेतु खोल दिया गया!`, 'WhatsApp शेयर');
  };

  const copyCreatedClientCreds = (detailsToCopy?: CreatedClientDetails) => {
    const target = detailsToCopy || createdClientInfo || recentCreatedClient;
    if (!target) return;
    const text = formatClientShareMessage(target);
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(text);
    }
    setCopiedClientCreds(true);
    showToast('success', `'${target.name}' का लॉगिन विवरण कॉपी कर लिया गया!`, 'क्रेडेंशियल्स कॉपी हुए');
    setTimeout(() => setCopiedClientCreds(false), 3000);
  };

  const shareCreatedClientWhatsApp = (detailsToShare?: CreatedClientDetails) => {
    const target = detailsToShare || createdClientInfo || recentCreatedClient;
    if (!target) return;
    const text = formatClientShareMessage(target);
    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
    if (typeof window !== 'undefined') {
      window.open(url, '_blank');
    }
    showToast('success', `'${target.name}' का विवरण WhatsApp पर शेयर करने हेतु खोल दिया गया!`, 'WhatsApp शेयर');
  };
  const [voters, setVoters] = useState<AdminVoter[]>([]);
  const [masterDataWards, setMasterDataWards] = useState<string[]>([]);
  const [demoUsers, setDemoUsers] = useState<DemoUserRecord[]>([]);
  const [demoLoading, setDemoLoading] = useState(false);
  const [demoGenerating, setDemoGenerating] = useState(false);
  const [demoTargetOrgId, setDemoTargetOrgId] = useState('new');
  const [demoClientName, setDemoClientName] = useState('');
  const [demoCustomEmail, setDemoCustomEmail] = useState('');
  const [demoCustomPassword, setDemoCustomPassword] = useState('');
  const [latestGenerated, setLatestGenerated] = useState<DemoUserRecord | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [demoSort, setDemoSort] = useState<SortState>({ field: 'date', direction: 'desc' });
  const [recordsSort, setRecordsSort] = useState<SortState>({ field: 'serialNo', direction: 'asc' });
  const [expandedOrgId, setExpandedOrgId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [organizationId, setOrganizationId] = useState('');
  const [wardFilter, setWardFilter] = useState('');
  const [tenantName, setTenantName] = useState('');
  const [tenantEmail, setTenantEmail] = useState('');
  const [tenantPassword, setTenantPassword] = useState('');
  const [showTenantPassword, setShowTenantPassword] = useState(false);
  const [tenantModules, setTenantModules] = useState<string[]>(moduleOptions.map(([key]) => key));
  const [tenantWards, setTenantWards] = useState('');
  const [tenantDistrict, setTenantDistrict] = useState('');
  const [tenantUlbPanchayat, setTenantUlbPanchayat] = useState('');
  const [tenantUlbWardGram, setTenantUlbWardGram] = useState('');
  const [tenantWhatsappEnabled, setTenantWhatsappEnabled] = useState(true);
  const [tenantWhatsappCredits, setTenantWhatsappCredits] = useState('500');
  const [tenantSlipConfig, setTenantSlipConfig] = useState<SlipConfig>({
    candidateName: '',
    candidateNameEn: '',
    partyName: '',
    partySymbolName: 'कमल का फूल',
    partySymbolImage: '',
    candidateImage: '',
    evmNumber: '1',
    appealHeadline: '(1 नंबर पर बटन दबाएं)',
    appealText: '',
    subTitle: '',
    footerAppeal: '',
    pollingStationFallback: '',
  });

  // Dedicated Per-Client Slip Branding Studio States
  const [brandingTargetOrgId, setBrandingTargetOrgId] = useState('');
  const [targetSlipConfig, setTargetSlipConfig] = useState<SlipConfig>(defaultSlipConfig);
  const [savingBranding, setSavingBranding] = useState(false);
  const [studioMode, setStudioMode] = useState<'visual' | 'form'>('visual');
  const [isVisualEditing, setIsVisualEditing] = useState(true);
  const [selectedPreviewWard, setSelectedPreviewWard] = useState<string>('');
  const [clientWardsSummary, setClientWardsSummary] = useState<string[]>([]);

  // Admin Dashboard & System Toggles State
  interface WardStatItem {
    wardNo: string;
    total: number;
    male: number;
    female: number;
    voted: number;
    turnout: number;
  }
  interface ActiveOrgDetails {
    id: string;
    name: string;
    whatsappEnabled: boolean;
    whatsappCredits: number;
    enabledModules: string[];
    settings?: { hidePartNo?: boolean };
  }
  interface DashboardStats {
    totalVoters: number;
    totalOrgs: number;
    totalWorkers: number;
    totalSlips: number;
    totalWards: number;
    distinctWards: string[];
    maleCount: number;
    femaleCount: number;
    votedCount: number;
    turnoutPercentage: number;
    settings: {
      hidePartNo: boolean;
    };
    activeOrg?: ActiveOrgDetails | null;
    wardBreakdown?: WardStatItem[];
    engineStatus: {
      pythonExtractor: string;
      dictionaryGlyphs: string;
      rollSync: string;
      ocrConfidence: string;
    };
  }

  const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(null);
  const [dashboardLoading, setDashboardLoading] = useState(false);
  const [systemSettings, setSystemSettings] = useState({
    hidePartNo: true,
  });
  const [savingSettings, setSavingSettings] = useState(false);

  // Meta-style Interactive Image Cropper for Admin Studio & Tenant Branding
  const [adminCropModalOpen, setAdminCropModalOpen] = useState(false);
  const [adminCropSrc, setAdminCropSrc] = useState('');
  const [adminCropField, setAdminCropField] = useState<'partySymbolImage' | 'candidateImage' | 'headerGraphicImage'>('candidateImage');
  const [adminCropContext, setAdminCropContext] = useState<'studio' | 'tenantCreate' | 'tenantEdit'>('studio');

  const handleStudioImageUpload = (
    file: File | string,
    field: 'partySymbolImage' | 'candidateImage' | 'headerGraphicImage'
  ) => {
    if (!file) return;
    if (typeof file === 'string') {
      setTargetSlipConfig((prev) => ({ ...prev, [field]: file, ...(field === 'headerGraphicImage' ? { useHeaderGraphic: true } : {}) }));
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const base64 = e.target?.result as string;
      setAdminCropSrc(base64);
      setAdminCropField(field);
      setAdminCropContext('studio');
      setAdminCropModalOpen(true);
    };
    reader.readAsDataURL(file);
  };

  const handleImageUpload = (
    file: File | string,
    field: 'partySymbolImage' | 'candidateImage' | 'headerGraphicImage',
    isEditing = false
  ) => {
    if (!file) return;
    if (typeof file === 'string') {
      if (isEditing) {
        setEditingTenant((prev) => {
          if (!prev) return null;
          const currentConfig = prev.slipConfig || { ...defaultSlipConfig };
          return { ...prev, slipConfig: { ...currentConfig, [field]: file } };
        });
      } else {
        setTenantSlipConfig((prev) => ({ ...prev, [field]: file }));
      }
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const base64 = e.target?.result as string;
      setAdminCropSrc(base64);
      setAdminCropField(field);
      setAdminCropContext(isEditing ? 'tenantEdit' : 'tenantCreate');
      setAdminCropModalOpen(true);
    };
    reader.readAsDataURL(file);
  };

  const handleAdminCropComplete = (croppedBase64: string) => {
    if (adminCropContext === 'studio') {
      setTargetSlipConfig((prev) => ({
        ...prev,
        [adminCropField]: croppedBase64,
        ...(adminCropField === 'headerGraphicImage' ? { useHeaderGraphic: true } : {}),
      }));
    } else if (adminCropContext === 'tenantEdit') {
      setEditingTenant((prev) => {
        if (!prev) return null;
        const currentConfig = prev.slipConfig || { ...defaultSlipConfig };
        return {
          ...prev,
          slipConfig: { ...currentConfig, [adminCropField]: croppedBase64 },
        };
      });
    } else {
      setTenantSlipConfig((prev) => ({ ...prev, [adminCropField]: croppedBase64 }));
    }
  };

  const handleSelectBrandingOrg = async (orgId: string) => {
    setBrandingTargetOrgId(orgId);
    const found = organizations.find((o) => o.id === orgId);
    if (found) {
      setTargetSlipConfig(
        found.slipConfig && Object.keys(found.slipConfig).length > 0
          ? { ...defaultSlipConfig, ...found.slipConfig }
          : { ...defaultSlipConfig }
      );
      const initialWard = found.wards?.[0] || '82';
      setSelectedPreviewWard(initialWard);
    }
    try {
      const res = await apiFetch(`/voters/wards-summary?organizationId=${encodeURIComponent(orgId)}`, {
        headers: { 'x-organization-id': orgId },
      });
      if (res.ok) {
        const data = await res.json();
        const wardList = (data.wards || []).map((w: { _id: string }) => String(w._id).trim()).filter(Boolean);
        setClientWardsSummary(wardList);
        if (wardList.length > 0 && !found?.wards?.length) {
          setSelectedPreviewWard(wardList[0]);
        }
      }
    } catch {
      // ignore network errors
    }
  };

  // ==========================================
  // Meta WhatsApp Template Management States
  // ==========================================
  interface MetaTemplateItem {
    name: string;
    status: string;
    category?: string;
    language?: string;
    components?: Array<{
      type: string;
      format?: string;
      text?: string;
      example?: { body_text?: string[][] };
    }>;
  }

  const [metaTemplates, setMetaTemplates] = useState<MetaTemplateItem[]>([]);
  const [activeMetaTemplate, setActiveMetaTemplate] = useState<string>('voter_slip_dispatch');
  const [activeMetaLanguage, setActiveMetaLanguage] = useState<string>('hi');
  const [isLiveFromMeta, setIsLiveFromMeta] = useState<boolean>(false);
  const [loadingTemplates, setLoadingTemplates] = useState<boolean>(false);
  const [templateTargetOrgId, setTemplateTargetOrgId] = useState<string>('');
  const [savingTemplate, setSavingTemplate] = useState<boolean>(false);

  // Meta API Credentials Configuration States
  const [metaPhoneId, setMetaPhoneId] = useState<string>('1313651321838149');
  const [metaWabaId, setMetaWabaId] = useState<string>('1236298872043128');
  const [metaTokenInput, setMetaTokenInput] = useState<string>('');
  const [showMetaToken, setShowMetaToken] = useState<boolean>(false);
  const [hasConfiguredToken, setHasConfiguredToken] = useState<boolean>(false);
  const [savingMetaConfig, setSavingMetaConfig] = useState<boolean>(false);
  const [metaConfigVerifyStatus, setMetaConfigVerifyStatus] = useState<string>('');

  // New Template Creation Form States
  const [newTmplName, setNewTmplName] = useState<string>('');
  const [newTmplCategory, setNewTmplCategory] = useState<string>('UTILITY');
  const [newTmplLanguage, setNewTmplLanguage] = useState<string>('hi');
  const [newTmplHeader, setNewTmplHeader] = useState<string>('डिजिटल मतदाता सूचना पर्ची 🗳️');
  const [newTmplBody, setNewTmplBody] = useState<string>(
    'नमस्कार {{1}} जी,\n\nआपकी डिजिटल मतदाता सूचना पर्ची विवरण:\n• पहचान पत्र (EPIC): {{2}}\n• वार्ड संख्या: {{3}}\n• भाग संख्या: {{4}}\n• क्रमांक संख्या: #{{5}}\n• मतदान केंद्र: {{6}}\n\nकृपया मतदान दिवस पर अपना पहचान पत्र साथ लाएं। आपका वोट, आपका अधिकार!'
  );
  const [newTmplFooter, setNewTmplFooter] = useState<string>('विजयसेतु चुनावी प्रबंधन');
  const [creatingTemplate, setCreatingTemplate] = useState<boolean>(false);

  // Test Send States
  const [testPhone, setTestPhone] = useState<string>('');
  const [sendingTest, setSendingTest] = useState<boolean>(false);
  const [testSendResult, setTestSendResult] = useState<{ success: boolean; message: string } | null>(null);

  const loadMetaConfig = useCallback(async (orgId = templateTargetOrgId) => {
    try {
      const query = orgId ? `?organizationId=${encodeURIComponent(orgId)}` : '';
      const res = await apiFetch(`/whatsapp/config${query}`);
      if (res.ok) {
        const data = await res.json();
        if (data.phoneNumberId) setMetaPhoneId(data.phoneNumberId);
        if (data.wabaId) setMetaWabaId(data.wabaId);
        setHasConfiguredToken(Boolean(data.hasToken));
      }
    } catch (e) {
      console.warn('Failed to load Meta config:', e);
    }
  }, [templateTargetOrgId]);

  const handleSaveMetaConfig = async (e: FormEvent) => {
    e.preventDefault();
    setSavingMetaConfig(true);
    setError('');
    setNotice('');
    setMetaConfigVerifyStatus('');
    try {
      const res = await apiFetch('/whatsapp/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phoneNumberId: metaPhoneId.trim(),
          wabaId: metaWabaId.trim(),
          token: metaTokenInput.trim() || undefined,
          organizationId: templateTargetOrgId || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'क्रेडेंशियल्स सुरक्षित नहीं हो पाए।');
      setNotice(data.message);
      setMetaConfigVerifyStatus(data.verifyStatus || 'verified');
      if (data.verifyStatus === 'verified') {
        setHasConfiguredToken(true);
        setMetaTokenInput('');
        await loadMetaTemplates();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'क्रेडेंशियल्स सुरक्षित नहीं हो पाए।');
      setMetaConfigVerifyStatus('failed');
    } finally {
      setSavingMetaConfig(false);
    }
  };

  const loadMetaTemplates = useCallback(async (targetOrgId?: string) => {
    const orgId = targetOrgId ?? templateTargetOrgId;
    setLoadingTemplates(true);
    try {
      const query = orgId ? `?organizationId=${encodeURIComponent(orgId)}` : '';
      const res = await apiFetch(`/whatsapp/templates${query}`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.templates)) {
          setMetaTemplates(data.templates);
        }
        if (data.activeTemplate) {
          setActiveMetaTemplate(data.activeTemplate);
        }
        if (data.activeLanguage) {
          setActiveMetaLanguage(data.activeLanguage);
        }
        setIsLiveFromMeta(Boolean(data.isLiveFromMeta));
      }
    } catch (err) {
      console.warn('Failed to load templates:', err);
    } finally {
      setLoadingTemplates(false);
    }
  }, [templateTargetOrgId]);

  const handleSelectActiveTemplate = async (tmplName: string, lang = 'hi') => {
    setSavingTemplate(true);
    setError('');
    setNotice('');
    try {
      const res = await apiFetch('/whatsapp/templates/select-active', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organizationId: templateTargetOrgId || undefined,
          templateName: tmplName,
          templateLanguage: lang,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'टेम्पलेट सक्रिय नहीं हो पाया।');
      setActiveMetaTemplate(tmplName);
      setActiveMetaLanguage(lang);
      setNotice(data.message || `Meta टेम्पलेट '${tmplName}' सक्रिय कर दिया गया है।`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'टेम्पलेट सक्रिय नहीं हो पाया।');
    } finally {
      setSavingTemplate(false);
    }
  };

  const handleCreateMetaTemplate = async (e: FormEvent) => {
    e.preventDefault();
    if (!newTmplName.trim() || !newTmplBody.trim()) {
      setError('टेम्पलेट का नाम और बॉडी टेक्स्ट आवश्यक है।');
      return;
    }
    setCreatingTemplate(true);
    setError('');
    setNotice('');
    try {
      const res = await apiFetch('/whatsapp/templates/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newTmplName.trim(),
          category: newTmplCategory,
          language: newTmplLanguage,
          headerText: newTmplHeader.trim() || undefined,
          bodyText: newTmplBody.trim(),
          footerText: newTmplFooter.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'टेम्पलेट सबमिट नहीं हो पाया।');
      setNotice(data.message || 'नया Meta टेम्पलेट सबमिट कर दिया गया!');
      await loadMetaTemplates();
      setNewTmplName('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'टेम्पलेट निर्माण विफल।');
    } finally {
      setCreatingTemplate(false);
    }
  };

  const handleTestSend = async (e: FormEvent) => {
    e.preventDefault();
    if (!testPhone.trim()) {
      setError('परीक्षण हेतु मोबाइल नंबर दर्ज करें।');
      return;
    }
    setSendingTest(true);
    setTestSendResult(null);
    setError('');
    setNotice('');
    try {
      const res = await apiFetch('/whatsapp/templates/test-send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phoneNumber: testPhone.trim(),
          templateName: activeMetaTemplate,
          templateLanguage: activeMetaLanguage,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'टेस्ट मैसेज नहीं भेजा जा सका।');
      setTestSendResult({ success: true, message: data.message });
      setNotice(data.message);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'परीक्षण विफल।';
      setTestSendResult({ success: false, message: msg });
      setError(msg);
    } finally {
      setSendingTest(false);
    }
  };

  const applyPreset = (presetKey: string) => {
    const preset = partyPresets[presetKey];
    if (!preset) return;
    setTargetSlipConfig((prev) => ({
      ...prev,
      ...preset.config,
    }));
  };

  const saveClientBranding = async () => {
    if (!brandingTargetOrgId) return;
    setSavingBranding(true);
    setError('');
    setNotice('');
    try {
      const res = await apiFetch(`/admin/organizations/${encodeURIComponent(brandingTargetOrgId)}/slip-config`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slipConfig: targetSlipConfig }),
      });
      if (!res.ok) throw new Error(await getApiError(res, 'पर्ची ब्रांडिंग सुरक्षित नहीं हो सकी।'));
      setOrganizations((prev) =>
        prev.map((o) => (o.id === brandingTargetOrgId ? { ...o, slipConfig: targetSlipConfig } : o))
      );
      if (typeof window !== 'undefined') {
        localStorage.setItem('cachedSlipConfig', JSON.stringify(targetSlipConfig));
        window.dispatchEvent(new CustomEvent('slip-config-changed', { detail: targetSlipConfig }));
      }
      const org = organizations.find((o) => o.id === brandingTargetOrgId);
      setNotice(`'${org?.name || 'क्लाइंट'}' की पर्ची ब्रांडिंग सफलतापूर्वक सुरक्षित कर दी गई!`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'पर्ची ब्रांडिंग सुरक्षित नहीं हो सकी।');
    } finally {
      setSavingBranding(false);
    }
  };

  const [editingTenant, setEditingTenant] = useState<Tenant | null>(null);
  const [importing, setImporting] = useState(false);
  const [uploadingPdf, setUploadingPdf] = useState(false);
  const [pdfJobs, setPdfJobs] = useState<UploadJob[]>([]);
  const [selectedPdfFiles, setSelectedPdfFiles] = useState<File[]>([]);
  const [dictionaryStats, setDictionaryStats] = useState<DictionaryStats | null>(null);
  const [loadingDictStats, setLoadingDictStats] = useState(false);
  const [leads, setLeads] = useState<LeadRecord[]>([]);
  const [loadingLeads, setLoadingLeads] = useState(false);

  // Form states for Excel import
  const [excelWard, setExcelWard] = useState('');
  const [excelCustomWard, setExcelCustomWard] = useState('');
  const [excelIsNewWard, setExcelIsNewWard] = useState(false);
  const [excelBooth, setExcelBooth] = useState('');
  const [excelDescription, setExcelDescription] = useState('');

  // Form states for PDF import
  const [pdfWard, setPdfWard] = useState('');
  const [pdfCustomWard, setPdfCustomWard] = useState('');
  const [pdfIsNewWard, setPdfIsNewWard] = useState(false);
  const [pdfBooth, setPdfBooth] = useState('');
  const [pdfDescription, setPdfDescription] = useState('');

  // Ward Rename / Edit Modal states
  const [showRenameWardModal, setShowRenameWardModal] = useState(false);
  const [renameWardOld, setRenameWardOld] = useState('');
  const [renameWardNew, setRenameWardNew] = useState('');
  const [renamingWard, setRenamingWard] = useState(false);

  // UI enhancement states for records & import
  const [recordsSearchQuery, setRecordsSearchQuery] = useState('');
  const [importMode, setImportMode] = useState<'pdf' | 'excel'>('pdf');

  useEffect(() => {
    const token = typeof window !== 'undefined' ? window.localStorage.getItem('token') : null;
    if (token) {
      try {
        const payload = decodeJwtPayload<{
          user?: { role?: string };
        }>(token);
        if (payload?.user?.role !== 'admin') {
          window.location.href = '/';
        }
      } catch {
        window.location.href = '/login';
      }
    } else {
      window.location.href = '/login';
    }
  }, []);

  const loadOrganizations = useCallback(async () => {
    const response = await apiFetch('/admin/organizations', { cache: 'no-store' });
    if (!response.ok) throw new Error(await getApiError(response, 'क्लाइंट खाते लोड नहीं हुए।'));
    const rawData = (await response.json()) as Tenant[];
    const data = Array.from(new Map((Array.isArray(rawData) ? rawData : []).map((item) => [item.id, item])).values());
    setOrganizations(data);
    if (data.length > 0) {
      setBrandingTargetOrgId((prev) => {
        const currentValid = data.some((o) => o.id === prev);
        const selectedId = currentValid ? prev : data[0].id;
        const selectedOrg = data.find((o) => o.id === selectedId);
        if (selectedOrg) {
          setTargetSlipConfig(
            selectedOrg.slipConfig && Object.keys(selectedOrg.slipConfig).length > 0
              ? { ...defaultSlipConfig, ...selectedOrg.slipConfig }
              : { ...defaultSlipConfig }
          );
          setSelectedPreviewWard(selectedOrg.wards?.[0] || '82');
        }
        return selectedId;
      });

      setCasteSelectedOrgId((prev) => {
        const currentValid = data.some((o) => o.id === prev);
        const selectedId = currentValid ? prev : (data.find((o) => o.name?.includes('समंदर'))?.id || data[0].id);
        const selectedOrg = data.find((o) => o.id === selectedId);
        if (selectedOrg) {
          setOrgCastesList(selectedOrg.customCastes || []);
        }
        return selectedId;
      });
    }
  }, []);

  useEffect(() => {
    if (!casteSelectedOrgId) return;
    const org = organizations.find((o) => o.id === casteSelectedOrgId);
    if (org) {
      setOrgCastesList(org.customCastes || []);
    }
  }, [casteSelectedOrgId, organizations]);

  const handleAddCaste = () => {
    if (!newCasteInput.trim()) return;
    const parts = newCasteInput.split(',').map((p) => p.trim()).filter(Boolean);
    const updated = [...orgCastesList];
    for (const part of parts) {
      if (!updated.includes(part)) {
        updated.push(part);
      }
    }
    setOrgCastesList(updated);
    setNewCasteInput('');
  };

  const handleRemoveCaste = (casteToRemove: string) => {
    setOrgCastesList((prev) => prev.filter((c) => c !== casteToRemove));
  };

  const handleSaveCastes = async () => {
    if (!casteSelectedOrgId) return;
    setSavingCastes(true);
    try {
      const response = await apiFetch(`/admin/organizations/${encodeURIComponent(casteSelectedOrgId)}/custom-castes`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customCastes: orgCastesList }),
      });
      if (!response.ok) throw new Error(await getApiError(response, 'जाति सूची सेव नहीं हो सकी।'));
      const data = await response.json();
      setOrganizations((prev) =>
        prev.map((o) => (o.id === casteSelectedOrgId ? { ...o, customCastes: orgCastesList } : o))
      );
      showToast('success', data.message || 'कस्टम जातियां सफलतापूर्वक सेव कर दी गईं!');
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'जाति सूची सेव नहीं हो सकी।');
    } finally {
      setSavingCastes(false);
    }
  };

  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);

  const loadVoters = useCallback(async (page = 1, wardOverride?: string) => {
    setLoading(true);
    setError('');
    try {
      const activeWard = wardOverride !== undefined ? wardOverride : wardFilter;
      const queryParams = new URLSearchParams();
      if (organizationId) queryParams.set('organizationId', organizationId);
      if (activeWard) queryParams.set('ward', activeWard);
      queryParams.set('page', page.toString());
      queryParams.set('limit', '500'); // 500 per page
      
      const response = await apiFetch(`/admin/master-data?${queryParams.toString()}`, { cache: 'no-store' });
      if (!response.ok) throw new Error(await getApiError(response, 'मास्टर रिकॉर्ड लोड नहीं हुए।'));
      const result = await response.json() as {
        voters: AdminVoter[];
        wards?: string[];
        pagination: { total: number; page: number; pages: number };
      };
      
      if (!result.voters) throw new Error('सर्वर से रिकॉर्ड का सही उत्तर नहीं मिला।');
      
      setVoters(Array.isArray(result.voters) ? result.voters.map(attachEnglishNames) : []);
      if (Array.isArray(result.wards) && result.wards.length > 0) {
        setMasterDataWards(result.wards);
      }
      setCurrentPage(result.pagination.page);
      setTotalPages(result.pagination.pages);
      setTotalRecords(result.pagination.total);
    } catch (loadError) {
      setVoters([]);
      setError(loadError instanceof Error ? loadError.message : 'मास्टर रिकॉर्ड लोड नहीं हुए।');
    } finally {
      setLoading(false);
    }
  }, [organizationId, wardFilter]);


  const loadPdfJobs = useCallback(async () => {
    if (activeView !== 'import') return;
    try {
      const url = organizationId 
        ? `/admin/pdf/jobs?organizationId=${encodeURIComponent(organizationId)}`
        : '/admin/pdf/jobs';
      const response = await apiFetch(url, { cache: 'no-store' });
      if (response.ok) {
        const rawJobs = await response.json() as UploadJob[];
        const seen = new Set<string>();
        const uniqueJobs = rawJobs.filter((job) => {
          const timeBucket = Math.floor(new Date(job.uploadedAt).getTime() / 20000);
          const key = `${job.filename}_${job.wardNo || ''}_${job.extractedCount}_${timeBucket}`;
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });
        setPdfJobs(uniqueJobs);
      }
    } catch {
      // ignore silently
    }
  }, [organizationId, activeView]);

  const deletePdfJob = async (jobId: string) => {
    try {
      await apiFetch(`/admin/pdf/jobs/${jobId}`, { method: 'DELETE' });
      setPdfJobs((prev) => prev.filter((j) => j.id !== jobId));
      showToast('info', 'जॉब रिकॉर्ड हटा दिया गया।');
    } catch {
      // ignore silently
    }
  };

  const loadDictionaryStats = useCallback(async () => {
    try {
      setLoadingDictStats(true);
      const response = await apiFetch('/admin/pdf/dictionary-stats', { cache: 'no-store' });
      if (response.ok) {
        setDictionaryStats(await response.json() as DictionaryStats);
      }
    } catch {
      // ignore silently
    } finally {
      setLoadingDictStats(false);
    }
  }, []);

  const detectWardFromFilename = (name: string): string | null => {
    const match = name.match(/(?:ward|वार्ड|w)[\s_\-]*0*(\d+)/i);
    return match ? match[1] : null;
  };

  const loadLeads = useCallback(async () => {
    setLoadingLeads(true);
    try {
      const res = await apiFetch('/admin/leads', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json() as LeadRecord[];
        setLeads(data);
      }
    } catch (err) {
      console.error('Failed to load leads:', err);
    } finally {
      setLoadingLeads(false);
    }
  }, []);

  const updateLeadStatus = async (id: string, status: string) => {
    try {
      const res = await apiFetch(`/admin/leads/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        setLeads((prev) => prev.map((l) => l._id === id ? { ...l, status: status as LeadRecord['status'] } : l));
        setNotice('लीड स्थिति अपडेट हो गई।');
      }
    } catch {
      setError('लीड अपडेट नहीं हो सकी।');
    }
  };

  const deleteLead = async (id: string, name: string) => {
    if (!window.confirm(`क्या आप "${name}" की पूछताछ रिकॉर्ड को हटाना चाहते हैं?`)) return;
    try {
      const res = await apiFetch(`/admin/leads/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setLeads((prev) => prev.filter((l) => l._id !== id));
        setNotice('लीड सफलतापूर्वक डिलीट कर दी गई।');
      }
    } catch {
      setError('लीड हटाई नहीं जा सकी।');
    }
  };

  const handleDemoSort = (field: string) => {
    setDemoSort((prev) => ({
      field,
      direction: prev.field === field && prev.direction === 'asc' ? 'desc' : 'asc',
    }));
  };

  const handleRecordsSort = (field: string) => {
    setRecordsSort((prev) => ({
      field,
      direction: prev.field === field && prev.direction === 'asc' ? 'desc' : 'asc',
    }));
  };

  const loadDemoUsers = useCallback(async () => {
    setDemoLoading(true);
    try {
      const res = await apiFetch('/admin/demo-users');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) setDemoUsers(data);
      }
    } catch (e) {
      console.error('Failed to load demo users', e);
    } finally {
      setDemoLoading(false);
    }
  }, []);

  const createDemoUser = async (e: FormEvent) => {
    e.preventDefault();
    setDemoGenerating(true);
    setError('');
    setNotice('');
    try {
      const res = await apiFetch('/admin/demo-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientName: demoClientName.trim(),
          customEmail: demoCustomEmail.trim(),
          customPassword: demoCustomPassword.trim(),
          targetOrgId: demoTargetOrgId,
        }),
      });
      if (!res.ok) throw new Error(await getApiError(res, 'डेमो खाता नहीं बन सका।'));
      const result = await res.json();
      setNotice(result.message || 'नया डेमो यूज़र व सैंपल मतदाताओं का डेटा तैयार हो गया!');
      if (result.demoUser) {
        setLatestGenerated(result.demoUser);
      }
      setDemoClientName('');
      setDemoCustomEmail('');
      setDemoCustomPassword('');
      setDemoTargetOrgId('new');
      await loadDemoUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'डेमो खाता नहीं बन सका।');
    } finally {
      setDemoGenerating(false);
    }
  };

  const toggleDemoSuspend = async (orgId: string) => {
    setError('');
    setNotice('');
    try {
      const res = await apiFetch(`/admin/demo-users/${encodeURIComponent(orgId)}/toggle-suspend`, {
        method: 'PUT',
      });
      if (!res.ok) throw new Error(await getApiError(res, 'स्टेटस अपडेट नहीं हो पाया।'));
      const result = await res.json();
      setNotice(result.message);
      await loadDemoUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'स्टेटस अपडेट नहीं हो पाया।');
    }
  };

  const deleteDemoUser = async (orgId: string) => {
    if (!window.confirm('क्या आप सचमुच इस डेमो खाते और इसके सभी डेटा को हटाना चाहते हैं?')) return;
    setError('');
    setNotice('');
    try {
      const res = await apiFetch(`/admin/demo-users/${encodeURIComponent(orgId)}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error(await getApiError(res, 'डेमो खाता डिलीट नहीं हो सका।'));
      const result = await res.json();
      setNotice(result.message);
      if (latestGenerated?.id === orgId) setLatestGenerated(null);
      await loadDemoUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'डेमो खाता डिलीट नहीं हो सका।');
    }
  };

  const copyDemoCredentials = (email: string, pass: string, id: string) => {
    const isLocal = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
    const portalUrl = typeof window !== 'undefined' && window.location.origin && !isLocal
      ? `${window.location.origin}/login`
      : 'https://vijaysetu.vercel.app/login';
    const text = `विजयसेतु डेमो पोर्टल:\nलॉगिन लिंक: ${portalUrl}\nआईडी / ईमेल: ${email}\nपासवर्ड: ${pass}\nसहायता संपर्क: Roots Reach Media (+91 72310 77770)`;
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setNotice('डेमो क्रेडेंशियल्स कॉपी हो गए!');
    setTimeout(() => setCopiedId(null), 3000);
  };

  const shareDemoWhatsApp = (email: string, pass: string, name: string) => {
    const isLocal = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
    const portalUrl = typeof window !== 'undefined' && window.location.origin && !isLocal
      ? `${window.location.origin}/login`
      : 'https://vijaysetu.vercel.app/login';
    const msg = `*नमस्ते ${name}!*\n\nआपका *VijaySetu (विजयसेतु)* इलेक्शन मैनेजमेंट डेमो पोर्टल तैयार है:\n\n🔗 *लॉगिन लिंक:* ${portalUrl}\n📧 *आईडी / ईमेल:* ${email}\n🔑 *पासवर्ड:* ${pass}\n\nपोर्टल में 25 सैंपल मतदाताओं का डेटा, 1-सेकंड पर्ची जनरेटर, लाइव पोल-डेस्क व जातिगत समीकरण पहले से सक्रिय हैं।\n\nकिसी भी सहायता के लिए संपर्क करें:\n*Roots Reach Media* - 📞 +91 72310 77770`;
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
  };

  const sortedDemoUsers = useMemo(() => {
    const list = [...demoUsers];
    list.sort((a, b) => {
      let cmp = 0;
      if (demoSort.field === 'name') {
        cmp = (a.name || '').localeCompare(b.name || '', 'hi-IN');
      } else if (demoSort.field === 'voterCount') {
        cmp = (a.voterCount || 0) - (b.voterCount || 0);
      } else if (demoSort.field === 'status') {
        cmp = a.isActive === b.isActive ? 0 : a.isActive ? -1 : 1;
      } else {
        cmp = new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
      }
      return demoSort.direction === 'asc' ? cmp : -cmp;
    });
    return list;
  }, [demoUsers, demoSort]);

  const loadDashboardStats = useCallback(async () => {
    setDashboardLoading(true);
    try {
      const res = await apiFetch(`/admin/dashboard-stats?orgId=${organizationId || 'all'}`);
      if (res.ok) {
        const data = await res.json() as { stats?: DashboardStats };
        if (data?.stats) {
          setDashboardStats(data.stats);
          if (data.stats.settings) {
            setSystemSettings(data.stats.settings);
            if (typeof window !== 'undefined') {
              localStorage.setItem('sys_hide_part_no', String(data.stats.settings.hidePartNo !== false));
            }
          }
        }
      }
    } catch (err) {
      console.error('Failed to load dashboard stats:', err);
    } finally {
      setDashboardLoading(false);
    }
  }, [organizationId]);

  const toggleSystemSetting = async (key: string, val?: any) => {
    const currentVal = (systemSettings as any)[key];
    const nextVal = val !== undefined ? val : !currentVal;
    const nextSettings = { ...systemSettings, [key]: nextVal };
    setSystemSettings(nextSettings);
    if (key === 'hidePartNo' && typeof window !== 'undefined') {
      localStorage.setItem('sys_hide_part_no', String(nextVal));
    }
    setSavingSettings(true);
    try {
      const targetOrgId = organizationId && organizationId !== 'all' ? organizationId : organizations[0]?.id;
      if (targetOrgId) {
        await apiFetch(`/admin/organizations/${targetOrgId}/settings`, {
          method: 'PUT',
          body: JSON.stringify({ settings: nextSettings }),
        });
        showToast('success', 'सेटिंग्स सफलतापूर्वक अपडेट की गईं।', 'अपडेट सफल');
      } else {
        showToast('success', 'सेटिंग्स सुरक्षित की गईं।');
      }
    } catch (err) {
      showToast('error', 'सेटिंग्स सुरक्षित करने में त्रुटि आई।');
    } finally {
      setSavingSettings(false);
    }
  };

  const toggleWhatsAppForOrg = async () => {
    const targetOrgId = organizationId && organizationId !== 'all' ? organizationId : organizations[0]?.id;
    if (!targetOrgId) {
      showToast('error', 'कृपया पहले एक संगठन चुनें।');
      return;
    }
    const targetOrg = organizations.find((o) => o.id === targetOrgId);
    const currentEnabled = dashboardStats?.activeOrg?.whatsappEnabled !== undefined 
      ? dashboardStats.activeOrg.whatsappEnabled 
      : (targetOrg?.whatsappEnabled !== false);
    const nextVal = !currentEnabled;
    setSavingSettings(true);
    try {
      const res = await apiFetch(`/admin/organizations/${targetOrgId}/whatsapp-credits`, {
        method: 'PUT',
        body: JSON.stringify({ enabled: nextVal }),
      });
      if (res.ok) {
        showToast('success', `WhatsApp सेवा ${nextVal ? 'सक्रिय' : 'निष्क्रिय'} कर दी गई।`, 'अपडेट सफल');
        await Promise.all([loadDashboardStats(), loadOrganizations()]);
      }
    } catch {
      showToast('error', 'WhatsApp स्थिति अपडेट नहीं हो सकी।');
    } finally {
      setSavingSettings(false);
    }
  };

  const toggleModuleForOrg = async (moduleKey: string) => {
    const targetOrgId = organizationId && organizationId !== 'all' ? organizationId : organizations[0]?.id;
    const targetOrg = organizations.find((o) => o.id === targetOrgId);
    if (!targetOrg) {
      showToast('error', 'कृपया एक संगठन चुनें।');
      return;
    }
    const currentModules: string[] = dashboardStats?.activeOrg?.enabledModules || targetOrg.modules || targetOrg.enabledModules || moduleOptions.map(([k]) => k);
    const nextModules = currentModules.includes(moduleKey)
      ? currentModules.filter((m: string) => m !== moduleKey)
      : [...currentModules, moduleKey];

    setSavingSettings(true);
    try {
      const res = await apiFetch(`/admin/organizations/${targetOrg.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          name: targetOrg.name,
          enabledModules: nextModules,
        }),
      });
      if (res.ok) {
        showToast('success', 'मॉड्यूल अनुमति सफलतापूर्वक अपडेट की गई।');
        await Promise.all([loadDashboardStats(), loadOrganizations()]);
      }
    } catch {
      showToast('error', 'मॉड्यूल अपडेट विफल रहा।');
    } finally {
      setSavingSettings(false);
    }
  };

  const loadPageData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      if (activeView === 'dashboard') await Promise.all([loadOrganizations(), loadDashboardStats()]);
      else if (activeView === 'records') await Promise.all([loadOrganizations(), loadVoters()]);
      else if (activeView === 'demo') await loadDemoUsers();
      else if (activeView === 'leads') await loadLeads();
      else if (activeView === 'templates') {
        await Promise.all([loadOrganizations(), loadMetaTemplates(), loadMetaConfig()]);
      } else if (activeView === 'tenants' || activeView === 'castes' || activeView === 'branding' || activeView === 'users' || activeView === 'import' || activeView === 'export') {
        await loadOrganizations();
        await loadPdfJobs();
        if (activeView === 'import') {
          await loadDictionaryStats();
        }
      }
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'एडमिन जानकारी लोड नहीं हुई।');
    } finally {
      setLoading(false);
    }
  }, [activeView, loadOrganizations, loadVoters, loadPdfJobs, loadDictionaryStats, loadLeads, loadDemoUsers, loadMetaTemplates, loadMetaConfig, loadDashboardStats]);

  useEffect(() => { void Promise.resolve().then(() => loadPageData()); }, [loadPageData]);
  useEffect(() => { void loadLeads(); }, [loadLeads]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (activeView === 'import') {
      void loadDictionaryStats();
      interval = setInterval(() => void loadPdfJobs(), 3000);
    }
    return () => clearInterval(interval);
  }, [activeView, loadPdfJobs, loadDictionaryStats]);

  const selectedTenant = useMemo(
    () => organizations.find((t) => t.id === organizationId),
    [organizations, organizationId],
  );

  // Auto-fetch complete wards summary whenever organizationId changes
  useEffect(() => {
    if (organizationId) {
      apiFetch(`/voters/wards-summary?organizationId=${encodeURIComponent(organizationId)}`, {
        headers: { 'x-organization-id': organizationId },
        cache: 'no-store',
      })
        .then(async (res) => {
          if (res.ok) {
            const data = await res.json();
            const wList = (data.wards || []).map((w: { _id: string }) => String(w._id).trim()).filter(Boolean);
            if (wList.length > 0) {
              setClientWardsSummary(wList);
            }
          }
        })
        .catch(() => {});
    } else {
      setClientWardsSummary([]);
    }
  }, [organizationId]);

  const availableWards = useMemo(() => {
    const orgWards = selectedTenant?.wards || [];
    const set = new Set<string>([...orgWards, ...masterDataWards, ...clientWardsSummary]);
    voters
      .filter((voter) => !organizationId || voter.organizationId === organizationId)
      .forEach((v) => v.wardNo && set.add(String(v.wardNo).trim()));
    return Array.from(set).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  }, [selectedTenant, masterDataWards, clientWardsSummary, voters, organizationId]);

  const wards = useMemo(() => {
    const set = new Set<string>();
    (selectedTenant?.wards || []).forEach((w) => w && set.add(String(w).trim()));
    masterDataWards.forEach((w) => w && set.add(String(w).trim()));
    clientWardsSummary.forEach((w) => w && set.add(String(w).trim()));
    voters.forEach((v) => v.wardNo && set.add(String(v.wardNo).trim()));
    return Array.from(set).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  }, [selectedTenant, masterDataWards, clientWardsSummary, voters]);

  const filteredVoters = useMemo(() => {
    let list = wardFilter ? voters.filter((voter) => voter.wardNo === wardFilter) : voters;
    if (recordsSearchQuery.trim()) {
      const q = recordsSearchQuery.trim();
      list = list.filter((v) => matchesVoterQuery(q, v));
    }
    return list;
  }, [voters, wardFilter, recordsSearchQuery]);

  const visibleVoters = useMemo(() => {
    const list = [...filteredVoters];
    list.sort((a, b) => {
      let cmp = 0;
      if (recordsSort.field === 'serialNo') {
        cmp = (Number(a.serialNo) || 0) - (Number(b.serialNo) || 0);
      } else if (recordsSort.field === 'name') {
        const nameA = (a.nameHi || a.nameEn || '').trim();
        const nameB = (b.nameHi || b.nameEn || '').trim();
        cmp = nameA.localeCompare(nameB, 'hi-IN');
      } else if (recordsSort.field === 'wardNo') {
        cmp = (a.wardNo || '').localeCompare(b.wardNo || '', undefined, { numeric: true });
      } else if (recordsSort.field === 'partNo') {
        cmp = (a.partNo || '').localeCompare(b.partNo || '', undefined, { numeric: true });
      }
      return recordsSort.direction === 'asc' ? cmp : -cmp;
    });
    return list;
  }, [filteredVoters, recordsSort]);

  const downloadExcel = async (path: string, fallback: string, filename: string) => {
    setSaving(true);
    setError('');
    try {
      const response = await apiFetch(path);
      if (!response.ok) throw new Error(await getApiError(response, fallback));
      await downloadBlob(await response.blob(), filename);
    } catch (downloadError) {
      setError(downloadError instanceof Error ? downloadError.message : fallback);
    } finally {
      setSaving(false);
    }
  };

  const createTenant = async (event?: FormEvent<HTMLFormElement>) => {
    if (event) event.preventDefault();

    // Instant Client-side validation with immediate Toast Pop-up
    if (!tenantName.trim()) {
      showToast('error', 'कृपया क्लाइंट या संगठन का नाम दर्ज करें।', 'नाम आवश्यक है');
      setError('कृपया क्लाइंट या संगठन का नाम दर्ज करें।');
      return;
    }
    if (!tenantEmail.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(tenantEmail.trim())) {
      showToast('error', 'कृपया वैध क्लाइंट एडमिन ईमेल दर्ज करें (उदा. admin@party.com)।', 'ईमेल अमान्य है');
      setError('कृपया वैध क्लाइंट एडमिन ईमेल दर्ज करें।');
      return;
    }
    if (!tenantPassword || tenantPassword.length < 8) {
      showToast('error', 'सुरक्षा कारणों से पासवर्ड कम-से-कम 8 अक्षरों का होना अनिवार्य है।', 'पासवर्ड 8+ अक्षर रखें');
      setError('पासवर्ड कम-से-कम 8 अक्षरों का होना अनिवार्य है।');
      return;
    }
    if (tenantModules.length === 0) {
      showToast('error', 'कृपया क्लाइंट के लिए कम-से-कम 1 फीचर/मॉड्यूल चुनें।', 'मॉड्यूल चुनें');
      setError('कृपया कम-से-कम 1 फीचर/मॉड्यूल चुनें।');
      return;
    }

    setSaving(true);
    setError('');
    setNotice('');
    const orgName = tenantName.trim();
    const adminEmail = tenantEmail.trim().toLowerCase();
    const plainPassword = tenantPassword;
    const assignedWards = tenantWards.split(',').map((ward) => ward.trim()).filter(Boolean);
    const credits = Number.parseInt(tenantWhatsappCredits, 10) || 500;

    try {
      const response = await apiFetch('/admin/organizations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: orgName,
          email: adminEmail,
          password: plainPassword,
          modules: tenantModules,
          wards: assignedWards,
          whatsappEnabled: tenantWhatsappEnabled,
          whatsappCredits: credits,
          slipConfig: tenantSlipConfig,
          district: tenantDistrict.trim(),
          ulbPanchayatSamiti: tenantUlbPanchayat.trim(),
          ulbWardGramPanchayat: tenantUlbWardGram.trim(),
        }),
      });
      if (!response.ok) throw new Error(await getApiError(response, 'क्लाइंट खाता नहीं बन सका।'));

      const resData = await response.json().catch(() => ({}));
      const successMsg = resData.message || `'${orgName}' क्लाइंट और उसका एडमिन अकाउंट बना दिया गया।`;

      // Trigger Celebration Modal Pop-up
      const newClientRecord: CreatedClientDetails = {
        name: orgName,
        email: adminEmail,
        password: plainPassword,
        modules: [...tenantModules],
        wards: assignedWards,
        whatsappCredits: credits,
        district: tenantDistrict.trim(),
        ulbPanchayatSamiti: tenantUlbPanchayat.trim(),
        ulbWardGramPanchayat: tenantUlbWardGram.trim(),
      };
      setCreatedClientInfo(newClientRecord);
      setRecentCreatedClient(newClientRecord);

      // Trigger Floating Toast Pop-up
      showToast('success', successMsg, '🎉 नया क्लाइंट तैयार!');
      setNotice(successMsg);

      // Close modal if open
      setIsCreateClientModalOpen(false);

      setTenantName('');
      setTenantEmail('');
      setTenantPassword('');
      setTenantWards('');
      setTenantDistrict('');
      setTenantUlbPanchayat('');
      setTenantUlbWardGram('');
      setTenantWhatsappCredits('500');
      setTenantSlipConfig({
        candidateName: '',
        candidateNameEn: '',
        partyName: '',
        partySymbolName: 'कमल का फूल',
        partySymbolImage: '',
        candidateImage: '',
        evmNumber: '1',
        appealHeadline: '(1 नंबर पर बटन दबाएं)',
        appealText: '',
        subTitle: '',
        footerAppeal: '',
        pollingStationFallback: '',
      });
      await loadOrganizations();
    } catch (createError) {
      const errMsg = createError instanceof Error ? createError.message : 'क्लाइंट खाता नहीं बन सका।';
      setError(errMsg);
      showToast('error', errMsg, '❌ क्लाइंट नहीं बन सका');
    } finally {
      setSaving(false);
    }
  };

  const updateTenant = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editingTenant) return;
    setSaving(true);
    setError('');
    setNotice('');
    try {
      const response = await apiFetch(`/admin/organizations/${encodeURIComponent(editingTenant.id)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editingTenant.name,
          modules: editingTenant.modules,
          wards: editingTenant.wards,
          isActive: editingTenant.isActive,
          whatsappEnabled: editingTenant.whatsappEnabled ?? true,
          whatsappCredits: editingTenant.whatsappCredits ?? 0,
          slipConfig: editingTenant.slipConfig || {},
          district: editingTenant.district || '',
          ulbPanchayatSamiti: editingTenant.ulbPanchayatSamiti || '',
          ulbWardGramPanchayat: editingTenant.ulbWardGramPanchayat || '',
          customCastes: editingTenant.customCastes || [],
        }),
      });
      if (!response.ok) throw new Error(await getApiError(response, 'क्लाइंट सेटिंग सेव नहीं हुई।'));
      setNotice('क्लाइंट के फीचर और वार्ड access अपडेट हुए।');
      if (typeof window !== 'undefined' && editingTenant.slipConfig) {
        localStorage.setItem('cachedSlipConfig', JSON.stringify(editingTenant.slipConfig));
        window.dispatchEvent(new CustomEvent('slip-config-changed', { detail: editingTenant.slipConfig }));
      }
      setEditingTenant(null);
      await loadOrganizations();
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : 'क्लाइंट सेटिंग सेव नहीं हुई।');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteOrganization = async () => {
    if (!deletingTenant) return;
    setIsDeletingClient(true);
    setError('');
    setNotice('');
    try {
      const response = await apiFetch(`/admin/organizations/${encodeURIComponent(deletingTenant.id)}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error(await getApiError(response, 'क्लाइंट डिलीट नहीं हो सका।'));

      if (typeof window !== 'undefined') {
        const activeOrg = localStorage.getItem('activeOrganizationId');
        if (activeOrg === deletingTenant.id) {
          localStorage.removeItem('activeOrganizationId');
          localStorage.removeItem('activeOrganizationName');
          window.dispatchEvent(new Event('organization-changed'));
        }
      }

      setNotice(`'${deletingTenant.name}' और उसका सारा डेटा (मतदाता, कार्यकर्ता, पर्चियां) सफलतापूर्वक डिलीट कर दिया गया।`);
      setDeletingTenant(null);
      setDeleteConfirmText('');
      if (editingTenant?.id === deletingTenant.id) {
        setEditingTenant(null);
      }
      await loadOrganizations();
    } catch (delError) {
      setError(delError instanceof Error ? delError.message : 'क्लाइंट डिलीट नहीं हो सका।');
    } finally {
      setIsDeletingClient(false);
    }
  };

  const importWorkbook = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const file = form.querySelector<HTMLInputElement>('input[type="file"]')?.files?.[0];
    if (!file || !organizationId) {
      setError('क्लाइंट चुनें और Excel workbook अपलोड करें।');
      return;
    }
    const targetWard = (excelIsNewWard ? excelCustomWard : excelWard).trim();
    const MAX_SIZE = 100 * 1024 * 1024; // 100MB
    if (file.size > MAX_SIZE) {
      setError(`चयनित Excel फाइल (${(file.size / (1024 * 1024)).toFixed(1)}MB) 100MB की सीमा से बड़ी है। कृपया 100MB से छोटी फाइल अपलोड करें।`);
      return;
    }
    setImporting(true);
    setError('');
    setNotice(`Excel फाइल अपलोड हो रही है (${(file.size / (1024 * 1024)).toFixed(1)}MB)...`);
    try {
      const body = new FormData();
      body.set('organizationId', organizationId);
      body.set('file', file);
      if (targetWard) body.set('wardNo', targetWard);
      if (excelBooth.trim()) body.set('boothNo', excelBooth.trim());
      if (excelDescription.trim()) body.set('listDescription', excelDescription.trim());

      const response = await apiFetch('/admin/upload-voters', { method: 'POST', body });
      if (!response.ok) throw new Error(await getApiError(response, 'मतदाता Excel import नहीं हुआ।'));
      const result = await response.json() as { inserted: number; updated: number };
      setNotice(`${result.inserted} नए और ${result.updated} अपडेटेड मतदाता Excel से सेव हुए।` + (targetWard ? ` (वार्ड: ${targetWard})` : ''));
      form.reset();
      setExcelDescription('');
      setExcelBooth('');
      if (excelIsNewWard) {
        setExcelIsNewWard(false);
        setExcelCustomWard('');
      }
      await loadOrganizations();
      await loadPdfJobs();
      if (activeView === 'records') await loadVoters();
    } catch (importError) {
      setError(importError instanceof Error ? importError.message : 'मतदाता Excel import नहीं हुआ।');
      setNotice('');
    } finally {
      setImporting(false);
    }
  };

  const handleRenameWard = async (e?: FormEvent) => {
    if (e) e.preventDefault();
    if (!organizationId) {
      setError('कृपया पहले क्लाइंट चुनें।');
      return;
    }
    if (!renameWardOld.trim() || !renameWardNew.trim()) {
      setError('कृपया वर्तमान और नया वार्ड नाम दोनों चुनें/दर्ज करें।');
      return;
    }
    if (renameWardOld.trim() === renameWardNew.trim()) {
      setError('पुराना और नया वार्ड नाम समान हैं।');
      return;
    }

    setRenamingWard(true);
    setError('');
    try {
      const response = await apiFetch('/admin/wards/rename', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organizationId,
          oldWard: renameWardOld.trim(),
          newWard: renameWardNew.trim(),
        }),
      });

      if (!response.ok) {
        throw new Error(await getApiError(response, 'वार्ड का नाम अपडेट नहीं हो सका।'));
      }

      const data = await response.json() as { message?: string, totalModifiedVoters?: number };
      setNotice(data.message || `वार्ड "${renameWardOld}" का नाम बदलकर "${renameWardNew}" कर दिया गया!`);
      
      const oldW = renameWardOld.trim();
      const newW = renameWardNew.trim();
      
      if (wardFilter === oldW) setWardFilter(newW);
      if (pdfWard === oldW) setPdfWard(newW);
      if (excelWard === oldW) setExcelWard(newW);

      setShowRenameWardModal(false);
      setRenameWardOld('');
      setRenameWardNew('');

      await Promise.all([
        loadOrganizations(),
        loadVoters(1, newW),
      ]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'वार्ड का नाम अपडेट करने में विफलता।');
    } finally {
      setRenamingWard(false);
    }
  };

  const uploadPdf = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    if (selectedPdfFiles.length === 0 || !organizationId) {
      setError('कृपया कम से कम एक PDF फाइल चुनें और क्लाइंट चुनें।');
      return;
    }
    const targetWard = (pdfIsNewWard ? pdfCustomWard : pdfWard).trim();
    const MAX_SIZE = 100 * 1024 * 1024; // 100MB
    const oversized = selectedPdfFiles.find((f) => f.size > MAX_SIZE);
    if (oversized) {
      setError(`चयनित PDF फाइल "${oversized.name}" (${(oversized.size / (1024 * 1024)).toFixed(1)}MB) 100MB की सीमा से बड़ी है। कृपया फाइल कंप्रेस करें या 100MB से छोटी PDF चुनें।`);
      return;
    }
    setUploadingPdf(true);
    setError('');
    const totalMb = (selectedPdfFiles.reduce((acc, f) => acc + f.size, 0) / (1024 * 1024)).toFixed(1);
    setNotice(`${selectedPdfFiles.length} PDF फाइल(ें) अपलोड हो रही हैं (कुल ${totalMb}MB)... कृपया प्रतीक्षा करें।`);
    try {
      const body = new FormData();
      body.set('organizationId', organizationId);
      selectedPdfFiles.forEach((file) => {
        body.append('pdf', file);
      });
      if (targetWard) body.set('wardNo', targetWard);
      if (pdfBooth.trim()) body.set('boothNo', pdfBooth.trim());
      if (pdfDescription.trim()) body.set('listDescription', pdfDescription.trim());
      
      const useOcrCheckbox = form.querySelector<HTMLInputElement>('input[name="useOcr"]');
      if (useOcrCheckbox?.checked) {
        body.set('useOcr', 'true');
      }

      const response = await apiFetch('/admin/pdf/upload', { method: 'POST', body });
      if (!response.ok) throw new Error(await getApiError(response, 'PDF अपलोड नहीं हुई।'));
      const result = await response.json() as { message?: string, extractedCount?: number, backgroundProcessing?: boolean };
      if (result.backgroundProcessing) {
        setNotice(result.message || `${selectedPdfFiles.length} PDF फाइलें बैकग्राउंड में प्रोसेस हो रही हैं!` + (targetWard ? ` (वार्ड: ${targetWard})` : ''));
      } else {
        setNotice(`${result.extractedCount ?? 0} Voter IDs सफलता पूर्वक PDF से निकाले गए।`);
      }
      form.reset();
      setSelectedPdfFiles([]);
      setPdfDescription('');
      setPdfBooth('');
      if (pdfIsNewWard) {
        setPdfIsNewWard(false);
        setPdfCustomWard('');
      }
      await loadOrganizations();
      await loadPdfJobs();
      await loadDictionaryStats();
    } catch (importError) {
      setError(importError instanceof Error ? importError.message : 'PDF अपलोड नहीं हुई।');
      setNotice('');
    } finally {
      setUploadingPdf(false);
    }
  };
  const bulkDeleteVoters = async () => {
    if (!organizationId) {
      setError('डिलीट करने के लिए पहले क्लाइंट चुनें।');
      return;
    }
    const message = wardFilter 
      ? `क्या आप क्लाइंट के वार्ड ${wardFilter} का सारा डेटा डिलीट करना चाहते हैं?` 
      : 'क्या आप इस क्लाइंट का सारा वोटर डेटा डिलीट करना चाहते हैं?';
    
    if (!window.confirm(message)) return;

    setLoading(true);
    setError('');
    setNotice('');
    try {
      const query = `organizationId=${encodeURIComponent(organizationId)}&wardNo=${encodeURIComponent(wardFilter)}`;
      const response = await apiFetch(`/admin/master-data?${query}`, { method: 'DELETE' });
      if (!response.ok) throw new Error(await getApiError(response, 'डेटा डिलीट नहीं हुआ।'));
      const result = await response.json() as { deletedCount: number };
      setNotice(`${result.deletedCount} रिकॉर्ड्स सफलतापूर्वक डिलीट हो गए।`);
      await loadVoters();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'डेटा डिलीट नहीं हुआ।');
    } finally {
      setLoading(false);
    }
  };

  const toggleModule = (module: string) => {
    setTenantModules((current) => current.includes(module)
      ? current.filter((item) => item !== module)
      : [...current, module]);
  };

  return (
    <>
      <div className="work-page">
        <div className="page-intro">
          <div>
            <div className="eyebrow-label"><span className="eyebrow-mark" /> PLATFORM ADMINISTRATION</div>
            <h1>एडमिन पैनल</h1>
            <p>क्लाइंट, उनके डेटा, उपलब्ध फीचर और सिस्टम सेवाएँ एक ही डैशबोर्ड से नियंत्रित करें।</p>
          </div>
          <div className="feature-actions">
            <button className="button-secondary" type="button" onClick={() => void loadPageData()} disabled={loading || saving}>
              {loading ? <LoaderCircle size={15} className="spin" /> : <RefreshCw size={15} />} रिफ्रेश
            </button>
          </div>
        </div>

        <nav className="admin-tabs" aria-label="एडमिन सेक्शन">
          {([
            { key: 'dashboard', label: 'डैशबोर्ड एवं सेटिंग्स', Icon: LayoutDashboard },
            { key: 'tenants', label: 'क्लाइंट व संगठन', Icon: UsersRound },
            { key: 'castes', label: 'जाति प्रबंधन (Caste Config)', Icon: Tag },
            { key: 'demo', label: `डेमो यूज़र जनरेटर ${demoUsers.length > 0 ? `(${demoUsers.length})` : ''}`, Icon: KeyRound },
            { key: 'branding', label: 'पर्ची ब्रांडिंग', Icon: Ticket },
            { key: 'templates', label: 'Meta टेम्पलेट मैनेजमेंट', Icon: MessageSquareCode },
            { key: 'leads', label: `लीड्स व पूछताछ ${leads.length > 0 ? `(${leads.length})` : ''}`, Icon: MessageCircle },
            { key: 'records', label: 'वोटर डेटा', Icon: FileSpreadsheet },
            { key: 'users', label: 'सभी अकाउंट', Icon: UserPlus },
            { key: 'import', label: 'डेटा इम्पोर्ट', Icon: Upload },
            { key: 'export', label: 'डेटा एक्सपोर्ट', Icon: Download },
          ] as const).map(({ key, label, Icon }) => (
            <button className={`admin-tab ${activeView === key ? 'is-active' : ''}`} key={key} type="button" onClick={() => { setActiveView(key); setError(''); }}>
              <Icon size={15} /> {label}
            </button>
          ))}
        </nav>

        {notice && (
          <div className="inline-notice" role="status" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Check size={15} /> {notice}
            </div>
            <button type="button" onClick={() => setNotice('')} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: 'inherit' }} title="हटाएं">
              <X size={14} />
            </button>
          </div>
        )}
        {error && (
          <div className="inline-notice error-notice" role="alert" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <AlertCircle size={15} /> {error}
            </div>
            <button type="button" onClick={() => setError('')} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: 'inherit' }} title="हटाएं">
              <X size={14} />
            </button>
          </div>
        )}

        {activeView === 'dashboard' && (
          <>
            {/* Top Command Toolbar */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '12px',
              padding: '16px 20px',
              background: 'linear-gradient(135deg, #f0fdf4 0%, #ffffff 100%)',
              border: '1px solid #bbf7d0',
              borderRadius: '12px',
              marginBottom: '20px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '12px',
                  fontWeight: 700,
                  padding: '4px 10px',
                  borderRadius: '20px',
                  background: '#dcfce7',
                  color: '#15803d',
                  border: '1px solid #86efac'
                }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#22c55e', display: 'inline-block' }} />
                  सिस्टम सक्रिय • 100% EC समरी सत्यापित
                </span>
                <span style={{ fontSize: '13px', color: '#475569', fontWeight: 500 }}>
                  समस्त वार्डों, मतदाताओं एवं सिस्टम सेटिंग्स का केंद्रीय नियंत्रण
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <label style={{ fontSize: '13px', fontWeight: 600, color: '#334155' }}>संगठन:</label>
                <select
                  value={organizationId}
                  onChange={(e) => {
                    setOrganizationId(e.target.value);
                  }}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '13px',
                    fontWeight: 600,
                    background: '#ffffff'
                  }}
                >
                  <option value="">सभी संगठन (समग्र डेटा)</option>
                  {organizations.map((org) => (
                    <option key={org.id} value={org.id}>{org.name}</option>
                  ))}
                </select>
                <button
                  type="button"
                  className="button-secondary"
                  onClick={() => void loadDashboardStats()}
                  disabled={dashboardLoading}
                  style={{ padding: '6px 12px', fontSize: '13px' }}
                >
                  {dashboardLoading ? <LoaderCircle size={14} className="spin" /> : <RefreshCw size={14} />} रिफ्रेश
                </button>
              </div>
            </div>

            {/* Feature Metrics - 4 Primary Cards */}
            <section className="feature-metrics">
              <article className="metric-card">
                <span>कुल पंजीकृत मतदाता</span>
                <strong>{dashboardStats?.totalVoters ? dashboardStats.totalVoters.toLocaleString('hi-IN') : organizations.reduce((sum, t) => sum + t.voterCount, 0).toLocaleString('hi-IN')}</strong>
                <small>पुरुष: {dashboardStats?.maleCount || 0} • महिला: {dashboardStats?.femaleCount || 0}</small>
              </article>
              <article className="metric-card metric-card-green">
                <span>सक्रिय वार्ड संख्या</span>
                <strong>{dashboardStats?.totalWards || (organizations[0]?.wards?.length || 23)}</strong>
                <small>आयोग समरी अनुसार 100% सत्यापित</small>
              </article>
              <article className="metric-card">
                <span>सक्रिय क्लाइंट व संगठन</span>
                <strong>{organizations.length.toLocaleString('hi-IN')}</strong>
                <small>चुनावी अभियान व डिजिटल टीमें</small>
              </article>
              <article className="metric-card">
                <span>सक्रिय फील्ड कार्यकर्ता</span>
                <strong>{dashboardStats?.totalWorkers || organizations.reduce((sum, t) => sum + (t.activeWorkers || 0), 0)}</strong>
                <small>वार्ड व पोल-डेस्क कार्यकर्ता</small>
              </article>
            </section>

            {/* CRITICAL SYSTEM TOGGLES & REAL FEATURE CONTROLS */}
            <section className="records-panel" style={{ padding: '24px', marginBottom: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
                <div>
                  <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#1a2620', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
                    <Sliders size={20} color="#059669" /> सिस्टम सेटिंग्स एवं मॉड्यूल नियंत्रण
                  </h2>
                  <p style={{ fontSize: '13.5px', color: '#64748b', margin: '4px 0 0' }}>
                    यहाँ से भाग संख्या (Part No) प्रदर्शन, WhatsApp सेवा, और क्लाइंट के सक्रिय मॉड्यूल्स को नियंत्रित करें।
                  </p>
                </div>
                {savingSettings && (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: '#059669', fontWeight: 600 }}>
                    <LoaderCircle size={14} className="spin" /> सेटिंग्स सुरक्षित हो रही हैं...
                  </span>
                )}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '18px', marginBottom: '20px' }}>
                {/* REAL TOGGLE 1: भाग संख्या (Part No) दिखाएं / छिपाएं */}
                <div style={{
                  border: systemSettings.hidePartNo ? '2px solid #059669' : '1px solid #e2e8f0',
                  background: systemSettings.hidePartNo ? '#f0fdf4' : '#ffffff',
                  borderRadius: '12px',
                  padding: '20px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  gap: '14px',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.03)'
                }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a', margin: 0 }}>
                        भाग संख्या (Part No) छिपाएं
                      </h3>
                      <span style={{
                        fontSize: '11.5px',
                        fontWeight: 700,
                        padding: '3px 8px',
                        borderRadius: '6px',
                        background: systemSettings.hidePartNo ? '#dcfce7' : '#f1f5f9',
                        color: systemSettings.hidePartNo ? '#15803d' : '#64748b'
                      }}>
                        {systemSettings.hidePartNo ? '✅ सक्रिय (छिपी हुई)' : 'दिखाई दे रही है'}
                      </span>
                    </div>
                    <p style={{ fontSize: '13px', color: '#475569', lineHeight: 1.55, margin: 0 }}>
                      <strong>पंचायत व वार्ड चुनावों के लिए:</strong> इन चुनावों में केवल <em>वार्ड संख्या</em> होती है। इसे चालू रखने पर वोटर लिस्ट, पोल-डेस्क और पर्ची में 'भाग संख्या' हट जाएगी और सिर्फ <strong>'वार्ड व क्रमांक'</strong> दिखाई देंगे।
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => toggleSystemSetting('hidePartNo')}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      padding: '10px 14px',
                      borderRadius: '8px',
                      border: 'none',
                      fontWeight: 700,
                      fontSize: '13.5px',
                      cursor: 'pointer',
                      background: systemSettings.hidePartNo ? '#059669' : '#e2e8f0',
                      color: systemSettings.hidePartNo ? '#ffffff' : '#334155',
                      transition: 'all 0.2s'
                    }}
                  >
                    {systemSettings.hidePartNo ? <ToggleRight size={20} /> : <ToggleLeft size={20} />}
                    {systemSettings.hidePartNo ? 'भाग संख्या छिपी हुई है (क्लिक कर दिखाएं)' : 'भाग संख्या दिख रही है (क्लिक कर छिपाएं)'}
                  </button>
                </div>

                {/* REAL TOGGLE 2: WhatsApp सेवा नियंत्रण */}
                {(() => {
                  const targetOrg = organizations.find((o) => o.id === (organizationId || organizations[0]?.id));
                  const isWaActive = dashboardStats?.activeOrg?.whatsappEnabled !== undefined 
                    ? dashboardStats.activeOrg.whatsappEnabled 
                    : (targetOrg?.whatsappEnabled !== false);
                  const credits = dashboardStats?.activeOrg?.whatsappCredits ?? targetOrg?.whatsappCredits ?? 0;
                  return (
                    <div style={{
                      border: isWaActive ? '2px solid #059669' : '1px solid #e2e8f0',
                      background: isWaActive ? '#f0fdf4' : '#ffffff',
                      borderRadius: '12px',
                      padding: '20px',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      gap: '14px',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.03)'
                    }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                          <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a', margin: 0 }}>
                            WhatsApp पर्ची एवं संदेश सेवा
                          </h3>
                          <span style={{
                            fontSize: '11.5px',
                            fontWeight: 700,
                            padding: '3px 8px',
                            borderRadius: '6px',
                            background: isWaActive ? '#dcfce7' : '#fee2e2',
                            color: isWaActive ? '#15803d' : '#991b1b'
                          }}>
                            {isWaActive ? '✅ चालू (Active)' : '❌ बंद (Disabled)'}
                          </span>
                        </div>
                        <p style={{ fontSize: '13px', color: '#475569', lineHeight: 1.55, margin: 0 }}>
                          चयनित संगठन (<strong>{targetOrg?.name || 'डिफ़ॉल्ट'}</strong>) के कार्यकर्ताओं के लिए WhatsApp से मतदाता पर्ची भेजने की सुविधा। शेष क्रेडिट्स: <strong>{credits.toLocaleString('hi-IN')}</strong>
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={toggleWhatsAppForOrg}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '8px',
                          padding: '10px 14px',
                          borderRadius: '8px',
                          border: 'none',
                          fontWeight: 700,
                          fontSize: '13.5px',
                          cursor: 'pointer',
                          background: isWaActive ? '#059669' : '#e2e8f0',
                          color: isWaActive ? '#ffffff' : '#334155',
                          transition: 'all 0.2s'
                        }}
                      >
                        {isWaActive ? <ToggleRight size={20} /> : <ToggleLeft size={20} />}
                        {isWaActive ? 'WhatsApp सेवा सक्रिय है (बंद करने हेतु क्लिक करें)' : 'WhatsApp सेवा बंद है (चालू करने हेतु क्लिक करें)'}
                      </button>
                    </div>
                  );
                })()}
              </div>

              {/* REAL TOGGLE 3: उपलब्ध सिस्टम मॉड्यूल्स */}
              <div style={{
                border: '1px solid #e2e8f0',
                background: '#f8fafc',
                borderRadius: '12px',
                padding: '20px'
              }}>
                <div style={{ marginBottom: '14px' }}>
                  <h3 style={{ fontSize: '15.5px', fontWeight: 700, color: '#0f172a', margin: '0 0 4px 0' }}>
                    इस संगठन के लिए सक्रिय मॉड्यूल्स (Feature Access)
                  </h3>
                  <p style={{ fontSize: '13px', color: '#64748b', margin: 0 }}>
                    कार्यकर्ताओं व एडमिन पैनल में कौन-से फीचर्स उपलब्ध रहेंगे, यहाँ क्लिक कर सीधे चालू या बंद करें:
                  </p>
                </div>
                {(() => {
                  const targetOrg = organizations.find((o) => o.id === (organizationId || organizations[0]?.id));
                  const currentMods = dashboardStats?.activeOrg?.enabledModules || targetOrg?.modules || targetOrg?.enabledModules || moduleOptions.map(([k]) => k);
                  return (
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
                      gap: '10px'
                    }}>
                      {moduleOptions.map(([key, label]) => {
                        const isEnabled = currentMods.includes(key);
                        return (
                          <button
                            key={key}
                            type="button"
                            onClick={() => toggleModuleForOrg(key)}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              padding: '10px 14px',
                              borderRadius: '8px',
                              border: isEnabled ? '1.5px solid #059669' : '1px solid #cbd5e1',
                              background: isEnabled ? '#ffffff' : '#f1f5f9',
                              color: isEnabled ? '#0f172a' : '#64748b',
                              fontWeight: isEnabled ? 700 : 500,
                              fontSize: '13px',
                              cursor: 'pointer',
                              transition: 'all 0.15s'
                            }}
                          >
                            <span>{label}</span>
                            <span style={{
                              fontSize: '11px',
                              fontWeight: 700,
                              padding: '2px 6px',
                              borderRadius: '4px',
                              background: isEnabled ? '#dcfce7' : '#e2e8f0',
                              color: isEnabled ? '#15803d' : '#64748b'
                            }}>
                              {isEnabled ? 'चालू' : 'बंद'}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>
            </section>

            {/* WARD-WISE DETAILED BREAKDOWN TABLE (सब चीज़ों की डिटेल्स) */}
            <section className="records-panel" style={{ padding: '24px', marginBottom: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
                <div>
                  <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#1a2620', margin: 0 }}>
                    वार्ड अनुसार विस्तृत मतदाता तालिका (Ward-wise Summary)
                  </h2>
                  <p style={{ fontSize: '13.5px', color: '#64748b', margin: '4px 0 0' }}>
                    हर वार्ड में कुल मतदाता, पुरुष, महिला एवं मतदान प्रगति का वास्तविक विवरण
                  </p>
                </div>
                <span style={{ fontSize: '13px', fontWeight: 600, color: '#059669' }}>
                  कुल वार्ड: {dashboardStats?.wardBreakdown?.length || dashboardStats?.totalWards || 0}
                </span>
              </div>

              {dashboardStats?.wardBreakdown && dashboardStats.wardBreakdown.length > 0 ? (
                <div className="table-scroll" style={{ border: '1px solid #e2e8f0', borderRadius: '10px', overflowX: 'auto' }}>
                  <table className="voter-table desk-table" style={{ margin: 0 }}>
                    <thead>
                      <tr>
                        <th style={{ width: '100px' }}>वार्ड नं.</th>
                        <th>कुल मतदाता</th>
                        <th>पुरुष</th>
                        <th>महिला</th>
                        <th>मतदान दर्ज</th>
                        <th>शेष</th>
                        <th style={{ textAlign: 'right' }}>टर्नआउट</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dashboardStats.wardBreakdown.map((w) => (
                        <tr key={w.wardNo}>
                          <td style={{ fontWeight: 700, color: '#059669' }}>वार्ड {w.wardNo}</td>
                          <td style={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{w.total.toLocaleString('hi-IN')}</td>
                          <td style={{ color: '#2563eb', fontVariantNumeric: 'tabular-nums' }}>{w.male.toLocaleString('hi-IN')}</td>
                          <td style={{ color: '#db2777', fontVariantNumeric: 'tabular-nums' }}>{w.female.toLocaleString('hi-IN')}</td>
                          <td style={{ color: '#059669', fontVariantNumeric: 'tabular-nums' }}>{w.voted.toLocaleString('hi-IN')}</td>
                          <td style={{ color: '#64748b', fontVariantNumeric: 'tabular-nums' }}>{(w.total - w.voted).toLocaleString('hi-IN')}</td>
                          <td style={{ textAlign: 'right', fontWeight: 700, color: w.turnout > 50 ? '#059669' : '#d97706', fontVariantNumeric: 'tabular-nums' }}>
                            {w.turnout}%
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '30px', color: '#64748b', background: '#f8fafc', borderRadius: '10px' }}>
                  <p style={{ margin: 0 }}>डेटा लोड हो रहा है या अभी तक कोई वोटर रिकॉर्ड अपलोड नहीं हुआ है।</p>
                </div>
              )}
            </section>

            {/* QUICK ACTIONS ROW */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px', marginBottom: '24px' }}>
              <button
                type="button"
                onClick={() => setActiveView('records')}
                style={{
                  padding: '14px',
                  borderRadius: '10px',
                  border: '1px solid #cbd5e1',
                  background: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  cursor: 'pointer',
                  fontWeight: 600,
                  fontSize: '14px',
                  color: '#1e293b'
                }}
              >
                <FileSpreadsheet size={18} color="#059669" /> वोटर डेटा देखें
              </button>
              <button
                type="button"
                onClick={() => setActiveView('import')}
                style={{
                  padding: '14px',
                  borderRadius: '10px',
                  border: '1px solid #cbd5e1',
                  background: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  cursor: 'pointer',
                  fontWeight: 600,
                  fontSize: '14px',
                  color: '#1e293b'
                }}
              >
                <Upload size={18} color="#0284c7" /> PDF / Excel डेटा इम्पोर्ट
              </button>
              <button
                type="button"
                onClick={() => setActiveView('branding')}
                style={{
                  padding: '14px',
                  borderRadius: '10px',
                  border: '1px solid #cbd5e1',
                  background: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  cursor: 'pointer',
                  fontWeight: 600,
                  fontSize: '14px',
                  color: '#1e293b'
                }}
              >
                <Ticket size={18} color="#d97706" /> पर्ची ब्रांडिंग स्टूडियो
              </button>
              <button
                type="button"
                onClick={() => setIsCreateClientModalOpen(true)}
                style={{
                  padding: '14px',
                  borderRadius: '10px',
                  border: '1px solid #cbd5e1',
                  background: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  cursor: 'pointer',
                  fontWeight: 600,
                  fontSize: '14px',
                  color: '#1e293b'
                }}
              >
                <Plus size={18} color="#7c3aed" /> नया क्लाइंट जोड़ें
              </button>
            </div>
          </>
        )}

        {activeView === 'tenants' && (
          <>
            <section className="feature-metrics">
              <article className="metric-card"><span>क्लाइंट खाते</span><strong>{organizations.length.toLocaleString('hi-IN')}</strong><small>बनाए गए संगठन</small></article>
              <article className="metric-card metric-card-green"><span>सक्रिय कार्यकर्ता</span><strong>{organizations.reduce((sum, tenant) => sum + tenant.activeWorkers, 0).toLocaleString('hi-IN')}</strong><small>हर क्लाइंट में अधिकतम 10</small></article>
              <article className="metric-card"><span>मतदाता रिकॉर्ड</span><strong>{organizations.reduce((sum, tenant) => sum + tenant.voterCount, 0).toLocaleString('hi-IN')}</strong><small>सभी क्लाइंट का डेटा</small></article>
            </section>
            <section className="records-panel" style={{ padding: '24px', marginBottom: '24px' }}>
              <div style={{ marginBottom: '20px' }}>
                <h2 style={{ fontSize: '18px', fontWeight: '600', color: '#1a2620', marginBottom: '4px' }}>नया क्लाइंट खाता</h2>
                <p style={{ fontSize: '14px', color: '#7d8981' }}>एक ही login से क्लाइंट एडमिन अपना configurable workspace खोलेंगे।</p>
              </div>
              <form className="modal-form" onSubmit={createTenant} noValidate>
                <div className="feature-form-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px' }}>
                  <label>क्लाइंट / संगठन का नाम<input required value={tenantName} onChange={(event) => setTenantName(event.target.value)} /></label>
                  <label>क्लाइंट एडमिन ईमेल<input type="email" autoComplete="username" required value={tenantEmail} onChange={(event) => setTenantEmail(event.target.value)} /></label>
                  <label>
                    शुरुआती पासवर्ड
                    <span className="feature-password-field" style={{ marginTop: '4px' }}>
                      <KeyRound size={14} />
                      <input
                        type={showTenantPassword ? 'text' : 'password'}
                        autoComplete="new-password"
                        minLength={8}
                        required
                        value={tenantPassword}
                        onChange={(event) => setTenantPassword(event.target.value)}
                        placeholder="कम-से-कम 8 अक्षर"
                      />
                      <button
                        type="button"
                        className="password-eye-btn"
                        onClick={() => setShowTenantPassword((prev) => !prev)}
                        title={showTenantPassword ? 'पासवर्ड छिपाएं' : 'पासवर्ड देखें'}
                        aria-label={showTenantPassword ? 'पासवर्ड छिपाएं' : 'पासवर्ड देखें'}
                      >
                        {showTenantPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                    </span>
                  </label>
                  <label>अनुमत वार्ड <span className="optional-label">कॉमा से अलग; खाली = पूरा संगठन</span><input value={tenantWards} onChange={(event) => setTenantWards(event.target.value)} placeholder="वार्ड 1, वार्ड 2" /></label>
                </div>

                {/* राज्य निर्वाचन आयोग (SEC Rajasthan) अनुसार वैकल्पिक भौगोलिक / चुनावी क्षेत्र */}
                <div
                  style={{
                    marginTop: '16px',
                    padding: '14px 16px',
                    borderRadius: '12px',
                    border: '1.5px dashed #cbd5e1',
                    background: '#f8fafc',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px', flexWrap: 'wrap', gap: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#1e293b', fontWeight: 700, fontSize: '13px' }}>
                      <MapPin size={16} style={{ color: '#0284c7' }} />
                      <span>चुनावी / प्रशासनिक क्षेत्र (State Election Commission Format)</span>
                    </div>
                    <span style={{ fontSize: '11px', background: '#e0f2fe', color: '#0369a1', padding: '2px 8px', borderRadius: '12px', fontWeight: 600 }}>
                      वैकल्पिक (Optional)
                    </span>
                  </div>
                  <div className="feature-form-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px' }}>
                    <label style={{ fontSize: '12.5px' }}>
                      District (जिला)
                      <input
                        value={tenantDistrict}
                        onChange={(e) => setTenantDistrict(e.target.value)}
                        placeholder="उदा. PALI"
                        style={{ marginTop: '4px' }}
                      />
                    </label>
                    <label style={{ fontSize: '12.5px' }}>
                      ULB / PanchayatSamiti (निकाय / पं. समिति)
                      <input
                        value={tenantUlbPanchayat}
                        onChange={(e) => setTenantUlbPanchayat(e.target.value)}
                        placeholder="उदा. SOJAT PANCHAYAT SAMITI"
                        style={{ marginTop: '4px' }}
                      />
                    </label>
                    <label style={{ fontSize: '12.5px' }}>
                      ULB Ward / GramPanchayat (वार्ड / ग्रा.पं.)
                      <input
                        value={tenantUlbWardGram}
                        onChange={(e) => setTenantUlbWardGram(e.target.value)}
                        placeholder="उदा. RAMASANI BALA"
                        style={{ marginTop: '4px' }}
                      />
                    </label>
                  </div>
                </div>
                <fieldset
                  style={{
                    marginTop: '24px',
                    padding: '16px 18px',
                    borderRadius: '12px',
                    border: '1.5px solid #e2e8f0',
                    background: '#ffffff',
                  }}
                >
                  <legend style={{ fontWeight: 700, color: '#0f172a', fontSize: '14px', padding: '0 8px' }}>
                    इस क्लाइंट के लिए फीचर
                  </legend>
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
                      gap: '10px',
                      marginTop: '6px',
                    }}
                  >
                    {moduleOptions.map(([module, label]) => {
                      const isChecked = tenantModules.includes(module);
                      return (
                        <label
                          key={module}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '9px',
                            padding: '9px 12px',
                            borderRadius: '8px',
                            border: `1.5px solid ${isChecked ? '#86efac' : '#e2e8f0'}`,
                            background: isChecked ? '#f0fdf4' : '#f8fafc',
                            color: isChecked ? '#166534' : '#334155',
                            fontWeight: isChecked ? 700 : 500,
                            fontSize: '13px',
                            cursor: 'pointer',
                            userSelect: 'none',
                            transition: 'all 0.15s ease',
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => toggleModule(module)}
                            style={{ width: '16px', height: '16px', accentColor: '#16a34a', cursor: 'pointer' }}
                          />
                          <span>{label}</span>
                        </label>
                      );
                    })}
                  </div>
                </fieldset>

                <div
                  style={{
                    marginTop: '16px',
                    padding: '16px 18px',
                    background: '#f0fdf4',
                    borderRadius: '12px',
                    border: '1.5px solid #bbf7d0',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontWeight: 700, color: '#166534', cursor: 'pointer', margin: 0, fontSize: '14px' }}>
                      <input
                        type="checkbox"
                        checked={tenantWhatsappEnabled}
                        onChange={(e) => setTenantWhatsappEnabled(e.target.checked)}
                        style={{ width: '17px', height: '17px', accentColor: '#16a34a', cursor: 'pointer' }}
                      />
                      <MessageCircle size={17} />
                      WhatsApp मैसेजिंग सेवा सक्षम करें
                    </label>
                    <span style={{ fontSize: '11px', color: '#15803d', fontWeight: 600, background: '#dcfce7', padding: '2px 8px', borderRadius: '12px' }}>
                      {tenantWhatsappEnabled ? 'चालू (Active)' : 'बंद (Disabled)'}
                    </span>
                  </div>

                  <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '12px', paddingTop: '8px', borderTop: '1px dashed #bbf7d0' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: 0, fontSize: '13px', color: '#166534', fontWeight: 600 }}>
                      प्रारंभिक WhatsApp क्रेडिट्स:
                      <input
                        type="number"
                        min="0"
                        value={tenantWhatsappCredits}
                        onChange={(e) => setTenantWhatsappCredits(e.target.value)}
                        style={{ width: '90px', padding: '6px 10px', borderRadius: '6px', border: '1.5px solid #86efac', background: '#ffffff', fontWeight: 700, fontSize: '14px', color: '#166534' }}
                      />
                    </label>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      {['100', '500', '1000'].map((quick) => (
                        <button
                          key={quick}
                          type="button"
                          className="button-quiet"
                          style={{ fontSize: '11px', padding: '3px 8px', background: '#ffffff', border: '1px solid #86efac', borderRadius: '4px', cursor: 'pointer', color: '#166534', fontWeight: 700 }}
                          onClick={() => setTenantWhatsappCredits(quick)}
                        >
                          +{quick}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* वैकल्पिक प्रारंभिक पर्ची विवरण */}
                <div style={{ marginTop: '20px', padding: '16px', background: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Ticket size={16} color="#0284c7" />
                      <strong style={{ fontSize: '13px', color: '#0f172a' }}>प्रारंभिक पर्ची ब्रांडिंग (वैकल्पिक)</strong>
                    </div>
                    <span style={{ fontSize: '11px', color: '#64748b' }}>
                      संगठन बनने के बाद &apos;पर्ची ब्रांडिंग&apos; टैब से दोनों फ़ोटो, अपील व लाइव पूर्वावलोकन कस्टमाइज़ करें
                    </span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
                    <label style={{ fontSize: '12px', fontWeight: 600 }}>
                      प्रत्याशी नाम (हिंदी)
                      <input
                        value={tenantSlipConfig.candidateName || ''}
                        onChange={(e) => setTenantSlipConfig({ ...tenantSlipConfig, candidateName: e.target.value })}
                        placeholder="उदा. प्रसन्न चंद मेहता"
                      />
                    </label>
                    <label style={{ fontSize: '12px', fontWeight: 600 }}>
                      Candidate Name (En)
                      <input
                        value={tenantSlipConfig.candidateNameEn || ''}
                        onChange={(e) => setTenantSlipConfig({ ...tenantSlipConfig, candidateNameEn: e.target.value })}
                        placeholder="Prasann Chand Mehta"
                      />
                    </label>
                    <label style={{ fontSize: '12px', fontWeight: 600 }}>
                      पार्टी का नाम
                      <input
                        value={tenantSlipConfig.partyName || ''}
                        onChange={(e) => setTenantSlipConfig({ ...tenantSlipConfig, partyName: e.target.value })}
                        placeholder="भाजपा प्रत्याशी"
                      />
                    </label>
                    <label style={{ fontSize: '12px', fontWeight: 600 }}>
                      चुनाव चिन्ह नाम
                      <input
                        value={tenantSlipConfig.partySymbolName || ''}
                        onChange={(e) => setTenantSlipConfig({ ...tenantSlipConfig, partySymbolName: e.target.value })}
                        placeholder="कमल का फूल"
                      />
                    </label>
                    <label style={{ fontSize: '12px', fontWeight: 600 }}>
                      EVM क्रम नं.
                      <input
                        value={tenantSlipConfig.evmNumber || ''}
                        onChange={(e) => setTenantSlipConfig({ ...tenantSlipConfig, evmNumber: e.target.value })}
                        placeholder="1"
                      />
                    </label>
                  </div>
                </div>

                {error && (
                  <div className="inline-notice error-notice" style={{ marginTop: '16px', marginBottom: '4px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <AlertCircle size={15} /> {error}
                    </div>
                  </div>
                )}
                {notice && (
                  <div className="inline-notice" style={{ marginTop: '16px', marginBottom: '4px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Check size={15} /> {notice}
                    </div>
                  </div>
                )}

                <div className="admin-form-actions" style={{ marginTop: '20px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <button className="button-primary" type="submit" disabled={saving}>
                    {saving ? <LoaderCircle size={15} className="spin" /> : <UserPlus size={15} />} {saving ? 'क्लाइंट बन रहा है...' : 'क्लाइंट बनाएँ'}
                  </button>
                  <button
                    type="button"
                    className="button-secondary"
                    onClick={() => {
                      setIsCreateClientModalOpen(true);
                      setError('');
                    }}
                    style={{ fontSize: '13px' }}
                  >
                    पॉप-अप में खोलें (Open in Modal)
                  </button>
                </div>
              </form>
            </section>

            <section className="records-panel">
              <div className="records-toolbar" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
                <div>
                  <h2>क्लाइंट संगठन</h2>
                  <p>मॉड्यूल, वार्ड, पर्ची ब्रांडिंग, WhatsApp क्रेडिट और खाते की स्थिति नियंत्रित करें।</p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    className="button-primary"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '7px 14px',
                      borderRadius: '8px',
                      fontSize: '13px',
                      fontWeight: 700,
                      background: 'linear-gradient(135deg, #16a34a, #15803d)',
                      boxShadow: '0 4px 12px rgba(22, 163, 74, 0.25)',
                    }}
                    onClick={() => {
                      setIsCreateClientModalOpen(true);
                      setError('');
                    }}
                  >
                    <UserPlus size={15} /> + नया क्लाइंट जोड़ें (Pop-up)
                  </button>
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '4px 12px',
                      borderRadius: '20px',
                      background: '#e0f2fe',
                      color: '#0369a1',
                      fontSize: '13px',
                      fontWeight: 700,
                      width: 'fit-content',
                      border: '1px solid #bae6fd',
                    }}
                  >
                    कुल {organizations.length} संगठन
                  </span>
                </div>
              </div>
              {loading ? (
                <div className="empty-state"><LoaderCircle size={20} className="spin" /><p>क्लाइंट लोड हो रहे हैं…</p></div>
              ) : organizations.length ? (
                <>
                  {/* RECENTLY CREATED CLIENT QUICK SHARE STRIP */}
                  {recentCreatedClient && (
                    <div
                      style={{
                        margin: '0 12px 16px',
                        padding: '12px 16px',
                        background: '#f0fdf4',
                        border: '1.5px solid #86efac',
                        borderRadius: '12px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        flexWrap: 'wrap',
                        gap: '12px',
                        boxShadow: '0 2px 8px rgba(22, 163, 74, 0.08)',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div
                          style={{
                            width: '36px',
                            height: '36px',
                            borderRadius: '50%',
                            background: '#dcfce7',
                            color: '#16a34a',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <Sparkles size={18} />
                        </div>
                        <div>
                          <div style={{ fontSize: '13.5px', fontWeight: 700, color: '#166534' }}>
                            हाल ही में बना क्लाइंट: <span style={{ color: '#0f172a' }}>{recentCreatedClient.name}</span>
                          </div>
                          <div style={{ fontSize: '12px', color: '#15803d', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                            <span>ईमेल: <code style={{ background: '#dcfce7', padding: '1px 6px', borderRadius: '4px' }}>{recentCreatedClient.email}</code></span>
                            {recentCreatedClient.password && (
                              <span>पासवर्ड: <code style={{ background: '#fef3c7', padding: '1px 6px', borderRadius: '4px', color: '#92400e' }}>{recentCreatedClient.password}</code></span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <button
                          type="button"
                          className="button-quiet"
                          style={{ fontSize: '12px', padding: '6px 12px', background: '#ffffff', color: '#0f766e', borderColor: '#99f6e4', fontWeight: 700 }}
                          onClick={() => copyCreatedClientCreds(recentCreatedClient)}
                        >
                          <Copy size={13} /> विवरण कॉपी करें
                        </button>
                        <button
                          type="button"
                          className="button-primary"
                          style={{ fontSize: '12px', padding: '6px 14px', background: '#16a34a', borderColor: '#16a34a', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}
                          onClick={() => shareCreatedClientWhatsApp(recentCreatedClient)}
                        >
                          <MessageCircle size={14} /> WhatsApp पर भेजें
                        </button>
                        <button
                          type="button"
                          className="icon-button"
                          style={{ width: '28px', height: '28px', color: '#64748b' }}
                          onClick={() => setRecentCreatedClient(null)}
                          title="हटाएं"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    </div>
                  )}

                  {/* MOBILE VIEW (< 768px): Responsive Clean Client Cards */}
                  <div className="mobile-card-view" style={{ padding: '10px' }}>
                    {organizations.map((tenant, idx) => (
                      <div
                        key={`${tenant.id}-${idx}`}
                        style={{
                          background: '#ffffff',
                          border: '1px solid #e2e8f0',
                          borderRadius: '12px',
                          padding: '14px',
                          boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                          <div>
                            <strong style={{ fontSize: '15px', color: '#0f172a' }}>{tenant.name}</strong>
                            <div style={{ fontSize: '11px', color: '#64748b', fontFamily: 'monospace' }}>{tenant.id}</div>
                          </div>
                          <span className={`record-status ${tenant.isActive ? 'status-voted' : 'status-pending'}`}>
                            {tenant.isActive ? 'सक्रिय' : 'बंद'}
                          </span>
                        </div>

                        {(tenant.district || tenant.ulbPanchayatSamiti || tenant.ulbWardGramPanchayat) && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '11px', color: '#0369a1', background: '#e0f2fe', padding: '3px 8px', borderRadius: '6px', marginBottom: '8px', fontWeight: 600 }}>
                            <MapPin size={12} />
                            <span>{[tenant.district, tenant.ulbPanchayatSamiti, tenant.ulbWardGramPanchayat].filter(Boolean).join(' • ')}</span>
                          </div>
                        )}

                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '10px' }}>
                          <span style={{ fontSize: '11px', background: '#f1f5f9', color: '#334155', padding: '3px 8px', borderRadius: '6px', fontWeight: 600 }}>
                            👥 {tenant.voterCount.toLocaleString('hi-IN')} मतदाता
                          </span>
                          <span style={{ fontSize: '11px', background: '#f1f5f9', color: '#334155', padding: '3px 8px', borderRadius: '6px', fontWeight: 600 }}>
                            👷 {tenant.activeWorkers}/10 कार्यकर्ता
                          </span>
                          <span style={{ fontSize: '11px', background: '#dcfce7', color: '#166534', padding: '3px 8px', borderRadius: '6px', fontWeight: 600 }}>
                            💬 {tenant.whatsappCredits ?? 0} क्रेडिट
                          </span>
                          {tenant.wards.length > 0 && (
                            <span style={{ fontSize: '11px', background: '#e0f2fe', color: '#0369a1', padding: '3px 8px', borderRadius: '6px', fontWeight: 600 }}>
                              वार्ड: {tenant.wards.join(', ')}
                            </span>
                          )}
                        </div>

                        {tenant.slipConfig?.candidateName && (
                          <div style={{ background: '#fff7ed', border: '1px solid #fed7aa', padding: '6px 10px', borderRadius: '6px', marginBottom: '10px', fontSize: '12px' }}>
                            प्रत्याशी: <strong style={{ color: '#1e3a8a' }}>{tenant.slipConfig.candidateName}</strong>
                            {tenant.slipConfig.partySymbolName && (
                              <span style={{ color: '#ea580c', marginLeft: '6px', fontWeight: 600 }}>
                                ({tenant.slipConfig.partySymbolName})
                              </span>
                            )}
                          </div>
                        )}

                        {/* Quick Copy & Direct WhatsApp Share Bar for Every Client */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '10px', padding: '8px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                          <button
                            type="button"
                            className="button-quiet"
                            style={{
                              fontSize: '12px',
                              padding: '6px 8px',
                              justifyContent: 'center',
                              background: copiedTenantId === tenant.id ? '#dcfce7' : '#ffffff',
                              color: copiedTenantId === tenant.id ? '#15803d' : '#0f766e',
                              borderColor: copiedTenantId === tenant.id ? '#86efac' : '#cbd5e1',
                              fontWeight: 700,
                            }}
                            onClick={() => copyTenantDetails(tenant)}
                            title="लॉगिन ID, पासवर्ड व विवरण कॉपी करें"
                          >
                            {copiedTenantId === tenant.id ? <Check size={13} /> : <Copy size={13} />}
                            {copiedTenantId === tenant.id ? 'कॉपी हुआ!' : 'विवरण कॉपी'}
                          </button>
                          <button
                            type="button"
                            className="button-quiet"
                            style={{
                              fontSize: '12px',
                              padding: '6px 8px',
                              justifyContent: 'center',
                              background: '#f0fdf4',
                              color: '#16a34a',
                              borderColor: '#bbf7d0',
                              fontWeight: 700,
                            }}
                            onClick={() => shareTenantWhatsApp(tenant)}
                            title="क्लाइंट को सीधे WhatsApp पर भेजें"
                          >
                            <MessageCircle size={13} /> WhatsApp भेजें
                          </button>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: '8px', paddingTop: '10px', borderTop: '1px solid #f1f5f9' }}>
                          <button
                            className="button-secondary"
                            type="button"
                            style={{ fontSize: '12px', padding: '6px 8px', justifyContent: 'center' }}
                            onClick={() => {
                              handleSelectBrandingOrg(tenant.id);
                              setActiveView('branding');
                            }}
                          >
                            <Ticket size={13} /> पर्ची ब्रांडिंग
                          </button>
                          <button
                            className="button-secondary"
                            type="button"
                            style={{ fontSize: '12px', padding: '6px 8px', justifyContent: 'center', color: '#6b21a8', borderColor: '#d8b4fe', background: '#faf5ff', fontWeight: 600 }}
                            onClick={() => {
                              setCasteSelectedOrgId(tenant.id);
                              setActiveView('castes');
                            }}
                          >
                            <Tag size={13} /> जातियां ({tenant.customCastes?.length || 0})
                          </button>
                          <button
                            className="button-quiet"
                            type="button"
                            style={{ fontSize: '12px', padding: '6px 8px', justifyContent: 'center', border: '1px solid #cbd5e1' }}
                            onClick={() => setEditingTenant({ ...tenant, slipConfig: tenant.slipConfig || { ...defaultSlipConfig } })}
                          >
                            <Settings2 size={13} /> सेटिंग
                          </button>
                          <button
                            className="button-quiet"
                            type="button"
                            style={{ color: '#dc2626', borderColor: '#fca5a5', background: '#fef2f2', padding: '6px 10px', fontSize: '12px' }}
                            onClick={() => {
                              setDeletingTenant(tenant);
                              setDeleteConfirmText('');
                            }}
                            title="पूरा क्लाइंट और सारा डेटा डिलीट करें"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* DESKTOP VIEW (>= 769px): Full Sortable Table */}
                  <div className="table-scroll desktop-table-view">
                    <table className="voter-table desk-table">
                      <thead>
                        <tr>
                          <th>क्लाइंट संगठन</th>
                          <th>वार्ड</th>
                          <th>पर्ची ब्रांडिंग (प्रत्याशी)</th>
                          <th>सक्षम फीचर</th>
                          <th>कार्यकर्ता</th>
                          <th>मतदाता</th>
                          <th>WhatsApp कोटा</th>
                          <th>स्थिति</th>
                          <th>एक्शन</th>
                        </tr>
                      </thead>
                      <tbody>
                        {organizations.map((tenant, idx) => (
                          <tr key={`${tenant.id}-${idx}`}>
                            <td>
                              <strong className="voter-name">{tenant.name}</strong>
                              <div className="voter-subline">{tenant.id}</div>
                              {(tenant.district || tenant.ulbPanchayatSamiti || tenant.ulbWardGramPanchayat) && (
                                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: '#0369a1', background: '#e0f2fe', padding: '1px 6px', borderRadius: '4px', marginTop: '3px', fontWeight: 600 }}>
                                  <MapPin size={11} />
                                  <span>{[tenant.district, tenant.ulbPanchayatSamiti, tenant.ulbWardGramPanchayat].filter(Boolean).join(' • ')}</span>
                                </div>
                              )}
                            </td>
                            <td>{tenant.wards.length ? tenant.wards.join(', ') : 'सभी'}</td>
                            <td>
                              {tenant.slipConfig?.candidateName ? (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                                  <strong style={{ fontSize: '13px', color: '#1e3a8a' }}>
                                    {tenant.slipConfig.candidateName}
                                  </strong>
                                  <span style={{ fontSize: '11px', color: '#ea580c', background: '#fff7ed', padding: '1px 6px', borderRadius: '4px', border: '1px solid #fed7aa', display: 'inline-block', width: 'fit-content', fontWeight: 600 }}>
                                    {tenant.slipConfig.partySymbolName || 'चिन्ह'} (#{tenant.slipConfig.evmNumber || '1'})
                                  </span>
                                </div>
                              ) : (
                                <span style={{ fontSize: '12px', color: '#94a3b8' }}>डिफ़ॉल्ट</span>
                              )}
                            </td>
                            <td>{tenant.modules.length}</td>
                            <td>{tenant.activeWorkers} / 10</td>
                            <td>{tenant.voterCount.toLocaleString('hi-IN')}</td>
                            <td>
                              {tenant.whatsappEnabled !== false ? (
                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '12px', fontWeight: 600, color: '#15803d', background: '#dcfce7', padding: '2px 8px', borderRadius: '12px' }}>
                                  {(tenant.whatsappCredits ?? 0).toLocaleString('hi-IN')} क्रेडिट
                                </span>
                              ) : (
                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '12px', fontWeight: 600, color: '#b91c1c', background: '#fee2e2', padding: '2px 8px', borderRadius: '12px' }}>
                                  अक्षम
                                </span>
                              )}
                            </td>
                            <td>
                              <span className={`record-status ${tenant.isActive ? 'status-voted' : 'status-pending'}`}>
                                {tenant.isActive ? 'सक्रिय' : 'बंद'}
                              </span>
                            </td>
                            <td style={{ whiteSpace: 'nowrap' }}>
                              <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                                <button
                                  className="button-quiet"
                                  type="button"
                                  style={{
                                    padding: '4px 8px',
                                    fontSize: '12px',
                                    background: copiedTenantId === tenant.id ? '#dcfce7' : '#f0fdfa',
                                    color: copiedTenantId === tenant.id ? '#15803d' : '#0f766e',
                                    borderColor: copiedTenantId === tenant.id ? '#86efac' : '#99f6e4',
                                    fontWeight: 600,
                                  }}
                                  onClick={() => copyTenantDetails(tenant)}
                                  title="लॉगिन ID, पासवर्ड व विवरण क्लिपबोर्ड में कॉपी करें"
                                >
                                  {copiedTenantId === tenant.id ? <Check size={13} /> : <Copy size={13} />}
                                  {copiedTenantId === tenant.id ? 'कॉपी हुआ' : 'कॉपी'}
                                </button>
                                <button
                                  className="button-quiet"
                                  type="button"
                                  style={{
                                    padding: '4px 8px',
                                    fontSize: '12px',
                                    color: '#15803d',
                                    borderColor: '#bbf7d0',
                                    background: '#f0fdf4',
                                    fontWeight: 600,
                                  }}
                                  onClick={() => shareTenantWhatsApp(tenant)}
                                  title="क्लाइंट को सीधे WhatsApp पर विवरण भेजें"
                                >
                                  <MessageCircle size={13} /> WhatsApp
                                </button>
                                <button
                                  className="button-secondary"
                                  type="button"
                                  style={{ padding: '4px 10px', fontSize: '12px', color: '#0369a1', borderColor: '#7dd3fc', background: '#f0f9ff' }}
                                  onClick={() => {
                                    handleSelectBrandingOrg(tenant.id);
                                    setActiveView('branding');
                                  }}
                                  title="इस क्लाइंट की पर्ची ब्रांडिंग कस्टमाइज़ करें"
                                >
                                  <Ticket size={13} /> पर्ची ब्रांडिंग
                                </button>
                                <button
                                  className="button-secondary"
                                  type="button"
                                  style={{ padding: '4px 10px', fontSize: '12px', color: '#6b21a8', borderColor: '#d8b4fe', background: '#faf5ff', fontWeight: 600 }}
                                  onClick={() => {
                                    setCasteSelectedOrgId(tenant.id);
                                    setActiveView('castes');
                                  }}
                                  title="इस क्लाइंट की जातियां कस्टमाइज़ करें"
                                >
                                  <Tag size={13} /> जातियां ({tenant.customCastes?.length || 0})
                                </button>
                                <button
                                  className="button-quiet"
                                  type="button"
                                  onClick={() => setEditingTenant({ ...tenant, slipConfig: tenant.slipConfig || { ...defaultSlipConfig } })}
                                >
                                  <Settings2 size={13} /> सेटिंग
                                </button>
                                <button
                                  className="button-quiet"
                                  type="button"
                                  style={{ color: '#dc2626', borderColor: '#fca5a5', background: '#fef2f2' }}
                                  onClick={() => {
                                    setDeletingTenant(tenant);
                                    setDeleteConfirmText('');
                                  }}
                                  title="पूरा क्लाइंट और उसका सारा डेटा हमेशा के लिए डिलीट करें"
                                >
                                  <Trash2 size={13} /> डिलीट
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              ) : (
                <div className="empty-state"><strong>अभी कोई क्लाइंट नहीं</strong><p>पहला संगठन बनाने पर वह इस सूची में दिखेगा।</p></div>
              )}
            </section>
          </>
        )}

        {/* ================================================================= */}
        {/* CASTE CONFIGURATION PER CLIENT / CANDIDATE                      */}
        {/* ================================================================= */}
        {activeView === 'castes' && (
          <>
            <section className="feature-metrics">
              <article className="metric-card">
                <span>सक्रिय क्लाइंट</span>
                <strong>{organizations.length}</strong>
                <small>संगठन उपलब्ध</small>
              </article>
              <article className="metric-card metric-card-green">
                <span>चयनित संगठन में जातियां</span>
                <strong>{orgCastesList.length}</strong>
                <small>{organizations.find((o) => o.id === casteSelectedOrgId)?.name || 'कोई नहीं'}</small>
              </article>
              <article className="metric-card">
                <span>वोटर टैग स्थिति</span>
                <strong>सक्रिय + अन्य (Other)</strong>
                <small>कस्टम जाति विकल्प हमेशा खुला रहेगा</small>
              </article>
            </section>

            <section className="records-panel" style={{ padding: '24px', marginBottom: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    <Tag size={20} color="#7c3aed" />
                    <h2 style={{ fontSize: '18px', fontWeight: '700', color: '#1e293b', margin: 0 }}>
                      क्लाइंट / यूज़र अनुसार जाति प्रबंधन (Custom Caste Configurator)
                    </h2>
                  </div>
                  <p style={{ fontSize: '13.5px', color: '#64748b', margin: 0 }}>
                    प्रत्येक प्रत्याशी / संगठन के लिए उनकी स्थानीय जातियां सेट करें। कार्यकर्ता जब वोटर को टैग देंगे, तो यही जातियां चिप्स में दिखेंगी।
                  </p>
                </div>

                {/* Organization Selector */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: '#f8fafc', padding: '8px 14px', borderRadius: '10px', border: '1.5px solid #cbd5e1' }}>
                  <Building2 size={16} color="#7c3aed" />
                  <label style={{ fontSize: '12.5px', fontWeight: 700, color: '#334155', margin: 0 }}>
                    प्रत्याशी / संगठन चुनें:
                  </label>
                  <select
                    value={casteSelectedOrgId}
                    onChange={(e) => setCasteSelectedOrgId(e.target.value)}
                    style={{
                      padding: '6px 12px',
                      borderRadius: '8px',
                      border: '1.5px solid #a855f7',
                      fontSize: '13px',
                      fontWeight: 600,
                      color: '#0f172a',
                      background: '#ffffff',
                      outline: 'none',
                      cursor: 'pointer',
                    }}
                  >
                    {organizations.map((org) => (
                      <option key={org.id} value={org.id}>
                        {org.name} {org.candidateName ? `(${org.candidateName})` : ''} • {(org.customCastes || []).length} जातियां
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Action Toolbar with Presets */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '10px',
                  padding: '12px 16px',
                  background: '#faf5ff',
                  border: '1px solid #e9d5ff',
                  borderRadius: '10px',
                  marginBottom: '20px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '12px', fontWeight: 700, color: '#6b21a8' }}>त्वरित प्रीसेट लोड करें:</span>
                  <button
                    type="button"
                    className="button-secondary"
                    onClick={() => {
                      setOrgCastesList(SAMANDAR_SINGH_CASTES);
                      showToast('info', 'समंदर सिंह जी वाली 25 क्षेत्रीय जातियां लोड कर दी गईं। सेव करने के लिए नीचे सेव बटन दबाएं।');
                    }}
                    style={{
                      fontSize: '12px',
                      padding: '5px 12px',
                      background: '#ffffff',
                      borderColor: '#c084fc',
                      color: '#7e22ce',
                      fontWeight: 600,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px',
                    }}
                  >
                    <Sparkles size={13} color="#9333ea" /> समंदर सिंह जी वाली 25 जातियां
                  </button>
                  <button
                    type="button"
                    className="button-secondary"
                    onClick={() => {
                      setOrgCastesList(DEFAULT_RAJASTHAN_CASTES);
                      showToast('info', 'सामान्य राजस्थान जातियां लोड कर दी गईं। सेव करने के लिए नीचे सेव बटन दबाएं।');
                    }}
                    style={{
                      fontSize: '12px',
                      padding: '5px 12px',
                      background: '#ffffff',
                      borderColor: '#cbd5e1',
                      color: '#475569',
                      fontWeight: 600,
                    }}
                  >
                    सामान्य राजस्थान जातियां
                  </button>
                  <button
                    type="button"
                    className="button-quiet"
                    onClick={() => {
                      if (window.confirm('क्या आप सचमुच सभी जातियों को हटाना चाहते हैं?')) {
                        setOrgCastesList([]);
                      }
                    }}
                    style={{ fontSize: '12px', color: '#dc2626', borderColor: '#fca5a5' }}
                  >
                    <Trash2 size={13} /> सूची खाली करें
                  </button>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontSize: '12px', color: '#6b21a8', fontWeight: 700 }}>
                    कुल जातियां: {orgCastesList.length}
                  </span>
                </div>
              </div>

              {/* Add New Caste Form */}
              <div
                style={{
                  display: 'flex',
                  gap: '10px',
                  alignItems: 'center',
                  marginBottom: '20px',
                  flexWrap: 'wrap',
                }}
              >
                <div style={{ flex: '1', minWidth: '280px', position: 'relative' }}>
                  <input
                    type="text"
                    value={newCasteInput}
                    onChange={(e) => setNewCasteInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddCaste();
                      }
                    }}
                    placeholder="नयी जाति जोड़ें (उदा: चारण, सोनी, घांची या कॉमा लगाकर एक साथ कई लिखें)..."
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
                <button
                  type="button"
                  className="button-primary"
                  onClick={handleAddCaste}
                  style={{
                    height: '42px',
                    padding: '0 18px',
                    fontSize: '13px',
                    fontWeight: 700,
                    background: 'linear-gradient(135deg, #7c3aed, #6d28d9)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <Plus size={16} /> + जाति जोड़ें (Add)
                </button>
              </div>

              {/* Active Caste Chips */}
              <div
                style={{
                  padding: '16px',
                  background: '#f8fafc',
                  border: '1.5px solid #e2e8f0',
                  borderRadius: '12px',
                  marginBottom: '24px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <span style={{ fontSize: '13px', fontWeight: 700, color: '#1e293b' }}>
                    सक्रिय जातियां ({orgCastesList.length}):
                  </span>
                  <span style={{ fontSize: '11.5px', color: '#64748b' }}>
                    हटाने के लिए किसी भी जाति के ✕ पर क्लिक करें
                  </span>
                </div>

                {orgCastesList.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '30px 20px', color: '#64748b' }}>
                    <p style={{ margin: 0, fontSize: '14px', fontWeight: 600 }}>अभी कोई जाति नहीं जोड़ी गई है।</p>
                    <p style={{ margin: '6px 0 0', fontSize: '12.5px' }}>ऊपर दिए गए प्रीसेट बटन से या टेक्स्ट बॉक्स में लिखकर जातियां जोड़ें।</p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', maxHeight: '340px', overflowY: 'auto', padding: '2px' }}>
                    {orgCastesList.map((caste, index) => (
                      <div
                        key={`${caste}-${index}`}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '6px 12px',
                          background: '#ffffff',
                          border: '1.5px solid #d8b4fe',
                          borderRadius: '20px',
                          fontSize: '13px',
                          fontWeight: 600,
                          color: '#581c87',
                          boxShadow: '0 1px 3px rgba(124, 58, 237, 0.08)',
                        }}
                      >
                        <span>{caste}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveCaste(caste)}
                          style={{
                            background: '#f3e8ff',
                            border: 'none',
                            borderRadius: '50%',
                            width: '18px',
                            height: '18px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            color: '#7e22ce',
                            fontSize: '11px',
                            padding: 0,
                            lineHeight: 1,
                          }}
                          title="हटाएं"
                        >
                          ✕
                        </button>
                      </div>
                    ))}

                    {/* Always Active 'अन्य / Other' Badge */}
                    <div
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '6px 14px',
                        background: '#f0fdf4',
                        border: '1.5px dashed #16a34a',
                        borderRadius: '20px',
                        fontSize: '13px',
                        fontWeight: 700,
                        color: '#15803d',
                      }}
                      title="यह विकल्प हमेशा वोटर टैग स्क्रीन में उपलब्ध रहेगा ताकि कस्टम जाति भी लिखी जा सके"
                    >
                      <Sparkles size={13} color="#16a34a" />
                      <span>✨ अन्य / Other (कस्टम जाति - हमेशा उपलब्ध)</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Save Button */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  className="button-primary"
                  onClick={handleSaveCastes}
                  disabled={savingCastes || !casteSelectedOrgId}
                  style={{
                    padding: '10px 24px',
                    fontSize: '14px',
                    fontWeight: 700,
                    background: 'linear-gradient(135deg, #16a34a, #15803d)',
                    boxShadow: '0 4px 12px rgba(22, 163, 74, 0.25)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                  }}
                >
                  {savingCastes ? <LoaderCircle size={16} className="spin" /> : <Check size={16} />}
                  {savingCastes ? 'सेव हो रहा है...' : `💾 ${organizations.find((o) => o.id === casteSelectedOrgId)?.name || 'संगठन'} के लिए जाति सूची सेव करें`}
                </button>
                <span style={{ fontSize: '12.5px', color: '#64748b' }}>
                  सेव करने के बाद यह सूची तुरंत इस प्रत्याशी के सभी कार्यकर्ताओं के ऐप व पोर्टल पर लाइव हो जाएगी।
                </span>
              </div>
            </section>
          </>
        )}

        {/* ================================================================= */}
        {/* DEMO USERS GENERATOR & INSTANT SUSPENSION CONTROLLER            */}
        {/* ================================================================= */}
        {activeView === 'demo' && (
          <>
            <section className="feature-metrics">
              <article className="metric-card">
                <span>कुल डेमो खाते</span>
                <strong>{demoUsers.length.toLocaleString('hi-IN')}</strong>
                <small>सिस्टम में निर्मित डेमो पोर्टल्स</small>
              </article>
              <article className="metric-card metric-card-green">
                <span>सक्रिय डेमो खाते</span>
                <strong>{demoUsers.filter((d) => d.isActive).length.toLocaleString('hi-IN')}</strong>
                <small>वर्तमान में चालू डेमो</small>
              </article>
              <article className="metric-card" style={{ borderColor: '#fca5a5' }}>
                <span style={{ color: '#b91c1c' }}>निलंबित (Suspended)</span>
                <strong style={{ color: '#b91c1c' }}>{demoUsers.filter((d) => !d.isActive).length.toLocaleString('hi-IN')}</strong>
                <small>एडमिन द्वारा बंद किए गए खाते</small>
              </article>
            </section>

            {/* DEMO GENERATOR CARD */}
            <section
              className="records-panel"
              style={{
                padding: '24px',
                marginBottom: '24px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
                <div>
                  <div className="eyebrow-label"><span className="eyebrow-mark" /> INSTANT DEMO GENERATOR</div>
                  <h2 style={{ fontSize: '18px', fontWeight: '600', color: '#1a2620', margin: '4px 0' }}>
                    नया डेमो खाता व सैंपल डेटा जनरेट करें
                  </h2>
                  <p style={{ fontSize: '14px', color: '#7d8981', margin: 0 }}>
                    1-क्लिक में आईडी व पासवर्ड तैयार होगा और खाते में 25 यथार्थवादी सैंपल मतदाताओं का डेटा स्वतः लोड हो जाएगा।
                  </p>
                </div>
              </div>

              <form onSubmit={createDemoUser} className="modal-form">
                <div className="feature-form-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
                  <label>
                    किस क्लाइंट / प्रत्याशी के लिए डेमो बनाना है?
                    <select
                      value={demoTargetOrgId}
                      onChange={(e) => {
                        const val = e.target.value;
                        setDemoTargetOrgId(val);
                        if (val !== 'new') {
                          const found = organizations.find((o) => o.id === val);
                          if (found) {
                            setDemoClientName(`डेमो - ${found.name}`);
                          }
                        } else {
                          setDemoClientName('');
                        }
                      }}
                      style={{ height: '40px' }}
                    >
                      <option value="new">✨ नया अलग डेमो क्लाइंट बनाएं (New Independent Client)</option>
                      {organizations.map((org, idx) => (
                        <option key={`${org.id}-${idx}`} value={org.id}>
                          {org.name} {org.candidateName ? `(${org.candidateName})` : ''} • {org.voterCount ? `${org.voterCount.toLocaleString('hi-IN')} वोटर` : '0 वोटर'}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label>
                    क्लाइंट / प्रत्याशी का नाम (वैकल्पिक)
                    <input
                      placeholder="उदा. डेमो - हवामहल विधानसभा"
                      value={demoClientName}
                      onChange={(e) => setDemoClientName(e.target.value)}
                    />
                  </label>

                  <label>
                    कस्टम ईमेल (खाली छोड़ने पर स्वतः बनेगा)
                    <input
                      placeholder="उदा. demo_client@vijaysetu.com"
                      value={demoCustomEmail}
                      onChange={(e) => setDemoCustomEmail(e.target.value)}
                    />
                  </label>

                  <label>
                    कस्टम पासवर्ड (खाली छोड़ने पर स्वतः बनेगा)
                    <input
                      placeholder="उदा. Demo@2024"
                      value={demoCustomPassword}
                      onChange={(e) => setDemoCustomPassword(e.target.value)}
                    />
                  </label>
                </div>

                <div style={{ marginTop: '16px', display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                  <button
                    className="button-primary"
                    type="submit"
                    disabled={demoGenerating}
                    style={{ padding: '9px 20px', fontSize: '13px', fontWeight: 600 }}
                  >
                    {demoGenerating ? <LoaderCircle size={16} className="spin" /> : <Sparkles size={16} />}
                    {demoGenerating ? 'डेमो तैयार हो रहा है…' : '🚀 नया डेमो खाता जनरेट करें'}
                  </button>
                  <span style={{ fontSize: '13px', color: '#7d8981' }}>
                    *खाते में 25 वोटर्स, 1-सेकंड पर्ची, पोल-डेस्क व जातिगत समीकरण स्वतः लोड होंगे।
                  </span>
                </div>
              </form>

              {/* LATEST GENERATED CREDENTIALS ALERT */}
              {latestGenerated && (
                <div
                  style={{
                    marginTop: '20px',
                    padding: '20px',
                    borderRadius: '14px',
                    background: '#f0fdf4',
                    border: '1.5px solid #86efac',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Check size={18} style={{ color: '#16a34a' }} />
                      <strong style={{ color: '#166534', fontSize: '15px' }}>
                        डेमो खाता सफलतापूर्वक तैयार हो गया! ({latestGenerated.name})
                      </strong>
                    </div>
                    <button
                      type="button"
                      onClick={() => setLatestGenerated(null)}
                      style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', padding: 0 }}
                      title="बंद करें"
                    >
                      <X size={15} />
                    </button>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', marginBottom: '14px' }}>
                    <div style={{ background: '#ffffff', padding: '10px 14px', borderRadius: '10px', border: '1px solid #dcfce7' }}>
                      <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>लॉगिन आईडी / ईमेल</span>
                      <div style={{ fontSize: '14px', fontWeight: 800, color: '#0f172a' }}>{latestGenerated.email}</div>
                    </div>

                    <div style={{ background: '#ffffff', padding: '10px 14px', borderRadius: '10px', border: '1px solid #dcfce7' }}>
                      <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>पासवर्ड</span>
                      <div style={{ fontSize: '14px', fontWeight: 800, color: '#0f172a' }}>{latestGenerated.password}</div>
                    </div>

                    <div style={{ background: '#ffffff', padding: '10px 14px', borderRadius: '10px', border: '1px solid #dcfce7' }}>
                      <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>सैंपल डेटा</span>
                      <div style={{ fontSize: '14px', fontWeight: 800, color: '#16a34a' }}>25 मतदाता (लोडेड)</div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      onClick={() => copyDemoCredentials(latestGenerated.email, latestGenerated.password, latestGenerated.id)}
                      className="button-secondary"
                      style={{ fontSize: '12px', fontWeight: 700 }}
                    >
                      <Copy size={13} /> {copiedId === latestGenerated.id ? 'कॉपी हो गया!' : 'आईडी व पासवर्ड कॉपी करें'}
                    </button>

                    <button
                      type="button"
                      onClick={() => shareDemoWhatsApp(latestGenerated.email, latestGenerated.password, latestGenerated.name)}
                      className="button-primary"
                      style={{ background: '#16a34a', fontSize: '12px', fontWeight: 700 }}
                    >
                      <Phone size={13} /> WhatsApp पर क्लाइंट को भेजें
                    </button>
                  </div>
                </div>
              )}
            </section>

            {/* DEMO ACCOUNTS LIST TABLE */}
            <section className="records-panel">
              <div className="records-toolbar" style={{ justifyContent: 'space-between' }}>
                <div>
                  <h2>सभी डेमो खाते ({demoUsers.length})</h2>
                  <p>काम पूरा होने पर 1-क्लिक में सस्पेंड (Suspend) करें। सस्पेंड होते ही क्लाइंट स्क्रीन पर लॉकआउट आ जाएगा।</p>
                </div>
                <button
                  type="button"
                  className="button-secondary"
                  onClick={() => void loadDemoUsers()}
                  disabled={demoLoading}
                >
                  {demoLoading ? <LoaderCircle size={14} className="spin" /> : <RefreshCw size={14} />} रिफ्रेश
                </button>
              </div>

              {demoLoading && demoUsers.length === 0 ? (
                <div className="empty-state">
                  <LoaderCircle size={22} className="spin" />
                  <p>डेमो खाते लोड हो रहे हैं…</p>
                </div>
              ) : demoUsers.length === 0 ? (
                <div className="empty-state">
                  <KeyRound size={26} style={{ color: '#94a3b8' }} />
                  <strong>अभी कोई डेमो खाता नहीं बनाया गया है</strong>
                  <p>ऊपर दिए गए फॉर्म से नया डेमो खाता व 25 सैंपल मतदाताओं का डेटा तैयार करें।</p>
                </div>
              ) : (
                <>
                  {/* MOBILE VIEW (< 768px): Clean, Unclipped Demo Account Cards */}
                  <div className="mobile-card-view" style={{ padding: '10px' }}>
                    {sortedDemoUsers.map((user, idx) => (
                      <div
                        key={user.userId || `${user.id}-${idx}`}
                        style={{
                          background: '#ffffff',
                          border: '1px solid #e2e8f0',
                          borderRadius: '12px',
                          padding: '14px',
                          boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                          <div>
                            <strong style={{ fontSize: '15px', color: '#0f172a' }}>{user.name}</strong>
                            <div style={{ fontSize: '11px', color: '#64748b' }}>
                              {user.createdAt ? new Date(user.createdAt).toLocaleDateString('hi-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                            </div>
                          </div>
                          {user.isActive ? (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: '#dcfce7', color: '#15803d', border: '1px solid #86efac', padding: '3px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: 800 }}>
                              🟢 सक्रिय
                            </span>
                          ) : (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: '#fee2e2', color: '#b91c1c', border: '1px solid #fca5a5', padding: '3px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: 800 }}>
                              🔴 बंद (Suspended)
                            </span>
                          )}
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '8px', marginBottom: '10px', background: '#f8fafc', padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>लॉगिन आईडी:</span>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <code style={{ fontSize: '12px', fontWeight: 700, color: '#0f172a' }}>{user.email}</code>
                              <button
                                type="button"
                                onClick={() => copyDemoCredentials(user.email, user.password, user.id)}
                                style={{ background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '4px', padding: '2px 6px', fontSize: '10px', cursor: 'pointer' }}
                              >
                                <Copy size={11} />
                              </button>
                            </div>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>पासवर्ड:</span>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <code style={{ fontSize: '12px', fontWeight: 800, color: '#166534' }}>{user.password}</code>
                              <button
                                type="button"
                                onClick={() => copyDemoCredentials(user.email, user.password, user.id)}
                                style={{ background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '4px', padding: '2px 6px', fontSize: '10px', cursor: 'pointer' }}
                              >
                                <Copy size={11} />
                              </button>
                            </div>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>सैंपल वोटर्स:</span>
                            <span style={{ fontSize: '12px', fontWeight: 700, color: '#1e3a8a' }}>{user.voterCount} मतदाता</span>
                          </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto auto', gap: '6px', paddingTop: '8px', borderTop: '1px solid #f1f5f9' }}>
                          <button
                            type="button"
                            onClick={() => void toggleDemoSuspend(user.id)}
                            style={{
                              background: user.isActive ? '#fee2e2' : '#dcfce7',
                              color: user.isActive ? '#b91c1c' : '#15803d',
                              border: `1px solid ${user.isActive ? '#fca5a5' : '#86efac'}`,
                              padding: '6px 8px',
                              borderRadius: '6px',
                              fontSize: '11.5px',
                              fontWeight: 700,
                              cursor: 'pointer',
                            }}
                          >
                            {user.isActive ? '⛔ सस्पेंड' : '✅ चालू'}
                          </button>
                          <button
                            type="button"
                            onClick={() => shareDemoWhatsApp(user.email, user.password, user.name)}
                            style={{
                              background: '#22c55e',
                              color: '#ffffff',
                              border: 'none',
                              padding: '6px 8px',
                              borderRadius: '6px',
                              fontSize: '11.5px',
                              fontWeight: 700,
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '4px',
                            }}
                          >
                            <MessageCircle size={13} /> WhatsApp
                          </button>
                          <button
                            type="button"
                            onClick={() => copyDemoCredentials(user.email, user.password, user.id)}
                            className="button-secondary"
                            style={{ padding: '6px 8px', fontSize: '11px' }}
                            title="आईडी व पासवर्ड कॉपी करें"
                          >
                            <Copy size={12} />
                          </button>
                          <button
                            type="button"
                            onClick={() => void deleteDemoUser(user.id)}
                            style={{
                              background: '#fff',
                              border: '1px solid #fca5a5',
                              color: '#dc2626',
                              padding: '6px 8px',
                              borderRadius: '6px',
                              cursor: 'pointer',
                            }}
                            title="खाता व सैंपल डेटा डिलीट करें"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* DESKTOP VIEW (>= 769px): Full Table */}
                  <div className="table-scroll desktop-table-view">
                    <table className="voter-table desk-table">
                      <thead>
                        <tr>
                          <th>
                            <SortButton label="क्लाइंट / नाम" field="name" type="alpha" currentSort={demoSort} onSort={handleDemoSort} />
                          </th>
                          <th>लॉगिन ईमेल / ID</th>
                          <th>पासवर्ड</th>
                          <th>
                            <SortButton label="सैंपल वोटर्स" field="voterCount" type="numeric" currentSort={demoSort} onSort={handleDemoSort} />
                          </th>
                          <th>
                            <SortButton label="अवस्था" field="status" type="alpha" currentSort={demoSort} onSort={handleDemoSort} />
                          </th>
                          <th>
                            <SortButton label="तिथि" field="date" type="numeric" currentSort={demoSort} onSort={handleDemoSort} />
                          </th>
                          <th style={{ textAlign: 'right' }}>नियंत्रण व एक्शन</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sortedDemoUsers.map((user, idx) => (
                          <tr key={user.userId || `${user.id}-${idx}`}>
                            <td>
                              <strong className="voter-name">{user.name}</strong>
                            </td>
                            <td>
                              <code style={{ background: '#f1f5f9', padding: '3px 6px', borderRadius: '4px', fontSize: '12px' }}>
                                {user.email}
                              </code>
                            </td>
                            <td>
                              <code style={{ background: '#f1f5f9', padding: '3px 6px', borderRadius: '4px', fontSize: '12px', fontWeight: 700 }}>
                                {user.password}
                              </code>
                            </td>
                            <td>
                              <span style={{ fontSize: '12px', fontWeight: 700, color: '#225e46' }}>
                                {user.voterCount} मतदाता
                              </span>
                            </td>
                            <td>
                              {user.isActive ? (
                                <span
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                    background: '#dcfce7',
                                    color: '#15803d',
                                    border: '1px solid #86efac',
                                    padding: '3px 10px',
                                    borderRadius: '12px',
                                    fontSize: '11px',
                                    fontWeight: 800,
                                  }}
                                >
                                  🟢 सक्रिय (Active)
                                </span>
                              ) : (
                                <span
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                    background: '#fee2e2',
                                    color: '#b91c1c',
                                    border: '1px solid #fca5a5',
                                    padding: '3px 10px',
                                    borderRadius: '12px',
                                    fontSize: '11px',
                                    fontWeight: 800,
                                  }}
                                >
                                  🔴 बंद (Suspended)
                                </span>
                              )}
                            </td>
                            <td style={{ fontSize: '12px', color: '#64748b' }}>
                              {user.createdAt ? new Date(user.createdAt).toLocaleDateString('hi-IN', { day: '2-digit', month: 'short' }) : '—'}
                            </td>
                            <td>
                              <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                                {user.isActive ? (
                                  <button
                                    type="button"
                                    onClick={() => void toggleDemoSuspend(user.id)}
                                    style={{
                                      background: '#fee2e2',
                                      color: '#b91c1c',
                                      border: '1px solid #fca5a5',
                                      padding: '4px 10px',
                                      borderRadius: '6px',
                                      fontSize: '11.5px',
                                      fontWeight: 700,
                                      cursor: 'pointer',
                                    }}
                                    title="इस खाते को तुरंत बंद करें"
                                  >
                                    ⛔ सस्पेंड करें
                                  </button>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => void toggleDemoSuspend(user.id)}
                                    style={{
                                      background: '#dcfce7',
                                      color: '#15803d',
                                      border: '1px solid #86efac',
                                      padding: '4px 10px',
                                      borderRadius: '6px',
                                      fontSize: '11.5px',
                                      fontWeight: 700,
                                      cursor: 'pointer',
                                    }}
                                    title="इस खाते को पुनः चालू करें"
                                  >
                                    ✅ चालू करें
                                  </button>
                                )}

                                <button
                                  type="button"
                                  onClick={() => copyDemoCredentials(user.email, user.password, user.id)}
                                  className="button-secondary"
                                  style={{ padding: '4px 8px', fontSize: '11px' }}
                                  title="आईडी व पासवर्ड कॉपी करें"
                                >
                                  <Copy size={12} /> {copiedId === user.id ? 'कॉपी!' : 'कॉपी'}
                                </button>

                                <button
                                  type="button"
                                  onClick={() => shareDemoWhatsApp(user.email, user.password, user.name)}
                                  style={{
                                    background: '#22c55e',
                                    color: '#ffffff',
                                    border: 'none',
                                    padding: '4px 8px',
                                    borderRadius: '6px',
                                    fontSize: '11px',
                                    fontWeight: 700,
                                    cursor: 'pointer',
                                  }}
                                  title="WhatsApp पर क्रेडेंशियल्स शेयर करें"
                                >
                                  💬 WhatsApp
                                </button>

                                <button
                                  type="button"
                                  onClick={() => void deleteDemoUser(user.id)}
                                  style={{
                                    background: 'none',
                                    border: '1px solid #e2e8f0',
                                    color: '#94a3b8',
                                    padding: '4px 8px',
                                    borderRadius: '6px',
                                    cursor: 'pointer',
                                  }}
                                  title="खाता व सैंपल डेटा डिलीट करें"
                                >
                                  <Trash2 size={12} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </section>
          </>
        )}

        {/* ================================================================= */}
        {/* DEDICATED PER-CLIENT SLIP BRANDING STUDIO TAB                 */}
        {/* ================================================================= */}
        {activeView === 'branding' && (
          <>
            {/* Top: Client Selector Card */}
            <section className="records-panel" style={{ padding: '20px 24px', marginBottom: '20px', background: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
                <div>
                  <div className="eyebrow-label" style={{ color: '#0284c7' }}>PER-CLIENT SLIP STUDIO</div>
                  <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#0f172a', margin: '2px 0 4px' }}>
                    क्लाइंट मतदाता पर्ची ब्रांडिंग
                  </h2>
                  <p style={{ fontSize: '13px', color: '#64748b', margin: 0 }}>
                    हर उम्मीदवार/क्लाइंट संगठन के लिए अलग पार्टी, फोटो, चुनाव चिन्ह व अपील कस्टमाइज़ करें।
                  </p>
                </div>

                {/* Client Selector Dropdown */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: '#f8fafc', padding: '8px 14px', borderRadius: '10px', border: '1.5px solid #cbd5e1' }}>
                  <label htmlFor="client-selector" style={{ fontSize: '13px', fontWeight: 700, color: '#334155', whiteSpace: 'nowrap' }}>
                    कार्यशील क्लाइंट:
                  </label>
                  <select
                    id="client-selector"
                    value={brandingTargetOrgId}
                    onChange={(e) => handleSelectBrandingOrg(e.target.value)}
                    style={{
                      padding: '6px 12px',
                      fontSize: '13px',
                      fontWeight: 600,
                      color: '#0f172a',
                      borderRadius: '8px',
                      border: '1px solid #94a3b8',
                      background: '#ffffff',
                      cursor: 'pointer',
                      outline: 'none',
                      minWidth: '220px',
                    }}
                  >
                    {organizations.map((org, idx) => (
                      <option key={`${org.id}-${idx}`} value={org.id}>
                        {org.name} {org.slipConfig?.candidateName ? `(${org.slipConfig.candidateName})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Client Quick Switcher Chips */}
              {organizations.length > 1 && (
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '16px', paddingTop: '12px', borderTop: '1px solid #f1f5f9' }}>
                  <span style={{ fontSize: '12px', color: '#64748b', alignSelf: 'center', fontWeight: 600 }}>त्वरित चयन:</span>
                  {organizations.map((org, idx) => {
                    const isSelected = org.id === brandingTargetOrgId;
                    return (
                      <button
                        key={`${org.id}-${idx}`}
                        type="button"
                        onClick={() => handleSelectBrandingOrg(org.id)}
                        style={{
                          padding: '5px 12px',
                          fontSize: '12px',
                          fontWeight: isSelected ? 700 : 500,
                          borderRadius: '20px',
                          border: isSelected ? '1.5px solid #0284c7' : '1px solid #e2e8f0',
                          background: isSelected ? '#e0f2fe' : '#ffffff',
                          color: isSelected ? '#0369a1' : '#475569',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                        }}
                      >
                        <span>{org.name}</span>
                        {org.slipConfig?.partySymbolName && (
                          <span style={{ fontSize: '11px', background: isSelected ? '#bae6fd' : '#f1f5f9', padding: '1px 6px', borderRadius: '10px' }}>
                            {org.slipConfig.partySymbolName}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </section>

            {/* 1-Click Party Presets Bar */}
            <div style={{
              background: '#ffffff',
              borderRadius: '12px',
              border: '1px solid #e2e8f0',
              padding: '12px 18px',
              marginBottom: '16px',
              display: 'flex',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '10px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 700, color: '#334155' }}>
                <Sparkles size={15} color="#ea580c" />
                <span>1-क्लिक पार्टी प्रीसेट:</span>
              </div>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', flex: 1 }}>
                {Object.entries(partyPresets).map(([key, item]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => applyPreset(key)}
                    style={{
                      padding: '5px 12px',
                      fontSize: '12px',
                      fontWeight: 600,
                      background: '#f8fafc',
                      border: '1px solid #cbd5e1',
                      borderRadius: '6px',
                      color: '#1e293b',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                    title="इस पार्टी का मानक प्रारूप व चिन्ह लोड करें"
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Studio Mode Selector & Global Save Bar (Sticky on Desktop & Mobile) */}
            <div style={{
              background: '#ffffff',
              borderRadius: '12px',
              border: '1px solid #e2e8f0',
              padding: '12px 16px',
              marginBottom: '20px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '12px',
              boxShadow: '0 2px 6px rgba(0,0,0,0.03)',
            }}>
              {/* Left: Mode Toggle */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '12.5px', fontWeight: 700, color: '#475569' }}>संपादन शैली:</span>
                <div style={{ display: 'inline-flex', background: '#f1f5f9', padding: '3px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  <button
                    type="button"
                    onClick={() => setStudioMode('visual')}
                    style={{
                      padding: '6px 14px',
                      fontSize: '12.5px',
                      fontWeight: studioMode === 'visual' ? 700 : 500,
                      background: studioMode === 'visual' ? '#0284c7' : 'transparent',
                      color: studioMode === 'visual' ? '#ffffff' : '#64748b',
                      borderRadius: '6px',
                      border: 'none',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <span>सीधे पर्ची पर एडिट करें (Visual Editor)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setStudioMode('form')}
                    style={{
                      padding: '6px 14px',
                      fontSize: '12.5px',
                      fontWeight: studioMode === 'form' ? 700 : 500,
                      background: studioMode === 'form' ? '#0284c7' : 'transparent',
                      color: studioMode === 'form' ? '#ffffff' : '#64748b',
                      borderRadius: '6px',
                      border: 'none',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <span>फॉर्म इनपुट मोड (Form Mode)</span>
                  </button>
                </div>
              </div>

              {/* Right: Save, Reset & Clean Preview Buttons */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                {studioMode === 'visual' && (
                  <button
                    type="button"
                    onClick={() => setIsVisualEditing(!isVisualEditing)}
                    style={{
                      padding: '6px 12px',
                      fontSize: '12px',
                      fontWeight: 600,
                      borderRadius: '6px',
                      border: isVisualEditing ? '1.5px solid #0284c7' : '1px solid #cbd5e1',
                      background: isVisualEditing ? '#e0f2fe' : '#ffffff',
                      color: isVisualEditing ? '#0369a1' : '#475569',
                      cursor: 'pointer',
                    }}
                    title="संपादन आउटलाइन बंद/चालू करें"
                  >
                    {isVisualEditing ? 'संपादन मोड चालू' : 'साफ पूर्वावलोकन'}
                  </button>
                )}

                <button
                  className="button-primary"
                  type="button"
                  onClick={saveClientBranding}
                  disabled={savingBranding}
                  style={{ padding: '8px 18px', fontSize: '13px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  {savingBranding ? <LoaderCircle size={15} className="spin" /> : <Check size={15} />}
                  <span>&apos;{organizations.find((o) => o.id === brandingTargetOrgId)?.name || 'क्लाइंट'}&apos; की पर्ची सेव करें</span>
                </button>

                <button
                  className="button-secondary"
                  type="button"
                  onClick={() => {
                    const org = organizations.find((o) => o.id === brandingTargetOrgId);
                    if (org) {
                      setTargetSlipConfig(org.slipConfig && Object.keys(org.slipConfig).length > 0 ? { ...defaultSlipConfig, ...org.slipConfig } : { ...defaultSlipConfig });
                    }
                  }}
                  style={{ padding: '8px 14px', fontSize: '13px' }}
                >
                  रीसेट
                </button>
              </div>
            </div>

            {/* ================= MODE 1: DIRECT VISUAL EDITOR ON PARCHI ================= */}
            {studioMode === 'visual' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {/* Visual Editor Canvas Card */}
                <div
                  className="visual-editor-canvas-card"
                  style={{
                    background: '#ffffff',
                    borderRadius: '16px',
                    border: '1.5px solid #cbd5e1',
                    boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.05)',
                    padding: '24px 20px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                  }}
                >
                  {/* Top Notification / Instructions */}
                  <div style={{
                    width: '100%',
                    maxWidth: '560px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '14px',
                    fontSize: '12px',
                    color: '#64748b',
                  }}>
                    <span style={{ fontWeight: 700, color: '#0f172a' }}>
                      सीधा संपादन: <span style={{ fontWeight: 400 }}>पर्ची के किसी भी हिस्से पर क्लिक करके तुरंत एडिट करें</span>
                    </span>
                    <span style={{ fontSize: '11px', fontWeight: 700, color: '#16a34a', background: '#dcfce7', padding: '2px 8px', borderRadius: '12px' }}>
                      ● Real-Time Sync
                    </span>
                  </div>

                  {/* Ward-wise Polling Stations Management Dock */}
                  <div style={{ width: '100%', maxWidth: '560px', marginBottom: '16px' }}>
                    <WardPollingStationEditor
                      config={targetSlipConfig}
                      onChange={setTargetSlipConfig}
                      availableWards={Array.from(new Set([
                        ...(organizations.find((o) => o.id === brandingTargetOrgId)?.wards || []),
                        ...clientWardsSummary,
                      ]))}
                      selectedPreviewWard={selectedPreviewWard || (organizations.find((o) => o.id === brandingTargetOrgId)?.wards?.[0] || '82')}
                      onPreviewWardChange={setSelectedPreviewWard}
                      organizationName={organizations.find((o) => o.id === brandingTargetOrgId)?.name || 'क्लाइंट'}
                      isCompact={true}
                    />
                  </div>

                  {/* Responsive Parchi Template with Direct WYSIWYG Editing */}
                  <div style={{ width: '100%', maxWidth: '560px' }}>
                    <VoterSlipTemplate
                      voter={{
                        epic: 'RLJ1213180',
                        nameHi: 'जबरा राम',
                        nameEn: 'Jabra Ram',
                        relativeNameHi: 'नरिगा राम',
                        relativeNameEn: 'Nariga Ram',
                        relationType: 'पिता',
                        age: 28,
                        gender: 'पुरुष',
                        houseNo: '279',
                        wardNo: selectedPreviewWard || (organizations.find((o) => o.id === brandingTargetOrgId)?.wards?.[0] || '82'),
                        partNo: '1',
                        serialNo: 1,
                      }}
                      config={targetSlipConfig}
                      isInline={true}
                      isEditable={isVisualEditing}
                      onConfigChange={setTargetSlipConfig}
                      onImageUpload={handleStudioImageUpload}
                      onRemoveImage={(field) => setTargetSlipConfig((prev) => ({ ...prev, [field]: '' }))}
                    />
                  </div>

                  {/* Quick Photo Upload & Management Dock */}
                  <div style={{
                    width: '100%',
                    maxWidth: '560px',
                    marginTop: '20px',
                    padding: '16px',
                    background: '#f8fafc',
                    borderRadius: '12px',
                    border: '1px solid #e2e8f0',
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 220px), 1fr))',
                    gap: '12px',
                  }}>
                    {/* Left: Symbol Image Quick Upload */}
                    <div style={{ background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: '8px', padding: '10px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {targetSlipConfig.partySymbolImage ? (
                          <img src={targetSlipConfig.partySymbolImage} alt="" style={{ width: '36px', height: '36px', objectFit: 'contain', borderRadius: '4px' }} />
                        ) : (
                          <div style={{ width: '36px', height: '36px', borderRadius: '4px', background: '#fed7aa', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ea580c', fontWeight: 800, fontSize: '11px' }}>चिन्ह</div>
                        )}
                        <div>
                          <div style={{ fontSize: '12px', fontWeight: 700, color: '#9a3412' }}>चुनाव चिन्ह फ़ोटो</div>
                          <div style={{ fontSize: '11px', color: '#78350f' }}>{targetSlipConfig.partySymbolName || 'कमल का फूल'}</div>
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <label style={{ padding: '5px 10px', background: '#ea580c', color: '#fff', fontSize: '11px', fontWeight: 700, borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Upload size={12} />
                          <span>अपलोड</span>
                          <input type="file" accept="image/*" style={{ display: 'none' }} onChange={(e) => { const f = e.target.files?.[0]; if (f) handleStudioImageUpload(f, 'partySymbolImage'); }} />
                        </label>
                        {targetSlipConfig.partySymbolImage && (
                          <button type="button" onClick={() => setTargetSlipConfig((prev) => ({ ...prev, partySymbolImage: '' }))} style={{ background: '#fee2e2', border: '1px solid #fecaca', color: '#b91c1c', borderRadius: '6px', padding: '4px 6px', cursor: 'pointer' }} title="हटाएं">
                            <Trash2 size={12} />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Right: Candidate Photo Quick Upload */}
                    <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '8px', padding: '10px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {targetSlipConfig.candidateImage ? (
                          <img src={targetSlipConfig.candidateImage} alt="" style={{ width: '36px', height: '36px', objectFit: 'cover', borderRadius: '50%', border: '1px solid #3b82f6' }} />
                        ) : (
                          <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#bfdbfe', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#1e3a8a', fontWeight: 800, fontSize: '11px' }}>फोटो</div>
                        )}
                        <div>
                          <div style={{ fontSize: '12px', fontWeight: 700, color: '#1e40af' }}>प्रत्याशी फ़ोटो</div>
                          <div style={{ fontSize: '11px', color: '#1e3a8a' }}>{targetSlipConfig.candidateName || 'उम्मीदवार'}</div>
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <label style={{ padding: '5px 10px', background: '#1e3a8a', color: '#fff', fontSize: '11px', fontWeight: 700, borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Upload size={12} />
                          <span>अपलोड</span>
                          <input type="file" accept="image/*" style={{ display: 'none' }} onChange={(e) => { const f = e.target.files?.[0]; if (f) handleStudioImageUpload(f, 'candidateImage'); }} />
                        </label>
                        {targetSlipConfig.candidateImage && (
                          <button type="button" onClick={() => setTargetSlipConfig((prev) => ({ ...prev, candidateImage: '' }))} style={{ background: '#fee2e2', border: '1px solid #fecaca', color: '#b91c1c', borderRadius: '6px', padding: '4px 6px', cursor: 'pointer' }} title="हटाएं">
                            <Trash2 size={12} />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Centered Save Action Button for Mobile & Desktop */}
                  <div style={{ marginTop: '20px', width: '100%', maxWidth: '560px' }}>
                    <button
                      className="button-primary"
                      type="button"
                      onClick={saveClientBranding}
                      disabled={savingBranding}
                      style={{ width: '100%', padding: '14px 20px', fontSize: '15px', fontWeight: 800, justifyContent: 'center' }}
                    >
                      {savingBranding ? <LoaderCircle size={18} className="spin" /> : <Check size={18} />}
                      <span>&apos;{organizations.find((o) => o.id === brandingTargetOrgId)?.name || 'क्लाइंट'}&apos; की पर्ची ब्रांडिंग सेव करें</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ================= MODE 2: CLASSIC FORM MODE ================= */}
            {studioMode === 'form' && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 300px), 1fr))', gap: '24px', alignItems: 'start' }}>
                {/* Form Controls */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {/* Card 1: प्रत्याशी व पार्टी */}
                  <div style={{ background: '#ffffff', borderRadius: '14px', border: '1px solid #e2e8f0', padding: '18px' }}>
                    <div style={{ fontSize: '14px', fontWeight: 700, color: '#1e3a8a', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <User size={16} />
                      <span>उम्मीदवार व पार्टी विवरण</span>
                    </div>

                    {/* Default Slip Format */}
                    <div style={{ background: '#f0f9ff', padding: '10px 12px', borderRadius: '8px', border: '1px solid #bae6fd', marginBottom: '14px' }}>
                      <span style={{ fontSize: '12px', fontWeight: 700, color: '#0369a1', display: 'block', marginBottom: '6px' }}>
                        डिफ़ॉल्ट पर्ची प्रारूप (Default Slip Format):
                      </span>
                      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '12px', color: '#0f172a', fontWeight: 600 }}>
                          <input
                            type="radio"
                            name="adminSlipFormat"
                            checked={targetSlipConfig.slipFormat !== 'compact'}
                            onChange={() => setTargetSlipConfig({ ...targetSlipConfig, slipFormat: 'full' })}
                          />
                          <span>🏷️ पूर्ण प्रचार पर्ची</span>
                        </label>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '12px', color: '#0f172a', fontWeight: 600 }}>
                          <input
                            type="radio"
                            name="adminSlipFormat"
                            checked={targetSlipConfig.slipFormat === 'compact'}
                            onChange={() => setTargetSlipConfig({ ...targetSlipConfig, slipFormat: 'compact' })}
                          />
                          <span>📄 सादी / केवल विवरण पर्ची</span>
                        </label>
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '12px', marginBottom: '12px' }}>
                      <label style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '12px', fontWeight: 600, color: '#334155' }}>
                        प्रत्याशी नाम (हिंदी) *
                        <input
                          style={{ width: '100%', padding: '8px 12px', border: '1.5px solid #cbd5e1', borderRadius: '8px', fontSize: '13px' }}
                          value={targetSlipConfig.candidateName || ''}
                          onChange={(e) => setTargetSlipConfig({ ...targetSlipConfig, candidateName: e.target.value })}
                          placeholder="उदा. प्रसन्न चंद मेहता"
                        />
                      </label>
                      <label style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '12px', fontWeight: 600, color: '#334155' }}>
                        Candidate Name (English)
                        <input
                          style={{ width: '100%', padding: '8px 12px', border: '1.5px solid #cbd5e1', borderRadius: '8px', fontSize: '13px' }}
                          value={targetSlipConfig.candidateNameEn || ''}
                          onChange={(e) => setTargetSlipConfig({ ...targetSlipConfig, candidateNameEn: e.target.value })}
                          placeholder="Prasann Chand Mehta"
                        />
                      </label>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 0.8fr', gap: '12px', marginBottom: '12px' }}>
                      <label style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '12px', fontWeight: 600, color: '#334155' }}>
                        पार्टी का नाम *
                        <input
                          style={{ width: '100%', padding: '8px 12px', border: '1.5px solid #cbd5e1', borderRadius: '8px', fontSize: '13px' }}
                          value={targetSlipConfig.partyName || ''}
                          onChange={(e) => setTargetSlipConfig({ ...targetSlipConfig, partyName: e.target.value })}
                          placeholder="भाजपा प्रत्याशी"
                        />
                      </label>
                      <label style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '12px', fontWeight: 600, color: '#334155' }}>
                        चुनाव चिन्ह नाम *
                        <input
                          style={{ width: '100%', padding: '8px 12px', border: '1.5px solid #cbd5e1', borderRadius: '8px', fontSize: '13px' }}
                          value={targetSlipConfig.partySymbolName || ''}
                          onChange={(e) => setTargetSlipConfig({ ...targetSlipConfig, partySymbolName: e.target.value })}
                          placeholder="कमल का फूल"
                        />
                      </label>
                      <label style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '12px', fontWeight: 600, color: '#334155' }}>
                        EVM क्रम नं. *
                        <input
                          style={{ width: '100%', padding: '8px 12px', border: '1.5px solid #cbd5e1', borderRadius: '8px', fontSize: '13px' }}
                          value={targetSlipConfig.evmNumber || ''}
                          onChange={(e) => setTargetSlipConfig({ ...targetSlipConfig, evmNumber: e.target.value })}
                          placeholder="1"
                        />
                      </label>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
                      <label style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '12px', fontWeight: 600, color: '#334155' }}>
                        शीर्षक अपील (Header Appeal)
                        <input
                          style={{ width: '100%', padding: '8px 12px', border: '1.5px solid #cbd5e1', borderRadius: '8px', fontSize: '13px' }}
                          value={targetSlipConfig.appealHeadline || ''}
                          onChange={(e) => setTargetSlipConfig({ ...targetSlipConfig, appealHeadline: e.target.value })}
                          placeholder="(1 नंबर पर कमल का फूल का बटन दबाएं)"
                        />
                      </label>
                      <label style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '12px', fontWeight: 600, color: '#334155' }}>
                        उपशीर्षक / क्षेत्र (Ward / Area)
                        <input
                          style={{ width: '100%', padding: '8px 12px', border: '1.5px solid #cbd5e1', borderRadius: '8px', fontSize: '13px' }}
                          value={targetSlipConfig.subTitle || ''}
                          onChange={(e) => setTargetSlipConfig({ ...targetSlipConfig, subTitle: e.target.value })}
                          placeholder="वार्ड नंबर 82 Jodhpur"
                        />
                      </label>
                    </div>
                  </div>

                  {/* Card 2: EVM पट्टी व अपील */}
                  <div style={{ background: '#ffffff', borderRadius: '14px', border: '1px solid #e2e8f0', padding: '18px' }}>
                    <div style={{ fontSize: '14px', fontWeight: 700, color: '#1e3a8a', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <MessageCircle size={16} />
                      <span>EVM पट्टी व अपील संदेश</span>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      <label style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '12px', fontWeight: 600, color: '#334155' }}>
                        EVM पट्टी अपील संदेश
                        <input
                          style={{ width: '100%', padding: '8px 12px', border: '1.5px solid #cbd5e1', borderRadius: '8px', fontSize: '13px' }}
                          value={targetSlipConfig.appealText || ''}
                          onChange={(e) => setTargetSlipConfig({ ...targetSlipConfig, appealText: e.target.value })}
                          placeholder="को अपना अमूल्य वोट देकर भारी मतों से विजय बनाएं।"
                        />
                      </label>

                      <label style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '12px', fontWeight: 600, color: '#334155' }}>
                        बॉटम अपील (Footer Banner)
                        <input
                          style={{ width: '100%', padding: '8px 12px', border: '1.5px solid #cbd5e1', borderRadius: '8px', fontSize: '13px' }}
                          value={targetSlipConfig.footerAppeal || ''}
                          onChange={(e) => setTargetSlipConfig({ ...targetSlipConfig, footerAppeal: e.target.value })}
                          placeholder="कमल का बटन दबाएं और भारी मतों से विजयी बनाएं"
                        />
                      </label>

                    </div>
                  </div>

                  {/* Card: Ward-wise Polling Stations Management */}
                  <WardPollingStationEditor
                    config={targetSlipConfig}
                    onChange={setTargetSlipConfig}
                    availableWards={Array.from(new Set([
                      ...(organizations.find((o) => o.id === brandingTargetOrgId)?.wards || []),
                      ...clientWardsSummary,
                    ]))}
                    selectedPreviewWard={selectedPreviewWard || (organizations.find((o) => o.id === brandingTargetOrgId)?.wards?.[0] || '82')}
                    onPreviewWardChange={setSelectedPreviewWard}
                    organizationName={organizations.find((o) => o.id === brandingTargetOrgId)?.name || 'क्लाइंट'}
                  />

                  {/* Card 3: दोनों तरफ की फ़ोटो */}
                  <div style={{ background: '#ffffff', borderRadius: '14px', border: '1px solid #e2e8f0', padding: '18px' }}>
                    <div style={{ fontSize: '14px', fontWeight: 700, color: '#1e3a8a', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Upload size={16} />
                      <span>आधिकारिक फ़ोटो अपलोड (दोनों तरफ)</span>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '14px' }}>
                      {/* Left: Party Symbol Image Upload */}
                      <div style={{ padding: '14px', background: '#fff7ed', borderRadius: '10px', border: '1.5px dashed #ea580c', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <span style={{ fontSize: '12px', fontWeight: 700, color: '#ea580c' }}>
                            बाएं तरफ: चुनाव चिन्ह
                          </span>
                          {targetSlipConfig.partySymbolImage && (
                            <span style={{ fontSize: '11px', color: '#15803d', fontWeight: 700, background: '#dcfce7', padding: '1px 6px', borderRadius: '4px' }}>
                              अपलोड है
                            </span>
                          )}
                        </div>

                        {targetSlipConfig.partySymbolImage ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: '#ffffff', padding: '8px', borderRadius: '8px', border: '1px solid #fed7aa' }}>
                            <img
                              src={targetSlipConfig.partySymbolImage}
                              alt="Symbol"
                              style={{ width: '44px', height: '44px', objectFit: 'contain', borderRadius: '4px' }}
                            />
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontSize: '11px', fontWeight: 700, color: '#9a3412', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                कस्टम चिन्ह सक्रिय
                              </div>
                              <div style={{ fontSize: '10px', color: '#78350f' }}>पर्ची में बाएं दिखेगा</div>
                            </div>
                            <button
                              type="button"
                              onClick={() => setTargetSlipConfig({ ...targetSlipConfig, partySymbolImage: '' })}
                              style={{ background: '#fee2e2', border: '1px solid #fecaca', color: '#b91c1c', borderRadius: '6px', padding: '4px 8px', fontSize: '11px', fontWeight: 600, cursor: 'pointer' }}
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        ) : (
                          <div style={{ fontSize: '11px', color: '#9a3412', background: '#fff', padding: '6px 8px', borderRadius: '6px', border: '1px solid #fed7aa' }}>
                            चिन्ह फोटो अपलोड नहीं है (पर्ची में केवल अपलोड की गई फोटो दिखेगी)
                          </div>
                        )}

                        <label style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '6px',
                          padding: '7px 12px',
                          background: '#ea580c',
                          color: '#ffffff',
                          borderRadius: '6px',
                          fontSize: '12px',
                          fontWeight: 600,
                          cursor: 'pointer',
                          textAlign: 'center',
                        }}>
                          <Upload size={13} />
                          <span>{targetSlipConfig.partySymbolImage ? 'चिन्ह फ़ोटो बदलें' : 'चिन्ह फ़ोटो अपलोड करें'}</span>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) handleStudioImageUpload(file, 'partySymbolImage');
                            }}
                            style={{ display: 'none' }}
                          />
                        </label>
                      </div>

                      {/* Right: Candidate Photo Image Upload */}
                      <div style={{ padding: '14px', background: '#eff6ff', borderRadius: '10px', border: '1.5px dashed #1e3a8a', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <span style={{ fontSize: '12px', fontWeight: 700, color: '#1e3a8a' }}>
                            दाएं तरफ: प्रत्याशी फ़ोटो
                          </span>
                          {targetSlipConfig.candidateImage && (
                            <span style={{ fontSize: '11px', color: '#15803d', fontWeight: 700, background: '#dcfce7', padding: '1px 6px', borderRadius: '4px' }}>
                              अपलोड है
                            </span>
                          )}
                        </div>

                        {targetSlipConfig.candidateImage ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: '#ffffff', padding: '8px', borderRadius: '8px', border: '1px solid #bfdbfe' }}>
                            <img
                              src={targetSlipConfig.candidateImage}
                              alt="Candidate"
                              style={{ width: '44px', height: '44px', objectFit: 'cover', borderRadius: '50%', border: '1.5px solid #3b82f6' }}
                            />
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontSize: '11px', fontWeight: 700, color: '#1e40af', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                प्रत्याशी फ़ोटो सक्रिय
                              </div>
                              <div style={{ fontSize: '10px', color: '#1e3a8a' }}>पर्ची में दाएं दिखेगी</div>
                            </div>
                            <button
                              type="button"
                              onClick={() => setTargetSlipConfig({ ...targetSlipConfig, candidateImage: '' })}
                              style={{ background: '#fee2e2', border: '1px solid #fecaca', color: '#b91c1c', borderRadius: '6px', padding: '4px 8px', fontSize: '11px', fontWeight: 600, cursor: 'pointer' }}
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        ) : (
                          <div style={{ fontSize: '11px', color: '#1e40af', background: '#fff', padding: '6px 8px', borderRadius: '6px', border: '1px solid #bfdbfe' }}>
                            डिफ़ॉल्ट पोर्ट्रेट आइकन सक्रिय है
                          </div>
                        )}

                        <label style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '6px',
                          padding: '7px 12px',
                          background: '#1e3a8a',
                          color: '#ffffff',
                          borderRadius: '6px',
                          fontSize: '12px',
                          fontWeight: 600,
                          cursor: 'pointer',
                          textAlign: 'center',
                        }}>
                          <Upload size={13} />
                          <span>{targetSlipConfig.candidateImage ? 'प्रत्याशी फ़ोटो बदलें' : 'प्रत्याशी फ़ोटो अपलोड करें'}</span>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) handleStudioImageUpload(file, 'candidateImage');
                            }}
                            style={{ display: 'none' }}
                          />
                        </label>
                      </div>
                    </div>
                  </div>

                  {/* Save Button */}
                  <div style={{ marginTop: '4px', display: 'flex', gap: '12px', alignItems: 'center' }}>
                    <button
                      className="button-primary"
                      type="button"
                      onClick={saveClientBranding}
                      disabled={savingBranding}
                      style={{ padding: '12px 24px', fontSize: '14px', fontWeight: 700 }}
                    >
                      {savingBranding ? <LoaderCircle size={16} className="spin" /> : <Check size={16} />}
                      &apos;{organizations.find((o) => o.id === brandingTargetOrgId)?.name || 'क्लाइंट'}&apos; की पर्ची ब्रांडिंग सेव करें
                    </button>
                    <button
                      className="button-secondary"
                      type="button"
                      onClick={() => {
                        const org = organizations.find((o) => o.id === brandingTargetOrgId);
                        if (org) {
                          setTargetSlipConfig(org.slipConfig && Object.keys(org.slipConfig).length > 0 ? { ...defaultSlipConfig, ...org.slipConfig } : { ...defaultSlipConfig });
                        }
                      }}
                    >
                      रीसेट करें
                    </button>
                  </div>
                </div>

                {/* Right Column: Real-Time Live Voter Slip Preview */}
                <div style={{
                  background: '#ffffff',
                  borderRadius: '16px',
                  border: '1.5px solid #cbd5e1',
                  boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.05)',
                  padding: '20px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '14px',
                }}>
                  {/* Header */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', borderBottom: '1.5px solid #f1f5f9', paddingBottom: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div>
                        <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 800, color: '#0f172a' }}>
                          लाइव पर्ची पूर्वावलोकन (Live Preview)
                        </h3>
                        <span style={{ fontSize: '12px', color: '#64748b' }}>
                          संगठन: <strong style={{ color: '#1e3a8a' }}>{organizations.find((o) => o.id === brandingTargetOrgId)?.name || 'क्लाइंट'}</strong>
                        </span>
                      </div>
                    </div>
                    <span style={{ fontSize: '11px', fontWeight: 700, color: '#16a34a', background: '#dcfce7', border: '1px solid #bbf7d0', padding: '3px 8px', borderRadius: '20px' }}>
                      ● Real-Time Sync
                    </span>
                  </div>

                  <div style={{
                    width: '100%',
                    display: 'flex',
                    justifyContent: 'center',
                    overflow: 'hidden',
                    padding: '4px 0',
                  }}>
                    <div style={{ width: '100%', maxWidth: '520px' }}>
                      <VoterSlipTemplate
                        voter={{
                          epic: 'RLJ1213180',
                          nameHi: 'जबरा राम',
                          nameEn: 'Jabra Ram',
                          relativeNameHi: 'नरिगा राम',
                          relativeNameEn: 'Nariga Ram',
                          relationType: 'पिता',
                          age: 28,
                          gender: 'पुरुष',
                          houseNo: '279',
                          wardNo: selectedPreviewWard || (organizations.find((o) => o.id === brandingTargetOrgId)?.wards?.[0] || '82'),
                          partNo: '1',
                          serialNo: 1,
                        }}
                        config={targetSlipConfig}
                        isInline={true}
                        isEditable={false}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {/* ========================================================================= */}
        {/* VIEW 9: META WHATSAPP TEMPLATE MANAGEMENT SUITE                           */}
        {/* ========================================================================= */}
        {activeView === 'templates' && (
          <>
            {/* Top Overview & Policy Notification */}
            <div style={{
              background: '#ffffff',
              borderRadius: '16px',
              border: '1.5px solid #e2e8f0',
              padding: '24px 20px',
              marginBottom: '20px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.03)',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '14px', marginBottom: '16px' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                    <span style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px',
                      background: '#ecfdf5',
                      color: '#047857',
                      fontSize: '11.5px',
                      fontWeight: 800,
                      padding: '3px 9px',
                      borderRadius: '20px',
                      border: '1px solid #a7f3d0'
                    }}>
                      <Sparkles size={13} /> META CLOUD API
                    </span>
                    <span style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px',
                      background: isLiveFromMeta ? '#eff6ff' : '#fffbeb',
                      color: isLiveFromMeta ? '#1d4ed8' : '#b45309',
                      fontSize: '11px',
                      fontWeight: 700,
                      padding: '3px 8px',
                      borderRadius: '20px',
                      border: `1px solid ${isLiveFromMeta ? '#bfdbfe' : '#fde68a'}`
                    }}>
                      ● {isLiveFromMeta ? 'Meta API से लाइव कनेक्टेड' : 'मानक प्रीसेट मोड'}
                    </span>
                  </div>
                  <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#0f172a', margin: '0 0 6px 0' }}>
                    Meta WhatsApp टेम्पलेट मैनेजमेंट
                  </h2>
                  <p style={{ fontSize: '13px', color: '#64748b', margin: 0, maxWidth: '780px', lineHeight: 1.5 }}>
                    Meta (Facebook) की 24-घंटे नीति के अनुसार, मतदाता को पहली बार पर्ची भेजने के लिए स्वीकृत (Approved) टेम्पलेट आवश्यक होता है। यहाँ से आप सक्रिय टेम्पलेट चुन सकते हैं, जो संपूर्ण सिस्टम में सभी कार्यकर्ताओं के लिए स्वतः लागू रहेगा।
                  </p>
                </div>

                <button
                  className="button-secondary"
                  type="button"
                  onClick={() => void loadMetaTemplates()}
                  disabled={loadingTemplates}
                  style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12.5px', padding: '8px 14px' }}
                >
                  <RefreshCw size={14} className={loadingTemplates ? 'spin' : ''} />
                  <span>टेम्पलेट्स रीफ्रेश करें</span>
                </button>
              </div>

              {/* Organization Scope Filter */}
              <div style={{
                background: '#f8fafc',
                borderRadius: '12px',
                border: '1px solid #e2e8f0',
                padding: '12px 16px',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                flexWrap: 'wrap'
              }}>
                <span style={{ fontSize: '12px', fontWeight: 700, color: '#334155' }}>लागू करने का दायरा:</span>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', flex: 1 }}>
                  <button
                    type="button"
                    onClick={() => {
                      setTemplateTargetOrgId('');
                      void loadMetaTemplates('');
                    }}
                    style={{
                      padding: '5px 12px',
                      fontSize: '12px',
                      fontWeight: templateTargetOrgId === '' ? 700 : 500,
                      background: templateTargetOrgId === '' ? '#0284c7' : '#ffffff',
                      color: templateTargetOrgId === '' ? '#ffffff' : '#475569',
                      border: '1px solid',
                      borderColor: templateTargetOrgId === '' ? '#0284c7' : '#cbd5e1',
                      borderRadius: '8px',
                      cursor: 'pointer'
                    }}
                  >
                    ग्लोबल डिफ़ॉल्ट (सभी संगठन)
                  </button>
                  {organizations.map((org, idx) => {
                    const isSel = templateTargetOrgId === org.id;
                    return (
                      <button
                        key={`${org.id}-${idx}`}
                        type="button"
                        onClick={() => {
                          setTemplateTargetOrgId(org.id);
                          void loadMetaTemplates(org.id);
                        }}
                        style={{
                          padding: '5px 12px',
                          fontSize: '12px',
                          fontWeight: isSel ? 700 : 500,
                          background: isSel ? '#0284c7' : '#ffffff',
                          color: isSel ? '#ffffff' : '#475569',
                          border: '1px solid',
                          borderColor: isSel ? '#0284c7' : '#cbd5e1',
                          borderRadius: '8px',
                          cursor: 'pointer'
                        }}
                      >
                        {org.name}
                      </button>
                    );
                  })}
                </div>
              </div>

            </div>

            {/* Main 2-Column Grid Studio */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 460px), 1fr))',
              gap: '24px',
              alignItems: 'start',
              marginBottom: '32px'
            }}>
              {/* ================= LEFT COLUMN: TEMPLATE CARDS & CREATOR ================= */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                
                {/* Active Template Status Card */}
                {(() => {
                  const activeTmplObj = metaTemplates.find((t) => t.name.toLowerCase() === activeMetaTemplate.toLowerCase());
                  const isApproved = activeTmplObj?.status === 'APPROVED' || !activeTmplObj?.status;
                  const isPending = activeTmplObj?.status === 'PENDING';
                  const isRejected = activeTmplObj?.status === 'REJECTED';
                  const hasActiveImageHeader = activeTmplObj?.hasImageHeader || activeTmplObj?.components?.some((c: any) => c.type?.toUpperCase() === 'HEADER' && c.format?.toUpperCase() === 'IMAGE');

                  return (
                    <div style={{
                      background: 'linear-gradient(135deg, #065f46 0%, #047857 100%)',
                      borderRadius: '16px',
                      padding: '22px',
                      color: '#ffffff',
                      boxShadow: '0 8px 24px rgba(4, 120, 87, 0.2)',
                      position: 'relative',
                      overflow: 'hidden'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
                        <span style={{
                          background: 'rgba(255,255,255,0.2)',
                          fontSize: '11px',
                          fontWeight: 800,
                          padding: '4px 11px',
                          borderRadius: '12px',
                          backdropFilter: 'blur(4px)',
                          letterSpacing: '0.5px'
                        }}>
                          ✓ CURRENT ACTIVE TEMPLATE
                        </span>
                        <span style={{ fontSize: '13px', fontWeight: 800, color: '#a7f3d0', background: 'rgba(0,0,0,0.18)', padding: '3px 10px', borderRadius: '8px' }}>
                          लागू दायरा: {templateTargetOrgId ? organizations.find(o => o.id === templateTargetOrgId)?.name : 'ग्लोबल (सभी क्लाइंट्स)'}
                        </span>
                      </div>

                      <div style={{ fontSize: '24px', fontWeight: 900, fontFamily: 'monospace', letterSpacing: '0.5px', marginBottom: '12px' }}>
                        {activeMetaTemplate}
                      </div>

                      {/* Prominent Status & Image Header Badges */}
                      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '14px' }}>
                        {isApproved ? (
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '5px',
                            background: '#ecfdf5',
                            color: '#065f46',
                            fontWeight: 800,
                            fontSize: '12px',
                            padding: '5px 12px',
                            borderRadius: '8px',
                            border: '1.5px solid #6ee7b7'
                          }}>
                            <Check size={14} /> Meta Approved (स्वीकृत)
                          </span>
                        ) : isPending ? (
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '5px',
                            background: '#fffbeb',
                            color: '#92400e',
                            fontWeight: 800,
                            fontSize: '12px',
                            padding: '5px 12px',
                            borderRadius: '8px',
                            border: '1.5px solid #fde68a'
                          }}>
                            ⏳ Meta Pending (समीक्षाधीन)
                          </span>
                        ) : (
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '5px',
                            background: '#fef2f2',
                            color: '#991b1b',
                            fontWeight: 800,
                            fontSize: '12px',
                            padding: '5px 12px',
                            borderRadius: '8px',
                            border: '1.5px solid #fca5a5'
                          }}>
                            ❌ Meta Rejected (अस्वीकृत)
                          </span>
                        )}

                        {hasActiveImageHeader ? (
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '5px',
                            background: '#e0f2fe',
                            color: '#0369a1',
                            fontWeight: 800,
                            fontSize: '12px',
                            padding: '5px 12px',
                            borderRadius: '8px',
                            border: '1.5px solid #7dd3fc'
                          }}>
                            🖼️ पर्ची इमेज/फोटो साथ जाएगी (IMAGE Header Active)
                          </span>
                        ) : (
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '5px',
                            background: 'rgba(255,255,255,0.2)',
                            color: '#ffffff',
                            fontWeight: 700,
                            fontSize: '12px',
                            padding: '5px 12px',
                            borderRadius: '8px',
                            border: '1px solid rgba(255,255,255,0.3)'
                          }}>
                            📄 केवल टेक्स्ट (बिना फोटो/इमेज)
                          </span>
                        )}

                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '5px',
                          background: 'rgba(255,255,255,0.2)',
                          color: '#ffffff',
                          fontWeight: 700,
                          fontSize: '12px',
                          padding: '5px 12px',
                          borderRadius: '8px',
                          border: '1px solid rgba(255,255,255,0.3)'
                        }}>
                          📁 {activeTmplObj?.category || 'UTILITY'}
                        </span>
                      </div>

                      <div style={{ fontSize: '13px', color: '#d1fae5', lineHeight: 1.5, background: 'rgba(0,0,0,0.14)', padding: '10px 14px', borderRadius: '10px' }}>
                        💡 <strong>गारंटीड डिलीवरी:</strong> जब भी कोई यूजर या कार्यकर्ता इस क्लाइंट के लिए &apos;WhatsApp पर भेजें&apos; दबाएगा, तो शत-प्रतिशत यही सक्रिय टेम्पलेट (<strong>{activeMetaTemplate}</strong>) {hasActiveImageHeader ? 'पर्ची फोटो के साथ' : ''} डिलीवर होगा।
                      </div>
                    </div>
                  );
                })()}

                {/* Templates Selector List */}
                <div style={{
                  background: '#ffffff',
                  borderRadius: '16px',
                  border: '1.5px solid #e2e8f0',
                  padding: '20px',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.03)'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                      उपलब्ध Meta टेम्पलेट्स ({metaTemplates.length})
                    </h3>
                    <span style={{ fontSize: '12px', color: '#64748b' }}>क्लिक करके सक्रिय करें</span>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {metaTemplates.map((tmpl) => {
                      const isActive = tmpl.name.toLowerCase() === activeMetaTemplate.toLowerCase();
                      const bodyComp = tmpl.components?.find((c) => c.type.toUpperCase() === 'BODY');
                      const headerComp = tmpl.components?.find((c) => c.type.toUpperCase() === 'HEADER');

                      return (
                        <div
                          key={tmpl.name}
                          style={{
                            borderRadius: '12px',
                            border: `2px solid ${isActive ? '#10b981' : '#e2e8f0'}`,
                            background: isActive ? '#f0fdf4' : '#ffffff',
                            padding: '16px',
                            transition: 'all 0.2s ease',
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px', marginBottom: '8px' }}>
                            <div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                <span style={{ fontWeight: 800, fontSize: '15px', fontFamily: 'monospace', color: '#0f172a' }}>
                                  {tmpl.name}
                                </span>
                                <span style={{
                                  fontSize: '11px',
                                  fontWeight: 800,
                                  color: tmpl.status === 'APPROVED' || !tmpl.status ? '#059669' : tmpl.status === 'PENDING' ? '#b45309' : '#dc2626',
                                  background: tmpl.status === 'APPROVED' || !tmpl.status ? '#d1fae5' : tmpl.status === 'PENDING' ? '#fef3c7' : '#fee2e2',
                                  padding: '2px 8px',
                                  borderRadius: '6px',
                                  border: `1px solid ${tmpl.status === 'APPROVED' || !tmpl.status ? '#a7f3d0' : '#fde68a'}`
                                }}>
                                  {tmpl.status === 'APPROVED' || !tmpl.status ? '✓ APPROVED' : tmpl.status}
                                </span>
                                <span style={{
                                  fontSize: '11px',
                                  fontWeight: 800,
                                  color: (tmpl.hasImageHeader || headerComp?.format === 'IMAGE' || tmpl.components?.some((c: any) => c.format === 'IMAGE')) ? '#0369a1' : '#475569',
                                  background: (tmpl.hasImageHeader || headerComp?.format === 'IMAGE' || tmpl.components?.some((c: any) => c.format === 'IMAGE')) ? '#e0f2fe' : '#f1f5f9',
                                  padding: '2px 8px',
                                  borderRadius: '6px',
                                  border: `1px solid ${(tmpl.hasImageHeader || headerComp?.format === 'IMAGE' || tmpl.components?.some((c: any) => c.format === 'IMAGE')) ? '#bae6fd' : '#e2e8f0'}`
                                }}>
                                  {(tmpl.hasImageHeader || headerComp?.format === 'IMAGE' || tmpl.components?.some((c: any) => c.format === 'IMAGE')) ? '🖼️ फोटो / पर्ची इमेज साथ जाएगी' : '📄 केवल टेक्स्ट'}
                                </span>
                                <span style={{
                                  fontSize: '10.5px',
                                  fontWeight: 700,
                                  color: '#475569',
                                  background: '#f1f5f9',
                                  padding: '2px 6px',
                                  borderRadius: '6px'
                                }}>
                                  {tmpl.language || 'hi'} • {tmpl.category || 'UTILITY'}
                                </span>
                              </div>
                              {headerComp?.text && (
                                <div style={{ fontSize: '12px', fontWeight: 700, color: '#047857', marginTop: '4px' }}>
                                  हेडर टेक्स्ट: {headerComp.text}
                                </div>
                              )}
                            </div>

                            {isActive ? (
                              <span style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                background: '#10b981',
                                color: '#ffffff',
                                fontSize: '11.5px',
                                fontWeight: 800,
                                padding: '5px 12px',
                                borderRadius: '8px',
                                flexShrink: 0
                              }}>
                                <Check size={13} /> सक्रिय (Active)
                              </span>
                            ) : (
                              <button
                                type="button"
                                disabled={savingTemplate}
                                onClick={() => void handleSelectActiveTemplate(tmpl.name, tmpl.language || 'hi')}
                                style={{
                                  background: '#0284c7',
                                  color: '#ffffff',
                                  border: 'none',
                                  fontSize: '11.5px',
                                  fontWeight: 700,
                                  padding: '6px 12px',
                                  borderRadius: '8px',
                                  cursor: 'pointer',
                                  flexShrink: 0
                                }}
                              >
                                {savingTemplate ? 'सेव हो रहा...' : 'सक्रिय बनाएं'}
                              </button>
                            )}
                          </div>

                          <div style={{
                            fontSize: '12px',
                            color: '#475569',
                            background: isActive ? 'rgba(255,255,255,0.7)' : '#f8fafc',
                            padding: '10px 12px',
                            borderRadius: '8px',
                            border: '1px solid #e2e8f0',
                            whiteSpace: 'pre-line',
                            lineHeight: 1.45,
                            maxHeight: '120px',
                            overflowY: 'auto'
                          }}>
                            {bodyComp?.text || 'कोई बॉडी टेक्स्ट नहीं'}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Create New Meta Template Form */}
                <div style={{
                  background: '#ffffff',
                  borderRadius: '16px',
                  border: '1.5px solid #e2e8f0',
                  padding: '20px',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.03)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
                    <Plus size={16} color="#0284c7" />
                    <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                      नया Meta WhatsApp टेम्पलेट सबमिट करें
                    </h3>
                  </div>
                  <p style={{ fontSize: '12px', color: '#64748b', margin: '0 0 16px 0', lineHeight: 1.5 }}>
                    नया टेम्पलेट सीधे Meta Cloud API को सत्यापन एवं स्वीकृति (Approval) हेतु भेजा जाएगा।
                  </p>

                  <form onSubmit={handleCreateMetaTemplate} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
                      <label style={{ fontSize: '12px', fontWeight: 700, color: '#334155' }}>
                        टेम्पलेट का नाम (Name)*
                        <input
                          type="text"
                          required
                          value={newTmplName}
                          onChange={(e) => setNewTmplName(e.target.value)}
                          placeholder="e.g. voter_slip_custom_hi"
                          pattern="^[a-z0-9_]+$"
                          style={{
                            width: '100%',
                            padding: '8px 10px',
                            fontSize: '12.5px',
                            borderRadius: '8px',
                            border: '1px solid #cbd5e1',
                            marginTop: '4px',
                            boxSizing: 'border-box'
                          }}
                        />
                        <span style={{ fontSize: '10px', color: '#94a3b8' }}>केवल छोटे अक्षर, संख्या और अंडरस्कोर (_)</span>
                      </label>

                      <label style={{ fontSize: '12px', fontWeight: 700, color: '#334155' }}>
                        श्रेणी (Category)
                        <select
                          value={newTmplCategory}
                          onChange={(e) => setNewTmplCategory(e.target.value)}
                          style={{
                            width: '100%',
                            padding: '8px 10px',
                            fontSize: '12.5px',
                            borderRadius: '8px',
                            border: '1px solid #cbd5e1',
                            marginTop: '4px',
                            boxSizing: 'border-box',
                            background: '#ffffff'
                          }}
                        >
                          <option value="UTILITY">UTILITY (मतदाता पर्ची, सेवा संदेश)</option>
                          <option value="MARKETING">MARKETING (प्रचार व अपील)</option>
                        </select>
                      </label>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
                      <label style={{ fontSize: '12px', fontWeight: 700, color: '#334155' }}>
                        हेडर टेक्स्ट (वैकल्पिक)
                        <input
                          type="text"
                          value={newTmplHeader}
                          onChange={(e) => setNewTmplHeader(e.target.value)}
                          placeholder="डिजिटल मतदाता पर्ची"
                          style={{
                            width: '100%',
                            padding: '8px 10px',
                            fontSize: '12.5px',
                            borderRadius: '8px',
                            border: '1px solid #cbd5e1',
                            marginTop: '4px',
                            boxSizing: 'border-box'
                          }}
                        />
                      </label>

                      <label style={{ fontSize: '12px', fontWeight: 700, color: '#334155' }}>
                        फ़ूटर टेक्स्ट (वैकल्पिक)
                        <input
                          type="text"
                          value={newTmplFooter}
                          onChange={(e) => setNewTmplFooter(e.target.value)}
                          placeholder="विजयसेतु"
                          style={{
                            width: '100%',
                            padding: '8px 10px',
                            fontSize: '12.5px',
                            borderRadius: '8px',
                            border: '1px solid #cbd5e1',
                            marginTop: '4px',
                            boxSizing: 'border-box'
                          }}
                        />
                      </label>
                    </div>

                    <label style={{ fontSize: '12px', fontWeight: 700, color: '#334155' }}>
                      बॉडी टेक्स्ट (Body with Variables)*
                      <textarea
                        required
                        rows={6}
                        value={newTmplBody}
                        onChange={(e) => setNewTmplBody(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '10px',
                          fontSize: '12.5px',
                          borderRadius: '8px',
                          border: '1px solid #cbd5e1',
                          marginTop: '4px',
                          boxSizing: 'border-box',
                          fontFamily: 'inherit',
                          lineHeight: 1.5
                        }}
                      />
                      <span style={{ fontSize: '11px', color: '#64748b', display: 'block', marginTop: '4px' }}>
                        चर मान: &#123;&#123;1&#125;&#125;=नाम, &#123;&#123;2&#125;&#125;=EPIC, &#123;&#123;3&#125;&#125;=वार्ड, &#123;&#123;4&#125;&#125;=भाग, &#123;&#123;5&#125;&#125;=क्रमांक, &#123;&#123;6&#125;&#125;=मतदान केंद्र
                      </span>
                    </label>

                    <button
                      type="submit"
                      disabled={creatingTemplate}
                      className="button-primary"
                      style={{ padding: '9px 18px', fontSize: '13px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                    >
                      {creatingTemplate ? <LoaderCircle size={15} className="spin" /> : <Send size={15} />}
                      <span>Meta को सबमिट करें (Submit to Meta)</span>
                    </button>
                  </form>
                </div>

              </div>

              {/* ================= RIGHT COLUMN: LIVE PHONE PREVIEW & TEST SEND ================= */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

                {/* WhatsApp Chat Simulation Mockup */}
                <div style={{
                  background: '#ffffff',
                  borderRadius: '24px',
                  border: '1.5px solid #cbd5e1',
                  boxShadow: '0 12px 30px rgba(0,0,0,0.06)',
                  overflow: 'hidden',
                  maxWidth: '440px',
                  margin: '0 auto',
                  width: '100%'
                }}>
                  {/* WhatsApp App Bar */}
                  <div style={{
                    background: '#075e54',
                    padding: '14px 16px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    color: '#ffffff'
                  }}>
                    <div style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '50%',
                      background: '#128c7e',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 800,
                      fontSize: '14px',
                      border: '1.5px solid #25d366'
                    }}>
                      VS
                    </div>
                    <div>
                      <div style={{ fontSize: '14px', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <span>विजयसेतु आधिकारिक</span>
                        <CheckCheck size={14} color="#25d366" />
                      </div>
                      <div style={{ fontSize: '11px', color: '#dcfce7' }}>Official WhatsApp Business</div>
                    </div>
                  </div>

                  {/* Chat Wallpaper Background */}
                  <div style={{
                    background: '#e5ddd5',
                    backgroundImage: 'radial-gradient(#d1c7bc 1px, transparent 1px)',
                    backgroundSize: '16px 16px',
                    padding: '24px 16px',
                    minHeight: '380px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'flex-start'
                  }}>
                    <div style={{
                      alignSelf: 'center',
                      background: '#ffffff',
                      color: '#64748b',
                      fontSize: '11px',
                      fontWeight: 700,
                      padding: '4px 12px',
                      borderRadius: '12px',
                      marginBottom: '16px',
                      boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                    }}>
                      आज
                    </div>

                    {/* WhatsApp Message Bubble */}
                    <div style={{
                      background: '#ffffff',
                      borderRadius: '12px 12px 12px 2px',
                      padding: '14px',
                      boxShadow: '0 2px 5px rgba(0,0,0,0.08)',
                      maxWidth: '92%',
                      position: 'relative'
                    }}>
                      {/* Message Header */}
                      <div style={{
                        fontSize: '13.5px',
                        fontWeight: 800,
                        color: '#075e54',
                        marginBottom: '8px',
                        borderBottom: '1px solid #f1f5f9',
                        paddingBottom: '6px'
                      }}>
                        डिजिटल मतदाता सूचना पर्ची 🗳️
                      </div>

                      {/* Message Body with Highlighted Values */}
                      <div style={{ fontSize: '12.5px', color: '#1e293b', lineHeight: 1.5, whiteSpace: 'pre-line' }}>
                        {(() => {
                          const tmpl = metaTemplates.find((t) => t.name === activeMetaTemplate) || metaTemplates[0];
                          const body = tmpl?.components?.find((c) => c.type.toUpperCase() === 'BODY')?.text;
                          if (body) {
                            return body
                              .replace(/\{\{1\}\}/g, 'रमेश कुमार')
                              .replace(/\{\{2\}\}/g, 'RJ/17/105/012345')
                              .replace(/\{\{3\}\}/g, '12')
                              .replace(/\{\{4\}\}/g, '45')
                              .replace(/\{\{5\}\}/g, '142')
                              .replace(/\{\{6\}\}/g, 'राजकीय उच्च प्राथमिक विद्यालय');
                          }
                          return `नमस्कार रमेश कुमार जी,\n\nआपकी डिजिटल मतदाता सूचना पर्ची विवरण:\n• पहचान पत्र: RJ/17/105/012345\n• वार्ड: 12 · भाग: 45\n• क्रमांक संख्या: #142\n• मतदान केंद्र: राजकीय उच्च प्राथमिक विद्यालय\n\nकृपया मतदान दिवस पर अपना पहचान पत्र साथ लाएं। आपका वोट, आपका अधिकार!`;
                        })()}
                      </div>

                      {/* Footer & Meta Time */}
                      <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginTop: '10px',
                        fontSize: '10.5px',
                        color: '#94a3b8'
                      }}>
                        <span>विजयसेतु चुनावी प्रबंधन</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                          <span>10:30 AM</span>
                          <CheckCheck size={13} color="#34b7f1" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Instant Test Send Box */}
                <div style={{
                  background: '#ffffff',
                  borderRadius: '16px',
                  border: '1.5px solid #e2e8f0',
                  padding: '20px',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.03)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                    <Smartphone size={16} color="#059669" />
                    <h3 style={{ fontSize: '15px', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                      सक्रिय टेम्पलेट का लाइव परीक्षण (Test Send)
                    </h3>
                  </div>
                  <p style={{ fontSize: '12px', color: '#64748b', margin: '0 0 14px 0', lineHeight: 1.45 }}>
                    अपने मोबाइल नंबर पर सक्रिय टेम्पलेट भेजकर देखें कि WhatsApp पर संदेश कैसा डिलीवर होता है।
                  </p>

                  <form onSubmit={handleTestSend} style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                    <input
                      type="tel"
                      required
                      placeholder="10 अंकों का मोबाइल नंबर (e.g. 9829012345)"
                      value={testPhone}
                      onChange={(e) => setTestPhone(e.target.value)}
                      style={{
                        flex: 1,
                        minWidth: '200px',
                        padding: '9px 12px',
                        fontSize: '13px',
                        borderRadius: '8px',
                        border: '1px solid #cbd5e1'
                      }}
                    />
                    <button
                      type="submit"
                      disabled={sendingTest}
                      style={{
                        background: '#059669',
                        color: '#ffffff',
                        border: 'none',
                        fontSize: '13px',
                        fontWeight: 700,
                        padding: '9px 16px',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}
                    >
                      {sendingTest ? <LoaderCircle size={15} className="spin" /> : <Send size={14} />}
                      <span>टेस्ट मैसेज भेजें</span>
                    </button>
                  </form>

                  {testSendResult && (
                    <div style={{
                      marginTop: '12px',
                      padding: '10px 14px',
                      borderRadius: '8px',
                      fontSize: '12.5px',
                      background: testSendResult.success ? '#dcfce7' : '#fee2e2',
                      color: testSendResult.success ? '#15803d' : '#b91c1c',
                      border: `1px solid ${testSendResult.success ? '#bbf7d0' : '#fecaca'}`,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}>
                      {testSendResult.success ? <Check size={15} /> : <AlertCircle size={15} />}
                      <span>{testSendResult.message}</span>
                    </div>
                  )}
                </div>

              </div>
            </div>
          </>
        )}

        {activeView === 'leads' && (
          <>
            <section className="feature-metrics">
              <article className="metric-card">
                <span>कुल पूछताछ (Total Leads)</span>
                <strong>{leads.length.toLocaleString('hi-IN')}</strong>
                <small>वेबसाइट डेमो फॉर्म से</small>
              </article>
              <article className="metric-card metric-card-green">
                <span>नई लीड्स (New)</span>
                <strong>{leads.filter((l) => l.status === 'new').length.toLocaleString('hi-IN')}</strong>
                <small>तुरंत संपर्क करने योग्य</small>
              </article>
              <article className="metric-card">
                <span>संपर्क / फाइनल</span>
                <strong>{leads.filter((l) => l.status === 'contacted' || l.status === 'converted').length.toLocaleString('hi-IN')}</strong>
                <small>फॉलो-अप जारी</small>
              </article>
            </section>

            <section className="records-panel">
              <div className="records-toolbar">
                <div>
                  <h2>वेबसाइट डेमो लीड्स व संपर्क पूछताछ</h2>
                  <p>वेबसाइट के फॉर्म से आए उम्मीदवारों के अनुरोध। 1-क्लिक में WhatsApp पर बात करें।</p>
                </div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <button className="button-secondary" type="button" onClick={() => void loadLeads()} disabled={loadingLeads}>
                    <RefreshCw size={14} className={loadingLeads ? 'spin' : ''} /> रिफ्रेश करें
                  </button>
                  <span className="panel-count">{leads.length} लीड्स</span>
                </div>
              </div>

              {loadingLeads ? (
                <div className="empty-state">
                  <LoaderCircle size={20} className="spin" />
                  <p>लीड्स लोड हो रही हैं…</p>
                </div>
              ) : leads.length ? (
                <>
                  {/* MOBILE VIEW (< 768px): Responsive Lead Cards */}
                  <div className="mobile-card-view" style={{ padding: '4px 0' }}>
                    {leads.map((lead) => {
                      const cleanPhone = lead.phone.replace(/\D/g, '');
                      const waLink = `https://wa.me/91${cleanPhone}?text=${encodeURIComponent(
                        `नमस्ते ${lead.name} जी,\n\nविजयसेतु (VijaySetu) चुनाव वॉर-रूम और वोटर सॉफ्टवेयर के डेमो के लिए आपका अनुरोध प्राप्त हुआ था।\n\nक्षेत्र: ${lead.constituency}\nचुनाव स्तर: ${lead.electionType}\n\nक्या अभी बात करने का सही समय है?`
                      )}`;

                      return (
                        <div
                          key={`mobile-${lead._id}`}
                          style={{
                            background: '#ffffff',
                            border: '1px solid #e2e8f0',
                            borderRadius: '12px',
                            padding: '16px',
                            boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '10px',
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                            <div>
                              <strong style={{ fontSize: '15px', color: '#0f172a' }}>{lead.name}</strong>
                              <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                                {new Date(lead.createdAt).toLocaleDateString('hi-IN', {
                                  day: 'numeric',
                                  month: 'short',
                                  year: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </div>
                            </div>
                            <select
                              aria-label="लीड स्थिति"
                              value={lead.status}
                              onChange={(e) => void updateLeadStatus(lead._id, e.target.value)}
                              style={{
                                fontSize: '12px',
                                padding: '4px 8px',
                                borderRadius: '6px',
                                border: '1px solid #cbd5e1',
                                background:
                                  lead.status === 'new' ? '#dcfce7' :
                                  lead.status === 'contacted' ? '#e0f2fe' :
                                  lead.status === 'converted' ? '#f3e8ff' : '#f1f5f9',
                                fontWeight: 700,
                                color:
                                  lead.status === 'new' ? '#15803d' :
                                  lead.status === 'contacted' ? '#0369a1' :
                                  lead.status === 'converted' ? '#7e22ce' : '#475569',
                              }}
                            >
                              <option value="new">नया (New)</option>
                              <option value="contacted">बातचीत हुई</option>
                              <option value="converted">फाइनल / एक्टिव</option>
                              <option value="closed">बंद</option>
                            </select>
                          </div>

                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                            <a
                              href={`tel:${lead.phone}`}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                fontSize: '12px',
                                fontWeight: 600,
                                color: '#059669',
                                background: '#ecfdf5',
                                padding: '4px 10px',
                                borderRadius: '6px',
                                border: '1px solid #a7f3d0',
                                textDecoration: 'none',
                              }}
                            >
                              <Phone size={12} /> {lead.phone}
                            </a>
                            {lead.constituency && (
                              <span style={{ fontSize: '12px', background: '#f1f5f9', color: '#334155', padding: '4px 10px', borderRadius: '6px', fontWeight: 600 }}>
                                📍 {lead.constituency}
                              </span>
                            )}
                            {lead.electionType && (
                              <span style={{ fontSize: '12px', background: '#f8fafc', color: '#64748b', padding: '4px 8px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                                {lead.electionType}
                              </span>
                            )}
                          </div>

                          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '8px', paddingTop: '10px', borderTop: '1px solid #f1f5f9' }}>
                            <a
                              href={waLink}
                              target="_blank"
                              rel="noreferrer"
                              className="button-secondary"
                              style={{
                                background: '#25d366',
                                color: '#ffffff',
                                borderColor: '#25d366',
                                padding: '7px 12px',
                                fontSize: '13px',
                                fontWeight: 700,
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '6px',
                                textDecoration: 'none',
                                borderRadius: '8px',
                              }}
                              title="WhatsApp पर चैट करें"
                            >
                              <MessageCircle size={15} /> WhatsApp चैट
                            </a>
                            <button
                              type="button"
                              className="button-quiet"
                              style={{ color: '#b91c1c', padding: '7px 10px', borderRadius: '8px', border: '1px solid #fecaca', background: '#fff5f5' }}
                              onClick={() => void deleteLead(lead._id, lead.name)}
                              title="लीड हटाएं"
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* DESKTOP VIEW (>= 769px): Full Sortable Table */}
                  <div className="table-scroll desktop-table-view">
                    <table className="voter-table desk-table">
                      <thead>
                        <tr>
                          <th>तारीख व समय</th>
                          <th>प्रत्याशी / नाम</th>
                          <th>मोबाइल (WhatsApp)</th>
                          <th>विधानसभा / वार्ड</th>
                          <th>चुनाव प्रकार</th>
                          <th>स्थिति (Status)</th>
                          <th>एक्शन (Contact & Manage)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {leads.map((lead) => {
                          const cleanPhone = lead.phone.replace(/\D/g, '');
                          const waLink = `https://wa.me/91${cleanPhone}?text=${encodeURIComponent(
                            `नमस्ते ${lead.name} जी,\n\nविजयसेतु (VijaySetu) चुनाव वॉर-रूम और वोटर सॉफ्टवेयर के डेमो के लिए आपका अनुरोध प्राप्त हुआ था।\n\nक्षेत्र: ${lead.constituency}\nचुनाव स्तर: ${lead.electionType}\n\nक्या अभी बात करने का सही समय है?`
                          )}`;

                          return (
                            <tr key={lead._id}>
                              <td style={{ fontSize: '12px', color: '#64748b', whiteSpace: 'nowrap' }}>
                                {new Date(lead.createdAt).toLocaleDateString('hi-IN', {
                                  day: 'numeric',
                                  month: 'short',
                                  year: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </td>
                              <td>
                                <strong className="voter-name" style={{ fontSize: '14px', color: '#0f172a' }}>{lead.name}</strong>
                                <div className="voter-subline">{lead._id}</div>
                              </td>
                              <td>
                                <a
                                  href={`tel:${lead.phone}`}
                                  style={{ color: '#059669', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                                >
                                  <Phone size={13} /> {lead.phone}
                                </a>
                              </td>
                              <td>
                                <span style={{ fontWeight: 600, color: '#334155' }}>{lead.constituency || '—'}</span>
                              </td>
                              <td>
                                <span style={{ background: '#f1f5f9', padding: '3px 8px', borderRadius: '6px', fontSize: '12px', fontWeight: 500 }}>
                                  {lead.electionType}
                                </span>
                              </td>
                              <td>
                                <select
                                  aria-label="लीड स्थिति"
                                  value={lead.status}
                                  onChange={(e) => void updateLeadStatus(lead._id, e.target.value)}
                                  style={{
                                    fontSize: '12px',
                                    padding: '4px 8px',
                                    borderRadius: '6px',
                                    border: '1px solid #cbd5e1',
                                    background:
                                      lead.status === 'new' ? '#dcfce7' :
                                      lead.status === 'contacted' ? '#e0f2fe' :
                                      lead.status === 'converted' ? '#f3e8ff' : '#f1f5f9',
                                    fontWeight: 600,
                                    color:
                                      lead.status === 'new' ? '#15803d' :
                                      lead.status === 'contacted' ? '#0369a1' :
                                      lead.status === 'converted' ? '#7e22ce' : '#475569'
                                  }}
                                >
                                  <option value="new">नया (New)</option>
                                  <option value="contacted">बातचीत हुई (Contacted)</option>
                                  <option value="converted">फाइनल / एक्टिव (Converted)</option>
                                  <option value="closed">बंद (Closed)</option>
                                </select>
                              </td>
                              <td>
                                <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                                  <a
                                    href={waLink}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="button-secondary"
                                    style={{
                                      background: '#25d366',
                                      color: '#ffffff',
                                      borderColor: '#25d366',
                                      padding: '5px 10px',
                                      fontSize: '12px',
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '4px',
                                      textDecoration: 'none'
                                    }}
                                    title="WhatsApp पर चैट करें"
                                  >
                                    <MessageCircle size={14} /> WhatsApp
                                  </a>
                                  <button
                                    type="button"
                                    className="button-quiet"
                                    style={{ color: '#b91c1c', padding: '5px' }}
                                    onClick={() => void deleteLead(lead._id, lead.name)}
                                    title="लीड हटाएं"
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </>
              ) : (
                <div className="empty-state">
                  <MessageCircle size={24} style={{ color: '#94a3b8' }} />
                  <strong>अभी कोई वेबसाइट लीड नहीं आई</strong>
                  <p>वेबसाइट के लैंडिंग पेज पर फॉर्म भरने पर सभी पूछताछ तुरंत यहाँ दिखाई देंगी।</p>
                </div>
              )}
            </section>
          </>
        )}

        {activeView === 'records' && (
          <>
            <section className="records-panel" style={{ padding: '24px' }}>
              {/* Header with Title, Icon and Scalability Badges */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px', marginBottom: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: '#e6f4ea', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#137333', boxShadow: '0 2px 6px rgba(19, 115, 51, 0.12)' }}>
                    <Database size={22} />
                  </div>
                  <div>
                    <h2 style={{ fontSize: '20px', fontWeight: '700', color: '#1a2620', margin: 0, letterSpacing: '-0.3px' }}>
                      वोटर मास्टर डेटाबेस
                    </h2>
                    <p style={{ fontSize: '13px', color: '#5f6368', margin: '3px 0 0 0' }}>
                      केंद्रीय डेटाबेस से सुरक्षित व सत्यापित मतदाता रिकॉर्ड्स (1 Lakh+ ऑप्टिमाइज़्ड)
                    </p>
                  </div>
                </div>

                {/* Capacity Badges */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#e6f4ea', color: '#137333', padding: '6px 14px', borderRadius: '20px', fontSize: '12px', fontWeight: '600', border: '1px solid #ceead6' }}>
                    <Sparkles size={14} /> 1 Lakh+ इंडेक्सिंग
                  </span>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#f1f3f4', color: '#3c4043', padding: '6px 14px', borderRadius: '20px', fontSize: '12px', fontWeight: '600' }}>
                    कुल: {totalRecords.toLocaleString('hi-IN')} रिकॉर्ड्स
                  </span>
                </div>
              </div>

              {/* Modern Filters & Search Toolbar */}
              <div style={{ background: '#f8faf9', border: '1px solid #e4eae5', borderRadius: '12px', padding: '16px', marginBottom: '20px', display: 'flex', flexWrap: 'wrap', gap: '14px', alignItems: 'center' }}>
                {/* Search Bar */}
                <div style={{ flex: '1 1 260px', position: 'relative' }}>
                  <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#9aa0a6' }} />
                  <input
                    type="text"
                    placeholder="नाम, EPIC, मकान नं. या भाग द्वारा तुरंत खोजें..."
                    value={recordsSearchQuery}
                    onChange={(e) => setRecordsSearchQuery(e.target.value)}
                    style={{ width: '100%', paddingLeft: '36px', height: '40px', fontSize: '13px', borderRadius: '8px', border: '1px solid #c0d3c5', background: '#ffffff', outline: 'none' }}
                  />
                  {recordsSearchQuery && (
                    <button
                      type="button"
                      onClick={() => setRecordsSearchQuery('')}
                      style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#9aa0a6', padding: 0 }}
                      title="सर्च साफ़ करें"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>

                {/* Client Select */}
                <div style={{ flex: '1 1 180px' }}>
                  <select 
                    aria-label="वोटर डेटा क्लाइंट" 
                    value={organizationId} 
                    onChange={(event) => { setOrganizationId(event.target.value); setWardFilter(''); }}
                    style={{ height: '40px', fontSize: '13px', borderRadius: '8px', border: '1px solid #c0d3c5', background: '#ffffff', width: '100%' }}
                  >
                    <option value="">🏢 सभी क्लाइंट</option>
                    {organizations.map((tenant, idx) => <option key={`${tenant.id}-${idx}`} value={tenant.id}>{tenant.name}</option>)}
                  </select>
                </div>

                {/* Ward Select with Quick Edit Button */}
                <div style={{ flex: '1 1 180px', display: 'flex', gap: '6px', alignItems: 'center' }}>
                  <select 
                    aria-label="वोटर डेटा वार्ड" 
                    value={wardFilter} 
                    onChange={(event) => {
                      const newWard = event.target.value;
                      setWardFilter(newWard);
                      void loadVoters(1, newWard);
                    }}
                    style={{ height: '40px', fontSize: '13px', borderRadius: '8px', border: '1px solid #c0d3c5', background: '#ffffff', flex: 1 }}
                  >
                    <option value="">📍 सभी वार्ड</option>
                    {wards.map((ward) => <option value={ward} key={ward}>वार्ड {ward}</option>)}
                  </select>
                  <button
                    type="button"
                    className="button-secondary"
                    style={{ height: '40px', padding: '0 10px', fontSize: '12px', display: 'inline-flex', alignItems: 'center', gap: '4px', whiteSpace: 'nowrap', color: '#059669', borderColor: '#a7f3d0' }}
                    onClick={() => {
                      setRenameWardOld(wardFilter || wards[0] || '');
                      setRenameWardNew(wardFilter || wards[0] || '');
                      setShowRenameWardModal(true);
                    }}
                    title="वार्ड नाम बदलें / एडिट करें"
                  >
                    <Edit3 size={14} /> एडिट
                  </button>
                </div>

                {/* Bulk Delete Button */}
                <button 
                  type="button" 
                  className="button-secondary" 
                  style={{ color: '#d93025', borderColor: '#f8d7da', background: '#fff8f7', height: '40px', padding: '0 14px', fontSize: '13px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                  onClick={() => void bulkDeleteVoters()}
                  disabled={!organizationId || loading}
                  title={!organizationId ? 'क्लाइंट चुनने पर ही डेटा डिलीट संभव है' : 'इस क्लाइंट का डेटा डिलीट करें'}
                >
                  <Trash2 size={15} /> डेटा डिलीट करें
                </button>
              </div>

              {/* Table / Empty State */}
              {loading ? (
                <div className="empty-state" style={{ padding: '60px 20px' }}>
                  <LoaderCircle size={28} className="spin" style={{ color: '#00875a' }} />
                  <p style={{ marginTop: '12px', fontSize: '14px', color: '#5f6368' }}>मास्टर डेटाबेस से मतदाता लोड हो रहे हैं…</p>
                </div>
              ) : visibleVoters.length ? (
                <div className="table-scroll" style={{ border: '1px solid #e4eae5', borderRadius: '10px', overflowX: 'auto' }}>
                  <table className="voter-table desk-table" style={{ margin: 0 }}>
                    <thead style={{ background: '#f8faf9' }}>
                      <tr>
                        <th style={{ padding: '12px 16px' }}>
                          <SortButton label="मतदाता" field="name" type="alpha" currentSort={recordsSort} onSort={handleRecordsSort} />
                        </th>
                        <th style={{ padding: '12px 16px' }}>पहचान पत्र (EPIC)</th>
                        <th style={{ padding: '12px 16px' }}>क्लाइंट / संगठन</th>
                        <th style={{ padding: '12px 16px' }}>
                          <SortButton label="वार्ड" field="wardNo" type="numeric" currentSort={recordsSort} onSort={handleRecordsSort} />
                        </th>
                        <th style={{ padding: '12px 16px' }}>
                          <SortButton label="भाग / बूथ" field="partNo" type="numeric" currentSort={recordsSort} onSort={handleRecordsSort} />
                        </th>
                        <th style={{ padding: '12px 16px' }}>
                          <SortButton label="क्रमांक" field="serialNo" type="numeric" currentSort={recordsSort} onSort={handleRecordsSort} />
                        </th>
                        <th style={{ padding: '12px 16px' }}>मकान नं.</th>
                        <th style={{ padding: '12px 16px' }}>मोबाइल</th>
                      </tr>
                    </thead>
                    <tbody>
                      {visibleVoters.map((voter) => (
                        <tr key={`${voter.organizationId}-${voter._id}`} style={{ transition: 'background-color 0.15s ease' }}>
                          <td style={{ padding: '12px 16px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                              <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#f0f4f2', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: '700', color: '#00875a', flexShrink: 0 }}>
                                {(voter.nameHi || voter.nameEn || '?').charAt(0)}
                              </div>
                              <div>
                                <strong className="voter-name" style={{ fontSize: '14px', color: '#1a2620', display: 'flex', flexWrap: 'wrap', alignItems: 'baseline', gap: '4px' }}>
                                  <span>{voter.nameHi || voter.nameEn || '—'}</span>
                                  {voter.nameEn && voter.nameEn !== voter.nameHi && (
                                    <span style={{ fontSize: '11px', color: '#5f6368', fontWeight: 600 }}>
                                      ({voter.nameEn})
                                    </span>
                                  )}
                                </strong>
                                {voter.relativeNameHi && (
                                  <span style={{ fontSize: '11px', color: '#7d8981' }}>
                                    {voter.relationType || 'संबंधी'}: {voter.relativeNameHi}
                                    {voter.relativeNameEn && voter.relativeNameEn !== voter.relativeNameHi && (
                                      <span style={{ marginLeft: '4px' }}>
                                        ({voter.relativeNameEn})
                                      </span>
                                    )}
                                  </span>
                                )}
                              </div>
                            </div>
                          </td>
                          <td style={{ padding: '12px 16px' }}>
                            <span style={{ fontFamily: 'monospace', fontWeight: '600', color: '#1a365d', background: '#edf2f7', padding: '3px 8px', borderRadius: '4px', fontSize: '12px' }}>
                              {(voter.epic && !voter.epic.startsWith('VOTER_') && !voter.epic.startsWith('UNREADABLE_')) ? voter.epic : '—'}
                            </span>
                          </td>
                          <td style={{ padding: '12px 16px', fontSize: '13px', color: '#4a5568' }}>
                            {organizations.find((tenant) => tenant.id === voter.organizationId)?.name ?? voter.organizationId}
                          </td>
                          <td style={{ padding: '12px 16px' }}>
                            <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: '12px', background: '#e8f0fe', color: '#1967d2', fontSize: '12px', fontWeight: '600' }}>
                              वार्ड {voter.wardNo || '—'}
                            </span>
                          </td>
                          <td style={{ padding: '12px 16px' }}>
                            <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: '12px', background: '#fef7e0', color: '#b06000', fontSize: '12px', fontWeight: '600' }}>
                              भाग {voter.partNo || '—'}
                            </span>
                          </td>
                          <td style={{ padding: '12px 16px', fontWeight: '600', color: '#4a5568', textAlign: 'center' }}>
                            #{voter.serialNo || '—'}
                          </td>
                          <td style={{ padding: '12px 16px', color: '#4a5568', fontSize: '13px' }}>
                            {voter.houseNo || '—'}
                          </td>
                          <td style={{ padding: '12px 16px', color: '#4a5568', fontSize: '13px' }}>
                            {voter.phone || '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="empty-state" style={{ padding: '48px 20px', border: '1px dashed #c0d3c5', borderRadius: '10px' }}>
                  <Database size={32} style={{ color: '#9aa0a6', marginBottom: '8px' }} />
                  <strong style={{ fontSize: '15px', color: '#1a2620' }}>कोई रिकॉर्ड नहीं मिले</strong>
                  <p style={{ fontSize: '13px', color: '#7d8981', maxWidth: '400px', margin: '4px auto 0 auto' }}>
                    {recordsSearchQuery ? `"${recordsSearchQuery}" से मेल खाने वाला कोई मतदाता नहीं मिला। खोज बदलकर देखें।` : 'डेटाबेस में मतदाता रिकॉर्ड आने पर वे यहाँ दिखेंगे।'}
                  </p>
                </div>
              )}

              {/* Modern Pagination Bar */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '18px', paddingTop: '16px', borderTop: '1px solid #e4eae5', flexWrap: 'wrap', gap: '12px' }}>
                <div style={{ fontSize: '13px', color: '#5f6368' }}>
                  कुल <strong>{totalRecords.toLocaleString('hi-IN')}</strong> रिकॉर्ड्स | पेज <strong>{currentPage}</strong> / {totalPages || 1} ({visibleVoters.length} दिख रहे हैं)
                </div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <button 
                    className="button-secondary" 
                    disabled={currentPage === 1 || loading} 
                    onClick={() => void loadVoters(currentPage - 1)}
                    style={{ padding: '6px 14px', fontSize: '13px', display: 'inline-flex', alignItems: 'center', gap: '5px', borderRadius: '8px' }}
                  >
                    <ChevronLeft size={15} /> पिछला
                  </button>
                  <span style={{ fontSize: '13px', fontWeight: '600', color: '#1a2620', padding: '0 8px' }}>
                    {currentPage}
                  </span>
                  <button 
                    className="button-secondary" 
                    disabled={currentPage === totalPages || totalPages === 0 || loading} 
                    onClick={() => void loadVoters(currentPage + 1)}
                    style={{ padding: '6px 14px', fontSize: '13px', display: 'inline-flex', alignItems: 'center', gap: '5px', borderRadius: '8px' }}
                  >
                    अगला <ChevronRight size={15} />
                  </button>
                </div>
              </div>
            </section>
          </>
        )}

        {activeView === 'users' && (
          <section className="records-panel" style={{ padding: '24px' }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px', marginBottom: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: '#e8f0fe', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#1967d2', boxShadow: '0 2px 6px rgba(25, 103, 210, 0.12)' }}>
                  <UsersRound size={22} />
                </div>
                <div>
                  <h2 style={{ fontSize: '20px', fontWeight: '700', color: '#1a2620', margin: 0 }}>सभी टीम व क्लाइंट अकाउंट</h2>
                  <p style={{ fontSize: '13px', color: '#5f6368', margin: '3px 0 0 0' }}>
                    क्लाइंट संगठन, कार्यकर्ता कोटा और उनकी एक्सेस सेटिंग्स का एकीकृत डैशबोर्ड
                  </p>
                </div>
              </div>
              <a className="button-secondary" href="/accounts" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', height: '38px', padding: '0 16px', borderRadius: '8px', fontSize: '13px' }}>
                <UsersRound size={15} /> अकाउंट प्रबंधन खोलें
              </a>
            </div>

            {/* KPI Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px', marginBottom: '24px' }}>
              <div style={{ background: '#f8faf9', border: '1px solid #e4eae5', borderRadius: '10px', padding: '14px 18px' }}>
                <span style={{ fontSize: '12px', color: '#5f6368', fontWeight: '500' }}>कुल क्लाइंट संगठन</span>
                <div style={{ fontSize: '22px', fontWeight: '700', color: '#1a2620', marginTop: '4px' }}>{organizations.length}</div>
              </div>
              <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '10px', padding: '14px 18px' }}>
                <span style={{ fontSize: '12px', color: '#166534', fontWeight: '500' }}>सक्रिय कार्यकर्ता (All Orgs)</span>
                <div style={{ fontSize: '22px', fontWeight: '700', color: '#166534', marginTop: '4px' }}>
                  {organizations.reduce((sum, t) => sum + (t.activeWorkers || 0), 0)}
                </div>
              </div>
              <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '10px', padding: '14px 18px' }}>
                <span style={{ fontSize: '12px', color: '#1e40af', fontWeight: '500' }}>कुल मतदाता डेटाबेस</span>
                <div style={{ fontSize: '22px', fontWeight: '700', color: '#1e40af', marginTop: '4px' }}>
                  {organizations.reduce((sum, t) => sum + (t.voterCount || 0), 0).toLocaleString('hi-IN')}
                </div>
              </div>
            </div>

            {/* Organizations Table */}
            {loading ? (
              <div className="empty-state" style={{ padding: '60px 20px' }}>
                <LoaderCircle size={24} className="spin" style={{ color: '#00875a' }} />
                <p style={{ marginTop: '10px', fontSize: '14px', color: '#5f6368' }}>क्लाइंट खाते लोड हो रहे हैं…</p>
              </div>
            ) : (
              <div className="table-scroll" style={{ border: '1px solid #e4eae5', borderRadius: '10px', overflowX: 'auto' }}>
                <table className="voter-table desk-table" style={{ margin: 0 }}>
                  <thead style={{ background: '#f8faf9' }}>
                    <tr>
                      <th style={{ padding: '12px 18px' }}>क्लाइंट / संगठन</th>
                      <th style={{ padding: '12px 18px' }}>सक्रिय कार्यकर्ता (कोटा)</th>
                      <th style={{ padding: '12px 18px' }}>मतदाता संख्या</th>
                      <th style={{ padding: '12px 18px' }}>अवस्था</th>
                      <th style={{ padding: '12px 18px', textAlign: 'right' }}>विवरण व क्रेडेंशियल</th>
                    </tr>
                  </thead>
                  <tbody>
                    {organizations.map((tenant, idx) => {
                      const isExpanded = expandedOrgId === tenant.id;
                      const workerPct = Math.min(100, Math.round(((tenant.activeWorkers || 0) / 10) * 100));
                      return (
                        <Fragment key={`${tenant.id}-${idx}`}>
                          <tr 
                            style={{ cursor: 'pointer', transition: 'background-color 0.15s ease', background: isExpanded ? '#f0fdf4' : undefined }} 
                            onClick={() => setExpandedOrgId(isExpanded ? null : tenant.id)}
                          >
                            <td style={{ padding: '14px 18px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#e6f4ea', color: '#137333', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '700', fontSize: '14px' }}>
                                  {tenant.name.charAt(0)}
                                </div>
                                <div>
                                  <strong className="voter-name" style={{ fontSize: '14px', color: '#1a2620' }}>{tenant.name}</strong>
                                  <span style={{ fontSize: '11px', color: '#7d8981', display: 'block' }}>ID: {tenant.id}</span>
                                </div>
                              </div>
                            </td>
                            <td style={{ padding: '14px 18px' }}>
                              <div style={{ minWidth: '130px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: '600', color: '#374151', marginBottom: '4px' }}>
                                  <span>{tenant.activeWorkers || 0} / 10</span>
                                  <span style={{ color: workerPct >= 100 ? '#dc2626' : '#059669' }}>{workerPct}%</span>
                                </div>
                                <div style={{ width: '100%', height: '6px', background: '#e5e7eb', borderRadius: '3px', overflow: 'hidden' }}>
                                  <div style={{ width: `${workerPct}%`, height: '100%', background: workerPct >= 100 ? '#ef4444' : '#10b981', borderRadius: '3px' }} />
                                </div>
                              </div>
                            </td>
                            <td style={{ padding: '14px 18px', fontWeight: '600', color: '#1a2620' }}>
                              {tenant.voterCount.toLocaleString('hi-IN')}
                            </td>
                            <td style={{ padding: '14px 18px' }}>
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '4px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: '600', background: tenant.isActive ? '#e6f4ea' : '#fee2e2', color: tenant.isActive ? '#137333' : '#b91c1c' }}>
                                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: tenant.isActive ? '#10b981' : '#ef4444' }} />
                                {tenant.isActive ? 'सक्रिय' : 'बंद'}
                              </span>
                            </td>
                            <td style={{ padding: '14px 18px', textAlign: 'right' }}>
                              <button
                                type="button"
                                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: '600', color: isExpanded ? '#00875a' : '#5f6368', background: isExpanded ? '#e6f4ea' : '#f1f3f4', border: 'none', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer' }}
                              >
                                {isExpanded ? 'छुपाएं' : 'कार्यकर्ता देखें'} {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                              </button>
                            </td>
                          </tr>
                          {isExpanded && (
                            <tr style={{ background: '#fafbfa' }}>
                              <td colSpan={5} style={{ padding: '0', borderBottom: '2px solid #cce8d7' }}>
                                <div style={{ padding: '20px 24px', borderLeft: '4px solid #00875a', background: '#ffffff' }}>
                                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                                    <h4 style={{ margin: 0, fontSize: '15px', fontWeight: '700', color: '#1a2620' }}>
                                      {tenant.name} — कार्यकर्ता और क्रेडेंशियल प्रबंधन
                                    </h4>
                                    <span style={{ fontSize: '12px', color: '#7d8981' }}>अधिकतम 10 कार्यकर्ता प्रति संगठन</span>
                                  </div>
                                  <AccountsManager embeddedOrganizationId={tenant.id} />
                                </div>
                              </td>
                            </tr>
                          )}
                        </Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}

        {activeView === 'import' && (
          <>
            {/* Top Import Mode Switcher */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginBottom: '16px' }}>
              <button
                type="button"
                onClick={() => setImportMode('pdf')}
                style={{
                  flex: '1 1 240px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  padding: '10px 18px',
                  borderRadius: '10px',
                  fontSize: '13px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  border: importMode === 'pdf' ? '1.5px solid #00875a' : '1px solid #e4eae5',
                  background: importMode === 'pdf' ? '#e6f4ea' : '#ffffff',
                  color: importMode === 'pdf' ? '#137333' : '#5f6368',
                  boxShadow: importMode === 'pdf' ? '0 2px 6px rgba(0, 135, 90, 0.12)' : 'none'
                }}
              >
                <FileText size={16} /> ⚡ PDF ऑटो-कन्वर्टर (100% Native Devanagari Engine)
              </button>
              <button
                type="button"
                onClick={() => setImportMode('excel')}
                style={{
                  flex: '1 1 240px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  padding: '10px 18px',
                  borderRadius: '10px',
                  fontSize: '13px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  border: importMode === 'excel' ? '1.5px solid #00875a' : '1px solid #e4eae5',
                  background: importMode === 'excel' ? '#e6f4ea' : '#ffffff',
                  color: importMode === 'excel' ? '#137333' : '#5f6368',
                  boxShadow: importMode === 'excel' ? '0 2px 6px rgba(0, 135, 90, 0.12)' : 'none'
                }}
              >
                <FileSpreadsheet size={16} /> 📊 Excel सीधा इम्पोर्ट (.xlsx)
              </button>
            </div>

            {/* PDF Import Section */}
            {importMode === 'pdf' && (
              <section className="records-panel" style={{ padding: '24px', marginBottom: '24px' }}>
                <div style={{ marginBottom: '20px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                    <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: '#fce8e6', color: '#c5221f', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <FileText size={20} />
                    </div>
                    <div>
                      <h2 style={{ fontSize: '18px', fontWeight: '700', color: '#1a2620', margin: 0 }}>
                        PDF मतदाता सूची ऑटो-कन्वर्टर व डेटाबेस इम्पोर्ट
                      </h2>
                      <p style={{ fontSize: '13px', color: '#7d8981', margin: '2px 0 0 0' }}>
                        निर्वाचन आयोग (SEC / ECI) की आधिकारिक पीडीएफ से सीधे 100% शुद्ध हिंदी Excel तालिका जनरेट करें और डेटाबेस में सेव करें।
                      </p>
                    </div>
                  </div>
                </div>

                {/* Continuous Auto-Learning Dictionary Status Card */}
                <div style={{
                  background: 'linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 100%)',
                  border: '1.5px solid #a7f3d0',
                  borderRadius: '12px',
                  padding: '18px 20px',
                  marginBottom: '20px',
                  boxShadow: '0 2px 10px rgba(16, 185, 129, 0.08)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px', marginBottom: '10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#15803d' }}>
                        <Sparkles size={18} />
                      </div>
                      <div>
                        <div style={{ fontSize: '14px', fontWeight: '700', color: '#14532d', display: 'flex', alignItems: 'center', gap: '8px' }}>
                          स्व-सीखने वाली चुनावी डिक्शनरी (Continuous Auto-Learning Engine)
                        </div>
                        <div style={{ fontSize: '11px', color: '#166534', marginTop: '2px' }}>
                          प्रत्येक अपलोड होने वाली पीडीएफ का बैकग्राउंड लाइव सर्वे होता है — नए अक्षरों व ग्लिफ़्स को डिक्शनरी में स्वतः जोड़कर सदैव अपडेट रखती है।
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '5px 12px',
                        borderRadius: '20px',
                        background: '#dcfce7',
                        border: '1px solid #86efac',
                        color: '#166534',
                        fontSize: '11px',
                        fontWeight: '700',
                        letterSpacing: '0.3px'
                      }}>
                        <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#22c55e', display: 'inline-block', boxShadow: '0 0 0 2px rgba(34, 197, 94, 0.3)' }} />
                        लाइव सर्वे सक्रिय (Survey Active)
                      </span>

                      <button
                        type="button"
                        onClick={() => void loadDictionaryStats()}
                        disabled={loadingDictStats}
                        title="डिक्शनरी स्थिति रिफ्रेश करें"
                        style={{
                          background: '#ffffff',
                          border: '1px solid #bbf7d0',
                          borderRadius: '8px',
                          padding: '6px 10px',
                          fontSize: '11px',
                          fontWeight: '600',
                          color: '#15803d',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}
                      >
                        <RefreshCw size={12} className={loadingDictStats ? 'spin' : ''} /> रिफ्रेश
                      </button>
                    </div>
                  </div>

                  {/* Metrics Badges Grid */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px', marginTop: '12px' }}>
                    <div style={{ background: '#ffffff', border: '1px solid #bbf7d0', borderRadius: '8px', padding: '10px 14px' }}>
                      <div style={{ fontSize: '11px', color: '#4b7a5a', fontWeight: '500' }}>कुल सक्रिय ग्लिफ़्स (Glyphs)</div>
                      <div style={{ fontSize: '18px', fontWeight: '800', color: '#14532d', marginTop: '2px' }}>
                        {dictionaryStats ? dictionaryStats.totalKnownGlyphs : '305+'}
                      </div>
                      <div style={{ fontSize: '10px', color: '#6b7280' }}>फ़ॉन्ट सिंबल व संयुक्ताक्षर</div>
                    </div>

                    <div style={{ background: '#ffffff', border: '1px solid #bbf7d0', borderRadius: '8px', padding: '10px 14px' }}>
                      <div style={{ fontSize: '11px', color: '#4b7a5a', fontWeight: '500' }}>स्वतः सीखे गए ग्लिफ़्स (Survey Learned)</div>
                      <div style={{ fontSize: '18px', fontWeight: '800', color: '#047857', marginTop: '2px' }}>
                        {dictionaryStats ? dictionaryStats.learnedGlyphsCount : '0'}
                      </div>
                      <div style={{ fontSize: '10px', color: '#059669' }}>अपलोड्स से डायनामिक शामिल</div>
                    </div>

                    <div style={{ background: '#ffffff', border: '1px solid #bbf7d0', borderRadius: '8px', padding: '10px 14px' }}>
                      <div style={{ fontSize: '11px', color: '#4b7a5a', fontWeight: '500' }}>मानकीकृत चुनावी शब्द</div>
                      <div style={{ fontSize: '18px', fontWeight: '800', color: '#14532d', marginTop: '2px' }}>
                        {dictionaryStats ? dictionaryStats.totalKnownWords : '180+'}
                      </div>
                      <div style={{ fontSize: '10px', color: '#6b7280' }}>संबंध, प्रत्यय व उपनाम</div>
                    </div>

                    <div style={{ background: '#ffffff', border: '1px solid #bbf7d0', borderRadius: '8px', padding: '10px 14px' }}>
                      <div style={{ fontSize: '11px', color: '#4b7a5a', fontWeight: '500' }}>डेटाबेस व डिस्क सिंक</div>
                      <div style={{ fontSize: '14px', fontWeight: '700', color: '#15803d', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <CheckCircle2 size={15} color="#16a34a" /> 100% सिंक्रोनाइज़्ड
                      </div>
                      <div style={{ fontSize: '10px', color: '#6b7280' }}>MongoDB व JSON में सुरक्षित</div>
                    </div>
                  </div>
                </div>

                <form className="modal-form" onSubmit={uploadPdf}>
                  {/* Balanced Grid for Metadata */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px', marginBottom: '16px' }}>
                    <label>क्लाइंट (संगठन) <span style={{ color: '#d93025' }}>*</span>
                      <select required value={organizationId} onChange={(event) => setOrganizationId(event.target.value)}>
                        <option value="">क्लाइंट चुनें</option>
                        {organizations.map((tenant, idx) => <option key={`${tenant.id}-${idx}`} value={tenant.id}>{tenant.name}</option>)}
                      </select>
                    </label>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <label style={{ fontSize: '13px', fontWeight: '500', color: '#1a2620' }}>
                        वार्ड (Ward) <span style={{ fontSize: '11px', color: '#7d8981' }}>(एकल या कॉमा से क्रमबद्ध उदा. 17, 18)</span>
                      </label>
                      {!pdfIsNewWard ? (
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <select
                            value={pdfWard}
                            onChange={(e) => {
                              if (e.target.value === '__NEW__') {
                                setPdfIsNewWard(true);
                                setPdfWard('');
                              } else if (e.target.value === '__RENAME__') {
                                setRenameWardOld(pdfWard || availableWards[0] || '');
                                setRenameWardNew(pdfWard || availableWards[0] || '');
                                setShowRenameWardModal(true);
                              } else {
                                setPdfWard(e.target.value);
                              }
                            }}
                            style={{ flex: 1 }}
                          >
                            <option value="">वार्ड चुनें (वैकल्पिक / फाइल नाम से स्वतः)</option>
                            {availableWards.map((w) => (
                              <option key={w} value={w}>वार्ड {w}</option>
                            ))}
                            <option value="__NEW__">+ नया वार्ड या मल्टी-वार्ड (उदा. 17, 18)...</option>
                            <option value="__RENAME__">✏️ किसी वार्ड का नाम बदलें / एडिट करें...</option>
                          </select>
                          <button
                            type="button"
                            className="button-secondary"
                            style={{ padding: '0 12px', fontSize: '12px', whiteSpace: 'nowrap' }}
                            onClick={() => {
                              setPdfIsNewWard(true);
                              setPdfWard('');
                            }}
                            title="नया वार्ड जोड़ें"
                          >
                            <Plus size={14} /> नया
                          </button>
                          <button
                            type="button"
                            className="button-secondary"
                            style={{ padding: '0 10px', fontSize: '12px', whiteSpace: 'nowrap', color: '#059669', borderColor: '#a7f3d0' }}
                            onClick={() => {
                              setRenameWardOld(pdfWard || availableWards[0] || '');
                              setRenameWardNew(pdfWard || availableWards[0] || '');
                              setShowRenameWardModal(true);
                            }}
                            title="वार्ड नाम एडिट करें"
                          >
                            <Edit3 size={13} /> एडिट
                          </button>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <input
                            type="text"
                            placeholder="वार्ड दर्ज करें (उदा. 17, 18 मल्टी-फाइल हेतु)"
                            value={pdfCustomWard}
                            onChange={(e) => setPdfCustomWard(e.target.value)}
                            autoFocus
                            style={{ flex: 1 }}
                          />
                          <button
                            type="button"
                            className="button-secondary"
                            style={{ padding: '0 12px', fontSize: '12px', whiteSpace: 'nowrap' }}
                            onClick={() => {
                              setPdfIsNewWard(false);
                              setPdfCustomWard('');
                            }}
                          >
                            सूची से
                          </button>
                          <button
                            type="button"
                            className="button-secondary"
                            style={{ padding: '0 10px', fontSize: '12px', whiteSpace: 'nowrap', color: '#059669', borderColor: '#a7f3d0' }}
                            onClick={() => {
                              const firstW = pdfCustomWard.split(',')[0]?.trim() || availableWards[0] || '';
                              setRenameWardOld(firstW);
                              setRenameWardNew(firstW);
                              setShowRenameWardModal(true);
                            }}
                            title="वार्ड नाम एडिट करें"
                          >
                            <Edit3 size={13} /> एडिट
                          </button>
                        </div>
                      )}
                    </div>

                    <label>बूथ / भाग संख्या <span style={{ fontSize: '11px', color: '#7d8981' }}>(वैकल्पिक)</span>
                      <input
                        type="text"
                        placeholder="उदा. बूथ 42 या भाग 10"
                        value={pdfBooth}
                        onChange={(e) => setPdfBooth(e.target.value)}
                      />
                    </label>

                    <label>सूची का शीर्षक / विवरण <span style={{ fontSize: '11px', color: '#7d8981' }}>(पहचान के लिए)</span>
                      <input
                        type="text"
                        placeholder="उदा. नगर पालिका चुनाव मतदाता सूची"
                        value={pdfDescription}
                        onChange={(e) => setPdfDescription(e.target.value)}
                      />
                    </label>
                  </div>

                  {/* Dropzone with Multiple PDF Selection */}
                  <div 
                    style={{ 
                      background: '#f8faf9', 
                      border: '1.5px dashed #10b981', 
                      borderRadius: '12px', 
                      padding: '24px 20px', 
                      marginBottom: selectedPdfFiles.length > 0 ? '14px' : '20px', 
                      textAlign: 'center',
                      cursor: 'pointer',
                      transition: 'border-color 0.2s ease'
                    }}
                    onClick={() => {
                      document.getElementById('admin-pdf-input')?.click();
                    }}
                  >
                    <input 
                      id="admin-pdf-input"
                      type="file" 
                      accept=".pdf,application/pdf" 
                      multiple 
                      onChange={(e) => {
                        const files = Array.from(e.target.files || []);
                        if (files.length > 0) {
                          setSelectedPdfFiles((prev) => {
                            const existingKeys = new Set(prev.map(f => `${f.name}-${f.size}`));
                            const uniqueNew = files.filter(f => !existingKeys.has(`${f.name}-${f.size}`));
                            return [...prev, ...uniqueNew];
                          });
                        }
                        e.target.value = '';
                      }}
                      style={{ display: 'none' }}
                    />

                    <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '8px' }}>
                      <FileText size={34} style={{ color: '#059669' }} />
                    </div>
                    <span style={{ fontSize: '15px', fontWeight: '700', color: '#1a2620', display: 'block' }}>
                      {selectedPdfFiles.length > 0 ? `📁 ${selectedPdfFiles.length} PDF फाइलें चयनित` : 'PDF मतदाता सूची चुनें या यहाँ ड्रैग करें (.pdf)'}
                    </span>
                    <p style={{ fontSize: '12px', color: '#7d8981', margin: '4px 0 12px 0' }}>
                      निर्वाचन आयोग (SEC/ECI) की आधिकारिक पीडीएफ फाइलें — एक साथ 1 या अनेक फाइलें चुनें (अधिकतम 100MB प्रति फाइल)
                    </p>

                    <button
                      type="button"
                      className="button-secondary"
                      style={{ padding: '6px 18px', fontSize: '13px', fontWeight: '600', pointerEvents: 'none' }}
                    >
                      + {selectedPdfFiles.length > 0 ? 'और PDF फाइलें जोड़ें' : 'फाइलें चुनें (मल्टीपल सेलेक्ट सक्षम)'}
                    </button>
                  </div>

                  {/* Selected Files Preview List */}
                  {selectedPdfFiles.length > 0 && (
                    <div style={{
                      background: '#ffffff',
                      border: '1px solid #e4eae5',
                      borderRadius: '10px',
                      padding: '16px',
                      marginBottom: '20px'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                        <span style={{ fontSize: '13px', fontWeight: '700', color: '#1a2620' }}>
                          चयनित फाइलें ({selectedPdfFiles.length}) • कुल {(selectedPdfFiles.reduce((acc, f) => acc + f.size, 0) / (1024 * 1024)).toFixed(1)} MB
                        </span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedPdfFiles([]);
                          }}
                          style={{
                            background: 'transparent',
                            border: 'none',
                            color: '#d93025',
                            fontSize: '12px',
                            fontWeight: '600',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}
                        >
                          <Trash2 size={13} /> सभी हटाएं
                        </button>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '8px', maxHeight: '240px', overflowY: 'auto', paddingRight: '4px' }}>
                        {selectedPdfFiles.map((f, idx) => {
                          const customWards = (pdfIsNewWard ? pdfCustomWard : pdfWard)
                            .split(',')
                            .map((w) => w.trim())
                            .filter(Boolean);
                          const detectedWard = detectWardFromFilename(f.name);
                          const hasSequential = customWards.length > idx;
                          const assignedWard = hasSequential 
                            ? customWards[idx] 
                            : (customWards.length === 1 && selectedPdfFiles.length === 1 ? customWards[0] : detectedWard);

                          return (
                            <div
                              key={`${f.name}-${idx}`}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                background: '#f8faf9',
                                border: '1px solid #e2e8f0',
                                borderRadius: '8px',
                                padding: '8px 12px',
                                gap: '8px'
                              }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                                <FileText size={18} style={{ color: '#c5221f', flexShrink: 0 }} />
                                <div style={{ minWidth: 0 }}>
                                  <div style={{ fontSize: '12px', fontWeight: '600', color: '#1e293b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '170px' }} title={f.name}>
                                    {f.name}
                                  </div>
                                  <div style={{ fontSize: '10px', color: '#64748b', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <span>{(f.size / (1024 * 1024)).toFixed(1)} MB</span>
                                    {hasSequential ? (
                                      <span style={{ background: '#dbeafe', color: '#1d4ed8', padding: '1px 7px', borderRadius: '4px', fontWeight: '700' }}>
                                        📍 वार्ड {assignedWard} (फाइल #{idx + 1})
                                      </span>
                                    ) : assignedWard ? (
                                      <span style={{ background: '#dcfce7', color: '#15803d', padding: '1px 5px', borderRadius: '4px', fontWeight: '600' }}>
                                        वार्ड {assignedWard}
                                      </span>
                                    ) : null}
                                  </div>
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedPdfFiles((prev) => prev.filter((_, i) => i !== idx));
                                }}
                                style={{
                                  background: 'transparent',
                                  border: 'none',
                                  color: '#94a3b8',
                                  cursor: 'pointer',
                                  padding: '4px',
                                  borderRadius: '4px',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center'
                                }}
                                onMouseEnter={(e) => (e.currentTarget.style.color = '#ef4444')}
                                onMouseLeave={(e) => (e.currentTarget.style.color = '#94a3b8')}
                                title="यह फाइल हटाएं"
                              >
                                <X size={15} />
                              </button>
                            </div>
                          );
                        })}
                      </div>

                      {(() => {
                        const customWards = (pdfIsNewWard ? pdfCustomWard : pdfWard)
                          .split(',')
                          .map((w) => w.trim())
                          .filter(Boolean);
                        if (customWards.length > 1 && selectedPdfFiles.length > 0) {
                          return (
                            <div style={{ marginTop: '10px', fontSize: '12px', color: '#1e40af', background: '#eff6ff', border: '1px solid #bfdbfe', padding: '8px 12px', borderRadius: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <Sparkles size={15} style={{ color: '#2563eb', flexShrink: 0 }} />
                              <span>
                                <strong>क्रमबद्ध वार्ड असाइनमेंट (Sequential Multi-Ward):</strong> पहली फाइल ➔ <strong>वार्ड {customWards[0]}</strong>, दूसरी फाइल ➔ <strong>वार्ड {customWards[1] || '...'}</strong>{customWards.length > 2 ? `, तीसरी फाइल ➔ वार्ड ${customWards[2]}` : ''} में जाएगी।
                              </span>
                            </div>
                          );
                        } else if (selectedPdfFiles.length > 1) {
                          return (
                            <div style={{ marginTop: '10px', fontSize: '11px', color: '#047857', background: '#ecfdf5', padding: '6px 10px', borderRadius: '6px' }}>
                              💡 <strong>मल्टी-फाइल ऑटो-डिटेक्ट:</strong> आप ऊपर कॉमा लगाकर क्रमबद्ध वार्ड दे सकते हैं (उदा. <strong>17, 18</strong>), या खाली छोड़ने पर फाइल नाम से स्वतः वार्ड ले लिया जाएगा।
                            </div>
                          );
                        }
                        return null;
                      })()}
                    </div>
                  )}

                  <div className="admin-form-actions">
                    <button 
                      className="button-primary" 
                      type="submit" 
                      disabled={uploadingPdf || !organizationId || selectedPdfFiles.length === 0} 
                      style={{ height: '42px', padding: '0 24px', fontSize: '14px', fontWeight: '600' }}
                    >
                      {uploadingPdf ? <LoaderCircle size={16} className="spin" /> : <Upload size={16} />}
                      {' '}
                      {selectedPdfFiles.length > 1 
                        ? `⚡ ${selectedPdfFiles.length} PDFs से Excel व वोटर डेटाबेस तैयार करें` 
                        : '⚡ PDF से Excel कन्वर्ट व इम्पोर्ट करें'}
                    </button>
                  </div>
                </form>
              </section>
            )}

            {/* Excel Import Section */}
            {importMode === 'excel' && (
              <section className="records-panel" style={{ padding: '24px', marginBottom: '24px' }}>
                <div style={{ marginBottom: '20px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                    <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: '#e6f4ea', color: '#137333', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <FileSpreadsheet size={20} />
                    </div>
                    <div>
                      <h2 style={{ fontSize: '18px', fontWeight: '700', color: '#1a2620', margin: 0 }}>
                        मतदाता सूची Excel वर्कबुक सीधा इम्पोर्ट
                      </h2>
                      <p style={{ fontSize: '13px', color: '#7d8981', margin: '2px 0 0 0' }}>
                        मानक 18-कॉलम टेम्पलेट फॉर्मेट में तैयार की गई Excel वर्कबुक चुनें। EPIC के आधार पर रिकॉर्ड्स अपडेट या जोड़े जाएंगे।
                      </p>
                    </div>
                  </div>
                </div>

                <form className="modal-form" onSubmit={importWorkbook}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px', marginBottom: '16px' }}>
                    <label>क्लाइंट (संगठन) <span style={{ color: '#d93025' }}>*</span>
                      <select required value={organizationId} onChange={(event) => setOrganizationId(event.target.value)}>
                        <option value="">क्लाइंट चुनें</option>
                        {organizations.map((tenant, idx) => <option key={`${tenant.id}-${idx}`} value={tenant.id}>{tenant.name}</option>)}
                      </select>
                    </label>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <label style={{ fontSize: '13px', fontWeight: '500', color: '#1a2620' }}>
                        वार्ड (Ward) <span style={{ fontSize: '11px', color: '#7d8981' }}>(चुनें या नया बनाएं)</span>
                      </label>
                      {!excelIsNewWard ? (
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <select
                            value={excelWard}
                            onChange={(e) => {
                              if (e.target.value === '__NEW__') {
                                setExcelIsNewWard(true);
                                setExcelWard('');
                              } else {
                                setExcelWard(e.target.value);
                              }
                            }}
                            style={{ flex: 1 }}
                          >
                            <option value="">वार्ड चुनें (वैकल्पिक)</option>
                            {availableWards.map((w) => (
                              <option key={w} value={w}>वार्ड {w}</option>
                            ))}
                            <option value="__NEW__">+ नया वार्ड बनाएं...</option>
                          </select>
                          <button
                            type="button"
                            className="button-secondary"
                            style={{ padding: '0 12px', fontSize: '12px', whiteSpace: 'nowrap' }}
                            onClick={() => {
                              setExcelIsNewWard(true);
                              setExcelWard('');
                            }}
                            title="नया वार्ड जोड़ें"
                          >
                            <Plus size={14} /> नया
                          </button>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <input
                            type="text"
                            placeholder="नया वार्ड दर्ज करें (उदा. 14 या वार्ड 14)"
                            value={excelCustomWard}
                            onChange={(e) => setExcelCustomWard(e.target.value)}
                            autoFocus
                            style={{ flex: 1 }}
                          />
                          <button
                            type="button"
                            className="button-secondary"
                            style={{ padding: '0 12px', fontSize: '12px', whiteSpace: 'nowrap' }}
                            onClick={() => {
                              setExcelIsNewWard(false);
                              setExcelCustomWard('');
                            }}
                          >
                            सूची से
                          </button>
                        </div>
                      )}
                    </div>

                    <label>बूथ / भाग संख्या <span style={{ fontSize: '11px', color: '#7d8981' }}>(वैकल्पिक)</span>
                      <input
                        type="text"
                        placeholder="उदा. बूथ 42 या भाग 10"
                        value={excelBooth}
                        onChange={(e) => setExcelBooth(e.target.value)}
                      />
                    </label>

                    <label>सूची का शीर्षक / विवरण <span style={{ fontSize: '11px', color: '#7d8981' }}>(पहचान के लिए)</span>
                      <input
                        type="text"
                        placeholder="उदा. वार्ड 14 अंतिम वोटर सूची 2024"
                        value={excelDescription}
                        onChange={(e) => setExcelDescription(e.target.value)}
                      />
                    </label>
                  </div>

                  <div style={{ background: '#f8faf9', border: '1.5px dashed #c0d3c5', borderRadius: '12px', padding: '20px', marginBottom: '20px', textAlign: 'center' }}>
                    <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '8px' }}>
                      <FileSpreadsheet size={32} style={{ color: '#00875a' }} />
                    </div>
                    <span style={{ fontSize: '14px', fontWeight: '600', color: '#1a2620', display: 'block' }}>
                      Excel फाइल (.xlsx) <span style={{ color: '#d93025' }}>*</span>
                    </span>
                    <p style={{ fontSize: '12px', color: '#7d8981', margin: '4px 0 12px 0' }}>
                      मानक टेम्पलेट फॉर्मेट में तैयार की गई Excel वर्कबुक चुनें (अधिकतम 100MB)
                    </p>
                    <input 
                      type="file" 
                      accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" 
                      required 
                      style={{ maxWidth: '420px', margin: '0 auto', fontSize: '13px' }}
                    />
                  </div>

                  <div className="admin-form-actions" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <button className="button-secondary" type="button" onClick={() => void downloadExcel('/admin/import-template.xlsx', 'टेम्पलेट डाउनलोड नहीं हुआ।', 'voter-import-template.xlsx')} disabled={saving}>
                      <Download size={15} /> मानक Template डाउनलोड करें
                    </button>
                    <button className="button-primary" type="submit" disabled={importing || !organizationId} style={{ height: '42px', padding: '0 24px', fontSize: '14px', fontWeight: '600' }}>
                      {importing ? <LoaderCircle size={16} className="spin" /> : <Upload size={16} />} Excel इम्पोर्ट करें
                    </button>
                  </div>
                </form>
              </section>
            )}

            {/* Recent Uploads & Live Jobs Section */}
            {pdfJobs.length > 0 && (
              <section className="records-panel" style={{ padding: '24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '8px' }}>
                  <div>
                    <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#1a2620', margin: 0 }}>
                      हाल ही में अपलोड की गई सूचियां (Recent Uploads & Extraction History)
                    </h3>
                    <p style={{ fontSize: '13px', color: '#7d8981', margin: '4px 0 0 0' }}>
                      वार्ड, बूथ, प्रभारी यूजर और लाइव एक्सट्रैक्शन स्टेटस
                    </p>
                  </div>
                  <button 
                    type="button" 
                    onClick={() => void loadPdfJobs()} 
                    className="button-secondary"
                    style={{ padding: '6px 14px', fontSize: '12px', display: 'inline-flex', alignItems: 'center', gap: '5px' }}
                  >
                    <RefreshCw size={13} /> रिफ्रेश करें
                  </button>
                </div>

                <div style={{ display: 'grid', gap: '12px' }}>
                  {pdfJobs.map((job) => (
                    <div 
                      key={job.id} 
                      style={{ 
                        display: 'flex', 
                        flexDirection: 'column', 
                        gap: '12px', 
                        background: '#ffffff', 
                        padding: '16px 20px', 
                        borderRadius: '10px', 
                        border: '1px solid #e4eae5',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                          <span 
                            style={{
                              fontSize: '11px',
                              fontWeight: '700',
                              padding: '4px 8px',
                              borderRadius: '6px',
                              letterSpacing: '0.5px',
                              background: job.fileType === 'excel' ? '#e6f4ea' : '#fce8e6',
                              color: job.fileType === 'excel' ? '#137333' : '#c5221f'
                            }}
                          >
                            {job.fileType === 'excel' ? 'EXCEL' : 'PDF'}
                          </span>

                          <div>
                            <div style={{ fontSize: '15px', fontWeight: '600', color: '#1a2620' }}>
                              {job.listDescription ? job.listDescription : job.filename}
                            </div>
                            {job.listDescription && (
                              <div style={{ fontSize: '12px', color: '#7d8981', marginTop: '2px' }}>
                                फ़ाइल: {job.filename}
                              </div>
                            )}
                          </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          {job.status === 'processing' && (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: '600', color: '#00875a', background: '#e6f4ea', padding: '4px 10px', borderRadius: '20px' }}>
                              <LoaderCircle size={14} className="spin" />
                              {job.progress ? `${job.progress}%` : 'प्रोसेसिंग चालू है...'}
                            </span>
                          )}
                          {job.status === 'completed' && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: '600', color: '#137333', background: '#e6f4ea', padding: '4px 10px', borderRadius: '20px' }}>
                                <Check size={14} /> पूर्ण ({job.extractedCount.toLocaleString('hi-IN')} रिकॉर्ड्स)
                              </span>
                              <button
                                type="button"
                                onClick={() => void downloadExcel(`/admin/pdf/download-excel/${job.id}`, 'Excel फ़ाइल डाउनलोड नहीं हो सकी।', job.excelFilename || 'voters.xlsx')}
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '6px',
                                  fontSize: '12px',
                                  fontWeight: '600',
                                  color: '#00875a',
                                  background: '#f0fdf4',
                                  border: '1px solid #bbf7d0',
                                  padding: '5px 12px',
                                  borderRadius: '6px',
                                  cursor: 'pointer'
                                }}
                                title="कन्वर्ट की गई शुद्ध हिंदी Excel फाइल (.xlsx) डाउनलोड करें"
                              >
                                <Download size={13} /> Excel डाउनलोड
                              </button>
                            </div>
                          )}
                          {job.status === 'failed' && (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: '600', color: '#c5221f', background: '#fce8e6', padding: '4px 10px', borderRadius: '20px' }}>
                              <AlertCircle size={14} /> {job.errorMessage ? job.errorMessage : 'त्रुटि (Error)'}
                            </span>
                          )}
                        </div>
                      </div>

                      {job.status === 'processing' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', background: '#f4fbf7', border: '1px solid #cce8d7', borderRadius: '8px', padding: '10px 14px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '13px', fontWeight: '600', color: '#166534' }}>
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                              <LoaderCircle size={14} className="spin" style={{ color: '#00875a' }} />
                              {job.stageMessage || 'प्रोसेसिंग जारी है...'}
                            </span>
                            <span style={{ fontSize: '12px', color: '#059669', fontVariantNumeric: 'tabular-nums' }}>
                              {job.progress || 0}%
                            </span>
                          </div>
                          <div style={{ width: '100%', height: '6px', backgroundColor: '#d1e7dd', borderRadius: '4px', overflow: 'hidden' }}>
                            <div style={{ width: `${job.progress || 0}%`, height: '100%', backgroundColor: '#00875a', transition: 'width 0.4s ease' }} />
                          </div>
                        </div>
                      )}

                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', paddingTop: '8px', borderTop: '1px solid #f0f3f1', fontSize: '12px', color: '#4a5568' }}>
                        {job.wardNo ? (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: '#e8f0fe', color: '#1967d2', padding: '3px 8px', borderRadius: '5px', fontWeight: '500' }}>
                            वार्ड: <strong>{job.wardNo}</strong>
                          </span>
                        ) : (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: '#f1f3f4', color: '#5f6368', padding: '3px 8px', borderRadius: '5px' }}>
                            वार्ड: सामान्य / सभी
                          </span>
                        )}

                        {job.boothNo && (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: '#fef7e0', color: '#b06000', padding: '3px 8px', borderRadius: '5px', fontWeight: '500' }}>
                            बूथ/भाग: <strong>{job.boothNo}</strong>
                          </span>
                        )}

                        {job.uploadedBy && (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: '#f3e8fd', color: '#7627bb', padding: '3px 8px', borderRadius: '5px', fontWeight: '500' }}>
                            प्रभारी: <strong>{job.uploadedBy}</strong>
                          </span>
                        )}

                        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <span style={{ color: '#9aa0a6', fontSize: '11px' }}>
                            {new Date(job.uploadedAt).toLocaleString('hi-IN', { dateStyle: 'short', timeStyle: 'short' })}
                          </span>
                          <button
                            type="button"
                            onClick={() => void deletePdfJob(job.id)}
                            style={{
                              background: 'transparent',
                              border: 'none',
                              color: '#9aa0a6',
                              cursor: 'pointer',
                              padding: '2px 4px',
                              display: 'inline-flex',
                              alignItems: 'center'
                            }}
                            onMouseEnter={(e) => (e.currentTarget.style.color = '#ef4444')}
                            onMouseLeave={(e) => (e.currentTarget.style.color = '#9aa0a6')}
                            title="यह जॉब इतिहास से हटाएं"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </>
        )}

        {activeView === 'export' && (
          <section className="records-panel" style={{ padding: '24px' }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
              <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: '#e6f4ea', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#137333', boxShadow: '0 2px 6px rgba(19, 115, 51, 0.12)' }}>
                <Download size={22} />
              </div>
              <div>
                <h2 style={{ fontSize: '20px', fontWeight: '700', color: '#1a2620', margin: 0 }}>
                  मतदाता सूची डेटा एक्सपोर्ट सेंटर
                </h2>
                <p style={{ fontSize: '13px', color: '#5f6368', margin: '3px 0 0 0' }}>
                  किसी भी क्लाइंट संगठन या संपूर्ण सिस्टम का मतदाता डेटा मानक Excel फॉर्मेट में डाउनलोड करें।
                </p>
              </div>
            </div>

            {/* Feature Highlights Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px', marginBottom: '24px' }}>
              <div style={{ background: '#f8faf9', border: '1px solid #e4eae5', borderRadius: '12px', padding: '18px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#1a2620', fontWeight: '700', fontSize: '14px', marginBottom: '6px' }}>
                  <FileSpreadsheet size={18} style={{ color: '#00875a' }} /> मानक 18-कॉलम ECI फॉर्मेट
                </div>
                <p style={{ fontSize: '12px', color: '#5f6368', margin: 0, lineHeight: '1.5' }}>
                  शुद्ध देवनागरी नाम, संबंधी नाम, संबंध प्रकार, मकान संख्या, वार्ड, बूथ, आयु, लिंग, मोबाइल, जाति और परिवार आईडी सहित पूर्ण रूप से संरचित वर्कबुक।
                </p>
              </div>

              <div style={{ background: '#f8faf9', border: '1px solid #e4eae5', borderRadius: '12px', padding: '18px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#1a2620', fontWeight: '700', fontSize: '14px', marginBottom: '6px' }}>
                  <Sparkles size={18} style={{ color: '#1967d2' }} /> 1 Lakh+ उच्च-गति स्ट्रीमिंग
                </div>
                <p style={{ fontSize: '12px', color: '#5f6368', margin: 0, lineHeight: '1.5' }}>
                  डेटाबेस से सीधे मेमोरी-ऑप्टिमाइज़्ड गति से स्ट्रीम होता है। हजारों या लाखों मतदाताओं का डेटा भी बिना किसी रुकावट के तुरंत तैयार होता है।
                </p>
              </div>
            </div>

            {/* Selection Card */}
            <div style={{ background: '#ffffff', border: '1px solid #e4eae5', borderRadius: '12px', padding: '20px', maxWidth: '520px', marginBottom: '20px' }}>
              <label style={{ fontSize: '13px', fontWeight: '600', color: '#1a2620', display: 'block', marginBottom: '8px' }}>
                क्लाइंट (संगठन) का चयन करें
              </label>
              <select 
                value={organizationId} 
                onChange={(event) => setOrganizationId(event.target.value)}
                style={{ width: '100%', height: '42px', fontSize: '14px', borderRadius: '8px', border: '1px solid #c0d3c5', background: '#ffffff', padding: '0 12px', marginBottom: '14px' }}
              >
                <option value="">🏢 संपूर्ण सिस्टम (All Organizations - {organizations.reduce((sum, t) => sum + (t.voterCount || 0), 0).toLocaleString('hi-IN')} रिकॉर्ड्स)</option>
                {organizations.map((tenant, idx) => (
                  <option key={`${tenant.id}-${idx}`} value={tenant.id}>
                    {tenant.name} ({tenant.voterCount.toLocaleString('hi-IN')} मतदाता)
                  </option>
                ))}
              </select>

              {/* Format Badges */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '18px' }}>
                <span style={{ fontSize: '11px', fontWeight: '700', padding: '3px 8px', borderRadius: '4px', background: '#e6f4ea', color: '#137333' }}>
                  .XLSX EXCEL
                </span>
                <span style={{ fontSize: '11px', fontWeight: '700', padding: '3px 8px', borderRadius: '4px', background: '#e8f0fe', color: '#1967d2' }}>
                  UTF-8 DEVANAGARI
                </span>
                <span style={{ fontSize: '11px', fontWeight: '700', padding: '3px 8px', borderRadius: '4px', background: '#fef7e0', color: '#b06000' }}>
                  18 COLUMNS STANDARD
                </span>
              </div>

              <button 
                className="button-primary" 
                type="button" 
                onClick={() => void downloadExcel(`/admin/export-voters${organizationId ? `?organizationId=${encodeURIComponent(organizationId)}` : ''}`, 'Excel export नहीं हुआ।', `${organizationId ? (organizations.find(o => o.id === organizationId)?.name || 'client') : 'platform'}-voters.xlsx`)} 
                disabled={saving}
                style={{ width: '100%', height: '44px', fontSize: '14px', fontWeight: '600', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
              >
                {saving ? <LoaderCircle size={16} className="spin" /> : <Download size={16} />} पूर्ण मतदाता सूची Excel डाउनलोड करें
              </button>
            </div>
          </section>
        )}



        {editingTenant && (
          <div className="feature-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setEditingTenant(null); }}>
            <section className="form-modal" role="dialog" aria-modal="true" aria-labelledby="tenant-edit-title" style={{ maxWidth: '960px', width: '95%', maxHeight: '90vh', overflowY: 'auto' }}>
              <div className="modal-heading">
                <div>
                  <span className="eyebrow-label">TENANT CONFIGURATION</span>
                  <h2 id="tenant-edit-title">क्लाइंट access व पर्ची कस्टमाइज़ करें</h2>
                  <p>{editingTenant.name}</p>
                </div>
                <button className="icon-button" type="button" onClick={() => setEditingTenant(null)} aria-label="बंद करें"><X size={18} /></button>
              </div>
              <form className="modal-form" onSubmit={updateTenant}>
                <div className="feature-form-grid">
                  <label>क्लाइंट नाम<input required value={editingTenant.name} onChange={(event) => setEditingTenant({ ...editingTenant, name: event.target.value })} /></label>
                  <label>अनुमत वार्ड <span className="optional-label">कॉमा से अलग; खाली = सभी वार्ड</span><input value={editingTenant.wards.join(', ')} onChange={(event) => setEditingTenant({ ...editingTenant, wards: event.target.value.split(',').map((ward) => ward.trim()).filter(Boolean) })} /></label>
                </div>

                <div style={{ marginTop: '14px', padding: '12px 14px', borderRadius: '10px', border: '1.5px dashed #cbd5e1', background: '#f8fafc' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px', color: '#1e293b', fontWeight: 600, fontSize: '12.5px' }}>
                    <MapPin size={14} style={{ color: '#0284c7' }} />
                    <span>चुनावी / प्रशासनिक क्षेत्र (State Election Commission Format - वैकल्पिक)</span>
                  </div>
                  <div className="feature-form-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px' }}>
                    <label style={{ fontSize: '12px', margin: 0 }}>
                      District (जिला)
                      <input
                        type="text"
                        value={editingTenant.district || ''}
                        onChange={(e) => setEditingTenant({ ...editingTenant, district: e.target.value })}
                        placeholder="उदा. PALI"
                      />
                    </label>
                    <label style={{ fontSize: '12px', margin: 0 }}>
                      ULB / PanchayatSamiti (निकाय / पं. समिति)
                      <input
                        type="text"
                        value={editingTenant.ulbPanchayatSamiti || ''}
                        onChange={(e) => setEditingTenant({ ...editingTenant, ulbPanchayatSamiti: e.target.value })}
                        placeholder="उदा. SOJAT PANCHAYAT SAMITI"
                      />
                    </label>
                    <label style={{ fontSize: '12px', margin: 0 }}>
                      ULB Ward / GramPanchayat (वार्ड / ग्रा.पं.)
                      <input
                        type="text"
                        value={editingTenant.ulbWardGramPanchayat || ''}
                        onChange={(e) => setEditingTenant({ ...editingTenant, ulbWardGramPanchayat: e.target.value })}
                        placeholder="उदा. RAMASANI BALA"
                      />
                    </label>
                  </div>
                </div>
                <fieldset className="feature-module-fieldset" style={{ marginTop: '20px' }}>
                  <legend>सक्षम फीचर</legend>
                  <div className="feature-module-grid">
                    {moduleOptions.map(([module, label]) => <label key={module}><input type="checkbox" checked={editingTenant.modules.includes(module)} onChange={() => setEditingTenant({ ...editingTenant, modules: editingTenant.modules.includes(module) ? editingTenant.modules.filter((item) => item !== module) : [...editingTenant.modules, module] })} /> {label}</label>)}
                  </div>
                </fieldset>

                <div style={{ marginTop: '16px', padding: '14px 18px', background: '#f0fdf4', borderRadius: '10px', border: '1px solid #bbf7d0', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600, color: '#166534', cursor: 'pointer', margin: 0 }}>
                    <input type="checkbox" checked={editingTenant.whatsappEnabled ?? true} onChange={(e) => setEditingTenant({ ...editingTenant, whatsappEnabled: e.target.checked })} />
                    WhatsApp मैसेजिंग सेवा सक्षम रखें
                  </label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '12px', fontSize: '13px', color: '#166534' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
                      उपलब्ध क्रेडिट्स:
                      <input type="number" min="0" value={editingTenant.whatsappCredits ?? 0} onChange={(e) => setEditingTenant({ ...editingTenant, whatsappCredits: Number.parseInt(e.target.value, 10) || 0 })} style={{ width: '100px', padding: '4px 8px', borderRadius: '6px', border: '1px solid #86efac' }} />
                    </label>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      {[100, 500, 1000].map((add) => (
                        <button key={add} type="button" className="button-quiet" style={{ fontSize: '11px', padding: '2px 8px', background: '#fff', border: '1px solid #86efac', borderRadius: '4px', cursor: 'pointer' }} onClick={() => setEditingTenant({ ...editingTenant, whatsappCredits: (editingTenant.whatsappCredits ?? 0) + add })}>
                          +{add}
                        </button>
                      ))}
                    </div>
                    {typeof editingTenant.whatsappUsed === 'number' && (
                      <span style={{ fontSize: '12px', color: '#64748b', marginLeft: 'auto' }}>
                        प्रयुक्त: {editingTenant.whatsappUsed} संदेश
                      </span>
                    )}
                  </div>
                </div>

                {/* पर्ची ब्रांडिंग संपादन व लाइव पूर्वावलोकन */}
                <fieldset className="feature-module-fieldset" style={{ marginTop: '20px', padding: '16px', background: '#f8fafc', borderRadius: '12px', border: '1.5px solid #cbd5e1' }}>
                  <legend style={{ fontWeight: 800, color: '#1e3a8a', fontSize: '15px', padding: '0 8px' }}>
                    मतदाता पर्ची ब्रांडिंग (फोटो व विवरण संपादन)
                  </legend>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))', gap: '20px', alignItems: 'start' }}>
                    {/* Inputs */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                        <label style={{ fontSize: '12px', fontWeight: 600 }}>
                          प्रत्याशी नाम (हिंदी)
                          <input
                            value={editingTenant.slipConfig?.candidateName || ''}
                            onChange={(e) => setEditingTenant({
                              ...editingTenant,
                              slipConfig: { ...(editingTenant.slipConfig || defaultSlipConfig), candidateName: e.target.value }
                            })}
                            placeholder="प्रसन्न चंद मेहता"
                          />
                        </label>
                        <label style={{ fontSize: '12px', fontWeight: 600 }}>
                          Candidate Name (En)
                          <input
                            value={editingTenant.slipConfig?.candidateNameEn || ''}
                            onChange={(e) => setEditingTenant({
                              ...editingTenant,
                              slipConfig: { ...(editingTenant.slipConfig || defaultSlipConfig), candidateNameEn: e.target.value }
                            })}
                            placeholder="Prasann Chand Mehta"
                          />
                        </label>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 0.8fr', gap: '10px' }}>
                        <label style={{ fontSize: '12px', fontWeight: 600 }}>
                          पार्टी का नाम
                          <input
                            value={editingTenant.slipConfig?.partyName || ''}
                            onChange={(e) => setEditingTenant({
                              ...editingTenant,
                              slipConfig: { ...(editingTenant.slipConfig || defaultSlipConfig), partyName: e.target.value }
                            })}
                            placeholder="भाजपा प्रत्याशी"
                          />
                        </label>
                        <label style={{ fontSize: '12px', fontWeight: 600 }}>
                          चुनाव चिन्ह नाम
                          <input
                            value={editingTenant.slipConfig?.partySymbolName || ''}
                            onChange={(e) => setEditingTenant({
                              ...editingTenant,
                              slipConfig: { ...(editingTenant.slipConfig || defaultSlipConfig), partySymbolName: e.target.value }
                            })}
                            placeholder="कमल का फूल"
                          />
                        </label>
                        <label style={{ fontSize: '12px', fontWeight: 600 }}>
                          EVM क्रम नं.
                          <input
                            value={editingTenant.slipConfig?.evmNumber || ''}
                            onChange={(e) => setEditingTenant({
                              ...editingTenant,
                              slipConfig: { ...(editingTenant.slipConfig || defaultSlipConfig), evmNumber: e.target.value }
                            })}
                            placeholder="1"
                          />
                        </label>
                      </div>

                      <div style={{ background: '#f8fafc', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', margin: '4px 0' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '12px', fontWeight: 700, color: '#1e293b' }}>
                          <input
                            type="checkbox"
                            checked={!editingTenant.slipConfig?.hideEvmRibbon}
                            onChange={(e) => setEditingTenant({
                              ...editingTenant,
                              slipConfig: { ...(editingTenant.slipConfig || defaultSlipConfig), hideEvmRibbon: !e.target.checked }
                            })}
                            style={{ width: '16px', height: '16px', accentColor: '#ea580c', cursor: 'pointer' }}
                          />
                          <span>ईवीएम / मतपत्र क्रम संख्या पट्टी दिखाएं (Show EVM Ribbon)</span>
                        </label>
                      </div>

                      <div style={{ background: '#f0fdf4', padding: '10px 12px', borderRadius: '8px', border: '1.5px solid #86efac', margin: '4px 0' }}>
                        <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#166534', marginBottom: '6px' }}>
                          मुख्य हाईलाइट कार्ड (Highlight Card):
                        </label>
                        <div style={{ display: 'flex', gap: '14px' }}>
                          <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: 700, color: '#0f172a' }}>
                            <input
                              type="radio"
                              name={`tenant_metric_${editingTenant.id}`}
                              value="ward"
                              checked={editingTenant.slipConfig?.metricType !== 'part' && editingTenant.slipConfig?.showWardInsteadOfPart !== false}
                              onChange={() => setEditingTenant({
                                ...editingTenant,
                                slipConfig: { ...(editingTenant.slipConfig || defaultSlipConfig), metricType: 'ward', showWardInsteadOfPart: true }
                              })}
                              style={{ width: '15px', height: '15px', accentColor: '#16a34a', cursor: 'pointer' }}
                            />
                            <span>🏛️ वार्ड संख्या (WARD NO.)</span>
                          </label>
                          <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: 600, color: '#475569' }}>
                            <input
                              type="radio"
                              name={`tenant_metric_${editingTenant.id}`}
                              value="part"
                              checked={editingTenant.slipConfig?.metricType === 'part' || editingTenant.slipConfig?.showWardInsteadOfPart === false}
                              onChange={() => setEditingTenant({
                                ...editingTenant,
                                slipConfig: { ...(editingTenant.slipConfig || defaultSlipConfig), metricType: 'part', showWardInsteadOfPart: false }
                              })}
                              style={{ width: '15px', height: '15px', accentColor: '#2563eb', cursor: 'pointer' }}
                            />
                            <span>📋 भाग संख्या (PART NO.)</span>
                          </label>
                        </div>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                        <label style={{ fontSize: '12px', fontWeight: 600 }}>
                          उपशीर्षक / क्षेत्र
                          <input
                            value={editingTenant.slipConfig?.subTitle || ''}
                            onChange={(e) => setEditingTenant({
                              ...editingTenant,
                              slipConfig: { ...(editingTenant.slipConfig || defaultSlipConfig), subTitle: e.target.value }
                            })}
                            placeholder="वार्ड नंबर 82 Jodhpur"
                          />
                        </label>
                        <label style={{ fontSize: '12px', fontWeight: 600 }}>
                          EVM पट्टी संदेश
                          <input
                            value={editingTenant.slipConfig?.appealText || ''}
                            onChange={(e) => setEditingTenant({
                              ...editingTenant,
                              slipConfig: { ...(editingTenant.slipConfig || defaultSlipConfig), appealText: e.target.value }
                            })}
                            placeholder="को अपना अमूल्य वोट देकर भारी मतों से विजय बनाएं।"
                          />
                        </label>
                      </div>

                      <label style={{ fontSize: '12px', fontWeight: 600 }}>
                        बॉटम अपील (Footer)
                        <input
                          value={editingTenant.slipConfig?.footerAppeal || ''}
                          onChange={(e) => setEditingTenant({
                            ...editingTenant,
                            slipConfig: { ...(editingTenant.slipConfig || defaultSlipConfig), footerAppeal: e.target.value }
                          })}
                          placeholder="कमल का बटन दबाएं और भारी मतों से विजयी बनाएं"
                        />
                      </label>

                      {/* Photo Uploaders (Styled) */}
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '6px' }}>
                        {/* Left Party Symbol */}
                        <div style={{ padding: '12px', background: '#fff7ed', borderRadius: '10px', border: '1.5px dashed #ea580c', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <span style={{ fontSize: '11px', fontWeight: 700, color: '#ea580c' }}>
                              चुनाव चिन्ह फ़ोटो
                            </span>
                            {editingTenant.slipConfig?.partySymbolImage && (
                              <span style={{ fontSize: '10px', color: '#15803d', fontWeight: 700, background: '#dcfce7', padding: '1px 5px', borderRadius: '4px' }}>
                                अपलोड है
                              </span>
                            )}
                          </div>
                          {editingTenant.slipConfig?.partySymbolImage ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#ffffff', padding: '6px', borderRadius: '6px', border: '1px solid #fed7aa' }}>
                              <img src={editingTenant.slipConfig.partySymbolImage} alt="" style={{ width: '36px', height: '36px', objectFit: 'contain', borderRadius: '4px' }} />
                              <button
                                type="button"
                                style={{ marginLeft: 'auto', background: '#fee2e2', border: '1px solid #fecaca', color: '#b91c1c', borderRadius: '4px', padding: '3px 6px', fontSize: '10px', fontWeight: 600, cursor: 'pointer' }}
                                onClick={() => setEditingTenant({
                                  ...editingTenant,
                                  slipConfig: { ...(editingTenant.slipConfig || defaultSlipConfig), partySymbolImage: '' }
                                })}
                              >
                                हटाएं
                              </button>
                            </div>
                          ) : (
                            <div style={{ fontSize: '11px', color: '#9a3412' }}>वेक्टर चिन्ह सक्रिय है</div>
                          )}
                          <label style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '4px', padding: '6px 10px', background: '#ea580c', color: '#fff', borderRadius: '6px', fontSize: '11px', fontWeight: 600, cursor: 'pointer' }}>
                            <Upload size={12} />
                            <span>{editingTenant.slipConfig?.partySymbolImage ? 'चिन्ह बदलें' : 'चिन्ह फ़ोटो चुनें'}</span>
                            <input
                              type="file"
                              accept="image/*"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) handleImageUpload(file, 'partySymbolImage', true);
                              }}
                              style={{ display: 'none' }}
                            />
                          </label>
                        </div>

                        {/* Right Candidate Photo */}
                        <div style={{ padding: '12px', background: '#eff6ff', borderRadius: '10px', border: '1.5px dashed #1e3a8a', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <span style={{ fontSize: '11px', fontWeight: 700, color: '#1e3a8a' }}>
                              प्रत्याशी फ़ोटो
                            </span>
                            {editingTenant.slipConfig?.candidateImage && (
                              <span style={{ fontSize: '10px', color: '#15803d', fontWeight: 700, background: '#dcfce7', padding: '1px 5px', borderRadius: '4px' }}>
                                अपलोड है
                              </span>
                            )}
                          </div>
                          {editingTenant.slipConfig?.candidateImage ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#ffffff', padding: '6px', borderRadius: '6px', border: '1px solid #bfdbfe' }}>
                              <img src={editingTenant.slipConfig.candidateImage} alt="" style={{ width: '36px', height: '36px', objectFit: 'cover', borderRadius: '50%', border: '1px solid #3b82f6' }} />
                              <button
                                type="button"
                                style={{ marginLeft: 'auto', background: '#fee2e2', border: '1px solid #fecaca', color: '#b91c1c', borderRadius: '4px', padding: '3px 6px', fontSize: '10px', fontWeight: 600, cursor: 'pointer' }}
                                onClick={() => setEditingTenant({
                                  ...editingTenant,
                                  slipConfig: { ...(editingTenant.slipConfig || defaultSlipConfig), candidateImage: '' }
                                })}
                              >
                                हटाएं
                              </button>
                            </div>
                          ) : (
                            <div style={{ fontSize: '11px', color: '#1e40af' }}>पोर्ट्रेट आइकन सक्रिय है</div>
                          )}
                          <label style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '4px', padding: '6px 10px', background: '#1e3a8a', color: '#fff', borderRadius: '6px', fontSize: '11px', fontWeight: 600, cursor: 'pointer' }}>
                            <Upload size={12} />
                            <span>{editingTenant.slipConfig?.candidateImage ? 'फ़ोटो बदलें' : 'प्रत्याशी फ़ोटो चुनें'}</span>
                            <input
                              type="file"
                              accept="image/*"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) handleImageUpload(file, 'candidateImage', true);
                              }}
                              style={{ display: 'none' }}
                            />
                          </label>
                        </div>
                      </div>
                    </div>

                    {/* Live Preview Container (Fully Contained, Zero Overflow) */}
                    <div style={{ background: '#ffffff', borderRadius: '12px', padding: '14px', border: '1px solid #cbd5e1', overflow: 'hidden' }}>
                      <div style={{ fontSize: '12px', fontWeight: 700, color: '#16a34a', marginBottom: '8px' }}>
                        लाइव पूर्वावलोकन (Live Preview)
                      </div>
                      <div style={{ width: '100%', maxWidth: '480px', margin: '0 auto', overflow: 'hidden' }}>
                        <VoterSlipTemplate config={editingTenant.slipConfig || defaultSlipConfig} isInline={true} />
                      </div>
                    </div>
                  </div>
                </fieldset>

                <label className="checkbox-label" style={{ marginTop: '14px' }}>
                  <input type="checkbox" checked={editingTenant.isActive} onChange={(event) => setEditingTenant({ ...editingTenant, isActive: event.target.checked })} />
                  क्लाइंट खाते को सक्रिय रखें
                </label>

                <div className="modal-actions" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', flexWrap: 'wrap', gap: '10px' }}>
                  <button
                    type="button"
                    className="button-quiet"
                    style={{ color: '#dc2626', borderColor: '#fca5a5', background: '#fef2f2', display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 600 }}
                    onClick={() => {
                      setDeletingTenant(editingTenant);
                      setDeleteConfirmText('');
                    }}
                  >
                    <Trash2 size={14} /> पूरा क्लाइंट और सारा डेटा डिलीट करें
                  </button>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button className="button-secondary" type="button" onClick={() => setEditingTenant(null)}>रद्द करें</button>
                    <button className="button-primary" type="submit" disabled={saving}>
                      {saving ? <LoaderCircle size={15} className="spin" /> : <Check size={15} />} सेव करें
                    </button>
                  </div>
                </div>
              </form>
            </section>
          </div>
        )}

        {/* ================================================================= */}
        {/* WARD RENAME / EDIT MODAL                                          */}
        {/* ================================================================= */}
        {showRenameWardModal && (
          <div
            className="feature-modal-backdrop"
            role="presentation"
            onMouseDown={(e) => {
              if (e.target === e.currentTarget && !renamingWard) setShowRenameWardModal(false);
            }}
          >
            <section
              className="form-modal"
              role="dialog"
              aria-modal="true"
              style={{
                maxWidth: '480px',
                width: '95%',
                maxHeight: '90vh',
                overflowY: 'auto',
                borderRadius: '16px',
                boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
                padding: '20px 18px',
              }}
            >
              <div className="modal-heading" style={{ borderBottom: '1px solid #e2e8f0', paddingBottom: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div
                    style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '10px',
                      background: '#ecfdf5',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#059669',
                    }}
                  >
                    <Edit3 size={20} />
                  </div>
                  <div>
                    <span style={{ fontSize: '11px', fontWeight: 700, color: '#059669', letterSpacing: '0.05em' }}>
                      वार्ड प्रबंधन · WARD EDITOR
                    </span>
                    <h2 style={{ fontSize: '18px', color: '#1a2620', margin: '2px 0 0' }}>वार्ड का नाम बदलें / एडिट करें</h2>
                  </div>
                </div>
                <button
                  type="button"
                  className="close-button"
                  onClick={() => setShowRenameWardModal(false)}
                  disabled={renamingWard}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleRenameWard} style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div>
                  <label style={{ fontSize: '13px', fontWeight: '600', color: '#334155', display: 'block', marginBottom: '6px' }}>
                    संबंधित क्लाइंट (संगठन)
                  </label>
                  <select
                    value={organizationId}
                    onChange={(e) => setOrganizationId(e.target.value)}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                    required
                  >
                    <option value="">क्लाइंट चुनें</option>
                    {organizations.map((t, idx) => (
                      <option key={`${t.id}-${idx}`} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '13px', fontWeight: '600', color: '#334155', display: 'block', marginBottom: '6px' }}>
                    वर्तमान वार्ड का नाम (Old Ward)
                  </label>
                  <select
                    value={renameWardOld}
                    onChange={(e) => {
                      setRenameWardOld(e.target.value);
                      if (!renameWardNew) setRenameWardNew(e.target.value);
                    }}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                    required
                  >
                    <option value="">वर्तमान वार्ड चुनें</option>
                    {availableWards.map((w) => (
                      <option key={w} value={w}>वार्ड {w}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '13px', fontWeight: '600', color: '#334155', display: 'block', marginBottom: '6px' }}>
                    नया वार्ड नाम (New Ward Name)
                  </label>
                  <input
                    type="text"
                    value={renameWardNew}
                    onChange={(e) => setRenameWardNew(e.target.value)}
                    placeholder="नया वार्ड नाम दर्ज करें (उदा. 16 या 17A)"
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                    required
                    autoFocus
                  />
                  <p style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>
                    💡 यह नाम बदलने से इस वार्ड के सभी मतदाताओं और पर्ची सेटिंग्स में नया नाम स्वतः लागू हो जाएगा।
                  </p>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                  <button
                    type="button"
                    className="button-secondary"
                    onClick={() => setShowRenameWardModal(false)}
                    disabled={renamingWard}
                    style={{ padding: '8px 16px', fontSize: '13px' }}
                  >
                    रद्द करें
                  </button>
                  <button
                    type="submit"
                    className="button-primary"
                    disabled={renamingWard || !renameWardOld.trim() || !renameWardNew.trim()}
                    style={{ padding: '8px 20px', fontSize: '13px', fontWeight: '600' }}
                  >
                    {renamingWard ? <LoaderCircle size={15} className="spin" /> : <CheckCircle2 size={15} />}
                    {' '}वार्ड नाम अपडेट करें
                  </button>
                </div>
              </form>
            </section>
          </div>
        )}

        {/* ================================================================= */}
        {/* CLIENT CASCADE DELETION CONFIRMATION MODAL (DANGER ZONE)         */}
        {/* ================================================================= */}
        {deletingTenant && (
          <div
            className="feature-modal-backdrop"
            role="presentation"
            onMouseDown={(e) => {
              if (e.target === e.currentTarget && !isDeletingClient) setDeletingTenant(null);
            }}
          >
            <section
              className="form-modal"
              role="dialog"
              aria-modal="true"
              style={{
                maxWidth: '520px',
                width: '95%',
                border: '1.5px solid #fca5a5',
                boxShadow: '0 20px 25px -5px rgba(239, 68, 68, 0.15)',
              }}
            >
              <div className="modal-heading" style={{ borderBottom: '1px solid #fee2e2', paddingBottom: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div
                    style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '50%',
                      background: '#fee2e2',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#dc2626',
                    }}
                  >
                    <AlertTriangle size={22} />
                  </div>
                  <div>
                    <span style={{ fontSize: '11px', fontWeight: 800, color: '#dc2626', letterSpacing: '0.08em' }}>
                      DANGER ZONE · पूर्ण डेटा निष्कासन
                    </span>
                    <h2 style={{ fontSize: '19px', color: '#991b1b', margin: '2px 0 0' }}>क्लाइंट खाता डिलीट करें?</h2>
                  </div>
                </div>
                <button
                  className="icon-button"
                  type="button"
                  disabled={isDeletingClient}
                  onClick={() => setDeletingTenant(null)}
                  aria-label="बंद करें"
                >
                  <X size={18} />
                </button>
              </div>

              <div style={{ padding: '16px 0', fontSize: '14px', color: '#334155', lineHeight: 1.6 }}>
                <p style={{ margin: '0 0 12px', fontWeight: 600, color: '#0f172a' }}>
                  आप क्लाइंट <span style={{ color: '#b91c1c', fontWeight: 800 }}>&quot;{deletingTenant.name}&quot;</span> ({deletingTenant.id}) को हटाने जा रहे हैं।
                </p>

                <div
                  style={{
                    background: '#fef2f2',
                    border: '1px solid #fecaca',
                    borderRadius: '8px',
                    padding: '12px 14px',
                    marginBottom: '16px',
                    fontSize: '13px',
                    color: '#991b1b',
                  }}
                >
                  <strong>चेतावनी: निम्नलिखित सभी चीजें स्थायी रूप से (Permanently) डिलीट हो जाएंगी:</strong>
                  <ul style={{ margin: '6px 0 0', paddingLeft: '20px' }}>
                    <li>इस क्लाइंट के सभी <strong>{deletingTenant.voterCount.toLocaleString('hi-IN')} मतदाता</strong></li>
                    <li>सभी कार्यकर्ता व एडमिन लॉगिन खाते ({deletingTenant.activeWorkers} सक्रिय कार्यकर्ता)</li>
                    <li>सभी WhatsApp व पर्ची डिस्पैच रिकॉर्ड्स</li>
                    <li>पर्ची ब्रांडिंग और कस्टमाइजेशन सेटिंग्स</li>
                  </ul>
                  <p style={{ margin: '8px 0 0', fontWeight: 700, color: '#b91c1c' }}>
                    ⚠️ यह प्रक्रिया पूर्ववत (Undo) नहीं की जा सकती!
                  </p>
                </div>

                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#475569', marginBottom: '6px' }}>
                  पुष्टि के लिए नीचे क्लाइंट का नाम लिखें: <strong style={{ color: '#0f172a' }}>{deletingTenant.name}</strong>
                </label>
                <input
                  type="text"
                  placeholder={deletingTenant.name}
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  disabled={isDeletingClient}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    border: '1.5px solid #cbd5e1',
                    outline: 'none',
                    fontSize: '14px',
                  }}
                />
                {error && (
                  <div className="notice notice-error" style={{ marginTop: '10px', fontSize: '13px' }}>
                    {error}
                  </div>
                )}
              </div>

              <div className="modal-actions" style={{ borderTop: '1px solid #f1f5f9', paddingTop: '14px' }}>
                <button
                  className="button-secondary"
                  type="button"
                  disabled={isDeletingClient}
                  onClick={() => {
                    setDeletingTenant(null);
                    setDeleteConfirmText('');
                  }}
                >
                  रद्द करें
                </button>
                <button
                  type="button"
                  className="button-primary"
                  style={{
                    background: '#dc2626',
                    borderColor: '#dc2626',
                    color: '#ffffff',
                    opacity: deleteConfirmText.trim() === deletingTenant.name.trim() ? 1 : 0.6,
                  }}
                  disabled={deleteConfirmText.trim() !== deletingTenant.name.trim() || isDeletingClient}
                  onClick={() => void handleDeleteOrganization()}
                >
                  {isDeletingClient ? <LoaderCircle size={15} className="spin" /> : <Trash2 size={15} />}
                  {isDeletingClient ? 'डिलीट हो रहा है...' : 'हाँ, पूरा क्लाइंट डिलीट करें'}
                </button>
              </div>
            </section>
          </div>
        )}

        {/* ================================================================= */}
        {/* CREATE CLIENT POP-UP MODAL                                        */}
        {/* ================================================================= */}
        {isCreateClientModalOpen && (
          <div
            className="feature-modal-backdrop"
            role="presentation"
            onMouseDown={(e) => {
              if (e.target === e.currentTarget && !saving) setIsCreateClientModalOpen(false);
            }}
          >
            <section
              className="feature-modal"
              role="dialog"
              aria-modal="true"
              style={{
                maxWidth: '800px',
                width: '95%',
                maxHeight: '92vh',
                overflowY: 'auto',
                borderRadius: '16px',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                border: '1px solid #e2e8f0',
                background: '#ffffff',
                display: 'flex',
                flexDirection: 'column',
                position: 'relative'
              }}
            >
              <div
                className="feature-modal-heading"
                style={{
                  position: 'sticky',
                  top: 0,
                  zIndex: 20,
                  background: '#ffffff',
                  borderBottom: '1px solid #f1f5f9',
                  padding: '16px 20px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}
              >
                <div>
                  <span className="eyebrow-label" style={{ color: '#2563eb', fontWeight: 700, letterSpacing: '0.05em' }}>
                    <UserPlus size={13} /> TENANT PROVISIONING
                  </span>
                  <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a', margin: '4px 0 0 0' }}>
                    नया क्लाइंट खाता जोड़ें (New Client)
                  </h2>
                </div>
                <button
                  className="icon-button"
                  type="button"
                  disabled={saving}
                  onClick={() => setIsCreateClientModalOpen(false)}
                  aria-label="बंद करें"
                  style={{ borderRadius: '8px', padding: '6px' }}
                >
                  <X size={18} />
                </button>
              </div>

              <form className="modal-form" onSubmit={createTenant} noValidate>
                <div className="feature-form-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px' }}>
                  <label>
                    क्लाइंट / संगठन का नाम <span style={{ color: '#dc2626' }}>*</span>
                    <input
                      required
                      value={tenantName}
                      onChange={(event) => setTenantName(event.target.value)}
                      placeholder="उदा. आदर्श जन सेवा समिति"
                    />
                  </label>
                  <label>
                    क्लाइंट एडमिन ईमेल <span style={{ color: '#dc2626' }}>*</span>
                    <input
                      type="email"
                      autoComplete="username"
                      required
                      value={tenantEmail}
                      onChange={(event) => setTenantEmail(event.target.value)}
                      placeholder="admin@election.in"
                    />
                  </label>
                  <label>
                    शुरुआती पासवर्ड <span style={{ color: '#dc2626' }}>* (8+ अक्षर)</span>
                    <span className="feature-password-field" style={{ marginTop: '4px' }}>
                      <KeyRound size={14} />
                      <input
                        type={showTenantPassword ? 'text' : 'password'}
                        autoComplete="new-password"
                        minLength={8}
                        required
                        value={tenantPassword}
                        onChange={(event) => setTenantPassword(event.target.value)}
                        placeholder="कम-से-कम 8 अक्षर"
                      />
                      <button
                        type="button"
                        className="password-eye-btn"
                        onClick={() => setShowTenantPassword((prev) => !prev)}
                        title={showTenantPassword ? 'पासवर्ड छिपाएं' : 'पासवर्ड देखें'}
                      >
                        {showTenantPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                    </span>
                  </label>
                  <label>
                    अनुमत वार्ड <span className="optional-label">कॉमा से अलग; खाली = पूरा संगठन</span>
                    <input
                      value={tenantWards}
                      onChange={(event) => setTenantWards(event.target.value)}
                      placeholder="वार्ड 1, वार्ड 2"
                    />
                  </label>
                </div>

                {/* राज्य निर्वाचन आयोग (SEC Rajasthan) अनुसार वैकल्पिक भौगोलिक / चुनावी क्षेत्र */}
                <div
                  style={{
                    marginTop: '16px',
                    padding: '14px 16px',
                    borderRadius: '12px',
                    border: '1.5px dashed #cbd5e1',
                    background: '#f8fafc',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px', flexWrap: 'wrap', gap: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#1e293b', fontWeight: 700, fontSize: '13px' }}>
                      <MapPin size={16} style={{ color: '#0284c7' }} />
                      <span>चुनावी / प्रशासनिक क्षेत्र (State Election Commission Format)</span>
                    </div>
                    <span style={{ fontSize: '11px', background: '#e0f2fe', color: '#0369a1', padding: '2px 8px', borderRadius: '12px', fontWeight: 600 }}>
                      वैकल्पिक (Optional)
                    </span>
                  </div>
                  <div className="feature-form-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px' }}>
                    <label style={{ fontSize: '12.5px' }}>
                      District (जिला)
                      <input
                        value={tenantDistrict}
                        onChange={(e) => setTenantDistrict(e.target.value)}
                        placeholder="उदा. PALI"
                        style={{ marginTop: '4px' }}
                      />
                    </label>
                    <label style={{ fontSize: '12.5px' }}>
                      ULB / PanchayatSamiti (निकाय / पं. समिति)
                      <input
                        value={tenantUlbPanchayat}
                        onChange={(e) => setTenantUlbPanchayat(e.target.value)}
                        placeholder="उदा. SOJAT PANCHAYAT SAMITI"
                        style={{ marginTop: '4px' }}
                      />
                    </label>
                    <label style={{ fontSize: '12.5px' }}>
                      ULB Ward / GramPanchayat (वार्ड / ग्रा.पं.)
                      <input
                        value={tenantUlbWardGram}
                        onChange={(e) => setTenantUlbWardGram(e.target.value)}
                        placeholder="उदा. RAMASANI BALA"
                        style={{ marginTop: '4px' }}
                      />
                    </label>
                  </div>
                </div>

                <fieldset
                  style={{
                    marginTop: '20px',
                    padding: '16px 18px',
                    borderRadius: '12px',
                    border: '1.5px solid #e2e8f0',
                    background: '#ffffff',
                  }}
                >
                  <legend style={{ fontWeight: 700, color: '#0f172a', fontSize: '13px', padding: '0 8px' }}>
                    इस क्लाइंट के लिए सक्रिय फीचर्स
                  </legend>
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
                      gap: '10px',
                      marginTop: '6px',
                    }}
                  >
                    {moduleOptions.map(([module, label]) => {
                      const isChecked = tenantModules.includes(module);
                      return (
                        <label
                          key={module}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '9px',
                            padding: '8px 12px',
                            borderRadius: '8px',
                            border: `1.5px solid ${isChecked ? '#86efac' : '#e2e8f0'}`,
                            background: isChecked ? '#f0fdf4' : '#f8fafc',
                            color: isChecked ? '#166534' : '#334155',
                            fontWeight: isChecked ? 700 : 500,
                            fontSize: '13px',
                            cursor: 'pointer',
                            userSelect: 'none',
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => toggleModule(module)}
                            style={{ width: '16px', height: '16px', accentColor: '#16a34a', cursor: 'pointer' }}
                          />
                          <span>{label}</span>
                        </label>
                      );
                    })}
                  </div>
                </fieldset>

                <div
                  style={{
                    marginTop: '16px',
                    padding: '14px 16px',
                    background: '#f0fdf4',
                    borderRadius: '12px',
                    border: '1.5px solid #bbf7d0',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontWeight: 700, color: '#166534', cursor: 'pointer', margin: 0, fontSize: '13px' }}>
                      <input
                        type="checkbox"
                        checked={tenantWhatsappEnabled}
                        onChange={(e) => setTenantWhatsappEnabled(e.target.checked)}
                        style={{ width: '16px', height: '16px', accentColor: '#16a34a', cursor: 'pointer' }}
                      />
                      <MessageCircle size={16} />
                      WhatsApp संदेश सेवा सक्षम करें
                    </label>
                    <span style={{ fontSize: '11px', color: '#15803d', fontWeight: 600, background: '#dcfce7', padding: '2px 8px', borderRadius: '12px' }}>
                      {tenantWhatsappEnabled ? 'सक्रिय (Active)' : 'निष्क्रिय (Disabled)'}
                    </span>
                  </div>

                  <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '12px', paddingTop: '8px', borderTop: '1px dashed #bbf7d0' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: 0, fontSize: '13px', color: '#166534', fontWeight: 600 }}>
                      प्रारंभिक WhatsApp क्रेडिट्स:
                      <input
                        type="number"
                        min="0"
                        value={tenantWhatsappCredits}
                        onChange={(e) => setTenantWhatsappCredits(e.target.value)}
                        style={{ width: '85px', padding: '5px 8px', borderRadius: '6px', border: '1.5px solid #86efac', background: '#ffffff', fontWeight: 700, fontSize: '13px', color: '#166534' }}
                      />
                    </label>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      {['100', '500', '1000'].map((quick) => (
                        <button
                          key={quick}
                          type="button"
                          className="button-quiet"
                          style={{ fontSize: '11px', padding: '3px 8px', background: '#ffffff', border: '1px solid #86efac', borderRadius: '4px', cursor: 'pointer', color: '#166534', fontWeight: 700 }}
                          onClick={() => setTenantWhatsappCredits(quick)}
                        >
                          +{quick}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {error && (
                  <div className="inline-notice error-notice" style={{ marginTop: '14px', marginBottom: '4px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <AlertCircle size={15} /> {error}
                    </div>
                  </div>
                )}
                {notice && (
                  <div className="inline-notice" style={{ marginTop: '14px', marginBottom: '4px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Check size={15} /> {notice}
                    </div>
                  </div>
                )}

                <div
                  className="modal-actions"
                  style={{
                    position: 'sticky',
                    bottom: 0,
                    zIndex: 20,
                    background: '#ffffff',
                    borderTop: '1px solid #e2e8f0',
                    padding: '14px 20px',
                    marginTop: '20px',
                    display: 'flex',
                    justifyContent: 'flex-end',
                    gap: '10px',
                    boxShadow: '0 -4px 12px rgba(0, 0, 0, 0.05)'
                  }}
                >
                  <button
                    type="button"
                    className="button-secondary"
                    disabled={saving}
                    onClick={() => setIsCreateClientModalOpen(false)}
                    style={{ borderRadius: '8px', padding: '8px 16px', fontWeight: 600 }}
                  >
                    रद्द करें
                  </button>
                  <button
                    className="button-primary"
                    type="submit"
                    disabled={saving}
                    style={{
                      borderRadius: '8px',
                      padding: '8px 20px',
                      fontWeight: 700,
                      background: '#2563eb',
                      borderColor: '#1d4ed8',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}
                  >
                    {saving ? <LoaderCircle size={15} className="spin" /> : <UserPlus size={15} />}
                    {saving ? 'क्लाइंट बन रहा है...' : 'हाँ, क्लाइंट खाता बनाएँ'}
                  </button>
                </div>
              </form>
            </section>
          </div>
        )}

        {/* ================================================================= */}
        {/* NEW CLIENT SUCCESS CELEBRATION MODAL POPUP                        */}
        {/* ================================================================= */}
        {createdClientInfo && (
          <div
            className="feature-modal-backdrop"
            role="presentation"
            onMouseDown={(e) => {
              if (e.target === e.currentTarget) setCreatedClientInfo(null);
            }}
          >
            <section
              className="form-modal"
              role="dialog"
              aria-modal="true"
              style={{
                maxWidth: '520px',
                width: '95%',
                borderRadius: '16px',
                border: '1.5px solid #86efac',
                boxShadow: '0 25px 50px -12px rgba(22, 163, 74, 0.25)',
                padding: '24px',
                background: '#ffffff',
              }}
            >
              <div style={{ textAlign: 'center', marginBottom: '18px' }}>
                <div
                  style={{
                    width: '56px',
                    height: '56px',
                    borderRadius: '50%',
                    background: '#dcfce7',
                    color: '#16a34a',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 12px',
                    boxShadow: '0 0 0 8px #f0fdf4',
                  }}
                >
                  <CheckCircle2 size={32} />
                </div>
                <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#0f172a', margin: '0 0 4px' }}>
                  🎉 नया क्लाइंट सफलतापूर्वक तैयार!
                </h2>
                <p style={{ fontSize: '13px', color: '#64748b', margin: 0 }}>
                  क्लाइंट एडमिन खाता तैयार है। कृपया नीचे दिए क्रेडेंशियल्स सुरक्षित रख लें।
                </p>
              </div>

              <div
                style={{
                  background: '#f8fafc',
                  border: '1.5px solid #e2e8f0',
                  borderRadius: '12px',
                  padding: '16px',
                  marginBottom: '20px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px',
                  fontSize: '13px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: '#64748b', fontWeight: 600 }}>क्लाइंट / संगठन:</span>
                  <strong style={{ color: '#0f172a', fontSize: '14px' }}>{createdClientInfo.name}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: '#64748b', fontWeight: 600 }}>एडमिन ईमेल:</span>
                  <code style={{ background: '#e2e8f0', padding: '2px 8px', borderRadius: '4px', color: '#0f172a', fontWeight: 700 }}>
                    {createdClientInfo.email}
                  </code>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: '#64748b', fontWeight: 600 }}>शुरुआती पासवर्ड:</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <code style={{ background: '#fef3c7', padding: '2px 8px', borderRadius: '4px', color: '#92400e', fontWeight: 700 }}>
                      {showCreatedClientPassword ? createdClientInfo.password : '••••••••'}
                    </code>
                    <button
                      type="button"
                      onClick={() => setShowCreatedClientPassword((prev) => !prev)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px', color: '#64748b' }}
                      title={showCreatedClientPassword ? 'छिपाएं' : 'देखें'}
                    >
                      {showCreatedClientPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: '#64748b', fontWeight: 600 }}>सक्रिय मॉड्यूल:</span>
                  <span style={{ color: '#166534', fontWeight: 700, background: '#dcfce7', padding: '1px 8px', borderRadius: '10px', fontSize: '12px' }}>
                    {createdClientInfo.modules.length} फीचर्स चालू
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: '#64748b', fontWeight: 600 }}>WhatsApp क्रेडिट:</span>
                  <span style={{ color: '#0369a1', fontWeight: 700 }}>
                    {createdClientInfo.whatsappCredits} संदेश
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: '#64748b', fontWeight: 600 }}>अनुमत वार्ड:</span>
                  <span style={{ color: '#475569', fontWeight: 600 }}>
                    {createdClientInfo.wards.length > 0 ? createdClientInfo.wards.join(', ') : 'पूरा संगठन (सभी वार्ड)'}
                  </span>
                </div>
                {(createdClientInfo.district || createdClientInfo.ulbPanchayatSamiti || createdClientInfo.ulbWardGramPanchayat) && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', paddingTop: '6px', borderTop: '1px dashed #e2e8f0' }}>
                    <span style={{ color: '#64748b', fontWeight: 600 }}>चुनावी क्षेत्र:</span>
                    <span style={{ color: '#0369a1', fontWeight: 600, textAlign: 'right' }}>
                      {[createdClientInfo.district, createdClientInfo.ulbPanchayatSamiti, createdClientInfo.ulbWardGramPanchayat].filter(Boolean).join(' • ')}
                    </span>
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', gap: '10px', flexDirection: 'column' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <button
                    type="button"
                    className="button-primary"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      padding: '11px',
                      fontSize: '13.5px',
                      fontWeight: 700,
                      borderRadius: '10px',
                      background: copiedClientCreds ? '#15803d' : '#0f766e',
                      borderColor: '#0f766e',
                    }}
                    onClick={() => copyCreatedClientCreds(createdClientInfo)}
                  >
                    {copiedClientCreds ? <Check size={16} /> : <Copy size={16} />}
                    {copiedClientCreds ? 'कॉपी हो गया!' : 'विवरण कॉपी करें'}
                  </button>
                  <button
                    type="button"
                    className="button-primary"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      padding: '11px',
                      fontSize: '13.5px',
                      fontWeight: 700,
                      borderRadius: '10px',
                      background: '#16a34a',
                      borderColor: '#16a34a',
                    }}
                    onClick={() => shareCreatedClientWhatsApp(createdClientInfo)}
                  >
                    <MessageCircle size={16} />
                    WhatsApp पर भेजें
                  </button>
                </div>
                <button
                  type="button"
                  className="button-secondary"
                  style={{ width: '100%', padding: '10px', borderRadius: '10px', fontWeight: 600 }}
                  onClick={() => setCreatedClientInfo(null)}
                >
                  बंद करें (Close)
                </button>
              </div>
            </section>
          </div>
        )}

        {/* ================================================================= */}
        {/* GLOBAL FLOATING TOAST POP-UP NOTIFICATION                        */}
        {/* ================================================================= */}
        {toast && (
          <div
            style={{
              position: 'fixed',
              top: '24px',
              right: '24px',
              zIndex: 99999,
              maxWidth: '420px',
              width: 'calc(100vw - 48px)',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '12px',
              padding: '16px 18px',
              borderRadius: '14px',
              background: toast.type === 'success'
                ? 'linear-gradient(135deg, #f0fdf4 0%, #ffffff 100%)'
                : toast.type === 'error'
                ? 'linear-gradient(135deg, #fef2f2 0%, #ffffff 100%)'
                : 'linear-gradient(135deg, #f0f9ff 0%, #ffffff 100%)',
              border: `1.5px solid ${toast.type === 'success' ? '#86efac' : toast.type === 'error' ? '#fca5a5' : '#7dd3fc'}`,
              boxShadow: '0 20px 35px -10px rgba(0, 0, 0, 0.15), 0 0 0 1px rgba(0,0,0,0.05)',
              backdropFilter: 'blur(8px)',
            }}
            role="status"
            aria-live="polite"
          >
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                background: toast.type === 'success' ? '#dcfce7' : toast.type === 'error' ? '#fee2e2' : '#e0f2fe',
                color: toast.type === 'success' ? '#16a34a' : toast.type === 'error' ? '#dc2626' : '#0284c7',
              }}
            >
              {toast.type === 'success' ? <CheckCircle2 size={20} /> : toast.type === 'error' ? <AlertCircle size={20} /> : <Info size={20} />}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              {toast.title && (
                <div style={{ fontWeight: 800, fontSize: '14px', color: toast.type === 'success' ? '#14532d' : toast.type === 'error' ? '#7f1d1d' : '#0c4a6e', marginBottom: '2px' }}>
                  {toast.title}
                </div>
              )}
              <div style={{ fontSize: '13px', color: '#334155', lineHeight: 1.5, wordBreak: 'break-word' }}>
                {toast.message}
              </div>
            </div>
            <button
              type="button"
              onClick={() => setToast(null)}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: '4px',
                color: '#94a3b8',
                borderRadius: '6px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
              title="बंद करें"
            >
              <X size={16} />
            </button>
          </div>
        )}
      </div>

      {/* Meta-style Interactive Image Cropper for Admin Studio & Tenant Config */}
      <ImageCropModal
        isOpen={adminCropModalOpen}
        imageSrc={adminCropSrc}
        title={
          adminCropField === 'candidateImage'
            ? 'प्रत्याशी फ़ोटो क्रॉप करें (Crop Candidate Photo)'
            : adminCropField === 'partySymbolImage'
            ? 'चुनाव चिन्ह फ़ोटो क्रॉप करें (Crop Symbol Photo)'
            : 'हेडर ग्राफ़िक क्रॉप करें (Crop Header Graphic)'
        }
        subtitle="फोटो को सही स्थिति में लाने के लिए ड्रैग करें, ज़ूम स्लाइडर से आकार सेट करें और एरिया चुनें।"
        initialAspectRatio={adminCropField === 'headerGraphicImage' ? 0 : 1}
        onCropComplete={handleAdminCropComplete}
        onClose={() => setAdminCropModalOpen(false)}
      />
    </>
  );
}
