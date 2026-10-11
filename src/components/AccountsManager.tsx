'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';
import { Eye, EyeOff, KeyRound, LoaderCircle, Pencil, Plus, RefreshCw, Search, ShieldCheck, UserRoundX, X } from 'lucide-react';
import { apiFetch, getApiError, decodeJwtPayload } from '@/lib/api';

const accessModules = [
  ['voters', 'मतदाता सूची'],
  ['poll-desk', 'मतदान डेस्क'],
  ['turnout', 'टर्नआउट'],
  ['warroom', 'वॉर रूम'],
  ['history', 'Dispatch इतिहास'],
  ['community', 'समुदाय खोज'],
  ['workers', 'कार्यकर्ता'],
  ['migrants', 'प्रवासी मतदाता'],
] as const;
const modulePresets = [
  { label: 'सभी उपलब्ध', modules: accessModules.map(([module]) => module) },
  { label: 'बूथ एजेंट', modules: ['voters', 'poll-desk'] },
  { label: 'फील्ड कार्यकर्ता', modules: ['voters', 'community', 'workers', 'migrants'] },
  { label: 'रिपोर्टिंग', modules: ['turnout', 'warroom', 'history', 'community'] },
];
const roles = ['Operator', 'Booth Agent', 'Karyakarta', 'Viewer'];
const scopes = ['Booth', 'Ward', 'Village', 'All'];

interface Organization {
  id: string;
  name: string;
  modules: string[];
}

interface Account {
  id: number;
  accountType: string;
  email: string;
  name: string;
  phone: string;
  role: string;
  scope: string;
  scopeValue: string;
  modules: string[];
  isActive: boolean;
  assignedVoters: number;
  organizationId: string;
  organizationName: string;
}

interface FormState {
  name: string;
  email: string;
  phone: string;
  password: string;
  role: string;
  scope: string;
  scopeValue: string;
  modules: string[];
}

const newForm = (): FormState => ({
  name: '',
  email: '',
  phone: '',
  password: '',
  role: 'Operator',
  scope: 'All',
  scopeValue: '',
  modules: ['voters', 'poll-desk'],
});

