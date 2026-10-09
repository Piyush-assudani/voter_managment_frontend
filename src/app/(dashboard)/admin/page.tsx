'use client';

import { FormEvent, Fragment, useCallback, useEffect, useMemo, useState } from 'react';
import {
  Activity, AlertCircle, Check, ChevronDown, ChevronRight, Download, Eye, EyeOff, FileSpreadsheet,
  FileText, KeyRound, Layers, LoaderCircle, MapPin, MessageCircle, Phone, Plus, RefreshCw,
  Settings2, ShieldCheck, Tag, Trash2, Upload, User, UserPlus, UsersRound, X,
} from 'lucide-react';
import DashboardShell from '@/app/(dashboard)/DashboardShell';
import AccountsManager from '@/components/AccountsManager';
import { apiFetch, getApiError } from '@/lib/api';
import { downloadBlob } from '@/lib/fileDownload';

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
  wards: string[];
  isActive: boolean;
  activeWorkers: number;
  voterCount: number;
  whatsappEnabled?: boolean;
  whatsappCredits?: number;
  whatsappUsed?: number;
}

interface AdminVoter {
  _id: string;
  epic: string;
  nameEn: string;
  nameHi: string;
  wardNo: string;
  partNo: string;
  serialNo: number;
  phone: string;
  organizationId: string;
}

