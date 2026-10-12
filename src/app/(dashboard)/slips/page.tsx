'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
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
} from 'lucide-react';
import { apiFetch, getApiError, decodeJwtPayload } from '@/lib/api';
import { VoterSlipTemplate, SlipConfig, defaultSlipConfig } from '@/components/VoterSlipTemplate';
import { ImageCropModal } from '@/components/ImageCropModal';
import { downloadSlip, downloadBulkSlipsAsZip, generateSlipImage } from '@/lib/downloadSlip';
import { shareVoterSlipToWhatsApp } from '@/lib/whatsappShare';
import { SortButton, SortState } from '@/components/SortButton';
import { WhatsAppLogo } from '@/components/WhatsAppLogo';
import { WhatsAppWebHelperModal } from '@/components/WhatsAppWebHelperModal';

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

  // Bulk Print Mode
  const [bulkMode, setBulkMode] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isDownloadingBulkZip, setIsDownloadingBulkZip] = useState(false);
  const [bulkZipProgress, setBulkZipProgress] = useState({ current: 0, total: 0 });
  const [sort, setSort] = useState<SortState>({ field: 'serialNo', direction: 'asc' });

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
          setSlipConfig({ ...defaultSlipConfig, ...data.slipConfig });
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

  // Load Voters
  const loadVoters = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({
        page: '1',
        pageSize: '100',
      });
      if (searchQuery.trim()) params.set('search', searchQuery.trim());
      if (wardFilter) params.set('ward', wardFilter);
      if (partFilter) params.set('part', partFilter);

      const res = await apiFetch(`/voters?${params.toString()}`, { cache: 'no-store' });
      if (!res.ok) throw new Error(await getApiError(res, 'मतदाता लोड नहीं हो सके'));
      const data = await res.json();
      const list: Voter[] = Array.isArray(data) ? data : data.data || data.voters || [];
      setVoters(list);

      // Extract unique wards & parts
      const wards = Array.from(new Set(list.map((v) => v.wardNo).filter(Boolean))) as string[];
      const parts = Array.from(new Set(list.map((v) => v.partNo).filter(Boolean))) as string[];
      if (wards.length) setAvailableWards((prev) => Array.from(new Set([...prev, ...wards])).sort());
      if (parts.length) setAvailableParts((prev) => Array.from(new Set([...prev, ...parts])).sort());

      // Select first voter by default if not set
      if (list.length > 0) {
        setSelectedVoter((prev) => {
          if (!prev) return list[0];
          const exists = list.find((v) => v._id === prev._id);
          return exists || list[0];
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'डेटा लोड करने में त्रुटि हुई');
    } finally {
      setLoading(false);
    }
  }, [searchQuery, wardFilter, partFilter]);

  // Initial load
  useEffect(() => {
    void loadSlipConfig();
    void loadWhatsappQuota();
    void loadVoters();
    void loadClientsList();
  }, [loadSlipConfig, loadWhatsappQuota, loadVoters, loadClientsList]);

  // Listen to Client Switch event from Dashboard Shell
  useEffect(() => {
    const handleClientChange = () => {
      void loadSlipConfig();
      void loadWhatsappQuota();
      void loadVoters();
    };
    const handleSlipConfigChange = (e: any) => {
      if (e.detail) {
        setSlipConfig({ ...defaultSlipConfig, ...e.detail });
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
  }, [loadSlipConfig, loadWhatsappQuota, loadVoters]);

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
      alert('फाइल 15MB से छोटी होनी चाहिए।');
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
      if (typeof window !== 'undefined') {
        localStorage.setItem('cachedSlipConfig', JSON.stringify(editingConfig));
        window.dispatchEvent(new CustomEvent('slip-config-changed', { detail: editingConfig }));
      }
      setBrandingSaveMsg('पर्ची ब्रांडिंग सफलतापूर्वक अपडेट हो गई!');
      setTimeout(() => {
        setIsCustomizing(false);
        setBrandingSaveMsg('');
      }, 1100);
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'ब्रांडिंग सहेजने में त्रुटि हुई';
      alert(errorMsg);
    } finally {
      setSavingBranding(false);
    }
  };

  // Pre-generate slip image as soon as voter is viewed for instant WhatsApp share
  useEffect(() => {
    let active = true;
    if (selectedVoter) {
      setCachedSlipImageDataUrl(null);
      generateSlipImage(selectedVoter, slipConfig, printContainerRef.current)
        .then((dataUrl) => {
          if (active) setCachedSlipImageDataUrl(dataUrl);
        })
        .catch((err) => {
          console.warn('Pre-rendering slip image error:', err);
        });
    } else {
      setCachedSlipImageDataUrl(null);
    }
    return () => {
      active = false;
    };
  }, [selectedVoter, slipConfig]);

  // Official WhatsApp Send (Meta Cloud API with Photo)
  const handleSendWhatsAppViaApi = async () => {
    if (!selectedVoter) return;
    setWpSending(true);
    setWpMessage('पर्ची की फोटो और संदेश Meta API द्वारा भेजा जा रहा है...');
    try {
      let slipImageDataUrl = cachedSlipImageDataUrl || undefined;
      if (!slipImageDataUrl) {
        try {
          slipImageDataUrl = await generateSlipImage(selectedVoter, slipConfig, printContainerRef.current);
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
      setWpMessage(data.message || 'Meta API द्वारा पर्ची फोटो व विवरण सफलतापूर्वक भेज दिया गया है!');
      setTimeout(() => {
        setIsWpModalOpen(false);
      }, 2000);
    } catch (err) {
      setWpMessage(err instanceof Error ? err.message : 'संदेश भेजने में त्रुटि हुई');
    } finally {
      setWpSending(false);
    }
  };

  // Direct WhatsApp (Mobile Share with Photo + Desktop Clipboard Paste + Android Native Bridge)
  const handleSendDirectWhatsApp = async () => {
    if (!selectedVoter) return;
    setWpSending(true);
    try {
      const result = await shareVoterSlipToWhatsApp({
        voter: selectedVoter,
        slipConfig,
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
    if (!selectedVoter) return;
    setIsDownloading(true);
    try {
      await downloadSlip(selectedVoter, slipConfig, printContainerRef.current);
    } catch {
      alert('पर्ची इमेज डाउनलोड नहीं हो सकी');
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className={`work-page slips-studio-page ${bulkMode ? 'slips-bulk-print-mode' : 'slips-single-print-mode'}`}>
      {/* Print-only CSS styling */}
      <style jsx global>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 6mm 5mm;
          }

          /* Hide all application chrome and interactive elements */
          .app-sidebar,
          .topbar,
          .app-footer,
          .page-intro,
          .feature-actions,
          .records-toolbar,
          .bulk-header-bar,
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

          .slips-bulk-print-mode .slips-bulk-print-grid {
            display: grid !important;
            grid-template-columns: repeat(2, 1fr) !important;
            gap: 6mm 5mm !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            position: static !important;
          }

          .slips-bulk-print-mode .slips-bulk-print-item {
            display: block !important;
            position: static !important;
            break-inside: avoid !important;
            page-break-inside: avoid !important;
            margin: 0 !important;
            padding: 0 !important;
            background: #ffffff !important;
          }

          .slips-bulk-print-mode .voter-slip-printable-card {
            position: relative !important;
            left: auto !important;
            top: auto !important;
            width: 100% !important;
            max-width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            box-shadow: none !important;
            break-inside: avoid !important;
            page-break-inside: avoid !important;
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

          .slips-single-print-mode .voter-slip-printable-card {
            position: relative !important;
            left: auto !important;
            top: auto !important;
            margin: 20px auto 0 !important;
            max-width: 580px !important;
            width: 100% !important;
            box-shadow: none !important;
          }
        }
      `}</style>

      {/* Page Header */}
      <div className="page-intro" style={{ marginBottom: '16px' }}>
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

        <div className="feature-actions" style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
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

          <button
            className={`button-secondary ${bulkMode ? 'button-active' : ''}`}
            type="button"
            onClick={() => setBulkMode(!bulkMode)}
            style={{ borderColor: bulkMode ? '#16a34a' : undefined, color: bulkMode ? '#16a34a' : undefined }}
          >
            <Layers size={15} />
            {bulkMode ? 'एकल पर्ची देखें' : 'बल्क पर्ची शीट'}
          </button>

          <button
            className="button-primary"
            type="button"
            disabled={isDownloadingBulkZip || sortedVoters.length === 0}
            onClick={async () => {
              setIsDownloadingBulkZip(true);
              setBulkZipProgress({ current: 0, total: sortedVoters.length });
              await downloadBulkSlipsAsZip(sortedVoters, slipConfig, (current, total) => {
                setBulkZipProgress({ current, total });
              });
              setIsDownloadingBulkZip(false);
            }}
            style={{
              background: '#1d4ed8',
              borderColor: '#2563eb',
              color: '#ffffff',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
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
                <span>बल्क ZIP डाउनलोड ({sortedVoters.length})</span>
              </>
            )}
          </button>
        </div>
      </div>

      {error && <div className="inline-notice error-notice" role="alert">{error}</div>}

      {/* Slip Branding Info Bar */}
      <div
        style={{
          background: '#ffffff',
          borderRadius: '12px',
          border: '1px solid #e2e8f0',
          padding: '12px 18px',
          marginBottom: '20px',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700, color: '#1e3a8a', fontSize: '12.5px', background: '#eff6ff', padding: '4px 10px', borderRadius: '8px', border: '1px solid #bfdbfe' }}>
            <Sparkles size={14} color="#ea580c" />
            <span>संगठन: {orgName}</span>
          </div>
          <div style={{ fontSize: '12.5px', color: '#475569', background: '#f8fafc', padding: '4px 10px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
            पार्टी: <strong style={{ color: '#0f172a' }}>{slipConfig.partyName || 'प्रत्याशी'}</strong>
          </div>
          <div style={{ fontSize: '12.5px', color: '#475569', background: '#f8fafc', padding: '4px 10px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
            प्रत्याशी: <strong style={{ color: '#0f172a' }}>{slipConfig.candidateName || 'प्रत्याशी'}</strong>
          </div>
          <div style={{ fontSize: '12.5px', color: '#475569', background: '#fff7ed', padding: '4px 10px', borderRadius: '8px', border: '1px solid #fed7aa' }}>
            चुनाव चिन्ह: <strong style={{ color: '#ea580c' }}>{slipConfig.partySymbolName || 'कमल का फूल'}</strong>
          </div>
          <div style={{ fontSize: '12.5px', color: '#475569', background: '#f0fdf4', padding: '4px 10px', borderRadius: '8px', border: '1px solid #bbf7d0' }}>
            EVM क्रम: <strong style={{ color: '#16a34a' }}>#{slipConfig.evmNumber || '1'}</strong>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            onClick={openCustomizing}
            style={{
              fontSize: '12px',
              fontWeight: 600,
              color: '#047857',
              background: '#ecfdf5',
              border: '1px solid #a7f3d0',
              padding: '4px 10px',
              borderRadius: '6px',
              cursor: 'pointer',
            }}
          >
            बदलाव करें
          </button>

          {/* WhatsApp Quota Pill */}
          {whatsappQuota && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '4px 10px',
                borderRadius: '20px',
                background: !whatsappQuota.whatsappEnabled ? '#fee2e2' : whatsappQuota.whatsappCredits <= 0 ? '#fef3c7' : '#f0fdf4',
                border: !whatsappQuota.whatsappEnabled ? '1px solid #fecaca' : whatsappQuota.whatsappCredits <= 0 ? '1px solid #fde68a' : '1px solid #bbf7d0',
                fontSize: '12px',
                fontWeight: 600,
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
        className="records-toolbar"
        style={{
          background: '#ffffff',
          borderRadius: '12px',
          border: '1px solid #e2e8f0',
          padding: '12px 16px',
          marginBottom: '20px',
          display: 'flex',
          flexWrap: 'wrap',
          gap: '12px',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', flex: 1, minWidth: '280px' }}>
          <div className="search-field" style={{ flex: '1 1 200px' }}>
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
            style={{ padding: '6px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px' }}
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
            style={{ padding: '6px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px' }}
          >
            <option value="">सभी भाग (Part)</option>
            {availableParts.map((p) => (
              <option key={p} value={p}>
                भाग संख्या {p}
              </option>
            ))}
          </select>
        </div>

        <div style={{ fontSize: '13px', color: '#64748b', fontWeight: 600 }}>
          कुल मतदाता: <strong style={{ color: '#0f172a' }}>{voters.length}</strong>
        </div>
      </div>

      {/* Main Studio Content */}
      {bulkMode ? (
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
            className="bulk-header-bar"
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '20px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
              <h2 style={{ fontSize: '18px', margin: 0 }}>
                बल्क पर्ची प्रिंट शीट ({voters.length} पर्चियां)
              </h2>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <SortButton label="क्रम संख्या" field="serialNo" type="numeric" currentSort={sort} onSort={handleSort} />
                <SortButton label="नाम" field="name" type="alpha" currentSort={sort} onSort={handleSort} />
              </div>
            </div>
            <button className="button-primary" type="button" onClick={handlePrint}>
              <Printer size={15} /> पूरी शीट प्रिंट करें
            </button>
            <button
              className="button-primary"
              type="button"
              disabled={isDownloadingBulkZip || sortedVoters.length === 0}
              onClick={async () => {
                setIsDownloadingBulkZip(true);
                setBulkZipProgress({ current: 0, total: sortedVoters.length });
                await downloadBulkSlipsAsZip(sortedVoters, slipConfig, (current, total) => {
                  setBulkZipProgress({ current, total });
                });
                setIsDownloadingBulkZip(false);
              }}
              style={{ background: '#1d4ed8', borderColor: '#2563eb' }}
            >
              {isDownloadingBulkZip ? (
                <><LoaderCircle size={15} className="spin" /> ZIP बन रहा... ({bulkZipProgress.current}/{bulkZipProgress.total})</>
              ) : (
                <><Download size={15} /> बल्क ZIP डाउनलोड (सभी JPG)</>  
              )}
            </button>
          </div>

          <div
            className="slips-bulk-print-grid"
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 460px), 1fr))',
              gap: '24px',
            }}
          >
            {sortedVoters.map((voter) => (
              <div key={voter._id} className="slips-bulk-print-item" style={{ background: '#fff', borderRadius: '16px' }}>
                <VoterSlipTemplate voter={voter} config={slipConfig} isInline={true} />
              </div>
            ))}
          </div>
        </section>
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
                  मतदाता सूची ({voters.length})
                </span>
                <span style={{ fontSize: '11px', color: '#94a3b8' }}>क्लिक कर पर्ची देखें</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <SortButton label="क्रम संख्या" field="serialNo" type="numeric" currentSort={sort} onSort={handleSort} />
                <SortButton label="नाम" field="name" type="alpha" currentSort={sort} onSort={handleSort} />
              </div>
            </div>

            <div style={{ overflowY: 'auto', flex: 1, padding: '8px' }}>
              {loading && voters.length === 0 ? (
                <div style={{ padding: '30px', textAlign: 'center', color: '#64748b' }}>
                  <LoaderCircle size={20} className="spin" style={{ margin: '0 auto 8px' }} />
                  मतदाता लोड हो रहे हैं...
                </div>
              ) : voters.length === 0 ? (
                <div style={{ padding: '30px', textAlign: 'center', color: '#64748b' }}>
                  कोई मतदाता नहीं मिला
                </div>
              ) : (
                sortedVoters.map((voter) => {
                  const isSelected = selectedVoter?._id === voter._id;
                  return (
                    <div
                      key={voter._id}
                      onClick={() => setSelectedVoter(voter)}
                      style={{
                        padding: '10px 12px',
                        borderRadius: '8px',
                        marginBottom: '6px',
                        cursor: 'pointer',
                        background: isSelected ? '#eff6ff' : '#ffffff',
                        border: isSelected ? '1.5px solid #3b82f6' : '1px solid #f1f5f9',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <strong style={{ color: isSelected ? '#1e40af' : '#0f172a', fontSize: '14px' }}>
                          {voter.nameHi || voter.nameEn || 'मतदाता'}
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
                        <span style={{ color: '#2563eb', fontWeight: 600 }}>{voter.epic || 'EPIC: N/A'}</span>
                        <span>भाग: {voter.partNo || '-'} · मकान: {voter.houseNo || '-'}</span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
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
                    setWpPhone(selectedVoter.phone || '');
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

            {/* The Actual Voter Slip Card */}
            <div style={{ width: '100%', display: 'flex', justifyContent: 'center' }}>
              <VoterSlipTemplate
                voter={selectedVoter || undefined}
                config={slipConfig}
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
                  {clientsList.map((c) => (
                    <option key={c.id} value={c.id}>
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
                      <label style={{ fontSize: '12px', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '6px' }}>
                        बायां बॉक्स: चुनाव चिन्ह (Symbol Photo)
                      </label>
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
                            <span style={{ fontSize: '10px', color: '#94a3b8' }}>PNG/JPG फोटो अपलोड करें</span>
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
                      <label style={{ fontSize: '12px', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '6px' }}>
                        दायां बॉक्स: प्रत्याशी फ़ोटो (Candidate Portrait)
                      </label>
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
                            <span style={{ fontSize: '10px', color: '#94a3b8' }}>पासपोर्ट साइज JPG/PNG</span>
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
                </div>

                {/* 2. Candidate & Party Details */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: '#334155' }}>
                    प्रत्याशी का नाम (हिंदी):
                    <input
                      type="text"
                      placeholder="उदा. प्रसन्न चंद मेहता"
                      value={editingConfig.candidateName || ''}
                      onChange={(e) => setEditingConfig({ ...editingConfig, candidateName: e.target.value })}
                      style={{ marginTop: '4px' }}
                    />
                  </label>

                  <label style={{ fontSize: '12px', fontWeight: 600, color: '#334155' }}>
                    Candidate Name (English):
                    <input
                      type="text"
                      placeholder="e.g. Prasann Chand Mehta"
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
                      placeholder="उदा. भारतीय जनता पार्टी (भाजपा) प्रत्याशी"
                      value={editingConfig.partyName || ''}
                      onChange={(e) => setEditingConfig({ ...editingConfig, partyName: e.target.value })}
                      style={{ marginTop: '4px' }}
                    />
                  </label>

                  <label style={{ fontSize: '12px', fontWeight: 600, color: '#334155' }}>
                    चुनाव चिन्ह (Symbol):
                    <input
                      type="text"
                      placeholder="उदा. कमल का फूल / हाथ"
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
                      placeholder="(1 नंबर पर कमल का फूल का बटन दबाएं)"
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

                <label style={{ fontSize: '12px', fontWeight: 600, color: '#334155' }}>
                  EVM बैनर अपील (EVM Banner Appeal Text):
                  <input
                    type="text"
                    placeholder="वार्ड नंबर 82 से भाजपा प्रत्याशी प्रसन्न चंद मेहता को अपना अमूल्य वोट देकर भारी मतों से विजय बनाएं।"
                    value={editingConfig.appealText || ''}
                    onChange={(e) => setEditingConfig({ ...editingConfig, appealText: e.target.value })}
                    style={{ marginTop: '4px' }}
                  />
                </label>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
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

                  <label style={{ fontSize: '12px', fontWeight: 600, color: '#334155' }}>
                    डिफ़ॉल्ट मतदान केंद्र (Polling Station):
                    <input
                      type="text"
                      placeholder="569 - सामुदायिक भवन, जाटा बास, महामंदिर, जोधपुर"
                      value={editingConfig.pollingStationFallback || ''}
                      onChange={(e) => setEditingConfig({ ...editingConfig, pollingStationFallback: e.target.value })}
                      style={{ marginTop: '4px' }}
                    />
                  </label>
                </div>

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
                    voter={selectedVoter || voters[0] || undefined}
                    config={editingConfig}
                    isInline={true}
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
      {isWpModalOpen && selectedVoter && (
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
                <h2 style={{ fontSize: '18px', margin: '4px 0' }}>WhatsApp पर्ची भेजें</h2>
                <p style={{ margin: 0, fontSize: '13px', color: '#64748b' }}>
                  {selectedVoter.nameHi || selectedVoter.nameEn} ({selectedVoter.epic})
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
                  style={{ marginTop: '6px', height: '38px' }}
                />
              </label>

              {wpMessage && (
                <p className="form-error" style={{ fontSize: '12px', color: wpMessage.includes('कटा') ? '#166534' : '#dc2626' }}>
                  {wpMessage}
                </p>
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
        initialAspectRatio={cropField === 'headerGraphicImage' ? 0 : 1}
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
