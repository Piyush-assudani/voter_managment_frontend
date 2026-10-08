'use client';

import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import {
  Activity, AlertCircle, Check, Download, FileSpreadsheet, LoaderCircle, RefreshCw,
  Settings2, ShieldCheck, Upload, UserPlus, UsersRound, X,
} from 'lucide-react';
import DashboardShell from '@/app/(dashboard)/DashboardShell';
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

type AdminView = 'tenants' | 'records' | 'users' | 'import' | 'system';

export default function AdminPanel() {
  const [activeView, setActiveView] = useState<AdminView>('tenants');
  const [organizations, setOrganizations] = useState<Tenant[]>([]);
  const [voters, setVoters] = useState<AdminVoter[]>([]);
  const [health, setHealth] = useState<SystemHealth | null>(null);
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

  const loadOrganizations = useCallback(async () => {
    const response = await apiFetch('/admin/organizations', { cache: 'no-store' });
    if (!response.ok) throw new Error(await getApiError(response, 'क्लाइंट खाते लोड नहीं हुए।'));
    setOrganizations(await response.json() as Tenant[]);
  }, []);

  const loadVoters = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const query = organizationId ? `?organizationId=${encodeURIComponent(organizationId)}` : '';
      const response = await apiFetch(`/admin/master-data${query}`, { cache: 'no-store' });
      if (!response.ok) throw new Error(await getApiError(response, 'मास्टर रिकॉर्ड लोड नहीं हुए।'));
      const result: unknown = await response.json();
      if (!Array.isArray(result)) throw new Error('सर्वर से रिकॉर्ड का सही उत्तर नहीं मिला।');
      setVoters(result as AdminVoter[]);
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

  const loadPageData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      if (activeView === 'records') await Promise.all([loadOrganizations(), loadVoters()]);
      else if (activeView === 'tenants' || activeView === 'users' || activeView === 'import') await loadOrganizations();
      else await loadHealth();
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'एडमिन जानकारी लोड नहीं हुई।');
    } finally {
      setLoading(false);
    }
  }, [activeView, loadHealth, loadOrganizations, loadVoters]);

  useEffect(() => { void Promise.resolve().then(() => loadPageData()); }, [loadPageData]);

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
    setImporting(true);
    setError('');
    setNotice('');
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
    } finally {
      setImporting(false);
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
            <button className="button-primary" type="button" onClick={() => void downloadExcel(`/admin/export-voters${organizationId ? `?organizationId=${encodeURIComponent(organizationId)}` : ''}`, 'Excel export नहीं हुआ।', 'platform-data.xlsx')} disabled={saving}>
              {saving ? <LoaderCircle size={15} className="spin" /> : <FileSpreadsheet size={15} />} Excel डेटा एक्सपोर्ट
            </button>
          </div>
        </div>

        <nav className="admin-tabs" aria-label="एडमिन सेक्शन">
          {([
            ['tenants', 'क्लाइंट व फीचर', UsersRound],
            ['records', 'वोटर डेटा', FileSpreadsheet],
            ['users', 'सभी अकाउंट', UserPlus],
            ['import', 'Excel इम्पोर्ट', Upload],
            ['system', 'सिस्टम स्थिति', Activity],
          ] as const).map(([key, label, Icon]) => (
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
            <div className="section-title-row"><div><h2>नया क्लाइंट खाता</h2><p>एक ही login से क्लाइंट एडमिन अपना configurable workspace खोलेंगे।</p></div></div>
            <section className="admin-form-panel">
              <form className="modal-form admin-user-form" onSubmit={createTenant}>
                <label>क्लाइंट / संगठन का नाम<input required value={tenantName} onChange={(event) => setTenantName(event.target.value)} /></label>
                <label>क्लाइंट एडमिन ईमेल<input type="email" autoComplete="username" required value={tenantEmail} onChange={(event) => setTenantEmail(event.target.value)} /></label>
                <label>शुरुआती पासवर्ड<input type="password" autoComplete="new-password" minLength={8} required value={tenantPassword} onChange={(event) => setTenantPassword(event.target.value)} /></label>
                <label className="notes-field">अनुमत वार्ड <span className="optional-label">कॉमा से अलग करें; खाली = पूरा संगठन</span><input value={tenantWards} onChange={(event) => setTenantWards(event.target.value)} placeholder="वार्ड 1, वार्ड 2" /></label>
                <fieldset className="module-picker">
                  <legend>इस क्लाइंट के लिए फीचर</legend>
                  {moduleOptions.map(([module, label]) => (
                    <label key={module}><input type="checkbox" checked={tenantModules.includes(module)} onChange={() => toggleModule(module)} /> {label}</label>
                  ))}
                </fieldset>
                <div className="admin-form-actions"><button className="button-primary" type="submit" disabled={saving}>{saving ? <LoaderCircle size={15} className="spin" /> : <UserPlus size={15} />} क्लाइंट बनाएँ</button></div>
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
              </div>
              {loading ? <div className="empty-state"><LoaderCircle size={21} className="spin" /><p>मास्टर डेटा लोड हो रहा है…</p></div> : voters.length ? (
                <div className="table-scroll"><table className="voter-table desk-table"><thead><tr><th>मतदाता</th><th>EPIC</th><th>क्लाइंट</th><th>वार्ड</th><th>भाग</th><th>क्रमांक</th><th>फ़ोन</th></tr></thead><tbody>
                  {visibleVoters.map((voter) => <tr key={`${voter.organizationId}-${voter._id}`}><td><strong className="voter-name">{voter.nameHi || voter.nameEn || '—'}</strong></td><td className="voter-code">{voter.epic || '—'}</td><td>{organizations.find((tenant) => tenant.id === voter.organizationId)?.name ?? voter.organizationId}</td><td>{voter.wardNo || '—'}</td><td>{voter.partNo || '—'}</td><td>{voter.serialNo || '—'}</td><td>{voter.phone || '—'}</td></tr>)}
                </tbody></table></div>
              ) : <div className="empty-state"><strong>रिकॉर्ड उपलब्ध नहीं</strong><p>{error || 'डेटाबेस में मतदाता रिकॉर्ड आने पर वे यहाँ दिखेंगे।'}</p></div>}
              <div className="records-footnote">{visibleVoters.length} रिकॉर्ड दिखाए गए (अधिकतम 1,000)। पूरा डेटा एक्सपोर्ट से मिलेगा।</div>
            </section>
          </>
        )}

        {activeView === 'users' && (
          <section className="records-panel">
            <div className="records-toolbar"><div><h2>सभी टीम अकाउंट</h2><p>Worker accounts, tenant और access सेटिंग देखने/बदलने के लिए अकाउंट प्रबंधन खोलें।</p></div><a className="button-secondary" href="/accounts"><UsersRound size={15} /> अकाउंट प्रबंधन</a></div>
            {loading ? <div className="empty-state"><LoaderCircle size={20} className="spin" /><p>क्लाइंट खाते लोड हो रहे हैं…</p></div> : <div className="table-scroll"><table className="voter-table desk-table"><thead><tr><th>क्लाइंट</th><th>सक्रिय कार्यकर्ता</th><th>मतदाता</th><th>अवस्था</th></tr></thead><tbody>
              {organizations.map((tenant) => <tr key={tenant.id}><td>{tenant.name}</td><td>{tenant.activeWorkers} / 10</td><td>{tenant.voterCount.toLocaleString('hi-IN')}</td><td>{tenant.isActive ? 'सक्रिय' : 'बंद'}</td></tr>)}
            </tbody></table></div>}
          </section>
        )}

        {activeView === 'import' && (
          <section className="admin-form-panel">
            <div className="panel-heading"><div><h2>मतदाता सूची Excel इम्पोर्ट</h2><p>EPIC के आधार पर उसी क्लाइंट के रिकॉर्ड सुरक्षित रूप से अपडेट या जोड़े जाएंगे। PDF से कोई अनुमानित/नकली डेटा नहीं बनाया जाता।</p></div></div>
            <form className="modal-form admin-user-form" onSubmit={importWorkbook}>
              <label>क्लाइंट
                <select required value={organizationId} onChange={(event) => setOrganizationId(event.target.value)}><option value="">क्लाइंट चुनें</option>{organizations.map((tenant) => <option key={tenant.id} value={tenant.id}>{tenant.name}</option>)}</select>
              </label>
              <label>Excel workbook (.xlsx)<input type="file" accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" required /></label>
              <div className="admin-form-actions">
                <button className="button-secondary" type="button" onClick={() => void downloadExcel('/admin/import-template.xlsx', 'टेम्पलेट डाउनलोड नहीं हुआ।', 'voter-import-template.xlsx')} disabled={saving}><Download size={15} /> Template डाउनलोड</button>
                <button className="button-primary" type="submit" disabled={importing || !organizationId}>{importing ? <LoaderCircle size={15} className="spin" /> : <Upload size={15} />} Excel इम्पोर्ट करें</button>
              </div>
            </form>
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
                <label>क्लाइंट नाम<input required value={editingTenant.name} onChange={(event) => setEditingTenant({ ...editingTenant, name: event.target.value })} /></label>
                <label>अनुमत वार्ड <span className="optional-label">कॉमा से अलग; खाली = सभी वार्ड</span><input value={editingTenant.wards.join(', ')} onChange={(event) => setEditingTenant({ ...editingTenant, wards: event.target.value.split(',').map((ward) => ward.trim()).filter(Boolean) })} /></label>
                <fieldset className="module-picker">
                  <legend>सक्षम फीचर</legend>
                  {moduleOptions.map(([module, label]) => <label key={module}><input type="checkbox" checked={editingTenant.modules.includes(module)} onChange={() => setEditingTenant({ ...editingTenant, modules: editingTenant.modules.includes(module) ? editingTenant.modules.filter((item) => item !== module) : [...editingTenant.modules, module] })} /> {label}</label>)}
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