interface SystemHealth {
  database: string;
  metaReady: boolean;
  platform: string;
  checkedAt: string;
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
  extractedCount: number;
  uploadedAt: string;
  excelFilename?: string;
  hasExcel?: boolean;
  errorMessage?: string;
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

type AdminView = 'tenants' | 'leads' | 'records' | 'users' | 'import' | 'export' | 'system';

export default function AdminPanel() {
  const [activeView, setActiveView] = useState<AdminView>('tenants');
  const [organizations, setOrganizations] = useState<Tenant[]>([]);
  const [voters, setVoters] = useState<AdminVoter[]>([]);
  const [health, setHealth] = useState<SystemHealth | null>(null);
  const [expandedOrgId, setExpandedOrgId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [organizationId, setOrganizationId] = useState('');
  const [wardFilter, setWardFilter] = useState('');
  const [tenantName, setTenantName] = useState('');
  const [tenantEmail, setTenantEmail] = useState('');
  const [tenantPassword, setTenantPassword] = useState('');
  const [showTenantPassword, setShowTenantPassword] = useState(false);
  const [tenantModules, setTenantModules] = useState<string[]>(moduleOptions.map(([key]) => key));
  const [tenantWards, setTenantWards] = useState('');
  const [tenantWhatsappEnabled, setTenantWhatsappEnabled] = useState(true);
  const [tenantWhatsappCredits, setTenantWhatsappCredits] = useState('500');
  const [editingTenant, setEditingTenant] = useState<Tenant | null>(null);
  const [importing, setImporting] = useState(false);
  const [uploadingPdf, setUploadingPdf] = useState(false);
  const [pdfJobs, setPdfJobs] = useState<UploadJob[]>([]);
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

  useEffect(() => {
    const token = typeof window !== 'undefined' ? window.localStorage.getItem('token') : null;
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))) as {
          user?: { role?: string };
        };
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
    setOrganizations(await response.json() as Tenant[]);
  }, []);

  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);

  const loadVoters = useCallback(async (page = 1) => {
    setLoading(true);
    setError('');
    try {
      const queryParams = new URLSearchParams();
      if (organizationId) queryParams.set('organizationId', organizationId);
      queryParams.set('page', page.toString());
      queryParams.set('limit', '500'); // 500 per page
      
      const response = await apiFetch(`/admin/master-data?${queryParams.toString()}`, { cache: 'no-store' });
      if (!response.ok) throw new Error(await getApiError(response, 'मास्टर रिकॉर्ड लोड नहीं हुए।'));
      const result = await response.json() as { voters: AdminVoter[], pagination: { total: number, page: number, pages: number } };
      
      if (!result.voters) throw new Error('सर्वर से रिकॉर्ड का सही उत्तर नहीं मिला।');
      
      setVoters(result.voters);
      setCurrentPage(result.pagination.page);
      setTotalPages(result.pagination.pages);
      setTotalRecords(result.pagination.total);
    } catch (loadError) {
      setVoters([]);
      setError(loadError instanceof Error ? loadError.message : 'मास्टर रिकॉर्ड लोड नहीं हुए।');
    } finally {
      setLoading(false);
    }
  }, [organizationId]);

  const loadHealth = useCallback(async () => {
    const response = await apiFetch('/admin/system-health', { cache: 'no-store' });
    if (!response.ok) throw new Error(await getApiError(response, 'सिस्टम स्थिति लोड नहीं हुई।'));
    setHealth(await response.json() as SystemHealth);
  }, []);

  const loadPdfJobs = useCallback(async () => {
    if (activeView !== 'import') return;
    try {
      const url = organizationId 
        ? `/admin/pdf/jobs?organizationId=${encodeURIComponent(organizationId)}`
        : '/admin/pdf/jobs';
      const response = await apiFetch(url, { cache: 'no-store' });
      if (response.ok) {
        setPdfJobs(await response.json() as UploadJob[]);
      }
    } catch {
      // ignore silently
    }
  }, [organizationId, activeView]);

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

  const loadPageData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      if (activeView === 'records') await Promise.all([loadOrganizations(), loadVoters()]);
      else if (activeView === 'leads') await loadLeads();
      else if (activeView === 'tenants' || activeView === 'users' || activeView === 'import') {
        await loadOrganizations();
        await loadPdfJobs();
      }
      else await loadHealth();
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'एडमिन जानकारी लोड नहीं हुई।');
    } finally {
      setLoading(false);
    }
  }, [activeView, loadHealth, loadOrganizations, loadVoters, loadPdfJobs, loadLeads]);

  useEffect(() => { void Promise.resolve().then(() => loadPageData()); }, [loadPageData]);
  useEffect(() => { void loadLeads(); }, [loadLeads]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (activeView === 'import') {
      interval = setInterval(() => void loadPdfJobs(), 3000);
    }
    return () => clearInterval(interval);
  }, [activeView, loadPdfJobs]);

  const selectedTenant = useMemo(
    () => organizations.find((t) => t.id === organizationId),
    [organizations, organizationId],
  );

  const availableWards = useMemo(() => {
    const orgWards = selectedTenant?.wards || [];
    const voterWards = voters
      .filter((voter) => !organizationId || voter.organizationId === organizationId)
      .map((voter) => voter.wardNo)
      .filter(Boolean);
    const set = new Set([...orgWards, ...voterWards]);
    return Array.from(set).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  }, [selectedTenant, voters, organizationId]);

  const wards = useMemo(
    () => [...new Set(voters.map((voter) => voter.wardNo).filter(Boolean))].sort((a, b) => a.localeCompare(b, undefined, { numeric: true })),
    [voters],
  );
  const visibleVoters = wardFilter ? voters.filter((voter) => voter.wardNo === wardFilter) : voters;

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

  const createTenant = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    setNotice('');
    try {
      const response = await apiFetch('/admin/organizations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: tenantName,
          email: tenantEmail,
          password: tenantPassword,
          modules: tenantModules,
          wards: tenantWards.split(',').map((ward) => ward.trim()).filter(Boolean),
          whatsappEnabled: tenantWhatsappEnabled,
          whatsappCredits: Number.parseInt(tenantWhatsappCredits, 10) || 0,
        }),
      });
      if (!response.ok) throw new Error(await getApiError(response, 'क्लाइंट खाता नहीं बन सका।'));
      setNotice('क्लाइंट और उसका एडमिन अकाउंट बना दिया गया।');
      setTenantName('');
      setTenantEmail('');
      setTenantPassword('');
      setTenantWards('');
      setTenantWhatsappCredits('500');
      await loadOrganizations();
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : 'क्लाइंट खाता नहीं बन सका।');
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
        }),
      });
      if (!response.ok) throw new Error(await getApiError(response, 'क्लाइंट सेटिंग सेव नहीं हुई।'));
      setNotice('क्लाइंट के फीचर और वार्ड access अपडेट हुए।');
      setEditingTenant(null);
      await loadOrganizations();
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : 'क्लाइंट सेटिंग सेव नहीं हुई।');
    } finally {
      setSaving(false);
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

  const uploadPdf = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const file = form.querySelector<HTMLInputElement>('input[type="file"]')?.files?.[0];
    if (!file || !organizationId) {
      setError('कृपया एक PDF फाइल चुनें और क्लाइंट चुनें।');
      return;
    }
    const targetWard = (pdfIsNewWard ? pdfCustomWard : pdfWard).trim();
    const MAX_SIZE = 100 * 1024 * 1024; // 100MB
    if (file.size > MAX_SIZE) {
      setError(`चयनित PDF फाइल (${(file.size / (1024 * 1024)).toFixed(1)}MB) 100MB की सीमा से बड़ी है। कृपया फाइल कंप्रेस करें या 100MB से छोटी PDF चुनें।`);
      return;
    }
    setUploadingPdf(true);
    setError('');
    setNotice(`PDF अपलोड हो रही है (${(file.size / (1024 * 1024)).toFixed(1)}MB)... कृपया प्रतीक्षा करें।`);
    try {
      const body = new FormData();
      body.set('organizationId', organizationId);
      body.set('pdf', file);
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
        setNotice('PDF फाइल अपलोड हो गई है! डेटा बैकग्राउंड में प्रोसेस हो रहा है।' + (targetWard ? ` (वार्ड: ${targetWard})` : ''));
      } else {
        setNotice(`${result.extractedCount ?? 0} Voter IDs सफलता पूर्वक PDF से निकाले गए।`);
      }
      form.reset();
      setPdfDescription('');
      setPdfBooth('');
      if (pdfIsNewWard) {
        setPdfIsNewWard(false);
        setPdfCustomWard('');
      }
      await loadOrganizations();
      await loadPdfJobs();
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
            { key: 'tenants', label: 'क्लाइंट व फीचर', Icon: UsersRound },
            { key: 'leads', label: `लीड्स व पूछताछ ${leads.length > 0 ? `(${leads.length})` : ''}`, Icon: MessageCircle },
            { key: 'records', label: 'वोटर डेटा', Icon: FileSpreadsheet },
            { key: 'users', label: 'सभी अकाउंट', Icon: UserPlus },
            { key: 'import', label: 'डेटा इम्पोर्ट', Icon: Upload },
            { key: 'export', label: 'डेटा एक्सपोर्ट', Icon: Download },
            { key: 'system', label: 'सिस्टम स्थिति', Icon: Activity },
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
              <form className="modal-form" onSubmit={createTenant}>
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
                <fieldset className="feature-module-fieldset" style={{ marginTop: '24px' }}>
                  <legend>इस क्लाइंट के लिए फीचर</legend>
                  <div className="feature-module-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '15px' }}>
                    {moduleOptions.map(([module, label]) => (
                      <label key={module} style={{ whiteSpace: 'nowrap' }}><input type="checkbox" checked={tenantModules.includes(module)} onChange={() => toggleModule(module)} /> {label}</label>
                    ))}
                  </div>
                </fieldset>

                <div style={{ marginTop: '16px', padding: '14px 18px', background: '#f0fdf4', borderRadius: '10px', border: '1px solid #bbf7d0', display: 'flex', flexWrap: 'wrap', gap: '20px', alignItems: 'center' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600, color: '#166534', cursor: 'pointer', margin: 0 }}>
                    <input type="checkbox" checked={tenantWhatsappEnabled} onChange={(e) => setTenantWhatsappEnabled(e.target.checked)} />
                    💬 WhatsApp मैसेजिंग सेवा सक्षम करें
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: 0, fontSize: '13px', color: '#166534' }}>
                    प्रारंभिक WhatsApp क्रेडिट्स:
                    <input type="number" min="0" value={tenantWhatsappCredits} onChange={(e) => setTenantWhatsappCredits(e.target.value)} style={{ width: '90px', padding: '4px 8px', borderRadius: '6px', border: '1px solid #86efac' }} />
                  </label>
                </div>

                <div className="admin-form-actions" style={{ marginTop: '20px' }}><button className="button-primary" type="submit" disabled={saving}>{saving ? <LoaderCircle size={15} className="spin" /> : <UserPlus size={15} />} क्लाइंट बनाएँ</button></div>
              </form>
            </section>
            <section className="records-panel">
              <div className="records-toolbar"><div><h2>क्लाइंट संगठन</h2><p>मॉड्यूल, वार्ड, WhatsApp क्रेडिट और खाते की स्थिति नियंत्रित करें।</p></div><span className="panel-count">{organizations.length}</span></div>
              {loading ? <div className="empty-state"><LoaderCircle size={20} className="spin" /><p>क्लाइंट लोड हो रहे हैं…</p></div> : organizations.length ? (
                <div className="table-scroll"><table className="voter-table desk-table"><thead><tr><th>क्लाइंट</th><th>वार्ड</th><th>सक्षम फीचर</th><th>कार्यकर्ता</th><th>मतदाता</th><th>WhatsApp कोटा</th><th>स्थिति</th><th>एक्शन</th></tr></thead>
                  <tbody>{organizations.map((tenant) => <tr key={tenant.id}>
                    <td><strong className="voter-name">{tenant.name}</strong><div className="voter-subline">{tenant.id}</div></td>
                    <td>{tenant.wards.length ? tenant.wards.join(', ') : 'सभी'}</td>
                    <td>{tenant.modules.length}</td>
                    <td>{tenant.activeWorkers} / 10</td>
                    <td>{tenant.voterCount.toLocaleString('hi-IN')}</td>
                    <td>
                      {tenant.whatsappEnabled !== false ? (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '12px', fontWeight: 600, color: '#15803d', background: '#dcfce7', padding: '2px 8px', borderRadius: '12px' }}>
                          🟢 {(tenant.whatsappCredits ?? 0).toLocaleString('hi-IN')} क्रेडिट
                        </span>
                      ) : (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '12px', fontWeight: 600, color: '#b91c1c', background: '#fee2e2', padding: '2px 8px', borderRadius: '12px' }}>
                          🔴 अक्षम
                        </span>
                      )}
                    </td>
                    <td><span className={`record-status ${tenant.isActive ? 'status-voted' : 'status-pending'}`}>{tenant.isActive ? 'सक्रिय' : 'बंद'}</span></td>
                    <td><button className="button-quiet" type="button" onClick={() => setEditingTenant({ ...tenant })}><Settings2 size={14} /> कस्टमाइज़</button></td>
                  </tr>)}</tbody>
                </table></div>
              ) : <div className="empty-state"><strong>अभी कोई क्लाइंट नहीं</strong><p>पहला संगठन बनाने पर वह इस सूची में दिखेगा।</p></div>}
            </section>
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
                <div className="table-scroll">
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
            <section className="records-panel">
              <div className="records-toolbar admin-records-toolbar">
                <div><h2>वोटर मास्टर डेटा</h2><p>वोटर सूची डेटाबेस से; full export Excel workbook में उपलब्ध है।</p></div>
                <label className="ward-select-label">क्लाइंट
                  <select aria-label="वोटर डेटा क्लाइंट" value={organizationId} onChange={(event) => { setOrganizationId(event.target.value); setWardFilter(''); }}>
                    <option value="">सभी क्लाइंट</option>{organizations.map((tenant) => <option key={tenant.id} value={tenant.id}>{tenant.name}</option>)}
                  </select>
                </label>
                <label className="ward-select-label">वार्ड
                  <select aria-label="वोटर डेटा वार्ड" value={wardFilter} onChange={(event) => setWardFilter(event.target.value)}>
                    <option value="">सभी वार्ड</option>{wards.map((ward) => <option value={ward} key={ward}>{ward}</option>)}
                  </select>
                </label>
                <button 
                  type="button" 
                  className="button-secondary" 
                  style={{ color: '#d93025', borderColor: '#d93025', marginLeft: 'auto' }}
                  onClick={() => void bulkDeleteVoters()}
                  disabled={!organizationId || loading}
                >
                  <AlertCircle size={15} /> डेटा डिलीट करें
                </button>
              </div>
              {loading ? <div className="empty-state"><LoaderCircle size={21} className="spin" /><p>मास्टर डेटा लोड हो रहा है…</p></div> : voters.length ? (
                <div className="table-scroll"><table className="voter-table desk-table"><thead><tr><th>मतदाता</th><th>EPIC</th><th>क्लाइंट</th><th>वार्ड</th><th>भाग</th><th>क्रमांक</th><th>फ़ोन</th></tr></thead><tbody>
                  {visibleVoters.map((voter) => <tr key={`${voter.organizationId}-${voter._id}`}><td><strong className="voter-name">{voter.nameHi || voter.nameEn || '—'}</strong></td><td className="voter-code">{voter.epic || '—'}</td><td>{organizations.find((tenant) => tenant.id === voter.organizationId)?.name ?? voter.organizationId}</td><td>{voter.wardNo || '—'}</td><td>{voter.partNo || '—'}</td><td>{voter.serialNo || '—'}</td><td>{voter.phone || '—'}</td></tr>)}
                </tbody></table></div>
              ) : <div className="empty-state"><strong>रिकॉर्ड उपलब्ध नहीं</strong><p>{error || 'डेटाबेस में मतदाता रिकॉर्ड आने पर वे यहाँ दिखेंगे।'}</p></div>}
              <div className="records-footnote" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>कुल {totalRecords} रिकॉर्ड्स में से पेज {currentPage} ({visibleVoters.length} दिख रहे हैं)</div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button 
                    className="button-secondary" 
                    disabled={currentPage === 1 || loading} 
                    onClick={() => void loadVoters(currentPage - 1)}
                    style={{ padding: '4px 12px', fontSize: '12px' }}
                  > पिछला </button>
                  <button 
                    className="button-secondary" 
                    disabled={currentPage === totalPages || totalPages === 0 || loading} 
                    onClick={() => void loadVoters(currentPage + 1)}
                    style={{ padding: '4px 12px', fontSize: '12px' }}
                  > अगला </button>
                </div>
              </div>
            </section>
          </>
        )}

        {activeView === 'users' && (
          <section className="records-panel">
            <div className="records-toolbar"><div><h2>सभी टीम अकाउंट</h2><p>Worker accounts, tenant और access सेटिंग देखने/बदलने के लिए अकाउंट प्रबंधन खोलें।</p></div><a className="button-secondary" href="/accounts"><UsersRound size={15} /> अकाउंट प्रबंधन</a></div>
            {loading ? <div className="empty-state"><LoaderCircle size={20} className="spin" /><p>क्लाइंट खाते लोड हो रहे हैं…</p></div> : <div className="table-scroll"><table className="voter-table desk-table"><thead><tr><th>क्लाइंट</th><th>सक्रिय कार्यकर्ता</th><th>मतदाता</th><th>अवस्था</th></tr></thead><tbody>
              {organizations.map((tenant) => (
                <Fragment key={tenant.id}>
                  <tr style={{ cursor: 'pointer', transition: 'background-color 0.2s' }} onClick={() => setExpandedOrgId(expandedOrgId === tenant.id ? null : tenant.id)}>
                    <td style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {expandedOrgId === tenant.id ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                      <strong className="voter-name">{tenant.name}</strong>
                    </td>
                    <td>{tenant.activeWorkers} / 10</td>
                    <td>{tenant.voterCount.toLocaleString('hi-IN')}</td>
                    <td><span className={`record-status ${tenant.isActive ? 'status-voted' : 'status-pending'}`}>{tenant.isActive ? 'सक्रिय' : 'बंद'}</span></td>
                  </tr>
                  {expandedOrgId === tenant.id && (
                    <tr style={{ background: '#fcfcfc' }}>
                      <td colSpan={4} style={{ padding: '0', borderBottom: '2px solid #e4eae5' }}>
                        <div style={{ padding: '16px 24px', borderLeft: '3px solid #00875a' }}>
                          <AccountsManager embeddedOrganizationId={tenant.id} />
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody></table></div>}
          </section>
        )}

        {activeView === 'import' && (
          <>
            <section className="records-panel" style={{ padding: '24px', marginBottom: '24px' }}>
              <div style={{ marginBottom: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <FileSpreadsheet size={20} style={{ color: '#00875a' }} />
                  <h2 style={{ fontSize: '18px', fontWeight: '600', color: '#1a2620', margin: 0 }}>मतदाता सूची Excel इम्पोर्ट</h2>
                </div>
                <p style={{ fontSize: '14px', color: '#7d8981', margin: 0 }}>EPIC के आधार पर उसी क्लाइंट के रिकॉर्ड सुरक्षित रूप से अपडेट या जोड़े जाएंगे। वार्ड, बूथ और विवरण टैग करें।</p>
              </div>

              <form className="modal-form" onSubmit={importWorkbook}>
                {/* Balanced 2x2 Grid for Metadata */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px', marginBottom: '16px' }}>
                  <label>क्लाइंट (संगठन) <span style={{ color: '#d93025' }}>*</span>
                    <select required value={organizationId} onChange={(event) => setOrganizationId(event.target.value)}>
                      <option value="">क्लाइंट चुनें</option>
                      {organizations.map((tenant) => <option key={tenant.id} value={tenant.id}>{tenant.name}</option>)}
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
                          <option value="__NEW__">➕ नया वार्ड बनाएं...</option>
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

                {/* Full-width file dropzone */}
                <div style={{ background: '#f8faf9', border: '1.5px dashed #c0d3c5', borderRadius: '10px', padding: '16px 20px', marginBottom: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <span style={{ fontSize: '13px', fontWeight: '600', color: '#1a2620' }}>
                      Excel फाइल (.xlsx) <span style={{ color: '#d93025' }}>*</span>
                    </span>
                    <span style={{ fontSize: '11px', color: '#00875a', background: '#e3f7ed', padding: '2px 8px', borderRadius: '4px', fontWeight: '500' }}>
                      अधिकतम 100MB
                    </span>
                  </div>
                  <input 
                    type="file" 
                    accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" 
                    required 
                    style={{ width: '100%', fontSize: '13px' }}
                  />
                  <p style={{ fontSize: '12px', color: '#7d8981', margin: '6px 0 0 0' }}>मानक टेम्पलेट फॉर्मेट में तैयार की गई Excel वर्कबुक चुनें।</p>
                </div>

                <div className="admin-form-actions" style={{ marginTop: '16px' }}>
                  <button className="button-secondary" type="button" onClick={() => void downloadExcel('/admin/import-template.xlsx', 'टेम्पलेट डाउनलोड नहीं हुआ।', 'voter-import-template.xlsx')} disabled={saving}><Download size={15} /> Template डाउनलोड</button>
                  <button className="button-primary" type="submit" disabled={importing || !organizationId}>{importing ? <LoaderCircle size={15} className="spin" /> : <Upload size={15} />} Excel इम्पोर्ट करें</button>
                </div>
              </form>
            </section>

            <section className="records-panel" style={{ padding: '24px' }}>
              <div style={{ marginBottom: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <FileText size={20} style={{ color: '#c5221f' }} />
                  <h2 style={{ fontSize: '18px', fontWeight: '600', color: '#1a2620', margin: 0 }}>PDF मतदाता सूची अपलोड</h2>
                </div>
                <p style={{ fontSize: '14px', color: '#7d8981', margin: 0 }}>मतदाता सूची की PDF अपलोड करें। Voter IDs (EPIC) और हिंदी नाम एक्सट्रेक्ट कर के डेटाबेस में सेव किये जाएंगे। सुरक्षा के लिए PDF सर्वर से 2 घंटे में आटोमेटिक डिलीट हो जाएगी।</p>
              </div>

              <form className="modal-form" onSubmit={uploadPdf}>
                {/* Balanced 2x2 Grid for Metadata */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px', marginBottom: '16px' }}>
                  <label>क्लाइंट (संगठन) <span style={{ color: '#d93025' }}>*</span>
                    <select required value={organizationId} onChange={(event) => setOrganizationId(event.target.value)}>
                      <option value="">क्लाइंट चुनें</option>
                      {organizations.map((tenant) => <option key={tenant.id} value={tenant.id}>{tenant.name}</option>)}
                    </select>
                  </label>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ fontSize: '13px', fontWeight: '500', color: '#1a2620' }}>
                      वार्ड (Ward) <span style={{ fontSize: '11px', color: '#7d8981' }}>(चुनें या नया बनाएं)</span>
                    </label>
                    {!pdfIsNewWard ? (
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <select
                          value={pdfWard}
                          onChange={(e) => {
                            if (e.target.value === '__NEW__') {
                              setPdfIsNewWard(true);
                              setPdfWard('');
                            } else {
                              setPdfWard(e.target.value);
                            }
                          }}
                          style={{ flex: 1 }}
                        >
                          <option value="">वार्ड चुनें (वैकल्पिक)</option>
                          {availableWards.map((w) => (
                            <option key={w} value={w}>वार्ड {w}</option>
                          ))}
                          <option value="__NEW__">➕ नया वार्ड बनाएं...</option>
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
                      </div>
                    ) : (
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <input
                          type="text"
                          placeholder="नया वार्ड दर्ज करें (उदा. 14 या वार्ड 14)"
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
                      placeholder="उदा. वार्ड 14 अंतिम वोटर सूची 2024"
                      value={pdfDescription}
                      onChange={(e) => setPdfDescription(e.target.value)}
                    />
                  </label>
                </div>

                {/* Full-width file dropzone */}
                <div style={{ background: '#f8faf9', border: '1.5px dashed #c0d3c5', borderRadius: '10px', padding: '16px 20px', marginBottom: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <span style={{ fontSize: '13px', fontWeight: '600', color: '#1a2620' }}>
                      PDF मतदाता सूची (.pdf) <span style={{ color: '#d93025' }}>*</span>
                    </span>
                    <span style={{ fontSize: '11px', color: '#c5221f', background: '#fce8e6', padding: '2px 8px', borderRadius: '4px', fontWeight: '500' }}>
                      अधिकतम 100MB
                    </span>
                  </div>
                  <input 
                    type="file" 
                    accept=".pdf,application/pdf" 
                    required 
                    style={{ width: '100%', fontSize: '13px' }}
                  />
                  <p style={{ fontSize: '12px', color: '#7d8981', margin: '6px 0 0 0' }}>निर्वाचन आयोग (ECI/राज्य निर्वाचन आयोग) की आधिकारिक पीडीएफ फाइल चुनें।</p>
                </div>

                {/* High Precision OCR Mode Card */}
                <div style={{ background: '#f0f9f4', border: '1px solid #b8e2cd', borderRadius: '10px', padding: '14px 18px', marginBottom: '20px' }}>
                  <label style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', cursor: 'pointer', margin: 0 }}>
                    <input type="checkbox" name="useOcr" defaultChecked style={{ marginTop: '3px', accentColor: '#00875a', width: '16px', height: '16px' }} />
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: '600', color: '#006644' }}>
                        ✓ स्मार्ट OCR इंजन (Smart Visual OCR - सभी भारतीय व ECI फॉन्ट के लिए अनुशंसित)
                      </div>
                      <div style={{ fontSize: '12px', color: '#2d5743', marginTop: '2px', lineHeight: '1.4' }}>
                        यह राजस्थान/ECI जैसी पीडीएफ में करप्टेड/अनसपोर्टेड फॉन्ट (KrutiDev, DevLys, Subset Arial) को सीधे इमेज से 100% सही हिंदी में पढ़ता है।
                      </div>
                    </div>
                  </label>
                </div>

                <div className="admin-form-actions">
                  <button className="button-primary" type="submit" disabled={uploadingPdf || !organizationId}>
                    {uploadingPdf ? <LoaderCircle size={15} className="spin" /> : <Upload size={15} />} PDF अपलोड करें
                  </button>
                </div>
              </form>

              {pdfJobs.length > 0 && (
                <div style={{ marginTop: '36px', borderTop: '1px solid #e4eae5', paddingTop: '24px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '8px' }}>
                    <div>
                      <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#1a2620', margin: 0 }}>हाल ही में अपलोड की गई सूचियां (Recent Uploads & Extraction)</h3>
                      <p style={{ fontSize: '13px', color: '#7d8981', margin: '4px 0 0 0' }}>वार्ड, बूथ, प्रभारी यूजर और एक्सट्रैक्शन स्टेटस की लाइव जानकारी</p>
                    </div>
                    <button 
                      type="button" 
                      onClick={() => void loadPdfJobs()} 
                      className="button-secondary"
                      style={{ padding: '6px 12px', fontSize: '12px' }}
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
                        {/* Header row */}
                        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
                          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                            {/* Type Badge */}
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

                          {/* Status indicator */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            {job.status === 'processing' && (
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: '600', color: '#00875a', background: '#e6f4ea', padding: '4px 10px', borderRadius: '20px' }}>
                                <LoaderCircle size={14} className="spin" />
                                {job.progress ? `${job.progress}% एक्सट्रेक्ट हो रहा है...` : 'प्रोसेसिंग चालू है...'}
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
                                    gap: '5px',
                                    fontSize: '12px',
                                    fontWeight: '600',
                                    color: '#00875a',
                                    background: '#f0fdf4',
                                    border: '1px solid #bbf7d0',
                                    padding: '4px 10px',
                                    borderRadius: '6px',
                                    textDecoration: 'none',
                                    cursor: 'pointer'
                                  }}
                                  title="कन्वर्ट की गई Excel फाइल (.xlsx) डाउनलोड करें"
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

                        {/* Progress bar if processing */}
                        {job.status === 'processing' && (
                          <div style={{ width: '100%', height: '6px', backgroundColor: '#e4eae5', borderRadius: '4px', overflow: 'hidden' }}>
                            <div style={{ width: `${job.progress || 0}%`, height: '100%', backgroundColor: '#00875a', transition: 'width 0.3s ease' }} />
                          </div>
                        )}

                        {/* Meta chips row */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', paddingTop: '8px', borderTop: '1px solid #f0f3f1', fontSize: '12px', color: '#4a5568' }}>
                          {job.wardNo ? (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: '#e8f0fe', color: '#1967d2', padding: '3px 8px', borderRadius: '5px', fontWeight: '500' }}>
                              🏛️ वार्ड: <strong>{job.wardNo}</strong>
                            </span>
                          ) : (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: '#f1f3f4', color: '#5f6368', padding: '3px 8px', borderRadius: '5px' }}>
                              🏛️ वार्ड: सामान्य / सभी
                            </span>
                          )}

                          {job.boothNo && (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: '#fef7e0', color: '#b06000', padding: '3px 8px', borderRadius: '5px', fontWeight: '500' }}>
                              🗳️ बूथ/भाग: <strong>{job.boothNo}</strong>
                            </span>
                          )}

                          {job.uploadedBy && (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: '#f3e8fd', color: '#7627bb', padding: '3px 8px', borderRadius: '5px', fontWeight: '500' }}>
                              👤 प्रभारी: <strong>{job.uploadedBy}</strong>
                            </span>
                          )}

                          <span style={{ marginLeft: 'auto', color: '#9aa0a6', fontSize: '11px' }}>
                            🕒 {new Date(job.uploadedAt).toLocaleString('hi-IN', { dateStyle: 'short', timeStyle: 'short' })}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </section>
          </>
        )}

        {activeView === 'export' && (
          <section className="records-panel" style={{ padding: '24px' }}>
            <div style={{ marginBottom: '20px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: '600', color: '#1a2620', marginBottom: '4px' }}>मतदाता सूची डेटा एक्सपोर्ट</h2>
              <p style={{ fontSize: '14px', color: '#7d8981' }}>किसी भी क्लाइंट (Organization) का मतदाता डेटा Excel फॉर्मेट में डाउनलोड करें।</p>
            </div>
            <div className="feature-form-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px', maxWidth: '400px' }}>
              <label>क्लाइंट
                <select required value={organizationId} onChange={(event) => setOrganizationId(event.target.value)}>
                  <option value="">सभी क्लाइंट (All Data)</option>
                  {organizations.map((tenant) => <option key={tenant.id} value={tenant.id}>{tenant.name}</option>)}
                </select>
              </label>
            </div>
            <div className="admin-form-actions" style={{ marginTop: '20px', justifyContent: 'flex-start', display: 'flex' }}>
              <button 
                className="button-primary" 
                type="button" 
                onClick={() => void downloadExcel(`/admin/export-voters${organizationId ? `?organizationId=${encodeURIComponent(organizationId)}` : ''}`, 'Excel export नहीं हुआ।', 'platform-data.xlsx')} 
                disabled={saving}
              >
                {saving ? <LoaderCircle size={15} className="spin" /> : <Download size={15} />} Excel डेटा डाउनलोड करें
              </button>
            </div>
          </section>
        )}

        {activeView === 'system' && (
          <section className="feature-metrics">
            <article className="metric-card"><span><DatabaseIcon /> Database</span><strong>{health?.database ?? '—'}</strong><small>सर्वर कनेक्शन जाँच</small></article>
            <article className="metric-card metric-card-green"><span><ShieldCheck size={15} /> WhatsApp / Meta</span><strong>{health ? (health.metaReady ? 'Configured' : 'Not configured') : '—'}</strong><small>Credentials configured status only</small></article>
            <article className="metric-card"><span><Activity size={15} /> API</span><strong>{health?.platform ?? '—'}</strong><small>{health?.checkedAt ? new Date(health.checkedAt).toLocaleString('hi-IN') : 'सिस्टम चेक'}</small></article>
          </section>
        )}

        {editingTenant && (
          <div className="feature-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setEditingTenant(null); }}>
            <section className="form-modal" role="dialog" aria-modal="true" aria-labelledby="tenant-edit-title">
              <div className="modal-heading"><div><span className="eyebrow-label">TENANT CONFIGURATION</span><h2 id="tenant-edit-title">क्लाइंट access कस्टमाइज़ करें</h2><p>{editingTenant.name}</p></div><button className="icon-button" type="button" onClick={() => setEditingTenant(null)} aria-label="बंद करें"><X size={18} /></button></div>
              <form className="modal-form" onSubmit={updateTenant}>
                <div className="feature-form-grid">
                  <label>क्लाइंट नाम<input required value={editingTenant.name} onChange={(event) => setEditingTenant({ ...editingTenant, name: event.target.value })} /></label>
                  <label>अनुमत वार्ड <span className="optional-label">कॉमा से अलग; खाली = सभी वार्ड</span><input value={editingTenant.wards.join(', ')} onChange={(event) => setEditingTenant({ ...editingTenant, wards: event.target.value.split(',').map((ward) => ward.trim()).filter(Boolean) })} /></label>
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
                    💬 WhatsApp मैसेजिंग सेवा सक्षम रखें
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

                <label className="checkbox-label" style={{ marginTop: '12px' }}><input type="checkbox" checked={editingTenant.isActive} onChange={(event) => setEditingTenant({ ...editingTenant, isActive: event.target.checked })} /> क्लाइंट खाते को सक्रिय रखें</label>
                <div className="modal-actions"><button className="button-secondary" type="button" onClick={() => setEditingTenant(null)}>रद्द करें</button><button className="button-primary" type="submit" disabled={saving}>{saving ? <LoaderCircle size={15} className="spin" /> : <Check size={15} />} सेव करें</button></div>
              </form>
            </section>
          </div>
        )}
      </div>
    </>
  );
}

function DatabaseIcon() {
  return <FileSpreadsheet size={15} />;
}
