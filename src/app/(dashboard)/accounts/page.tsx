'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';
import { KeyRound, LoaderCircle, Pencil, Plus, RefreshCw, Search, ShieldCheck, UserRoundX, X } from 'lucide-react';
import { apiFetch, getApiError } from '@/lib/api';

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

export default function AccountsPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [organizationId, setOrganizationId] = useState('');
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
      const response = await apiFetch(`/users/accounts${query}`, { cache: 'no-store' });
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
        const payload = token ? JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))) as { user?: { role?: string } } : null;
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
      const path = editing ? `/users/accounts/${editing.id}` : '/users/accounts';
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
      const response = await apiFetch(`/users/accounts/${account.id}`, { method: 'DELETE' });
      if (!response.ok) throw new Error(await getApiError(response, 'खाता बंद नहीं हुआ।'));
      setNotice('खाता बंद कर दिया गया।');
      await load();
    } catch (disableError) {
      setError(disableError instanceof Error ? disableError.message : 'खाता बंद नहीं हुआ।');
    }
  };

  return (
    <div className="work-page">
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

      <section className="records-panel">
        <div className="records-toolbar">
          <div><h2>खाते</h2><p>Role और access scopes; password कभी सूची में नहीं दिखता।</p></div>
          {isPlatformAdmin && <label className="ward-select-label">क्लाइंट
            <select aria-label="अकाउंट क्लाइंट फ़िल्टर" value={organizationId} onChange={(event) => setOrganizationId(event.target.value)}>
              <option value="">सभी क्लाइंट</option>{organizations.map((tenant) => <option key={tenant.id} value={tenant.id}>{tenant.name}</option>)}
            </select>
          </label>}
          <span className="panel-count">{isPlatformAdmin && !organizationId ? 'क्लाइंट-वार worker quota' : `${accounts.filter((account) => account.accountType === 'worker' && account.isActive).length} / 10 सक्रिय कार्यकर्ता`}</span>
          <label className="search-field account-search"><Search size={15} /><input aria-label="खाते खोजें" placeholder="नाम, email, फोन या scope" value={search} onChange={(event) => setSearch(event.target.value)} /></label>
          <span className="panel-count">{filteredAccounts.length} / {accounts.length} खाते</span>
        </div>
        {loading && !accounts.length ? <div className="empty-state"><LoaderCircle size={20} className="spin" /><p>खाते लोड हो रहे हैं…</p></div> : filteredAccounts.length ? (
          <div className="table-scroll"><table className="voter-table desk-table"><thead><tr><th>खाता</th>{isPlatformAdmin && <th>क्लाइंट</th>}<th>भूमिका</th><th>Scope</th><th>Modules</th><th>स्थिति</th><th>कार्य</th></tr></thead><tbody>
            {filteredAccounts.map((account) => <tr key={account.id}><td><div className="voter-name">{account.name || account.email}</div><div className="voter-subline">{account.email}{account.phone ? ` · ${account.phone}` : ''}</div></td>{isPlatformAdmin && <td>{account.organizationName || account.organizationId}</td>}<td>{account.role}</td><td>{account.scope}{account.scopeValue ? ` · ${account.scopeValue}` : ''}</td><td>{account.modules.length} modules</td><td><span className={`record-status ${account.isActive ? 'status-voted' : 'status-pending'}`}>{account.isActive ? 'सक्रिय' : 'बंद'}</span></td><td><div className="feature-actions"><button className="button-secondary" type="button" onClick={() => startEdit(account)}><Pencil size={14} /> बदलें</button><button className="button-quiet" type="button" onClick={() => startPermissions(account)}><ShieldCheck size={14} /> अनुमतियाँ</button><button className="button-quiet" type="button" onClick={() => startPasswordChange(account)}><KeyRound size={14} /> पासवर्ड</button><button className="button-quiet" type="button" onClick={() => void disable(account)} disabled={!account.isActive}><UserRoundX size={14} /> बंद करें</button></div></td></tr>)}
          </tbody></table></div>
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
  return (
    <form className="feature-account-form" onSubmit={onSubmit}>
      <div className="feature-form-grid">
        {(mode === 'create' || mode === 'edit') && <>
          <label>पूरा नाम<input value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} required /></label>
          <label>Email<input type="email" value={form.email} onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))} required={mode === 'create'} disabled={mode === 'edit'} /></label>
          <label>फोन<input value={form.phone} onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))} /></label>
        </>}
        {(mode === 'create' || mode === 'edit' || mode === 'password') && <label>{mode === 'password' ? 'नया पासवर्ड' : mode === 'edit' ? 'नया पासवर्ड (वैकल्पिक)' : 'पासवर्ड'}<span className="feature-password-field"><KeyRound size={14} /><input type="password" autoComplete="new-password" value={form.password} onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))} minLength={8} required={mode === 'create' || mode === 'password'} placeholder={mode === 'edit' ? 'खाली छोड़ें तो वही रहेगा' : 'कम-से-कम 8 अक्षर'} /></span></label>}
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
