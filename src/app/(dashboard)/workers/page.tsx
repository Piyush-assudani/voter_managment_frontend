'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Building2,
  ExternalLink,
  Filter,
  LoaderCircle,
  Mail,
  MapPin,
  Phone,
  RefreshCw,
  Search,
  ShieldCheck,
  UserPlus,
  UsersRound,
  X,
} from 'lucide-react';
import { apiFetch, decodeJwtPayload, getApiError } from '@/lib/api';
import { WhatsAppLogo } from '@/components/WhatsAppLogo';

interface Worker {
  id: number | string;
  email: string;
  name: string;
  phone: string;
  role: string;
  scope: string;
  scopeValue: string;
  isActive: boolean;
  assignedVoters: number;
  organizationId?: string;
  organizationName?: string;
}

interface ClientOrg {
  id: string;
  name: string;
  code?: string;
  candidateName?: string;
  voterCount?: number;
}

interface AssignedVoter {
  _id: string;
  nameHi: string;
  nameEn: string;
  epic: string;
  wardNo: string;
  partNo: string;
  serialNo: number;
  houseNo: string;
  voted: boolean;
}

function getAvatarGradient(name: string) {
  const gradients = [
    'linear-gradient(135deg, #059669 0%, #10b981 100%)',
    'linear-gradient(135deg, #2563eb 0%, #3b82f6 100%)',
    'linear-gradient(135deg, #7c3aed 0%, #8b5cf6 100%)',
    'linear-gradient(135deg, #d97706 0%, #f59e0b 100%)',
    'linear-gradient(135deg, #0891b2 0%, #06b6d4 100%)',
    'linear-gradient(135deg, #4f46e5 0%, #6366f1 100%)',
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return gradients[Math.abs(hash) % gradients.length];
}

function getRoleBadge(role: string) {
  const r = (role || '').toLowerCase();
  if (r.includes('booth')) {
    return { label: 'बूथ एजेंट', bg: '#fef3c7', color: '#b45309', border: '#fde68a' };
  }
  if (r.includes('ward') || r.includes('supervisor')) {
    return { label: 'वार्ड प्रभारी', bg: '#dbeafe', color: '#1d4ed8', border: '#bfdbfe' };
  }
  if (r.includes('operator')) {
    return { label: 'ऑपरेटर', bg: '#f3e8ff', color: '#7e22ce', border: '#e9d5ff' };
  }
  return { label: role || 'कार्यकर्ता', bg: '#ecfdf5', color: '#047857', border: '#a7f3d0' };
}

export default function WorkersPage() {
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [clients, setClients] = useState<ClientOrg[]>([]);
  const [selected, setSelected] = useState<Worker | null>(null);
  const [voters, setVoters] = useState<AssignedVoter[]>([]);
  const [votersSource, setVotersSource] = useState<'assigned' | 'scope'>('assigned');
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [loadingWorkerId, setLoadingWorkerId] = useState<number | string | null>(null);
  const [error, setError] = useState('');
  const [currentOrgId, setCurrentOrgId] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  const [userRole, setUserRole] = useState('');
  const [userOrgName, setUserOrgName] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [modalSearch, setModalSearch] = useState('');

  // 1. Initial setup: Check Auth Role & Load Clients
  useEffect(() => {
    const token = typeof window !== 'undefined' ? window.localStorage.getItem('token') : null;
    if (token) {
      try {
        const payload = decodeJwtPayload<{
          user?: { role?: string; organizationId?: string; organizationName?: string };
        }>(token);
        const adminRole = payload?.user?.role === 'admin';
        setIsAdmin(adminRole);
        setUserRole(payload?.user?.role || 'worker');
        if (payload?.user?.organizationName) {
          setUserOrgName(payload.user.organizationName);
        }
        if (!adminRole && payload?.user?.organizationId) {
          setCurrentOrgId(payload.user.organizationId);
        }
      } catch {}
    }

    const loadClients = async () => {
      try {
        const res = await apiFetch('/auth/clients', { cache: 'no-store' });
        if (res.ok) {
          const data = (await res.json()) as ClientOrg[];
          if (Array.isArray(data)) {
            const unique = Array.from(new Map(data.map((c) => [c.id, c])).values());
            setClients(unique);
          }
        }
      } catch {}
    };

    void loadClients();
  }, []);

  // 2. Load Workers based on Organization
  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const selectedOrg = typeof window !== 'undefined' ? window.localStorage.getItem('selectedClientOrgId') || '' : '';
      setCurrentOrgId(selectedOrg);
      const query = selectedOrg && selectedOrg !== 'all' ? `?organizationId=${encodeURIComponent(selectedOrg)}` : '';
      const response = await apiFetch(`/users/workers${query}`, { cache: 'no-store' });
      if (!response.ok) throw new Error(await getApiError(response, 'कार्यकर्ता सूची लोड नहीं हुई।'));
      const data = (await response.json()) as Worker[];
      setWorkers(data);
    } catch (loadError) {
      setWorkers([]);
      setError(loadError instanceof Error ? loadError.message : 'कार्यकर्ता सूची लोड नहीं हुई।');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  // Listen for top bar client switcher changes
  useEffect(() => {
    const handleClientChange = () => {
      setSelected(null);
      setVoters([]);
      void load();
    };
    window.addEventListener('client-changed', handleClientChange);
    return () => window.removeEventListener('client-changed', handleClientChange);
  }, [load]);

  // Handle switching client directly on this page
  const handleClientSwitch = (newOrgId: string) => {
    setCurrentOrgId(newOrgId);
    if (!newOrgId || newOrgId === 'all') {
      window.localStorage.removeItem('selectedClientOrgId');
    } else {
      window.localStorage.setItem('selectedClientOrgId', newOrgId);
    }
    window.dispatchEvent(new CustomEvent('client-changed', { detail: { organizationId: newOrgId } }));
    void load();
  };

  // 3. Load Voters for Worker (Direct assignment or scope fallback)
  const showAssigned = async (worker: Worker) => {
    setSelected(worker);
    setVoters([]);
    setError('');
    setModalSearch('');
    setDetailLoading(true);
    setLoadingWorkerId(worker.id);

    try {
      const name = worker.name || worker.email;
      const orgParam = worker.organizationId ? `&organizationId=${encodeURIComponent(worker.organizationId)}` : '';

      // 1. Direct assignments
      let list: AssignedVoter[] = [];
      let source: 'assigned' | 'scope' = 'assigned';

      const response = await apiFetch(
        `/voters?${new URLSearchParams({ assignedWorker: name, page: '1', pageSize: '250' })}${orgParam}`,
        { cache: 'no-store' }
      );

      if (response.ok) {
        const result = (await response.json()) as { data?: AssignedVoter[] };
        list = Array.isArray(result.data) ? result.data : [];
      }

      // 2. Scope fallback (Ward, Booth, All)
      if (list.length === 0 && worker.scope) {
        source = 'scope';
        const scopeParams = new URLSearchParams({ page: '1', pageSize: '250' });

        if (worker.scope === 'Ward' && worker.scopeValue) {
          scopeParams.set('ward', worker.scopeValue);
        } else if (worker.scope === 'Booth' && worker.scopeValue) {
          scopeParams.set('part', worker.scopeValue);
        }

        const scopeRes = await apiFetch(`/voters?${scopeParams.toString()}${orgParam}`, { cache: 'no-store' });
        if (scopeRes.ok) {
          const scopeResult = (await scopeRes.json()) as { data?: AssignedVoter[] };
          if (Array.isArray(scopeResult.data) && scopeResult.data.length > 0) {
            list = scopeResult.data;
          }
        }
      }

      setVoters(list);
      setVotersSource(source);
    } catch (detailError) {
      setError(detailError instanceof Error ? detailError.message : 'कार्यकर्ता की मतदाता सूची लोड नहीं हुई।');
    } finally {
      setDetailLoading(false);
      setLoadingWorkerId(null);
    }
  };

  // 4. Client Isolation & Filtered Workers
  const clientFilteredWorkers = useMemo(() => {
    let list = workers;
    // Strict isolation: if a client is selected, only show that client's workers
    if (currentOrgId && currentOrgId !== 'all') {
      list = list.filter((w) => w.organizationId === currentOrgId);
    }
    return list;
  }, [workers, currentOrgId]);

  // Search & Role filtering
  const displayWorkers = useMemo(() => {
    let list = clientFilteredWorkers;

    // Search query filter
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      list = list.filter((w) => {
        const name = (w.name || '').toLowerCase();
        const email = (w.email || '').toLowerCase();
        const phone = (w.phone || '').toLowerCase();
        const scope = `${w.scope} ${w.scopeValue}`.toLowerCase();
        const role = (w.role || '').toLowerCase();
        const org = (w.organizationName || '').toLowerCase();
        return (
          name.includes(q) ||
          email.includes(q) ||
          phone.includes(q) ||
          scope.includes(q) ||
          role.includes(q) ||
          org.includes(q)
        );
      });
    }

    // Role filter
    if (roleFilter !== 'all') {
      list = list.filter((w) => {
        const r = (w.role || '').toLowerCase();
        if (roleFilter === 'booth') return r.includes('booth');
        if (roleFilter === 'ward') return r.includes('ward') || r.includes('supervisor');
        if (roleFilter === 'operator') return r.includes('operator');
        return true;
      });
    }

    return list;
  }, [clientFilteredWorkers, searchQuery, roleFilter]);

  // Group workers by Client when "All Clients" is selected
  const workersByClient = useMemo(() => {
    const groups = new Map<string, { orgId: string; orgName: string; workers: Worker[] }>();

    displayWorkers.forEach((w) => {
      const orgId = w.organizationId || 'default';
      const orgName = w.organizationName || 'अन्य संगठन';
      if (!groups.has(orgId)) {
        groups.set(orgId, { orgId, orgName, workers: [] });
      }
      groups.get(orgId)!.workers.push(w);
    });

    return Array.from(groups.values());
  }, [displayWorkers]);

  // Modal search
  const filteredModalVoters = useMemo(() => {
    if (!modalSearch.trim()) return voters;
    const q = modalSearch.trim().toLowerCase();
    return voters.filter((v) => {
      const nameH = (v.nameHi || '').toLowerCase();
      const nameE = (v.nameEn || '').toLowerCase();
      const epic = (v.epic || '').toLowerCase();
      const house = String(v.houseNo || '').toLowerCase();
      const part = String(v.partNo || '').toLowerCase();
      const serial = String(v.serialNo || '');
      return (
        nameH.includes(q) ||
        nameE.includes(q) ||
        epic.includes(q) ||
        house.includes(q) ||
        part.includes(q) ||
        serial.includes(q)
      );
    });
  }, [voters, modalSearch]);

  const activeClientName = useMemo(() => {
    if (!currentOrgId || currentOrgId === 'all') return 'सभी क्लाइंट्स';
    const found = clients.find((c) => c.id === currentOrgId);
    return found ? found.name : workers[0]?.organizationName || 'चुना गया क्लाइंट';
  }, [clients, currentOrgId, workers]);

  const canManageWorkers = isAdmin || userRole === 'tenant_admin';

  return (
    <div className="work-page" style={{ maxWidth: '1280px', margin: '0 auto', paddingBottom: '40px' }}>
      {/* PAGE HEADER */}
      <div className="page-intro" style={{ marginBottom: '20px' }}>
        <div>
          <div className="eyebrow-label">
            <span className="eyebrow-mark" /> FIELD TEAM MANAGEMENT
          </div>
          <h1 style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span>कार्यकर्ता प्रबंधन</span>
            {currentOrgId && currentOrgId !== 'all' && (
              <span
                style={{
                  fontSize: '13px',
                  fontWeight: 600,
                  color: '#047857',
                  background: '#ecfdf5',
                  padding: '3px 10px',
                  borderRadius: '20px',
                  border: '1px solid #a7f3d0',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                }}
              >
                <Building2 size={13} /> {activeClientName}
              </span>
            )}
          </h1>
          <p>
            {isAdmin
              ? 'क्लाइंट-वार फील्ड कार्यकर्ताओं, उनके वार्ड/बूथ स्कोप और सक्रियता की निगरानी करें।'
              : `${userOrgName || activeClientName} के सक्रिय कार्यकर्ता और उनके आवंटित मतदाता।`}
          </p>
        </div>

        <div className="feature-actions">
          <button className="button-secondary" type="button" onClick={() => void load()} disabled={loading}>
            {loading ? <LoaderCircle size={15} className="spin" /> : <RefreshCw size={15} />} रिफ्रेश
          </button>
          {canManageWorkers && (
            <Link
              className="button-primary"
              href="/accounts"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            >
              <UserPlus size={15} /> नया कार्यकर्ता / खाता
            </Link>
          )}
        </div>
      </div>

      {error && (
        <div className="inline-notice error-notice" role="alert" style={{ marginBottom: '16px' }}>
          {error}
        </div>
      )}

      {/* TOP METRICS SUMMARY */}
      <section className="feature-metrics" style={{ marginBottom: '24px' }}>
        <article className="metric-card" style={{ borderRadius: '12px', padding: '16px 20px' }}>
          <span style={{ fontSize: '12.5px', color: '#64748b' }}>कुल कार्यकर्ता</span>
          <strong style={{ fontSize: '28px', color: '#0f172a', margin: '4px 0' }}>
            {loading ? '—' : clientFilteredWorkers.length}
          </strong>
          <small style={{ color: '#94a3b8' }}>
            {currentOrgId && currentOrgId !== 'all' ? activeClientName : 'सभी संगठनों के कुल खाते'}
          </small>
        </article>

        <article
          className="metric-card metric-card-green"
          style={{ borderRadius: '12px', padding: '16px 20px', background: '#f0fdf4', borderColor: '#bbf7d0' }}
        >
          <span style={{ fontSize: '12.5px', color: '#166534' }}>सक्रिय लॉगिन</span>
          <strong style={{ fontSize: '28px', color: '#15803d', margin: '4px 0' }}>
            {loading ? '—' : clientFilteredWorkers.filter((item) => item.isActive).length}
          </strong>
          <small style={{ color: '#166534' }}>फील्ड में काम करने के लिए तैयार</small>
        </article>

        <article className="metric-card" style={{ borderRadius: '12px', padding: '16px 20px' }}>
          <span style={{ fontSize: '12.5px', color: '#64748b' }}>कवर किए गए वार्ड / बूथ</span>
          <strong style={{ fontSize: '28px', color: '#0f172a', margin: '4px 0' }}>
            {loading
              ? '—'
              : new Set(clientFilteredWorkers.map((w) => `${w.scope}-${w.scopeValue}`).filter(Boolean)).size}
          </strong>
          <small style={{ color: '#94a3b8' }}>विशिष्ट कार्य क्षेत्र</small>
        </article>

        <article className="metric-card" style={{ borderRadius: '12px', padding: '16px 20px' }}>
          <span style={{ fontSize: '12.5px', color: '#64748b' }}>सीधे आवंटित मतदाता</span>
          <strong style={{ fontSize: '28px', color: '#0f172a', margin: '4px 0' }}>
            {loading ? '—' : clientFilteredWorkers.reduce((sum, item) => sum + (item.assignedVoters || 0), 0)}
          </strong>
          <small style={{ color: '#94a3b8' }}>व्यक्तिगत रूप से जोड़े गए</small>
        </article>
      </section>

      {/* CLIENT FILTER BAR (FOR SUPER ADMIN) */}
      {isAdmin && clients.length > 0 && (
        <div
          style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '12px',
            padding: '12px 16px',
            marginBottom: '18px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            flexWrap: 'wrap',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 600, color: '#475569' }}>
            <Building2 size={16} className="text-emerald-700" />
            <span>क्लाइंट फ़िल्टर:</span>
          </div>

          <div className="worker-client-filter-scroll" style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', flex: 1 }}>
            <button
              type="button"
              onClick={() => handleClientSwitch('all')}
              style={{
                fontSize: '12px',
                padding: '6px 12px',
                borderRadius: '8px',
                border: '1px solid',
                fontWeight: !currentOrgId || currentOrgId === 'all' ? 700 : 500,
                background: !currentOrgId || currentOrgId === 'all' ? '#047857' : '#f8fafc',
                color: !currentOrgId || currentOrgId === 'all' ? '#ffffff' : '#334155',
                borderColor: !currentOrgId || currentOrgId === 'all' ? '#047857' : '#cbd5e1',
                cursor: 'pointer',
                transition: 'all 120ms',
              }}
            >
              सभी क्लाइंट्स ({workers.length})
            </button>

            {clients.map((c, idx) => {
              const isSelected = currentOrgId === c.id;
              const count = workers.filter((w) => w.organizationId === c.id).length;
              return (
                <button
                  key={`${c.id}-${idx}`}
                  type="button"
                  onClick={() => handleClientSwitch(c.id)}
                  style={{
                    fontSize: '12px',
                    padding: '6px 12px',
                    borderRadius: '8px',
                    border: '1px solid',
                    fontWeight: isSelected ? 700 : 500,
                    background: isSelected ? '#047857' : '#f8fafc',
                    color: isSelected ? '#ffffff' : '#334155',
                    borderColor: isSelected ? '#047857' : '#cbd5e1',
                    cursor: 'pointer',
                    transition: 'all 120ms',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '5px',
                  }}
                >
                  <span>{c.name}</span>
                  <span
                    style={{
                      fontSize: '11px',
                      background: isSelected ? 'rgba(255,255,255,0.25)' : '#e2e8f0',
                      color: isSelected ? '#ffffff' : '#475569',
                      padding: '1px 6px',
                      borderRadius: '10px',
                    }}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* SEARCH AND ROLE FILTER BAR */}
      <div
        style={{
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '12px',
          padding: '12px 16px',
          marginBottom: '20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '12px',
          flexWrap: 'wrap',
        }}
      >
        {/* Search input */}
        <div style={{ position: 'relative', flex: '1 1 280px', minWidth: '240px' }}>
          <Search
            size={16}
            style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }}
          />
          <input
            type="text"
            placeholder="नाम, ईमेल, फोन, या वार्ड/बूथ से कार्यकर्ता खोजें..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '8px 34px 8px 36px',
              fontSize: '13px',
              border: '1px solid #cbd5e1',
              borderRadius: '8px',
              outline: 'none',
              background: '#f8fafc',
            }}
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              style={{
                position: 'absolute',
                right: '10px',
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: '#94a3b8',
                padding: '2px',
              }}
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Role pills */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 600 }}>भूमिका:</span>
          {[
            { id: 'all', label: 'सभी' },
            { id: 'booth', label: 'बूथ एजेंट' },
            { id: 'ward', label: 'वार्ड प्रभारी' },
            { id: 'operator', label: 'ऑपरेटर' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setRoleFilter(tab.id)}
              style={{
                fontSize: '12px',
                padding: '5px 12px',
                borderRadius: '6px',
                border: '1px solid',
                cursor: 'pointer',
                fontWeight: roleFilter === tab.id ? 700 : 500,
                background: roleFilter === tab.id ? '#0f172a' : '#f1f5f9',
                color: roleFilter === tab.id ? '#ffffff' : '#475569',
                borderColor: roleFilter === tab.id ? '#0f172a' : '#e2e8f0',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* WORKERS CONTENT */}
      {loading && !workers.length ? (
        <div className="records-panel empty-state" style={{ padding: '60px 20px', textAlign: 'center' }}>
          <LoaderCircle size={28} className="spin" style={{ margin: '0 auto 12px', color: '#047857' }} />
          <p style={{ fontWeight: 600, color: '#334155' }}>कार्यकर्ता लोड हो रहे हैं…</p>
        </div>
      ) : displayWorkers.length === 0 ? (
        <div
          style={{
            background: '#ffffff',
            border: '1px dashed #cbd5e1',
            borderRadius: '16px',
            textAlign: 'center',
            padding: '60px 20px',
          }}
        >
          <UsersRound size={42} style={{ margin: '0 auto 12px', color: '#94a3b8' }} />
          <h3 style={{ margin: '0 0 6px', fontSize: '16px', fontWeight: 700, color: '#1e293b' }}>
            कोई कार्यकर्ता खाता नहीं मिला
          </h3>
          <p style={{ margin: '0 0 16px', fontSize: '13px', color: '#64748b' }}>
            {searchQuery
              ? `"${searchQuery}" से मेल खाता कोई कार्यकर्ता नहीं मिला। फ़िल्टर साफ़ करके पुनः प्रयास करें।`
              : `${activeClientName} के तहत अभी तक कोई फील्ड कार्यकर्ता खाता नहीं बनाया गया है।`}
          </p>
          {canManageWorkers && (
            <Link
              className="button-primary"
              href="/accounts"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            >
              <UserPlus size={15} /> नया कार्यकर्ता बनाएं
            </Link>
          )}
        </div>
      ) : (!currentOrgId || currentOrgId === 'all') && workersByClient.length > 1 ? (
        /* MULTI-CLIENT GROUPED VIEW (WHEN ALL CLIENTS IS ACTIVE) */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
          {workersByClient.map((group, gIdx) => (
            <section
              key={`${group.orgId}-${gIdx}`}
              style={{
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '16px',
                padding: '18px 20px',
              }}
            >
              {/* Group Header */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '16px',
                  paddingBottom: '12px',
                  borderBottom: '1px solid #e2e8f0',
                  flexWrap: 'wrap',
                  gap: '10px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div
                    style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '8px',
                      background: '#ecfdf5',
                      color: '#047857',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Building2 size={18} />
                  </div>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#0f172a' }}>
                      {group.orgName}
                    </h3>
                    <span style={{ fontSize: '12px', color: '#64748b' }}>
                      {group.workers.length} कार्यकर्ता खाता · {group.workers.filter((w) => w.isActive).length} सक्रिय
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleClientSwitch(group.orgId)}
                  className="button-secondary"
                  style={{ fontSize: '12px', padding: '5px 12px' }}
                >
                  केवल इस क्लाइंट को देखें ↗
                </button>
              </div>

              {/* Cards Grid for this Client */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 280px), 1fr))',
                  gap: '16px',
                }}
              >
                {group.workers.map((worker, wIdx) => (
                  <WorkerCard
                    key={`${worker.id || 'worker'}-${wIdx}`}
                    worker={worker}
                    loadingWorkerId={loadingWorkerId}
                    showAssigned={showAssigned}
                    canManageWorkers={canManageWorkers}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      ) : (
        /* SINGLE CLIENT GRID */
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 280px), 1fr))',
            gap: '16px',
          }}
        >
          {displayWorkers.map((worker, wIdx) => (
            <WorkerCard
              key={`${worker.id || 'worker'}-${wIdx}`}
              worker={worker}
              loadingWorkerId={loadingWorkerId}
              showAssigned={showAssigned}
              canManageWorkers={canManageWorkers}
            />
          ))}
        </div>
      )}

      {/* VOTER LIST MODAL */}
      {selected && (
        <div
          className="modal-backdrop"
          onClick={() => setSelected(null)}
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
            className="form-modal worker-modal-container"
            onClick={(e) => e.stopPropagation()}
            style={{
              maxWidth: '920px',
              width: '100%',
              background: '#ffffff',
              borderRadius: '16px',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              padding: '24px',
              maxHeight: '90vh',
              display: 'flex',
              flexDirection: 'column',
              border: '1px solid #e2e8f0',
            }}
          >
            {/* Modal Header */}
            <div
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                justifyContent: 'space-between',
                paddingBottom: '16px',
                borderBottom: '1px solid #e2e8f0',
                gap: '12px',
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <span
                    style={{
                      width: '28px',
                      height: '28px',
                      borderRadius: '50%',
                      background: getAvatarGradient(selected.name || selected.email),
                      color: '#ffffff',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '12px',
                      fontWeight: 700,
                    }}
                  >
                    {(selected.name || selected.email).slice(0, 1).toLocaleUpperCase()}
                  </span>
                  <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#0f172a' }}>
                    {selected.name || selected.email} की मतदाता सूची
                  </h2>
                </div>
                <p style={{ margin: 0, fontSize: '12.5px', color: '#64748b' }}>
                  {selected.email} · {selected.role} ·{' '}
                  <span style={{ fontWeight: 600, color: '#047857' }}>
                    {selected.scope} {selected.scopeValue || ''}
                  </span>
                  {selected.organizationName && ` (${selected.organizationName})`}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setSelected(null)}
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
                title="बंद करें"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Search Toolbar */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '12px',
                margin: '14px 0',
                flexWrap: 'wrap',
              }}
            >
              <div style={{ position: 'relative', flex: 1, minWidth: '220px' }}>
                <Search
                  size={15}
                  style={{
                    position: 'absolute',
                    left: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: '#94a3b8',
                  }}
                />
                <input
                  type="text"
                  placeholder="मतदाता का नाम, EPIC, या मकान नं. खोजें..."
                  value={modalSearch}
                  onChange={(e) => setModalSearch(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px 8px 34px',
                    fontSize: '13px',
                    border: '1px solid #cbd5e1',
                    borderRadius: '8px',
                    outline: 'none',
                    background: '#f8fafc',
                  }}
                />
                {modalSearch && (
                  <button
                    type="button"
                    onClick={() => setModalSearch('')}
                    style={{
                      position: 'absolute',
                      right: '10px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: '#94a3b8',
                      padding: '2px',
                    }}
                  >
                    <X size={14} />
                  </button>
                )}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span
                  style={{
                    fontSize: '12px',
                    color: '#475569',
                    background: '#f1f5f9',
                    padding: '4px 10px',
                    borderRadius: '6px',
                    fontWeight: 600,
                  }}
                >
                  कुल {filteredModalVoters.length} मतदाता
                  {votersSource === 'scope' && selected.scopeValue && (
                    <span style={{ fontSize: '11px', color: '#047857', marginLeft: '4px' }}>
                      ({selected.scope} {selected.scopeValue} स्कोप)
                    </span>
                  )}
                </span>

                <Link
                  href={
                    selected.scope === 'Ward' && selected.scopeValue
                      ? `/voters?ward=${encodeURIComponent(selected.scopeValue)}`
                      : `/voters`
                  }
                  className="button-secondary"
                  style={{
                    fontSize: '12px',
                    padding: '5px 12px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '5px',
                    background: '#ffffff',
                  }}
                  target="_blank"
                >
                  <span>मतदाता रजिस्टर में देखें</span>
                  <ExternalLink size={12} />
                </Link>
              </div>
            </div>

            {/* Table Content */}
            <div
              style={{
                flex: 1,
                overflowY: 'auto',
                overflowX: 'auto',
                WebkitOverflowScrolling: 'touch',
                minHeight: '260px',
                maxHeight: '52vh',
                border: '1px solid #e2e8f0',
                borderRadius: '10px',
                background: '#ffffff',
              }}
            >
              {detailLoading ? (
                <div style={{ padding: '60px 20px', textAlign: 'center', color: '#64748b' }}>
                  <LoaderCircle size={26} className="spin" style={{ margin: '0 auto 10px', color: '#047857' }} />
                  मतदाता सूची लोड हो रही है…
                </div>
              ) : filteredModalVoters.length ? (
                <table className="voter-table desk-table" style={{ margin: 0, width: '100%' }}>
                  <thead style={{ position: 'sticky', top: 0, background: '#f8fafc', zIndex: 1 }}>
                    <tr>
                      <th style={{ padding: '10px 14px' }}>क्र.</th>
                      <th style={{ padding: '10px 14px' }}>मतदाता का नाम</th>
                      <th style={{ padding: '10px 14px' }}>पहचान पत्र (EPIC)</th>
                      <th style={{ padding: '10px 14px' }}>वार्ड / भाग</th>
                      <th style={{ padding: '10px 14px' }}>मकान नं.</th>
                      <th style={{ padding: '10px 14px' }}>मतदान स्थिति</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredModalVoters.map((voter, index) => (
                      <tr key={voter._id || index}>
                        <td style={{ padding: '8px 14px', fontSize: '12px', color: '#64748b' }}>
                          {voter.serialNo || index + 1}
                        </td>
                        <td style={{ padding: '8px 14px', fontWeight: 600, color: '#0f172a' }}>
                          {voter.nameHi || voter.nameEn || 'मतदाता'}
                        </td>
                        <td style={{ padding: '8px 14px', fontSize: '12.5px', color: '#2563eb', fontWeight: 600 }}>
                          {(voter.epic && !voter.epic.startsWith('VOTER_') && !voter.epic.startsWith('UNREADABLE_')) ? voter.epic : '—'}
                        </td>
                        <td style={{ padding: '8px 14px', fontSize: '12px', color: '#475569' }}>
                          वार्ड {voter.wardNo || '—'} · भाग {voter.partNo || '—'}
                        </td>
                        <td style={{ padding: '8px 14px', fontSize: '12px', color: '#475569' }}>
                          #{voter.houseNo || '—'}
                        </td>
                        <td style={{ padding: '8px 14px' }}>
                          <span
                            className={`record-status ${voter.voted ? 'status-voted' : 'status-pending'}`}
                            style={{ fontSize: '11px', padding: '2px 8px' }}
                          >
                            {voter.voted ? '✓ मतदान दर्ज' : 'शेष'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div style={{ padding: '50px 20px', textAlign: 'center', color: '#64748b' }}>
                  <UsersRound size={34} style={{ margin: '0 auto 10px', color: '#94a3b8' }} />
                  <p style={{ margin: '4px 0', fontWeight: 700, fontSize: '14px', color: '#334155' }}>
                    कोई मतदाता रिकॉर्ड नहीं मिला
                  </p>
                  <p style={{ margin: 0, fontSize: '12.5px', color: '#94a3b8' }}>
                    {selected.scope === 'All'
                      ? 'डेटाबेस में मतदाता रिकॉर्ड जांचें।'
                      : `${selected.scope} ${selected.scopeValue || ''} के तहत कोई मतदाता नहीं मिला।`}
                  </p>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '10px',
                marginTop: '16px',
                paddingTop: '12px',
                borderTop: '1px solid #f1f5f9',
              }}
            >
              <div style={{ fontSize: '12px', color: '#64748b' }}>
                कार्यकर्ता: <strong>{selected.name || selected.email}</strong> ({selected.role})
              </div>

              <button className="button-secondary" type="button" onClick={() => setSelected(null)}>
                बंद करें
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

// 5. Individual Worker Card Component
function WorkerCard({
  worker,
  loadingWorkerId,
  showAssigned,
  canManageWorkers,
}: {
  worker: Worker;
  loadingWorkerId: number | string | null;
  showAssigned: (worker: Worker) => void;
  canManageWorkers: boolean;
}) {
  const cleanPhone = (worker.phone || '').replace(/\D/g, '');
  const hasValidPhone = cleanPhone.length >= 10 && cleanPhone !== '0000000000';
  const isThisLoading = loadingWorkerId === worker.id;
  const roleBadge = getRoleBadge(worker.role);
  const avatarBg = getAvatarGradient(worker.name || worker.email);

  return (
    <article
      style={{
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '16px',
        padding: '18px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
        transition: 'transform 150ms ease, box-shadow 150ms ease',
      }}
    >
      <div>
        {/* Card Top: Avatar, Name, Status, Role */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '10px', marginBottom: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '12px',
                background: avatarBg,
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '17px',
                fontWeight: 700,
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.12)',
                flexShrink: 0,
              }}
            >
              {(worker.name || worker.email).slice(0, 1).toLocaleUpperCase()}
            </span>
            <div>
              <h2
                style={{
                  margin: 0,
                  fontSize: '15px',
                  fontWeight: 700,
                  color: '#0f172a',
                  lineHeight: 1.25,
                }}
              >
                {worker.name || worker.email}
              </h2>
              <div
                style={{
                  fontSize: '12px',
                  color: '#64748b',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  marginTop: '2px',
                  wordBreak: 'break-all',
                }}
              >
                <Mail size={12} /> {worker.email}
              </div>
            </div>
          </div>

          <span
            style={{
              fontSize: '11px',
              padding: '2px 8px',
              borderRadius: '20px',
              fontWeight: 600,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              background: worker.isActive ? '#ecfdf5' : '#f1f5f9',
              color: worker.isActive ? '#047857' : '#64748b',
              border: `1px solid ${worker.isActive ? '#a7f3d0' : '#cbd5e1'}`,
              flexShrink: 0,
            }}
          >
            <span
              style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                background: worker.isActive ? '#10b981' : '#94a3b8',
              }}
            />
            {worker.isActive ? 'सक्रिय' : 'बंद'}
          </span>
        </div>

        {/* Client Organization Badge */}
        {worker.organizationName && (
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              fontSize: '11.5px',
              color: '#047857',
              background: '#ecfdf5',
              padding: '3px 8px',
              borderRadius: '6px',
              marginBottom: '10px',
              fontWeight: 600,
              border: '1px solid #d1fae5',
            }}
          >
            <Building2 size={12} /> {worker.organizationName}
          </div>
        )}

        {/* Badges strip: Role & Scope */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', marginBottom: '14px' }}>
          {/* Role badge */}
          <span
            style={{
              fontSize: '11px',
              padding: '3px 8px',
              borderRadius: '6px',
              fontWeight: 600,
              background: roleBadge.bg,
              color: roleBadge.color,
              border: `1px solid ${roleBadge.border}`,
            }}
          >
            {roleBadge.label}
          </span>

          {/* Scope badge */}
          <span
            style={{
              fontSize: '11px',
              padding: '3px 8px',
              borderRadius: '6px',
              fontWeight: 600,
              background: '#f8fafc',
              color: '#334155',
              border: '1px solid #e2e8f0',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '3px',
            }}
          >
            <MapPin size={11} className="text-emerald-600" />
            {worker.scope === 'Ward'
              ? `वार्ड ${worker.scopeValue || ''}`
              : worker.scope === 'Booth'
              ? `बूथ / भाग ${worker.scopeValue || ''}`
              : 'पूरा संगठन (All)'}
          </span>

          {/* Assigned voters count */}
          <span
            style={{
              fontSize: '11px',
              padding: '3px 8px',
              borderRadius: '6px',
              fontWeight: 600,
              background: '#f1f5f9',
              color: '#475569',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            <UsersRound size={11} /> {worker.assignedVoters || 0} आवंटित
          </span>
        </div>
      </div>

      {/* Card Action Buttons */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '8px',
          paddingTop: '12px',
          borderTop: '1px solid #f1f5f9',
          marginTop: '6px',
        }}
      >
        <button
          className="button-primary"
          type="button"
          onClick={() => void showAssigned(worker)}
          disabled={isThisLoading}
          style={{
            fontSize: '12px',
            padding: '6px 12px',
            borderRadius: '8px',
            fontWeight: 600,
            display: 'inline-flex',
            alignItems: 'center',
            gap: '5px',
            cursor: 'pointer',
            flex: '1 1 auto',
            justifyContent: 'center',
          }}
          title="इस कार्यकर्ता से जुड़े मतदाता देखें"
        >
          {isThisLoading ? (
            <>
              <LoaderCircle size={13} className="spin" /> लोड...
            </>
          ) : (
            <>
              <UsersRound size={13} /> मतदाता सूची
            </>
          )}
        </button>

        {hasValidPhone ? (
          <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
            <a
              href={`tel:${worker.phone}`}
              className="button-secondary"
              title={`कॉल करें: ${worker.phone}`}
              style={{
                fontSize: '12px',
                padding: '6px 10px',
                borderRadius: '8px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                background: '#f8fafc',
                color: '#334155',
              }}
            >
              <Phone size={13} />
              <span>कॉल</span>
            </a>

            <a
              href={`https://wa.me/${cleanPhone}`}
              target="_blank"
              rel="noreferrer"
              title={`WhatsApp चैट: ${worker.phone}`}
              style={{
                fontSize: '12px',
                padding: '6px 10px',
                borderRadius: '8px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                background: '#ecfdf5',
                color: '#16a34a',
                border: '1px solid #bbf7d0',
                fontWeight: 600,
                textDecoration: 'none',
              }}
            >
              <WhatsAppLogo size={13} color="#16a34a" />
              <span>चैट</span>
            </a>
          </div>
        ) : canManageWorkers ? (
          <Link
            href="/accounts"
            title="फ़ोन नंबर जोड़ने के लिए खाता संपादित करें"
            style={{
              fontSize: '11px',
              color: '#94a3b8',
              padding: '6px 8px',
              textDecoration: 'none',
              flexShrink: 0,
            }}
          >
            + फोन जोड़ें
          </Link>
        ) : (
          <span
            style={{
              fontSize: '11px',
              color: '#94a3b8',
              padding: '6px 8px',
              flexShrink: 0,
            }}
          >
            फ़ोन नहीं
          </span>
        )}
      </div>
    </article>
  );
}