export default function AccountsManager({ embeddedOrganizationId }: { embeddedOrganizationId?: string }) {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [organizationId, setOrganizationId] = useState(embeddedOrganizationId || '');
  const [isPlatformAdmin, setIsPlatformAdmin] = useState(false);
  const [editing, setEditing] = useState<Account | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<'create' | 'edit' | 'permissions' | 'password' | null>(null);
  const [form, setForm] = useState<FormState>(newForm());
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const normalizedSearch = search.trim().toLocaleLowerCase();
  const filteredAccounts = normalizedSearch
    ? accounts.filter((account) => [account.name, account.email, account.phone, account.scope, account.scopeValue, account.role]
        .some((value) => value.toLocaleLowerCase().includes(normalizedSearch)))
    : accounts;

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const query = organizationId ? `?organizationId=${encodeURIComponent(organizationId)}` : '';
      const response = await apiFetch(`/users${query}`, { cache: 'no-store' });
      if (!response.ok) throw new Error(await getApiError(response, 'खाता सूची लोड नहीं हुई।'));
      setAccounts(await response.json() as Account[]);
    } catch (loadError) {
      setAccounts([]);
      setError(loadError instanceof Error ? loadError.message : 'खाता सूची लोड नहीं हुई।');
    } finally {
      setLoading(false);
    }
  }, [organizationId]);

  useEffect(() => { void Promise.resolve().then(() => load()); }, [load]);

  useEffect(() => {
    void Promise.resolve().then(async () => {
      try {
        const token = window.localStorage.getItem('token');
        const payload = decodeJwtPayload<{ user?: { role?: string } }>(token);
        const platformAdmin = payload?.user?.role === 'admin';
        setIsPlatformAdmin(platformAdmin);
        if (!platformAdmin) return;
        const response = await apiFetch('/admin/organizations', { cache: 'no-store' });
        if (!response.ok) throw new Error(await getApiError(response, 'क्लाइंट खाते लोड नहीं हुए।'));
        const tenants = await response.json() as Organization[];
        setOrganizations(tenants);
        setOrganizationId((current) => current || tenants[0]?.id || '');
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : 'क्लाइंट खाते लोड नहीं हुए।');
      }
    });
  }, []);

  const startCreate = () => {
    setEditing(null);
    setForm(newForm());
    setFormOpen(true);
    setDialogMode('create');
    setError('');
    setNotice('');
  };

  const openAccountAction = (account: Account, mode: 'edit' | 'permissions' | 'password') => {
    setEditing(account);
    if (isPlatformAdmin) setOrganizationId(account.organizationId);
    setFormOpen(true);
    setDialogMode(mode);
    setForm({
      name: account.name,
      email: account.email,
      phone: account.phone,
      password: '',
      role: account.role,
      scope: account.scope,
      scopeValue: account.scopeValue,
      modules: account.modules || [],
    });
    setError('');
    setNotice('');
  };

  const startEdit = (account: Account) => openAccountAction(account, 'edit');
  const startPermissions = (account: Account) => openAccountAction(account, 'permissions');
  const startPasswordChange = (account: Account) => openAccountAction(account, 'password');

  const toggleModule = (module: string) => {
    setForm((current) => ({
      ...current,
      modules: current.modules.includes(module)
        ? current.modules.filter((item) => item !== module)
        : [...current.modules, module],
    }));
  };

  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    setNotice('');
    try {
      const path = editing ? `/users/${editing.id}` : '/users';
      const method = editing ? 'PUT' : 'POST';
      const payload = !editing
        ? {
            name: form.name,
            email: form.email,
            phone: form.phone,
            password: form.password,
            subRole: form.role,
            scope: form.scope,
            scopeValue: form.scopeValue,
            modules: isPlatformAdmin
              ? form.modules.filter((module) => organizations.find((tenant) => tenant.id === organizationId)?.modules.includes(module))
              : form.modules,
            ...(isPlatformAdmin ? { organizationId } : {}),
          }
        : dialogMode === 'password'
          ? { password: form.password }
          : dialogMode === 'permissions'
            ? {
                subRole: form.role,
                scope: form.scope,
                scopeValue: form.scopeValue,
                modules: isPlatformAdmin
                  ? form.modules.filter((module) => organizations.find((tenant) => tenant.id === organizationId)?.modules.includes(module))
                  : form.modules,
              }
            : {
                name: form.name,
                phone: form.phone,
                subRole: form.role,
                scope: form.scope,
                scopeValue: form.scopeValue,
                modules: isPlatformAdmin
                  ? form.modules.filter((module) => organizations.find((tenant) => tenant.id === organizationId)?.modules.includes(module))
                  : form.modules,
                ...(form.password ? { password: form.password } : {}),
              };
      const response = await apiFetch(path, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!response.ok) throw new Error(await getApiError(response, 'खाता सेव नहीं हुआ।'));
      setNotice(dialogMode === 'password'
        ? 'पासवर्ड अपडेट हुआ।'
        : dialogMode === 'permissions'
          ? 'अनुमतियाँ अपडेट हुईं।'
          : editing ? 'खाता अपडेट हुआ।' : 'खाता बनाया गया।');
      setEditing(null);
      setFormOpen(false);
      setDialogMode(null);
      await load();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'खाता सेव नहीं हुआ।');
    } finally {
      setSaving(false);
    }
  };

  const disable = async (account: Account) => {
    if (!window.confirm(`${account.name || account.email} का access बंद करें?`)) return;
    setError('');
    setNotice('');
    try {
      const response = await apiFetch(`/users/${account.id}/active`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: false }),
      });
      if (!response.ok) throw new Error(await getApiError(response, 'खाता बंद नहीं हुआ।'));
      setNotice('खाता बंद कर दिया गया।');
      await load();
    } catch (disableError) {
      setError(disableError instanceof Error ? disableError.message : 'खाता बंद नहीं हुआ।');
    }
  };

  return (
    <div className={embeddedOrganizationId ? "embedded-manager" : "work-page"}>
      {!embeddedOrganizationId && (
        <>
          <div className="page-intro">
            <div><div className="eyebrow-label"><span className="eyebrow-mark" /> ACCESS CONTROL</div><h1>यूज़र व एक्सेस</h1><p>भूमिका, क्षेत्रीय दायरा और मॉड्यूल access सेट करें। खाता credentials सुरक्षित रूप से hash होकर सेव होते हैं।</p></div>
            <div className="feature-actions">
              <button className="button-secondary" type="button" onClick={() => void load()} disabled={loading}>{loading ? <LoaderCircle size={15} className="spin" /> : <RefreshCw size={15} />} रिफ्रेश</button>
              <button className="button-primary" type="button" onClick={startCreate} disabled={isPlatformAdmin && !organizationId}><Plus size={15} /> नया खाता</button>
            </div>
          </div>
          {error && !editing && <div className="inline-notice error-notice" role="alert">{error}</div>}
          {notice && <div className="inline-notice" role="status">{notice}</div>}
          <section className="feature-metrics">
            <article className="metric-card"><span>कुल खाते</span><strong>{loading ? '—' : accounts.length}</strong><small>अपने खाते को छोड़कर</small></article>
            <article className="metric-card metric-card-green"><span>सक्रिय</span><strong>{loading ? '—' : accounts.filter((item) => item.isActive).length}</strong><small>लॉगिन सक्षम</small></article>
            <article className="metric-card"><span>अलग scopes</span><strong>{loading ? '—' : new Set(accounts.map((item) => item.scope)).size}</strong><small>Booth · Ward · Village · All</small></article>
          </section>
        </>
      )}

      <section className={embeddedOrganizationId ? "" : "records-panel"}>
        <div className="records-toolbar">
          <div>{!embeddedOrganizationId && <h2>खाते</h2>}<p>Role और access scopes; password कभी सूची में नहीं दिखता।</p></div>
          {isPlatformAdmin && !embeddedOrganizationId && <label className="ward-select-label">क्लाइंट
            <select aria-label="अकाउंट क्लाइंट फ़िल्टर" value={organizationId} onChange={(event) => setOrganizationId(event.target.value)}>
              <option value="">सभी क्लाइंट</option>{organizations.map((tenant) => <option key={tenant.id} value={tenant.id}>{tenant.name}</option>)}
            </select>
          </label>}
          <span className="panel-count" style={{ whiteSpace: 'nowrap', width: 'auto' }}>
            {isPlatformAdmin && !organizationId ? 'क्लाइंट-वार worker quota' : `${accounts.filter((account) => account.accountType === 'worker' && account.isActive).length} / 10 सक्रिय कार्यकर्ता`}
          </span>
          <label className="search-field account-search"><Search size={15} /><input aria-label="खाते खोजें" placeholder="नाम, email, फोन या scope" value={search} onChange={(event) => setSearch(event.target.value)} /></label>
          <span className="panel-count" style={{ whiteSpace: 'nowrap', width: 'auto' }}>{filteredAccounts.length} / {accounts.length} खाते</span>
          {embeddedOrganizationId && <button className="button-primary" type="button" onClick={startCreate}><Plus size={15} /> नया खाता</button>}
        </div>
        {loading && !accounts.length ? <div className="empty-state"><LoaderCircle size={20} className="spin" /><p>खाते लोड हो रहे हैं…</p></div> : filteredAccounts.length ? (
          <>
            {/* Desktop Table View */}
            <div className="desktop-table-view table-scroll">
              <table className="voter-table desk-table">
                <thead>
                  <tr>
                    <th style={{ whiteSpace: 'nowrap' }}>खाता</th>
                    {isPlatformAdmin && !embeddedOrganizationId && <th style={{ whiteSpace: 'nowrap' }}>क्लाइंट</th>}
                    <th style={{ whiteSpace: 'nowrap' }}>भूमिका</th>
                    <th style={{ whiteSpace: 'nowrap' }}>Scope</th>
                    <th style={{ whiteSpace: 'nowrap' }}>Modules</th>
                    <th style={{ whiteSpace: 'nowrap' }}>स्थिति</th>
                    <th style={{ whiteSpace: 'nowrap' }}>कार्य</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAccounts.map((account) => (
                    <tr key={account.id}>
                      <td>
                        <div className="voter-name">{account.name || account.email}</div>
                        <div className="voter-subline">{account.email}{account.phone ? ` · ${account.phone}` : ''}</div>
                      </td>
                      {isPlatformAdmin && !embeddedOrganizationId && (
                        <td style={{ whiteSpace: 'nowrap' }}>{account.organizationName || account.organizationId}</td>
                      )}
                      <td style={{ whiteSpace: 'nowrap', fontWeight: 600 }}>{account.role}</td>
                      <td style={{ whiteSpace: 'nowrap' }}>{account.scope}{account.scopeValue ? ` · ${account.scopeValue}` : ''}</td>
                      <td style={{ whiteSpace: 'nowrap' }}>{account.modules.length} modules</td>
                      <td style={{ whiteSpace: 'nowrap' }}>
                        <span className={`record-status ${account.isActive ? 'status-voted' : 'status-pending'}`}>
                          {account.isActive ? 'सक्रिय' : 'बंद'}
                        </span>
                      </td>
                      <td>
                        <div className="feature-actions" style={{ flexWrap: 'nowrap' }}>
                          <button className="button-secondary" type="button" onClick={() => startEdit(account)}>
                            <Pencil size={14} /> बदलें
                          </button>
                          <button className="button-quiet" type="button" onClick={() => startPermissions(account)}>
                            <ShieldCheck size={14} /> अनुमतियाँ
                          </button>
                          <button className="button-quiet" type="button" onClick={() => startPasswordChange(account)}>
                            <KeyRound size={14} /> पासवर्ड
                          </button>
                          <button className="button-quiet" type="button" onClick={() => void disable(account)} disabled={!account.isActive}>
                            <UserRoundX size={14} /> बंद करें
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Card View */}
            <div className="mobile-card-view">
              {filteredAccounts.map((account) => (
                <div
                  key={account.id}
                  style={{
                    background: '#ffffff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '12px',
                    padding: '14px 16px',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                    <div>
                      <div style={{ fontSize: '15px', fontWeight: 700, color: '#0f172a' }}>
                        {account.name || account.email}
                      </div>
                      <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
                        {account.email} {account.phone ? ` · ${account.phone}` : ''}
                      </div>
                    </div>
                    <span className={`record-status ${account.isActive ? 'status-voted' : 'status-pending'}`} style={{ whiteSpace: 'nowrap' }}>
                      {account.isActive ? 'सक्रिय' : 'बंद'}
                    </span>
                  </div>

                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', alignItems: 'center' }}>
                    {isPlatformAdmin && !embeddedOrganizationId && (account.organizationName || account.organizationId) && (
                      <span style={{ fontSize: '11px', fontWeight: 600, background: '#f1f5f9', color: '#475569', padding: '3px 8px', borderRadius: '6px' }}>
                        🏢 {account.organizationName || account.organizationId}
                      </span>
                    )}
                    <span style={{ fontSize: '11px', fontWeight: 600, background: '#e0f2fe', color: '#0369a1', padding: '3px 8px', borderRadius: '6px' }}>
                      👤 {account.role}
                    </span>
                    <span style={{ fontSize: '11px', fontWeight: 600, background: '#fef3c7', color: '#92400e', padding: '3px 8px', borderRadius: '6px' }}>
                      📍 {account.scope}{account.scopeValue ? `: ${account.scopeValue}` : ''}
                    </span>
                    <span style={{ fontSize: '11px', fontWeight: 600, background: '#f3e8ff', color: '#6b21a8', padding: '3px 8px', borderRadius: '6px' }}>
                      🧩 {account.modules.length} मॉड्यूल्स
                    </span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px', paddingTop: '8px', borderTop: '1px solid #f1f5f9' }}>
                    <button
                      className="button-secondary"
                      type="button"
                      style={{ justifyContent: 'center', padding: '7px 10px', fontSize: '12px' }}
                      onClick={() => startEdit(account)}
                    >
                      <Pencil size={13} /> बदलें
                    </button>
                    <button
                      className="button-quiet"
                      type="button"
                      style={{ justifyContent: 'center', padding: '7px 10px', fontSize: '12px', background: '#f8fafc', border: '1px solid #e2e8f0' }}
                      onClick={() => startPermissions(account)}
                    >
                      <ShieldCheck size={13} /> अनुमतियाँ
                    </button>
                    <button
                      className="button-quiet"
                      type="button"
                      style={{ justifyContent: 'center', padding: '7px 10px', fontSize: '12px', background: '#f8fafc', border: '1px solid #e2e8f0' }}
                      onClick={() => startPasswordChange(account)}
                    >
                      <KeyRound size={13} /> पासवर्ड
                    </button>
                    <button
                      className="button-quiet"
                      type="button"
                      style={{
                        justifyContent: 'center',
                        padding: '7px 10px',
                        fontSize: '12px',
                        background: account.isActive ? '#fff1f2' : '#f8fafc',
                        color: account.isActive ? '#e11d48' : '#94a3b8',
                        border: '1px solid #fecdd3',
                      }}
                      onClick={() => void disable(account)}
                      disabled={!account.isActive}
                    >
                      <UserRoundX size={13} /> बंद करें
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : <div className="empty-state"><strong>{error ? 'खाते उपलब्ध नहीं' : search ? 'कोई खाता मेल नहीं खाता' : 'अभी कोई उप-खाता नहीं'}</strong><p>{error || (search ? 'खोज शब्द बदलकर फिर कोशिश करें।' : 'नया खाता बनाकर भूमिका, scope और module access दें。')}</p></div>}
        <div className="records-footnote">{isPlatformAdmin ? 'क्लाइंट कार्यकर्ता खाते tenant के अनुसार अलग रखे जाते हैं।' : 'इस संगठन में अधिकतम 10 सक्रिय कार्यकर्ता खाते बनाए जा सकते हैं।'}</div>
      </section>

      {formOpen && (
        <div className="feature-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setFormOpen(false); }}>
          <section className="feature-modal" role="dialog" aria-modal="true" aria-labelledby="account-modal-title">
            <div className="feature-modal-heading"><div><span className="eyebrow-label"><ShieldCheck size={13} /> ACCESS SETUP</span><h2 id="account-modal-title">{dialogMode === 'permissions' ? 'मॉड्यूल अनुमतियाँ' : dialogMode === 'password' ? 'पासवर्ड बदलें' : editing ? 'खाता संपादित करें' : 'नया खाता'}</h2></div><button className="icon-button" type="button" aria-label="बंद करें" onClick={() => { setFormOpen(false); setDialogMode(null); }}><X size={18} /></button></div>
            <AccountForm form={form} setForm={setForm} mode={dialogMode || 'create'} onSubmit={save} onCancel={() => { setFormOpen(false); setDialogMode(null); }} saving={saving} error={error} toggleModule={toggleModule} allowedModules={isPlatformAdmin ? organizations.find((tenant) => tenant.id === organizationId)?.modules || [] : undefined} />
          </section>
        </div>
      )}
    </div>
  );
}

function AccountForm({
  form,
  setForm,
  mode,
  onSubmit,
  onCancel,
  saving,
  error,
  toggleModule,
  allowedModules,
}: {
  form: FormState;
  setForm: React.Dispatch<React.SetStateAction<FormState>>;
  mode: 'create' | 'edit' | 'permissions' | 'password';
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onCancel: () => void;
  saving: boolean;
  error: string;
  toggleModule: (module: string) => void;
  allowedModules?: string[];
}) {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <form className="feature-account-form" onSubmit={onSubmit}>
      <div className="feature-form-grid">
        {(mode === 'create' || mode === 'edit') && <>
          <label>पूरा नाम<input value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} required /></label>
          <label>Email<input type="email" value={form.email} onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))} required={mode === 'create'} disabled={mode === 'edit'} /></label>
          <label>फोन<input value={form.phone} onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))} /></label>
        </>}
        {(mode === 'create' || mode === 'edit' || mode === 'password') && (
          <label>
            {mode === 'password' ? 'नया पासवर्ड' : mode === 'edit' ? 'नया पासवर्ड (वैकल्पिक)' : 'पासवर्ड'}
            <span className="feature-password-field">
              <KeyRound size={14} />
              <input
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                value={form.password}
                onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
                minLength={8}
                required={mode === 'create' || mode === 'password'}
                placeholder={mode === 'edit' ? 'खाली छोड़ें तो वही रहेगा' : 'कम-से-कम 8 अक्षर'}
              />
              <button
                type="button"
                className="password-eye-btn"
                onClick={() => setShowPassword((prev) => !prev)}
                title={showPassword ? 'पासवर्ड छिपाएं' : 'पासवर्ड देखें'}
                aria-label={showPassword ? 'पासवर्ड छिपाएं' : 'पासवर्ड देखें'}
              >
                {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </span>
          </label>
        )}
        {(mode === 'create' || mode === 'edit' || mode === 'permissions') && <>
          <label>भूमिका<select value={form.role} onChange={(event) => setForm((current) => ({ ...current, role: event.target.value }))}>{roles.map((role) => <option key={role}>{role}</option>)}</select></label>
          <label>दायरा<select value={form.scope} onChange={(event) => setForm((current) => ({ ...current, scope: event.target.value }))}>{scopes.map((scope) => <option key={scope}>{scope}</option>)}</select></label>
          {form.scope !== 'All' && <label className="scope-value-field">दायरे का नाम / नंबर<input value={form.scopeValue} onChange={(event) => setForm((current) => ({ ...current, scopeValue: event.target.value }))} placeholder={`${form.scope} का नाम`} required /></label>}
        </>}
      </div>
      {(mode === 'create' || mode === 'edit' || mode === 'permissions') && <>
        {mode === 'permissions' && <div className="feature-permission-presets">
          <span>त्वरित प्रीसेट</span>
          {modulePresets.map((preset) => <button className="button-quiet" type="button" key={preset.label} onClick={() => setForm((current) => ({
            ...current,
            modules: preset.modules.filter((module) => !allowedModules || allowedModules.includes(module)),
          }))}>{preset.label}</button>)}
        </div>}
        <fieldset className="feature-module-fieldset"><legend>अनुमत मॉड्यूल</legend><div className="feature-module-grid">{accessModules.map(([module, label]) => {
          const enabledForOrganization = !allowedModules || allowedModules.includes(module);
          return <label key={module}><input type="checkbox" checked={enabledForOrganization && form.modules.includes(module)} disabled={!enabledForOrganization} onChange={() => toggleModule(module)} /> {label}</label>;
        })}</div></fieldset>
      </>}
      {error && <div className="inline-notice error-notice" role="alert">{error}</div>}
      <div className="feature-modal-actions"><button className="button-quiet" type="button" onClick={onCancel}>रद्द करें</button><button className="button-primary" type="submit" disabled={saving}>{saving ? <LoaderCircle size={15} className="spin" /> : null}{mode === 'permissions' ? 'अनुमतियाँ सेव करें' : mode === 'password' ? 'पासवर्ड अपडेट करें' : mode === 'edit' ? 'बदलाव सेव करें' : 'खाता बनाएँ'}</button></div>
    </form>
  );
}
