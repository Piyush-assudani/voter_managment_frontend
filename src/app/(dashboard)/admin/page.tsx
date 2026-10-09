'use client';

import { FormEvent, Fragment, useCallback, useEffect, useMemo, useState } from 'react';
import {
  Activity, AlertCircle, Check, ChevronDown, ChevronRight, Download, FileSpreadsheet, LoaderCircle, RefreshCw,
  Settings2, ShieldCheck, Upload, UserPlus, UsersRound, X,
} from 'lucide-react';
import DashboardShell from '@/app/(dashboard)/DashboardShell';
import AccountsManager from '@/components/AccountsManager';
import { apiFetch, getApiError } from '@/lib/api';

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
  organizationId: string;
  status: 'processing' | 'completed' | 'failed';
  progress?: number;
  extractedCount: number;
  uploadedAt: string;
}

type AdminView = 'tenants' | 'records' | 'users' | 'import' | 'export' | 'system';

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
  const [tenantModules, setTenantModules] = useState<string[]>(moduleOptions.map(([key]) => key));
  const [tenantWards, setTenantWards] = useState('');
  const [editingTenant, setEditingTenant] = useState<Tenant | null>(null);
  const [importing, setImporting] = useState(false);
  const [uploadingPdf, setUploadingPdf] = useState(false);
  const [pdfJobs, setPdfJobs] = useState<UploadJob[]>([]);

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
    if (!organizationId || activeView !== 'import') return;
    try {
      const response = await apiFetch(`/admin/pdf/jobs?organizationId=${organizationId}`, { cache: 'no-store' });
      if (response.ok) {
        setPdfJobs(await response.json() as UploadJob[]);
      }
    } catch {
      // ignore silently
    }
  }, [organizationId, activeView]);

  const loadPageData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      if (activeView === 'records') await Promise.all([loadOrganizations(), loadVoters()]);
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
  }, [activeView, loadHealth, loadOrganizations, loadVoters, loadPdfJobs]);

  useEffect(() => { void Promise.resolve().then(() => loadPageData()); }, [loadPageData]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (activeView === 'import' && organizationId) {
      interval = setInterval(() => void loadPdfJobs(), 3000);
    }
    return () => clearInterval(interval);
  }, [activeView, organizationId, loadPdfJobs]);

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
      const url = URL.createObjectURL(await response.blob());
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = filename;
      anchor.click();
      URL.revokeObjectURL(url);
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
        }),
      });
      if (!response.ok) throw new Error(await getApiError(response, 'क्लाइंट खाता नहीं बन सका।'));
      setNotice('क्लाइंट और उसका एडमिन अकाउंट बना दिया गया।');
      setTenantName('');
      setTenantEmail('');
      setTenantPassword('');
      setTenantWards('');
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
    const MAX_SIZE = 50 * 1024 * 1024; // 50MB
    if (file.size > MAX_SIZE) {
      setError(`चयनित Excel फाइल (${(file.size / (1024 * 1024)).toFixed(1)}MB) 50MB की सीमा से बड़ी है। कृपया 50MB से छोटी फाइल अपलोड करें।`);
      return;
    }
    setImporting(true);
    setError('');
    setNotice(`Excel फाइल अपलोड हो रही है (${(file.size / (1024 * 1024)).toFixed(1)}MB)...`);
    try {
      const body = new FormData();
      body.set('organizationId', organizationId);
      body.set('file', file);
      const response = await apiFetch('/admin/upload-voters', { method: 'POST', body });
      if (!response.ok) throw new Error(await getApiError(response, 'मतदाता Excel import नहीं हुआ।'));
      const result = await response.json() as { inserted: number; updated: number };
      setNotice(`${result.inserted} नए और ${result.updated} अपडेटेड मतदाता Excel से सेव हुए।`);
      form.reset();
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
    const MAX_SIZE = 50 * 1024 * 1024; // 50MB
    if (file.size > MAX_SIZE) {
      setError(`चयनित PDF फाइल (${(file.size / (1024 * 1024)).toFixed(1)}MB) 50MB की सीमा से बड़ी है। कृपया फाइल कंप्रेस करें या 50MB से छोटी PDF चुनें।`);
      return;
    }
    setUploadingPdf(true);
    setError('');
    setNotice(`PDF अपलोड हो रही है (${(file.size / (1024 * 1024)).toFixed(1)}MB)... कृपया प्रतीक्षा करें।`);
    try {
      const body = new FormData();
      body.set('organizationId', organizationId);
      body.set('pdf', file);
      
      const useOcrCheckbox = form.querySelector<HTMLInputElement>('input[name="useOcr"]');
      if (useOcrCheckbox?.checked) {
        body.set('useOcr', 'true');
      }

      const response = await apiFetch('/admin/pdf/upload', { method: 'POST', body });
      if (!response.ok) throw new Error(await getApiError(response, 'PDF अपलोड नहीं हुई।'));
      const result = await response.json() as { message?: string, extractedCount?: number, backgroundProcessing?: boolean };
      if (result.backgroundProcessing) {
        setNotice('PDF फाइल अपलोड हो गई है! डेटा बैकग्राउंड में प्रोसेस हो रहा है। बड़े PDF में 2-5 मिनट लग सकते हैं।');
      } else {
        setNotice(`${result.extractedCount ?? 0} Voter IDs सफलता पूर्वक PDF से निकाले गए।`);
      }
      form.reset();
      void loadPdfJobs();
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

        {notice && <div className="inline-notice" role="status"><Check size={15} /> {notice}</div>}
        {error && <div className="inline-notice error-notice" role="alert"><AlertCircle size={15} /> {error}</div>}

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
                  <label>शुरुआती पासवर्ड<input type="password" autoComplete="new-password" minLength={8} required value={tenantPassword} onChange={(event) => setTenantPassword(event.target.value)} /></label>
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
                <div className="admin-form-actions" style={{ marginTop: '20px' }}><button className="button-primary" type="submit" disabled={saving}>{saving ? <LoaderCircle size={15} className="spin" /> : <UserPlus size={15} />} क्लाइंट बनाएँ</button></div>
              </form>
            </section>
            <section className="records-panel">
              <div className="records-toolbar"><div><h2>क्लाइंट संगठन</h2><p>मॉड्यूल, वार्ड और खाते की स्थिति नियंत्रित करें।</p></div><span className="panel-count">{organizations.length}</span></div>
              {loading ? <div className="empty-state"><LoaderCircle size={20} className="spin" /><p>क्लाइंट लोड हो रहे हैं…</p></div> : organizations.length ? (
                <div className="table-scroll"><table className="voter-table desk-table"><thead><tr><th>क्लाइंट</th><th>वार्ड</th><th>सक्षम फीचर</th><th>कार्यकर्ता</th><th>मतदाता</th><th>स्थिति</th><th>एक्शन</th></tr></thead>
                  <tbody>{organizations.map((tenant) => <tr key={tenant.id}>
                    <td><strong className="voter-name">{tenant.name}</strong><div className="voter-subline">{tenant.id}</div></td>
                    <td>{tenant.wards.length ? tenant.wards.join(', ') : 'सभी'}</td>
                    <td>{tenant.modules.length}</td>
                    <td>{tenant.activeWorkers} / 10</td>
                    <td>{tenant.voterCount.toLocaleString('hi-IN')}</td>
                    <td><span className={`record-status ${tenant.isActive ? 'status-voted' : 'status-pending'}`}>{tenant.isActive ? 'सक्रिय' : 'बंद'}</span></td>
                    <td><button className="button-quiet" type="button" onClick={() => setEditingTenant({ ...tenant })}><Settings2 size={14} /> कस्टमाइज़</button></td>
                  </tr>)}</tbody>
                </table></div>
              ) : <div className="empty-state"><strong>अभी कोई क्लाइंट नहीं</strong><p>पहला संगठन बनाने पर वह इस सूची में दिखेगा।</p></div>}
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
                <h2 style={{ fontSize: '18px', fontWeight: '600', color: '#1a2620', marginBottom: '4px' }}>मतदाता सूची Excel इम्पोर्ट</h2>
                <p style={{ fontSize: '14px', color: '#7d8981' }}>EPIC के आधार पर उसी क्लाइंट के रिकॉर्ड सुरक्षित रूप से अपडेट या जोड़े जाएंगे। PDF से कोई अनुमानित/नकली डेटा नहीं बनाया जाता।</p>
              </div>
              <form className="modal-form" onSubmit={importWorkbook}>
                <div className="feature-form-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
                  <label>क्लाइंट
                    <select required value={organizationId} onChange={(event) => setOrganizationId(event.target.value)}><option value="">क्लाइंट चुनें</option>{organizations.map((tenant) => <option key={tenant.id} value={tenant.id}>{tenant.name}</option>)}</select>
                  </label>
                  <label>Excel workbook (.xlsx)<input type="file" accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" required /></label>
                </div>
                <div className="admin-form-actions" style={{ marginTop: '20px' }}>
                  <button className="button-secondary" type="button" onClick={() => void downloadExcel('/admin/import-template.xlsx', 'टेम्पलेट डाउनलोड नहीं हुआ।', 'voter-import-template.xlsx')} disabled={saving}><Download size={15} /> Template डाउनलोड</button>
                  <button className="button-primary" type="submit" disabled={importing || !organizationId}>{importing ? <LoaderCircle size={15} className="spin" /> : <Upload size={15} />} Excel इम्पोर्ट करें</button>
                </div>
              </form>
            </section>
            <section className="records-panel" style={{ padding: '24px' }}>
              <div style={{ marginBottom: '20px' }}>
                <h2 style={{ fontSize: '18px', fontWeight: '600', color: '#1a2620', marginBottom: '4px' }}>PDF मतदाता सूची अपलोड</h2>
                <p style={{ fontSize: '14px', color: '#7d8981' }}>मतदाता सूची की PDF अपलोड करें। Voter IDs (EPIC) एक्सट्रेक्ट कर के डेटाबेस में सेव किये जाएंगे। सुरक्षा के लिए PDF सर्वर से 2 घंटे में आटोमेटिक डिलीट हो जाएगी।</p>
              </div>
              <form className="modal-form" onSubmit={uploadPdf}>
                <div className="feature-form-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
                  <label>क्लाइंट
                    <select required value={organizationId} onChange={(event) => setOrganizationId(event.target.value)}><option value="">क्लाइंट चुनें</option>{organizations.map((tenant) => <option key={tenant.id} value={tenant.id}>{tenant.name}</option>)}</select>
                  </label>
                  <label>PDF फाइल (.pdf)<input type="file" accept=".pdf,application/pdf" required /></label>
                </div>
                <div style={{ marginTop: '16px' }}>
                  <label className="checkbox-label" style={{ fontWeight: '500' }}>
                    <input type="checkbox" name="useOcr" />
                    करप्टेड/हिंदी फॉन्ट के लिए Local OCR इस्तेमाल करें (धीमा लेकिन 100% सटीक)
                  </label>
                </div>
                <div className="admin-form-actions" style={{ marginTop: '20px' }}>
                  <button className="button-primary" type="submit" disabled={uploadingPdf || !organizationId}>{uploadingPdf ? <LoaderCircle size={15} className="spin" /> : <Upload size={15} />} PDF अपलोड करें</button>
                </div>
              </form>

              {pdfJobs.length > 0 && (
                <div style={{ marginTop: '32px', borderTop: '1px solid #e4eae5', paddingTop: '20px' }}>
                  <h3 style={{ fontSize: '15px', fontWeight: '600', marginBottom: '12px' }}>हाल ही में अपलोड की गई PDF फाइलें (पिछले 2 घंटे)</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {pdfJobs.map((job) => (
                      <div key={job.id} style={{ display: 'flex', flexDirection: 'column', gap: '8px', background: '#f9faf9', padding: '12px 16px', borderRadius: '6px', border: '1px solid #e4eae5' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            {job.status === 'processing' && <LoaderCircle size={16} className="spin" style={{ color: '#00875a' }} />}
                            {job.status === 'completed' && <Check size={16} style={{ color: '#00875a' }} />}
                            {job.status === 'failed' && <AlertCircle size={16} style={{ color: '#d93025' }} />}
                            <div>
                              <div style={{ fontSize: '14px', fontWeight: '500', color: '#1a2620' }}>{job.filename}</div>
                              <div style={{ fontSize: '12px', color: '#7d8981' }}>
                                {new Date(job.uploadedAt).toLocaleTimeString('hi-IN')} 
                                {job.status === 'completed' && ` • ${job.extractedCount} रिकॉर्ड्स`}
                              </div>
                            </div>
                          </div>
                          <div style={{ fontSize: '13px', fontWeight: '500', color: job.status === 'failed' ? '#d93025' : '#00875a' }}>
                            {job.status === 'processing' && (job.progress ? `${job.progress}% Extracting...` : 'Extracting...')}
                            {job.status === 'completed' && 'Done'}
                            {job.status === 'failed' && 'Error'}
                          </div>
                        </div>
                        {job.status === 'processing' && (
                          <div style={{ width: '100%', height: '6px', backgroundColor: '#e4eae5', borderRadius: '4px', overflow: 'hidden' }}>
                            <div style={{ width: `${job.progress || 0}%`, height: '100%', backgroundColor: '#00875a', transition: 'width 0.3s ease' }} />
                          </div>
                        )}
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

        {activeView === 'export' && (
          <section className="records-panel" style={{ padding: '24px', marginBottom: '24px' }}>
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
                <label className="checkbox-label"><input type="checkbox" checked={editingTenant.isActive} onChange={(event) => setEditingTenant({ ...editingTenant, isActive: event.target.checked })} /> क्लाइंट खाते को सक्रिय रखें</label>
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
